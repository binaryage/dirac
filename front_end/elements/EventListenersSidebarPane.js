/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.ElementsSidebarPane}
 */
WebInspector.EventListenersSidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Event Listeners"));
    this.bodyElement.classList.add("events-pane");

    var refreshButton = this.titleElement.createChild("button", "pane-title-button refresh");
    refreshButton.addEventListener("click", this.update.bind(this), false);
    refreshButton.title = WebInspector.UIString("Refresh");

    this.settingsSelectElement = this.titleElement.createChild("select", "select-filter");

    var option = this.settingsSelectElement.createChild("option");
    option.value = "all";
    option.label = WebInspector.UIString("All Nodes");

    option = this.settingsSelectElement.createChild("option");
    option.value = "selected";
    option.label = WebInspector.UIString("Selected Node Only");

    this._eventListenersFilterSetting = WebInspector.settings.createSetting("eventListenersFilter", "all");
    var filter = this._eventListenersFilterSetting.get();
    if (filter === "all")
        this.settingsSelectElement[0].selected = true;
    else if (filter === "selected")
        this.settingsSelectElement[1].selected = true;
    this.settingsSelectElement.addEventListener("click", consumeEvent, false);
    this.settingsSelectElement.addEventListener("change", this._changeSetting.bind(this), false);

    this._eventListenersView = new WebInspector.EventListenersView(this.bodyElement);
}

WebInspector.EventListenersSidebarPane._objectGroupName = "event-listeners-panel";

WebInspector.EventListenersSidebarPane.prototype = {
    /**
     * @override
     * @param {!WebInspector.Throttler.FinishCallback} finishCallback
     * @protected
     */
    doUpdate: function(finishCallback)
    {
        if (this._lastRequestedNode) {
            this._lastRequestedNode.target().runtimeAgent().releaseObjectGroup(WebInspector.EventListenersSidebarPane._objectGroupName);
            delete this._lastRequestedNode;
        }
        this._eventListenersView.reset();
        var node = this.node();
        if (!node) {
            this._eventListenersArivedForTest();
            finishCallback();
            return;
        }

        this._lastRequestedNode = node;
        var selectedNodeOnly = "selected" === this._eventListenersFilterSetting.get();
        var promises = [];
        var listenersView = this._eventListenersView;
        promises.push(node.resolveToObjectPromise(WebInspector.EventListenersSidebarPane._objectGroupName).then(listenersView.addObjectEventListeners.bind(listenersView)));
        if (!selectedNodeOnly) {
            var currentNode = node.parentNode;
            while (currentNode) {
                promises.push(currentNode.resolveToObjectPromise(WebInspector.EventListenersSidebarPane._objectGroupName).then(listenersView.addObjectEventListeners.bind(listenersView)));
                currentNode = currentNode.parentNode;
            }
            this._windowObjectInNodeContext(node).then(windowObjectCallback.bind(this));
        } else {
            Promise.all(promises).then(mycallback.bind(this));
        }
        /**
         * @param {!WebInspector.RemoteObject} object
         * @this {WebInspector.EventListenersSidebarPane}
         */
        function windowObjectCallback(object)
        {
            promises.push(this._eventListenersView.addObjectEventListeners(object));
            Promise.all(promises).then(mycallback.bind(this));
        }
        /**
         * @this {WebInspector.EventListenersSidebarPane}
         */
        function mycallback()
        {
            this._eventListenersArivedForTest();
            finishCallback();
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise<!WebInspector.RemoteObject>} object
     */
    _windowObjectInNodeContext: function(node)
    {
        return new Promise(windowObjectInNodeContext);

        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         */
        function windowObjectInNodeContext(fulfill, reject)
        {
            var executionContexts = node.target().runtimeModel.executionContexts();
            var context = null;
            if (node.frameId()) {
                for (var i = 0; i < executionContexts.length; ++i) {
                    var executionContext = executionContexts[i];
                    if (executionContext.frameId === node.frameId() && executionContext.isMainWorldContext)
                        context = executionContext;
                }
            } else {
                context = executionContexts[0];
            }
            context.evaluate("self", WebInspector.EventListenersSidebarPane._objectGroupName, false, true, false, false, fulfill);
        }
    },

    _changeSetting: function()
    {
        var selectedOption = this.settingsSelectElement[this.settingsSelectElement.selectedIndex];
        this._eventListenersFilterSetting.set(selectedOption.value);
        this.update();
    },

    _eventListenersArivedForTest: function()
    {
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
}
