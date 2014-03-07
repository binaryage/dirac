/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @extends {WebInspector.DataGridNode}
 * @param {!WebInspector.HeapSnapshotSortableDataGrid} tree
 * @param {boolean} hasChildren
 */
WebInspector.HeapSnapshotGridNode = function(tree, hasChildren)
{
    WebInspector.DataGridNode.call(this, null, hasChildren);
    this._dataGrid = tree;
    this._instanceCount = 0;

    this._savedChildren = null;
    /**
     * List of position ranges for all visible nodes: [startPos1, endPos1),...,[startPosN, endPosN)
     * Position is an item position in the provider.
     */
    this._retrievedChildrenRanges = [];

    /**
      * @type {?WebInspector.HeapSnapshotGridNode.ChildrenProvider}
      */
    this._providerObject = null;
}

WebInspector.HeapSnapshotGridNode.Events = {
    PopulateComplete: "PopulateComplete"
}

/**
 * @param {!Array.<string>} fieldNames
 * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
 */
WebInspector.HeapSnapshotGridNode.createComparator = function(fieldNames)
{
    return /** @type {!WebInspector.HeapSnapshotCommon.ComparatorConfig} */ ({fieldName1: fieldNames[0], ascending1: fieldNames[1], fieldName2: fieldNames[2], ascending2: fieldNames[3]});
}


/**
 * @interface
 */
WebInspector.HeapSnapshotGridNode.ChildrenProvider = function() { }

WebInspector.HeapSnapshotGridNode.ChildrenProvider.prototype = {
    dispose: function() { },

    /**
     * @param {number} snapshotObjectId
     * @param {function(number)} callback
     */
    nodePosition: function(snapshotObjectId, callback) { },

    /**
     * @param {function(boolean)} callback
     */
    isEmpty: function(callback) { },

    /**
     * @param {number} startPosition
     * @param {number} endPosition
     * @param {function(!WebInspector.HeapSnapshotCommon.ItemsRange)} callback
     */
    serializeItemsRange: function(startPosition, endPosition, callback) { },

    /**
     * @param {!WebInspector.HeapSnapshotCommon.ComparatorConfig} comparator
     * @param {function()} callback
     */
    sortAndRewind: function(comparator, callback) { }
}


