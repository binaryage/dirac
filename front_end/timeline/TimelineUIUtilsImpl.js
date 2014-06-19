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
     * @param {!WebInspector.Linkifier} linkifier
     * @param {boolean} loadedFromFile
     * @return {?Node}
     */
    buildDetailsNode: function(record, linkifier, loadedFromFile)
    {
        return WebInspector.TimelineUIUtilsImpl.buildDetailsNode(record, linkifier, loadedFromFile);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {!WebInspector.TimelineModel} model
     * @param {!WebInspector.Linkifier} linkifier
     * @param {function(!DocumentFragment)} callback
     * @param {boolean} loadedFromFile
     */
    generateDetailsContent: function(record, model, linkifier, callback, loadedFromFile)
    {
        WebInspector.TimelineUIUtilsImpl.generateDetailsContent(record, model, linkifier, callback, loadedFromFile);
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

    __proto__: WebInspector.TimelineUIUtils.prototype
}


WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes = {};
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Layout] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Paint] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Rasterize] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.DecodeImage] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.ResizeImage] = 1;


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
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.Linkifier} linkifier
 * @param {boolean} loadedFromFile
 * @return {?Node}
 */
WebInspector.TimelineUIUtilsImpl.buildDetailsNode = function(record, linkifier, loadedFromFile)
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
        var width = WebInspector.TimelineUIUtils._quadWidth(recordData.clip);
        var height = WebInspector.TimelineUIUtils._quadHeight(recordData.clip);
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
        if (!loadedFromFile && scriptId !== "0") {
            var location = new WebInspector.DebuggerModel.Location(
                record.target(),
                scriptId,
                lineNumber - 1,
                (columnNumber || 1) - 1);
            return linkifier.linkifyRawLocation(location, "timeline-details");
        }

        if (!url)
            return null;

        // FIXME(62725): stack trace line/column numbers are one-based.
        columnNumber = columnNumber ? columnNumber - 1 : 0;
        return linkifier.linkifyLocation(record.target(), url, lineNumber - 1, columnNumber, "timeline-details");
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
        if (record.stackTrace())
            return linkifyCallFrame(record.stackTrace()[0]);
        if (record.callSiteStackTrace())
            return linkifyCallFrame(record.callSiteStackTrace()[0]);
        return null;
    }
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {function(!DocumentFragment)} callback
 * @param {boolean} loadedFromFile
 */
WebInspector.TimelineUIUtilsImpl.generateDetailsContent = function(record, model, linkifier, callback, loadedFromFile)
{
    var imageElement = /** @type {?Element} */ (record.getUserObject("TimelineUIUtils::preview-element") || null);
    var relatedNode = null;
    var recordData = record.data();
    var barrier = new CallbackBarrier();
    if (!imageElement && WebInspector.TimelineUIUtils.needsPreviewElement(record.type()))
        WebInspector.DOMPresentationUtils.buildImagePreviewContents(record.target(), recordData["url"], false, barrier.createCallback(saveImage));
    if (recordData["backendNodeId"])
        record.target().domModel.pushNodesByBackendIdsToFrontend([recordData["backendNodeId"]], barrier.createCallback(setRelatedNode));
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
        if (nodeIds)
            relatedNode = record.target().domModel.nodeForId(nodeIds[0]);
    }

    function callbackWrapper()
    {
        callback(WebInspector.TimelineUIUtilsImpl._generateDetailsContentSynchronously(record, model, linkifier, imageElement, relatedNode, loadedFromFile));
    }
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?Element} imagePreviewElement
 * @param {?WebInspector.DOMNode} relatedNode
 * @param {boolean} loadedFromFile
 * @return {!DocumentFragment}
 */
WebInspector.TimelineUIUtilsImpl._generateDetailsContentSynchronously = function(record, model, linkifier, imagePreviewElement, relatedNode, loadedFromFile)
{
    var fragment = document.createDocumentFragment();
    if (record.children().length)
        fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(record.aggregatedStats(), record.category(), record.selfTime()));
    else
        fragment.appendChild(WebInspector.TimelineUIUtils.generatePieChart(record.aggregatedStats()));

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
            var clipWidth = WebInspector.TimelineUIUtils._quadWidth(clip);
            var clipHeight = WebInspector.TimelineUIUtils._quadHeight(clip);
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
            var detailsNode = WebInspector.TimelineUIUtilsImpl.buildDetailsNode(record, linkifier, loadedFromFile);
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
