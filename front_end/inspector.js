/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var WebInspector = {
    _registerModules: function()
    {
        var configuration;
        if (WebInspector.isWorkerFrontend()) {
            configuration = ["sources", "timeline", "profiles", "console", "codemirror"];
        } else {
            configuration = ["elements", "network", "sources", "timeline", "profiles", "resources", "audits", "console", "codemirror", "extensions", "sources-formatter-actions"];
            if (WebInspector.experimentsSettings.layersPanel.isEnabled())
                configuration.push("layers");
        }
        WebInspector.moduleManager.registerModules(configuration);
    },

    _createGlobalStatusBarItems: function()
    {
        if (this.inspectElementModeController)
            this.inspectorView.appendToLeftToolbar(this.inspectElementModeController.toggleSearchButton.element);

        this.inspectorView.appendToRightToolbar(this.settingsController.statusBarItem);
        if (this.dockController.element)
            this.inspectorView.appendToRightToolbar(this.dockController.element);

        if (this._screencastController)
            this.inspectorView.appendToRightToolbar(this._screencastController.statusBarItem());
    },

    _createRootView: function()
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, WebInspector.queryParamsObject["can_dock"] ? "InspectorView.splitViewState" : "InspectorView.dummySplitViewState", 300, 300, true);
        this._rootSplitView.show(rootView.element);
        this._rootSplitView.setSidebarElementConstraints(180, 50);
        this._rootSplitView.setMainElementConstraints(WebInspector.InspectedPagePlaceholder.Constraints.Width, WebInspector.InspectedPagePlaceholder.Constraints.Height);

        this.inspectorView.show(this._rootSplitView.sidebarElement());

        var inspectedPagePlaceholder = new WebInspector.InspectedPagePlaceholder();
        inspectedPagePlaceholder.show(this._rootSplitView.mainElement());

        this.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateRootSplitViewOnDockSideChange, this);
        this._updateRootSplitViewOnDockSideChange();

        rootView.show(document.body);
    },

    _updateRootSplitViewOnDockSideChange: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide === WebInspector.DockController.State.Undocked) {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(this.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }

        this._rootSplitView.setVertical(dockSide === WebInspector.DockController.State.DockedToLeft || dockSide === WebInspector.DockController.State.DockedToRight);
        this._rootSplitView.setSecondIsSidebar(dockSide === WebInspector.DockController.State.DockedToRight || dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(this.inspectorView.topResizerElement(), dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.showBoth();
    },

    /**
     * @return {boolean}
     */
    isInspectingDevice: function()
    {
        return !!WebInspector.queryParamsObject["remoteFrontend"];
    },

    /**
     * @return {boolean}
     */
    isDedicatedWorkerFrontend: function()
    {
        return !!WebInspector.queryParamsObject["dedicatedWorkerId"];
    },

    _calculateWorkerInspectorTitle: function()
    {
        var expression = "location.href";
        if (WebInspector.queryParamsObject["isSharedWorker"])
            expression += " + (this.name ? ' (' + this.name + ')' : '')";
        RuntimeAgent.invoke_evaluate({expression:expression, doNotPauseOnExceptionsAndMuteConsole:true, returnByValue: true}, evalCallback.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {boolean=} wasThrown
         */
        function evalCallback(error, result, wasThrown)
        {
            if (error || wasThrown) {
                console.error(error);
                return;
            }
            InspectorFrontendHost.inspectedURLChanged(result.value);
        }
    },

    _initializeDedicatedWorkerFrontend: function(workerId)
    {
        function receiveMessage(event)
        {
            var message = event.data;
            InspectorBackend.connection().dispatch(message);
        }
        window.addEventListener("message", receiveMessage, true);
    },

    _loadCompletedForWorkers: function()
    {
        // Make sure script execution of dedicated worker is resumed and then paused
        // on the first script statement in case we autoattached to it.
        if (WebInspector.queryParamsObject["workerPaused"]) {
            DebuggerAgent.pause();
            RuntimeAgent.run(calculateTitle);
        } else if (WebInspector.isWorkerFrontend())
            calculateTitle();

        function calculateTitle()
        {
            WebInspector._calculateWorkerInspectorTitle();
        }
    },

    /**
     * @return {boolean}
     */
    isWorkerFrontend: function()
    {
        return !!WebInspector.queryParamsObject["dedicatedWorkerId"] ||
                !!WebInspector.queryParamsObject["isSharedWorker"];
    },

    _resetErrorAndWarningCounts: function()
    {
        WebInspector.inspectorView.setErrorAndWarningCounts(0, 0);
    },

    _updateErrorAndWarningCounts: function()
    {
        var errors = WebInspector.console.errors;
        var warnings = WebInspector.console.warnings;
        WebInspector.inspectorView.setErrorAndWarningCounts(errors, warnings);
    },

    inspectedPageDomain: function()
    {
        var parsedURL = WebInspector.inspectedPageURL && WebInspector.inspectedPageURL.asParsedURL();
        return parsedURL ? parsedURL.host : "";
    },

    _debuggerPaused: function()
    {
        this.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        WebInspector.inspectorView.showPanel("sources");
    }
}

WebInspector.Events = {
    InspectorLoaded: "InspectorLoaded"
}

{(function parseQueryParameters()
{
    WebInspector.queryParamsObject = {};
    var queryParams = window.location.search;
    if (!queryParams)
        return;
    var params = queryParams.substring(1).split("&");
    for (var i = 0; i < params.length; ++i) {
        var pair = params[i].split("=");
        WebInspector.queryParamsObject[pair[0]] = pair[1];
    }

    // Patch settings from the URL param (for tests).
    var settingsParam = WebInspector.queryParamsObject["settings"];
    if (settingsParam) {
        try {
            var settings = JSON.parse(window.decodeURI(settingsParam));
            for (var key in settings)
                localStorage[key] = settings[key];
        } catch(e) {
            // Ignore malformed settings.
        }
    }
})();}

WebInspector.suggestReload = function()
{
    if (window.confirm(WebInspector.UIString("It is recommended to restart inspector after making these changes. Would you like to restart it?")))
        this.reload();
}

WebInspector.reload = function()
{
    InspectorAgent.reset();
    window.location.reload();
}

WebInspector.loaded = function()
{
    if (!InspectorFrontendHost.sendMessageToEmbedder) {
        var helpScreen = new WebInspector.HelpScreen(WebInspector.UIString("Incompatible Chrome version"));
        var p = helpScreen.contentElement.createChild("p", "help-section");
        p.textContent = WebInspector.UIString("Please upgrade to a newer Chrome version (you might need a Dev or Canary build).");
        helpScreen.showModal();
        return;
    }

    InspectorBackend.loadFromJSONIfNeeded("../protocol.json");
    WebInspector.dockController = new WebInspector.DockController();

    if (WebInspector.isDedicatedWorkerFrontend()) {
        // Do not create socket for the worker front-end.
        WebInspector.doLoadedDone();
        return;
    }

    var ws;
    if ("ws" in WebInspector.queryParamsObject)
        ws = "ws://" + WebInspector.queryParamsObject.ws;
    else if ("page" in WebInspector.queryParamsObject) {
        var page = WebInspector.queryParamsObject.page;
        var host = "host" in WebInspector.queryParamsObject ? WebInspector.queryParamsObject.host : window.location.host;
        ws = "ws://" + host + "/devtools/page/" + page;
    }

    if (ws) {
        WebInspector.socket = new WebSocket(ws);
        WebInspector.socket.onmessage = function(message) { InspectorBackend.connection().dispatch(message.data); }
        WebInspector.socket.onerror = function(error) { console.error(error); }
        WebInspector.socket.onopen = function() {
            InspectorFrontendHost.sendMessageToBackend = WebInspector.socket.send.bind(WebInspector.socket);
            WebInspector.doLoadedDone();
        }
        WebInspector.socket.onclose = function() {
            if (!WebInspector.socket._detachReason)
                (new WebInspector.RemoteDebuggingTerminatedScreen("websocket_closed")).showModal();
        }
        return;
    }

    WebInspector.doLoadedDone();

    if (InspectorFrontendHost.isStub)
        InspectorFrontendAPI.dispatchQueryParameters(WebInspector.queryParamsObject);
}

WebInspector.doLoadedDone = function()
{
    // Install styles and themes
    WebInspector.installPortStyles();
    if (WebInspector.socket)
        document.body.classList.add("remote");

    if (WebInspector.queryParamsObject.toolbarColor && WebInspector.queryParamsObject.textColor)
        WebInspector.setToolbarColors(WebInspector.queryParamsObject.toolbarColor, WebInspector.queryParamsObject.textColor);

    var workerId = WebInspector.queryParamsObject["dedicatedWorkerId"];
    if (workerId)
        this._initializeDedicatedWorkerFrontend(workerId);

    var connection = workerId ? new WebInspector.WorkerConnection(workerId) : new InspectorBackendClass.MainConnection();
    InspectorBackend.setConnection(connection);

    WebInspector.targetManager = new WebInspector.TargetManager();
    WebInspector.targetManager.createTarget(connection, WebInspector._doLoadedDoneWithCapabilities.bind(WebInspector));
}

WebInspector._doLoadedDoneWithCapabilities = function(mainTarget)
{
    new WebInspector.VersionController().updateVersion();
    WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
    this._registerShortcuts();

    // set order of some sections explicitly
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));
    WebInspector.ShortcutsScreen.registerShortcuts();

    this.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._resetErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.RepeatCountUpdated, this._updateErrorAndWarningCounts, this);

    this.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    this.networkLog = new WebInspector.NetworkLog();

    this.zoomManager = new WebInspector.ZoomManager();

    this.advancedSearchController = new WebInspector.AdvancedSearchController();

    InspectorBackend.registerInspectorDispatcher(this);

    this.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
    this.isolatedFileSystemDispatcher = new WebInspector.IsolatedFileSystemDispatcher(this.isolatedFileSystemManager);
    this.workspace = new WebInspector.Workspace(this.isolatedFileSystemManager.mapping());

    this.cssModel = new WebInspector.CSSStyleModel(this.workspace);
    this.timelineManager = new WebInspector.TimelineManager();
    this.tracingAgent = new WebInspector.TracingAgent();

    if (!WebInspector.isWorkerFrontend()) {
        this.inspectElementModeController = new WebInspector.InspectElementModeController();
        this.workerFrontendManager = new WebInspector.WorkerFrontendManager();
    }

    this.settingsController = new WebInspector.SettingsController();

    this.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();

    var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
    var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
    this.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
    this.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });
    WebInspector.Linkifier.setLinkHandler(new WebInspector.HandlerRegistry.LinkHandler());

    new WebInspector.WorkspaceController(this.workspace);

    this.fileSystemWorkspaceProvider = new WebInspector.FileSystemWorkspaceProvider(this.isolatedFileSystemManager, this.workspace);

    this.networkWorkspaceProvider = new WebInspector.SimpleWorkspaceProvider(this.workspace, WebInspector.projectTypes.Network);
    new WebInspector.NetworkUISourceCodeProvider(this.networkWorkspaceProvider, this.workspace);

    this.breakpointManager = new WebInspector.BreakpointManager(WebInspector.settings.breakpoints, this.debuggerModel, this.workspace);

    this.scriptSnippetModel = new WebInspector.ScriptSnippetModel(this.workspace);

    this.overridesSupport = new WebInspector.OverridesSupport();
    this.overridesSupport.applyInitialOverrides();

    new WebInspector.DebuggerScriptMapping(this.debuggerModel, this.workspace, this.networkWorkspaceProvider);
    this.liveEditSupport = new WebInspector.LiveEditSupport(this.workspace);
    new WebInspector.CSSStyleSheetMapping(this.cssModel, this.workspace, this.networkWorkspaceProvider);
    new WebInspector.PresentationConsoleMessageHelper(this.workspace);

    // Create settings before loading modules.
    WebInspector.settings.initializeBackendSettings();

    this._registerModules();

    this.panels = {};
    this.inspectorView = new WebInspector.InspectorView();
    // Screencast controller creates a root view itself.
    if (mainTarget.canScreencast)
        this._screencastController = new WebInspector.ScreencastController();
    else
        this._createRootView();
    this._createGlobalStatusBarItems();

    this.addMainEventListeners(document);

    window.addEventListener("resize", this.windowResize.bind(this), true);

    var errorWarningCount = document.getElementById("error-warning-count");

    function showConsole()
    {
        WebInspector.console.show();
    }
    errorWarningCount.addEventListener("click", showConsole, false);
    this._updateErrorAndWarningCounts();

    WebInspector.extensionServerProxy.setFrontendReady();

    this.console.enableAgent();

    this.databaseModel = new WebInspector.DatabaseModel();
    this.domStorageModel = new WebInspector.DOMStorageModel();
    this.cpuProfilerModel = new WebInspector.CPUProfilerModel();

    InspectorAgent.enable(inspectorAgentEnableCallback.bind(this));
    /**
     * @this {WebInspector}
     */
    function inspectorAgentEnableCallback()
    {
        WebInspector.inspectorView.showInitialPanel();

        if (WebInspector.overridesSupport.hasActiveOverrides()) {
            if (!WebInspector.settings.showEmulationViewInDrawer.get())
                WebInspector.settings.showEmulationViewInDrawer.set(true);
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
        }

        if (WebInspector.settings.showPaintRects.get() || WebInspector.settings.showDebugBorders.get() || WebInspector.settings.continuousPainting.get() ||
                WebInspector.settings.showFPSCounter.get() || WebInspector.settings.showScrollBottleneckRects.get()) {
            WebInspector.settings.showRenderingViewInDrawer.set(true);
        }

        WebInspector.settings.showMetricsRulers.addChangeListener(showRulersChanged);
        function showRulersChanged()
        {
            PageAgent.setShowViewportSizeOnResize(true, WebInspector.settings.showMetricsRulers.get());
        }
        showRulersChanged();

        if (this._screencastController)
            this._screencastController.initialize();
    }

    this._loadCompletedForWorkers();
    InspectorFrontendAPI.loadCompleted();
    WebInspector.notifications.dispatchEventToListeners(WebInspector.Events.InspectorLoaded);
}

