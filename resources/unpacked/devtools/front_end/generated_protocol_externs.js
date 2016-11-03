Protocol.Inspector = {};


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
/** @interface */
Protocol.InspectorDispatcher = function() {};
/**
 * @param {string} reason
 */
Protocol.InspectorDispatcher.prototype.detached = function(reason) {};
Protocol.InspectorDispatcher.prototype.targetCrashed = function() {};
Protocol.Memory = {};


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
 * @param {Protocol.Memory.PressureLevel} level
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.MemoryAgent.prototype.simulatePressureNotification = function(level, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.MemoryAgent.prototype.invoke_simulatePressureNotification = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Memory.PressureLevel = {
    Moderate: "moderate",
    Critical: "critical"
};
/** @interface */
Protocol.MemoryDispatcher = function() {};
Protocol.Page = {};


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
 * @param {function(?Protocol.Error, Protocol.Page.ScriptIdentifier):void=} opt_callback
 */
Protocol.PageAgent.prototype.addScriptToEvaluateOnLoad = function(scriptSource, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Page.ScriptIdentifier):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_addScriptToEvaluateOnLoad = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.ScriptIdentifier} identifier
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
 * @param {function(?Protocol.Error, Protocol.Page.FrameId):void=} opt_callback
 */
Protocol.PageAgent.prototype.navigate = function(url, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Page.FrameId):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_navigate = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, number, !Array<Protocol.Page.NavigationEntry>):void=} opt_callback
 */
Protocol.PageAgent.prototype.getNavigationHistory = function(opt_callback) {}
/** @param {function(?Protocol.Error, number, !Array<Protocol.Page.NavigationEntry>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getNavigationHistory = function(obj, opt_callback) {}

/**
 * @param {number} entryId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.navigateToHistoryEntry = function(entryId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_navigateToHistoryEntry = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array<Protocol.Network.Cookie>):void=} opt_callback
 */
Protocol.PageAgent.prototype.getCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Network.Cookie>):void=} opt_callback */
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
 * @param {function(?Protocol.Error, Protocol.Page.FrameResourceTree):void=} opt_callback
 */
Protocol.PageAgent.prototype.getResourceTree = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Page.FrameResourceTree):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getResourceTree = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {string} url
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.PageAgent.prototype.getResourceContent = function(frameId, url, opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getResourceContent = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {string} url
 * @param {string} query
 * @param {boolean=} opt_caseSensitive
 * @param {boolean=} opt_isRegex
 * @param {function(?Protocol.Error, !Array<Protocol.Debugger.SearchMatch>):void=} opt_callback
 */
Protocol.PageAgent.prototype.searchInResource = function(frameId, url, query, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Debugger.SearchMatch>):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_searchInResource = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
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
 * @param {Protocol.Emulation.ScreenOrientation=} opt_screenOrientation
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
 * @param {boolean=} opt_suspended
 * @param {string=} opt_message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.configureOverlay = function(opt_suspended, opt_message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_configureOverlay = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, string, !Array<Protocol.Page.AppManifestError>, string=):void=} opt_callback
 */
Protocol.PageAgent.prototype.getAppManifest = function(opt_callback) {}
/** @param {function(?Protocol.Error, string, !Array<Protocol.Page.AppManifestError>, string=):void=} opt_callback */
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

/**
 * @param {boolean} enabled
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.setControlNavigations = function(enabled, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_setControlNavigations = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.NavigationResponse} response
 * @param {number} navigationId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.PageAgent.prototype.processNavigation = function(response, navigationId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_processNavigation = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, Protocol.Page.LayoutViewport, Protocol.Page.VisualViewport):void=} opt_callback
 */
Protocol.PageAgent.prototype.getLayoutMetrics = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Page.LayoutViewport, Protocol.Page.VisualViewport):void=} opt_callback */
Protocol.PageAgent.prototype.invoke_getLayoutMetrics = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Page.ResourceType = {
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
Protocol.Page.FrameId;

/** @typedef {!{id:(string), parentId:(string|undefined), loaderId:(Protocol.Network.LoaderId), name:(string|undefined), url:(string), securityOrigin:(string), mimeType:(string)}} */
Protocol.Page.Frame;

/** @typedef {!{url:(string), type:(Protocol.Page.ResourceType), mimeType:(string), lastModified:(Protocol.Network.Timestamp|undefined), contentSize:(number|undefined), failed:(boolean|undefined), canceled:(boolean|undefined)}} */
Protocol.Page.FrameResource;

/** @typedef {!{frame:(Protocol.Page.Frame), childFrames:(!Array<Protocol.Page.FrameResourceTree>|undefined), resources:(!Array<Protocol.Page.FrameResource>)}} */
Protocol.Page.FrameResourceTree;

/** @typedef {string} */
Protocol.Page.ScriptIdentifier;

/** @typedef {!{id:(number), url:(string), title:(string)}} */
Protocol.Page.NavigationEntry;

/** @typedef {!{offsetTop:(number), pageScaleFactor:(number), deviceWidth:(number), deviceHeight:(number), scrollOffsetX:(number), scrollOffsetY:(number), timestamp:(number|undefined)}} */
Protocol.Page.ScreencastFrameMetadata;

/** @enum {string} */
Protocol.Page.DialogType = {
    Alert: "alert",
    Confirm: "confirm",
    Prompt: "prompt",
    Beforeunload: "beforeunload"
};

/** @typedef {!{message:(string), critical:(number), line:(number), column:(number)}} */
Protocol.Page.AppManifestError;

/** @enum {string} */
Protocol.Page.NavigationResponse = {
    Proceed: "Proceed",
    Cancel: "Cancel",
    CancelAndIgnore: "CancelAndIgnore"
};

/** @typedef {!{pageX:(number), pageY:(number), clientWidth:(number), clientHeight:(number)}} */
Protocol.Page.LayoutViewport;

/** @typedef {!{offsetX:(number), offsetY:(number), pageX:(number), pageY:(number), clientWidth:(number), clientHeight:(number), scale:(number)}} */
Protocol.Page.VisualViewport;
/** @interface */
Protocol.PageDispatcher = function() {};
/**
 * @param {number} timestamp
 */
Protocol.PageDispatcher.prototype.domContentEventFired = function(timestamp) {};
/**
 * @param {number} timestamp
 */
Protocol.PageDispatcher.prototype.loadEventFired = function(timestamp) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {Protocol.Page.FrameId} parentFrameId
 */
Protocol.PageDispatcher.prototype.frameAttached = function(frameId, parentFrameId) {};
/**
 * @param {Protocol.Page.Frame} frame
 */
Protocol.PageDispatcher.prototype.frameNavigated = function(frame) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 */
Protocol.PageDispatcher.prototype.frameDetached = function(frameId) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 */
Protocol.PageDispatcher.prototype.frameStartedLoading = function(frameId) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 */
Protocol.PageDispatcher.prototype.frameStoppedLoading = function(frameId) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {number} delay
 */
Protocol.PageDispatcher.prototype.frameScheduledNavigation = function(frameId, delay) {};
/**
 * @param {Protocol.Page.FrameId} frameId
 */
Protocol.PageDispatcher.prototype.frameClearedScheduledNavigation = function(frameId) {};
Protocol.PageDispatcher.prototype.frameResized = function() {};
/**
 * @param {string} message
 * @param {Protocol.Page.DialogType} type
 */
Protocol.PageDispatcher.prototype.javascriptDialogOpening = function(message, type) {};
/**
 * @param {boolean} result
 */
Protocol.PageDispatcher.prototype.javascriptDialogClosed = function(result) {};
/**
 * @param {string} data
 * @param {Protocol.Page.ScreencastFrameMetadata} metadata
 * @param {number} sessionId
 */
Protocol.PageDispatcher.prototype.screencastFrame = function(data, metadata, sessionId) {};
/**
 * @param {boolean} visible
 */
Protocol.PageDispatcher.prototype.screencastVisibilityChanged = function(visible) {};
/**
 * @param {Protocol.DOM.RGBA} color
 */
Protocol.PageDispatcher.prototype.colorPicked = function(color) {};
Protocol.PageDispatcher.prototype.interstitialShown = function() {};
Protocol.PageDispatcher.prototype.interstitialHidden = function() {};
/**
 * @param {boolean} isInMainFrame
 * @param {boolean} isRedirect
 * @param {number} navigationId
 * @param {string} url
 */
Protocol.PageDispatcher.prototype.navigationRequested = function(isInMainFrame, isRedirect, navigationId, url) {};
Protocol.Rendering = {};


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
/** @interface */
Protocol.RenderingDispatcher = function() {};
Protocol.Emulation = {};


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
 * @param {Protocol.Emulation.ScreenOrientation=} opt_screenOrientation
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
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.forceViewport = function(x, y, scale, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_forceViewport = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.resetViewport = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_resetViewport = function(obj, opt_callback) {}

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
 * @param {number} width
 * @param {number} height
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setVisibleSize = function(width, height, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setVisibleSize = function(obj, opt_callback) {}

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

/**
 * @param {Protocol.Emulation.VirtualTimePolicy} policy
 * @param {number=} opt_budget
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.EmulationAgent.prototype.setVirtualTimePolicy = function(policy, opt_budget, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.EmulationAgent.prototype.invoke_setVirtualTimePolicy = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Emulation.ScreenOrientationType = {
    PortraitPrimary: "portraitPrimary",
    PortraitSecondary: "portraitSecondary",
    LandscapePrimary: "landscapePrimary",
    LandscapeSecondary: "landscapeSecondary"
};

/** @typedef {!{type:(Protocol.Emulation.ScreenOrientationType), angle:(number)}} */
Protocol.Emulation.ScreenOrientation;

/** @enum {string} */
Protocol.Emulation.VirtualTimePolicy = {
    Advance: "advance",
    Pause: "pause",
    PauseIfNetworkFetchesPending: "pauseIfNetworkFetchesPending"
};
/** @interface */
Protocol.EmulationDispatcher = function() {};
Protocol.EmulationDispatcher.prototype.virtualTimeBudgetExpired = function() {};
Protocol.Security = {};


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

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.SecurityAgent.prototype.showCertificateViewer = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.SecurityAgent.prototype.invoke_showCertificateViewer = function(obj, opt_callback) {}

/** @typedef {number} */
Protocol.Security.CertificateId;

/** @enum {string} */
Protocol.Security.SecurityState = {
    Unknown: "unknown",
    Neutral: "neutral",
    Insecure: "insecure",
    Warning: "warning",
    Secure: "secure",
    Info: "info"
};

/** @typedef {!{securityState:(Protocol.Security.SecurityState), summary:(string), description:(string), hasCertificate:(boolean)}} */
Protocol.Security.SecurityStateExplanation;

/** @typedef {!{ranMixedContent:(boolean), displayedMixedContent:(boolean), ranContentWithCertErrors:(boolean), displayedContentWithCertErrors:(boolean), ranInsecureContentStyle:(Protocol.Security.SecurityState), displayedInsecureContentStyle:(Protocol.Security.SecurityState)}} */
Protocol.Security.InsecureContentStatus;
/** @interface */
Protocol.SecurityDispatcher = function() {};
/**
 * @param {Protocol.Security.SecurityState} securityState
 * @param {!Array<Protocol.Security.SecurityStateExplanation>=} opt_explanations
 * @param {Protocol.Security.InsecureContentStatus=} opt_insecureContentStatus
 * @param {boolean=} opt_schemeIsCryptographic
 */
Protocol.SecurityDispatcher.prototype.securityStateChanged = function(securityState, opt_explanations, opt_insecureContentStatus, opt_schemeIsCryptographic) {};
Protocol.Network = {};


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
 * @param {Protocol.Network.Headers} headers
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setExtraHTTPHeaders = function(headers, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setExtraHTTPHeaders = function(obj, opt_callback) {}

/**
 * @param {Protocol.Network.RequestId} requestId
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
 * @param {Protocol.Network.RequestId} requestId
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
 * @param {function(?Protocol.Error, !Array<Protocol.Network.Cookie>):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.getCookies = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Network.Cookie>):void=} opt_callback */
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
 * @param {string} url
 * @param {string} name
 * @param {string} value
 * @param {string=} opt_domain
 * @param {string=} opt_path
 * @param {boolean=} opt_secure
 * @param {boolean=} opt_httpOnly
 * @param {Protocol.Network.CookieSameSite=} opt_sameSite
 * @param {Protocol.Network.Timestamp=} opt_expirationDate
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.setCookie = function(url, name, value, opt_domain, opt_path, opt_secure, opt_httpOnly, opt_sameSite, opt_expirationDate, opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_setCookie = function(obj, opt_callback) {}

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
 * @param {Protocol.Network.ConnectionType=} opt_connectionType
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.emulateNetworkConditions = function(offline, latency, downloadThroughput, uploadThroughput, opt_connectionType, opt_callback) {}
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
 * @param {string} origin
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.NetworkAgent.prototype.getCertificate = function(origin, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.NetworkAgent.prototype.invoke_getCertificate = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Network.LoaderId;

/** @typedef {string} */
Protocol.Network.RequestId;

/** @typedef {number} */
Protocol.Network.Timestamp;

/** @typedef {!Object} */
Protocol.Network.Headers;

/** @enum {string} */
Protocol.Network.ConnectionType = {
    None: "none",
    Cellular2g: "cellular2g",
    Cellular3g: "cellular3g",
    Cellular4g: "cellular4g",
    Bluetooth: "bluetooth",
    Ethernet: "ethernet",
    Wifi: "wifi",
    Wimax: "wimax",
    Other: "other"
};

/** @enum {string} */
Protocol.Network.CookieSameSite = {
    Strict: "Strict",
    Lax: "Lax"
};

/** @typedef {!{requestTime:(number), proxyStart:(number), proxyEnd:(number), dnsStart:(number), dnsEnd:(number), connectStart:(number), connectEnd:(number), sslStart:(number), sslEnd:(number), workerStart:(number), workerReady:(number), sendStart:(number), sendEnd:(number), pushStart:(number), pushEnd:(number), receiveHeadersEnd:(number)}} */
Protocol.Network.ResourceTiming;

/** @enum {string} */
Protocol.Network.ResourcePriority = {
    VeryLow: "VeryLow",
    Low: "Low",
    Medium: "Medium",
    High: "High",
    VeryHigh: "VeryHigh"
};

/** @enum {string} */
Protocol.Network.RequestMixedContentType = {
    Blockable: "blockable",
    OptionallyBlockable: "optionally-blockable",
    None: "none"
};

/** @typedef {!{url:(string), method:(string), headers:(Protocol.Network.Headers), postData:(string|undefined), mixedContentType:(Protocol.Network.RequestMixedContentType|undefined), initialPriority:(Protocol.Network.ResourcePriority)}} */
Protocol.Network.Request;

/** @typedef {!{status:(string), origin:(string), logDescription:(string), logId:(string), timestamp:(Protocol.Network.Timestamp), hashAlgorithm:(string), signatureAlgorithm:(string), signatureData:(string)}} */
Protocol.Network.SignedCertificateTimestamp;

/** @typedef {!{protocol:(string), keyExchange:(string), keyExchangeGroup:(string|undefined), cipher:(string), mac:(string|undefined), certificateId:(Protocol.Security.CertificateId), subjectName:(string), sanList:(!Array<string>), issuer:(string), validFrom:(Protocol.Network.Timestamp), validTo:(Protocol.Network.Timestamp), signedCertificateTimestampList:(!Array<Protocol.Network.SignedCertificateTimestamp>)}} */
Protocol.Network.SecurityDetails;

/** @enum {string} */
Protocol.Network.BlockedReason = {
    Csp: "csp",
    MixedContent: "mixed-content",
    Origin: "origin",
    Inspector: "inspector",
    SubresourceFilter: "subresource-filter",
    Other: "other"
};

/** @typedef {!{url:(string), status:(number), statusText:(string), headers:(Protocol.Network.Headers), headersText:(string|undefined), mimeType:(string), requestHeaders:(Protocol.Network.Headers|undefined), requestHeadersText:(string|undefined), connectionReused:(boolean), connectionId:(number), remoteIPAddress:(string|undefined), remotePort:(number|undefined), fromDiskCache:(boolean|undefined), fromServiceWorker:(boolean|undefined), encodedDataLength:(number|undefined), timing:(Protocol.Network.ResourceTiming|undefined), protocol:(string|undefined), securityState:(Protocol.Security.SecurityState), securityDetails:(Protocol.Network.SecurityDetails|undefined)}} */
Protocol.Network.Response;

/** @typedef {!{headers:(Protocol.Network.Headers)}} */
Protocol.Network.WebSocketRequest;

/** @typedef {!{status:(number), statusText:(string), headers:(Protocol.Network.Headers), headersText:(string|undefined), requestHeaders:(Protocol.Network.Headers|undefined), requestHeadersText:(string|undefined)}} */
Protocol.Network.WebSocketResponse;

/** @typedef {!{opcode:(number), mask:(boolean), payloadData:(string)}} */
Protocol.Network.WebSocketFrame;

/** @typedef {!{url:(string), type:(Protocol.Page.ResourceType), response:(Protocol.Network.Response|undefined), bodySize:(number)}} */
Protocol.Network.CachedResource;

/** @enum {string} */
Protocol.Network.InitiatorType = {
    Parser: "parser",
    Script: "script",
    Other: "other"
};

/** @typedef {!{type:(Protocol.Network.InitiatorType), stack:(Protocol.Runtime.StackTrace|undefined), url:(string|undefined), lineNumber:(number|undefined)}} */
Protocol.Network.Initiator;

/** @typedef {!{name:(string), value:(string), domain:(string), path:(string), expires:(number), size:(number), httpOnly:(boolean), secure:(boolean), session:(boolean), sameSite:(Protocol.Network.CookieSameSite|undefined)}} */
Protocol.Network.Cookie;
/** @interface */
Protocol.NetworkDispatcher = function() {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.ResourcePriority} newPriority
 * @param {Protocol.Network.Timestamp} timestamp
 */
Protocol.NetworkDispatcher.prototype.resourceChangedPriority = function(requestId, newPriority, timestamp) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Page.FrameId} frameId
 * @param {Protocol.Network.LoaderId} loaderId
 * @param {string} documentURL
 * @param {Protocol.Network.Request} request
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Network.Timestamp} wallTime
 * @param {Protocol.Network.Initiator} initiator
 * @param {Protocol.Network.Response=} opt_redirectResponse
 * @param {Protocol.Page.ResourceType=} opt_type
 */
Protocol.NetworkDispatcher.prototype.requestWillBeSent = function(requestId, frameId, loaderId, documentURL, request, timestamp, wallTime, initiator, opt_redirectResponse, opt_type) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 */
Protocol.NetworkDispatcher.prototype.requestServedFromCache = function(requestId) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Page.FrameId} frameId
 * @param {Protocol.Network.LoaderId} loaderId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Page.ResourceType} type
 * @param {Protocol.Network.Response} response
 */
Protocol.NetworkDispatcher.prototype.responseReceived = function(requestId, frameId, loaderId, timestamp, type, response) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {number} dataLength
 * @param {number} encodedDataLength
 */
Protocol.NetworkDispatcher.prototype.dataReceived = function(requestId, timestamp, dataLength, encodedDataLength) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {number} encodedDataLength
 */
Protocol.NetworkDispatcher.prototype.loadingFinished = function(requestId, timestamp, encodedDataLength) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Page.ResourceType} type
 * @param {string} errorText
 * @param {boolean=} opt_canceled
 * @param {Protocol.Network.BlockedReason=} opt_blockedReason
 */
Protocol.NetworkDispatcher.prototype.loadingFailed = function(requestId, timestamp, type, errorText, opt_canceled, opt_blockedReason) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Network.Timestamp} wallTime
 * @param {Protocol.Network.WebSocketRequest} request
 */
