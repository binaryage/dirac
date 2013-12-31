/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @extends {WebInspector.View}
 * @param {!WebInspector.TimelinePanel} panel
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Setting} glueRecordsSetting
 */
WebInspector.TimelineView = function(panel, model, glueRecordsSetting)
{
    WebInspector.View.call(this);
    this.element.classList.add("timeline-view");
    this.element.classList.add("hbox");

    this._panel = panel;
    // Create model.
    this._model = model;
    this._calculator = new WebInspector.TimelineCalculator(this._model);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onTimelineEventRecorded, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

    // Create presentation model.
    this._presentationModel = new WebInspector.TimelinePresentationModel();
    this._presentationModel.setGlueRecords(glueRecordsSetting.get());
    this._glueRecordsSetting = glueRecordsSetting;
    this._glueRecordsSetting.addChangeListener(this._onGlueRecordsSettingChanged, this);

    this._frameMode = false;
    this._boundariesAreValid = true;
    this._scrollTop = 0;

    // Create layout componets.

    //  -------------------------------
    // |            Overview           |
    // |-------------------------------|
    // |    |           |              |
    // |    |  Records  |              |
    // |    |           |    Details   |
    // |----------------|              |
    // |    |  Memory   |              |
    //  -------------------------------

    // Create top level properties splitter.
    this._detailsSplitView = new WebInspector.SplitView(false, "timeline-details");
    this._detailsSplitView.element.classList.remove("fill");
    this._detailsSplitView.element.classList.add("timeline-details-split");
    this._detailsSplitView.sidebarElement().classList.add("timeline-details");
    this._detailsSplitView.show(this.element);
    this._detailsSplitView.mainElement().classList.add("vbox");
    this._detailsSplitView.setMainElementConstraints(undefined, 40);
    this._detailsView = new WebInspector.TimelineDetailsView();
    this._detailsSplitView.setSidebarView(this._detailsView);
    this._detailsSplitView.installResizer(this._detailsView.titleElement());

    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
    WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
    this._dockSideChanged();

    // Create memory splitter as a left child of properties.
    this._searchableView = new WebInspector.SearchableView(this);
    this._detailsSplitView.setMainView(this._searchableView);

    this._timelineMemorySplitter = new WebInspector.SplitView(false, "timeline-memory");
    this._timelineMemorySplitter.element.classList.remove("fill");
    this._timelineMemorySplitter.element.classList.add("timeline-memory-split");
    this._timelineMemorySplitter.show(this._searchableView.element);

    // Create records sidebar as a top memory splitter child.
    this._sidebarView = new WebInspector.SidebarView(WebInspector.SidebarView.SidebarPosition.Start, "timeline-split");
    this._sidebarView.addEventListener(WebInspector.SidebarView.EventTypes.Resized, this._sidebarResized, this);
    this._sidebarView.setSecondIsSidebar(false);
    this._timelineMemorySplitter.setMainView(this._sidebarView);
    this._containerElement = this._sidebarView.element;
    this._containerElement.tabIndex = 0;
    this._containerElement.id = "timeline-container";
    this._containerElement.addEventListener("scroll", this._onScroll.bind(this), false);

    // Create memory statistics as a bottom memory splitter child.
    this._memoryStatistics = new WebInspector.CountersGraph(this, this._model);
    this._timelineMemorySplitter.setSidebarView(this._memoryStatistics);
    this._timelineMemorySplitter.installResizer(this._memoryStatistics.resizeElement());

    // Create records list in the records sidebar.
    this._sidebarView.sidebarElement().classList.add("vbox");
    this._sidebarView.sidebarElement().createChild("div", "timeline-records-title").textContent = WebInspector.UIString("RECORDS");
    this._sidebarListElement = this._sidebarView.sidebarElement().createChild("div", "timeline-records-list");

    // Create grid in the records main area.
    this._gridContainer = new WebInspector.ViewWithResizeCallback(this._onViewportResize.bind(this));
    this._gridContainer.element.classList.add("fill");
    this._gridContainer.element.id = "resources-container-content";
    this._sidebarView.setMainView(this._gridContainer);
    this._timelineGrid = new WebInspector.TimelineGrid();
    this._itemsGraphsElement = this._timelineGrid.itemsGraphsElement;
    this._itemsGraphsElement.id = "timeline-graphs";
    this._gridContainer.element.appendChild(this._timelineGrid.element);
    this._timelineGrid.gridHeaderElement.id = "timeline-grid-header";
    this._timelineGrid.gridHeaderElement.classList.add("fill");
    this._memoryStatistics.setMainTimelineGrid(this._timelineGrid);
    this._timelineMemorySplitter.mainElement().appendChild(this._timelineGrid.gridHeaderElement);

    // Create gap elements
    this._topGapElement = this._itemsGraphsElement.createChild("div", "timeline-gap");
    this._graphRowsElement = this._itemsGraphsElement.createChild("div");
    this._bottomGapElement = this._itemsGraphsElement.createChild("div", "timeline-gap");
    this._expandElements = this._itemsGraphsElement.createChild("div");
    this._expandElements.id = "orphan-expand-elements";

    this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));

    this.element.addEventListener("mousemove", this._mouseMove.bind(this), false);
    this.element.addEventListener("mouseout", this._mouseOut.bind(this), false);
    this.element.addEventListener("keydown", this._keyDown.bind(this), false);

    this._expandOffset = 15;

    // Create gpu tasks containers.
    this._mainThreadTasks = /** @type {!Array.<!TimelineAgent.TimelineEvent>} */ ([]);
    this._gpuTasks = /** @type {!Array.<!TimelineAgent.TimelineEvent>} */ ([]);
    var utilizationStripsElement = this._timelineGrid.gridHeaderElement.createChild("div", "timeline-utilization-strips vbox");
    this._cpuBarsElement = utilizationStripsElement.createChild("div", "timeline-utilization-strip");
    if (WebInspector.experimentsSettings.gpuTimeline.isEnabled())
        this._gpuBarsElement = utilizationStripsElement.createChild("div", "timeline-utilization-strip gpu");

    this._windowStartTime = 0;
    this._windowEndTime = Infinity;

   this._allRecordsCount = 0;
    this._createOverviewControls();
}

