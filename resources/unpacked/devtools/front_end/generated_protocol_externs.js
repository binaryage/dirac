
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



var InspectorAgent = function(){};
/** @interface */
InspectorAgent.Dispatcher = function() {};
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

/**
 * @param {boolean} suppressed
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.MemoryAgent.prototype.setPressureNotificationsSuppressed = function(suppressed, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.MemoryAgent.prototype.invoke_setPressureNotificationsSuppressed = function(obj, opt_callback) {}

/**
 * @param {MemoryAgent.PressureLevel} level
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.MemoryAgent.prototype.simulatePressureNotification = function(level, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.MemoryAgent.prototype.invoke_simulatePressureNotification = function(obj, opt_callback) {}



var MemoryAgent = function(){};

/** @enum {string} */
MemoryAgent.PressureLevel = {
    Moderate: "moderate",
    Critical: "critical"
};
/** @interface */
MemoryAgent.Dispatcher = function() {};


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
 * @param {boolean} autoAttach
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setAutoAttachToCreatedPages = function(autoAttach, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setAutoAttachToCreatedPages = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_ignoreCache
 * @param {string=} opt_scriptToEvaluateOnLoad
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.reload = function(opt_ignoreCache, opt_scriptToEvaluateOnLoad, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_reload = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error, PageAgent.FrameId):void=} opt_callback
 */
Protocol.PageAgent.prototype.navigate = function(url, opt_callback) {}
/** @param {function(?Protocol.Error, PageAgent.FrameId):void=} opt_callback */
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
 * @param {function(?Protocol.Error, !Array.<NetworkAgent.Cookie>):void=} opt_callback
 */
Protocol.PageAgent.prototype.getCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<NetworkAgent.Cookie>):void=} opt_callback */
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
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.SearchMatch>):void=} opt_callback
 */
Protocol.PageAgent.prototype.searchInResource = function(frameId, url, query, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.SearchMatch>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_searchInResource = function(obj, opt_callback) {}

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
 * @param {number} deviceScaleFactor
 * @param {boolean} mobile
 * @param {boolean} fitWindow
 * @param {number=} opt_scale
 * @param {number=} opt_offsetX
 * @param {number=} opt_offsetY
 * @param {number=} opt_screenWidth
 * @param {number=} opt_screenHeight
 * @param {number=} opt_positionX
 * @param {number=} opt_positionY
 * @param {EmulationAgent.ScreenOrientation=} opt_screenOrientation
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setDeviceMetricsOverride = function(width, height, deviceScaleFactor, mobile, fitWindow, opt_scale, opt_offsetX, opt_offsetY, opt_screenWidth, opt_screenHeight, opt_positionX, opt_positionY, opt_screenOrientation, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setDeviceMetricsOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.clearDeviceMetricsOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_clearDeviceMetricsOverride = function(obj, opt_callback) {}

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
 * @param {string=} opt_configuration
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setTouchEmulationEnabled = function(enabled, opt_configuration, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setTouchEmulationEnabled = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.PageAgent.prototype.captureScreenshot = function(opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_captureScreenshot = function(obj, opt_callback) {}

/**
 * @param {string=} opt_format
 * @param {number=} opt_quality
 * @param {number=} opt_maxWidth
 * @param {number=} opt_maxHeight
 * @param {number=} opt_everyNthFrame
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.startScreencast = function(opt_format, opt_quality, opt_maxWidth, opt_maxHeight, opt_everyNthFrame, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_startScreencast = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.stopScreencast = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_stopScreencast = function(obj, opt_callback) {}

/**
 * @param {number} sessionId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.screencastFrameAck = function(sessionId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_screencastFrameAck = function(obj, opt_callback) {}

/**
 * @param {boolean} accept
 * @param {string=} opt_promptText
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.handleJavaScriptDialog = function(accept, opt_promptText, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_handleJavaScriptDialog = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setColorPickerEnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setColorPickerEnabled = function(obj, opt_callback) {}

/**
 * @param {string=} opt_message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setOverlayMessage = function(opt_message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setOverlayMessage = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, string, !Array.<PageAgent.AppManifestError>, string=):void=} opt_callback
 */
Protocol.PageAgent.prototype.getAppManifest = function(opt_callback) {}
/** @param {function(?Protocol.Error, string, !Array.<PageAgent.AppManifestError>, string=):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getAppManifest = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.requestAppBanner = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_requestAppBanner = function(obj, opt_callback) {}

/**
 * @param {number} threshold
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setBlockedEventsWarningThreshold = function(threshold, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setBlockedEventsWarningThreshold = function(obj, opt_callback) {}



var PageAgent = function(){};

/** @enum {string} */
PageAgent.ResourceType = {
    Document: "Document",
    Stylesheet: "Stylesheet",
    Image: "Image",
    Media: "Media",
    Font: "Font",
    Script: "Script",
    TextTrack: "TextTrack",
    XHR: "XHR",
    Fetch: "Fetch",
    EventSource: "EventSource",
    WebSocket: "WebSocket",
    Manifest: "Manifest",
    Other: "Other"
};

/** @typedef {string} */
PageAgent.FrameId;

/** @typedef {!{id:(string), parentId:(string|undefined), loaderId:(NetworkAgent.LoaderId), name:(string|undefined), url:(string), securityOrigin:(string), mimeType:(string)}} */
PageAgent.Frame;

/** @typedef {!{url:(string), type:(PageAgent.ResourceType), mimeType:(string), failed:(boolean|undefined), canceled:(boolean|undefined)}} */
PageAgent.FrameResource;

/** @typedef {!{frame:(PageAgent.Frame), childFrames:(!Array.<PageAgent.FrameResourceTree>|undefined), resources:(!Array.<PageAgent.FrameResource>)}} */
PageAgent.FrameResourceTree;

/** @typedef {string} */
PageAgent.ScriptIdentifier;

/** @typedef {!{id:(number), url:(string), title:(string)}} */
PageAgent.NavigationEntry;

/** @typedef {!{offsetTop:(number), pageScaleFactor:(number), deviceWidth:(number), deviceHeight:(number), scrollOffsetX:(number), scrollOffsetY:(number), timestamp:(number|undefined)}} */
PageAgent.ScreencastFrameMetadata;

/** @enum {string} */
PageAgent.DialogType = {
    Alert: "alert",
    Confirm: "confirm",
    Prompt: "prompt",
    Beforeunload: "beforeunload"
};

/** @typedef {!{message:(string), critical:(number), line:(number), column:(number)}} */
PageAgent.AppManifestError;
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
 * @param {PageAgent.FrameId} parentFrameId
 */
PageAgent.Dispatcher.prototype.frameAttached = function(frameId, parentFrameId) {};
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
PageAgent.Dispatcher.prototype.frameResized = function() {};
/**
 * @param {string} message
 * @param {PageAgent.DialogType} type
 */
PageAgent.Dispatcher.prototype.javascriptDialogOpening = function(message, type) {};
/**
 * @param {boolean} result
 */
PageAgent.Dispatcher.prototype.javascriptDialogClosed = function(result) {};
/**
 * @param {string} data
 * @param {PageAgent.ScreencastFrameMetadata} metadata
 * @param {number} sessionId
 */
PageAgent.Dispatcher.prototype.screencastFrame = function(data, metadata, sessionId) {};
/**
 * @param {boolean} visible
 */
PageAgent.Dispatcher.prototype.screencastVisibilityChanged = function(visible) {};
/**
 * @param {DOMAgent.RGBA} color
 */
PageAgent.Dispatcher.prototype.colorPicked = function(color) {};
PageAgent.Dispatcher.prototype.interstitialShown = function() {};
PageAgent.Dispatcher.prototype.interstitialHidden = function() {};


/**
 * @constructor
*/
Protocol.RenderingAgent = function(){};

/**
 * @param {boolean} result
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RenderingAgent.prototype.setShowPaintRects = function(result, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RenderingAgent.prototype.invoke_setShowPaintRects = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RenderingAgent.prototype.setShowDebugBorders = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RenderingAgent.prototype.invoke_setShowDebugBorders = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RenderingAgent.prototype.setShowFPSCounter = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RenderingAgent.prototype.invoke_setShowFPSCounter = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RenderingAgent.prototype.setShowScrollBottleneckRects = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RenderingAgent.prototype.invoke_setShowScrollBottleneckRects = function(obj, opt_callback) {}

/**
 * @param {boolean} show
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RenderingAgent.prototype.setShowViewportSizeOnResize = function(show, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RenderingAgent.prototype.invoke_setShowViewportSizeOnResize = function(obj, opt_callback) {}



var RenderingAgent = function(){};
/** @interface */
RenderingAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.EmulationAgent = function(){};

/**
 * @param {number} width
 * @param {number} height
 * @param {number} deviceScaleFactor
 * @param {boolean} mobile
 * @param {boolean} fitWindow
 * @param {number=} opt_scale
 * @param {number=} opt_offsetX
 * @param {number=} opt_offsetY
 * @param {number=} opt_screenWidth
 * @param {number=} opt_screenHeight
 * @param {number=} opt_positionX
 * @param {number=} opt_positionY
 * @param {EmulationAgent.ScreenOrientation=} opt_screenOrientation
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setDeviceMetricsOverride = function(width, height, deviceScaleFactor, mobile, fitWindow, opt_scale, opt_offsetX, opt_offsetY, opt_screenWidth, opt_screenHeight, opt_positionX, opt_positionY, opt_screenOrientation, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setDeviceMetricsOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.clearDeviceMetricsOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_clearDeviceMetricsOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.resetPageScaleFactor = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_resetPageScaleFactor = function(obj, opt_callback) {}

/**
 * @param {number} pageScaleFactor
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setPageScaleFactor = function(pageScaleFactor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setPageScaleFactor = function(obj, opt_callback) {}

/**
 * @param {boolean} value
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setScriptExecutionDisabled = function(value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setScriptExecutionDisabled = function(obj, opt_callback) {}

/**
 * @param {number=} opt_latitude
 * @param {number=} opt_longitude
 * @param {number=} opt_accuracy
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setGeolocationOverride = function(opt_latitude, opt_longitude, opt_accuracy, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setGeolocationOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.clearGeolocationOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_clearGeolocationOverride = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {string=} opt_configuration
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setTouchEmulationEnabled = function(enabled, opt_configuration, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setTouchEmulationEnabled = function(obj, opt_callback) {}

/**
 * @param {string} media
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setEmulatedMedia = function(media, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setEmulatedMedia = function(obj, opt_callback) {}

/**
 * @param {number} rate
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setCPUThrottlingRate = function(rate, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setCPUThrottlingRate = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.canEmulate = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_canEmulate = function(obj, opt_callback) {}



var EmulationAgent = function(){};

/** @enum {string} */
EmulationAgent.ScreenOrientationType = {
    PortraitPrimary: "portraitPrimary",
    PortraitSecondary: "portraitSecondary",
    LandscapePrimary: "landscapePrimary",
    LandscapeSecondary: "landscapeSecondary"
};

/** @typedef {!{type:(EmulationAgent.ScreenOrientationType), angle:(number)}} */
EmulationAgent.ScreenOrientation;
/** @interface */
EmulationAgent.Dispatcher = function() {};


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
 * @param {boolean=} opt_userGesture
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=, RuntimeAgent.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.evaluate = function(expression, opt_objectGroup, opt_includeCommandLineAPI, opt_doNotPauseOnExceptionsAndMuteConsole, opt_contextId, opt_returnByValue, opt_generatePreview, opt_userGesture, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=, RuntimeAgent.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_evaluate = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {string} functionDeclaration
 * @param {!Array.<RuntimeAgent.CallArgument>=} opt_arguments
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {boolean=} opt_userGesture
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.callFunctionOn = function(objectId, functionDeclaration, opt_arguments, opt_doNotPauseOnExceptionsAndMuteConsole, opt_returnByValue, opt_generatePreview, opt_userGesture, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_callFunctionOn = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {boolean=} opt_ownProperties
 * @param {boolean=} opt_accessorPropertiesOnly
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, !Array.<RuntimeAgent.PropertyDescriptor>, !Array.<RuntimeAgent.InternalPropertyDescriptor>=, RuntimeAgent.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.getProperties = function(objectId, opt_ownProperties, opt_accessorPropertiesOnly, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<RuntimeAgent.PropertyDescriptor>, !Array.<RuntimeAgent.InternalPropertyDescriptor>=, RuntimeAgent.ExceptionDetails=):void=} opt_callback */
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

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.setCustomObjectFormatterEnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_setCustomObjectFormatterEnabled = function(obj, opt_callback) {}

/**
 * @param {string} expression
 * @param {string} sourceURL
 * @param {boolean} persistScript
 * @param {RuntimeAgent.ExecutionContextId} executionContextId
 * @param {function(?Protocol.Error, RuntimeAgent.ScriptId=, RuntimeAgent.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.compileScript = function(expression, sourceURL, persistScript, executionContextId, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.ScriptId=, RuntimeAgent.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_compileScript = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.ScriptId} scriptId
 * @param {RuntimeAgent.ExecutionContextId} executionContextId
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_doNotPauseOnExceptionsAndMuteConsole
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, RuntimeAgent.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.runScript = function(scriptId, executionContextId, opt_objectGroup, opt_doNotPauseOnExceptionsAndMuteConsole, opt_includeCommandLineAPI, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, RuntimeAgent.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_runScript = function(obj, opt_callback) {}



var RuntimeAgent = function(){};

/** @typedef {string} */
RuntimeAgent.ScriptId;

/** @typedef {string} */
RuntimeAgent.RemoteObjectId;

/** @enum {string} */
RuntimeAgent.RemoteObjectType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol"
};

/** @enum {string} */
RuntimeAgent.RemoteObjectSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date",
    Map: "map",
    Set: "set",
    Iterator: "iterator",
    Generator: "generator",
    Error: "error"
};

/** @typedef {!{type:(RuntimeAgent.RemoteObjectType), subtype:(RuntimeAgent.RemoteObjectSubtype|undefined), className:(string|undefined), value:(*|undefined), description:(string|undefined), objectId:(RuntimeAgent.RemoteObjectId|undefined), preview:(RuntimeAgent.ObjectPreview|undefined), customPreview:(RuntimeAgent.CustomPreview|undefined)}} */
RuntimeAgent.RemoteObject;

/** @typedef {!{header:(string), hasBody:(boolean), formatterObjectId:(RuntimeAgent.RemoteObjectId), bindRemoteObjectFunctionId:(RuntimeAgent.RemoteObjectId), configObjectId:(RuntimeAgent.RemoteObjectId|undefined)}} */
RuntimeAgent.CustomPreview;

/** @enum {string} */
RuntimeAgent.ObjectPreviewType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol"
};

/** @enum {string} */
RuntimeAgent.ObjectPreviewSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date",
    Map: "map",
    Set: "set",
    Iterator: "iterator",
    Generator: "generator",
    Error: "error"
};

/** @typedef {!{type:(RuntimeAgent.ObjectPreviewType), subtype:(RuntimeAgent.ObjectPreviewSubtype|undefined), description:(string|undefined), overflow:(boolean), properties:(!Array.<RuntimeAgent.PropertyPreview>), entries:(!Array.<RuntimeAgent.EntryPreview>|undefined)}} */
RuntimeAgent.ObjectPreview;

/** @enum {string} */
RuntimeAgent.PropertyPreviewType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol",
    Accessor: "accessor"
};