WebInspector.HeapSnapshotGridNode.prototype = {
    /**
     * @return {!WebInspector.HeapSnapshotGridNode.ChildrenProvider}
     */
    createProvider: function()
    {
        throw new Error("Not implemented.");
    },

    /**
     * @return {!WebInspector.HeapSnapshotGridNode.ChildrenProvider}
     */
    _provider: function()
    {
        if (!this._providerObject)
            this._providerObject = this.createProvider();
        return this._providerObject;
    },

    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
        if (this._searchMatched)
            cell.classList.add("highlight");
        return cell;
    },

    /**
     * @override
     */
    collapse: function()
    {
        WebInspector.DataGridNode.prototype.collapse.call(this);
        this._dataGrid.updateVisibleNodes();
    },

    /**
     * @override
     */
    expand: function()
    {
        WebInspector.DataGridNode.prototype.expand.call(this);
        this._dataGrid.updateVisibleNodes();
    },

    /**
     * @override
     */
    dispose: function()
    {
        if (this._providerObject)
            this._providerObject.dispose();
        for (var node = this.children[0]; node; node = node.traverseNextNode(true, this, true))
            if (node.dispose)
                node.dispose();
    },

    _reachableFromWindow: false,

    queryObjectContent: function(callback)
    {
    },

    /**
     * @override
     */
    wasDetached: function()
    {
        this._dataGrid.nodeWasDetached(this);
    },

    _toPercentString: function(num)
    {
        return num.toFixed(0) + "\u2009%"; // \u2009 is a thin space.
    },

    /**
     * @return {!Array.<!WebInspector.DataGridNode>}
     */
    allChildren: function()
    {
        return this._dataGrid.allChildren(this);
    },

    /**
     * @param {number} index
     */
    removeChildByIndex: function(index)
    {
        this._dataGrid.removeChildByIndex(this, index);
    },

    /**
     * @param {number} nodePosition
     * @return {?WebInspector.DataGridNode}
     */
    childForPosition: function(nodePosition)
    {
        var indexOfFirstChildInRange = 0;
        for (var i = 0; i < this._retrievedChildrenRanges.length; i++) {
           var range = this._retrievedChildrenRanges[i];
           if (range.from <= nodePosition && nodePosition < range.to) {
               var childIndex = indexOfFirstChildInRange + nodePosition - range.from;
               return this.allChildren()[childIndex];
           }
           indexOfFirstChildInRange += range.to - range.from + 1;
        }
        return null;
    },

    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    _createValueCell: function(columnIdentifier)
    {
        var cell = document.createElement("td");
        cell.className = columnIdentifier + "-column";
        if (this.dataGrid.snapshot.totalSize !== 0) {
            var div = document.createElement("div");
            var valueSpan = document.createElement("span");
            valueSpan.textContent = this.data[columnIdentifier];
            div.appendChild(valueSpan);
            var percentColumn = columnIdentifier + "-percent";
            if (percentColumn in this.data) {
                var percentSpan = document.createElement("span");
                percentSpan.className = "percent-column";
                percentSpan.textContent = this.data[percentColumn];
                div.appendChild(percentSpan);
                div.classList.add("heap-snapshot-multiple-values");
            }
            cell.appendChild(div);
        }
        return cell;
    },

    populate: function(event)
    {
        if (this._populated)
            return;
        this._populated = true;

        /**
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function sorted()
        {
            this._populateChildren();
        }
        this._provider().sortAndRewind(this.comparator(), sorted.bind(this));
    },

    expandWithoutPopulate: function(callback)
    {
        // Make sure default populate won't take action.
        this._populated = true;
        this.expand();
        this._provider().sortAndRewind(this.comparator(), callback);
    },

    /**
     * @param {?number=} fromPosition
     * @param {?number=} toPosition
     * @param {function()=} afterPopulate
     */
    _populateChildren: function(fromPosition, toPosition, afterPopulate)
    {
        fromPosition = fromPosition || 0;
        toPosition = toPosition || fromPosition + this._dataGrid.defaultPopulateCount();
        var firstNotSerializedPosition = fromPosition;

        /**
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function serializeNextChunk()
        {
            if (firstNotSerializedPosition >= toPosition)
                return;
            var end = Math.min(firstNotSerializedPosition + this._dataGrid.defaultPopulateCount(), toPosition);
            this._provider().serializeItemsRange(firstNotSerializedPosition, end, childrenRetrieved.bind(this));
            firstNotSerializedPosition = end;
        }

        /**
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function insertRetrievedChild(item, insertionIndex)
        {
            if (this._savedChildren) {
                var hash = this._childHashForEntity(item);
                if (hash in this._savedChildren) {
                    this._dataGrid.insertChild(this, this._savedChildren[hash], insertionIndex);
                    return;
                }
            }
            this._dataGrid.insertChild(this, this._createChildNode(item), insertionIndex);
        }

        /**
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function insertShowMoreButton(from, to, insertionIndex)
        {
            var button = new WebInspector.ShowMoreDataGridNode(this._populateChildren.bind(this), from, to, this._dataGrid.defaultPopulateCount());
            this._dataGrid.insertChild(this, button, insertionIndex);
        }

        /**
         * @param {!WebInspector.HeapSnapshotCommon.ItemsRange} itemsRange
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function childrenRetrieved(itemsRange)
        {
            var itemIndex = 0;
            var itemPosition = itemsRange.startPosition;
            var items = itemsRange.items;
            var insertionIndex = 0;

            if (!this._retrievedChildrenRanges.length) {
                if (itemsRange.startPosition > 0) {
                    this._retrievedChildrenRanges.push({from: 0, to: 0});
                    insertShowMoreButton.call(this, 0, itemsRange.startPosition, insertionIndex++);
                }
                this._retrievedChildrenRanges.push({from: itemsRange.startPosition, to: itemsRange.endPosition});
                for (var i = 0, l = items.length; i < l; ++i)
                    insertRetrievedChild.call(this, items[i], insertionIndex++);
                if (itemsRange.endPosition < itemsRange.totalLength)
                    insertShowMoreButton.call(this, itemsRange.endPosition, itemsRange.totalLength, insertionIndex++);
            } else {
                var rangeIndex = 0;
                var found = false;
                var range;
                while (rangeIndex < this._retrievedChildrenRanges.length) {
                    range = this._retrievedChildrenRanges[rangeIndex];
                    if (range.to >= itemPosition) {
                        found = true;
                        break;
                    }
                    insertionIndex += range.to - range.from;
                    // Skip the button if there is one.
                    if (range.to < itemsRange.totalLength)
                        insertionIndex += 1;
                    ++rangeIndex;
                }

                if (!found || itemsRange.startPosition < range.from) {
                    // Update previous button.
                    this.allChildren()[insertionIndex - 1].setEndPosition(itemsRange.startPosition);
                    insertShowMoreButton.call(this, itemsRange.startPosition, found ? range.from : itemsRange.totalLength, insertionIndex);
                    range = {from: itemsRange.startPosition, to: itemsRange.startPosition};
                    if (!found)
                        rangeIndex = this._retrievedChildrenRanges.length;
                    this._retrievedChildrenRanges.splice(rangeIndex, 0, range);
                } else {
                    insertionIndex += itemPosition - range.from;
                }
                // At this point insertionIndex is always an index before button or between nodes.
                // Also it is always true here that range.from <= itemPosition <= range.to

                // Stretch the range right bound to include all new items.
                while (range.to < itemsRange.endPosition) {
                    // Skip already added nodes.
                    var skipCount = range.to - itemPosition;
                    insertionIndex += skipCount;
                    itemIndex += skipCount;
                    itemPosition = range.to;

                    // We're at the position before button: ...<?node>x<button>
                    var nextRange = this._retrievedChildrenRanges[rangeIndex + 1];
                    var newEndOfRange = nextRange ? nextRange.from : itemsRange.totalLength;
                    if (newEndOfRange > itemsRange.endPosition)
                        newEndOfRange = itemsRange.endPosition;
                    while (itemPosition < newEndOfRange) {
                        insertRetrievedChild.call(this, items[itemIndex++], insertionIndex++);
                        ++itemPosition;
                    }
                    // Merge with the next range.
                    if (nextRange && newEndOfRange === nextRange.from) {
                        range.to = nextRange.to;
                        // Remove "show next" button if there is one.
                        this.removeChildByIndex(insertionIndex);
                        this._retrievedChildrenRanges.splice(rangeIndex + 1, 1);
                    } else {
                        range.to = newEndOfRange;
                        // Remove or update next button.
                        if (newEndOfRange === itemsRange.totalLength)
                            this.removeChildByIndex(insertionIndex);
                        else
                            this.allChildren()[insertionIndex].setStartPosition(itemsRange.endPosition);
                    }
                }
            }

            // TODO: fix this.
            this._instanceCount += items.length;
            if (firstNotSerializedPosition < toPosition) {
                serializeNextChunk.call(this);
                return;
            }

            this._dataGrid.updateVisibleNodes();
            if (afterPopulate)
                afterPopulate();
            this.dispatchEventToListeners(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete);
        }
        serializeNextChunk.call(this);
    },

    _saveChildren: function()
    {
        this._savedChildren = null;
        var children = this.allChildren();
        for (var i = 0, l = children.length; i < l; ++i) {
            var child = children[i];
            if (!child.expanded)
                continue;
            if (!this._savedChildren)
                this._savedChildren = {};
            this._savedChildren[this._childHashForNode(child)] = child;
        }
    },

    sort: function()
    {
        this._dataGrid.recursiveSortingEnter();

        /**
         * @this {WebInspector.HeapSnapshotGridNode}
         */
        function afterSort()
        {
            this._saveChildren();
            this._dataGrid.removeAllChildren(this);
            this._retrievedChildrenRanges = [];

            /**
             * @this {WebInspector.HeapSnapshotGridNode}
             */
            function afterPopulate()
            {
                var children = this.allChildren();
                for (var i = 0, l = children.length; i < l; ++i) {
                    var child = children[i];
                    if (child.expanded)
                        child.sort();
                }
                this._dataGrid.recursiveSortingLeave();
            }
            var instanceCount = this._instanceCount;
            this._instanceCount = 0;
            this._populateChildren(0, instanceCount, afterPopulate.bind(this));
        }

        this._provider().sortAndRewind(this.comparator(), afterSort.bind(this));
    },

    __proto__: WebInspector.DataGridNode.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotGridNode}
 * @param {!WebInspector.HeapSnapshotSortableDataGrid} tree
 */