Protocol.NetworkDispatcher.prototype.webSocketWillSendHandshakeRequest = function(requestId, timestamp, wallTime, request) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Network.WebSocketResponse} response
 */
Protocol.NetworkDispatcher.prototype.webSocketHandshakeResponseReceived = function(requestId, timestamp, response) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {string} url
 * @param {Protocol.Network.Initiator=} opt_initiator
 */
Protocol.NetworkDispatcher.prototype.webSocketCreated = function(requestId, url, opt_initiator) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 */
Protocol.NetworkDispatcher.prototype.webSocketClosed = function(requestId, timestamp) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Network.WebSocketFrame} response
 */
Protocol.NetworkDispatcher.prototype.webSocketFrameReceived = function(requestId, timestamp, response) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {string} errorMessage
 */
Protocol.NetworkDispatcher.prototype.webSocketFrameError = function(requestId, timestamp, errorMessage) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {Protocol.Network.WebSocketFrame} response
 */
Protocol.NetworkDispatcher.prototype.webSocketFrameSent = function(requestId, timestamp, response) {};
/**
 * @param {Protocol.Network.RequestId} requestId
 * @param {Protocol.Network.Timestamp} timestamp
 * @param {string} eventName
 * @param {string} eventId
 * @param {string} data
 */
Protocol.NetworkDispatcher.prototype.eventSourceMessageReceived = function(requestId, timestamp, eventName, eventId, data) {};
Protocol.Database = {};


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
 * @param {Protocol.Database.DatabaseId} databaseId
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.getDatabaseTableNames = function(databaseId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_getDatabaseTableNames = function(obj, opt_callback) {}

/**
 * @param {Protocol.Database.DatabaseId} databaseId
 * @param {string} query
 * @param {function(?Protocol.Error, !Array<string>=, !Array<*>=, Protocol.Database.Error=):void=} opt_callback
 */
Protocol.DatabaseAgent.prototype.executeSQL = function(databaseId, query, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>=, !Array<*>=, Protocol.Database.Error=):void=} opt_callback */
Protocol.DatabaseAgent.prototype.invoke_executeSQL = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Database.DatabaseId;

/** @typedef {!{id:(Protocol.Database.DatabaseId), domain:(string), name:(string), version:(string)}} */
Protocol.Database.Database;

/** @typedef {!{message:(string), code:(number)}} */
Protocol.Database.Error;
/** @interface */
Protocol.DatabaseDispatcher = function() {};
/**
 * @param {Protocol.Database.Database} database
 */
Protocol.DatabaseDispatcher.prototype.addDatabase = function(database) {};
Protocol.IndexedDB = {};


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
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestDatabaseNames = function(securityOrigin, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_requestDatabaseNames = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {string} databaseName
 * @param {function(?Protocol.Error, Protocol.IndexedDB.DatabaseWithObjectStores):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestDatabase = function(securityOrigin, databaseName, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.IndexedDB.DatabaseWithObjectStores):void=} opt_callback */
Protocol.IndexedDBAgent.prototype.invoke_requestDatabase = function(obj, opt_callback) {}

/**
 * @param {string} securityOrigin
 * @param {string} databaseName
 * @param {string} objectStoreName
 * @param {string} indexName
 * @param {number} skipCount
 * @param {number} pageSize
 * @param {Protocol.IndexedDB.KeyRange=} opt_keyRange
 * @param {function(?Protocol.Error, !Array<Protocol.IndexedDB.DataEntry>, boolean):void=} opt_callback
 */
Protocol.IndexedDBAgent.prototype.requestData = function(securityOrigin, databaseName, objectStoreName, indexName, skipCount, pageSize, opt_keyRange, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.IndexedDB.DataEntry>, boolean):void=} opt_callback */
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

/** @typedef {!{name:(string), version:(number), objectStores:(!Array<Protocol.IndexedDB.ObjectStore>)}} */
Protocol.IndexedDB.DatabaseWithObjectStores;

/** @typedef {!{name:(string), keyPath:(Protocol.IndexedDB.KeyPath), autoIncrement:(boolean), indexes:(!Array<Protocol.IndexedDB.ObjectStoreIndex>)}} */
Protocol.IndexedDB.ObjectStore;

/** @typedef {!{name:(string), keyPath:(Protocol.IndexedDB.KeyPath), unique:(boolean), multiEntry:(boolean)}} */
Protocol.IndexedDB.ObjectStoreIndex;

/** @enum {string} */
Protocol.IndexedDB.KeyType = {
    Number: "number",
    String: "string",
    Date: "date",
    Array: "array"
};

/** @typedef {!{type:(Protocol.IndexedDB.KeyType), number:(number|undefined), string:(string|undefined), date:(number|undefined), array:(!Array<Protocol.IndexedDB.Key>|undefined)}} */
Protocol.IndexedDB.Key;

/** @typedef {!{lower:(Protocol.IndexedDB.Key|undefined), upper:(Protocol.IndexedDB.Key|undefined), lowerOpen:(boolean), upperOpen:(boolean)}} */
Protocol.IndexedDB.KeyRange;

/** @typedef {!{key:(Protocol.Runtime.RemoteObject), primaryKey:(Protocol.Runtime.RemoteObject), value:(Protocol.Runtime.RemoteObject)}} */
Protocol.IndexedDB.DataEntry;

/** @enum {string} */
Protocol.IndexedDB.KeyPathType = {
    Null: "null",
    String: "string",
    Array: "array"
};

/** @typedef {!{type:(Protocol.IndexedDB.KeyPathType), string:(string|undefined), array:(!Array<string>|undefined)}} */
Protocol.IndexedDB.KeyPath;
/** @interface */
Protocol.IndexedDBDispatcher = function() {};
Protocol.CacheStorage = {};


/**
 * @constructor
*/
Protocol.CacheStorageAgent = function(){};

/**
 * @param {string} securityOrigin
 * @param {function(?Protocol.Error, !Array<Protocol.CacheStorage.Cache>):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.requestCacheNames = function(securityOrigin, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CacheStorage.Cache>):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_requestCacheNames = function(obj, opt_callback) {}

/**
 * @param {Protocol.CacheStorage.CacheId} cacheId
 * @param {number} skipCount
 * @param {number} pageSize
 * @param {function(?Protocol.Error, !Array<Protocol.CacheStorage.DataEntry>, boolean):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.requestEntries = function(cacheId, skipCount, pageSize, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CacheStorage.DataEntry>, boolean):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_requestEntries = function(obj, opt_callback) {}

/**
 * @param {Protocol.CacheStorage.CacheId} cacheId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.deleteCache = function(cacheId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_deleteCache = function(obj, opt_callback) {}

/**
 * @param {Protocol.CacheStorage.CacheId} cacheId
 * @param {string} request
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.CacheStorageAgent.prototype.deleteEntry = function(cacheId, request, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CacheStorageAgent.prototype.invoke_deleteEntry = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.CacheStorage.CacheId;

/** @typedef {!{request:(string), response:(string)}} */
Protocol.CacheStorage.DataEntry;

