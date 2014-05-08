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
 * @param {!WebInspector.TracingModel} tracingModel
 */
WebInspector.TimelineTracingView = function(delegate, tracingModel)
{
    WebInspector.VBox.call(this);
    this._delegate = delegate;
    this._tracingModel = tracingModel;
    this.element.classList.add("timeline-flamechart");
    this.registerRequiredCSS("flameChart.css");
    this._dataProvider = new WebInspector.TraceViewFlameChartDataProvider(this._tracingModel);
    this._mainView = new WebInspector.FlameChart(this._dataProvider, this, true);
    this._mainView.show(this.element);
    this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
}

WebInspector.TimelineTracingView.prototype = {
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

    /**
     * @return {!WebInspector.View}
     */
    view: function()
    {
        return this;
    },

    dispose: function()
    {
    },

    reset: function()
    {
        this._tracingModel.reset();
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
     * @param {?WebInspector.TimelineSelection} selection
     */
    setSelection: function(selection) {},

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
        var index = /** @type {number} */ (event.data);
        var record = this._dataProvider._recordAt(index);
        if (!record || this._dataProvider._isHeaderRecord(record)) {
            this._delegate.showInDetails("", document.createTextNode(""));
            return;
        }
        var contentHelper = new WebInspector.TimelineDetailsContentHelper(null, null, false);
        contentHelper.appendTextRow(WebInspector.UIString("Name"), record.name);
        contentHelper.appendTextRow(WebInspector.UIString("Category"), record.category);
        contentHelper.appendTextRow(WebInspector.UIString("Start"), Number.millisToString(this._dataProvider._toTimelineTime(record.startTime - this._tracingModel.minimumRecordTime()), true));
        contentHelper.appendTextRow(WebInspector.UIString("Duration"), Number.millisToString(this._dataProvider._toTimelineTime(record.duration), true));
        if (!Object.isEmpty(record.args))
            contentHelper.appendElementRow(WebInspector.UIString("Arguments"), this._formatArguments(record.args));
        function reveal()
        {
            WebInspector.Revealer.reveal(new WebInspector.TracingLayerSnapshot(record.args["snapshot"]["active_tree"]["root_layer"]));
        }
        if (record.name === "cc::LayerTreeHostImpl") {
            var link = document.createElement("span");
            link.classList.add("revealable-link");
            link.textContent = "show";
            link.addEventListener("click", reveal, false);
            contentHelper.appendElementRow(WebInspector.UIString("Layer tree"), link);
        } else if (record.name === "cc::Picture") {
            var div = document.createElement("div");
            div.className = "image-preview-container";
            var img = div.createChild("img");
            contentHelper.appendElementRow("Preview", div);
            this._requestThumbnail(img, record.args["snapshot"]["skp64"]);
        }
        this._delegate.showInDetails(WebInspector.UIString("Selected Event"), contentHelper.element);
    },

    /**
     * @param {!Object} args
     * @return {!Element}
     */
    _formatArguments: function(args)
    {
        var table = document.createElement("table");
        for (var name in args) {
            var row = table.createChild("tr");
            row.createChild("td", "timeline-details-row-title").textContent = name + ":";
            var valueContainer = row.createChild("td", "timeline-details-row-data");
            var value = args[name];
            if (typeof value === "object" && value) {
                var localObject = new WebInspector.LocalJSONObject(value);
                var propertiesSection = new WebInspector.ObjectPropertiesSection(localObject, localObject.description);
                valueContainer.appendChild(propertiesSection.element);
            } else {
                valueContainer.textContent = String(value);
            }
        }
        return table;
    },

    /**
     * @param {!Element} img
     * @param {string} encodedPicture
     */
    _requestThumbnail: function(img, encodedPicture)
    {
        var snapshotId;
        LayerTreeAgent.loadSnapshot(encodedPicture, onSnapshotLoaded);
        /**
         * @param {string} error
         * @param {string} id
         */
        function onSnapshotLoaded(error, id)
        {
            if (error) {
                console.error("LayerTreeAgent.loadSnapshot(): " + error);
                return;
            }
            snapshotId = id;
            LayerTreeAgent.replaySnapshot(snapshotId, onSnapshotReplayed);
        }

        /**
         * @param {string} error
         * @param {string} encodedBitmap
         */
        function onSnapshotReplayed(error, encodedBitmap)
        {
            LayerTreeAgent.releaseSnapshot(snapshotId);
            if (error) {
                console.error("LayerTreeAgent.replaySnapshot(): " + error);
                return;
            }
            img.src = encodedBitmap;
        }
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
        if (this._isHeaderRecord(record))
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
        for (var processIndex = 0; processIndex < processes.length; ++processIndex) {
            var process = processes[processIndex];
            this._appendHeaderRecord(process.name(), this._processHeaderRecord);
            var objectNames = process.sortedObjectNames();
            for (var objectNameIndex = 0; objectNameIndex < objectNames.length; ++objectNameIndex) {
                this._appendHeaderRecord(WebInspector.UIString("Object %s", objectNames[objectNameIndex]), this._threadHeaderRecord);
                var objects = process.objectsByName(objectNames[objectNameIndex]);
                for (var objectIndex = 0; objectIndex < objects.length; ++objectIndex)
                    this._appendRecord(objects[objectIndex]);
                ++this._currentLevel;
            }
            var threads = process.sortedThreads();
            for (var threadIndex = 0; threadIndex < threads.length; ++threadIndex) {
                this._appendHeaderRecord(threads[threadIndex].name(), this._threadHeaderRecord);
                var events = threads[threadIndex].events();
                for (var eventIndex = 0; eventIndex < events.length; ++eventIndex) {
                    var event = events[eventIndex];
                    if (event.duration)
                        this._appendRecord(event);
                }
                this._currentLevel += threads[threadIndex].maxStackDepth();
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
        var record = this._records[entryIndex];
        return record.phase === WebInspector.TracingModel.Phase.SnapshotObject;
    },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    entryColor: function(entryIndex)
    {
        var record = this._records[entryIndex];
        if (record.phase === WebInspector.TracingModel.Phase.SnapshotObject)
            return "rgb(20, 150, 20)";
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
        var record = this._records[entryIndex];
        if (!record || this._isHeaderRecord(record))
            return null;
        return {
            startTimeOffset: this._toTimelineTime(record.startTime - this._zeroTime),
            endTimeOffset: this._toTimelineTime(record.endTime - this._zeroTime)
        }
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
        this._timelineData.entryTotalTimes[index] = this._toTimelineTime(record.phase === WebInspector.TracingModel.Phase.SnapshotObject ? NaN : record.duration || 0);
        this._timelineData.entryOffsets[index] = this._toTimelineTime(record.startTime - this._zeroTime);
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _toTimelineTime: function(time)
    {
        return time / 1000;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} record
     */
    _isHeaderRecord: function(record)
    {
        return record === this._threadHeaderRecord || record === this._processHeaderRecord;
    },

    /**
     * @param {number} index
     * @return {!WebInspector.TracingModel.Event|undefined}
     */
    _recordAt: function(index)
    {
        return this._records[index];
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