WebInspector.HeapSnapshotGenericObjectNode = function(tree, node)
{
    this.snapshotNodeIndex = 0;
    WebInspector.HeapSnapshotGridNode.call(this, tree, false);
    // node is null for DataGrid root nodes.
    if (!node)
        return;
    this._name = node.name;
    this._type = node.type;
    this._distance = node.distance;
    this._shallowSize = node.selfSize;
    this._retainedSize = node.retainedSize;
    this.snapshotNodeId = node.id;
    this.snapshotNodeIndex = node.nodeIndex;
    if (this._type === "string")
        this._reachableFromWindow = true;
    else if (this._type === "object" && this._name.startsWith("Window")) {
        this._name = this.shortenWindowURL(this._name, false);
        this._reachableFromWindow = true;
    } else if (node.canBeQueried)
        this._reachableFromWindow = true;
    if (node.detachedDOMTreeNode)
        this.detachedDOMTreeNode = true;
};

WebInspector.HeapSnapshotGenericObjectNode.prototype = {
    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        var cell = columnIdentifier !== "object" ? this._createValueCell(columnIdentifier) : this._createObjectCell();
        if (this._searchMatched)
            cell.classList.add("highlight");
        return cell;
    },

    _createObjectCell: function()
    {
        var cell = document.createElement("td");
        cell.className = "object-column";
        var div = document.createElement("div");
        div.className = "source-code event-properties";
        div.style.overflow = "visible";

        var data = this.data["object"];
        if (this._prefixObjectCell)
            this._prefixObjectCell(div, data);

        var valueSpan = document.createElement("span");
        valueSpan.className = "value console-formatted-" + data.valueStyle;
        valueSpan.textContent = data.value;
        div.appendChild(valueSpan);

        var idSpan = document.createElement("span");
        idSpan.className = "console-formatted-id";
        idSpan.textContent = " @" + data["nodeId"];
        div.appendChild(idSpan);

        if (this._postfixObjectCell)
            this._postfixObjectCell(div, data);

        cell.appendChild(div);
        cell.classList.add("disclosure");
        if (this.depth)
            cell.style.setProperty("padding-left", (this.depth * this.dataGrid.indentWidth) + "px");
        cell.heapSnapshotNode = this;
        return cell;
    },

    get data()
    {
        var data = this._emptyData();

        var value = this._name;
        var valueStyle = "object";
        switch (this._type) {
        case "concatenated string":
        case "string":
            value = "\"" + value + "\"";
            valueStyle = "string";
            break;
        case "regexp":
            value = "/" + value + "/";
            valueStyle = "string";
            break;
        case "closure":
            value = "function" + (value ? " " : "") + value + "()";
            valueStyle = "function";
            break;
        case "number":
            valueStyle = "number";
            break;
        case "hidden":
            valueStyle = "null";
            break;
        case "array":
            if (!value)
                value = "[]";
            else
                value += "[]";
            break;
        };
        if (this._reachableFromWindow)
            valueStyle += " highlight";
        if (value === "Object")
            value = "";
        if (this.detachedDOMTreeNode)
            valueStyle += " detached-dom-tree-node";
        data["object"] = { valueStyle: valueStyle, value: value, nodeId: this.snapshotNodeId };

        data["distance"] =  this._distance;
        data["shallowSize"] = Number.withThousandsSeparator(this._shallowSize);
        data["retainedSize"] = Number.withThousandsSeparator(this._retainedSize);
        data["shallowSize-percent"] = this._toPercentString(this._shallowSizePercent);
        data["retainedSize-percent"] = this._toPercentString(this._retainedSizePercent);

        return this._enhanceData ? this._enhanceData(data) : data;
    },

    queryObjectContent: function(callback, objectGroupName)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} object
         */
        function formatResult(error, object)
        {
            if (!error && object.type)
                callback(WebInspector.RemoteObject.fromPayload(object), !!error);
            else
                callback(WebInspector.RemoteObject.fromPrimitiveValue(WebInspector.UIString("Preview is not available")));
        }

        if (this._type === "string")
            callback(WebInspector.RemoteObject.fromPrimitiveValue(this._name));
        else
            HeapProfilerAgent.getObjectByHeapObjectId(String(this.snapshotNodeId), objectGroupName, formatResult);
    },

    get _retainedSizePercent()
    {
        return this._retainedSize / this.dataGrid.snapshot.totalSize * 100.0;
    },

    get _shallowSizePercent()
    {
        return this._shallowSize / this.dataGrid.snapshot.totalSize * 100.0;
    },

    updateHasChildren: function()
    {
        /**
         * @this {WebInspector.HeapSnapshotGenericObjectNode}
         */
        function isEmptyCallback(isEmpty)
        {
            this.hasChildren = !isEmpty;
        }
        this._provider().isEmpty(isEmptyCallback.bind(this));
    },

    /**
     * @param {string} fullName
     * @param {boolean} hasObjectId
     * @return {string}
     */
    shortenWindowURL: function(fullName, hasObjectId)
    {
        var startPos = fullName.indexOf("/");
        var endPos = hasObjectId ? fullName.indexOf("@") : fullName.length;
        if (startPos !== -1 && endPos !== -1) {
            var fullURL = fullName.substring(startPos + 1, endPos).trimLeft();
            var url = fullURL.trimURL();
            if (url.length > 40)
                url = url.trimMiddle(40);
            return fullName.substr(0, startPos + 2) + url + fullName.substr(endPos);
        } else
            return fullName;
    },

    __proto__: WebInspector.HeapSnapshotGridNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotGenericObjectNode}
 * @param {!WebInspector.HeapSnapshotSortableDataGrid} tree
 * @param {boolean} isFromBaseSnapshot
 */
