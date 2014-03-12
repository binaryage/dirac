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
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.HeapProfileHeader} profile
 */
WebInspector.HeapSnapshotView = function(profile)
{
    WebInspector.VBox.call(this);

    this.element.classList.add("heap-snapshot-view");

    profile.profileType().addEventListener(WebInspector.HeapSnapshotProfileType.SnapshotReceived, this._onReceivSnapshot, this);
    profile.profileType().addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, this._onProfileHeaderRemoved, this);

    if (profile._profileType.id === WebInspector.TrackingHeapSnapshotProfileType.TypeId) {
        this._trackingOverviewGrid = new WebInspector.HeapTrackingOverviewGrid(profile);
        this._trackingOverviewGrid.addEventListener(WebInspector.HeapTrackingOverviewGrid.IdsRangeChanged, this._onIdsRangeChanged.bind(this));
        this._trackingOverviewGrid.show(this.element);
    }

    this.viewsContainer = new WebInspector.SplitView(false, true, "heapSnapshotSplitViewState", 200, 200);
    this.viewsContainer.show(this.element);
    this.viewsContainer.setMainElementConstraints(50, 50);
    this.viewsContainer.setSidebarElementConstraints(70, 70);

    this.containmentView = new WebInspector.VBox();
    this.containmentDataGrid = new WebInspector.HeapSnapshotContainmentDataGrid();
    this.containmentDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.containmentDataGrid.show(this.containmentView.element);
    this.containmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.statisticsView = new WebInspector.HeapSnapshotStatisticsView();

    this.constructorsView = new WebInspector.VBox();

    this.constructorsDataGrid = new WebInspector.HeapSnapshotConstructorsDataGrid();
    this.constructorsDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.constructorsDataGrid.show(this.constructorsView.element);
    this.constructorsDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.dataGrid = /** @type {!WebInspector.HeapSnapshotSortableDataGrid} */ (this.constructorsDataGrid);
    this.dataGrid.addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ResetFilter, this._onResetClassNameFilter, this);
    this.currentView = this.constructorsView;
    this.currentView.show(this.viewsContainer.mainElement());

    this.diffView = new WebInspector.VBox();

    this.diffDataGrid = new WebInspector.HeapSnapshotDiffDataGrid();
    this.diffDataGrid.show(this.diffView.element);
    this.diffDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.dominatorView = new WebInspector.VBox();
    this.dominatorDataGrid = new WebInspector.HeapSnapshotDominatorsDataGrid();
    this.dominatorDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.dominatorDataGrid.show(this.dominatorView.element);
    this.dominatorDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    if (WebInspector.experimentsSettings.allocationProfiler.isEnabled() && profile.profileType() === WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType) {
        this.allocationView = new WebInspector.VBox();
        this.allocationDataGrid = new WebInspector.AllocationDataGrid();
        this.allocationDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
        this.allocationDataGrid.show(this.allocationView.element);
        this.allocationDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);
    }

    this.retainmentViewHeader = document.createElementWithClass("div", "retainers-view-header");
    var retainingPathsTitleDiv = this.retainmentViewHeader.createChild("div", "title");
    var retainingPathsTitle = retainingPathsTitleDiv.createChild("span");
    retainingPathsTitle.textContent = WebInspector.UIString("Object's retaining tree");
    this.viewsContainer.hideDefaultResizer();
    this.viewsContainer.installResizer(this.retainmentViewHeader);

    this.retainmentView = new WebInspector.VBox();
    this.retainmentView.element.classList.add("retaining-paths-view");
    this.retainmentView.element.appendChild(this.retainmentViewHeader);
    this.retainmentDataGrid = new WebInspector.HeapSnapshotRetainmentDataGrid();
    this.retainmentDataGrid.show(this.retainmentView.element);
    this.retainmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._inspectedObjectChanged, this);
    this.retainmentView.show(this.viewsContainer.sidebarElement());
    this.retainmentDataGrid.reset();

    this.viewSelect = new WebInspector.StatusBarComboBox(this._onSelectedViewChanged.bind(this));

    this.views = [{title: WebInspector.UIString("Summary"), view: this.constructorsView, grid: this.constructorsDataGrid}];

    if (profile.profileType() !== WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
        this.views.push({title: WebInspector.UIString("Comparison"), view: this.diffView, grid: this.diffDataGrid});
    this.views.push({title: WebInspector.UIString("Containment"), view: this.containmentView, grid: this.containmentDataGrid});
    if (WebInspector.settings.showAdvancedHeapSnapshotProperties.get())
        this.views.push({title: WebInspector.UIString("Dominators"), view: this.dominatorView, grid: this.dominatorDataGrid});
    if (this.allocationView)
        this.views.push({title: WebInspector.UIString("Allocation"), view: this.allocationView, grid: this.allocationDataGrid});
    if (WebInspector.experimentsSettings.heapSnapshotStatistics.isEnabled())
        this.views.push({title: WebInspector.UIString("Statistics"), view: this.statisticsView});
    this.views.current = 0;
    for (var i = 0; i < this.views.length; ++i)
        this.viewSelect.createOption(WebInspector.UIString(this.views[i].title));

    this._profile = profile;

    this.baseSelect = new WebInspector.StatusBarComboBox(this._changeBase.bind(this));
    this._updateBaseOptions();

    this._filterSelect = new WebInspector.StatusBarComboBox(this._changeFilter.bind(this));
    this._updateFilterOptions();

    this._classNameFilter = new WebInspector.StatusBarInput("Class filter");
    this._classNameFilter.setOnChangeHandler(this._onClassFilterChanged.bind(this));

    this.selectedSizeText = new WebInspector.StatusBarText("");

    this._popoverHelper = new WebInspector.ObjectPopoverHelper(this.element, this._getHoverAnchor.bind(this), this._resolveObjectForPopover.bind(this), undefined, true);

    this._updateSelectorsVisibility();
    this._refreshView();
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
            this.baseSelect.setSelectedIndex(Math.max(0, profileIndex - 1));
            this.dataGrid.setDataSource(heapSnapshotProxy);
            if (this._trackingOverviewGrid)
                this._trackingOverviewGrid._updateGrid();
        }
    },

    /**
     * @param {!WebInspector.HeapSnapshotCommon.Statistics} statistics
     */
    _gotStatistics: function(statistics) {
        this.statisticsView.setTotal(statistics.total);
        this.statisticsView.addRecord(statistics.code, WebInspector.UIString("Code"), "#f77");
        this.statisticsView.addRecord(statistics.strings, WebInspector.UIString("Strings"), "#5e5");
        this.statisticsView.addRecord(statistics.jsArrays, WebInspector.UIString("JS Arrays"), "#7af");
        this.statisticsView.addRecord(statistics.native, WebInspector.UIString("Typed Arrays"), "#fc5");
        this.statisticsView.addRecord(statistics.total, WebInspector.UIString("Total"));
    },

    _onIdsRangeChanged: function(event)
    {
        var minId = event.data.minId;
        var maxId = event.data.maxId;
        this.selectedSizeText.setText(WebInspector.UIString("Selected size: %s", Number.bytesToString(event.data.size)));
        if (this.constructorsDataGrid.snapshot)
            this.constructorsDataGrid.setSelectionRange(minId, maxId);
    },

    get statusBarItems()
    {
        var result = [this.viewSelect.element, this._classNameFilter.element];
        if (this._profile.profileType() !== WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType)
            result.push(this.baseSelect.element, this._filterSelect.element);
        result.push(this.selectedSizeText.element);
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
        if (this.currentView !== this.constructorsView && this.currentView !== this.diffView)
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
                this.dataGrid.highlightObjectByHeapSnapshotId(String(snapshotNodeId), didHighlight.bind(this));
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

        var current = this.dataGrid.rootNode().children[0];
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
        if (!this.dataGrid)
            return;
        var child = this.dataGrid.rootNode().children[0];
        while (child) {
            child.refresh();
            child = child.traverseNextNode(false, null, true);
        }
    },

    _changeBase: function()
    {
        if (this._baseProfile === this._profiles()[this.baseSelect.selectedIndex()])
            return;

        this._baseProfile = this._profiles()[this.baseSelect.selectedIndex()];
        var dataGrid = /** @type {!WebInspector.HeapSnapshotDiffDataGrid} */ (this.dataGrid);
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
        this.dataGrid.filterSelectIndexChanged(this._profiles(), profileIndex);

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
     * @param {string} value
     */
    _onClassFilterChanged: function(value)
    {
        this.dataGrid.changeNameFilter(value);
    },

    _onResetClassNameFilter: function()
    {
        this._classNameFilter.setValue("");
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
        if (this.dataGrid)
            this.dataGrid.populateContextMenu(contextMenu, event);
    },

    _selectionChanged: function(event)
    {
        var selectedNode = event.target.selectedNode;
        this._setRetainmentDataGridSource(selectedNode);
        this._inspectedObjectChanged(event);
    },

    _inspectedObjectChanged: function(event)
    {
        var selectedNode = event.target.selectedNode;
        if (!this._profile.fromFile() && selectedNode instanceof WebInspector.HeapSnapshotGenericObjectNode)
            ConsoleAgent.addInspectedHeapObject(selectedNode.snapshotNodeId);
    },

    _setRetainmentDataGridSource: function(nodeItem)
    {
        if (nodeItem && nodeItem.snapshotNodeIndex)
            this.retainmentDataGrid.setDataSource(nodeItem.isDeletedNode ? nodeItem.dataGrid.baseSnapshot : nodeItem.dataGrid.snapshot, nodeItem.snapshotNodeIndex);
        else
            this.retainmentDataGrid.reset();
    },

    _mouseDownInContentsGrid: function(event)
    {
        if (event.detail < 2)
            return;

        var cell = event.target.enclosingNodeOrSelfWithNodeName("td");
        if (!cell || (!cell.classList.contains("count-column") && !cell.classList.contains("shallowSize-column") && !cell.classList.contains("retainedSize-column")))
            return;

        event.consume(true);
    },

    changeView: function(viewTitle, callback)
    {
        var viewIndex = null;
        for (var i = 0; i < this.views.length; ++i) {
            if (this.views[i].title === viewTitle) {
                viewIndex = i;
                break;
            }
        }
        if (this.views.current === viewIndex || viewIndex == null) {
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
            if (dataGrid === this.dataGrid)
                callback();
        }
        this.views[viewIndex].grid.addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ContentShown, dataGridContentShown, this);

        this.viewSelect.setSelectedIndex(viewIndex);
        this._changeView(viewIndex);
    },

    _updateDataSourceAndView: function()
    {
        var dataGrid = this.dataGrid;
        if (!dataGrid || dataGrid.snapshot)
            return;

        this._profile.load(didLoadSnapshot.bind(this));

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function didLoadSnapshot(snapshotProxy)
        {
            if (this.dataGrid !== dataGrid)
                return;
            if (dataGrid.snapshot !== snapshotProxy)
                dataGrid.setDataSource(snapshotProxy);
            if (dataGrid === this.diffDataGrid) {
                if (!this._baseProfile)
                    this._baseProfile = this._profiles()[this.baseSelect.selectedIndex()];
                this._baseProfile.load(didLoadBaseSnaphot.bind(this));
            }
        }

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function didLoadBaseSnaphot(baseSnapshotProxy)
        {
            if (this.diffDataGrid.baseSnapshot !== baseSnapshotProxy)
                this.diffDataGrid.setBaseDataSource(baseSnapshotProxy);
        }
    },

    _onSelectedViewChanged: function(event)
    {
        this._changeView(event.target.selectedIndex);
    },

    _updateSelectorsVisibility: function()
    {
        this.baseSelect.visible = (this.currentView === this.diffView);
        this._filterSelect.visible = (this.currentView === this.constructorsView);
        this._classNameFilter.visible = (this.currentView === this.constructorsView || this.currentView === this.diffView);

        if (this._trackingOverviewGrid) {
            this._trackingOverviewGrid.element.classList.toggle("hidden", this.currentView !== this.constructorsView);
            if (this.currentView === this.constructorsView)
                this._trackingOverviewGrid.update();
        }
    },

    _changeView: function(selectedIndex)
    {
        if (selectedIndex === this.views.current)
            return;

        if (this.dataGrid)
            this.dataGrid.removeEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ResetFilter, this._onResetClassNameFilter, this);

        this.views.current = selectedIndex;
        this.currentView.detach();
        var view = this.views[this.views.current];
        this.currentView = view.view;
        this.dataGrid = view.grid;
        this.currentView.show(this.viewsContainer.mainElement());
        this.refreshVisibleData();
        if (this.dataGrid) {
            this.dataGrid.addEventListener(WebInspector.HeapSnapshotSortableDataGrid.Events.ResetFilter, this._onResetClassNameFilter, this);
            this.dataGrid.updateWidths();
        }

        this._updateSelectorsVisibility();

        this._updateDataSourceAndView();

        if (!this.currentQuery || !this._searchFinishedCallback || !this._searchResults)
            return;

        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again the with same query and callback.
        this._searchFinishedCallback(this, -this._searchResults.length);
        this.performSearch(this.currentQuery, this._searchFinishedCallback);
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
        if (this._profile.fromFile())
            return;
        element.node.queryObjectContent(showCallback, objectGroupName);
    },

    _updateBaseOptions: function()
    {
        var list = this._profiles();
        // We're assuming that snapshots can only be added.
        if (this.baseSelect.size() === list.length)
            return;

        for (var i = this.baseSelect.size(), n = list.length; i < n; ++i) {
            var title = list[i].title;
            this.baseSelect.createOption(title);
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
    _onReceivSnapshot: function(event)
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
            this._profile.profileType().removeEventListener(WebInspector.ProfileType.Events.AddProfileHeader, this._onReceivSnapshot, this);
            this._profile.profileType().removeEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, this._onProfileHeaderRemoved, this);
        } else {
            this._updateControls();
        }
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {HeapProfilerAgent.Dispatcher}
 */
