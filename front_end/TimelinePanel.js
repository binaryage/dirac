/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
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

importScript("MemoryStatistics.js");
importScript("CountersGraph.js");
importScript("PieChart.js");
importScript("TimelineModel.js");
importScript("TimelineOverviewPane.js");
importScript("TimelinePresentationModel.js");
importScript("TimelineFrameModel.js");
importScript("TimelineEventOverview.js");
importScript("TimelineFrameOverview.js");
importScript("TimelineMemoryOverview.js");
importScript("TimelineFlameChart.js");
importScript("TimelineUIUtils.js");
importScript("TimelineView.js");

/**
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.TimelineModeViewDelegate}
 * @implements {WebInspector.Searchable}
 */
WebInspector.TimelinePanel = function()
{
    WebInspector.Panel.call(this, "timeline");
    this.registerRequiredCSS("timelinePanel.css");
    this.registerRequiredCSS("filter.css");
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);

    this._detailsLinkifier = new WebInspector.Linkifier();
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;

    // Create model.
    this._model = new WebInspector.TimelineModel();
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped, this._onRecordingStopped, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordFilterChanged, this._refreshViews, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);

    this._categoryFilter = new WebInspector.TimelineCategoryFilter();
    this._durationFilter = new WebInspector.TimelineIsLongFilter();
    this._textFilter = new WebInspector.TimelineTextFilter();

    this._model.addFilter(new WebInspector.TimelineHiddenFilter());
    this._model.addFilter(this._categoryFilter);
    this._model.addFilter(this._durationFilter);
    this._model.addFilter(this._textFilter);

    this._presentationModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelinePanel.Mode.Events);

    this._createStatusBarItems();

    this._topPane = new WebInspector.SplitView(true, false);
    this._topPane.element.id = "timeline-overview-panel";
    this._topPane.show(this.element);
    this._topPane.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
    this._topPane.setResizable(false);
    this._createPresentationSelector();

    // Create top overview component.
    this._overviewPane = new WebInspector.TimelineOverviewPane(this._model);
    this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.show(this._topPane.mainElement());

    this._createFileSelector();
    this._registerShortcuts();

    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.WillReloadPage, this._willReloadPage, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load, this._loadEventFired, this);

    // Create top level properties splitter.
    this._detailsSplitView = new WebInspector.SplitView(false, true, "timelinePanelDetailsSplitViewState");
    this._detailsSplitView.element.classList.add("timeline-details-split");
    this._detailsSplitView.sidebarElement().classList.add("timeline-details");
    this._detailsSplitView.setMainElementConstraints(undefined, 40);
    this._detailsView = new WebInspector.TimelineDetailsView();
    this._detailsSplitView.installResizer(this._detailsView.titleElement());
    this._detailsView.show(this._detailsSplitView.sidebarElement());

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.element.classList.add("searchable-view");
    this._searchableView.show(this._detailsSplitView.mainElement());

    this._stackView = new WebInspector.StackView(false);
    this._stackView.show(this._searchableView.element);
    this._stackView.element.classList.add("timeline-view-stack");

    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
    WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
    this._dockSideChanged();

    this._selectPresentationMode(this._presentationModeSetting.get());
    this._detailsSplitView.show(this.element);
}

WebInspector.TimelinePanel.Mode = {
    Events: "Events",
    Frames: "Frames",
    Memory: "Memory",
    FlameChart: "FlameChart"
};

// Define row and header height, should be in sync with styles for timeline graphs.
WebInspector.TimelinePanel.rowHeight = 18;
WebInspector.TimelinePanel.headerHeight = 20;

