// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.TracingModel} tracingModel
 * @param {!WebInspector.TimelineModel.Filter} recordFilter
 * @extends {WebInspector.TimelineModel}
 */
WebInspector.TracingTimelineModel = function(tracingModel, recordFilter)
{
    WebInspector.TimelineModel.call(this);
    this._tracingModel = tracingModel;
    this._inspectedTargetEvents = [];
    this._recordFilter = recordFilter;
    this._tracingModel.addEventListener(WebInspector.TracingModel.Events.TracingStarted, this._onTracingStarted, this);
    this._tracingModel.addEventListener(WebInspector.TracingModel.Events.TracingComplete, this._onTracingComplete, this);
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
    UpdateLayerTree: "UpdateLayerTree",
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
    JSSample: "JSSample",

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
    TracingStartedInWorker: "TracingStartedInWorker",

    DecodeImage: "Decode Image",
    ResizeImage: "Resize Image",
    DrawLazyPixelRef: "Draw LazyPixelRef",
    DecodeLazyPixelRef: "Decode LazyPixelRef",

    LazyPixelRef: "LazyPixelRef",
    LayerTreeHostImplSnapshot: "cc::LayerTreeHostImpl",
    PictureSnapshot: "cc::Picture"
};

/**
 * @constructor
 * @param {string} name
 */
WebInspector.TracingTimelineModel.VirtualThread = function(name)
{
    this.name = name;
    /** @type {!Array.<!WebInspector.TracingModel.Event>} */
    this.events = [];
}