/** @enum {string} */
RuntimeAgent.PropertyPreviewSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date",
    Map: "map",
    Set: "set",
    Iterator: "iterator",
    Generator: "generator",
    Error: "error"
};

/** @typedef {!{name:(string), type:(RuntimeAgent.PropertyPreviewType), value:(string|undefined), valuePreview:(RuntimeAgent.ObjectPreview|undefined), subtype:(RuntimeAgent.PropertyPreviewSubtype|undefined)}} */
RuntimeAgent.PropertyPreview;

/** @typedef {!{key:(RuntimeAgent.ObjectPreview|undefined), value:(RuntimeAgent.ObjectPreview)}} */
RuntimeAgent.EntryPreview;

/** @typedef {!{name:(string), value:(RuntimeAgent.RemoteObject|undefined), writable:(boolean|undefined), get:(RuntimeAgent.RemoteObject|undefined), set:(RuntimeAgent.RemoteObject|undefined), configurable:(boolean), enumerable:(boolean), wasThrown:(boolean|undefined), isOwn:(boolean|undefined), symbol:(RuntimeAgent.RemoteObject|undefined)}} */
RuntimeAgent.PropertyDescriptor;

/** @typedef {!{name:(string), value:(RuntimeAgent.RemoteObject|undefined)}} */
RuntimeAgent.InternalPropertyDescriptor;

/** @enum {string} */
RuntimeAgent.CallArgumentType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol"
};

/** @typedef {!{value:(*|undefined), objectId:(RuntimeAgent.RemoteObjectId|undefined), type:(RuntimeAgent.CallArgumentType|undefined)}} */
RuntimeAgent.CallArgument;

/** @typedef {number} */
RuntimeAgent.ExecutionContextId;

/** @typedef {!{id:(RuntimeAgent.ExecutionContextId), isDefault:(boolean), origin:(string), name:(string), frameId:(string)}} */
RuntimeAgent.ExecutionContextDescription;

/** @typedef {!{text:(string), url:(string|undefined), scriptId:(string|undefined), line:(number|undefined), column:(number|undefined), stack:(RuntimeAgent.StackTrace|undefined)}} */
RuntimeAgent.ExceptionDetails;

/** @typedef {!{functionName:(string), scriptId:(RuntimeAgent.ScriptId), url:(string), lineNumber:(number), columnNumber:(number)}} */
RuntimeAgent.CallFrame;

/** @typedef {!{description:(string|undefined), callFrames:(!Array.<RuntimeAgent.CallFrame>), parent:(RuntimeAgent.StackTrace|undefined)}} */
RuntimeAgent.StackTrace;
/** @interface */
RuntimeAgent.Dispatcher = function() {};
/**
 * @param {RuntimeAgent.ExecutionContextDescription} context
 */
RuntimeAgent.Dispatcher.prototype.executionContextCreated = function(context) {};
/**
 * @param {RuntimeAgent.ExecutionContextId} executionContextId
 */
RuntimeAgent.Dispatcher.prototype.executionContextDestroyed = function(executionContextId) {};
RuntimeAgent.Dispatcher.prototype.executionContextsCleared = function() {};
/**
 * @param {RuntimeAgent.RemoteObject} object
 * @param {!Object} hints
 */
RuntimeAgent.Dispatcher.prototype.inspectRequested = function(object, hints) {};


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
    Security: "security",
    Other: "other",
    Deprecation: "deprecation"
};

/** @enum {string} */
ConsoleAgent.ConsoleMessageLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug",
    Info: "info",
    RevokedError: "revokedError"
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
    Profile: "profile",
    ProfileEnd: "profileEnd"
};

/** @typedef {!{source:(ConsoleAgent.ConsoleMessageSource), level:(ConsoleAgent.ConsoleMessageLevel), text:(string), type:(ConsoleAgent.ConsoleMessageType|undefined), scriptId:(string|undefined), url:(string|undefined), line:(number|undefined), column:(number|undefined), repeatCount:(number|undefined), parameters:(!Array.<RuntimeAgent.RemoteObject>|undefined), stack:(RuntimeAgent.StackTrace|undefined), networkRequestId:(NetworkAgent.RequestId|undefined), timestamp:(ConsoleAgent.Timestamp), executionContextId:(RuntimeAgent.ExecutionContextId|undefined), messageId:(number|undefined), relatedMessageId:(number|undefined)}} */
ConsoleAgent.ConsoleMessage;
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
Protocol.SecurityAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.SecurityAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.SecurityAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.SecurityAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.SecurityAgent.prototype.invoke_disable = function(obj, opt_callback) {}



var SecurityAgent = function(){};

/** @typedef {number} */
SecurityAgent.CertificateId;

/** @enum {string} */
SecurityAgent.SecurityState = {
    Unknown: "unknown",
    Neutral: "neutral",
    Insecure: "insecure",
    Warning: "warning",
    Secure: "secure",
    Info: "info"
};

/** @typedef {!{securityState:(SecurityAgent.SecurityState), summary:(string), description:(string), certificateId:(SecurityAgent.CertificateId|undefined)}} */
SecurityAgent.SecurityStateExplanation;

/** @typedef {!{ranInsecureContent:(boolean), displayedInsecureContent:(boolean), ranInsecureContentStyle:(SecurityAgent.SecurityState), displayedInsecureContentStyle:(SecurityAgent.SecurityState)}} */
SecurityAgent.MixedContentStatus;
/** @interface */
SecurityAgent.Dispatcher = function() {};
/**
 * @param {SecurityAgent.SecurityState} securityState
 * @param {!Array.<SecurityAgent.SecurityStateExplanation>=} opt_explanations
 * @param {SecurityAgent.MixedContentStatus=} opt_mixedContentStatus
 * @param {boolean=} opt_schemeIsCryptographic
 */
SecurityAgent.Dispatcher.prototype.securityStateChanged = function(securityState, opt_explanations, opt_mixedContentStatus, opt_schemeIsCryptographic) {};


/**
 * @constructor
*/
Protocol.NetworkAgent = function(){};