WebInspector.HeapProfilerDispatcher = function()
{
    this._dispatchers = [];
    InspectorBackend.registerHeapProfilerDispatcher(this);
}

WebInspector.HeapProfilerDispatcher.prototype = {
    /**
     * @param {!HeapProfilerAgent.Dispatcher} dispatcher
     */
    register: function(dispatcher)
    {
        this._dispatchers.push(dispatcher);
    },

    _genericCaller: function(eventName)
    {
        var args = Array.prototype.slice.call(arguments.callee.caller.arguments);
        for (var i = 0; i < this._dispatchers.length; ++i)
            this._dispatchers[i][eventName].apply(this._dispatchers[i], args);
    },

    /**
     * @override
     * @param {!Array.<number>} samples
     */
    heapStatsUpdate: function(samples)
    {
        this._genericCaller("heapStatsUpdate");
    },

    /**
     * @override
     * @param {number} lastSeenObjectId
     * @param {number} timestamp
     */
    lastSeenObjectId: function(lastSeenObjectId, timestamp)
    {
        this._genericCaller("lastSeenObjectId");
    },

    /**
     * @override
     * @param {string} chunk
     */
    addHeapSnapshotChunk: function(chunk)
    {
        this._genericCaller("addHeapSnapshotChunk");
    },

    /**
     * @override
     * @param {number} done
     * @param {number} total
     * @param {boolean=} finished
     */
    reportHeapSnapshotProgress: function(done, total, finished)
    {
        this._genericCaller("reportHeapSnapshotProgress");
    },

    /**
     * @override
     */
    resetProfiles: function()
    {
        this._genericCaller("resetProfiles");
    }
}

