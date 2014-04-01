/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @implements {WebInspector.TimelineModeView}
 * @implements {WebInspector.FlameChartDelegate}
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 */
WebInspector.TimelineTracingView = function(delegate)
{
    WebInspector.VBox.call(this);
    this._delegate = delegate;
    this._tracingModel = new WebInspector.TracingModel();
    this.element.classList.add("timeline-flamechart");
    this.registerRequiredCSS("flameChart.css");
    this._delegate = delegate;
    this._dataProvider = new WebInspector.TraceViewFlameChartDataProvider(this._tracingModel);
    this._mainView = new WebInspector.FlameChart(this._dataProvider, this, true, true);
    this._mainView.show(this.element);
    this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
}

WebInspector.TimelineTracingView.prototype = {
    timelineStarted: function()
    {
        if (this._recordingTrace)
            return;
        if (!this._boundTraceEventListener)
            this._boundTraceEventListener = this._onTraceEventsCollected.bind(this);
        this._recordingTrace = true;
        WebInspector.tracingAgent.addEventListener(WebInspector.TracingAgent.Events.EventsCollected, this._boundTraceEventListener);
        this._tracingModel.reset();
        WebInspector.tracingAgent.start("", "");
    },

    timelineStopped: function()
    {
        if (!this._recordingTrace)
            return;

        /**
         * @this {WebInspector.TimelineTracingView}
         */
        function onTraceDataComplete()
        {
            WebInspector.tracingAgent.removeEventListener(WebInspector.TracingAgent.Events.EventsCollected, this._boundTraceEventListener);
            this.refreshRecords(null);
        }
        WebInspector.tracingAgent.stop(onTraceDataComplete.bind(this));
        this._recordingTrace = false;
    },

    /**
      * @param {!WebInspector.Event} event
     */
    _onTraceEventsCollected: function(event)
    {
        var events = /** @type {!Array.<!WebInspector.TracingAgent.Event>} */ (event.data);
        this._tracingModel.addEvents(events);
    },

    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._delegate.requestWindowTimes(windowStartTime, windowEndTime);
    },

    wasShown: function()
    {
        this._mainView._scheduleUpdate();
    },

    reset: function()
    {
        this._dataProvider.reset();
        this._mainView.setWindowTimes(0, Infinity);
    },

    /**
     * @param {?RegExp} textFilter
     */
    refreshRecords: function(textFilter)
    {
        this._dataProvider.reset();
        this._mainView._scheduleUpdate();
    },

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
    setWindowTimes: function(startTime, endTime)
    {
        this._mainView.setWindowTimes(startTime, endTime);
    },

    /**
     * @param {number} width
     */
    setSidebarSize: function(width) {},

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     */
    setSelectedRecord: function(record) {},

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
    },

    __proto__: WebInspector.VBox.prototype
};

/**
 * @constructor
 * @implements {WebInspector.FlameChartDataProvider}
 * @param {!WebInspector.TracingModel} model
 */
WebInspector.TraceViewFlameChartDataProvider = function(model)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._font = "bold 12px " + WebInspector.fontFamily();
    this._palette = new WebInspector.TraceViewPalette();
    var dummyEventPayload = {
        cat: "dummy",
        pid: 0,
        tid: 0,
        ts: 0,
        ph: "dummy",
        name: "dummy",
        args: {},
        dur: 0,
        id: 0,
        s: ""
    }
    this._processHeaderRecord = new WebInspector.TracingModel.Event(dummyEventPayload, 0);
    this._threadHeaderRecord = new WebInspector.TracingModel.Event(dummyEventPayload, 0);
}