WebInspector.TimelinePanel.durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelinePanel.prototype = {
    wasShown: function()
    {
        if (!WebInspector.TimelinePanel._categoryStylesInitialized) {
            WebInspector.TimelinePanel._categoryStylesInitialized = true;
            var style = document.createElement("style");
            var categories = WebInspector.TimelineUIUtils.categories();
            style.textContent = Object.values(categories).map(WebInspector.TimelineUIUtils.createStyleRuleForCategory).join("\n");
            document.head.appendChild(style);
        }
    },

    _dockSideChanged: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        var vertically = false;
        if (dockSide === WebInspector.DockController.State.DockedToBottom)
            vertically = true;
        else
            vertically = !WebInspector.settings.splitVerticallyWhenDockedToRight.get();
        this._detailsSplitView.setVertical(vertically);
        this._detailsView.setVertical(vertically);
    },

    /**
     * @return {number}
     */
    windowStartTime: function()
    {
        if (this._windowStartTime)
            return this._windowStartTime;
        if (this._model.minimumRecordTime() != -1)
            return this._model.minimumRecordTime();
        return 0;
    },

    /**
     * @return {number}
     */
    windowEndTime: function()
    {
        if (this._windowEndTime < Infinity)
            return this._windowEndTime;
        if (this._model.maximumRecordTime() != -1)
            return this._model.maximumRecordTime();
        return Infinity;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sidebarResized: function(event)
    {
        var width = /** @type {number} */ (event.data);
        this._topPane.setSidebarSize(width);
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].setSidebarSize(width);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWindowChanged: function(event)
    {
        this._windowStartTime = event.data.startTime;
        this._windowEndTime = event.data.endTime;

        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].setWindowTimes(this._windowStartTime, this._windowEndTime);
        this._updateSelectionDetails();
    },

    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._overviewPane.requestWindowTimes(windowStartTime, windowEndTime);
    },

    /**
     * @return {!WebInspector.TimelineFrameModel}
     */
    _frameModel: function()
    {
        if (!this._lazyFrameModel)
            this._lazyFrameModel = new WebInspector.TimelineFrameModel(this._model);
        return this._lazyFrameModel;
    },

    /**
     * @return {!WebInspector.TimelineView}
     */
    _timelineView: function()
    {
        if (!this._lazyTimelineView)
            this._lazyTimelineView = new WebInspector.TimelineView(this, this._model);
        return this._lazyTimelineView;
    },

    /**
     * @param {string} mode
     */
    _viewsForMode: function(mode)
    {
        var views = this._viewsMap[mode];
        if (!views) {
            views = {};
            switch (mode) {
            case WebInspector.TimelinePanel.Mode.Events:
                views.overviewView = new WebInspector.TimelineEventOverview(this._model);
                views.mainViews = [this._timelineView()];
                break;
            case WebInspector.TimelinePanel.Mode.Frames:
                views.overviewView = new WebInspector.TimelineFrameOverview(this._model, this._frameModel());
                views.mainViews = [this._timelineView()];
                break;
            case WebInspector.TimelinePanel.Mode.Memory:
                views.overviewView = new WebInspector.TimelineMemoryOverview(this._model);
                views.mainViews = [this._timelineView(), new WebInspector.CountersGraph(this, this._model)];
                break;
            case WebInspector.TimelinePanel.Mode.FlameChart:
                views.overviewView = new WebInspector.TimelineFrameOverview(this._model, this._frameModel());
                views.mainViews = [new WebInspector.TimelineFlameChart(this, this._model, this._frameModel())];
                break;
            default:
                console.assert(false, "Unknown mode: " + mode);
            }
            for (var i = 0; i < views.mainViews.length; ++i)
                views.mainViews[i].addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
            this._viewsMap[mode] = views;
        }

        this._timelineView().setFrameModel(mode === WebInspector.TimelinePanel.Mode.Frames ? this._frameModel() : null);
        return views;
    },

    _createPresentationSelector: function()
    {
        this._viewsMap = {};

        var topPaneSidebarElement = this._topPane.sidebarElement();
        topPaneSidebarElement.id = "timeline-overview-sidebar";

        var overviewTreeElement = topPaneSidebarElement.createChild("ol", "sidebar-tree vbox");
        var topPaneSidebarTree = new TreeOutline(overviewTreeElement);

        this._overviewItems = {};
        for (var mode in WebInspector.TimelinePanel.Mode) {
            if (mode === WebInspector.TimelinePanel.Mode.FlameChart && !WebInspector.experimentsSettings.timelineFlameChart.isEnabled())
                continue;
            this._overviewItems[mode] = new WebInspector.SidebarTreeElement("timeline-overview-sidebar-" + mode.toLowerCase(), WebInspector.UIString(mode));
            var item = this._overviewItems[mode];
            item.onselect = this._onModeChanged.bind(this, mode);
            topPaneSidebarTree.appendChild(item);
        }
    },

    _createStatusBarItems: function()
    {
        var panelStatusBarElement = this.element.createChild("div", "panel-status-bar");
        this._statusBarButtons = /** @type {!Array.<!WebInspector.StatusBarItem>} */ ([]);

        this.toggleTimelineButton = new WebInspector.StatusBarButton(WebInspector.UIString("Record"), "record-profile-status-bar-item");
        this.toggleTimelineButton.addEventListener("click", this._toggleTimelineButtonClicked, this);
        this._statusBarButtons.push(this.toggleTimelineButton);
        panelStatusBarElement.appendChild(this.toggleTimelineButton.element);

        this.clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-status-bar-item");
        this.clearButton.addEventListener("click", this._onClearButtonClick, this);
        this._statusBarButtons.push(this.clearButton);
        panelStatusBarElement.appendChild(this.clearButton.element);

        this._filterBar = this._createFilterBar();
        panelStatusBarElement.appendChild(this._filterBar.filterButton().element);

        this.garbageCollectButton = new WebInspector.StatusBarButton(WebInspector.UIString("Collect Garbage"), "garbage-collect-status-bar-item");
        this.garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
        this._statusBarButtons.push(this.garbageCollectButton);
        panelStatusBarElement.appendChild(this.garbageCollectButton.element);

        panelStatusBarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture stacks"), WebInspector.settings.timelineCaptureStacks, true, undefined,
                                               WebInspector.UIString("Capture JavaScript stack on every timeline event")));

        this._miscStatusBarItems = panelStatusBarElement.createChild("div", "status-bar-item");

        this._filtersContainer = this.element.createChild("div", "timeline-filters-header hidden");
        this._filtersContainer.appendChild(this._filterBar.filtersElement());
        this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
    },

    /**
     * @return {!WebInspector.FilterBar}
     */
    _createFilterBar: function()
    {
        this._filterBar = new WebInspector.FilterBar();
        this._filters = {};
        this._filters._textFilterUI = new WebInspector.TextFilterUI();
        this._filters._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._textFilterChanged, this);
        this._filterBar.addFilter(this._filters._textFilterUI);

        var durationOptions = [];
        for (var presetIndex = 0; presetIndex < WebInspector.TimelinePanel.durationFilterPresetsMs.length; ++presetIndex) {
            var durationMs = WebInspector.TimelinePanel.durationFilterPresetsMs[presetIndex];
            var durationOption = {};
            if (!durationMs) {
                durationOption.label = WebInspector.UIString("All");
                durationOption.title = WebInspector.UIString("Show all records");
            } else {
                durationOption.label = WebInspector.UIString("\u2265 %dms", durationMs);
                durationOption.title = WebInspector.UIString("Hide records shorter than %dms", durationMs);
            }
            durationOption.value = durationMs;
            durationOptions.push(durationOption);
        }
        this._filters._durationFilterUI = new WebInspector.ComboBoxFilterUI(durationOptions);
        this._filters._durationFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._durationFilterChanged, this);
        this._filterBar.addFilter(this._filters._durationFilterUI);

        this._filters._categoryFiltersUI = {};
        var categoryTypes = [];
        var categories = WebInspector.TimelineUIUtils.categories();
        for (var categoryName in categories) {
            var category = categories[categoryName];
            if (category.overviewStripGroupIndex < 0)
                continue;
            var filter = new WebInspector.CheckboxFilterUI(category.name, category.title);
            this._filters._categoryFiltersUI[category.name] = filter;
            filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._categoriesFilterChanged.bind(this, categoryName), this);
            this._filterBar.addFilter(filter);
        }
        return this._filterBar;
    },

    _textFilterChanged: function(event)
    {
        var searchQuery = this._filters._textFilterUI.value();
        this.searchCanceled();
        this._textFilter.setRegex(searchQuery ? createPlainTextSearchRegex(searchQuery, "i") : null);
    },

    _durationFilterChanged: function()
    {
        var duration = this._filters._durationFilterUI.value();
        var minimumRecordDuration = parseInt(duration, 10);
        this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
    },

    _categoriesFilterChanged: function(name, event)
    {
        var categories = WebInspector.TimelineUIUtils.categories();
        categories[name].hidden = !this._filters._categoryFiltersUI[name].checked();
        this._categoryFilter.notifyFilterChanged();
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.element;
    },

    _onFiltersToggled: function(event)
    {
        var toggled = /** @type {boolean} */ (event.data);
        this._filtersContainer.classList.toggle("hidden", !toggled);
        this.doResize();
    },

    /**
     * @return {?WebInspector.ProgressIndicator}
     */
    _prepareToLoadTimeline: function()
    {
        if (this._operationInProgress)
            return null;
        if (this._recordingInProgress()) {
            this.toggleTimelineButton.toggled = false;
            this._stopRecording();
        }
        var progressIndicator = new WebInspector.ProgressIndicator();
        progressIndicator.addEventListener(WebInspector.ProgressIndicator.Events.Done, this._setOperationInProgress.bind(this, null));
        this._setOperationInProgress(progressIndicator);
        return progressIndicator;
    },

    /**
     * @param {?WebInspector.ProgressIndicator} indicator
     */
    _setOperationInProgress: function(indicator)
    {
        this._operationInProgress = !!indicator;
        for (var i = 0; i < this._statusBarButtons.length; ++i)
            this._statusBarButtons[i].setEnabled(!this._operationInProgress);
        this._miscStatusBarItems.removeChildren();
        if (indicator)
            this._miscStatusBarItems.appendChild(indicator.element);
    },

    _registerShortcuts: function()
    {
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.StartStopRecording, this._toggleTimelineButtonClicked.bind(this));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.SaveToFile, this._saveToFile.bind(this));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.LoadFromFile, this._selectFileToLoad.bind(this));
    },

    _createFileSelector: function()
    {
        if (this._fileSelectorElement)
            this._fileSelectorElement.remove();

        this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
        this.element.appendChild(this._fileSelectorElement);
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Save Timeline data\u2026" : "Save Timeline Data\u2026"), this._saveToFile.bind(this), this._operationInProgress);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Load Timeline data\u2026" : "Load Timeline Data\u2026"), this._selectFileToLoad.bind(this), this._operationInProgress);
        contextMenu.show();
    },

    /**
     * @return {boolean}
     */
    _saveToFile: function()
    {
        if (this._operationInProgress)
            return true;
        this._model.saveToFile();
        return true;
    },

    /**
     * @return {boolean}
     */
    _selectFileToLoad: function() {
        this._fileSelectorElement.click();
        return true;
    },

    /**
     * @param {!File} file
     */
    _loadFromFile: function(file)
    {
        var progressIndicator = this._prepareToLoadTimeline();
        if (!progressIndicator)
            return;
        this._model.loadFromFile(file, progressIndicator);
        this._createFileSelector();
    },

    /**
     * @param {string} url
     */
    loadFromURL: function(url)
    {
        var progressIndicator = this._prepareToLoadTimeline();
        if (!progressIndicator)
            return;
        this._model.loadFromURL(url, progressIndicator);
    },

    _selectPresentationMode: function(mode)
    {
        if (!this._overviewItems[mode])
            mode = WebInspector.TimelinePanel.Mode.Events;
        this._overviewItems[mode].revealAndSelect(false);
    },

    _refreshViews: function(totalUpdate)
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.refreshRecords(this._textFilter._regex);
        }
        this._updateSelectionDetails();
    },

    _onModeChanged: function(mode)
    {
        this.element.classList.remove("timeline-" + this._presentationModeSetting.get().toLowerCase() + "-view");
        this._presentationModeSetting.set(mode);
        this.element.classList.add("timeline-" + mode.toLowerCase() + "-view");
        this._stackView.detachChildViews();
        var views = this._viewsForMode(mode);
        this._currentViews = views.mainViews;
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.setWindowTimes(this.windowStartTime(), this.windowEndTime());
            this._stackView.appendView(view, "timelinePanelTimelineStackSplitViewState");
            view.refreshRecords(this._textFilter._regex);
        }
        this._overviewControl = views.overviewView;
        this._overviewPane.setOverviewControl(this._overviewControl);
        this._updateSelectionDetails();
    },

    /**
     * @param {boolean} userInitiated
     */
    _startRecording: function(userInitiated)
    {
        this._userInitiatedRecording = userInitiated;
        this._model.startRecording(true);
        if (userInitiated)
            WebInspector.userMetrics.TimelineStarted.record();
    },

    _stopRecording: function()
    {
        this._userInitiatedRecording = false;
        this._model.stopRecording();
    },

    /**
     * @return {boolean}
     */
    _toggleTimelineButtonClicked: function()
    {
        if (this._operationInProgress)
            return true;
        if (this._recordingInProgress())
            this._stopRecording();
        else
            this._startRecording(true);
        return true;
    },

    _garbageCollectButtonClicked: function()
    {
        HeapProfilerAgent.collectGarbage();
    },

    _onClearButtonClick: function()
    {
        this._model.reset();
    },

    _onRecordsCleared: function()
    {
        this.requestWindowTimes(0, Infinity);
        delete this._selectedRecord;
        if (this._lazyFrameModel)
            this._lazyFrameModel.reset();
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].reset();
        this._overviewControl.reset();
        this._updateSelectionDetails();
    },

    _onRecordingStarted: function()
    {
        this.toggleTimelineButton.title = WebInspector.UIString("Stop");
        this.toggleTimelineButton.toggled = true;
    },

    _recordingInProgress: function()
    {
        return this.toggleTimelineButton.toggled;
    },

    _onRecordingStopped: function()
    {
        this.toggleTimelineButton.title = WebInspector.UIString("Record");
        this.toggleTimelineButton.toggled = false;
    },

    _onRecordAdded: function(event)
    {
        this._addRecord(/** @type {!WebInspector.TimelineModel.Record} */(event.data));
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _addRecord: function(record)
    {
        if (this._lazyFrameModel)
            this._lazyFrameModel.addRecord(record);
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].addRecord(record);
        this._overviewPane.addRecord(record);
        this._updateSearchHighlight(false, true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _willReloadPage: function(event)
    {
        if (this._operationInProgress || this._userInitiatedRecording || !this.isShowing())
            return;
        this._startRecording(false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _loadEventFired: function(event)
    {
        if (!this._recordingInProgress() || this._userInitiatedRecording)
            return;
        this._stopRecording();
    },

    // WebInspector.Searchable implementation

    jumpToNextSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : -1;
        this._jumpToSearchResult(index + 1);
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : 0;
        this._jumpToSearchResult(index - 1);
    },

    _jumpToSearchResult: function(index)
    {
        this._selectSearchResult((index + this._searchResults.length) % this._searchResults.length);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, true);
    },

    _selectSearchResult: function(index)
    {
        this._selectedSearchResult = this._searchResults[index];
        this._searchableView.updateCurrentMatchIndex(index);
    },

    _clearHighlight: function()
    {
        this._currentViews[0].highlightSearchResult(null);
    },

    /**
     * @param {boolean} revealRecord
     * @param {boolean} shouldJump
     */
    _updateSearchHighlight: function(revealRecord, shouldJump)
    {
        if (this._textFilter || !this._searchRegex) {
            this._clearHighlight();
            return;
        }

        if (!this._searchResults)
            this._updateSearchResults(shouldJump);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, revealRecord);
    },

    _updateSearchResults: function(shouldJump)
    {
        var searchRegExp = this._searchRegex;
        if (!searchRegExp)
            return;

        var matches = [];

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         */
        function processRecord(record)
        {
            if (record.testContentMatching(searchRegExp))
                matches.push(record);
        }
        this._model.forAllFilteredRecords(processRecord);

        var matchesCount = matches.length;
        if (matchesCount) {
            this._searchResults = matches;
            this._searchableView.updateSearchMatchesCount(matchesCount);

            var selectedIndex = matches.indexOf(this._selectedSearchResult);
            if (shouldJump && selectedIndex === -1)
                selectedIndex = 0;
            this._selectSearchResult(selectedIndex);
        } else {
            this._searchableView.updateSearchMatchesCount(0);
            delete this._selectedSearchResult;
        }
    },

    searchCanceled: function()
    {
        this._clearHighlight();
        delete this._searchResults;
        delete this._selectedSearchResult;
        delete this._searchRegex;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump)
    {
        this._searchRegex = createPlainTextSearchRegex(query, "i");
        delete this._searchResults;
        this._updateSearchHighlight(true, shouldJump);
    },

    _updateSelectionDetails: function()
    {
        if (this._selectedRecord)
            return;

        var startTime = this._windowStartTime;
        var endTime = this._windowEndTime;

        // Return early in case 0 selection window.
        if (startTime < 0)
            return;

        var aggregatedStats = {};

        /**
         * @param {number} value
         * @param {!WebInspector.TimelineModel.Record} task
         * @return {number}
         */
        function compareEndTime(value, task)
        {
            return value < task.endTime ? -1 : 1;
        }

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         */
        function aggregateTimeForRecordWithinWindow(record)
        {
            if (!record.endTime || record.endTime < startTime || record.startTime > endTime)
                return;

            var childrenTime = 0;
            var children = record.children || [];
            for (var i = 0; i < children.length; ++i) {
                var child = children[i];
                if (!child.endTime || child.endTime < startTime || child.startTime > endTime)
                    continue;
                childrenTime += Math.min(endTime, child.endTime) - Math.max(startTime, child.startTime);
                aggregateTimeForRecordWithinWindow(child);
            }
            var categoryName = WebInspector.TimelineUIUtils.categoryForRecord(record).name;
            var ownTime = Math.min(endTime, record.endTime) - Math.max(startTime, record.startTime) - childrenTime;
            aggregatedStats[categoryName] = (aggregatedStats[categoryName] || 0) + ownTime;
        }

        var mainThreadTasks = this._model.mainThreadTasks();
        var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, mainThreadTasks, compareEndTime);
        for (; taskIndex < mainThreadTasks.length; ++taskIndex) {
            var task = mainThreadTasks[taskIndex];
            if (task.startTime > endTime)
                break;
            aggregateTimeForRecordWithinWindow(task);
        }

        var aggregatedTotal = 0;
        for (var categoryName in aggregatedStats)
            aggregatedTotal += aggregatedStats[categoryName];
        aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);

        var fragment = document.createDocumentFragment();
        fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats));
        var startOffset = startTime - this._model.minimumRecordTime();
        var endOffset = endTime - this._model.minimumRecordTime();
        var title = WebInspector.UIString("%s \u2013 %s", Number.millisToString(startOffset), Number.millisToString(endOffset));
        this._detailsView.setContent(title, fragment);
    },

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     */
    selectRecord: function(record)
    {
        this._detailsLinkifier.reset();
        this._selectedRecord = record;

        if (!record) {
            this._updateSelectionDetails();
            return;
        }

        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.setSelectedRecord(record);
        }
        if (!record) {
            this._updateSelectionDetails();
            return;
        }
        WebInspector.TimelineUIUtils.generatePopupContent(record, this._detailsLinkifier, showCallback.bind(this));

        /**
         * @param {!DocumentFragment} element
         * @this {WebInspector.TimelinePanel}
         */
        function showCallback(element)
        {
            this._detailsView.setContent(record.title(), element);
        }
    },

    /**
     * @param {string} title
     * @param {!Object} aggregatedStats
     */
    showAggregatedStatsInDetails: function(title, aggregatedStats)
    {
        this._detailsView.setContent(title, WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats));
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.TimelineDetailsView = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("timeline-details-view");
    this._titleElement = this.element.createChild("div", "timeline-details-view-title");
    this._titleElement.textContent = WebInspector.UIString("DETAILS");
    this._contentElement = this.element.createChild("div", "timeline-details-view-body");
}