WebInspector.HeapSnapshotObjectNode = function(tree, isFromBaseSnapshot, edge, parentGridNode)
{
    WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, edge.node);
    this._referenceName = edge.name;
    this._referenceType = edge.type;
    this._distance = edge.distance;
    this.showRetainingEdges = tree.showRetainingEdges;
    this._isFromBaseSnapshot = isFromBaseSnapshot;

    this._parentGridNode = parentGridNode;
    this._cycledWithAncestorGridNode = this._findAncestorWithSameSnapshotNodeId();
    if (!this._cycledWithAncestorGridNode)
        this.updateHasChildren();
}

WebInspector.HeapSnapshotObjectNode.prototype = {
    /**
     * @return {!WebInspector.HeapSnapshotProviderProxy}
     */
    createProvider: function()
    {
        var tree = this._dataGrid;
        var showHiddenData = WebInspector.settings.showAdvancedHeapSnapshotProperties.get();
        var snapshot = this._isFromBaseSnapshot ? tree.baseSnapshot : tree.snapshot;
        if (this.showRetainingEdges)
            return snapshot.createRetainingEdgesProvider(this.snapshotNodeIndex, showHiddenData);
        else
            return snapshot.createEdgesProvider(this.snapshotNodeIndex, showHiddenData);
    },

    _findAncestorWithSameSnapshotNodeId: function()
    {
        var ancestor = this._parentGridNode;
        while (ancestor) {
            if (ancestor.snapshotNodeId === this.snapshotNodeId)
                return ancestor;
            ancestor = ancestor._parentGridNode;
        }
        return null;
    },

    _createChildNode: function(item)
    {
        return new WebInspector.HeapSnapshotObjectNode(this._dataGrid, this._isFromBaseSnapshot, item, this);
    },

    _childHashForEntity: function(edge)
    {
        var prefix = this.showRetainingEdges ? edge.node.id + "#" : "";
        return prefix + edge.type + "#" + edge.name;
    },

    _childHashForNode: function(childNode)
    {
        var prefix = this.showRetainingEdges ? childNode.snapshotNodeId + "#" : "";
        return prefix + childNode._referenceType + "#" + childNode._referenceName;
    },

    /**
     * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
     */
    comparator: function()
    {
        var sortAscending = this._dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
        var sortFields = {
            object: ["!edgeName", sortAscending, "retainedSize", false],
            count: ["!edgeName", true, "retainedSize", false],
            shallowSize: ["selfSize", sortAscending, "!edgeName", true],
            retainedSize: ["retainedSize", sortAscending, "!edgeName", true],
            distance: ["distance", sortAscending, "_name", true]
        }[sortColumnIdentifier] || ["!edgeName", true, "retainedSize", false];
        return WebInspector.HeapSnapshotGridNode.createComparator(sortFields);
    },

    _emptyData: function()
    {
        return { count: "", addedCount: "", removedCount: "", countDelta: "", addedSize: "", removedSize: "", sizeDelta: "" };
    },

    _enhanceData: function(data)
    {
        var name = this._referenceName;
        if (name === "") name = "(empty)";
        var nameClass = "name";
        switch (this._referenceType) {
        case "context":
            nameClass = "console-formatted-number";
            break;
        case "internal":
        case "hidden":
        case "weak":
            nameClass = "console-formatted-null";
            break;
        case "element":
            name = "[" + name + "]";
            break;
        }
        data["object"].nameClass = nameClass;
        data["object"].name = name;
        data["distance"] = this._distance;
        return data;
    },

    _prefixObjectCell: function(div, data)
    {
        if (this._cycledWithAncestorGridNode)
            div.className += " cycled-ancessor-node";

        var nameSpan = document.createElement("span");
        nameSpan.className = data.nameClass;
        nameSpan.textContent = data.name;
        div.appendChild(nameSpan);

        var separatorSpan = document.createElement("span");
        separatorSpan.className = "grayed";
        separatorSpan.textContent = this.showRetainingEdges ? " in " : " :: ";
        div.appendChild(separatorSpan);
    },

    __proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotGenericObjectNode}
 */
