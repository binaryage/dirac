/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @implements {WebInspector.FlameChartDataProvider}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameModel} frameModel
 * @param {boolean} mainThread
 */
WebInspector.TimelineFlameChartDataProvider = function(model, frameModel, mainThread)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._frameModel = frameModel;
    this._mainThread = mainThread;

    this._colorGenerator = new WebInspector.FlameChart.ColorGenerator();
    var categories = WebInspector.TimelinePresentationModel.categories();
    for (var category in categories)
        this._colorGenerator.setColorForID(category, categories[category].fillColorStop1);
}

WebInspector.TimelineFlameChartDataProvider.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime)
    {
        var frames = this._frameModel.filteredFrames(this._model.minimumRecordTime() + startTime, this._model.minimumRecordTime() + endTime);
        if (frames.length > 30)
            return null;
        var offsets = [];
        for (var i = 0; i < frames.length; ++i)
            offsets.push(frames[i].startTimeOffset);
        return frames.length ? offsets : null;
    },

    reset: function()
    {
        this._invalidate();
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    addRecord: function(record)
    {
        this._invalidate();
    },

    _invalidate: function()
    {
        this._timelineData = null;
    },

    /**
     * @return {!WebInspector.FlameChart.ColorGenerator}
     */
    colorGenerator: function()
    {
        return this._colorGenerator;
    },

    /**
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    timelineData: function()
    {
        if (!this._timelineData) {
            this._resetData();
            WebInspector.TimelinePresentationModel.forAllRecords(this._model.records, this._appendRecord.bind(this));
            this._zeroTime = this._model.minimumRecordTime();
        }
        return this._timelineData;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._zeroTime;
    },

    /**
     * @return {number}
     */
    totalTime: function()
    {
        return this._totalTime;
    },

    /**
     * @return {number}
     */
    maxStackDepth: function()
    {
        return this._maxStackDepth;
    },

    _resetData: function()
    {
        this._startTime = 0;
        this._endTime = 0;
        this._maxStackDepth = 5;
        this._totalTime = 1000;
        this._zeroTime = 0;

        this._timelineData = {
            entryLevels: [],
            entryTotalTimes: [],
            entrySelfTimes: [],
            entryOffsets: [],
            colorEntryIndexes: [],
            entryTitles: [],
            entryDeoptFlags: []
        };
    },

    _appendRecord: function(record, depth)
    {
        var timelineData = this._timelineData;

        this._startTime = this._startTime ? Math.min(this._startTime, record.startTime) : record.startTime;
        var startTime = this._startTime;
        var endTime = record.endTime || record.startTime - startTime;
        this._endTime = Math.max(this._endTime, endTime);
        this._totalTime = Math.max(1000, this._endTime - this._startTime);

        if (this._mainThread) {
            if (record.type === WebInspector.TimelineModel.RecordType.GPUTask || !!record.thread)
                return;
        } else {
            if (record.type === WebInspector.TimelineModel.RecordType.Program || !record.thread)
                return;
        }

        var index = timelineData.entryTitles.length;
        timelineData.entryTitles[index] = record.type;
        timelineData.entryOffsets[index] = record.startTime - startTime;
        timelineData.entryLevels[index] = depth - 1;
        timelineData.entryTotalTimes[index] = endTime - record.startTime;
        timelineData.entryDeoptFlags[index] = 0;

        var color = this._colorGenerator.colorForID(WebInspector.TimelinePresentationModel.categoryForRecord(record).name);
        var indexesForColor = timelineData.colorEntryIndexes[color.index];
        if (!indexesForColor)
            indexesForColor = timelineData.colorEntryIndexes[color.index] = [];
        indexesForColor.push(index);

        this._maxStackDepth = Math.max(this._maxStackDepth, depth + 1);
    },

    /**
     * @param {number} entryIndex
     * @return {?Array.<!{title: string, text: string}>}
     */
    prepareHighlightedEntryInfo: function(entryIndex)
    {
        return null;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex)
    {
        return false;
    },

    /**
     * @param {number} entryIndex
     * @return {?Object}
     */
    entryData: function(entryIndex)
    {
        return null;
    }
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @implements {WebInspector.TimelineModeView}
 * @implements {WebInspector.TimeRangeController}
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameModel} frameModel
 * @param {boolean} mainThread
 */
WebInspector.TimelineFlameChart = function(delegate, model, frameModel, mainThread)
{
    WebInspector.View.call(this);
    this._delegate = delegate;
    this._model = model;
    this._dataProvider = new WebInspector.TimelineFlameChartDataProvider(model, frameModel, mainThread);
    this._mainView = new WebInspector.FlameChart.MainPane(this._dataProvider, this, true, true);
    this._mainView.show(this.element);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
}

WebInspector.TimelineFlameChart.prototype = {
    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._delegate.requestWindowTimes(windowStartTime, windowEndTime);
    },

    refreshRecords: function()
    {
    },

    reset: function()
    {
        this._automaticallySizeWindow = true;
        this._dataProvider.reset();
        this._mainView.setWindowTimes(0, Infinity);
    },

    _onRecordingStarted: function()
    {
        this._automaticallySizeWindow = true;
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} rawRecord
     * @param {!Array.<!WebInspector.TimelinePresentationModel.Record>} presentationRecords
     */
    addRecord: function(rawRecord, presentationRecords)
    {
        this._dataProvider.addRecord(rawRecord);
        if (this._automaticallySizeWindow) {
            var minimumRecordTime = this._model.minimumRecordTime();
            if (rawRecord.startTime > (minimumRecordTime + 1000)) {
                this._automaticallySizeWindow = false;
                this._delegate.requestWindowTimes(minimumRecordTime, minimumRecordTime + 1000);
            }
            this._mainView._scheduleUpdate();
        }
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._startTime = startTime;
        this._endTime = endTime;
        this._updateWindow();
    },

    _updateWindow: function()
    {
        var minimumRecordTime = this._model.minimumRecordTime();
        var timeRange = this._model.maximumRecordTime() - minimumRecordTime;
        if (timeRange === 0)
            this._mainView.setWindowTimes(0, Infinity);
        else
            this._mainView.setWindowTimes(this._startTime, this._endTime);
    },

    /**
     * @param {number} width
     */
    setSidebarSize: function(width)
    {
    },

    /**
     * @param {?WebInspector.TimelinePresentationModel.Record} record
     * @param {string=} regex
     * @param {boolean=} selectRecord
     */
    highlightSearchResult: function(record, regex, selectRecord)
    {
    },

    /**
     * @param {?WebInspector.TimelinePresentationModel.Record} record
     */
    setSelectedRecord: function(record)
    {
    },

    __proto__: WebInspector.View.prototype
}