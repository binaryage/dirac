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

/**
 * @constructor
 * @implements {InspectorAgent.Dispatcher}
 */
WebInspector.Main = function()
{
    var boundListener = windowLoaded.bind(this);

    /**
     * @this {WebInspector.Main}
     */
    function windowLoaded()
    {
        this._loaded();
        window.removeEventListener("DOMContentLoaded", boundListener, false);
    }
    window.addEventListener("DOMContentLoaded", boundListener, false);
}

WebInspector.Main.prototype = {
    _registerModules: function()
    {
        var configuration;
        if (!Capabilities.isMainFrontend) {
            configuration = ["main", "sources", "timeline", "profiles", "console", "codemirror"];
        } else {
            configuration = ["main", "elements", "network", "sources", "timeline", "profiles", "resources", "audits", "console", "codemirror", "extensions", "settings"];
            if (WebInspector.experimentsSettings.layersPanel.isEnabled())
                configuration.push("layers");
        }
        WebInspector.moduleManager.registerModules(configuration);
    },

    _createGlobalStatusBarItems: function()
    {
        if (WebInspector.inspectElementModeController)
            WebInspector.inspectorView.appendToLeftToolbar(WebInspector.inspectElementModeController.toggleSearchButton.element);

        WebInspector.inspectorView.appendToRightToolbar(WebInspector.settingsController.statusBarItem);
        if (WebInspector.dockController.element)
            WebInspector.inspectorView.appendToRightToolbar(WebInspector.dockController.element);

        if (WebInspector._screencastController)
            WebInspector.inspectorView.appendToRightToolbar(WebInspector._screencastController.statusBarItem());
    },

    _createRootView: function()
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, WebInspector.dockController.canDock() ? "InspectorView.splitViewState" : "InspectorView.dummySplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);

        WebInspector.inspectorView.show(this._rootSplitView.sidebarElement());

        var inspectedPagePlaceholder = new WebInspector.InspectedPagePlaceholder();
        inspectedPagePlaceholder.show(this._rootSplitView.mainElement());

        WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateRootSplitViewOnDockSideChange, this);
        this._updateRootSplitViewOnDockSideChange();

        rootView.attachToBody();
    },

    _updateRootSplitViewOnDockSideChange: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide === WebInspector.DockController.State.Undocked) {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }

        this._rootSplitView.setVertical(dockSide === WebInspector.DockController.State.DockedToLeft || dockSide === WebInspector.DockController.State.DockedToRight);
        this._rootSplitView.setSecondIsSidebar(dockSide === WebInspector.DockController.State.DockedToRight || dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.showBoth();
    },

    _calculateWorkerInspectorTitle: function()
    {
        var expression = "location.href";
        if (WebInspector.queryParam("isSharedWorker"))
            expression += " + (this.name ? ' (' + this.name + ')' : '')";
        RuntimeAgent.invoke_evaluate({expression:expression, doNotPauseOnExceptionsAndMuteConsole:true, returnByValue: true}, evalCallback);

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

    _loadCompletedForWorkers: function()
    {
        // Make sure script execution of dedicated worker is resumed and then paused
        // on the first script statement in case we autoattached to it.
        if (WebInspector.queryParam("workerPaused")) {
            DebuggerAgent.pause();
            RuntimeAgent.run(calculateTitle.bind(this));
        } else if (!Capabilities.isMainFrontend) {
            calculateTitle.call(this);
        }

        /**
         * @this {WebInspector.Main}
         */
        function calculateTitle()
        {
            this._calculateWorkerInspectorTitle();
        }
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

    _debuggerPaused: function()
    {
        WebInspector.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        WebInspector.inspectorView.showPanel("sources");
    },

    _loaded: function()
    {
        if (!InspectorFrontendHost.sendMessageToEmbedder) {
            var helpScreen = new WebInspector.HelpScreen(WebInspector.UIString("Incompatible Chrome version"));
            var p = helpScreen.contentElement.createChild("p", "help-section");
            p.textContent = WebInspector.UIString("Please upgrade to a newer Chrome version (you might need a Dev or Canary build).");
            helpScreen.showModal();
            return;
        }

        InspectorBackend.loadFromJSONIfNeeded("../protocol.json");
        WebInspector.dockController = new WebInspector.DockController(!!WebInspector.queryParam("can_dock"));

        var onConnectionReady = this._doLoadedDone.bind(this);

        var workerId = WebInspector.queryParam("dedicatedWorkerId");
        if (workerId) {
            new WebInspector.ExternalWorkerConnection(workerId, onConnectionReady);
            return;
        }

        var ws;
        if (WebInspector.queryParam("ws")) {
            ws = "ws://" + WebInspector.queryParam("ws");
        } else if (WebInspector.queryParam("page")) {
            var page = WebInspector.queryParam("page");
            var host = WebInspector.queryParam("host") || window.location.host;
            ws = "ws://" + host + "/devtools/page/" + page;
        }

        if (ws) {
            document.body.classList.add("remote");
            new InspectorBackendClass.WebSocketConnection(ws, onConnectionReady);
            return;
        }

        if (!InspectorFrontendHost.isStub) {
            new InspectorBackendClass.MainConnection(onConnectionReady);
            return;
        }

        InspectorFrontendAPI.dispatchQueryParameters(WebInspector.queryParam("dispatch"));
        new InspectorBackendClass.StubConnection(onConnectionReady);
    },

    /**
     * @param {!InspectorBackendClass.Connection} connection
     */
    _doLoadedDone: function(connection)
    {
        connection.addEventListener(InspectorBackendClass.Connection.Events.Disconnected, onDisconnected);

        /**
         * @param {!WebInspector.Event} event
         */
        function onDisconnected(event)
        {
            if (WebInspector._disconnectedScreenWithReasonWasShown)
                return;
            new WebInspector.RemoteDebuggingTerminatedScreen(event.data.reason).showModal();
        }

        InspectorBackend.setConnection(connection);

        // Install styles and themes
        WebInspector.installPortStyles();

        if (WebInspector.queryParam("toolbarColor") && WebInspector.queryParam("textColor"))
            WebInspector.setToolbarColors(WebInspector.queryParam("toolbarColor"), WebInspector.queryParam("textColor"));

        WebInspector.targetManager = new WebInspector.TargetManager();
        WebInspector.targetManager.createTarget(connection, this._doLoadedDoneWithCapabilities.bind(this));
    },

    _doLoadedDoneWithCapabilities: function(mainTarget)
    {
        new WebInspector.VersionController().updateVersion();
        WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
        this._registerShortcuts();

        // set order of some sections explicitly
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));
        WebInspector.ShortcutsScreen.registerShortcuts();

        if (WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
            new WebInspector.WorkerTargetManager(mainTarget, WebInspector.targetManager);

        WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._resetErrorAndWarningCounts, this);
        WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);

        WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        WebInspector.networkLog = new WebInspector.NetworkLog();

        WebInspector.zoomManager = new WebInspector.ZoomManager();

        WebInspector.advancedSearchController = new WebInspector.AdvancedSearchController();

        InspectorBackend.registerInspectorDispatcher(this);

        WebInspector.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
        WebInspector.isolatedFileSystemDispatcher = new WebInspector.IsolatedFileSystemDispatcher(WebInspector.isolatedFileSystemManager);
        WebInspector.workspace = new WebInspector.Workspace(WebInspector.isolatedFileSystemManager.mapping());

        WebInspector.cssModel = new WebInspector.CSSStyleModel(WebInspector.workspace);
        WebInspector.timelineManager = new WebInspector.TimelineManager();
        WebInspector.tracingAgent = new WebInspector.TracingAgent();

        if (Capabilities.isMainFrontend) {
            WebInspector.inspectElementModeController = new WebInspector.InspectElementModeController();
            WebInspector.workerFrontendManager = new WebInspector.WorkerFrontendManager();
        } else {
            mainTarget.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerDisconnected, onWorkerDisconnected);
        }

        function onWorkerDisconnected()
        {
            var screen = new WebInspector.WorkerTerminatedScreen();
            var listener = hideScreen.bind(null, screen);
            mainTarget.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, listener);

            /**
             * @param {!WebInspector.WorkerTerminatedScreen} screen
             */
            function hideScreen(screen)
            {
                mainTarget.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, listener);
                screen.hide();
            }

            screen.showModal();
        }

        WebInspector.settingsController = new WebInspector.SettingsController();

        WebInspector.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();

        var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
        var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
        WebInspector.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
        WebInspector.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });
        WebInspector.Linkifier.setLinkHandler(new WebInspector.HandlerRegistry.LinkHandler());

        new WebInspector.WorkspaceController(WebInspector.workspace);

        WebInspector.fileSystemWorkspaceProvider = new WebInspector.FileSystemWorkspaceProvider(WebInspector.isolatedFileSystemManager, WebInspector.workspace);

        WebInspector.networkWorkspaceProvider = new WebInspector.SimpleWorkspaceProvider(WebInspector.workspace, WebInspector.projectTypes.Network);
        new WebInspector.NetworkUISourceCodeProvider(WebInspector.networkWorkspaceProvider, WebInspector.workspace);

        WebInspector.breakpointManager = new WebInspector.BreakpointManager(WebInspector.settings.breakpoints, WebInspector.debuggerModel, WebInspector.workspace);

        WebInspector.scriptSnippetModel = new WebInspector.ScriptSnippetModel(WebInspector.workspace);

        WebInspector.overridesSupport = new WebInspector.OverridesSupport();
        WebInspector.overridesSupport.applyInitialOverrides();

        new WebInspector.DebuggerScriptMapping(WebInspector.debuggerModel, WebInspector.workspace, WebInspector.networkWorkspaceProvider);
        WebInspector.liveEditSupport = new WebInspector.LiveEditSupport(WebInspector.workspace);
        new WebInspector.CSSStyleSheetMapping(WebInspector.cssModel, WebInspector.workspace, WebInspector.networkWorkspaceProvider);
        new WebInspector.PresentationConsoleMessageHelper(WebInspector.workspace);

        // Create settings before loading modules.
        WebInspector.settings.initializeBackendSettings();

        this._registerModules();
        WebInspector.KeyboardShortcut.registerActions();

        WebInspector.panels = {};
        WebInspector.inspectorView = new WebInspector.InspectorView();
        // Screencast controller creates a root view itself.
        if (mainTarget.canScreencast)
            this._screencastController = new WebInspector.ScreencastController();
        else
            this._createRootView();
        this._createGlobalStatusBarItems();

        this._addMainEventListeners(document);

        function onResize()
        {
            if (WebInspector.settingsController)
                WebInspector.settingsController.resize();
        }
        window.addEventListener("resize", onResize, true);

        var errorWarningCount = document.getElementById("error-warning-count");

        function showConsole()
        {
            WebInspector.console.show();
        }
        errorWarningCount.addEventListener("click", showConsole, false);
        this._updateErrorAndWarningCounts();

        WebInspector.extensionServerProxy.setFrontendReady();

        WebInspector.databaseModel = new WebInspector.DatabaseModel();
        WebInspector.domStorageModel = new WebInspector.DOMStorageModel();
        WebInspector.cpuProfilerModel = new WebInspector.CPUProfilerModel();

        InspectorAgent.enable(inspectorAgentEnableCallback.bind(this));

        /**
         * @this {WebInspector.Main}
         */
        function inspectorAgentEnableCallback()
        {
            WebInspector.inspectorView.showInitialPanel();

            if (WebInspector.overridesSupport.hasActiveOverrides())
                WebInspector.inspectorView.showViewInDrawer("emulation", true);

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
        WebInspector.notifications.dispatchEventToListeners(WebInspector.NotificationService.Events.InspectorLoaded);
    },

    _documentClick: function(event)
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
    },

    _registerShortcuts: function()
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
    },

    /**
     * @param {?Event} event
     * @return {boolean}
     */
    _handleZoomEvent: function(event)
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
    },

    _postDocumentKeyDown: function(event)
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

        var isValidZoomShortcut = WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) &&
            !event.altKey &&
            !InspectorFrontendHost.isStub;
        if (isValidZoomShortcut && this._handleZoomEvent(event)) {
            event.consume(true);
            return;
        }
        WebInspector.KeyboardShortcut.handleShortcut(event);
    },

    _documentCanCopy: function(event)
    {
        if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel()["handleCopyEvent"])
            event.preventDefault();
    },

    _documentCopy: function(event)
    {
        if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel()["handleCopyEvent"])
            WebInspector.inspectorView.currentPanel()["handleCopyEvent"](event);
    },

    _contextMenuEventFired: function(event)
    {
        if (event.handled || event.target.classList.contains("popup-glasspane"))
            event.preventDefault();
    },

    _inspectNodeRequested: function(event)
    {
        this._updateFocusedNode(event.data);
    },

    _updateFocusedNode: function(nodeId)
    {
        var node = WebInspector.domModel.nodeForId(nodeId);
        console.assert(node);
        WebInspector.Revealer.reveal(node);
    },

    _addMainEventListeners: function(doc)
    {
        doc.addEventListener("keydown", this._postDocumentKeyDown.bind(this), false);
        doc.addEventListener("beforecopy", this._documentCanCopy.bind(this), true);
        doc.addEventListener("copy", this._documentCopy.bind(this), false);
        doc.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
        doc.addEventListener("click", this._documentClick.bind(this), false);
    },

    /**
     * @override
     * @param {!RuntimeAgent.RemoteObject} payload
     * @param {!Object=} hints
     */
    inspect: function(payload, hints)
    {
        var object = WebInspector.RemoteObject.fromPayload(payload);
        if (object.subtype === "node") {
            object.pushNodeToFrontend(callback);
            var elementsPanel = /** @type {!WebInspector.ElementsPanel} */ (WebInspector.inspectorView.panel("elements"));
            elementsPanel.omitDefaultSelection();
            WebInspector.inspectorView.setCurrentPanel(elementsPanel);
            return;
        }

        function callback(nodeId)
        {
            elementsPanel.stopOmittingDefaultSelection();
            WebInspector.Revealer.reveal(WebInspector.domModel.nodeForId(nodeId));
            if (!WebInspector.inspectorView.drawerVisible() && !WebInspector._notFirstInspectElement)
                InspectorFrontendHost.inspectElementCompleted();
            WebInspector._notFirstInspectElement = true;
            object.release();
        }

        if (object.type === "function") {
            /**
             * @param {?Protocol.Error} error
             * @param {!DebuggerAgent.FunctionDetails} response
             */
            DebuggerAgent.getFunctionDetails(object.objectId, didGetDetails);
            return;
        }

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

            // FIXME: Dependency violation.
            /** @type {!WebInspector.SourcesPanel} */ (WebInspector.inspectorView.panel("sources")).showUILocation(uiLocation, true);
        }

        if (hints.copyToClipboard)
            InspectorFrontendHost.copyText(object.value);
        object.release();
    },

    /**
     * @override
     * @param {string} reason
     */
    detached: function(reason)
    {
        WebInspector._disconnectedScreenWithReasonWasShown = true;
        new WebInspector.RemoteDebuggingTerminatedScreen(reason).showModal();
    },

    /**
     * @override
     */
    targetCrashed: function()
    {
        (new WebInspector.HelpScreenUntilReload(
            WebInspector.UIString("Inspected target crashed"),
            WebInspector.UIString("Inspected target has crashed. Once it reloads we will attach to it automatically."))).showModal();
    },

    /**
     * @override
     * @param {number} callId
     * @param {string} script
     */
    evaluateForTestInFrontend: function(callId, script)
    {
        WebInspector.evaluateForTestInFrontend(callId, script);
    }
}

WebInspector.reload = function()
{
    InspectorAgent.reset();
    window.location.reload();
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ReloadActionDelegate = function()
{
}

WebInspector.Main.ReloadActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        WebInspector.debuggerModel.skipAllPauses(true, true);
        WebInspector.resourceTreeModel.reloadPage(false);
        return true;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.HardReloadActionDelegate = function()
{
}

WebInspector.Main.HardReloadActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        WebInspector.debuggerModel.skipAllPauses(true, true);
        WebInspector.resourceTreeModel.reloadPage(true);
        return true;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.DebugReloadActionDelegate = function()
{
}

WebInspector.Main.DebugReloadActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        WebInspector.reload();
        return true;
    }
}

new WebInspector.Main();

window.DEBUG = true;

// These methods are added for backwards compatibility with Devtools CodeSchool extension.
// DO NOT REMOVE

WebInspector.__defineGetter__("inspectedPageURL", function()
{
    return WebInspector.resourceTreeModel.inspectedPageURL();
});

WebInspector.panel = function(name)
{
    return WebInspector.inspectorView.panel(name);
}
