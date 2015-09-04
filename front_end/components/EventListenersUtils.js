// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{eventListeners:!Array<!WebInspector.EventListener>, internalHandlers:?WebInspector.RemoteArray}} */
WebInspector.FrameworkEventListenersObject;

/** @typedef {{type: string, useCapture: boolean, handler: function()}} */
WebInspector.EventListenerObjectInInspectedPage;

/**
 * @param {!WebInspector.RemoteObject} object
 * @return {!Promise<!WebInspector.FrameworkEventListenersObject>}
 */
WebInspector.EventListener.frameworkEventListeners = function(object)
{
    var listenersResult = /** @type {!WebInspector.FrameworkEventListenersObject} */({eventListeners: []});
    return object.callFunctionPromise(frameworkEventListeners, undefined)
                 .then(assertCallFunctionResult)
                 .then(getOwnProperties)
                 .then(createEventListeners)
                 .then(returnResult)
                 .catchException(listenersResult);

    /**
     * @param {!WebInspector.RemoteObject} object
     * @return {!Promise<!{properties: ?Array.<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>}>}
     */
    function getOwnProperties(object)
    {
        return object.getOwnPropertiesPromise();
    }

    /**
     * @param {!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>}} result
     * @return {!Promise<undefined>}
     */
    function createEventListeners(result)
    {
        if (!result.properties)
            throw new Error("Object properties is empty");
        var promises = [];
        for (var property of result.properties) {
            if (property.name === "eventListeners" && property.value)
                promises.push(convertToEventListeners(property.value).then(storeEventListeners));
            if (property.name === "internalHandlers" && property.value)
                promises.push(convertToInternalHandlers(property.value).then(storeInternalHandlers));
        }
        return /** @type {!Promise<undefined>} */(Promise.all(promises));
    }

    /**
     * @param {!WebInspector.RemoteObject} pageEventListenersObject
     * @return {!Promise<!Array<!WebInspector.EventListener>>}
     */
    function convertToEventListeners(pageEventListenersObject)
    {
        return WebInspector.RemoteArray.objectAsArray(pageEventListenersObject).map(toEventListener).then(filterOutEmptyObjects);

        /**
         * @param {!WebInspector.RemoteObject} listenerObject
         * @return {!Promise<?WebInspector.EventListener>}
         */
        function toEventListener(listenerObject)
        {
            /** @type {string} */
            var type;
            /** @type {boolean} */
            var useCapture;
            /** @type {?WebInspector.RemoteObject} */
            var handler = null;
            /** @type {?WebInspector.DebuggerModel.Location} */
            var location = null;

            var promises = [];
            promises.push(listenerObject.callFunctionJSONPromise(truncatePageEventListener, undefined).then(storeTrunkatedListener));

            /**
             * @suppressReceiverCheck
             * @this {WebInspector.EventListenerObjectInInspectedPage}
             * @return {!{type:string, useCapture:boolean}}
             */
            function truncatePageEventListener()
            {
                return {type: this.type, useCapture: this.useCapture};
            }

            /**
             * @param {!{type:string, useCapture: boolean}} truncatedListener
             */
            function storeTrunkatedListener(truncatedListener)
            {
                type = truncatedListener.type;
                useCapture = truncatedListener.useCapture;
            }

            promises.push(listenerObject.callFunctionPromise(handlerFunction).then(assertCallFunctionResult).then(toTargetFunction).then(storeFunctionWithDetails));

            /**
             * @suppressReceiverCheck
             * @return {function()}
             * @this {WebInspector.EventListenerObjectInInspectedPage}
             */
            function handlerFunction()
            {
                return this.handler;
            }

            /**
             * @param {!WebInspector.RemoteObject} functionObject
             * @return {!Promise<undefined>}
             */
            function storeFunctionWithDetails(functionObject)
            {
                handler = functionObject;
                return /** @type {!Promise<undefined>} */(functionObject.functionDetailsPromise().then(storeFunctionDetails));
            }

            /**
             * @param {?WebInspector.DebuggerModel.FunctionDetails} functionDetails
             */
            function storeFunctionDetails(functionDetails)
            {
                location = functionDetails ? functionDetails.location : null;
            }

            return Promise.all(promises).then(createEventListener).catchException(/** @type {?WebInspector.EventListener} */(null));

            /**
             * @return {!WebInspector.EventListener}
             */
            function createEventListener()
            {
                if (!location)
                    throw new Error("Empty event listener's location");
                return new WebInspector.EventListener(handler._target, type, useCapture, handler, location, "frameworkUser");
            }
        }
    }

    /**
     * @param {!WebInspector.RemoteObject} pageInternalHandlersObject
     * @return {!Promise<!WebInspector.RemoteArray>}
     */
    function convertToInternalHandlers(pageInternalHandlersObject)
    {
        return WebInspector.RemoteArray.objectAsArray(pageInternalHandlersObject).map(toTargetFunction)
                                       .then(WebInspector.RemoteArray.createFromRemoteObjects);
    }

    /**
     * @param {!WebInspector.RemoteObject} functionObject
     * @return {!Promise<!WebInspector.RemoteObject>}
     */
    function toTargetFunction(functionObject)
    {
        return WebInspector.RemoteFunction.objectAsFunction(functionObject).targetFunction();
    }

    /**
     * @param {!Array<!WebInspector.EventListener>} eventListeners
     */
    function storeEventListeners(eventListeners)
    {
        listenersResult.eventListeners = eventListeners;
    }

    /**
     * @param {!WebInspector.RemoteArray} internalHandlers
     */
    function storeInternalHandlers(internalHandlers)
    {
        listenersResult.internalHandlers = internalHandlers;
    }

    /**
     * @return {!WebInspector.FrameworkEventListenersObject}
     */
    function returnResult()
    {
        return listenersResult;
    }

    /**
     * @param {!WebInspector.CallFunctionResult} result
     * @return {!WebInspector.RemoteObject}
     */
    function assertCallFunctionResult(result)
    {
        if (result.wasThrown || !result.object)
            throw new Error("Exception in callFunction or empty result");
        return result.object;
    }

    /**
     * @param {!Array<?T>} objects
     * @return {!Array<!T>}
     * @template T
     */
    function filterOutEmptyObjects(objects)
    {
        return objects.filter(filterOutEmpty);

        /**
         * @param {?T} object
         * @return {boolean}
         * @template T
         */
        function filterOutEmpty(object)
        {
            return !!object;
        }
    }

    /*
    frameworkEventListeners fetcher functions should produce following output:
        {
          // framework event listeners
          "eventListeners": [
            {
              "handler": function(),
              "useCapture": true,
              "type": "change"
            },
            ...
          ],
          // internal framework event handlers
          "internalHandlers": [
            function(),
            function(),
            ...
          ]
        }
    */
    /**
     * @suppressReceiverCheck
     * @return {!{eventListeners:!Array<!WebInspector.EventListenerObjectInInspectedPage>, internalHandlers:?Array<function()>}}
     * @this {Object}
     */
    function frameworkEventListeners()
    {
        var eventListeners = [];
        var internalHandlers = [];
        var fetchers = [jQueryFetcher];
        try {
            if (self.devtoolsPageEventListeners && isArrayLike(self.devtoolsPageEventListeners))
                fetchers = fetchers.concat(self.devtoolsPageEventListeners);
        } catch (e) {
        }

        for (var i = 0; i < fetchers.length; ++i) {
            try {
                var fetcherResult = fetchers[i](this);
                eventListeners = eventListeners.concat(fetcherResult.eventListeners);
                if (fetcherResult.internalHandlers)
                    internalHandlers = internalHandlers.concat(fetcherResult.internalHandlers);
            } catch (e) {
            }
        }
        var result = {eventListeners: eventListeners};
        if (internalHandlers.length)
            result.internalHandlers = internalHandlers;
        return result;

        /**
         * @param {?Object} obj
         * @return {boolean}
         */
        function isArrayLike(obj)
        {
            if (!obj || typeof obj !== "object")
                return false;
            try {
                if (typeof obj.splice === "function") {
                    var len = obj.length;
                    return typeof len === "number" && (len >>> 0 === len && (len > 0 || 1 / len > 0));
                }
            } catch (e) {
            }
            return false;
        }

        function jQueryFetcher(node)
        {
            if (!node || !(node instanceof Node))
                return {eventListeners: []};
            var jQuery = /** @type {?{fn,data,_data}}*/(window["jQuery"]);
            if (!jQuery || !jQuery.fn)
                return {eventListeners: []};
            var jQueryFunction = /** @type {function(!Node)} */(jQuery);
            var data = jQuery._data || jQuery.data;

            var eventListeners = [];
            var internalHandlers = [];

            if (typeof data === "function") {
                var events = data(node, "events");
                for (var type in events) {
                    for (var key in events[type]) {
                        var frameworkListener = events[type][key];
                        if (typeof frameworkListener === "object" || typeof frameworkListener === "function") {
                            var listener = {
                                handler: frameworkListener.handler || frameworkListener,
                                useCapture: true,
                                type: type
                            };
                            eventListeners.push(listener);
                        }
                    }
                }
                var nodeData = data(node);
                if (typeof nodeData.handle === "function")
                    internalHandlers.push(nodeData.handle);
            }
            var entry = jQueryFunction(node)[0];
            if (entry) {
                var entryEvents = entry["$events"];
                for (var type in entryEvents) {
                    var events = entryEvents[type];
                    for (var key in events) {
                        if (typeof events[key] === "function") {
                            var listener = {
                                handler: events[key],
                                useCapture: true,
                                type: type
                            };
                            eventListeners.push(listener);
                        }
                    }
                }
                if (entry && entry["$handle"])
                    internalHandlers.push(entry["$handle"]);
            }
            return {eventListeners: eventListeners, internalHandlers: internalHandlers};
        }
    }
}