/**
 * @param {number=} opt_maxTotalBufferSize
 * @param {number=} opt_maxResourceBufferSize
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.enable = function(opt_maxTotalBufferSize, opt_maxResourceBufferSize, opt_callback) {}
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
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.addBlockedURL = function(url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_addBlockedURL = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.removeBlockedURL = function(url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_removeBlockedURL = function(obj, opt_callback) {}

/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.replayXHR = function(requestId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_replayXHR = function(obj, opt_callback) {}

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setMonitoringXHREnabled = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setMonitoringXHREnabled = function(obj, opt_callback) {}

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
 * @param {function(?Protocol.Error, !Array.<NetworkAgent.Cookie>):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.getCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<NetworkAgent.Cookie>):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_getCookies = function(obj, opt_callback) {}

/**
 * @param {string} cookieName
 * @param {string} url
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.deleteCookie = function(cookieName, url, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_deleteCookie = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.canEmulateNetworkConditions = function(opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_canEmulateNetworkConditions = function(obj, opt_callback) {}

/**
 * @param {boolean} offline
 * @param {number} latency
 * @param {number} downloadThroughput
 * @param {number} uploadThroughput
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.emulateNetworkConditions = function(offline, latency, downloadThroughput, uploadThroughput, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_emulateNetworkConditions = function(obj, opt_callback) {}

/**
 * @param {boolean} cacheDisabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setCacheDisabled = function(cacheDisabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setCacheDisabled = function(obj, opt_callback) {}

/**
 * @param {boolean} bypass
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setBypassServiceWorker = function(bypass, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setBypassServiceWorker = function(obj, opt_callback) {}

/**
 * @param {number} maxTotalSize
 * @param {number} maxResourceSize
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setDataSizeLimitsForTest = function(maxTotalSize, maxResourceSize, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setDataSizeLimitsForTest = function(obj, opt_callback) {}

/**
 * @param {SecurityAgent.CertificateId} certificateId
 * @param {function(?Protocol.Error, NetworkAgent.CertificateDetails):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.getCertificateDetails = function(certificateId, opt_callback) {}
/** @param {function(?Protocol.Error, NetworkAgent.CertificateDetails):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_getCertificateDetails = function(obj, opt_callback) {}

/**
 * @param {SecurityAgent.CertificateId} certificateId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.showCertificateViewer = function(certificateId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_showCertificateViewer = function(obj, opt_callback) {}



var NetworkAgent = function(){};

/** @typedef {string} */
NetworkAgent.LoaderId;

/** @typedef {string} */
NetworkAgent.RequestId;

/** @typedef {number} */
NetworkAgent.Timestamp;

/** @typedef {!Object} */
NetworkAgent.Headers;

/** @typedef {!{requestTime:(number), proxyStart:(number), proxyEnd:(number), dnsStart:(number), dnsEnd:(number), connectStart:(number), connectEnd:(number), sslStart:(number), sslEnd:(number), workerStart:(number), workerReady:(number), sendStart:(number), sendEnd:(number), pushStart:(number), pushEnd:(number), receiveHeadersEnd:(number)}} */
NetworkAgent.ResourceTiming;

/** @enum {string} */
NetworkAgent.ResourcePriority = {
    VeryLow: "VeryLow",
    Low: "Low",
    Medium: "Medium",
    High: "High",
    VeryHigh: "VeryHigh"
};

/** @enum {string} */
NetworkAgent.RequestMixedContentType = {
    Blockable: "blockable",
    OptionallyBlockable: "optionally-blockable",
    None: "none"
};

/** @typedef {!{url:(string), method:(string), headers:(NetworkAgent.Headers), postData:(string|undefined), mixedContentType:(NetworkAgent.RequestMixedContentType|undefined), initialPriority:(NetworkAgent.ResourcePriority)}} */
NetworkAgent.Request;

/** @typedef {!{name:(string), sanDnsNames:(!Array.<string>), sanIpAddresses:(!Array.<string>)}} */
NetworkAgent.CertificateSubject;

/** @typedef {!{subject:(NetworkAgent.CertificateSubject), issuer:(string), validFrom:(NetworkAgent.Timestamp), validTo:(NetworkAgent.Timestamp)}} */
NetworkAgent.CertificateDetails;

/** @typedef {!{numUnknownScts:(number), numInvalidScts:(number), numValidScts:(number)}} */
NetworkAgent.CertificateValidationDetails;

/** @typedef {!{protocol:(string), keyExchange:(string), cipher:(string), mac:(string|undefined), certificateId:(SecurityAgent.CertificateId), certificateValidationDetails:(NetworkAgent.CertificateValidationDetails|undefined)}} */
NetworkAgent.SecurityDetails;

/** @enum {string} */
NetworkAgent.BlockedReason = {
    Csp: "csp",
    MixedContent: "mixed-content",
    Origin: "origin",
    Inspector: "inspector",
    Other: "other"
};

/** @typedef {!{url:(string), status:(number), statusText:(string), headers:(NetworkAgent.Headers), headersText:(string|undefined), mimeType:(string), requestHeaders:(NetworkAgent.Headers|undefined), requestHeadersText:(string|undefined), connectionReused:(boolean), connectionId:(number), remoteIPAddress:(string|undefined), remotePort:(number|undefined), fromDiskCache:(boolean|undefined), fromServiceWorker:(boolean|undefined), encodedDataLength:(number|undefined), timing:(NetworkAgent.ResourceTiming|undefined), protocol:(string|undefined), securityState:(SecurityAgent.SecurityState), securityDetails:(NetworkAgent.SecurityDetails|undefined)}} */
NetworkAgent.Response;

/** @typedef {!{headers:(NetworkAgent.Headers)}} */
NetworkAgent.WebSocketRequest;

/** @typedef {!{status:(number), statusText:(string), headers:(NetworkAgent.Headers), headersText:(string|undefined), requestHeaders:(NetworkAgent.Headers|undefined), requestHeadersText:(string|undefined)}} */
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

/** @typedef {!{type:(NetworkAgent.InitiatorType), stack:(RuntimeAgent.StackTrace|undefined), url:(string|undefined), lineNumber:(number|undefined)}} */
NetworkAgent.Initiator;

/** @enum {string} */
NetworkAgent.CookieSameSite = {
    Strict: "Strict",
    Lax: "Lax"
};

/** @typedef {!{name:(string), value:(string), domain:(string), path:(string), expires:(number), size:(number), httpOnly:(boolean), secure:(boolean), session:(boolean), sameSite:(NetworkAgent.CookieSameSite|undefined)}} */
NetworkAgent.Cookie;
/** @interface */
NetworkAgent.Dispatcher = function() {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.ResourcePriority} newPriority
 * @param {NetworkAgent.Timestamp} timestamp
 */
NetworkAgent.Dispatcher.prototype.resourceChangedPriority = function(requestId, newPriority, timestamp) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {PageAgent.FrameId} frameId
 * @param {NetworkAgent.LoaderId} loaderId
 * @param {string} documentURL
 * @param {NetworkAgent.Request} request
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.Timestamp} wallTime
 * @param {NetworkAgent.Initiator} initiator
 * @param {NetworkAgent.Response=} opt_redirectResponse
 * @param {PageAgent.ResourceType=} opt_type
 */
NetworkAgent.Dispatcher.prototype.requestWillBeSent = function(requestId, frameId, loaderId, documentURL, request, timestamp, wallTime, initiator, opt_redirectResponse, opt_type) {};
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
 * @param {number} encodedDataLength
 */
NetworkAgent.Dispatcher.prototype.loadingFinished = function(requestId, timestamp, encodedDataLength) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {PageAgent.ResourceType} type
 * @param {string} errorText
 * @param {boolean=} opt_canceled
 * @param {NetworkAgent.BlockedReason=} opt_blockedReason
 */
NetworkAgent.Dispatcher.prototype.loadingFailed = function(requestId, timestamp, type, errorText, opt_canceled, opt_blockedReason) {};
/**
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {NetworkAgent.Timestamp} wallTime
 * @param {NetworkAgent.WebSocketRequest} request
 */
NetworkAgent.Dispatcher.prototype.webSocketWillSendHandshakeRequest = function(requestId, timestamp, wallTime, request) {};
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
 * @param {NetworkAgent.RequestId} requestId
 * @param {NetworkAgent.Timestamp} timestamp
 * @param {string} eventName
 * @param {string} eventId
 * @param {string} data
 */
NetworkAgent.Dispatcher.prototype.eventSourceMessageReceived = function(requestId, timestamp, eventName, eventId, data) {};


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

/** @typedef {!{key:(string), primaryKey:(string), value:(string)}} */
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
Protocol.CacheStorageAgent = function(){};

/**
 * @param {string} securityOrigin
 * @param {function(?Protocol.Error, !Array.<CacheStorageAgent.Cache>):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.requestCacheNames = function(securityOrigin, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CacheStorageAgent.Cache>):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_requestCacheNames = function(obj, opt_callback) {}

/**
 * @param {CacheStorageAgent.CacheId} cacheId
 * @param {number} skipCount
 * @param {number} pageSize
 * @param {function(?Protocol.Error, !Array.<CacheStorageAgent.DataEntry>, boolean):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.requestEntries = function(cacheId, skipCount, pageSize, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CacheStorageAgent.DataEntry>, boolean):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_requestEntries = function(obj, opt_callback) {}

/**
 * @param {CacheStorageAgent.CacheId} cacheId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.deleteCache = function(cacheId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_deleteCache = function(obj, opt_callback) {}

/**
 * @param {CacheStorageAgent.CacheId} cacheId
 * @param {string} request
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.deleteEntry = function(cacheId, request, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_deleteEntry = function(obj, opt_callback) {}



var CacheStorageAgent = function(){};

/** @typedef {string} */
CacheStorageAgent.CacheId;

/** @typedef {!{request:(string), response:(string)}} */
CacheStorageAgent.DataEntry;

/** @typedef {!{cacheId:(CacheStorageAgent.CacheId), securityOrigin:(string), cacheName:(string)}} */
CacheStorageAgent.Cache;
/** @interface */
CacheStorageAgent.Dispatcher = function() {};


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
Protocol.DOMAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_disable = function(obj, opt_callback) {}

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
 * @param {boolean=} opt_includeUserAgentShadowDOM
 * @param {function(?Protocol.Error, string, number):void=} opt_callback
 */
