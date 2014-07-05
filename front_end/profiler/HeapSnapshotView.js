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
 * FIXME: ES5 strict mode check is suppressed due to multiple uses of arguments.callee.
 * @fileoverview
 * @suppress {es5Strict}
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
 * @param {!WebInspector.HeapProfileHeader} profile
 */
WebInspector.HeapSnapshotView = function(dataDisplayDelegate, profile)
{
    WebInspector.VBox.call(this);

    this.element.classList.add("heap-snapshot-view");

    profile.profileType().addEventListener(WebInspector.HeapSnapshotProfileType.SnapshotReceived, this._onReceiveSnapshot, this);
    profile.profileType().addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, this._onProfileHeaderRemoved, this);

    if (profile.profileType().id === WebInspector.TrackingHeapSnapshotProfileType.TypeId) {
        this._trackingOverviewGrid = new WebInspector.HeapTrackingOverviewGrid(profile);
        this._trackingOverviewGrid.addEventListener(WebInspector.HeapTrackingOverviewGrid.IdsRangeChanged, this._onIdsRangeChanged.bind(this));
    }

    this._splitView = new WebInspector.SplitView(false, true, "heapSnapshotSplitViewState", 200, 200);
    this._splitView.show(this.element);

    this._containmentView = new WebInspector.VBox();
    this._containmentView.setMinimumSize(50, 25);
    this._containmentDataGrid = new WebInspector.HeapSnapshotContainmentDataGrid(dataDisplayDelegate);
    this._containmentDataGrid.show(this._containmentView.element);
    this._containmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this._statisticsView = new WebInspector.HeapSnapshotStatisticsView();

    this._constructorsView = new WebInspector.VBox();
    this._constructorsView.setMinimumSize(50, 25);

    this._constructorsDataGrid = new WebInspector.HeapSnapshotConstructorsDataGrid(dataDisplayDelegate);
    this._constructorsDataGrid.show(this._constructorsView.element);
    this._constructorsDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this._diffView = new WebInspector.VBox();
    this._diffView.setMinimumSize(50, 25);

    this._diffDataGrid = new WebInspector.HeapSnapshotDiffDataGrid(dataDisplayDelegate);
    this._diffDataGrid.show(this._diffView.element);
    this._diffDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    if (profile._hasAllocationStacks) {
        this._allocationView = new WebInspector.VBox();
        this._allocationView.setMinimumSize(50, 25);
        this._allocationDataGrid = new WebInspector.AllocationDataGrid(profile.target() , dataDisplayDelegate);
        this._allocationDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._onSelectAllocationNode, this);
        this._allocationDataGrid.show(this._allocationView.element);

        this._allocationStackView = new WebInspector.HeapAllocationStackView(profile.target());
        this._allocationStackView.setMinimumSize(50, 25);

        this._tabbedPane = new WebInspector.TabbedPane();
        this._tabbedPane.closeableTabs = false;
        this._tabbedPane.headerElement().classList.add("heap-object-details-header");
    }

    this._retainmentView = new WebInspector.VBox();
    this._retainmentView.setMinimumSize(50, 21);
    this._retainmentView.element.classList.add("retaining-paths-view");

    var splitViewResizer;
    if (this._allocationStackView) {
        this._tabbedPane = new WebInspector.TabbedPane();
        this._tabbedPane.closeableTabs = false;
        this._tabbedPane.headerElement().classList.add("heap-object-details-header");

        this._tabbedPane.appendTab("retainers", WebInspector.UIString("Retainers"), this._retainmentView);
        this._tabbedPane.appendTab("allocation-stack", WebInspector.UIString("Allocation stack"), this._allocationStackView);

        splitViewResizer = this._tabbedPane.headerElement();
        this._objectDetailsView = this._tabbedPane;
    } else {
        var retainmentViewHeader = document.createElementWithClass("div", "heap-snapshot-view-resizer");
        var retainingPathsTitleDiv = retainmentViewHeader.createChild("div", "title");
        var retainingPathsTitle = retainingPathsTitleDiv.createChild("span");
        retainingPathsTitle.textContent = WebInspector.UIString("Retainers");
        this._retainmentView.element.appendChild(retainmentViewHeader);

        splitViewResizer = retainmentViewHeader;
        this._objectDetailsView = this._retainmentView;
    }
    this._splitView.hideDefaultResizer();
    this._splitView.installResizer(splitViewResizer);

    this._retainmentDataGrid = new WebInspector.HeapSnapshotRetainmentDataGrid(dataDisplayDelegate);
    this._retainmentDataGrid.show(this._retainmentView.element);
    this._retainmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._inspectedObjectChanged, this);
    this._retainmentDataGrid.reset();

    this._perspectives = [];
    this._perspectives.push(new WebInspector.HeapSnapshotView.SummaryPerspective());
    if (profile.profileType() !== WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
        this._perspectives.push(new WebInspector.HeapSnapshotView.ComparisonPerspective());
    this._perspectives.push(new WebInspector.HeapSnapshotView.ContainmentPerspective());
    if (this._allocationView)
        this._perspectives.push(new WebInspector.HeapSnapshotView.AllocationPerspective());
    if (WebInspector.experimentsSettings.heapSnapshotStatistics.isEnabled())
        this._perspectives.push(new WebInspector.HeapSnapshotView.StatisticsPerspective());

    this._perspectiveSelect = new WebInspector.StatusBarComboBox(this._onSelectedPerspectiveChanged.bind(this));
    for (var i = 0; i < this._perspectives.length; ++i)
        this._perspectiveSelect.createOption(this._perspectives[i].title());

    this._profile = profile;

    this._baseSelect = new WebInspector.StatusBarComboBox(this._changeBase.bind(this));
    this._baseSelect.visible = false;
    this._updateBaseOptions();

    this._filterSelect = new WebInspector.StatusBarComboBox(this._changeFilter.bind(this));
    this._filterSelect.visible = false;
    this._updateFilterOptions();

    this._classNameFilter = new WebInspector.StatusBarInput("Class filter");
    this._classNameFilter.visible = false;
    this._constructorsDataGrid.setNameFilter(this._classNameFilter);
    this._diffDataGrid.setNameFilter(this._classNameFilter);

    this._selectedSizeText = new WebInspector.StatusBarText("");

    this._popoverHelper = new WebInspector.ObjectPopoverHelper(this.element, this._getHoverAnchor.bind(this), this._resolveObjectForPopover.bind(this), undefined, true);

    this._currentPerspectiveIndex = 0;
    this._currentPerspective = this._perspectives[0];
    this._currentPerspective.activate(this);
    this._dataGrid = this._currentPerspective.masterGrid(this);

    this._refreshView();
}

/**
 * @constructor
 * @param {string} title
 */
WebInspector.HeapSnapshotView.Perspective = function(title)
{
    this._title = title;
}

WebInspector.HeapSnapshotView.Perspective.prototype = {
    /**
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView) { },

    /**
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    deactivate: function(heapSnapshotView)
    {
        heapSnapshotView._baseSelect.visible = false;
        heapSnapshotView._filterSelect.visible = false;
        heapSnapshotView._classNameFilter.visible = false;
        if (heapSnapshotView._trackingOverviewGrid)
            heapSnapshotView._trackingOverviewGrid.detach();
        if (heapSnapshotView._allocationView)
            heapSnapshotView._allocationView.detach();
        if (heapSnapshotView._statisticsView)
            heapSnapshotView._statisticsView.detach();

        heapSnapshotView._splitView.detach();
        heapSnapshotView._splitView.detachChildViews();
    },

    /**
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return null;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @return {boolean}
     */
    supportsSearch: function()
    {
        return false;
    }
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotView.Perspective}
 */
WebInspector.HeapSnapshotView.SummaryPerspective = function()
{
    WebInspector.HeapSnapshotView.Perspective.call(this,  WebInspector.UIString("Summary"));
}