WebInspector.TimelineDetailsView.prototype = {
    /**
     * @return {!Element}
     */
    titleElement: function()
    {
        return this._titleElement;
    },

    /**
     * @param {string} title
     * @param {!Node} node
     */
    setContent: function(title, node)
    {
        this._titleElement.textContent = WebInspector.UIString("DETAILS: %s", title);
        this._contentElement.removeChildren();
        this._contentElement.appendChild(node);
    },

    /**
     * @param {boolean} vertical
     */
    setVertical: function(vertical)
    {
        this._contentElement.classList.toggle("hbox", !vertical);
        this._contentElement.classList.toggle("vbox", vertical);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @interface
 */
WebInspector.TimelineModeView = function()
{
}

WebInspector.TimelineModeView.prototype = {
    reset: function() {},

    /**
     * @param {?RegExp} textFilter
     */
    refreshRecords: function(textFilter) {},

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    addRecord: function(record) {},

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     * @param {string=} regex
     * @param {boolean=} selectRecord
     */
    highlightSearchResult: function(record, regex, selectRecord) {},

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime) {},

    /**
     * @param {number} width
     */
    setSidebarSize: function(width) {},

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     */
    setSelectedRecord: function(record) {}
}

/**
 * @interface
 */
WebInspector.TimelineModeViewDelegate = function() {}

WebInspector.TimelineModeViewDelegate.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime) {},

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     */
    selectRecord: function(record) {},

    /**
     * @param {string} title
     * @param {!Object} aggregatedStats
     */
    showAggregatedStatsInDetails: function(title, aggregatedStats) {},
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineCategoryFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.TimelineCategoryFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !record.category.hidden;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineIsLongFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
    this._minimumRecordDuration = 0;
}