var windowLoaded = function()
{
    WebInspector.loaded();
    window.removeEventListener("DOMContentLoaded", windowLoaded, false);
    delete windowLoaded;
};

window.addEventListener("DOMContentLoaded", windowLoaded, false);

WebInspector.windowResize = function(event)
{
    if (WebInspector.settingsController)
        WebInspector.settingsController.resize();
}

WebInspector.documentClick = function(event)
{
    var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
    if (!anchor || !anchor.href || (anchor.target === "_blank"))
        return;

    // Prevent the link from navigating, since we don't do any navigation by following links normally.
    event.consume(true);

    function followLink()
    {
        if (WebInspector.isBeingEdited(event.target))
            return;
        if (WebInspector.openAnchorLocationRegistry.dispatch({ url: anchor.href, lineNumber: anchor.lineNumber}))
            return;

        var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(anchor.href);
        if (uiSourceCode) {
            WebInspector.Revealer.reveal(new WebInspector.UILocation(uiSourceCode, anchor.lineNumber || 0, anchor.columnNumber || 0));
            return;
        }

        var resource = WebInspector.resourceForURL(anchor.href);
        if (resource) {
            WebInspector.Revealer.reveal(resource);
            return;
        }

        var request = WebInspector.networkLog.requestForURL(anchor.href);
        if (request) {
            WebInspector.Revealer.reveal(request);
            return;
        }
        InspectorFrontendHost.openInNewTab(anchor.href);
    }

    if (WebInspector.followLinkTimeout)
        clearTimeout(WebInspector.followLinkTimeout);

    if (anchor.preventFollowOnDoubleClick) {
        // Start a timeout if this is the first click, if the timeout is canceled
        // before it fires, then a double clicked happened or another link was clicked.
        if (event.detail === 1)
            WebInspector.followLinkTimeout = setTimeout(followLink, 333);
        return;
    }

    followLink();
}

