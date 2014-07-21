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

importScript("CountersGraph.js");
importScript("Layers3DView.js");
importScript("MemoryCountersGraph.js");
importScript("TimelineModel.js");
importScript("TimelineModelImpl.js");
importScript("TimelineJSProfile.js");
importScript("TimelineOverviewPane.js");
importScript("TimelinePresentationModel.js");
importScript("TracingTimelineModel.js");
importScript("TimelineFrameModel.js");
importScript("TimelineEventOverview.js");
importScript("TimelineFrameOverview.js");
importScript("TimelineMemoryOverview.js");
importScript("TimelinePowerGraph.js");
importScript("TimelinePowerOverview.js");
importScript("TimelineFlameChart.js");
importScript("TimelineUIUtils.js");
importScript("TimelineUIUtilsImpl.js");
importScript("TimelineView.js");
importScript("TimelineLayersView.js");
importScript("TimelinePaintProfilerView.js");
importScript("TracingModel.js");
importScript("TracingTimelineUIUtils.js");
importScript("TransformController.js");
importScript("PaintProfilerView.js");

/**
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.TimelineModeViewDelegate}
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.TimelinePanel = function()
{
    WebInspector.Panel.call(this, "timeline");
    this.registerRequiredCSS("timelinePanel.css");
    this.registerRequiredCSS("layersPanel.css");
    this.registerRequiredCSS("filter.css");
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);

    this._detailsLinkifier = new WebInspector.Linkifier();
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;

    // Create model.
    if (WebInspector.experimentsSettings.timelineOnTraceEvents.isEnabled()) {
        this._tracingModel = new WebInspector.TracingModel(WebInspector.targetManager.mainTarget());
        this._tracingModel.addEventListener(WebInspector.TracingModel.Events.BufferUsage, this._onTracingBufferUsage, this);

        this._uiUtils = new WebInspector.TracingTimelineUIUtils();
        this._tracingTimelineModel = new WebInspector.TracingTimelineModel(this._tracingModel, this._uiUtils.hiddenRecordsFilter());
        this._model = this._tracingTimelineModel;
    } else {
        this._uiUtils = new WebInspector.TimelineUIUtilsImpl();
        this._model = new WebInspector.TimelineModelImpl();
    }

    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped, this._onRecordingStopped, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingProgress, this._onRecordingProgress, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordFilterChanged, this._refreshViews, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);

    this._categoryFilter = new WebInspector.TimelineCategoryFilter(this._uiUtils);
    this._durationFilter = new WebInspector.TimelineIsLongFilter();
    this._textFilter = new WebInspector.TimelineTextFilter(this._uiUtils);

    var hiddenEmptyRecordsFilter = this._uiUtils.hiddenEmptyRecordsFilter();
    if (hiddenEmptyRecordsFilter)
        this._model.addFilter(hiddenEmptyRecordsFilter);
    this._model.addFilter(this._uiUtils.hiddenRecordsFilter());
    this._model.addFilter(this._categoryFilter);
    this._model.addFilter(this._durationFilter);
    this._model.addFilter(this._textFilter);

    /** @type {!Array.<!WebInspector.TimelineModeView>} */
    this._currentViews = [];

    this._overviewModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelinePanel.OverviewMode.Events);
    this._flameChartEnabledSetting = WebInspector.settings.createSetting("timelineFlameChartEnabled", false);
    this._createStatusBarItems();

    this._topPane = new WebInspector.SplitView(true, false);
    this._topPane.element.id = "timeline-overview-panel";
    this._topPane.show(this.element);
    this._topPane.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
    this._topPane.setResizable(false);
    this._createRecordingOptions();

    // Create top overview component.
    this._overviewPane = new WebInspector.TimelineOverviewPane(this._model, this._uiUtils);
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
    this._detailsView = new WebInspector.TimelineDetailsView();
    this._detailsSplitView.installResizer(this._detailsView.headerElement());
    this._detailsView.show(this._detailsSplitView.sidebarElement());

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimumSize(0, 25);
    this._searchableView.element.classList.add("searchable-view");
    this._searchableView.show(this._detailsSplitView.mainElement());

    this._stackView = new WebInspector.StackView(false);
    this._stackView.show(this._searchableView.element);
    this._stackView.element.classList.add("timeline-view-stack");

    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
    WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
    this._dockSideChanged();

    this._onModeChanged();
    this._detailsSplitView.show(this.element);
}

