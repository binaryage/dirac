// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!WebInspector.TracingModel} tracingModel
 * @constructor
 * @extends {WebInspector.TimelineModel}
 */
WebInspector.TracingTimelineModel = function(tracingModel)
{
    WebInspector.TimelineModel.call(this, tracingModel.target());
    this._tracingModel = tracingModel;
    this._mainThreadEvents = [];
    this._inspectedTargetEvents = [];

    this.reset();
}

WebInspector.TracingTimelineModel.RecordType = {
    Program: "Program",
    EventDispatch: "EventDispatch",

    GPUTask: "GPUTask",

    RequestMainThreadFrame: "RequestMainThreadFrame",
    BeginFrame: "BeginFrame",
    BeginMainThreadFrame: "BeginMainThreadFrame",
    ActivateLayerTree: "ActivateLayerTree",
    DrawFrame: "DrawFrame",
    ScheduleStyleRecalculation: "ScheduleStyleRecalculation",
    RecalculateStyles: "RecalculateStyles",
    InvalidateLayout: "InvalidateLayout",
    Layout: "Layout",
    UpdateLayer: "UpdateLayer",
    PaintSetup: "PaintSetup",
    Paint: "Paint",
    PaintImage: "PaintImage",
    Rasterize: "Rasterize",
    RasterTask: "RasterTask",
    ScrollLayer: "ScrollLayer",
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

    CallStack: "CallStack",
    SetLayerTreeId: "SetLayerTreeId",
    TracingStartedInPage: "TracingStartedInPage",

    DecodeImage: "Decode Image",
    ResizeImage: "Resize Image",
    DrawLazyPixelRef: "Draw LazyPixelRef",
    DecodeLazyPixelRef: "Decode LazyPixelRef",

    LazyPixelRef: "LazyPixelRef",
    LayerTreeHostImplSnapshot: "cc::LayerTreeHostImpl",
    PictureSnapshot: "cc::Picture"
};

WebInspector.TracingTimelineModel.defaultTracingCategoryFilter = "*,disabled-by-default-cc.debug,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame";

