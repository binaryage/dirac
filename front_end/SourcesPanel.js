/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

importScript("BreakpointsSidebarPane.js");
importScript("CallStackSidebarPane.js");
importScript("SimpleHistoryManager.js");
importScript("EditingLocationHistoryManager.js");
importScript("FilePathScoreFunction.js");
importScript("FilteredItemSelectionDialog.js");
importScript("UISourceCodeFrame.js");
importScript("JavaScriptSourceFrame.js");
importScript("CSSSourceFrame.js");
importScript("NavigatorView.js");
importScript("RevisionHistoryView.js");
importScript("ScopeChainSidebarPane.js");
importScript("SourcesNavigator.js");
importScript("SourcesSearchScope.js");
importScript("StyleSheetOutlineDialog.js");
importScript("TabbedEditorContainer.js");
importScript("WatchExpressionsSidebarPane.js");
importScript("WorkersSidebarPane.js");
importScript("ThreadsToolbar.js");
importScript("ScriptFormatterEditorAction.js");
importScript("InplaceFormatterEditorAction.js");
importScript("ScriptFormatter.js");

/**
 * @constructor
 * @implements {WebInspector.TabbedEditorContainerDelegate}
 * @implements {WebInspector.ContextMenu.Provider}
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.Replaceable}
 * @extends {WebInspector.Panel}
 * @param {!WebInspector.Workspace=} workspaceForTest
 */
WebInspector.SourcesPanel = function(workspaceForTest)
{
    WebInspector.Panel.call(this, "sources");
    this.registerRequiredCSS("sourcesPanel.css");
    this.registerRequiredCSS("textPrompt.css"); // Watch Expressions autocomplete.

    WebInspector.settings.showEditorInDrawer = WebInspector.settings.createSetting("showEditorInDrawer", true);

    this._workspace = workspaceForTest || WebInspector.workspace;

    /**
     * @return {!WebInspector.View}
     * @this {WebInspector.SourcesPanel}
     */
    function viewGetter()
    {
        return this;
    }
    WebInspector.GoToLineDialog.install(this, viewGetter.bind(this));

    var helpSection = WebInspector.shortcutsScreen.section(WebInspector.UIString("Sources Panel"));
    this.debugToolbar = this._createDebugToolbar();
    this._debugToolbarDrawer = this._createDebugToolbarDrawer();
    this.threadsToolbar = new WebInspector.ThreadsToolbar();

    const initialDebugSidebarWidth = 225;
    this._splitView = new WebInspector.SplitView(true, true, "sourcesPanelSplitViewState", initialDebugSidebarWidth);
    this._splitView.enableShowModeSaving();
    this._splitView.setMainElementConstraints(200, 25);
    this._splitView.setSidebarElementConstraints(WebInspector.SourcesPanel.minToolbarWidth, 25);

    this._splitView.show(this.element);

    // Create scripts navigator
    const initialNavigatorWidth = 225;
    this.editorView = new WebInspector.SplitView(true, false, "sourcesPanelNavigatorSplitViewState", initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this.editorView.element.id = "scripts-editor-split-view";
    this.editorView.element.tabIndex = 0;

    this.editorView.setSidebarElementConstraints(Preferences.minSidebarWidth);
    this.editorView.setMainElementConstraints(50, 50);
    this.editorView.show(this._splitView.mainElement());

    this._navigator = new WebInspector.SourcesNavigator(this._workspace);
    this._navigator.view.show(this.editorView.sidebarElement());

    var tabbedEditorPlaceholderText = WebInspector.isMac() ? WebInspector.UIString("Hit Cmd+O to open a file") : WebInspector.UIString("Hit Ctrl+O to open a file");

    this._drawerEditorView = new WebInspector.SourcesPanel.DrawerEditorView();
    this.sourcesView = new WebInspector.SourcesView();
    this.sourcesView.show(this._drawerEditorView.element);

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.sourcesView.element);

    this._editorContainer = new WebInspector.TabbedEditorContainer(this, "previouslyViewedFiles", tabbedEditorPlaceholderText);
    this._editorContainer.show(this._searchableView.element);

    this._navigator.addEventListener(WebInspector.SourcesNavigator.Events.SourceSelected, this._sourceSelected, this);
    this._navigator.addEventListener(WebInspector.SourcesNavigator.Events.SourceRenamed, this._sourceRenamed, this);

    this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorSelected, this._editorSelected, this);
    this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorClosed, this._editorClosed, this);

    this._debugSidebarResizeWidgetElement = document.createElementWithClass("div", "resizer-widget");
    this._debugSidebarResizeWidgetElement.id = "scripts-debug-sidebar-resizer-widget";
    this._splitView.addEventListener(WebInspector.SplitView.Events.ShowModeChanged, this._updateDebugSidebarResizeWidget, this);
    this._updateDebugSidebarResizeWidget();
    this._splitView.installResizer(this._debugSidebarResizeWidgetElement);

    this.sidebarPanes = {};
    this.sidebarPanes.watchExpressions = new WebInspector.WatchExpressionsSidebarPane();
    this.sidebarPanes.callstack = new WebInspector.CallStackSidebarPane();
    this.sidebarPanes.callstack.addEventListener(WebInspector.CallStackSidebarPane.Events.CallFrameSelected, this._callFrameSelectedInSidebar.bind(this));
    this.sidebarPanes.callstack.addEventListener(WebInspector.CallStackSidebarPane.Events.CallFrameRestarted, this._callFrameRestartedInSidebar.bind(this));

    this.sidebarPanes.scopechain = new WebInspector.ScopeChainSidebarPane();
    this.sidebarPanes.jsBreakpoints = new WebInspector.JavaScriptBreakpointsSidebarPane(WebInspector.debuggerModel, WebInspector.breakpointManager, this._showSourceLocation.bind(this));
    this.sidebarPanes.domBreakpoints = WebInspector.domBreakpointsSidebarPane.createProxy(this);
    this.sidebarPanes.xhrBreakpoints = new WebInspector.XHRBreakpointsSidebarPane();
    this.sidebarPanes.eventListenerBreakpoints = new WebInspector.EventListenerBreakpointsSidebarPane();

    if (Capabilities.isMainFrontend)
        this.sidebarPanes.workerList = new WebInspector.WorkersSidebarPane();

    this._historyManager = new WebInspector.EditingLocationHistoryManager(this, this.currentSourceFrame.bind(this));
    this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation, this._onJumpToPreviousLocation.bind(this));
    this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation, this._onJumpToNextLocation.bind(this));
    this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab, this._onCloseEditorTab.bind(this));

    this.sidebarPanes.callstack.registerShortcuts(this.registerShortcuts.bind(this));
    this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToMember, this._showOutlineDialog.bind(this));
    this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint, this._toggleBreakpoint.bind(this));

    this._extensionSidebarPanes = [];

    this._scriptViewStatusBarItemsContainer = document.createElement("div");
    this._scriptViewStatusBarItemsContainer.className = "inline-block";

    this._scriptViewStatusBarTextContainer = document.createElement("div");
    this._scriptViewStatusBarTextContainer.className = "hbox";

    this._statusBarContainerElement = this.sourcesView.element.createChild("div", "sources-status-bar");

    /**
     * @this {WebInspector.SourcesPanel}
     * @param {!WebInspector.SourcesPanel.EditorAction} EditorAction
     */
    function appendButtonForExtension(EditorAction)
    {
        this._statusBarContainerElement.appendChild(EditorAction.button(this));
    }
    var editorActions = /** @type {!Array.<!WebInspector.SourcesPanel.EditorAction>} */ (WebInspector.moduleManager.instances(WebInspector.SourcesPanel.EditorAction));
    editorActions.forEach(appendButtonForExtension.bind(this));

    this._statusBarContainerElement.appendChild(this._scriptViewStatusBarItemsContainer);
    this._statusBarContainerElement.appendChild(this._scriptViewStatusBarTextContainer);

    this._installDebuggerSidebarController();

    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
    WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
    this._dockSideChanged();

    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.SourceFrame>} */
    this._sourceFramesByUISourceCode = new Map();
    this._updateDebuggerButtons();
    this._pauseOnExceptionEnabledChanged();
    if (WebInspector.debuggerModel.isPaused())
        this._showDebuggerPausedDetails();

    WebInspector.settings.pauseOnExceptionEnabled.addChangeListener(this._pauseOnExceptionEnabledChanged, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled, this._debuggerWasEnabled, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled, this._debuggerWasDisabled, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.CallFrameSelected, this._callFrameSelected, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ConsoleCommandEvaluatedInSelectedCallFrame, this._consoleCommandEvaluatedInSelectedCallFrame, this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.BreakpointsActiveStateChanged, this._breakpointsActiveStateChanged, this);

    WebInspector.startBatchUpdate();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    WebInspector.endBatchUpdate();

    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset.bind(this), this);
    WebInspector.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);

    this._boundOnKeyUp = this._onKeyUp.bind(this);
    this._boundOnKeyDown = this._onKeyDown.bind(this);

    function handleBeforeUnload(event)
    {
        if (event.returnValue)
            return;
        var unsavedSourceCodes = WebInspector.workspace.unsavedSourceCodes();
        if (!unsavedSourceCodes.length)
            return;

        event.returnValue = WebInspector.UIString("DevTools have unsaved changes that will be permanently lost.");
        WebInspector.inspectorView.showPanel("sources");
        for (var i = 0; i < unsavedSourceCodes.length; ++i)
            WebInspector.panels.sources.showUISourceCode(unsavedSourceCodes[i]);
    }
    window.addEventListener("beforeunload", handleBeforeUnload.bind(this), true);
}