WebInspector.TimelinePanel.OverviewMode = {
    Events: "Events",
    Frames: "Frames"
};

// Define row and header height, should be in sync with styles for timeline graphs.
WebInspector.TimelinePanel.rowHeight = 18;
WebInspector.TimelinePanel.headerHeight = 20;

WebInspector.TimelinePanel.durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelinePanel.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        target.profilingLock.addEventListener(WebInspector.Lock.Events.StateChanged, this._onProfilingStateChanged, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        target.profilingLock.removeEventListener(WebInspector.Lock.Events.StateChanged, this._onProfilingStateChanged, this);
    },

    /**
     * @return {?WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

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
        return this._model.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    windowEndTime: function()
    {
        if (this._windowEndTime < Infinity)
            return this._windowEndTime;
        return this._model.maximumRecordTime() || Infinity;
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
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._overviewPane.requestWindowTimes(windowStartTime, windowEndTime);
    },

    /**
     * @return {!WebInspector.TimelineFrameModelBase}
     */
    _frameModel: function()
    {
        if (this._lazyFrameModel)
            return this._lazyFrameModel;
        if (this._tracingModel) {
            var tracingFrameModel = new WebInspector.TracingTimelineFrameModel();
            tracingFrameModel.addTraceEvents(this._tracingTimelineModel.inspectedTargetEvents(), this._tracingModel.sessionId() || "");
            this._lazyFrameModel = tracingFrameModel;
        } else {
            var frameModel = new WebInspector.TimelineFrameModel();
            frameModel.setMergeRecords(!WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled() || !this._recordingInProgress);
            frameModel.addRecords(this._model.records());
            this._lazyFrameModel = frameModel;
        }
        return this._lazyFrameModel;
    },

    /**
     * @return {!WebInspector.TimelineView}
     */
    _timelineView: function()
    {
        if (!this._lazyTimelineView)
            this._lazyTimelineView = new WebInspector.TimelineView(this, this._model, this._uiUtils);
        return this._lazyTimelineView;
    },

    /**
     * @return {!WebInspector.View}
     */
    _layersView: function()
    {
        if (this._lazyLayersView)
            return this._lazyLayersView;
        this._lazyLayersView = new WebInspector.TimelineLayersView();
        this._lazyLayersView.setTimelineModelAndDelegate(this._model, this);
        return this._lazyLayersView;
    },

    _paintProfilerView: function()
    {
        if (this._lazyPaintProfilerView)
            return this._lazyPaintProfilerView;
        this._lazyPaintProfilerView = new WebInspector.TimelinePaintProfilerView();
        return this._lazyPaintProfilerView;
    },

    /**
     * @param {!WebInspector.TimelineModeView} modeView
     */
    _addModeView: function(modeView)
    {
        modeView.setWindowTimes(this.windowStartTime(), this.windowEndTime());
        modeView.refreshRecords(this._textFilter._regex);
        modeView.view().setSidebarSize(this._topPane.sidebarSize());
        this._stackView.appendView(modeView.view(), "timelinePanelTimelineStackSplitViewState");
        modeView.view().addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
        this._currentViews.push(modeView);
    },

    _removeAllModeViews: function()
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            this._currentViews[i].removeEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
            this._currentViews[i].dispose();
        }
        this._currentViews = [];
        this._stackView.detachChildViews();
    },

    /**
     * @param {string} name
     * @param {!WebInspector.Setting} setting
     * @param {string} tooltip
     * @return {!Element}
     */
    _createSettingCheckbox: function(name, setting, tooltip)
    {
        if (!this._recordingOptionUIControls)
            this._recordingOptionUIControls = [];

        var checkboxElement = document.createElement("input");
        var labelElement = WebInspector.SettingsUI.createSettingCheckbox(name, setting, true, checkboxElement, tooltip);
        this._recordingOptionUIControls.push({ "label": labelElement, "checkbox": checkboxElement });
        return labelElement;
    },

    _createRecordingOptions: function()
    {
        var topPaneSidebarElement = this._topPane.sidebarElement();
        this._captureStacksSetting = WebInspector.settings.createSetting("timelineCaptureStacks", true);
        topPaneSidebarElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Capture stacks"),
                                                                      this._captureStacksSetting,
                                                                      WebInspector.UIString("Capture JavaScript stack on every timeline event")));

        this._captureMemorySetting = WebInspector.settings.createSetting("timelineCaptureMemory", false);
        topPaneSidebarElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Capture memory"),
                                                                      this._captureMemorySetting,
                                                                      WebInspector.UIString("Capture memory information on every timeline event")));
        this._captureMemorySetting.addChangeListener(this._onModeChanged, this);

        if (WebInspector.experimentsSettings.timelinePowerProfiler.isEnabled()) {
            this._capturePowerSetting = WebInspector.settings.createSetting("timelineCapturePower", false);
            topPaneSidebarElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Capture power"),
                                                                          this._capturePowerSetting,
                                                                          WebInspector.UIString("Capture power information")));
            this._capturePowerSetting.addChangeListener(this._onModeChanged, this);
        }

        if (WebInspector.experimentsSettings.timelineOnTraceEvents.isEnabled()) {
            this._captureLayersAndPicturesSetting = WebInspector.settings.createSetting("timelineCaptureLayersAndPictures", false);
            topPaneSidebarElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Capture pictures"),
                                                                          this._captureLayersAndPicturesSetting,
                                                                          WebInspector.UIString("Capture graphics layer positions and painted pictures")));
        }
    },

    _createStatusBarItems: function()
    {
        var panelStatusBarElement = this.element.createChild("div", "panel-status-bar");
        this._statusBarButtons = /** @type {!Array.<!WebInspector.StatusBarItem>} */ ([]);

        this.toggleTimelineButton = new WebInspector.StatusBarButton("", "record-profile-status-bar-item");
        this.toggleTimelineButton.addEventListener("click", this._toggleTimelineButtonClicked, this);
        this._statusBarButtons.push(this.toggleTimelineButton);
        panelStatusBarElement.appendChild(this.toggleTimelineButton.element);
        this._updateToggleTimelineButton(false);

        var clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-status-bar-item");
        clearButton.addEventListener("click", this._onClearButtonClick, this);
        this._statusBarButtons.push(clearButton);
        panelStatusBarElement.appendChild(clearButton.element);

        this._filterBar = this._createFilterBar();
        panelStatusBarElement.appendChild(this._filterBar.filterButton().element);

        var garbageCollectButton = new WebInspector.StatusBarButton(WebInspector.UIString("Collect Garbage"), "timeline-garbage-collect-status-bar-item");
        garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
        this._statusBarButtons.push(garbageCollectButton);
        panelStatusBarElement.appendChild(garbageCollectButton.element);

        var framesToggleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Frames mode"), "timeline-frames-status-bar-item");
        framesToggleButton.toggled = this._overviewModeSetting.get() === WebInspector.TimelinePanel.OverviewMode.Frames;
        framesToggleButton.addEventListener("click", this._overviewModeChanged.bind(this, framesToggleButton));
        this._statusBarButtons.push(framesToggleButton);
        panelStatusBarElement.appendChild(framesToggleButton.element);

        if (WebInspector.experimentsSettings.timelineOnTraceEvents.isEnabled()) {
            var flameChartToggleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Tracing mode"), "timeline-flame-chart-status-bar-item");
            flameChartToggleButton.toggled = this._flameChartEnabledSetting.get();
            flameChartToggleButton.addEventListener("click", this._flameChartEnabledChanged.bind(this, flameChartToggleButton));
            this._statusBarButtons.push(flameChartToggleButton);
            panelStatusBarElement.appendChild(flameChartToggleButton.element);
        }

        this._miscStatusBarItems = panelStatusBarElement.createChild("div", "status-bar-item");

        this._filtersContainer = this.element.createChild("div", "timeline-filters-header hidden");
        this._filtersContainer.appendChild(this._filterBar.filtersElement());
        this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
        this._filterBar.setName("timelinePanel");
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
            this._updateToggleTimelineButton(false);
            this._stopRecording();
        }
        var progressIndicator = new WebInspector.ProgressIndicator();
        progressIndicator.addEventListener(WebInspector.Progress.Events.Done, this._setOperationInProgress.bind(this, null));
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

    _refreshViews: function()
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.refreshRecords(this._textFilter._regex);
        }
        this._updateSelectedRangeStats();
    },

    /**
     * @param {!WebInspector.StatusBarButton} button
     */
    _overviewModeChanged: function(button)
    {
        var oldMode = this._overviewModeSetting.get();
        if (oldMode === WebInspector.TimelinePanel.OverviewMode.Events) {
            this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Frames);
            button.toggled = true;
        } else {
            this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Events);
            button.toggled = false;
        }
        this._onModeChanged();
    },

    /**
     * @param {!WebInspector.StatusBarButton} button
     */
    _flameChartEnabledChanged: function(button)
    {
        var oldValue = this._flameChartEnabledSetting.get();
        var newValue = !oldValue;
        this._flameChartEnabledSetting.set(newValue);
        button.toggled = newValue;
        this._onModeChanged();
    },

    _onModeChanged: function()
    {
        this._stackView.detach();

        var isFrameMode = this._overviewModeSetting.get() === WebInspector.TimelinePanel.OverviewMode.Frames;
        this._removeAllModeViews();
        this._overviewControls = [];

        if (isFrameMode)
            this._overviewControls.push(new WebInspector.TimelineFrameOverview(this._model, this._frameModel()));
        else
            this._overviewControls.push(new WebInspector.TimelineEventOverview(this._model, this._uiUtils));

        if (this._tracingTimelineModel && this._flameChartEnabledSetting.get())
            this._addModeView(new WebInspector.TimelineFlameChart(this, this._tracingTimelineModel, this._frameModel()));
        else
            this._addModeView(this._timelineView());

        if (this._captureMemorySetting.get()) {
            if (!isFrameMode)  // Frame mode skews time, don't render aux overviews.
                this._overviewControls.push(new WebInspector.TimelineMemoryOverview(this._model, this._uiUtils));
            this._addModeView(new WebInspector.MemoryCountersGraph(this, this._model, this._uiUtils));
        }

        if (this._capturePowerSetting && this._capturePowerSetting.get()) {
            if (!isFrameMode)  // Frame mode skews time, don't render aux overviews.
                this._overviewControls.push(new WebInspector.TimelinePowerOverview(this._model));
            this._addModeView(new WebInspector.TimelinePowerGraph(this, this._model));
        }

        if (this._lazyTimelineView)
            this._lazyTimelineView.setFrameModel(isFrameMode ? this._frameModel() : null);

        this._overviewPane.setOverviewControls(this._overviewControls);
        this.doResize();
        this._updateSelectedRangeStats();

        this._stackView.show(this._searchableView.element);
    },

    /**
     * @param {boolean} enabled
     */
    _setUIControlsEnabled: function(enabled) {
        function handler(uiControl)
        {
            uiControl.checkbox.disabled = !enabled;
            uiControl.label.classList.toggle("dimmed", !enabled);
        }
        this._recordingOptionUIControls.forEach(handler);
        WebInspector.inspectorView.setCurrentPanelLocked(!enabled);
    },

    /**
     * @param {boolean} userInitiated
     */
    _startRecording: function(userInitiated)
    {
        this._userInitiatedRecording = userInitiated;
        this._model.startRecording(this._captureStacksSetting.get(), this._captureMemorySetting.get(), this._captureLayersAndPicturesSetting && this._captureLayersAndPicturesSetting.get());
        if (WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled() && this._lazyFrameModel)
            this._lazyFrameModel.setMergeRecords(false);

        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].timelineStarted();

        if (userInitiated)
            WebInspector.userMetrics.TimelineStarted.record();
        this._setUIControlsEnabled(false);
    },

    _stopRecording: function()
    {
        this._stopPending = true;
        this._updateToggleTimelineButton(false);
        this._userInitiatedRecording = false;
        this._model.stopRecording();
        if (this._progressElement)
            this._updateProgress(WebInspector.UIString("Retrieving events\u2026"));

        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].timelineStopped();
        this._setUIControlsEnabled(true);
    },

    _onProfilingStateChanged: function()
    {
        this._updateToggleTimelineButton(this.toggleTimelineButton.toggled);
    },

    /**
     * @param {boolean} toggled
     */
    _updateToggleTimelineButton: function(toggled)
    {
        var isAcquiredInSomeTarget = WebInspector.targetManager.targets().some(function(target) { return target.profilingLock.isAcquired(); });
        this.toggleTimelineButton.toggled = toggled;
        if (toggled) {
            this.toggleTimelineButton.title = WebInspector.UIString("Stop");
            this.toggleTimelineButton.setEnabled(true);
        } else if (this._stopPending) {
            this.toggleTimelineButton.title = WebInspector.UIString("Stop pending");
            this.toggleTimelineButton.setEnabled(false);
        } else if (isAcquiredInSomeTarget) {
            this.toggleTimelineButton.title = WebInspector.anotherProfilerActiveLabel();
            this.toggleTimelineButton.setEnabled(false);
        } else {
            this.toggleTimelineButton.title = WebInspector.UIString("Record");
            this.toggleTimelineButton.setEnabled(true);
        }
    },

    /**
     * @return {boolean}
     */
    _toggleTimelineButtonClicked: function()
    {
        if (!this.toggleTimelineButton.enabled())
            return true;
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
        if (this._tracingModel)
            this._tracingModel.reset();
        this._model.reset();
    },

    _onRecordsCleared: function()
    {
        this.requestWindowTimes(0, Infinity);
        delete this._selection;
        if (this._lazyFrameModel)
            this._lazyFrameModel.reset();
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].reset();
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].reset();
        this._updateSelectedRangeStats();
    },

    _onRecordingStarted: function()
    {
        this._updateToggleTimelineButton(true);
        if (WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled())
            this._updateProgress(WebInspector.UIString("%d events collected", 0));
    },

    _recordingInProgress: function()
    {
        return this.toggleTimelineButton.toggled;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRecordingProgress: function(event)
    {
        if (!WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled())
            return;
        this._updateProgress(WebInspector.UIString("%d events collected", event.data));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onTracingBufferUsage: function(event)
    {
        var usage = /** @type {number} */ (event.data);
        this._updateProgress(WebInspector.UIString("Buffer usage %d%", Math.round(usage * 100)));
    },

    /**
     * @param {string} progressMessage
     */
    _updateProgress: function(progressMessage)
    {
        if (!this._progressElement)
            this._showProgressPane();
        this._progressElement.textContent = progressMessage;
    },

    _showProgressPane: function()
    {
        this._hideProgressPane();
        this._progressElement = this._detailsSplitView.mainElement().createChild("div", "timeline-progress-pane");
    },

    _hideProgressPane: function()
    {
        if (this._progressElement)
            this._progressElement.remove();
        delete this._progressElement;
    },

    _onRecordingStopped: function()
    {
        this._stopPending = false;
        this._updateToggleTimelineButton(false);
        if (this._lazyFrameModel) {
            if (this._tracingTimelineModel) {
                this._lazyFrameModel.reset();
                this._lazyFrameModel.addTraceEvents(this._tracingTimelineModel.inspectedTargetEvents(), this._tracingModel.sessionId());
                this._overviewPane.update();
            } else if (WebInspector.experimentsSettings.timelineNoLiveUpdate.isEnabled()) {
                this._lazyFrameModel.reset();
                this._lazyFrameModel.addRecords(this._model.records());
            }
        }
        if (this._tracingTimelineModel) {
            this.requestWindowTimes(this._tracingTimelineModel.minimumRecordTime(), this._tracingTimelineModel.maximumRecordTime());
            this._refreshViews();
        }
        this._hideProgressPane();
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
        if (this._lazyFrameModel && !this._tracingModel)
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
     * @param {boolean=} jumpBackwards
     */
    _updateSearchHighlight: function(revealRecord, shouldJump, jumpBackwards)
    {
        if (!this._textFilter.isEmpty() || !this._searchRegex) {
            this._clearHighlight();
            return;
        }

        if (!this._searchResults)
            this._updateSearchResults(shouldJump, jumpBackwards);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, revealRecord);
    },

    /**
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    _updateSearchResults: function(shouldJump, jumpBackwards)
    {
        var searchRegExp = this._searchRegex;
        if (!searchRegExp)
            return;

        var matches = [];

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @this {WebInspector.TimelinePanel}
         */
        function processRecord(record)
        {
            if (record.endTime() < this._windowStartTime ||
                record.startTime() > this._windowEndTime)
                return;
            if (this._uiUtils.testContentMatching(record, searchRegExp))
                matches.push(record);
        }
        this._model.forAllFilteredRecords(processRecord.bind(this));

        var matchesCount = matches.length;
        if (matchesCount) {
            this._searchResults = matches;
            this._searchableView.updateSearchMatchesCount(matchesCount);

            var selectedIndex = matches.indexOf(this._selectedSearchResult);
            if (shouldJump && selectedIndex === -1)
                selectedIndex = jumpBackwards ? this._searchResults.length - 1 : 0;
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
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(query, shouldJump, jumpBackwards)
    {
        this._searchRegex = createPlainTextSearchRegex(query, "i");
        delete this._searchResults;
        this._updateSearchHighlight(true, shouldJump, jumpBackwards);
    },

    _updateSelectionDetails: function()
    {
        if (!this._selection) {
            this._updateSelectedRangeStats();
            return;
        }
        switch (this._selection.type()) {
        case WebInspector.TimelineSelection.Type.Record:
            var record = /** @type {!WebInspector.TimelineModel.Record} */ (this._selection.object());
            if (this._tracingTimelineModel) {
                var event = record.traceEvent();
                this._uiUtils.generateDetailsContent(record, this._model, this._detailsLinkifier, this._appendDetailsTabsForTraceEventAndShowDetails.bind(this, event));
                break;
            }
            var title = this._uiUtils.titleForRecord(record);
            this._uiUtils.generateDetailsContent(record, this._model, this._detailsLinkifier, this.showInDetails.bind(this, title));
            break;
        case WebInspector.TimelineSelection.Type.TraceEvent:
            var event = /** @type {!WebInspector.TracingModel.Event} */ (this._selection.object());
            WebInspector.TracingTimelineUIUtils.buildTraceEventDetails(event, this._tracingTimelineModel, this._detailsLinkifier, this._appendDetailsTabsForTraceEventAndShowDetails.bind(this, event));
            break;
        case WebInspector.TimelineSelection.Type.Frame:
            var frame = /** @type {!WebInspector.TimelineFrame} */ (this._selection.object());
            this.showInDetails(WebInspector.UIString("Frame Statistics"), WebInspector.TimelineUIUtils.generateDetailsContentForFrame(this._lazyFrameModel, frame));
            if (frame.layerTree) {
                var layersView = this._layersView();
                layersView.showLayerTree(frame.layerTree, frame.paints);
                this._detailsView.appendTab("layers", WebInspector.UIString("Layers"), layersView);
            }
            break;
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {!Node} content
     */
    _appendDetailsTabsForTraceEventAndShowDetails: function(event, content)
    {
        var title = WebInspector.TracingTimelineUIUtils.styleForTraceEvent(event.name).title;
        this.showInDetails(title, content);
        if (event.picture) {
            var paintProfilerView = this._paintProfilerView();
            paintProfilerView.setPicture(event.thread.target(), event.picture);
            this._detailsView.appendTab("paintProfiler", WebInspector.UIString("Paint Profiler"), paintProfilerView);
        }
    },

    _updateSelectedRangeStats: function()
    {
        if (this._selection)
            return;

        var startTime = this._windowStartTime;
        var endTime = this._windowEndTime;
        var uiUtils = this._uiUtils;

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
            return value < task.endTime() ? -1 : 1;
        }

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         */
        function aggregateTimeForRecordWithinWindow(record)
        {
            if (!record.endTime() || record.endTime() < startTime || record.startTime() > endTime)
                return;

            var childrenTime = 0;
            var children = record.children() || [];
            for (var i = 0; i < children.length; ++i) {
                var child = children[i];
                if (!child.endTime() || child.endTime() < startTime || child.startTime() > endTime)
                    continue;
                childrenTime += Math.min(endTime, child.endTime()) - Math.max(startTime, child.startTime());
                aggregateTimeForRecordWithinWindow(child);
            }
            var categoryName = uiUtils.categoryForRecord(record).name;
            var ownTime = Math.min(endTime, record.endTime()) - Math.max(startTime, record.startTime()) - childrenTime;
            aggregatedStats[categoryName] = (aggregatedStats[categoryName] || 0) + ownTime;
        }

        var mainThreadTasks = this._model.mainThreadTasks();
        var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, mainThreadTasks, compareEndTime);
        for (; taskIndex < mainThreadTasks.length; ++taskIndex) {
            var task = mainThreadTasks[taskIndex];
            if (task.startTime() > endTime)
                break;
            aggregateTimeForRecordWithinWindow(task);
        }

        var aggregatedTotal = 0;
        for (var categoryName in aggregatedStats)
            aggregatedTotal += aggregatedStats[categoryName];
        aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);

        var pieChartContainer = document.createElement("div");
        pieChartContainer.classList.add("vbox", "timeline-range-summary");
        var startOffset = startTime - this._model.minimumRecordTime();
        var endOffset = endTime - this._model.minimumRecordTime();
        var title = WebInspector.UIString("Range: %s \u2013 %s", Number.millisToString(startOffset), Number.millisToString(endOffset));

        for (var i = 0; i < this._overviewControls.length; ++i) {
            if (this._overviewControls[i] instanceof WebInspector.TimelinePowerOverview) {
                var energy = this._overviewControls[i].calculateEnergy(startTime, endTime);
                title += WebInspector.UIString("  Energy: %.2f Joules", energy);
                title += WebInspector.UIString("  Accuracy: %s", WebInspector.powerProfiler.getAccuracyLevel());
                break;
            }
        }
        pieChartContainer.createChild("div").textContent = title;
        pieChartContainer.appendChild(WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats));
        this.showInDetails(WebInspector.UIString("Selected Range"), pieChartContainer);
    },

    /**
     * @param {?WebInspector.TimelineSelection} selection
     */
    select: function(selection)
    {
        this._detailsLinkifier.reset();
        this._selection = selection;

        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.setSelection(selection);
        }
        this._updateSelectionDetails();
    },

    /**
     * @param {string} title
     * @param {!Node} node
     */
    showInDetails: function(title, node)
    {
        this._detailsView.setContent(title, node);
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TabbedPane}
 */
