/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 */
WebInspector.TimelineModel = function()
{
    this._records = [];
    this._minimumRecordTime = -1;
    this._maximumRecordTime = -1;
    this._stringPool = {};

    WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineEventRecorded, this._onRecordAdded, this);
    WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStarted, this._onStarted, this);
    WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStopped, this._onStopped, this);
}

WebInspector.TimelineModel.TransferChunkLengthBytes = 5000000;

WebInspector.TimelineModel.RecordType = {
    Root: "Root",
    Program: "Program",
    EventDispatch: "EventDispatch",

    GPUTask: "GPUTask",

    RequestMainThreadFrame: "RequestMainThreadFrame",
    BeginFrame: "BeginFrame",
    ActivateLayerTree: "ActivateLayerTree",
    DrawFrame: "DrawFrame",
    ScheduleStyleRecalculation: "ScheduleStyleRecalculation",
    RecalculateStyles: "RecalculateStyles",
    InvalidateLayout: "InvalidateLayout",
    Layout: "Layout",
    AutosizeText: "AutosizeText",
    PaintSetup: "PaintSetup",
    Paint: "Paint",
    Rasterize: "Rasterize",
    ScrollLayer: "ScrollLayer",
    DecodeImage: "DecodeImage",
    ResizeImage: "ResizeImage",
    CompositeLayers: "CompositeLayers",

    ParseHTML: "ParseHTML",

    TimerInstall: "TimerInstall",
    TimerRemove: "TimerRemove",
    TimerFire: "TimerFire",

    XHRReadyStateChange: "XHRReadyStateChange",
    XHRLoad: "XHRLoad",
    EvaluateScript: "EvaluateScript",

    MarkLoad: "MarkLoad",
    MarkDOMContent: "MarkDOMContent",
    MarkFirstPaint: "MarkFirstPaint",

    TimeStamp: "TimeStamp",
    Time: "Time",
    TimeEnd: "TimeEnd",

    ScheduleResourceRequest: "ScheduleResourceRequest",
    ResourceSendRequest: "ResourceSendRequest",
    ResourceReceiveResponse: "ResourceReceiveResponse",
    ResourceReceivedData: "ResourceReceivedData",
    ResourceFinish: "ResourceFinish",

    FunctionCall: "FunctionCall",
    GCEvent: "GCEvent",

    RequestAnimationFrame: "RequestAnimationFrame",
    CancelAnimationFrame: "CancelAnimationFrame",
    FireAnimationFrame: "FireAnimationFrame",

    WebSocketCreate : "WebSocketCreate",
    WebSocketSendHandshakeRequest : "WebSocketSendHandshakeRequest",
    WebSocketReceiveHandshakeResponse : "WebSocketReceiveHandshakeResponse",
    WebSocketDestroy : "WebSocketDestroy",

    EmbedderCallback : "EmbedderCallback",
}

WebInspector.TimelineModel.Events = {
    RecordAdded: "RecordAdded",
    RecordsCleared: "RecordsCleared",
    RecordingStarted: "RecordingStarted",
    RecordingStopped: "RecordingStopped"
}

/**
 * @param {!Object} total
 * @param {!Object} rawRecord
 */
WebInspector.TimelineModel.aggregateTimeForRecord = function(total, rawRecord)
{
    var childrenTime = 0;
    var children = rawRecord["children"] || [];
    for (var i = 0; i < children.length; ++i) {
        WebInspector.TimelineModel.aggregateTimeForRecord(total, children[i]);
        childrenTime += children[i].endTime - children[i].startTime;
    }
    var categoryName = WebInspector.TimelinePresentationModel.recordStyle(rawRecord).category.name;
    var ownTime = rawRecord.endTime - rawRecord.startTime - childrenTime;
    total[categoryName] = (total[categoryName] || 0) + ownTime;
}

/**
 * @param {!Object} total
 * @param {!Object} addend
 */
WebInspector.TimelineModel.aggregateTimeByCategory = function(total, addend)
{
    for (var category in addend)
        total[category] = (total[category] || 0) + addend[category];
}

