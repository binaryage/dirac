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
    WebInspector.Object.call(this);
    this._filters = [];
}

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
    UpdateLayerTree: "UpdateLayerTree",
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
    ConsoleTime: "ConsoleTime",

    ResourceSendRequest: "ResourceSendRequest",
    ResourceReceiveResponse: "ResourceReceiveResponse",
    ResourceReceivedData: "ResourceReceivedData",
    ResourceFinish: "ResourceFinish",

    FunctionCall: "FunctionCall",
    GCEvent: "GCEvent",

    UpdateCounters: "UpdateCounters",

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
    RecordingStopped: "RecordingStopped",
    RecordingProgress: "RecordingProgress",
    RecordFilterChanged: "RecordFilterChanged"
}

WebInspector.TimelineModel.MainThreadName = "main";

/**
 * @param {!Array.<!WebInspector.TimelineModel.Record>} recordsArray
 * @param {?function(!WebInspector.TimelineModel.Record)|?function(!WebInspector.TimelineModel.Record,number)} preOrderCallback
 * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)=} postOrderCallback
 * @return {boolean}
 */
WebInspector.TimelineModel.forAllRecords = function(recordsArray, preOrderCallback, postOrderCallback)
{
    /**
     * @param {!Array.<!WebInspector.TimelineModel.Record>} records
     * @param {number} depth
     * @return {boolean}
     */
    function processRecords(records, depth)
    {
        for (var i = 0; i < records.length; ++i) {
            var record = records[i];
            if (preOrderCallback && preOrderCallback(record, depth))
                return true;
            if (processRecords(record.children(), depth + 1))
                return true;
            if (postOrderCallback && postOrderCallback(record, depth))
                return true;
        }
        return false;
    }
    return processRecords(recordsArray, 0);
}

WebInspector.TimelineModel.prototype = {
    /**
     * @param {boolean} captureStacks
     * @param {boolean} captureMemory
     * @param {boolean} capturePictures
     */
    startRecording: function(captureStacks, captureMemory, capturePictures)
    {
    },

    stopRecording: function()
    {
    },

    /**
     * @param {?function(!WebInspector.TimelineModel.Record)|?function(!WebInspector.TimelineModel.Record,number)} preOrderCallback
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)=} postOrderCallback
     */
    forAllRecords: function(preOrderCallback, postOrderCallback)
    {
        WebInspector.TimelineModel.forAllRecords(this._records, preOrderCallback, postOrderCallback);
    },

    /**
     * @param {!WebInspector.TimelineModel.Filter} filter
     */
    addFilter: function(filter)
    {
        this._filters.push(filter);
        filter._model = this;
    },

    /**
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)} callback
     */
    forAllFilteredRecords: function(callback)
    {
        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @param {number} depth
         * @this {WebInspector.TimelineModel}
         * @return {boolean}
         */
        function processRecord(record, depth)
        {
            var visible = this.isVisible(record);
            if (visible) {
                if (callback(record, depth))
                    return true;
            }

            for (var i = 0; i < record.children().length; ++i) {
                if (processRecord.call(this, record.children()[i], visible ? depth + 1 : depth))
                    return true;
            }
            return false;
        }

        for (var i = 0; i < this._records.length; ++i)
            processRecord.call(this, this._records[i], 0);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isVisible: function(record)
    {
        for (var i = 0; i < this._filters.length; ++i) {
            if (!this._filters[i].accept(record))
                return false;
        }
        return true;
    },

    _filterChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordFilterChanged);
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    records: function()
    {
        return this._records;
    },

    /**
     * @param {!Blob} file
     * @param {!WebInspector.Progress} progress
     */
    loadFromFile: function(file, progress)
    {
        var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
        var fileReader = this._createFileReader(file, delegate);
        var loader = this.createLoader(fileReader, progress);
        fileReader.start(loader);
    },

    /**
     * @param {!WebInspector.ChunkedFileReader} fileReader
     * @param {!WebInspector.Progress} progress
     * @return {!WebInspector.OutputStream}
     */
    createLoader: function(fileReader, progress)
    {
        throw new Error("Not implemented.");
    },

    _createFileReader: function(file, delegate)
    {
        return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineModelImpl.TransferChunkLengthBytes, delegate);
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
            this.writeToStream(stream);
        }
        stream.open(fileName, callback.bind(this));
    },

    /**
     * @param {!WebInspector.OutputStream} stream
     */
    writeToStream: function(stream)
    {
        throw new Error("Not implemented.");
    },

    reset: function()
    {
        this._records = [];
        this._minimumRecordTime = 0;
        this._maximumRecordTime = 0;
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._mainThreadTasks =  [];
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._gpuThreadTasks = [];
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._eventDividerRecords = [];
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordsCleared);
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        throw new Error("Not implemented.");
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        throw new Error("Not implemented.");
    },

    /**
     * @return {boolean}
     */
    isEmpty: function()
    {
        return this.minimumRecordTime() === 0 && this.maximumRecordTime() === 0;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    mainThreadTasks: function()
    {
        return this._mainThreadTasks;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    gpuThreadTasks: function()
    {
        return this._gpuThreadTasks;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    eventDividerRecords: function()
    {
        return this._eventDividerRecords;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @interface
 */
WebInspector.TimelineModel.Record = function()
{
}

WebInspector.TimelineModel.Record.prototype = {
    /**
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    callSiteStackTrace: function() { },

    /**
     * @return {?WebInspector.TimelineModel.Record}
     */
    initiator: function() { },

    /**
     * @return {?WebInspector.Target}
     */
    target: function() { },

    /**
     * @return {number}
     */
    selfTime: function() { },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    children: function() { },

    /**
     * @return {number}
     */
    startTime: function() { },

    /**
     * @return {string}
     */
    thread: function() { },

    /**
     * @return {number}
     */
    endTime: function() { },

    /**
     * @param {number} endTime
     */
    setEndTime: function(endTime) { },

    /**
     * @return {!Object}
     */
    data: function() { },

    /**
     * @return {string}
     */
    type: function() { },

    /**
     * @return {string}
     */
    frameId: function() { },

    /**
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    stackTrace: function() { },

    /**
     * @param {string} key
     * @return {?Object}
     */
    getUserObject: function(key) { },

    /**
     * @param {string} key
     * @param {?Object|undefined} value
     */
    setUserObject: function(key, value) { },

    /**
     * @return {?Array.<string>}
     */
    warnings: function() { }
}

/**
 * @constructor
 */
WebInspector.TimelineModel.Filter = function()
{
    /** @type {!WebInspector.TimelineModel} */
    this._model;
}

WebInspector.TimelineModel.Filter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return true;
    },

    notifyFilterChanged: function()
    {
        this._model._filterChanged();
    }
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!Array.<string>} recordTypes
 */
WebInspector.TimelineRecordTypeFilter = function(recordTypes)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._recordTypes = recordTypes.keySet();
}

WebInspector.TimelineRecordTypeFilter.prototype = {
    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineRecordTypeFilter}
 * @param {!Array.<string>} recordTypes
 */
WebInspector.TimelineRecordHiddenEmptyTypeFilter = function(recordTypes)
{
    WebInspector.TimelineRecordTypeFilter.call(this, recordTypes);
}

WebInspector.TimelineRecordHiddenEmptyTypeFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return record.children().length !== 0 || !this._recordTypes[record.type()];
    },

    __proto__: WebInspector.TimelineRecordTypeFilter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineRecordTypeFilter}
 * @param {!Array.<string>} recordTypes
 */