WebInspector.TimelineDetailsView = function()
{
    WebInspector.TabbedPane.call(this);

    this._defaultDetailsView = new WebInspector.VBox();
    this._defaultDetailsView.element.classList.add("timeline-details-view");
    this._defaultDetailsContentElement = this._defaultDetailsView.element.createChild("div", "timeline-details-view-body");

    this.appendTab("default", WebInspector.UIString("Details"), this._defaultDetailsView);

    this.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
}

WebInspector.TimelineDetailsView.prototype = {
    /**
     * @param {string} title
     * @param {!Node} node
     */
    setContent: function(title, node)
    {
        this.changeTabTitle("default", WebInspector.UIString("Details: %s", title));
        var otherTabs = this.otherTabs("default");
        for (var i = 0; i < otherTabs.length; ++i)
            this.closeTab(otherTabs[i]);
        this._defaultDetailsContentElement.removeChildren();
        this._defaultDetailsContentElement.appendChild(node);
    },

    /**
     * @param {boolean} vertical
     */
    setVertical: function(vertical)
    {
        this._defaultDetailsContentElement.classList.toggle("hbox", !vertical);
        this._defaultDetailsContentElement.classList.toggle("vbox", vertical);
    },

    /**
     * @param {string} id
     * @param {string} tabTitle
     * @param {!WebInspector.View} view
     * @param {string=} tabTooltip
     */
    appendTab: function(id, tabTitle, view, tabTooltip)
    {
        WebInspector.TabbedPane.prototype.appendTab.call(this, id, tabTitle, view, tabTooltip);
        if (this._lastUserSelectedTabId === id)
            this.selectTab(id);
    },

    _tabSelected: function(event)
    {
        if (!event.data.isUserGesture)
            return;

        this._lastUserSelectedTabId = event.data.tabId;
    },

    __proto__: WebInspector.TabbedPane.prototype
}

