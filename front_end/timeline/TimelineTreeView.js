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
    columns.push({id: "total", title: WebInspector.UIString("Total Time"), width: "120px", sortable: true});
    columns.push({id: "activity", title: WebInspector.UIString("Activity"), disclosure: true, sortable: true});

    var nonessentialEvents = [
        WebInspector.TimelineModel.RecordType.EventDispatch,
        WebInspector.TimelineModel.RecordType.FunctionCall,
        WebInspector.TimelineModel.RecordType.TimerFire
    ];
    this._filters = [
        WebInspector.TimelineUIUtils.hiddenEventsFilter(),
        new WebInspector.ExclusiveTraceEventNameFilter(nonessentialEvents),
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
WebInspector.TimelineTreeView.Mode = {
    TopDown: "TopDown",
    BottomUp: "BottomUp"
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
        this._refreshTree();
    },

    _createToolbar: function()
    {
        var panelToolbar = new WebInspector.Toolbar(this.element);
        panelToolbar.appendToolbarItem(new WebInspector.ToolbarText(WebInspector.UIString("View")));

        this._modeCombobox = new WebInspector.ToolbarComboBox(this._onTreeModeChanged.bind(this));
        this._modeCombobox.addOption(this._modeCombobox.createOption(WebInspector.UIString("Costly Functions"), "", WebInspector.TimelineTreeView.Mode.BottomUp));
        this._modeCombobox.addOption(this._modeCombobox.createOption(WebInspector.UIString("Costly Entrypoints"), "", WebInspector.TimelineTreeView.Mode.TopDown));
        panelToolbar.appendToolbarItem(this._modeCombobox);

        this._groupByCombobox = new WebInspector.ToolbarComboBox(this._onGroupByChanged.bind(this));
        /**
         * @param {string} name
         * @param {string} id
         * @this {WebInspector.TimelineTreeView}
         */
        function addGroupingOption(name, id)
        {
            var option = this._groupByCombobox.createOption(name, "", id);
            this._groupByCombobox.addOption(option);
            if (id === this._groupBySetting.get())
                this._groupByCombobox.select(option);
        }
        panelToolbar.appendToolbarItem(new WebInspector.ToolbarText(WebInspector.UIString("Group by")));
        addGroupingOption.call(this, WebInspector.UIString("Function"), WebInspector.TimelineTreeView.GroupBy.None);
        addGroupingOption.call(this, WebInspector.UIString("Domain"), WebInspector.TimelineTreeView.GroupBy.Domain);
        addGroupingOption.call(this, WebInspector.UIString("Domain (2nd Level)"), WebInspector.TimelineTreeView.GroupBy.DomainSecondLevel);
        addGroupingOption.call(this, WebInspector.UIString("URL"), WebInspector.TimelineTreeView.GroupBy.URL);
        panelToolbar.appendToolbarItem(this._groupByCombobox);
    },

    _onTreeModeChanged: function()
    {
        this._refreshTree();
    },

    _onGroupByChanged: function()
    {
        this._groupBySetting.set(this._groupByCombobox.selectedOption().value);
        this._refreshTree();
    },

    _refreshTree: function()
    {
        this.dataGrid.rootNode().removeChildren();
        var topDown = WebInspector.TimelineModel.buildTopDownTree(
            this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters, WebInspector.TimelineTreeView.eventId);
        var tree = this._modeCombobox.selectedOption().value === WebInspector.TimelineTreeView.Mode.TopDown
            ? this._preformTopDownTreeGrouping(topDown)
            : this._buildBottomUpTree(topDown);
        for (var child of tree.children.values()) {
            // Exclude the idle time off the total calculation.
            var gridNode = new WebInspector.TimelineTreeView.GridNode(child, topDown.totalTime);
            this.dataGrid.insertChild(gridNode);
        }
        this._sortingChanged();
    },

    /**
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} topDownTree
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _preformTopDownTreeGrouping: function(topDownTree)
    {
        var nodeToGroupId = this._nodeToGroupIdFunction();
        if (nodeToGroupId) {
            this._groupNodes = new Map();
            for (var node of topDownTree.children.values()) {
                var groupNode = this._nodeToGroupNode(nodeToGroupId, node);
                groupNode.selfTime += node.selfTime;
                groupNode.totalTime += node.totalTime;
                groupNode.children.set(node.id, node);
            }
            topDownTree.children = this._groupNodes;
            this._groupNodes = null;
        }
        return topDownTree;
    },

    /**
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} topDownTree
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildBottomUpTree: function(topDownTree)
    {
        this._groupNodes = new Map();
        var nodeToGroupId = this._nodeToGroupIdFunction();
        var nodeToGroupNode = nodeToGroupId ? this._nodeToGroupNode.bind(this, nodeToGroupId) : null;
        var bottomUpRoot = WebInspector.TimelineModel.buildBottomUpTree(topDownTree, nodeToGroupNode);
        for (var group of this._groupNodes)
            bottomUpRoot.children.set(group[0], group[1]);
        return bottomUpRoot;
    },

    /**
     * @return {?function(!WebInspector.TimelineModel.ProfileTreeNode):string}
     */
    _nodeToGroupIdFunction: function()
    {
        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByURL(node)
        {
            return WebInspector.TimelineTreeView.eventURL(node.event) || "";
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByDomain(node)
        {
            var parsedURL = (WebInspector.TimelineTreeView.eventURL(node.event) || "").asParsedURL();
            return parsedURL && parsedURL.host || "";
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByDomainSecondLevel(node)
        {
            var parsedURL = (WebInspector.TimelineTreeView.eventURL(node.event) || "").asParsedURL();
            if (!parsedURL)
                return "";
            if (/^[.0-9]+$/.test(parsedURL.host))
                return parsedURL.host;
            var domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
            return domainMatch && domainMatch[0] || "";
        }

        var groupByMap = /** @type {!Map<!WebInspector.TimelineTreeView.GroupBy,?function(!WebInspector.TimelineModel.ProfileTreeNode):string>} */ (new Map([
            [WebInspector.TimelineTreeView.GroupBy.None, null],
            [WebInspector.TimelineTreeView.GroupBy.Domain, groupByDomain],
            [WebInspector.TimelineTreeView.GroupBy.DomainSecondLevel, groupByDomainSecondLevel],
            [WebInspector.TimelineTreeView.GroupBy.URL, groupByURL]
        ]));
        return groupByMap.get(this._groupBySetting.get()) || null;
    },

    /**
     * @param {function(!WebInspector.TimelineModel.ProfileTreeNode):string} nodeToGroupId
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _nodeToGroupNode: function(nodeToGroupId, node)
    {
        var id = nodeToGroupId(node);
        var groupNode = this._groupNodes.get(id);
        if (!groupNode) {
            groupNode = new WebInspector.TimelineModel.ProfileTreeNode();
            groupNode.name = id || WebInspector.UIString("(unattributed)");
            groupNode.selfTime = 0;
            groupNode.totalTime = 0;
            groupNode.children = new Map();
            this._groupNodes.set(id, groupNode);
        }
        return groupNode;
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
            "self": "selfTime",
            "total": "totalTime",
            "activity": "name"
        }[columnIdentifier];
        this.dataGrid.sortNodes(compareField.bind(null, field), !this.dataGrid.isSortOrderAscending());
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineTreeView.eventId = function(event)
{
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
        var data = event.args["data"];
        return "f:" + data["functionName"] + "@" + (data["scriptId"] || data["url"] || "");
    }
    return event.name + ":@" + WebInspector.TimelineTreeView.eventURL(event);
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

    this._populated = false;
    this._profileNode = profileNode;
    this._totalTime = grandTotalTime;
    var selfTime = profileNode.selfTime;
    var selfPercent = selfTime / grandTotalTime * 100;
    var totalTime = profileNode.totalTime;
    var totalPercent = totalTime / grandTotalTime * 100;
    var data = {
        "activity": profileNode.name,
        "self-percent": formatPercent(selfPercent),
        "self": formatMilliseconds(selfTime),
        "total-percent": formatPercent(totalPercent),
        "total": formatMilliseconds(totalTime),
    };
    var hasChildren = this._profileNode.children ? this._profileNode.children.size > 0 : false;
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
        if (this._populated)
            return;
        this._populated = true;
        if (!this._profileNode.children)
            return;
        for (var node of this._profileNode.children.values()) {
            var gridNode = new WebInspector.TimelineTreeView.GridNode(node, this._totalTime);
            this.insertChildOrdered(gridNode);
        }
    },

    __proto__: WebInspector.SortableDataGridNode.prototype
}
