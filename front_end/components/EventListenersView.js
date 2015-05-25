// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!Element} element
 * @param {string} objectGroup
 */
WebInspector.EventListenersView = function(element, objectGroup)
{
    this._element = element;
    this._objectGroup = objectGroup;
    this._treeOutline = new TreeOutlineInShadow("event-listener-tree");
    this._treeOutline.registerRequiredCSS("components/objectValue.css");
    this._treeOutline.registerRequiredCSS("components/eventListenersView.css");
    this._treeOutline.setComparator(WebInspector.EventListenersTreeElement.comparator);
    this._treeOutline.element.classList.add("monospace");
    this._element.appendChild(this._treeOutline.element)
    this._emptyHolder = createElementWithClass("div", "info");
    this._emptyHolder.textContent = WebInspector.UIString("No Event Listeners");
    this._element.appendChild(this._emptyHolder);
    this._linkifier = new WebInspector.Linkifier();
    /** @type {!Map<string, !WebInspector.EventListenersTreeElement>} */
    this._treeItemMap = new Map();
}

WebInspector.EventListenersView.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @param {?Array<!WebInspector.EventListener>} eventListeners
     */
    _addNodeEventListeners: function(node, eventListeners)
    {
        if (!eventListeners)
            return;
        for (var eventListener of eventListeners) {
            var treeItem = this._getOrCreateTreeElementForType(eventListener.type());
            treeItem.addNodeEventListener(eventListener, node);
        }
    },

    /**
     * @param {string} type
     * @return {!WebInspector.EventListenersTreeElement}
     */
    _getOrCreateTreeElementForType: function(type)
    {
        var treeItem = this._treeItemMap.get(type);
        if (!treeItem) {
            treeItem = new WebInspector.EventListenersTreeElement(type, this._linkifier);
            this._treeItemMap.set(type, treeItem);
            this._treeOutline.appendChild(treeItem);
            this._emptyHolder.remove();
        }
        return treeItem;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise}
     */
    addNodeEventListeners: function(node)
    {
        return new Promise(addEventListeners.bind(this));
        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         * @this {WebInspector.EventListenersView}
         */
        function addEventListeners(fulfill, reject)
        {
            node.resolveToObject(this._objectGroup, objectCallback.bind(this));
            /**
             * @param {?WebInspector.RemoteObject} object
             * @this {WebInspector.EventListenersView}
             */
            function objectCallback(object)
            {
                if (object)
                    object.getEventListeners(listenersCallback.bind(this));
                else
                    reject(undefined);
            }
            /**
             * @param {?Array<!WebInspector.EventListener>} listeners
             * @this {WebInspector.EventListenersView}
             */
            function listenersCallback(listeners)
            {
                this._addNodeEventListeners(node, listeners);
                fulfill(undefined);
            }
        }
    },

    reset: function()
    {
        this._treeItemMap = new Map();
        this._treeOutline.removeChildren();
        this._element.appendChild(this._emptyHolder);
        this._linkifier.reset();
    }
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {string} type
 * @param {!WebInspector.Linkifier} linkifier
 */
WebInspector.EventListenersTreeElement = function(type, linkifier)
{
    TreeElement.call(this, type);
    this.toggleOnClick = true;
    this.selectable = false;
    this._linkifier = linkifier;
}

/**
 * @param {!TreeElement} element1
 * @param {!TreeElement} element2
 * @return {number}
 */
WebInspector.EventListenersTreeElement.comparator = function(element1, element2) {
    if (element1.title === element2.title)
        return 0;
    return element1.title > element2.title ? 1 : -1;
}

WebInspector.EventListenersTreeElement.prototype = {
    /**
     * @param {!WebInspector.EventListener} eventListener
     * @param {!WebInspector.DOMNode} node
     */
    addNodeEventListener: function(eventListener, node)
    {
        var treeElement = new WebInspector.NodeEventListenerBar(eventListener, node, this._linkifier);
        this.appendChild(/** @type {!TreeElement} */ (treeElement));
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.EventListener} eventListener
 * @param {!WebInspector.Linkifier} linkifier
 */
WebInspector.EventListenerBar = function(eventListener, linkifier)
{
    TreeElement.call(this, "", true);
    this._eventListener = eventListener;
    this.editable = false;
}

WebInspector.EventListenerBar.prototype = {
    onpopulate: function()
    {
        var properties = [];
        var eventListener = this._eventListener;
        var runtimeModel = eventListener.target().runtimeModel;
        properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue("useCapture", eventListener.useCapture()));
        if (typeof eventListener.handler() !== "undefined")
            properties.push(new WebInspector.RemoteObjectProperty("handler", eventListener.handler()));
        WebInspector.ObjectPropertyTreeElement.populateWithProperties(this, properties, [], true, null);
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.EventListenerBar}
 * @param {!WebInspector.EventListener} eventListener
 * @param {!WebInspector.DOMNode} node
 * @param {!WebInspector.Linkifier} linkifier
 */
WebInspector.NodeEventListenerBar = function(eventListener, node, linkifier)
{
    WebInspector.EventListenerBar.call(this, eventListener, linkifier);
    this._setNodeTitle(node, linkifier);
}

WebInspector.NodeEventListenerBar.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.Linkifier} linkifier
     */
    _setNodeTitle: function(node, linkifier)
    {
        var title = this.listItemElement.createChild("span");
        var subtitle = this.listItemElement.createChild("span", "event-listener-tree-subtitle");
        subtitle.appendChild(linkifier.linkifyRawLocation(this._eventListener.location(), this._eventListener.sourceName()));
        if (node.nodeType() === Node.DOCUMENT_NODE) {
            title.textContent = "document";
            return;
        }
        if (this._eventListener.isSelected) {
            title.textContent = WebInspector.DOMPresentationUtils.simpleSelector(node);
            return;
        }
        title.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));
    },

    __proto__: WebInspector.EventListenerBar.prototype
}