WebInspector.HeapSnapshotView.SummaryPerspective.prototype = {
    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView)
    {
        heapSnapshotView._constructorsView.show(heapSnapshotView._splitView.mainElement());
        heapSnapshotView._objectDetailsView.show(heapSnapshotView._splitView.sidebarElement());
        heapSnapshotView._splitView.show(heapSnapshotView.element);
        heapSnapshotView._filterSelect.visible = true;
        heapSnapshotView._classNameFilter.visible = true;
        if (heapSnapshotView._trackingOverviewGrid) {
            heapSnapshotView._trackingOverviewGrid.show(heapSnapshotView.element, heapSnapshotView._splitView.element);
            heapSnapshotView._trackingOverviewGrid.update();
            heapSnapshotView._trackingOverviewGrid._updateGrid();
        }
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return heapSnapshotView._constructorsDataGrid;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsSearch: function()
    {
        return true;
    },

   __proto__: WebInspector.HeapSnapshotView.Perspective.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotView.Perspective}
 */
WebInspector.HeapSnapshotView.ComparisonPerspective = function()
{
    WebInspector.HeapSnapshotView.Perspective.call(this,  WebInspector.UIString("Comparison"));
}

WebInspector.HeapSnapshotView.ComparisonPerspective.prototype = {
    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView)
    {
        heapSnapshotView._diffView.show(heapSnapshotView._splitView.mainElement());
        heapSnapshotView._objectDetailsView.show(heapSnapshotView._splitView.sidebarElement());
        heapSnapshotView._splitView.show(heapSnapshotView.element);
        heapSnapshotView._baseSelect.visible = true;
        heapSnapshotView._classNameFilter.visible = true;
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return heapSnapshotView._diffDataGrid;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsSearch: function()
    {
        return true;
    },

   __proto__: WebInspector.HeapSnapshotView.Perspective.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotView.Perspective}
 */
WebInspector.HeapSnapshotView.ContainmentPerspective = function()
{
    WebInspector.HeapSnapshotView.Perspective.call(this,  WebInspector.UIString("Containment"));
}

WebInspector.HeapSnapshotView.ContainmentPerspective.prototype = {
    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView)
    {
        heapSnapshotView._containmentView.show(heapSnapshotView._splitView.mainElement());
        heapSnapshotView._objectDetailsView.show(heapSnapshotView._splitView.sidebarElement());
        heapSnapshotView._splitView.show(heapSnapshotView.element);
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return heapSnapshotView._containmentDataGrid;
    },
   __proto__: WebInspector.HeapSnapshotView.Perspective.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotView.Perspective}
 */
WebInspector.HeapSnapshotView.AllocationPerspective = function()
{
    WebInspector.HeapSnapshotView.Perspective.call(this,  WebInspector.UIString("Allocation"));
    this._allocationSplitView = new WebInspector.SplitView(false, true, "heapSnapshotAllocationSplitViewState", 200, 200);

    var resizer = document.createElementWithClass("div", "heap-snapshot-view-resizer");
    var title = resizer.createChild("div", "title").createChild("span");
    title.textContent = WebInspector.UIString("Live objects");
    this._allocationSplitView.hideDefaultResizer();
    this._allocationSplitView.installResizer(resizer);

    this._allocationSplitView.sidebarElement().appendChild(resizer);
}

WebInspector.HeapSnapshotView.AllocationPerspective.prototype = {
    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView)
    {
        heapSnapshotView._allocationView.show(this._allocationSplitView.mainElement());
        heapSnapshotView._constructorsView.show(heapSnapshotView._splitView.mainElement());
        heapSnapshotView._objectDetailsView.show(heapSnapshotView._splitView.sidebarElement());
        heapSnapshotView._splitView.show(this._allocationSplitView.sidebarElement());
        this._allocationSplitView.show(heapSnapshotView.element);

        heapSnapshotView._constructorsDataGrid.clear();
        var selectedNode = heapSnapshotView._allocationDataGrid.selectedNode;
        if (selectedNode)
            heapSnapshotView._constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    deactivate: function(heapSnapshotView)
    {
        this._allocationSplitView.detach();
        WebInspector.HeapSnapshotView.Perspective.prototype.deactivate.call(this, heapSnapshotView);
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return heapSnapshotView._allocationDataGrid;
    },

   __proto__: WebInspector.HeapSnapshotView.Perspective.prototype
}

/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotView.Perspective}
 */
WebInspector.HeapSnapshotView.StatisticsPerspective = function()
{
    WebInspector.HeapSnapshotView.Perspective.call(this,  WebInspector.UIString("Statistics"));
}

WebInspector.HeapSnapshotView.StatisticsPerspective.prototype = {
    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     */
    activate: function(heapSnapshotView)
    {
        heapSnapshotView._statisticsView.show(heapSnapshotView.element);
    },

    /**
     * @override
     * @param {!WebInspector.HeapSnapshotView} heapSnapshotView
     * @return {?WebInspector.DataGrid}
     */
    masterGrid: function(heapSnapshotView)
    {
        return null;
    },

   __proto__: WebInspector.HeapSnapshotView.Perspective.prototype
}


