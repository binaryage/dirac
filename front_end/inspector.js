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
    _panelDescriptors: function()
    {
        this.panels = {};
        WebInspector.inspectorView = new WebInspector.InspectorView();
        WebInspector.inspectorView.show(document.body);

        var elements = new WebInspector.ElementsPanelDescriptor();
        var network = new WebInspector.NetworkPanelDescriptor();
        var sources = new WebInspector.SourcesPanelDescriptor();
        var timeline = new WebInspector.TimelinePanelDescriptor();
        var profiles = new WebInspector.ProfilesPanelDescriptor();
        var resources = new WebInspector.PanelDescriptor("resources", WebInspector.UIString("Resources"), "ResourcesPanel", "ResourcesPanel.js");
        var audits = new WebInspector.PanelDescriptor("audits", WebInspector.UIString("Audits"), "AuditsPanel", "AuditsPanel.js");
        var console = new WebInspector.PanelDescriptor("console", WebInspector.UIString("Console"), "ConsolePanel");
        var allDescriptors = [elements, network, sources, timeline, profiles, resources, audits, console];
        if (WebInspector.experimentsSettings.layersPanel.isEnabled()) {
            var layers = new WebInspector.LayersPanelDescriptor();
            allDescriptors.push(layers);
        }
        var panelDescriptors = [];
        if (WebInspector.WorkerManager.isWorkerFrontend()) {
            panelDescriptors.push(sources);
            panelDescriptors.push(timeline);
            panelDescriptors.push(console);
            return panelDescriptors;
        }
        for (var i = 0; i < allDescriptors.length; ++i)
            panelDescriptors.push(allDescriptors[i]);
        return panelDescriptors;
    },

    _createGlobalStatusBarItems: function()
    {
        if (this.inspectElementModeController)
            this.inspectorView.appendToLeftToolbar(this.inspectElementModeController.toggleSearchButton.element);

        if (Capabilities.canScreencast) {
            this._toggleScreencastButton = new WebInspector.StatusBarButton(WebInspector.UIString("Toggle screencast."), "screencast-status-bar-item");
            this._toggleScreencastButton.addEventListener("click", this._toggleScreencastButtonClicked.bind(this, true), false);
            this.inspectorView.appendToLeftToolbar(this._toggleScreencastButton.element);
        }

        this.inspectorView.appendToRightToolbar(this.inspectorView.drawer().toggleButtonElement());

        this.inspectorView.appendToRightToolbar(this.settingsController.statusBarItem);
        if (!WebInspector.queryParamsObject["remoteFrontend"])
            this.inspectorView.appendToRightToolbar(this.dockController.element);
    },

    /**
     * @param {boolean} resizeWindow
     */
    _toggleScreencastButtonClicked: function(resizeWindow)
    {
        this._toggleScreencastButton.toggled = !this._toggleScreencastButton.toggled;
        WebInspector.settings.screencastEnabled.set(this._toggleScreencastButton.toggled);

        if (this._toggleScreencastButton.toggled) {
            if (!this._screencastView) {
                // Rebuild the UI upon first invocation.
                this._screencastView = new WebInspector.ScreencastView();
                this._screencastSplitView = new WebInspector.SplitView(true, WebInspector.settings.screencastSidebarWidth.name);
                this._screencastSplitView.markAsRoot();
                this._screencastSplitView.show(document.body);

                this._screencastView.show(this._screencastSplitView.firstElement());

                this.inspectorView.element.remove();
                this.inspectorView.show(this._screencastSplitView.secondElement());
            }

            var sidebarWidth = WebInspector.settings.screencastSidebarWidth.get();
            var currentWidth = document.body.offsetWidth;
            if (resizeWindow) {
                document.body.addStyleClass("hidden");
                InspectorFrontendHost.setWindowBounds(window.screenX - sidebarWidth, window.screenY, window.outerWidth + sidebarWidth, window.outerHeight, callback1.bind(this));
                function callback1(error)
                {
                    if (WebInspector.isMac() || WebInspector.isWin())
                        updateScreen.call(this);
                    else
                        setTimeout(updateScreen.bind(this), 100);  // callback from the browser is not enough.
                }

                function updateScreen()
                {
                    this._screencastSplitView.showBoth();
                    document.body.removeStyleClass("hidden");
                    this._screencastSplitView.setSidebarSize(currentWidth);
                }
            } else {
                this._screencastSplitView.setSidebarSize(sidebarWidth);
            }
        } else {
            WebInspector.settings.screencastSidebarWidth.set(this._screencastView.element.offsetWidth);
            var delta = this._screencastSplitView.element.offsetWidth - this.inspectorView.element.offsetWidth;
            InspectorFrontendHost.setWindowBounds(window.screenX + delta, window.screenY, window.outerWidth - delta, window.outerHeight, callback2.bind(this));
            function callback2(error)
            {
                this._screencastSplitView.showOnlySecond();
                document.body.removeStyleClass("hidden");
            }
        }
    },


    showConsole: function()
    {
        if (this.consoleView.isShowing() && !WebInspector.inspectorView.drawer().isHiding())
            return;
        this.inspectorView.showViewInDrawer("console");
    },

    _resetErrorAndWarningCounts: function()
    {
        var errorWarningElement = document.getElementById("error-warning-count");
        if (!errorWarningElement)
            return;

        errorWarningElement.addStyleClass("hidden");
    },

    _updateErrorAndWarningCounts: function()
    {
        var errors = WebInspector.console.errors;
        var warnings = WebInspector.console.warnings;

        if (!errors && !warnings) {
            this._resetErrorAndWarningCounts();
            return;
        }

        var errorWarningElement = document.getElementById("error-warning-count");
        if (!errorWarningElement)
            return;

        errorWarningElement.removeStyleClass("hidden");
        errorWarningElement.removeChildren();

        if (errors) {
            var errorImageElement = errorWarningElement.createChild("div", "error-icon-small");
            var errorElement = errorWarningElement.createChild("span");
            errorElement.id = "error-count";
            errorElement.textContent = errors;
        }

        if (warnings) {
            var warningsImageElement = errorWarningElement.createChild("div", "warning-icon-small");
            var warningsElement = errorWarningElement.createChild("span");
            warningsElement.id = "warning-count";
            warningsElement.textContent = warnings;
        }

        if (errors) {
            if (warnings) {
                if (errors == 1) {
                    if (warnings == 1)
                        errorWarningElement.title = WebInspector.UIString("%d error, %d warning", errors, warnings);
                    else
                        errorWarningElement.title = WebInspector.UIString("%d error, %d warnings", errors, warnings);
                } else if (warnings == 1)
                    errorWarningElement.title = WebInspector.UIString("%d errors, %d warning", errors, warnings);
                else
                    errorWarningElement.title = WebInspector.UIString("%d errors, %d warnings", errors, warnings);
            } else if (errors == 1)
                errorWarningElement.title = WebInspector.UIString("%d error", errors);
            else
                errorWarningElement.title = WebInspector.UIString("%d errors", errors);
        } else if (warnings == 1)
            errorWarningElement.title = WebInspector.UIString("%d warning", warnings);
        else if (warnings)
            errorWarningElement.title = WebInspector.UIString("%d warnings", warnings);
        else
            errorWarningElement.title = null;
    },

    get inspectedPageDomain()
    {
        var parsedURL = WebInspector.inspectedPageURL && WebInspector.inspectedPageURL.asParsedURL();
        return parsedURL ? parsedURL.host : "";
    },

    _initializeCapability: function(name, callback, error, result)
    {
        Capabilities[name] = result;
        if (callback)
            callback();
    },

    _zoomIn: function()
    {
        this._zoomLevel = Math.min(this._zoomLevel + 1, WebInspector.Zoom.Table.length - WebInspector.Zoom.DefaultOffset - 1);
        this._requestZoom();
    },

    _zoomOut: function()
    {
        this._zoomLevel = Math.max(this._zoomLevel - 1, -WebInspector.Zoom.DefaultOffset);
        this._requestZoom();
    },

    _resetZoom: function()
    {
        this._zoomLevel = 0;
        this._requestZoom();
    },

    _requestZoom: function()
    {
        WebInspector.settings.zoomLevel.set(this._zoomLevel);
        // For backwards compatibility, zoomLevel takes integers (with 0 being default zoom).
        var index = this._zoomLevel + WebInspector.Zoom.DefaultOffset;
        index = Math.min(WebInspector.Zoom.Table.length - 1, index);
        index = Math.max(0, index);
        InspectorFrontendHost.setZoomFactor(WebInspector.Zoom.Table[index]);
    },

    _debuggerPaused: function()
    {
        // Create sources panel upon demand.
        WebInspector.panel("sources");
    }
}