/**
 * @constructor
 */
WebInspector.TimelineSelection = function()
{
}

/**
 * @enum {string}
 */
WebInspector.TimelineSelection.Type = {
    Record: "Record",
    Frame: "Frame",
    TraceEvent: "TraceEvent",
};

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromRecord = function(record)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.Record;
    selection._object = record;
    return selection;
}

/**
 * @param {!WebInspector.TimelineFrame} frame
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromFrame = function(frame)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.Frame;
    selection._object = frame;
    return selection;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromTraceEvent = function(event)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.TraceEvent;
    selection._object = event;
    return selection;
}

WebInspector.TimelineSelection.prototype = {
    /**
     * @return {!WebInspector.TimelineSelection.Type}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {!Object}
     */
    object: function()
    {
        return this._object;
    }
};

/**
 * @interface
 * @extends {WebInspector.EventTarget}
 */
WebInspector.TimelineModeView = function()
{
}

WebInspector.TimelineModeView.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    view: function() {},

    dispose: function() {},

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
     * @param {?WebInspector.TimelineSelection} selection
     */
    setSelection: function(selection) {},
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
     * @param {?WebInspector.TimelineSelection} selection
     */
    select: function(selection) {},

    /**
     * @param {string} title
     * @param {!Node} node
     */
    showInDetails: function(title, node) {},
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!WebInspector.TimelineUIUtils} uiUtils
 */
WebInspector.TimelineCategoryFilter = function(uiUtils)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._uiUtils = uiUtils;
}

WebInspector.TimelineCategoryFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !this._uiUtils.categoryForRecord(record).hidden;
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
        return this._minimumRecordDuration ? ((record.endTime() - record.startTime()) >= this._minimumRecordDuration) : true;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype

}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!WebInspector.TimelineUIUtils} uiUtils
 */
WebInspector.TimelineTextFilter = function(uiUtils)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._uiUtils = uiUtils;
}

WebInspector.TimelineTextFilter.prototype = {
    /**
     * @return {boolean}
     */
    isEmpty: function()
    {
        return !this._regex;
    },

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
        return !this._regex || this._uiUtils.testContentMatching(record, this._regex);
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}
