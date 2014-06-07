// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 */
WebInspector.TracingTimelineUIUtils = function() { }

/**
 * @constructor
 * @param {string} title
 * @param {!WebInspector.TimelineCategory} category
 */
WebInspector.TimelineRecordStyle = function(title, category)
{
    this.title = title;
    this.category = category;
}

/**
 * @return {!Object.<string, !WebInspector.TimelineRecordStyle>}
 */
WebInspector.TracingTimelineUIUtils._initEventStyles = function()
{
    if (WebInspector.TracingTimelineUIUtils._eventStylesMap)
        return WebInspector.TracingTimelineUIUtils._eventStylesMap;

    var recordTypes = WebInspector.TracingTimelineModel.RecordType;
    var categories = WebInspector.TimelineUIUtils.categories();

    var eventStyles = {};
    eventStyles[recordTypes.Program] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Other"), categories["other"]);
    eventStyles[recordTypes.EventDispatch] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Event"), categories["scripting"]);
    eventStyles[recordTypes.RequestMainThreadFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Request Main Thread Frame"), categories["rendering"]);
    eventStyles[recordTypes.BeginFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Frame Start"), categories["rendering"]);
    eventStyles[recordTypes.BeginMainThreadFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Frame Start (main thread)"), categories["rendering"]);
    eventStyles[recordTypes.DrawFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Draw Frame"), categories["rendering"]);
    eventStyles[recordTypes.ScheduleStyleRecalculation] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Schedule Style Recalculation"), categories["rendering"]);
    eventStyles[recordTypes.RecalculateStyles] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Recalculate Style"), categories["rendering"]);
    eventStyles[recordTypes.InvalidateLayout] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Invalidate Layout"), categories["rendering"]);
    eventStyles[recordTypes.Layout] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Layout"), categories["rendering"]);
    eventStyles[recordTypes.PaintSetup] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint Setup"), categories["painting"]);
    eventStyles[recordTypes.Paint] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint"), categories["painting"]);
    eventStyles[recordTypes.Rasterize] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint"), categories["painting"]);
    eventStyles[recordTypes.RasterTask] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint"), categories["painting"]);
    eventStyles[recordTypes.ScrollLayer] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Scroll"), categories["rendering"]);
    eventStyles[recordTypes.CompositeLayers] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Composite Layers"), categories["painting"]);
    eventStyles[recordTypes.ParseHTML] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Parse HTML"), categories["loading"]);
    eventStyles[recordTypes.TimerInstall] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Install Timer"), categories["scripting"]);
    eventStyles[recordTypes.TimerRemove] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Remove Timer"), categories["scripting"]);
    eventStyles[recordTypes.TimerFire] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Timer Fired"), categories["scripting"]);
    eventStyles[recordTypes.XHRReadyStateChange] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("XHR Ready State Change"), categories["scripting"]);
    eventStyles[recordTypes.XHRLoad] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("XHR Load"), categories["scripting"]);
    eventStyles[recordTypes.EvaluateScript] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Evaluate Script"), categories["scripting"]);
    eventStyles[recordTypes.MarkLoad] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Load event"), categories["scripting"]);
    eventStyles[recordTypes.MarkDOMContent] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("DOMContentLoaded event"), categories["scripting"]);
    eventStyles[recordTypes.MarkFirstPaint] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("First paint"), categories["painting"]);
    eventStyles[recordTypes.TimeStamp] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Stamp"), categories["scripting"]);
    eventStyles[recordTypes.ConsoleTime] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Console Time"), categories["scripting"]);
    eventStyles[recordTypes.ResourceSendRequest] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Send Request"), categories["loading"]);
    eventStyles[recordTypes.ResourceReceiveResponse] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive Response"), categories["loading"]);
    eventStyles[recordTypes.ResourceFinish] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Finish Loading"), categories["loading"]);
    eventStyles[recordTypes.ResourceReceivedData] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive Data"), categories["loading"]);
    eventStyles[recordTypes.FunctionCall] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Function Call"), categories["scripting"]);
    eventStyles[recordTypes.GCEvent] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("GC Event"), categories["scripting"]);
    eventStyles[recordTypes.JSFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("JS Frame"), categories["scripting"]);
    eventStyles[recordTypes.RequestAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Request Animation Frame"), categories["scripting"]);
    eventStyles[recordTypes.CancelAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Cancel Animation Frame"), categories["scripting"]);
    eventStyles[recordTypes.FireAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Animation Frame Fired"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketCreate] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Create WebSocket"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketSendHandshakeRequest] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Send WebSocket Handshake"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketReceiveHandshakeResponse] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive WebSocket Handshake"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketDestroy] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Destroy WebSocket"), categories["scripting"]);
    eventStyles[recordTypes.EmbedderCallback] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Embedder Callback"), categories["scripting"]);
    eventStyles[recordTypes.DecodeImage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Image Decode"), categories["painting"]);
    eventStyles[recordTypes.ResizeImage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Image Resize"), categories["painting"]);

    WebInspector.TracingTimelineUIUtils._eventStylesMap = eventStyles;
    return eventStyles;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!{title: string, category: !WebInspector.TimelineCategory}}
 */
WebInspector.TracingTimelineUIUtils.eventStyle = function(event)
{
    return WebInspector.TracingTimelineUIUtils.styleForTraceEvent(event.name);
}

/**
 * @param {string} name
 * @return {!{title: string, category: !WebInspector.TimelineCategory}}
 */
WebInspector.TracingTimelineUIUtils.styleForTraceEvent = function(name)
{
    var eventStyles = WebInspector.TracingTimelineUIUtils._initEventStyles();
    var result = eventStyles[name];
    if (!result) {
        result = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Unknown: %s", name),  WebInspector.TimelineUIUtils.categories()["other"]);
        eventStyles[name] = result;
    }
    return result;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.Linkifier} linkifier
 * @param {boolean} loadedFromFile
 * @param {!WebInspector.Target} target
 * @return {?Node}
 */
WebInspector.TracingTimelineUIUtils.buildDetailsNodeForTraceEvent = function(event, linkifier, loadedFromFile, target)
{
    var recordType = WebInspector.TracingTimelineModel.RecordType;

    var details;
    var detailsText;
    var eventData = event.args.data;
    switch (event.name) {
    case recordType.GCEvent:
        var delta = event.args["usedHeapSizeBefore"] - event.args["usedHeapSizeAfter"];
        detailsText = WebInspector.UIString("%s collected", Number.bytesToString(delta));
        break;
    case recordType.TimerFire:
        detailsText = eventData["timerId"];
        break;
    case recordType.FunctionCall:
        details = linkifyLocation(eventData["scriptId"], eventData["scriptName"], eventData["scriptLine"], 0);
        break;
    case recordType.FireAnimationFrame:
        detailsText = eventData["id"];
        break;
    case recordType.EventDispatch:
        detailsText = eventData ? eventData["type"] : null;
        break;
    case recordType.Paint:
        var width = WebInspector.TimelineUIUtils._quadWidth(eventData.clip);
        var height = WebInspector.TimelineUIUtils._quadHeight(eventData.clip);
        if (width && height)
            detailsText = WebInspector.UIString("%d\u2009\u00d7\u2009%d", width, height);
        break;
    case recordType.TimerInstall:
    case recordType.TimerRemove:
        details = linkifyTopCallFrame();
        detailsText = eventData["timerId"];
        break;
    case recordType.RequestAnimationFrame:
    case recordType.CancelAnimationFrame:
        details = linkifyTopCallFrame();
        detailsText = eventData["id"];
        break;
    case recordType.ParseHTML:
    case recordType.RecalculateStyles:
        details = linkifyTopCallFrame();
        break;
    case recordType.EvaluateScript:
        var url = eventData["url"];
        if (url)
            details = linkifyLocation("", url, eventData["lineNumber"], 0);
        break;
    case recordType.XHRReadyStateChange:
    case recordType.XHRLoad:
    case recordType.ResourceSendRequest:
    case recordType.DecodeImage:
    case recordType.ResizeImage:
        var url = eventData["url"];
        if (url)
            detailsText = WebInspector.displayNameForURL(url);
        break;
    case recordType.ResourceReceivedData:
    case recordType.ResourceReceiveResponse:
    case recordType.ResourceFinish:
        var initiator = event.initiator;
        if (initiator) {
            var url = initiator.args.data["url"];
            if (url)
                detailsText = WebInspector.displayNameForURL(url);
        }
        break;
    case recordType.ConsoleTime:
        detailsText = eventData["message"];
        break;
    case recordType.EmbedderCallback:
        detailsText = eventData["callbackName"];
        break;

    case recordType.PaintImage:
    case recordType.DecodeImage:
    case recordType.ResizeImage:
    case recordType.DecodeLazyPixelRef:
            var url = event.imageURL;
            if (url)
                detailsText = WebInspector.displayNameForURL(url);
        break;

    default:
        details = linkifyTopCallFrame();
        break;
    }

    if (!details && detailsText)
        details = document.createTextNode(detailsText);
    return details;

    /**
     * @param {string} scriptId
     * @param {string} url
     * @param {number} lineNumber
     * @param {number=} columnNumber
     */
    function linkifyLocation(scriptId, url, lineNumber, columnNumber)
    {
        if (!loadedFromFile && scriptId !== "0") {
            var location = new WebInspector.DebuggerModel.Location(
                target,
                scriptId,
                lineNumber - 1,
                (columnNumber || 1) - 1);
            return linkifier.linkifyRawLocation(location, "timeline-details");
        }

        if (!url)
            return null;

        // FIXME(62725): stack trace line/column numbers are one-based.
        columnNumber = columnNumber ? columnNumber - 1 : 0;
        return linkifier.linkifyLocation(target, url, lineNumber - 1, columnNumber, "timeline-details");
    }

    /**
     * @param {!ConsoleAgent.CallFrame} callFrame
     */
    function linkifyCallFrame(callFrame)
    {
        return linkifyLocation(callFrame.scriptId, callFrame.url, callFrame.lineNumber, callFrame.columnNumber);
    }

    /**
     * @return {?Element}
     */
    function linkifyTopCallFrame()
    {
        var stackTrace = event.stackTrace;
        if (!stackTrace) {
            var initiator = event.initiator;
            if (initiator)
                stackTrace = initiator.stackTrace;
        }
        if (!stackTrace || !stackTrace.length)
            return null;
        return linkifyCallFrame(stackTrace[0]);
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.TracingTimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {function(!DocumentFragment)} callback
 * @param {boolean} loadedFromFile
 * @param {!WebInspector.Target} target
 */
WebInspector.TracingTimelineUIUtils.buildTraceEventDetails = function(event, model, linkifier, callback, loadedFromFile, target)
{
    var relatedNode = null;
    var barrier = new CallbackBarrier();
    if (event.imageURL && !event.previewElement)
        WebInspector.DOMPresentationUtils.buildImagePreviewContents(target, event.imageURL, false, barrier.createCallback(saveImage));
    if (event.backendNodeId)
        target.domModel.pushNodesByBackendIdsToFrontend([event.backendNodeId], barrier.createCallback(setRelatedNode));
    barrier.callWhenDone(callbackWrapper);

    /**
     * @param {!Element=} element
     */
    function saveImage(element)
    {
        event.previewElement = element || null;
    }

    /**
     * @param {?Array.<!DOMAgent.NodeId>} nodeIds
     */
    function setRelatedNode(nodeIds)
    {
        if (nodeIds)
            relatedNode = target.domModel.nodeForId(nodeIds[0]);
    }

    function callbackWrapper()
    {
        callback(WebInspector.TracingTimelineUIUtils._buildTraceEventDetailsSynchronously(event, model, linkifier, relatedNode, loadedFromFile, target));
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.TracingTimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?WebInspector.DOMNode} relatedNode
 * @param {boolean} loadedFromFile
 * @param {!WebInspector.Target} target
 * @return {!DocumentFragment}
 */
WebInspector.TracingTimelineUIUtils._buildTraceEventDetailsSynchronously = function(event, model, linkifier, relatedNode, loadedFromFile, target)
{
    var fragment = document.createDocumentFragment();
    var stats = WebInspector.TracingTimelineUIUtils._aggregatedStatsForTraceEvent(model, event);
    var pieChart = stats.hasChildren ?
        WebInspector.TimelineUIUtils.generatePieChart(stats.aggregatedStats, WebInspector.TracingTimelineUIUtils.styleForTraceEvent(event.name).category, event.selfTime) :
        WebInspector.TimelineUIUtils.generatePieChart(stats.aggregatedStats);
    fragment.appendChild(pieChart);

    var recordTypes = WebInspector.TracingTimelineModel.RecordType;

    // The messages may vary per event.name;
    var callSiteStackTraceLabel;
    var callStackLabel;
    var relatedNodeLabel;

    var contentHelper = new WebInspector.TimelineDetailsContentHelper(target, linkifier, true);
    contentHelper.appendTextRow(WebInspector.UIString("Self Time"), Number.millisToString(event.selfTime, true));
    contentHelper.appendTextRow(WebInspector.UIString("Start Time"), Number.millisToString((event.startTime - model.minimumRecordTime())));
    var eventData = event.args.data;
    var initiator = event.initiator;

    switch (event.name) {
    case recordTypes.GCEvent:
        var delta = event.args["usedHeapSizeBefore"] - event.args["usedHeapSizeAfter"];
        contentHelper.appendTextRow(WebInspector.UIString("Collected"), Number.bytesToString(delta));
        break;
    case recordTypes.TimerFire:
        callSiteStackTraceLabel = WebInspector.UIString("Timer installed");
        // Fall-through intended.

    case recordTypes.TimerInstall:
    case recordTypes.TimerRemove:
        contentHelper.appendTextRow(WebInspector.UIString("Timer ID"), eventData["timerId"]);
        if (event.name === recordTypes.TimerInstall) {
            contentHelper.appendTextRow(WebInspector.UIString("Timeout"), Number.millisToString(eventData["timeout"]));
            contentHelper.appendTextRow(WebInspector.UIString("Repeats"), !eventData["singleShot"]);
        }
        break;
    case recordTypes.FireAnimationFrame:
        callSiteStackTraceLabel = WebInspector.UIString("Animation frame requested");
        contentHelper.appendTextRow(WebInspector.UIString("Callback ID"), eventData["id"]);
        break;
    case recordTypes.FunctionCall:
        if (eventData["scriptName"])
            contentHelper.appendLocationRow(WebInspector.UIString("Location"), eventData["scriptName"], eventData["scriptLine"]);
        break;
    case recordTypes.ResourceSendRequest:
    case recordTypes.ResourceReceiveResponse:
    case recordTypes.ResourceReceivedData:
    case recordTypes.ResourceFinish:
        var url = (event.name === recordTypes.ResourceSendRequest) ? eventData["url"] : initiator.args.data["url"];
        if (url)
            contentHelper.appendElementRow(WebInspector.UIString("Resource"), WebInspector.linkifyResourceAsNode(url));
        if (event.previewElement)
            contentHelper.appendElementRow(WebInspector.UIString("Preview"), event.previewElement);
        if (eventData["requestMethod"])
            contentHelper.appendTextRow(WebInspector.UIString("Request Method"), eventData["requestMethod"]);
        if (typeof eventData["statusCode"] === "number")
            contentHelper.appendTextRow(WebInspector.UIString("Status Code"), eventData["statusCode"]);
        if (eventData["mimeType"])
            contentHelper.appendTextRow(WebInspector.UIString("MIME Type"), eventData["mimeType"]);
        if (eventData["encodedDataLength"])
            contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"), WebInspector.UIString("%d Bytes", eventData["encodedDataLength"]));
        break;
    case recordTypes.EvaluateScript:
        var url = eventData["url"];
        if (url)
            contentHelper.appendLocationRow(WebInspector.UIString("Script"), url, eventData["lineNumber"]);
        break;
    case recordTypes.Paint:
        var clip = eventData["clip"];
        contentHelper.appendTextRow(WebInspector.UIString("Location"), WebInspector.UIString("(%d, %d)", clip[0], clip[1]));
        var clipWidth = WebInspector.TimelineUIUtils._quadWidth(clip);
        var clipHeight = WebInspector.TimelineUIUtils._quadHeight(clip);
        contentHelper.appendTextRow(WebInspector.UIString("Dimensions"), WebInspector.UIString("%d × %d", clipWidth, clipHeight));
        // Fall-through intended.

    case recordTypes.PaintSetup:
    case recordTypes.Rasterize:
    case recordTypes.ScrollLayer:
        relatedNodeLabel = WebInspector.UIString("Layer root");
        break;
    case recordTypes.PaintImage:
    case recordTypes.DecodeLazyPixelRef:
    case recordTypes.DecodeImage:
    case recordTypes.ResizeImage:
    case recordTypes.DrawLazyPixelRef:
        relatedNodeLabel = WebInspector.UIString("Image element");
        if (event.imageURL)
            contentHelper.appendElementRow(WebInspector.UIString("Image URL"), WebInspector.linkifyResourceAsNode(event.imageURL));
        if (event.previewElement)
            contentHelper.appendElementRow(WebInspector.UIString("Preview"), event.previewElement);
        break;
    case recordTypes.RecalculateStyles: // We don't want to see default details.
        contentHelper.appendTextRow(WebInspector.UIString("Elements affected"), event.args["elementCount"]);
        callStackLabel = WebInspector.UIString("Styles recalculation forced");
        break;
    case recordTypes.Layout:
        var beginData = event.args["beginData"];
        contentHelper.appendTextRow(WebInspector.UIString("Nodes that need layout"), beginData["dirtyObjects"]);
        contentHelper.appendTextRow(WebInspector.UIString("Layout tree size"), beginData["totalObjects"]);
        contentHelper.appendTextRow(WebInspector.UIString("Layout scope"),
                                    beginData["partialLayout"] ? WebInspector.UIString("Partial") : WebInspector.UIString("Whole document"));
        callSiteStackTraceLabel = WebInspector.UIString("Layout invalidated");
        callStackLabel = WebInspector.UIString("Layout forced");
        relatedNodeLabel = WebInspector.UIString("Layout root");
        break;
    case recordTypes.ConsoleTime:
        contentHelper.appendTextRow(WebInspector.UIString("Message"), eventData["message"]);
        break;
    case recordTypes.WebSocketCreate:
    case recordTypes.WebSocketSendHandshakeRequest:
    case recordTypes.WebSocketReceiveHandshakeResponse:
    case recordTypes.WebSocketDestroy:
        var initiatorData = initiator ? initiator.args.data : eventData;
        if (typeof initiatorData["webSocketURL"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("URL"), initiatorData["webSocketURL"]);
        if (typeof initiatorData["webSocketProtocol"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"), initiatorData["webSocketProtocol"]);
        if (typeof eventData["message"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("Message"), eventData["message"]);
        break;
    case recordTypes.EmbedderCallback:
        contentHelper.appendTextRow(WebInspector.UIString("Callback Function"), eventData["callbackName"]);
        break;
    default:
        var detailsNode = WebInspector.TracingTimelineUIUtils.buildDetailsNodeForTraceEvent(event, linkifier, loadedFromFile, target);
        if (detailsNode)
            contentHelper.appendElementRow(WebInspector.UIString("Details"), detailsNode);
        break;
    }

    if (relatedNode)
        contentHelper.appendElementRow(relatedNodeLabel || WebInspector.UIString("Related node"), WebInspector.DOMPresentationUtils.linkifyNodeReference(relatedNode));

    if (eventData && eventData["scriptName"] && event.name !== recordTypes.FunctionCall)
        contentHelper.appendLocationRow(WebInspector.UIString("Function Call"), eventData["scriptName"], eventData["scriptLine"]);

    if (initiator) {
        var callSiteStackTrace = initiator.stackTrace;
        if (callSiteStackTrace)
            contentHelper.appendStackTrace(callSiteStackTraceLabel || WebInspector.UIString("Call Site stack"), callSiteStackTrace);
    }
    var eventStackTrace = event.stackTrace;
    if (eventStackTrace)
        contentHelper.appendStackTrace(callStackLabel || WebInspector.UIString("Call Stack"), eventStackTrace);

    var warning = event.warning;
    if (warning) {
        var div = document.createElement("div");
        div.textContent = warning;
        contentHelper.appendElementRow(WebInspector.UIString("Warning"), div);
    }
    fragment.appendChild(contentHelper.element);
    return fragment;
}

/**
 * @param {!WebInspector.TracingTimelineModel} model
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!{ aggregatedStats: !Object, hasChildren: boolean }}
 */
WebInspector.TracingTimelineUIUtils._aggregatedStatsForTraceEvent = function(model, event)
{
    var events = model.inspectedTargetEvents();
    /**
     * @param {number} startTime
     * @param {!WebInspector.TracingModel.Event} e
     * @return {number}
     */
    function eventComparator(startTime, e)
    {
        return startTime - e.startTime;
    }
    var index = events.binaryIndexOf(event.startTime, eventComparator);
    var hasChildren = false;
    var aggregatedStats = {};
    var endTime = event.endTime;
    if (endTime) {
        for (var i = index; i < events.length; i++) {
            var nextEvent = events[i];
            if (nextEvent.startTime >= endTime)
                break;
            if (!nextEvent.selfTime)
                continue;
            if (i > index)
                hasChildren = true;
            var category = WebInspector.TracingTimelineUIUtils.styleForTraceEvent(nextEvent.name).category.name;
            aggregatedStats[category] = (aggregatedStats[category] || 0) + nextEvent.selfTime;
        }
    }
    return { aggregatedStats: aggregatedStats, hasChildren: hasChildren };
}