WebInspector.Events = {
    InspectorLoaded: "InspectorLoaded",
    InspectorClosing: "InspectorClosing"
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
})();}

WebInspector.suggestReload = function()
{
    if (window.confirm(WebInspector.UIString("It is recommended to restart inspector after making these changes. Would you like to restart it?")))
        this.reload();
}

WebInspector.reload = function()
{
    InspectorAgent.reset();

    var queryParams = window.location.search;
    var url = window.location.href;
    url = url.substring(0, url.length - queryParams.length);
    var queryParamsObject = {};
    for (var name in WebInspector.queryParamsObject)
        queryParamsObject[name] = WebInspector.queryParamsObject[name];
    if (this.dockController)
        queryParamsObject["dockSide"] = this.dockController.dockSide();
    var names = Object.keys(queryParamsObject);
    for (var i = 0; i < names.length; ++i)
        url += (i ? "&" : "?") + names[i] + "=" + queryParamsObject[names[i]];
    document.location = url;
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

    if (WebInspector.WorkerManager.isDedicatedWorkerFrontend()) {
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
        WebInspector.socket.onmessage = function(message) { InspectorBackend.dispatch(message.data); }
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

    // In case of loading as a web page with no bindings / harness, kick off initialization manually.
    if (InspectorFrontendHost.isStub) {
        InspectorFrontendAPI.dispatchQueryParameters(WebInspector.queryParamsObject);
        WebInspector._doLoadedDoneWithCapabilities();
    }
}

WebInspector.doLoadedDone = function()
{
    // Install styles and themes
    WebInspector.installPortStyles();
    if (WebInspector.socket)
        document.body.addStyleClass("remote");

    if (WebInspector.queryParamsObject.toolbarColor && WebInspector.queryParamsObject.textColor)
        WebInspector.setToolbarColors(WebInspector.queryParamsObject.toolbarColor, WebInspector.queryParamsObject.textColor);

    WebInspector.WorkerManager.loaded();

    PageAgent.canScreencast(WebInspector._initializeCapability.bind(WebInspector, "canScreencast", null));
    WorkerAgent.canInspectWorkers(WebInspector._initializeCapability.bind(WebInspector, "canInspectWorkers", WebInspector._doLoadedDoneWithCapabilities.bind(WebInspector)));
}

WebInspector._doLoadedDoneWithCapabilities = function()
{
    new WebInspector.VersionController().updateVersion();

    WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
    this._registerShortcuts();

    // set order of some sections explicitly
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
    WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));

    this.console = new WebInspector.ConsoleModel();
    this.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._resetErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);
    this.console.addEventListener(WebInspector.ConsoleModel.Events.RepeatCountUpdated, this._updateErrorAndWarningCounts, this);
    this.networkManager = new WebInspector.NetworkManager();
    this.resourceTreeModel = new WebInspector.ResourceTreeModel(this.networkManager);
    this.debuggerModel = new WebInspector.DebuggerModel();
    this.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    this.networkLog = new WebInspector.NetworkLog();
    this.domAgent = new WebInspector.DOMAgent();
    this.domAgent.addEventListener(WebInspector.DOMAgent.Events.InspectNodeRequested, this._inspectNodeRequested, this);
    this.runtimeModel = new WebInspector.RuntimeModel(this.resourceTreeModel);

    var panelDescriptors = this._panelDescriptors();
    this.advancedSearchController = new WebInspector.AdvancedSearchController();
    for (var i = 0; i < panelDescriptors.length; ++i)
        panelDescriptors[i].registerShortcuts();

    WebInspector.CSSMetadata.requestCSSShorthandData();

    this.consoleView = new WebInspector.ConsoleView(WebInspector.WorkerManager.isWorkerFrontend());

    InspectorBackend.registerInspectorDispatcher(this);

    this.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
    this.isolatedFileSystemDispatcher = new WebInspector.IsolatedFileSystemDispatcher(this.isolatedFileSystemManager);
    this.workspace = new WebInspector.Workspace(this.isolatedFileSystemManager.mapping());

    this.cssModel = new WebInspector.CSSStyleModel(this.workspace);
    this.timelineManager = new WebInspector.TimelineManager();
    this.profileManager = new WebInspector.ProfileManager();
    this.tracingAgent = new WebInspector.TracingAgent();

    this.searchController = new WebInspector.SearchController();
    if (!WebInspector.WorkerManager.isWorkerFrontend())
        this.inspectElementModeController = new WebInspector.InspectElementModeController();

    this.settingsController = new WebInspector.SettingsController();

    this.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();

    this._zoomLevel = WebInspector.settings.zoomLevel.get();
    if (this._zoomLevel)
        this._requestZoom();

    var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
    var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
    this.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
    this.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });

    this.workspaceController = new WebInspector.WorkspaceController(this.workspace);

    this.fileSystemWorkspaceProvider = new WebInspector.FileSystemWorkspaceProvider(this.isolatedFileSystemManager, this.workspace);

    this.networkWorkspaceProvider = new WebInspector.SimpleWorkspaceProvider(this.workspace, WebInspector.projectTypes.Network);
    new WebInspector.NetworkUISourceCodeProvider(this.networkWorkspaceProvider, this.workspace);

    this.breakpointManager = new WebInspector.BreakpointManager(WebInspector.settings.breakpoints, this.debuggerModel, this.workspace);

    this.scriptSnippetModel = new WebInspector.ScriptSnippetModel(this.workspace);

    new WebInspector.DebuggerScriptMapping(this.workspace, this.networkWorkspaceProvider);
    this.liveEditSupport = new WebInspector.LiveEditSupport(this.workspace);
    new WebInspector.CSSStyleSheetMapping(this.cssModel, this.workspace, this.networkWorkspaceProvider);
    new WebInspector.PresentationConsoleMessageHelper(this.workspace);

    this._createGlobalStatusBarItems();

    WebInspector.startBatchUpdate();
    for (var i = 0; i < panelDescriptors.length; ++i)
        WebInspector.inspectorView.addPanel(panelDescriptors[i]);
    WebInspector.endBatchUpdate();

    this.addMainEventListeners(document);

    window.addEventListener("resize", this.windowResize.bind(this), true);

    var errorWarningCount = document.getElementById("error-warning-count");
    errorWarningCount.addEventListener("click", this.showConsole.bind(this), false);
    this._updateErrorAndWarningCounts();

    this.extensionServer.initExtensions();

    this.console.enableAgent();

    function showInitialPanel()
    {
        if (!WebInspector.inspectorView.currentPanel())
            WebInspector.showPanel(WebInspector.settings.lastActivePanel.get());
    }

    InspectorAgent.enable(showInitialPanel);
    this.databaseModel = new WebInspector.DatabaseModel();
    this.domStorageModel = new WebInspector.DOMStorageModel();

    ProfilerAgent.enable();
    HeapProfilerAgent.enable();

    WebInspector.settings.forceCompositingMode = WebInspector.settings.createBackendSetting("forceCompositingMode", false, PageAgent.setForceCompositingMode.bind(PageAgent));
    WebInspector.settings.showPaintRects = WebInspector.settings.createBackendSetting("showPaintRects", false, PageAgent.setShowPaintRects.bind(PageAgent));
    WebInspector.settings.showDebugBorders = WebInspector.settings.createBackendSetting("showDebugBorders", false, PageAgent.setShowDebugBorders.bind(PageAgent));
    WebInspector.settings.continuousPainting = WebInspector.settings.createBackendSetting("continuousPainting", false, PageAgent.setContinuousPaintingEnabled.bind(PageAgent));
    WebInspector.settings.showFPSCounter = WebInspector.settings.createBackendSetting("showFPSCounter", false, PageAgent.setShowFPSCounter.bind(PageAgent));
    WebInspector.settings.showScrollBottleneckRects = WebInspector.settings.createBackendSetting("showScrollBottleneckRects", false, PageAgent.setShowScrollBottleneckRects.bind(PageAgent));

    WebInspector.settings.showMetricsRulers.addChangeListener(showRulersChanged);
    function showRulersChanged()
    {
        PageAgent.setShowViewportSizeOnResize(true, WebInspector.settings.showMetricsRulers.get());
    }
    showRulersChanged();
    this.overridesSupport = new WebInspector.OverridesSupport();

    WebInspector.WorkerManager.loadCompleted();
    InspectorFrontendAPI.loadCompleted();

    if (Capabilities.canScreencast && WebInspector.settings.screencastEnabled.get())
        this._toggleScreencastButtonClicked(false);

    WebInspector.notifications.dispatchEventToListeners(WebInspector.Events.InspectorLoaded);
}

