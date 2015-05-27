// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 */
WebInspector.ObjectEventListenersSidebarPane = function()
{
    WebInspector.SidebarPane.call(this, "Event Listeners");
    this.bodyElement.classList.add("events-pane");

    var refreshButton = this.titleElement.createChild("button", "pane-title-button refresh");
    refreshButton.addEventListener("click", this._refreshClick.bind(this), false);
    refreshButton.title = WebInspector.UIString("Refresh");

    WebInspector.context.addFlavorChangeListener(WebInspector.ExecutionContext, this.update, this);
    this._eventListenersView = new WebInspector.EventListenersView(this.bodyElement);
}

WebInspector.ObjectEventListenersSidebarPane._objectGroupName = "object-event-listeners-sidebar-pane";

WebInspector.ObjectEventListenersSidebarPane.prototype = {
    update: function()
    {
        if (this._lastRequestedContext) {
            this._lastRequestedContext.target().runtimeAgent().releaseObjectGroup(WebInspector.ObjectEventListenersSidebarPane._objectGroupName);
            delete this._lastRequestedContext;
        }
        this._eventListenersView.reset();
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext)
            return;
        this._lastRequestedContext = executionContext;
        this._windowObjectInContext(executionContext).then(this._eventListenersView.addObjectEventListeners.bind(this._eventListenersView));
    },

    expand: function()
    {
        WebInspector.SidebarPane.prototype.expand.call(this);
        this.update();
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {!Promise<!WebInspector.RemoteObject>} object
     */
    _windowObjectInContext: function(executionContext)
    {
        return new Promise(windowObjectInContext);

        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         */
        function windowObjectInContext(fulfill, reject)
        {
            executionContext.evaluate("self", WebInspector.ObjectEventListenersSidebarPane._objectGroupName, false, true, false, false, mycallback);
            /**
             * @param {?WebInspector.RemoteObject} object
             */
            function mycallback(object)
            {
                if (object)
                    fulfill(object);
                else
                    reject(null);
            }
        }
    },

    /**
     * @param {!Event} event
     */
    _refreshClick: function(event)
    {
        event.consume();
        this.update();
    },

    __proto__: WebInspector.SidebarPane.prototype
}