WebInspector._registerShortcuts = function()
{
    var shortcut = WebInspector.KeyboardShortcut;
    var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("All Panels"));
    var keys = [
        shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta),
        shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta)
    ];
    section.addRelatedKeys(keys, WebInspector.UIString("Go to the panel to the left/right"));

    keys = [
        shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt),
        shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt)
    ];
    section.addRelatedKeys(keys, WebInspector.UIString("Go back/forward in panel history"));

    var toggleConsoleLabel = WebInspector.UIString("Show console");
    section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tilde, shortcut.Modifiers.Ctrl), toggleConsoleLabel);
    var doNotOpenDrawerOnEsc = WebInspector.experimentsSettings.doNotOpenDrawerOnEsc.isEnabled();
    var toggleDrawerLabel = doNotOpenDrawerOnEsc ? WebInspector.UIString("Hide drawer") : WebInspector.UIString("Toggle drawer");
    section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), toggleDrawerLabel);
    section.addKey(shortcut.makeDescriptor("f", shortcut.Modifiers.CtrlOrMeta), WebInspector.UIString("Search"));

    var advancedSearchShortcut = WebInspector.AdvancedSearchController.createShortcut();
    section.addKey(advancedSearchShortcut, WebInspector.UIString("Search across all sources"));

    var inspectElementModeShortcut = WebInspector.InspectElementModeController.createShortcut();
    section.addKey(inspectElementModeShortcut, WebInspector.UIString("Select node to inspect"));

    var openResourceShortcut = WebInspector.KeyboardShortcut.makeDescriptor("o", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta);
    section.addKey(openResourceShortcut, WebInspector.UIString("Go to source"));

    if (WebInspector.isMac()) {
        keys = [
            shortcut.makeDescriptor("g", shortcut.Modifiers.Meta),
            shortcut.makeDescriptor("g", shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)
        ];
        section.addRelatedKeys(keys, WebInspector.UIString("Find next/previous"));
    }

    var goToShortcut = WebInspector.GoToLineDialog.createShortcut();
    section.addKey(goToShortcut, WebInspector.UIString("Go to line"));

    keys = [
        shortcut.Keys.F1,
        shortcut.makeDescriptor("?")
    ];
    section.addAlternateKeys(keys, WebInspector.UIString("Show general settings"));
}