WebInspector.TimelineRecordHiddenTypeFilter = function(recordTypes)
{
    WebInspector.TimelineRecordTypeFilter.call(this, recordTypes);
}

WebInspector.TimelineRecordHiddenTypeFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !this._recordTypes[record.type()];
    },

    __proto__: WebInspector.TimelineRecordTypeFilter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineRecordTypeFilter}
 * @param {!Array.<string>} recordTypes
 */
WebInspector.TimelineRecordVisibleTypeFilter = function(recordTypes)
{
    WebInspector.TimelineRecordTypeFilter.call(this, recordTypes);
}

WebInspector.TimelineRecordVisibleTypeFilter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !!this._recordTypes[record.type()];
    },

    __proto__: WebInspector.TimelineRecordTypeFilter.prototype
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
     * @param {!Array.<!WebInspector.TimelineModel.Record>} records
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    process: function(thread, records)
    {
        if (thread !== WebInspector.TimelineModel.MainThreadName) {
            this._backgroundRecordsBuffer = this._backgroundRecordsBuffer.concat(records);
            return [];
        }
        /**
         * @param {!WebInspector.TimelineModel.Record} a
         * @param {!WebInspector.TimelineModel.Record} b
         */
        function recordTimestampComparator(a, b)
        {
            // Never return 0, as the merge function will squash identical entries.
            return a.startTime() < b.startTime() ? -1 : 1;
        }
        var result = this._backgroundRecordsBuffer.mergeOrdered(records, recordTimestampComparator);
        this._backgroundRecordsBuffer = [];
        return result;
    }
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
     * @param {!Event} event
     */
    onError: function(reader, event)
    {
        this._progress.done();
        this._model.reset();
        switch (event.target.error.code) {
        case FileError.NOT_FOUND_ERR:
            WebInspector.console.error(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
            break;
        case FileError.NOT_READABLE_ERR:
            WebInspector.console.error(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
            break;
        case FileError.ABORT_ERR:
            break;
        default:
            WebInspector.console.error(WebInspector.UIString("An error occurred while reading the file \"%s\"", reader.fileName()));
        }
    }
}
