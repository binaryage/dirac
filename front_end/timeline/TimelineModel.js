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
 * @param {!WebInspector.Target} target
 */
WebInspector.TimelineModel = function(target)
{
    this._filters = [];
    this._target = target;
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
    JSFrame: "JSFrame",

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
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @return {boolean}
     */
    loadedFromFile: function()
    {
        return false;
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

    willStartRecordingTraceEvents: function()
    {
        this.reset();
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted);
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} mainThreadEvents
     */
    didStopRecordingTraceEvents: function(mainThreadEvents)
    {
        var recordStack = [];
        for (var i = 0, size = mainThreadEvents.length; i < size; ++i) {
            var event = mainThreadEvents[i];
            while (recordStack.length) {
                var top = recordStack.peekLast();
                if (top._event.endTime >= event.startTime)
                    break;
                recordStack.pop();
            }
            var parentRecord = recordStack.peekLast() || null;
            var record = new WebInspector.TimelineModel.TraceEventRecord(this, event, parentRecord);
            if (WebInspector.TimelineUIUtils.isEventDivider(record))
                this._eventDividerRecords.push(record);
            if (!recordStack.length)
                this._addTopLevelRecord(record);
            if (event.endTime)
                recordStack.push(record);
        }
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStopped);
    },

    /**
     * @param {!WebInspector.TimelineModel.TraceEventRecord} record
     */
    _addTopLevelRecord: function(record)
    {
        this._updateBoundaries(record);
        this._records.push(record);
        if (record.type() === WebInspector.TimelineModel.RecordType.Program)
            this._mainThreadTasks.push(record);
        if (record.type() === WebInspector.TimelineModel.RecordType.GPUTask)
            this._gpuThreadTasks.push(record);
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordAdded, record);
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
        throw new Error("Not implemented");
    },

    /**
     * @param {string} url
     * @param {!WebInspector.Progress} progress
     */
    loadFromURL: function(url, progress)
    {
        throw new Error("Not implemented");
    },

    saveToFile: function()
    {
        throw new Error("Not implemented");
    },

    reset: function()
    {
        this._loadedFromFile = false;
        this._records = [];
        this._minimumRecordTime = -1;
        this._maximumRecordTime = -1;
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
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _updateBoundaries: function(record)
    {
        var startTime = record.startTime();
        var endTime = record.endTime();

        if (this._minimumRecordTime === -1 || startTime < this._minimumRecordTime)
            this._minimumRecordTime = startTime;
        if ((this._maximumRecordTime === -1 && endTime) || endTime > this._maximumRecordTime)
            this._maximumRecordTime = endTime;
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
     * @return {!WebInspector.Target}
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
     * @return {!WebInspector.TimelineCategory}
     */
    category: function() { },

    /**
     * @return {string}
     */
    title: function() { },

    /**
     * @return {number}
     */
    startTime: function() { },

    /**
     * @return {string|undefined}
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
     * @return {!Object.<string, number>}
     */
    aggregatedStats: function() { },

    /**
     * @return {?Array.<string>}
     */
    warnings: function() { },

    /**
     * @param {!RegExp} regExp
     * @return {boolean}
     */
    testContentMatching: function(regExp) { }
}


/**
 * @constructor
 * @implements {WebInspector.TimelineModel.Record}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TracingModel.Event} traceEvent
 * @param {?WebInspector.TimelineModel.TraceEventRecord} parentRecord
 */
WebInspector.TimelineModel.TraceEventRecord = function(model, traceEvent, parentRecord)
{
    this._model = model;
    this._event = traceEvent;
    traceEvent._timelineRecord = this;
    if (parentRecord) {
        this.parent = parentRecord;
        parentRecord._children.push(this);
    }
    this._children = [];
}

WebInspector.TimelineModel.TraceEventRecord.prototype = {
    /**
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    callSiteStackTrace: function()
    {
        var initiator = this._event.initiator;
        return initiator ? initiator.stackTrace : null;
    },

    /**
     * @return {?WebInspector.TimelineModel.Record}
     */
    initiator: function()
    {
        var initiator = this._event.initiator;
        return initiator ? initiator._timelineRecord : null;
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._model.target();
    },

    /**
     * @return {number}
     */
    selfTime: function()
    {
        return this._event.selfTime;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @return {!WebInspector.TimelineCategory}
     */
    category: function()
    {
        var style = WebInspector.TimelineUIUtils.styleForTimelineEvent(this._event.name);
        return style.category;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return WebInspector.TimelineUIUtils.recordTitle(this, this._model);
    },

    /**
     * @return {number}
     */
    startTime: function()
    {
        return this._event.startTime;
    },

    /**
     * @return {string|undefined}
     */
    thread: function()
    {
        return "CPU";
    },

    /**
     * @return {number}
     */
    endTime: function()
    {
        return this._event.endTime || this._event.startTime;
    },

    /**
     * @param {number} endTime
     */
    setEndTime: function(endTime)
    {
        throw new Error("Unsupported operation setEndTime");
    },

    /**
     * @return {!Object}
     */
    data: function()
    {
        return this._event.args.data;
    },

    /**
     * @return {string}
     */
    type: function()
    {
        return this._event.name;
    },

    /**
     * @return {string}
     */
    frameId: function()
    {
        switch (this._event.name) {
        case WebInspector.TracingTimelineModel.RecordType.ScheduleStyleRecalculation:
        case WebInspector.TracingTimelineModel.RecordType.RecalculateStyles:
        case WebInspector.TracingTimelineModel.RecordType.InvalidateLayout:
            return this._event.args["frameId"];
        case WebInspector.TracingTimelineModel.RecordType.Layout:
            return this._event.args["beginData"]["frameId"];
        default:
            var data = this._event.args.data;
            return (data && data["frame"]) || "";
        }
    },

    /**
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    stackTrace: function()
    {
        return this._event.stackTrace;
    },

    /**
     * @param {string} key
     * @return {?Object}
     */
    getUserObject: function(key)
    {
        if (key === "TimelineUIUtils::preview-element")
            return this._event.previewElement;
        throw new Error("Unexpected key: " + key);
    },

    /**
     * @param {string} key
     * @param {?Object|undefined} value
     */
    setUserObject: function(key, value)
    {
        if (key !== "TimelineUIUtils::preview-element")
            throw new Error("Unexpected key: " + key);
        this._event.previewElement = /** @type {?Element} */ (value);
    },

    /**
     * @return {!Object.<string, number>}
     */
    aggregatedStats: function()
    {
        return {};
    },

    /**
     * @return {?Array.<string>}
     */
    warnings: function()
    {
        if (this._event.warning)
            return [this._event.warning];
        return null;
    },

    /**
     * @param {!RegExp} regExp
     * @return {boolean}
     */
    testContentMatching: function(regExp)
    {
        var tokens = [this.title()];
        var data = this._event.args.data;
        if (data) {
            for (var key in data)
                tokens.push(data[key]);
        }
        return regExp.test(tokens.join("|"));
    }
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
        if (thread) {
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