Protocol.DOMAgent.prototype.performSearch = function(query, opt_includeUserAgentShadowDOM, opt_callback) {}
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
 * @param {DOMAgent.InspectMode} mode
 * @param {DOMAgent.HighlightConfig=} opt_highlightConfig
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setInspectMode = function(mode, opt_highlightConfig, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setInspectMode = function(obj, opt_callback) {}

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
 * @param {DOMAgent.BackendNodeId=} opt_backendNodeId
 * @param {RuntimeAgent.RemoteObjectId=} opt_objectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightNode = function(highlightConfig, opt_nodeId, opt_backendNodeId, opt_objectId, opt_callback) {}
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
 * @param {!Array.<DOMAgent.BackendNodeId>} backendNodeIds
 * @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.pushNodesByBackendIdsToFrontend = function(backendNodeIds, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMAgent.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_pushNodesByBackendIdsToFrontend = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setInspectedNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setInspectedNode = function(obj, opt_callback) {}

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
Protocol.DOMAgent.prototype.copyTo = function(nodeId, targetNodeId, opt_insertBeforeNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_copyTo = function(obj, opt_callback) {}

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

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getRelayoutBoundary = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, DOMAgent.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getRelayoutBoundary = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, !Object):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getHighlightObjectForTest = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Object):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getHighlightObjectForTest = function(obj, opt_callback) {}



var DOMAgent = function(){};

/** @typedef {number} */
DOMAgent.NodeId;

/** @typedef {number} */
DOMAgent.BackendNodeId;

/** @typedef {!{nodeType:(number), nodeName:(string), backendNodeId:(DOMAgent.BackendNodeId)}} */
DOMAgent.BackendNode;

/** @enum {string} */
DOMAgent.PseudoType = {
    FirstLine: "first-line",
    FirstLetter: "first-letter",
    Before: "before",
    After: "after",
    Backdrop: "backdrop",
    Selection: "selection",
    FirstLineInherited: "first-line-inherited",
    Scrollbar: "scrollbar",
    ScrollbarThumb: "scrollbar-thumb",
    ScrollbarButton: "scrollbar-button",
    ScrollbarTrack: "scrollbar-track",
    ScrollbarTrackPiece: "scrollbar-track-piece",
    ScrollbarCorner: "scrollbar-corner",
    Resizer: "resizer",
    InputListButton: "input-list-button"
};

/** @enum {string} */
DOMAgent.ShadowRootType = {
    UserAgent: "user-agent",
    Open: "open",
    Closed: "closed"
};

/** @typedef {!{nodeId:(DOMAgent.NodeId), nodeType:(number), nodeName:(string), localName:(string), nodeValue:(string), childNodeCount:(number|undefined), children:(!Array.<DOMAgent.Node>|undefined), attributes:(!Array.<string>|undefined), documentURL:(string|undefined), baseURL:(string|undefined), publicId:(string|undefined), systemId:(string|undefined), internalSubset:(string|undefined), xmlVersion:(string|undefined), name:(string|undefined), value:(string|undefined), pseudoType:(DOMAgent.PseudoType|undefined), shadowRootType:(DOMAgent.ShadowRootType|undefined), frameId:(PageAgent.FrameId|undefined), contentDocument:(DOMAgent.Node|undefined), shadowRoots:(!Array.<DOMAgent.Node>|undefined), templateContent:(DOMAgent.Node|undefined), pseudoElements:(!Array.<DOMAgent.Node>|undefined), importedDocument:(DOMAgent.Node|undefined), distributedNodes:(!Array.<DOMAgent.BackendNode>|undefined)}} */
DOMAgent.Node;

/** @typedef {!{r:(number), g:(number), b:(number), a:(number|undefined)}} */
DOMAgent.RGBA;

/** @typedef {!Array.<!number>} */
DOMAgent.Quad;

/** @typedef {!{content:(DOMAgent.Quad), padding:(DOMAgent.Quad), border:(DOMAgent.Quad), margin:(DOMAgent.Quad), width:(number), height:(number), shapeOutside:(DOMAgent.ShapeOutsideInfo|undefined)}} */
DOMAgent.BoxModel;

/** @typedef {!{bounds:(DOMAgent.Quad), shape:(!Array.<*>), marginShape:(!Array.<*>)}} */
DOMAgent.ShapeOutsideInfo;

/** @typedef {!{x:(number), y:(number), width:(number), height:(number)}} */
DOMAgent.Rect;

/** @typedef {!{showInfo:(boolean|undefined), showRulers:(boolean|undefined), showExtensionLines:(boolean|undefined), displayAsMaterial:(boolean|undefined), contentColor:(DOMAgent.RGBA|undefined), paddingColor:(DOMAgent.RGBA|undefined), borderColor:(DOMAgent.RGBA|undefined), marginColor:(DOMAgent.RGBA|undefined), eventTargetColor:(DOMAgent.RGBA|undefined), shapeColor:(DOMAgent.RGBA|undefined), shapeMarginColor:(DOMAgent.RGBA|undefined), selectorList:(string|undefined)}} */
DOMAgent.HighlightConfig;

/** @enum {string} */
DOMAgent.InspectMode = {
    SearchForNode: "searchForNode",
    SearchForUAShadowDOM: "searchForUAShadowDOM",
    ShowLayoutEditor: "showLayoutEditor",
    None: "none"
};
/** @interface */
DOMAgent.Dispatcher = function() {};
DOMAgent.Dispatcher.prototype.documentUpdated = function() {};
/**
 * @param {DOMAgent.BackendNodeId} backendNodeId
 */
DOMAgent.Dispatcher.prototype.inspectNodeRequested = function(backendNodeId) {};
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
 * @param {DOMAgent.NodeId} parentId
 * @param {DOMAgent.Node} pseudoElement
 */
DOMAgent.Dispatcher.prototype.pseudoElementAdded = function(parentId, pseudoElement) {};
/**
 * @param {DOMAgent.NodeId} parentId
 * @param {DOMAgent.NodeId} pseudoElementId
 */
DOMAgent.Dispatcher.prototype.pseudoElementRemoved = function(parentId, pseudoElementId) {};
/**
 * @param {DOMAgent.NodeId} insertionPointId
 * @param {!Array.<DOMAgent.BackendNode>} distributedNodes
 */
DOMAgent.Dispatcher.prototype.distributedNodesUpdated = function(insertionPointId, distributedNodes) {};
/**
 * @param {DOMAgent.NodeId} nodeId
 */
DOMAgent.Dispatcher.prototype.nodeHighlightRequested = function(nodeId) {};


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
 * @param {function(?Protocol.Error, CSSAgent.CSSStyle=, CSSAgent.CSSStyle=, !Array.<CSSAgent.RuleMatch>=, !Array.<CSSAgent.PseudoElementMatches>=, !Array.<CSSAgent.InheritedStyleEntry>=, !Array.<CSSAgent.CSSKeyframesRule>=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getMatchedStylesForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSStyle=, CSSAgent.CSSStyle=, !Array.<CSSAgent.RuleMatch>=, !Array.<CSSAgent.PseudoElementMatches>=, !Array.<CSSAgent.InheritedStyleEntry>=, !Array.<CSSAgent.CSSKeyframesRule>=):void=} opt_callback */
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
 * @param {function(?Protocol.Error, !Array.<CSSAgent.PlatformFontUsage>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getPlatformFontsForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.PlatformFontUsage>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getPlatformFontsForNode = function(obj, opt_callback) {}

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
 * @param {function(?Protocol.Error, string=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleSheetText = function(styleSheetId, text, opt_callback) {}
/** @param {function(?Protocol.Error, string=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleSheetText = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {CSSAgent.SourceRange} range
 * @param {string} selector
 * @param {function(?Protocol.Error, CSSAgent.SelectorList):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setRuleSelector = function(styleSheetId, range, selector, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.SelectorList):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setRuleSelector = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {CSSAgent.SourceRange} range
 * @param {string} keyText
 * @param {function(?Protocol.Error, CSSAgent.Value):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setKeyframeKey = function(styleSheetId, range, keyText, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.Value):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setKeyframeKey = function(obj, opt_callback) {}

/**
 * @param {!Array.<CSSAgent.StyleDeclarationEdit>} edits
 * @param {function(?Protocol.Error, !Array.<CSSAgent.CSSStyle>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleTexts = function(edits, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.CSSStyle>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleTexts = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {CSSAgent.SourceRange} range
 * @param {string} text
 * @param {function(?Protocol.Error, CSSAgent.CSSMedia):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setMediaText = function(styleSheetId, range, text, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSMedia):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setMediaText = function(obj, opt_callback) {}

/**
 * @param {PageAgent.FrameId} frameId
 * @param {function(?Protocol.Error, CSSAgent.StyleSheetId):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.createStyleSheet = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.StyleSheetId):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_createStyleSheet = function(obj, opt_callback) {}

/**
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {string} ruleText
 * @param {CSSAgent.SourceRange} location
 * @param {function(?Protocol.Error, CSSAgent.CSSRule):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.addRule = function(styleSheetId, ruleText, location, opt_callback) {}
/** @param {function(?Protocol.Error, CSSAgent.CSSRule):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_addRule = function(obj, opt_callback) {}

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
 * @param {function(?Protocol.Error, !Array.<CSSAgent.CSSMedia>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getMediaQueries = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<CSSAgent.CSSMedia>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getMediaQueries = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {string} propertyName
 * @param {string} value
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setEffectivePropertyValueForNode = function(nodeId, propertyName, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setEffectivePropertyValueForNode = function(obj, opt_callback) {}

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array.<string>=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getBackgroundColors = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getBackgroundColors = function(obj, opt_callback) {}



var CSSAgent = function(){};

/** @typedef {string} */
CSSAgent.StyleSheetId;

/** @enum {string} */
CSSAgent.StyleSheetOrigin = {
    Injected: "injected",
    UserAgent: "user-agent",
    Inspector: "inspector",
    Regular: "regular"
};

/** @typedef {!{pseudoType:(DOMAgent.PseudoType), matches:(!Array.<CSSAgent.RuleMatch>)}} */
CSSAgent.PseudoElementMatches;

/** @typedef {!{inlineStyle:(CSSAgent.CSSStyle|undefined), matchedCSSRules:(!Array.<CSSAgent.RuleMatch>)}} */
CSSAgent.InheritedStyleEntry;

/** @typedef {!{rule:(CSSAgent.CSSRule), matchingSelectors:(!Array.<number>)}} */
CSSAgent.RuleMatch;

/** @typedef {!{text:(string), range:(CSSAgent.SourceRange|undefined)}} */
CSSAgent.Value;

/** @typedef {!{selectors:(!Array.<CSSAgent.Value>), text:(string)}} */
CSSAgent.SelectorList;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), frameId:(PageAgent.FrameId), sourceURL:(string), sourceMapURL:(string|undefined), origin:(CSSAgent.StyleSheetOrigin), title:(string), ownerNode:(DOMAgent.BackendNodeId|undefined), disabled:(boolean), hasSourceURL:(boolean|undefined), isInline:(boolean), startLine:(number), startColumn:(number)}} */
CSSAgent.CSSStyleSheetHeader;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId|undefined), selectorList:(CSSAgent.SelectorList), origin:(CSSAgent.StyleSheetOrigin), style:(CSSAgent.CSSStyle), media:(!Array.<CSSAgent.CSSMedia>|undefined)}} */
CSSAgent.CSSRule;

/** @typedef {!{startLine:(number), startColumn:(number), endLine:(number), endColumn:(number)}} */
CSSAgent.SourceRange;

/** @typedef {!{name:(string), value:(string), important:(boolean|undefined)}} */
CSSAgent.ShorthandEntry;

/** @typedef {!{name:(string), value:(string)}} */
CSSAgent.CSSComputedStyleProperty;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId|undefined), cssProperties:(!Array.<CSSAgent.CSSProperty>), shorthandEntries:(!Array.<CSSAgent.ShorthandEntry>), cssText:(string|undefined), range:(CSSAgent.SourceRange|undefined)}} */
CSSAgent.CSSStyle;