WebInspector.handleZoomEvent = function(event)
{
    switch (event.keyCode) {
    case 107: // +
    case 187: // +
        InspectorFrontendHost.zoomIn();
        return true;
    case 109: // -
    case 189: // -
        InspectorFrontendHost.zoomOut();
        return true;
    case 48: // 0
    case 96: // Numpad 0
        // Zoom reset shortcut does not allow "Shift" when handled by the browser.
        if (!event.shiftKey) {
            InspectorFrontendHost.resetZoom();
            return true;
        }
        break;
    }
    return false;
};

WebInspector.postDocumentKeyDown = function(event)
{
    if (event.handled)
        return;

    if (WebInspector.inspectorView.currentPanel()) {
        WebInspector.inspectorView.currentPanel().handleShortcut(event);
        if (event.handled) {
            event.consume(true);
            return;
        }
    }

    if (WebInspector.advancedSearchController.handleShortcut(event))
        return;
    if (WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.handleShortcut(event))
        return;

    switch (event.keyIdentifier) {
        case "U+004F": // O key
        case "U+0050": // P key
            if (!event.shiftKey && !event.altKey && WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
                WebInspector.inspectorView.showPanel("sources").showGoToSourceDialog();
                event.consume(true);
            }
            break;
        case "U+0052": // R key
            if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
                WebInspector.debuggerModel.skipAllPauses(true, true);
                WebInspector.resourceTreeModel.reloadPage(event.shiftKey);
                event.consume(true);
            }
            if (window.DEBUG && event.altKey) {
                WebInspector.reload();
                return;
            }
            break;
        case "F5":
            if (!WebInspector.isMac()) {
                WebInspector.resourceTreeModel.reloadPage(event.ctrlKey || event.shiftKey);
                event.consume(true);
            }
            break;
    }

    var isValidZoomShortcut = WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) &&
        !event.altKey &&
        !InspectorFrontendHost.isStub;
    if (isValidZoomShortcut && WebInspector.handleZoomEvent(event)) {
        event.consume(true);
        return;
    }

    if (event.keyCode === WebInspector.KeyboardShortcut.Keys.F1.code ||
        (event.keyCode === WebInspector.KeyboardShortcut.Keys.QuestionMark.code && event.shiftKey && (!WebInspector.isBeingEdited(event.target) || event.metaKey))) {
        this.settingsController.showSettingsScreen(WebInspector.SettingsScreen.Tabs.General);
        event.consume(true);
        return;
    }

    var Esc = "U+001B";
    var doNotOpenDrawerOnEsc = WebInspector.experimentsSettings.doNotOpenDrawerOnEsc.isEnabled();
    if (event.keyIdentifier === Esc) {
        if (this.inspectorView.drawerVisible())
            this.inspectorView.closeDrawer();
        else if (!doNotOpenDrawerOnEsc)
            this.inspectorView.showDrawer();
    }

    if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Tilde.code && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey)
        WebInspector.console.show();
}

