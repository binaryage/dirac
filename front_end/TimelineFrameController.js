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
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameOverview} frameOverview
 * @param {!WebInspector.TimelinePresentationModel} presentationModel
 */
WebInspector.TimelineFrameController = function(model, frameOverview, presentationModel)
{
    this._lastMainThreadFrame = null;
    this._lastBackgroundFrame = null;
    this._model = model;
    this._frameOverview = frameOverview;
    this._presentationModel = presentationModel;
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

    this._frameOverview.reset();
    var records = model.records;
    for (var i = 0; i < records.length; ++i)
        this._addRecord(records[i]);
    this._frameOverview.update();
}

WebInspector.TimelineFrameController.prototype = {
    _onRecordAdded: function(event)
    {
        this._addRecord(event.data);
    },

    _onRecordsCleared: function()
    {
        this._lastMainThreadFrame = null;
        this._lastBackgroundFrame = null;
    },

    _addRecord: function(record)
    {
        var records;
        var programRecord;
        if (record.type === WebInspector.TimelineModel.RecordType.Program) {
            programRecord = record;
            if (this._lastMainThreadFrame)
                this._lastMainThreadFrame.timeByCategory["other"] += WebInspector.TimelineModel.durationInSeconds(programRecord);
            records = record["children"] || [];
        } else
            records = [record];
        records.forEach(this._innerAddRecord.bind(this, programRecord));
    },

    /**
     * @param {!Object} programRecord
     * @param {!Object} record
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
        this._frameOverview.addFrame(frame);
        this._presentationModel.addFrame(frame);
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
        return frame;
    },

    dispose: function()
    {
        this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
        this._model.removeEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);
    }
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