var windowLoaded = function()
{
    WebInspector.loaded();
    window.removeEventListener("DOMContentLoaded", windowLoaded, false);
    delete windowLoaded;
};

window.addEventListener("DOMContentLoaded", windowLoaded, false);

// We'd like to enforce asynchronous interaction between the inspector controller and the frontend.
// It is needed to prevent re-entering the backend code.
// Also, native dispatches do not guarantee setTimeouts to be serialized, so we
// enforce serialization using 'messagesToDispatch' queue. It is also important that JSC debugger
// tests require that each command was dispatch within individual timeout callback, so we don't batch them.

var messagesToDispatch = [];

WebInspector.dispatchQueueIsEmpty = function() {
    return messagesToDispatch.length == 0;
}

WebInspector.dispatch = function(message) {
    messagesToDispatch.push(message);
    setTimeout(function() {
        InspectorBackend.dispatch(messagesToDispatch.shift());
    }, 0);
}

WebInspector.windowResize = function(event)
{
    if (WebInspector.inspectorView)
        WebInspector.inspectorView.onResize();
    if (WebInspector.settingsController)
        WebInspector.settingsController.resize();
    if (WebInspector._screencastSplitView)
        WebInspector._screencastSplitView.doResize();
}

WebInspector.close = function(event)
{
    if (this._isClosing)
        return;
    this._isClosing = true;
    this.notifications.dispatchEventToListeners(WebInspector.Events.InspectorClosing);
    InspectorFrontendHost.closeWindow();
}

