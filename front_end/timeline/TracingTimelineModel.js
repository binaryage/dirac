// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!WebInspector.TracingModel} tracingModel
 * @constructor
 */
WebInspector.TracingTimelineModel = function(tracingModel)
{
    this._tracingModel = tracingModel;
    this._mainThreadEvents = [];
    this._inspectedTargetEvents = [];
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
    LayerTreeHostImplSnapshot: "cc::LayerTreeHostImpl"
};

WebInspector.TracingTimelineModel.prototype = {
    willStartRecordingTraceEvents: function()
    {
        this._mainThreadEvents = [];
        this._inspectedTargetEvents = [];
    },

    didStopRecordingTraceEvents: function()
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
    },

    /**
     * @return {?number}
     */
    minimumRecordTime: function()
    {
        return this._tracingModel.minimumRecordTime();
    },

    /**
     * @return {?number}
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

    _resetProcessingState: function()
    {
        this._sendRequestEvents = {};
        this._timerEvents = {};
        this._requestAnimationFrameEvents = {};
        this._layoutInvalidate = {};
        this._lastScheduleStyleRecalculation = {};
        this._webSocketCreateEvents = {};
        this._paintImageEventByPixelRefId = {};

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
            if (lastMainThreadEvent)
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
    }
}

