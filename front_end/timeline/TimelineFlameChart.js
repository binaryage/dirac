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
 * @param {!WebInspector.TracingTimelineModel} model
 * @param {!WebInspector.TimelineFrameModelBase} frameModel
 */
WebInspector.TimelineFlameChartDataProvider = function(model, frameModel)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._frameModel = frameModel;
    this._font = "12px " + WebInspector.fontFamily();
    this._linkifier = new WebInspector.Linkifier();
    this._entryIndexToTitle = {};
    this._filters = [];
    this.addFilter(WebInspector.TracingTimelineUIUtils.hiddenEventsFilter());
    this.addFilter(new WebInspector.TracingTimelineModel.ExclusiveEventNameFilter([WebInspector.TracingTimelineModel.RecordType.Program]));
}

WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs = 0.01;
WebInspector.TimelineFlameChartDataProvider.JSFrameCoalsceThresholdMs = 1.1;

WebInspector.TimelineFlameChartDataProvider.prototype = {
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
        var event = this._entryEvents[entryIndex];
        if (event) {
            var name = WebInspector.TracingTimelineUIUtils.styleForTraceEvent(event.name).title;
            // TODO(yurys): support event dividers
            var details = WebInspector.TracingTimelineUIUtils.buildDetailsNodeForTraceEvent(event, this._linkifier);
            if (event.name === WebInspector.TracingTimelineModel.RecordType.JSFrame && details)
                return details.textContent;
            return details ? WebInspector.UIString("%s (%s)", name, details.textContent) : name;
        }
        var title = this._entryIndexToTitle[entryIndex];
        if (!title) {
            title = WebInspector.UIString("Unexpected entryIndex %d", entryIndex);
            console.error(title);
        }
        return title;
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

    /**
     * @override
     * @param {number} index
     * @return {string}
     */
    markerColor: function(index)
    {
        var event = this._markerEvents[index];
        return WebInspector.TracingTimelineUIUtils.markerEventColor(event.name);
    },

    /**
     * @override
     * @param {number} index
     * @return {string}
     */
    markerTitle: function(index)
    {
        var event = this._markerEvents[index];
        return WebInspector.TracingTimelineUIUtils.eventTitle(event, this._model);
    },

    reset: function()
    {
        this._timelineData = null;
        /** @type {!Array.<!WebInspector.TracingModel.Event>} */
        this._entryEvents = [];
        this._entryIndexToTitle = {};
        this._markerEvents = [];
    },

    /**
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    timelineData: function()
    {
        if (this._timelineData)
            return this._timelineData;

        this._timelineData = new WebInspector.FlameChart.TimelineData([], [], []);

        this._minimumBoundary = this._model.minimumRecordTime();
        this._timeSpan = Math.max(this._model.maximumRecordTime() - this._minimumBoundary, 1000);
        this._currentLevel = 0;
        this._appendThreadTimelineData(WebInspector.UIString("Main Thread"), this._model.mainThreadEvents());
        var threads = this._model.virtualThreads();
        for (var threadName in threads) {
            if (threadName !== WebInspector.TimelineModel.MainThreadName)
                this._appendThreadTimelineData(threadName, threads[threadName]);
        }
        return this._timelineData;
    },

    /**
     * @param {string} headerName
     * @param {!Array.<!WebInspector.TracingModel.Event>} traceEvents
     */
    _appendThreadTimelineData: function(headerName, traceEvents)
    {
        var maxStackDepth = 0;
        var openEvents = [];
        var headerAppended = false;
        var events = traceEvents;
        if (WebInspector.experimentsSettings.timelineJSCPUProfile.isEnabled()) {
            var jsFrameEvents = this._generateJSFrameEvents(traceEvents);
            events = jsFrameEvents.mergeOrdered(traceEvents, WebInspector.TracingModel.Event.orderedCompareStartTime);
        }
        for (var i = 0; i < events.length; ++i) {
            var e = events[i];
            // FIXME: clean up once phase name is unified between Blink and Chromium.
            if (!e.endTime && e.phase !== WebInspector.TracingModel.Phase.Instant && e.phase !== "I")
                continue;
            if (WebInspector.TracingTimelineUIUtils.isMarkerEvent(e)) {
                this._markerEvents.push(e);
                this._timelineData.markerTimestamps.push(e.startTime);
            }
            if (!this._isVisible(e))
                continue;
            while (openEvents.length && openEvents.peekLast().endTime <= e.startTime)
                openEvents.pop();
            if (!headerAppended) {
                this._appendHeaderRecord(headerName, this._currentLevel++);
                headerAppended = true;
            }
            this._appendEvent(e, this._currentLevel + openEvents.length);
            maxStackDepth = Math.max(maxStackDepth, openEvents.length + 1);
            if (e.endTime)
                openEvents.push(e);
        }
        this._currentLevel += maxStackDepth;
        if (headerAppended)
            ++this._currentLevel;
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    _generateJSFrameEvents: function(events)
    {
        function equalFrames(frame1, frame2)
        {
            return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName;
        }
        function eventEndTime(e)
        {
            return e.endTime || e.startTime + WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        }
        var jsFrameEvents = [];
        var stackTraceOpenEvents = [];
        var coalesceThresholdMs = WebInspector.TimelineFlameChartDataProvider.JSFrameCoalsceThresholdMs;
        for (var i = 0; i < events.length; ++i) {
            var e = events[i];
            if (!e.stackTrace || !this._isVisible(e))
                continue;
            while (stackTraceOpenEvents.length && eventEndTime(stackTraceOpenEvents.peekLast()) + coalesceThresholdMs <= e.startTime)
                stackTraceOpenEvents.pop();
            var numFrames = e.stackTrace.length;
            for (var j = 0; j < numFrames && j < stackTraceOpenEvents.length; ++j) {
                var frame = e.stackTrace[numFrames - 1 - j];
                if (!equalFrames(frame, stackTraceOpenEvents[j].args.data))
                    break;
                stackTraceOpenEvents[j].endTime = Math.max(stackTraceOpenEvents[j].endTime, eventEndTime(e));
                stackTraceOpenEvents[j].duration = stackTraceOpenEvents[j].endTime - stackTraceOpenEvents[j].startTime;
            }
            stackTraceOpenEvents.length = j;
            var timestampUs = e.startTime * 1000;
            var durationUs = (e.duration || WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs) * 1000;
            for (; j < numFrames; ++j) {
                var frame = e.stackTrace[numFrames - 1 - j];
                var payload = /** @type {!WebInspector.TracingModel.EventPayload} */ ({
                    ph: e.phase,
                    cat: WebInspector.TracingModel.DevToolsMetadataEventCategory,
                    name: WebInspector.TracingTimelineModel.RecordType.JSFrame,
                    ts: timestampUs,
                    dur: durationUs,
                    args: {
                        data: frame
                    }
                });
                var jsFrameEvent = new WebInspector.TracingModel.Event(payload, 0, e.thread);
                stackTraceOpenEvents.push(jsFrameEvent);
                jsFrameEvents.push(jsFrameEvent);
            }
        }
        return jsFrameEvents;
    },

    /**
     * @param {!WebInspector.TracingTimelineModel.Filter} filter
     */
    addFilter: function(filter)
    {
        this._filters.push(filter);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    _isVisible: function(event)
    {
        return this._filters.every(function (filter) { return filter.accept(event); });
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
    totalTime: function()
    {
        return this._timeSpan;
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
     * @return {string}
     */
    entryColor: function(entryIndex)
    {
        var event = this._entryEvents[entryIndex];
        if (!event)
            return "#555";
        if (event.name === WebInspector.TracingTimelineModel.RecordType.JSFrame)
            return WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator().colorForID(event.args.data["functionName"]);
        var style = WebInspector.TracingTimelineUIUtils.styleForTraceEvent(event.name);
        return style.category.fillColorStop1;
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
        if (barWidth < 5)
            return false;

        var timelineData = this._timelineData;

        // Paint text using white color on dark background.
        if (text) {
            context.save();
            context.fillStyle = "white";
            context.shadowColor = "rgba(0, 0, 0, 0.1)";
            context.shadowOffsetX = 1;
            context.shadowOffsetY = 1;
            context.font = this._font;
            context.fillText(text, barX + this.textPadding(), barY + barHeight - this.textBaseline());
            context.restore();
        }

        var event = this._entryEvents[entryIndex];
        if (event && event.warning) {
            context.save();

            context.rect(barX, barY, barWidth, this.barHeight());
            context.clip();

            context.beginPath();
            context.fillStyle = "red";
            context.moveTo(barX + barWidth - 15, barY + 1);
            context.lineTo(barX + barWidth - 1, barY + 1);
            context.lineTo(barX + barWidth - 1, barY + 15);
            context.fill();

            context.restore();
        }

        return true;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex)
    {
        var event = this._entryEvents[entryIndex];
        if (!event)
            return false;
        return !!event.warning;
    },

   /**
     * @param {number} entryIndex
     * @return {?{startTime: number, endTime: number}}
     */
    highlightTimeRange: function(entryIndex)
    {
        var event = this._entryEvents[entryIndex];
        if (!event)
            return null;
        return {
            startTime: event.startTime,
            endTime: event.endTime || event.startTime + WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs
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
     * @return {string}
     */
    textColor: function(entryIndex)
    {
        return "white";
    },

    /**
     * @param {string} title
     * @param {number} level
     */
    _appendHeaderRecord: function(title, level)
    {
        var index = this._entryEvents.length;
        this._entryIndexToTitle[index] = title;
        this._entryEvents.push(null);
        this._timelineData.entryLevels[index] = level;
        this._timelineData.entryTotalTimes[index] = this._timeSpan;
        this._timelineData.entryStartTimes[index] = this._minimumBoundary;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {number} level
     */
    _appendEvent: function(event, level)
    {
        var index = this._entryEvents.length;
        this._entryEvents.push(event);
        this._timelineData.entryLevels[index] = level;
        this._timelineData.entryTotalTimes[index] = event.duration || WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        this._timelineData.entryStartTimes[index] = event.startTime;
    },

    /**
     * @param {number} entryIndex
     * @return {?WebInspector.TimelineSelection}
     */
    createSelection: function(entryIndex)
    {
        var event = this._entryEvents[entryIndex];
        if (!event)
            return null;
        this._lastSelection = new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromTraceEvent(event), entryIndex);
        return this._lastSelection.timelineSelection;
    },

    /**
     * @param {?WebInspector.TimelineSelection} selection
     * @return {number}
     */
    entryIndexForSelection: function(selection)
    {
        if (!selection || selection.type() !== WebInspector.TimelineSelection.Type.TraceEvent)
            return -1;
        var event = /** @type{!WebInspector.TracingModel.Event} */ (selection.object());
        if (this._lastSelection && this._lastSelection.timelineSelection.object() === event)
            return this._lastSelection.entryIndex;
        var entryEvents = this._entryEvents;
        for (var entryIndex = 0; entryIndex < entryEvents.length; ++entryIndex) {
            if (entryEvents[entryIndex] === event) {
                this._lastSelection = new WebInspector.TimelineFlameChart.Selection(WebInspector.TimelineSelection.fromTraceEvent(event), entryIndex);
                return entryIndex;
            }
        }
        return -1;
    }
}

/**
 * @return {!WebInspector.FlameChart.ColorGenerator}
 */
WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator = function()
{
    if (!WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator) {
        var hueSpace = { min: 30, max: 55, count: 5 };
        var satSpace = { min: 70, max: 100, count: 6 };
        var colorGenerator = new WebInspector.FlameChart.ColorGenerator(hueSpace, satSpace, 50);
        colorGenerator.setColorForID("(idle)", "hsl(0, 0%, 60%)");
        colorGenerator.setColorForID("(program)", "hsl(0, 0%, 60%)");
        colorGenerator.setColorForID("(garbage collector)", "hsl(0, 0%, 60%)");
        WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator = colorGenerator;
    }
    return WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator;
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TimelineModeView}
 * @implements {WebInspector.FlameChartDelegate}
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 * @param {!WebInspector.TracingTimelineModel} tracingModel
 * @param {!WebInspector.TimelineFrameModelBase} frameModel
 */
WebInspector.TimelineFlameChart = function(delegate, tracingModel, frameModel)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("timeline-flamechart");
    this.registerRequiredCSS("flameChart.css");
    this._delegate = delegate;
    this._model = tracingModel;
    this._dataProvider = new WebInspector.TimelineFlameChartDataProvider(tracingModel, frameModel)
    this._mainView = new WebInspector.FlameChart(this._dataProvider, this, true);
    this._mainView.show(this.element);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
}

WebInspector.TimelineFlameChart.prototype = {
    dispose: function()
    {
        this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
        this._mainView.removeEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    },

    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._delegate.requestWindowTimes(windowStartTime, windowEndTime);
    },

    /**
     * @param {?RegExp} textFilter
     */
    refreshRecords: function(textFilter)
    {
        this._dataProvider.reset();
        this._mainView.scheduleUpdate();
    },

    wasShown: function()
    {
        this._mainView.scheduleUpdate();
    },


    /**
     * @return {!WebInspector.View}
     */
    view: function()
    {
        return this;
    },

    reset: function()
    {
        this._automaticallySizeWindow = true;
        this._dataProvider.reset();
        this._mainView.reset();
        this._mainView.setWindowTimes(0, Infinity);
    },

    _onRecordingStarted: function()
    {
        this._automaticallySizeWindow = true;
        this._mainView.reset();
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    addRecord: function(record)
    {
        this._dataProvider.reset();
        if (this._automaticallySizeWindow) {
            var minimumRecordTime = this._model.minimumRecordTime();
            if (record.startTime() > (minimumRecordTime + 1000)) {
                this._automaticallySizeWindow = false;
                this._delegate.requestWindowTimes(minimumRecordTime, minimumRecordTime + 1000);
            }
            this._mainView.scheduleUpdate();
        } else {
            if (!this._pendingUpdateTimer)
                this._pendingUpdateTimer = window.setTimeout(this._updateOnAddRecord.bind(this), 300);
        }
    },

    _updateOnAddRecord: function()
    {
        delete this._pendingUpdateTimer;
        this._mainView.scheduleUpdate();
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._mainView.setWindowTimes(startTime, endTime);
        this._delegate.select(null);
    },

    /**
     * @param {number} width
     */
    setSidebarSize: function(width)
    {
    },

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     * @param {string=} regex
     * @param {boolean=} selectRecord
     */
    highlightSearchResult: function(record, regex, selectRecord)
    {
    },

    /**
     * @param {?WebInspector.TimelineSelection} selection
     */
    setSelection: function(selection)
    {
        var index = this._dataProvider.entryIndexForSelection(selection);
        this._mainView.setSelectedEntry(index);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
        var entryIndex = /** @type{number} */ (event.data);
        var timelineSelection = this._dataProvider.createSelection(entryIndex);
        if (timelineSelection)
            this._delegate.select(timelineSelection);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
  * @constructor
  * @param {!WebInspector.TimelineSelection} selection
  * @param {number} entryIndex
  */
WebInspector.TimelineFlameChart.Selection = function(selection, entryIndex)
{
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
}