WebInspector.documentClick = function(event)
{
    var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
    if (!anchor || (anchor.target === "_blank"))
        return;

    // Prevent the link from navigating, since we don't do any navigation by following links normally.
    event.consume(true);

    function followLink()
    {
        if (WebInspector.isBeingEdited(event.target))
            return;
        if (WebInspector.openAnchorLocationRegistry.dispatch({ url: anchor.href, lineNumber: anchor.lineNumber}))
            return;
        if (WebInspector.showAnchorLocation(anchor))
            return;

        const profileMatch = WebInspector.ProfilesPanelDescriptor.ProfileURLRegExp.exec(anchor.href);
        if (profileMatch) {
            WebInspector.showPanel("profiles").showProfile(profileMatch[1], profileMatch[2]);
            return;
        }

        var parsedURL = anchor.href.asParsedURL();
        if (parsedURL && parsedURL.scheme === "webkit-link-action") {
            if (parsedURL.host === "show-panel") {
                var panel = parsedURL.path.substring(1);
                if (WebInspector.panel(panel))
                    WebInspector.showPanel(panel);
            }
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

WebInspector.openResource = function(resourceURL, inResourcesPanel)
{
    var resource = WebInspector.resourceForURL(resourceURL);
    if (inResourcesPanel && resource)
        WebInspector.showPanel("resources").showResource(resource);
    else
        InspectorFrontendHost.openInNewTab(resourceURL);
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

    var toggleConsoleLabel = WebInspector.UIString("Toggle console");
    if (WebInspector.experimentsSettings.openConsoleWithCtrlTilde.isEnabled())
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), toggleConsoleLabel);
    else
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tilde, shortcut.Modifiers.CtrlOrMeta), toggleConsoleLabel);
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

