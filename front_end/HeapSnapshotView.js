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
 * @extends {WebInspector.View}
 * @param {!WebInspector.ProfilesPanel} parent
 * @param {!WebInspector.HeapProfileHeader} profile
 */
WebInspector.HeapSnapshotView = function(parent, profile)
{
    WebInspector.View.call(this);

    this.element.classList.add("heap-snapshot-view");

    this.parent = parent;
    profile.profileType().addEventListener(WebInspector.HeapSnapshotProfileType.SnapshotReceived, this._onReceivSnapshot, this);
    profile.profileType().addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, this._onProfileHeaderRemoved, this);

    if (profile._profileType.id === WebInspector.TrackingHeapSnapshotProfileType.TypeId) {
        this._trackingOverviewGrid = new WebInspector.HeapTrackingOverviewGrid(profile);
        this._trackingOverviewGrid.addEventListener(WebInspector.HeapTrackingOverviewGrid.IdsRangeChanged, this._onIdsRangeChanged.bind(this));
        this._trackingOverviewGrid.show(this.element);
    }

    this.viewsContainer = document.createElement("div");
    this.viewsContainer.classList.add("views-container");
    this.element.appendChild(this.viewsContainer);

    this.containmentView = new WebInspector.View();
    this.containmentView.element.classList.add("view");
    this.containmentDataGrid = new WebInspector.HeapSnapshotContainmentDataGrid();
    this.containmentDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.containmentDataGrid.show(this.containmentView.element);
    this.containmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.constructorsView = new WebInspector.View();
    this.constructorsView.element.classList.add("view");
    this.constructorsView.element.appendChild(this._createToolbarWithClassNameFilter());

    this.constructorsDataGrid = new WebInspector.HeapSnapshotConstructorsDataGrid();
    this.constructorsDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.constructorsDataGrid.show(this.constructorsView.element);
    this.constructorsDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.dataGrid = /** @type {!WebInspector.HeapSnapshotSortableDataGrid} */ (this.constructorsDataGrid);
    this.currentView = this.constructorsView;
    this.currentView.show(this.viewsContainer);

    this.diffView = new WebInspector.View();
    this.diffView.element.classList.add("view");
    this.diffView.element.appendChild(this._createToolbarWithClassNameFilter());

    this.diffDataGrid = new WebInspector.HeapSnapshotDiffDataGrid();
    this.diffDataGrid.show(this.diffView.element);
    this.diffDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    this.dominatorView = new WebInspector.View();
    this.dominatorView.element.classList.add("view");
    this.dominatorDataGrid = new WebInspector.HeapSnapshotDominatorsDataGrid();
    this.dominatorDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
    this.dominatorDataGrid.show(this.dominatorView.element);
    this.dominatorDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);

    if (WebInspector.experimentsSettings.allocationProfiler.isEnabled() && profile.profileType() === WebInspector.ProfileTypeRegistry.instance.trackingHeapSnapshotProfileType) {
        this.allocationView = new WebInspector.View();
        this.allocationView.element.classList.add("view");
        this.allocationDataGrid = new WebInspector.AllocationDataGrid();
        this.allocationDataGrid.element.addEventListener("mousedown", this._mouseDownInContentsGrid.bind(this), true);
        this.allocationDataGrid.show(this.allocationView.element);
        this.allocationDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._selectionChanged, this);
    }

    this.retainmentViewHeader = document.createElement("div");
    this.retainmentViewHeader.classList.add("retainers-view-header");
    WebInspector.installDragHandle(this.retainmentViewHeader, this._startRetainersHeaderDragging.bind(this), this._retainersHeaderDragging.bind(this), this._endRetainersHeaderDragging.bind(this), "ns-resize");
    var retainingPathsTitleDiv = document.createElement("div");
    retainingPathsTitleDiv.className = "title";
    var retainingPathsTitle = document.createElement("span");
    retainingPathsTitle.textContent = WebInspector.UIString("Object's retaining tree");
    retainingPathsTitleDiv.appendChild(retainingPathsTitle);
    this.retainmentViewHeader.appendChild(retainingPathsTitleDiv);
    this.element.appendChild(this.retainmentViewHeader);

    this.retainmentView = new WebInspector.View();
    this.retainmentView.element.classList.add("view");
    this.retainmentView.element.classList.add("retaining-paths-view");
    this.retainmentDataGrid = new WebInspector.HeapSnapshotRetainmentDataGrid();
    this.retainmentDataGrid.show(this.retainmentView.element);
    this.retainmentDataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._inspectedObjectChanged, this);
    this.retainmentView.show(this.element);
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
    this.views.current = 0;
    for (var i = 0; i < this.views.length; ++i)
        this.viewSelect.createOption(WebInspector.UIString(this.views[i].title));

    this._profile = profile;

    this.baseSelect = new WebInspector.StatusBarComboBox(this._changeBase.bind(this));
    this.baseSelect.element.classList.add("hidden");
    this._updateBaseOptions();

    this._filterSelect = new WebInspector.StatusBarComboBox(this._changeFilter.bind(this));
    this._updateFilterOptions();

    this.selectedSizeText = new WebInspector.StatusBarText("");

    this._popoverHelper = new WebInspector.ObjectPopoverHelper(this.element, this._getHoverAnchor.bind(this), this._resolveObjectForPopover.bind(this), undefined, true);

    this._refreshView();
}