WebInspector.HeapSnapshotInstanceNode = function(tree, baseSnapshot, snapshot, node)
{
    WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, node);
    this._baseSnapshotOrSnapshot = baseSnapshot || snapshot;
    this._isDeletedNode = !!baseSnapshot;
    this.updateHasChildren();
};

WebInspector.HeapSnapshotInstanceNode.prototype = {
    /**
     * @return {!WebInspector.HeapSnapshotProviderProxy}
     */
    createProvider: function()
    {
        var showHiddenData = WebInspector.settings.showAdvancedHeapSnapshotProperties.get();
        return this._baseSnapshotOrSnapshot.createEdgesProvider(
            this.snapshotNodeIndex,
            showHiddenData);
    },

    _createChildNode: function(item)
    {
        return new WebInspector.HeapSnapshotObjectNode(this._dataGrid, this._isDeletedNode, item, null);
    },

    _childHashForEntity: function(edge)
    {
        return edge.type + "#" + edge.name;
    },

    _childHashForNode: function(childNode)
    {
        return childNode._referenceType + "#" + childNode._referenceName;
    },

    /**
     * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
     */
    comparator: function()
    {
        var sortAscending = this._dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
        var sortFields = {
            object: ["!edgeName", sortAscending, "retainedSize", false],
            distance: ["distance", sortAscending, "retainedSize", false],
            count: ["!edgeName", true, "retainedSize", false],
            addedSize: ["selfSize", sortAscending, "!edgeName", true],
            removedSize: ["selfSize", sortAscending, "!edgeName", true],
            shallowSize: ["selfSize", sortAscending, "!edgeName", true],
            retainedSize: ["retainedSize", sortAscending, "!edgeName", true]
        }[sortColumnIdentifier] || ["!edgeName", true, "retainedSize", false];
        return WebInspector.HeapSnapshotGridNode.createComparator(sortFields);
    },

    _emptyData: function()
    {
        return {count: "", countDelta: "", sizeDelta: ""};
    },

    _enhanceData: function(data)
    {
        if (this._isDeletedNode) {
            data["addedCount"] = "";
            data["addedSize"] = "";
            data["removedCount"] = "\u2022";
            data["removedSize"] = Number.withThousandsSeparator(this._shallowSize);
        } else {
            data["addedCount"] = "\u2022";
            data["addedSize"] = Number.withThousandsSeparator(this._shallowSize);
            data["removedCount"] = "";
            data["removedSize"] = "";
        }
        return data;
    },

    get isDeletedNode()
    {
        return this._isDeletedNode;
    },

    __proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}

