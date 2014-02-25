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
 * @param {!WebInspector.FlameChart.ColorGenerator} colorGenerator
 * @param {boolean} mainThread
 */
WebInspector.TimelineFlameChartDataProvider = function(model, colorGenerator, mainThread)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._mainThread = mainThread;
    this._colorGenerator = colorGenerator;
}

WebInspector.TimelineFlameChartDataProvider.prototype = {
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
        }
        return this._timelineData;
    },

    _resetData: function()
    {
        this._startTime = 0;
        this._endTime = 0;
        this._timelineData = {
            maxStackDepth: 5,
            totalTime: 1000,
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
        timelineData.totalTime = Math.max(1000, this._endTime - this._startTime);

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

        var colorPair = this._colorGenerator.colorPairForID(WebInspector.TimelinePresentationModel.categoryForRecord(record).name);
        var indexesForColor = timelineData.colorEntryIndexes[colorPair.index];
        if (!indexesForColor)
            indexesForColor = timelineData.colorEntryIndexes[colorPair.index] = [];
        indexesForColor.push(index);

        timelineData.maxStackDepth = Math.max(timelineData.maxStackDepth, depth + 1);
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
 * @param {!WebInspector.TimelinePanel} panel
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.TimelineFlameChart = function(panel, model, dataProvider)
{
    WebInspector.View.call(this);
    this._panel = panel;
    this._model = model;
    this._dataProvider = dataProvider;
    this._mainView = new WebInspector.FlameChart.MainPane(dataProvider, null, true, true);
    this._mainView.show(this.element);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
}

/**
 * @param {!Object.<string, !CanvasGradient>} fillStyles
 */
WebInspector.TimelineFlameChart.colorGenerator = function(fillStyles)
{
    if (!WebInspector.TimelineFlameChart._colorGenerator) {
        var colorGenerator = new WebInspector.FlameChart.ColorGenerator();
        for (var category in fillStyles) {
            if (fillStyles.hasOwnProperty(category))
                colorGenerator.setColorPairForID(category, fillStyles[category], fillStyles[category]);
        }
        WebInspector.TimelineFlameChart._colorGenerator = colorGenerator;
    }
    return WebInspector.TimelineFlameChart._colorGenerator;
}

WebInspector.TimelineFlameChart.prototype = {
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
            if ((rawRecord.startTime / 1000) > (minimumRecordTime + 1)) {
                this._automaticallySizeWindow = false;
                this._panel.setWindowTimes(minimumRecordTime, minimumRecordTime + 1);
                this.setWindowTimes(minimumRecordTime, minimumRecordTime + 1);
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
            this._mainView.setWindowTimes(this._startTime - minimumRecordTime, this._endTime - minimumRecordTime);
    },

    /**
     * @return {boolean}
     */
    supportsGlueParentMode: function()
    {
        return false;
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

    __proto__: WebInspector.View.prototype
}