/**
 * @param {KeyboardEvent} event
 */
WebInspector.documentKeyDown = function(event)
{
    if (WebInspector.currentFocusElement() && WebInspector.currentFocusElement().handleKeyEvent) {
        WebInspector.currentFocusElement().handleKeyEvent(event);
        if (event.handled) {
            event.consume(true);
            return;
        }
    }

    if (WebInspector.inspectorView.currentPanel()) {
        WebInspector.inspectorView.currentPanel().handleShortcut(event);
        if (event.handled) {
            event.consume(true);
            return;
        }
    }

    if (WebInspector.searchController.handleShortcut(event))
        return;
    if (WebInspector.advancedSearchController.handleShortcut(event))
        return;
    if (WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.handleShortcut(event))
        return;

    switch (event.keyIdentifier) {
        case "U+004F": // O key
        case "U+0050": // P key
            if (!event.shiftKey && !event.altKey && WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
                WebInspector.showPanel("sources").showGoToSourceDialog();
                event.consume(true);
            }
            break;
        case "U+0052": // R key
            if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
                WebInspector.debuggerModel.skipAllPauses(true, true);
                PageAgent.reload(event.shiftKey);
                event.consume(true);
            }
            if (window.DEBUG && event.altKey) {
                WebInspector.reload();
                return;
            }
            break;
        case "F5":
            if (!WebInspector.isMac()) {
                PageAgent.reload(event.ctrlKey || event.shiftKey);
                event.consume(true);
            }
            break;
    }

    var isValidZoomShortcut = WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) &&
        !event.altKey &&
        !InspectorFrontendHost.isStub;
    switch (event.keyCode) {
        case 107: // +
        case 187: // +
            if (isValidZoomShortcut) {
                WebInspector._zoomIn();
                event.consume(true);
            }
            break;
        case 109: // -
        case 189: // -
            if (isValidZoomShortcut) {
                WebInspector._zoomOut();
                event.consume(true);
            }
            break;
        case 48: // 0
            // Zoom reset shortcut does not allow "Shift" when handled by the browser.
            if (isValidZoomShortcut && !event.shiftKey) {
                WebInspector._resetZoom();
                event.consume(true);
            }
            break;
    }
}

