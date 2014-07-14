/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 */
WebInspector.TimelineFrameModelBase = function(target)
{
    WebInspector.SDKObject.call(this, target);

    this.reset();
}

WebInspector.TimelineFrameModelBase.prototype = {
    /**
     * @return {!Array.<!WebInspector.TimelineFrame>}
     */
    frames: function()
    {
        return this._frames;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {!Array.<!WebInspector.TimelineFrame>}
     */
    filteredFrames: function(startTime, endTime)
    {
        /**
         * @param {number} value
         * @param {!WebInspector.TimelineFrame} object
         * @return {number}
         */
        function compareStartTime(value, object)
        {
            return value - object.startTime;
        }
        /**
         * @param {number} value
         * @param {!WebInspector.TimelineFrame} object
         * @return {number}
         */
        function compareEndTime(value, object)
        {
            return value - object.endTime;
        }
        var frames = this._frames;
        var firstFrame = insertionIndexForObjectInListSortedByFunction(startTime, frames, compareEndTime);
        var lastFrame = insertionIndexForObjectInListSortedByFunction(endTime, frames, compareStartTime);
        return frames.slice(firstFrame, lastFrame);
    },

    reset: function()
    {
        this._minimumRecordTime = Infinity;
        this._frames = [];
        this._lastFrame = null;
        this._lastLayerTree = null;
        this._hasThreadedCompositing = false;
        this._mainFrameCommitted = false;
        this._mainFrameRequested = false;
        this._framePendingCommit = null;
    },

    /**
     * @param {number} startTime
     */
    handleBeginFrame: function(startTime)
    {
        if (!this._lastFrame)
            this._startBackgroundFrame(startTime);
    },

    /**
     * @param {number} startTime
     */
    handleDrawFrame: function(startTime)
    {
        if (!this._lastFrame) {
            this._startBackgroundFrame(startTime);
            return;
        }

        // - if it wasn't drawn, it didn't happen!
        // - only show frames that either did not wait for the main thread frame or had one committed.
        if (this._mainFrameCommitted || !this._mainFrameRequested)
            this._startBackgroundFrame(startTime);
        this._mainFrameCommitted = false;
    },

    handleActivateLayerTree: function()
    {
        if (!this._lastFrame)
            return;
        this._mainFrameRequested = false;
        this._mainFrameCommitted = true;
        if (this._framePendingActivation) {
            this._lastFrame._addTimeForCategories(this._framePendingActivation.timeByCategory);
            this._lastFrame.paints = this._framePendingActivation.paints;
            this._framePendingActivation = null;
        }
    },

    handleRequestMainThreadFrame: function()
    {
        if (!this._lastFrame)
            return;
        this._mainFrameRequested = true;
    },

    handleCompositeLayers: function()
    {
        if (!this._hasThreadedCompositing || !this._framePendingCommit)
            return;
        this._framePendingActivation = this._framePendingCommit;
        this._framePendingCommit = null;
    },

    /**
     * @param {!WebInspector.DeferredLayerTree} layerTree
     */
    handleLayerTreeSnapshot: function(layerTree)
    {
        this._lastLayerTree = layerTree;
    },

    /**
     * @param {number} startTime
     */
    _startBackgroundFrame: function(startTime)
    {
        if (!this._hasThreadedCompositing) {
            this._lastFrame = null;
            this._hasThreadedCompositing = true;
        }
        if (this._lastFrame)
            this._flushFrame(this._lastFrame, startTime);

        this._lastFrame = new WebInspector.TimelineFrame(startTime, startTime - this._minimumRecordTime);
    },

    /**
     * @param {number} startTime
     */
    _startMainThreadFrame: function(startTime)
    {
        if (this._lastFrame)
            this._flushFrame(this._lastFrame, startTime);
        this._lastFrame = new WebInspector.TimelineFrame(startTime, startTime - this._minimumRecordTime);
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     * @param {number} endTime
     */
    _flushFrame: function(frame, endTime)
    {
        frame._setLayerTree(this._lastLayerTree);
        frame._setEndTime(endTime);
        this._frames.push(frame);
    },

    /**
     * @param {!Array.<string>} types
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {?WebInspector.TimelineModel.Record} record
     */
    _findRecordRecursively: function(types, record)
    {
        if (types.indexOf(record.type()) >= 0)
            return record;
        if (!record.children())
            return null;
        for (var i = 0; i < record.children().length; ++i) {
            var result = this._findRecordRecursively(types, record.children()[i]);
            if (result)
                return result;
        }
        return null;
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @param {!WebInspector.Target} target
 * @extends {WebInspector.TimelineFrameModelBase}
 */
WebInspector.TimelineFrameModel = function(target)
{
    WebInspector.TimelineFrameModelBase.call(this, target);
}

WebInspector.TimelineFrameModel._mainFrameMarkers = [
    WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation,
    WebInspector.TimelineModel.RecordType.InvalidateLayout,
    WebInspector.TimelineModel.RecordType.BeginFrame,
    WebInspector.TimelineModel.RecordType.ScrollLayer
];

WebInspector.TimelineFrameModel.prototype = {
    reset: function()
    {
        this._mergeRecords = true;
        this._mergingBuffer = new WebInspector.TimelineMergingRecordBuffer();
        WebInspector.TimelineFrameModelBase.prototype.reset.call(this);
    },

    /**
     * @param {boolean} value
     */
    setMergeRecords: function(value)
    {
        this._mergeRecords = value;
    },

    /**
     * @param {!Array.<!WebInspector.TimelineModel.Record>} records
     */
    addRecords: function(records)
    {
        if (!records.length)
            return;
        if (records[0].startTime() < this._minimumRecordTime)
            this._minimumRecordTime = records[0].startTime();
        for (var i = 0; i < records.length; ++i)
            this.addRecord(records[i]);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    addRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var programRecord = record.type() === recordTypes.Program ? record : null;

        // Start collecting main frame
        if (programRecord) {
            if (!this._framePendingCommit && this._findRecordRecursively(WebInspector.TimelineFrameModel._mainFrameMarkers, programRecord))
                this._framePendingCommit = new WebInspector.PendingFrame();
        }
        /** type {Array.<!WebInspector.TimelineModel.Record>} */
        var records = [];
        if (!this._mergeRecords)
            records = [record];
        else
            records = this._mergingBuffer.process(record.thread(), /** type {Array.<!WebInspector.TimelineModel.Record>} */(programRecord ? record.children() || [] : [record]));
        for (var i = 0; i < records.length; ++i) {
            if (records[i].thread() === WebInspector.TimelineModel.MainThreadName)
                this._addMainThreadRecord(programRecord, records[i]);
            else
                this._addBackgroundRecord(records[i]);
        }
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _addBackgroundRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        if (record.type() === recordTypes.BeginFrame)
            this.handleBeginFrame(record.startTime());
        else if (record.type() === recordTypes.DrawFrame)
            this.handleDrawFrame(record.startTime());
        else if (record.type() === recordTypes.RequestMainThreadFrame)
            this.handleRequestMainThreadFrame();
        else if (record.type() === recordTypes.ActivateLayerTree)
            this.handleActivateLayerTree();

        if (this._lastFrame)
            this._lastFrame._addTimeFromRecord(record);
    },

    /**
     * @param {?WebInspector.TimelineModel.Record} programRecord
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _addMainThreadRecord: function(programRecord, record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        if (record.type() === recordTypes.UpdateLayerTree && record.data()["layerTree"])
            this.handleLayerTreeSnapshot(new WebInspector.DeferredAgentLayerTree(this.target().weakReference(), record.data()["layerTree"]));
        if (!this._hasThreadedCompositing) {
            if (record.type() === recordTypes.BeginFrame)
                this._startMainThreadFrame(record.startTime());

            if (!this._lastFrame)
                return;

            this._lastFrame._addTimeFromRecord(record);

            // Account for "other" time at the same time as the first child.
            if (programRecord.children()[0] === record)
                this._lastFrame._addTimeForCategory("other", this._deriveOtherTime(programRecord));
            return;
        }

        if (!this._framePendingCommit)
            return;

        WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord(this._framePendingCommit.timeByCategory, record);
        if (programRecord.children()[0] === record)
            this._framePendingCommit.timeByCategory["other"] = (this._framePendingCommit.timeByCategory["other"] || 0) + this._deriveOtherTime(programRecord);

        if (record.type() === recordTypes.CompositeLayers)
            this.handleCompositeLayers();
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} programRecord
     * @return {number}
     */
    _deriveOtherTime: function(programRecord)
    {
        var accounted = 0;
        for (var i = 0; i < programRecord.children().length; ++i)
            accounted += programRecord.children()[i].endTime() - programRecord.children()[i].startTime();
        return programRecord.endTime() - programRecord.startTime() - accounted;
    },

    __proto__: WebInspector.TimelineFrameModelBase.prototype,
};

/**
 * @constructor
 * @param {!WebInspector.Target} target
 * @extends {WebInspector.TimelineFrameModelBase}
 */
WebInspector.TracingTimelineFrameModel = function(target)
{
    WebInspector.TimelineFrameModelBase.call(this, target);
}

WebInspector.TracingTimelineFrameModel._mainFrameMarkers = [
    WebInspector.TracingTimelineModel.RecordType.ScheduleStyleRecalculation,
    WebInspector.TracingTimelineModel.RecordType.InvalidateLayout,
    WebInspector.TracingTimelineModel.RecordType.BeginMainThreadFrame,
    WebInspector.TracingTimelineModel.RecordType.ScrollLayer
];

WebInspector.TracingTimelineFrameModel.prototype = {
    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     * @param {string} sessionId
     */
    addTraceEvents: function(events, sessionId)
    {
        this._sessionId = sessionId;
        if (!events.length)
            return;
        if (events[0].startTime < this._minimumRecordTime)
            this._minimumRecordTime = events[0].startTime;
        for (var i = 0; i < events.length; ++i)
            this._addTraceEvent(events[i]);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addTraceEvent: function(event)
    {
        var eventNames = WebInspector.TracingTimelineModel.RecordType;

        if (event.name === eventNames.SetLayerTreeId) {
            if (this._sessionId === event.args["sessionId"])
                this._layerTreeId = event.args["layerTreeId"];
            return;
        }
        if (event.name === eventNames.TracingStartedInPage) {
            this._mainThread = event.thread;
            return;
        }
        if (event.thread === this._mainThread)
            this._addMainThreadTraceEvent(event);
        else
            this._addBackgroundTraceEvent(event);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addBackgroundTraceEvent: function(event)
    {
        var eventNames = WebInspector.TracingTimelineModel.RecordType;

        if (event.phase === WebInspector.TracingModel.Phase.SnapshotObject && event.name === eventNames.LayerTreeHostImplSnapshot && parseInt(event.id, 0) === this._layerTreeId) {
            this.handleLayerTreeSnapshot(new WebInspector.DeferredTracingLayerTree(this.target().weakReference(), event.args["snapshot"]["active_tree"]["root_layer"], event.args["snapshot"]["device_viewport_size"]));
            return;
        }
        if (this._lastFrame && event.selfTime)
            this._lastFrame._addTimeForCategory(WebInspector.TracingTimelineUIUtils.eventStyle(event).category.name, event.selfTime);

        if (event.args["layerTreeId"] !== this._layerTreeId)
            return;

        var timestamp = event.startTime;
        if (event.name === eventNames.BeginFrame)
            this.handleBeginFrame(timestamp);
        else if (event.name === eventNames.DrawFrame)
            this.handleDrawFrame(timestamp);
        else if (event.name === eventNames.ActivateLayerTree)
            this.handleActivateLayerTree();
        else if (event.name === eventNames.RequestMainThreadFrame)
            this.handleRequestMainThreadFrame();
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addMainThreadTraceEvent: function(event)
    {
        var eventNames = WebInspector.TracingTimelineModel.RecordType;
        var timestamp = event.startTime;
        var selfTime = event.selfTime || 0;

        if (!this._hasThreadedCompositing) {
            if (event.name === eventNames.BeginMainThreadFrame)
                this._startMainThreadFrame(timestamp);
            if (!this._lastFrame)
                return;
            if (!selfTime)
                return;

            var categoryName = WebInspector.TracingTimelineUIUtils.eventStyle(event).category.name;
            this._lastFrame._addTimeForCategory(categoryName, selfTime);
            return;
        }

        if (!this._framePendingCommit && WebInspector.TracingTimelineFrameModel._mainFrameMarkers.indexOf(event.name) >= 0)
            this._framePendingCommit = new WebInspector.PendingFrame();
        if (!this._framePendingCommit)
            return;
        if (event.name === eventNames.Paint && event.args["data"]["layerId"] && event.picture) {
            /** @type {!WebInspector.LayerPaintEvent} */
            var paintEvent = {layerId: event.args["data"]["layerId"], picture: event.picture, rect: event.layerRect};
            this._framePendingCommit.paints.push(paintEvent);
        }

        if (selfTime) {
            var categoryName = WebInspector.TracingTimelineUIUtils.eventStyle(event).category.name;
            this._framePendingCommit.timeByCategory[categoryName] = (this._framePendingCommit.timeByCategory[categoryName] || 0) + selfTime;
        }
        if (event.name === eventNames.CompositeLayers && event.args["layerTreeId"] === this._layerTreeId)
            this.handleCompositeLayers();
    },

    __proto__: WebInspector.TimelineFrameModelBase.prototype
}

/**
 * @constructor
 * @param {!Array.<!WebInspector.TimelineFrame>} frames
 */
WebInspector.FrameStatistics = function(frames)
{
    this.frameCount = frames.length;
    this.minDuration = Infinity;
    this.maxDuration = 0;
    this.timeByCategory = {};
    this.startOffset = frames[0].startTimeOffset;
    var lastFrame = frames[this.frameCount - 1];
    this.endOffset = lastFrame.startTimeOffset + lastFrame.duration;

    var totalDuration = 0;
    var sumOfSquares = 0;
    for (var i = 0; i < this.frameCount; ++i) {
        var duration = frames[i].duration;
        totalDuration += duration;
        sumOfSquares += duration * duration;
        this.minDuration = Math.min(this.minDuration, duration);
        this.maxDuration = Math.max(this.maxDuration, duration);
        WebInspector.FrameStatistics._aggregateTimeByCategory(this.timeByCategory, frames[i].timeByCategory);
    }
    this.average = totalDuration / this.frameCount;
    var variance = sumOfSquares / this.frameCount - this.average * this.average;
    this.stddev = Math.sqrt(variance);
}

/**
 * @param {!Object} total
 * @param {!Object} addend
 */
WebInspector.FrameStatistics._aggregateTimeByCategory = function(total, addend)
{
    for (var category in addend)
        total[category] = (total[category] || 0) + addend[category];
}

/**
 * @constructor
 * @param {number} startTime
 * @param {number} startTimeOffset
 */
WebInspector.TimelineFrame = function(startTime, startTimeOffset)
{
    this.startTime = startTime;
    this.startTimeOffset = startTimeOffset;
    this.endTime = this.startTime;
    this.duration = 0;
    this.timeByCategory = {};
    this.cpuTime = 0;
    /** @type {?WebInspector.DeferredLayerTree} */
    this.layerTree = null;
    this.paintTiles = null;
}

WebInspector.TimelineFrame.prototype = {
    /**
     * @param {number} endTime
     */
    _setEndTime: function(endTime)
    {
        this.endTime = endTime;
        this.duration = this.endTime - this.startTime;
    },

    /**
     * @param {?WebInspector.DeferredLayerTree} layerTree
     */
    _setLayerTree: function(layerTree)
    {
        this.layerTree = layerTree;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _addTimeFromRecord: function(record)
    {
        if (!record.endTime())
            return;
        var timeByCategory = {};
        WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord(timeByCategory, record);
        this._addTimeForCategories(timeByCategory);
    },

    /**
     * @param {!Object} timeByCategory
     */
    _addTimeForCategories: function(timeByCategory)
    {
        for (var category in timeByCategory)
            this._addTimeForCategory(category, timeByCategory[category]);
    },

    /**
     * @param {string} category
     * @param {number} time
     */
    _addTimeForCategory: function(category, time)
    {
        this.timeByCategory[category] = (this.timeByCategory[category] || 0) + time;
        this.cpuTime += time;
    },
}

/**
 * @typedef {!{layerId: string, rect: !Array.<number>, picture: string}}
 */
WebInspector.LayerPaintEvent;

/**
 * @constructor
 */
WebInspector.PendingFrame = function()
{
    /** @type {!Object.<string, number>} */
    this.timeByCategory = {};
    /** @type {!Array.<!WebInspector.LayerPaintEvent>} */
    this.paints = [];
}