/** @typedef {!{name:(string), value:(string), important:(boolean|undefined), implicit:(boolean|undefined), text:(string|undefined), parsedOk:(boolean|undefined), disabled:(boolean|undefined), range:(CSSAgent.SourceRange|undefined)}} */
CSSAgent.CSSProperty;

/** @enum {string} */
CSSAgent.CSSMediaSource = {
    MediaRule: "mediaRule",
    ImportRule: "importRule",
    LinkedSheet: "linkedSheet",
    InlineSheet: "inlineSheet"
};

/** @typedef {!{text:(string), source:(CSSAgent.CSSMediaSource), sourceURL:(string|undefined), range:(CSSAgent.SourceRange|undefined), styleSheetId:(CSSAgent.StyleSheetId|undefined), mediaList:(!Array.<CSSAgent.MediaQuery>|undefined)}} */
CSSAgent.CSSMedia;

/** @typedef {!{expressions:(!Array.<CSSAgent.MediaQueryExpression>), active:(boolean)}} */
CSSAgent.MediaQuery;

/** @typedef {!{value:(number), unit:(string), feature:(string), valueRange:(CSSAgent.SourceRange|undefined), computedLength:(number|undefined)}} */
CSSAgent.MediaQueryExpression;

/** @typedef {!{familyName:(string), isCustomFont:(boolean), glyphCount:(number)}} */
CSSAgent.PlatformFontUsage;

/** @typedef {!{animationName:(CSSAgent.Value), keyframes:(!Array.<CSSAgent.CSSKeyframeRule>)}} */
CSSAgent.CSSKeyframesRule;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId|undefined), origin:(CSSAgent.StyleSheetOrigin), keyText:(CSSAgent.Value), style:(CSSAgent.CSSStyle)}} */
CSSAgent.CSSKeyframeRule;

/** @typedef {!{styleSheetId:(CSSAgent.StyleSheetId), range:(CSSAgent.SourceRange), text:(string)}} */
CSSAgent.StyleDeclarationEdit;
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
 * @param {CSSAgent.StyleSheetId} styleSheetId
 * @param {CSSAgent.SourceRange} changeRange
 */
CSSAgent.Dispatcher.prototype.layoutEditorChange = function(styleSheetId, changeRange) {};


/**
 * @constructor
*/
Protocol.IOAgent = function(){};