WebInspector.postDocumentKeyDown = function(event)
{
    const helpKey = WebInspector.isMac() ? "U+003F" : "U+00BF"; // "?" for both platforms

    if (event.keyIdentifier === "F1" ||
        (event.keyIdentifier === helpKey && event.shiftKey && (!WebInspector.isBeingEdited(event.target) || event.metaKey))) {
        this.settingsController.showSettingsScreen(WebInspector.SettingsScreen.Tabs.General);
        event.consume(true);
        return;
    }

    const Esc = "U+001B";

    if (event.handled)
        return;

    var openConsoleWithCtrlTildeEnabled = WebInspector.experimentsSettings.openConsoleWithCtrlTilde.isEnabled();
    if (event.keyIdentifier === Esc) {
        if (WebInspector.searchController.isSearchVisible()) {
            WebInspector.searchController.closeSearch();
            return;
        }
        if (this.inspectorView.drawer().visible())
            this.inspectorView.drawer().hide();
        else if (!openConsoleWithCtrlTildeEnabled)
            this.inspectorView.drawer().show();
    }

    if (openConsoleWithCtrlTildeEnabled) {
        if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Tilde.code && WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
            if (this.inspectorView.drawer().visible())
                this.inspectorView.drawer().hide();
            else
                this.showConsole();
        }
    }
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
    if (event.handled || event.target.hasStyleClass("popup-glasspane"))
        event.preventDefault();
}

WebInspector.showPanel = function(panel)
{
    return WebInspector.inspectorView.showPanel(panel);
}

WebInspector.panel = function(panel)
{
    return WebInspector.inspectorView.panel(panel);
}

WebInspector.bringToFront = function()
{
    InspectorFrontendHost.bringToFront();
}

/**
 * @param {string=} messageLevel
 * @param {boolean=} showConsole
 */
WebInspector.log = function(message, messageLevel, showConsole)
{
    // remember 'this' for setInterval() callback
    var self = this;

    // return indication if we can actually log a message
    function isLogAvailable()
    {
        return WebInspector.ConsoleMessage && WebInspector.RemoteObject && self.console;
    }

    // flush the queue of pending messages
    function flushQueue()
    {
        var queued = WebInspector.log.queued;
        if (!queued)
            return;

        for (var i = 0; i < queued.length; ++i)
            logMessage(queued[i]);

        delete WebInspector.log.queued;
    }

    // flush the queue if it console is available
    // - this function is run on an interval
    function flushQueueIfAvailable()
    {
        if (!isLogAvailable())
            return;

        clearInterval(WebInspector.log.interval);
        delete WebInspector.log.interval;

        flushQueue();
    }

    // actually log the message
    function logMessage(message)
    {
        // post the message
        var msg = WebInspector.ConsoleMessage.create(
            WebInspector.ConsoleMessage.MessageSource.Other,
            messageLevel || WebInspector.ConsoleMessage.MessageLevel.Debug,
            message);

        self.console.addMessage(msg);
        if (showConsole)
            WebInspector.showConsole();
    }

    // if we can't log the message, queue it
    if (!isLogAvailable()) {
        if (!WebInspector.log.queued)
            WebInspector.log.queued = [];

        WebInspector.log.queued.push(message);

        if (!WebInspector.log.interval)
            WebInspector.log.interval = setInterval(flushQueueIfAvailable, 1000);

        return;
    }

    // flush the pending queue if any
    flushQueue();

    // log the message
    logMessage(message);
}

