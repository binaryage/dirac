// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.DataGrid}
 * @param {!Array.<!WebInspector.DataGrid.ColumnDescriptor>} columnsArray
 * @param {function(!WebInspector.DataGridNode, string, string, string)=} editCallback
 * @param {function(!WebInspector.DataGridNode)=} deleteCallback
 * @param {function()=} refreshCallback
 * @param {function(!WebInspector.ContextMenu, !WebInspector.DataGridNode)=} contextMenuCallback
 */
WebInspector.ViewportDataGrid = function(columnsArray, editCallback, deleteCallback, refreshCallback, contextMenuCallback)
{
    WebInspector.DataGrid.call(this, columnsArray, editCallback, deleteCallback, refreshCallback, contextMenuCallback);
    this._scrollContainer.addEventListener("scroll", this._onScroll.bind(this), true);
    /** @type {!Array.<!WebInspector.ViewportDataGridNode>} */
    this._visibleNodes = [];
    /** @type {boolean} */
    this._updateScheduled = false;
    /** @type {boolean} */
    this._inline = false;
    this.setRootNode(new WebInspector.ViewportDataGridNode());
}

WebInspector.ViewportDataGrid.prototype = {
    /**
     * @override
     */
    onResize: function()
    {
        this.scheduleUpdate();
    },

    /**
     * @param {?Event} event
     */
    _onScroll: function(event)
    {
        this.scheduleUpdate();
    },

    /**
     * @protected
     */
    scheduleUpdate: function() {
        if (this._updateScheduled)
            return;
        this._updateScheduled = true;
        window.requestAnimationFrame(this._update.bind(this));
    },

    /**
     * @override
     */
    renderInline: function()
    {
        this._inline = true;
        WebInspector.DataGrid.prototype.renderInline.call(this);
        this._update();
    },

    /**
     * @param {number} scrollHeight
     * @param {number} scrollTop
     * @return {{topPadding: number, bottomPadding: number, visibleNodes: !Array.<!WebInspector.ViewportDataGridNode>}}
     */
    _calculateVisibleNodes: function(scrollHeight, scrollTop)
    {
        var nodes = this._rootNode.children;
        if (this._inline)
            return {topPadding: 0, bottomPadding: 0, visibleNodes: nodes};

        var size = nodes.length;
        var i = 0;
        var y = 0;

        for (; i < size && y + nodes[i].nodeSelfHeight() < scrollTop; ++i)
            y += nodes[i].nodeSelfHeight();
        var start = i;
        var topPadding = y;

        for (; i < size && y < scrollTop + scrollHeight; ++i)
            y += nodes[i].nodeSelfHeight();
        var end = i;

        var bottomPadding = 0;
        for (; i < size; ++i)
            bottomPadding += nodes[i].nodeSelfHeight();

        return {topPadding: topPadding, bottomPadding: bottomPadding, visibleNodes: nodes.slice(start, end)};
    },

    _update: function()
    {
        this._updateScheduled = false;

        var viewportState = this._calculateVisibleNodes(this._scrollContainer.offsetHeight, this._scrollContainer.scrollTop);
        var visibleNodes = viewportState.visibleNodes;
        var visibleNodesSet = Set.fromArray(visibleNodes);

        for (var i = 0; i < this._visibleNodes.length; ++i) {
            var oldNode = this._visibleNodes[i];
            if (!visibleNodesSet.contains(oldNode)) {
                oldNode.element().remove();
                oldNode.wasDetached();
            }
        }

        var previousElement = this._topFillerRow;
        var tBody = this.dataTableBody;
        for (var i = 0; i < visibleNodes.length; ++i) {
            var element = visibleNodes[i].element();
            tBody.insertBefore(element, previousElement.nextSibling);
            previousElement = element;
        }

        this.setVerticalPadding(viewportState.topPadding, viewportState.bottomPadding);
        this._visibleNodes = visibleNodes;
    },

    __proto__: WebInspector.DataGrid.prototype
}

/**
 * @constructor
 * @extends {WebInspector.DataGridNode}
 * @param {?Object.<string, *>=} data
 */
WebInspector.ViewportDataGridNode = function(data)
{
    WebInspector.DataGridNode.call(this, data, false);
    /** @type {boolean} */
    this._stale = false;
}

WebInspector.ViewportDataGridNode.prototype = {
    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        if (!this._element) {
            this.createElement();
            this.createCells();
            this._stale = false;
        }

        if (this._stale) {
            this.createCells();
            this._stale = false;
        }

        return /** @type {!Element} */ (this._element);
    },

    /**
     * @override
     * @param {!WebInspector.DataGridNode} child
     * @param {number} index
     */
    insertChild: function(child, index)
    {
        child.dataGrid = this.dataGrid;
        this.children.splice(index, 0, child);
        child.recalculateSiblings(index);
        this.dataGrid.scheduleUpdate();
    },

    /**
     * @override
     * @param {!WebInspector.DataGridNode} child
     */
    removeChild: function(child)
    {
        child.deselect();
        this.children.remove(child, true);

        if (child.previousSibling)
            child.previousSibling.nextSibling = child.nextSibling;
        if (child.nextSibling)
            child.nextSibling.previousSibling = child.previousSibling;

        this.dataGrid.scheduleUpdate();
    },

    /**
     * @override
     */
    removeChildren: function()
    {
        for (var i = 0; i < this.children.length; ++i)
            this.children[i].deselect();
        this.children = [];

        this.dataGrid.scheduleUpdate();
    },

    /**
     * @override
     */
    expand: function()
    {
    },

    /**
     * @override
     */
    refresh: function()
    {
        if (this._element && this._element.parentElement) {
            this._stale = true;
            this.dataGrid.scheduleUpdate();
        } else {
            this._element = null;
        }
    },

    __proto__: WebInspector.DataGridNode.prototype
}
