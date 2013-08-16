/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {WebInspector.CanvasTraceLogPlayerProxy} traceLogPlayer
 */
WebInspector.CanvasReplayStateView = function(traceLogPlayer)
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("canvasProfiler.css");
    this.element.addStyleClass("canvas-replay-state-view");
    this._traceLogPlayer = traceLogPlayer;

    var controlsContainer = this.element.createChild("div", "status-bar");

    this._resourceSelector = new WebInspector.StatusBarComboBox(this._onReplayResourceChanged.bind(this));
    this._resourceSelector.createOption(WebInspector.UIString("<auto>"), WebInspector.UIString("Show state of the last replayed resource."), "");
    controlsContainer.appendChild(this._resourceSelector.element);

    /** @type {!Object.<string, boolean>} */
    this._resources = {};

    var columns = [
        {title: WebInspector.UIString("Name"), sortable: false, width: "50%", disclosure: true},
        {title: WebInspector.UIString("Value"), sortable: false, width: "50%"}
    ];

    this._stateGrid = new WebInspector.DataGrid(columns);
    this._stateGrid.element.addStyleClass("fill");
    this._stateGrid.show(this.element);

    this._traceLogPlayer.addEventListener(WebInspector.CanvasTraceLogPlayerProxy.Events.CanvasReplayStateChanged, this._onReplayResourceChanged, this);
    this._traceLogPlayer.addEventListener(WebInspector.CanvasTraceLogPlayerProxy.Events.CanvasTraceLogReceived, this._onCanvasTraceLogReceived, this);
    this._traceLogPlayer.addEventListener(WebInspector.CanvasTraceLogPlayerProxy.Events.CanvasResourceStateReceived, this._onCanvasResourceStateReceived, this);
}