/**
 * @constructor
 * @param {string} className
 * @param {!WebInspector.HeapSnapshotCommon.Aggregate} aggregate
 * @param {string} aggregatesKey
 * @extends {WebInspector.HeapSnapshotGridNode}
 */
WebInspector.HeapSnapshotConstructorNode = function(tree, className, aggregate, aggregatesKey)
{
    WebInspector.HeapSnapshotGridNode.call(this, tree, aggregate.count > 0);
    this._name = className;
    this._aggregatesKey = aggregatesKey;
    this._distance = aggregate.distance;
    this._count = aggregate.count;
    this._shallowSize = aggregate.self;
    this._retainedSize = aggregate.maxRet;
}

WebInspector.HeapSnapshotConstructorNode.prototype = {
    /**
     * @override
     * @return {!WebInspector.HeapSnapshotProviderProxy}
     */
    createProvider: function()
    {
        return this._dataGrid.snapshot.createNodesProviderForClass(this._name, this._aggregatesKey)
    },

    /**
     * @param {number} snapshotObjectId
     * @param {function(boolean)} callback
     */
    revealNodeBySnapshotObjectId: function(snapshotObjectId, callback)
    {
        /**
         * @this {WebInspector.HeapSnapshotConstructorNode}
         */
        function didExpand()
        {
            this._provider().nodePosition(snapshotObjectId, didGetNodePosition.bind(this));
        }

        /**
         * @this {WebInspector.HeapSnapshotConstructorNode}
         * @param {number} nodePosition
         */
        function didGetNodePosition(nodePosition)
        {
            if (nodePosition === -1) {
                this.collapse();
                callback(false);
            } else {
                this._populateChildren(nodePosition, null, didPopulateChildren.bind(this, nodePosition));
            }
        }

        /**
         * @this {WebInspector.HeapSnapshotConstructorNode}
         * @param {number} nodePosition
         */
        function didPopulateChildren(nodePosition)
        {
            var child = this.childForPosition(nodePosition);
            if (child) {
                this._dataGrid.revealTreeNode([this, child]);
                this._dataGrid.highlightNode(/** @type {!WebInspector.HeapSnapshotGridNode} */ (child));
            }
            callback(!!child);
        }

        this._dataGrid.resetNameFilter(this.expandWithoutPopulate.bind(this, didExpand.bind(this)));
    },

    /**
     * @return {boolean}
     */
    filteredOut: function()
    {
        return this._name.toLowerCase().indexOf(this._dataGrid._nameFilter) === -1;
    },

    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        var cell = columnIdentifier !== "object" ? this._createValueCell(columnIdentifier) : WebInspector.HeapSnapshotGridNode.prototype.createCell.call(this, columnIdentifier);
        if (this._searchMatched)
            cell.classList.add("highlight");
        return cell;
    },

    _createChildNode: function(item)
    {
        return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, null, this._dataGrid.snapshot, item);
    },

    /**
     * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
     */
    comparator: function()
    {
        var sortAscending = this._dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
        var sortFields = {
            object: ["id", sortAscending, "retainedSize", false],
            distance: ["distance", sortAscending, "retainedSize", false],
            count: ["id", true, "retainedSize", false],
            shallowSize: ["selfSize", sortAscending, "id", true],
            retainedSize: ["retainedSize", sortAscending, "id", true]
        }[sortColumnIdentifier];
        return WebInspector.HeapSnapshotGridNode.createComparator(sortFields);
    },

    _childHashForEntity: function(node)
    {
        return node.id;
    },

    _childHashForNode: function(childNode)
    {
        return childNode.snapshotNodeId;
    },

    get data()
    {
        var data = { object: this._name };
        data["count"] =  Number.withThousandsSeparator(this._count);
        data["distance"] =  this._distance;
        data["shallowSize"] = Number.withThousandsSeparator(this._shallowSize);
        data["retainedSize"] = Number.withThousandsSeparator(this._retainedSize);
        data["count-percent"] =  this._toPercentString(this._countPercent);
        data["shallowSize-percent"] = this._toPercentString(this._shallowSizePercent);
        data["retainedSize-percent"] = this._toPercentString(this._retainedSizePercent);
        return data;
    },

    get _countPercent()
    {
        return this._count / this.dataGrid.snapshot.nodeCount * 100.0;
    },

    get _retainedSizePercent()
    {
        return this._retainedSize / this.dataGrid.snapshot.totalSize * 100.0;
    },

    get _shallowSizePercent()
    {
        return this._shallowSize / this.dataGrid.snapshot.totalSize * 100.0;
    },

    __proto__: WebInspector.HeapSnapshotGridNode.prototype
}


/**
 * @constructor
 * @implements {WebInspector.HeapSnapshotGridNode.ChildrenProvider}
 * @param {!WebInspector.HeapSnapshotProviderProxy} addedNodesProvider
 * @param {!WebInspector.HeapSnapshotProviderProxy} deletedNodesProvider
 */
