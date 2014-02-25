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
 * @extends {WebInspector.Object}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineFrameModel = function(model)
{
    this._model = model;

    this.reset();
    var records = model.records;
    for (var i = 0; i < records.length; ++i)
        this.addRecord(records[i]);
}

WebInspector.TimelineFrameModel.Events = {
    FrameAdded: "FrameAdded"
}

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
        function compareStartTime(value, object)
        {
            return value - object.startTime;
        }
        function compareEndTime(value, object)
        {
            return value - object.endTime;
        }
        var frames = this._frames;
        var firstFrame = insertionIndexForObjectInListSortedByFunction(startTime, frames, compareStartTime);
        var lastFrame = insertionIndexForObjectInListSortedByFunction(endTime, frames, compareEndTime, true);
        return frames.slice(firstFrame, lastFrame);
    },

    reset: function()
    {
        this._frames = [];
        this._lastFrame = null;
        this._hasThreadedCompositing = false;
        this._mainFrameCommitted = false;
        this._mainFrameRequested = false;
        this._aggregatedMainThreadWork = null;
        this._mergingBuffer = new WebInspector.TimelineMergingRecordBuffer();
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    addRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var programRecord = record.type === recordTypes.Program ? record : null;

        // Start collecting main frame
        if (programRecord) {
            if (!this._aggregatedMainThreadWork && this._findRecordRecursively([recordTypes.ScheduleStyleRecalculation, recordTypes.InvalidateLayout, recordTypes.BeginFrame], programRecord))
                this._aggregatedMainThreadWork = {};
        }

        var records = this._mergingBuffer.process(record.thread, programRecord ? record.children || [] : [record]);
        for (var i = 0; i < records.length; ++i) {
            if (records[i].thread)
                this._addBackgroundRecord(records[i]);
            else
                this._addMainThreadRecord(programRecord, records[i]);
        }
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _addBackgroundRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        if (!this._lastFrame) {
            if (record.type === recordTypes.BeginFrame || record.type === recordTypes.DrawFrame)
                this._startBackgroundFrame(record);
            return;
        }

        if (record.type === recordTypes.DrawFrame) {
            // - if it wasn't drawn, it didn't happen!
            // - only show frames that either did not wait for the main thread frame or had one committed.
            if (this._mainFrameCommitted || !this._mainFrameRequested)
                this._startBackgroundFrame(record);
            this._mainFrameCommitted = false;
        } else if (record.type === recordTypes.RequestMainThreadFrame) {
            this._mainFrameRequested = true;
        } else if (record.type === recordTypes.ActivateLayerTree) {
            this._mainFrameRequested = false;
            this._mainFrameCommitted = true;
            this._lastFrame._addTimeForCategories(this._aggregatedMainThreadWorkToAttachToBackgroundFrame);
            this._aggregatedMainThreadWorkToAttachToBackgroundFrame = {};
        }
        this._lastFrame._addTimeFromRecord(record);
    },

    /**
     * @param {?TimelineAgent.TimelineEvent} programRecord
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _addMainThreadRecord: function(programRecord, record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        if (!this._hasThreadedCompositing) {
            if (record.type === recordTypes.BeginFrame)
                this._startMainThreadFrame(record);

            if (!this._lastFrame)
                return;

            this._lastFrame._addTimeFromRecord(record);

            // Account for "other" time at the same time as the first child.
            if (programRecord.children[0] === record) {
                this._deriveOtherTime(programRecord, this._lastFrame.timeByCategory);
                this._lastFrame._updateCpuTime();
            }
            return;
        }

        if (!this._aggregatedMainThreadWork)
            return;

        WebInspector.TimelineModel.aggregateTimeForRecord(this._aggregatedMainThreadWork, record);
        if (programRecord.children[0] === record)
            this._deriveOtherTime(programRecord, this._aggregatedMainThreadWork);

        if (record.type === recordTypes.CompositeLayers) {
            this._aggregatedMainThreadWorkToAttachToBackgroundFrame = this._aggregatedMainThreadWork;
            this._aggregatedMainThreadWork = null;
        }
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} programRecord
     * @param {!Object} timeByCategory
     */
    _deriveOtherTime: function(programRecord, timeByCategory)
    {
        var accounted = 0;
        for (var i = 0; i < programRecord.children.length; ++i)
            accounted += programRecord.children[i].endTime - programRecord.children[i].startTime;
        var otherTime = programRecord.endTime - programRecord.startTime - accounted;
        timeByCategory["other"] = (timeByCategory["other"] || 0) + otherTime;
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _startBackgroundFrame: function(record)
    {
        if (!this._hasThreadedCompositing) {
            this._lastFrame = null;
            this._hasThreadedCompositing = true;
        }
        if (this._lastFrame)
            this._flushFrame(this._lastFrame, record);

        this._lastFrame = new WebInspector.TimelineFrame(this, record);
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _startMainThreadFrame: function(record)
    {
        if (this._lastFrame)
            this._flushFrame(this._lastFrame, record);
        this._lastFrame = new WebInspector.TimelineFrame(this, record);
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     * @param {!Object} record
     */
    _flushFrame: function(frame, record)
    {
        frame._setEndTime(record.startTime);
        this._frames.push(frame);
        this.dispatchEventToListeners(WebInspector.TimelineFrameModel.Events.FrameAdded, frame);
    },

    /**
     * @param {!Array.<string>} types
     * @param {!TimelineAgent.TimelineEvent} record
     * @return {?TimelineAgent.TimelineEvent} record
     */
    _findRecordRecursively: function(types, record)
    {
        if (types.indexOf(record.type) >= 0)
            return record;
        if (!record.children)
            return null;
        for (var i = 0; i < record.children.length; ++i) {
            var result = this._findRecordRecursively(types, record.children[i]);
            if (result)
                return result;
        }
        return null;
    },

    __proto__: WebInspector.Object.prototype
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
        WebInspector.TimelineModel.aggregateTimeByCategory(this.timeByCategory, frames[i].timeByCategory);
    }
    this.average = totalDuration / this.frameCount;
    var variance = sumOfSquares / this.frameCount - this.average * this.average;
    this.stddev = Math.sqrt(variance);
}

/**
 * @constructor
 * @param {!WebInspector.TimelineFrameModel} model
 * @param {!Object} record
 */
WebInspector.TimelineFrame = function(model, record)
{
    this.startTime = record.startTime;
    this.startTimeOffset = model._model.recordOffsetInMillis(record);
    this.endTime = this.startTime;
    this.duration = 0;
    this.timeByCategory = {};
    this.cpuTime = 0;
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
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _addTimeFromRecord: function(record)
    {
        if (!record.endTime)
            return;
        WebInspector.TimelineModel.aggregateTimeForRecord(this.timeByCategory, record);
        this._updateCpuTime();
    },

    /**
     * @param {!Object} timeByCategory
     */
    _addTimeForCategories: function(timeByCategory)
    {
        WebInspector.TimelineModel.aggregateTimeByCategory(this.timeByCategory, timeByCategory);
        this._updateCpuTime();
    },

    _updateCpuTime: function()
    {
        this.cpuTime = 0;
        for (var key in this.timeByCategory)
            this.cpuTime += this.timeByCategory[key];
    }
}
