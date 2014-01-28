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
importScript("TimelineFrameController.js");
importScript("TimelineEventOverview.js");
importScript("TimelineFrameOverview.js");
importScript("TimelineMemoryOverview.js");
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

    // Create model.
    this._model = new WebInspector.TimelineModel();
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped, this._onRecordingStopped, this);

    this._presentationModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelinePanel.Mode.Events);
    this._glueRecordsSetting = WebInspector.settings.createSetting("timelineGlueRecords", false);

    this._createStatusBarItems();

    this._createPresentationSelector();

    // Create top overview component.
    this._overviewPane = new WebInspector.TimelineOverviewPane(this._model);
    this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.show(this._presentationSelector.element);

    this._createFileSelector();
    this._registerShortcuts();

    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.WillReloadPage, this._willReloadPage, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load, this._loadEventFired, this);

    this._selectPresentationMode(this._presentationModeSetting.get());
}

WebInspector.TimelinePanel.Mode = {
    Events: "Events",
    Frames: "Frames",
    Memory: "Memory"
};

// Define row and header height, should be in sync with styles for timeline graphs.
WebInspector.TimelinePanel.rowHeight = 18;
WebInspector.TimelinePanel.headerHeight = 20;

WebInspector.TimelinePanel.durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelinePanel.prototype = {
    /**
     * @param {number} width
     */
    setSidebarWidth: function(width)
    {
        this._topPaneSidebarElement.style.flexBasis = width + "px";
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWindowChanged: function(event)
    {
        this._currentView.windowTimesChanged(event.data.startTime, event.data.endTime);
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._overviewPane.setWindowTimes(startTime, endTime);
    },

    /**
     * @param {string} mode
     */
    _viewForMode: function(mode)
    {
        var view = this._views[mode];
        if (!view) {
            switch (mode) {
            case WebInspector.TimelinePanel.Mode.Events:
            case WebInspector.TimelinePanel.Mode.Frames:
            case WebInspector.TimelinePanel.Mode.Memory:
                view = new WebInspector.TimelineView(this, this._model, this._glueRecordsSetting, mode);
                this._views[mode] = view;
                break;
            default:
                console.assert(false, "Unknown mode: " + mode);
            }
        }
        return view;
    },

    _createPresentationSelector: function()
    {
        this._views = {};

        this._presentationSelector = new WebInspector.View();
        this._presentationSelector.element.classList.add("hbox");
        this._presentationSelector.element.id = "timeline-overview-panel";
        this._presentationSelector.show(this.element);

        this._topPaneSidebarElement = this._presentationSelector.element.createChild("div");
        this._topPaneSidebarElement.id = "timeline-overview-sidebar";

        var overviewTreeElement = this._topPaneSidebarElement.createChild("ol", "sidebar-tree vbox");
        var topPaneSidebarTree = new TreeOutline(overviewTreeElement);

        this._overviewItems = {};
        for (var mode in WebInspector.TimelinePanel.Mode) {
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
        var hasFilters = this._currentView.createUIFilters(this._filterBar);
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
        return this._currentView.searchableView();
    },

    _onFiltersToggled: function(event)
    {
        var toggled = /** @type {boolean} */ (event.data);
        this._filtersContainer.enableStyleClass("hidden", !toggled);
        this.onResize();
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
        this._glueParentButton.setEnabled(!this._operationInProgress && !this._currentView.supportsGlueParentMode());
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
        var windowTimes = null;
        if (this._currentView) {
            this._currentView.detach();
            windowTimes = this._currentView.windowTimes();
        }
        this._currentView = this._viewForMode(mode);
        this._updateFiltersBar();
        if (windowTimes)
            this._currentView.setWindowTimes(windowTimes);
        this._overviewPane.setOverviewControl(this._currentView.overviewControl());
        this._currentView.show(this.element);
        this._glueParentButton.setEnabled(this._currentView.supportsGlueParentMode());
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
