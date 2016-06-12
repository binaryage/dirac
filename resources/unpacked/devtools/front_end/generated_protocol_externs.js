
var InspectorBackend = {}

var Protocol = {};
/** @typedef {string}*/
Protocol.Error;


/**
 * @constructor
*/
Protocol.InspectorAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InspectorAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InspectorAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InspectorAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InspectorAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InspectorAgent.prototype.reset = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InspectorAgent.prototype.invoke_reset = function(obj, opt_callback) {}



var InspectorAgent = function(){};
/** @interface */
InspectorAgent.Dispatcher = function() {};
/**
 * @param {number} testCallId
 * @param {string} script
 */
InspectorAgent.Dispatcher.prototype.evaluateForTestInFrontend = function(testCallId, script) {};
/**
 * @param {RuntimeAgent.RemoteObject} object
 * @param {!Object} hints
 */
InspectorAgent.Dispatcher.prototype.inspect = function(object, hints) {};
/**
 * @param {string} reason
 */
InspectorAgent.Dispatcher.prototype.detached = function(reason) {};
InspectorAgent.Dispatcher.prototype.targetCrashed = function() {};


/**
 * @constructor
*/
Protocol.MemoryAgent = function(){};

/**
 * @param {function(?Protocol.Error, number, number, number):void=} opt_callback
 */
Protocol.MemoryAgent.prototype.getDOMCounters = function(opt_callback) {}
/** @param {function(?Protocol.Error, number, number, number):void=} opt_callback */
Protocol.MemoryAgent.prototype.invoke_getDOMCounters = function(obj, opt_callback) {}



var MemoryAgent = function(){};

/** @typedef {!{size:(number|undefined), name:(string), children:(!Array.<MemoryAgent.MemoryBlock>|undefined)}} */
MemoryAgent.MemoryBlock;

/** @typedef {!{strings:(!Array.<string>), nodes:(!Array.<number>), edges:(!Array.<number>), baseToRealNodeId:(!Array.<number>)}} */
MemoryAgent.HeapSnapshotChunk;
/** @interface */
MemoryAgent.Dispatcher = function() {};
/**
 * @param {MemoryAgent.HeapSnapshotChunk} chunk
 */
MemoryAgent.Dispatcher.prototype.addNativeSnapshotChunk = function(chunk) {};


/**
 * @constructor
*/
Protocol.PageAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {string} scriptSource
 * @param {function(?Protocol.Error, PageAgent.ScriptIdentifier):void=} opt_callback
 */
Protocol.PageAgent.prototype.addScriptToEvaluateOnLoad = function(scriptSource, opt_callback) {}
/** @param {function(?Protocol.Error, PageAgent.ScriptIdentifier):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_addScriptToEvaluateOnLoad = function(obj, opt_callback) {}

/**
 * @param {PageAgent.ScriptIdentifier} identifier
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.removeScriptToEvaluateOnLoad = function(identifier, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_removeScriptToEvaluateOnLoad = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_ignoreCache
 * @param {string=} opt_scriptToEvaluateOnLoad
 * @param {string=} opt_scriptPreprocessor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.reload = function(opt_ignoreCache, opt_scriptToEvaluateOnLoad, opt_scriptPreprocessor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_reload = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.navigate = function(url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_navigate = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, number, !Array.<PageAgent.NavigationEntry>):void=} opt_callback
 */
Protocol.PageAgent.prototype.getNavigationHistory = function(opt_callback) {}
/** @param {function(?Protocol.Error, number, !Array.<PageAgent.NavigationEntry>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getNavigationHistory = function(obj, opt_callback) {}

/**
 * @param {number} entryId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.navigateToHistoryEntry = function(entryId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_navigateToHistoryEntry = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<PageAgent.Cookie>, string):void=} opt_callback
 */
Protocol.PageAgent.prototype.getCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<PageAgent.Cookie>, string):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getCookies = function(obj, opt_callback) {}

/**
 * @param {string} cookieName
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.deleteCookie = function(cookieName, url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_deleteCookie = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, PageAgent.FrameResourceTree):void=} opt_callback
 */
Protocol.PageAgent.prototype.getResourceTree = function(opt_callback) {}
/** @param {function(?Protocol.Error, PageAgent.FrameResourceTree):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getResourceTree = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {string} url
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.PageAgent.prototype.getResourceContent = function(frameId, url, opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getResourceContent = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {string} url
 * @param {string} query
 * @param {boolean=} opt_caseSensitive
 * @param {boolean=} opt_isRegex
 * @param {function(?Protocol.Error, !Array.<PageAgent.SearchMatch>):void=} opt_callback
 */