WebInspector.TracingTimelineModel.prototype = {
    /**
     * @param {boolean} captureStacks
     * @param {boolean} captureMemory
     * @param {boolean} capturePictures
     */
    startRecording: function(captureStacks, captureMemory, capturePictures)
    {
        function disabledByDefault(category)
        {
            return "disabled-by-default-" + category;
        }
        var categoriesArray = ["-*", disabledByDefault("devtools.timeline"), disabledByDefault("devtools.timeline.frame")];
        if (captureStacks) {
            categoriesArray.push(disabledByDefault("devtools.timeline.stack"));
            if (WebInspector.experimentsSettings.timelineJSCPUProfile.isEnabled()) {
                this._jsProfilerStarted = true;
                this._currentTarget = WebInspector.context.flavor(WebInspector.Target);
                this._configureCpuProfilerSamplingInterval();
                this._currentTarget.profilerAgent().start();
            }
        }
        if (capturePictures) {
            categoriesArray = categoriesArray.concat([
                disabledByDefault("devtools.timeline.layers"),
                disabledByDefault("devtools.timeline.picture"),
                disabledByDefault("blink.graphics_context_annotations")]);
        }
        var categories = categoriesArray.join(",");
        this._startRecordingWithCategories(categories);
    },

    stopRecording: function()
    {
        this._stopCallbackBarrier = new CallbackBarrier();
        if (this._jsProfilerStarted) {
            this._currentTarget.profilerAgent().stop(this._stopCallbackBarrier.createCallback(this._didStopRecordingJSSamples.bind(this)));
            this._jsProfilerStarted = false;
        }
        this._tracingModel.stop();
    },

    /**
     * @param {string} sessionId
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} events
     */
    setEventsForTest: function(sessionId, events)
    {
        this._onTracingStarted();
        this._tracingModel.setEventsForTest(sessionId, events);
        this._onTracingComplete();
    },

    _configureCpuProfilerSamplingInterval: function()
    {
        var intervalUs = WebInspector.settings.highResolutionCpuProfiling.get() ? 100 : 1000;
        this._currentTarget.profilerAgent().setSamplingInterval(intervalUs, didChangeInterval);

        function didChangeInterval(error)
        {
            if (error)
                WebInspector.console.error(error);
        }
    },

    /**
     * @param {string} categories
     */
    _startRecordingWithCategories: function(categories)
    {
        this.reset();
        this._tracingModel.start(categories, "");
    },

    _onTracingStarted: function()
    {
        this.reset();
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted);
    },

    _onTracingComplete: function()
    {
        if (this._stopCallbackBarrier)
            this._stopCallbackBarrier.callWhenDone(this._didStopRecordingTraceEvents.bind(this));
        else
            this._didStopRecordingTraceEvents();
    },

    /**
     * @param {?Protocol.Error} error
     * @param {?ProfilerAgent.CPUProfile} cpuProfile
     */
    _didStopRecordingJSSamples: function(error, cpuProfile)
    {
        if (error)
            WebInspector.console.error(error);
        this._cpuProfile = cpuProfile;
    },

    _didStopRecordingTraceEvents: function()
    {
        this._stopCallbackBarrier = null;
        var events = this._tracingModel.devtoolsPageMetadataEvents();
        var workerMetadataEvents = this._tracingModel.devtoolsWorkerMetadataEvents();
        events.sort(WebInspector.TracingModel.Event.compareStartTime);

        this._resetProcessingState();
        for (var i = 0, length = events.length; i < length; i++) {
            var event = events[i];
            var process = event.thread.process();
            var startTime = event.startTime;

            var endTime = Infinity;
            if (i + 1 < length)
                endTime = events[i + 1].startTime;

            var threads = process.sortedThreads();
            for (var j = 0; j < threads.length; j++) {
                var thread = threads[j];
                if (thread.name() === "WebCore: Worker" && !workerMetadataEvents.some(function(e) { return e.thread === thread; }))
                    continue;
                this._processThreadEvents(startTime, endTime, event.thread, thread);
            }
        }
        this._resetProcessingState();

        this._inspectedTargetEvents.sort(WebInspector.TracingModel.Event.compareStartTime);

        if (this._cpuProfile) {
            var jsSamples = WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(this, this._cpuProfile);
            this._inspectedTargetEvents = this._inspectedTargetEvents.mergeOrdered(jsSamples, WebInspector.TracingModel.Event.orderedCompareStartTime);
            this._setMainThreadEvents(this.mainThreadEvents().mergeOrdered(jsSamples, WebInspector.TracingModel.Event.orderedCompareStartTime));
            this._cpuProfile = null;
        }

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

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     */
    _setMainThreadEvents: function(events)
    {
        this._mainThreadEvents = events;
    },

    /**
     * @return {!Array.<!WebInspector.TracingTimelineModel.VirtualThread>}
     */
    virtualThreads: function()
    {
        return this._virtualThreads;
    },

    /**
     * @param {!WebInspector.ChunkedFileReader} fileReader
     * @param {!WebInspector.Progress} progress
     * @return {!WebInspector.OutputStream}
     */
    createLoader: function(fileReader, progress)
    {
        return new WebInspector.TracingModelLoader(this, fileReader, progress);
    },

    /**
     * @param {!WebInspector.OutputStream} stream
     */
    writeToStream: function(stream)
    {
        var saver = new WebInspector.TracingTimelineSaver(stream);
        var events = this._tracingModel.rawEvents();
        saver.save(events);
    },

    reset: function()
    {
        this._virtualThreads = [];
        this._mainThreadEvents = [];
        this._inspectedTargetEvents = [];
        WebInspector.TimelineModel.prototype.reset.call(this);
    },

    _buildTimelineRecords: function()
    {
        var recordStack = [];
        var mainThreadEvents = this.mainThreadEvents();
        for (var i = 0, size = mainThreadEvents.length; i < size; ++i) {
            var event = mainThreadEvents[i];
            while (recordStack.length) {
                var top = recordStack.peekLast();
                if (top._event.endTime >= event.startTime)
                    break;
                recordStack.pop();
                if (!recordStack.length)
                    this._addTopLevelRecord(top);
            }
            var record = new WebInspector.TracingTimelineModel.TraceEventRecord(this, event);
            if (WebInspector.TracingTimelineUIUtils.isMarkerEvent(event))
                this._eventDividerRecords.push(record);
            if (!this._recordFilter.accept(record))
                continue;
            var parentRecord = recordStack.peekLast();
            if (parentRecord)
                parentRecord._addChild(record);
            if (event.endTime)
                recordStack.push(record);
        }
        if (recordStack.length)
            this._addTopLevelRecord(recordStack[0]);
    },

    /**
     * @param {!WebInspector.TracingTimelineModel.TraceEventRecord} record
     */
    _addTopLevelRecord: function(record)
    {
        this._updateBoundaries(record);
        this._records.push(record);
        if (record.type() === WebInspector.TracingTimelineModel.RecordType.Program)
            this._mainThreadTasks.push(record);
        if (record.type() === WebInspector.TracingTimelineModel.RecordType.GPUTask)
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

        var threadEvents;
        if (thread === mainThread) {
            threadEvents = this._mainThreadEvents;
        } else {
            var virtualThread = new WebInspector.TracingTimelineModel.VirtualThread(thread.name());
            threadEvents = virtualThread.events;
            this._virtualThreads.push(virtualThread);
        }

        this._eventStack = [];
        for (; i < length; i++) {
            var event = events[i];
            if (endTime && event.startTime >= endTime)
                break;
            this._processEvent(event);
            threadEvents.push(event);
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
            var lastMainThreadEvent = this.mainThreadEvents().peekLast();
            if (lastMainThreadEvent && event.args["stack"] && event.args["stack"].length)
                lastMainThreadEvent.stackTrace = event.args["stack"];
            break;

        case recordTypes.ResourceSendRequest:
            this._sendRequestEvents[event.args["data"]["requestId"]] = event;
            event.imageURL = event.args["data"]["url"];
            break;

        case recordTypes.ResourceReceiveResponse:
        case recordTypes.ResourceReceivedData:
        case recordTypes.ResourceFinish:
            event.initiator = this._sendRequestEvents[event.args["data"]["requestId"]];
            if (event.initiator)
                event.imageURL = event.initiator.imageURL;
            break;

        case recordTypes.TimerInstall:
            this._timerEvents[event.args["data"]["timerId"]] = event;
            break;

        case recordTypes.TimerFire:
            event.initiator = this._timerEvents[event.args["data"]["timerId"]];
            break;

        case recordTypes.RequestAnimationFrame:
            this._requestAnimationFrameEvents[event.args["data"]["id"]] = event;
            break;

        case recordTypes.FireAnimationFrame:
            event.initiator = this._requestAnimationFrameEvents[event.args["data"]["id"]];
            break;

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[event.args["frame"]] = event;
            break;

        case recordTypes.RecalculateStyles:
            event.initiator = this._lastScheduleStyleRecalculation[event.args["frame"]];
            this._lastRecalculateStylesEvent = event;
            break;

        case recordTypes.InvalidateLayout:
            // Consider style recalculation as a reason for layout invalidation,
            // but only if we had no earlier layout invalidation records.
            var layoutInitator = event;
            var frameId = event.args["frame"];
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
            this._webSocketCreateEvents[event.args["data"]["identifier"]] = event;
            break;

        case recordTypes.WebSocketSendHandshakeRequest:
        case recordTypes.WebSocketReceiveHandshakeResponse:
        case recordTypes.WebSocketDestroy:
            event.initiator = this._webSocketCreateEvents[event.args["data"]["identifier"]];
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
            // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
            if (!event.args["data"]["layerId"])
                break;
            this._lastPaintForLayer[layerUpdateEvent.args["layerId"]] = event;
            break;

        case recordTypes.PictureSnapshot:
            var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
            if (!layerUpdateEvent || layerUpdateEvent.args["layerTreeId"] !== this._inspectedTargetLayerTreeId)
                break;
            var paintEvent = this._lastPaintForLayer[layerUpdateEvent.args["layerId"]];
            if (!paintEvent || !event.args["snapshot"] || !event.args["snapshot"]["params"])
                break;
            paintEvent.picture = event.args["snapshot"]["skp64"];
            paintEvent.layerRect = event.args["snapshot"]["params"]["layer_rect"];
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

    __proto__: WebInspector.TimelineModel.prototype
}

/**
 * @interface
 */
WebInspector.TracingTimelineModel.Filter = function() { }

WebInspector.TracingTimelineModel.Filter.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event) { }
}

