// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.PromisePane = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("promises/promisePane.css");
    this.element.classList.add("promises");

    var statusBar = new WebInspector.StatusBar(this.element);
    this._recordButton = new WebInspector.StatusBarButton(WebInspector.UIString("Record Promises"), "record-status-bar-item");
    this._recordButton.addEventListener("click", this._recordButtonClicked.bind(this));
    statusBar.appendStatusBarItem(this._recordButton);
    var clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-status-bar-item");
    clearButton.addEventListener("click", this._clearButtonClicked.bind(this));
    statusBar.appendStatusBarItem(clearButton);
    this._refreshButton = new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"), "refresh-status-bar-item");
    this._refreshButton.addEventListener("click", this._refreshButtonClicked.bind(this));
    this._refreshButton.setEnabled(false);
    statusBar.appendStatusBarItem(this._refreshButton);

    this._captureStacksSetting = WebInspector.settings.createSetting("promisesCaptureStacks", false);
    this._captureStacksSetting.addChangeListener(this._refreshCaptureStacks, this);
    this._captureStacksCheckbox = new WebInspector.StatusBarCheckbox(WebInspector.UIString("Capture stacks"), WebInspector.UIString("Capture stack traces for promise creation and settlement events. (Has performance overhead)"), this._captureStacksSetting);
    statusBar.appendStatusBarItem(this._captureStacksCheckbox);

    this._dataGridContainer = new WebInspector.VBox();
    this._dataGridContainer.show(this.element);
    var columns = [
        { id: "location", title: WebInspector.UIString("Location"), disclosure: true },
        { id: "status", title: WebInspector.UIString("Status") },
        { id: "tts", title: WebInspector.UIString("Time to settle") }
    ];
    this._dataGrid = new WebInspector.DataGrid(columns, undefined, undefined, undefined, this._onContextMenu.bind(this));
    this._dataGrid.show(this._dataGridContainer.element);

    this._linkifier = new WebInspector.Linkifier();

    this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(250, 250);

    this.element.addEventListener("click", this._hidePopover.bind(this), false);
}