WebInspector.TimelineView.prototype = {
    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    /**
     * @return {boolean}
     */
    supportsGlueParentMode: function()
    {
        return !this._frameMode;
    },

    _onGlueRecordsSettingChanged: function()
    {
        this._presentationModel.setGlueRecords(this._glueRecordsSetting.get());
        this._repopulateRecords();
    },

    /**
     * @return {number}
     */
    windowStartTime: function()
    {
        return this._windowStartTime || this._model.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    windowEndTime: function()
    {
        return this._windowEndTime < Infinity ? this._windowEndTime : this._model.maximumRecordTime();
    },

    _createOverviewControls: function()
    {
        this._overviewControls = {};
        this._overviewControls[WebInspector.TimelinePanel.Mode.Events] = new WebInspector.TimelineEventOverview(this._model);
        this._frameOverviewControl = new WebInspector.TimelineFrameOverview(this._model);
        this._overviewControls[WebInspector.TimelinePanel.Mode.Frames] = this._frameOverviewControl;
        this._overviewControls[WebInspector.TimelinePanel.Mode.Memory] = new WebInspector.TimelineMemoryOverview(this._model);
    },

    /**
     * @return {!WebInspector.TimelineOverviewBase}
     */
    overviewControl: function()
    {
        return this._overviewControls[this._currentMode];
    },

    /**
     * @param {!string} mode
     * @param {!WebInspector.TimelineOverviewPane} overviewPane
     */
    modeChanged: function(mode, overviewPane)
    {
        this._currentMode = mode;
        overviewPane.setOverviewControl(this.overviewControl());
        var frameMode = mode === WebInspector.TimelinePanel.Mode.Frames
        if (frameMode !== this._frameMode) {
            this._frameMode = frameMode;
            this._presentationModel.setGlueRecords(!this._frameMode && this._glueRecordsSetting.get());
            this._repopulateRecords();

            if (this._frameMode) {
                this._frameController = new WebInspector.TimelineFrameController(this._model, this._frameOverviewControl, this._presentationModel);
            } else {
                this._frameController.dispose();
                this._frameController = null;
            }
        }
        if (mode === WebInspector.TimelinePanel.Mode.Memory)
            this._timelineMemorySplitter.showBoth();
        else
            this._timelineMemorySplitter.showOnlyFirst();
        this._updateSelectionDetails();

        this._updateWindowBoundaries();
    },

    get calculator()
    {
        return this._calculator;
    },

    /**
     * @param {!WebInspector.FilterBar} filterBar
     * @return {boolean}
     */
    createFilters: function(filterBar)
    {
        this._textFilterUI = new WebInspector.TextFilterUI();
        this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._textFilterChanged, this);
        filterBar.addFilter(this._textFilterUI);

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
        this._durationFilterUI = new WebInspector.ComboBoxFilterUI(durationOptions);
        this._durationFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._durationFilterChanged, this);
        filterBar.addFilter(this._durationFilterUI);

        this._categoryFiltersUI = {};
        var categoryTypes = [];
        var categories = WebInspector.TimelinePresentationModel.categories();
        for (var categoryName in categories) {
            var category = categories[categoryName];
            if (category.overviewStripGroupIndex < 0)
                continue;
            var filter = new WebInspector.CheckboxFilterUI(category.name, category.title);
            filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._categoriesFilterChanged.bind(this, category.name), this);
            filterBar.addFilter(filter);
            this._categoryFiltersUI[category.name] = filter;
        }

        this._durationFilter = new WebInspector.TimelineIsLongFilter();
        this._windowFilter = new WebInspector.TimelineWindowFilter();

        this._presentationModel.addFilter(this._windowFilter);
        this._presentationModel.addFilter(new WebInspector.TimelineCategoryFilter());
        this._presentationModel.addFilter(this._durationFilter);

        return true;
    },

    _textFilterChanged: function(event)
    {
        var searchQuery = this._textFilterUI.value();
        this._presentationModel.setSearchFilter(null);
        delete this._searchFilter;

        function cleanRecord(record)
        {
            delete record.clicked;
        }
        WebInspector.TimelinePresentationModel.forAllRecords(this._presentationModel.rootRecord().children, cleanRecord);

        this.searchCanceled();
        if (searchQuery) {
            this._searchFilter = new WebInspector.TimelineSearchFilter(createPlainTextSearchRegex(searchQuery, "i"));
            this._presentationModel.setSearchFilter(this._searchFilter);
        }
        this._invalidateAndScheduleRefresh(true, true);
    },

    _durationFilterChanged: function()
    {
        var duration = this._durationFilterUI.value();
        var minimumRecordDuration = +duration / 1000.0;
        this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
        this._invalidateAndScheduleRefresh(true, true);
    },

    _categoriesFilterChanged: function(name, event)
    {
        var categories = WebInspector.TimelinePresentationModel.categories();
        categories[name].hidden = !this._categoryFiltersUI[name].checked();
        this._invalidateAndScheduleRefresh(true, true);
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

    _rootRecord: function()
    {
        return this._presentationModel.rootRecord();
    },

    _updateRecordsCounter: function(recordsInWindowCount)
    {
        this._panel.recordsCounter.setText(WebInspector.UIString("%d of %d records shown", recordsInWindowCount, this._allRecordsCount));
    },

    _updateFrameStatistics: function(frames)
    {
        this._lastFrameStatistics = frames.length ? new WebInspector.FrameStatistics(frames) : null;
    },

    _updateEventDividers: function()
    {
        this._timelineGrid.removeEventDividers();
        var clientWidth = this._graphRowsElementWidth;
        var dividers = [];
        var eventDividerRecords = this._presentationModel.eventDividerRecords();

        for (var i = 0; i < eventDividerRecords.length; ++i) {
            var record = eventDividerRecords[i];
            var positions = this._calculator.computeBarGraphWindowPosition(record);
            var dividerPosition = Math.round(positions.left);
            if (dividerPosition < 0 || dividerPosition >= clientWidth || dividers[dividerPosition])
                continue;
            var divider = WebInspector.TimelinePresentationModel.createEventDivider(record.type, record.title);
            divider.style.left = dividerPosition + "px";
            dividers[dividerPosition] = divider;
        }
        this._timelineGrid.addEventDividers(dividers);
    },

    _updateFrameBars: function(frames)
    {
        var clientWidth = this._graphRowsElementWidth;
        if (this._frameContainer)
            this._frameContainer.removeChildren();
        else {
            const frameContainerBorderWidth = 1;
            this._frameContainer = document.createElement("div");
            this._frameContainer.classList.add("fill");
            this._frameContainer.classList.add("timeline-frame-container");
            this._frameContainer.style.height = WebInspector.TimelinePanel.rowHeight + frameContainerBorderWidth + "px";
            this._frameContainer.addEventListener("dblclick", this._onFrameDoubleClicked.bind(this), false);
        }

        var dividers = [ this._frameContainer ];

        for (var i = 0; i < frames.length; ++i) {
            var frame = frames[i];
            var frameStart = this._calculator.computePosition(frame.startTime);
            var frameEnd = this._calculator.computePosition(frame.endTime);

            var frameStrip = document.createElement("div");
            frameStrip.className = "timeline-frame-strip";
            var actualStart = Math.max(frameStart, 0);
            var width = frameEnd - actualStart;
            frameStrip.style.left = actualStart + "px";
            frameStrip.style.width = width + "px";
            frameStrip._frame = frame;

            const minWidthForFrameInfo = 60;
            if (width > minWidthForFrameInfo)
                frameStrip.textContent = Number.secondsToString(frame.endTime - frame.startTime, true);

            this._frameContainer.appendChild(frameStrip);

            if (actualStart > 0) {
                var frameMarker = WebInspector.TimelinePresentationModel.createEventDivider(WebInspector.TimelineModel.RecordType.BeginFrame);
                frameMarker.style.left = frameStart + "px";
                dividers.push(frameMarker);
            }
        }
        this._timelineGrid.addEventDividers(dividers);
    },

    _onFrameDoubleClicked: function(event)
    {
        var frameBar = event.target.enclosingNodeOrSelfWithClass("timeline-frame-strip");
        if (!frameBar)
            return;
        this._setWindowTimes(frameBar._frame.startTime, frameBar._frame.endTime);
    },

    _updateWindowBoundaries: function()
    {
        var windowBoundaries = this.overviewControl().windowBoundaries(this._windowStartTime, this._windowEndTime);

        this._panel.setWindow(windowBoundaries.left, windowBoundaries.right);
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    _setWindowTimes: function(startTime, endTime)
    {
        this._windowStartTime = startTime;
        this._windowEndTime = endTime;
        this._windowFilter.setWindowTimes(startTime, endTime);
        var windowBoundaries = this.overviewControl().windowBoundaries(startTime, endTime);
        this._panel.setWindow(windowBoundaries.left, windowBoundaries.right);
    },

    _repopulateRecords: function()
    {
        this._resetView();
        this._automaticallySizeWindow = false;
        var records = this._model.records;
        for (var i = 0; i < records.length; ++i)
            this._innerAddRecordToTimeline(records[i]);
        this._invalidateAndScheduleRefresh(false, false);
    },

    _onTimelineEventRecorded: function(event)
    {
        if (this._innerAddRecordToTimeline(/** @type {!TimelineAgent.TimelineEvent} */(event.data)))
            this._invalidateAndScheduleRefresh(false, false);
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     * @return {boolean}
     */
    _innerAddRecordToTimeline: function(record)
    {
        if (record.type === WebInspector.TimelineModel.RecordType.Program)
            this._mainThreadTasks.push(record);

        if (record.type === WebInspector.TimelineModel.RecordType.GPUTask) {
            this._gpuTasks.push(record);
            return WebInspector.TimelineModel.startTimeInSeconds(record) < this._windowEndTime;
        }

        var records = this._presentationModel.addRecord(record);
        this._allRecordsCount += records.length;
        var hasVisibleRecords = false;
        var presentationModel = this._presentationModel;
        function checkVisible(record)
        {
            hasVisibleRecords |= presentationModel.isVisible(record);
        }
        WebInspector.TimelinePresentationModel.forAllRecords(records, checkVisible);

        function isAdoptedRecord(record)
        {
            return record.parent !== presentationModel.rootRecord;
        }
        // Tell caller update is necessary either if we added a visible record or if we re-parented a record.
        return hasVisibleRecords || records.some(isAdoptedRecord);
    },

    _sidebarResized: function()
    {
        var width = this._sidebarView.sidebarWidth();
        this._panel.setSidebarWidth(width);
        if (this._currentMode === WebInspector.TimelinePanel.Mode.Memory)
            this._memoryStatistics.setSidebarWidth(width);
        this._timelineGrid.gridHeaderElement.style.left = width + "px";
    },

    /**
     * @param {number} width
     */
    setSidebarWidth: function(width)
    {
        if (this._currentMode === WebInspector.TimelinePanel.Mode.Memory)
            this._sidebarView.setSidebarWidth(width);
    },

    _onViewportResize: function()
    {
        this._resize(this._sidebarView.sidebarWidth());
    },

    /**
     * @param {number} sidebarWidth
     */
    _resize: function(sidebarWidth)
    {
        this._closeRecordDetails();
        this._graphRowsElementWidth = this._graphRowsElement.offsetWidth;
        this._containerElementHeight = this._containerElement.clientHeight;
        this._timelineGrid.gridHeaderElement.style.width = this._itemsGraphsElement.offsetWidth + "px";
        this._scheduleRefresh(false, true);
    },

    _resetView: function()
    {
        this._presentationModel.reset();
        this._boundariesAreValid = false;
        this._adjustScrollPosition(0);
        this._closeRecordDetails();
        this._allRecordsCount = 0;
        this._automaticallySizeWindow = true;
        this._mainThreadTasks = [];
        this._gpuTasks = [];
    },

    _onRecordsCleared: function()
    {
        this._windowStartTime = 0;
        this._windowEndTime = Infinity;

        this._resetView();
        this._windowFilter.reset();
        this._invalidateAndScheduleRefresh(true, true);
    },

    /**
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [this._containerElement];
    },

    wasShown: function()
    {
        WebInspector.View.prototype.wasShown.call(this);
        if (!WebInspector.TimelinePanel._categoryStylesInitialized) {
            WebInspector.TimelinePanel._categoryStylesInitialized = true;
            this._injectCategoryStyles();
        }
        this._onViewportResize();
        this._refresh();
    },

    willHide: function()
    {
        this._closeRecordDetails();
        WebInspector.View.prototype.willHide.call(this);
    },

    _onScroll: function(event)
    {
        this._closeRecordDetails();
        this._scrollTop = this._containerElement.scrollTop;
        var dividersTop = Math.max(0, this._scrollTop);
        this._timelineGrid.setScrollAndDividerTop(this._scrollTop, dividersTop);
        this._scheduleRefresh(true, true);
    },

    /**
     * @param {boolean} preserveBoundaries
     * @param {boolean} userGesture
     */
    _invalidateAndScheduleRefresh: function(preserveBoundaries, userGesture)
    {
        this._presentationModel.invalidateFilteredRecords();
        delete this._searchResults;
        this._scheduleRefresh(preserveBoundaries, userGesture);
    },

    /**
     * @param {?WebInspector.TimelinePresentationModel.Record} record
     */
    _selectRecord: function(record)
    {
        if (record === this._lastSelectedRecord)
            return;

        // Remove selection rendering.
        if (this._lastSelectedRecord) {
            var listRow = /** @type {!WebInspector.TimelineRecordListRow} */ (this._lastSelectedRecord.getUserObject("WebInspector.TimelineRecordListRow"));
            if (listRow)
                listRow.renderAsSelected(false);
            var graphRow = /** @type {!WebInspector.TimelineRecordGraphRow} */ (this._lastSelectedRecord.getUserObject("WebInspector.TimelineRecordGraphRow"));
            if (graphRow)
                graphRow.renderAsSelected(false);
        }

        if (!record) {
            this._updateSelectionDetails();
            return;
        }

        this._lastSelectedRecord = record;
        this._revealRecord(record);
        var listRow = /** @type {!WebInspector.TimelineRecordListRow} */ (record.getUserObject("WebInspector.TimelineRecordListRow"));
        if (listRow)
            listRow.renderAsSelected(true);
        var graphRow = /** @type {!WebInspector.TimelineRecordListRow} */ (record.getUserObject("WebInspector.TimelineRecordGraphRow"));
        if (graphRow)
            graphRow.renderAsSelected(true);

        record.generatePopupContent(showCallback.bind(this));

        /**
         * @param {!DocumentFragment} element
         * @this {WebInspector.TimelineView}
         */
        function showCallback(element)
        {
            this._detailsView.setContent(record.title, element);
        }
    },

    _updateSelectionDetails: function()
    {
        var startTime = this.windowStartTime() * 1000;
        var endTime = this.windowEndTime() * 1000;
        // Return early in case 0 selection window.
        if (startTime < 0)
            return;

        var aggregatedStats = {};

        /**
         * @param {number} value
         * @param {!TimelineAgent.TimelineEvent} task
         * @return {number}
         */
        function compareEndTime(value, task)
        {
            return value < task.endTime ? -1 : 1;
        }

        /**
         * @param {!TimelineAgent.TimelineEvent} rawRecord
         */
        function aggregateTimeForRecordWithinWindow(rawRecord)
        {
            if (!rawRecord.endTime || rawRecord.endTime < startTime || rawRecord.startTime > endTime)
                return;

            var childrenTime = 0;
            var children = rawRecord.children || [];
            for (var i = 0; i < children.length; ++i) {
                var child = children[i];
                if (!child.endTime || child.endTime < startTime || child.startTime > endTime)
                    continue;
                childrenTime += Math.min(endTime, child.endTime) - Math.max(startTime, child.startTime);
                aggregateTimeForRecordWithinWindow(child);
            }
            var categoryName = WebInspector.TimelinePresentationModel.categoryForRecord(rawRecord).name;
            var ownTime = Math.min(endTime, rawRecord.endTime) - Math.max(startTime, rawRecord.startTime) - childrenTime;
            aggregatedStats[categoryName] = (aggregatedStats[categoryName] || 0) + ownTime / 1000;
        }

        var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, this._mainThreadTasks, compareEndTime);
        for (; taskIndex < this._mainThreadTasks.length; ++taskIndex) {
            var task = this._mainThreadTasks[taskIndex];
            if (task.startTime > endTime)
                break;
            aggregateTimeForRecordWithinWindow(task);
        }

        var aggregatedTotal = 0;
        for (var categoryName in aggregatedStats)
            aggregatedTotal += aggregatedStats[categoryName];
        aggregatedStats["idle"] = Math.max(0, (endTime - startTime) / 1000 - aggregatedTotal);

        var fragment = document.createDocumentFragment();
        var pie = WebInspector.TimelinePresentationModel.generatePieChart(aggregatedStats);
        fragment.appendChild(pie.element);

        if (this._frameMode && this._lastFrameStatistics) {
            var title = WebInspector.UIString("%s \u2013 %s (%d frames)", Number.secondsToString(this._lastFrameStatistics.startOffset, true), Number.secondsToString(this._lastFrameStatistics.endOffset, true), this._lastFrameStatistics.frameCount);
            fragment.appendChild(WebInspector.TimelinePresentationModel.generatePopupContentForFrameStatistics(this._lastFrameStatistics));
        } else {
            var title = WebInspector.UIString("%s \u2013 %s", this._calculator.formatTime(0, true), this._calculator.formatTime(this._calculator.boundarySpan(), true));
        }
        this._detailsView.setContent(title, fragment);
    },

    /**
     * @param {number} left
     * @param {number} right
     */
    windowChanged: function(left, right)
    {
        var windowTimes = this.overviewControl().windowTimes(left, right);
        this._windowStartTime = windowTimes.startTime;
        this._windowEndTime = windowTimes.endTime;
        this._windowFilter.setWindowTimes(windowTimes.startTime, windowTimes.endTime);
        this._invalidateAndScheduleRefresh(false, true);
        this._selectRecord(null);
    },

    /**
     * @param {boolean} preserveBoundaries
     * @param {boolean} userGesture
     */
    _scheduleRefresh: function(preserveBoundaries, userGesture)
    {
        this._closeRecordDetails();
        this._boundariesAreValid &= preserveBoundaries;

        if (!this.isShowing())
            return;

        if (preserveBoundaries || userGesture)
            this._refresh();
        else {
            if (!this._refreshTimeout)
                this._refreshTimeout = setTimeout(this._refresh.bind(this), 300);
        }
    },

    _refresh: function()
    {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            delete this._refreshTimeout;
        }

        this._timelinePaddingLeft = this._expandOffset;
        this._calculator.setWindow(this.windowStartTime(), this.windowEndTime());
        this._calculator.setDisplayWindow(this._timelinePaddingLeft, this._graphRowsElementWidth);

        var recordsInWindowCount = this._refreshRecords();
        this._updateRecordsCounter(recordsInWindowCount);
        if (!this._boundariesAreValid) {
            this._updateEventDividers();
            var frames = this._frameController && this._presentationModel.filteredFrames(this.windowStartTime(), this.windowEndTime());
            if (frames) {
                this._updateFrameStatistics(frames);
                const maxFramesForFrameBars = 30;
                if  (frames.length && frames.length < maxFramesForFrameBars) {
                    this._timelineGrid.removeDividers();
                    this._updateFrameBars(frames);
                } else
                    this._timelineGrid.updateDividers(this._calculator);
            } else
                this._timelineGrid.updateDividers(this._calculator);
            this._refreshAllUtilizationBars();
        }
        if (this._currentMode === WebInspector.TimelinePanel.Mode.Memory)
            this._memoryStatistics.refresh();
        this._updateWindowBoundaries();
        this._boundariesAreValid = true;
    },

    revealRecordAt: function(time)
    {
        var recordToReveal;
        function findRecordToReveal(record)
        {
            if (record.containsTime(time)) {
                recordToReveal = record;
                return true;
            }
            // If there is no record containing the time than use the latest one before that time.
            if (!recordToReveal || record.endTime < time && recordToReveal.endTime < record.endTime)
                recordToReveal = record;
            return false;
        }
        WebInspector.TimelinePresentationModel.forAllRecords(this._presentationModel.rootRecord().children, null, findRecordToReveal);

        // The record ends before the window left bound so scroll to the top.
        if (!recordToReveal) {
            this._containerElement.scrollTop = 0;
            return;
        }

        this._selectRecord(recordToReveal);
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} recordToReveal
     */
    _revealRecord: function(recordToReveal)
    {
        var needRefresh = false;
        // Expand all ancestors.
        for (var parent = recordToReveal.parent; parent !== this._rootRecord(); parent = parent.parent) {
            if (!parent.collapsed)
                continue;
            this._presentationModel.invalidateFilteredRecords();
            parent.collapsed = false;
            needRefresh = true;
        }
        var recordsInWindow = this._presentationModel.filteredRecords();
        var index = recordsInWindow.indexOf(recordToReveal);

        var itemOffset = index * WebInspector.TimelinePanel.rowHeight;
        var visibleTop = this._scrollTop - WebInspector.TimelinePanel.headerHeight;
        var visibleBottom = visibleTop + this._containerElementHeight - WebInspector.TimelinePanel.rowHeight;
        if (itemOffset < visibleTop)
            this._containerElement.scrollTop = itemOffset;
        else if (itemOffset > visibleBottom)
            this._containerElement.scrollTop = itemOffset - this._containerElementHeight + WebInspector.TimelinePanel.headerHeight + WebInspector.TimelinePanel.rowHeight;
        else if (needRefresh)
            this._refreshRecords();
    },

    _refreshRecords: function()
    {
        var recordsInWindow = this._presentationModel.filteredRecords();

        // Calculate the visible area.
        var visibleTop = this._scrollTop;
        var visibleBottom = visibleTop + this._containerElementHeight;

        var rowHeight = WebInspector.TimelinePanel.rowHeight;
        var headerHeight = WebInspector.TimelinePanel.headerHeight;

        // Convert visible area to visible indexes. Always include top-level record for a visible nested record.
        var startIndex = Math.max(0, Math.min(Math.floor((visibleTop - headerHeight) / rowHeight), recordsInWindow.length - 1));
        var endIndex = Math.min(recordsInWindow.length, Math.ceil(visibleBottom / rowHeight));
        var lastVisibleLine = Math.max(0, Math.floor((visibleBottom - headerHeight) / rowHeight));
        if (this._automaticallySizeWindow && recordsInWindow.length > lastVisibleLine) {
            this._automaticallySizeWindow = false;
            // If we're at the top, always use real timeline start as a left window bound so that expansion arrow padding logic works.
            var windowStartTime = startIndex ? recordsInWindow[startIndex].startTime : this._model.minimumRecordTime();
            this._setWindowTimes(windowStartTime, recordsInWindow[Math.max(0, lastVisibleLine - 1)].endTime);
            recordsInWindow = this._presentationModel.filteredRecords();
            endIndex = Math.min(recordsInWindow.length, lastVisibleLine);
        } else {
            this._updateWindowBoundaries();
        }

        // Resize gaps first.
        this._topGapElement.style.height = (startIndex * rowHeight) + "px";
        this._sidebarView.sidebarElement().firstChild.style.flexBasis = (startIndex * rowHeight + headerHeight) + "px";
        this._bottomGapElement.style.height = (recordsInWindow.length - endIndex) * rowHeight + "px";
        var rowsHeight = headerHeight + recordsInWindow.length * rowHeight;
        var totalHeight = Math.max(this._containerElementHeight, rowsHeight);

        this._sidebarView.firstElement().style.height = totalHeight + "px";
        this._sidebarView.secondElement().style.height = totalHeight + "px";
        this._sidebarView.resizerElement().style.height = totalHeight + "px";

        // Update visible rows.
        var listRowElement = this._sidebarListElement.firstChild;
        var width = this._graphRowsElementWidth;
        this._itemsGraphsElement.removeChild(this._graphRowsElement);
        var graphRowElement = this._graphRowsElement.firstChild;
        var scheduleRefreshCallback = this._invalidateAndScheduleRefresh.bind(this, true, true);
        var selectRecordCallback = this._selectRecord.bind(this);
        this._itemsGraphsElement.removeChild(this._expandElements);
        this._expandElements.removeChildren();

        for (var i = 0; i < endIndex; ++i) {
            var record = recordsInWindow[i];

            if (i < startIndex) {
                var lastChildIndex = i + record.visibleChildrenCount;
                if (lastChildIndex >= startIndex && lastChildIndex < endIndex) {
                    var expandElement = new WebInspector.TimelineExpandableElement(this._expandElements);
                    var positions = this._calculator.computeBarGraphWindowPosition(record);
                    expandElement._update(record, i, positions.left - this._expandOffset, positions.width);
                }
            } else {
                if (!listRowElement) {
                    listRowElement = new WebInspector.TimelineRecordListRow(selectRecordCallback, scheduleRefreshCallback).element;
                    this._sidebarListElement.appendChild(listRowElement);
                }
                if (!graphRowElement) {
                    graphRowElement = new WebInspector.TimelineRecordGraphRow(this._itemsGraphsElement, selectRecordCallback, scheduleRefreshCallback).element;
                    this._graphRowsElement.appendChild(graphRowElement);
                }

                listRowElement.row.update(record, visibleTop);
                graphRowElement.row.update(record, this._calculator, this._expandOffset, i);
                if (this._lastSelectedRecord === record) {
                    listRowElement.row.renderAsSelected(true);
                    graphRowElement.row.renderAsSelected(true);
                }

                listRowElement = listRowElement.nextSibling;
                graphRowElement = graphRowElement.nextSibling;
            }
        }

        // Remove extra rows.
        while (listRowElement) {
            var nextElement = listRowElement.nextSibling;
            listRowElement.row.dispose();
            listRowElement = nextElement;
        }
        while (graphRowElement) {
            var nextElement = graphRowElement.nextSibling;
            graphRowElement.row.dispose();
            graphRowElement = nextElement;
        }

        this._itemsGraphsElement.insertBefore(this._graphRowsElement, this._bottomGapElement);
        this._itemsGraphsElement.appendChild(this._expandElements);
        this._adjustScrollPosition(recordsInWindow.length * rowHeight + headerHeight);
        this._updateSearchHighlight(false, true);

        return recordsInWindow.length;
    },

    _refreshAllUtilizationBars: function()
    {
        this._refreshUtilizationBars(WebInspector.UIString("CPU"), this._mainThreadTasks, this._cpuBarsElement);
        if (WebInspector.experimentsSettings.gpuTimeline.isEnabled())
            this._refreshUtilizationBars(WebInspector.UIString("GPU"), this._gpuTasks, this._gpuBarsElement);
    },

    /**
     * @param {string} name
     * @param {!Array.<!TimelineAgent.TimelineEvent>} tasks
     * @param {?Element} container
     */
    _refreshUtilizationBars: function(name, tasks, container)
    {
        if (!container)
            return;

        const barOffset = 3;
        const minGap = 3;

        var minWidth = WebInspector.TimelineCalculator._minWidth;
        var widthAdjustment = minWidth / 2;

        var width = this._graphRowsElementWidth;
        var boundarySpan = this.windowEndTime() - this.windowStartTime();
        var scale = boundarySpan / (width - minWidth - this._timelinePaddingLeft);
        var startTime = (this.windowStartTime() - this._timelinePaddingLeft * scale) * 1000;
        var endTime = startTime + width * scale * 1000;

        /**
         * @param {number} value
         * @param {!TimelineAgent.TimelineEvent} task
         * @return {number}
         */
        function compareEndTime(value, task)
        {
            return value < task.endTime ? -1 : 1;
        }

        var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, tasks, compareEndTime);

        var foreignStyle = "gpu-task-foreign";
        var element = container.firstChild;
        var lastElement;
        var lastLeft;
        var lastRight;

        for (; taskIndex < tasks.length; ++taskIndex) {
            var task = tasks[taskIndex];
            if (task.startTime > endTime)
                break;

            var left = Math.max(0, this._calculator.computePosition(WebInspector.TimelineModel.startTimeInSeconds(task)) + barOffset - widthAdjustment);
            var right = Math.min(width, this._calculator.computePosition(WebInspector.TimelineModel.endTimeInSeconds(task)) + barOffset + widthAdjustment);

            if (lastElement) {
                var gap = Math.floor(left) - Math.ceil(lastRight);
                if (gap < minGap) {
                    if (!task.data["foreign"])
                        lastElement.classList.remove(foreignStyle);
                    lastRight = right;
                    lastElement._tasksInfo.lastTaskIndex = taskIndex;
                    continue;
                }
                lastElement.style.width = (lastRight - lastLeft) + "px";
            }

            if (!element)
                element = container.createChild("div", "timeline-graph-bar");
            element.style.left = left + "px";
            element._tasksInfo = {name: name, tasks: tasks, firstTaskIndex: taskIndex, lastTaskIndex: taskIndex};
            if (task.data["foreign"])
                element.classList.add(foreignStyle);
            lastLeft = left;
            lastRight = right;
            lastElement = element;
            element = element.nextSibling;
        }

        if (lastElement)
            lastElement.style.width = (lastRight - lastLeft) + "px";

        while (element) {
            var nextElement = element.nextSibling;
            element._tasksInfo = null;
            container.removeChild(element);
            element = nextElement;
        }
    },

    _adjustScrollPosition: function(totalHeight)
    {
        // Prevent the container from being scrolled off the end.
        if ((this._scrollTop + this._containerElementHeight) > totalHeight + 1)
            this._containerElement.scrollTop = (totalHeight - this._containerElement.offsetHeight);
    },

    _getPopoverAnchor: function(element)
    {
        var anchor = element.enclosingNodeOrSelfWithClass("timeline-graph-bar");
        if (anchor && anchor._tasksInfo)
            return anchor;
        return element.enclosingNodeOrSelfWithClass("timeline-frame-strip");
    },

    _mouseOut: function()
    {
        this._hideQuadHighlight();
    },

    /**
     * @param {?Event} e
     */
    _mouseMove: function(e)
    {
        var rowElement = e.target.enclosingNodeOrSelfWithClass("timeline-tree-item");
        if (rowElement && rowElement.row && rowElement.row._record.highlightQuad)
            this._highlightQuad(rowElement.row._record.highlightQuad);
        else
            this._hideQuadHighlight();

        var taskBarElement = e.target.enclosingNodeOrSelfWithClass("timeline-graph-bar");
        if (taskBarElement && taskBarElement._tasksInfo) {
            var offset = taskBarElement.offsetLeft;
            this._timelineGrid.showCurtains(offset >= 0 ? offset : 0, taskBarElement.offsetWidth);
        } else
            this._timelineGrid.hideCurtains();
    },

    /**
     * @param {?Event} event
     */
    _keyDown: function(event)
    {
        if (!this._lastSelectedRecord || event.shiftKey || event.metaKey || event.ctrlKey)
            return;

        var record = this._lastSelectedRecord;
        var recordsInWindow = this._presentationModel.filteredRecords();
        var index = recordsInWindow.indexOf(record);
        var recordsInPage = Math.floor(this._containerElementHeight / WebInspector.TimelinePanel.rowHeight);
        var rowHeight = WebInspector.TimelinePanel.rowHeight;

        if (index === -1)
            index = 0;

        switch (event.keyIdentifier) {
        case "Left":
            if (record.parent) {
                if ((!record.expandable || record.collapsed) && record.parent !== this._presentationModel.rootRecord()) {
                    this._selectRecord(record.parent);
                } else {
                    record.collapsed = true;
                    record.clicked = true;
                    this._invalidateAndScheduleRefresh(true, true);
                }
            }
            event.consume(true);
            break;
        case "Up":
            if (--index < 0)
                break;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        case "Right":
            if (record.expandable && record.collapsed) {
                record.collapsed = false;
                record.clicked = true;
                this._invalidateAndScheduleRefresh(true, true);
            } else {
                if (++index >= recordsInWindow.length)
                    break;
                this._selectRecord(recordsInWindow[index]);
            }
            event.consume(true);
            break;
        case "Down":
            if (++index >= recordsInWindow.length)
                break;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        case "PageUp":
            index = Math.max(0, index - recordsInPage);
            this._scrollTop = Math.max(0, this._scrollTop - recordsInPage * rowHeight);
            this._containerElement.scrollTop = this._scrollTop;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        case "PageDown":
            index = Math.min(recordsInWindow.length - 1, index + recordsInPage);
            this._scrollTop = Math.min(this._containerElement.scrollHeight - this._containerElementHeight, this._scrollTop + recordsInPage * rowHeight);
            this._containerElement.scrollTop = this._scrollTop;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        case "Home":
            index = 0;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        case "End":
            index = recordsInWindow.length - 1;
            this._selectRecord(recordsInWindow[index]);
            event.consume(true);
            break;
        }
    },

    /**
     * @param {!Array.<number>} quad
     */
    _highlightQuad: function(quad)
    {
        if (this._highlightedQuad === quad)
            return;
        this._highlightedQuad = quad;
        DOMAgent.highlightQuad(quad, WebInspector.Color.PageHighlight.Content.toProtocolRGBA(), WebInspector.Color.PageHighlight.ContentOutline.toProtocolRGBA());
    },

    _hideQuadHighlight: function()
    {
        if (this._highlightedQuad) {
            delete this._highlightedQuad;
            DOMAgent.hideHighlight();
        }
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        if (anchor.classList.contains("timeline-frame-strip")) {
            var frame = anchor._frame;
            popover.show(WebInspector.TimelinePresentationModel.generatePopupContentForFrame(frame), anchor);
        } else {
            if (anchor.row && anchor.row._record)
                anchor.row._record.generatePopupContent(showCallback);
            else if (anchor._tasksInfo)
                popover.show(this._presentationModel.generateMainThreadBarPopupContent(anchor._tasksInfo), anchor, null, null, WebInspector.Popover.Orientation.Bottom);
        }

        function showCallback(popupContent)
        {
            popover.show(popupContent, anchor);
        }
    },

    _closeRecordDetails: function()
    {
        this._popoverHelper.hidePopover();
    },

    _injectCategoryStyles: function()
    {
        var style = document.createElement("style");
        var categories = WebInspector.TimelinePresentationModel.categories();

        style.textContent = Object.values(categories).map(WebInspector.TimelinePresentationModel.createStyleRuleForCategory).join("\n");
        document.head.appendChild(style);
    },

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
        this._highlightSelectedSearchResult(true);
    },

    _selectSearchResult: function(index)
    {
        this._selectedSearchResult = this._searchResults[index];
        this._searchableView.updateCurrentMatchIndex(index);
    },

    /**
     * @param {boolean} selectRecord
     */
    _highlightSelectedSearchResult: function(selectRecord)
    {
        this._clearHighlight();
        if (this._searchFilter)
            return;

        var record = this._selectedSearchResult;
        if (!record)
            return;

        if (selectRecord)
            this._selectRecord(record);

        for (var element = this._sidebarListElement.firstChild; element; element = element.nextSibling) {
            if (element.row._record === record) {
                element.row.highlight(this._searchRegExp, this._highlightDomChanges);
                break;
            }
        }
    },

    _clearHighlight: function()
    {
        if (this._highlightDomChanges)
            WebInspector.revertDomChanges(this._highlightDomChanges);
        this._highlightDomChanges = [];
    },

    /**
     * @param {boolean} revealRecord
     * @param {boolean} shouldJump
     */
    _updateSearchHighlight: function(revealRecord, shouldJump)
    {
        if (this._searchFilter || !this._searchRegExp) {
            this._clearHighlight();
            return;
        }

        if (!this._searchResults)
            this._updateSearchResults(shouldJump);
        this._highlightSelectedSearchResult(revealRecord);
    },

    _updateSearchResults: function(shouldJump)
    {
        var searchRegExp = this._searchRegExp;
        if (!searchRegExp)
            return;

        var matches = [];
        var presentationModel = this._presentationModel;

        function processRecord(record)
        {
            if (presentationModel.isVisible(record) && WebInspector.TimelineRecordListRow.testContentMatching(record, searchRegExp))
                matches.push(record);
            return false;
        }
        WebInspector.TimelinePresentationModel.forAllRecords(presentationModel.rootRecord().children, processRecord);

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
        delete this._searchRegExp;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump)
    {
        this._searchRegExp = createPlainTextSearchRegex(query, "i");
        delete this._searchResults;
        this._updateSearchHighlight(true, shouldJump);
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @param {!WebInspector.TimelineModel} model
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.TimelineCalculator = function(model)
{
    this._model = model;
}

WebInspector.TimelineCalculator._minWidth = 5;

WebInspector.TimelineCalculator.prototype = {
    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea + this.paddingLeft;
    },

    /**
     * @return {!{start: number, end: number, endWithChildren: number, cpuWidth: number}}
     */
    computeBarGraphPercentages: function(record)
    {
        var start = (record.startTime - this._minimumBoundary) / this.boundarySpan() * 100;
        var end = (record.startTime + record.selfTime - this._minimumBoundary) / this.boundarySpan() * 100;
        var endWithChildren = (record.lastChildEndTime - this._minimumBoundary) / this.boundarySpan() * 100;
        var cpuWidth = record.coalesced ? endWithChildren - start : record.cpuTime / this.boundarySpan() * 100;
        return {start: start, end: end, endWithChildren: endWithChildren, cpuWidth: cpuWidth};
    },

    /**
     * @return {!{left: number, width: number, widthWithChildren: number, cpuWidth: number}}
     */
    computeBarGraphWindowPosition: function(record)
    {
        var percentages = this.computeBarGraphPercentages(record);
        var widthAdjustment = 0;

        var left = this.computePosition(record.startTime);
        var width = (percentages.end - percentages.start) / 100 * this._workingArea;
        if (width < WebInspector.TimelineCalculator._minWidth) {
            widthAdjustment = WebInspector.TimelineCalculator._minWidth - width;
            width = WebInspector.TimelineCalculator._minWidth;
        }
        var widthWithChildren = (percentages.endWithChildren - percentages.start) / 100 * this._workingArea + widthAdjustment;
        var cpuWidth = percentages.cpuWidth / 100 * this._workingArea + widthAdjustment;
        if (percentages.endWithChildren > percentages.end)
            widthWithChildren += widthAdjustment;
        return {left: left, width: width, widthWithChildren: widthWithChildren, cpuWidth: cpuWidth};
    },

    setWindow: function(minimumBoundary, maximumBoundary)
    {
        this._minimumBoundary = minimumBoundary;
        this._maximumBoundary = maximumBoundary;
    },

    /**
     * @param {number} paddingLeft
     * @param {number} clientWidth
     */
    setDisplayWindow: function(paddingLeft, clientWidth)
    {
        this._workingArea = clientWidth - WebInspector.TimelineCalculator._minWidth - paddingLeft;
        this.paddingLeft = paddingLeft;
    },

    /**
     * @param {number} value
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        return Number.secondsToString(value + this._minimumBoundary - this._model.minimumRecordTime(), hires);
    },

    /**
     * @return {number}
     */
    maximumBoundary: function()
    {
        return this._maximumBoundary;
    },

    /**
     * @return {number}
     */
    minimumBoundary: function()
    {
        return this._minimumBoundary;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._model.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    boundarySpan: function()
    {
        return this._maximumBoundary - this._minimumBoundary;
    }
}

/**
 * @constructor
 * @param {function(!WebInspector.TimelinePresentationModel.Record)} selectRecord
 * @param {function()} scheduleRefresh
 */
WebInspector.TimelineRecordListRow = function(selectRecord, scheduleRefresh)
{
    this.element = document.createElement("div");
    this.element.row = this;
    this.element.style.cursor = "pointer";
    this.element.addEventListener("click", this._onClick.bind(this), false);
    this.element.addEventListener("mouseover", this._onMouseOver.bind(this), false);
    this.element.addEventListener("mouseout", this._onMouseOut.bind(this), false);

    // Warning is float right block, it goes first.
    this._warningElement = this.element.createChild("div", "timeline-tree-item-warning hidden");

    this._expandArrowElement = this.element.createChild("div", "timeline-tree-item-expand-arrow");
    this._expandArrowElement.addEventListener("click", this._onExpandClick.bind(this), false);
    var iconElement = this.element.createChild("span", "timeline-tree-icon");
    this._typeElement = this.element.createChild("span", "type");

    this._dataElement = this.element.createChild("span", "data dimmed");
    this._scheduleRefresh = scheduleRefresh;
    this._selectRecord = selectRecord;
}

WebInspector.TimelineRecordListRow.prototype = {
    update: function(record, offset)
    {
        this._record = record;
        this._offset = offset;

        this.element.className = "timeline-tree-item timeline-category-" + record.category.name;
        var paddingLeft = 5;
        var step = -3;
        for (var currentRecord = record.parent ? record.parent.parent : null; currentRecord; currentRecord = currentRecord.parent)
            paddingLeft += 12 / (Math.max(1, step++));
        this.element.style.paddingLeft = paddingLeft + "px";
        if (record.isBackground)
            this.element.classList.add("background");

        this._typeElement.textContent = record.title;

        if (this._dataElement.firstChild)
            this._dataElement.removeChildren();

        this._warningElement.enableStyleClass("hidden", !record.hasWarnings() && !record.childHasWarnings());
        this._warningElement.enableStyleClass("timeline-tree-item-child-warning", record.childHasWarnings() && !record.hasWarnings());

        if (record.detailsNode())
            this._dataElement.appendChild(record.detailsNode());
        this._expandArrowElement.enableStyleClass("parent", record.children && record.children.length);
        this._expandArrowElement.enableStyleClass("expanded", record.visibleChildrenCount);
        this._record.setUserObject("WebInspector.TimelineRecordListRow", this);
    },

    highlight: function(regExp, domChanges)
    {
        var matchInfo = this.element.textContent.match(regExp);
        if (matchInfo)
            WebInspector.highlightSearchResult(this.element, matchInfo.index, matchInfo[0].length, domChanges);
    },

    dispose: function()
    {
        this.element.remove();
    },

    /**
     * @param {!Event} event
     */
    _onExpandClick: function(event)
    {
        this._record.collapsed = !this._record.collapsed;
        this._record.clicked = true;
        this._scheduleRefresh();
        event.consume(true);
    },

    /**
     * @param {?Event} event
     */
    _onClick: function(event)
    {
        this._selectRecord(this._record);
    },

    /**
     * @param {boolean} selected
     */
    renderAsSelected: function(selected)
    {
        this.element.enableStyleClass("selected", selected);
    },

    /**
     * @param {?Event} event
     */
    _onMouseOver: function(event)
    {
        this.element.classList.add("hovered");
        var graphRow = /** @type {!WebInspector.TimelineRecordGraphRow} */ (this._record.getUserObject("WebInspector.TimelineRecordGraphRow"));
        graphRow.element.classList.add("hovered");
    },

    /**
     * @param {?Event} event
     */
    _onMouseOut: function(event)
    {
        this.element.classList.remove("hovered");
        var graphRow = /** @type {!WebInspector.TimelineRecordGraphRow} */ (this._record.getUserObject("WebInspector.TimelineRecordGraphRow"));
        graphRow.element.classList.remove("hovered");
    }
}

/**
 * @param {!WebInspector.TimelinePresentationModel.Record} record
 * @param {!RegExp} regExp
 */
WebInspector.TimelineRecordListRow.testContentMatching = function(record, regExp)
{
    var toSearchText = record.title;
    if (record.detailsNode())
        toSearchText += " " + record.detailsNode().textContent;
    return regExp.test(toSearchText);
}

/**
 * @constructor
 * @param {function(!WebInspector.TimelinePresentationModel.Record)} selectRecord
 * @param {function()} scheduleRefresh
 */
WebInspector.TimelineRecordGraphRow = function(graphContainer, selectRecord, scheduleRefresh)
{
    this.element = document.createElement("div");
    this.element.row = this;
    this.element.addEventListener("mouseover", this._onMouseOver.bind(this), false);
    this.element.addEventListener("mouseout", this._onMouseOut.bind(this), false);
    this.element.addEventListener("click", this._onClick.bind(this), false);

    this._barAreaElement = document.createElement("div");
    this._barAreaElement.className = "timeline-graph-bar-area";
    this.element.appendChild(this._barAreaElement);

    this._barWithChildrenElement = document.createElement("div");
    this._barWithChildrenElement.className = "timeline-graph-bar with-children";
    this._barWithChildrenElement.row = this;
    this._barAreaElement.appendChild(this._barWithChildrenElement);

    this._barCpuElement = document.createElement("div");
    this._barCpuElement.className = "timeline-graph-bar cpu"
    this._barCpuElement.row = this;
    this._barAreaElement.appendChild(this._barCpuElement);

    this._barElement = document.createElement("div");
    this._barElement.className = "timeline-graph-bar";
    this._barElement.row = this;
    this._barAreaElement.appendChild(this._barElement);

    this._expandElement = new WebInspector.TimelineExpandableElement(graphContainer);

    this._selectRecord = selectRecord;
    this._scheduleRefresh = scheduleRefresh;
}

WebInspector.TimelineRecordGraphRow.prototype = {
    update: function(record, calculator, expandOffset, index)
    {
        this._record = record;
        this.element.className = "timeline-graph-side timeline-category-" + record.category.name;
        if (record.isBackground)
            this.element.classList.add("background");

        var barPosition = calculator.computeBarGraphWindowPosition(record);
        this._barWithChildrenElement.style.left = barPosition.left + "px";
        this._barWithChildrenElement.style.width = barPosition.widthWithChildren + "px";
        this._barElement.style.left = barPosition.left + "px";
        this._barElement.style.width = barPosition.width + "px";
        this._barCpuElement.style.left = barPosition.left + "px";
        this._barCpuElement.style.width = barPosition.cpuWidth + "px";
        this._expandElement._update(record, index, barPosition.left - expandOffset, barPosition.width);

        this._record.setUserObject("WebInspector.TimelineRecordGraphRow", this);
    },

    /**
     * @param {?Event} event
     */
    _onClick: function(event)
    {
        // check if we click arrow and expand if yes.
        if (this._expandElement._arrow.containsEventPoint(event))
            this._expand();
        this._selectRecord(this._record);
    },

    /**
     * @param {boolean} selected
     */
    renderAsSelected: function(selected)
    {
        this.element.enableStyleClass("selected", selected);
    },

    _expand: function()
    {
        this._record.collapsed = !this._record.collapsed;
        this._record.clicked = true;
        this._scheduleRefresh();
    },

    /**
     * @param {?Event} event
     */
    _onMouseOver: function(event)
    {
        this.element.classList.add("hovered");
        var listRow = /** @type {!WebInspector.TimelineRecordListRow} */ (this._record.getUserObject("WebInspector.TimelineRecordListRow"));
        listRow.element.classList.add("hovered");
    },

    /**
     * @param {?Event} event
     */
    _onMouseOut: function(event)
    {
        this.element.classList.remove("hovered");
        var listRow = /** @type {!WebInspector.TimelineRecordListRow} */ (this._record.getUserObject("WebInspector.TimelineRecordListRow"));
        listRow.element.classList.remove("hovered");
    },

    dispose: function()
    {
        this.element.remove();
        this._expandElement._dispose();
    }
}

/**
 * @constructor
 */
WebInspector.TimelineExpandableElement = function(container)
{
    this._element = container.createChild("div", "timeline-expandable");
    this._element.createChild("div", "timeline-expandable-left");
    this._arrow = this._element.createChild("div", "timeline-expandable-arrow");
}

WebInspector.TimelineExpandableElement.prototype = {
    _update: function(record, index, left, width)
    {
        const rowHeight = WebInspector.TimelinePanel.rowHeight;
        if (record.visibleChildrenCount || record.expandable) {
            this._element.style.top = index * rowHeight + "px";
            this._element.style.left = left + "px";
            this._element.style.width = Math.max(12, width + 25) + "px";
            if (!record.collapsed) {
                this._element.style.height = (record.visibleChildrenCount + 1) * rowHeight + "px";
                this._element.classList.add("timeline-expandable-expanded");
                this._element.classList.remove("timeline-expandable-collapsed");
            } else {
                this._element.style.height = rowHeight + "px";
                this._element.classList.add("timeline-expandable-collapsed");
                this._element.classList.remove("timeline-expandable-expanded");
            }
            this._element.classList.remove("hidden");
        } else
            this._element.classList.add("hidden");
    },

    _dispose: function()
    {
        this._element.remove();
    }
}

/**
 * @constructor
 * @implements {WebInspector.TimelinePresentationModel.Filter}
 */
WebInspector.TimelineCategoryFilter = function()
{
}

WebInspector.TimelineCategoryFilter.prototype = {
    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !record.category.hidden && record.type !== WebInspector.TimelineModel.RecordType.BeginFrame;
    }
}