/**
 * @constructor
 * @implements {WebInspector.TracingTimelineModel.Filter}
 * @param {!Array.<string>} eventNames
 */
WebInspector.TracingTimelineModel.EventNameFilter = function(eventNames)
{
    this._eventNames = eventNames.keySet();
}

WebInspector.TracingTimelineModel.EventNameFilter.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        throw new Error("Not implemented.");
    }
}

/**
 * @constructor
 * @extends {WebInspector.TracingTimelineModel.EventNameFilter}
 * @param {!Array.<string>} includeNames
 */
WebInspector.TracingTimelineModel.InclusiveEventNameFilter = function(includeNames)
{
    WebInspector.TracingTimelineModel.EventNameFilter.call(this, includeNames)
}

WebInspector.TracingTimelineModel.InclusiveEventNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !!this._eventNames[event.name];
    },
    __proto__: WebInspector.TracingTimelineModel.EventNameFilter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TracingTimelineModel.EventNameFilter}
 * @param {!Array.<string>} excludeNames
 */
WebInspector.TracingTimelineModel.ExclusiveEventNameFilter = function(excludeNames)
{
    WebInspector.TracingTimelineModel.EventNameFilter.call(this, excludeNames)
}

WebInspector.TracingTimelineModel.ExclusiveEventNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !this._eventNames[event.name];
    },
    __proto__: WebInspector.TracingTimelineModel.EventNameFilter.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TimelineModel.Record}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TracingModel.Event} traceEvent
 */