WebInspector.HeapSnapshotView.prototype = {
    _refreshView: function()
    {
        this._profile.load(profileCallback.bind(this));

        /**
         * @this {WebInspector.HeapSnapshotView}
         */
        function profileCallback(heapSnapshotProxy)
        {
            var list = this._profiles();
            var profileIndex = list.indexOf(this._profile);
            this.baseSelect.setSelectedIndex(Math.max(0, profileIndex - 1));
            this.dataGrid.setDataSource(heapSnapshotProxy);
        }
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
        var result = [this.viewSelect.element];
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

    onResize: function()
    {
        var height = this.retainmentView.element.clientHeight;
        this._updateRetainmentViewHeight(height);
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
        var child = this.dataGrid.rootNode().children[0];
        while (child) {
            child.refresh();
            child = child.traverseNextNode(false, null, true);
        }
    },

    _changeBase: function()
    {
        if (this._baseProfile=== this._profiles()[this.baseSelect.selectedIndex()])
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

    _createToolbarWithClassNameFilter: function()
    {
        var toolbar = document.createElement("div");
        toolbar.classList.add("class-view-toolbar");
        var classNameFilter = document.createElement("input");
        classNameFilter.classList.add("class-name-filter");
        classNameFilter.setAttribute("placeholder", WebInspector.UIString("Class filter"));
        classNameFilter.addEventListener("keyup", this._changeNameFilter.bind(this, classNameFilter), false);
        toolbar.appendChild(classNameFilter);
        return toolbar;
    },

    _changeNameFilter: function(classNameInputElement)
    {
        var filter = classNameInputElement.value;
        this.dataGrid.changeNameFilter(filter);
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
        this.dataGrid.populateContextMenu(this.parent, contextMenu, event);
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
        if (dataGrid.snapshot)
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
        if (this.currentView === this.diffView)
            this.baseSelect.element.classList.remove("hidden");
        else
            this.baseSelect.element.classList.add("hidden");

        if (this.currentView === this.constructorsView) {
            if (this._trackingOverviewGrid) {
                this._trackingOverviewGrid.element.classList.remove("hidden");
                this._trackingOverviewGrid.update();
                this.viewsContainer.classList.add("reserve-80px-at-top");
            }
            this._filterSelect.element.classList.remove("hidden");
        } else {
            this._filterSelect.element.classList.add("hidden");
            if (this._trackingOverviewGrid) {
                this._trackingOverviewGrid.element.classList.add("hidden");
                this.viewsContainer.classList.remove("reserve-80px-at-top");
            }
        }
    },

    _changeView: function(selectedIndex)
    {
        if (selectedIndex === this.views.current)
            return;

        this.views.current = selectedIndex;
        this.currentView.detach();
        var view = this.views[this.views.current];
        this.currentView = view.view;
        this.dataGrid = view.grid;
        this.currentView.show(this.viewsContainer);
        this.refreshVisibleData();
        this.dataGrid.updateWidths();

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

    /**
     * @return {boolean}
     */
    _startRetainersHeaderDragging: function(event)
    {
        if (!this.isShowing())
            return false;

        this._previousDragPosition = event.pageY;
        return true;
    },

    _retainersHeaderDragging: function(event)
    {
        var height = this.retainmentView.element.clientHeight;
        height += this._previousDragPosition - event.pageY;
        this._previousDragPosition = event.pageY;
        this._updateRetainmentViewHeight(height);
        event.consume(true);
    },

    _endRetainersHeaderDragging: function(event)
    {
        delete this._previousDragPosition;
        event.consume();
    },

    _updateRetainmentViewHeight: function(height)
    {
        height = Number.constrain(height, Preferences.minDrawerHeight, this.element.clientHeight - Preferences.minDrawerHeight);
        this.viewsContainer.style.bottom = (height + this.retainmentViewHeader.clientHeight) + "px";
        if (this._trackingOverviewGrid && this.currentView === this.constructorsView)
            this.viewsContainer.classList.add("reserve-80px-at-top");
        this.retainmentView.element.style.height = height + "px";
        this.retainmentViewHeader.style.bottom = height + "px";
        this.currentView.doResize();
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

    __proto__: WebInspector.View.prototype
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

    this._nextSnapshotId = 1;
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
        var id = this._nextSnapshotId++;
        this._profileBeingRecorded = new WebInspector.HeapProfileHeader(this, WebInspector.UIString("Snapshotting\u2026"), id);
        this.addProfile(this._profileBeingRecorded);
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
            profile.existingView()._refreshView();
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
        profile.sidebarElement.subtitle = WebInspector.UIString("%.0f%", (done / total) * 100);
        profile.sidebarElement.wait = true;
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
            if (!this._profileSamples.max[index] || size > this._profileSamples.max[index])
                this._profileSamples.max[index] = size;
        }
        this._lastUpdatedIndex = index;
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
        var profile = this._profileBeingRecorded;
        profile.sidebarElement.wait = true;
        if (profile.sidebarElement && !profile.sidebarElement.wait)
            profile.sidebarElement.wait = true;
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
        this._profileBeingRecorded = new WebInspector.HeapProfileHeader(this, WebInspector.UIString("Recording\u2026"));
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
        HeapProfilerAgent.startTrackingHeapObjects(WebInspector.experimentsSettings.allocationProfiler.isEnabled());
        this.dispatchEventToListeners(WebInspector.TrackingHeapSnapshotProfileType.TrackingStarted);
    },

    _stopRecordingProfile: function()
    {

        var profile = this._profileBeingRecorded;
        var title = WebInspector.UIString("Snapshotting\u2026");
        profile.title = title;
        profile.sidebarElement.mainTitle = title;
        /**
         * @param {?string} error
         * @this {WebInspector.HeapSnapshotProfileType}
         */
        function didTakeHeapSnapshot(error)
        {
            profile.uid = this._nextSnapshotId++;
            var title = WebInspector.UIString("Snapshot %d", profile.uid);
            profile.title = title;
            profile.sidebarElement.mainTitle = title;
            profile._finishLoad();
            this._profileSamples = null;
            this._profileBeingRecorded = null;
            WebInspector.panels.profiles.showProfile(profile);
            profile.existingView()._refreshView();
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

    _reset: function()
    {
        WebInspector.HeapSnapshotProfileType.prototype._reset.call(this);
        if (this._recording)
            this._stopRecordingProfile();
        this._profileSamples = null;
        this._lastSeenIndex = -1;
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
 * @param {!WebInspector.ProfileType} type
 * @param {string} title
 * @param {number=} uid
 */
WebInspector.HeapProfileHeader = function(type, title, uid)
{
    WebInspector.ProfileHeader.call(this, type, title, uid);
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
    this._transferHandler = null;
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
     * @param {!WebInspector.ProfilesPanel} profilesPanel
     * @return {!WebInspector.HeapSnapshotView}
     */
    createView: function(profilesPanel)
    {
        return new WebInspector.HeapSnapshotView(profilesPanel, this);
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
        this._numberOfChunks = 0;
        this._setupWorker();
        this._transferHandler = new WebInspector.BackendSnapshotLoader(this);
        this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026");
        this.sidebarElement.wait = true;
    },

    _finishLoad: function()
    {
        if (this._transferHandler) {
            this._transferHandler.finishTransfer();
            this._totalNumberOfChunks = this._transferHandler._totalNumberOfChunks;
        }
        if (this._bufferedWriter) {
            this._bufferedWriter.close(this._didWriteToTempFile.bind(this));
            this._bufferedWriter = null;
        }
    },

    _didWriteToTempFile: function(tempFile)
    {
        this._tempFile = tempFile;
        if (!tempFile)
            this._failedToCreateTempFile = true;
        if (this._onTempFileReady) {
            this._onTempFileReady();
            this._onTempFileReady = null;
        }
    },

    /**
     * @return {string}
     */
    snapshotConstructorName: function()
    {
        return "JSHeapSnapshot";
    },

    /**
     * @return {function (new:WebInspector.HeapSnapshotProxy, !WebInspector.HeapSnapshotWorkerProxy, string)}
     */
    snapshotProxyConstructor: function()
    {
        return WebInspector.HeapSnapshotProxy;
    },

    _setupWorker: function()
    {
        /**
         * @this {WebInspector.HeapProfileHeader}
         */
        function setProfileWait(event)
        {
            this.sidebarElement.wait = event.data;
        }
        console.assert(!this._workerProxy, "HeapSnapshotWorkerProxy already exists");
        this._workerProxy = new WebInspector.HeapSnapshotWorkerProxy(this._handleWorkerEvent.bind(this));
        this._workerProxy.addEventListener("wait", setProfileWait, this);
        this._receiver = this._workerProxy.createLoader(this.snapshotConstructorName(), this.snapshotProxyConstructor(), this._snapshotReceived.bind(this));
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    _handleWorkerEvent: function(eventName, data)
    {
        if (WebInspector.HeapSnapshotProgressEvent.Update !== eventName)
            return;
        this._updateSubtitle(data);
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

    _updateSubtitle: function(value)
    {
        this.sidebarElement.subtitle = value;
    },

    _didCompleteSnapshotTransfer: function()
    {
        if (!this._snapshotProxy)
            return;
        this.sidebarElement.subtitle = Number.bytesToString(this._snapshotProxy.totalSize);
        this.sidebarElement.wait = false;
    },

    /**
     * @param {string} chunk
     */
    transferChunk: function(chunk)
    {
        if (!this._bufferedWriter)
            this._bufferedWriter = new WebInspector.BufferedTempFileWriter("heap-profiler", this.uid);
        this._bufferedWriter.write(chunk);
        this._transferHandler.transferChunk(chunk);
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
        return !this.fromFile() && !this._bufferedWriter && !this._failedToCreateTempFile;
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
                WebInspector.log("Failed to open temp file with heap snapshot",
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
        this._updateSubtitle(WebInspector.UIString("Saving\u2026 %d\%", percentValue));
    },

    /**
     * @override
     * @param {!File} file
     */
    loadFromFile: function(file)
    {
        this.sidebarElement.subtitle = WebInspector.UIString("Loading\u2026");
        this.sidebarElement.wait = true;
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
 * @param {!WebInspector.HeapProfileHeader} header
 * @param {string} title
 */
WebInspector.SnapshotTransferHandler = function(header, title)
{
    this._numberOfChunks = 0;
    this._savedChunks = 0;
    this._header = header;
    this._totalNumberOfChunks = 0;
    this._title = title;
}


WebInspector.SnapshotTransferHandler.prototype = {
    /**
     * @param {string} chunk
     */
    transferChunk: function(chunk)
    {
        ++this._numberOfChunks;
        this._header._receiver.write(chunk, this._didTransferChunk.bind(this));
    },

    finishTransfer: function()
    {
    },

    _didTransferChunk: function()
    {
        this._updateProgress(++this._savedChunks, this._totalNumberOfChunks);
    },

    _updateProgress: function(value, total)
    {
    }
}


/**
 * @constructor
 * @param {!WebInspector.HeapProfileHeader} header
 * @extends {WebInspector.SnapshotTransferHandler}
 */
WebInspector.BackendSnapshotLoader = function(header)
{
    WebInspector.SnapshotTransferHandler.call(this, header, "Loading\u2026 %d\%");
}


WebInspector.BackendSnapshotLoader.prototype = {
    finishTransfer: function()
    {
        this._header._receiver.close(this._didFinishTransfer.bind(this));
        this._totalNumberOfChunks = this._numberOfChunks;
    },

    _didFinishTransfer: function()
    {
        console.assert(this._totalNumberOfChunks === this._savedChunks, "Not all chunks were transfered.");
    },

    __proto__: WebInspector.SnapshotTransferHandler.prototype
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
        switch(e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
            this._snapshotHeader._updateSubtitle(WebInspector.UIString("'%s' not found.", reader.fileName()));
        break;
        case e.target.error.NOT_READABLE_ERR:
            this._snapshotHeader._updateSubtitle(WebInspector.UIString("'%s' is not readable", reader.fileName()));
        break;
        case e.target.error.ABORT_ERR:
            break;
        default:
            this._snapshotHeader._updateSubtitle(WebInspector.UIString("'%s' error %d", reader.fileName(), e.target.error.code));
        }
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
        WebInspector.log("Failed to read heap snapshot from temp file: " + event.message,
                         WebInspector.ConsoleMessage.MessageLevel.Error);
        this.onTransferFinished();
    }
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.HeapProfileHeader} heapProfileHeader
 */
WebInspector.HeapTrackingOverviewGrid = function(heapProfileHeader)
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.id = "heap-recording-view";

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

    __proto__: WebInspector.View.prototype
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
        return Number.secondsToString((value + this._minimumBoundaries) / 1000, hires);
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