WebInspector.HeapSnapshotDiffNodesProvider = function(addedNodesProvider, deletedNodesProvider, addedCount, removedCount)
{
    this._addedNodesProvider = addedNodesProvider;
    this._deletedNodesProvider = deletedNodesProvider;
    this._addedCount = addedCount;
    this._removedCount = removedCount;
}

WebInspector.HeapSnapshotDiffNodesProvider.prototype = {
    dispose: function()
    {
        this._addedNodesProvider.dispose();
        this._deletedNodesProvider.dispose();
    },

    /**
     * @override
     * @param {number} snapshotObjectId
     * @param {function(number)} callback
     */
    nodePosition: function(snapshotObjectId, callback)
    {
        throw new Error("Unreachable");
    },

    /**
     * @param {function(boolean)} callback
     */
    isEmpty: function(callback)
    {
        callback(false);
    },

    /**
     * @param {number} beginPosition
     * @param {number} endPosition
     * @param {!function(!WebInspector.HeapSnapshotCommon.ItemsRange)} callback
     */
    serializeItemsRange: function(beginPosition, endPosition, callback)
    {
        /**
         * @param {!WebInspector.HeapSnapshotCommon.ItemsRange} items
         * @this {WebInspector.HeapSnapshotDiffNodesProvider}
         */
        function didReceiveAllItems(items)
        {
            items.totalLength = this._addedCount + this._removedCount;
            callback(items);
        }

        /**
         * @param {!WebInspector.HeapSnapshotCommon.ItemsRange} addedItems
         * @param {!WebInspector.HeapSnapshotCommon.ItemsRange} itemsRange
         * @this {WebInspector.HeapSnapshotDiffNodesProvider}
         */
        function didReceiveDeletedItems(addedItems, itemsRange)
        {
            var items = itemsRange.items;
            if (!addedItems.items.length)
                addedItems.startPosition = this._addedCount + itemsRange.startPosition;
            for (var i = 0; i < items.length; i++) {
                items[i].isAddedNotRemoved = false;
                addedItems.items.push(items[i]);
            }
            addedItems.endPosition = this._addedCount + itemsRange.endPosition;
            didReceiveAllItems.call(this, addedItems);
        }

        /**
         * @param {!WebInspector.HeapSnapshotCommon.ItemsRange} itemsRange
         * @this {WebInspector.HeapSnapshotDiffNodesProvider}
         */
        function didReceiveAddedItems(itemsRange)
        {
            var items = itemsRange.items;
            for (var i = 0; i < items.length; i++)
                items[i].isAddedNotRemoved = true;
            if (itemsRange.endPosition < endPosition)
                return this._deletedNodesProvider.serializeItemsRange(0, endPosition - itemsRange.endPosition, didReceiveDeletedItems.bind(this, itemsRange));

            itemsRange.totalLength = this._addedCount + this._removedCount;
            didReceiveAllItems.call(this, itemsRange);
        }

        if (beginPosition < this._addedCount) {
            this._addedNodesProvider.serializeItemsRange(beginPosition, endPosition, didReceiveAddedItems.bind(this));
        } else {
            var emptyRange = new WebInspector.HeapSnapshotCommon.ItemsRange(0, 0, 0, []);
            this._deletedNodesProvider.serializeItemsRange(beginPosition - this._addedCount, endPosition - this._addedCount, didReceiveDeletedItems.bind(this, emptyRange));
        }
    },

    /**
     * @param {!WebInspector.HeapSnapshotCommon.ComparatorConfig} comparator
     * @param {function()} callback
     */
    sortAndRewind: function(comparator, callback)
    {
        /**
         * @this {WebInspector.HeapSnapshotDiffNodesProvider}
         */
        function afterSort()
        {
            this._deletedNodesProvider.sortAndRewind(comparator, callback);
        }
        this._addedNodesProvider.sortAndRewind(comparator, afterSort.bind(this));
    }
};

/**
 * @constructor
 * @param {string} className
 * @param {!WebInspector.HeapSnapshotCommon.DiffForClass} diffForClass
 * @extends {WebInspector.HeapSnapshotGridNode}
 */
WebInspector.HeapSnapshotDiffNode = function(tree, className, diffForClass)
{
    WebInspector.HeapSnapshotGridNode.call(this, tree, true);
    this._name = className;

    this._addedCount = diffForClass.addedCount;
    this._removedCount = diffForClass.removedCount;
    this._countDelta = diffForClass.countDelta;
    this._addedSize = diffForClass.addedSize;
    this._removedSize = diffForClass.removedSize;
    this._sizeDelta = diffForClass.sizeDelta;
    this._deletedIndexes = diffForClass.deletedIndexes;
}