WebInspector.showErrorMessage = function(error)
{
    WebInspector.log(error, WebInspector.ConsoleMessage.MessageLevel.Error, true);
}

// Inspector.inspect protocol event
WebInspector.inspect = function(payload, hints)
{
    var object = WebInspector.RemoteObject.fromPayload(payload);
    if (object.subtype === "node") {
        function callback(nodeId)
        {
            WebInspector._updateFocusedNode(nodeId);
            object.release();
        }
        object.pushNodeToFrontend(callback);
        return;
    }

    if (object.type === "function") {
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

            WebInspector.showPanel("sources").showUILocation(uiLocation);
        }
        DebuggerAgent.getFunctionDetails(object.objectId, didGetDetails.bind(this));
        return;
    }

    if (hints.databaseId)
        WebInspector.showPanel("resources").selectDatabase(WebInspector.databaseModel.databaseForId(hints.databaseId));
    else if (hints.domStorageId)
        WebInspector.showPanel("resources").selectDOMStorage(WebInspector.domStorageModel.storageForId(hints.domStorageId));
    else if (hints.copyToClipboard)
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
    WebInspector.showPanel("elements").revealAndSelectNode(nodeId);
}

WebInspector.showAnchorLocation = function(anchor)
{
    var preferredPanel = this.panels[anchor.preferredPanel];
    if (preferredPanel && WebInspector._showAnchorLocationInPanel(anchor, preferredPanel))
        return true;
    if (WebInspector._showAnchorLocationInPanel(anchor, this.panel("sources")))
        return true;
    if (WebInspector._showAnchorLocationInPanel(anchor, this.panel("resources")))
        return true;
    if (WebInspector._showAnchorLocationInPanel(anchor, this.panel("network")))
        return true;
    return false;
}

WebInspector._showAnchorLocationInPanel = function(anchor, panel)
{
    if (!panel || !panel.canShowAnchorLocation(anchor))
        return false;

    // FIXME: support webkit-html-external-link links here.
    if (anchor.hasStyleClass("webkit-html-external-link")) {
        anchor.removeStyleClass("webkit-html-external-link");
        anchor.addStyleClass("webkit-html-resource-link");
    }

    WebInspector.inspectorView.setCurrentPanel(panel);
    panel.showAnchorLocation(anchor);
    return true;
}

WebInspector.evaluateInConsole = function(expression, showResultOnly)
{
    this.showConsole();
    this.consoleView.evaluateUsingTextPrompt(expression, showResultOnly);
}

WebInspector.addMainEventListeners = function(doc)
{
    doc.addEventListener("keydown", this.documentKeyDown.bind(this), true);
    doc.addEventListener("keydown", this.postDocumentKeyDown.bind(this), false);
    doc.addEventListener("beforecopy", this.documentCanCopy.bind(this), true);
    doc.addEventListener("copy", this.documentCopy.bind(this), false);
    doc.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), true);
    doc.addEventListener("click", this.documentClick.bind(this), true);
}

WebInspector.Zoom = {
    Table: [0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5],
    DefaultOffset: 6
}


// Ex-DevTools.js content

/**
 * @param {ExtensionDescriptor} extensionInfo
 * @return {string}
 */
function buildPlatformExtensionAPI(extensionInfo)
{
    return "var extensionInfo = " + JSON.stringify(extensionInfo) + ";" +
       "var tabId = " + WebInspector._inspectedTabId + ";" +
       platformExtensionAPI.toString();
}

WebInspector.setInspectedTabId = function(tabId)
{
    WebInspector._inspectedTabId = tabId;
}

/**
 * @return {string}
 */
WebInspector.getSelectionBackgroundColor = function()
{
    return InspectorFrontendHost.getSelectionBackgroundColor();
}

/**
 * @return {string}
 */
WebInspector.getSelectionForegroundColor = function()
{
    return InspectorFrontendHost.getSelectionForegroundColor();
}

window.DEBUG = true;
