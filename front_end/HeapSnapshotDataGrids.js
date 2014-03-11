/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @extends {WebInspector.DataGrid}
 */
WebInspector.HeapSnapshotSortableDataGrid = function(columns)
{
    WebInspector.DataGrid.call(this, columns);

    /**
     * @type {number}
     */
    this._recursiveSortingDepth = 0;
    /**
     * @type {?WebInspector.HeapSnapshotGridNode}
     */
    this._highlightedNode = null;
    /**
     * @type {boolean}
     */
    this._populatedAndSorted = false;
    this._nameFilter = "";
    this.addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.SortingComplete, this._sortingComplete, this);
    this.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this.sortingChanged, this);
}

WebInspector.HeapSnapshotSortableDataGrid.Events = {
    ContentShown: "ContentShown",
    ResetFilter: "ResetFilter",
    SortingComplete: "SortingComplete"
}

WebInspector.HeapSnapshotSortableDataGrid.prototype = {
    /**
     * @return {number}
     */
    defaultPopulateCount: function()
    {
        return 100;
    },

    _disposeAllNodes: function()
    {
        var children = this.topLevelNodes();
        for (var i = 0, l = children.length; i < l; ++i)
            children[i].dispose();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        if (this._populatedAndSorted)
            this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, this);
    },

    _sortingComplete: function()
    {
        this.removeEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.SortingComplete, this._sortingComplete, this);
        this._populatedAndSorted = true;
        this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, this);
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._clearCurrentHighlight();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {?Event} event
     */
    populateContextMenu: function(contextMenu, event)
    {
        var td = event.target.enclosingNodeOrSelfWithNodeName("td");
        if (!td)
            return;
        var node = td.heapSnapshotNode;
        function revealInDominatorsView()
        {
            WebInspector.panels.profiles.showObject(node.snapshotNodeId, "Dominators");
        }
        function revealInSummaryView()
        {
            WebInspector.panels.profiles.showObject(node.snapshotNodeId, "Summary");
        }
        if(node && node.showRetainingEdges) {
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInSummaryView.bind(this));
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInDominatorsView.bind(this));
        }
        else if (node instanceof WebInspector.HeapSnapshotInstanceNode || node instanceof WebInspector.HeapSnapshotObjectNode) {
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInDominatorsView.bind(this));
        } else if (node instanceof WebInspector.HeapSnapshotDominatorObjectNode) {
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInSummaryView.bind(this));
        }
    },

    resetSortingCache: function()
    {
        delete this._lastSortColumnIdentifier;
        delete this._lastSortAscending;
    },

    /**
     * @return {!Array.<!WebInspector.HeapSnapshotGridNode>}
     */
    topLevelNodes: function()
    {
        return this.rootNode().children;
    },

    /**
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} heapSnapshotObjectId
     * @param {function(boolean)} callback
     */
    highlightObjectByHeapSnapshotId: function(heapSnapshotObjectId, callback)
    {
    },

    /**
     * @param {!WebInspector.HeapSnapshotGridNode} node
     */
    highlightNode: function(node)
    {
        var prevNode = this._highlightedNode;
        this._clearCurrentHighlight();
        this._highlightedNode = node;
        WebInspector.runCSSAnimationOnce(this._highlightedNode.element, "highlighted-row");
    },

    nodeWasDetached: function(node)
    {
        if (this._highlightedNode === node)
            this._clearCurrentHighlight();
    },

    _clearCurrentHighlight: function()
    {
        if (!this._highlightedNode)
            return
        this._highlightedNode.element.classList.remove("highlighted-row");
        this._highlightedNode = null;
    },

    /**
     * @param {function()=} callback
     */
    resetNameFilter: function(callback)
    {
        this._callbackAfterFilterChange = callback;
        this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.ResetFilter);
    },

    /**
     * @param {string} filter
     */
    changeNameFilter: function(filter)
    {
        this._nameFilter = filter.toLowerCase();
        this.updateVisibleNodes();
        if (this._callbackAfterFilterChange) {
            this._callbackAfterFilterChange();
            this._callbackAfterFilterChange = null;
        }
    },

    sortingChanged: function()
    {
        var sortAscending = this.isSortOrderAscending();
        var sortColumnIdentifier = this.sortColumnIdentifier();
        if (this._lastSortColumnIdentifier === sortColumnIdentifier && this._lastSortAscending === sortAscending)
            return;
        this._lastSortColumnIdentifier = sortColumnIdentifier;
        this._lastSortAscending = sortAscending;
        var sortFields = this._sortFields(sortColumnIdentifier, sortAscending);

        function SortByTwoFields(nodeA, nodeB)
        {
            var field1 = nodeA[sortFields[0]];
            var field2 = nodeB[sortFields[0]];
            var result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
            if (!sortFields[1])
                result = -result;
            if (result !== 0)
                return result;
            field1 = nodeA[sortFields[2]];
            field2 = nodeB[sortFields[2]];
            result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
            if (!sortFields[3])
                result = -result;
            return result;
        }
        this._performSorting(SortByTwoFields);
    },

    _performSorting: function(sortFunction)
    {
        this.recursiveSortingEnter();
        var children = this.allChildren(this.rootNode());
        this.rootNode().removeChildren();
        children.sort(sortFunction);
        for (var i = 0, l = children.length; i < l; ++i) {
            var child = children[i];
            this.appendChildAfterSorting(child);
            if (child.expanded)
                child.sort();
        }
        this.recursiveSortingLeave();
    },

    appendChildAfterSorting: function(child)
    {
        var revealed = child.revealed;
        this.rootNode().appendChild(child);
        child.revealed = revealed;
    },

    recursiveSortingEnter: function()
    {
        ++this._recursiveSortingDepth;
    },

    recursiveSortingLeave: function()
    {
        if (!this._recursiveSortingDepth)
            return;
        if (--this._recursiveSortingDepth)
            return;
        this.updateVisibleNodes();
        this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.SortingComplete);
    },

    updateVisibleNodes: function()
    {
    },

    /**
     * @param {!WebInspector.DataGridNode} parent
     * @return {!Array.<!WebInspector.HeapSnapshotGridNode>}
     */
    allChildren: function(parent)
    {
        return parent.children;
    },

    /**
     * @param {!WebInspector.DataGridNode} parent
     * @param {!WebInspector.DataGridNode} node
     * @param {number} index
     */
    insertChild: function(parent, node, index)
    {
        parent.insertChild(node, index);
    },

    /**
     * @param {!WebInspector.HeapSnapshotGridNode} parent
     * @param {number} index
     */
    removeChildByIndex: function(parent, index)
    {
        parent.removeChild(parent.children[index]);
    },

    /**
     * @param {!WebInspector.HeapSnapshotGridNode} parent
     */
    removeAllChildren: function(parent)
    {
        parent.removeChildren();
    },

    __proto__: WebInspector.DataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotSortableDataGrid}
 */