WebInspector.PromisePane.prototype = {
    /**
     * @override
     */
    willHide: function()
    {
        this._hidePopover();
    },

    _hidePopover: function()
    {
        this._popoverHelper.hidePopover();
    },

    _recordButtonClicked: function()
    {
        var recording = !this._recordButton.toggled();
        this._recordButton.setToggled(recording);
        this._refreshButton.setEnabled(recording);
        if (recording)
            this._enablePromiseTracker();
        else
            this._disablePromiseTracker();
    },

    _refreshButtonClicked: function()
    {
        this._updateData();
    },

    _clearButtonClicked: function()
    {
        this._clear();
    },

    _enablePromiseTracker: function()
    {
        var mainTarget = WebInspector.targetManager.mainTarget();
        if (mainTarget) {
            this._target = mainTarget;
            var capture = this._captureStacksSetting.get();
            this._target.debuggerAgent().enablePromiseTracker(capture);
        }
    },

    _disablePromiseTracker: function()
    {
        this._clear();
        if (this._target) {
            this._target.debuggerAgent().disablePromiseTracker();
            delete this._target;
        }
    },

    _refreshCaptureStacks: function()
    {
        if (!this._target)
            return;
        var capture = this._captureStacksSetting.get();
        this._target.debuggerAgent().enablePromiseTracker(capture);
    },

    /**
     * @param {!DebuggerAgent.PromiseDetails} p1
     * @param {!DebuggerAgent.PromiseDetails} p2
     * @return {number}
     */
    _comparePromises: function(p1, p2)
    {
        var t1 = p1.creationTime || 0;
        var t2 = p2.creationTime || 0;
        return (t1 - t2) || (p1.id - p2.id);
    },

    _updateData: function()
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array.<!DebuggerAgent.PromiseDetails>} promiseDetails
         * @this {WebInspector.PromisePane}
         */
        function callback(error, promiseDetails)
        {
            if (error || !promiseDetails)
                return;

            promiseDetails.sort(this._comparePromises);
            var nodesToInsert = { __proto__: null };
            for (var i = 0; i < promiseDetails.length; i++) {
                var promise = promiseDetails[i];
                var statusElement = createElementWithClass("div", "status " + promise.status);
                statusElement.createTextChild(promise.status);
                var data = {
                    promiseId: promise.id,
                    location: promise.callFrame ? this._linkifier.linkifyConsoleCallFrame(this._target, promise.callFrame) : WebInspector.UIString("(unknown)"),
                    status: statusElement
                };
                if (promise.creationTime && promise.settlementTime && promise.settlementTime >= promise.creationTime)
                    data.tts = Number.millisToString(promise.settlementTime - promise.creationTime);
                var node = new WebInspector.DataGridNode(data, false);
                node.__promiseDetails = promise;
                nodesToInsert[promise.id] = { node: node, parentId: promise.parentId };
            }

            var rootNode = this._dataGrid.rootNode();

            for (var id in nodesToInsert) {
                var node = nodesToInsert[id].node;
                var parentId = nodesToInsert[id].parentId;
                var parentNode = (parentId && nodesToInsert[parentId]) ? nodesToInsert[parentId].node : rootNode;
                parentNode.appendChild(node);
                parentNode.expanded = true;
            }
        }

        this._clear();
        if (this._target)
            this._target.debuggerAgent().getPromises(callback.bind(this));
    },

    _clear: function()
    {
        this._popoverHelper.hidePopover();
        this._dataGrid.rootNode().removeChildren();
        this._linkifier.reset();
        if (this._target)
            this._target.heapProfilerAgent().collectGarbage();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!WebInspector.DataGridNode} node
     */
    _onContextMenu: function(contextMenu, node)
    {
        if (!this._target)
            return;
        var promiseId = node.data.promiseId;

        contextMenu.appendItem(WebInspector.UIString.capitalize("Show in ^console"), showPromiseInConsole.bind(this));
        contextMenu.show();

        /**
         * @this {WebInspector.PromisePane}
         */
        function showPromiseInConsole()
        {
            if (this._target)
                this._target.debuggerAgent().getPromiseById(promiseId, "console", didGetPromiseById.bind(this));
        }

        /**
         * @param {?Protocol.Error} error
         * @param {?RuntimeAgent.RemoteObject} promise
         * @this {WebInspector.PromisePane}
         */
        function didGetPromiseById(error, promise)
        {
            if (error || !promise)
                return;

            if (!this._target)
                return;

            this._target.consoleAgent().setLastEvaluationResult(promise.objectId);
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

    /**
     * @param {!Element} element
     * @param {!Event} event
     * @return {!Element|!AnchorBox|undefined}
     */
    _getPopoverAnchor: function(element, event)
    {
        if (!this._target)
            return undefined;
        var node = this._dataGrid.dataGridNodeFromNode(element);
        if (!node)
            return undefined;
        var details = node.__promiseDetails;
        if (!details)
            return undefined;
        var anchor = element.enclosingNodeOrSelfWithClass("location-column");
        if (anchor)
            return details.creationStack ? anchor : undefined;
        anchor = element.enclosingNodeOrSelfWithClass("status-column");
        return (anchor && details.settlementStack) ? anchor : undefined;
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        var node = this._dataGrid.dataGridNodeFromNode(anchor);
        var details = node.__promiseDetails;

        var stackTrace;
        var asyncStackTrace;
        if (anchor.classList.contains("location-column")) {
            stackTrace = details.creationStack;
            asyncStackTrace = details.asyncCreationStack;
        } else {
            stackTrace = details.settlementStack;
            asyncStackTrace = details.asyncSettlementStack;
        }

        var content = WebInspector.DOMPresentationUtils.buildStackTracePreviewContents(this._target, this._linkifier, stackTrace, asyncStackTrace);
        popover.setCanShrink(true);
        popover.showForAnchor(content, anchor);
    },

    __proto__: WebInspector.VBox.prototype
}