WebInspector.CanvasReplayStateView.prototype = {
    /**
     * @param {string} resourceId
     */
    selectResource: function(resourceId)
    {
        if (resourceId === this._resourceSelector.selectedOption().value)
            return;
        var option = this._resourceSelector.selectElement().firstChild;
        for (var index = 0; option; ++index, option = option.nextSibling) {
            if (resourceId === option.value) {
                this._resourceSelector.setSelectedIndex(index);
                this._onReplayResourceChanged();
                break;
            }
        }
    },

    /**
     * @param {!CanvasAgent.TraceLog} traceLog
     */
    _collectResourcesFromTraceLog: function(traceLog)
    {
        /** @type {!Array.<!CanvasAgent.CallArgument>} */
        var collectedResources = [];
        var calls = traceLog.calls;
        for (var i = 0, n = calls.length; i < n; ++i) {
            var call = calls[i];
            var args = call.arguments || [];
            for (var j = 0; j < args.length; ++j)
                this._collectResourceFromCallArgument(args[j], collectedResources);
            this._collectResourceFromCallArgument(call.result, collectedResources);
            this._collectResourceFromCallArgument(call.value, collectedResources);
        }
        var contexts = traceLog.contexts;
        for (var i = 0, n = contexts.length; i < n; ++i)
            this._collectResourceFromCallArgument(contexts[i], collectedResources);
        this._addCollectedResourcesToSelector(collectedResources);
    },

    /**
     * @param {!CanvasAgent.ResourceState} resourceState
     */
    _collectResourcesFromResourceState: function(resourceState)
    {
        /** @type {!Array.<!CanvasAgent.CallArgument>} */
        var collectedResources = [];
        this._collectResourceFromResourceStateDescriptors(resourceState.descriptors, collectedResources);
        this._addCollectedResourcesToSelector(collectedResources);
    },

    /**
     * @param {Array.<!CanvasAgent.ResourceStateDescriptor>|undefined} descriptors
     * @param {!Array.<!CanvasAgent.CallArgument>} output
     */
    _collectResourceFromResourceStateDescriptors: function(descriptors, output)
    {
        if (!descriptors)
            return;
        for (var i = 0, n = descriptors.length; i < n; ++i) {
            var descriptor = descriptors[i];
            this._collectResourceFromCallArgument(descriptor.value, output);
            this._collectResourceFromResourceStateDescriptors(descriptor.values, output);
        }
    },

    /**
     * @param {CanvasAgent.CallArgument|undefined} argument
     * @param {!Array.<!CanvasAgent.CallArgument>} output
     */
    _collectResourceFromCallArgument: function(argument, output)
    {
        if (!argument)
            return;
        var resourceId = argument.resourceId;
        if (!resourceId || this._resources[resourceId])
            return;
        this._resources[resourceId] = true;
        output.push(argument);
    },

    /**
     * @param {!Array.<!CanvasAgent.CallArgument>} collectedResources
     */
    _addCollectedResourcesToSelector: function(collectedResources)
    {
        if (!collectedResources.length)
            return;
        /**
         * @param {!CanvasAgent.CallArgument} arg1
         * @param {!CanvasAgent.CallArgument} arg2
         * @return {number}
         */
        function comparator(arg1, arg2)
        {
            var a = arg1.description;
            var b = arg2.description;
            return String.naturalOrderComparator(a, b);
        }
        collectedResources.sort(comparator);

        var selectElement = this._resourceSelector.selectElement();
        var currentOption = selectElement.firstChild;
        currentOption = currentOption.nextSibling; // Skip the "<auto>" option.
        for (var i = 0, n = collectedResources.length; i < n; ++i) {
            var argument = collectedResources[i];
            while (currentOption && String.naturalOrderComparator(currentOption.text, argument.description) < 0)
                currentOption = currentOption.nextSibling;
            var option = this._resourceSelector.createOption(argument.description, WebInspector.UIString("Show state of this resource."), argument.resourceId);
            if (currentOption)
                selectElement.insertBefore(option, currentOption);
        }
    },

    _onReplayResourceChanged: function()
    {
        var selectedResourceId = this._resourceSelector.selectedOption().value;
        /**
         * @param {?CanvasAgent.ResourceState} resourceState
         */
        function didReceiveResourceState(resourceState)
        {
            if (selectedResourceId !== this._resourceSelector.selectedOption().value)
                return;
            this._showResourceState(resourceState);
        }
        this._traceLogPlayer.getResourceState(selectedResourceId, didReceiveResourceState.bind(this));
    },

    /**
     * @param {WebInspector.Event} event
     */
    _onCanvasTraceLogReceived: function(event)
    {
        var traceLog = /** @type {CanvasAgent.TraceLog} */ (event.data);
        if (traceLog)
            this._collectResourcesFromTraceLog(traceLog);
    },

    /**
     * @param {WebInspector.Event} event
     */
    _onCanvasResourceStateReceived: function(event)
    {
        var resourceState = /** @type {CanvasAgent.ResourceState} */ (event.data);
        if (resourceState)
            this._collectResourcesFromResourceState(resourceState);
    },

    /**
     * @param {?CanvasAgent.ResourceState} resourceState
     */
    _showResourceState: function(resourceState)
    {
        var rootNode = this._stateGrid.rootNode();
        rootNode.removeChildren();
        if (!resourceState)
            return;
        /**
         * @param {!CanvasAgent.ResourceStateDescriptor} d1
         * @param {!CanvasAgent.ResourceStateDescriptor} d2
         * @return {number}
         */
        function comparator(d1, d2)
        {
            var hasChildren1 = !!d1.values;
            var hasChildren2 = !!d2.values;
            if (hasChildren1 !== hasChildren2)
                return hasChildren1 ? 1 : -1;
            return String.naturalOrderComparator(d1.name, d2.name);
        }
        /**
         * @param {Array.<!CanvasAgent.ResourceStateDescriptor>|undefined} descriptors
         * @param {!WebInspector.DataGridNode} node
         */
        function appendResourceStateDescriptors(descriptors, node)
        {
            if (!descriptors || !descriptors.length)
                return;
            descriptors.sort(comparator);
            for (var i = 0, n = descriptors.length; i < n; ++i) {
                var descriptor = descriptors[i];
                var childNode = this._createDataGridNode(descriptor);
                node.appendChild(childNode);
                appendResourceStateDescriptors.call(this, descriptor.values, childNode);
            }
        }
        appendResourceStateDescriptors.call(this, resourceState.descriptors, rootNode);
    },

    /**
     * @param {!CanvasAgent.ResourceStateDescriptor} descriptor
     * @return {!WebInspector.DataGridNode}
     */
    _createDataGridNode: function(descriptor)
    {
        var name = descriptor.name;
        var callArgument = descriptor.value;

        /** @type {!Element|string} */
        var valueElement = callArgument ? WebInspector.CanvasProfileDataGridHelper.createCallArgumentElement(callArgument) : "";

        /** @type {!Element|string} */
        var nameElement = name;
        if (typeof descriptor.enumValueForName !== "undefined")
            nameElement = WebInspector.CanvasProfileDataGridHelper.createEnumValueElement(name, +descriptor.enumValueForName);

        if (descriptor.isArray && descriptor.values) {
            if (typeof nameElement === "string")
                nameElement += "[" + descriptor.values.length + "]";
            else {
                var element = document.createElement("span");
                element.appendChild(nameElement);
                element.createTextChild("[" + descriptor.values.length + "]");
                nameElement = element;
            }
        }

        var data = {};
        data[0] = nameElement;
        data[1] = valueElement;
        var node = new WebInspector.DataGridNode(data);
        node.selectable = false;
        return node;
    },

    __proto__: WebInspector.View.prototype
}