Protocol.PageAgent.prototype.searchInResource = function(frameId, url, query, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<PageAgent.SearchMatch>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_searchInResource = function(obj, opt_callback) {}

/**
 * @param {string} text
 * @param {boolean=} opt_caseSensitive
 * @param {boolean=} opt_isRegex
 * @param {function(?Protocol.Error, !Array.<PageAgent.SearchResult>):void=} opt_callback
 */
Protocol.PageAgent.prototype.searchInResources = function(text, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<PageAgent.SearchResult>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_searchInResources = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {string} html
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setDocumentContent = function(frameId, html, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setDocumentContent = function(obj, opt_callback) {}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} fontScaleFactor
 * @param {boolean} fitWindow
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setDeviceMetricsOverride = function(width, height, fontScaleFactor, fitWindow, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setDeviceMetricsOverride = function(obj, opt_callback) {}

/**
 * @param {boolean} result
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setShowPaintRects = function(result, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setShowPaintRects = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setShowDebugBorders = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setShowDebugBorders = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setShowFPSCounter = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setShowFPSCounter = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setContinuousPaintingEnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setContinuousPaintingEnabled = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setShowScrollBottleneckRects = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setShowScrollBottleneckRects = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.PageAgent.prototype.getScriptExecutionStatus = function(opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getScriptExecutionStatus = function(obj, opt_callback) {}

/**
 * @param {boolean} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setScriptExecutionDisabled = function(value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setScriptExecutionDisabled = function(obj, opt_callback) {}

/**
 * @param {number=} opt_latitude
 * @param {number=} opt_longitude
 * @param {number=} opt_accuracy
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setGeolocationOverride = function(opt_latitude, opt_longitude, opt_accuracy, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setGeolocationOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.clearGeolocationOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_clearGeolocationOverride = function(obj, opt_callback) {}

/**
 * @param {number} alpha
 * @param {number} beta
 * @param {number} gamma
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setDeviceOrientationOverride = function(alpha, beta, gamma, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setDeviceOrientationOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.clearDeviceOrientationOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_clearDeviceOrientationOverride = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setTouchEmulationEnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setTouchEmulationEnabled = function(obj, opt_callback) {}

/**
 * @param {string} media
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setEmulatedMedia = function(media, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setEmulatedMedia = function(obj, opt_callback) {}

/**
 * @param {string=} opt_format
 * @param {number=} opt_quality
 * @param {number=} opt_maxWidth
 * @param {number=} opt_maxHeight
 * @param {function(?Protocol.Error, string, number, number, DOMAgent.Rect):void=} opt_callback
 */
Protocol.PageAgent.prototype.captureScreenshot = function(opt_format, opt_quality, opt_maxWidth, opt_maxHeight, opt_callback) {}
/** @param {function(?Protocol.Error, string, number, number, DOMAgent.Rect):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_captureScreenshot = function(obj, opt_callback) {}

/**
 * @param {string=} opt_format
 * @param {number=} opt_quality
 * @param {number=} opt_maxWidth
 * @param {number=} opt_maxHeight
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.startScreencast = function(opt_format, opt_quality, opt_maxWidth, opt_maxHeight, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_startScreencast = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.stopScreencast = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_stopScreencast = function(obj, opt_callback) {}

/**
 * @param {boolean} accept
 * @param {string=} opt_promptText
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.handleJavaScriptDialog = function(accept, opt_promptText, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_handleJavaScriptDialog = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {boolean=} opt_showGrid
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setShowViewportSizeOnResize = function(show, opt_showGrid, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setShowViewportSizeOnResize = function(obj, opt_callback) {}

/**
 * @param {boolean} force
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setForceCompositingMode = function(force, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setForceCompositingMode = function(obj, opt_callback) {}



var PageAgent = function(){};

/** @enum {string} */
PageAgent.ResourceType = {
    Document: "Document",
    Stylesheet: "Stylesheet",
    Image: "Image",
    Font: "Font",
    Script: "Script",
    XHR: "XHR",
    WebSocket: "WebSocket",
    Other: "Other"
};

/** @typedef {string} */
PageAgent.FrameId;

/** @typedef {!{id:(string), parentId:(string|undefined), loaderId:(NetworkAgent.LoaderId), name:(string|undefined), url:(string), securityOrigin:(string), mimeType:(string)}} */
PageAgent.Frame;

/** @typedef {!{frame:(PageAgent.Frame), childFrames:(!Array.<PageAgent.FrameResourceTree>|undefined), resources:(!Array.<!Object>)}} */
PageAgent.FrameResourceTree;

/** @typedef {!{lineNumber:(number), lineContent:(string)}} */
PageAgent.SearchMatch;

/** @typedef {!{url:(string), frameId:(PageAgent.FrameId), matchesCount:(number)}} */
PageAgent.SearchResult;

/** @typedef {!{name:(string), value:(string), domain:(string), path:(string), expires:(number), size:(number), httpOnly:(boolean), secure:(boolean), session:(boolean)}} */
PageAgent.Cookie;

/** @typedef {string} */
PageAgent.ScriptIdentifier;

/** @typedef {!{id:(number), url:(string), title:(string)}} */
PageAgent.NavigationEntry;
/** @interface */
PageAgent.Dispatcher = function() {};
/**
 * @param {number} timestamp
 */
PageAgent.Dispatcher.prototype.domContentEventFired = function(timestamp) {};
/**
 * @param {number} timestamp
 */
PageAgent.Dispatcher.prototype.loadEventFired = function(timestamp) {};
/**
 * @param {PageAgent.FrameId} frameId
 */
PageAgent.Dispatcher.prototype.frameAttached = function(frameId) {};
/**
 * @param {PageAgent.Frame} frame
 */
PageAgent.Dispatcher.prototype.frameNavigated = function(frame) {};
/**
 * @param {PageAgent.FrameId} frameId
 */
PageAgent.Dispatcher.prototype.frameDetached = function(frameId) {};
/**
 * @param {PageAgent.FrameId} frameId
 */
PageAgent.Dispatcher.prototype.frameStartedLoading = function(frameId) {};
/**
 * @param {PageAgent.FrameId} frameId
 */
PageAgent.Dispatcher.prototype.frameStoppedLoading = function(frameId) {};
/**
 * @param {PageAgent.FrameId} frameId
 * @param {number} delay
 */
PageAgent.Dispatcher.prototype.frameScheduledNavigation = function(frameId, delay) {};
/**
 * @param {PageAgent.FrameId} frameId
 */
PageAgent.Dispatcher.prototype.frameClearedScheduledNavigation = function(frameId) {};
/**
 * @param {string} message
 */
PageAgent.Dispatcher.prototype.javascriptDialogOpening = function(message) {};
PageAgent.Dispatcher.prototype.javascriptDialogClosed = function() {};
/**
 * @param {boolean} isEnabled
 */
PageAgent.Dispatcher.prototype.scriptsEnabled = function(isEnabled) {};
/**
 * @param {string} data
 * @param {number=} opt_deviceScaleFactor
 * @param {number=} opt_pageScaleFactor
 * @param {DOMAgent.Rect=} opt_viewport
 * @param {number=} opt_offsetTop
 * @param {number=} opt_offsetBottom
 */
PageAgent.Dispatcher.prototype.screencastFrame = function(data, opt_deviceScaleFactor, opt_pageScaleFactor, opt_viewport, opt_offsetTop, opt_offsetBottom) {};


/**
 * @constructor
*/
Protocol.ConsoleAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.clearMessages = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_clearMessages = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.setMonitoringXHREnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_setMonitoringXHREnabled = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.addInspectedNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_addInspectedNode = function(obj, opt_callback) {}

/**
 * @param {number} heapObjectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ConsoleAgent.prototype.addInspectedHeapObject = function(heapObjectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ConsoleAgent.prototype.invoke_addInspectedHeapObject = function(obj, opt_callback) {}



var ConsoleAgent = function(){};

/** @typedef {number} */
ConsoleAgent.Timestamp;

/** @enum {string} */
ConsoleAgent.ConsoleMessageSource = {
    XML: "xml",
    Javascript: "javascript",
    Network: "network",
    ConsoleAPI: "console-api",
    Storage: "storage",
    Appcache: "appcache",
    Rendering: "rendering",
    Css: "css",
    Security: "security",
    Other: "other",
    Deprecation: "deprecation"
};

/** @enum {string} */
ConsoleAgent.ConsoleMessageLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug"
};

/** @enum {string} */
ConsoleAgent.ConsoleMessageType = {
    Log: "log",
    Dir: "dir",
    DirXML: "dirxml",
    Table: "table",
    Trace: "trace",
    Clear: "clear",
    StartGroup: "startGroup",
    StartGroupCollapsed: "startGroupCollapsed",
    EndGroup: "endGroup",
    Assert: "assert",
    Timing: "timing",
    Profile: "profile",
    ProfileEnd: "profileEnd"
};

/** @typedef {!{source:(ConsoleAgent.ConsoleMessageSource), level:(ConsoleAgent.ConsoleMessageLevel), text:(string), type:(ConsoleAgent.ConsoleMessageType|undefined), url:(string|undefined), line:(number|undefined), column:(number|undefined), repeatCount:(number|undefined), parameters:(!Array.<RuntimeAgent.RemoteObject>|undefined), stackTrace:(ConsoleAgent.StackTrace|undefined), networkRequestId:(NetworkAgent.RequestId|undefined), timestamp:(ConsoleAgent.Timestamp)}} */
ConsoleAgent.ConsoleMessage;

/** @typedef {!{functionName:(string), scriptId:(string), url:(string), lineNumber:(number), columnNumber:(number)}} */
ConsoleAgent.CallFrame;

/** @typedef {!Array.<!ConsoleAgent.CallFrame>} */
ConsoleAgent.StackTrace;
/** @interface */
ConsoleAgent.Dispatcher = function() {};
/**
 * @param {ConsoleAgent.ConsoleMessage} message
 */
ConsoleAgent.Dispatcher.prototype.messageAdded = function(message) {};
/**
 * @param {number} count
 * @param {ConsoleAgent.Timestamp} timestamp
 */
ConsoleAgent.Dispatcher.prototype.messageRepeatCountUpdated = function(count, timestamp) {};
ConsoleAgent.Dispatcher.prototype.messagesCleared = function() {};


/**
 * @constructor
*/
Protocol.NetworkAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {string} userAgent
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setUserAgentOverride = function(userAgent, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setUserAgentOverride = function(obj, opt_callback) {}

/**
 * @param {NetworkAgent.Headers} headers
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setExtraHTTPHeaders = function(headers, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setExtraHTTPHeaders = function(obj, opt_callback) {}

/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.getResponseBody = function(requestId, opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_getResponseBody = function(obj, opt_callback) {}

/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.replayXHR = function(requestId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_replayXHR = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.canClearBrowserCache = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_canClearBrowserCache = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.clearBrowserCache = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_clearBrowserCache = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.canClearBrowserCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_canClearBrowserCookies = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.clearBrowserCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_clearBrowserCookies = function(obj, opt_callback) {}

/**
 * @param {boolean} cacheDisabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setCacheDisabled = function(cacheDisabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setCacheDisabled = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {string} url
 * @param {NetworkAgent.Headers=} opt_requestHeaders
 * @param {function(?Protocol.Error, number, NetworkAgent.Headers, string):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.loadResourceForFrontend = function(frameId, url, opt_requestHeaders, opt_callback) {}
/** @param {function(?Protocol.Error, number, NetworkAgent.Headers, string):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_loadResourceForFrontend = function(obj, opt_callback) {}



var NetworkAgent = function(){};

/** @typedef {string} */
NetworkAgent.LoaderId;

/** @typedef {string} */
NetworkAgent.RequestId;

/** @typedef {number} */
NetworkAgent.Timestamp;

/** @typedef {!Object} */
NetworkAgent.Headers;

/** @typedef {!{requestTime:(number), proxyStart:(number), proxyEnd:(number), dnsStart:(number), dnsEnd:(number), connectStart:(number), connectEnd:(number), sslStart:(number), sslEnd:(number), sendStart:(number), sendEnd:(number), receiveHeadersEnd:(number)}} */
NetworkAgent.ResourceTiming;

/** @typedef {!{url:(string), method:(string), headers:(NetworkAgent.Headers), postData:(string|undefined)}} */
NetworkAgent.Request;

/** @typedef {!{url:(string), status:(number), statusText:(string), headers:(NetworkAgent.Headers), headersText:(string|undefined), mimeType:(string), requestHeaders:(NetworkAgent.Headers|undefined), requestHeadersText:(string|undefined), connectionReused:(boolean), connectionId:(number), fromDiskCache:(boolean|undefined), timing:(NetworkAgent.ResourceTiming|undefined)}} */
NetworkAgent.Response;

/** @typedef {!{headers:(NetworkAgent.Headers)}} */
NetworkAgent.WebSocketRequest;

/** @typedef {!{status:(number), statusText:(string), headers:(NetworkAgent.Headers)}} */
NetworkAgent.WebSocketResponse;

/** @typedef {!{opcode:(number), mask:(boolean), payloadData:(string)}} */
NetworkAgent.WebSocketFrame;

/** @typedef {!{url:(string), type:(PageAgent.ResourceType), response:(NetworkAgent.Response|undefined), bodySize:(number)}} */
NetworkAgent.CachedResource;

/** @enum {string} */
NetworkAgent.InitiatorType = {
    Parser: "parser",
    Script: "script",
    Other: "other"
};

/** @typedef {!{type:(NetworkAgent.InitiatorType), stackTrace:(ConsoleAgent.StackTrace|undefined), url:(string|undefined), lineNumber:(number|undefined)}} */
NetworkAgent.Initiator;
/** @interface */
NetworkAgent.Dispatcher = function() {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {PageAgent.FrameId} frameId
 * @param {NetworkAgent.LoaderId} loaderId
 * @param {string} documentURL
 * @param {NetworkAgent.Request} request
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.Initiator} initiator
 * @param {NetworkAgent.Response=} opt_redirectResponse
 */
NetworkAgent.Dispatcher.prototype.requestWillBeSent = function(requestId, frameId, loaderId, documentURL, request, timestamp, initiator, opt_redirectResponse) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 */
NetworkAgent.Dispatcher.prototype.requestServedFromCache = function(requestId) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {PageAgent.FrameId} frameId
 * @param {NetworkAgent.LoaderId} loaderId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {PageAgent.ResourceType} type
 * @param {NetworkAgent.Response} response
 */
NetworkAgent.Dispatcher.prototype.responseReceived = function(requestId, frameId, loaderId, timestamp, type, response) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {number} dataLength
 * @param {number} encodedDataLength
 */
NetworkAgent.Dispatcher.prototype.dataReceived = function(requestId, timestamp, dataLength, encodedDataLength) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 */
NetworkAgent.Dispatcher.prototype.loadingFinished = function(requestId, timestamp) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {string} errorText
 * @param {boolean=} opt_canceled
 */
NetworkAgent.Dispatcher.prototype.loadingFailed = function(requestId, timestamp, errorText, opt_canceled) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.WebSocketRequest} request
 */
NetworkAgent.Dispatcher.prototype.webSocketWillSendHandshakeRequest = function(requestId, timestamp, request) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.WebSocketResponse} response
 */
NetworkAgent.Dispatcher.prototype.webSocketHandshakeResponseReceived = function(requestId, timestamp, response) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {string} url
 */
NetworkAgent.Dispatcher.prototype.webSocketCreated = function(requestId, url) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 */
NetworkAgent.Dispatcher.prototype.webSocketClosed = function(requestId, timestamp) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.WebSocketFrame} response
 */
