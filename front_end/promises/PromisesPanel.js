// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.PromisesPanel = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("promisesPanel.css");
    this.element.classList.add("promises");

    var buttonsBar = this.element.createChild("div");
    var enableButton = buttonsBar.createChild("button");
    enableButton.textContent = WebInspector.UIString("Enable Promises tracking");
    enableButton.addEventListener("click", this._enableButtonClicked.bind(this));
    var disableButton = buttonsBar.createChild("button");
    disableButton.textContent = WebInspector.UIString("Disable Promises tracking");
    disableButton.addEventListener("click", this._disableButtonClicked.bind(this));
    var refreshButton = buttonsBar.createChild("button");
    refreshButton.textContent = WebInspector.UIString("Refresh");
    refreshButton.addEventListener("click", this._refreshButtonClicked.bind(this));
    var clearButton = buttonsBar.createChild("button");
    clearButton.textContent = WebInspector.UIString("Clear");
    clearButton.addEventListener("click", this._clearButtonClicked.bind(this));

    this._dataGridContainer = new WebInspector.VBox();
    this._dataGridContainer.show(this.element);
    var columns = [
        { id: "promiseId", title: WebInspector.UIString("Promise ID"), disclosure: true },
        { id: "status", title: WebInspector.UIString("Status") },
        { id: "location", title: WebInspector.UIString("Location") },
        { id: "tts", title: WebInspector.UIString("Time to settle") }
    ];
    this._dataGrid = new WebInspector.DataGrid(columns);
    this._dataGrid.element.addEventListener("contextmenu", this._contextMenu.bind(this));
    this._dataGrid.show(this._dataGridContainer.element);

    this._linkifier = new WebInspector.Linkifier();
}

WebInspector.PromisesPanel.prototype = {
    _refreshButtonClicked: function(event)
    {
        this._updateData();
    },

    _clearButtonClicked: function(event)
    {
        this._clear();
    },

    _enableButtonClicked: function(event)
    {
        var mainTarget = WebInspector.targetManager.mainTarget();
        if (mainTarget) {
            mainTarget.debuggerAgent().enablePromiseTracker();
            this._target = mainTarget;
        }
    },

    _disableButtonClicked: function(event)
    {
        if (this._target) {
            this._target.debuggerAgent().disablePromiseTracker();
            delete this._target;
        }
    },

    /**
     * @param {!DebuggerAgent.PromiseDetails} p1
     * @param {!DebuggerAgent.PromiseDetails} p2
     * @return {number}
     */
    _comparePromises: function(p1, p2) {
        var t1 = p1.creationTime || 0;
        var t2 = p2.creationTime || 0;
        return t1 - t2;
    },

    _updateData: function()
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array.<!DebuggerAgent.PromiseDetails>} promiseData
         * @this {WebInspector.PromisesPanel}
         */
        function callback(error, promiseData)
        {
            if (error || !promiseData)
                return;

            promiseData.sort(this._comparePromises);
            var nodesToInsert = { __proto__: null };
            for (var i = 0; i < promiseData.length; i++) {
                var promise = promiseData[i];
                var data = {
                    promiseId: promise.id,
                    status: promise.status
                };
                if (promise.callFrame)
                    data.location = this._linkifier.linkifyConsoleCallFrame(this._target, promise.callFrame);
                if (promise.creationTime && promise.settlementTime && promise.settlementTime >= promise.creationTime)
                    data.tts = Number.millisToString(promise.settlementTime - promise.creationTime, true);
                var node = new WebInspector.DataGridNode(data, false);
                nodesToInsert[promise.id] = { node: node, parentId: promise.parentId };
            }

            var rootNode = this._dataGrid.rootNode();

            for (var id in nodesToInsert) {
                var node = nodesToInsert[id].node;
                var parentId = nodesToInsert[id].parentId;
                var parentNode = (parentId && nodesToInsert[parentId]) ? nodesToInsert[parentId].node : rootNode;
                parentNode.appendChild(node);
            }
        }

        this._clear();
        if (this._target)
            this._target.debuggerAgent().getPromises(callback.bind(this));
    },

    _clear: function()
    {
        this._dataGrid.rootNode().removeChildren();
        this._linkifier.reset();
    },

    _contextMenu: function(event)
    {
        var gridNode = this._dataGrid.dataGridNodeFromNode(event.target);
        if (!gridNode || !this._target)
            return;
        var contextMenu = new WebInspector.ContextMenu(event);
        var promiseId = gridNode.data.promiseId;

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show in console" : "Show In Console"), showPromiseInConsole.bind(this));
        contextMenu.show();

        /**
         * @this {WebInspector.PromisesPanel}
         */
        function showPromiseInConsole()
        {
            if (this._target)
                this._target.debuggerAgent().getPromiseById(promiseId, "console", didGetPromiseById.bind(this));
        }

        /**
         * @param {?Protocol.Error} error
         * @param {?RuntimeAgent.RemoteObject} promise
         * @this {WebInspector.PromisesPanel}
         */
        function didGetPromiseById(error, promise)
        {
            if (error || !promise)
                return;

            if (!this._target)
                return;

            var message = new WebInspector.ConsoleMessage(this._target,
                                                          WebInspector.ConsoleMessage.MessageSource.Other,
                                                          WebInspector.ConsoleMessage.MessageLevel.Log,
                                                          "",
                                                          WebInspector.ConsoleMessage.MessageType.Log,
                                                          undefined,
                                                          undefined,
                                                          undefined,
                                                          undefined,
                                                          [promise]);
            this._target.consoleModel.addMessage(message);
            WebInspector.console.show();
        }
    },

    __proto__: WebInspector.VBox.prototype
}

