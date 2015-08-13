// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
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

    this._groupBySetting = WebInspector.settings.createSetting("timelineTreeGroupBy", WebInspector.TimelineTreeView.GroupBy.None);

    this.dataGrid = new WebInspector.SortableDataGrid(columns);
    this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    this._createToolbar();

    this.dataGrid.show(this.element);
}

/**
 * @enum {string}
 */
WebInspector.TimelineTreeView.GroupBy = {
    None: "None",
    Domain: "Domain",
    DomainSecondLevel: "DomainSecondLevel",
    URL: "URL"
}

WebInspector.TimelineTreeView.prototype = {
    /**
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        this._startTime = selection.startTime();
        this._endTime = selection.endTime();
        this._refreshRecords();
    },

    _createToolbar: function()
    {
        this._panelToolbar = new WebInspector.Toolbar(this.element);
        this._groupByCombobox = new WebInspector.ToolbarComboBox(this._onGroupByChanged.bind(this));
        /**
         * @param {string} name
         * @param {string} id
         * @this {WebInspector.TimelineTreeView}
         */
        function addOption(name, id)
        {
            var option = this._groupByCombobox.createOption(name, "", id);
            this._groupByCombobox.addOption(option);
            if (id === this._groupBySetting.get())
                this._groupByCombobox.select(option);
        }
        addOption.call(this, WebInspector.UIString("No Grouping"), WebInspector.TimelineTreeView.GroupBy.None);
        addOption.call(this, WebInspector.UIString("Group by Domain"), WebInspector.TimelineTreeView.GroupBy.Domain);
        addOption.call(this, WebInspector.UIString("Group by Domain (2nd Level)"), WebInspector.TimelineTreeView.GroupBy.DomainSecondLevel);
        addOption.call(this, WebInspector.UIString("Group by URL"), WebInspector.TimelineTreeView.GroupBy.URL);
        this._panelToolbar.appendToolbarItem(this._groupByCombobox);
    },

    _onGroupByChanged: function()
    {
        this._groupBySetting.set(this._groupByCombobox.selectedOption().value);
        this._refreshRecords();
    },

    _refreshRecords: function()
    {
        var groupBy = this._groupBySetting.get();
        var groupNodes = new Map();

        /**
         * @param {string} id
         * @return {!WebInspector.TimelineModel.ProfileTreeNode}
         */
        function groupNodeById(id)
        {
            var node = groupNodes.get(id);
            if (!node) {
                node = new WebInspector.TimelineModel.ProfileTreeNode();
                node.name = id || WebInspector.UIString("(unknown)");
                node.totalTime = 0;
                groupNodes.set(id, node);
            }
            return node;
        }

        /**
         * @return {?WebInspector.TimelineModel.ProfileTreeNode}
         */
        function groupByNone()
        {
            return null;
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {?WebInspector.TimelineModel.ProfileTreeNode}
         */
        function groupByURL(node)
        {
            return groupNodeById(WebInspector.TimelineTreeView.eventURL(node.event) || "");
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {?WebInspector.TimelineModel.ProfileTreeNode}
         */
        function groupByDomain(node)
        {
            var parsedURL = (WebInspector.TimelineTreeView.eventURL(node.event) || "").asParsedURL();
            var domain = parsedURL && parsedURL.host || "";
            return groupNodeById(domain);
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {?WebInspector.TimelineModel.ProfileTreeNode}
         */
        function groupByDomainSecondLevel(node)
        {
            var parsedURL = (WebInspector.TimelineTreeView.eventURL(node.event) || "").asParsedURL();
            if (!parsedURL)
                return groupNodeById("");
            if (/^[.0-9]+$/.test(parsedURL.host))
                return groupNodeById(parsedURL.host)
            var domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
            return groupNodeById(domainMatch && domainMatch[0] || "");
        }

        /**
         * @param {!WebInspector.TracingModel.Event} e
         * @return {string}
         */
        function eventId(e)
        {
            // Function call frames are always groupped by the URL
            if (e.name === "JSFrame") {
                var data = e.args["data"];
                return "f:" + (data["callUID"] || WebInspector.TimelineTreeView.eventURL(e));
            }
            // While the rest of events are groupped by the event type
            // unless the group by URL/Domain mode is on.
            if (groupBy === WebInspector.TimelineTreeView.GroupBy.URL)
                return e.name + ":@" + WebInspector.TimelineTreeView.eventURL(e);
            return e.name;
        }

        var groupByMapper = new Map([
            [WebInspector.TimelineTreeView.GroupBy.None, groupByNone],
            [WebInspector.TimelineTreeView.GroupBy.Domain, groupByDomain],
            [WebInspector.TimelineTreeView.GroupBy.DomainSecondLevel, groupByDomainSecondLevel],
            [WebInspector.TimelineTreeView.GroupBy.URL, groupByURL]
        ]);
        var topDown = WebInspector.TimelineUIUtils.buildTopDownTree(this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters, eventId);
        var rootNode = WebInspector.TimelineUIUtils.buildBottomUpTree(topDown, groupByMapper.get(groupBy));
        for (var group of groupNodes)
            rootNode.children[group[0]] = group[1];
        this.dataGrid.rootNode().removeChildren();
        for (var child of Object.values(rootNode.children || [])) {
            // Exclude the idle time off the total calculation.
            var gridNode = new WebInspector.TimelineTreeView.GridNode(child, topDown.totalTime);
            this.dataGrid.insertChild(gridNode);
        }
        this._sortingChanged();
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
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?string}
 */
WebInspector.TimelineTreeView.eventURL = function(event)
{
    var data = event.args["data"] || event.args["beginData"];
    var url = data && data["url"];
    if (url)
        return url;
    var topFrame = event.stackTrace && event.stackTrace[0];
    return topFrame && topFrame["url"] || null;
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
        var color;
        var event = this._profileNode.event;
        if (event) {
            var url = WebInspector.TimelineTreeView.eventURL(event);
            if (url)
                link.appendChild(WebInspector.linkifyResourceAsNode(url));
            var category = WebInspector.TimelineUIUtils.eventStyle(event).category;
            color = category.fillColorStop1;
        } else {
            color = WebInspector.TimelineUIUtils.colorForURL(this._profileNode.name);
        }
        icon.style.backgroundColor = color || "lightGrey";
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