WebInspector.TimelineIsLongFilter.prototype = {
    /**
     * @param {number} value
     */
    setMinimumRecordDuration: function(value)
    {
        this._minimumRecordDuration = value;
        this.notifyFilterChanged();
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return this._minimumRecordDuration ? ((record.lastChildEndTime - record.startTime) >= this._minimumRecordDuration) : true;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype

}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineTextFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.TimelineTextFilter.prototype = {
    /**
     * @param {?RegExp} regex
     */
    setRegex: function(regex)
    {
        this._regex = regex;
        this.notifyFilterChanged();
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        if (!this._regex)
            return true;

        var accept = false;
        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @return {boolean}
         * @this {!WebInspector.TimelineTextFilter}
         */
        function processRecord(record)
        {
            return record.testContentMatching(this._regex);
        }
        return WebInspector.TimelineModel.forAllRecords([record], processRecord.bind(this));
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineHiddenFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
    this._hiddenRecords = {};
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkDOMContent] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkLoad] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.MarkFirstPaint] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.GPUTask] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.InvalidateLayout] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.RequestMainThreadFrame] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.ActivateLayerTree] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.DrawFrame] = 1;
    this._hiddenRecords[WebInspector.TimelineModel.RecordType.BeginFrame] = 1;
}

WebInspector.TimelineHiddenFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !this._hiddenRecords[record.type];
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}