WebInspector.TracingTimelineModel.prototype = {
    /**
     * @param {boolean} captureStacks
     * @param {boolean} captureMemory
     * @param {boolean} capturePictures
     */
    startRecording: function(captureStacks, captureMemory, capturePictures)
    {
        var categories;
        if (WebInspector.experimentsSettings.timelineTracingMode.isEnabled()) {
            categories = WebInspector.TracingTimelineModel.defaultTracingCategoryFilter;
        } else {
            var categoriesArray = ["disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "devtools"];
            if (captureStacks)
                categoriesArray.push("disabled-by-default-devtools.timeline.stack");
            if (capturePictures)
                categoriesArray.push("disabled-by-default-devtools.timeline.layers", "disabled-by-default-devtools.timeline.picture");
            categories = categoriesArray.join(",");
        }
        this._startRecordingWithCategories(categories);
    },

    stopRecording: function()
    {
        this._tracingModel.stop(this._didStopRecordingTraceEvents.bind(this));
    },

    /**
     * @param {string} sessionId
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} events
     */
    setEventsForTest: function(sessionId, events)
    {
        this.reset();
        this._didStartRecordingTraceEvents();
        this._tracingModel.setEventsForTest(sessionId, events);
        this._didStopRecordingTraceEvents();
    },

    /**
     * @param {string} categories
     */
    _startRecordingWithCategories: function(categories)
    {
        this.reset();
        this._tracingModel.start(categories, "", this._didStartRecordingTraceEvents.bind(this));
    },

    _didStartRecordingTraceEvents: function()
    {
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted);
    },

    _didStopRecordingTraceEvents: function()
    {
        var events = this._tracingModel.devtoolsMetadataEvents();
        events.sort(WebInspector.TracingModel.Event.compareStartTime);

        this._resetProcessingState();
        for (var i = 0, length = events.length; i < length; i++) {
            var event = events[i];
            var process = event.thread.process();
            var startTime = event.startTime;

            var endTime = Infinity;
            if (i + 1 < length)
                endTime = events[i + 1].startTime;

            process.sortedThreads().forEach(this._processThreadEvents.bind(this, startTime, endTime, event.thread));
        }
        this._resetProcessingState();

        this._inspectedTargetEvents.sort(WebInspector.TracingModel.Event.compareStartTime);

        this._buildTimelineRecords();
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStopped);
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._tracingModel.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._tracingModel.maximumRecordTime();
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    inspectedTargetEvents: function()
    {
        return this._inspectedTargetEvents;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    mainThreadEvents: function()
    {
        return this._mainThreadEvents;
    },

    reset: function()
    {
        this._mainThreadEvents = [];
        this._inspectedTargetEvents = [];
        WebInspector.TimelineModel.prototype.reset.call(this);
    },

    _buildTimelineRecords: function()
    {
        var recordStack = [];
        var mainThreadEvents = this._mainThreadEvents;
        for (var i = 0, size = mainThreadEvents.length; i < size; ++i) {
            var event = mainThreadEvents[i];
            while (recordStack.length) {
                var top = recordStack.peekLast();
                if (top._event.endTime >= event.startTime)
                    break;
                recordStack.pop();
            }
            var parentRecord = recordStack.peekLast() || null;
            var record = new WebInspector.TracingTimelineModel.TraceEventRecord(this, event, parentRecord);
            if (WebInspector.TimelineUIUtils.isEventDivider(record))
                this._eventDividerRecords.push(record);
            if (!recordStack.length)
                this._addTopLevelRecord(record);
            if (event.endTime)
                recordStack.push(record);
        }
    },

    /**
     * @param {!WebInspector.TracingTimelineModel.TraceEventRecord} record
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

    _resetProcessingState: function()
    {
        this._sendRequestEvents = {};
        this._timerEvents = {};
        this._requestAnimationFrameEvents = {};
        this._layoutInvalidate = {};
        this._lastScheduleStyleRecalculation = {};
        this._webSocketCreateEvents = {};
        this._paintImageEventByPixelRefId = {};
        this._lastPaintForLayer = {};
        this._lastRecalculateStylesEvent = null;
        this._currentScriptEvent = null;
        this._eventStack = [];
    },

    /**
     * @param {number} startTime
     * @param {?number} endTime
     * @param {!WebInspector.TracingModel.Thread} mainThread
     * @param {!WebInspector.TracingModel.Thread} thread
     */
    _processThreadEvents: function(startTime, endTime, mainThread, thread)
    {
        var events = thread.events();
        var length = events.length;
        var i = events.lowerBound(startTime, function (time, event) { return time - event.startTime });

        this._eventStack = [];
        for (; i < length; i++) {
            var event = events[i];
            if (endTime && event.startTime >= endTime)
                break;
            this._processEvent(event);
            if (thread === mainThread)
                this._mainThreadEvents.push(event);
            this._inspectedTargetEvents.push(event);
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _processEvent: function(event)
    {
        var recordTypes = WebInspector.TracingTimelineModel.RecordType;

        var eventStack = this._eventStack;
        while (eventStack.length && eventStack.peekLast().endTime < event.startTime)
            eventStack.pop();
        var duration = event.duration;
        if (duration) {
            if (eventStack.length) {
                var parent = eventStack.peekLast();
                parent.selfTime -= duration;
            }
            event.selfTime = duration;
            eventStack.push(event);
        }

        if (this._currentScriptEvent && event.startTime > this._currentScriptEvent.endTime)
            this._currentScriptEvent = null;

        switch (event.name) {
        case recordTypes.CallStack:
            var lastMainThreadEvent = this._mainThreadEvents.peekLast();
            if (lastMainThreadEvent && event.args.stack && event.args.stack.length)
                lastMainThreadEvent.stackTrace = event.args.stack;
            break;

        case recordTypes.ResourceSendRequest:
            this._sendRequestEvents[event.args.data["requestId"]] = event;
            event.imageURL = event.args.data["url"];
            break;

        case recordTypes.ResourceReceiveResponse:
        case recordTypes.ResourceReceivedData:
        case recordTypes.ResourceFinish:
            event.initiator = this._sendRequestEvents[event.args.data["requestId"]];
            if (event.initiator)
                event.imageURL = event.initiator.imageURL;
            break;

        case recordTypes.TimerInstall:
            this._timerEvents[event.args.data["timerId"]] = event;
            break;

        case recordTypes.TimerFire:
            event.initiator = this._timerEvents[event.args.data["timerId"]];
            break;

        case recordTypes.RequestAnimationFrame:
            this._requestAnimationFrameEvents[event.args.data["id"]] = event;
            break;

        case recordTypes.FireAnimationFrame:
            event.initiator = this._requestAnimationFrameEvents[event.args.data["id"]];
            break;

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[event.args.frame] = event;
            break;

        case recordTypes.RecalculateStyles:
            event.initiator = this._lastScheduleStyleRecalculation[event.args.frame];
            this._lastRecalculateStylesEvent = event;
            break;

        case recordTypes.InvalidateLayout:
            // Consider style recalculation as a reason for layout invalidation,
            // but only if we had no earlier layout invalidation records.
            var layoutInitator = event;
            var frameId = event.args.frame;
            if (!this._layoutInvalidate[frameId] && this._lastRecalculateStylesEvent && this._lastRecalculateStylesEvent.endTime >  event.startTime)
                layoutInitator = this._lastRecalculateStylesEvent.initiator;
            this._layoutInvalidate[frameId] = layoutInitator;
            break;

        case recordTypes.Layout:
            var frameId = event.args["beginData"]["frame"];
            event.initiator = this._layoutInvalidate[frameId];
            event.backendNodeId = event.args["endData"]["rootNode"];
            event.highlightQuad =  event.args["endData"]["root"];
            this._layoutInvalidate[frameId] = null;
            if (this._currentScriptEvent)
                event.warning = WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck.");
            break;

        case recordTypes.WebSocketCreate:
            this._webSocketCreateEvents[event.args.data["identifier"]] = event;
            break;

        case recordTypes.WebSocketSendHandshakeRequest:
        case recordTypes.WebSocketReceiveHandshakeResponse:
        case recordTypes.WebSocketDestroy:
            event.initiator = this._webSocketCreateEvents[event.args.data["identifier"]];
            break;

        case recordTypes.EvaluateScript:
        case recordTypes.FunctionCall:
            if (!this._currentScriptEvent)
                this._currentScriptEvent = event;
            break;

        case recordTypes.SetLayerTreeId:
            this._inspectedTargetLayerTreeId = event.args["layerTreeId"];
            break;

        case recordTypes.Paint:
            event.highlightQuad = event.args["data"]["clip"];
            event.backendNodeId = event.args["data"]["nodeId"];
            var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
            if (!layerUpdateEvent || layerUpdateEvent.args["layerTreeId"] !== this._inspectedTargetLayerTreeId)
                break;
            this._lastPaintForLayer[layerUpdateEvent.args["layerId"]] = event;
            break;

        case recordTypes.PictureSnapshot:
            var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
            if (!layerUpdateEvent || layerUpdateEvent.args["layerTreeId"] !== this._inspectedTargetLayerTreeId)
                break;
            var paintEvent = this._lastPaintForLayer[layerUpdateEvent.args["layerId"]];
            if (!paintEvent)
                break;
            paintEvent.picture = event.args["snapshot"]["skp64"];
            break;

        case recordTypes.ScrollLayer:
            event.backendNodeId = event.args["data"]["nodeId"];
            break;

        case recordTypes.PaintImage:
            event.backendNodeId = event.args["data"]["nodeId"];
            event.imageURL = event.args["data"]["url"];
            break;

        case recordTypes.DecodeImage:
        case recordTypes.ResizeImage:
            var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
            if (!paintImageEvent) {
                var decodeLazyPixelRefEvent = this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);
                paintImageEvent = decodeLazyPixelRefEvent && this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args["LazyPixelRef"]];
            }
            if (!paintImageEvent)
                break;
            event.backendNodeId = paintImageEvent.backendNodeId;
            event.imageURL = paintImageEvent.imageURL;
            break;

        case recordTypes.DrawLazyPixelRef:
            var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
            if (!paintImageEvent)
                break;
            this._paintImageEventByPixelRefId[event.args["LazyPixelRef"]] = paintImageEvent;
            event.backendNodeId = paintImageEvent.backendNodeId;
            event.imageURL = paintImageEvent.imageURL;
            break;
        }
    },

    /**
     * @param {string} name
     * @return {?WebInspector.TracingModel.Event}
     */
    _findAncestorEvent: function(name)
    {
        for (var i = this._eventStack.length - 1; i >= 0; --i) {
            var event = this._eventStack[i];
            if (event.name === name)
                return event;
        }
        return null;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {!WebInspector.TracingModel.Event}
     */
    traceEventFrom: function(record)
    {
        if (!(record instanceof WebInspector.TracingTimelineModel.TraceEventRecord))
            throw new Error("Illegal argument.");
        return record._event;
    },

    __proto__: WebInspector.TimelineModel.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TimelineModel.Record}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TracingModel.Event} traceEvent
 * @param {?WebInspector.TracingTimelineModel.TraceEventRecord} parentRecord
 */
WebInspector.TracingTimelineModel.TraceEventRecord = function(model, traceEvent, parentRecord)
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

WebInspector.TracingTimelineModel.TraceEventRecord.prototype = {
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
     * @return {?Object}
     */
    highlightQuad: function()
    {
        return this._event.highlightQuad || null;
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