WebInspector.HeapProfilerDispatcher._dispatcher = new WebInspector.HeapProfilerDispatcher();

/**
 * @constructor
 * @extends {WebInspector.ProfileType}
 * @implements {HeapProfilerAgent.Dispatcher}
 * @param {string=} id
 * @param {string=} title
 */
WebInspector.HeapSnapshotProfileType = function(id, title)
{
    WebInspector.ProfileType.call(this, id || WebInspector.HeapSnapshotProfileType.TypeId, title || WebInspector.UIString("Take Heap Snapshot"));
    WebInspector.HeapProfilerDispatcher._dispatcher.register(this);
}

WebInspector.HeapSnapshotProfileType.TypeId = "HEAP";
WebInspector.HeapSnapshotProfileType.SnapshotReceived = "SnapshotReceived";

WebInspector.HeapSnapshotProfileType.prototype = {
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

    /**
     * @override
     * @param {!Array.<number>} samples
     */
    heapStatsUpdate: function(samples)
    {
    },

    /**
     * @override
     * @param {number} lastSeenObjectId
     * @param {number} timestamp
     */
    lastSeenObjectId: function(lastSeenObjectId, timestamp)
    {
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
     * @param {!string} title
     * @return {!WebInspector.ProfileHeader}
     */
    createProfileLoadedFromFile: function(title)
    {
        return new WebInspector.HeapProfileHeader(this, title);
    },

    _takeHeapSnapshot: function(callback)
    {
        if (this.profileBeingRecorded())
            return;
        this._profileBeingRecorded = new WebInspector.HeapProfileHeader(this);
        this.addProfile(this._profileBeingRecorded);
        this._profileBeingRecorded.updateStatus(WebInspector.UIString("Snapshotting\u2026"));

        /**
         * @param {?string} error
         * @this {WebInspector.HeapSnapshotProfileType}
         */
        function didTakeHeapSnapshot(error)
        {
            var profile = this._profileBeingRecorded;
            profile.title = WebInspector.UIString("Snapshot %d", profile.uid);
            profile._finishLoad();
            this._profileBeingRecorded = null;
            WebInspector.panels.profiles.showProfile(profile);
            callback();
        }
        HeapProfilerAgent.takeHeapSnapshot(true, didTakeHeapSnapshot.bind(this));
    },

    /**
     * @override
     * @param {string} chunk
     */
    addHeapSnapshotChunk: function(chunk)
    {
        if (!this.profileBeingRecorded())
            return;
        this.profileBeingRecorded().transferChunk(chunk);
    },

    /**
     * @override
     * @param {number} done
     * @param {number} total
     * @param {boolean=} finished
     */
    reportHeapSnapshotProgress: function(done, total, finished)
    {
        var profile = this.profileBeingRecorded();
        if (!profile)
            return;
        profile.updateStatus(WebInspector.UIString("%.0f%", (done / total) * 100), true);
        if (finished)
            profile._prepareToLoad();
    },

    /**
     * @override
     */
    resetProfiles: function()
    {
        this._reset();
    },

    _snapshotReceived: function(profile)
    {
        if (this._profileBeingRecorded === profile)
            this._profileBeingRecorded = null;
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
     * @override
     * @param {!Array.<number>} samples
     */
    heapStatsUpdate: function(samples)
    {
        if (!this._profileSamples)
            return;
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
     * @override
     * @param {number} lastSeenObjectId
     * @param {number} timestamp
     */
    lastSeenObjectId: function(lastSeenObjectId, timestamp)
    {
        var profileSamples = this._profileSamples;
        if (!profileSamples)
            return;
        var currentIndex = Math.max(profileSamples.ids.length, profileSamples.max.length - 1);
        profileSamples.ids[currentIndex] = lastSeenObjectId;
        if (!profileSamples.max[currentIndex]) {
            profileSamples.max[currentIndex] = 0;
            profileSamples.sizes[currentIndex] = 0;
        }
        profileSamples.timestamps[currentIndex] = timestamp;
        if (profileSamples.totalTime < timestamp - profileSamples.timestamps[0])
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
        this._addNewProfile();
        HeapProfilerAgent.startTrackingHeapObjects(WebInspector.experimentsSettings.allocationProfiler.isEnabled());
    },

    _addNewProfile: function()
    {
        this._profileBeingRecorded = new WebInspector.HeapProfileHeader(this);
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
            var profile = this._profileBeingRecorded;
            if (!profile)
                return;
            profile._finishLoad();
            this._profileSamples = null;
            this._profileBeingRecorded = null;
            WebInspector.panels.profiles.showProfile(profile);
        }

        HeapProfilerAgent.stopTrackingHeapObjects(true, didTakeHeapSnapshot.bind(this));
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
        // Clear current profile to avoid stopping backend.
        this._profileBeingRecorded = null;
        WebInspector.HeapSnapshotProfileType.prototype.resetProfiles.call(this);
        this._profileSamples = null;
        this._lastSeenIndex = -1;
        if (wasRecording)
            this._addNewProfile();
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
 * @param {!WebInspector.HeapSnapshotProfileType} type
 * @param {string=} title
 */
WebInspector.HeapProfileHeader = function(type, title)
{
    WebInspector.ProfileHeader.call(this, type, title || WebInspector.UIString("Snapshot %d", type._nextProfileUid));
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
     * @return {!WebInspector.ProfileSidebarTreeElement}
     */
    createSidebarTreeElement: function()
    {
        return new WebInspector.ProfileSidebarTreeElement(this, "heap-snapshot-sidebar-tree-item");
    },

    /**
     * @override
     * @return {!WebInspector.HeapSnapshotView}
     */
    createView: function()
    {
        return new WebInspector.HeapSnapshotView(this);
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
                WebInspector.console.log("Failed to open temp file with heap snapshot",
                                 WebInspector.ConsoleMessage.MessageLevel.Error);
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
     */
    onError: function(reader, event)
    {
        WebInspector.console.log("Failed to read heap snapshot from temp file: " + event.message,
                         WebInspector.ConsoleMessage.MessageLevel.Error);
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
        this._profileType = heapProfileHeader._profileType;
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
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        return Number.secondsToString(value / 1000, hires);
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