WebInspector.TraceViewFlameChartDataProvider.prototype = {
    /**
     * @return {number}
     */
    barHeight: function()
    {
        return 20;
    },

    /**
     * @return {number}
     */
    textBaseline: function()
    {
        return 6;
    },

    /**
     * @return {number}
     */
    textPadding: function()
    {
        return 5;
    },

    /**
     * @param {number} entryIndex
     * @return {string}
     */
    entryFont: function(entryIndex)
    {
        return this._font;
    },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryTitle: function(entryIndex)
    {
        var record = this._records[entryIndex];
        if (record === this._threadHeaderRecord || record === this._processHeaderRecord)
            return this._headerTitles[entryIndex]
        return record.name;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime)
    {
        return null;
    },

    reset: function()
    {
        this._timelineData = null;
        /** @type {!Array.<!WebInspector.TracingModel.Event>} */
        this._records = [];
    },

    /**
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    timelineData: function()
    {
        if (this._timelineData)
            return this._timelineData;

        /**
         * @type {?WebInspector.FlameChart.TimelineData}
         */
        this._timelineData = {
            entryLevels: [],
            entryTotalTimes: [],
            entryOffsets: []
        };

        this._currentLevel = 0;
        this._headerTitles = {};
        this._zeroTime = this._model.minimumRecordTime() || 0;
        this._timeSpan = Math.max((this._model.maximumRecordTime() || 0) - this._zeroTime, 1000000);
        var processes = this._model.sortedProcesses();
        for (var i = 0; i < processes.length; ++i) {
            this._appendHeaderRecord(processes[i].name(), this._processHeaderRecord);
            var threads = processes[i].sortedThreads();
            for (var j = 0; j < threads.length; ++j) {
                this._appendHeaderRecord(threads[j].name(), this._threadHeaderRecord);
                var events = threads[j].events();
                for (var k = 0; k < events.length; ++k) {
                    if (events[k].duration)
                        this._appendRecord(events[k]);
                }
                this._currentLevel += threads[j].maxStackDepth();
            }
            ++this._currentLevel;
        }
        return this._timelineData;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._toTimelineTime(this._zeroTime);
    },

    /**
     * @return {number}
     */
    totalTime: function()
    {
        return this._toTimelineTime(this._timeSpan);
    },

    /**
     * @return {number}
     */
    maxStackDepth: function()
    {
        return this._currentLevel;
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
     * @return {!string}
     */
    entryColor: function(entryIndex)
    {
        var record = this._records[entryIndex];
        if (record === this._processHeaderRecord)
            return "#555";
        if (record === this._threadHeaderRecord)
            return "#777";
        return this._palette.colorForString(record.name);
    },


    /**
     * @param {number} entryIndex
     * @param {!CanvasRenderingContext2D} context
     * @param {?string} text
     * @param {number} barX
     * @param {number} barY
     * @param {number} barWidth
     * @param {number} barHeight
     * @param {function(number):number} offsetToPosition
     * @return {boolean}
     */
    decorateEntry: function(entryIndex, context, text, barX, barY, barWidth, barHeight, offsetToPosition)
    {
        return false;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex)
    {
        return false;
    },

    /**
     * @param {number} entryIndex
     * @return {?{startTimeOffset: number, endTimeOffset: number}}
     */
    highlightTimeRange: function(entryIndex)
    {
        return null;
    },

    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return 0;
    },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    textColor: function(entryIndex)
    {
        return "white";
    },

    /**
     * @param {string} title
     * @param {!WebInspector.TracingModel.Event} record
     */
    _appendHeaderRecord: function(title, record)
    {
        var index = this._records.length;
        this._records.push(record);
        this._timelineData.entryLevels[index] = this._currentLevel++;
        this._timelineData.entryTotalTimes[index] = this.totalTime();
        this._timelineData.entryOffsets[index] = this._toTimelineTime(0);
        this._headerTitles[index] = title;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} record
     */
    _appendRecord: function(record)
    {
        var index = this._records.length;
        this._records.push(record);
        this._timelineData.entryLevels[index] = this._currentLevel + record.level;
        this._timelineData.entryTotalTimes[index] = this._toTimelineTime(record.duration);
        this._timelineData.entryOffsets[index] = this._toTimelineTime(record.startTime - this._zeroTime);
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _toTimelineTime: function(time)
    {
        return time / 1000;
    }
}

// The below logic is shamelessly stolen from https://code.google.com/p/trace-viewer/source/browse/trunk/trace_viewer/tracing/color_scheme.js

/**
 * @constructor
 */
WebInspector.TraceViewPalette = function()
{
    this._palette = WebInspector.TraceViewPalette._paletteBase.map(WebInspector.TraceViewPalette._rgbToString);
}

WebInspector.TraceViewPalette._paletteBase = [
    [138, 113, 152],
    [175, 112, 133],
    [127, 135, 225],
    [93, 81, 137],
    [116, 143, 119],
    [178, 214, 122],
    [87, 109, 147],
    [119, 155, 95],
    [114, 180, 160],
    [132, 85, 103],
    [157, 210, 150],
    [148, 94, 86],
    [164, 108, 138],
    [139, 191, 150],
    [110, 99, 145],
    [80, 129, 109],
    [125, 140, 149],
    [93, 124, 132],
    [140, 85, 140],
    [104, 163, 162],
    [132, 141, 178],
    [131, 105, 147],
    [135, 183, 98],
    [152, 134, 177],
    [141, 188, 141],
    [133, 160, 210],
    [126, 186, 148],
    [112, 198, 205],
    [180, 122, 195],
    [203, 144, 152]
];

/**
 * @param {string} string
 * @return {number}
 */
WebInspector.TraceViewPalette._stringHash = function(string)
{
    var hash = 0;
    for (var i = 0; i < string.length; ++i)
        hash = (hash + 37 * hash + 11 * string.charCodeAt(i)) % 0xFFFFFFFF;
    return hash;
}

/**
 * @param {!Array.<number>} rgb
 * @return {string}
 */
WebInspector.TraceViewPalette._rgbToString = function(rgb)
{
    return "rgb(" + rgb.join(",") + ")";
}

WebInspector.TraceViewPalette.prototype = {
    /**
     * @param {string} string
     * @return {string}
     */
    colorForString: function(string)
    {
        var hash = WebInspector.TraceViewPalette._stringHash(string);
        return this._palette[hash % this._palette.length];
    }
};
