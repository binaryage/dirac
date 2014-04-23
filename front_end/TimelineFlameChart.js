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
 */
WebInspector.TimelineFlameChartDataProvider = function(model, frameModel)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._model = model;
    this._frameModel = frameModel;
    this._font = "bold 12px " + WebInspector.fontFamily();
    this._linkifier = new WebInspector.Linkifier();
}

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
        var record = this._records[entryIndex];
        if (record === this._cpuThreadRecord)
            return WebInspector.UIString("CPU");
        else if (record === this._gpuThreadRecord)
            return WebInspector.UIString("GPU");
        var details = WebInspector.TimelineUIUtils.buildDetailsNode(record, this._linkifier, this._model.loadedFromFile());
        return details ? WebInspector.UIString("%s (%s)", record.title(), details.textContent) : record.title();
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime)
    {
        if (endTime - startTime < 16 || endTime - startTime > 300)
            return null;

        var frames = this._frameModel.filteredFrames(startTime, endTime);
        if (frames.length > 10)
            return null;

        if (frames.length < 3)
            return null;

        var offsets = [];
        for (var i = 0; i < frames.length; ++i)
            offsets.push(frames[i].startTime);
        // Push one more offset so grid will be able to calculate the duration for the last frame.
        offsets.push(frames.peekLast.endTime)
        return offsets;
    },

    reset: function()
    {
        this._timelineData = null;
    },

    /**
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    timelineData: function()
    {
        if (this._timelineData)
            return this._timelineData;

        this._linkifier.reset();

        /**
         * @type {?WebInspector.FlameChart.TimelineData}
         */
        this._timelineData = {
            entryLevels: [],
            entryTotalTimes: [],
            entryOffsets: []
        };

        this._records = [];
        this._entryThreadDepths = {};
        this._zeroTime = this._model.minimumRecordTime();

        var cpuThreadRecordPayload = { type: WebInspector.TimelineModel.RecordType.Program };
        this._cpuThreadRecord = new WebInspector.TimelineModel.Record(this._model, /** @type {!TimelineAgent.TimelineEvent} */ (cpuThreadRecordPayload), null);
        this._pushRecord(this._cpuThreadRecord, 0, this.zeroTime(), Math.max(this._model.maximumRecordTime(), this.totalTime() + this.zeroTime()));

        var gpuThreadRecordPayload = { type: WebInspector.TimelineModel.RecordType.Program };
        this._gpuThreadRecord = new WebInspector.TimelineModel.Record(this._model, /** @type {!TimelineAgent.TimelineEvent} */ (gpuThreadRecordPayload), null);
        this._pushRecord(this._gpuThreadRecord, 0, this.zeroTime(), Math.max(this._model.maximumRecordTime(), this.totalTime() + this.zeroTime()));

        var records = this._model.records();
        for (var i = 0; i < records.length; ++i) {
            var record = records[i];
            var thread = record.thread;
            if (thread === "gpu")
                continue;
            if (!thread) {
                for (var j = 0; j < record.children.length; ++j)
                    this._appendRecord(record.children[j], 1);
            } else {
                this._appendRecord(records[i], 1);
            }
        }

        var cpuStackDepth = Math.max(4, this._entryThreadDepths[undefined]);
        delete this._entryThreadDepths[undefined];

        var threadBaselines = {};
        var threadBaseline = cpuStackDepth + 2;

        for (var thread in this._entryThreadDepths) {
            threadBaselines[thread] = threadBaseline;
            threadBaseline += this._entryThreadDepths[thread];
        }
        this._maxStackDepth = threadBaseline;

        for (var i = 0; i < this._records.length; ++i) {
            var record = this._records[i];
            var level = this._timelineData.entryLevels[i];
            if (record === this._cpuThreadRecord)
                level = 0;
            else if (record === this._gpuThreadRecord)
                level = cpuStackDepth + 2;
            else if (record.thread)
                level += threadBaselines[record.thread];
            this._timelineData.entryLevels[i] = level;
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
        return Math.max(1000, this._model.maximumRecordTime() - this._model.minimumRecordTime());
    },

    /**
     * @return {number}
     */
    maxStackDepth: function()
    {
        return this._maxStackDepth;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {number} level
     */
    _appendRecord: function(record, level)
    {
        if (!this._model.isVisible(record)) {
            for (var i = 0; i < record.children.length; ++i)
                this._appendRecord(record.children[i], level);
            return;
        }

        this._pushRecord(record, level, record.startTime, record.endTime);
        for (var i = 0; i < record.children.length; ++i)
            this._appendRecord(record.children[i], level + 1);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {number} level
     * @param {number} startTime
     * @param {number} endTime
     * @return {number}
     */
    _pushRecord: function(record, level, startTime, endTime)
    {
        var index = this._records.length;
        this._records.push(record);
        this._timelineData.entryOffsets[index] = startTime - this._zeroTime;
        this._timelineData.entryLevels[index] = level;
        this._timelineData.entryTotalTimes[index] = endTime - startTime;
        this._entryThreadDepths[record.thread] = Math.max(level, this._entryThreadDepths[record.thread] || 0);
        return index;
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
        if (record === this._cpuThreadRecord || record === this._gpuThreadRecord)
            return "#555";

        if (record.type === WebInspector.TimelineModel.RecordType.JSFrame)
            return WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator().colorForID(record.data["functionName"]);

        var category = WebInspector.TimelineUIUtils.categoryForRecord(record);
        return category.fillColorStop1;
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

        var record = this._records[entryIndex];
        var timelineData = this._timelineData;

        if (record.children.length) {
            var category = WebInspector.TimelineUIUtils.categoryForRecord(record);
            // Paint text using white color on dark background.
            if (text) {
                context.fillStyle = "white";
                context.font = this._font;
                context.fillText(text, barX + this.textPadding(), barY + barHeight - this.textBaseline());
            }

            var entryOffset = timelineData.entryOffsets[entryIndex];
            var barSelf = offsetToPosition(entryOffset + record.selfTime)

            context.beginPath();
            context.fillStyle = category.backgroundColor;
            context.rect(barSelf, barY, barX + barWidth - barSelf, barHeight);
            context.fill();

            // Paint text using dark color on light background.
            if (text) {
                context.save();
                context.clip();
                context.fillStyle = category.borderColor;
                context.fillText(text, barX + this.textPadding(), barY + barHeight - this.textBaseline());
                context.restore();
            }
        }

        if (record.warnings() || record.childHasWarnings()) {
            context.save();

            context.rect(barX, barY, barWidth, this.barHeight());
            context.clip();

            context.beginPath();
            context.fillStyle = record.warnings() ? "red" : "rgba(255, 0, 0, 0.5)";
            context.moveTo(barX + barWidth - 15, barY + 1);
            context.lineTo(barX + barWidth - 1, barY + 1);
            context.lineTo(barX + barWidth - 1, barY + 15);
            context.fill();

            context.restore();
        }

        return record.children.length;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex)
    {
        var record = this._records[entryIndex];
        return record.childHasWarnings() || !!record.warnings();
    },

    /**
     * @param {number} entryIndex
     * @return {?{startTimeOffset: number, endTimeOffset: number}}
     */
    highlightTimeRange: function(entryIndex)
    {
        var record = this._records[entryIndex];
        if (record === this._cpuThreadRecord || record === this._gpuThreadRecord)
            return null;
        return {
            startTimeOffset: record.startTime - this._zeroTime,
            endTimeOffset: record.endTime - this._zeroTime
        };
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
    }
}


/**
 * @return {!WebInspector.FlameChart.ColorGenerator}
 */
WebInspector.TimelineFlameChartDataProvider.jsFrameColorGenerator = function()
{
    if (!WebInspector.TimelineFlameChartDataProvider._jsFrameColorGenerator) {
        var hueSpace = { min: 30, max: 65, count: 7 };
        var satSpace = { min: 70, max: 100, count: 5 };
        var colorGenerator = new WebInspector.FlameChart.ColorGenerator(hueSpace, satSpace, 60);
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
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameModel} frameModel
 */
WebInspector.TimelineFlameChart = function(delegate, model, frameModel)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("timeline-flamechart");
    this.registerRequiredCSS("flameChart.css");
    this._delegate = delegate;
    this._model = model;
    this._dataProvider = new WebInspector.TimelineFlameChartDataProvider(model, frameModel);
    this._mainView = new WebInspector.FlameChart(this._dataProvider, this, true, true);
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
        this._mainView._scheduleUpdate();
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

    reset: function()
    {
        this._automaticallySizeWindow = true;
        this._dataProvider.reset();
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
            if (record.startTime > (minimumRecordTime + 1000)) {
                this._automaticallySizeWindow = false;
                this._delegate.requestWindowTimes(minimumRecordTime, minimumRecordTime + 1000);
            }
            this._mainView._scheduleUpdate();
        } else {
            if (!this._pendingUpdateTimer)
                this._pendingUpdateTimer = window.setTimeout(this._updateOnAddRecord.bind(this), 300);
        }
    },

    _updateOnAddRecord: function()
    {
        delete this._pendingUpdateTimer;
        this._mainView._scheduleUpdate();
    },

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
     * @param {?WebInspector.TimelineModel.Record} record
     */
    setSelectedRecord: function(record)
    {
        var entryRecords = this._dataProvider._records;
        for (var entryIndex = 0; entryIndex < entryRecords.length; ++entryIndex) {
            if (entryRecords[entryIndex] === record) {
                this._mainView.setSelectedEntry(entryIndex);
                return;
            }
        }
        this._mainView.setSelectedEntry(-1);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
        var entryIndex = event.data;
        var record = this._dataProvider._records[entryIndex];
        this._delegate.selectRecord(record);
    },

    __proto__: WebInspector.VBox.prototype
}