WebInspector.SourcesPanel.minToolbarWidth = 215;

WebInspector.SourcesPanel.Events = {
    EditorClosed: "EditorClosed",
    EditorSelected: "EditorSelected",
}

WebInspector.SourcesPanel.prototype = {
    /**
     * @param {?Event=} event
     */
    _onCloseEditorTab: function(event)
    {
        var uiSourceCode = this.currentUISourceCode();
        if (!uiSourceCode)
            return false;
        this._editorContainer.closeFile(uiSourceCode);
        return true;
    },

    /**
     * @param {?Event=} event
     */
    _onJumpToPreviousLocation: function(event)
    {
        this._historyManager.rollback();
        return true;
    },

    /**
     * @param {?Event=} event
     */
    _onJumpToNextLocation: function(event)
    {
        this._historyManager.rollover();
        return true;
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this._editorContainer.view.defaultFocusedElement() || this._navigator.view.defaultFocusedElement();
    },

    get paused()
    {
        return this._paused;
    },

    /**
     * @return {!WebInspector.SourcesPanel.DrawerEditor}
     */
    _drawerEditor: function()
    {
        var drawerEditorInstance = WebInspector.moduleManager.instance(WebInspector.DrawerEditor);
        console.assert(drawerEditorInstance instanceof WebInspector.SourcesPanel.DrawerEditor, "WebInspector.DrawerEditor module instance does not use WebInspector.SourcesPanel.DrawerEditor as an implementation. ");
        return /** @type {!WebInspector.SourcesPanel.DrawerEditor} */ (drawerEditorInstance);
    },

    wasShown: function()
    {
        this._drawerEditor()._panelWasShown();
        this.sourcesView.show(this.editorView.mainElement());
        WebInspector.Panel.prototype.wasShown.call(this);

        this.element.addEventListener("keydown", this._boundOnKeyDown, false);
        this.element.addEventListener("keyup", this._boundOnKeyUp, false);
    },

    willHide: function()
    {
        this.element.removeEventListener("keydown", this._boundOnKeyDown, false);
        this.element.removeEventListener("keyup", this._boundOnKeyUp, false);

        WebInspector.Panel.prototype.willHide.call(this);
        this._drawerEditor()._panelWillHide();
        this.sourcesView.show(this._drawerEditorView.element);
    },

    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._addUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _addUISourceCode: function(uiSourceCode)
    {
        if (uiSourceCode.project().isServiceProject())
            return;
        this._editorContainer.addUISourceCode(uiSourceCode);
        // Replace debugger script-based uiSourceCode with a network-based one.
        var currentUISourceCode = this._currentUISourceCode;
        if (currentUISourceCode && currentUISourceCode.project().isServiceProject() && currentUISourceCode !== uiSourceCode && currentUISourceCode.url === uiSourceCode.url) {
            this._showFile(uiSourceCode);
            this._editorContainer.removeUISourceCode(currentUISourceCode);
        }
    },

    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._removeUISourceCodes([uiSourceCode]);
    },

    /**
     * @param {!Array.<!WebInspector.UISourceCode>} uiSourceCodes
     */
    _removeUISourceCodes: function(uiSourceCodes)
    {
        for (var i = 0; i < uiSourceCodes.length; ++i) {
            this._removeSourceFrame(uiSourceCodes[i]);
            this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
        }
        this._editorContainer.removeUISourceCodes(uiSourceCodes);
    },

    _consoleCommandEvaluatedInSelectedCallFrame: function(event)
    {
        this.sidebarPanes.scopechain.update(WebInspector.debuggerModel.selectedCallFrame());
    },

    _debuggerPaused: function()
    {
        WebInspector.inspectorView.setCurrentPanel(this);
        this._showDebuggerPausedDetails();
    },

    _showDebuggerPausedDetails: function()
    {
        var details = WebInspector.debuggerModel.debuggerPausedDetails();

        this._paused = true;
        this._waitingToPause = false;

        this._updateDebuggerButtons();

        this.sidebarPanes.callstack.update(details.callFrames, details.asyncStackTrace);

        /**
         * @param {!Element} element
         * @this {WebInspector.SourcesPanel}
         */
        function didCreateBreakpointHitStatusMessage(element)
        {
            this.sidebarPanes.callstack.setStatus(element);
        }

        /**
         * @param {!WebInspector.UILocation} uiLocation
         * @this {WebInspector.SourcesPanel}
         */
        function didGetUILocation(uiLocation)
        {
            var breakpoint = WebInspector.breakpointManager.findBreakpointOnLine(uiLocation.uiSourceCode, uiLocation.lineNumber);
            if (!breakpoint)
                return;
            this.sidebarPanes.jsBreakpoints.highlightBreakpoint(breakpoint);
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a JavaScript breakpoint."));
        }

        if (details.reason === WebInspector.DebuggerModel.BreakReason.DOM) {
            WebInspector.domBreakpointsSidebarPane.highlightBreakpoint(details.auxData);
            WebInspector.domBreakpointsSidebarPane.createBreakpointHitStatusMessage(details.auxData, didCreateBreakpointHitStatusMessage.bind(this));
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.EventListener) {
            var eventName = details.auxData.eventName;
            this.sidebarPanes.eventListenerBreakpoints.highlightBreakpoint(details.auxData.eventName);
            var eventNameForUI = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName, details.auxData);
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a \"%s\" Event Listener.", eventNameForUI));
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.XHR) {
            this.sidebarPanes.xhrBreakpoints.highlightBreakpoint(details.auxData["breakpointURL"]);
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a XMLHttpRequest."));
        } else if (details.reason === WebInspector.DebuggerModel.BreakReason.Exception)
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on exception: '%s'.", details.auxData.description));
        else if (details.reason === WebInspector.DebuggerModel.BreakReason.Assert)
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on assertion."));
        else if (details.reason === WebInspector.DebuggerModel.BreakReason.CSPViolation)
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a script blocked due to Content Security Policy directive: \"%s\".", details.auxData["directiveText"]));
        else if (details.reason === WebInspector.DebuggerModel.BreakReason.DebugCommand)
            this.sidebarPanes.callstack.setStatus(WebInspector.UIString("Paused on a debugged function"));
        else {
            if (details.callFrames.length)
                details.callFrames[0].createLiveLocation(didGetUILocation.bind(this));
            else
                console.warn("ScriptsPanel paused, but callFrames.length is zero."); // TODO remove this once we understand this case better
        }

        this._splitView.showBoth(true);
        this._toggleDebuggerSidebarButton.setEnabled(false);
        window.focus();
        InspectorFrontendHost.bringToFront();
    },

    _debuggerResumed: function()
    {
        this._paused = false;
        this._waitingToPause = false;

        this._clearInterface();
        this._toggleDebuggerSidebarButton.setEnabled(true);
    },

    _debuggerWasEnabled: function()
    {
        this._updateDebuggerButtons();
    },

    _debuggerWasDisabled: function()
    {
        this._debuggerReset();
    },

    _debuggerReset: function()
    {
        this._debuggerResumed();
        this.sidebarPanes.watchExpressions.reset();
        delete this._skipExecutionLineRevealing;
    },

    _projectWillReset: function(event)
    {
        var project = event.data;
        var uiSourceCodes = project.uiSourceCodes();
        this._removeUISourceCodes(uiSourceCodes);
        if (project.type() === WebInspector.projectTypes.Network)
            this._editorContainer.reset();
    },

    /**
     * @return {!WebInspector.View}
     */
    get visibleView()
    {
        return this._editorContainer.visibleView;
    },

    /**
     * @return {?WebInspector.SourceFrame}
     */
    currentSourceFrame: function()
    {
        var view = this.visibleView;
        if (!(view instanceof WebInspector.SourceFrame))
            return null;
        return /** @type {!WebInspector.SourceFrame} */ (view);
    },

    _updateScriptViewStatusBarItems: function()
    {
        this._scriptViewStatusBarItemsContainer.removeChildren();
        this._scriptViewStatusBarTextContainer.removeChildren();
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return;

        var statusBarItems = sourceFrame.statusBarItems() || [];
        for (var i = 0; i < statusBarItems.length; ++i)
            this._scriptViewStatusBarItemsContainer.appendChild(statusBarItems[i]);
        var statusBarText = sourceFrame.statusBarText();
        if (statusBarText)
            this._scriptViewStatusBarTextContainer.appendChild(statusBarText);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     * @param {number=} columnNumber
     * @param {boolean=} forceShowInPanel
     */
    showUISourceCode: function(uiSourceCode, lineNumber, columnNumber, forceShowInPanel)
    {
        this._showSourceLocation(uiSourceCode, lineNumber, columnNumber, forceShowInPanel);
    },

    /**
     * @param {boolean=} forceShowInPanel
     */
    _showEditor: function(forceShowInPanel)
    {
        if (this.sourcesView.isShowing())
            return;

        if (this._shouldShowEditorInDrawer() && !forceShowInPanel)
            this._drawerEditor()._show();
        else
            WebInspector.inspectorView.showPanel("sources");
    },

    /**
     * @return {?WebInspector.UISourceCode}
     */
    currentUISourceCode: function()
    {
        return this._currentUISourceCode;
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     * @param {boolean=} forceShowInPanel
     */
    showUILocation: function(uiLocation, forceShowInPanel)
    {
        this._showSourceLocation(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, forceShowInPanel);
    },

    /**
     * @return {boolean}
     */
    _shouldShowEditorInDrawer: function()
    {
        return WebInspector.experimentsSettings.showEditorInDrawer.isEnabled() && WebInspector.settings.showEditorInDrawer.get() && WebInspector.inspectorView.isDrawerEditorShown();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     * @param {number=} columnNumber
     * @param {boolean=} forceShowInPanel
     * @param {boolean=} omitFocus
     */
    _showSourceLocation: function(uiSourceCode, lineNumber, columnNumber, forceShowInPanel, omitFocus)
    {
        this._showEditor(forceShowInPanel);
        this._historyManager.updateCurrentState();
        var sourceFrame = this._showFile(uiSourceCode);
        if (typeof lineNumber === "number")
            sourceFrame.highlightPosition(lineNumber, columnNumber);
        this._historyManager.pushNewState();
        if (!omitFocus)
            sourceFrame.focus();
        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.OpenSourceLink,
            url: uiSourceCode.originURL(),
            lineNumber: lineNumber
        });
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.SourceFrame}
     */
    _showFile: function(uiSourceCode)
    {
        var sourceFrame = this._getOrCreateSourceFrame(uiSourceCode);
        if (this._currentUISourceCode === uiSourceCode)
            return sourceFrame;

        this._currentUISourceCode = uiSourceCode;
        this._editorContainer.showFile(uiSourceCode);
        this._updateScriptViewStatusBarItems();

        if (this._currentUISourceCode.project().type() === WebInspector.projectTypes.Snippets)
            this._runSnippetButton.element.classList.remove("hidden");
        else
            this._runSnippetButton.element.classList.add("hidden");

        return sourceFrame;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.SourceFrame}
     */
    _createSourceFrame: function(uiSourceCode)
    {
        var sourceFrame;
        switch (uiSourceCode.contentType()) {
        case WebInspector.resourceTypes.Script:
            sourceFrame = new WebInspector.JavaScriptSourceFrame(this, uiSourceCode);
            break;
        case WebInspector.resourceTypes.Document:
            sourceFrame = new WebInspector.JavaScriptSourceFrame(this, uiSourceCode);
            break;
        case WebInspector.resourceTypes.Stylesheet:
            sourceFrame = new WebInspector.CSSSourceFrame(uiSourceCode);
            break;
        default:
            sourceFrame = new WebInspector.UISourceCodeFrame(uiSourceCode);
        break;
        }
        sourceFrame.setHighlighterType(uiSourceCode.highlighterType());
        this._sourceFramesByUISourceCode.put(uiSourceCode, sourceFrame);
        this._historyManager.trackSourceFrameCursorJumps(sourceFrame);
        return sourceFrame;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.SourceFrame}
     */
    _getOrCreateSourceFrame: function(uiSourceCode)
    {
        return this._sourceFramesByUISourceCode.get(uiSourceCode) || this._createSourceFrame(uiSourceCode);
    },

    /**
     * @param {!WebInspector.SourceFrame} sourceFrame
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    _sourceFrameMatchesUISourceCode: function(sourceFrame, uiSourceCode)
    {
        switch (uiSourceCode.contentType()) {
        case WebInspector.resourceTypes.Script:
        case WebInspector.resourceTypes.Document:
            return sourceFrame instanceof WebInspector.JavaScriptSourceFrame;
        case WebInspector.resourceTypes.Stylesheet:
            return sourceFrame instanceof WebInspector.CSSSourceFrame;
        default:
            return !(sourceFrame instanceof WebInspector.JavaScriptSourceFrame);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _recreateSourceFrameIfNeeded: function(uiSourceCode)
    {
        var oldSourceFrame = this._sourceFramesByUISourceCode.get(uiSourceCode);
        if (!oldSourceFrame)
            return;
        if (this._sourceFrameMatchesUISourceCode(oldSourceFrame, uiSourceCode)) {
            oldSourceFrame.setHighlighterType(uiSourceCode.highlighterType());
        } else {
            this._editorContainer.removeUISourceCode(uiSourceCode);
            this._removeSourceFrame(uiSourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.SourceFrame}
     */
    viewForFile: function(uiSourceCode)
    {
        return this._getOrCreateSourceFrame(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    revealInNavigator: function(uiSourceCode)
    {
        this._navigator.revealUISourceCode(uiSourceCode);
    },

    /**
     * @return {?WebInspector.UISourceCode}
     */
    selectedUISourceCode: function()
    {
        return this._currentUISourceCode;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeSourceFrame: function(uiSourceCode)
    {
        var sourceFrame = this._sourceFramesByUISourceCode.get(uiSourceCode);
        if (!sourceFrame)
            return;
        this._sourceFramesByUISourceCode.remove(uiSourceCode);
        sourceFrame.dispose();
    },

    _clearCurrentExecutionLine: function()
    {
        if (this._executionSourceFrame)
            this._executionSourceFrame.clearExecutionLine();
        delete this._executionSourceFrame;
    },

    _setExecutionLine: function(uiLocation)
    {
        var callFrame = WebInspector.debuggerModel.selectedCallFrame()
        var sourceFrame = this._getOrCreateSourceFrame(uiLocation.uiSourceCode);
        sourceFrame.setExecutionLine(uiLocation.lineNumber, callFrame);
        this._executionSourceFrame = sourceFrame;
    },

    _executionLineChanged: function(uiLocation)
    {
        this._historyManager.updateCurrentState();
        this._clearCurrentExecutionLine();
        this._setExecutionLine(uiLocation);

        var uiSourceCode = uiLocation.uiSourceCode;
        var scriptFile = this._currentUISourceCode ? this._currentUISourceCode.scriptFile() : null;
        if (this._skipExecutionLineRevealing)
            return;
        this._skipExecutionLineRevealing = true;

        var sourceFrame = this._showFile(uiSourceCode);
        sourceFrame.revealLine(uiLocation.lineNumber);
        this._historyManager.pushNewState();

        if (sourceFrame.canEditSource())
            sourceFrame.setSelection(WebInspector.TextRange.createFromLocation(uiLocation.lineNumber, 0));
        sourceFrame.focus();
    },

    _callFrameSelected: function(event)
    {
        var callFrame = event.data;

        if (!callFrame)
            return;

        this.sidebarPanes.scopechain.update(callFrame);
        this.sidebarPanes.watchExpressions.refreshExpressions();
        this.sidebarPanes.callstack.setSelectedCallFrame(callFrame);
        callFrame.createLiveLocation(this._executionLineChanged.bind(this));
    },

    _editorClosed: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._historyManager.removeHistoryForSourceCode(uiSourceCode);

        var wasSelected = false;
        if (this._currentUISourceCode === uiSourceCode) {
            delete this._currentUISourceCode;
            wasSelected = true;
        }

        // SourcesNavigator does not need to update on EditorClosed.
        this._updateScriptViewStatusBarItems();
        this._searchableView.resetSearch();

        var data = {};
        data.uiSourceCode = uiSourceCode;
        data.wasSelected = wasSelected;
        this.dispatchEventToListeners(WebInspector.SourcesPanel.Events.EditorClosed, data);
    },

    _editorSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data.currentFile);
        var shouldUseHistoryManager = uiSourceCode !== this._currentUISourceCode && event.data.userGesture;
        if (shouldUseHistoryManager)
            this._historyManager.updateCurrentState();
        var sourceFrame = this._showFile(uiSourceCode);
        if (shouldUseHistoryManager)
            this._historyManager.pushNewState();

        this._searchableView.setReplaceable(!!sourceFrame && sourceFrame.canEditSource());
        this._searchableView.resetSearch();

        this.dispatchEventToListeners(WebInspector.SourcesPanel.Events.EditorSelected, uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data.uiSourceCode);
        this._showSourceLocation(uiSourceCode, undefined, undefined, undefined, !event.data.focusSource)
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceRenamed: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._recreateSourceFrameIfNeeded(uiSourceCode);
    },

    _pauseOnExceptionEnabledChanged: function()
    {
        var enabled = WebInspector.settings.pauseOnExceptionEnabled.get();
        this._pauseOnExceptionButton.toggled = enabled;
        this._pauseOnExceptionButton.title = WebInspector.UIString(enabled ? "Don't pause on exceptions." : "Pause on exceptions.");
        this._debugToolbarDrawer.classList.toggle("expanded", enabled);
    },

    _updateDebuggerButtons: function()
    {
        if (this._paused) {
            this._updateButtonTitle(this._pauseButton, WebInspector.UIString("Resume script execution (%s)."))
            this._pauseButton.state = true;
            this._pauseButton.setLongClickOptionsEnabled((function() { return [ this._longResumeButton ] }).bind(this));

            this._pauseButton.setEnabled(true);
            this._stepOverButton.setEnabled(true);
            this._stepIntoButton.setEnabled(true);
            this._stepOutButton.setEnabled(true);
        } else {
            this._updateButtonTitle(this._pauseButton, WebInspector.UIString("Pause script execution (%s)."))
            this._pauseButton.state = false;
            this._pauseButton.setLongClickOptionsEnabled(null);

            this._pauseButton.setEnabled(!this._waitingToPause);
            this._stepOverButton.setEnabled(false);
            this._stepIntoButton.setEnabled(false);
            this._stepOutButton.setEnabled(false);
        }
    },

    _clearInterface: function()
    {
        this.sidebarPanes.callstack.update(null, null);
        this.sidebarPanes.scopechain.update(null);
        this.sidebarPanes.jsBreakpoints.clearBreakpointHighlight();
        WebInspector.domBreakpointsSidebarPane.clearBreakpointHighlight();
        this.sidebarPanes.eventListenerBreakpoints.clearBreakpointHighlight();
        this.sidebarPanes.xhrBreakpoints.clearBreakpointHighlight();

        this._clearCurrentExecutionLine();
        this._updateDebuggerButtons();
    },

    _togglePauseOnExceptions: function()
    {
        WebInspector.settings.pauseOnExceptionEnabled.set(!this._pauseOnExceptionButton.toggled);
    },

    /**
     * @return {boolean}
     */
    _runSnippet: function()
    {
        if (this._currentUISourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return false;
        WebInspector.scriptSnippetModel.evaluateScriptSnippet(this._currentUISourceCode);
        return true;
    },

    /**
     * @return {boolean}
     */
    _togglePause: function()
    {
        if (this._paused) {
            delete this._skipExecutionLineRevealing;
            this._paused = false;
            this._waitingToPause = false;
            WebInspector.debuggerModel.resume();
        } else {
            this._waitingToPause = true;
            // Make sure pauses didn't stick skipped.
            WebInspector.debuggerModel.skipAllPauses(false);
            DebuggerAgent.pause();
        }

        this._clearInterface();
        return true;
    },

    /**
     * @return {boolean}
     */
    _longResume: function()
    {
        if (!this._paused)
            return true;

        this._paused = false;
        this._waitingToPause = false;
        WebInspector.debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
        WebInspector.debuggerModel.resume();

        this._clearInterface();
        return true;
    },

    /**
     * @return {boolean}
     */
    _stepOverClicked: function()
    {
        if (!this._paused)
            return true;

        delete this._skipExecutionLineRevealing;
        this._paused = false;

        this._clearInterface();

        WebInspector.debuggerModel.stepOver();
        return true;
    },

    /**
     * @return {boolean}
     */
    _stepIntoClicked: function()
    {
        if (!this._paused)
            return true;

        delete this._skipExecutionLineRevealing;
        this._paused = false;

        this._clearInterface();

        WebInspector.debuggerModel.stepInto();
        return true;
    },

    /**
     * @param {?Event=} event
     * @return {boolean}
     */
    _stepIntoSelectionClicked: function(event)
    {
        if (!this._paused)
            return true;

        if (this._executionSourceFrame) {
            var stepIntoMarkup = this._executionSourceFrame.stepIntoMarkup();
            if (stepIntoMarkup)
                stepIntoMarkup.iterateSelection(event.shiftKey);
        }
        return true;
    },

    doStepIntoSelection: function(rawLocation)
    {
        if (!this._paused)
            return;

        delete this._skipExecutionLineRevealing;
        this._paused = false;
        this._clearInterface();
        WebInspector.debuggerModel.stepIntoSelection(rawLocation);
    },

    /**
     * @return {boolean}
     */
    _stepOutClicked: function()
    {
        if (!this._paused)
            return true;

        delete this._skipExecutionLineRevealing;
        this._paused = false;

        this._clearInterface();

        WebInspector.debuggerModel.stepOut();
        return true;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _callFrameSelectedInSidebar: function(event)
    {
        var callFrame = /** @type {!WebInspector.DebuggerModel.CallFrame} */ (event.data);
        delete this._skipExecutionLineRevealing;
        WebInspector.debuggerModel.setSelectedCallFrame(callFrame);
    },

    _callFrameRestartedInSidebar: function()
    {
        delete this._skipExecutionLineRevealing;
    },

    continueToLocation: function(rawLocation)
    {
        if (!this._paused)
            return;

        delete this._skipExecutionLineRevealing;
        this._paused = false;
        this._clearInterface();
        WebInspector.debuggerModel.continueToLocation(rawLocation);
    },

    _toggleBreakpointsClicked: function(event)
    {
        WebInspector.debuggerModel.setBreakpointsActive(!WebInspector.debuggerModel.breakpointsActive());
    },

    _breakpointsActiveStateChanged: function(event)
    {
        var active = event.data;
        this._toggleBreakpointsButton.toggled = !active;
        if (active) {
            this._toggleBreakpointsButton.title = WebInspector.UIString("Deactivate breakpoints.");
            this._editorContainer.view.element.classList.remove("breakpoints-deactivated");
            this.sidebarPanes.jsBreakpoints.listElement.classList.remove("breakpoints-list-deactivated");
        } else {
            this._toggleBreakpointsButton.title = WebInspector.UIString("Activate breakpoints.");
            this._editorContainer.view.element.classList.add("breakpoints-deactivated");
            this.sidebarPanes.jsBreakpoints.listElement.classList.add("breakpoints-list-deactivated");
        }
    },

    _createDebugToolbar: function()
    {
        var debugToolbar = document.createElement("div");
        debugToolbar.className = "scripts-debug-toolbar";

        var title, handler;
        var platformSpecificModifier = WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta;

        // Run snippet.
        title = WebInspector.UIString("Run snippet (%s).");
        handler = this._runSnippet.bind(this);
        this._runSnippetButton = this._createButtonAndRegisterShortcuts("scripts-run-snippet", title, handler, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.RunSnippet);
        debugToolbar.appendChild(this._runSnippetButton.element);
        this._runSnippetButton.element.classList.add("hidden");

        // Continue.
        handler = this._togglePause.bind(this);
        this._pauseButton = this._createButtonAndRegisterShortcuts("scripts-pause", "", handler, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PauseContinue);
        debugToolbar.appendChild(this._pauseButton.element);

        // Long resume.
        title = WebInspector.UIString("Resume with all pauses blocked for 500 ms");
        this._longResumeButton = new WebInspector.StatusBarButton(title, "scripts-long-resume");
        this._longResumeButton.addEventListener("click", this._longResume.bind(this), this);

        // Step over.
        title = WebInspector.UIString("Step over next function call (%s).");
        handler = this._stepOverClicked.bind(this);
        this._stepOverButton = this._createButtonAndRegisterShortcuts("scripts-step-over", title, handler, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOver);
        debugToolbar.appendChild(this._stepOverButton.element);

        // Step into.
        title = WebInspector.UIString("Step into next function call (%s).");
        handler = this._stepIntoClicked.bind(this);
        this._stepIntoButton = this._createButtonAndRegisterShortcuts("scripts-step-into", title, handler, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepInto);
        debugToolbar.appendChild(this._stepIntoButton.element);

        // Step into selection (keyboard shortcut only).
        this.registerShortcuts(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepIntoSelection, this._stepIntoSelectionClicked.bind(this))

        // Step out.
        title = WebInspector.UIString("Step out of current function (%s).");
        handler = this._stepOutClicked.bind(this);
        this._stepOutButton = this._createButtonAndRegisterShortcuts("scripts-step-out", title, handler, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOut);
        debugToolbar.appendChild(this._stepOutButton.element);

        // Toggle Breakpoints
        this._toggleBreakpointsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Deactivate breakpoints."), "scripts-toggle-breakpoints");
        this._toggleBreakpointsButton.toggled = false;
        this._toggleBreakpointsButton.addEventListener("click", this._toggleBreakpointsClicked, this);
        debugToolbar.appendChild(this._toggleBreakpointsButton.element);

        // Pause on Exception
        this._pauseOnExceptionButton = new WebInspector.StatusBarButton("", "scripts-pause-on-exceptions-status-bar-item");
        this._pauseOnExceptionButton.addEventListener("click", this._togglePauseOnExceptions, this);
        debugToolbar.appendChild(this._pauseOnExceptionButton.element);

        return debugToolbar;
    },

    _createDebugToolbarDrawer: function()
    {
        var debugToolbarDrawer = document.createElement("div");
        debugToolbarDrawer.className = "scripts-debug-toolbar-drawer";

        var label = WebInspector.UIString("Pause On Caught Exceptions");
        var setting = WebInspector.settings.pauseOnCaughtException;
        debugToolbarDrawer.appendChild(WebInspector.SettingsUI.createSettingCheckbox(label, setting, true));

        return debugToolbarDrawer;
    },

    /**
     * @param {!WebInspector.StatusBarButton} button
     * @param {string} buttonTitle
     */
    _updateButtonTitle: function(button, buttonTitle)
    {
        var hasShortcuts = button.shortcuts && button.shortcuts.length;
        if (hasShortcuts)
            button.title = String.vsprintf(buttonTitle, [button.shortcuts[0].name]);
        else
            button.title = buttonTitle;
    },

    /**
     * @param {string} buttonId
     * @param {string} buttonTitle
     * @param {function(?Event=):boolean} handler
     * @param {!Array.<!WebInspector.KeyboardShortcut.Descriptor>} shortcuts
     * @return {!WebInspector.StatusBarButton}
     */
    _createButtonAndRegisterShortcuts: function(buttonId, buttonTitle, handler, shortcuts)
    {
        var button = new WebInspector.StatusBarButton(buttonTitle, buttonId);
        button.element.addEventListener("click", handler, false);
        button.shortcuts = shortcuts;
        this._updateButtonTitle(button, buttonTitle);
        this.registerShortcuts(shortcuts, handler);
        return button;
    },

    searchCanceled: function()
    {
        if (this._searchView)
            this._searchView.searchCanceled();

        delete this._searchView;
        delete this._searchQuery;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump)
    {
        this._searchableView.updateSearchMatchesCount(0);

        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return;

        this._searchView = sourceFrame;
        this._searchQuery = query;

        /**
         * @param {!WebInspector.View} view
         * @param {number} searchMatches
         * @this {WebInspector.SourcesPanel}
         */
        function finishedCallback(view, searchMatches)
        {
            if (!searchMatches)
                return;

            this._searchableView.updateSearchMatchesCount(searchMatches);
        }

        /**
         * @param {number} currentMatchIndex
         * @this {WebInspector.SourcesPanel}
         */
        function currentMatchChanged(currentMatchIndex)
        {
            this._searchableView.updateCurrentMatchIndex(currentMatchIndex);
        }

        /**
         * @this {WebInspector.SourcesPanel}
         */
        function searchResultsChanged()
        {
            this._searchableView.cancelSearch();
        }

        this._searchView.performSearch(query, shouldJump, finishedCallback.bind(this), currentMatchChanged.bind(this), searchResultsChanged.bind(this));
    },

    jumpToNextSearchResult: function()
    {
        if (!this._searchView)
            return;

        if (this._searchView !== this.currentSourceFrame()) {
            this.performSearch(this._searchQuery, true);
            return;
        }

        this._searchView.jumpToNextSearchResult();
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchView)
            return;

        if (this._searchView !== this.currentSourceFrame()) {
            this.performSearch(this._searchQuery, true);
            if (this._searchView)
                this._searchView.jumpToLastSearchResult();
            return;
        }

        this._searchView.jumpToPreviousSearchResult();
    },

    /**
     * @param {string} text
     */
    replaceSelectionWith: function(text)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(sourceFrame);
            return;
        }
        sourceFrame.replaceSelectionWith(text);
    },

    /**
     * @param {string} query
     * @param {string} text
     */
    replaceAllWith: function(query, text)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(sourceFrame);
            return;
        }
        sourceFrame.replaceAllWith(query, text);
    },

    _onKeyDown: function(event)
    {
        if (event.keyCode !== WebInspector.KeyboardShortcut.Keys.CtrlOrMeta.code)
            return;
        if (!this._paused || !this._executionSourceFrame)
            return;
        var stepIntoMarkup = this._executionSourceFrame.stepIntoMarkup();
        if (stepIntoMarkup)
            stepIntoMarkup.startIteratingSelection();
    },

    _onKeyUp: function(event)
    {
        if (event.keyCode !== WebInspector.KeyboardShortcut.Keys.CtrlOrMeta.code)
            return;
        if (!this._paused || !this._executionSourceFrame)
            return;
        var stepIntoMarkup = this._executionSourceFrame.stepIntoMarkup();
        if (!stepIntoMarkup)
            return;
        var currentPosition = stepIntoMarkup.getSelectedItemIndex();
        if (typeof currentPosition === "undefined") {
            stepIntoMarkup.stopIteratingSelection();
        } else {
            var rawLocation = stepIntoMarkup.getRawPosition(currentPosition);
            this.doStepIntoSelection(rawLocation);
        }
    },

    addToWatch: function(expression)
    {
        this.sidebarPanes.watchExpressions.addExpression(expression);
    },

    /**
     * @return {boolean}
     */
    _toggleBreakpoint: function()
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return false;

        if (sourceFrame instanceof WebInspector.JavaScriptSourceFrame) {
            var javaScriptSourceFrame = /** @type {!WebInspector.JavaScriptSourceFrame} */ (sourceFrame);
            javaScriptSourceFrame.toggleBreakpointOnCurrentLine();
            return true;
        }
        return false;
    },

    /**
     * @param {?Event=} event
     * @return {boolean}
     */
    _showOutlineDialog: function(event)
    {
        var uiSourceCode = this._editorContainer.currentFile();
        if (!uiSourceCode)
            return false;

        switch (uiSourceCode.contentType()) {
        case WebInspector.resourceTypes.Document:
        case WebInspector.resourceTypes.Script:
            WebInspector.JavaScriptOutlineDialog.show(this.visibleView, uiSourceCode, this.highlightPosition.bind(this));
            return true;
        case WebInspector.resourceTypes.Stylesheet:
            WebInspector.StyleSheetOutlineDialog.show(this.visibleView, uiSourceCode, this.highlightPosition.bind(this));
            return true;
        }
        return false;
    },

    _installDebuggerSidebarController: function()
    {
        this._toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton("navigator", "scripts-navigator-show-hide-button");
        this.editorView.mainElement().appendChild(this._toggleNavigatorSidebarButton.element);

        this._toggleDebuggerSidebarButton = this._splitView.createShowHideSidebarButton("debugger", "scripts-debugger-show-hide-button");

        this._splitView.mainElement().appendChild(this._toggleDebuggerSidebarButton.element);
        this._splitView.mainElement().appendChild(this._debugSidebarResizeWidgetElement);
    },

    _updateDebugSidebarResizeWidget: function()
    {
        this._debugSidebarResizeWidgetElement.classList.toggle("hidden", this._splitView.showMode() !== WebInspector.SplitView.ShowMode.Both);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _showLocalHistory: function(uiSourceCode)
    {
        WebInspector.RevisionHistoryView.showHistory(uiSourceCode);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        this._appendUISourceCodeItems(contextMenu, target);
        this._appendFunctionItems(contextMenu, target);
    },

    _suggestReload: function()
    {
        if (window.confirm(WebInspector.UIString("It is recommended to restart inspector after making these changes. Would you like to restart it?")))
            WebInspector.reload();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _mapFileSystemToNetwork: function(uiSourceCode)
    {
        WebInspector.SelectUISourceCodeForProjectTypeDialog.show(uiSourceCode.name(), WebInspector.projectTypes.Network, mapFileSystemToNetwork.bind(this), this.editorView.mainElement())

        /**
         * @param {!WebInspector.UISourceCode} networkUISourceCode
         * @this {WebInspector.SourcesPanel}
         */
        function mapFileSystemToNetwork(networkUISourceCode)
        {
            this._workspace.addMapping(networkUISourceCode, uiSourceCode, WebInspector.fileSystemWorkspaceProvider);
            this._suggestReload();
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeNetworkMapping: function(uiSourceCode)
    {
        if (confirm(WebInspector.UIString("Are you sure you want to remove network mapping?"))) {
            this._workspace.removeMapping(uiSourceCode);
            this._suggestReload();
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} networkUISourceCode
     */
    _mapNetworkToFileSystem: function(networkUISourceCode)
    {
        WebInspector.SelectUISourceCodeForProjectTypeDialog.show(networkUISourceCode.name(), WebInspector.projectTypes.FileSystem, mapNetworkToFileSystem.bind(this), this.editorView.mainElement())

        /**
         * @param {!WebInspector.UISourceCode} uiSourceCode
         * @this {WebInspector.SourcesPanel}
         */
        function mapNetworkToFileSystem(uiSourceCode)
        {
            this._workspace.addMapping(networkUISourceCode, uiSourceCode, WebInspector.fileSystemWorkspaceProvider);
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _appendUISourceCodeMappingItems: function(contextMenu, uiSourceCode)
    {
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
            var hasMappings = !!uiSourceCode.url;
            if (!hasMappings)
                contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Map to network resource\u2026" : "Map to Network Resource\u2026"), this._mapFileSystemToNetwork.bind(this, uiSourceCode));
            else
                contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove network mapping" : "Remove Network Mapping"), this._removeNetworkMapping.bind(this, uiSourceCode));
        }

        /**
         * @param {!WebInspector.Project} project
         */
        function filterProject(project)
        {
            return project.type() === WebInspector.projectTypes.FileSystem;
        }

        if (uiSourceCode.project().type() === WebInspector.projectTypes.Network) {
            if (!this._workspace.projects().filter(filterProject).length)
                return;
            if (this._workspace.uiSourceCodeForURL(uiSourceCode.url) === uiSourceCode)
                contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Map to file system resource\u2026" : "Map to File System Resource\u2026"), this._mapNetworkToFileSystem.bind(this, uiSourceCode));
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    _appendUISourceCodeItems: function(contextMenu, target)
    {
        if (!(target instanceof WebInspector.UISourceCode))
            return;

        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (target);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Local modifications\u2026" : "Local Modifications\u2026"), this._showLocalHistory.bind(this, uiSourceCode));
        this._appendUISourceCodeMappingItems(contextMenu, uiSourceCode);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    _appendFunctionItems: function(contextMenu, target)
    {
        if (!(target instanceof WebInspector.RemoteObject))
            return;
        var remoteObject = /** @type {!WebInspector.RemoteObject} */ (target);
        if (remoteObject.type !== "function")
            return;

        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.FunctionDetails} response
         * @this {WebInspector.SourcesPanel}
         */
        function didGetDetails(error, response)
        {
            if (error) {
                console.error(error);
                return;
            }

            var uiLocation = WebInspector.debuggerModel.rawLocationToUILocation(response.location);
            if (!uiLocation)
                return;

            this.showUILocation(uiLocation, true);
        }

        /**
         * @this {WebInspector.SourcesPanel}
         */
        function revealFunction()
        {
            DebuggerAgent.getFunctionDetails(remoteObject.objectId, didGetDetails.bind(this));
        }

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show function definition" : "Show Function Definition"), revealFunction.bind(this));
    },

    showGoToSourceDialog: function()
    {
        var uiSourceCodes = this._editorContainer.historyUISourceCodes();
        /** @type {!Map.<!WebInspector.UISourceCode, number>} */
        var defaultScores = new Map();
        for (var i = 1; i < uiSourceCodes.length; ++i) // Skip current element
            defaultScores.put(uiSourceCodes[i], uiSourceCodes.length - i);
        WebInspector.OpenResourceDialog.show(this, this.editorView.mainElement(), undefined, defaultScores);
    },

    _dockSideChanged: function()
    {
        var vertically = WebInspector.dockController.isVertical() && WebInspector.settings.splitVerticallyWhenDockedToRight.get();
        this._splitVertically(vertically);
    },

    /**
     * @param {boolean} vertically
     */
    _splitVertically: function(vertically)
    {
        if (this.sidebarPaneView && vertically === !this._splitView.isVertical())
            return;

        if (this.sidebarPaneView)
            this.sidebarPaneView.detach();

        this._splitView.setVertical(!vertically);

        if (!vertically)
            this._splitView.uninstallResizer(this._statusBarContainerElement);
        else
            this._splitView.installResizer(this._statusBarContainerElement);

        // Create vertical box with stack.
        var vbox = new WebInspector.VBox();
        vbox.element.appendChild(this._debugToolbarDrawer);
        vbox.element.appendChild(this.debugToolbar);
        vbox.element.appendChild(this.threadsToolbar.element);
        var sidebarPaneStack = new WebInspector.SidebarPaneStack();
        sidebarPaneStack.element.classList.add("flex-auto");
        sidebarPaneStack.show(vbox.element);

        if (!vertically) {
            // Populate the only stack.
            for (var pane in this.sidebarPanes)
                sidebarPaneStack.addPane(this.sidebarPanes[pane]);
            this._extensionSidebarPanesContainer = sidebarPaneStack;

            this.sidebarPaneView = vbox;
        } else {
            var splitView = new WebInspector.SplitView(true, true, "sourcesPanelDebuggerSidebarSplitViewState", 0.5);
            splitView.setMainElementConstraints(WebInspector.SourcesPanel.minToolbarWidth, 25);
            vbox.show(splitView.mainElement());

            // Populate the left stack.
            sidebarPaneStack.addPane(this.sidebarPanes.callstack);
            sidebarPaneStack.addPane(this.sidebarPanes.jsBreakpoints);
            sidebarPaneStack.addPane(this.sidebarPanes.domBreakpoints);
            sidebarPaneStack.addPane(this.sidebarPanes.xhrBreakpoints);
            sidebarPaneStack.addPane(this.sidebarPanes.eventListenerBreakpoints);
            if (this.sidebarPanes.workerList)
                sidebarPaneStack.addPane(this.sidebarPanes.workerList);

            var tabbedPane = new WebInspector.SidebarTabbedPane();
            tabbedPane.show(splitView.sidebarElement());
            tabbedPane.addPane(this.sidebarPanes.scopechain);
            tabbedPane.addPane(this.sidebarPanes.watchExpressions);
            this._extensionSidebarPanesContainer = tabbedPane;

            this.sidebarPaneView = splitView;
        }
        for (var i = 0; i < this._extensionSidebarPanes.length; ++i)
            this._extensionSidebarPanesContainer.addPane(this._extensionSidebarPanes[i]);

        this.sidebarPaneView.show(this._splitView.sidebarElement());

        this.sidebarPanes.scopechain.expand();
        this.sidebarPanes.jsBreakpoints.expand();
        this.sidebarPanes.callstack.expand();

        if (WebInspector.settings.watchExpressions.get().length > 0)
            this.sidebarPanes.watchExpressions.expand();
    },

    /**
     * @return {boolean}
     */
    canHighlightPosition: function()
    {
        return !!this.currentSourceFrame();
    },

    /**
     * @param {number} line
     * @param {number=} column
     */
    highlightPosition: function(line, column)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return;
        this._historyManager.updateCurrentState();
        sourceFrame.highlightPosition(line, column);
        this._historyManager.pushNewState();
    },

    /**
     * @param {string} id
     * @param {!WebInspector.SidebarPane} pane
     */
    addExtensionSidebarPane: function(id, pane)
    {
        this._extensionSidebarPanes.push(pane);
        this._extensionSidebarPanesContainer.addPane(pane);
        this.setHideOnDetach();
    },

    /**
     * @return {!WebInspector.TabbedEditorContainer}
     */
    get tabbedEditorContainer()
    {
        return this._editorContainer;
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SourcesView = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("sourcesView.css");
    this.element.id = "sources-panel-sources-view";
    this.element.addEventListener("dragenter", this._onDragEnter.bind(this), true);
    this.element.addEventListener("dragover", this._onDragOver.bind(this), true);
}

WebInspector.SourcesView.dragAndDropFilesType = "Files";

WebInspector.SourcesView.prototype = {
    _onDragEnter: function (event)
    {
        if (event.dataTransfer.types.indexOf(WebInspector.SourcesView.dragAndDropFilesType) === -1)
            return;
        event.consume(true);
    },

    _onDragOver: function (event)
    {
        if (event.dataTransfer.types.indexOf(WebInspector.SourcesView.dragAndDropFilesType) === -1)
            return;
        event.consume(true);
        if (this._dragMaskElement)
            return;
        this._dragMaskElement = this.element.createChild("div", "fill drag-mask");
        this._dragMaskElement.addEventListener("drop", this._onDrop.bind(this), true);
        this._dragMaskElement.addEventListener("dragleave", this._onDragLeave.bind(this), true);
    },

    _onDrop: function (event)
    {
        event.consume(true);
        this._removeMask();
        var items = /** @type {!Array.<!DataTransferItem>} */ (event.dataTransfer.items);
        if (!items.length)
            return;
        var entry = items[0].webkitGetAsEntry();
        if (!entry.isDirectory)
            return;
        InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);
    },

    _onDragLeave: function (event)
    {
        event.consume(true);
        this._removeMask();
    },

    _removeMask: function ()
    {
        this._dragMaskElement.remove();
        delete this._dragMaskElement;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {WebInspector.DrawerEditor}
 */
WebInspector.SourcesPanel.DrawerEditor = function()
{
    this._panel = WebInspector.inspectorView.panel("sources");
}

WebInspector.SourcesPanel.DrawerEditor.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    view: function()
    {
        return this._panel._drawerEditorView;
    },

    installedIntoDrawer: function()
    {
        if (this._panel.isShowing())
            this._panelWasShown();
        else
            this._panelWillHide();
    },

    _panelWasShown: function()
    {
        WebInspector.inspectorView.setDrawerEditorAvailable(false);
        WebInspector.inspectorView.hideDrawerEditor();
    },

    _panelWillHide: function()
    {
        WebInspector.inspectorView.setDrawerEditorAvailable(true);
        if (WebInspector.inspectorView.isDrawerEditorShown())
            WebInspector.inspectorView.showDrawerEditor();
    },

    _show: function()
    {
        WebInspector.inspectorView.showDrawerEditor();
    },
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SourcesPanel.DrawerEditorView = function()
{
    WebInspector.VBox.call(this);
    this.element.id = "drawer-editor-view";
}

WebInspector.SourcesPanel.DrawerEditorView.prototype = {
    __proto__: WebInspector.VBox.prototype
}


/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.SourcesPanel.ContextMenuProvider = function()
{
}

WebInspector.SourcesPanel.ContextMenuProvider.prototype = {
    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        WebInspector.inspectorView.panel("sources").appendApplicableItems(event, contextMenu, target);
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SourcesPanel.UILocationRevealer = function()
{
}

WebInspector.SourcesPanel.UILocationRevealer.prototype = {
    /**
     * @param {!Object} uiLocation
     */
    reveal: function(uiLocation)
    {
        if (uiLocation instanceof WebInspector.UILocation)
            /** @type {!WebInspector.SourcesPanel} */ (WebInspector.inspectorView.panel("sources")).showUILocation(uiLocation);
    }
}

/**
 * @interface
 */
WebInspector.SourcesPanel.EditorAction = function()
{
}

WebInspector.SourcesPanel.EditorAction.prototype = {
    /**
     * @param {!WebInspector.SourcesPanel} panel
     * @return {!Element}
     */
    button: function(panel) { }
}