/**
 * @param {IOAgent.StreamHandle} handle
 * @param {number=} opt_offset
 * @param {number=} opt_size
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.IOAgent.prototype.read = function(handle, opt_offset, opt_size, opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.IOAgent.prototype.invoke_read = function(obj, opt_callback) {}

/**
 * @param {IOAgent.StreamHandle} handle
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.IOAgent.prototype.close = function(handle, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.IOAgent.prototype.invoke_close = function(obj, opt_callback) {}



var IOAgent = function(){};

/** @typedef {string} */
IOAgent.StreamHandle;
/** @interface */
IOAgent.Dispatcher = function() {};


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
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setSkipAllPauses = function(skipped, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setSkipAllPauses = function(obj, opt_callback) {}

/**
 * @param {number} lineNumber
 * @param {string=} opt_url
 * @param {string=} opt_urlRegex
 * @param {number=} opt_columnNumber
 * @param {string=} opt_condition
 * @param {function(?Protocol.Error, DebuggerAgent.BreakpointId, !Array.<DebuggerAgent.Location>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpointByUrl = function(lineNumber, opt_url, opt_urlRegex, opt_columnNumber, opt_condition, opt_callback) {}
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
 * @param {RuntimeAgent.ScriptId} scriptId
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
 * @param {RuntimeAgent.ScriptId} scriptId
 * @param {string} scriptSource
 * @param {boolean=} opt_preview
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>=, boolean=, RuntimeAgent.StackTrace=, DebuggerAgent.SetScriptSourceError=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setScriptSource = function(scriptId, scriptSource, opt_preview, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>=, boolean=, RuntimeAgent.StackTrace=, DebuggerAgent.SetScriptSourceError=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setScriptSource = function(obj, opt_callback) {}

/**
 * @param {DebuggerAgent.CallFrameId} callFrameId
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, RuntimeAgent.StackTrace=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.restartFrame = function(callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, RuntimeAgent.StackTrace=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_restartFrame = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.ScriptId} scriptId
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
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, DebuggerAgent.GeneratorObjectDetails):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getGeneratorObjectDetails = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, DebuggerAgent.GeneratorObjectDetails):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getGeneratorObjectDetails = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CollectionEntry>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getCollectionEntries = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CollectionEntry>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getCollectionEntries = function(obj, opt_callback) {}

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
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=, RuntimeAgent.ExceptionDetails=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.evaluateOnCallFrame = function(callFrameId, expression, opt_objectGroup, opt_includeCommandLineAPI, opt_doNotPauseOnExceptionsAndMuteConsole, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject, boolean=, RuntimeAgent.ExceptionDetails=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_evaluateOnCallFrame = function(obj, opt_callback) {}

/**
 * @param {number} scopeNumber
 * @param {string} variableName
 * @param {RuntimeAgent.CallArgument} newValue
 * @param {DebuggerAgent.CallFrameId} callFrameId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setVariableValue = function(scopeNumber, variableName, newValue, callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setVariableValue = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, RuntimeAgent.StackTrace=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getBacktrace = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DebuggerAgent.CallFrame>, RuntimeAgent.StackTrace=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getBacktrace = function(obj, opt_callback) {}

/**
 * @param {number} maxDepth
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setAsyncCallStackDepth = function(maxDepth, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setAsyncCallStackDepth = function(obj, opt_callback) {}

/**
 * @param {!Array.<string>} patterns
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBlackboxPatterns = function(patterns, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBlackboxPatterns = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.ScriptId} scriptId
 * @param {!Array.<DebuggerAgent.ScriptPosition>} positions
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBlackboxedRanges = function(scriptId, positions, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBlackboxedRanges = function(obj, opt_callback) {}



var DebuggerAgent = function(){};

/** @typedef {string} */
DebuggerAgent.BreakpointId;

/** @typedef {string} */
DebuggerAgent.CallFrameId;

/** @typedef {!{scriptId:(RuntimeAgent.ScriptId), lineNumber:(number), columnNumber:(number|undefined)}} */
DebuggerAgent.Location;

/** @typedef {!{line:(number), column:(number)}} */
DebuggerAgent.ScriptPosition;

/** @typedef {!{location:(DebuggerAgent.Location|undefined), functionName:(string), isGenerator:(boolean), scopeChain:(!Array.<DebuggerAgent.Scope>|undefined)}} */
DebuggerAgent.FunctionDetails;

/** @enum {string} */
DebuggerAgent.GeneratorObjectDetailsStatus = {
    Running: "running",
    Suspended: "suspended",
    Closed: "closed"
};

/** @typedef {!{function:(RuntimeAgent.RemoteObject), functionName:(string), status:(DebuggerAgent.GeneratorObjectDetailsStatus), location:(DebuggerAgent.Location|undefined)}} */
DebuggerAgent.GeneratorObjectDetails;

/** @typedef {!{key:(RuntimeAgent.RemoteObject|undefined), value:(RuntimeAgent.RemoteObject)}} */
DebuggerAgent.CollectionEntry;

/** @typedef {!{callFrameId:(DebuggerAgent.CallFrameId), functionName:(string), functionLocation:(DebuggerAgent.Location|undefined), location:(DebuggerAgent.Location), scopeChain:(!Array.<DebuggerAgent.Scope>), this:(RuntimeAgent.RemoteObject), returnValue:(RuntimeAgent.RemoteObject|undefined)}} */
DebuggerAgent.CallFrame;

/** @enum {string} */
DebuggerAgent.ScopeType = {
    Global: "global",
    Local: "local",
    With: "with",
    Closure: "closure",
    Catch: "catch",
    Block: "block",
    Script: "script"
};

/** @typedef {!{type:(DebuggerAgent.ScopeType), object:(RuntimeAgent.RemoteObject), name:(string|undefined), startLocation:(DebuggerAgent.Location|undefined), endLocation:(DebuggerAgent.Location|undefined)}} */
DebuggerAgent.Scope;

/** @typedef {!{message:(string), lineNumber:(number), columnNumber:(number)}} */
DebuggerAgent.SetScriptSourceError;

/** @typedef {!{lineNumber:(number), lineContent:(string)}} */
DebuggerAgent.SearchMatch;
/** @interface */
DebuggerAgent.Dispatcher = function() {};
/**
 * @param {RuntimeAgent.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {RuntimeAgent.ExecutionContextId} executionContextId
 * @param {string} hash
 * @param {boolean=} opt_isContentScript
 * @param {boolean=} opt_isInternalScript
 * @param {boolean=} opt_isLiveEdit
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 * @param {boolean=} opt_deprecatedCommentWasUsed
 */
DebuggerAgent.Dispatcher.prototype.scriptParsed = function(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, opt_isContentScript, opt_isInternalScript, opt_isLiveEdit, opt_sourceMapURL, opt_hasSourceURL, opt_deprecatedCommentWasUsed) {};
/**
 * @param {RuntimeAgent.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {RuntimeAgent.ExecutionContextId} executionContextId
 * @param {string} hash
 * @param {boolean=} opt_isContentScript
 * @param {boolean=} opt_isInternalScript
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 * @param {boolean=} opt_deprecatedCommentWasUsed
 */
DebuggerAgent.Dispatcher.prototype.scriptFailedToParse = function(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, opt_isContentScript, opt_isInternalScript, opt_sourceMapURL, opt_hasSourceURL, opt_deprecatedCommentWasUsed) {};
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
 * @param {RuntimeAgent.StackTrace=} opt_asyncStackTrace
 */
DebuggerAgent.Dispatcher.prototype.paused = function(callFrames, reason, opt_data, opt_hitBreakpoints, opt_asyncStackTrace) {};
DebuggerAgent.Dispatcher.prototype.resumed = function() {};


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
 * @param {string=} opt_targetName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setEventListenerBreakpoint = function(eventName, opt_targetName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setEventListenerBreakpoint = function(obj, opt_callback) {}

/**
 * @param {string} eventName
 * @param {string=} opt_targetName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.removeEventListenerBreakpoint = function(eventName, opt_targetName, opt_callback) {}
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

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, !Array.<DOMDebuggerAgent.EventListener>):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.getEventListeners = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<DOMDebuggerAgent.EventListener>):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_getEventListeners = function(obj, opt_callback) {}



var DOMDebuggerAgent = function(){};

/** @enum {string} */
DOMDebuggerAgent.DOMBreakpointType = {
    SubtreeModified: "subtree-modified",
    AttributeModified: "attribute-modified",
    NodeRemoved: "node-removed"
};

/** @typedef {!{type:(string), useCapture:(boolean), passive:(boolean), location:(DebuggerAgent.Location), handler:(RuntimeAgent.RemoteObject|undefined), originalHandler:(RuntimeAgent.RemoteObject|undefined), removeFunction:(RuntimeAgent.RemoteObject|undefined)}} */
DOMDebuggerAgent.EventListener;
/** @interface */
DOMDebuggerAgent.Dispatcher = function() {};


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
 * @param {number} interval
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.setSamplingInterval = function(interval, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_setSamplingInterval = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.start = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_start = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, ProfilerAgent.CPUProfile):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.stop = function(opt_callback) {}
/** @param {function(?Protocol.Error, ProfilerAgent.CPUProfile):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_stop = function(obj, opt_callback) {}



var ProfilerAgent = function(){};

/** @typedef {!{functionName:(string), scriptId:(RuntimeAgent.ScriptId), url:(string), lineNumber:(number), columnNumber:(number), hitCount:(number), callUID:(number), children:(!Array.<ProfilerAgent.CPUProfileNode>), deoptReason:(string), id:(number), positionTicks:(!Array.<ProfilerAgent.PositionTickInfo>)}} */
ProfilerAgent.CPUProfileNode;

/** @typedef {!{head:(ProfilerAgent.CPUProfileNode), startTime:(number), endTime:(number), samples:(!Array.<number>|undefined), timestamps:(!Array.<number>|undefined)}} */
ProfilerAgent.CPUProfile;

/** @typedef {!{line:(number), ticks:(number)}} */
ProfilerAgent.PositionTickInfo;
/** @interface */
ProfilerAgent.Dispatcher = function() {};
/**
 * @param {string} id
 * @param {DebuggerAgent.Location} location
 * @param {string=} opt_title
 */
ProfilerAgent.Dispatcher.prototype.consoleProfileStarted = function(id, location, opt_title) {};
/**
 * @param {string} id
 * @param {DebuggerAgent.Location} location
 * @param {ProfilerAgent.CPUProfile} profile
 * @param {string=} opt_title
 */
ProfilerAgent.Dispatcher.prototype.consoleProfileFinished = function(id, location, profile, opt_title) {};


/**
 * @constructor
*/
Protocol.HeapProfilerAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_trackAllocations
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.startTrackingHeapObjects = function(opt_trackAllocations, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_startTrackingHeapObjects = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_reportProgress
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.stopTrackingHeapObjects = function(opt_reportProgress, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_stopTrackingHeapObjects = function(obj, opt_callback) {}

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
 * @param {HeapProfilerAgent.HeapSnapshotObjectId} heapObjectId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.addInspectedHeapObject = function(heapObjectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_addInspectedHeapObject = function(obj, opt_callback) {}

/**
 * @param {RuntimeAgent.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, HeapProfilerAgent.HeapSnapshotObjectId):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.getHeapObjectId = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, HeapProfilerAgent.HeapSnapshotObjectId):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getHeapObjectId = function(obj, opt_callback) {}

/**
 * @param {number=} opt_samplingInterval
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.startSampling = function(opt_samplingInterval, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_startSampling = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, HeapProfilerAgent.SamplingHeapProfile):void=} opt_callback
 */
Protocol.HeapProfilerAgent.prototype.stopSampling = function(opt_callback) {}
/** @param {function(?Protocol.Error, HeapProfilerAgent.SamplingHeapProfile):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_stopSampling = function(obj, opt_callback) {}



var HeapProfilerAgent = function(){};

/** @typedef {string} */
HeapProfilerAgent.HeapSnapshotObjectId;

/** @typedef {!{functionName:(string), scriptId:(RuntimeAgent.ScriptId), url:(string), lineNumber:(number), columnNumber:(number), selfSize:(number), children:(!Array.<HeapProfilerAgent.SamplingHeapProfileNode>)}} */
HeapProfilerAgent.SamplingHeapProfileNode;

/** @typedef {!{head:(HeapProfilerAgent.SamplingHeapProfileNode)}} */
HeapProfilerAgent.SamplingHeapProfile;
/** @interface */
HeapProfilerAgent.Dispatcher = function() {};
/**
 * @param {string} chunk
 */
HeapProfilerAgent.Dispatcher.prototype.addHeapSnapshotChunk = function(chunk) {};
HeapProfilerAgent.Dispatcher.prototype.resetProfiles = function() {};
/**
 * @param {number} done
 * @param {number} total
 * @param {boolean=} opt_finished
 */
HeapProfilerAgent.Dispatcher.prototype.reportHeapSnapshotProgress = function(done, total, opt_finished) {};
/**
 * @param {number} lastSeenObjectId
 * @param {number} timestamp
 */
HeapProfilerAgent.Dispatcher.prototype.lastSeenObjectId = function(lastSeenObjectId, timestamp) {};
/**
 * @param {!Array.<number>} statsUpdate
 */
HeapProfilerAgent.Dispatcher.prototype.heapStatsUpdate = function(statsUpdate) {};


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
 * @param {string} workerId
 * @param {string} message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.sendMessageToWorker = function(workerId, message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_sendMessageToWorker = function(obj, opt_callback) {}

/**
 * @param {boolean} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.WorkerAgent.prototype.setWaitForDebuggerOnStart = function(value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.WorkerAgent.prototype.invoke_setWaitForDebuggerOnStart = function(obj, opt_callback) {}



var WorkerAgent = function(){};
/** @interface */
WorkerAgent.Dispatcher = function() {};
/**
 * @param {string} workerId
 * @param {string} url
 * @param {boolean} waitingForDebugger
 */
WorkerAgent.Dispatcher.prototype.workerCreated = function(workerId, url, waitingForDebugger) {};
/**
 * @param {string} workerId
 */
WorkerAgent.Dispatcher.prototype.workerTerminated = function(workerId) {};
/**
 * @param {string} workerId
 * @param {string} message
 */
WorkerAgent.Dispatcher.prototype.dispatchMessageFromWorker = function(workerId, message) {};


/**
 * @constructor
*/
Protocol.ServiceWorkerAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {string} workerId
 * @param {string} message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.sendMessage = function(workerId, message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_sendMessage = function(obj, opt_callback) {}

/**
 * @param {string} workerId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.stop = function(workerId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_stop = function(obj, opt_callback) {}

/**
 * @param {string} scopeURL
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.unregister = function(scopeURL, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_unregister = function(obj, opt_callback) {}

/**
 * @param {string} scopeURL
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.updateRegistration = function(scopeURL, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_updateRegistration = function(obj, opt_callback) {}

/**
 * @param {string} scopeURL
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.startWorker = function(scopeURL, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_startWorker = function(obj, opt_callback) {}

/**
 * @param {string} scopeURL
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.skipWaiting = function(scopeURL, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_skipWaiting = function(obj, opt_callback) {}

/**
 * @param {string} versionId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.stopWorker = function(versionId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_stopWorker = function(obj, opt_callback) {}

/**
 * @param {string} versionId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.inspectWorker = function(versionId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_inspectWorker = function(obj, opt_callback) {}

/**
 * @param {boolean} forceUpdateOnPageLoad
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.setForceUpdateOnPageLoad = function(forceUpdateOnPageLoad, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_setForceUpdateOnPageLoad = function(obj, opt_callback) {}

/**
 * @param {string} origin
 * @param {string} registrationId
 * @param {string} data
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.deliverPushMessage = function(origin, registrationId, data, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_deliverPushMessage = function(obj, opt_callback) {}

/**
 * @param {string} origin
 * @param {string} registrationId
 * @param {string} tag
 * @param {boolean} lastChance
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.dispatchSyncEvent = function(origin, registrationId, tag, lastChance, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_dispatchSyncEvent = function(obj, opt_callback) {}

/**
 * @param {ServiceWorkerAgent.TargetID} targetId
 * @param {function(?Protocol.Error, ServiceWorkerAgent.TargetInfo):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.getTargetInfo = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error, ServiceWorkerAgent.TargetInfo):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_getTargetInfo = function(obj, opt_callback) {}

/**
 * @param {ServiceWorkerAgent.TargetID} targetId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ServiceWorkerAgent.prototype.activateTarget = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ServiceWorkerAgent.prototype.invoke_activateTarget = function(obj, opt_callback) {}



var ServiceWorkerAgent = function(){};

/** @typedef {!{registrationId:(string), scopeURL:(string), isDeleted:(boolean)}} */
ServiceWorkerAgent.ServiceWorkerRegistration;

/** @enum {string} */
ServiceWorkerAgent.ServiceWorkerVersionRunningStatus = {
    Stopped: "stopped",
    Starting: "starting",
    Running: "running",
    Stopping: "stopping"
};

/** @enum {string} */
ServiceWorkerAgent.ServiceWorkerVersionStatus = {
    New: "new",
    Installing: "installing",
    Installed: "installed",
    Activating: "activating",
    Activated: "activated",
    Redundant: "redundant"
};

/** @typedef {string} */
ServiceWorkerAgent.TargetID;

/** @typedef {!{versionId:(string), registrationId:(string), scriptURL:(string), runningStatus:(ServiceWorkerAgent.ServiceWorkerVersionRunningStatus), status:(ServiceWorkerAgent.ServiceWorkerVersionStatus), scriptLastModified:(number|undefined), scriptResponseTime:(number|undefined), controlledClients:(!Array.<ServiceWorkerAgent.TargetID>|undefined)}} */
ServiceWorkerAgent.ServiceWorkerVersion;

/** @typedef {!{errorMessage:(string), registrationId:(string), versionId:(string), sourceURL:(string), lineNumber:(number), columnNumber:(number)}} */
ServiceWorkerAgent.ServiceWorkerErrorMessage;

/** @typedef {!{id:(ServiceWorkerAgent.TargetID), type:(string), title:(string), url:(string)}} */
ServiceWorkerAgent.TargetInfo;
/** @interface */
ServiceWorkerAgent.Dispatcher = function() {};
/**
 * @param {string} workerId
 * @param {string} url
 * @param {string} versionId
 */
ServiceWorkerAgent.Dispatcher.prototype.workerCreated = function(workerId, url, versionId) {};
/**
 * @param {string} workerId
 */
ServiceWorkerAgent.Dispatcher.prototype.workerTerminated = function(workerId) {};
/**
 * @param {string} workerId
 * @param {string} message
 */
ServiceWorkerAgent.Dispatcher.prototype.dispatchMessage = function(workerId, message) {};
/**
 * @param {!Array.<ServiceWorkerAgent.ServiceWorkerRegistration>} registrations
 */
ServiceWorkerAgent.Dispatcher.prototype.workerRegistrationUpdated = function(registrations) {};
/**
 * @param {!Array.<ServiceWorkerAgent.ServiceWorkerVersion>} versions
 */
ServiceWorkerAgent.Dispatcher.prototype.workerVersionUpdated = function(versions) {};
/**
 * @param {ServiceWorkerAgent.ServiceWorkerErrorMessage} errorMessage
 */
ServiceWorkerAgent.Dispatcher.prototype.workerErrorReported = function(errorMessage) {};


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
 * @param {string=} opt_code
 * @param {string=} opt_key
 * @param {number=} opt_windowsVirtualKeyCode
 * @param {number=} opt_nativeVirtualKeyCode
 * @param {boolean=} opt_autoRepeat
 * @param {boolean=} opt_isKeypad
 * @param {boolean=} opt_isSystemKey
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchKeyEvent = function(type, opt_modifiers, opt_timestamp, opt_text, opt_unmodifiedText, opt_keyIdentifier, opt_code, opt_key, opt_windowsVirtualKeyCode, opt_nativeVirtualKeyCode, opt_autoRepeat, opt_isKeypad, opt_isSystemKey, opt_callback) {}
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
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.dispatchMouseEvent = function(type, x, y, opt_modifiers, opt_timestamp, opt_button, opt_clickCount, opt_callback) {}
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
 * @param {number} timestamp
 * @param {string} button
 * @param {number=} opt_deltaX
 * @param {number=} opt_deltaY
 * @param {number=} opt_modifiers
 * @param {number=} opt_clickCount
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.emulateTouchFromMouseEvent = function(type, x, y, timestamp, button, opt_deltaX, opt_deltaY, opt_modifiers, opt_clickCount, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_emulateTouchFromMouseEvent = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} scaleFactor
 * @param {number=} opt_relativeSpeed
 * @param {InputAgent.GestureSourceType=} opt_gestureSourceType
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.synthesizePinchGesture = function(x, y, scaleFactor, opt_relativeSpeed, opt_gestureSourceType, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_synthesizePinchGesture = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {number=} opt_xDistance
 * @param {number=} opt_yDistance
 * @param {number=} opt_xOverscroll
 * @param {number=} opt_yOverscroll
 * @param {boolean=} opt_preventFling
 * @param {number=} opt_speed
 * @param {InputAgent.GestureSourceType=} opt_gestureSourceType
 * @param {number=} opt_repeatCount
 * @param {number=} opt_repeatDelayMs
 * @param {string=} opt_interactionMarkerName
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.synthesizeScrollGesture = function(x, y, opt_xDistance, opt_yDistance, opt_xOverscroll, opt_yOverscroll, opt_preventFling, opt_speed, opt_gestureSourceType, opt_repeatCount, opt_repeatDelayMs, opt_interactionMarkerName, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_synthesizeScrollGesture = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {number=} opt_duration
 * @param {number=} opt_tapCount
 * @param {InputAgent.GestureSourceType=} opt_gestureSourceType
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.synthesizeTapGesture = function(x, y, opt_duration, opt_tapCount, opt_gestureSourceType, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_synthesizeTapGesture = function(obj, opt_callback) {}



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

/** @enum {string} */
InputAgent.GestureSourceType = {
    Default: "default",
    Touch: "touch",
    Mouse: "mouse"
};
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
 * @param {LayerTreeAgent.LayerId} layerId
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.compositingReasons = function(layerId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_compositingReasons = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.LayerId} layerId
 * @param {function(?Protocol.Error, LayerTreeAgent.SnapshotId):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.makeSnapshot = function(layerId, opt_callback) {}
/** @param {function(?Protocol.Error, LayerTreeAgent.SnapshotId):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_makeSnapshot = function(obj, opt_callback) {}

/**
 * @param {!Array.<LayerTreeAgent.PictureTile>} tiles
 * @param {function(?Protocol.Error, LayerTreeAgent.SnapshotId):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.loadSnapshot = function(tiles, opt_callback) {}
/** @param {function(?Protocol.Error, LayerTreeAgent.SnapshotId):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_loadSnapshot = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.SnapshotId} snapshotId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.releaseSnapshot = function(snapshotId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_releaseSnapshot = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.SnapshotId} snapshotId
 * @param {number=} opt_minRepeatCount
 * @param {number=} opt_minDuration
 * @param {DOMAgent.Rect=} opt_clipRect
 * @param {function(?Protocol.Error, !Array.<LayerTreeAgent.PaintProfile>):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.profileSnapshot = function(snapshotId, opt_minRepeatCount, opt_minDuration, opt_clipRect, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<LayerTreeAgent.PaintProfile>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_profileSnapshot = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.SnapshotId} snapshotId
 * @param {number=} opt_fromStep
 * @param {number=} opt_toStep
 * @param {number=} opt_scale
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.replaySnapshot = function(snapshotId, opt_fromStep, opt_toStep, opt_scale, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_replaySnapshot = function(obj, opt_callback) {}

/**
 * @param {LayerTreeAgent.SnapshotId} snapshotId
 * @param {function(?Protocol.Error, !Array.<!Object>):void=} opt_callback
 */
Protocol.LayerTreeAgent.prototype.snapshotCommandLog = function(snapshotId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<!Object>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_snapshotCommandLog = function(obj, opt_callback) {}



var LayerTreeAgent = function(){};

/** @typedef {string} */
LayerTreeAgent.LayerId;

/** @typedef {string} */
LayerTreeAgent.SnapshotId;

/** @enum {string} */
LayerTreeAgent.ScrollRectType = {
    RepaintsOnScroll: "RepaintsOnScroll",
    TouchEventHandler: "TouchEventHandler",
    WheelEventHandler: "WheelEventHandler"
};

/** @typedef {!{rect:(DOMAgent.Rect), type:(LayerTreeAgent.ScrollRectType)}} */
LayerTreeAgent.ScrollRect;

/** @typedef {!{x:(number), y:(number), picture:(string)}} */
LayerTreeAgent.PictureTile;

/** @typedef {!{layerId:(LayerTreeAgent.LayerId), parentLayerId:(LayerTreeAgent.LayerId|undefined), backendNodeId:(DOMAgent.BackendNodeId|undefined), offsetX:(number), offsetY:(number), width:(number), height:(number), transform:(!Array.<number>|undefined), anchorX:(number|undefined), anchorY:(number|undefined), anchorZ:(number|undefined), paintCount:(number), drawsContent:(boolean), invisible:(boolean|undefined), scrollRects:(!Array.<LayerTreeAgent.ScrollRect>|undefined)}} */
LayerTreeAgent.Layer;

/** @typedef {!Array.<!number>} */
LayerTreeAgent.PaintProfile;
/** @interface */
LayerTreeAgent.Dispatcher = function() {};
/**
 * @param {!Array.<LayerTreeAgent.Layer>=} opt_layers
 */
LayerTreeAgent.Dispatcher.prototype.layerTreeDidChange = function(opt_layers) {};
/**
 * @param {LayerTreeAgent.LayerId} layerId
 * @param {DOMAgent.Rect} clip
 */
LayerTreeAgent.Dispatcher.prototype.layerPainted = function(layerId, clip) {};


/**
 * @constructor
*/
Protocol.DeviceOrientationAgent = function(){};

/**
 * @param {number} alpha
 * @param {number} beta
 * @param {number} gamma
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DeviceOrientationAgent.prototype.setDeviceOrientationOverride = function(alpha, beta, gamma, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DeviceOrientationAgent.prototype.invoke_setDeviceOrientationOverride = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DeviceOrientationAgent.prototype.clearDeviceOrientationOverride = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DeviceOrientationAgent.prototype.invoke_clearDeviceOrientationOverride = function(obj, opt_callback) {}



var DeviceOrientationAgent = function(){};
/** @interface */
DeviceOrientationAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.TracingAgent = function(){};

/**
 * @param {string=} opt_categories
 * @param {string=} opt_options
 * @param {number=} opt_bufferUsageReportingInterval
 * @param {string=} opt_transferMode
 * @param {TracingAgent.TraceConfig=} opt_traceConfig
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TracingAgent.prototype.start = function(opt_categories, opt_options, opt_bufferUsageReportingInterval, opt_transferMode, opt_traceConfig, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_start = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TracingAgent.prototype.end = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_end = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback
 */
Protocol.TracingAgent.prototype.getCategories = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array.<string>):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_getCategories = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.TracingAgent.prototype.requestMemoryDump = function(opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_requestMemoryDump = function(obj, opt_callback) {}

/**
 * @param {string} syncId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TracingAgent.prototype.recordClockSyncMarker = function(syncId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TracingAgent.prototype.invoke_recordClockSyncMarker = function(obj, opt_callback) {}



var TracingAgent = function(){};

/** @typedef {!Object} */
TracingAgent.MemoryDumpConfig;

/** @enum {string} */
TracingAgent.TraceConfigRecordMode = {
    RecordUntilFull: "recordUntilFull",
    RecordContinuously: "recordContinuously",
    RecordAsMuchAsPossible: "recordAsMuchAsPossible",
    EchoToConsole: "echoToConsole"
};

/** @typedef {!{recordMode:(TracingAgent.TraceConfigRecordMode|undefined), enableSampling:(boolean|undefined), enableSystrace:(boolean|undefined), enableArgumentFilter:(boolean|undefined), includedCategories:(!Array.<string>|undefined), excludedCategories:(!Array.<string>|undefined), syntheticDelays:(!Array.<string>|undefined), memoryDumpConfig:(TracingAgent.MemoryDumpConfig|undefined)}} */
TracingAgent.TraceConfig;
/** @interface */
TracingAgent.Dispatcher = function() {};
/**
 * @param {!Array.<!Object>} value
 */
TracingAgent.Dispatcher.prototype.dataCollected = function(value) {};
/**
 * @param {IOAgent.StreamHandle=} opt_stream
 */
TracingAgent.Dispatcher.prototype.tracingComplete = function(opt_stream) {};
/**
 * @param {number=} opt_percentFull
 * @param {number=} opt_eventCount
 * @param {number=} opt_value
 */
TracingAgent.Dispatcher.prototype.bufferUsage = function(opt_percentFull, opt_eventCount, opt_value) {};


/**
 * @constructor
*/
Protocol.AnimationAgent = function(){};

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, number):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.getPlaybackRate = function(opt_callback) {}
/** @param {function(?Protocol.Error, number):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_getPlaybackRate = function(obj, opt_callback) {}

/**
 * @param {number} playbackRate
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.setPlaybackRate = function(playbackRate, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_setPlaybackRate = function(obj, opt_callback) {}

/**
 * @param {string} id
 * @param {function(?Protocol.Error, number):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.getCurrentTime = function(id, opt_callback) {}
/** @param {function(?Protocol.Error, number):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_getCurrentTime = function(obj, opt_callback) {}

/**
 * @param {!Array.<string>} animations
 * @param {boolean} paused
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.setPaused = function(animations, paused, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_setPaused = function(obj, opt_callback) {}

/**
 * @param {string} animationId
 * @param {number} duration
 * @param {number} delay
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.setTiming = function(animationId, duration, delay, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_setTiming = function(obj, opt_callback) {}

/**
 * @param {!Array.<string>} animations
 * @param {number} currentTime
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.seekAnimations = function(animations, currentTime, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_seekAnimations = function(obj, opt_callback) {}

/**
 * @param {!Array.<string>} animations
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.releaseAnimations = function(animations, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_releaseAnimations = function(obj, opt_callback) {}

/**
 * @param {string} animationId
 * @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.resolveAnimation = function(animationId, opt_callback) {}
/** @param {function(?Protocol.Error, RuntimeAgent.RemoteObject):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_resolveAnimation = function(obj, opt_callback) {}



var AnimationAgent = function(){};

/** @enum {string} */
AnimationAgent.AnimationType = {
    CSSTransition: "CSSTransition",
    CSSAnimation: "CSSAnimation",
    WebAnimation: "WebAnimation"
};

/** @typedef {!{id:(string), name:(string), pausedState:(boolean), playState:(string), playbackRate:(number), startTime:(number), currentTime:(number), source:(AnimationAgent.AnimationEffect), type:(AnimationAgent.AnimationType), cssId:(string|undefined)}} */
AnimationAgent.Animation;

/** @typedef {!{delay:(number), endDelay:(number), playbackRate:(number), iterationStart:(number), iterations:(number), duration:(number), direction:(string), fill:(string), backendNodeId:(DOMAgent.BackendNodeId), keyframesRule:(AnimationAgent.KeyframesRule|undefined), easing:(string)}} */
AnimationAgent.AnimationEffect;

/** @typedef {!{name:(string|undefined), keyframes:(!Array.<AnimationAgent.KeyframeStyle>)}} */
AnimationAgent.KeyframesRule;

/** @typedef {!{offset:(string), easing:(string)}} */
AnimationAgent.KeyframeStyle;
/** @interface */
AnimationAgent.Dispatcher = function() {};
/**
 * @param {string} id
 */
AnimationAgent.Dispatcher.prototype.animationCreated = function(id) {};
/**
 * @param {AnimationAgent.Animation} animation
 */
AnimationAgent.Dispatcher.prototype.animationStarted = function(animation) {};
/**
 * @param {string} id
 */
AnimationAgent.Dispatcher.prototype.animationCanceled = function(id) {};


/**
 * @constructor
*/
Protocol.AccessibilityAgent = function(){};

/**
 * @param {DOMAgent.NodeId} nodeId
 * @param {function(?Protocol.Error, AccessibilityAgent.AXNode=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AccessibilityAgent.prototype.getAXNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, AccessibilityAgent.AXNode=):void=} opt_callback */
Protocol.AccessibilityAgent.prototype.invoke_getAXNode = function(obj, opt_callback) {}



var AccessibilityAgent = function(){};

/** @typedef {string} */
AccessibilityAgent.AXNodeId;

/** @enum {string} */
AccessibilityAgent.AXValueType = {
    Boolean: "boolean",
    Tristate: "tristate",
    BooleanOrUndefined: "booleanOrUndefined",
    Idref: "idref",
    IdrefList: "idrefList",
    Integer: "integer",
    Node: "node",
    NodeList: "nodeList",
    Number: "number",
    String: "string",
    ComputedString: "computedString",
    Token: "token",
    TokenList: "tokenList",
    DomRelation: "domRelation",
    Role: "role",
    InternalRole: "internalRole",
    ValueUndefined: "valueUndefined"
};

/** @enum {string} */
AccessibilityAgent.AXValueSourceType = {
    Attribute: "attribute",
    Implicit: "implicit",
    Style: "style",
    Contents: "contents",
    Placeholder: "placeholder",
    RelatedElement: "relatedElement"
};

/** @enum {string} */
AccessibilityAgent.AXValueNativeSourceType = {
    Figcaption: "figcaption",
    Label: "label",
    Labelfor: "labelfor",
    Labelwrapped: "labelwrapped",
    Legend: "legend",
    Tablecaption: "tablecaption",
    Title: "title",
    Other: "other"
};

/** @typedef {!{type:(AccessibilityAgent.AXValueSourceType), value:(AccessibilityAgent.AXValue|undefined), attribute:(string|undefined), attributeValue:(AccessibilityAgent.AXValue|undefined), superseded:(boolean|undefined), nativeSource:(AccessibilityAgent.AXValueNativeSourceType|undefined), nativeSourceValue:(AccessibilityAgent.AXValue|undefined), invalid:(boolean|undefined), invalidReason:(string|undefined)}} */
AccessibilityAgent.AXValueSource;

/** @typedef {!{backendNodeId:(DOMAgent.BackendNodeId), idref:(string|undefined), text:(string|undefined)}} */
AccessibilityAgent.AXRelatedNode;

/** @typedef {!{name:(string), value:(AccessibilityAgent.AXValue)}} */
AccessibilityAgent.AXProperty;

/** @typedef {!{type:(AccessibilityAgent.AXValueType), value:(*|undefined), relatedNodes:(!Array.<AccessibilityAgent.AXRelatedNode>|undefined), sources:(!Array.<AccessibilityAgent.AXValueSource>|undefined)}} */
AccessibilityAgent.AXValue;

/** @enum {string} */
AccessibilityAgent.AXGlobalStates = {
    Disabled: "disabled",
    Hidden: "hidden",
    HiddenRoot: "hiddenRoot",
    Invalid: "invalid"
};

/** @enum {string} */
AccessibilityAgent.AXLiveRegionAttributes = {
    Live: "live",
    Atomic: "atomic",
    Relevant: "relevant",
    Busy: "busy",
    Root: "root"
};

/** @enum {string} */
AccessibilityAgent.AXWidgetAttributes = {
    Autocomplete: "autocomplete",
    Haspopup: "haspopup",
    Level: "level",
    Multiselectable: "multiselectable",
    Orientation: "orientation",
    Multiline: "multiline",
    Readonly: "readonly",
    Required: "required",
    Valuemin: "valuemin",
    Valuemax: "valuemax",
    Valuetext: "valuetext"
};

/** @enum {string} */
AccessibilityAgent.AXWidgetStates = {
    Checked: "checked",
    Expanded: "expanded",
    Pressed: "pressed",
    Selected: "selected"
};

/** @enum {string} */
AccessibilityAgent.AXRelationshipAttributes = {
    Activedescendant: "activedescendant",
    Flowto: "flowto",
    Controls: "controls",
    Describedby: "describedby",
    Labelledby: "labelledby",
    Owns: "owns"
};

/** @typedef {!{nodeId:(AccessibilityAgent.AXNodeId), ignored:(boolean), ignoredReasons:(!Array.<AccessibilityAgent.AXProperty>|undefined), role:(AccessibilityAgent.AXValue|undefined), name:(AccessibilityAgent.AXValue|undefined), description:(AccessibilityAgent.AXValue|undefined), value:(AccessibilityAgent.AXValue|undefined), properties:(!Array.<AccessibilityAgent.AXProperty>|undefined)}} */
AccessibilityAgent.AXNode;
/** @interface */
AccessibilityAgent.Dispatcher = function() {};


/**
 * @constructor
*/
Protocol.StorageAgent = function(){};

/**
 * @param {string} origin
 * @param {string} storageTypes
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.StorageAgent.prototype.clearDataForOrigin = function(origin, storageTypes, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.StorageAgent.prototype.invoke_clearDataForOrigin = function(obj, opt_callback) {}



var StorageAgent = function(){};

/** @enum {string} */
StorageAgent.StorageType = {
    Appcache: "appcache",
    Cookies: "cookies",
    File_systems: "file_systems",
    Indexeddb: "indexeddb",
    Local_storage: "local_storage",
    Shader_cache: "shader_cache",
    Websql: "websql",
    Webrtc_indetity: "webrtc_indetity",
    Service_workers: "service_workers",
    Cache_storage: "cache_storage",
    All: "all"
};
/** @interface */
StorageAgent.Dispatcher = function() {};

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
/** @return {!Protocol.RenderingAgent}*/
Protocol.Agents.prototype.renderingAgent = function(){};
/**
 * @param {!RenderingAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerRenderingDispatcher = function(dispatcher) {}
/** @return {!Protocol.EmulationAgent}*/
Protocol.Agents.prototype.emulationAgent = function(){};
/**
 * @param {!EmulationAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerEmulationDispatcher = function(dispatcher) {}
/** @return {!Protocol.RuntimeAgent}*/
Protocol.Agents.prototype.runtimeAgent = function(){};
/**
 * @param {!RuntimeAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerRuntimeDispatcher = function(dispatcher) {}
/** @return {!Protocol.ConsoleAgent}*/
Protocol.Agents.prototype.consoleAgent = function(){};
/**
 * @param {!ConsoleAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerConsoleDispatcher = function(dispatcher) {}
/** @return {!Protocol.SecurityAgent}*/
Protocol.Agents.prototype.securityAgent = function(){};
/**
 * @param {!SecurityAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerSecurityDispatcher = function(dispatcher) {}
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
/** @return {!Protocol.CacheStorageAgent}*/
Protocol.Agents.prototype.cacheStorageAgent = function(){};
/**
 * @param {!CacheStorageAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerCacheStorageDispatcher = function(dispatcher) {}
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
/** @return {!Protocol.IOAgent}*/
Protocol.Agents.prototype.ioAgent = function(){};
/**
 * @param {!IOAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerIODispatcher = function(dispatcher) {}
/** @return {!Protocol.DebuggerAgent}*/
Protocol.Agents.prototype.debuggerAgent = function(){};
/**
 * @param {!DebuggerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDebuggerDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMDebuggerAgent}*/
Protocol.Agents.prototype.domdebuggerAgent = function(){};
/**
 * @param {!DOMDebuggerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDOMDebuggerDispatcher = function(dispatcher) {}
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
/** @return {!Protocol.WorkerAgent}*/
Protocol.Agents.prototype.workerAgent = function(){};
/**
 * @param {!WorkerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerWorkerDispatcher = function(dispatcher) {}
/** @return {!Protocol.ServiceWorkerAgent}*/
Protocol.Agents.prototype.serviceWorkerAgent = function(){};
/**
 * @param {!ServiceWorkerAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerServiceWorkerDispatcher = function(dispatcher) {}
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
/** @return {!Protocol.DeviceOrientationAgent}*/
Protocol.Agents.prototype.deviceOrientationAgent = function(){};
/**
 * @param {!DeviceOrientationAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerDeviceOrientationDispatcher = function(dispatcher) {}
/** @return {!Protocol.TracingAgent}*/
Protocol.Agents.prototype.tracingAgent = function(){};
/**
 * @param {!TracingAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerTracingDispatcher = function(dispatcher) {}
/** @return {!Protocol.AnimationAgent}*/
Protocol.Agents.prototype.animationAgent = function(){};
/**
 * @param {!AnimationAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerAnimationDispatcher = function(dispatcher) {}
/** @return {!Protocol.AccessibilityAgent}*/
Protocol.Agents.prototype.accessibilityAgent = function(){};
/**
 * @param {!AccessibilityAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerAccessibilityDispatcher = function(dispatcher) {}
/** @return {!Protocol.StorageAgent}*/
Protocol.Agents.prototype.storageAgent = function(){};
/**
 * @param {!StorageAgent.Dispatcher} dispatcher
 */
Protocol.Agents.prototype.registerStorageDispatcher = function(dispatcher) {}