/** @typedef {!{cacheId:(Protocol.CacheStorage.CacheId), securityOrigin:(string), cacheName:(string)}} */
Protocol.CacheStorage.Cache;
/** @interface */
Protocol.CacheStorageDispatcher = function() {};
Protocol.DOMStorage = {};


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
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {function(?Protocol.Error, !Array<Protocol.DOMStorage.Item>):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.getDOMStorageItems = function(storageId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.DOMStorage.Item>):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_getDOMStorageItems = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {string} key
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.setDOMStorageItem = function(storageId, key, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_setDOMStorageItem = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {string} key
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMStorageAgent.prototype.removeDOMStorageItem = function(storageId, key, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMStorageAgent.prototype.invoke_removeDOMStorageItem = function(obj, opt_callback) {}

/** @typedef {!{securityOrigin:(string), isLocalStorage:(boolean)}} */
Protocol.DOMStorage.StorageId;

/** @typedef {!Array<!string>} */
Protocol.DOMStorage.Item;
/** @interface */
Protocol.DOMStorageDispatcher = function() {};
/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 */
Protocol.DOMStorageDispatcher.prototype.domStorageItemsCleared = function(storageId) {};
/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {string} key
 */
Protocol.DOMStorageDispatcher.prototype.domStorageItemRemoved = function(storageId, key) {};
/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {string} key
 * @param {string} newValue
 */
Protocol.DOMStorageDispatcher.prototype.domStorageItemAdded = function(storageId, key, newValue) {};
/**
 * @param {Protocol.DOMStorage.StorageId} storageId
 * @param {string} key
 * @param {string} oldValue
 * @param {string} newValue
 */
Protocol.DOMStorageDispatcher.prototype.domStorageItemUpdated = function(storageId, key, oldValue, newValue) {};
Protocol.ApplicationCache = {};


/**
 * @constructor
*/
Protocol.ApplicationCacheAgent = function(){};

/**
 * @param {function(?Protocol.Error, !Array<Protocol.ApplicationCache.FrameWithManifest>):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getFramesWithManifests = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.ApplicationCache.FrameWithManifest>):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getFramesWithManifests = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getManifestForFrame = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getManifestForFrame = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {function(?Protocol.Error, Protocol.ApplicationCache.ApplicationCache):void=} opt_callback
 */
Protocol.ApplicationCacheAgent.prototype.getApplicationCacheForFrame = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.ApplicationCache.ApplicationCache):void=} opt_callback */
Protocol.ApplicationCacheAgent.prototype.invoke_getApplicationCacheForFrame = function(obj, opt_callback) {}

/** @typedef {!{url:(string), size:(number), type:(string)}} */
Protocol.ApplicationCache.ApplicationCacheResource;

/** @typedef {!{manifestURL:(string), size:(number), creationTime:(number), updateTime:(number), resources:(!Array<Protocol.ApplicationCache.ApplicationCacheResource>)}} */
Protocol.ApplicationCache.ApplicationCache;

/** @typedef {!{frameId:(Protocol.Page.FrameId), manifestURL:(string), status:(number)}} */
Protocol.ApplicationCache.FrameWithManifest;
/** @interface */
Protocol.ApplicationCacheDispatcher = function() {};
/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {string} manifestURL
 * @param {number} status
 */
Protocol.ApplicationCacheDispatcher.prototype.applicationCacheStatusUpdated = function(frameId, manifestURL, status) {};
/**
 * @param {boolean} isNowOnline
 */
Protocol.ApplicationCacheDispatcher.prototype.networkStateUpdated = function(isNowOnline) {};
Protocol.DOM = {};


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
 * @param {number=} opt_depth
 * @param {boolean=} opt_traverseFrames
 * @param {function(?Protocol.Error, Protocol.DOM.Node):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getDocument = function(opt_depth, opt_traverseFrames, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.Node):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getDocument = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.collectClassNamesFromSubtree = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_collectClassNamesFromSubtree = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {number=} opt_depth
 * @param {boolean=} opt_traverseFrames
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.requestChildNodes = function(nodeId, opt_depth, opt_traverseFrames, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_requestChildNodes = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} selector
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.querySelector = function(nodeId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_querySelector = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} selector
 * @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.querySelectorAll = function(nodeId, selector, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_querySelectorAll = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} name
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setNodeName = function(nodeId, name, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setNodeName = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setNodeValue = function(nodeId, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setNodeValue = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.removeNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_removeNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} name
 * @param {string} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setAttributeValue = function(nodeId, name, value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setAttributeValue = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} text
 * @param {string=} opt_name
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setAttributesAsText = function(nodeId, text, opt_name, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setAttributesAsText = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} name
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.removeAttribute = function(nodeId, name, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_removeAttribute = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getOuterHTML = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getOuterHTML = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
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
 * @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getSearchResults = function(searchId, fromIndex, toIndex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getSearchResults = function(obj, opt_callback) {}

/**
 * @param {string} searchId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.discardSearchResults = function(searchId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_discardSearchResults = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.requestNode = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_requestNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.InspectMode} mode
 * @param {Protocol.DOM.HighlightConfig=} opt_highlightConfig
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
 * @param {Protocol.DOM.RGBA=} opt_color
 * @param {Protocol.DOM.RGBA=} opt_outlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightRect = function(x, y, width, height, opt_color, opt_outlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightRect = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.Quad} quad
 * @param {Protocol.DOM.RGBA=} opt_color
 * @param {Protocol.DOM.RGBA=} opt_outlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightQuad = function(quad, opt_color, opt_outlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightQuad = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.HighlightConfig} highlightConfig
 * @param {Protocol.DOM.NodeId=} opt_nodeId
 * @param {Protocol.DOM.BackendNodeId=} opt_backendNodeId
 * @param {Protocol.Runtime.RemoteObjectId=} opt_objectId
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
 * @param {Protocol.Page.FrameId} frameId
 * @param {Protocol.DOM.RGBA=} opt_contentColor
 * @param {Protocol.DOM.RGBA=} opt_contentOutlineColor
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.highlightFrame = function(frameId, opt_contentColor, opt_contentOutlineColor, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_highlightFrame = function(obj, opt_callback) {}

/**
 * @param {string} path
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.pushNodeByPathToFrontend = function(path, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_pushNodeByPathToFrontend = function(obj, opt_callback) {}

/**
 * @param {!Array<Protocol.DOM.BackendNodeId>} backendNodeIds
 * @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.pushNodesByBackendIdsToFrontend = function(backendNodeIds, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.DOM.NodeId>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_pushNodesByBackendIdsToFrontend = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setInspectedNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setInspectedNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string=} opt_objectGroup
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):void=} opt_callback
 */
Protocol.DOMAgent.prototype.resolveNode = function(nodeId, opt_objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_resolveNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getAttributes = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getAttributes = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {Protocol.DOM.NodeId} targetNodeId
 * @param {Protocol.DOM.NodeId=} opt_insertBeforeNodeId
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.copyTo = function(nodeId, targetNodeId, opt_insertBeforeNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_copyTo = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {Protocol.DOM.NodeId} targetNodeId
 * @param {Protocol.DOM.NodeId=} opt_insertBeforeNodeId
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.moveTo = function(nodeId, targetNodeId, opt_insertBeforeNodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
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
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.focus = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_focus = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {!Array<string>} files
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMAgent.prototype.setFileInputFiles = function(nodeId, files, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_setFileInputFiles = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, Protocol.DOM.BoxModel):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getBoxModel = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.BoxModel):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getBoxModel = function(obj, opt_callback) {}

/**
 * @param {number} x
 * @param {number} y
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getNodeForLocation = function(x, y, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getNodeForLocation = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getRelayoutBoundary = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.DOM.NodeId):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getRelayoutBoundary = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Object):void=} opt_callback
 */
Protocol.DOMAgent.prototype.getHighlightObjectForTest = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Object):void=} opt_callback */
Protocol.DOMAgent.prototype.invoke_getHighlightObjectForTest = function(obj, opt_callback) {}

/** @typedef {number} */
Protocol.DOM.NodeId;

/** @typedef {number} */
Protocol.DOM.BackendNodeId;

/** @typedef {!{nodeType:(number), nodeName:(string), backendNodeId:(Protocol.DOM.BackendNodeId)}} */
Protocol.DOM.BackendNode;

/** @enum {string} */
Protocol.DOM.PseudoType = {
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
Protocol.DOM.ShadowRootType = {
    UserAgent: "user-agent",
    Open: "open",
    Closed: "closed"
};

/** @typedef {!{nodeId:(Protocol.DOM.NodeId), nodeType:(number), nodeName:(string), localName:(string), nodeValue:(string), childNodeCount:(number|undefined), children:(!Array<Protocol.DOM.Node>|undefined), attributes:(!Array<string>|undefined), documentURL:(string|undefined), baseURL:(string|undefined), publicId:(string|undefined), systemId:(string|undefined), internalSubset:(string|undefined), xmlVersion:(string|undefined), name:(string|undefined), value:(string|undefined), pseudoType:(Protocol.DOM.PseudoType|undefined), shadowRootType:(Protocol.DOM.ShadowRootType|undefined), frameId:(Protocol.Page.FrameId|undefined), contentDocument:(Protocol.DOM.Node|undefined), shadowRoots:(!Array<Protocol.DOM.Node>|undefined), templateContent:(Protocol.DOM.Node|undefined), pseudoElements:(!Array<Protocol.DOM.Node>|undefined), importedDocument:(Protocol.DOM.Node|undefined), distributedNodes:(!Array<Protocol.DOM.BackendNode>|undefined)}} */
Protocol.DOM.Node;

/** @typedef {!{r:(number), g:(number), b:(number), a:(number|undefined)}} */
Protocol.DOM.RGBA;

/** @typedef {!Array<!number>} */
Protocol.DOM.Quad;

/** @typedef {!{content:(Protocol.DOM.Quad), padding:(Protocol.DOM.Quad), border:(Protocol.DOM.Quad), margin:(Protocol.DOM.Quad), width:(number), height:(number), shapeOutside:(Protocol.DOM.ShapeOutsideInfo|undefined)}} */
Protocol.DOM.BoxModel;

/** @typedef {!{bounds:(Protocol.DOM.Quad), shape:(!Array<*>), marginShape:(!Array<*>)}} */
Protocol.DOM.ShapeOutsideInfo;

/** @typedef {!{x:(number), y:(number), width:(number), height:(number)}} */
Protocol.DOM.Rect;

/** @typedef {!{showInfo:(boolean|undefined), showRulers:(boolean|undefined), showExtensionLines:(boolean|undefined), displayAsMaterial:(boolean|undefined), contentColor:(Protocol.DOM.RGBA|undefined), paddingColor:(Protocol.DOM.RGBA|undefined), borderColor:(Protocol.DOM.RGBA|undefined), marginColor:(Protocol.DOM.RGBA|undefined), eventTargetColor:(Protocol.DOM.RGBA|undefined), shapeColor:(Protocol.DOM.RGBA|undefined), shapeMarginColor:(Protocol.DOM.RGBA|undefined), selectorList:(string|undefined)}} */
Protocol.DOM.HighlightConfig;

/** @enum {string} */
Protocol.DOM.InspectMode = {
    SearchForNode: "searchForNode",
    SearchForUAShadowDOM: "searchForUAShadowDOM",
    ShowLayoutEditor: "showLayoutEditor",
    None: "none"
};
/** @interface */
Protocol.DOMDispatcher = function() {};
Protocol.DOMDispatcher.prototype.documentUpdated = function() {};
/**
 * @param {Protocol.DOM.BackendNodeId} backendNodeId
 */
Protocol.DOMDispatcher.prototype.inspectNodeRequested = function(backendNodeId) {};
/**
 * @param {Protocol.DOM.NodeId} parentId
 * @param {!Array<Protocol.DOM.Node>} nodes
 */
Protocol.DOMDispatcher.prototype.setChildNodes = function(parentId, nodes) {};
/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} name
 * @param {string} value
 */
Protocol.DOMDispatcher.prototype.attributeModified = function(nodeId, name, value) {};
/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} name
 */
Protocol.DOMDispatcher.prototype.attributeRemoved = function(nodeId, name) {};
/**
 * @param {!Array<Protocol.DOM.NodeId>} nodeIds
 */
Protocol.DOMDispatcher.prototype.inlineStyleInvalidated = function(nodeIds) {};
/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {string} characterData
 */
Protocol.DOMDispatcher.prototype.characterDataModified = function(nodeId, characterData) {};
/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {number} childNodeCount
 */
Protocol.DOMDispatcher.prototype.childNodeCountUpdated = function(nodeId, childNodeCount) {};
/**
 * @param {Protocol.DOM.NodeId} parentNodeId
 * @param {Protocol.DOM.NodeId} previousNodeId
 * @param {Protocol.DOM.Node} node
 */
Protocol.DOMDispatcher.prototype.childNodeInserted = function(parentNodeId, previousNodeId, node) {};
/**
 * @param {Protocol.DOM.NodeId} parentNodeId
 * @param {Protocol.DOM.NodeId} nodeId
 */
Protocol.DOMDispatcher.prototype.childNodeRemoved = function(parentNodeId, nodeId) {};
/**
 * @param {Protocol.DOM.NodeId} hostId
 * @param {Protocol.DOM.Node} root
 */
Protocol.DOMDispatcher.prototype.shadowRootPushed = function(hostId, root) {};
/**
 * @param {Protocol.DOM.NodeId} hostId
 * @param {Protocol.DOM.NodeId} rootId
 */
Protocol.DOMDispatcher.prototype.shadowRootPopped = function(hostId, rootId) {};
/**
 * @param {Protocol.DOM.NodeId} parentId
 * @param {Protocol.DOM.Node} pseudoElement
 */
Protocol.DOMDispatcher.prototype.pseudoElementAdded = function(parentId, pseudoElement) {};
/**
 * @param {Protocol.DOM.NodeId} parentId
 * @param {Protocol.DOM.NodeId} pseudoElementId
 */
Protocol.DOMDispatcher.prototype.pseudoElementRemoved = function(parentId, pseudoElementId) {};
/**
 * @param {Protocol.DOM.NodeId} insertionPointId
 * @param {!Array<Protocol.DOM.BackendNode>} distributedNodes
 */
Protocol.DOMDispatcher.prototype.distributedNodesUpdated = function(insertionPointId, distributedNodes) {};
/**
 * @param {Protocol.DOM.NodeId} nodeId
 */
Protocol.DOMDispatcher.prototype.nodeHighlightRequested = function(nodeId) {};
Protocol.CSS = {};


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
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, Protocol.CSS.CSSStyle=, Protocol.CSS.CSSStyle=, !Array<Protocol.CSS.RuleMatch>=, !Array<Protocol.CSS.PseudoElementMatches>=, !Array<Protocol.CSS.InheritedStyleEntry>=, !Array<Protocol.CSS.CSSKeyframesRule>=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getMatchedStylesForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.CSSStyle=, Protocol.CSS.CSSStyle=, !Array<Protocol.CSS.RuleMatch>=, !Array<Protocol.CSS.PseudoElementMatches>=, !Array<Protocol.CSS.InheritedStyleEntry>=, !Array<Protocol.CSS.CSSKeyframesRule>=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getMatchedStylesForNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, Protocol.CSS.CSSStyle=, Protocol.CSS.CSSStyle=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getInlineStylesForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.CSSStyle=, Protocol.CSS.CSSStyle=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getInlineStylesForNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSComputedStyleProperty>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getComputedStyleForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSComputedStyleProperty>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getComputedStyleForNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array<Protocol.CSS.PlatformFontUsage>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getPlatformFontsForNode = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CSS.PlatformFontUsage>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getPlatformFontsForNode = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {function(?Protocol.Error, string):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getStyleSheetText = function(styleSheetId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getStyleSheetText = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {function(?Protocol.Error, !Array<string>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.collectClassNames = function(styleSheetId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_collectClassNames = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {string} text
 * @param {function(?Protocol.Error, string=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleSheetText = function(styleSheetId, text, opt_callback) {}
/** @param {function(?Protocol.Error, string=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleSheetText = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {Protocol.CSS.SourceRange} range
 * @param {string} selector
 * @param {function(?Protocol.Error, Protocol.CSS.SelectorList):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setRuleSelector = function(styleSheetId, range, selector, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.SelectorList):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setRuleSelector = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {Protocol.CSS.SourceRange} range
 * @param {string} keyText
 * @param {function(?Protocol.Error, Protocol.CSS.Value):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setKeyframeKey = function(styleSheetId, range, keyText, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.Value):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setKeyframeKey = function(obj, opt_callback) {}

/**
 * @param {!Array<Protocol.CSS.StyleDeclarationEdit>} edits
 * @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSStyle>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setStyleTexts = function(edits, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSStyle>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setStyleTexts = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {Protocol.CSS.SourceRange} range
 * @param {string} text
 * @param {function(?Protocol.Error, Protocol.CSS.CSSMedia):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.setMediaText = function(styleSheetId, range, text, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.CSSMedia):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_setMediaText = function(obj, opt_callback) {}

/**
 * @param {Protocol.Page.FrameId} frameId
 * @param {function(?Protocol.Error, Protocol.CSS.StyleSheetId):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.createStyleSheet = function(frameId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.StyleSheetId):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_createStyleSheet = function(obj, opt_callback) {}

/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {string} ruleText
 * @param {Protocol.CSS.SourceRange} location
 * @param {function(?Protocol.Error, Protocol.CSS.CSSRule):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.addRule = function(styleSheetId, ruleText, location, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.CSS.CSSRule):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_addRule = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {!Array<string>} forcedPseudoClasses
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.forcePseudoState = function(nodeId, forcedPseudoClasses, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_forcePseudoState = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSMedia>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getMediaQueries = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CSS.CSSMedia>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getMediaQueries = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
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
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {function(?Protocol.Error, !Array<string>=):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getBackgroundColors = function(nodeId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>=):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getBackgroundColors = function(obj, opt_callback) {}

/**
 * @param {!Array<string>} computedStyleWhitelist
 * @param {function(?Protocol.Error, !Array<Protocol.CSS.LayoutTreeNode>, !Array<Protocol.CSS.ComputedStyle>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.CSSAgent.prototype.getLayoutTreeAndStyles = function(computedStyleWhitelist, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.CSS.LayoutTreeNode>, !Array<Protocol.CSS.ComputedStyle>):void=} opt_callback */
Protocol.CSSAgent.prototype.invoke_getLayoutTreeAndStyles = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.CSS.StyleSheetId;

/** @enum {string} */
Protocol.CSS.StyleSheetOrigin = {
    Injected: "injected",
    UserAgent: "user-agent",
    Inspector: "inspector",
    Regular: "regular"
};

/** @typedef {!{pseudoType:(Protocol.DOM.PseudoType), matches:(!Array<Protocol.CSS.RuleMatch>)}} */
Protocol.CSS.PseudoElementMatches;

/** @typedef {!{inlineStyle:(Protocol.CSS.CSSStyle|undefined), matchedCSSRules:(!Array<Protocol.CSS.RuleMatch>)}} */
Protocol.CSS.InheritedStyleEntry;

/** @typedef {!{rule:(Protocol.CSS.CSSRule), matchingSelectors:(!Array<number>)}} */
Protocol.CSS.RuleMatch;

/** @typedef {!{text:(string), range:(Protocol.CSS.SourceRange|undefined)}} */
Protocol.CSS.Value;

/** @typedef {!{selectors:(!Array<Protocol.CSS.Value>), text:(string)}} */
Protocol.CSS.SelectorList;

/** @typedef {!{styleSheetId:(Protocol.CSS.StyleSheetId), frameId:(Protocol.Page.FrameId), sourceURL:(string), sourceMapURL:(string|undefined), origin:(Protocol.CSS.StyleSheetOrigin), title:(string), ownerNode:(Protocol.DOM.BackendNodeId|undefined), disabled:(boolean), hasSourceURL:(boolean|undefined), isInline:(boolean), startLine:(number), startColumn:(number)}} */
Protocol.CSS.CSSStyleSheetHeader;

/** @typedef {!{styleSheetId:(Protocol.CSS.StyleSheetId|undefined), selectorList:(Protocol.CSS.SelectorList), origin:(Protocol.CSS.StyleSheetOrigin), style:(Protocol.CSS.CSSStyle), media:(!Array<Protocol.CSS.CSSMedia>|undefined)}} */
Protocol.CSS.CSSRule;

/** @typedef {!{startLine:(number), startColumn:(number), endLine:(number), endColumn:(number)}} */
Protocol.CSS.SourceRange;

/** @typedef {!{name:(string), value:(string), important:(boolean|undefined)}} */
Protocol.CSS.ShorthandEntry;

/** @typedef {!{name:(string), value:(string)}} */
Protocol.CSS.CSSComputedStyleProperty;

/** @typedef {!{styleSheetId:(Protocol.CSS.StyleSheetId|undefined), cssProperties:(!Array<Protocol.CSS.CSSProperty>), shorthandEntries:(!Array<Protocol.CSS.ShorthandEntry>), cssText:(string|undefined), range:(Protocol.CSS.SourceRange|undefined)}} */
Protocol.CSS.CSSStyle;

/** @typedef {!{name:(string), value:(string), important:(boolean|undefined), implicit:(boolean|undefined), text:(string|undefined), parsedOk:(boolean|undefined), disabled:(boolean|undefined), range:(Protocol.CSS.SourceRange|undefined)}} */
Protocol.CSS.CSSProperty;

/** @enum {string} */
Protocol.CSS.CSSMediaSource = {
    MediaRule: "mediaRule",
    ImportRule: "importRule",
    LinkedSheet: "linkedSheet",
    InlineSheet: "inlineSheet"
};

/** @typedef {!{text:(string), source:(Protocol.CSS.CSSMediaSource), sourceURL:(string|undefined), range:(Protocol.CSS.SourceRange|undefined), styleSheetId:(Protocol.CSS.StyleSheetId|undefined), mediaList:(!Array<Protocol.CSS.MediaQuery>|undefined)}} */
Protocol.CSS.CSSMedia;

/** @typedef {!{expressions:(!Array<Protocol.CSS.MediaQueryExpression>), active:(boolean)}} */
Protocol.CSS.MediaQuery;

/** @typedef {!{value:(number), unit:(string), feature:(string), valueRange:(Protocol.CSS.SourceRange|undefined), computedLength:(number|undefined)}} */
Protocol.CSS.MediaQueryExpression;

/** @typedef {!{familyName:(string), isCustomFont:(boolean), glyphCount:(number)}} */
Protocol.CSS.PlatformFontUsage;

/** @typedef {!{animationName:(Protocol.CSS.Value), keyframes:(!Array<Protocol.CSS.CSSKeyframeRule>)}} */
Protocol.CSS.CSSKeyframesRule;

/** @typedef {!{styleSheetId:(Protocol.CSS.StyleSheetId|undefined), origin:(Protocol.CSS.StyleSheetOrigin), keyText:(Protocol.CSS.Value), style:(Protocol.CSS.CSSStyle)}} */
Protocol.CSS.CSSKeyframeRule;

/** @typedef {!{styleSheetId:(Protocol.CSS.StyleSheetId), range:(Protocol.CSS.SourceRange), text:(string)}} */
Protocol.CSS.StyleDeclarationEdit;

/** @typedef {!{boundingBox:(Protocol.DOM.Rect), startCharacterIndex:(number), numCharacters:(number)}} */
Protocol.CSS.InlineTextBox;

/** @typedef {!{nodeId:(Protocol.DOM.NodeId), boundingBox:(Protocol.DOM.Rect), layoutText:(string|undefined), inlineTextNodes:(!Array<Protocol.CSS.InlineTextBox>|undefined), styleIndex:(number|undefined)}} */
Protocol.CSS.LayoutTreeNode;

/** @typedef {!{properties:(!Array<Protocol.CSS.CSSComputedStyleProperty>)}} */
Protocol.CSS.ComputedStyle;
/** @interface */
Protocol.CSSDispatcher = function() {};
Protocol.CSSDispatcher.prototype.mediaQueryResultChanged = function() {};
Protocol.CSSDispatcher.prototype.fontsUpdated = function() {};
/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 */
Protocol.CSSDispatcher.prototype.styleSheetChanged = function(styleSheetId) {};
/**
 * @param {Protocol.CSS.CSSStyleSheetHeader} header
 */
Protocol.CSSDispatcher.prototype.styleSheetAdded = function(header) {};
/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 */
Protocol.CSSDispatcher.prototype.styleSheetRemoved = function(styleSheetId) {};
/**
 * @param {Protocol.CSS.StyleSheetId} styleSheetId
 * @param {Protocol.CSS.SourceRange} changeRange
 */
Protocol.CSSDispatcher.prototype.layoutEditorChange = function(styleSheetId, changeRange) {};
Protocol.IO = {};


/**
 * @constructor
*/
Protocol.IOAgent = function(){};

/**
 * @param {Protocol.IO.StreamHandle} handle
 * @param {number=} opt_offset
 * @param {number=} opt_size
 * @param {function(?Protocol.Error, string, boolean):void=} opt_callback
 */
Protocol.IOAgent.prototype.read = function(handle, opt_offset, opt_size, opt_callback) {}
/** @param {function(?Protocol.Error, string, boolean):void=} opt_callback */
Protocol.IOAgent.prototype.invoke_read = function(obj, opt_callback) {}

/**
 * @param {Protocol.IO.StreamHandle} handle
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.IOAgent.prototype.close = function(handle, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.IOAgent.prototype.invoke_close = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.IO.StreamHandle;
/** @interface */
Protocol.IODispatcher = function() {};
Protocol.DOMDebugger = {};


/**
 * @constructor
*/
Protocol.DOMDebuggerAgent = function(){};

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {Protocol.DOMDebugger.DOMBreakpointType} type
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.setDOMBreakpoint = function(nodeId, type, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_setDOMBreakpoint = function(obj, opt_callback) {}

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {Protocol.DOMDebugger.DOMBreakpointType} type
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
 * @param {Protocol.Runtime.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, !Array<Protocol.DOMDebugger.EventListener>):void=} opt_callback
 */
Protocol.DOMDebuggerAgent.prototype.getEventListeners = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.DOMDebugger.EventListener>):void=} opt_callback */
Protocol.DOMDebuggerAgent.prototype.invoke_getEventListeners = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.DOMDebugger.DOMBreakpointType = {
    SubtreeModified: "subtree-modified",
    AttributeModified: "attribute-modified",
    NodeRemoved: "node-removed"
};

/** @typedef {!{type:(string), useCapture:(boolean), passive:(boolean), scriptId:(Protocol.Runtime.ScriptId), lineNumber:(number), columnNumber:(number), handler:(Protocol.Runtime.RemoteObject|undefined), originalHandler:(Protocol.Runtime.RemoteObject|undefined), removeFunction:(Protocol.Runtime.RemoteObject|undefined)}} */
Protocol.DOMDebugger.EventListener;
/** @interface */
Protocol.DOMDebuggerDispatcher = function() {};
Protocol.Target = {};


/**
 * @constructor
*/
Protocol.TargetAgent = function(){};

/**
 * @param {boolean} discover
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.setDiscoverTargets = function(discover, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_setDiscoverTargets = function(obj, opt_callback) {}

/**
 * @param {boolean} autoAttach
 * @param {boolean} waitForDebuggerOnStart
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.setAutoAttach = function(autoAttach, waitForDebuggerOnStart, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_setAutoAttach = function(obj, opt_callback) {}

/**
 * @param {boolean} value
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.setAttachToFrames = function(value, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_setAttachToFrames = function(obj, opt_callback) {}

/**
 * @param {!Array<Protocol.Target.RemoteLocation>} locations
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.setRemoteLocations = function(locations, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_setRemoteLocations = function(obj, opt_callback) {}

/**
 * @param {string} targetId
 * @param {string} message
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.sendMessageToTarget = function(targetId, message, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_sendMessageToTarget = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {function(?Protocol.Error, Protocol.Target.TargetInfo):void=} opt_callback
 */
Protocol.TargetAgent.prototype.getTargetInfo = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Target.TargetInfo):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_getTargetInfo = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.activateTarget = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_activateTarget = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.TargetAgent.prototype.closeTarget = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_closeTarget = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.TargetAgent.prototype.attachToTarget = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_attachToTarget = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TargetAgent.prototype.detachFromTarget = function(targetId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_detachFromTarget = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, Protocol.Target.BrowserContextID):void=} opt_callback
 */
Protocol.TargetAgent.prototype.createBrowserContext = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Target.BrowserContextID):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_createBrowserContext = function(obj, opt_callback) {}

/**
 * @param {Protocol.Target.BrowserContextID} browserContextId
 * @param {function(?Protocol.Error, boolean):void=} opt_callback
 */
Protocol.TargetAgent.prototype.disposeBrowserContext = function(browserContextId, opt_callback) {}
/** @param {function(?Protocol.Error, boolean):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_disposeBrowserContext = function(obj, opt_callback) {}

/**
 * @param {string} url
 * @param {number=} opt_width
 * @param {number=} opt_height
 * @param {Protocol.Target.BrowserContextID=} opt_browserContextId
 * @param {function(?Protocol.Error, Protocol.Target.TargetID):void=} opt_callback
 */
Protocol.TargetAgent.prototype.createTarget = function(url, opt_width, opt_height, opt_browserContextId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Target.TargetID):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_createTarget = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, !Array<Protocol.Target.TargetInfo>):void=} opt_callback
 */
Protocol.TargetAgent.prototype.getTargets = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Target.TargetInfo>):void=} opt_callback */
Protocol.TargetAgent.prototype.invoke_getTargets = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Target.TargetID;

/** @typedef {string} */
Protocol.Target.BrowserContextID;

/** @typedef {!{targetId:(Protocol.Target.TargetID), type:(string), title:(string), url:(string)}} */
Protocol.Target.TargetInfo;

/** @typedef {!{host:(string), port:(number)}} */
Protocol.Target.RemoteLocation;
/** @interface */
Protocol.TargetDispatcher = function() {};
/**
 * @param {Protocol.Target.TargetInfo} targetInfo
 */
Protocol.TargetDispatcher.prototype.targetCreated = function(targetInfo) {};
/**
 * @param {Protocol.Target.TargetID} targetId
 */
Protocol.TargetDispatcher.prototype.targetDestroyed = function(targetId) {};
/**
 * @param {Protocol.Target.TargetInfo} targetInfo
 * @param {boolean} waitingForDebugger
 */
Protocol.TargetDispatcher.prototype.attachedToTarget = function(targetInfo, waitingForDebugger) {};
/**
 * @param {Protocol.Target.TargetID} targetId
 */
Protocol.TargetDispatcher.prototype.detachedFromTarget = function(targetId) {};
/**
 * @param {Protocol.Target.TargetID} targetId
 * @param {string} message
 */
Protocol.TargetDispatcher.prototype.receivedMessageFromTarget = function(targetId, message) {};
Protocol.ServiceWorker = {};


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

/** @typedef {!{registrationId:(string), scopeURL:(string), isDeleted:(boolean)}} */
Protocol.ServiceWorker.ServiceWorkerRegistration;

/** @enum {string} */
Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus = {
    Stopped: "stopped",
    Starting: "starting",
    Running: "running",
    Stopping: "stopping"
};

/** @enum {string} */
Protocol.ServiceWorker.ServiceWorkerVersionStatus = {
    New: "new",
    Installing: "installing",
    Installed: "installed",
    Activating: "activating",
    Activated: "activated",
    Redundant: "redundant"
};

/** @typedef {!{versionId:(string), registrationId:(string), scriptURL:(string), runningStatus:(Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus), status:(Protocol.ServiceWorker.ServiceWorkerVersionStatus), scriptLastModified:(number|undefined), scriptResponseTime:(number|undefined), controlledClients:(!Array<Protocol.Target.TargetID>|undefined), targetId:(Protocol.Target.TargetID|undefined)}} */
Protocol.ServiceWorker.ServiceWorkerVersion;

/** @typedef {!{errorMessage:(string), registrationId:(string), versionId:(string), sourceURL:(string), lineNumber:(number), columnNumber:(number)}} */
Protocol.ServiceWorker.ServiceWorkerErrorMessage;
/** @interface */
Protocol.ServiceWorkerDispatcher = function() {};
/**
 * @param {!Array<Protocol.ServiceWorker.ServiceWorkerRegistration>} registrations
 */
Protocol.ServiceWorkerDispatcher.prototype.workerRegistrationUpdated = function(registrations) {};
/**
 * @param {!Array<Protocol.ServiceWorker.ServiceWorkerVersion>} versions
 */
Protocol.ServiceWorkerDispatcher.prototype.workerVersionUpdated = function(versions) {};
/**
 * @param {Protocol.ServiceWorker.ServiceWorkerErrorMessage} errorMessage
 */
Protocol.ServiceWorkerDispatcher.prototype.workerErrorReported = function(errorMessage) {};
Protocol.Input = {};


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
 * @param {!Array<Protocol.Input.TouchPoint>} touchPoints
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
 * @param {Protocol.Input.GestureSourceType=} opt_gestureSourceType
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
 * @param {Protocol.Input.GestureSourceType=} opt_gestureSourceType
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
 * @param {Protocol.Input.GestureSourceType=} opt_gestureSourceType
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.InputAgent.prototype.synthesizeTapGesture = function(x, y, opt_duration, opt_tapCount, opt_gestureSourceType, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.InputAgent.prototype.invoke_synthesizeTapGesture = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Input.TouchPointState = {
    TouchPressed: "touchPressed",
    TouchReleased: "touchReleased",
    TouchMoved: "touchMoved",
    TouchStationary: "touchStationary",
    TouchCancelled: "touchCancelled"
};

/** @typedef {!{state:(Protocol.Input.TouchPointState), x:(number), y:(number), radiusX:(number|undefined), radiusY:(number|undefined), rotationAngle:(number|undefined), force:(number|undefined), id:(number|undefined)}} */
Protocol.Input.TouchPoint;

/** @enum {string} */
Protocol.Input.GestureSourceType = {
    Default: "default",
    Touch: "touch",
    Mouse: "mouse"
};
/** @interface */
Protocol.InputDispatcher = function() {};
Protocol.LayerTree = {};


/**
 * @constructor
*/
Protocol.LayerTreeAgent = function(){};

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.LayerId} layerId
 * @param {function(?Protocol.Error, !Array<string>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.compositingReasons = function(layerId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_compositingReasons = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.LayerId} layerId
 * @param {function(?Protocol.Error, Protocol.LayerTree.SnapshotId):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.makeSnapshot = function(layerId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.LayerTree.SnapshotId):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_makeSnapshot = function(obj, opt_callback) {}

/**
 * @param {!Array<Protocol.LayerTree.PictureTile>} tiles
 * @param {function(?Protocol.Error, Protocol.LayerTree.SnapshotId):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.loadSnapshot = function(tiles, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.LayerTree.SnapshotId):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_loadSnapshot = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.SnapshotId} snapshotId
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.releaseSnapshot = function(snapshotId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_releaseSnapshot = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.SnapshotId} snapshotId
 * @param {number|undefined} minRepeatCount
 * @param {number|undefined} minDuration
 * @param {Protocol.DOM.Rect|undefined} clipRect
 * @param {function(?Protocol.Error, !Array<Protocol.LayerTree.PaintProfile>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.profileSnapshot = function(snapshotId, minRepeatCount, minDuration, clipRect, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.LayerTree.PaintProfile>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_profileSnapshot = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.SnapshotId} snapshotId
 * @param {number|undefined} fromStep
 * @param {number|undefined} toStep
 * @param {number|undefined} scale
 * @param {function(?Protocol.Error, string):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.replaySnapshot = function(snapshotId, fromStep, toStep, scale, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_replaySnapshot = function(obj, opt_callback) {}

/**
 * @param {Protocol.LayerTree.SnapshotId} snapshotId
 * @param {function(?Protocol.Error, !Array<!Object>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.LayerTreeAgent.prototype.snapshotCommandLog = function(snapshotId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<!Object>):void=} opt_callback */
Protocol.LayerTreeAgent.prototype.invoke_snapshotCommandLog = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.LayerTree.LayerId;

/** @typedef {string} */
Protocol.LayerTree.SnapshotId;

/** @enum {string} */
Protocol.LayerTree.ScrollRectType = {
    RepaintsOnScroll: "RepaintsOnScroll",
    TouchEventHandler: "TouchEventHandler",
    WheelEventHandler: "WheelEventHandler"
};

/** @typedef {!{rect:(Protocol.DOM.Rect), type:(Protocol.LayerTree.ScrollRectType)}} */
Protocol.LayerTree.ScrollRect;

/** @typedef {!{x:(number), y:(number), picture:(string)}} */
Protocol.LayerTree.PictureTile;

/** @typedef {!{layerId:(Protocol.LayerTree.LayerId), parentLayerId:(Protocol.LayerTree.LayerId|undefined), backendNodeId:(Protocol.DOM.BackendNodeId|undefined), offsetX:(number), offsetY:(number), width:(number), height:(number), transform:(!Array<number>|undefined), anchorX:(number|undefined), anchorY:(number|undefined), anchorZ:(number|undefined), paintCount:(number), drawsContent:(boolean), invisible:(boolean|undefined), scrollRects:(!Array<Protocol.LayerTree.ScrollRect>|undefined)}} */
Protocol.LayerTree.Layer;

/** @typedef {!Array<!number>} */
Protocol.LayerTree.PaintProfile;
/** @interface */
Protocol.LayerTreeDispatcher = function() {};
/**
 * @param {!Array<Protocol.LayerTree.Layer>=} opt_layers
 */
Protocol.LayerTreeDispatcher.prototype.layerTreeDidChange = function(opt_layers) {};
/**
 * @param {Protocol.LayerTree.LayerId} layerId
 * @param {Protocol.DOM.Rect} clip
 */
Protocol.LayerTreeDispatcher.prototype.layerPainted = function(layerId, clip) {};
Protocol.DeviceOrientation = {};


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
/** @interface */
Protocol.DeviceOrientationDispatcher = function() {};
Protocol.Tracing = {};


/**
 * @constructor
*/
Protocol.TracingAgent = function(){};

/**
 * @param {string=} opt_categories
 * @param {string=} opt_options
 * @param {number=} opt_bufferUsageReportingInterval
 * @param {string=} opt_transferMode
 * @param {Protocol.Tracing.TraceConfig=} opt_traceConfig
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
 * @param {function(?Protocol.Error, !Array<string>):void=} opt_callback
 */
Protocol.TracingAgent.prototype.getCategories = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<string>):void=} opt_callback */
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

/** @typedef {!Object} */
Protocol.Tracing.MemoryDumpConfig;

/** @enum {string} */
Protocol.Tracing.TraceConfigRecordMode = {
    RecordUntilFull: "recordUntilFull",
    RecordContinuously: "recordContinuously",
    RecordAsMuchAsPossible: "recordAsMuchAsPossible",
    EchoToConsole: "echoToConsole"
};

/** @typedef {!{recordMode:(Protocol.Tracing.TraceConfigRecordMode|undefined), enableSampling:(boolean|undefined), enableSystrace:(boolean|undefined), enableArgumentFilter:(boolean|undefined), includedCategories:(!Array<string>|undefined), excludedCategories:(!Array<string>|undefined), syntheticDelays:(!Array<string>|undefined), memoryDumpConfig:(Protocol.Tracing.MemoryDumpConfig|undefined)}} */
Protocol.Tracing.TraceConfig;
/** @interface */
Protocol.TracingDispatcher = function() {};
/**
 * @param {!Array<!Object>} value
 */
Protocol.TracingDispatcher.prototype.dataCollected = function(value) {};
/**
 * @param {Protocol.IO.StreamHandle=} opt_stream
 */
Protocol.TracingDispatcher.prototype.tracingComplete = function(opt_stream) {};
/**
 * @param {number=} opt_percentFull
 * @param {number=} opt_eventCount
 * @param {number=} opt_value
 */
Protocol.TracingDispatcher.prototype.bufferUsage = function(opt_percentFull, opt_eventCount, opt_value) {};
Protocol.Animation = {};


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
 * @param {!Array<string>} animations
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
 * @param {!Array<string>} animations
 * @param {number} currentTime
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.seekAnimations = function(animations, currentTime, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_seekAnimations = function(obj, opt_callback) {}

/**
 * @param {!Array<string>} animations
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.releaseAnimations = function(animations, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_releaseAnimations = function(obj, opt_callback) {}

/**
 * @param {string} animationId
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AnimationAgent.prototype.resolveAnimation = function(animationId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):void=} opt_callback */
Protocol.AnimationAgent.prototype.invoke_resolveAnimation = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Animation.AnimationType = {
    CSSTransition: "CSSTransition",
    CSSAnimation: "CSSAnimation",
    WebAnimation: "WebAnimation"
};

/** @typedef {!{id:(string), name:(string), pausedState:(boolean), playState:(string), playbackRate:(number), startTime:(number), currentTime:(number), source:(Protocol.Animation.AnimationEffect), type:(Protocol.Animation.AnimationType), cssId:(string|undefined)}} */
Protocol.Animation.Animation;

/** @typedef {!{delay:(number), endDelay:(number), iterationStart:(number), iterations:(number), duration:(number), direction:(string), fill:(string), backendNodeId:(Protocol.DOM.BackendNodeId), keyframesRule:(Protocol.Animation.KeyframesRule|undefined), easing:(string)}} */
Protocol.Animation.AnimationEffect;

/** @typedef {!{name:(string|undefined), keyframes:(!Array<Protocol.Animation.KeyframeStyle>)}} */
Protocol.Animation.KeyframesRule;

/** @typedef {!{offset:(string), easing:(string)}} */
Protocol.Animation.KeyframeStyle;
/** @interface */
Protocol.AnimationDispatcher = function() {};
/**
 * @param {string} id
 */
Protocol.AnimationDispatcher.prototype.animationCreated = function(id) {};
/**
 * @param {Protocol.Animation.Animation} animation
 */
Protocol.AnimationDispatcher.prototype.animationStarted = function(animation) {};
/**
 * @param {string} id
 */
Protocol.AnimationDispatcher.prototype.animationCanceled = function(id) {};
Protocol.Accessibility = {};


/**
 * @constructor
*/
Protocol.AccessibilityAgent = function(){};

/**
 * @param {Protocol.DOM.NodeId} nodeId
 * @param {boolean} fetchAncestors
 * @param {function(?Protocol.Error, !Array<Protocol.Accessibility.AXNode>):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.AccessibilityAgent.prototype.getAXNodeChain = function(nodeId, fetchAncestors, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Accessibility.AXNode>):void=} opt_callback */
Protocol.AccessibilityAgent.prototype.invoke_getAXNodeChain = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Accessibility.AXNodeId;

/** @enum {string} */
Protocol.Accessibility.AXValueType = {
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
Protocol.Accessibility.AXValueSourceType = {
    Attribute: "attribute",
    Implicit: "implicit",
    Style: "style",
    Contents: "contents",
    Placeholder: "placeholder",
    RelatedElement: "relatedElement"
};

/** @enum {string} */
Protocol.Accessibility.AXValueNativeSourceType = {
    Figcaption: "figcaption",
    Label: "label",
    Labelfor: "labelfor",
    Labelwrapped: "labelwrapped",
    Legend: "legend",
    Tablecaption: "tablecaption",
    Title: "title",
    Other: "other"
};

/** @typedef {!{type:(Protocol.Accessibility.AXValueSourceType), value:(Protocol.Accessibility.AXValue|undefined), attribute:(string|undefined), attributeValue:(Protocol.Accessibility.AXValue|undefined), superseded:(boolean|undefined), nativeSource:(Protocol.Accessibility.AXValueNativeSourceType|undefined), nativeSourceValue:(Protocol.Accessibility.AXValue|undefined), invalid:(boolean|undefined), invalidReason:(string|undefined)}} */
Protocol.Accessibility.AXValueSource;

/** @typedef {!{backendNodeId:(Protocol.DOM.BackendNodeId), idref:(string|undefined), text:(string|undefined)}} */
Protocol.Accessibility.AXRelatedNode;

/** @typedef {!{name:(string), value:(Protocol.Accessibility.AXValue)}} */
Protocol.Accessibility.AXProperty;

/** @typedef {!{type:(Protocol.Accessibility.AXValueType), value:(*|undefined), relatedNodes:(!Array<Protocol.Accessibility.AXRelatedNode>|undefined), sources:(!Array<Protocol.Accessibility.AXValueSource>|undefined)}} */
Protocol.Accessibility.AXValue;

/** @enum {string} */
Protocol.Accessibility.AXGlobalStates = {
    Disabled: "disabled",
    Hidden: "hidden",
    HiddenRoot: "hiddenRoot",
    Invalid: "invalid"
};

/** @enum {string} */
Protocol.Accessibility.AXLiveRegionAttributes = {
    Live: "live",
    Atomic: "atomic",
    Relevant: "relevant",
    Busy: "busy",
    Root: "root"
};

/** @enum {string} */
Protocol.Accessibility.AXWidgetAttributes = {
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
Protocol.Accessibility.AXWidgetStates = {
    Checked: "checked",
    Expanded: "expanded",
    Pressed: "pressed",
    Selected: "selected"
};

/** @enum {string} */
Protocol.Accessibility.AXRelationshipAttributes = {
    Activedescendant: "activedescendant",
    Flowto: "flowto",
    Controls: "controls",
    Describedby: "describedby",
    Labelledby: "labelledby",
    Owns: "owns"
};

/** @typedef {!{nodeId:(Protocol.Accessibility.AXNodeId), ignored:(boolean), ignoredReasons:(!Array<Protocol.Accessibility.AXProperty>|undefined), role:(Protocol.Accessibility.AXValue|undefined), name:(Protocol.Accessibility.AXValue|undefined), description:(Protocol.Accessibility.AXValue|undefined), value:(Protocol.Accessibility.AXValue|undefined), properties:(!Array<Protocol.Accessibility.AXProperty>|undefined)}} */
Protocol.Accessibility.AXNode;
/** @interface */
Protocol.AccessibilityDispatcher = function() {};
Protocol.Storage = {};


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

/** @enum {string} */
Protocol.Storage.StorageType = {
    Appcache: "appcache",
    Cookies: "cookies",
    File_systems: "file_systems",
    Indexeddb: "indexeddb",
    Local_storage: "local_storage",
    Shader_cache: "shader_cache",
    Websql: "websql",
    Service_workers: "service_workers",
    Cache_storage: "cache_storage",
    All: "all"
};
/** @interface */
Protocol.StorageDispatcher = function() {};
Protocol.Log = {};


/**
 * @constructor
*/
Protocol.LogAgent = function(){};

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LogAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LogAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LogAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LogAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.LogAgent.prototype.clear = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.LogAgent.prototype.invoke_clear = function(obj, opt_callback) {}

/** @enum {string} */
Protocol.Log.LogEntrySource = {
    XML: "xml",
    Javascript: "javascript",
    Network: "network",
    Storage: "storage",
    Appcache: "appcache",
    Rendering: "rendering",
    Security: "security",
    Deprecation: "deprecation",
    Worker: "worker",
    Other: "other"
};

/** @enum {string} */
Protocol.Log.LogEntryLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug",
    Info: "info"
};

/** @typedef {!{source:(Protocol.Log.LogEntrySource), level:(Protocol.Log.LogEntryLevel), text:(string), timestamp:(Protocol.Runtime.Timestamp), url:(string|undefined), lineNumber:(number|undefined), stackTrace:(Protocol.Runtime.StackTrace|undefined), networkRequestId:(Protocol.Network.RequestId|undefined), workerId:(string|undefined)}} */
Protocol.Log.LogEntry;
/** @interface */
Protocol.LogDispatcher = function() {};
/**
 * @param {Protocol.Log.LogEntry} entry
 */
Protocol.LogDispatcher.prototype.entryAdded = function(entry) {};
Protocol.SystemInfo = {};


/**
 * @constructor
*/
Protocol.SystemInfoAgent = function(){};

/**
 * @param {function(?Protocol.Error, Protocol.SystemInfo.GPUInfo, string, string):void=} opt_callback
 */
Protocol.SystemInfoAgent.prototype.getInfo = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.SystemInfo.GPUInfo, string, string):void=} opt_callback */
Protocol.SystemInfoAgent.prototype.invoke_getInfo = function(obj, opt_callback) {}

/** @typedef {!{vendorId:(number), deviceId:(number), vendorString:(string), deviceString:(string)}} */
Protocol.SystemInfo.GPUDevice;

/** @typedef {!{devices:(!Array<Protocol.SystemInfo.GPUDevice>), auxAttributes:(!Object|undefined), featureStatus:(!Object|undefined), driverBugWorkarounds:(!Array<string>)}} */
Protocol.SystemInfo.GPUInfo;
/** @interface */
Protocol.SystemInfoDispatcher = function() {};
Protocol.Tethering = {};


/**
 * @constructor
*/
Protocol.TetheringAgent = function(){};

/**
 * @param {number} port
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TetheringAgent.prototype.bind = function(port, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TetheringAgent.prototype.invoke_bind = function(obj, opt_callback) {}

/**
 * @param {number} port
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.TetheringAgent.prototype.unbind = function(port, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.TetheringAgent.prototype.invoke_unbind = function(obj, opt_callback) {}
/** @interface */
Protocol.TetheringDispatcher = function() {};
/**
 * @param {number} port
 * @param {string} connectionId
 */
Protocol.TetheringDispatcher.prototype.accepted = function(port, connectionId) {};
Protocol.Schema = {};


/**
 * @constructor
*/
Protocol.SchemaAgent = function(){};

/**
 * @param {function(?Protocol.Error, !Array<Protocol.Schema.Domain>):void=} opt_callback
 */
Protocol.SchemaAgent.prototype.getDomains = function(opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Schema.Domain>):void=} opt_callback */
Protocol.SchemaAgent.prototype.invoke_getDomains = function(obj, opt_callback) {}

/** @typedef {!{name:(string), version:(string)}} */
Protocol.Schema.Domain;
/** @interface */
Protocol.SchemaDispatcher = function() {};
Protocol.Runtime = {};


/**
 * @constructor
*/
Protocol.RuntimeAgent = function(){};

/**
 * @param {string} expression
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {boolean=} opt_silent
 * @param {Protocol.Runtime.ExecutionContextId=} opt_contextId
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {boolean=} opt_userGesture
 * @param {boolean=} opt_awaitPromise
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.evaluate = function(expression, opt_objectGroup, opt_includeCommandLineAPI, opt_silent, opt_contextId, opt_returnByValue, opt_generatePreview, opt_userGesture, opt_awaitPromise, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_evaluate = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} promiseObjectId
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.awaitPromise = function(promiseObjectId, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_awaitPromise = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} objectId
 * @param {string} functionDeclaration
 * @param {!Array<Protocol.Runtime.CallArgument>=} opt_arguments
 * @param {boolean=} opt_silent
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {boolean=} opt_userGesture
 * @param {boolean=} opt_awaitPromise
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.callFunctionOn = function(objectId, functionDeclaration, opt_arguments, opt_silent, opt_returnByValue, opt_generatePreview, opt_userGesture, opt_awaitPromise, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_callFunctionOn = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} objectId
 * @param {boolean=} opt_ownProperties
 * @param {boolean=} opt_accessorPropertiesOnly
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, !Array<Protocol.Runtime.PropertyDescriptor>, !Array<Protocol.Runtime.InternalPropertyDescriptor>=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.getProperties = function(objectId, opt_ownProperties, opt_accessorPropertiesOnly, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Runtime.PropertyDescriptor>, !Array<Protocol.Runtime.InternalPropertyDescriptor>=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_getProperties = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} objectId
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
Protocol.RuntimeAgent.prototype.runIfWaitingForDebugger = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_runIfWaitingForDebugger = function(obj, opt_callback) {}

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
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.discardConsoleEntries = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_discardConsoleEntries = function(obj, opt_callback) {}

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
 * @param {Protocol.Runtime.ExecutionContextId=} opt_executionContextId
 * @param {function(?Protocol.Error, Protocol.Runtime.ScriptId=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.compileScript = function(expression, sourceURL, persistScript, opt_executionContextId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.ScriptId=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_compileScript = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {Protocol.Runtime.ExecutionContextId=} opt_executionContextId
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_silent
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {boolean=} opt_awaitPromise
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.RuntimeAgent.prototype.runScript = function(scriptId, opt_executionContextId, opt_objectGroup, opt_silent, opt_includeCommandLineAPI, opt_returnByValue, opt_generatePreview, opt_awaitPromise, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.RuntimeAgent.prototype.invoke_runScript = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Runtime.ScriptId;

/** @typedef {string} */
Protocol.Runtime.RemoteObjectId;

/** @enum {string} */
Protocol.Runtime.UnserializableValue = {
    Infinity: "Infinity",
    NaN: "NaN",
    NegativeInfinity: "-Infinity",
    Negative0: "-0"
};

/** @enum {string} */
Protocol.Runtime.RemoteObjectType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol"
};

/** @enum {string} */
Protocol.Runtime.RemoteObjectSubtype = {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date",
    Map: "map",
    Set: "set",
    Iterator: "iterator",
    Generator: "generator",
    Error: "error",
    Proxy: "proxy",
    Promise: "promise",
    Typedarray: "typedarray"
};

/** @typedef {!{type:(Protocol.Runtime.RemoteObjectType), subtype:(Protocol.Runtime.RemoteObjectSubtype|undefined), className:(string|undefined), value:(*|undefined), unserializableValue:(Protocol.Runtime.UnserializableValue|undefined), description:(string|undefined), objectId:(Protocol.Runtime.RemoteObjectId|undefined), preview:(Protocol.Runtime.ObjectPreview|undefined), customPreview:(Protocol.Runtime.CustomPreview|undefined)}} */
Protocol.Runtime.RemoteObject;

/** @typedef {!{header:(string), hasBody:(boolean), formatterObjectId:(Protocol.Runtime.RemoteObjectId), bindRemoteObjectFunctionId:(Protocol.Runtime.RemoteObjectId), configObjectId:(Protocol.Runtime.RemoteObjectId|undefined)}} */
Protocol.Runtime.CustomPreview;

/** @enum {string} */
Protocol.Runtime.ObjectPreviewType = {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Symbol: "symbol"
};

/** @enum {string} */
Protocol.Runtime.ObjectPreviewSubtype = {
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

/** @typedef {!{type:(Protocol.Runtime.ObjectPreviewType), subtype:(Protocol.Runtime.ObjectPreviewSubtype|undefined), description:(string|undefined), overflow:(boolean), properties:(!Array<Protocol.Runtime.PropertyPreview>), entries:(!Array<Protocol.Runtime.EntryPreview>|undefined)}} */
Protocol.Runtime.ObjectPreview;

/** @enum {string} */
Protocol.Runtime.PropertyPreviewType = {
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
Protocol.Runtime.PropertyPreviewSubtype = {
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

/** @typedef {!{name:(string), type:(Protocol.Runtime.PropertyPreviewType), value:(string|undefined), valuePreview:(Protocol.Runtime.ObjectPreview|undefined), subtype:(Protocol.Runtime.PropertyPreviewSubtype|undefined)}} */
Protocol.Runtime.PropertyPreview;

/** @typedef {!{key:(Protocol.Runtime.ObjectPreview|undefined), value:(Protocol.Runtime.ObjectPreview)}} */
Protocol.Runtime.EntryPreview;

/** @typedef {!{name:(string), value:(Protocol.Runtime.RemoteObject|undefined), writable:(boolean|undefined), get:(Protocol.Runtime.RemoteObject|undefined), set:(Protocol.Runtime.RemoteObject|undefined), configurable:(boolean), enumerable:(boolean), wasThrown:(boolean|undefined), isOwn:(boolean|undefined), symbol:(Protocol.Runtime.RemoteObject|undefined)}} */
Protocol.Runtime.PropertyDescriptor;

/** @typedef {!{name:(string), value:(Protocol.Runtime.RemoteObject|undefined)}} */
Protocol.Runtime.InternalPropertyDescriptor;

/** @typedef {!{value:(*|undefined), unserializableValue:(Protocol.Runtime.UnserializableValue|undefined), objectId:(Protocol.Runtime.RemoteObjectId|undefined)}} */
Protocol.Runtime.CallArgument;

/** @typedef {number} */
Protocol.Runtime.ExecutionContextId;

/** @typedef {!{id:(Protocol.Runtime.ExecutionContextId), origin:(string), name:(string), auxData:(!Object|undefined)}} */
Protocol.Runtime.ExecutionContextDescription;

/** @typedef {!{exceptionId:(number), text:(string), lineNumber:(number), columnNumber:(number), scriptId:(Protocol.Runtime.ScriptId|undefined), url:(string|undefined), stackTrace:(Protocol.Runtime.StackTrace|undefined), exception:(Protocol.Runtime.RemoteObject|undefined), executionContextId:(Protocol.Runtime.ExecutionContextId|undefined)}} */
Protocol.Runtime.ExceptionDetails;

/** @typedef {number} */
Protocol.Runtime.Timestamp;

/** @typedef {!{functionName:(string), scriptId:(Protocol.Runtime.ScriptId), url:(string), lineNumber:(number), columnNumber:(number)}} */
Protocol.Runtime.CallFrame;

/** @typedef {!{description:(string|undefined), callFrames:(!Array<Protocol.Runtime.CallFrame>), parent:(Protocol.Runtime.StackTrace|undefined)}} */
Protocol.Runtime.StackTrace;
/** @interface */
Protocol.RuntimeDispatcher = function() {};
/**
 * @param {Protocol.Runtime.ExecutionContextDescription} context
 */
Protocol.RuntimeDispatcher.prototype.executionContextCreated = function(context) {};
/**
 * @param {Protocol.Runtime.ExecutionContextId} executionContextId
 */
Protocol.RuntimeDispatcher.prototype.executionContextDestroyed = function(executionContextId) {};
Protocol.RuntimeDispatcher.prototype.executionContextsCleared = function() {};
/**
 * @param {Protocol.Runtime.Timestamp} timestamp
 * @param {Protocol.Runtime.ExceptionDetails} exceptionDetails
 */
Protocol.RuntimeDispatcher.prototype.exceptionThrown = function(timestamp, exceptionDetails) {};
/**
 * @param {string} reason
 * @param {number} exceptionId
 */
Protocol.RuntimeDispatcher.prototype.exceptionRevoked = function(reason, exceptionId) {};
/**
 * @param {string} type
 * @param {!Array<Protocol.Runtime.RemoteObject>} args
 * @param {Protocol.Runtime.ExecutionContextId} executionContextId
 * @param {Protocol.Runtime.Timestamp} timestamp
 * @param {Protocol.Runtime.StackTrace=} opt_stackTrace
 */
Protocol.RuntimeDispatcher.prototype.consoleAPICalled = function(type, args, executionContextId, timestamp, opt_stackTrace) {};
/**
 * @param {Protocol.Runtime.RemoteObject} object
 * @param {!Object} hints
 */
Protocol.RuntimeDispatcher.prototype.inspectRequested = function(object, hints) {};
Protocol.Debugger = {};


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
 * @param {boolean} skip
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setSkipAllPauses = function(skip, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setSkipAllPauses = function(obj, opt_callback) {}

/**
 * @param {number} lineNumber
 * @param {string=} opt_url
 * @param {string=} opt_urlRegex
 * @param {number=} opt_columnNumber
 * @param {string=} opt_condition
 * @param {function(?Protocol.Error, Protocol.Debugger.BreakpointId, !Array<Protocol.Debugger.Location>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpointByUrl = function(lineNumber, opt_url, opt_urlRegex, opt_columnNumber, opt_condition, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Debugger.BreakpointId, !Array<Protocol.Debugger.Location>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBreakpointByUrl = function(obj, opt_callback) {}

/**
 * @param {Protocol.Debugger.Location} location
 * @param {string=} opt_condition
 * @param {function(?Protocol.Error, Protocol.Debugger.BreakpointId, Protocol.Debugger.Location):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBreakpoint = function(location, opt_condition, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Debugger.BreakpointId, Protocol.Debugger.Location):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBreakpoint = function(obj, opt_callback) {}

/**
 * @param {Protocol.Debugger.BreakpointId} breakpointId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.removeBreakpoint = function(breakpointId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_removeBreakpoint = function(obj, opt_callback) {}

/**
 * @param {Protocol.Debugger.Location} location
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.continueToLocation = function(location, opt_callback) {}
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
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {string} query
 * @param {boolean=} opt_caseSensitive
 * @param {boolean=} opt_isRegex
 * @param {function(?Protocol.Error, !Array<Protocol.Debugger.SearchMatch>):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.searchInContent = function(scriptId, query, opt_caseSensitive, opt_isRegex, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Debugger.SearchMatch>):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_searchInContent = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {string} scriptSource
 * @param {boolean=} opt_dryRun
 * @param {function(?Protocol.Error, !Array<Protocol.Debugger.CallFrame>=, boolean=, Protocol.Runtime.StackTrace=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setScriptSource = function(scriptId, scriptSource, opt_dryRun, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Debugger.CallFrame>=, boolean=, Protocol.Runtime.StackTrace=, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setScriptSource = function(obj, opt_callback) {}

/**
 * @param {Protocol.Debugger.CallFrameId} callFrameId
 * @param {function(?Protocol.Error, !Array<Protocol.Debugger.CallFrame>, Protocol.Runtime.StackTrace=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.restartFrame = function(callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error, !Array<Protocol.Debugger.CallFrame>, Protocol.Runtime.StackTrace=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_restartFrame = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {function(?Protocol.Error, string):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.getScriptSource = function(scriptId, opt_callback) {}
/** @param {function(?Protocol.Error, string):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_getScriptSource = function(obj, opt_callback) {}

/**
 * @param {string} state
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setPauseOnExceptions = function(state, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setPauseOnExceptions = function(obj, opt_callback) {}

/**
 * @param {Protocol.Debugger.CallFrameId} callFrameId
 * @param {string} expression
 * @param {string=} opt_objectGroup
 * @param {boolean=} opt_includeCommandLineAPI
 * @param {boolean=} opt_silent
 * @param {boolean=} opt_returnByValue
 * @param {boolean=} opt_generatePreview
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.evaluateOnCallFrame = function(callFrameId, expression, opt_objectGroup, opt_includeCommandLineAPI, opt_silent, opt_returnByValue, opt_generatePreview, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject, Protocol.Runtime.ExceptionDetails=):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_evaluateOnCallFrame = function(obj, opt_callback) {}

/**
 * @param {number} scopeNumber
 * @param {string} variableName
 * @param {Protocol.Runtime.CallArgument} newValue
 * @param {Protocol.Debugger.CallFrameId} callFrameId
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setVariableValue = function(scopeNumber, variableName, newValue, callFrameId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setVariableValue = function(obj, opt_callback) {}

/**
 * @param {number} maxDepth
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setAsyncCallStackDepth = function(maxDepth, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setAsyncCallStackDepth = function(obj, opt_callback) {}

/**
 * @param {!Array<string>} patterns
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBlackboxPatterns = function(patterns, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBlackboxPatterns = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {!Array<Protocol.Debugger.ScriptPosition>} positions
 * @param {function(?Protocol.Error):void=} opt_callback
 */
Protocol.DebuggerAgent.prototype.setBlackboxedRanges = function(scriptId, positions, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.DebuggerAgent.prototype.invoke_setBlackboxedRanges = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.Debugger.BreakpointId;

/** @typedef {string} */
Protocol.Debugger.CallFrameId;

/** @typedef {!{scriptId:(Protocol.Runtime.ScriptId), lineNumber:(number), columnNumber:(number|undefined)}} */
Protocol.Debugger.Location;

/** @typedef {!{lineNumber:(number), columnNumber:(number)}} */
Protocol.Debugger.ScriptPosition;

/** @typedef {!{callFrameId:(Protocol.Debugger.CallFrameId), functionName:(string), functionLocation:(Protocol.Debugger.Location|undefined), location:(Protocol.Debugger.Location), scopeChain:(!Array<Protocol.Debugger.Scope>), this:(Protocol.Runtime.RemoteObject), returnValue:(Protocol.Runtime.RemoteObject|undefined)}} */
Protocol.Debugger.CallFrame;

/** @enum {string} */
Protocol.Debugger.ScopeType = {
    Global: "global",
    Local: "local",
    With: "with",
    Closure: "closure",
    Catch: "catch",
    Block: "block",
    Script: "script"
};

/** @typedef {!{type:(Protocol.Debugger.ScopeType), object:(Protocol.Runtime.RemoteObject), name:(string|undefined), startLocation:(Protocol.Debugger.Location|undefined), endLocation:(Protocol.Debugger.Location|undefined)}} */
Protocol.Debugger.Scope;

/** @typedef {!{lineNumber:(number), lineContent:(string)}} */
Protocol.Debugger.SearchMatch;
/** @interface */
Protocol.DebuggerDispatcher = function() {};
/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {Protocol.Runtime.ExecutionContextId} executionContextId
 * @param {string} hash
 * @param {!Object=} opt_executionContextAuxData
 * @param {boolean=} opt_isLiveEdit
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 */
Protocol.DebuggerDispatcher.prototype.scriptParsed = function(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, opt_executionContextAuxData, opt_isLiveEdit, opt_sourceMapURL, opt_hasSourceURL) {};
/**
 * @param {Protocol.Runtime.ScriptId} scriptId
 * @param {string} url
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {Protocol.Runtime.ExecutionContextId} executionContextId
 * @param {string} hash
 * @param {!Object=} opt_executionContextAuxData
 * @param {string=} opt_sourceMapURL
 * @param {boolean=} opt_hasSourceURL
 */
Protocol.DebuggerDispatcher.prototype.scriptFailedToParse = function(scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, opt_executionContextAuxData, opt_sourceMapURL, opt_hasSourceURL) {};
/**
 * @param {Protocol.Debugger.BreakpointId} breakpointId
 * @param {Protocol.Debugger.Location} location
 */
Protocol.DebuggerDispatcher.prototype.breakpointResolved = function(breakpointId, location) {};
/**
 * @param {!Array<Protocol.Debugger.CallFrame>} callFrames
 * @param {string} reason
 * @param {!Object=} opt_data
 * @param {!Array<string>=} opt_hitBreakpoints
 * @param {Protocol.Runtime.StackTrace=} opt_asyncStackTrace
 */
Protocol.DebuggerDispatcher.prototype.paused = function(callFrames, reason, opt_data, opt_hitBreakpoints, opt_asyncStackTrace) {};
Protocol.DebuggerDispatcher.prototype.resumed = function() {};
Protocol.Console = {};


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

/** @enum {string} */
Protocol.Console.ConsoleMessageSource = {
    XML: "xml",
    Javascript: "javascript",
    Network: "network",
    ConsoleAPI: "console-api",
    Storage: "storage",
    Appcache: "appcache",
    Rendering: "rendering",
    Security: "security",
    Other: "other",
    Deprecation: "deprecation",
    Worker: "worker"
};

/** @enum {string} */
Protocol.Console.ConsoleMessageLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug",
    Info: "info"
};

/** @typedef {!{source:(Protocol.Console.ConsoleMessageSource), level:(Protocol.Console.ConsoleMessageLevel), text:(string), url:(string|undefined), line:(number|undefined), column:(number|undefined)}} */
Protocol.Console.ConsoleMessage;
/** @interface */
Protocol.ConsoleDispatcher = function() {};
/**
 * @param {Protocol.Console.ConsoleMessage} message
 */
Protocol.ConsoleDispatcher.prototype.messageAdded = function(message) {};
Protocol.Profiler = {};


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
 * @param {function(?Protocol.Error, Protocol.Profiler.Profile):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.ProfilerAgent.prototype.stop = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Profiler.Profile):void=} opt_callback */
Protocol.ProfilerAgent.prototype.invoke_stop = function(obj, opt_callback) {}

/** @typedef {!{id:(number), callFrame:(Protocol.Runtime.CallFrame), hitCount:(number|undefined), children:(!Array<number>|undefined), deoptReason:(string|undefined), positionTicks:(!Array<Protocol.Profiler.PositionTickInfo>|undefined)}} */
Protocol.Profiler.ProfileNode;

/** @typedef {!{nodes:(!Array<Protocol.Profiler.ProfileNode>), startTime:(number), endTime:(number), samples:(!Array<number>|undefined), timeDeltas:(!Array<number>|undefined)}} */
Protocol.Profiler.Profile;

/** @typedef {!{line:(number), ticks:(number)}} */
Protocol.Profiler.PositionTickInfo;
/** @interface */
Protocol.ProfilerDispatcher = function() {};
/**
 * @param {string} id
 * @param {Protocol.Debugger.Location} location
 * @param {string=} opt_title
 */
Protocol.ProfilerDispatcher.prototype.consoleProfileStarted = function(id, location, opt_title) {};
/**
 * @param {string} id
 * @param {Protocol.Debugger.Location} location
 * @param {Protocol.Profiler.Profile} profile
 * @param {string=} opt_title
 */
Protocol.ProfilerDispatcher.prototype.consoleProfileFinished = function(id, location, profile, opt_title) {};
Protocol.HeapProfiler = {};


/**
 * @constructor
*/
Protocol.HeapProfilerAgent = function(){};

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.enable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_enable = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.disable = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_disable = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_trackAllocations
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.startTrackingHeapObjects = function(opt_trackAllocations, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_startTrackingHeapObjects = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_reportProgress
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.stopTrackingHeapObjects = function(opt_reportProgress, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_stopTrackingHeapObjects = function(obj, opt_callback) {}

/**
 * @param {boolean=} opt_reportProgress
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.takeHeapSnapshot = function(opt_reportProgress, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_takeHeapSnapshot = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.collectGarbage = function(opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_collectGarbage = function(obj, opt_callback) {}

/**
 * @param {Protocol.HeapProfiler.HeapSnapshotObjectId} objectId
 * @param {string|undefined} objectGroup
 * @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.getObjectByHeapObjectId = function(objectId, objectGroup, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.Runtime.RemoteObject):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getObjectByHeapObjectId = function(obj, opt_callback) {}

/**
 * @param {Protocol.HeapProfiler.HeapSnapshotObjectId} heapObjectId
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.addInspectedHeapObject = function(heapObjectId, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_addInspectedHeapObject = function(obj, opt_callback) {}

/**
 * @param {Protocol.Runtime.RemoteObjectId} objectId
 * @param {function(?Protocol.Error, Protocol.HeapProfiler.HeapSnapshotObjectId):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.getHeapObjectId = function(objectId, opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.HeapProfiler.HeapSnapshotObjectId):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_getHeapObjectId = function(obj, opt_callback) {}

/**
 * @param {number=} opt_samplingInterval
 * @param {function(?Protocol.Error):T=} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.startSampling = function(opt_samplingInterval, opt_callback) {}
/** @param {function(?Protocol.Error):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_startSampling = function(obj, opt_callback) {}

/**
 * @param {function(?Protocol.Error, Protocol.HeapProfiler.SamplingHeapProfile):T} opt_callback
 * @return {!Promise.<T>}
 * @template T
 */
Protocol.HeapProfilerAgent.prototype.stopSampling = function(opt_callback) {}
/** @param {function(?Protocol.Error, Protocol.HeapProfiler.SamplingHeapProfile):void=} opt_callback */
Protocol.HeapProfilerAgent.prototype.invoke_stopSampling = function(obj, opt_callback) {}

/** @typedef {string} */
Protocol.HeapProfiler.HeapSnapshotObjectId;

/** @typedef {!{callFrame:(Protocol.Runtime.CallFrame), selfSize:(number), children:(!Array<Protocol.HeapProfiler.SamplingHeapProfileNode>)}} */
Protocol.HeapProfiler.SamplingHeapProfileNode;

/** @typedef {!{head:(Protocol.HeapProfiler.SamplingHeapProfileNode)}} */
Protocol.HeapProfiler.SamplingHeapProfile;
/** @interface */
Protocol.HeapProfilerDispatcher = function() {};
/**
 * @param {string} chunk
 */
Protocol.HeapProfilerDispatcher.prototype.addHeapSnapshotChunk = function(chunk) {};
Protocol.HeapProfilerDispatcher.prototype.resetProfiles = function() {};
/**
 * @param {number} done
 * @param {number} total
 * @param {boolean=} opt_finished
 */
Protocol.HeapProfilerDispatcher.prototype.reportHeapSnapshotProgress = function(done, total, opt_finished) {};
/**
 * @param {number} lastSeenObjectId
 * @param {number} timestamp
 */
Protocol.HeapProfilerDispatcher.prototype.lastSeenObjectId = function(lastSeenObjectId, timestamp) {};
/**
 * @param {!Array<number>} statsUpdate
 */
Protocol.HeapProfilerDispatcher.prototype.heapStatsUpdate = function(statsUpdate) {};
/** @return {!Protocol.InspectorAgent}*/
Protocol.TargetBase.prototype.inspectorAgent = function(){};
/**
 * @param {!Protocol.InspectorDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerInspectorDispatcher = function(dispatcher) {}
/** @return {!Protocol.MemoryAgent}*/
Protocol.TargetBase.prototype.memoryAgent = function(){};
/**
 * @param {!Protocol.MemoryDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerMemoryDispatcher = function(dispatcher) {}
/** @return {!Protocol.PageAgent}*/
Protocol.TargetBase.prototype.pageAgent = function(){};
/**
 * @param {!Protocol.PageDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerPageDispatcher = function(dispatcher) {}
/** @return {!Protocol.RenderingAgent}*/
Protocol.TargetBase.prototype.renderingAgent = function(){};
/**
 * @param {!Protocol.RenderingDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerRenderingDispatcher = function(dispatcher) {}
/** @return {!Protocol.EmulationAgent}*/
Protocol.TargetBase.prototype.emulationAgent = function(){};
/**
 * @param {!Protocol.EmulationDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerEmulationDispatcher = function(dispatcher) {}
/** @return {!Protocol.SecurityAgent}*/
Protocol.TargetBase.prototype.securityAgent = function(){};
/**
 * @param {!Protocol.SecurityDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerSecurityDispatcher = function(dispatcher) {}
/** @return {!Protocol.NetworkAgent}*/
Protocol.TargetBase.prototype.networkAgent = function(){};
/**
 * @param {!Protocol.NetworkDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerNetworkDispatcher = function(dispatcher) {}
/** @return {!Protocol.DatabaseAgent}*/
Protocol.TargetBase.prototype.databaseAgent = function(){};
/**
 * @param {!Protocol.DatabaseDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDatabaseDispatcher = function(dispatcher) {}
/** @return {!Protocol.IndexedDBAgent}*/
Protocol.TargetBase.prototype.indexedDBAgent = function(){};
/**
 * @param {!Protocol.IndexedDBDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerIndexedDBDispatcher = function(dispatcher) {}
/** @return {!Protocol.CacheStorageAgent}*/
Protocol.TargetBase.prototype.cacheStorageAgent = function(){};
/**
 * @param {!Protocol.CacheStorageDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerCacheStorageDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMStorageAgent}*/
Protocol.TargetBase.prototype.domstorageAgent = function(){};
/**
 * @param {!Protocol.DOMStorageDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDOMStorageDispatcher = function(dispatcher) {}
/** @return {!Protocol.ApplicationCacheAgent}*/
Protocol.TargetBase.prototype.applicationCacheAgent = function(){};
/**
 * @param {!Protocol.ApplicationCacheDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerApplicationCacheDispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMAgent}*/
Protocol.TargetBase.prototype.domAgent = function(){};
/**
 * @param {!Protocol.DOMDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDOMDispatcher = function(dispatcher) {}
/** @return {!Protocol.CSSAgent}*/
Protocol.TargetBase.prototype.cssAgent = function(){};
/**
 * @param {!Protocol.CSSDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerCSSDispatcher = function(dispatcher) {}
/** @return {!Protocol.IOAgent}*/
Protocol.TargetBase.prototype.ioAgent = function(){};
/**
 * @param {!Protocol.IODispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerIODispatcher = function(dispatcher) {}
/** @return {!Protocol.DOMDebuggerAgent}*/
Protocol.TargetBase.prototype.domdebuggerAgent = function(){};
/**
 * @param {!Protocol.DOMDebuggerDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDOMDebuggerDispatcher = function(dispatcher) {}
/** @return {!Protocol.TargetAgent}*/
Protocol.TargetBase.prototype.targetAgent = function(){};
/**
 * @param {!Protocol.TargetDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerTargetDispatcher = function(dispatcher) {}
/** @return {!Protocol.ServiceWorkerAgent}*/
Protocol.TargetBase.prototype.serviceWorkerAgent = function(){};
/**
 * @param {!Protocol.ServiceWorkerDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerServiceWorkerDispatcher = function(dispatcher) {}
/** @return {!Protocol.InputAgent}*/
Protocol.TargetBase.prototype.inputAgent = function(){};
/**
 * @param {!Protocol.InputDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerInputDispatcher = function(dispatcher) {}
/** @return {!Protocol.LayerTreeAgent}*/
Protocol.TargetBase.prototype.layerTreeAgent = function(){};
/**
 * @param {!Protocol.LayerTreeDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerLayerTreeDispatcher = function(dispatcher) {}
/** @return {!Protocol.DeviceOrientationAgent}*/
Protocol.TargetBase.prototype.deviceOrientationAgent = function(){};
/**
 * @param {!Protocol.DeviceOrientationDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDeviceOrientationDispatcher = function(dispatcher) {}
/** @return {!Protocol.TracingAgent}*/
Protocol.TargetBase.prototype.tracingAgent = function(){};
/**
 * @param {!Protocol.TracingDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerTracingDispatcher = function(dispatcher) {}
/** @return {!Protocol.AnimationAgent}*/
Protocol.TargetBase.prototype.animationAgent = function(){};
/**
 * @param {!Protocol.AnimationDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerAnimationDispatcher = function(dispatcher) {}
/** @return {!Protocol.AccessibilityAgent}*/
Protocol.TargetBase.prototype.accessibilityAgent = function(){};
/**
 * @param {!Protocol.AccessibilityDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerAccessibilityDispatcher = function(dispatcher) {}
/** @return {!Protocol.StorageAgent}*/
Protocol.TargetBase.prototype.storageAgent = function(){};
/**
 * @param {!Protocol.StorageDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerStorageDispatcher = function(dispatcher) {}
/** @return {!Protocol.LogAgent}*/
Protocol.TargetBase.prototype.logAgent = function(){};
/**
 * @param {!Protocol.LogDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerLogDispatcher = function(dispatcher) {}
/** @return {!Protocol.SystemInfoAgent}*/
Protocol.TargetBase.prototype.systemInfoAgent = function(){};
/**
 * @param {!Protocol.SystemInfoDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerSystemInfoDispatcher = function(dispatcher) {}
/** @return {!Protocol.TetheringAgent}*/
Protocol.TargetBase.prototype.tetheringAgent = function(){};
/**
 * @param {!Protocol.TetheringDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerTetheringDispatcher = function(dispatcher) {}
/** @return {!Protocol.SchemaAgent}*/
Protocol.TargetBase.prototype.schemaAgent = function(){};
/**
 * @param {!Protocol.SchemaDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerSchemaDispatcher = function(dispatcher) {}
/** @return {!Protocol.RuntimeAgent}*/
Protocol.TargetBase.prototype.runtimeAgent = function(){};
/**
 * @param {!Protocol.RuntimeDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerRuntimeDispatcher = function(dispatcher) {}
/** @return {!Protocol.DebuggerAgent}*/
Protocol.TargetBase.prototype.debuggerAgent = function(){};
/**
 * @param {!Protocol.DebuggerDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerDebuggerDispatcher = function(dispatcher) {}
/** @return {!Protocol.ConsoleAgent}*/
Protocol.TargetBase.prototype.consoleAgent = function(){};
/**
 * @param {!Protocol.ConsoleDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerConsoleDispatcher = function(dispatcher) {}
/** @return {!Protocol.ProfilerAgent}*/
Protocol.TargetBase.prototype.profilerAgent = function(){};
/**
 * @param {!Protocol.ProfilerDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerProfilerDispatcher = function(dispatcher) {}
/** @return {!Protocol.HeapProfilerAgent}*/
Protocol.TargetBase.prototype.heapProfilerAgent = function(){};
/**
 * @param {!Protocol.HeapProfilerDispatcher} dispatcher
 */
Protocol.TargetBase.prototype.registerHeapProfilerDispatcher = function(dispatcher) {}
