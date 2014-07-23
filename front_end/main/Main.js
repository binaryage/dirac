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
    _createGlobalStatusBarItems: function()
    {
        var extensions = WebInspector.moduleManager.extensions(WebInspector.StatusBarButton.Provider);

        /**
         * @param {!WebInspector.ModuleManager.Extension} left
         * @param {!WebInspector.ModuleManager.Extension} right
         */
        function orderComparator(left, right)
        {
            return left.descriptor()["order"] - right.descriptor()["order"];
        }
        extensions.sort(orderComparator);
        extensions.forEach(function(extension) {
            var button;
            switch (extension.descriptor()["location"]) {
            case "toolbar-left":
                button = createButton(extension);
                if (button)
                    WebInspector.inspectorView.appendToLeftToolbar(button);
                break;
            case "toolbar-right":
                button = createButton(extension);
                if (button)
                    WebInspector.inspectorView.appendToRightToolbar(button);
                break;
            }
            if (button && extension.descriptor()["actionId"]) {
                button.addEventListener("click", function() {
                    WebInspector.actionRegistry.execute(extension.descriptor()["actionId"]);
                });
            }
        });

        function createButton(extension)
        {
            var descriptor = extension.descriptor();
            if (descriptor.className)
                return extension.instance().button();
            return new WebInspector.StatusBarButton(WebInspector.UIString(descriptor["title"]), descriptor["elementClass"]);
        }
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
            InspectorFrontendHost.inspectedURLChanged(String(result.value));
        }
    },

    _loadCompletedForWorkers: function()
    {
        // Make sure script execution of dedicated worker or service worker is
        // resumed and then paused on the first script statement in case we
        // autoattached to it.
        if (WebInspector.queryParam("workerPaused")) {
            pauseAndResume.call(this);
        } else{
            RuntimeAgent.isRunRequired(isRunRequiredCallback.bind(this));
        }

        /**
         * @this {WebInspector.Main}
         */
        function isRunRequiredCallback(error, result)
        {
            if (result) {
                pauseAndResume.call(this);
            } else if (WebInspector.isWorkerFrontend()) {
                calculateTitle.call(this);
            }
        }

        /**
         * @this {WebInspector.Main}
         */
        function pauseAndResume()
        {
            DebuggerAgent.pause();
            RuntimeAgent.run(calculateTitle.bind(this));
        }

        /**
         * @this {WebInspector.Main}
         */
        function calculateTitle()
        {
            this._calculateWorkerInspectorTitle();
        }
    },

    _loaded: function()
    {
        console.timeStamp("Main._loaded");

        // FIXME: Make toolbox a real app.
        if (WebInspector.queryParam("toolbox")) {
            new WebInspector.Toolbox();
            return;
        }

        this._createSettings();
        this._createModuleManager();
        this._createAppUI();
    },

    _createSettings: function()
    {
        WebInspector.settings = new WebInspector.Settings();
        WebInspector.experimentsSettings = new WebInspector.ExperimentsSettings(WebInspector.queryParam("experiments") !== null);
        // This setting is needed for backwards compatibility with Devtools CodeSchool extension. DO NOT REMOVE
        WebInspector.settings.pauseOnExceptionStateString = new WebInspector.PauseOnExceptionStateSetting();
        new WebInspector.VersionController().updateVersion();
    },

    _createModuleManager: function()
    {
        console.timeStamp("Main._createModuleManager");
        WebInspector.moduleManager = new WebInspector.ModuleManager(allDescriptors);

        // FIXME: define html-per-app, make configuration a part of the app.
        var configuration = ["main", "elements", "network", "sources", "timeline", "profiler", "resources", "audits", "console", "source_frame", "extensions", "settings"];
        if (WebInspector.experimentsSettings.layersPanel.isEnabled())
            configuration.push("layers");
        if (WebInspector.experimentsSettings.devicesPanel.isEnabled() && !!WebInspector.queryParam("can_dock"))
            configuration.push("devices");
        if (WebInspector.isWorkerFrontend())
            configuration = ["main", "sources", "timeline", "profiler", "console", "source_frame"];
        WebInspector.moduleManager.registerModules(configuration);
    },

    _createAppUI: function()
    {
        console.timeStamp("Main._createApp");

        WebInspector.installPortStyles();
        if (WebInspector.queryParam("toolbarColor") && WebInspector.queryParam("textColor"))
            WebInspector.setToolbarColors(WebInspector.queryParam("toolbarColor"), WebInspector.queryParam("textColor"));
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.SetToolbarColors, updateToolbarColors);
        /**
         * @param {!WebInspector.Event} event
         */
        function updateToolbarColors(event)
        {
            WebInspector.setToolbarColors(/** @type {string} */ (event.data["backgroundColor"]), /** @type {string} */ (event.data["color"]));
        }

        var canDock = !!WebInspector.queryParam("can_dock");
        WebInspector.zoomManager = new WebInspector.ZoomManager();
        WebInspector.inspectorView = new WebInspector.InspectorView();
        WebInspector.ContextMenu.initialize();
        WebInspector.dockController = new WebInspector.DockController(canDock);
        WebInspector.overridesSupport = new WebInspector.OverridesSupport(canDock);
        WebInspector.multitargetConsoleModel = new WebInspector.MultitargetConsoleModel();

        WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
        // set order of some sections explicitly
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));

        if (canDock)
            WebInspector.app = new WebInspector.AdvancedApp();
        else if (WebInspector.queryParam("remoteFrontend"))
            WebInspector.app = new WebInspector.ScreencastApp();
        else
            WebInspector.app = new WebInspector.SimpleApp();

        // It is important to kick controller lifetime after apps are instantiated.
        WebInspector.dockController.initialize();
        WebInspector.app.createRootView();

        // Give UI cycles to repaint, then proceed with creating connection.
        setTimeout(this._createConnection.bind(this), 0);
    },

    _createConnection: function()
    {
        console.timeStamp("Main._createConnection");
        InspectorBackend.loadFromJSONIfNeeded("../protocol.json");

        var workerId = WebInspector.queryParam("dedicatedWorkerId");
        if (workerId) {
            this._connectionEstablished(new WebInspector.ExternalWorkerConnection(workerId));
            return;
        }

        if (WebInspector.queryParam("ws")) {
            var ws = "ws://" + WebInspector.queryParam("ws");
            InspectorBackendClass.WebSocketConnection.Create(ws, this._connectionEstablished.bind(this));
            return;
        }

        if (!InspectorFrontendHost.isHostedMode()) {
            this._connectionEstablished(new InspectorBackendClass.MainConnection());
            return;
        }

        this._connectionEstablished(new InspectorBackendClass.StubConnection());
    },

    /**
     * @param {!InspectorBackendClass.Connection} connection
     */
    _connectionEstablished: function(connection)
    {
        console.timeStamp("Main._connectionEstablished");
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
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.SetToolbarColors, updateToolbarColors);
        /**
         * @param {!WebInspector.Event} event
         */
        function updateToolbarColors(event)
        {
            WebInspector.setToolbarColors(/** @type {string} */ (event.data["backgroundColor"]), /** @type {string} */ (event.data["color"]));
        }
        WebInspector.ContextMenu.initialize();
        WebInspector.targetManager.createTarget(WebInspector.UIString("Main"), connection, this._mainTargetCreated.bind(this));
        WebInspector.cssWorkspaceBinding = new WebInspector.CSSWorkspaceBinding();
        WebInspector.debuggerWorkspaceBinding = new WebInspector.DebuggerWorkspaceBinding();
        WebInspector.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
        WebInspector.workspace = new WebInspector.Workspace(WebInspector.isolatedFileSystemManager.mapping());
        WebInspector.networkWorkspaceBinding = new WebInspector.NetworkWorkspaceBinding(WebInspector.workspace);
        new WebInspector.NetworkUISourceCodeProvider(WebInspector.networkWorkspaceBinding, WebInspector.workspace);
        new WebInspector.PresentationConsoleMessageHelper(WebInspector.workspace);
        WebInspector.fileSystemWorkspaceBinding = new WebInspector.FileSystemWorkspaceBinding(WebInspector.isolatedFileSystemManager, WebInspector.workspace);
        WebInspector.breakpointManager = new WebInspector.BreakpointManager(WebInspector.settings.breakpoints, WebInspector.workspace, WebInspector.targetManager);
        WebInspector.scriptSnippetModel = new WebInspector.ScriptSnippetModel(WebInspector.workspace);
        this._executionContextSelector = new WebInspector.ExecutionContextSelector();

        if (!WebInspector.isWorkerFrontend())
            WebInspector.inspectElementModeController = new WebInspector.InspectElementModeController();
        this._createGlobalStatusBarItems();
    },

    /**
     * @param {!WebInspector.Target} mainTarget
     */
    _mainTargetCreated: function(mainTarget)
    {
        console.timeStamp("Main._mainTargetCreated");

        this._registerShortcuts();

        if (WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
            WebInspector.workerTargetManager = new WebInspector.WorkerTargetManager(mainTarget, WebInspector.targetManager);

        InspectorBackend.registerInspectorDispatcher(this);

        if (!WebInspector.isWorkerFrontend())
            WebInspector.workerFrontendManager = new WebInspector.WorkerFrontendManager();
        else
            mainTarget.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerDisconnected, onWorkerDisconnected);

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

        WebInspector.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();
        var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
        var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
        WebInspector.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
        WebInspector.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });
        WebInspector.Linkifier.setLinkHandler(new WebInspector.HandlerRegistry.LinkHandler());
        new WebInspector.WorkspaceController(WebInspector.workspace);
        new WebInspector.CSSStyleSheetMapping(WebInspector.cssModel, WebInspector.workspace, WebInspector.networkWorkspaceBinding);
        new WebInspector.RenderingOptions();
        new WebInspector.Main.PauseListener();
        new WebInspector.Main.WarningErrorCounter();
        new WebInspector.Main.InspectedNodeRevealer();

        this._addMainEventListeners(document);

        var errorWarningCount = document.getElementById("error-warning-count");
        function showConsole()
        {
            WebInspector.console.show();
        }
        errorWarningCount.addEventListener("click", showConsole, false);

        WebInspector.extensionServerProxy.setFrontendReady();

        InspectorAgent.enable(inspectorAgentEnableCallback);

        function inspectorAgentEnableCallback()
        {
            console.timeStamp("Main.inspectorAgentEnableCallback");
            WebInspector.app.presentUI(mainTarget);
            console.timeStamp("Main.inspectorAgentEnableCallbackPresentUI");
        }

        WebInspector.actionRegistry = new WebInspector.ActionRegistry();
        WebInspector.shortcutRegistry = new WebInspector.ShortcutRegistry(WebInspector.actionRegistry);
        WebInspector.ShortcutsScreen.registerShortcuts();
        this._registerForwardedShortcuts();
        this._registerMessageSinkListener();

        this._loadCompletedForWorkers();
        InspectorFrontendAPI.loadCompleted();
        WebInspector.notifications.dispatchEventToListeners(WebInspector.NotificationService.Events.InspectorLoaded);
    },

    _registerForwardedShortcuts: function()
    {
        /** @const */ var forwardedActions = ["main.reload", "main.hard-reload"];
        var actionKeys = WebInspector.shortcutRegistry.keysForActions(forwardedActions).map(WebInspector.KeyboardShortcut.keyCodeAndModifiersFromKey);

        actionKeys.push({keyCode: WebInspector.KeyboardShortcut.Keys.F8.code});
        InspectorFrontendHost.setWhitelistedShortcuts(JSON.stringify(actionKeys));
    },

    _registerMessageSinkListener: function()
    {
        WebInspector.console.addEventListener(WebInspector.Console.Events.MessageAdded, messageAdded);

        /**
         * @param {!WebInspector.Event} event
         */
        function messageAdded(event)
        {
            var message = /** @type {!WebInspector.Console.Message} */ (event.data);
            if (message.show)
                WebInspector.console.show();
        }
    },

    _documentClick: function(event)
    {
        var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
        if (!anchor || !anchor.href)
            return;

        // Prevent the link from navigating, since we don't do any navigation by following links normally.
        event.consume(true);

        if (anchor.target === "_blank") {
            InspectorFrontendHost.openInNewTab(anchor.href);
            return;
        }

        function followLink()
        {
            if (WebInspector.isBeingEdited(event.target))
                return;
            if (WebInspector.openAnchorLocationRegistry.dispatch({ url: anchor.href, lineNumber: anchor.lineNumber}))
                return;

            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(anchor.href);
            if (uiSourceCode) {
                WebInspector.Revealer.reveal(uiSourceCode.uiLocation(anchor.lineNumber || 0, anchor.columnNumber || 0));
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
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), WebInspector.UIString("Toggle drawer"));
        if (WebInspector.overridesSupport.responsiveDesignAvailable())
            section.addKey(shortcut.makeDescriptor("M", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Shift), WebInspector.UIString("Toggle device mode"));
        section.addKey(shortcut.makeDescriptor("f", shortcut.Modifiers.CtrlOrMeta), WebInspector.UIString("Search"));

        var advancedSearchShortcutModifier = WebInspector.isMac()
                ? WebInspector.KeyboardShortcut.Modifiers.Meta | WebInspector.KeyboardShortcut.Modifiers.Alt
                : WebInspector.KeyboardShortcut.Modifiers.Ctrl | WebInspector.KeyboardShortcut.Modifiers.Shift;
        var advancedSearchShortcut = shortcut.makeDescriptor("f", advancedSearchShortcutModifier);
        section.addKey(advancedSearchShortcut, WebInspector.UIString("Search across all sources"));

        var inspectElementModeShortcut = WebInspector.InspectElementModeController.createShortcut();
        section.addKey(inspectElementModeShortcut, WebInspector.UIString("Select node to inspect"));

        var openResourceShortcut = WebInspector.KeyboardShortcut.makeDescriptor("p", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta);
        section.addKey(openResourceShortcut, WebInspector.UIString("Go to source"));

        if (WebInspector.isMac()) {
            keys = [
                shortcut.makeDescriptor("g", shortcut.Modifiers.Meta),
                shortcut.makeDescriptor("g", shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)
            ];
            section.addRelatedKeys(keys, WebInspector.UIString("Find next/previous"));
        }
    },

    _postDocumentKeyDown: function(event)
    {
        if (event.handled)
            return;

        if (!WebInspector.Dialog.currentInstance() && WebInspector.inspectorView.currentPanel()) {
            WebInspector.inspectorView.currentPanel().handleShortcut(event);
            if (event.handled) {
                event.consume(true);
                return;
            }
        }

        WebInspector.shortcutRegistry.handleShortcut(event);
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
        var object = WebInspector.runtimeModel.createRemoteObject(payload);
        if (object.isNode()) {
            object.pushNodeToFrontend(callback);
            var elementsPanel = /** @type {!WebInspector.ElementsPanel} */ (WebInspector.inspectorView.panel("elements"));
            elementsPanel.omitDefaultSelection();
            WebInspector.inspectorView.setCurrentPanel(elementsPanel);
            return;
        }

        /**
         * @param {!WebInspector.DOMNode} node
         */
        function callback(node)
        {
            elementsPanel.stopOmittingDefaultSelection();
            WebInspector.Revealer.reveal(node);
            if (!WebInspector.inspectorView.drawerVisible() && !WebInspector._notFirstInspectElement)
                InspectorFrontendHost.inspectElementCompleted();
            WebInspector._notFirstInspectElement = true;
            object.release();
        }

        if (object.type === "function") {
            object.functionDetails(didGetDetails);
            return;
        }

        /**
         * @param {?WebInspector.DebuggerModel.FunctionDetails} response
         */
        function didGetDetails(response)
        {
            object.release();

            if (!response || !response.location)
                return;

            var location = WebInspector.DebuggerModel.Location.fromPayload(object.target(), response.location);
            WebInspector.Revealer.reveal(WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(response.location));
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

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ZoomInActionDelegate = function()
{
}

WebInspector.Main.ZoomInActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        if (InspectorFrontendHost.isHostedMode())
            return false;

        InspectorFrontendHost.zoomIn();
        return true;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ZoomOutActionDelegate = function()
{
}

WebInspector.Main.ZoomOutActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        if (InspectorFrontendHost.isHostedMode())
            return false;

        InspectorFrontendHost.zoomOut();
        return true;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ZoomResetActionDelegate = function()
{
}

WebInspector.Main.ZoomResetActionDelegate.prototype = {
    /**
     * @return {boolean}
     */
    handleAction: function()
    {
        if (InspectorFrontendHost.isHostedMode())
            return false;

        InspectorFrontendHost.resetZoom();
        return true;
    }
}

/**
 * @constructor
 * @extends {WebInspector.UISettingDelegate}
 */
WebInspector.Main.ShortcutPanelSwitchSettingDelegate = function()
{
    WebInspector.UISettingDelegate.call(this);
}

WebInspector.Main.ShortcutPanelSwitchSettingDelegate.prototype = {
    /**
     * @override
     * @return {!Element}
     */
    settingElement: function()
    {
        var modifier = WebInspector.platform() === "mac" ? "Cmd" : "Ctrl";
        return WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Enable %s + 1-9 shortcut to switch panels", modifier), WebInspector.settings.shortcutPanelSwitch);
    },

    __proto__: WebInspector.UISettingDelegate.prototype
}

/**
 * @param {string} ws
 */
WebInspector.Main._addWebSocketTarget = function(ws)
{
    /**
     * @param {!InspectorBackendClass.Connection} connection
     */
    function callback(connection)
    {
        WebInspector.targetManager.createTarget(ws, connection);
    }
    new InspectorBackendClass.WebSocketConnection(ws, callback);
}

new WebInspector.Main();

// These methods are added for backwards compatibility with Devtools CodeSchool extension.
// DO NOT REMOVE

WebInspector.__defineGetter__("inspectedPageURL", function()
{
    return WebInspector.resourceTreeModel.inspectedPageURL();
});

/**
 * @param {string} name
 * @return {?WebInspector.Panel}
 */
WebInspector.panel = function(name)
{
    return WebInspector.inspectorView.panel(name);
}

/**
 * @constructor
 */
WebInspector.Main.WarningErrorCounter = function()
{
    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._updateErrorAndWarningCounts, this);
    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);
}

WebInspector.Main.WarningErrorCounter.prototype = {
    _updateErrorAndWarningCounts: function()
    {
        var errors = 0;
        var warnings = 0;
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i) {
            errors = errors + targets[i].consoleModel.errors;
            warnings = warnings + targets[i].consoleModel.warnings;
        }
        WebInspector.inspectorView.setErrorAndWarningCounts(errors, warnings);
    }
}

/**
 * @constructor
 */
WebInspector.Main.PauseListener = function()
{
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
}

WebInspector.Main.PauseListener.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerPaused: function(event)
    {
        WebInspector.targetManager.removeModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        WebInspector.context.setFlavor(WebInspector.Target, debuggerModel.target());
        WebInspector.inspectorView.showPanel("sources");
    }
}

/**
 * @constructor
 */
WebInspector.Main.InspectedNodeRevealer = function()
{
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.NodeInspected, this._inspectNode, this);
}

WebInspector.Main.InspectedNodeRevealer.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _inspectNode: function(event)
    {
        WebInspector.Revealer.reveal(/** @type {!WebInspector.DOMNode} */ (event.data));
    }
}
