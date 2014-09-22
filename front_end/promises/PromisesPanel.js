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
        { id: "location", title: WebInspector.UIString("Location") }
    ];
    this._dataGrid = new WebInspector.DataGrid(columns);
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
        if (p1.parentId < p2.parentId)
            return -1
        if (p1.parentId > p2.parentId)
            return 1
        if (p1.id < p2.id)
            return -1;
        if (p1.id > p2.id)
            return 1;
        return 0;
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

    __proto__: WebInspector.VBox.prototype
}