WebInspector.TimelineModel.prototype = {
    /**
     * @param {boolean=} includeCounters
     */
    startRecording: function(includeCounters)
    {
        this._clientInitiatedRecording = true;
        this.reset();
        var maxStackFrames = WebInspector.settings.timelineCaptureStacks.get() ? 30 : 0;
        var includeGPUEvents = WebInspector.experimentsSettings.gpuTimeline.isEnabled();
        WebInspector.timelineManager.start(maxStackFrames, includeCounters, includeGPUEvents, this._fireRecordingStarted.bind(this));
    },

    stopRecording: function()
    {
        if (!this._clientInitiatedRecording) {
            WebInspector.timelineManager.start(undefined, undefined, undefined, stopTimeline.bind(this));
            return;
        }

        /**
         * Console started this one and we are just sniffing it. Initiate recording so that we
         * could stop it.
         * @this {WebInspector.TimelineModel}
         */
        function stopTimeline()
        {
            WebInspector.timelineManager.stop(this._fireRecordingStopped.bind(this));
        }

        this._clientInitiatedRecording = false;
        WebInspector.timelineManager.stop(this._fireRecordingStopped.bind(this));
    },

    get records()
    {
        return this._records;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRecordAdded: function(event)
    {
        if (this._collectionEnabled)
            this._addRecord(/** @type {!TimelineAgent.TimelineEvent} */(event.data));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onStarted: function(event)
    {
        if (event.data) {
            // Started from console.
            this._fireRecordingStarted();
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onStopped: function(event)
    {
        if (event.data) {
            // Stopped from console.
            this._fireRecordingStopped();
        }
    },

    _fireRecordingStarted: function()
    {
        this._collectionEnabled = true;
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted);
    },

    _fireRecordingStopped: function()
    {
        this._collectionEnabled = false;
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStopped);
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _addRecord: function(record)
    {
        this._internStringsAndAssignEndTime(record);
        this._records.push(record);
        this._updateBoundaries(record);
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordAdded, record);
    },

    /**
     * @param {!Blob} file
     * @param {!WebInspector.Progress} progress
     */
    loadFromFile: function(file, progress)
    {
        var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
        var fileReader = this._createFileReader(file, delegate);
        var loader = new WebInspector.TimelineModelLoader(this, fileReader, progress);
        fileReader.start(loader);
    },

    /**
     * @param {string} url
     */
    loadFromURL: function(url, progress)
    {
        var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
        var urlReader = new WebInspector.ChunkedXHRReader(url, delegate);
        var loader = new WebInspector.TimelineModelLoader(this, urlReader, progress);
        urlReader.start(loader);
    },

    _createFileReader: function(file, delegate)
    {
        return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineModel.TransferChunkLengthBytes, delegate);
    },

    _createFileWriter: function()
    {
        return new WebInspector.FileOutputStream();
    },

    saveToFile: function()
    {
        var now = new Date();
        var fileName = "TimelineRawData-" + now.toISO8601Compact() + ".json";
        var stream = this._createFileWriter();

        /**
         * @param {boolean} accepted
         * @this {WebInspector.TimelineModel}
         */
        function callback(accepted)
        {
            if (!accepted)
                return;
            var saver = new WebInspector.TimelineSaver(stream);
            saver.save(this._records, window.navigator.appVersion);
        }
        stream.open(fileName, callback.bind(this));
    },

    reset: function()
    {
        this._records = [];
        this._stringPool = {};
        this._minimumRecordTime = -1;
        this._maximumRecordTime = -1;
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordsCleared);
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._minimumRecordTime;
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._maximumRecordTime;
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _updateBoundaries: function(record)
    {
        var startTime = record.startTime;
        var endTime = record.endTime;

        if (this._minimumRecordTime === -1 || startTime < this._minimumRecordTime)
            this._minimumRecordTime = startTime;
        if (this._maximumRecordTime === -1 || endTime > this._maximumRecordTime)
            this._maximumRecordTime = endTime;
    },

    /**
     * @param {!Object} rawRecord
     * @return {number}
     */
    recordOffsetInMillis: function(rawRecord)
    {
        return rawRecord.startTime - this._minimumRecordTime;
    },

    /**
     * @param {!TimelineAgent.TimelineEvent} record
     */
    _internStringsAndAssignEndTime: function(record)
    {
        // We'd like to dump raw protocol in tests, so add an option to not assign implicit end time.
        if (!WebInspector.TimelineModel["_doNotAssignEndTime"]) {
            if (typeof record.startTime === "number" && typeof record.endTime !== "number")
                record.endTime = record.startTime;
        }

        for (var name in record) {
            var value = record[name];
            if (typeof value !== "string")
                continue;

            var interned = this._stringPool[value];
            if (typeof interned === "string")
                record[name] = interned;
            else
                this._stringPool[value] = value;
        }

        var children = record.children;
        for (var i = 0; children && i < children.length; ++i)
            this._internStringsAndAssignEndTime(children[i]);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WebInspector.OutputStream}
 * @param {!WebInspector.TimelineModel} model
 * @param {!{cancel: function()}} reader
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineModelLoader = function(model, reader, progress)
{
    this._model = model;
    this._reader = reader;
    this._progress = progress;
    this._buffer = "";
    this._firstChunk = true;
}

WebInspector.TimelineModelLoader.prototype = {
    /**
     * @param {string} chunk
     */
    write: function(chunk)
    {
        var data = this._buffer + chunk;
        var lastIndex = 0;
        var index;
        do {
            index = lastIndex;
            lastIndex = WebInspector.TextUtils.findBalancedCurlyBrackets(data, index);
        } while (lastIndex !== -1)

        var json = data.slice(0, index) + "]";
        this._buffer = data.slice(index);

        if (!index)
            return;

        // Prepending "0" to turn string into valid JSON.
        if (!this._firstChunk)
            json = "[0" + json;

        var items;
        try {
            items = /** @type {!Array.<!TimelineAgent.TimelineEvent>} */ (JSON.parse(json));
        } catch (e) {
            WebInspector.showErrorMessage("Malformed timeline data.");
            this._model.reset();
            this._reader.cancel();
            this._progress.done();
            return;
        }

        if (this._firstChunk) {
            this._version = items[0];
            this._firstChunk = false;
            this._model.reset();
        }

        // Skip 0-th element - it is either version or 0.
        for (var i = 1, size = items.length; i < size; ++i)
            this._model._addRecord(items[i]);
    },

    close: function() { }
}

/**
 * @constructor
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineModelLoadFromFileDelegate = function(model, progress)
{
    this._model = model;
    this._progress = progress;
}

WebInspector.TimelineModelLoadFromFileDelegate.prototype = {
    onTransferStarted: function()
    {
        this._progress.setTitle(WebInspector.UIString("Loading\u2026"));
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader)
    {
        if (this._progress.isCanceled()) {
            reader.cancel();
            this._progress.done();
            this._model.reset();
            return;
        }

        var totalSize = reader.fileSize();
        if (totalSize) {
            this._progress.setTotalWork(totalSize);
            this._progress.setWorked(reader.loadedSize());
        }
    },

    onTransferFinished: function()
    {
        this._progress.done();
    },

    /**
     * @param {!WebInspector.ChunkedReader} reader
     */
    onError: function(reader, event)
    {
        this._progress.done();
        this._model.reset();
        switch (event.target.error.code) {
        case FileError.NOT_FOUND_ERR:
            WebInspector.showErrorMessage(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
            break;
        case FileError.NOT_READABLE_ERR:
            WebInspector.showErrorMessage(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
            break;
        case FileError.ABORT_ERR:
            break;
        default:
            WebInspector.showErrorMessage(WebInspector.UIString("An error occurred while reading the file \"%s\"", reader.fileName()));
        }
    }
}

/**
 * @constructor
 */
WebInspector.TimelineSaver = function(stream)
{
    this._stream = stream;
}

WebInspector.TimelineSaver.prototype = {
    /**
     * @param {!Array.<*>} records
     * @param {string} version
     */
    save: function(records, version)
    {
        this._records = records;
        this._recordIndex = 0;
        this._prologue = "[" + JSON.stringify(version);

        this._writeNextChunk(this._stream);
    },

    _writeNextChunk: function(stream)
    {
        const separator = ",\n";
        var data = [];
        var length = 0;

        if (this._prologue) {
            data.push(this._prologue);
            length += this._prologue.length;
            delete this._prologue;
        } else {
            if (this._recordIndex === this._records.length) {
                stream.close();
                return;
            }
            data.push("");
        }
        while (this._recordIndex < this._records.length) {
            var item = JSON.stringify(this._records[this._recordIndex]);
            var itemLength = item.length + separator.length;
            if (length + itemLength > WebInspector.TimelineModel.TransferChunkLengthBytes)
                break;
            length += itemLength;
            data.push(item);
            ++this._recordIndex;
        }
        if (this._recordIndex === this._records.length)
            data.push(data.pop() + "]");
        stream.write(data.join(separator), this._writeNextChunk.bind(this));
    }
}

/**
 * @constructor
 */
WebInspector.TimelineMergingRecordBuffer = function()
{
    this._backgroundRecordsBuffer = [];
}

/**
 * @constructor
 */
WebInspector.TimelineMergingRecordBuffer.prototype = {
    /**
     * @param {string} thread
     * @param {!Array.<!TimelineAgent.TimelineEvent>} records
     * @return {!Array.<!TimelineAgent.TimelineEvent>}
     */
    process: function(thread, records)
    {
        if (thread) {
            this._backgroundRecordsBuffer = this._backgroundRecordsBuffer.concat(records);
            return [];
        }
        /**
         * @param {!TimelineAgent.TimelineEvent} a
         * @param {!TimelineAgent.TimelineEvent} b
         */
        function recordTimestampComparator(a, b)
        {
            // Never return 0, as the merge function will squash identical entries.
            return a.startTime < b.startTime ? -1 : 1;
        }
        var result = this._backgroundRecordsBuffer.mergeOrdered(records, recordTimestampComparator);
        this._backgroundRecordsBuffer = [];
        return result;
    }
};