WebInspector.HeapSnapshotViewportDataGrid = function(columns)
{
    WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
    this.scrollContainer.addEventListener("scroll", this._onScroll.bind(this), true);
    /**
     * @type {?WebInspector.HeapSnapshotGridNode}
     */
    this._nodeToHighlightAfterScroll = null;
    this._topPadding = new WebInspector.HeapSnapshotPaddingNode();
    this.dataTableBody.insertBefore(this._topPadding.element, this.dataTableBody.firstChild);
    this._bottomPadding = new WebInspector.HeapSnapshotPaddingNode();
    this.dataTableBody.insertBefore(this._bottomPadding.element, this.dataTableBody.lastChild);
}

WebInspector.HeapSnapshotViewportDataGrid.prototype = {
    /**
     * @return {!Array.<!WebInspector.HeapSnapshotGridNode>}
     */
    topLevelNodes: function()
    {
        return this.allChildren(this.rootNode());
    },

    appendChildAfterSorting: function(child)
    {
        // Do nothing here, it will be added in updateVisibleNodes.
    },

    /**
     * @param {!Array.<!WebInspector.HeapSnapshotGridNode>=} pathToReveal
     */
    updateVisibleNodes: function(pathToReveal)
    {
        var scrollTop = this.scrollContainer.scrollTop;
        var viewPortHeight = this.scrollContainer.offsetHeight;
        var selectedNode = this.selectedNode;
        this.rootNode().removeChildren();

        this._topPaddingHeight = 0;
        this._bottomPaddingHeight = 0;

        this._addVisibleNodes(this.rootNode(), scrollTop, scrollTop + viewPortHeight, pathToReveal || null);

        this._topPadding.setHeight(this._topPaddingHeight);
        this._bottomPadding.setHeight(this._bottomPaddingHeight);

        if (selectedNode) {
            if (selectedNode.parent) {
                selectedNode.select(true);
            } else {
                // Keep selection even if the node is not in the current viewport.
                this.selectedNode = selectedNode;
            }
        }
    },

    /**
     * @param {!WebInspector.DataGridNode} parentNode
     * @param {number} topBound
     * @param {number} bottomBound
     * @param {?Array.<!WebInspector.HeapSnapshotGridNode>} pathToReveal
     * @return {number}
     */
    _addVisibleNodes: function(parentNode, topBound, bottomBound, pathToReveal)
    {
        if (!parentNode.expanded)
            return 0;

        var nodeToReveal = pathToReveal ? pathToReveal[0] : null;
        var restPathToReveal = pathToReveal && pathToReveal.length > 1 ? pathToReveal.slice(1) : null;
        var children = this.allChildren(parentNode);
        var topPadding = 0;
        // Iterate over invisible nodes beyond the upper bound of viewport.
        // Do not insert them into the grid, but count their total height.
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (child.filteredOut && child.filteredOut())
                continue;
            var newTop = topPadding + this._nodeHeight(child);
            if (nodeToReveal === child || (!nodeToReveal && newTop > topBound))
                break;
            topPadding = newTop;
        }

        // Put visible nodes into the data grid.
        var position = topPadding;
        for (; i < children.length && (nodeToReveal || position < bottomBound); ++i) {
            var child = children[i];
            if (child.filteredOut && child.filteredOut())
                continue;
            var hasChildren = child.hasChildren;
            child.removeChildren();
            child.hasChildren = hasChildren;
            child.revealed = true;
            parentNode.appendChild(child);
            position += child.nodeSelfHeight();
            position += this._addVisibleNodes(child, topBound - position, bottomBound - position, restPathToReveal);
            if (nodeToReveal === child)
                break;
        }

        // Count the invisible nodes beyond the bottom bound of the viewport.
        var bottomPadding = 0;
        for (; i < children.length; ++i) {
            var child = children[i];
            if (child.filteredOut && child.filteredOut())
                continue;
            bottomPadding += this._nodeHeight(child);
        }

        this._topPaddingHeight += topPadding;
        this._bottomPaddingHeight += bottomPadding;
        return position + bottomPadding;
    },

    /**
     * @param {!WebInspector.HeapSnapshotGridNode} node
     * @return {number}
     */
    _nodeHeight: function(node)
    {
        if (!node.revealed)
            return 0;
        var result = node.nodeSelfHeight();
        if (!node.expanded)
            return result;
        var children = this.allChildren(node);
        for (var i = 0; i < children.length; i++)
            result += this._nodeHeight(children[i]);
        return result;
    },

    /**
     * @override
     * @return {?Element}
     */
    defaultAttachLocation: function()
    {
        return this._bottomPadding.element;
    },

    /**
     * @param {!Array.<!WebInspector.HeapSnapshotGridNode>} pathToReveal
     */
    revealTreeNode: function(pathToReveal)
    {
        this.updateVisibleNodes(pathToReveal);
    },

    /**
     * @param {!WebInspector.DataGridNode} parent
     * @return {!Array.<!WebInspector.HeapSnapshotGridNode>}
     */
    allChildren: function(parent)
    {
        return parent._allChildren || (parent._allChildren = []);
    },

    /**
     * @param {!WebInspector.DataGridNode} parent
     * @param {!WebInspector.DataGridNode} node
     */
    appendNode: function(parent, node)
    {
        this.allChildren(parent).push(node);
    },

    /**
     * @param {!WebInspector.DataGridNode} parent
     * @param {!WebInspector.DataGridNode} node
     * @param {number} index
     */
    insertChild: function(parent, node, index)
    {
        this.allChildren(parent).splice(index, 0, node);
    },

    removeChildByIndex: function(parent, index)
    {
        this.allChildren(parent).splice(index, 1);
    },

    removeAllChildren: function(parent)
    {
        parent._allChildren = [];
    },

    removeTopLevelNodes: function()
    {
        this._disposeAllNodes();
        this.rootNode().removeChildren();
        this.rootNode()._allChildren = [];
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotGridNode} node
     */
    highlightNode: function(node)
    {
        if (this._isScrolledIntoView(node.element)) {
            this.updateVisibleNodes();
            WebInspector.HeapSnapshotSortableDataGrid.prototype.highlightNode.call(this, node);
        } else {
            node.element.scrollIntoViewIfNeeded(true);
            this._nodeToHighlightAfterScroll = node;
        }
    },

    /**
     * @param {!Element} element
     * @return {boolean}
     */
    _isScrolledIntoView: function(element)
    {
        var viewportTop = this.scrollContainer.scrollTop;
        var viewportBottom = viewportTop + this.scrollContainer.clientHeight;
        var elemTop = element.offsetTop
        var elemBottom = elemTop + element.offsetHeight;
        return elemBottom <= viewportBottom && elemTop >= viewportTop;
    },

    onResize: function()
    {
        WebInspector.HeapSnapshotSortableDataGrid.prototype.onResize.call(this);
        this.updateVisibleNodes();
    },

    _onScroll: function(event)
    {
        this.updateVisibleNodes();

        if (this._nodeToHighlightAfterScroll) {
            WebInspector.HeapSnapshotSortableDataGrid.prototype.highlightNode.call(this, this._nodeToHighlightAfterScroll);
            this._nodeToHighlightAfterScroll = null;
        }
    },

    __proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}

