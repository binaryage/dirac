// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TimelineModeView}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineTreeView = function(model)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("timeline-tree-view");

    this._model = model;
    var columns = [];
    columns.push({id: "self", title: WebInspector.UIString("Self Time"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true});
    columns.push({id: "activity", title: WebInspector.UIString("Activity"), disclosure: true, sortable: true});

    this._filters = [
        WebInspector.TimelineUIUtils.hiddenEventsFilter(),
        new WebInspector.ExcludeTopLevelFilter()
    ];

    this.dataGrid = new WebInspector.SortableDataGrid(columns);
    this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    this.dataGrid.show(this.element);
}

WebInspector.TimelineTreeView.prototype = {
    /**
     * @override
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._startTime = startTime;
        this._endTime = endTime;
        this.refreshRecords();
    },

    /**
     * @override
     */
    refreshRecords: function()
    {
        var topDown = WebInspector.TimelineUIUtils.buildTopDownTree(this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters);
        var rootNode = WebInspector.TimelineUIUtils.buildBottomUpTree(topDown);
        this.dataGrid.rootNode().removeChildren();
        for (var child of Object.values(rootNode.children || [])) {
            // Exclude the idle time off the total calculation.
            var gridNode = new WebInspector.TimelineTreeView.GridNode(child, topDown.totalTime);
            this.dataGrid.insertChild(gridNode);
        }
        this._sortingChanged();
    },

    /**
     * @override
     */
    dispose: function()
    {
    },

    /**
     * @override
     * @return {!WebInspector.Widget}
     */
    view: function()
    {
        return this;
    },

    /**
     * @override
     */
    reset: function()
    {
    },

    /**
     * @override
     */
    highlightSearchResult: function()
    {
    },

    /**
     * @override
     */
    setSelection: function(selection)
    {
    },

    /**
     * @override
     */
    setSidebarSize: function()
    {
    },

    _sortingChanged: function()
    {
        var columnIdentifier = this.dataGrid.sortColumnIdentifier();
        /**
         * @param {string} field
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareField(field, a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (b);
            var valueA = nodeA._profileNode[field];
            var valueB = nodeB._profileNode[field];
            return valueA === valueB ? 0 : valueA > valueB ? 1 : -1;
        }
        var field = {
            "self": "totalTime",
            "activity": "name"
        }[columnIdentifier];
        this.dataGrid.sortNodes(compareField.bind(null, field), !this.dataGrid.isSortOrderAscending());
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SortableDataGridNode}
 * @param {?} profileNode
 * @param {number} grandTotalTime
 */
WebInspector.TimelineTreeView.GridNode = function(profileNode, grandTotalTime)
{
    /**
     * @param {number} time
     * @return {string}
     */
    function formatMilliseconds(time)
    {
        return WebInspector.UIString("%.1f\u2009ms", time);
    }
    /**
     * @param {number} value
     * @return {string}
     */
    function formatPercent(value)
    {
        return WebInspector.UIString("%.2f\u2009%%", value);
    }

    this._profileNode = profileNode;
    this._totalTime = grandTotalTime;
    var selfTime = profileNode.totalTime;
    var selfPercent = selfTime / grandTotalTime * 100;
    var data = {
        "activity": profileNode.name,
        "self-percent": formatPercent(selfPercent),
        "self": formatMilliseconds(selfTime),
    };
    var hasChildren = this._profileNode.children ? Object.keys(this._profileNode.children).length > 0 : false;
    WebInspector.SortableDataGridNode.call(this, data, hasChildren);
}

WebInspector.TimelineTreeView.GridNode.prototype = {
    /**
     * @override
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        if (columnIdentifier === "activity")
            return this._createNameCell(columnIdentifier);
        return this._createValueCell(columnIdentifier) || WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
    },

    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    _createNameCell: function(columnIdentifier)
    {
        var cell = this.createTD(columnIdentifier);
        var container = cell.createChild("div", "name-container");
        var icon = container.createChild("div", "activity-icon");
        var name = container.createChild("div", "activity-name");
        var link = container.createChild("div", "activity-link");
        name.textContent = this._profileNode.name;
        var category = WebInspector.TimelineUIUtils.eventStyle(this._profileNode.event).category;
        icon.style.backgroundColor = category.fillColorStop1;
        var data = this._profileNode.event.args["data"];
        var url = data && (data.url || data.styleSheetUrl);
        if (url)
            link.appendChild(WebInspector.linkifyResourceAsNode(url));
        return cell;
    },

    /**
     * @param {string} columnIdentifier
     * @return {?Element}
     */
    _createValueCell: function(columnIdentifier)
    {
        if (columnIdentifier !== "self" && columnIdentifier !== "total")
            return null;

        var cell = this.createTD(columnIdentifier);
        cell.className = "numeric-column";
        var div = createElement("div");
        var valueSpan = createElement("span");
        valueSpan.textContent = this.data[columnIdentifier];
        div.appendChild(valueSpan);
        var percentColumn = columnIdentifier + "-percent";
        if (percentColumn in this.data) {
            var percentSpan = createElement("span");
            percentSpan.className = "percent-column";
            percentSpan.textContent = this.data[percentColumn];
            div.appendChild(percentSpan);
            div.classList.add("profile-multiple-values");
        }
        cell.appendChild(div);
        return cell;
    },

    /**
     * @override
     */
    populate: function()
    {
        for (var node of Object.values(this._profileNode.children || [])) {
            var gridNode = new WebInspector.TimelineTreeView.GridNode(node, this._totalTime);
            this.insertChildOrdered(gridNode);
        }
    },

    __proto__: WebInspector.SortableDataGridNode.prototype
}