WebInspector.TracingTimelineModel.TraceEventRecord = function(model, traceEvent)
{
    this._model = model;
    this._event = traceEvent;
    traceEvent._timelineRecord = this;
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
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        return this._event.thread.target();
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
     * @return {number}
     */
    startTime: function()
    {
        return this._event.startTime;
    },

    /**
     * @return {string}
     */
    thread: function()
    {
        // FIXME: Should return the actual thread name.
        return WebInspector.TimelineModel.MainThreadName;
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
        return this._event.args["data"];
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
            var data = this._event.args["data"];
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
     * @return {?Array.<string>}
     */
    warnings: function()
    {
        if (this._event.warning)
            return [this._event.warning];
        return null;
    },

    /**
     * @return {!WebInspector.TracingModel.Event}
     */
    traceEvent: function()
    {
        return this._event;
    },

    /**
     * @param {!WebInspector.TracingTimelineModel.TraceEventRecord} child
     */
    _addChild: function(child)
    {
        this._children.push(child);
        child.parent = this;
    },

    /**
     * @return {!WebInspector.TimelineModel}
     */
    timelineModel: function()
    {
        return this._model;
    }
}



/**
 * @constructor
 * @implements {WebInspector.OutputStream}
 * @param {!WebInspector.TracingTimelineModel} model
 * @param {!{cancel: function()}} reader
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TracingModelLoader = function(model, reader, progress)
{
    this._model = model;
    this._reader = reader;
    this._progress = progress;
    this._buffer = "";
    this._firstChunk = true;
    this._loader = new WebInspector.TracingModel.Loader(model._tracingModel);
}

WebInspector.TracingModelLoader.prototype = {
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

        if (this._firstChunk) {
            this._model.reset();
        } else {
            var commaIndex = json.indexOf(",");
            if (commaIndex !== -1)
                json = json.slice(commaIndex + 1);
            json = "[" + json;
        }

        var items;
        try {
            items = /** @type {!Array.<!WebInspector.TracingModel.EventPayload>} */ (JSON.parse(json));
        } catch (e) {
            this._reportErrorAndCancelLoading("Malformed timeline data: " + e);
            return;
        }

        if (this._firstChunk) {
            this._firstChunk = false;
            if (this._looksLikeAppVersion(items[0])) {
                this._reportErrorAndCancelLoading("Old Timeline format is not supported.");
                return;
            }
        }

        try {
            this._loader.loadNextChunk(items);
        } catch(e) {
            this._reportErrorAndCancelLoading("Malformed timeline data: " + e);
            return;
        }
    },

    _reportErrorAndCancelLoading: function(messsage)
    {
        WebInspector.console.error(messsage);
        this._model.reset();
        this._reader.cancel();
        this._progress.done();
    },

    _looksLikeAppVersion: function(item)
    {
        return typeof item === "string" && item.indexOf("Chrome") !== -1;
    },

    close: function()
    {
        this._loader.finish();
    }
}

/**
 * @constructor
 * @param {!WebInspector.OutputStream} stream
 */
WebInspector.TracingTimelineSaver = function(stream)
{
    this._stream = stream;
}

WebInspector.TracingTimelineSaver.prototype = {
    /**
     * @param {!Array.<*>} payloads
     */
    save: function(payloads)
    {
        this._payloads = payloads;
        this._recordIndex = 0;
        this._writeNextChunk(this._stream);
    },

    _writeNextChunk: function(stream)
    {
        const separator = ",\n";
        var data = [];
        var length = 0;

        if (this._recordIndex === 0)
            data.push("[");
        while (this._recordIndex < this._payloads.length) {
            var item = JSON.stringify(this._payloads[this._recordIndex]);
            var itemLength = item.length + separator.length;
            if (length + itemLength > WebInspector.TimelineModelImpl.TransferChunkLengthBytes)
                break;
            length += itemLength;
            if (this._recordIndex > 0)
                data.push(separator);
            data.push(item);
            ++this._recordIndex;
        }
        if (this._recordIndex === this._payloads.length)
            data.push("]");
        stream.write(data.join(""), this._didWriteNextChunk.bind(this, stream));
    },

    _didWriteNextChunk: function(stream)
    {
        if (this._recordIndex === this._payloads.length)
            stream.close();
        else
            this._writeNextChunk(stream);
    }
}