NetworkAgent.Dispatcher.prototype.webSocketFrameReceived = function(requestId, timestamp, response) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {string} errorMessage
 */
NetworkAgent.Dispatcher.prototype.webSocketFrameError = function(requestId, timestamp, errorMessage) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.WebSocketFrame} response
 */
NetworkAgent.Dispatcher.prototype.webSocketFrameSent = function(requestId, timestamp, response) {};


/**
 * @constructor
*/
Protocol.DatabaseAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {DatabaseAgent.DatabaseId} databaseId
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.getDatabaseTableNames = function(databaseId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_getDatabaseTableNames = function(obj, opt_callback) {}

/**
 * @param {DatabaseAgent.DatabaseId} databaseId
 * @param {string} query
 * @param {function(?Protocol.Error, !Array.<string>=, !Array.<*>=, DatabaseAgent.Error=):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.executeSQL = function(databaseId, query, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>=, !Array.<*>=, DatabaseAgent.Error=):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_executeSQL = function(obj, opt_callback) {}



var DatabaseAgent = function(){};

/** @typedef {string} */
DatabaseAgent.DatabaseId;

/** @typedef {!{id:(DatabaseAgent.DatabaseId), domain:(string), name:(string), version:(string)}} */
DatabaseAgent.Database;

/** @typedef {!{message:(string), code:(number)}} */
DatabaseAgent.Error;
/** @interface */
DatabaseAgent.Dispatcher = function() {};
/**
 * @param {DatabaseAgent.Database} database
 */
DatabaseAgent.Dispatcher.prototype.addDatabase = function(database) {};


/**
 * @constructor
*/
Protocol.IndexedDBAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestDatabaseNames = function(securityOrigin, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_requestDatabaseNames = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {string} databaseName
 * @param {function(?Protocol.Error, IndexedDBAgent.DatabaseWithObjectStores):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestDatabase = function(securityOrigin, databaseName, opt_callback) {}
/** @param {function(?Protocol.Error, IndexedDBAgent.DatabaseWithObjectStores):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_requestDatabase = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {string} databaseName
 * @param {string} objectStoreName
 * @param {string} indexName
 * @param {number} skipCount
 * @param {number} pageSize
 * @param {IndexedDBAgent.KeyRange=} opt_keyRange
 * @param {function(?Protocol.Error, !Array.<IndexedDBAgent.DataEntry>, boolean):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestData = function(securityOrigin, databaseName, objectStoreName, indexName, skipCount, pageSize, opt_keyRange, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<IndexedDBAgent.DataEntry>, boolean):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_requestData = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {string} databaseName
 * @param {string} objectStoreName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.clearObjectStore = function(securityOrigin, databaseName, objectStoreName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_clearObjectStore = function(obj, opt_callback) {}



var IndexedDBAgent = function(){};

/** @typedef {!{name:(string), version:(number), objectStores:(!Array.<IndexedDBAgent.ObjectStore>)}} */
IndexedDBAgent.DatabaseWithObjectStores;

/** @typedef {!{name:(string), keyPath:(IndexedDBAgent.KeyPath), autoIncrement:(boolean), indexes:(!Array.<IndexedDBAgent.ObjectStoreIndex>)}} */
IndexedDBAgent.ObjectStore;

/** @typedef {!{name:(string), keyPath:(IndexedDBAgent.KeyPath), unique:(boolean), multiEntry:(boolean)}} */
IndexedDBAgent.ObjectStoreIndex;

/** @enum {string} */
IndexedDBAgent.KeyType = {
    Number: "number",
    String: "string",
    Date: "date",
    Array: "array"
};

/** @typedef {!{type:(IndexedDBAgent.KeyType), number:(number|undefined), string:(string|undefined), date:(number|undefined), array:(!Array.<IndexedDBAgent.Key>|undefined)}} */
IndexedDBAgent.Key;

/** @typedef {!{lower:(IndexedDBAgent.Key|undefined), upper:(IndexedDBAgent.Key|undefined), lowerOpen:(boolean), upperOpen:(boolean)}} */
IndexedDBAgent.KeyRange;

/** @typedef {!{key:(RuntimeAgent.RemoteObject), primaryKey:(RuntimeAgent.RemoteObject), value:(RuntimeAgent.RemoteObject)}} */
IndexedDBAgent.DataEntry;

/** @enum {string} */
IndexedDBAgent.KeyPathType = {
    Null: "null",
    String: "string",
    Array: "array"
};

/** @typedef {!{type:(IndexedDBAgent.KeyPathType), string:(string|undefined), array:(!Array.<string>|undefined)}} */
IndexedDBAgent.KeyPath;
/** @interface */
IndexedDBAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.DOMStorageAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {function(?Protocol.Error, !Array.<DOMStorageAgent.Item>):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.getDOMStorageItems = function(storageId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMStorageAgent.Item>):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_getDOMStorageItems = function(obj, opt_callback) {}

/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {string} key
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.setDOMStorageItem = function(storageId, key, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_setDOMStorageItem = function(obj, opt_callback) {}

/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {string} key
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.removeDOMStorageItem = function(storageId, key, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_removeDOMStorageItem = function(obj, opt_callback) {}



var DOMStorageAgent = function(){};

/** @typedef {!{securityOrigin:(string), isLocalStorage:(boolean)}} */
DOMStorageAgent.StorageId;

/** @typedef {!Array.<!string>} */
DOMStorageAgent.Item;
/** @interface */
DOMStorageAgent.Dispatcher = function() {};
/**
 * @param {DOMStorageAgent.StorageId} storageId
 */
DOMStorageAgent.Dispatcher.prototype.domStorageItemsCleared = function(storageId) {};
/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {string} key
 */
DOMStorageAgent.Dispatcher.prototype.domStorageItemRemoved = function(storageId, key) {};
/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {string} key
 * @param {string} newValue
 */
DOMStorageAgent.Dispatcher.prototype.domStorageItemAdded = function(storageId, key, newValue) {};
/**
 * @param {DOMStorageAgent.StorageId} storageId
 * @param {string} key
 * @param {string} oldValue
 * @param {string} newValue
 */
DOMStorageAgent.Dispatcher.prototype.domStorageItemUpdated = function(storageId, key, oldValue, newValue) {};


/**
 * @constructor
*/
Protocol.ApplicationCacheAgent = function(){};

/**
 * @param {function(?Protocol.Error, !Array.<ApplicationCacheAgent.FrameWithManifest>):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getFramesWithManifests = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<ApplicationCacheAgent.FrameWithManifest>):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getFramesWithManifests = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getManifestForFrame = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getManifestForFrame = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {function(?Protocol.Error, ApplicationCacheAgent.ApplicationCache):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getApplicationCacheForFrame = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, ApplicationCacheAgent.ApplicationCache):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getApplicationCacheForFrame = function(obj, opt_callback) {}



var ApplicationCacheAgent = function(){};

/** @typedef {!{url:(string), size:(number), type:(string)}} */
ApplicationCacheAgent.ApplicationCacheResource;

/** @typedef {!{manifestURL:(string), size:(number), creationTime:(number), updateTime:(number), resources:(!Array.<ApplicationCacheAgent.ApplicationCacheResource>)}} */
ApplicationCacheAgent.ApplicationCache;

/** @typedef {!{frameId:(PageAgent.FrameId), manifestURL:(string), status:(number)}} */
ApplicationCacheAgent.FrameWithManifest;
/** @interface */
ApplicationCacheAgent.Dispatcher = function() {};
/**
 * @param {PageAgent.FrameId} frameId
 * @param {string} manifestURL
 * @param {number} status
 */
ApplicationCacheAgent.Dispatcher.prototype.applicationCacheStatusUpdated = function(frameId, manifestURL, status) {};
/**
 * @param {boolean} isNowOnline
 */
ApplicationCacheAgent.Dispatcher.prototype.networkStateUpdated = function(isNowOnline) {};


/**
 * @constructor
*/
Protocol.FileSystemAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {string} origin
 * @param {string} type
 * @param {function(?Protocol.Error, number, FileSystemAgent.Entry=):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.requestFileSystemRoot = function(origin, type, opt_callback) {}
/** @param {function(?Protocol.Error, number, FileSystemAgent.Entry=):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_requestFileSystemRoot = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error, number, !Array.<FileSystemAgent.Entry>=):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.requestDirectoryContent = function(url, opt_callback) {}
/** @param {function(?Protocol.Error, number, !Array.<FileSystemAgent.Entry>=):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_requestDirectoryContent = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error, number, FileSystemAgent.Metadata=):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.requestMetadata = function(url, opt_callback) {}
/** @param {function(?Protocol.Error, number, FileSystemAgent.Metadata=):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_requestMetadata = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {boolean} readAsText
 * @param {number=} opt_start
 * @param {number=} opt_end
 * @param {string=} opt_charset
 * @param {function(?Protocol.Error, number, string=, string=):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.requestFileContent = function(url, readAsText, opt_start, opt_end, opt_charset, opt_callback) {}
/** @param {function(?Protocol.Error, number, string=, string=):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_requestFileContent = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error, number):void=} opt_callback
 */
Protocol.FileSystemAgent.prototype.deleteEntry = function(url, opt_callback) {}
/** @param {function(?Protocol.Error, number):void=} opt_callback */
Protocol.FileSystemAgent.prototype.invoke_deleteEntry = function(obj, opt_callback) {}



var FileSystemAgent = function(){};

/** @typedef {!{url:(string), name:(string), isDirectory:(boolean), mimeType:(string|undefined), resourceType:(PageAgent.ResourceType|undefined), isTextFile:(boolean|undefined)}} */
FileSystemAgent.Entry;

/** @typedef {!{modificationTime:(number), size:(number)}} */
FileSystemAgent.Metadata;
/** @interface */
FileSystemAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.DOMAgent = function(){};

/**
 * @param {function(?Protocol.Error, DOMAgent.Node):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getDocument = function(opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.Node):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getDocument = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {number=} opt_depth
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.requestChildNodes = function(nodeId, opt_depth, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_requestChildNodes = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} selector
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.querySelector = function(nodeId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_querySelector = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} selector
 * @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.querySelectorAll = function(nodeId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_querySelectorAll = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} name
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setNodeName = function(nodeId, name, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setNodeName = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setNodeValue = function(nodeId, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setNodeValue = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.removeNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_removeNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} name
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setAttributeValue = function(nodeId, name, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setAttributeValue = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} text
 * @param {string=} opt_name
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setAttributesAsText = function(nodeId, text, opt_name, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setAttributesAsText = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} name
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.removeAttribute = function(nodeId, name, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_removeAttribute = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string=} opt_objectGroup
 * @param {function(?Protocol.Error, !Array.<DOMAgent.EventListener>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getEventListenersForNode = function(nodeId, opt_objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMAgent.EventListener>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getEventListenersForNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getOuterHTML = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getOuterHTML = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} outerHTML
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setOuterHTML = function(nodeId, outerHTML, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setOuterHTML = function(obj, opt_callback) {}

/**
 * @param {string} query
 * @param {function(?Protocol.Error, string, number):void=} opt_callback
 */
Protocol.DOMAgent.prototype.performSearch = function(query, opt_callback) {}
/** @param {function(?Protocol.Error, string, number):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_performSearch = function(obj, opt_callback) {}

/**
 * @param {string} searchId
 * @param {number} fromIndex
 * @param {number} toIndex
 * @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getSearchResults = function(searchId, fromIndex, toIndex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getSearchResults = function(obj, opt_callback) {}

/**
 * @param {string} searchId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.discardSearchResults = function(searchId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_discardSearchResults = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.requestNode = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_requestNode = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {boolean=} opt_inspectShadowDOM
 * @param {DOMAgent.HighlightConfig=} opt_highlightConfig
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setInspectModeEnabled = function(enabled, opt_inspectShadowDOM, opt_highlightConfig, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setInspectModeEnabled = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {DOMAgent.RGBA=} opt_color
 * @param {DOMAgent.RGBA=} opt_outlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightRect = function(x, y, width, height, opt_color, opt_outlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightRect = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.Quad} quad
 * @param {DOMAgent.RGBA=} opt_color
 * @param {DOMAgent.RGBA=} opt_outlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightQuad = function(quad, opt_color, opt_outlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightQuad = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.HighlightConfig} highlightConfig
 * @param {DOMAgent.NodeId=} opt_nodeId
 * @param {RuntimeAgent.RemoteObjectId=} opt_objectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightNode = function(highlightConfig, opt_nodeId, opt_objectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightNode = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.hideHighlight = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_hideHighlight = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {DOMAgent.RGBA=} opt_contentColor
 * @param {DOMAgent.RGBA=} opt_contentOutlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightFrame = function(frameId, opt_contentColor, opt_contentOutlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightFrame = function(obj, opt_callback) {}

/**
 * @param {string} path
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.pushNodeByPathToFrontend = function(path, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_pushNodeByPathToFrontend = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.BackendNodeId} backendNodeId
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.pushNodeByBackendIdToFrontend = function(backendNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_pushNodeByBackendIdToFrontend = function(obj, opt_callback) {}

/**
 * @param {string} nodeGroup
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.releaseBackendNodeIds = function(nodeGroup, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_releaseBackendNodeIds = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string=} opt_objectGroup
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):void=} opt_callback
 */
Protocol.DOMAgent.prototype.resolveNode = function(nodeId, opt_objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_resolveNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getAttributes = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getAttributes = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {DOMAgent.NodeId} targetNodeId
 * @param {DOMAgent.NodeId=} opt_insertBeforeNodeId
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.moveTo = function(nodeId, targetNodeId, opt_insertBeforeNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_moveTo = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.undo = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_undo = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.redo = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_redo = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.markUndoableState = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_markUndoableState = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.focus = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_focus = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {!Array.<string>} files
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setFileInputFiles = function(nodeId, files, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setFileInputFiles = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, DOMAgent.BoxModel):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getBoxModel = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.BoxModel):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getBoxModel = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getNodeForLocation = function(x, y, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getNodeForLocation = function(obj, opt_callback) {}



var DOMAgent = function(){};

/** @typedef {number} */
DOMAgent.NodeId;

/** @typedef {number} */
DOMAgent.BackendNodeId;

/** @typedef {!{nodeId:(DOMAgent.NodeId), nodeType:(number), nodeName:(string), localName:(string), nodeValue:(string), childNodeCount:(number|undefined), children:(!Array.<DOMAgent.Node>|undefined), attributes:(!Array.<string>|undefined), documentURL:(string|undefined), baseURL:(string|undefined), publicId:(string|undefined), systemId:(string|undefined), internalSubset:(string|undefined), xmlVersion:(string|undefined), name:(string|undefined), value:(string|undefined), frameId:(PageAgent.FrameId|undefined), contentDocument:(DOMAgent.Node|undefined), shadowRoots:(!Array.<DOMAgent.Node>|undefined), templateContent:(DOMAgent.Node|undefined)}} */
DOMAgent.Node;

/** @typedef {!{type:(string), useCapture:(boolean), isAttribute:(boolean), nodeId:(DOMAgent.NodeId), handlerBody:(string), location:(DebuggerAgent.Location|undefined), sourceName:(string|undefined), handler:(RuntimeAgent.RemoteObject|undefined)}} */
DOMAgent.EventListener;

/** @typedef {!{r:(number), g:(number), b:(number), a:(number|undefined)}} */
DOMAgent.RGBA;

/** @typedef {!Array.<!number>} */
DOMAgent.Quad;

/** @typedef {!{content:(DOMAgent.Quad), padding:(DOMAgent.Quad), border:(DOMAgent.Quad), margin:(DOMAgent.Quad), width:(number), height:(number), shapeOutside:(string)}} */
DOMAgent.BoxModel;

/** @typedef {!{x:(number), y:(number), width:(number), height:(number)}} */
DOMAgent.Rect;

/** @typedef {!{showInfo:(boolean|undefined), contentColor:(DOMAgent.RGBA|undefined), paddingColor:(DOMAgent.RGBA|undefined), borderColor:(DOMAgent.RGBA|undefined), marginColor:(DOMAgent.RGBA|undefined), eventTargetColor:(DOMAgent.RGBA|undefined)}} */
DOMAgent.HighlightConfig;
/** @interface */
DOMAgent.Dispatcher = function() {};
DOMAgent.Dispatcher.prototype.documentUpdated = function() {};
/**
 * @param {DOMAgent.NodeId} nodeId
 */
DOMAgent.Dispatcher.prototype.inspectNodeRequested = function(nodeId) {};
/**
 * @param {DOMAgent.NodeId} parentId
 * @param {!Array.<DOMAgent.Node>} nodes
 */
DOMAgent.Dispatcher.prototype.setChildNodes = function(parentId, nodes) {};
/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} name
 * @param {string} value
 */
DOMAgent.Dispatcher.prototype.attributeModified = function(nodeId, name, value) {};
/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} name
 */
DOMAgent.Dispatcher.prototype.attributeRemoved = function(nodeId, name) {};
/**
 * @param {!Array.<DOMAgent.NodeId>} nodeIds
 */
DOMAgent.Dispatcher.prototype.inlineStyleInvalidated = function(nodeIds) {};
/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} characterData
 */
DOMAgent.Dispatcher.prototype.characterDataModified = function(nodeId, characterData) {};
/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {number} childNodeCount
 */
DOMAgent.Dispatcher.prototype.childNodeCountUpdated = function(nodeId, childNodeCount) {};
/**
 * @param {DOMAgent.NodeId} parentNodeId
 * @param {DOMAgent.NodeId} previousNodeId
 * @param {DOMAgent.Node} node
 */
DOMAgent.Dispatcher.prototype.childNodeInserted = function(parentNodeId, previousNodeId, node) {};
/**
 * @param {DOMAgent.NodeId} parentNodeId
 * @param {DOMAgent.NodeId} nodeId
 */
DOMAgent.Dispatcher.prototype.childNodeRemoved = function(parentNodeId, nodeId) {};
/**
 * @param {DOMAgent.NodeId} hostId
 * @param {DOMAgent.Node} root
 */
DOMAgent.Dispatcher.prototype.shadowRootPushed = function(hostId, root) {};
/**
 * @param {DOMAgent.NodeId} hostId
 * @param {DOMAgent.NodeId} rootId
 */
DOMAgent.Dispatcher.prototype.shadowRootPopped = function(hostId, rootId) {};


/**
 * @constructor
*/
Protocol.CSSAgent = function(){};

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {boolean} includePseudo
 * @param {boolean} includeInherited
 * @param {function(?Protocol.Error, !Array.<CSSAgent.RuleMatch>=, !Array.<CSSAgent.PseudoIdMatches>=, !Array.<CSSAgent.InheritedStyleEntry>=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getMatchedStylesForNode = function(nodeId, includePseudo, includeInherited, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.RuleMatch>=, !Array.<CSSAgent.PseudoIdMatches>=, !Array.<CSSAgent.InheritedStyleEntry>=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getMatchedStylesForNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, CSSAgent.CSSStyle=, CSSAgent.CSSStyle=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getInlineStylesForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyle=, CSSAgent.CSSStyle=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getInlineStylesForNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array.<CSSAgent.CSSComputedStyleProperty>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getComputedStyleForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.CSSComputedStyleProperty>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getComputedStyleForNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, string, !Array.<CSSAgent.PlatformFontUsage>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getPlatformFontsForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, string, !Array.<CSSAgent.PlatformFontUsage>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getPlatformFontsForNode = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<CSSAgent.CSSStyleSheetHeader>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getAllStyleSheets = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.CSSStyleSheetHeader>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getAllStyleSheets = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {function(?Protocol.Error, CSSAgent.CSSStyleSheetBody):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getStyleSheet = function(styleSheetId, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyleSheetBody):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getStyleSheet = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {function(?Protocol.Error, string):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getStyleSheetText = function(styleSheetId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getStyleSheetText = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {string} text
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleSheetText = function(styleSheetId, text, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleSheetText = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.CSSStyleId} styleId
 * @param {string} text
 * @param {function(?Protocol.Error, CSSAgent.CSSStyle):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleText = function(styleId, text, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyle):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleText = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.CSSStyleId} styleId
 * @param {number} propertyIndex
 * @param {string} text
 * @param {boolean} overwrite
 * @param {function(?Protocol.Error, CSSAgent.CSSStyle):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setPropertyText = function(styleId, propertyIndex, text, overwrite, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyle):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setPropertyText = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.CSSStyleId} styleId
 * @param {number} propertyIndex
 * @param {boolean} disable
 * @param {function(?Protocol.Error, CSSAgent.CSSStyle):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.toggleProperty = function(styleId, propertyIndex, disable, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyle):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_toggleProperty = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.CSSRuleId} ruleId
 * @param {string} selector
 * @param {function(?Protocol.Error, CSSAgent.CSSRule):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setRuleSelector = function(ruleId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSRule):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setRuleSelector = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} contextNodeId
 * @param {string} selector
 * @param {function(?Protocol.Error, CSSAgent.CSSRule):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.addRule = function(contextNodeId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSRule):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_addRule = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<CSSAgent.CSSPropertyInfo>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getSupportedCSSProperties = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.CSSPropertyInfo>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getSupportedCSSProperties = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {!Array.<string>} forcedPseudoClasses
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.forcePseudoState = function(nodeId, forcedPseudoClasses, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_forcePseudoState = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} documentNodeId
 * @param {function(?Protocol.Error, !Array.<CSSAgent.NamedFlow>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getNamedFlowCollection = function(documentNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.NamedFlow>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getNamedFlowCollection = function(obj, opt_callback) {}



var CSSAgent = function(){};

/** @typedef {string} */
CSSAgent.StyleSheetId;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), ordinal:(number)}} */
CSSAgent.CSSStyleId;

/** @enum {string} */
CSSAgent.StyleSheetOrigin = {
    User: "user",
    UserAgent: "user-agent",
    Inspector: "inspector",
    Regular: "regular"
};

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), ordinal:(number)}} */
CSSAgent.CSSRuleId;

/** @typedef {!{pseudoId:(number), matches:(!Array.<CSSAgent.RuleMatch>)}} */
CSSAgent.PseudoIdMatches;

/** @typedef {!{inlineStyle:(CSSAgent.CSSStyle|undefined), matchedCSSRules:(!Array.<CSSAgent.RuleMatch>)}} */
CSSAgent.InheritedStyleEntry;

/** @typedef {!{rule:(CSSAgent.CSSRule), matchingSelectors:(!Array.<number>)}} */
CSSAgent.RuleMatch;

/** @typedef {!{selectors:(!Array.<string>), text:(string), range:(CSSAgent.SourceRange|undefined)}} */
CSSAgent.SelectorList;

/** @typedef {!{name:(string), style:(CSSAgent.CSSStyle)}} */
CSSAgent.CSSStyleAttribute;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), frameId:(PageAgent.FrameId), sourceURL:(string), sourceMapURL:(string|undefined), origin:(CSSAgent.StyleSheetOrigin), title:(string), disabled:(boolean), hasSourceURL:(boolean|undefined), isInline:(boolean), startLine:(number), startColumn:(number)}} */
CSSAgent.CSSStyleSheetHeader;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), rules:(!Array.<CSSAgent.CSSRule>), text:(string|undefined)}} */
CSSAgent.CSSStyleSheetBody;

/** @typedef {!{ruleId:(CSSAgent.CSSRuleId|undefined), selectorList:(CSSAgent.SelectorList), sourceURL:(string|undefined), origin:(CSSAgent.StyleSheetOrigin), style:(CSSAgent.CSSStyle), media:(!Array.<CSSAgent.CSSMedia>|undefined)}} */
CSSAgent.CSSRule;

/** @typedef {!{startLine:(number), startColumn:(number), endLine:(number), endColumn:(number)}} */
CSSAgent.SourceRange;

/** @typedef {!{name:(string), value:(string)}} */
CSSAgent.ShorthandEntry;

/** @typedef {!{name:(string), longhands:(!Array.<string>|undefined)}} */
CSSAgent.CSSPropertyInfo;

/** @typedef {!{name:(string), value:(string)}} */
CSSAgent.CSSComputedStyleProperty;

/** @typedef {!{styleId:(CSSAgent.CSSStyleId|undefined), cssProperties:(!Array.<CSSAgent.CSSProperty>), shorthandEntries:(!Array.<CSSAgent.ShorthandEntry>), cssText:(string|undefined), range:(CSSAgent.SourceRange|undefined), width:(string|undefined), height:(string|undefined)}} */
CSSAgent.CSSStyle;

/** @enum {string} */
CSSAgent.CSSPropertyStatus = {
    Active: "active",
    Inactive: "inactive",
    Disabled: "disabled",
    Style: "style"
};

/** @typedef {!{name:(string), value:(string), priority:(string|undefined), implicit:(boolean|undefined), text:(string|undefined), parsedOk:(boolean|undefined), status:(CSSAgent.CSSPropertyStatus|undefined), range:(CSSAgent.SourceRange|undefined)}} */
CSSAgent.CSSProperty;

/** @enum {string} */
CSSAgent.CSSMediaSource = {
    MediaRule: "mediaRule",
    ImportRule: "importRule",
    LinkedSheet: "linkedSheet",
    InlineSheet: "inlineSheet"
};

/** @typedef {!{text:(string), source:(CSSAgent.CSSMediaSource), sourceURL:(string|undefined), range:(CSSAgent.SourceRange|undefined), parentStyleSheetId:(CSSAgent.StyleSheetId|undefined)}} */
CSSAgent.CSSMedia;

/** @typedef {!{selector:(string), url:(string), lineNumber:(number), time:(number), hitCount:(number), matchCount:(number)}} */
CSSAgent.SelectorProfileEntry;

/** @typedef {!{totalTime:(number), data:(!Array.<CSSAgent.SelectorProfileEntry>)}} */
CSSAgent.SelectorProfile;

/** @enum {string} */
CSSAgent.RegionRegionOverset = {
    Overset: "overset",
    Fit: "fit",
    Empty: "empty"
};

/** @typedef {!{regionOverset:(CSSAgent.RegionRegionOverset), nodeId:(DOMAgent.NodeId)}} */
CSSAgent.Region;

/** @typedef {!{documentNodeId:(DOMAgent.NodeId), name:(string), overset:(boolean), content:(!Array.<DOMAgent.NodeId>), regions:(!Array.<CSSAgent.Region>)}} */
CSSAgent.NamedFlow;

/** @typedef {!{familyName:(string), glyphCount:(number)}} */
CSSAgent.PlatformFontUsage;
/** @interface */
CSSAgent.Dispatcher = function() {};
CSSAgent.Dispatcher.prototype.mediaQueryResultChanged = function() {};
/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 */
CSSAgent.Dispatcher.prototype.styleSheetChanged = function(styleSheetId) {};
/**
 * @param {CSSAgent.CSSStyleSheetHeader} header
 */
CSSAgent.Dispatcher.prototype.styleSheetAdded = function(header) {};
/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 */
CSSAgent.Dispatcher.prototype.styleSheetRemoved = function(styleSheetId) {};
/**
 * @param {CSSAgent.NamedFlow} namedFlow
 */
CSSAgent.Dispatcher.prototype.namedFlowCreated = function(namedFlow) {};
/**
 * @param {DOMAgent.NodeId} documentNodeId
 * @param {string} flowName
 */
CSSAgent.Dispatcher.prototype.namedFlowRemoved = function(documentNodeId, flowName) {};
/**
 * @param {CSSAgent.NamedFlow} namedFlow
 */
CSSAgent.Dispatcher.prototype.regionLayoutUpdated = function(namedFlow) {};
/**
 * @param {CSSAgent.NamedFlow} namedFlow
 */
CSSAgent.Dispatcher.prototype.regionOversetChanged = function(namedFlow) {};


/**
 * @constructor
*/
Protocol.DOMDebuggerAgent = function(){};

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {DOMDebuggerAgent.DOMBreakpointType} type
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setDOMBreakpoint = function(nodeId, type, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setDOMBreakpoint = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {DOMDebuggerAgent.DOMBreakpointType} type
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.removeDOMBreakpoint = function(nodeId, type, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_removeDOMBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} eventName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setEventListenerBreakpoint = function(eventName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setEventListenerBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} eventName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.removeEventListenerBreakpoint = function(eventName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_removeEventListenerBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} eventName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setInstrumentationBreakpoint = function(eventName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setInstrumentationBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} eventName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.removeInstrumentationBreakpoint = function(eventName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_removeInstrumentationBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setXHRBreakpoint = function(url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setXHRBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.removeXHRBreakpoint = function(url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_removeXHRBreakpoint = function(obj, opt_callback) {}



var DOMDebuggerAgent = function(){};

/** @enum {string} */
DOMDebuggerAgent.DOMBreakpointType = {
    SubtreeModified: "subtree-modified",
    AttributeModified: "attribute-modified",
    NodeRemoved: "node-removed"
};
/** @interface */
DOMDebuggerAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.WorkerAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {number} workerId
 * @param {!Object} message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.sendMessageToWorker = function(workerId, message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_sendMessageToWorker = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.canInspectWorkers = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_canInspectWorkers = function(obj, opt_callback) {}

/**
 * @param {number} workerId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.connectToWorker = function(workerId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_connectToWorker = function(obj, opt_callback) {}

/**
 * @param {number} workerId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.disconnectFromWorker = function(workerId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_disconnectFromWorker = function(obj, opt_callback) {}

/**
 * @param {boolean} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.setAutoconnectToWorkers = function(value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_setAutoconnectToWorkers = function(obj, opt_callback) {}



var WorkerAgent = function(){};
/** @interface */
WorkerAgent.Dispatcher = function() {};
/**
 * @param {number} workerId
 * @param {string} url
 * @param {boolean} inspectorConnected
 */
WorkerAgent.Dispatcher.prototype.workerCreated = function(workerId, url, inspectorConnected) {};
/**
 * @param {number} workerId
 */
WorkerAgent.Dispatcher.prototype.workerTerminated = function(workerId) {};
/**
 * @param {number} workerId
 * @param {!Object} message
 */
WorkerAgent.Dispatcher.prototype.dispatchMessageFromWorker = function(workerId, message) {};
WorkerAgent.Dispatcher.prototype.disconnectedFromWorker = function() {};


/**
 * @constructor
*/
Protocol.CanvasAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.dropTraceLog = function(traceLogId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_dropTraceLog = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.hasUninstrumentedCanvases = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_hasUninstrumentedCanvases = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId=} opt_frameId
 * @param {function(?Protocol.Error, CanvasAgent.TraceLogId):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.captureFrame = function(opt_frameId, opt_callback) {}
/** @param {function(?Protocol.Error, CanvasAgent.TraceLogId):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_captureFrame = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId=} opt_frameId
 * @param {function(?Protocol.Error, CanvasAgent.TraceLogId):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.startCapturing = function(opt_frameId, opt_callback) {}
/** @param {function(?Protocol.Error, CanvasAgent.TraceLogId):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_startCapturing = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.stopCapturing = function(traceLogId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_stopCapturing = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {number=} opt_startOffset
 * @param {number=} opt_maxLength
 * @param {function(?Protocol.Error, CanvasAgent.TraceLog):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.getTraceLog = function(traceLogId, opt_startOffset, opt_maxLength, opt_callback) {}
/** @param {function(?Protocol.Error, CanvasAgent.TraceLog):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_getTraceLog = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {number} stepNo
 * @param {function(?Protocol.Error, CanvasAgent.ResourceState, number):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.replayTraceLog = function(traceLogId, stepNo, opt_callback) {}
/** @param {function(?Protocol.Error, CanvasAgent.ResourceState, number):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_replayTraceLog = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {CanvasAgent.ResourceId} resourceId
 * @param {function(?Protocol.Error, CanvasAgent.ResourceState):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.getResourceState = function(traceLogId, resourceId, opt_callback) {}
/** @param {function(?Protocol.Error, CanvasAgent.ResourceState):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_getResourceState = function(obj, opt_callback) {}

/**
 * @param {CanvasAgent.TraceLogId} traceLogId
 * @param {number} callIndex
 * @param {number} argumentIndex
 * @param {string=} opt_objectGroup
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject=, CanvasAgent.ResourceState=):void=} opt_callback
 */
Protocol.CanvasAgent.prototype.evaluateTraceLogCallArgument = function(traceLogId, callIndex, argumentIndex, opt_objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject=, CanvasAgent.ResourceState=):void=} opt_callback */
Protocol.CanvasAgent.prototype.invoke_evaluateTraceLogCallArgument = function(obj, opt_callback) {}



var CanvasAgent = function(){};

/** @typedef {string} */
CanvasAgent.ResourceId;

/** @typedef {!{name:(string), enumValueForName:(string|undefined), value:(CanvasAgent.CallArgument|undefined), values:(!Array.<CanvasAgent.ResourceStateDescriptor>|undefined), isArray:(boolean|undefined)}} */
CanvasAgent.ResourceStateDescriptor;

/** @typedef {!{id:(CanvasAgent.ResourceId), traceLogId:(CanvasAgent.TraceLogId), descriptors:(!Array.<CanvasAgent.ResourceStateDescriptor>|undefined), imageURL:(string|undefined)}} */
CanvasAgent.ResourceState;

/** @enum {string} */
CanvasAgent.CallArgumentType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean"
};

/** @enum {string} */
CanvasAgent.CallArgumentSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date"
};

/** @typedef {!{description:(string), enumName:(string|undefined), resourceId:(CanvasAgent.ResourceId|undefined), type:(CanvasAgent.CallArgumentType|undefined), subtype:(CanvasAgent.CallArgumentSubtype|undefined), remoteObject:(RuntimeAgent.RemoteObject|undefined)}} */
CanvasAgent.CallArgument;

/** @typedef {!{contextId:(CanvasAgent.ResourceId), functionName:(string|undefined), arguments:(!Array.<CanvasAgent.CallArgument>|undefined), result:(CanvasAgent.CallArgument|undefined), isDrawingCall:(boolean|undefined), isFrameEndCall:(boolean|undefined), property:(string|undefined), value:(CanvasAgent.CallArgument|undefined), sourceURL:(string|undefined), lineNumber:(number|undefined), columnNumber:(number|undefined)}} */
CanvasAgent.Call;

/** @typedef {string} */
CanvasAgent.TraceLogId;

/** @typedef {!{id:(CanvasAgent.TraceLogId), calls:(!Array.<CanvasAgent.Call>), contexts:(!Array.<CanvasAgent.CallArgument>), startOffset:(number), alive:(boolean), totalAvailableCalls:(number)}} */
CanvasAgent.TraceLog;
/** @interface */
CanvasAgent.Dispatcher = function() {};
/**
 * @param {PageAgent.FrameId} frameId
 */
CanvasAgent.Dispatcher.prototype.contextCreated = function(frameId) {};
/**
 * @param {PageAgent.FrameId=} opt_frameId
 * @param {CanvasAgent.TraceLogId=} opt_traceLogId
 */
CanvasAgent.Dispatcher.prototype.traceLogsRemoved = function(opt_frameId, opt_traceLogId) {};


/**
 * @constructor
*/
Protocol.InputAgent = function(){};

/**
 * @param {string} type
 * @param {number=} opt_modifiers
 * @param {number=} opt_timestamp
 * @param {string=} opt_text
 * @param {string=} opt_unmodifiedText
 * @param {string=} opt_keyIdentifier
 * @param {number=} opt_windowsVirtualKeyCode
 * @param {number=} opt_nativeVirtualKeyCode
 * @param {boolean=} opt_autoRepeat
 * @param {boolean=} opt_isKeypad
 * @param {boolean=} opt_isSystemKey
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchKeyEvent = function(type, opt_modifiers, opt_timestamp, opt_text, opt_unmodifiedText, opt_keyIdentifier, opt_windowsVirtualKeyCode, opt_nativeVirtualKeyCode, opt_autoRepeat, opt_isKeypad, opt_isSystemKey, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_dispatchKeyEvent = function(obj, opt_callback) {}

/**
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number=} opt_modifiers
 * @param {number=} opt_timestamp
 * @param {string=} opt_button
 * @param {number=} opt_clickCount
 * @param {boolean=} opt_deviceSpace
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchMouseEvent = function(type, x, y, opt_modifiers, opt_timestamp, opt_button, opt_clickCount, opt_deviceSpace, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_dispatchMouseEvent = function(obj, opt_callback) {}

/**
 * @param {string} type
 * @param {!Array.<InputAgent.TouchPoint>} touchPoints
 * @param {number=} opt_modifiers
 * @param {number=} opt_timestamp
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchTouchEvent = function(type, touchPoints, opt_modifiers, opt_timestamp, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_dispatchTouchEvent = function(obj, opt_callback) {}

/**
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number=} opt_timestamp
 * @param {number=} opt_deltaX
 * @param {number=} opt_deltaY
 * @param {number=} opt_pinchScale
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchGestureEvent = function(type, x, y, opt_timestamp, opt_deltaX, opt_deltaY, opt_pinchScale, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_dispatchGestureEvent = function(obj, opt_callback) {}



var InputAgent = function(){};

/** @enum {string} */
InputAgent.TouchPointState = {
    TouchPressed: "touchPressed",
    TouchReleased: "touchReleased",
    TouchMoved: "touchMoved",
    TouchStationary: "touchStationary",
    TouchCancelled: "touchCancelled"
};

/** @typedef {!{state:(InputAgent.TouchPointState), x:(number), y:(number), radiusX:(number|undefined), radiusY:(number|undefined), rotationAngle:(number|undefined), force:(number|undefined), id:(number|undefined)}} */
InputAgent.TouchPoint;
/** @interface */
InputAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.LayerTreeAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId=} opt_nodeId
 * @param {function(?Protocol.Error, !Array.<LayerTreeAgent.Layer>):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.getLayers = function(opt_nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<LayerTreeAgent.Layer>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_getLayers = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.LayerId} layerId
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.compositingReasons = function(layerId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_compositingReasons = function(obj, opt_callback) {}



var LayerTreeAgent = function(){};

/** @typedef {string} */
LayerTreeAgent.LayerId;

/** @typedef {!{layerId:(LayerTreeAgent.LayerId), parentLayerId:(LayerTreeAgent.LayerId|undefined), nodeId:(DOMAgent.NodeId|undefined), offsetX:(number), offsetY:(number), width:(number), height:(number), transform:(!Array.<number>|undefined), anchorX:(number|undefined), anchorY:(number|undefined), anchorZ:(number|undefined), paintCount:(number), invisible:(boolean|undefined)}} */
LayerTreeAgent.Layer;
/** @interface */
LayerTreeAgent.Dispatcher = function() {};
LayerTreeAgent.Dispatcher.prototype.layerTreeDidChange = function() {};


/**
 * @constructor
*/
Protocol.TracingAgent = function(){};

/**
 * @param {string} categories
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TracingAgent.prototype.start = function(categories, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_start = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TracingAgent.prototype.end = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_end = function(obj, opt_callback) {}



var TracingAgent = function(){};
/** @interface */
TracingAgent.Dispatcher = function() {};
/**
 * @param {!Array.<!Object>} value
 */
TracingAgent.Dispatcher.prototype.dataCollected = function(value) {};
TracingAgent.Dispatcher.prototype.tracingComplete = function() {};


/**
 * @constructor
*/
Protocol.RuntimeAgent = function(){};

/**
 * @param {string} expression
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {RuntimeAgent.ExecutionContextId=} opt_contextId
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.evaluate = function(expression, opt_objectGroup, opt_includeCommandLineAPI, opt_doNotPauseOnExceptionsAndMuteConsole, opt_contextId, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_evaluate = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {string} functionDeclaration
 * @param {!Array.<RuntimeAgent.CallArgument>=} opt_arguments
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.callFunctionOn = function(objectId, functionDeclaration, opt_arguments, opt_doNotPauseOnExceptionsAndMuteConsole, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_callFunctionOn = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {boolean=} opt_ownProperties
 * @param {boolean=} opt_accessorPropertiesOnly
 * @param {function(?Protocol.Error, !Array.<RuntimeAgent.PropertyDescriptor>, !Array.<RuntimeAgent.InternalPropertyDescriptor>=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.getProperties = function(objectId, opt_ownProperties, opt_accessorPropertiesOnly, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<RuntimeAgent.PropertyDescriptor>, !Array.<RuntimeAgent.InternalPropertyDescriptor>=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_getProperties = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.releaseObject = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_releaseObject = function(obj, opt_callback) {}

/**
 * @param {string} objectGroup
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.releaseObjectGroup = function(objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_releaseObjectGroup = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.run = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_run = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_disable = function(obj, opt_callback) {}



var RuntimeAgent = function(){};

/** @typedef {string} */
RuntimeAgent.RemoteObjectId;

/** @enum {string} */
RuntimeAgent.RemoteObjectType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean"
};

/** @enum {string} */
RuntimeAgent.RemoteObjectSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date"
};

/** @typedef {!{type:(RuntimeAgent.RemoteObjectType), subtype:(RuntimeAgent.RemoteObjectSubtype|undefined), className:(string|undefined), value:(*|undefined), description:(string|undefined), objectId:(RuntimeAgent.RemoteObjectId|undefined), preview:(RuntimeAgent.ObjectPreview|undefined)}} */
RuntimeAgent.RemoteObject;

/** @typedef {!{lossless:(boolean), overflow:(boolean), properties:(!Array.<RuntimeAgent.PropertyPreview>)}} */
RuntimeAgent.ObjectPreview;

/** @enum {string} */
RuntimeAgent.PropertyPreviewType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean"
};

/** @enum {string} */
RuntimeAgent.PropertyPreviewSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date"
};

/** @typedef {!{name:(string), type:(RuntimeAgent.PropertyPreviewType), value:(string|undefined), valuePreview:(RuntimeAgent.ObjectPreview|undefined), subtype:(RuntimeAgent.PropertyPreviewSubtype|undefined)}} */
RuntimeAgent.PropertyPreview;

/** @typedef {!{name:(string), value:(RuntimeAgent.RemoteObject|undefined), writable:(boolean|undefined), get:(RuntimeAgent.RemoteObject|undefined), set:(RuntimeAgent.RemoteObject|undefined), configurable:(boolean), enumerable:(boolean), wasThrown:(boolean|undefined), isOwn:(boolean|undefined)}} */
RuntimeAgent.PropertyDescriptor;

/** @typedef {!{name:(string), value:(RuntimeAgent.RemoteObject|undefined)}} */
RuntimeAgent.InternalPropertyDescriptor;

/** @typedef {!{value:(*|undefined), objectId:(RuntimeAgent.RemoteObjectId|undefined)}} */
RuntimeAgent.CallArgument;

/** @typedef {number} */
RuntimeAgent.ExecutionContextId;

/** @typedef {!{id:(RuntimeAgent.ExecutionContextId), isPageContext:(boolean), name:(string), frameId:(string)}} */
RuntimeAgent.ExecutionContextDescription;
/** @interface */
RuntimeAgent.Dispatcher = function() {};
/**
 * @param {RuntimeAgent.ExecutionContextDescription} context
 */
RuntimeAgent.Dispatcher.prototype.executionContextCreated = function(context) {};


/**
 * @constructor
*/
Protocol.DebuggerAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {boolean} active
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpointsActive = function(active, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBreakpointsActive = function(obj, opt_callback) {}

/**
 * @param {boolean} skipped
 * @param {boolean=} opt_untilReload
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setSkipAllPauses = function(skipped, opt_untilReload, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setSkipAllPauses = function(obj, opt_callback) {}

/**
 * @param {number} lineNumber
 * @param {string=} opt_url
 * @param {string=} opt_urlRegex
 * @param {number=} opt_columnNumber
 * @param {string=} opt_condition
 * @param {boolean=} opt_isAntibreakpoint
 * @param {function(?Protocol.Error, DebuggerAgent.BreakpointId, !Array.<DebuggerAgent.Location>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpointByUrl = function(lineNumber, opt_url, opt_urlRegex, opt_columnNumber, opt_condition, opt_isAntibreakpoint, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.BreakpointId, !Array.<DebuggerAgent.Location>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBreakpointByUrl = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.Location} location
 * @param {string=} opt_condition
 * @param {function(?Protocol.Error, DebuggerAgent.BreakpointId, DebuggerAgent.Location):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpoint = function(location, opt_condition, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.BreakpointId, DebuggerAgent.Location):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBreakpoint = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.BreakpointId} breakpointId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.removeBreakpoint = function(breakpointId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_removeBreakpoint = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.Location} location
 * @param {boolean=} opt_interstatementLocation
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.continueToLocation = function(location, opt_interstatementLocation, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_continueToLocation = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.stepOver = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_stepOver = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.stepInto = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_stepInto = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.stepOut = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_stepOut = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.pause = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_pause = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.resume = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_resume = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {string} query
 * @param {boolean=} opt_caseSensitive
 * @param {boolean=} opt_isRegex
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.SearchMatch>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.searchInContent = function(scriptId, query, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.SearchMatch>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_searchInContent = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.canSetScriptSource = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_canSetScriptSource = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {string} scriptSource
 * @param {boolean=} opt_preview
 * @param {function(?Protocol.Error, DebuggerAgent.SetScriptSourceError=, !Array.<DebuggerAgent.CallFrame>=, !Object=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setScriptSource = function(scriptId, scriptSource, opt_preview, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.SetScriptSourceError=, !Array.<DebuggerAgent.CallFrame>=, !Object=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setScriptSource = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.CallFrameId} callFrameId
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, !Object):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.restartFrame = function(callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, !Object):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_restartFrame = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getScriptSource = function(scriptId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getScriptSource = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} functionId
 * @param {function(?Protocol.Error, DebuggerAgent.FunctionDetails):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getFunctionDetails = function(functionId, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.FunctionDetails):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getFunctionDetails = function(obj, opt_callback) {}

/**
 * @param {string} state
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setPauseOnExceptions = function(state, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setPauseOnExceptions = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.CallFrameId} callFrameId
 * @param {string} expression
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.evaluateOnCallFrame = function(callFrameId, expression, opt_objectGroup, opt_includeCommandLineAPI, opt_doNotPauseOnExceptionsAndMuteConsole, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_evaluateOnCallFrame = function(obj, opt_callback) {}

/**
 * @param {string} expression
 * @param {string} sourceURL
 * @param {function(?Protocol.Error, DebuggerAgent.ScriptId=, string=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.compileScript = function(expression, sourceURL, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.ScriptId=, string=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_compileScript = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {RuntimeAgent.ExecutionContextId=} opt_contextId
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.runScript = function(scriptId, opt_contextId, opt_objectGroup, opt_doNotPauseOnExceptionsAndMuteConsole, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_runScript = function(obj, opt_callback) {}

/**
 * @param {string=} opt_message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setOverlayMessage = function(opt_message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setOverlayMessage = function(obj, opt_callback) {}

/**
 * @param {number} scopeNumber
 * @param {string} variableName
 * @param {RuntimeAgent.CallArgument} newValue
 * @param {DebuggerAgent.CallFrameId=} opt_callFrameId
 * @param {RuntimeAgent.RemoteObjectId=} opt_functionObjectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setVariableValue = function(scopeNumber, variableName, newValue, opt_callFrameId, opt_functionObjectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setVariableValue = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.CallFrameId} callFrameId
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.Location>=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getStepInPositions = function(callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.Location>=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getStepInPositions = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getBacktrace = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getBacktrace = function(obj, opt_callback) {}

/**
 * @param {string=} opt_script
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.skipStackFrames = function(opt_script, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_skipStackFrames = function(obj, opt_callback) {}



var DebuggerAgent = function(){};

/** @typedef {!{lineNumber:(number), lineContent:(string)}} */
DebuggerAgent.SearchMatch;

/** @typedef {string} */
DebuggerAgent.BreakpointId;

/** @typedef {string} */
DebuggerAgent.ScriptId;

/** @typedef {string} */
DebuggerAgent.CallFrameId;

/** @typedef {!{scriptId:(DebuggerAgent.ScriptId), lineNumber:(number), columnNumber:(number|undefined)}} */
DebuggerAgent.Location;

/** @typedef {!{location:(DebuggerAgent.Location), name:(string|undefined), displayName:(string|undefined), inferredName:(string|undefined), scopeChain:(!Array.<DebuggerAgent.Scope>|undefined)}} */
DebuggerAgent.FunctionDetails;

/** @typedef {!{callFrameId:(DebuggerAgent.CallFrameId), functionName:(string), location:(DebuggerAgent.Location), scopeChain:(!Array.<DebuggerAgent.Scope>), this:(RuntimeAgent.RemoteObject)}} */
DebuggerAgent.CallFrame;

/** @enum {string} */
DebuggerAgent.ScopeType = {
    Global: "global",
    Local: "local",
    With: "with",
    Closure: "closure",
    Catch: "catch"
};

/** @typedef {!{type:(DebuggerAgent.ScopeType), object:(RuntimeAgent.RemoteObject)}} */
DebuggerAgent.Scope;

/** @typedef {!{compileError:(!Object|undefined)}} */
DebuggerAgent.SetScriptSourceError;
/** @interface */
DebuggerAgent.Dispatcher = function() {};
DebuggerAgent.Dispatcher.prototype.globalObjectCleared = function() {};
/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {boolean=} opt_isContentScript
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 */
DebuggerAgent.Dispatcher.prototype.scriptParsed = function(scriptId, url, startLine, startColumn, endLine, endColumn, opt_isContentScript, opt_sourceMapURL, opt_hasSourceURL) {};
/**
 * @param {DebuggerAgent.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {boolean=} opt_isContentScript
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 */
DebuggerAgent.Dispatcher.prototype.scriptFailedToParse = function(scriptId, url, startLine, startColumn, endLine, endColumn, opt_isContentScript, opt_sourceMapURL, opt_hasSourceURL) {};
/**
 * @param {DebuggerAgent.BreakpointId} breakpointId
 * @param {DebuggerAgent.Location} location
 */
DebuggerAgent.Dispatcher.prototype.breakpointResolved = function(breakpointId, location) {};
/**
 * @param {!Array.<DebuggerAgent.CallFrame>} callFrames
 * @param {string} reason
 * @param {!Object=} opt_data
 * @param {!Array.<string>=} opt_hitBreakpoints
 */
DebuggerAgent.Dispatcher.prototype.paused = function(callFrames, reason, opt_data, opt_hitBreakpoints) {};
DebuggerAgent.Dispatcher.prototype.resumed = function() {};


/**
 * @constructor
*/
Protocol.ProfilerAgent = function(){};

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.start = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_start = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, ProfilerAgent.ProfileHeader):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.stop = function(opt_callback) {}
/** @param {function(?Protocol.Error, ProfilerAgent.ProfileHeader):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_stop = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<ProfilerAgent.ProfileHeader>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.getProfileHeaders = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<ProfilerAgent.ProfileHeader>):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_getProfileHeaders = function(obj, opt_callback) {}

/**
 * @param {number} uid
 * @param {function(?Protocol.Error, ProfilerAgent.CPUProfile):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.getCPUProfile = function(uid, opt_callback) {}
/** @param {function(?Protocol.Error, ProfilerAgent.CPUProfile):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_getCPUProfile = function(obj, opt_callback) {}

/**
 * @param {string} type
 * @param {number} uid
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.removeProfile = function(type, uid, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_removeProfile = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.clearProfiles = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_clearProfiles = function(obj, opt_callback) {}



var ProfilerAgent = function(){};

/** @typedef {!{title:(string), uid:(number)}} */
ProfilerAgent.ProfileHeader;

/** @typedef {!{functionName:(string), scriptId:(DebuggerAgent.ScriptId), url:(string), lineNumber:(number), hitCount:(number), callUID:(number), children:(!Array.<ProfilerAgent.CPUProfileNode>), deoptReason:(string), id:(number|undefined)}} */
ProfilerAgent.CPUProfileNode;

/** @typedef {!{head:(ProfilerAgent.CPUProfileNode), startTime:(number), endTime:(number), samples:(!Array.<number>|undefined)}} */
ProfilerAgent.CPUProfile;

/** @typedef {string} */
ProfilerAgent.HeapSnapshotObjectId;
/** @interface */
ProfilerAgent.Dispatcher = function() {};
/**
 * @param {ProfilerAgent.ProfileHeader} header
 */
ProfilerAgent.Dispatcher.prototype.addProfileHeader = function(header) {};
/**
 * @param {boolean} isProfiling
 */
ProfilerAgent.Dispatcher.prototype.setRecordingProfile = function(isProfiling) {};
ProfilerAgent.Dispatcher.prototype.resetProfiles = function() {};


/**
 * @constructor
*/
Protocol.HeapProfilerAgent = function(){};

/**
 * @param {function(?Protocol.Error, !Array.<HeapProfilerAgent.ProfileHeader>):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.getProfileHeaders = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<HeapProfilerAgent.ProfileHeader>):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getProfileHeaders = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.startTrackingHeapObjects = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_startTrackingHeapObjects = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.stopTrackingHeapObjects = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_stopTrackingHeapObjects = function(obj, opt_callback) {}

/**
 * @param {number} uid
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.getHeapSnapshot = function(uid, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getHeapSnapshot = function(obj, opt_callback) {}

/**
 * @param {number} uid
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.removeProfile = function(uid, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_removeProfile = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.clearProfiles = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_clearProfiles = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_reportProgress
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.takeHeapSnapshot = function(opt_reportProgress, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_takeHeapSnapshot = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.collectGarbage = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_collectGarbage = function(obj, opt_callback) {}

/**
 * @param {HeapProfilerAgent.HeapSnapshotObjectId} objectId
 * @param {string=} opt_objectGroup
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.getObjectByHeapObjectId = function(objectId, opt_objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getObjectByHeapObjectId = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, HeapProfilerAgent.HeapSnapshotObjectId):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.getHeapObjectId = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, HeapProfilerAgent.HeapSnapshotObjectId):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getHeapObjectId = function(obj, opt_callback) {}



var HeapProfilerAgent = function(){};

/** @typedef {!{title:(string), uid:(number), maxJSObjectId:(number|undefined)}} */
HeapProfilerAgent.ProfileHeader;

/** @typedef {string} */
HeapProfilerAgent.HeapSnapshotObjectId;
/** @interface */
HeapProfilerAgent.Dispatcher = function() {};
/**
 * @param {HeapProfilerAgent.ProfileHeader} header
 */
HeapProfilerAgent.Dispatcher.prototype.addProfileHeader = function(header) {};
/**
 * @param {number} uid
 * @param {string} chunk
 */
HeapProfilerAgent.Dispatcher.prototype.addHeapSnapshotChunk = function(uid, chunk) {};
/**
 * @param {number} uid
 */
HeapProfilerAgent.Dispatcher.prototype.finishHeapSnapshot = function(uid) {};
HeapProfilerAgent.Dispatcher.prototype.resetProfiles = function() {};
/**
 * @param {number} done
 * @param {number} total
 */
HeapProfilerAgent.Dispatcher.prototype.reportHeapSnapshotProgress = function(done, total) {};
/**
 * @param {number} lastSeenObjectId
 * @param {number} timestamp
 */
HeapProfilerAgent.Dispatcher.prototype.lastSeenObjectId = function(lastSeenObjectId, timestamp) {};
/**
 * @param {!Array.<number>} statsUpdate
 */
HeapProfilerAgent.Dispatcher.prototype.heapStatsUpdate = function(statsUpdate) {};

/** @constructor
 * @param {!Object.<string, !Object>} agentsMap
 */
Protocol.Agents = function(agentsMap){this._agentsMap;};
/**
 * @param {string} domain
 * @param {!Object} dispatcher
 */
Protocol.Agents.prototype.registerDispatcher = function(domain, dispatcher){};
/** @return {!Protocol.InspectorAgent}*/
Protocol.Agents.prototype.inspectorAgent = function(){};
/**
 * @param {!InspectorAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerInspectorDispatcher = function(dispatcher) {}
/** @return {!Protocol.MemoryAgent}*/
Protocol.Agents.prototype.memoryAgent = function(){};
/**
 * @param {!MemoryAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerMemoryDispatcher = function(dispatcher) {}
/** @return {!Protocol.PageAgent}*/
Protocol.Agents.prototype.pageAgent = function(){};
/**
 * @param {!PageAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerPageDispatcher = function(dispatcher) {}
/** @return {!Protocol.ConsoleAgent}*/
Protocol.Agents.prototype.consoleAgent = function(){};
/**
 * @param {!ConsoleAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerConsoleDispatcher = function(dispatcher) {}
/** @return {!Protocol.NetworkAgent}*/
Protocol.Agents.prototype.networkAgent = function(){};
/**
 * @param {!NetworkAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerNetworkDispatcher = function(dispatcher) {}
/** @return {!Protocol.DatabaseAgent}*/
Protocol.Agents.prototype.databaseAgent = function(){};
/**
 * @param {!DatabaseAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDatabaseDispatcher = function(dispatcher) {}
/** @return {!Protocol.IndexedDBAgent}*/
Protocol.Agents.prototype.indexedDBAgent = function(){};
/**
 * @param {!IndexedDBAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerIndexedDBDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMStorageAgent}*/
Protocol.Agents.prototype.domstorageAgent = function(){};
/**
 * @param {!DOMStorageAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDOMStorageDispatcher = function(dispatcher) {}
/** @return {!Protocol.ApplicationCacheAgent}*/
Protocol.Agents.prototype.applicationCacheAgent = function(){};
/**
 * @param {!ApplicationCacheAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerApplicationCacheDispatcher = function(dispatcher) {}
/** @return {!Protocol.FileSystemAgent}*/
Protocol.Agents.prototype.fileSystemAgent = function(){};
/**
 * @param {!FileSystemAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerFileSystemDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMAgent}*/
Protocol.Agents.prototype.domAgent = function(){};
/**
 * @param {!DOMAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDOMDispatcher = function(dispatcher) {}
/** @return {!Protocol.CSSAgent}*/
Protocol.Agents.prototype.cssAgent = function(){};
/**
 * @param {!CSSAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerCSSDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMDebuggerAgent}*/
Protocol.Agents.prototype.domdebuggerAgent = function(){};
/**
 * @param {!DOMDebuggerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDOMDebuggerDispatcher = function(dispatcher) {}
/** @return {!Protocol.WorkerAgent}*/
Protocol.Agents.prototype.workerAgent = function(){};
/**
 * @param {!WorkerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerWorkerDispatcher = function(dispatcher) {}
/** @return {!Protocol.CanvasAgent}*/
Protocol.Agents.prototype.canvasAgent = function(){};
/**
 * @param {!CanvasAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerCanvasDispatcher = function(dispatcher) {}
/** @return {!Protocol.InputAgent}*/
Protocol.Agents.prototype.inputAgent = function(){};
/**
 * @param {!InputAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerInputDispatcher = function(dispatcher) {}
/** @return {!Protocol.LayerTreeAgent}*/
Protocol.Agents.prototype.layerTreeAgent = function(){};
/**
 * @param {!LayerTreeAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerLayerTreeDispatcher = function(dispatcher) {}
/** @return {!Protocol.TracingAgent}*/
Protocol.Agents.prototype.tracingAgent = function(){};
/**
 * @param {!TracingAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerTracingDispatcher = function(dispatcher) {}
/** @return {!Protocol.RuntimeAgent}*/
Protocol.Agents.prototype.runtimeAgent = function(){};
/**
 * @param {!RuntimeAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerRuntimeDispatcher = function(dispatcher) {}
/** @return {!Protocol.DebuggerAgent}*/
Protocol.Agents.prototype.debuggerAgent = function(){};
/**
 * @param {!DebuggerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDebuggerDispatcher = function(dispatcher) {}
/** @return {!Protocol.ProfilerAgent}*/
Protocol.Agents.prototype.profilerAgent = function(){};
/**
 * @param {!ProfilerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerProfilerDispatcher = function(dispatcher) {}
/** @return {!Protocol.HeapProfilerAgent}*/
Protocol.Agents.prototype.heapProfilerAgent = function(){};
/**
 * @param {!HeapProfilerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerHeapProfilerDispatcher = function(dispatcher) {}
