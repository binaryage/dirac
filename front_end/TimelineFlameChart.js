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
 */
WebInspector.TimelineFlameChartDataProvider = function(model, colorGenerator)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._colorGenerator = colorGenerator;
    this._resetData();
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this.invalidate, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this.invalidate, this);
}

WebInspector.TimelineFlameChartDataProvider.prototype = {
    invalidate: function()
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
            totalTime: 0,
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

        if (record.type === WebInspector.TimelineModel.RecordType.GPUTask)
            return;

        if (record.type === WebInspector.TimelineModel.RecordType.Program)
            return;

        var index = timelineData.entryTitles.length;
        timelineData.entryTitles[index] = record.type;
        timelineData.entryOffsets[index] = record.startTime - startTime;
        timelineData.entryLevels[index] = depth - 2;
        timelineData.entryTotalTimes[index] = endTime - record.startTime;
        timelineData.entryDeoptFlags[index] = 0;

        var colorPair = this._colorGenerator.colorPairForID(WebInspector.TimelinePresentationModel.categoryForRecord(record).name);
        var indexesForColor = timelineData.colorEntryIndexes[colorPair.index];
        if (!indexesForColor)
            indexesForColor = timelineData.colorEntryIndexes[colorPair.index] = [];
        indexesForColor.push(index);

        this._timelineData.maxStackDepth = Math.max(this._timelineData.maxStackDepth, depth + 1);
        this._timelineData.totalTime = this._endTime - this._startTime;
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
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.TimelineFlameChart = function(model, dataProvider)
{
    WebInspector.View.call(this);
    this._model = model;
    this._mainView = new WebInspector.FlameChart.MainPane(dataProvider, null, true);
    this._mainView.show(this.element);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._mainView._scheduleUpdate, this._mainView);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._recordsCleared, this);
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
    _recordsCleared: function()
    {
        this._mainView.changeWindow(0, 1);
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        var minimumRecordTime = this._model.minimumRecordTime();
        var timeRange = this._model.maximumRecordTime() - minimumRecordTime;
        if (timeRange === 0)
            this._mainView.changeWindow(0, 1);
        else
            this._mainView.changeWindow((startTime - minimumRecordTime) / timeRange, (endTime - minimumRecordTime) / timeRange);
    },

    /**
     * @return {boolean}
     */
    supportsGlueParentMode: function()
    {
        return false;
    },

    setSidebarSize: function()
    {
    },

    /**
     * @param {!WebInspector.FilterBar} filterBar
     * @return {boolean}
     */
    createUIFilters: function(filterBar)
    {
        return false;
    },

    /**
     * @return {?WebInspector.View}
     */
    searchableView: function()
    {
        return null;
    },

    __proto__: WebInspector.View.prototype
}