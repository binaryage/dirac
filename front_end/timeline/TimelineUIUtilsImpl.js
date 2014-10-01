// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.TimelineUIUtils}
 */
WebInspector.TimelineUIUtilsImpl = function()
{
    WebInspector.TimelineUIUtils.call(this);
}

WebInspector.TimelineUIUtilsImpl.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isBeginFrame: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.BeginFrame;
    },
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isProgram: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.Program;
    },
    /**
     * @param {string} recordType
     * @return {boolean}
     */
    isCoalescable: function(recordType)
    {
        return !!WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[recordType];
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isEventDivider: function(record)
    {
        return WebInspector.TimelineUIUtilsImpl.isEventDivider(record);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {?Object}
     */
    countersForRecord: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.UpdateCounters ? record.data() : null;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {?Object}
     */
    highlightQuadForRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        switch(record.type()) {
        case recordTypes.Layout:
            return record.data().root;
        case recordTypes.Paint:
            return record.data().clip;
        default:
            return null;
        }
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {string}
     */
    titleForRecord: function(record)
    {
        return WebInspector.TimelineUIUtilsImpl._recordTitle(record);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {!WebInspector.TimelineCategory}
     */
    categoryForRecord: function(record)
    {
        return WebInspector.TimelineUIUtilsImpl.recordStyle(record).category;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {!WebInspector.Linkifier} linkifier
     * @return {?Node}
     */
    buildDetailsNode: function(record, linkifier)
    {
        return WebInspector.TimelineUIUtilsImpl.buildDetailsNode(record, linkifier);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {!WebInspector.TimelineModel} model
     * @param {!WebInspector.Linkifier} linkifier
     * @param {function(!DocumentFragment)} callback
     */
    generateDetailsContent: function(record, model, linkifier, callback)
    {
        WebInspector.TimelineUIUtilsImpl.generateDetailsContent(record, model, linkifier, callback);
    },

    /**
     * @return {!Element}
     */
    createBeginFrameDivider: function()
    {
        return this.createEventDivider(WebInspector.TimelineModel.RecordType.BeginFrame);
    },

    /**
     * @param {string} recordType
     * @param {string=} title
     * @return {!Element}
     */
    createEventDivider: function(recordType, title)
    {
        return WebInspector.TimelineUIUtilsImpl._createEventDivider(recordType, title);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {!RegExp} regExp
     * @return {boolean}
     */
    testContentMatching: function(record, regExp)
    {
        var tokens = [WebInspector.TimelineUIUtilsImpl._recordTitle(record)];
        var data = record.data();
        for (var key in data)
            tokens.push(data[key])
        return regExp.test(tokens.join("|"));
    },

    /**
     * @param {!Object} total
     * @param {!WebInspector.TimelineModel.Record} record
     */
    aggregateTimeForRecord: function(total, record)
    {
        WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord(total, record);
    },

    /**
     * @return {!WebInspector.TimelineModel.Filter}
     */
    hiddenRecordsFilter: function()
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var hiddenRecords = [
            recordTypes.ActivateLayerTree,
            recordTypes.BeginFrame,
            recordTypes.DrawFrame,
            recordTypes.GPUTask,
            recordTypes.InvalidateLayout,
            recordTypes.MarkDOMContent,
            recordTypes.MarkFirstPaint,
            recordTypes.MarkLoad,
            recordTypes.RequestMainThreadFrame,
            recordTypes.ScheduleStyleRecalculation,
            recordTypes.UpdateCounters
        ];
        return new WebInspector.TimelineRecordHiddenTypeFilter(hiddenRecords);
    },

    __proto__: WebInspector.TimelineUIUtils.prototype
}


WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes = {};
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Layout] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Paint] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Rasterize] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.DecodeImage] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.ResizeImage] = 1;

/**
 * @return {!Object.<string, !{title: string, category: !WebInspector.TimelineCategory}>}
 */
