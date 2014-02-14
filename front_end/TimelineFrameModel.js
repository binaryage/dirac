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
    this._reset();
    this._model = model;
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._reset, this);

    var records = model.records;
    for (var i = 0; i < records.length; ++i)
        this._addRecord(records[i]);
}

WebInspector.TimelineFrameModel.Events = {
    FrameAdded: "FrameAdded"
}

WebInspector.TimelineFrameModel.prototype = {
    /**
     * @return {!Array.<!WebInspector.TimelineFrame>}
     */
    mainThreadFrames: function()
    {
        return this._mainThreadFrames;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineFrame>}
     */
    backgroundFrames: function()
    {
        return this._backgroundFrames;
    },

    /**
     * @param {string} frameId
     * @return {?WebInspector.TimelineFrame}
     */
    frameById: function(frameId)
    {
        return this._frameById[frameId];
    },

    _reset: function()
    {
        this._backgroundFrames = [];
        this._mainThreadFrames = [];
        this._frameById = {};
        this._lastMainThreadFrame = null;
        this._lastBackgroundFrame = null;
        this._mergingBuffer = new WebInspector.TimelineMergingRecordBuffer();
    },

    _onRecordAdded: function(event)
    {
        var record = /** @type {!TimelineAgent.TimelineEvent} */(event.data);
        this._addRecord(record);
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _addRecord: function(record)
    {
        var programRecord = null;
        var records;
        if (record.type === WebInspector.TimelineModel.RecordType.Program) {
            programRecord = record;
            records = record.children || [];
            if (this._lastMainThreadFrame)
                this._lastMainThreadFrame.timeByCategory["other"] += WebInspector.TimelineModel.durationInSeconds(programRecord);
        } else {
            records = [record];
        }
        var mergedRecords = this._mergingBuffer.process(record.thread, records);
        for (var i = 0; i < mergedRecords.length; ++i)
            this._innerAddRecord(mergedRecords[i].thread ? null : programRecord, mergedRecords[i]);
    },

    /**
     * @param {?TimelineAgent.TimelineEvent} programRecord
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _innerAddRecord: function(programRecord, record)
    {
        var isFrameRecord = record.type === WebInspector.TimelineModel.RecordType.BeginFrame;
        var programTimeCarryover = isFrameRecord && programRecord ? WebInspector.TimelineModel.endTimeInSeconds(programRecord) - WebInspector.TimelineModel.startTimeInSeconds(record) : 0;
        var lastFrame = record.thread ? this._lastBackgroundFrame : this._lastMainThreadFrame;
        if (isFrameRecord && lastFrame) {
            this._flushFrame(lastFrame, record, programTimeCarryover);
            lastFrame = this._createFrame(record, programTimeCarryover);
        } else if (record.type === WebInspector.TimelineModel.RecordType.ActivateLayerTree) {
            if (lastFrame)
                lastFrame.mainThreadFrameId = record.data.id;
        } else {
            if (!lastFrame)
                lastFrame = this._createFrame(record, programTimeCarryover);
            if (!record.thread) {
                WebInspector.TimelineModel.aggregateTimeForRecord(lastFrame.timeByCategory, record);
                var duration = WebInspector.TimelineModel.durationInSeconds(record);
                lastFrame.cpuTime += duration;
                lastFrame.timeByCategory["other"] -= duration;
            } else if (!isFrameRecord && WebInspector.TimelinePresentationModel.recordStyle(record).category === WebInspector.TimelinePresentationModel.categories().painting) {
                this._updatePaintingDuration(record);
            }
        }
        if (record.thread)
            this._lastBackgroundFrame = lastFrame;
        else
            this._lastMainThreadFrame = lastFrame;
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     * @param {!Object} record
     * @param {number} programTimeCarryover
     */
    _flushFrame: function(frame, record, programTimeCarryover)
    {
        frame.endTime = WebInspector.TimelineModel.startTimeInSeconds(record);
        frame.duration = frame.endTime - frame.startTime;
        frame.timeByCategory["other"] -= programTimeCarryover;
        // Alternatively, we could compute CPU time as sum of all Program events.
        // This way it's a bit more flexible, as it works in case there's no program events.
        frame.cpuTime += frame.timeByCategory["other"];
        if (frame.isBackground) {
            var paintDuration = this._paintEndTime - this._paintStartTime;
            if (paintDuration)
                frame.timeByCategory[WebInspector.TimelinePresentationModel.categories().painting.name] = paintDuration;
            this._backgroundFrames.push(frame);
        } else {
            this._mainThreadFrames.push(frame);
            this._frameById[frame.id] = frame;
        }
        this.dispatchEventToListeners(WebInspector.TimelineFrameModel.Events.FrameAdded, frame);
    },

    /**
     * @param {!Object} record
     * @param {number} programTimeCarryover
     */
    _createFrame: function(record, programTimeCarryover)
    {
        var frame = new WebInspector.TimelineFrame();
        frame.startTime = WebInspector.TimelineModel.startTimeInSeconds(record);
        frame.startTimeOffset = this._model.recordOffsetInSeconds(record);
        frame.timeByCategory["other"] = programTimeCarryover;
        frame.isBackground = !!record.thread;
        frame.id = record.data && record.data["id"];
        if (frame.isBackground) {
            this._paintStartTime = null;
            this._paintEndTime = null;
        }
        return frame;
    },

    /**
     * @param {!Object} record
     */
    _updatePaintingDuration: function(record)
    {
        var startTime = WebInspector.TimelineModel.startTimeInSeconds(record);
        this._paintStartTime = this._paintStartTime ? Math.min(this._paintStartTime, startTime) : startTime;
        var endTime = WebInspector.TimelineModel.endTimeInSeconds(record);
        this._paintEndTime = this._paintEndTime ? Math.max(this._paintEndTime, endTime) : endTime;
    },

    dispose: function()
    {
        this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
        this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._reset, this);
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
 */
WebInspector.TimelineFrame = function()
{
    this.timeByCategory = {};
    this.cpuTime = 0;
    /** @type {string} */
    this.mainThreadFrameId;
}
