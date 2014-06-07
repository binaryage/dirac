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
 * @extends {WebInspector.TargetAwareObject}
 * @param {!WebInspector.Target} target
 */
WebInspector.TimelineFrameModel = function(target)
{
    WebInspector.TargetAwareObject.call(this, target);

    this.reset();
}

WebInspector.TimelineFrameModel.Events = {
    FrameAdded: "FrameAdded"
}

WebInspector.TimelineFrameModel._mainFrameMarkers = [
    WebInspector.TimelineModel.RecordType.ScheduleStyleRecalculation,
    WebInspector.TimelineModel.RecordType.InvalidateLayout,
    WebInspector.TimelineModel.RecordType.BeginFrame,
    WebInspector.TimelineModel.RecordType.ScrollLayer
];

WebInspector.TimelineFrameModel.prototype = {
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

    /**
     * @param {boolean} value
     */
    setMergeRecords: function(value)
    {
        this._mergeRecords = value;
    },

    reset: function()
    {
        this._mergeRecords = true;
        this._minimumRecordTime = Infinity;
        this._frames = [];
        this._lastFrame = null;
        this._lastLayerTree = null;
        this._hasThreadedCompositing = false;
        this._mainFrameCommitted = false;
        this._mainFrameRequested = false;
        this._aggregatedMainThreadWork = null;
        this._mergingBuffer = new WebInspector.TimelineMergingRecordBuffer();
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
            if (!this._aggregatedMainThreadWork && this._findRecordRecursively(WebInspector.TimelineFrameModel._mainFrameMarkers, programRecord))
                this._aggregatedMainThreadWork = {};
        }
        /** type {Array.<!WebInspector.TimelineModel.Record>} */
        var records = [];
        if (!this._mergeRecords)
            records = [record];
        else
            records = this._mergingBuffer.process(record.thread(), /** type {Array.<!WebInspector.TimelineModel.Record>} */(programRecord ? record.children() || [] : [record]));
        for (var i = 0; i < records.length; ++i) {
            if (records[i].thread())
                this._addBackgroundRecord(records[i]);
            else
                this._addMainThreadRecord(programRecord, records[i]);
        }
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     * @param {string} sessionId
     */
    addTraceEvents: function(events, sessionId)
    {
        this._sessionId = sessionId;
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
        if (event.phase === WebInspector.TracingModel.Phase.SnapshotObject && event.name === eventNames.LayerTreeHostImplSnapshot && parseInt(event.id, 0) === this._layerTreeId) {
            this.handleLayerTreeSnapshot(new WebInspector.DeferredTracingLayerTree(this.target(), event.args["snapshot"]["active_tree"]["root_layer"]));
            return;
        }

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
        else if (event.name === eventNames.CompositeLayers)
            this.handleCompositeLayers();

        // FIXME: we also need to process main thread events, so we can assign time spent by categories
        // to frames. However, this requires that we can map trace event names to Timeline categories.
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
        this._lastFrame._addTimeForCategories(this._aggregatedMainThreadWorkToAttachToBackgroundFrame);
        this._aggregatedMainThreadWorkToAttachToBackgroundFrame = {};
    },

    handleRequestMainThreadFrame: function()
    {
        if (!this._lastFrame)
            return;
        this._mainFrameRequested = true;
    },

    handleCompositeLayers: function()
    {
        if (!this._hasThreadedCompositing || !this._aggregatedMainThreadWork)
            return;
        this._aggregatedMainThreadWorkToAttachToBackgroundFrame = this._aggregatedMainThreadWork;
        this._aggregatedMainThreadWork = null;
    },

    /**
     * @param {!WebInspector.DeferredLayerTree} layerTree
     */
    handleLayerTreeSnapshot: function(layerTree)
    {
        this._lastLayerTree = layerTree;
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
            this.handleLayerTreeSnapshot(new WebInspector.DeferredAgentLayerTree(this.target(), record.data()["layerTree"]));
        if (!this._hasThreadedCompositing) {
            if (record.type() === recordTypes.BeginFrame)
                this._startMainThreadFrame(record.startTime());

            if (!this._lastFrame)
                return;

            this._lastFrame._addTimeFromRecord(record);

            // Account for "other" time at the same time as the first child.
            if (programRecord.children()[0] === record) {
                this._deriveOtherTime(programRecord, this._lastFrame.timeByCategory);
                this._lastFrame._updateCpuTime();
            }
            return;
        }

        if (!this._aggregatedMainThreadWork)
            return;

        WebInspector.TimelineUIUtils.aggregateTimeForRecord(this._aggregatedMainThreadWork, record);
        if (programRecord.children()[0] === record)
            this._deriveOtherTime(programRecord, this._aggregatedMainThreadWork);

        if (record.type() === recordTypes.CompositeLayers)
            this.handleCompositeLayers();
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} programRecord
     * @param {!Object} timeByCategory
     */
    _deriveOtherTime: function(programRecord, timeByCategory)
    {
        var accounted = 0;
        for (var i = 0; i < programRecord.children().length; ++i)
            accounted += programRecord.children()[i].endTime() - programRecord.children()[i].startTime();
        var otherTime = programRecord.endTime() - programRecord.startTime() - accounted;
        timeByCategory["other"] = (timeByCategory["other"] || 0) + otherTime;
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
        this.dispatchEventToListeners(WebInspector.TimelineFrameModel.Events.FrameAdded, frame);
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

    __proto__: WebInspector.TargetAwareObject.prototype
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
        WebInspector.TimelineUIUtils.aggregateTimeByCategory(this.timeByCategory, frames[i].timeByCategory);
    }
    this.average = totalDuration / this.frameCount;
    var variance = sumOfSquares / this.frameCount - this.average * this.average;
    this.stddev = Math.sqrt(variance);
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
        WebInspector.TimelineUIUtils.aggregateTimeForRecord(this.timeByCategory, record);
        this._updateCpuTime();
    },

    /**
     * @param {!Object} timeByCategory
     */
    _addTimeForCategories: function(timeByCategory)
    {
        WebInspector.TimelineUIUtils.aggregateTimeByCategory(this.timeByCategory, timeByCategory);
        this._updateCpuTime();
    },

    _updateCpuTime: function()
    {
        this.cpuTime = 0;
        for (var key in this.timeByCategory)
            this.cpuTime += this.timeByCategory[key];
    }
}