WebInspector.documentCanCopy = function(event)
{
    if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel().handleCopyEvent)
        event.preventDefault();
}

WebInspector.documentCopy = function(event)
{
    if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel().handleCopyEvent)
        WebInspector.inspectorView.currentPanel().handleCopyEvent(event);
}

WebInspector.contextMenuEventFired = function(event)
{
    if (event.handled || event.target.classList.contains("popup-glasspane"))
        event.preventDefault();
}

WebInspector.bringToFront = function()
{
    InspectorFrontendHost.bringToFront();
}

// Inspector.inspect protocol event
WebInspector.inspect = function(payload, hints)
{
    var object = WebInspector.RemoteObject.fromPayload(payload);
    if (object.subtype === "node") {

        object.pushNodeToFrontend(callback);
        var elementsPanel = /** @type {!WebInspector.ElementsPanel} */ (WebInspector.inspectorView.panel("elements"));
        elementsPanel.omitDefaultSelection();
        WebInspector.inspectorView.setCurrentPanel(elementsPanel);

        function callback(nodeId)
        {
            elementsPanel.stopOmittingDefaultSelection();
            WebInspector.Revealer.reveal(WebInspector.domAgent.nodeForId(nodeId));
            InspectorFrontendHost.inspectElementCompleted();
            object.release();
        }

        return;
    }

    if (object.type === "function") {
        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.FunctionDetails} response
         */
        function didGetDetails(error, response)
        {
            object.release();

            if (error) {
                console.error(error);
                return;
            }

            var uiLocation = WebInspector.debuggerModel.rawLocationToUILocation(response.location);
            if (!uiLocation)
                return;

            /** @type {!WebInspector.SourcesPanel} */ (WebInspector.inspectorView.panel("sources")).showUILocation(uiLocation, true);
        }
        DebuggerAgent.getFunctionDetails(object.objectId, didGetDetails.bind(this));
        return;
    }

    if (hints.copyToClipboard)
        InspectorFrontendHost.copyText(object.value);
    object.release();
}

