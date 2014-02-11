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
importScript("TimelineView.js");

/**
 * @constructor
 * @extends {WebInspector.Panel}
 */
WebInspector.TimelinePanel = function()
{
    WebInspector.Panel.call(this, "timeline");
    this.registerRequiredCSS("timelinePanel.css");
    this.registerRequiredCSS("filter.css");
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);

    this._windowStartTime = 0;
    this._windowEndTime = Infinity;

    // Create model.
    this._model = new WebInspector.TimelineModel();
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped, this._onRecordingStopped, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

    this._presentationModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelinePanel.Mode.Events);
    this._glueRecordsSetting = WebInspector.settings.createSetting("timelineGlueRecords", false);

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
    this._detailsSplitView = new WebInspector.SplitView(false, true, "timeline-details");
    this._detailsSplitView.element.classList.add("timeline-details-split");
    this._detailsSplitView.sidebarElement().classList.add("timeline-details");
    this._detailsSplitView.setMainElementConstraints(undefined, 40);
    this._detailsView = new WebInspector.TimelineDetailsView();
    this._detailsSplitView.installResizer(this._detailsView.titleElement());
    this._detailsView.show(this._detailsSplitView.sidebarElement());

    this._stackView = new WebInspector.StackView(false);
    this._stackView.show(this._detailsSplitView.mainElement());
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
     * @param {string} title
     * @param {!DocumentFragment} content
     */
    setDetailsContent: function(title, content)
    {
        this._detailsView.setContent(title, content);
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
    },

    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    setWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._windowStartTime = windowStartTime;
        this._windowEndTime = windowEndTime;
        this._overviewPane.setWindowTimes(windowStartTime, windowEndTime);
    },

    /**
     * @param {string} mode
     */
    _viewsForMode: function(mode)
    {
        var views = this._viewsMap[mode];
        if (!views) {
            var timelineView = new WebInspector.TimelineView(this, this._model, this._glueRecordsSetting, mode);
            views = {
                mainViews: [timelineView]
            };
            switch (mode) {
            case WebInspector.TimelinePanel.Mode.Events:
                views.overviewView = new WebInspector.TimelineEventOverview(this._model);
                break;
            case WebInspector.TimelinePanel.Mode.Frames:
                views.overviewView = new WebInspector.TimelineFrameOverview(this._model, timelineView.frameModel);
                break;
            case WebInspector.TimelinePanel.Mode.Memory:
                views.overviewView = new WebInspector.TimelineMemoryOverview(this._model);
                var memoryStatistics = new WebInspector.CountersGraph(timelineView, this._model);
                views.mainViews.push(memoryStatistics);
                break;
            case WebInspector.TimelinePanel.Mode.FlameChart:
                var frameModel = new WebInspector.TimelineFrameModel(this._model)
                views.overviewView = new WebInspector.TimelineFrameOverview(this._model, frameModel);
                var colorGenerator = WebInspector.TimelineFlameChart.colorGenerator(views.overviewView.categoryFillStyles());
                var dataProviderMain = new WebInspector.TimelineFlameChartDataProvider(this._model, colorGenerator, true);
                var dataProviderBackground = new WebInspector.TimelineFlameChartDataProvider(this._model, colorGenerator, false);
                views.mainViews = [
                    new WebInspector.TimelineFlameChart(this._model, dataProviderMain),
                    new WebInspector.TimelineFlameChart(this._model, dataProviderBackground)
                ];
                break;
            default:
                console.assert(false, "Unknown mode: " + mode);
            }
            for (var i = 0; i < views.mainViews.length; ++i)
                views.mainViews[i].addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
            this._viewsMap[mode] = views;
        }
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

        this._filterBar = new WebInspector.FilterBar();
        panelStatusBarElement.appendChild(this._filterBar.filterButton().element);

        this.garbageCollectButton = new WebInspector.StatusBarButton(WebInspector.UIString("Collect Garbage"), "garbage-collect-status-bar-item");
        this.garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
        this._statusBarButtons.push(this.garbageCollectButton);
        panelStatusBarElement.appendChild(this.garbageCollectButton.element);

        this._glueParentButton = new WebInspector.StatusBarButton(WebInspector.UIString("Glue asynchronous events to causes"), "glue-async-status-bar-item");
        this._glueParentButton.toggled = this._glueRecordsSetting.get();
        this._glueParentButton.addEventListener("click", this._glueParentButtonClicked, this);
        this._statusBarButtons.push(this._glueParentButton);
        panelStatusBarElement.appendChild(this._glueParentButton.element);

        panelStatusBarElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Capture stacks"), WebInspector.settings.timelineCaptureStacks, true, undefined,
                                               WebInspector.UIString("Capture JavaScript stack on every timeline event")));

        this._statusTextContainer = panelStatusBarElement.createChild("div");
        this.recordsCounter = new WebInspector.StatusBarText("", "timeline-records-counter");
        this._statusTextContainer.appendChild(this.recordsCounter.element);

        this._miscStatusBarItems = panelStatusBarElement.createChild("div", "status-bar-item");

        this._filtersContainer = this.element.createChild("div", "timeline-filters-header hidden");
        this._filtersContainer.appendChild(this._filterBar.filtersElement());
        this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
    },

    _updateFiltersBar: function()
    {
        this._filterBar.clear();
        var hasFilters = this._currentViews[0].createUIFilters(this._filterBar);
        this._filterBar.filterButton().setEnabled(hasFilters);
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.element;
    },

    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._currentViews[0].searchableView();
    },

    _onFiltersToggled: function(event)
    {
        var toggled = /** @type {boolean} */ (event.data);
        this._filtersContainer.enableStyleClass("hidden", !toggled);
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
        this._glueParentButton.setEnabled(!this._operationInProgress && !this._glueMode);
        this._statusTextContainer.enableStyleClass("hidden", !!indicator);
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

    _onModeChanged: function(mode)
    {
        this.element.classList.remove("timeline-" + this._presentationModeSetting.get().toLowerCase() + "-view");
        this._presentationModeSetting.set(mode);
        this.element.classList.add("timeline-" + mode.toLowerCase() + "-view");
        this._stackView.detachChildViews();
        var views = this._viewsForMode(mode);
        this._currentViews = views.mainViews;
        this._updateFiltersBar();
        this._glueMode = true;
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.setWindowTimes(this.windowStartTime(), this.windowEndTime());
            this._stackView.appendView(view, "timeline-view");
            this._glueMode = this._glueMode && view.supportsGlueParentMode();
        }
        this._overviewControl = views.overviewView;
        this._overviewPane.setOverviewControl(this._overviewControl);
        this._glueParentButton.setEnabled(this._glueMode);
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

    _glueParentButtonClicked: function()
    {
        var newValue = !this._glueParentButton.toggled;
        this._glueParentButton.toggled = newValue;
        this._glueRecordsSetting.set(newValue);
    },

    _onClearButtonClick: function()
    {
        this._model.reset();
    },

    _onRecordsCleared: function()
    {
        this.setWindowTimes(0, Infinity);
        this._overviewControl.reset();
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

    __proto__: WebInspector.Panel.prototype
}