/**
 * @constructor
 * @implements {WebInspector.TimelinePresentationModel.Filter}
 */
WebInspector.TimelineIsLongFilter = function()
{
    this._minimumRecordDuration = 0;
}

WebInspector.TimelineIsLongFilter.prototype = {
    /**
     * @param {number} value
     */
    setMinimumRecordDuration: function(value)
    {
        this._minimumRecordDuration = value;
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return this._minimumRecordDuration ? ((record.lastChildEndTime - record.startTime) >= this._minimumRecordDuration) : true;
    }
}

/**
 * @param {!RegExp} regExp
 * @constructor
 * @implements {WebInspector.TimelinePresentationModel.Filter}
 */
WebInspector.TimelineSearchFilter = function(regExp)
{
    this._regExp = regExp;
}

WebInspector.TimelineSearchFilter.prototype = {
    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return WebInspector.TimelineRecordListRow.testContentMatching(record, this._regExp);
    }
}

/**
 * @constructor
 * @implements {WebInspector.TimelinePresentationModel.Filter}
 */
WebInspector.TimelineWindowFilter = function()
{
    this.reset();
}

WebInspector.TimelineWindowFilter.prototype = {
    reset: function()
    {
        this._windowStartTime = 0;
        this._windowEndTime = Infinity;
    },

    setWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._windowStartTime = windowStartTime;
        this._windowEndTime = windowEndTime;
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return record.lastChildEndTime >= this._windowStartTime && record.startTime <= this._windowEndTime;
    }
}

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.TimelineDetailsView = function()
{
    WebInspector.View.call(this);
    this.element = document.createElement("div");
    this.element.className = "timeline-details-view fill vbox";
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
        this._contentElement.enableStyleClass("hbox", !vertical);
        this._contentElement.enableStyleClass("vbox", vertical);
    },

    __proto__: WebInspector.View.prototype
}