// Inspector.detached protocol event
WebInspector.detached = function(reason)
{
    WebInspector.socket._detachReason = reason;
    (new WebInspector.RemoteDebuggingTerminatedScreen(reason)).showModal();
}

WebInspector.targetCrashed = function()
{
    (new WebInspector.HelpScreenUntilReload(
        WebInspector.UIString("Inspected target crashed"),
        WebInspector.UIString("Inspected target has crashed. Once it reloads we will attach to it automatically."))).showModal();
}

WebInspector._inspectNodeRequested = function(event)
{
    WebInspector._updateFocusedNode(event.data);
}

WebInspector._updateFocusedNode = function(nodeId)
{
    if (WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.enabled()) {
        InspectorFrontendHost.bringToFront();
        WebInspector.inspectElementModeController.disable();
    }
    WebInspector.inspectorView.panel("elements").revealAndSelectNode(nodeId);
}

WebInspector.addMainEventListeners = function(doc)
{
    doc.addEventListener("keydown", this.postDocumentKeyDown.bind(this), false);
    doc.addEventListener("beforecopy", this.documentCanCopy.bind(this), true);
    doc.addEventListener("copy", this.documentCopy.bind(this), false);
    doc.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), true);
    doc.addEventListener("click", this.documentClick.bind(this), false);
}

WebInspector.fontFamily = function()
{
    if (WebInspector._fontFamily)
        return WebInspector._fontFamily;
    switch (WebInspector.platform()) {
    case "linux":
        this._fontFamily = "Ubuntu, Arial, sans-serif";
        break;
    case "mac":
        this._fontFamily = "'Lucida Grande', sans-serif";
        break;
    case "windows":
        this._fontFamily = "'Segoe UI', Tahoma, sans-serif";
        break;
    }
    return WebInspector._fontFamily;
}

window.DEBUG = true;
