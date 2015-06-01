// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// DevToolsAPI ----------------------------------------------------------------

/**
 * @constructor
 */
function DevToolsAPIImpl()
{
    /**
     * @type {?Window}
     */
    this._inspectorWindow;

    /**
     * @type {!Array.<function(!Window)>}
     */
    this._pendingDispatches = [];

    /**
     * @type {number}
     */
    this._lastCallId = 0;

    /**
     * @type {!Object.<number, function(?Object)>}
     */
    this._callbacks = {};

    /**
     * @type {?function(!Array.<!Adb.Device>)}
     */
    this._devicesUpdatedCallback = null;
}

DevToolsAPIImpl.prototype = {
    /**
     * @param {number} id
     * @param {?Object} arg
     */
    embedderMessageAck: function(id, arg)
    {
        var callback = this._callbacks[id];
        delete this._callbacks[id];
        if (callback)
            callback(arg);
    },

    /**
     * @param {string} method
     * @param {!Array.<*>} args
     * @param {?function(?Object)} callback
     */
    sendMessageToEmbedder: function(method, args, callback)
    {
        var callId = ++this._lastCallId;
        if (callback)
            this._callbacks[callId] = callback;
        var message = { "id": callId, "method": method };
        if (args.length)
            message.params = args;
        DevToolsHost.sendMessageToEmbedder(JSON.stringify(message));
    },

    /**
     * @param {function(!Array.<!Adb.Device>)} callback
     */
    setDevicesUpdatedCallback: function(callback)
    {
        this._devicesUpdatedCallback = callback;
    },

    /**
     * @param {?Window} inspectorWindow
     */
    setInspectorWindow: function(inspectorWindow)
    {
        this._inspectorWindow = inspectorWindow;
        if (!inspectorWindow)
            return;
        while (this._pendingDispatches.length)
            this._pendingDispatches.shift()(inspectorWindow);
    },

    /**
     * @param {function(!Window)} callback
     */
    _dispatchOnInspectorWindow: function(callback)
    {
        if (this._inspectorWindow) {
            callback(this._inspectorWindow);
        } else {
            this._pendingDispatches.push(callback);
        }
    },

    /**
     * @param {string} method
     * @param {!Array.<*>} args
     */
    _dispatchOnInspectorFrontendAPI: function(method, args)
    {
        /**
         * @param {!Window} inspectorWindow
         */
        function dispatch(inspectorWindow)
        {
            var api = inspectorWindow["InspectorFrontendAPI"];
            api[method].apply(api, args);
        }

        this._dispatchOnInspectorWindow(dispatch);
    },

    // API methods below this line --------------------------------------------

    /**
     * @param {!Array.<!ExtensionDescriptor>} extensions
     */
    addExtensions: function(extensions)
    {
        /**
         * @param {!Window} inspectorWindow
         */
        function dispatch(inspectorWindow)
        {
            // Support for legacy front-ends (<M41).
            if (inspectorWindow["WebInspector"].addExtensions)
                inspectorWindow["WebInspector"].addExtensions(extensions);
            else
                inspectorWindow["InspectorFrontendAPI"].addExtensions(extensions);
        }

        this._dispatchOnInspectorWindow(dispatch);
    },

    /**
     * @param {string} url
     */
    appendedToURL: function(url)
    {
        this._dispatchOnInspectorFrontendAPI("appendedToURL", [url]);
    },

    /**
     * @param {string} url
     */
    canceledSaveURL: function(url)
    {
        this._dispatchOnInspectorFrontendAPI("canceledSaveURL", [url]);
    },

    contextMenuCleared: function()
    {
        this._dispatchOnInspectorFrontendAPI("contextMenuCleared", []);
    },

    /**
     * @param {string} id
     */
    contextMenuItemSelected: function(id)
    {
        this._dispatchOnInspectorFrontendAPI("contextMenuItemSelected", [id]);
    },

    /**
     * @param {number} count
     */
    deviceCountUpdated: function(count)
    {
        this._dispatchOnInspectorFrontendAPI("deviceCountUpdated", [count]);
    },

    /**
     * @param {!Array.<!Adb.Device>} devices
     */
    devicesUpdated: function(devices)
    {
        if (this._devicesUpdatedCallback)
            this._devicesUpdatedCallback.call(null, devices);
        this._dispatchOnInspectorFrontendAPI("devicesUpdated", [devices]);
    },

    /**
     * @param {string} message
     */
    dispatchMessage: function(message)
    {
        // TODO(dgozman): remove once iframe is gone.
        if (typeof message !== "string")
            message = JSON.stringify(message);
        this._dispatchOnInspectorFrontendAPI("dispatchMessage", [message]);
    },

    /**
     * @param {string} messageChunk
     * @param {number} messageSize
     */
    dispatchMessageChunk: function(messageChunk, messageSize)
    {
        this._dispatchOnInspectorFrontendAPI("dispatchMessageChunk", [messageChunk, messageSize]);
    },

    enterInspectElementMode: function()
    {
        this._dispatchOnInspectorFrontendAPI("enterInspectElementMode", []);
    },

    /**
     * @param {!Array.<!{fileSystemName: string, rootURL: string, fileSystemPath: string}>} fileSystems
     */
    fileSystemsLoaded: function(fileSystems)
    {
        this._dispatchOnInspectorFrontendAPI("fileSystemsLoaded", [fileSystems]);
    },

    /**
     * @param {string} fileSystemPath
     */
    fileSystemRemoved: function(fileSystemPath)
    {
        this._dispatchOnInspectorFrontendAPI("fileSystemRemoved", [fileSystemPath]);
    },

    /**
     * @param {string} errorMessage
     * @param {!{fileSystemName: string, rootURL: string, fileSystemPath: string}} fileSystem
     */
    fileSystemAdded: function(errorMessage, fileSystem)
    {
        this._dispatchOnInspectorFrontendAPI("fileSystemAdded", [errorMessage, fileSystem]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {number} totalWork
     */
    indexingTotalWorkCalculated: function(requestId, fileSystemPath, totalWork)
    {
        this._dispatchOnInspectorFrontendAPI("indexingTotalWorkCalculated", [requestId, fileSystemPath, totalWork]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {number} worked
     */
    indexingWorked: function(requestId, fileSystemPath, worked)
    {
        this._dispatchOnInspectorFrontendAPI("indexingWorked", [requestId, fileSystemPath, worked]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     */
    indexingDone: function(requestId, fileSystemPath)
    {
        this._dispatchOnInspectorFrontendAPI("indexingDone", [requestId, fileSystemPath]);
    },

    /**
     * @param {{type: string, keyIdentifier: string, keyCode: number, modifiers: number}} event
     */
    keyEventUnhandled: function(event)
    {
        this._dispatchOnInspectorFrontendAPI("keyEventUnhandled", [event]);
    },

    /**
     * @param {string} url
     * @param {number} lineNumber
     * @param {number} columnNumber
     */
    revealSourceLine: function(url, lineNumber, columnNumber)
    {
        this._dispatchOnInspectorFrontendAPI("revealSourceLine", [url, lineNumber, columnNumber]);
    },

    /**
     * @param {string} url
     */
    savedURL: function(url)
    {
        this._dispatchOnInspectorFrontendAPI("savedURL", [url]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {!Array.<string>} files
     */
    searchCompleted: function(requestId, fileSystemPath, files)
    {
        this._dispatchOnInspectorFrontendAPI("searchCompleted", [requestId, fileSystemPath, files]);
    },

    /**
     * @param {string} tabId
     */
    setInspectedTabId: function(tabId)
    {
        /**
         * @param {!Window} inspectorWindow
         */
        function dispatch(inspectorWindow)
        {
            // Support for legacy front-ends (<M41).
            if (inspectorWindow["WebInspector"].setInspectedTabId)
                inspectorWindow["WebInspector"].setInspectedTabId(tabId);
            else
                inspectorWindow["InspectorFrontendAPI"].setInspectedTabId(tabId);
        }

        this._dispatchOnInspectorWindow(dispatch);
    },

    /**
     * @param {string} backgroundColor
     * @param {string} color
     */
    setToolbarColors: function(backgroundColor, color)
    {
        this._dispatchOnInspectorFrontendAPI("setToolbarColors", [backgroundColor, color]);
    },

    /**
     * @param {boolean} useSoftMenu
     */
    setUseSoftMenu: function(useSoftMenu)
    {
        this._dispatchOnInspectorFrontendAPI("setUseSoftMenu", [useSoftMenu]);
    },

    showConsole: function()
    {
        this._dispatchOnInspectorFrontendAPI("showConsole", []);
    },

    /**
     * @param {number} id
     * @param {string} chunk
     */
    streamWrite: function(id, chunk)
    {
        this._dispatchOnInspectorFrontendAPI("streamWrite", [id, chunk]);
    }
}

var DevToolsAPI = new DevToolsAPIImpl();


// InspectorFrontendHostImpl --------------------------------------------------

/**
 * @constructor
 * @implements {InspectorFrontendHostAPI}
 */
function InspectorFrontendHostImpl()
{
}

InspectorFrontendHostImpl.prototype = {
    /**
     * @override
     * @return {string}
     */
    getSelectionBackgroundColor: function()
    {
        return DevToolsHost.getSelectionBackgroundColor();
    },

    /**
     * @override
     * @return {string}
     */
    getSelectionForegroundColor: function()
    {
        return DevToolsHost.getSelectionForegroundColor();
    },

    /**
     * @override
     * @return {string}
     */
    platform: function()
    {
        return DevToolsHost.platform();
    },

    /**
     * @override
     */
    loadCompleted: function()
    {
        DevToolsAPI.sendMessageToEmbedder("loadCompleted", [], null);
    },

    /**
     * @override
     */
    bringToFront: function()
    {
        DevToolsAPI.sendMessageToEmbedder("bringToFront", [], null);
    },

    /**
     * @override
     */
    closeWindow: function()
    {
        DevToolsAPI.sendMessageToEmbedder("closeWindow", [], null);
    },

    /**
     * @override
     * @param {boolean} isDocked
     * @param {function()} callback
     */
    setIsDocked: function(isDocked, callback)
    {
        DevToolsAPI.sendMessageToEmbedder("setIsDocked", [isDocked], callback);
    },

    /**
     * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
     * @override
     * @param {{x: number, y: number, width: number, height: number}} bounds
     */
    setInspectedPageBounds: function(bounds)
    {
        DevToolsAPI.sendMessageToEmbedder("setInspectedPageBounds", [bounds], null);
    },

    /**
     * @override
     */
    inspectElementCompleted: function()
    {
        DevToolsAPI.sendMessageToEmbedder("inspectElementCompleted", [], null);
    },

    /**
     * @override
     * @param {string} url
     * @param {string} headers
     * @param {number} streamId
     * @param {function(!InspectorFrontendHostAPI.LoadNetworkResourceResult)} callback
     */
    loadNetworkResource: function(url, headers, streamId, callback)
    {
        DevToolsAPI.sendMessageToEmbedder("loadNetworkResource", [url, headers, streamId], /** @type {function(?Object)} */ (callback));
    },

    /**
     * @override
     * @param {function(!Object<string, string>)} callback
     */
    getPreferences: function(callback)
    {
        DevToolsAPI.sendMessageToEmbedder("getPreferences", [], /** @type {function(?Object)} */ (callback));
    },

    /**
     * @override
     * @param {string} name
     * @param {string} value
     */
    setPreference: function(name, value)
    {
        DevToolsAPI.sendMessageToEmbedder("setPreference", [name, value], null);
    },

    /**
     * @override
     * @param {string} name
     */
    removePreference: function(name)
    {
        DevToolsAPI.sendMessageToEmbedder("removePreference", [name], null);
    },

    /**
     * @override
     */
    clearPreferences: function()
    {
        DevToolsAPI.sendMessageToEmbedder("clearPreferences", [], null);
    },

    /**
     * @override
     * @param {string} origin
     * @param {string} script
     */
    setInjectedScriptForOrigin: function(origin, script)
    {
        DevToolsHost.setInjectedScriptForOrigin(origin, script);
    },

    /**
     * @override
     * @param {string} url
     */
    inspectedURLChanged: function(url)
    {
        DevToolsAPI.sendMessageToEmbedder("inspectedURLChanged", [url], null);
    },

    /**
     * @override
     * @param {string} text
     */
    copyText: function(text)
    {
        DevToolsHost.copyText(text);
    },

    /**
     * @override
     * @param {string} url
     */
    openInNewTab: function(url)
    {
        DevToolsAPI.sendMessageToEmbedder("openInNewTab", [url], null);
    },

    /**
     * @override
     * @param {string} url
     * @param {string} content
     * @param {boolean} forceSaveAs
     */
    save: function(url, content, forceSaveAs)
    {
        DevToolsAPI.sendMessageToEmbedder("save", [url, content, forceSaveAs], null);
    },

    /**
     * @override
     * @param {string} url
     * @param {string} content
     */
    append: function(url, content)
    {
        DevToolsAPI.sendMessageToEmbedder("append", [url, content], null);
    },

    /**
     * @override
     * @param {string} message
     */
    sendMessageToBackend: function(message)
    {
        DevToolsHost.sendMessageToBackend(message);
    },

    /**
     * @override
     * @param {string} actionName
     * @param {number} actionCode
     * @param {number} bucketSize
     */
    recordEnumeratedHistogram: function(actionName, actionCode, bucketSize)
    {
        DevToolsAPI.sendMessageToEmbedder("recordEnumeratedHistogram", [actionName, actionCode, bucketSize], null);
    },

    /**
     * @override
     */
    requestFileSystems: function()
    {
        DevToolsAPI.sendMessageToEmbedder("requestFileSystems", [], null);
    },

    /**
     * @override
     */
    addFileSystem: function()
    {
        DevToolsAPI.sendMessageToEmbedder("addFileSystem", [], null);
    },

    /**
     * @override
     * @param {string} fileSystemPath
     */
    removeFileSystem: function(fileSystemPath)
    {
        DevToolsAPI.sendMessageToEmbedder("removeFileSystem", [fileSystemPath], null);
    },

    /**
     * @override
     * @param {string} fileSystemId
     * @param {string} registeredName
     * @return {?DOMFileSystem}
     */
    isolatedFileSystem: function(fileSystemId, registeredName)
    {
        return DevToolsHost.isolatedFileSystem(fileSystemId, registeredName);
    },

    /**
     * @override
     * @param {!FileSystem} fileSystem
     */
    upgradeDraggedFileSystemPermissions: function(fileSystem)
    {
        DevToolsHost.upgradeDraggedFileSystemPermissions(fileSystem);
    },

    /**
     * @override
     * @param {number} requestId
     * @param {string} fileSystemPath
     */
    indexPath: function(requestId, fileSystemPath)
    {
        DevToolsAPI.sendMessageToEmbedder("indexPath", [requestId, fileSystemPath], null);
    },

    /**
     * @override
     * @param {number} requestId
     */
    stopIndexing: function(requestId)
    {
        DevToolsAPI.sendMessageToEmbedder("stopIndexing", [requestId], null);
    },

    /**
     * @override
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {string} query
     */
    searchInPath: function(requestId, fileSystemPath, query)
    {
        DevToolsAPI.sendMessageToEmbedder("searchInPath", [requestId, fileSystemPath, query], null);
    },

    /**
     * @override
     * @return {number}
     */
    zoomFactor: function()
    {
        return DevToolsHost.zoomFactor();
    },

    /**
     * @override
     */
    zoomIn: function()
    {
        DevToolsAPI.sendMessageToEmbedder("zoomIn", [], null);
    },

    /**
     * @override
     */
    zoomOut: function()
    {
        DevToolsAPI.sendMessageToEmbedder("zoomOut", [], null);
    },

    /**
     * @override
     */
    resetZoom: function()
    {
        DevToolsAPI.sendMessageToEmbedder("resetZoom", [], null);
    },

    /**
     * @override
     * @param {string} shortcuts
     */
    setWhitelistedShortcuts: function(shortcuts)
    {
        DevToolsAPI.sendMessageToEmbedder("setWhitelistedShortcuts", [shortcuts], null);
    },

    /**
     * @override
     * @return {boolean}
     */
    isUnderTest: function()
    {
        return DevToolsHost.isUnderTest();
    },

    /**
     * @override
     * @param {boolean} enabled
     */
    setDevicesUpdatesEnabled: function(enabled)
    {
        DevToolsAPI.sendMessageToEmbedder("setDevicesUpdatesEnabled", [enabled], null);
    },

    /**
     * @override
     * @param {number} x
     * @param {number} y
     * @param {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} items
     * @param {!Document} document
     */
    showContextMenuAtPoint: function(x, y, items, document)
    {
        DevToolsHost.showContextMenuAtPoint(x, y, items, document);
    },

    /**
     * @override
     * @return {boolean}
     */
    isHostedMode: function()
    {
        return DevToolsHost.isHostedMode();
    },

    // Backward-compatible methods below this line --------------------------------------------

    /**
     * Support for legacy front-ends (<M41).
     * @return {string}
     */
    port: function()
    {
        return "unknown";
    },

    /**
     * Support for legacy front-ends (<M38).
     * @param {number} zoomFactor
     */
    setZoomFactor: function(zoomFactor)
    {
    },

    /**
     * Support for legacy front-ends (<M34).
     */
    sendMessageToEmbedder: function()
    {
    },

    /**
     * Support for legacy front-ends (<M34).
     * @param {string} dockSide
     */
    requestSetDockSide: function(dockSide)
    {
        DevToolsAPI.sendMessageToEmbedder("setIsDocked", [dockSide !== "undocked"], null);
    },

    /**
     * Support for legacy front-ends (<M34).
     * @return {boolean}
     */
    supportsFileSystems: function()
    {
        return true;
    },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canInspectWorkers: function()
    {
        return true;
    },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canSaveAs: function()
    {
        return true;
    },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canSave: function()
    {
        return true;
    },

    /**
     * Support for legacy front-ends (<M28).
     */
    loaded: function()
    {
    },

    /**
     * Support for legacy front-ends (<M28).
     * @return {string}
     */
    hiddenPanels: function()
    {
        return "";
    },

    /**
     * Support for legacy front-ends (<M28).
     * @return {string}
     */
    localizedStringsURL: function()
    {
        return "";
    },

    /**
     * Support for legacy front-ends (<M28).
     * @param {string} url
     */
    close: function(url)
    {
    },

    /**
     * Support for legacy front-ends (<M44).
     * @param {number} actionCode
     */
    recordActionTaken: function(actionCode)
    {
        this.recordEnumeratedHistogram("DevTools.ActionTaken", actionCode, 100);
    },

    /**
     * Support for legacy front-ends (<M44).
     * @param {number} panelCode
     */
    recordPanelShown: function(panelCode)
    {
        this.recordEnumeratedHistogram("DevTools.PanelShown", panelCode, 20);
    }
}


// DevToolsApp ---------------------------------------------------------------

/**
 * @constructor
 * @suppressGlobalPropertiesCheck
 */
function DevToolsApp()
{
    this._iframe = document.getElementById("inspector-app-iframe");
    this._inspectorFrontendHostImpl = new InspectorFrontendHostImpl();

    /**
     * @type {!Window}
     */
    this._inspectorWindow = this._iframe.contentWindow;
    this._inspectorWindow.InspectorFrontendHost = this._inspectorFrontendHostImpl;
    DevToolsAPI.setInspectorWindow(this._inspectorWindow);

    this._iframe.focus();
    this._iframe.addEventListener("load", this._onIframeLoad.bind(this), false);
}

DevToolsApp.prototype = {
    _onIframeLoad: function()
    {
        /**
         * @this {CSSStyleDeclaration}
         */
        function getValue(property)
        {
            // Note that |property| comes from another context, so we can't use === here.
            if (property == "padding-left") {
                return {
                    /**
                     * @suppressReceiverCheck
                     * @this {Object}
                     */
                    getFloatValue: function() { return this.__paddingLeft; },
                    __paddingLeft: parseFloat(this.paddingLeft)
                };
            }
            throw new Error("getPropertyCSSValue is undefined");
        }

        // Support for legacy (<M41) frontends. Remove in M45.
        this._iframe.contentWindow.CSSStyleDeclaration.prototype.getPropertyCSSValue = getValue;
        this._iframe.contentWindow.CSSPrimitiveValue = { CSS_PX: "CSS_PX" };

        // Support for legacy (<M44) frontends. Remove in M48.
        var styleElement = this._iframe.contentWindow.document.createElement("style");
        styleElement.type = "text/css";
        styleElement.textContent = "html /deep/ * { min-width: 0; min-height: 0; }";
        this._iframe.contentWindow.document.head.appendChild(styleElement);
    }
};

(
/**
 * @suppressGlobalPropertiesCheck
 */
function()
{
    function run()
    {
        new DevToolsApp();
    }

    /**
     * @suppressGlobalPropertiesCheck
     */
    function windowLoaded()
    {
        window.removeEventListener("DOMContentLoaded", windowLoaded, false);
        run();
    }

    if (document.readyState === "complete" || document.readyState === "interactive")
        run();
    else
        window.addEventListener("DOMContentLoaded", windowLoaded, false);
})();


// UITests ------------------------------------------------------------------

if (window.domAutomationController) {
    var uiTests = {};

    uiTests._tryRun = function()
    {
        if (uiTests._testSuite && uiTests._pendingTestName) {
            var name = uiTests._pendingTestName;
            delete uiTests._pendingTestName;
            uiTests._testSuite.runTest(name);
        }
    }

    uiTests.runTest = function(name)
    {
        uiTests._pendingTestName = name;
        uiTests._tryRun();
    };

    uiTests.testSuiteReady = function(testSuiteConstructor, testBase)
    {
        uiTests._testSuite = testSuiteConstructor(window.domAutomationController);
        uiTests._tryRun();
    };
}