/**
 * @constructor
 */
WebInspector.HeapSnapshotPaddingNode = function()
{
    this.element = document.createElement("tr");
    this.element.classList.add("revealed");
}

WebInspector.HeapSnapshotPaddingNode.prototype = {
   setHeight: function(height)
   {
       this.element.style.height = height + "px";
   },
   removeFromTable: function()
   {
        var parent = this.element.parentNode;
        if (parent)
            parent.removeChild(this.element);
   }
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotSortableDataGrid}
 * @param {!Array.<!WebInspector.DataGrid.ColumnDescriptor>=} columns
 */
WebInspector.HeapSnapshotContainmentDataGrid = function(columns)
{
    columns = columns || [
        {id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
        {id: "distance", title: WebInspector.UIString("Distance"), width: "80px", sortable: true},
        {id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
        {id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sortable: true, sort: WebInspector.DataGrid.Order.Descending}
    ];
    WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotContainmentDataGrid.prototype = {
    setDataSource: function(snapshot, nodeIndex)
    {
        this.snapshot = snapshot;
        var node = { nodeIndex: nodeIndex || snapshot.rootNodeIndex };
        var fakeEdge = { node: node };
        this.setRootNode(new WebInspector.HeapSnapshotObjectNode(this, false, fakeEdge, null));
        this.rootNode().sort();
    },

    sortingChanged: function()
    {
        var rootNode = this.rootNode();
        if (rootNode.hasChildren)
            rootNode.sort();
    },

    __proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotContainmentDataGrid}
 */
WebInspector.HeapSnapshotRetainmentDataGrid = function()
{
    this.showRetainingEdges = true;
    var columns = [
        {id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
        {id: "distance", title: WebInspector.UIString("Distance"), width: "80px", sortable: true, sort: WebInspector.DataGrid.Order.Ascending},
        {id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
        {id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sortable: true}
    ];
    WebInspector.HeapSnapshotContainmentDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotRetainmentDataGrid.Events = {
    ExpandRetainersComplete: "ExpandRetainersComplete"
}

WebInspector.HeapSnapshotRetainmentDataGrid.prototype = {
    _sortFields: function(sortColumn, sortAscending)
    {
        return {
            object: ["_name", sortAscending, "_count", false],
            count: ["_count", sortAscending, "_name", true],
            shallowSize: ["_shallowSize", sortAscending, "_name", true],
            retainedSize: ["_retainedSize", sortAscending, "_name", true],
            distance: ["_distance", sortAscending, "_name", true]
        }[sortColumn];
    },

    reset: function()
    {
        this.rootNode().removeChildren();
        this.resetSortingCache();
    },

    /**
     * @param {!WebInspector.HeapSnapshotProxy} snapshot
     * @param {number} nodeIndex
     */
    setDataSource: function(snapshot, nodeIndex)
    {
        WebInspector.HeapSnapshotContainmentDataGrid.prototype.setDataSource.call(this, snapshot, nodeIndex);

        var dataGrid = this;
        var maxExpandLevels = 20;
        /**
         * @this {!WebInspector.HeapSnapshotObjectNode}
         */
        function populateComplete()
        {
            this.removeEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, this);
            this.expand();
            if (--maxExpandLevels > 0 && this.children.length > 0) {
                var retainer = this.children[0];
                if (retainer._distance > 1) {
                    retainer.addEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, retainer);
                    retainer.populate();
                    return;
                }
            }
            dataGrid.dispatchEventToListeners(WebInspector.HeapSnapshotRetainmentDataGrid.Events.ExpandRetainersComplete);
        }
        this.rootNode().addEventListener(WebInspector.HeapSnapshotGridNode.Events.PopulateComplete, populateComplete, this.rootNode());
    },

    __proto__: WebInspector.HeapSnapshotContainmentDataGrid.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotViewportDataGrid}
 */
WebInspector.HeapSnapshotConstructorsDataGrid = function()
{
    var columns = [
        {id: "object", title: WebInspector.UIString("Constructor"), disclosure: true, sortable: true},
        {id: "distance", title: WebInspector.UIString("Distance"), width: "90px", sortable: true},
        {id: "count", title: WebInspector.UIString("Objects Count"), width: "90px", sortable: true},
        {id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
        {id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true}
    ];
    WebInspector.HeapSnapshotViewportDataGrid.call(this, columns);
    this._profileIndex = -1;

    this._objectIdToSelect = null;
}

/**
 * @constructor
 * @param {number=} minNodeId
 * @param {number=} maxNodeId
 */
WebInspector.HeapSnapshotConstructorsDataGrid.Request = function(minNodeId, maxNodeId)
{
    if (typeof minNodeId === "number") {
        this.key = minNodeId + ".." + maxNodeId;
        this.filter = "function(node) { var id = node.id(); return id > " + minNodeId + " && id <= " + maxNodeId + "; }";
    } else {
        this.key = "allObjects";
        this.filter = null;
    }
}

WebInspector.HeapSnapshotConstructorsDataGrid.prototype = {
    _sortFields: function(sortColumn, sortAscending)
    {
        return {
            object: ["_name", sortAscending, "_count", false],
            distance: ["_distance", sortAscending, "_retainedSize", true],
            count: ["_count", sortAscending, "_name", true],
            shallowSize: ["_shallowSize", sortAscending, "_name", true],
            retainedSize: ["_retainedSize", sortAscending, "_name", true]
        }[sortColumn];
    },

    /**
     * @override
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} id
     * @param {function(boolean)} callback
     */
    highlightObjectByHeapSnapshotId: function(id, callback)
    {
        if (!this.snapshot) {
            this._objectIdToSelect = id;
            return;
        }

        /**
         * @param {?string} className
         * @this {WebInspector.HeapSnapshotConstructorsDataGrid}
         */
        function didGetClassName(className)
        {
            if (!className) {
                callback(false);
                return;
            }
            var constructorNodes = this.topLevelNodes();
            for (var i = 0; i < constructorNodes.length; i++) {
                var parent = constructorNodes[i];
                if (parent._name === className) {
                    parent.revealNodeBySnapshotObjectId(parseInt(id, 10), callback);
                    return;
                }
            }
        }
        this.snapshot.nodeClassName(parseInt(id, 10), didGetClassName.bind(this));
    },

    setDataSource: function(snapshot)
    {
        this.snapshot = snapshot;
        if (this._profileIndex === -1)
            this._populateChildren();

        if (this._objectIdToSelect) {
            this.highlightObjectByHeapSnapshotId(this._objectIdToSelect, function(found) {});
            this._objectIdToSelect = null;
        }
    },

    /**
      * @param {number} minNodeId
      * @param {number} maxNodeId
      */
    setSelectionRange: function(minNodeId, maxNodeId)
    {
        this._populateChildren(new WebInspector.HeapSnapshotConstructorsDataGrid.Request(minNodeId, maxNodeId));
    },

    _aggregatesReceived: function(key, aggregates)
    {
        this._requestInProgress = null;
        if (this._nextRequest) {
            this.snapshot.aggregates(false, this._nextRequest.key, this._nextRequest.filter, this._aggregatesReceived.bind(this, this._nextRequest.key));
            this._requestInProgress = this._nextRequest;
            this._nextRequest = null;
        }
        this.removeTopLevelNodes();
        this.resetSortingCache();
        for (var constructor in aggregates)
            this.appendNode(this.rootNode(), new WebInspector.HeapSnapshotConstructorNode(this, constructor, aggregates[constructor], key));
        this.sortingChanged();
        this.updateVisibleNodes();
        this._lastKey = key;
    },

    /**
      * @param {?WebInspector.HeapSnapshotConstructorsDataGrid.Request=} request
      */
    _populateChildren: function(request)
    {
        request = request || new WebInspector.HeapSnapshotConstructorsDataGrid.Request();

        if (this._requestInProgress) {
            this._nextRequest = this._requestInProgress.key === request.key ? null : request;
            return;
        }
        if (this._lastKey === request.key)
            return;
        this._requestInProgress = request;
        this.snapshot.aggregates(false, request.key, request.filter, this._aggregatesReceived.bind(this, request.key));
    },

    filterSelectIndexChanged: function(profiles, profileIndex)
    {
        this._profileIndex = profileIndex;

        var request = null;
        if (profileIndex !== -1) {
            var minNodeId = profileIndex > 0 ? profiles[profileIndex - 1].maxJSObjectId : 0;
            var maxNodeId = profiles[profileIndex].maxJSObjectId;
            request = new WebInspector.HeapSnapshotConstructorsDataGrid.Request(minNodeId, maxNodeId)
        }

        this._populateChildren(request);
    },

    __proto__: WebInspector.HeapSnapshotViewportDataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotViewportDataGrid}
 */
WebInspector.HeapSnapshotDiffDataGrid = function()
{
    var columns = [
        {id: "object", title: WebInspector.UIString("Constructor"), disclosure: true, sortable: true},
        {id: "addedCount", title: WebInspector.UIString("# New"), width: "72px", sortable: true},
        {id: "removedCount", title: WebInspector.UIString("# Deleted"), width: "72px", sortable: true},
        {id: "countDelta", title: WebInspector.UIString("# Delta"), width: "64px", sortable: true},
        {id: "addedSize", title: WebInspector.UIString("Alloc. Size"), width: "72px", sortable: true, sort: WebInspector.DataGrid.Order.Descending},
        {id: "removedSize", title: WebInspector.UIString("Freed Size"), width: "72px", sortable: true},
        {id: "sizeDelta", title: WebInspector.UIString("Size Delta"), width: "72px", sortable: true}
    ];
    WebInspector.HeapSnapshotViewportDataGrid.call(this, columns);
}

WebInspector.HeapSnapshotDiffDataGrid.prototype = {
    /**
     * @override
     * @return {number}
     */
    defaultPopulateCount: function()
    {
        return 50;
    },

    _sortFields: function(sortColumn, sortAscending)
    {
        return {
            object: ["_name", sortAscending, "_count", false],
            addedCount: ["_addedCount", sortAscending, "_name", true],
            removedCount: ["_removedCount", sortAscending, "_name", true],
            countDelta: ["_countDelta", sortAscending, "_name", true],
            addedSize: ["_addedSize", sortAscending, "_name", true],
            removedSize: ["_removedSize", sortAscending, "_name", true],
            sizeDelta: ["_sizeDelta", sortAscending, "_name", true]
        }[sortColumn];
    },

    setDataSource: function(snapshot)
    {
        this.snapshot = snapshot;
    },

    /**
     * @param {!WebInspector.HeapSnapshotProxy} baseSnapshot
     */
    setBaseDataSource: function(baseSnapshot)
    {
        this.baseSnapshot = baseSnapshot;
        this.removeTopLevelNodes();
        this.resetSortingCache();
        if (this.baseSnapshot === this.snapshot) {
            this.dispatchEventToListeners(WebInspector.HeapSnapshotSortableDataGrid.Events.SortingComplete);
            return;
        }
        this._populateChildren();
    },

    _populateChildren: function()
    {
        /**
         * @this {WebInspector.HeapSnapshotDiffDataGrid}
         */
        function aggregatesForDiffReceived(aggregatesForDiff)
        {
            this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid, aggregatesForDiff, didCalculateSnapshotDiff.bind(this));

            /**
             * @this {WebInspector.HeapSnapshotDiffDataGrid}
             */
            function didCalculateSnapshotDiff(diffByClassName)
            {
                for (var className in diffByClassName) {
                    var diff = diffByClassName[className];
                    this.appendNode(this.rootNode(), new WebInspector.HeapSnapshotDiffNode(this, className, diff));
                }
                this.sortingChanged();
            }
        }
        // Two snapshots live in different workers isolated from each other. That is why
        // we first need to collect information about the nodes in the first snapshot and
        // then pass it to the second snapshot to calclulate the diff.
        this.baseSnapshot.aggregatesForDiff(aggregatesForDiffReceived.bind(this));
    },

    __proto__: WebInspector.HeapSnapshotViewportDataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotSortableDataGrid}
 */
WebInspector.HeapSnapshotDominatorsDataGrid = function()
{
    var columns = [
        {id: "object", title: WebInspector.UIString("Object"), disclosure: true, sortable: true},
        {id: "shallowSize", title: WebInspector.UIString("Shallow Size"), width: "120px", sortable: true},
        {id: "retainedSize", title: WebInspector.UIString("Retained Size"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true}
    ];
    WebInspector.HeapSnapshotSortableDataGrid.call(this, columns);
    this._objectIdToSelect = null;
}

WebInspector.HeapSnapshotDominatorsDataGrid.prototype = {
    /**
     * @override
     * @return {number}
     */
    defaultPopulateCount: function()
    {
        return 25;
    },

    setDataSource: function(snapshot)
    {
        this.snapshot = snapshot;

        var fakeNode = { nodeIndex: this.snapshot.rootNodeIndex };
        this.setRootNode(new WebInspector.HeapSnapshotDominatorObjectNode(this, fakeNode));
        this.rootNode().sort();

        if (this._objectIdToSelect) {
            this.highlightObjectByHeapSnapshotId(this._objectIdToSelect, function(found) {});
            this._objectIdToSelect = null;
        }
    },

    sortingChanged: function()
    {
        this.rootNode().sort();
    },

    /**
     * @override
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} id
     * @param {function(boolean)} callback
     */
    highlightObjectByHeapSnapshotId: function(id, callback)
    {
        if (!this.snapshot) {
            this._objectIdToSelect = id;
            callback(false);
            return;
        }

        /**
         * @this {WebInspector.HeapSnapshotDominatorsDataGrid}
         */
        function didGetDominators(dominatorIds)
        {
            if (!dominatorIds) {
                WebInspector.log(WebInspector.UIString("Cannot find corresponding heap snapshot node"));
                callback(false);
                return;
            }
            var dominatorNode = this.rootNode();
            expandNextDominator.call(this, dominatorIds, dominatorNode);
        }

        /**
         * @this {WebInspector.HeapSnapshotDominatorsDataGrid}
         */
        function expandNextDominator(dominatorIds, dominatorNode)
        {
            if (!dominatorNode) {
                console.error("Cannot find dominator node");
                callback(false);
                return;
            }
            if (!dominatorIds.length) {
                this.highlightNode(dominatorNode);
                dominatorNode.element.scrollIntoViewIfNeeded(true);
                callback(true);
                return;
            }
            var snapshotObjectId = dominatorIds.pop();
            dominatorNode.retrieveChildBySnapshotObjectId(snapshotObjectId, expandNextDominator.bind(this, dominatorIds));
        }

        this.snapshot.dominatorIdsForNode(parseInt(id, 10), didGetDominators.bind(this));
    },

    __proto__: WebInspector.HeapSnapshotSortableDataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.DataGrid}
 */
WebInspector.AllocationDataGrid = function()
{
    var columns = [
        {id: "count", title: WebInspector.UIString("Count"), width: "72px", sortable: true},
        {id: "size", title: WebInspector.UIString("Size"), width: "72px", sortable: true, sort: WebInspector.DataGrid.Order.Descending},
        {id: "name", title: WebInspector.UIString("Function"), disclosure: true, sortable: true},
    ];
    WebInspector.DataGrid.call(this, columns);
    this._linkifier = new WebInspector.Linkifier();
}

WebInspector.AllocationDataGrid.prototype = {
    setDataSource: function(snapshot)
    {
        this._snapshot = snapshot;
        this._snapshot.allocationTracesTops(didReceiveAllocationTracesTops.bind(this));

        /**
         * @param {!Array.<!WebInspector.DataGrid>} tops
         * @this {WebInspector.AllocationDataGrid}
         */
        function didReceiveAllocationTracesTops(tops)
        {
            var root = this.rootNode();
            for (var i = 0; i < tops.length; i++)
                root.appendChild(new WebInspector.AllocationGridNode(this, tops[i]));
        }
    },

    __proto__: WebInspector.DataGrid.prototype
}


/**
 * @constructor
 * @extends {WebInspector.DataGridNode}
 * @param {!WebInspector.DataGrid} dataGrid
 */
WebInspector.AllocationGridNode = function(dataGrid, data)
{
    WebInspector.DataGridNode.call(this, data, data.hasChildren);
    this._dataGrid = dataGrid;
    this._populated = false;
}

WebInspector.AllocationGridNode.prototype = {
    populate: function()
    {
        if (this._populated)
            return;
        this._populated = true;
        this._dataGrid._snapshot.allocationNodeCallers(this.data.id, didReceiveCallers.bind(this));

        /**
         * @param {!WebInspector.HeapSnapshotCommon.AllocationNodeCallers} callers
         * @this {WebInspector.AllocationGridNode}
         */
        function didReceiveCallers(callers)
        {
            var callersChain = callers.nodesWithSingleCaller;
            var parentNode = this;
            for (var i = 0; i < callersChain.length; i++) {
                var child = new WebInspector.AllocationGridNode(this._dataGrid, callersChain[i]);
                parentNode.appendChild(child);
                parentNode = child;
                parentNode._populated = true;
                if (this.expanded)
                    parentNode.expand();
            }

            var callersBranch = callers.branchingCallers;
            for (var i = 0; i < callersBranch.length; i++)
                parentNode.appendChild(new WebInspector.AllocationGridNode(this._dataGrid, callersBranch[i]));
        }
    },

    /**
     * @override
     */
    expand: function()
    {
        WebInspector.DataGridNode.prototype.expand.call(this);
        if (this.children.length === 1)
            this.children[0].expand();
    },

    /**
     * @override
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);

        if (columnIdentifier !== "name")
            return cell;

        var functionInfo = this.data;
        if (functionInfo.scriptName) {
            var urlElement = this._dataGrid._linkifier.linkifyLocation(functionInfo.scriptName, functionInfo.line - 1, functionInfo.column - 1, "profile-node-file");
            urlElement.style.maxWidth = "75%";
            cell.insertBefore(urlElement, cell.firstChild);
        }

        return cell;
    },

    __proto__: WebInspector.DataGridNode.prototype
}