WebInspector.HeapSnapshotDiffNode.prototype = {
    /**
     * @override
     * @return {!WebInspector.HeapSnapshotDiffNodesProvider}
     */
    createProvider: function()
    {
        var tree = this._dataGrid;
        return new WebInspector.HeapSnapshotDiffNodesProvider(
            tree.snapshot.createAddedNodesProvider(tree.baseSnapshot.uid, this._name),
            tree.baseSnapshot.createDeletedNodesProvider(this._deletedIndexes),
            this._addedCount,
            this._removedCount);
    },

    _createChildNode: function(item)
    {
        if (item.isAddedNotRemoved)
            return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, null, this._dataGrid.snapshot, item);
        else
            return new WebInspector.HeapSnapshotInstanceNode(this._dataGrid, this._dataGrid.baseSnapshot, null, item);
    },

    _childHashForEntity: function(node)
    {
        return node.id;
    },

    _childHashForNode: function(childNode)
    {
        return childNode.snapshotNodeId;
    },

    /**
     * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
     */
    comparator: function()
    {
        var sortAscending = this._dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
        var sortFields = {
            object: ["id", sortAscending, "selfSize", false],
            addedCount: ["selfSize", sortAscending, "id", true],
            removedCount: ["selfSize", sortAscending, "id", true],
            countDelta: ["selfSize", sortAscending, "id", true],
            addedSize: ["selfSize", sortAscending, "id", true],
            removedSize: ["selfSize", sortAscending, "id", true],
            sizeDelta: ["selfSize", sortAscending, "id", true]
        }[sortColumnIdentifier];
        return WebInspector.HeapSnapshotGridNode.createComparator(sortFields);
    },

    /**
     * @return {boolean}
     */
    filteredOut: function()
    {
        return this._name.toLowerCase().indexOf(this._dataGrid._nameFilter) === -1;
    },

    _signForDelta: function(delta)
    {
        if (delta === 0)
            return "";
        if (delta > 0)
            return "+";
        else
            return "\u2212";  // Math minus sign, same width as plus.
    },

    get data()
    {
        var data = {object: this._name};

        data["addedCount"] = Number.withThousandsSeparator(this._addedCount);
        data["removedCount"] = Number.withThousandsSeparator(this._removedCount);
        data["countDelta"] = this._signForDelta(this._countDelta) + Number.withThousandsSeparator(Math.abs(this._countDelta));
        data["addedSize"] = Number.withThousandsSeparator(this._addedSize);
        data["removedSize"] = Number.withThousandsSeparator(this._removedSize);
        data["sizeDelta"] = this._signForDelta(this._sizeDelta) + Number.withThousandsSeparator(Math.abs(this._sizeDelta));

        return data;
    },

    __proto__: WebInspector.HeapSnapshotGridNode.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotGenericObjectNode}
 */
WebInspector.HeapSnapshotDominatorObjectNode = function(tree, node)
{
    WebInspector.HeapSnapshotGenericObjectNode.call(this, tree, node);
    this.updateHasChildren();
};

WebInspector.HeapSnapshotDominatorObjectNode.prototype = {
    /**
     * @override
     * @return {!WebInspector.HeapSnapshotProviderProxy}
     */
    createProvider: function()
    {
        return this._dataGrid.snapshot.createNodesProviderForDominator(this.snapshotNodeIndex);
    },

    /**
     * @param {number} snapshotObjectId
     * @param {function(?WebInspector.DataGridNode)} callback
     */
    retrieveChildBySnapshotObjectId: function(snapshotObjectId, callback)
    {
        /**
         * @this {WebInspector.HeapSnapshotDominatorObjectNode}
         */
        function didExpand()
        {
            this._provider().nodePosition(snapshotObjectId, didGetNodePosition.bind(this));
        }

        /**
         * @this {WebInspector.HeapSnapshotDominatorObjectNode}
         */
        function didGetNodePosition(nodePosition)
        {
            if (nodePosition === -1) {
                this.collapse();
                callback(null);
            } else
                this._populateChildren(nodePosition, null, didPopulateChildren.bind(this, nodePosition));
        }

        /**
         * @this {WebInspector.HeapSnapshotDominatorObjectNode}
         */
        function didPopulateChildren(nodePosition)
        {
            var child = this.childForPosition(nodePosition);
            callback(child);
        }

        // Make sure hasChildren flag is updated before expanding this node as updateHasChildren response
        // may not have been received yet.
        this.hasChildren = true;
        this.expandWithoutPopulate(didExpand.bind(this));
    },

    _createChildNode: function(item)
    {
        return new WebInspector.HeapSnapshotDominatorObjectNode(this._dataGrid, item);
    },

    _childHashForEntity: function(node)
    {
        return node.id;
    },

    _childHashForNode: function(childNode)
    {
        return childNode.snapshotNodeId;
    },

    /**
     * @return {!WebInspector.HeapSnapshotCommon.ComparatorConfig}
     */
    comparator: function()
    {
        var sortAscending = this._dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this._dataGrid.sortColumnIdentifier();
        var sortFields = {
            object: ["id", sortAscending, "retainedSize", false],
            shallowSize: ["selfSize", sortAscending, "id", true],
            retainedSize: ["retainedSize", sortAscending, "id", true]
        }[sortColumnIdentifier];
        return WebInspector.HeapSnapshotGridNode.createComparator(sortFields);
    },

    _emptyData: function()
    {
        return {};
    },

    __proto__: WebInspector.HeapSnapshotGenericObjectNode.prototype
}