WebInspector.TimelineUIUtils._initRecordStyles = function()
{
    if (WebInspector.TimelineUIUtils._recordStylesMap)
        return WebInspector.TimelineUIUtils._recordStylesMap;

    var recordTypes = WebInspector.TimelineModel.RecordType;
    var categories = WebInspector.TimelineUIUtils.categories();

    var recordStyles = {};
    recordStyles[recordTypes.Root] = { title: "#root", category: categories["loading"] };
    recordStyles[recordTypes.Program] = { title: WebInspector.UIString("Other"), category: categories["other"] };
    recordStyles[recordTypes.EventDispatch] = { title: WebInspector.UIString("Event"), category: categories["scripting"] };
    recordStyles[recordTypes.BeginFrame] = { title: WebInspector.UIString("Frame Start"), category: categories["rendering"] };
    recordStyles[recordTypes.ScheduleStyleRecalculation] = { title: WebInspector.UIString("Schedule Style Recalculation"), category: categories["rendering"] };
    recordStyles[recordTypes.RecalculateStyles] = { title: WebInspector.UIString("Recalculate Style"), category: categories["rendering"] };
    recordStyles[recordTypes.InvalidateLayout] = { title: WebInspector.UIString("Invalidate Layout"), category: categories["rendering"] };
    recordStyles[recordTypes.Layout] = { title: WebInspector.UIString("Layout"), category: categories["rendering"] };
    recordStyles[recordTypes.UpdateLayerTree] = { title: WebInspector.UIString("Update Layer Tree"), category: categories["rendering"] };
    recordStyles[recordTypes.PaintSetup] = { title: WebInspector.UIString("Paint Setup"), category: categories["painting"] };
    recordStyles[recordTypes.Paint] = { title: WebInspector.UIString("Paint"), category: categories["painting"] };
    recordStyles[recordTypes.Rasterize] = { title: WebInspector.UIString("Paint"), category: categories["painting"] };
    recordStyles[recordTypes.ScrollLayer] = { title: WebInspector.UIString("Scroll"), category: categories["rendering"] };
    recordStyles[recordTypes.DecodeImage] = { title: WebInspector.UIString("Image Decode"), category: categories["painting"] };
    recordStyles[recordTypes.ResizeImage] = { title: WebInspector.UIString("Image Resize"), category: categories["painting"] };
    recordStyles[recordTypes.CompositeLayers] = { title: WebInspector.UIString("Composite Layers"), category: categories["painting"] };
    recordStyles[recordTypes.ParseHTML] = { title: WebInspector.UIString("Parse HTML"), category: categories["loading"] };
    recordStyles[recordTypes.TimerInstall] = { title: WebInspector.UIString("Install Timer"), category: categories["scripting"] };
    recordStyles[recordTypes.TimerRemove] = { title: WebInspector.UIString("Remove Timer"), category: categories["scripting"] };
    recordStyles[recordTypes.TimerFire] = { title: WebInspector.UIString("Timer Fired"), category: categories["scripting"] };
    recordStyles[recordTypes.XHRReadyStateChange] = { title: WebInspector.UIString("XHR Ready State Change"), category: categories["scripting"] };
    recordStyles[recordTypes.XHRLoad] = { title: WebInspector.UIString("XHR Load"), category: categories["scripting"] };
    recordStyles[recordTypes.EvaluateScript] = { title: WebInspector.UIString("Evaluate Script"), category: categories["scripting"] };
    recordStyles[recordTypes.ResourceSendRequest] = { title: WebInspector.UIString("Send Request"), category: categories["loading"] };
    recordStyles[recordTypes.ResourceReceiveResponse] = { title: WebInspector.UIString("Receive Response"), category: categories["loading"] };
    recordStyles[recordTypes.ResourceFinish] = { title: WebInspector.UIString("Finish Loading"), category: categories["loading"] };
    recordStyles[recordTypes.FunctionCall] = { title: WebInspector.UIString("Function Call"), category: categories["scripting"] };
    recordStyles[recordTypes.ResourceReceivedData] = { title: WebInspector.UIString("Receive Data"), category: categories["loading"] };
    recordStyles[recordTypes.GCEvent] = { title: WebInspector.UIString("GC Event"), category: categories["scripting"] };
    recordStyles[recordTypes.MarkDOMContent] = { title: WebInspector.UIString("DOMContentLoaded event"), category: categories["scripting"] };
    recordStyles[recordTypes.MarkLoad] = { title: WebInspector.UIString("Load event"), category: categories["scripting"] };
    recordStyles[recordTypes.MarkFirstPaint] = { title: WebInspector.UIString("First paint"), category: categories["painting"] };
    recordStyles[recordTypes.TimeStamp] = { title: WebInspector.UIString("Timestamp"), category: categories["scripting"] };
    recordStyles[recordTypes.ConsoleTime] = { title: WebInspector.UIString("Console Time"), category: categories["scripting"] };
    recordStyles[recordTypes.RequestAnimationFrame] = { title: WebInspector.UIString("Request Animation Frame"), category: categories["scripting"] };
    recordStyles[recordTypes.CancelAnimationFrame] = { title: WebInspector.UIString("Cancel Animation Frame"), category: categories["scripting"] };
    recordStyles[recordTypes.FireAnimationFrame] = { title: WebInspector.UIString("Animation Frame Fired"), category: categories["scripting"] };
    recordStyles[recordTypes.WebSocketCreate] = { title: WebInspector.UIString("Create WebSocket"), category: categories["scripting"] };
    recordStyles[recordTypes.WebSocketSendHandshakeRequest] = { title: WebInspector.UIString("Send WebSocket Handshake"), category: categories["scripting"] };
    recordStyles[recordTypes.WebSocketReceiveHandshakeResponse] = { title: WebInspector.UIString("Receive WebSocket Handshake"), category: categories["scripting"] };
    recordStyles[recordTypes.WebSocketDestroy] = { title: WebInspector.UIString("Destroy WebSocket"), category: categories["scripting"] };
    recordStyles[recordTypes.EmbedderCallback] = { title: WebInspector.UIString("Embedder Callback"), category: categories["scripting"] };

    WebInspector.TimelineUIUtils._recordStylesMap = recordStyles;
    return recordStyles;
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {!{title: string, category: !WebInspector.TimelineCategory}}
 */
WebInspector.TimelineUIUtilsImpl.recordStyle = function(record)
{
    var type = record.type();
    var recordStyles = WebInspector.TimelineUIUtils._initRecordStyles();
    var result = recordStyles[type];
    if (!result) {
        result = {
            title: WebInspector.UIString("Unknown: %s", type),
            category: WebInspector.TimelineUIUtils.categories()["other"]
        };
        recordStyles[type] = result;
    }
    return result;
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {string}
 */
WebInspector.TimelineUIUtilsImpl._recordTitle = function(record)
{
    var recordData = record.data();
    var title = WebInspector.TimelineUIUtilsImpl.recordStyle(record).title;
    if (record.type() === WebInspector.TimelineModel.RecordType.TimeStamp || record.type() === WebInspector.TimelineModel.RecordType.ConsoleTime)
        return WebInspector.UIString("%s: %s", title, recordData["message"]);
    if (WebInspector.TimelineUIUtilsImpl.isEventDivider(record)) {
        var startTime = Number.millisToString(record.startTime() - record._model.minimumRecordTime());
        return WebInspector.UIString("%s at %s", title, startTime);
    }
    return title;
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {boolean}
 */
WebInspector.TimelineUIUtilsImpl.isEventDivider = function(record)
{
    var recordTypes = WebInspector.TimelineModel.RecordType;
    if (record.type() === recordTypes.TimeStamp)
        return true;
    if (record.type() === recordTypes.MarkFirstPaint)
        return true;
    if (record.type() === recordTypes.MarkDOMContent || record.type() === recordTypes.MarkLoad)
        return record.data()["isMainFrame"];
    return false;
}

/**
 * @param {!Object} total
 * @param {!WebInspector.TimelineModel.Record} record
 */
WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord = function(total, record)
{
    var children = record.children();
    for (var i = 0; i < children.length; ++i)
        WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord(total, children[i]);
    var categoryName = WebInspector.TimelineUIUtilsImpl.recordStyle(record).category.name;
    total[categoryName] = (total[categoryName] || 0) + record.selfTime();
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.Linkifier} linkifier
 * @return {?Node}
 */
WebInspector.TimelineUIUtilsImpl.buildDetailsNode = function(record, linkifier)
{
    var details;
    var detailsText;
    var recordData = record.data();
    switch (record.type()) {
    case WebInspector.TimelineModel.RecordType.GCEvent:
        detailsText = WebInspector.UIString("%s collected", Number.bytesToString(recordData["usedHeapSizeDelta"]));
        break;
    case WebInspector.TimelineModel.RecordType.TimerFire:
        detailsText = recordData["timerId"];
        break;
    case WebInspector.TimelineModel.RecordType.FunctionCall:
        details = linkifyLocation(recordData["scriptId"], recordData["scriptName"], recordData["scriptLine"], 0);
        break;
    case WebInspector.TimelineModel.RecordType.FireAnimationFrame:
        detailsText = recordData["id"];
        break;
    case WebInspector.TimelineModel.RecordType.EventDispatch:
        detailsText = recordData ? recordData["type"] : null;
        break;
    case WebInspector.TimelineModel.RecordType.Paint:
        var width = WebInspector.TimelineUIUtils.quadWidth(recordData.clip);
        var height = WebInspector.TimelineUIUtils.quadHeight(recordData.clip);
        if (width && height)
            detailsText = WebInspector.UIString("%d\u2009\u00d7\u2009%d", width, height);
        break;
    case WebInspector.TimelineModel.RecordType.TimerInstall:
    case WebInspector.TimelineModel.RecordType.TimerRemove:
        details = linkifyTopCallFrame();
        detailsText = recordData["timerId"];
        break;
    case WebInspector.TimelineModel.RecordType.RequestAnimationFrame:
    case WebInspector.TimelineModel.RecordType.CancelAnimationFrame:
        details = linkifyTopCallFrame();
        detailsText = recordData["id"];
        break;
    case WebInspector.TimelineModel.RecordType.ParseHTML:
    case WebInspector.TimelineModel.RecordType.RecalculateStyles:
        details = linkifyTopCallFrame();
        break;
    case WebInspector.TimelineModel.RecordType.EvaluateScript:
        var url = recordData["url"];
        if (url)
            details = linkifyLocation("", url, recordData["lineNumber"], 0);
        break;
    case WebInspector.TimelineModel.RecordType.XHRReadyStateChange:
    case WebInspector.TimelineModel.RecordType.XHRLoad:
    case WebInspector.TimelineModel.RecordType.ResourceSendRequest:
    case WebInspector.TimelineModel.RecordType.DecodeImage:
    case WebInspector.TimelineModel.RecordType.ResizeImage:
        var url = recordData["url"];
        if (url)
            detailsText = WebInspector.displayNameForURL(url);
        break;
    case WebInspector.TimelineModel.RecordType.ResourceReceivedData:
    case WebInspector.TimelineModel.RecordType.ResourceReceiveResponse:
    case WebInspector.TimelineModel.RecordType.ResourceFinish:
        var initiator = record.initiator();
        if (initiator) {
            var url = initiator.data()["url"];
            if (url)
                detailsText = WebInspector.displayNameForURL(url);
        }
        break;
    case WebInspector.TimelineModel.RecordType.ConsoleTime:
        detailsText = recordData["message"];
        break;
    case WebInspector.TimelineModel.RecordType.EmbedderCallback:
        detailsText = recordData["callbackName"];
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
        if (!url)
            return null;

        // FIXME(62725): stack trace line/column numbers are one-based.
        columnNumber = columnNumber ? columnNumber - 1 : 0;
        return linkifier.linkifyScriptLocation(record.target(), scriptId, url, lineNumber - 1, columnNumber, "timeline-details");
    }

    /**
     * @return {?Element}
     */
    function linkifyTopCallFrame()
    {
        if (record.stackTrace())
            return linkifier.linkifyConsoleCallFrame(record.target(), record.stackTrace()[0], "timeline-details");
        if (record.callSiteStackTrace())
            return linkifier.linkifyConsoleCallFrame(record.target(), record.callSiteStackTrace()[0], "timeline-details");
        return null;
    }
}

/**
 * @param {string=} recordType
 * @return {boolean}
 */
WebInspector.TimelineUIUtilsImpl._needsPreviewElement = function(recordType)
{
    if (!recordType)
        return false;
    const recordTypes = WebInspector.TimelineModel.RecordType;
    switch (recordType) {
    case recordTypes.ResourceSendRequest:
    case recordTypes.ResourceReceiveResponse:
    case recordTypes.ResourceReceivedData:
    case recordTypes.ResourceFinish:
        return true;
    default:
        return false;
    }
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {function(!DocumentFragment)} callback
 */
WebInspector.TimelineUIUtilsImpl.generateDetailsContent = function(record, model, linkifier, callback)
{
    var imageElement = /** @type {?Element} */ (record.getUserObject("TimelineUIUtils::preview-element") || null);
    var relatedNode = null;
    var recordData = record.data();
    var barrier = new CallbackBarrier();
    var target = record.target();
    if (!imageElement && WebInspector.TimelineUIUtilsImpl._needsPreviewElement(record.type()) && target)
        WebInspector.DOMPresentationUtils.buildImagePreviewContents(target, recordData["url"], false, barrier.createCallback(saveImage));
    if (recordData["backendNodeId"] && target)
        target.domModel.pushNodesByBackendIdsToFrontend([recordData["backendNodeId"]], barrier.createCallback(setRelatedNode));
    barrier.callWhenDone(callbackWrapper);

    /**
     * @param {!Element=} element
     */
    function saveImage(element)
    {
        imageElement = element || null;
        record.setUserObject("TimelineUIUtils::preview-element", element);
    }

    /**
     * @param {?Array.<!DOMAgent.NodeId>} nodeIds
     */
    function setRelatedNode(nodeIds)
    {
        if (nodeIds && target)
            relatedNode = target.domModel.nodeForId(nodeIds[0]);
    }

    function callbackWrapper()
    {
        callback(WebInspector.TimelineUIUtilsImpl._generateDetailsContentSynchronously(record, model, linkifier, imageElement, relatedNode));
    }
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?Element} imagePreviewElement
 * @param {?WebInspector.DOMNode} relatedNode
 * @return {!DocumentFragment}
 */
WebInspector.TimelineUIUtilsImpl._generateDetailsContentSynchronously = function(record, model, linkifier, imagePreviewElement, relatedNode)
{
    var fragment = document.createDocumentFragment();
    var aggregatedStats = {};
    WebInspector.TimelineUIUtilsImpl.aggregateTimeForRecord(aggregatedStats, record);
    if (record.children().length)
        fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats, WebInspector.TimelineUIUtilsImpl.recordStyle(record).category, record.selfTime()));
    else
        fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats));

    const recordTypes = WebInspector.TimelineModel.RecordType;

    // The messages may vary per record.type();
    var callSiteStackTraceLabel;
    var callStackLabel;
    var relatedNodeLabel;

    var contentHelper = new WebInspector.TimelineDetailsContentHelper(record.target(), linkifier, true);
    contentHelper.appendTextRow(WebInspector.UIString("Self Time"), Number.millisToString(record.selfTime(), true));
    contentHelper.appendTextRow(WebInspector.UIString("Start Time"), Number.millisToString(record.startTime() - model.minimumRecordTime()));
    var recordData = record.data();

    switch (record.type()) {
        case recordTypes.GCEvent:
            contentHelper.appendTextRow(WebInspector.UIString("Collected"), Number.bytesToString(recordData["usedHeapSizeDelta"]));
            break;
        case recordTypes.TimerFire:
            callSiteStackTraceLabel = WebInspector.UIString("Timer installed");
            // Fall-through intended.

        case recordTypes.TimerInstall:
        case recordTypes.TimerRemove:
            contentHelper.appendTextRow(WebInspector.UIString("Timer ID"), recordData["timerId"]);
            if (record.type() === recordTypes.TimerInstall) {
                contentHelper.appendTextRow(WebInspector.UIString("Timeout"), Number.millisToString(recordData["timeout"]));
                contentHelper.appendTextRow(WebInspector.UIString("Repeats"), !recordData["singleShot"]);
            }
            break;
        case recordTypes.FireAnimationFrame:
            callSiteStackTraceLabel = WebInspector.UIString("Animation frame requested");
            contentHelper.appendTextRow(WebInspector.UIString("Callback ID"), recordData["id"]);
            break;
        case recordTypes.FunctionCall:
            if (recordData["scriptName"])
                contentHelper.appendLocationRow(WebInspector.UIString("Location"), recordData["scriptName"], recordData["scriptLine"]);
            break;
        case recordTypes.ResourceSendRequest:
        case recordTypes.ResourceReceiveResponse:
        case recordTypes.ResourceReceivedData:
        case recordTypes.ResourceFinish:
            var url;
            if (record.type() === recordTypes.ResourceSendRequest)
                url = recordData["url"];
            else if (record.initiator())
                url = record.initiator().data()["url"];
            if (url)
                contentHelper.appendElementRow(WebInspector.UIString("Resource"), WebInspector.linkifyResourceAsNode(url));
            if (imagePreviewElement)
                contentHelper.appendElementRow(WebInspector.UIString("Preview"), imagePreviewElement);
            if (recordData["requestMethod"])
                contentHelper.appendTextRow(WebInspector.UIString("Request Method"), recordData["requestMethod"]);
            if (typeof recordData["statusCode"] === "number")
                contentHelper.appendTextRow(WebInspector.UIString("Status Code"), recordData["statusCode"]);
            if (recordData["mimeType"])
                contentHelper.appendTextRow(WebInspector.UIString("MIME Type"), recordData["mimeType"]);
            if (recordData["encodedDataLength"])
                contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"), WebInspector.UIString("%d Bytes", recordData["encodedDataLength"]));
            break;
        case recordTypes.EvaluateScript:
            var url = recordData["url"];
            if (url)
                contentHelper.appendLocationRow(WebInspector.UIString("Script"), url, recordData["lineNumber"]);
            break;
        case recordTypes.Paint:
            var clip = recordData["clip"];
            contentHelper.appendTextRow(WebInspector.UIString("Location"), WebInspector.UIString("(%d, %d)", clip[0], clip[1]));
            var clipWidth = WebInspector.TimelineUIUtils.quadWidth(clip);
            var clipHeight = WebInspector.TimelineUIUtils.quadHeight(clip);
            contentHelper.appendTextRow(WebInspector.UIString("Dimensions"), WebInspector.UIString("%d × %d", clipWidth, clipHeight));
            // Fall-through intended.

        case recordTypes.PaintSetup:
        case recordTypes.Rasterize:
        case recordTypes.ScrollLayer:
            relatedNodeLabel = WebInspector.UIString("Layer root");
            break;
        case recordTypes.DecodeImage:
        case recordTypes.ResizeImage:
            relatedNodeLabel = WebInspector.UIString("Image element");
            var url = recordData["url"];
            if (url)
                contentHelper.appendElementRow(WebInspector.UIString("Image URL"), WebInspector.linkifyResourceAsNode(url));
            break;
        case recordTypes.RecalculateStyles: // We don't want to see default details.
            if (recordData["elementCount"])
                contentHelper.appendTextRow(WebInspector.UIString("Elements affected"), recordData["elementCount"]);
            callStackLabel = WebInspector.UIString("Styles recalculation forced");
            break;
        case recordTypes.Layout:
            if (recordData["dirtyObjects"])
                contentHelper.appendTextRow(WebInspector.UIString("Nodes that need layout"), recordData["dirtyObjects"]);
            if (recordData["totalObjects"])
                contentHelper.appendTextRow(WebInspector.UIString("Layout tree size"), recordData["totalObjects"]);
            if (typeof recordData["partialLayout"] === "boolean") {
                contentHelper.appendTextRow(WebInspector.UIString("Layout scope"),
                   recordData["partialLayout"] ? WebInspector.UIString("Partial") : WebInspector.UIString("Whole document"));
            }
            callSiteStackTraceLabel = WebInspector.UIString("Layout invalidated");
            callStackLabel = WebInspector.UIString("Layout forced");
            relatedNodeLabel = WebInspector.UIString("Layout root");
            break;
        case recordTypes.ConsoleTime:
            contentHelper.appendTextRow(WebInspector.UIString("Message"), recordData["message"]);
            break;
        case recordTypes.WebSocketCreate:
        case recordTypes.WebSocketSendHandshakeRequest:
        case recordTypes.WebSocketReceiveHandshakeResponse:
        case recordTypes.WebSocketDestroy:
            var initiatorData = record.initiator() ? record.initiator().data() : recordData;
            if (typeof initiatorData["webSocketURL"] !== "undefined")
                contentHelper.appendTextRow(WebInspector.UIString("URL"), initiatorData["webSocketURL"]);
            if (typeof initiatorData["webSocketProtocol"] !== "undefined")
                contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"), initiatorData["webSocketProtocol"]);
            if (typeof recordData["message"] !== "undefined")
                contentHelper.appendTextRow(WebInspector.UIString("Message"), recordData["message"]);
            break;
        case recordTypes.EmbedderCallback:
            contentHelper.appendTextRow(WebInspector.UIString("Callback Function"), recordData["callbackName"]);
            break;
        default:
            var detailsNode = WebInspector.TimelineUIUtilsImpl.buildDetailsNode(record, linkifier);
            if (detailsNode)
                contentHelper.appendElementRow(WebInspector.UIString("Details"), detailsNode);
            break;
    }

    if (relatedNode)
        contentHelper.appendElementRow(relatedNodeLabel || WebInspector.UIString("Related node"), WebInspector.DOMPresentationUtils.linkifyNodeReference(relatedNode));

    if (recordData["scriptName"] && record.type() !== recordTypes.FunctionCall)
        contentHelper.appendLocationRow(WebInspector.UIString("Function Call"), recordData["scriptName"], recordData["scriptLine"]);
    var callSiteStackTrace = record.callSiteStackTrace();
    if (callSiteStackTrace)
        contentHelper.appendStackTrace(callSiteStackTraceLabel || WebInspector.UIString("Call Site stack"), callSiteStackTrace);
    var recordStackTrace = record.stackTrace();
    if (recordStackTrace)
        contentHelper.appendStackTrace(callStackLabel || WebInspector.UIString("Call Stack"), recordStackTrace);

    if (record.warnings()) {
        var ul = document.createElement("ul");
        for (var i = 0; i < record.warnings().length; ++i)
            ul.createChild("li").textContent = record.warnings()[i];
        contentHelper.appendElementRow(WebInspector.UIString("Warning"), ul);
    }
    fragment.appendChild(contentHelper.element);
    return fragment;
}

/**
 * @param {string} recordType
 * @param {string=} title
 * @return {!Element}
 */
WebInspector.TimelineUIUtilsImpl._createEventDivider = function(recordType, title)
{
    var eventDivider = document.createElement("div");
    eventDivider.className = "resources-event-divider";
    var recordTypes = WebInspector.TimelineModel.RecordType;

    if (recordType === recordTypes.MarkDOMContent)
        eventDivider.className += " resources-blue-divider";
    else if (recordType === recordTypes.MarkLoad)
        eventDivider.className += " resources-red-divider";
    else if (recordType === recordTypes.MarkFirstPaint)
        eventDivider.className += " resources-green-divider";
    else if (recordType === recordTypes.TimeStamp)
        eventDivider.className += " resources-orange-divider";
    else if (recordType === recordTypes.BeginFrame)
        eventDivider.className += " timeline-frame-divider";

    if (title)
        eventDivider.title = title;

    return eventDivider;
}