WebInspector.HeapSnapshotView.prototype = {
    _refreshView: function()
    {
        this._profile.load(profileCallback.bind(this));

        /**
         * @param {!WebInspector.HeapSnapshotProxy} heapSnapshotProxy
         * @this {WebInspector.HeapSnapshotView}
         */
        function profileCallback(heapSnapshotProxy)
        {
            heapSnapshotProxy.getStatistics(this._gotStatistics.bind(this));
            var list = this._profiles();
            var profileIndex = list.indexOf(this._profile);
            this._baseSelect.setSelectedIndex(Math.max(0, profileIndex - 1));
            this._dataGrid.setDataSource(heapSnapshotProxy);
            if (this._trackingOverviewGrid)
                this._trackingOverviewGrid._updateGrid();
        }
    },

    /**
     * @param {!WebInspector.HeapSnapshotCommon.Statistics} statistics
     */
    _gotStatistics: function(statistics) {
        this._statisticsView.setTotal(statistics.total);
        this._statisticsView.addRecord(statistics.code, WebInspector.UIString("Code"), "#f77");
        this._statisticsView.addRecord(statistics.strings, WebInspector.UIString("Strings"), "#5e5");
        this._statisticsView.addRecord(statistics.jsArrays, WebInspector.UIString("JS Arrays"), "#7af");
        this._statisticsView.addRecord(statistics.native, WebInspector.UIString("Typed Arrays"), "#fc5");
        this._statisticsView.addRecord(statistics.total, WebInspector.UIString("Total"));
    },

    _onIdsRangeChanged: function(event)
    {
        var minId = event.data.minId;
        var maxId = event.data.maxId;
        this._selectedSizeText.setText(WebInspector.UIString("Selected size: %s", Number.bytesToString(event.data.size)));
        if (this._constructorsDataGrid.snapshot)
            this._constructorsDataGrid.setSelectionRange(minId, maxId);
    },

    get statusBarItems()
    {
        var result = [this._perspectiveSelect.element, this._classNameFilter.element];
        if (this._profile.profileType() !== WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
            result.push(this._baseSelect.element, this._filterSelect.element);
        result.push(this._selectedSizeText.element);
        return result;
    },

    wasShown: function()
    {
        // FIXME: load base and current snapshots in parallel
        this._profile.load(profileCallback.bind(this));

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function profileCallback() {
            this._profile._wasShown();
            if (this._baseProfile)
                this._baseProfile.load(function() { });
        }
    },

    willHide: function()
    {
        this._currentSearchResultIndex = -1;
        this._popoverHelper.hidePopover();
        if (this.helpPopover && this.helpPopover.isShowing())
            this.helpPopover.hide();
    },

    searchCanceled: function()
    {
        if (this._searchResults) {
            for (var i = 0; i < this._searchResults.length; ++i) {
                var node = this._searchResults[i].node;
                delete node._searchMatched;
                node.refresh();
            }
        }

        delete this._searchFinishedCallback;
        this._currentSearchResultIndex = -1;
        this._searchResults = [];
    },

    /**
     * @param {string} query
     * @param {function(!WebInspector.View, number)} finishedCallback
     */
    performSearch: function(query, finishedCallback)
    {
        // Call searchCanceled since it will reset everything we need before doing a new search.
        this.searchCanceled();

        query = query.trim();

        if (!query)
            return;
        if (!this._currentPerspective.supportsSearch())
            return;

        /**
         * @param {boolean} found
         * @this {WebInspector.HeapSnapshotView}
         */
        function didHighlight(found)
        {
            finishedCallback(this, found ? 1 : 0);
        }

        if (query.charAt(0) === "@") {
            var snapshotNodeId = parseInt(query.substring(1), 10);
            if (!isNaN(snapshotNodeId))
                this._dataGrid.highlightObjectByHeapSnapshotId(String(snapshotNodeId), didHighlight.bind(this));
            else
                finishedCallback(this, 0);
            return;
        }

        this._searchFinishedCallback = finishedCallback;
        var nameRegExp = createPlainTextSearchRegex(query, "i");

        function matchesByName(gridNode) {
            return ("_name" in gridNode) && nameRegExp.test(gridNode._name);
        }

        function matchesQuery(gridNode)
        {
            delete gridNode._searchMatched;
            if (matchesByName(gridNode)) {
                gridNode._searchMatched = true;
                gridNode.refresh();
                return true;
            }
            return false;
        }

        var current = this._dataGrid.rootNode().children[0];
        var depth = 0;
        var info = {};

        // Restrict to type nodes and instances.
        const maxDepth = 1;

        while (current) {
            if (matchesQuery(current))
                this._searchResults.push({ node: current });
            current = current.traverseNextNode(false, null, (depth >= maxDepth), info);
            depth += info.depthChange;
        }

        finishedCallback(this, this._searchResults.length);
    },

    jumpToFirstSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        this._currentSearchResultIndex = 0;
        this._jumpToSearchResult(this._currentSearchResultIndex);
    },

    jumpToLastSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        this._currentSearchResultIndex = (this._searchResults.length - 1);
        this._jumpToSearchResult(this._currentSearchResultIndex);
    },

    jumpToNextSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        if (++this._currentSearchResultIndex >= this._searchResults.length)
            this._currentSearchResultIndex = 0;
        this._jumpToSearchResult(this._currentSearchResultIndex);
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        if (--this._currentSearchResultIndex < 0)
            this._currentSearchResultIndex = (this._searchResults.length - 1);
        this._jumpToSearchResult(this._currentSearchResultIndex);
    },

    /**
     * @return {boolean}
     */
    showingFirstSearchResult: function()
    {
        return (this._currentSearchResultIndex === 0);
    },

    /**
     * @return {boolean}
     */
    showingLastSearchResult: function()
    {
        return (this._searchResults && this._currentSearchResultIndex === (this._searchResults.length - 1));
    },

    /**
     * @return {number}
     */
    currentSearchResultIndex: function() {
        return this._currentSearchResultIndex;
    },

    _jumpToSearchResult: function(index)
    {
        var searchResult = this._searchResults[index];
        if (!searchResult)
            return;

        var node = searchResult.node;
        node.revealAndSelect();
    },

    refreshVisibleData: function()
    {
        if (!this._dataGrid)
            return;
        var child = this._dataGrid.rootNode().children[0];
        while (child) {
            child.refresh();
            child = child.traverseNextNode(false, null, true);
        }
    },

    _changeBase: function()
    {
        if (this._baseProfile === this._profiles()[this._baseSelect.selectedIndex()])
            return;

        this._baseProfile = this._profiles()[this._baseSelect.selectedIndex()];
        var dataGrid = /** @type {!WebInspector.HeapSnapshotDiffDataGrid} */ (this._dataGrid);
        // Change set base data source only if main data source is already set.
        if (dataGrid.snapshot)
            this._baseProfile.load(dataGrid.setBaseDataSource.bind(dataGrid));

        if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
            return;

        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again with the same query and callback.
        this._searchFinishedCallback(this, -this._searchResults.length);
        this.performSearch(this.currentQuery, this._searchFinishedCallback);
    },

    _changeFilter: function()
    {
        var profileIndex = this._filterSelect.selectedIndex() - 1;
        this._dataGrid.filterSelectIndexChanged(this._profiles(), profileIndex);

        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.HeapSnapshotFilterChanged,
            label: this._filterSelect.selectedOption().label
        });

        if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
            return;

        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again with the same query and callback.
        this._searchFinishedCallback(this, -this._searchResults.length);
        this.performSearch(this.currentQuery, this._searchFinishedCallback);
    },

    /**
     * @return {!Array.<!WebInspector.ProfileHeader>}
     */
    _profiles: function()
    {
        return this._profile.profileType().getProfiles();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {?Event} event
     */
    populateContextMenu: function(contextMenu, event)
    {
        if (this._dataGrid)
            this._dataGrid.populateContextMenu(contextMenu, event);
    },

    _selectionChanged: function(event)
    {
        var selectedNode = event.target.selectedNode;
        this._setSelectedNodeForDetailsView(selectedNode);
        this._inspectedObjectChanged(event);
    },

    _onSelectAllocationNode: function(event)
    {
        var selectedNode = event.target.selectedNode;
        this._constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
        this._setSelectedNodeForDetailsView(null);
    },

    _inspectedObjectChanged: function(event)
    {
        var selectedNode = event.target.selectedNode;
        if (!this._profile.fromFile() && selectedNode instanceof WebInspector.HeapSnapshotGenericObjectNode)
            ConsoleAgent.addInspectedHeapObject(selectedNode.snapshotNodeId);
    },

    /**
     * @param {?WebInspector.HeapSnapshotGridNode} nodeItem
     */
    _setSelectedNodeForDetailsView: function(nodeItem)
    {
        var dataSource = nodeItem && nodeItem.retainersDataSource();
        if (dataSource) {
            this._retainmentDataGrid.setDataSource(dataSource.snapshot, dataSource.snapshotNodeIndex);
            if (this._allocationStackView)
                this._allocationStackView.setAllocatedObject(dataSource.snapshot, dataSource.snapshotNodeIndex)
        } else {
            if (this._allocationStackView)
                this._allocationStackView.clear();
            this._retainmentDataGrid.reset();
        }
    },

    /**
     * @param {string} perspectiveTitle
     * @param {function()} callback
     */
    _changePerspectiveAndWait: function(perspectiveTitle, callback)
    {
        var perspectiveIndex = null;
        for (var i = 0; i < this._perspectives.length; ++i) {
            if (this._perspectives[i].title() === perspectiveTitle) {
                perspectiveIndex = i;
                break;
            }
        }
        if (this._currentPerspectiveIndex === perspectiveIndex || perspectiveIndex === null) {
            setTimeout(callback, 0);
            return;
        }

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function dataGridContentShown(event)
        {
            var dataGrid = event.data;
            dataGrid.removeEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, dataGridContentShown, this);
            if (dataGrid === this._dataGrid)
                callback();
        }
        this._perspectives[perspectiveIndex].masterGrid(this).addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, dataGridContentShown, this);

        this._perspectiveSelect.setSelectedIndex(perspectiveIndex);
        this._changePerspective(perspectiveIndex);
    },

    _updateDataSourceAndView: function()
    {
        var dataGrid = this._dataGrid;
        if (!dataGrid || dataGrid.snapshot)
            return;

        this._profile.load(didLoadSnapshot.bind(this));

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function didLoadSnapshot(snapshotProxy)
        {
            if (this._dataGrid !== dataGrid)
                return;
            if (dataGrid.snapshot !== snapshotProxy)
                dataGrid.setDataSource(snapshotProxy);
            if (dataGrid === this._diffDataGrid) {
                if (!this._baseProfile)
                    this._baseProfile = this._profiles()[this._baseSelect.selectedIndex()];
                this._baseProfile.load(didLoadBaseSnaphot.bind(this));
            }
        }

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function didLoadBaseSnaphot(baseSnapshotProxy)
        {
            if (this._diffDataGrid.baseSnapshot !== baseSnapshotProxy)
                this._diffDataGrid.setBaseDataSource(baseSnapshotProxy);
        }
    },

    _onSelectedPerspectiveChanged: function(event)
    {
        this._changePerspective(event.target.selectedIndex);
        // FIXME: This is needed by CodeSchool extension.
        this._onSelectedViewChanged(event);
    },

    _onSelectedViewChanged: function(event)
    {
    },

    _changePerspective: function(selectedIndex)
    {
        if (selectedIndex === this._currentPerspectiveIndex)
            return;

        this._currentPerspectiveIndex = selectedIndex;

        this._currentPerspective.deactivate(this);
        var perspective = this._perspectives[selectedIndex];
        this._currentPerspective = perspective;
        this._dataGrid = perspective.masterGrid(this);
        perspective.activate(this);

        this.refreshVisibleData();
        if (this._dataGrid)
            this._dataGrid.updateWidths();

        this._updateDataSourceAndView();

        if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
            return;

        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again the with same query and callback.
        this._searchFinishedCallback(this, -this._searchResults.length);
        this.performSearch(this.currentQuery, this._searchFinishedCallback);
    },

    /**
     * @param {string} perspectiveName
     * @param {number} snapshotObjectId
     */
    highlightLiveObject: function(perspectiveName, snapshotObjectId)
    {
        this._changePerspectiveAndWait(perspectiveName, didChangePerspective.bind(this));

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function didChangePerspective()
        {
            this._dataGrid.highlightObjectByHeapSnapshotId(snapshotObjectId, didHighlightObject);
        }

        function didHighlightObject(found)
        {
            if (!found)
                WebInspector.messageSink.addErrorMessage("Cannot find corresponding heap snapshot node", true);
        }
    },

    _getHoverAnchor: function(target)
    {
        var span = target.enclosingNodeOrSelfWithNodeName("span");
        if (!span)
            return;
        var row = target.enclosingNodeOrSelfWithNodeName("tr");
        if (!row)
            return;
        span.node = row._dataGridNode;
        return span;
    },

    _resolveObjectForPopover: function(element, showCallback, objectGroupName)
    {
        if (!this._profile.target())
            return;
        element.node.queryObjectContent(this._profile.target(), showCallback, objectGroupName);
    },

    _updateBaseOptions: function()
    {
        var list = this._profiles();
        // We're assuming that snapshots can only be added.
        if (this._baseSelect.size() === list.length)
            return;

        for (var i = this._baseSelect.size(), n = list.length; i < n; ++i) {
            var title = list[i].title;
            this._baseSelect.createOption(title);
        }
    },

    _updateFilterOptions: function()
    {
        var list = this._profiles();
        // We're assuming that snapshots can only be added.
        if (this._filterSelect.size() - 1 === list.length)
            return;

        if (!this._filterSelect.size())
            this._filterSelect.createOption(WebInspector.UIString("All objects"));

        for (var i = this._filterSelect.size() - 1, n = list.length; i < n; ++i) {
            var title = list[i].title;
            if (!i)
                title = WebInspector.UIString("Objects allocated before %s", title);
            else
                title = WebInspector.UIString("Objects allocated between %s and %s", list[i - 1].title, title);
            this._filterSelect.createOption(title);
        }
    },

    _updateControls: function()
    {
        this._updateBaseOptions();
        this._updateFilterOptions();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onReceiveSnapshot: function(event)
    {
        this._updateControls();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onProfileHeaderRemoved: function(event)
    {
        var profile = event.data;
        if (this._profile === profile) {
            this.detach();
            this._profile.profileType().removeEventListener(WebInspector.HeapSnapshotProfileType.SnapshotReceived, this._onReceiveSnapshot, this);
            this._profile.profileType().removeEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, this._onProfileHeaderRemoved, this);
            this.dispose();
        } else {
            this._updateControls();
        }
    },

    dispose: function()
    {
        if (this._allocationStackView) {
            this._allocationStackView.clear();
            this._allocationDataGrid.dispose();
        }
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileType}
 * @implements {WebInspector.TargetManager.Observer}
 * @param {string=} id
 * @param {string=} title
 */
WebInspector.HeapSnapshotProfileType = function(id, title)
{
    WebInspector.ProfileType.call(this, id || WebInspector.HeapSnapshotProfileType.TypeId, title || WebInspector.UIString("Take Heap Snapshot"));
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.HeapSnapshotProfileType.TypeId = "HEAP";
WebInspector.HeapSnapshotProfileType.SnapshotReceived = "SnapshotReceived";

WebInspector.HeapSnapshotProfileType.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        target.heapProfilerModel.enable();
        target.heapProfilerModel.addEventListener(WebInspector.HeapProfilerModel.Events.ResetProfiles, this._resetProfiles, this);
        target.heapProfilerModel.addEventListener(WebInspector.HeapProfilerModel.Events.AddHeapSnapshotChunk, this._addHeapSnapshotChunk, this);
        target.heapProfilerModel.addEventListener(WebInspector.HeapProfilerModel.Events.ReportHeapSnapshotProgress, this._reportHeapSnapshotProgress, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        target.heapProfilerModel.removeEventListener(WebInspector.HeapProfilerModel.Events.ResetProfiles, this._resetProfiles, this);
        target.heapProfilerModel.removeEventListener(WebInspector.HeapProfilerModel.Events.AddHeapSnapshotChunk, this._addHeapSnapshotChunk, this);
        target.heapProfilerModel.removeEventListener(WebInspector.HeapProfilerModel.Events.ReportHeapSnapshotProgress, this._reportHeapSnapshotProgress, this);
    },

    /**
     * @override
     * @return {string}
     */
    fileExtension: function()
    {
        return ".heapsnapshot";
    },

    get buttonTooltip()
    {
        return WebInspector.UIString("Take heap snapshot.");
    },

    /**
     * @override
     * @return {boolean}
     */
    isInstantProfile: function()
    {
        return true;
    },

    /**
     * @override
     * @return {boolean}
     */
    buttonClicked: function()
    {
        this._takeHeapSnapshot(function() {});
        WebInspector.userMetrics.ProfilesHeapProfileTaken.record();
        return false;
    },

    get treeItemTitle()
    {
        return WebInspector.UIString("HEAP SNAPSHOTS");
    },

    get description()
    {
        return WebInspector.UIString("Heap snapshot profiles show memory distribution among your page's JavaScript objects and related DOM nodes.");
    },

    /**
     * @override
     * @param {string} title
     * @return {!WebInspector.ProfileHeader}
     */
    createProfileLoadedFromFile: function(title)
    {
        return new WebInspector.HeapProfileHeader(null, this, title);
    },

    _takeHeapSnapshot: function(callback)
    {
        if (this.profileBeingRecorded())
            return;
        var target = /** @type {!WebInspector.Target} */ (WebInspector.context.flavor(WebInspector.Target));
        var profile = new WebInspector.HeapProfileHeader(target, this);
        this.setProfileBeingRecorded(profile);
        this.addProfile(profile);
        profile.updateStatus(WebInspector.UIString("Snapshotting\u2026"));

        /**
         * @param {?string} error
         * @this {WebInspector.HeapSnapshotProfileType}
         */
        function didTakeHeapSnapshot(error)
        {
            var profile = this._profileBeingRecorded;
            profile.title = WebInspector.UIString("Snapshot %d", profile.uid);
            profile._finishLoad();
            this.setProfileBeingRecorded(null);
            this.dispatchEventToListeners(WebInspector.ProfileType.Events.ProfileComplete, profile);
            callback();
        }
        target.heapProfilerAgent().takeHeapSnapshot(true, didTakeHeapSnapshot.bind(this));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _addHeapSnapshotChunk: function(event)
    {
        if (!this.profileBeingRecorded())
            return;
        var chunk = /** @type {string} */(event.data);
        this.profileBeingRecorded().transferChunk(chunk);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _reportHeapSnapshotProgress: function(event)
    {
        var profile = this.profileBeingRecorded();
        if (!profile)
            return;
        var data = /** @type {{done: number, total: number, finished: boolean}} */ (event.data);
        profile.updateStatus(WebInspector.UIString("%.0f%", (data.done / data.total) * 100), true);
        if (data.finished)
            profile._prepareToLoad();
    },

    _resetProfiles: function()
    {
        this._reset();
    },

    _snapshotReceived: function(profile)
    {
        if (this._profileBeingRecorded === profile)
            this.setProfileBeingRecorded(null);
        this.dispatchEventToListeners(WebInspector.HeapSnapshotProfileType.SnapshotReceived, profile);
    },

    __proto__: WebInspector.ProfileType.prototype
}


/**
 * @constructor
 * @extends {WebInspector.HeapSnapshotProfileType}
 */
WebInspector.TrackingHeapSnapshotProfileType = function()
{
    WebInspector.HeapSnapshotProfileType.call(this, WebInspector.TrackingHeapSnapshotProfileType.TypeId, WebInspector.UIString("Record Heap Allocations"));
}

WebInspector.TrackingHeapSnapshotProfileType.TypeId = "HEAP-RECORD";

WebInspector.TrackingHeapSnapshotProfileType.HeapStatsUpdate = "HeapStatsUpdate";
WebInspector.TrackingHeapSnapshotProfileType.TrackingStarted = "TrackingStarted";
WebInspector.TrackingHeapSnapshotProfileType.TrackingStopped = "TrackingStopped";

WebInspector.TrackingHeapSnapshotProfileType.prototype = {

    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        WebInspector.HeapSnapshotProfileType.prototype.targetAdded.call(this, target);
        target.heapProfilerModel.addEventListener(WebInspector.HeapProfilerModel.Events.HeapStatsUpdate, this._heapStatsUpdate, this);
        target.heapProfilerModel.addEventListener(WebInspector.HeapProfilerModel.Events.LastSeenObjectId, this._lastSeenObjectId, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        WebInspector.HeapSnapshotProfileType.prototype.targetRemoved.call(this, target);
        target.heapProfilerModel.removeEventListener(WebInspector.HeapProfilerModel.Events.HeapStatsUpdate, this._heapStatsUpdate, this);
        target.heapProfilerModel.removeEventListener(WebInspector.HeapProfilerModel.Events.LastSeenObjectId, this._lastSeenObjectId, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _heapStatsUpdate: function(event)
    {
        if (!this._profileSamples)
            return;
        var samples = /** @type {!Array.<number>} */ (event.data);
        var index;
        for (var i = 0; i < samples.length; i += 3) {
            index = samples[i];
            var count = samples[i+1];
            var size  = samples[i+2];
            this._profileSamples.sizes[index] = size;
            if (!this._profileSamples.max[index])
                this._profileSamples.max[index] = size;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _lastSeenObjectId: function(event)
    {
        var profileSamples = this._profileSamples;
        if (!profileSamples)
            return;
        var data = /** @type {{lastSeenObjectId: number, timestamp: number}} */ (event.data);
        var currentIndex = Math.max(profileSamples.ids.length, profileSamples.max.length - 1);
        profileSamples.ids[currentIndex] = data.lastSeenObjectId;
        if (!profileSamples.max[currentIndex]) {
            profileSamples.max[currentIndex] = 0;
            profileSamples.sizes[currentIndex] = 0;
        }
        profileSamples.timestamps[currentIndex] = data.timestamp;
        if (profileSamples.totalTime < data.timestamp - profileSamples.timestamps[0])
            profileSamples.totalTime *= 2;
        this.dispatchEventToListeners(WebInspector.TrackingHeapSnapshotProfileType.HeapStatsUpdate, this._profileSamples);
        this._profileBeingRecorded.updateStatus(null, true);
    },

    /**
     * @override
     * @return {boolean}
     */
    hasTemporaryView: function()
    {
        return true;
    },

    get buttonTooltip()
    {
        return this._recording ? WebInspector.UIString("Stop recording heap profile.") : WebInspector.UIString("Start recording heap profile.");
    },

    /**
     * @override
     * @return {boolean}
     */
    isInstantProfile: function()
    {
        return false;
    },

    /**
     * @override
     * @return {boolean}
     */
    buttonClicked: function()
    {
        return this._toggleRecording();
    },

    _startRecordingProfile: function()
    {
        if (this.profileBeingRecorded())
            return;
        var recordAllocationStacks = WebInspector.settings.recordAllocationStacks.get();
        this._addNewProfile(recordAllocationStacks);
        this.profileBeingRecorded().target().heapProfilerAgent().startTrackingHeapObjects(recordAllocationStacks);
    },

    /**
     * @param {boolean} withAllocationStacks
     */
    _addNewProfile: function(withAllocationStacks)
    {
        var target =  WebInspector.context.flavor(WebInspector.Target);
        this.setProfileBeingRecorded(new WebInspector.HeapProfileHeader(target, this, undefined, withAllocationStacks));
        this._lastSeenIndex = -1;
        this._profileSamples = {
            'sizes': [],
            'ids': [],
            'timestamps': [],
            'max': [],
            'totalTime': 30000
        };
        this._profileBeingRecorded._profileSamples = this._profileSamples;
        this._recording = true;
        this.addProfile(this._profileBeingRecorded);
        this._profileBeingRecorded.updateStatus(WebInspector.UIString("Recording\u2026"));
        this.dispatchEventToListeners(WebInspector.TrackingHeapSnapshotProfileType.TrackingStarted);
    },

    _stopRecordingProfile: function()
    {
        this._profileBeingRecorded.updateStatus(WebInspector.UIString("Snapshotting\u2026"));
        /**
         * @param {?string} error
         * @this {WebInspector.HeapSnapshotProfileType}
         */
        function didTakeHeapSnapshot(error)
        {
            var profile = this.profileBeingRecorded();
            if (!profile)
                return;
            profile._finishLoad();
            this._profileSamples = null;
            this.setProfileBeingRecorded(null);
            this.dispatchEventToListeners(WebInspector.ProfileType.Events.ProfileComplete, profile);
        }

        this._profileBeingRecorded.target().heapProfilerAgent().stopTrackingHeapObjects(true, didTakeHeapSnapshot.bind(this));
        this._recording = false;
        this.dispatchEventToListeners(WebInspector.TrackingHeapSnapshotProfileType.TrackingStopped);
    },

    _toggleRecording: function()
    {
        if (this._recording)
            this._stopRecordingProfile();
        else
            this._startRecordingProfile();
        return this._recording;
    },

    get treeItemTitle()
    {
        return WebInspector.UIString("HEAP TIMELINES");
    },

    get description()
    {
        return WebInspector.UIString("Record JavaScript object allocations over time. Use this profile type to isolate memory leaks.");
    },

    /**
     * @override
     */
    resetProfiles: function()
    {
        var wasRecording = this._recording;
        var recordingAllocationStacks = wasRecording && this.profileBeingRecorded()._hasAllocationStacks;
        // Clear current profile to avoid stopping backend.
        this.setProfileBeingRecorded(null);
        WebInspector.HeapSnapshotProfileType.prototype.resetProfiles.call(this);
        this._profileSamples = null;
        this._lastSeenIndex = -1;
        if (wasRecording)
            this._addNewProfile(recordingAllocationStacks);
    },

    /**
     * @override
     */
    profileBeingRecordedRemoved: function()
    {
        this._stopRecordingProfile();
        this._profileSamples = null;
    },

    __proto__: WebInspector.HeapSnapshotProfileType.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileHeader}
 * @param {?WebInspector.Target} target
 * @param {!WebInspector.HeapSnapshotProfileType} type
 * @param {string=} title
 * @param {boolean=} hasAllocationStacks
 */
WebInspector.HeapProfileHeader = function(target, type, title, hasAllocationStacks)
{
    WebInspector.ProfileHeader.call(this, target, type, title || WebInspector.UIString("Snapshot %d", type.nextProfileUid()));
    this._hasAllocationStacks = !!hasAllocationStacks;
    this.maxJSObjectId = -1;
    /**
     * @type {?WebInspector.HeapSnapshotWorkerProxy}
     */
    this._workerProxy = null;
    /**
     * @type {?WebInspector.OutputStream}
     */
    this._receiver = null;
    /**
     * @type {?WebInspector.HeapSnapshotProxy}
     */
    this._snapshotProxy = null;
    /**
     * @type {?Array.<function(!WebInspector.HeapSnapshotProxy)>}
     */
    this._loadCallbacks = [];
    this._totalNumberOfChunks = 0;
    this._bufferedWriter = null;
}

WebInspector.HeapProfileHeader.prototype = {
    /**
     * @override
     * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
     * @return {!WebInspector.ProfileSidebarTreeElement}
     */
    createSidebarTreeElement: function(dataDisplayDelegate)
    {
        return new WebInspector.ProfileSidebarTreeElement(dataDisplayDelegate, this, "heap-snapshot-sidebar-tree-item");
    },

    /**
     * @override
     * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
     * @return {!WebInspector.HeapSnapshotView}
     */
    createView: function(dataDisplayDelegate)
    {
        return new WebInspector.HeapSnapshotView(dataDisplayDelegate, this);
    },

    /**
     * @override
     * @param {function(!WebInspector.HeapSnapshotProxy):void} callback
     */
    load: function(callback)
    {
        if (this.uid === -1)
            return;
        if (this._snapshotProxy) {
            callback(this._snapshotProxy);
            return;
        }
        this._loadCallbacks.push(callback);
    },

    _prepareToLoad: function()
    {
        console.assert(!this._receiver, "Already loading");
        this._setupWorker();
        this.updateStatus(WebInspector.UIString("Loading\u2026"), true);
    },

    _finishLoad: function()
    {
        if (!this._wasDisposed)
            this._receiver.close(function() {});
        if (this._bufferedWriter) {
            this._bufferedWriter.close(this._didWriteToTempFile.bind(this));
            this._bufferedWriter = null;
        }
    },

    _didWriteToTempFile: function(tempFile)
    {
        if (this._wasDisposed) {
            if (tempFile)
                tempFile.remove();
            return;
        }
        this._tempFile = tempFile;
        if (!tempFile)
            this._failedToCreateTempFile = true;
        if (this._onTempFileReady) {
            this._onTempFileReady();
            this._onTempFileReady = null;
        }
    },

    _setupWorker: function()
    {
        /**
         * @this {WebInspector.HeapProfileHeader}
         */
        function setProfileWait(event)
        {
            this.updateStatus(null, event.data);
        }
        console.assert(!this._workerProxy, "HeapSnapshotWorkerProxy already exists");
        this._workerProxy = new WebInspector.HeapSnapshotWorkerProxy(this._handleWorkerEvent.bind(this));
        this._workerProxy.addEventListener("wait", setProfileWait, this);
        this._receiver = this._workerProxy.createLoader(this.uid, this._snapshotReceived.bind(this));
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    _handleWorkerEvent: function(eventName, data)
    {
        if (WebInspector.HeapSnapshotProgressEvent.Update !== eventName)
            return;
        var subtitle = /** @type {string} */ (data);
        this.updateStatus(subtitle);
    },

    /**
     * @override
     */
    dispose: function()
    {
        if (this._workerProxy)
            this._workerProxy.dispose();
        this.removeTempFile();
        this._wasDisposed = true;
    },

    _didCompleteSnapshotTransfer: function()
    {
        if (!this._snapshotProxy)
            return;
        this.updateStatus(Number.bytesToString(this._snapshotProxy.totalSize), false);
    },

    /**
     * @param {string} chunk
     */
    transferChunk: function(chunk)
    {
        if (!this._bufferedWriter)
            this._bufferedWriter = new WebInspector.BufferedTempFileWriter("heap-profiler", this.uid);
        this._bufferedWriter.write(chunk);

        ++this._totalNumberOfChunks;
        this._receiver.write(chunk, function() {});
    },

    _snapshotReceived: function(snapshotProxy)
    {
        if (this._wasDisposed)
            return;
        this._receiver = null;
        this._snapshotProxy = snapshotProxy;
        this.maxJSObjectId = snapshotProxy.maxJSObjectId();
        this._didCompleteSnapshotTransfer();
        this._workerProxy.startCheckingForLongRunningCalls();
        this.notifySnapshotReceived();
    },

    notifySnapshotReceived: function()
    {
        for (var i = 0; i < this._loadCallbacks.length; i++)
            this._loadCallbacks[i](this._snapshotProxy);
        this._loadCallbacks = null;
        this._profileType._snapshotReceived(this);
        if (this.canSaveToFile())
            this.dispatchEventToListeners(WebInspector.ProfileHeader.Events.ProfileReceived);
    },

    // Hook point for tests.
    _wasShown: function()
    {
    },

    /**
     * @override
     * @return {boolean}
     */
    canSaveToFile: function()
    {
        return !this.fromFile() && this._snapshotProxy;
    },

    /**
     * @override
     */
    saveToFile: function()
    {
        var fileOutputStream = new WebInspector.FileOutputStream();

        /**
         * @param {boolean} accepted
         * @this {WebInspector.HeapProfileHeader}
         */
        function onOpen(accepted)
        {
            if (!accepted)
                return;
            if (this._failedToCreateTempFile) {
                WebInspector.messageSink.addErrorMessage("Failed to open temp file with heap snapshot");
                fileOutputStream.close();
            } else if (this._tempFile) {
                var delegate = new WebInspector.SaveSnapshotOutputStreamDelegate(this);
                this._tempFile.writeToOutputSteam(fileOutputStream, delegate);
            } else {
                this._onTempFileReady = onOpen.bind(this, accepted);
                this._updateSaveProgress(0, 1);
            }
        }
        this._fileName = this._fileName || "Heap-" + new Date().toISO8601Compact() + this._profileType.fileExtension();
        fileOutputStream.open(this._fileName, onOpen.bind(this));
    },

    _updateSaveProgress: function(value, total)
    {
        var percentValue = ((total ? (value / total) : 0) * 100).toFixed(0);
        this.updateStatus(WebInspector.UIString("Saving\u2026 %d\%", percentValue));
    },

    /**
     * @override
     * @param {!File} file
     */
    loadFromFile: function(file)
    {
        this.updateStatus(WebInspector.UIString("Loading\u2026"), true);
        this._setupWorker();
        var delegate = new WebInspector.HeapSnapshotLoadFromFileDelegate(this);
        var fileReader = this._createFileReader(file, delegate);
        fileReader.start(this._receiver);
    },

    _createFileReader: function(file, delegate)
    {
        return new WebInspector.ChunkedFileReader(file, 10000000, delegate);
    },

    __proto__: WebInspector.ProfileHeader.prototype
}

/**
 * @constructor
 * @implements {WebInspector.OutputStreamDelegate}
 */
WebInspector.HeapSnapshotLoadFromFileDelegate = function(snapshotHeader)
{
    this._snapshotHeader = snapshotHeader;
}

WebInspector.HeapSnapshotLoadFromFileDelegate.prototype = {
    onTransferStarted: function()
    {
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader)
    {
    },

    onTransferFinished: function()
    {
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     * @param {?Event} e
     */
    onError: function (reader, e)
    {
        var subtitle;
        switch(e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
            subtitle = WebInspector.UIString("'%s' not found.", reader.fileName());
            break;
        case e.target.error.NOT_READABLE_ERR:
            subtitle = WebInspector.UIString("'%s' is not readable", reader.fileName());
            break;
        case e.target.error.ABORT_ERR:
            return;
        default:
            subtitle = WebInspector.UIString("'%s' error %d", reader.fileName(), e.target.error.code);
        }
        this._snapshotHeader.updateStatus(subtitle);
    }
}

/**
 * @constructor
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {!WebInspector.HeapProfileHeader} profileHeader
 */
WebInspector.SaveSnapshotOutputStreamDelegate = function(profileHeader)
{
    this._profileHeader = profileHeader;
}

WebInspector.SaveSnapshotOutputStreamDelegate.prototype = {
    onTransferStarted: function()
    {
        this._profileHeader._updateSaveProgress(0, 1);
    },

    onTransferFinished: function()
    {
        this._profileHeader._didCompleteSnapshotTransfer();
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader)
    {
        this._profileHeader._updateSaveProgress(reader.loadedSize(), reader.fileSize());
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     * @param {?Event} event
     */
    onError: function(reader, event)
    {
        WebInspector.messageSink.addErrorMessage("Failed to read heap snapshot from temp file: " + /** @type {!ErrorEvent} */ (event).message);
        this.onTransferFinished();
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.HeapProfileHeader} heapProfileHeader
 */
WebInspector.HeapTrackingOverviewGrid = function(heapProfileHeader)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.id = "heap-recording-view";
    this.element.classList.add("heap-tracking-overview");

    this._overviewContainer = this.element.createChild("div", "overview-container");
    this._overviewGrid = new WebInspector.OverviewGrid("heap-recording");
    this._overviewGrid.element.classList.add("fill");

    this._overviewCanvas = this._overviewContainer.createChild("canvas", "heap-recording-overview-canvas");
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new WebInspector.HeapTrackingOverviewGrid.OverviewCalculator();
    this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);

    this._profileSamples = heapProfileHeader._profileSamples;
    if (heapProfileHeader.profileType().profileBeingRecorded() === heapProfileHeader) {
        this._profileType = heapProfileHeader.profileType();
        this._profileType.addEventListener(WebInspector.TrackingHeapSnapshotProfileType.HeapStatsUpdate, this._onHeapStatsUpdate, this);
        this._profileType.addEventListener(WebInspector.TrackingHeapSnapshotProfileType.TrackingStopped, this._onStopTracking, this);
    }
    var timestamps = this._profileSamples.timestamps;
    var totalTime = this._profileSamples.totalTime;
    this._windowLeft = 0.0;
    this._windowRight = totalTime && timestamps.length ? (timestamps[timestamps.length - 1] - timestamps[0]) / totalTime : 1.0;
    this._overviewGrid.setWindow(this._windowLeft, this._windowRight);
    this._yScale = new WebInspector.HeapTrackingOverviewGrid.SmoothScale();
    this._xScale = new WebInspector.HeapTrackingOverviewGrid.SmoothScale();
}

WebInspector.HeapTrackingOverviewGrid.IdsRangeChanged = "IdsRangeChanged";

WebInspector.HeapTrackingOverviewGrid.prototype = {
    _onStopTracking: function(event)
    {
        this._profileType.removeEventListener(WebInspector.TrackingHeapSnapshotProfileType.HeapStatsUpdate, this._onHeapStatsUpdate, this);
        this._profileType.removeEventListener(WebInspector.TrackingHeapSnapshotProfileType.TrackingStopped, this._onStopTracking, this);
    },

    _onHeapStatsUpdate: function(event)
    {
        this._profileSamples = event.data;
        this._scheduleUpdate();
    },

     /**
      * @param {number} width
      * @param {number} height
      */
    _drawOverviewCanvas: function(width, height)
    {
        if (!this._profileSamples)
            return;
        var profileSamples = this._profileSamples;
        var sizes = profileSamples.sizes;
        var topSizes = profileSamples.max;
        var timestamps = profileSamples.timestamps;
        var startTime = timestamps[0];
        var endTime = timestamps[timestamps.length - 1];

        var scaleFactor = this._xScale.nextScale(width / profileSamples.totalTime);
        var maxSize = 0;
        /**
          * @param {!Array.<number>} sizes
          * @param {function(number, number):void} callback
          */
        function aggregateAndCall(sizes, callback)
        {
            var size = 0;
            var currentX = 0;
            for (var i = 1; i < timestamps.length; ++i) {
                var x = Math.floor((timestamps[i] - startTime) * scaleFactor);
                if (x !== currentX) {
                    if (size)
                        callback(currentX, size);
                    size = 0;
                    currentX = x;
                }
                size += sizes[i];
            }
            callback(currentX, size);
        }

        /**
          * @param {number} x
          * @param {number} size
          */
        function maxSizeCallback(x, size)
        {
            maxSize = Math.max(maxSize, size);
        }

        aggregateAndCall(sizes, maxSizeCallback);

        var yScaleFactor = this._yScale.nextScale(maxSize ? height / (maxSize * 1.1) : 0.0);

        this._overviewCanvas.width = width * window.devicePixelRatio;
        this._overviewCanvas.height = height * window.devicePixelRatio;
        this._overviewCanvas.style.width = width + "px";
        this._overviewCanvas.style.height = height + "px";

        var context = this._overviewCanvas.getContext("2d");
        context.scale(window.devicePixelRatio, window.devicePixelRatio);

        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = "rgba(192, 192, 192, 0.6)";
        var currentX = (endTime - startTime) * scaleFactor;
        context.moveTo(currentX, height - 1);
        context.lineTo(currentX, 0);
        context.stroke();
        context.closePath();

        var gridY;
        var gridValue;
        var gridLabelHeight = 14;
        if (yScaleFactor) {
            const maxGridValue = (height - gridLabelHeight) / yScaleFactor;
            // The round value calculation is a bit tricky, because
            // it has a form k*10^n*1024^m, where k=[1,5], n=[0..3], m is an integer,
            // e.g. a round value 10KB is 10240 bytes.
            gridValue = Math.pow(1024, Math.floor(Math.log(maxGridValue) / Math.log(1024)));
            gridValue *= Math.pow(10, Math.floor(Math.log(maxGridValue / gridValue) / Math.LN10));
            if (gridValue * 5 <= maxGridValue)
                gridValue *= 5;
            gridY = Math.round(height - gridValue * yScaleFactor - 0.5) + 0.5;
            context.beginPath();
            context.lineWidth = 1;
            context.strokeStyle = "rgba(0, 0, 0, 0.2)";
            context.moveTo(0, gridY);
            context.lineTo(width, gridY);
            context.stroke();
            context.closePath();
        }

        /**
          * @param {number} x
          * @param {number} size
          */
        function drawBarCallback(x, size)
        {
            context.moveTo(x, height - 1);
            context.lineTo(x, Math.round(height - size * yScaleFactor - 1));
        }

        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = "rgba(192, 192, 192, 0.6)";
        aggregateAndCall(topSizes, drawBarCallback);
        context.stroke();
        context.closePath();

        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = "rgba(0, 0, 192, 0.8)";
        aggregateAndCall(sizes, drawBarCallback);
        context.stroke();
        context.closePath();

        if (gridValue) {
            var label = Number.bytesToString(gridValue);
            var labelPadding = 4;
            var labelX = 0;
            var labelY = gridY - 0.5;
            var labelWidth = 2 * labelPadding + context.measureText(label).width;
            context.beginPath();
            context.textBaseline = "bottom";
            context.font = "10px " + window.getComputedStyle(this.element, null).getPropertyValue("font-family");
            context.fillStyle = "rgba(255, 255, 255, 0.75)";
            context.fillRect(labelX, labelY - gridLabelHeight, labelWidth, gridLabelHeight);
            context.fillStyle = "rgb(64, 64, 64)";
            context.fillText(label, labelX + labelPadding, labelY);
            context.fill();
            context.closePath();
        }
    },

    onResize: function()
    {
        this._updateOverviewCanvas = true;
        this._scheduleUpdate();
    },

    _onWindowChanged: function()
    {
        if (!this._updateGridTimerId)
            this._updateGridTimerId = setTimeout(this._updateGrid.bind(this), 10);
    },

    _scheduleUpdate: function()
    {
        if (this._updateTimerId)
            return;
        this._updateTimerId = setTimeout(this.update.bind(this), 10);
    },

    _updateBoundaries: function()
    {
        this._windowLeft = this._overviewGrid.windowLeft();
        this._windowRight = this._overviewGrid.windowRight();
        this._windowWidth = this._windowRight - this._windowLeft;
    },

    update: function()
    {
        this._updateTimerId = null;
        if (!this.isShowing())
            return;
        this._updateBoundaries();
        this._overviewCalculator._updateBoundaries(this);
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._drawOverviewCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - 20);
    },

    _updateGrid: function()
    {
        this._updateGridTimerId = 0;
        this._updateBoundaries();
        var ids = this._profileSamples.ids;
        var timestamps = this._profileSamples.timestamps;
        var sizes = this._profileSamples.sizes;
        var startTime = timestamps[0];
        var totalTime = this._profileSamples.totalTime;
        var timeLeft = startTime + totalTime * this._windowLeft;
        var timeRight = startTime + totalTime * this._windowRight;
        var minId = 0;
        var maxId = ids[ids.length - 1] + 1;
        var size = 0;
        for (var i = 0; i < timestamps.length; ++i) {
            if (!timestamps[i])
                continue;
            if (timestamps[i] > timeRight)
                break;
            maxId = ids[i];
            if (timestamps[i] < timeLeft) {
                minId = ids[i];
                continue;
            }
            size += sizes[i];
        }

        this.dispatchEventToListeners(WebInspector.HeapTrackingOverviewGrid.IdsRangeChanged, {minId: minId, maxId: maxId, size: size});
    },

    __proto__: WebInspector.VBox.prototype
}


/**
 * @constructor
 */
WebInspector.HeapTrackingOverviewGrid.SmoothScale = function()
{
    this._lastUpdate = 0;
    this._currentScale = 0.0;
}

WebInspector.HeapTrackingOverviewGrid.SmoothScale.prototype = {
    /**
     * @param {number} target
     * @return {number}
     */
    nextScale: function(target) {
        target = target || this._currentScale;
        if (this._currentScale) {
            var now = Date.now();
            var timeDeltaMs = now - this._lastUpdate;
            this._lastUpdate = now;
            var maxChangePerSec = 20;
            var maxChangePerDelta = Math.pow(maxChangePerSec, timeDeltaMs / 1000);
            var scaleChange = target / this._currentScale;
            this._currentScale *= Number.constrain(scaleChange, 1 / maxChangePerDelta, maxChangePerDelta);
        } else
            this._currentScale = target;
        return this._currentScale;
    }
}


/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.HeapTrackingOverviewGrid.OverviewCalculator = function()
{
}

WebInspector.HeapTrackingOverviewGrid.OverviewCalculator.prototype = {
    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return 0;
    },

    /**
     * @param {!WebInspector.HeapTrackingOverviewGrid} chart
     */
    _updateBoundaries: function(chart)
    {
        this._minimumBoundaries = 0;
        this._maximumBoundaries = chart._profileSamples.totalTime;
        this._xScaleFactor = chart._overviewContainer.clientWidth / this._maximumBoundaries;
    },

    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundaries) * this._xScaleFactor;
    },

    /**
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatTime: function(value, precision)
    {
        return Number.secondsToString(value / 1000, !!precision);
    },

    /**
     * @return {number}
     */
    maximumBoundary: function()
    {
        return this._maximumBoundaries;
    },

    /**
     * @return {number}
     */
    minimumBoundary: function()
    {
        return this._minimumBoundaries;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._minimumBoundaries;
    },

    /**
     * @return {number}
     */
    boundarySpan: function()
    {
        return this._maximumBoundaries - this._minimumBoundaries;
    }
}


/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.HeapSnapshotStatisticsView = function()
{
    WebInspector.VBox.call(this);
    this.setMinimumSize(50, 25);
    this._pieChart = new WebInspector.PieChart();
    this._pieChart.setSize(150);
    this.element.appendChild(this._pieChart.element);
    this._labels = this.element.createChild("div", "heap-snapshot-stats-legend");
}

WebInspector.HeapSnapshotStatisticsView.prototype = {
    /**
     * @param {number} value
     */
    setTotal: function(value)
    {
        this._pieChart.setTotal(value);
    },

    /**
     * @param {number} value
     * @param {string} name
     * @param {string=} color
     */
    addRecord: function(value, name, color)
    {
        if (color)
            this._pieChart.addSlice(value, color);

        var node = this._labels.createChild("div");
        var swatchDiv = node.createChild("div", "heap-snapshot-stats-swatch");
        var nameDiv = node.createChild("div", "heap-snapshot-stats-name");
        var sizeDiv = node.createChild("div", "heap-snapshot-stats-size");
        if (color)
            swatchDiv.style.backgroundColor = color;
        else
            swatchDiv.classList.add("heap-snapshot-stats-empty-swatch");
        nameDiv.textContent = name;
        sizeDiv.textContent = WebInspector.UIString("%s KB", Number.withThousandsSeparator(Math.round(value / 1024)));
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {?WebInspector.Target} target
 */
WebInspector.HeapAllocationStackView = function(target)
{
    WebInspector.View.call(this);
    this._targetObserver = new WebInspector.TargetObserver(target);
    this._linkifier = new WebInspector.Linkifier();
}

WebInspector.HeapAllocationStackView.prototype = {
    /**
     * @param {!WebInspector.HeapSnapshotProxy} snapshot
     * @param {number} snapshotNodeIndex
     */
    setAllocatedObject: function(snapshot, snapshotNodeIndex)
    {
        this.clear();
        snapshot.allocationStack(snapshotNodeIndex, this._didReceiveAllocationStack.bind(this));
    },

    clear: function()
    {
        this.element.removeChildren();
        this._linkifier.reset();
    },

    /**
     * @param {?Array.<!WebInspector.HeapSnapshotCommon.AllocationStackFrame>} frames
     */
    _didReceiveAllocationStack: function(frames)
    {
        if (!frames) {
            var stackDiv = this.element.createChild("div", "no-heap-allocation-stack");
            stackDiv.createTextChild(WebInspector.UIString("Stack was not recorded for this object because it had been allocated before this profile recording started."));
            return;
        }

        var stackDiv = this.element.createChild("div", "heap-allocation-stack");
        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            var frameDiv = stackDiv.createChild("div", "stack-frame");
            var name = frameDiv.createChild("div");
            name.textContent = frame.functionName;
            if (frame.scriptId) {
                var urlElement = this._linkifier.linkifyLocationByScriptId(this._targetObserver.target(), String(frame.scriptId), frame.scriptName, frame.line - 1, frame.column - 1);
                frameDiv.appendChild(urlElement);
            }
        }
    },

    __proto__: WebInspector.View.prototype
}
