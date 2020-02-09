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

import {CallStackSidebarPane} from './CallStackSidebarPane.js';
import {DebuggerPausedMessage} from './DebuggerPausedMessage.js';
import {NavigatorView} from './NavigatorView.js';
import {Events, SourcesView} from './SourcesView.js';
import {ThreadsSidebarPane} from './ThreadsSidebarPane.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';

/**
 * @implements {UI.ContextMenu.Provider}
 * @implements {SDK.TargetManager.Observer}
 * @implements {UI.ViewLocationResolver}
 * @unrestricted
 */
export class SourcesPanel extends UI.Panel {
  constructor() {
    super('sources');
    SourcesPanel._instance = this;
    this.registerRequiredCSS('sources/sourcesPanel.css');
    new UI.DropTarget(
        this.element, [UI.DropTarget.Type.Folder], Common.UIString('Drop workspace folder here'),
        this._handleDrop.bind(this));

    this._workspace = self.Workspace.workspace;

    this._togglePauseAction =
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.toggle-pause'));
    this._stepOverAction =
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.step-over'));
    this._stepIntoAction =
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.step-into'));
    this._stepOutAction = /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.step-out'));
    this._stepAction =
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.step'));
    this._toggleBreakpointsActiveAction =
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('debugger.toggle-breakpoints-active'));

    this._debugToolbar = this._createDebugToolbar();
    this._debugToolbarDrawer = this._createDebugToolbarDrawer();
    this._debuggerPausedMessage = new DebuggerPausedMessage();

    const initialDebugSidebarWidth = 225;
    this._splitWidget = new UI.SplitWidget(true, true, 'sourcesPanelSplitViewState', initialDebugSidebarWidth);
    this._splitWidget.enableShowModeSaving();
    this._splitWidget.show(this.element);

    // Create scripts navigator
    const initialNavigatorWidth = 225;
    this.editorView = new UI.SplitWidget(true, false, 'sourcesPanelNavigatorSplitViewState', initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this._splitWidget.setMainWidget(this.editorView);

    // Create navigator tabbed pane with toolbar.
    this._navigatorTabbedLocation =
        self.UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this), 'navigator-view', true);
    const tabbedPane = this._navigatorTabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add('navigator-tabbed-pane');
    const navigatorMenuButton = new UI.ToolbarMenuButton(this._populateNavigatorMenu.bind(this), true);
    navigatorMenuButton.setTitle(Common.UIString('More options'));
    tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);

    if (self.UI.viewManager.hasViewsForLocation('run-view-sidebar')) {
      const navigatorSplitWidget = new UI.SplitWidget(false, true, 'sourcePanelNavigatorSidebarSplitViewState');
      navigatorSplitWidget.setMainWidget(tabbedPane);
      const runViewTabbedPane =
          self.UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this), 'run-view-sidebar')
              .tabbedPane();
      navigatorSplitWidget.setSidebarWidget(runViewTabbedPane);
      navigatorSplitWidget.installResizer(runViewTabbedPane.headerElement());
      this.editorView.setSidebarWidget(navigatorSplitWidget);
    } else {
      this.editorView.setSidebarWidget(tabbedPane);
    }

    this._sourcesView = new SourcesView();
    this._sourcesView.addEventListener(Events.EditorSelected, this._editorSelected.bind(this));

    this._toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton(ls`navigator`);
    this._toggleDebuggerSidebarButton = this._splitWidget.createShowHideSidebarButton(ls`debugger`);
    this.editorView.setMainWidget(this._sourcesView);

    this._threadsSidebarPane = null;
    this._watchSidebarPane = /** @type {!UI.View} */ (self.UI.viewManager.view('sources.watch'));
    this._callstackPane = self.runtime.sharedInstance(CallStackSidebarPane);

    self.Common.settings.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    this._updateDebuggerButtonsAndStatus();
    this._pauseOnExceptionEnabledChanged();
    self.Common.settings.moduleSetting('pauseOnExceptionEnabled')
        .addChangeListener(this._pauseOnExceptionEnabledChanged, this);

    this._liveLocationPool = new Bindings.LiveLocationPool();

    this._setTarget(self.UI.context.flavor(SDK.Target));
    self.Common.settings.moduleSetting('breakpointsActive')
        .addChangeListener(this._breakpointsActiveStateChanged, this);
    self.UI.context.addFlavorChangeListener(SDK.Target, this._onCurrentTargetChanged, this);
    self.UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this._callFrameChanged, this);
    self.SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerWasEnabled, this._debuggerWasEnabled, this);
    self.SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    self.SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed,
        event => this._debuggerResumed(/** @type {!SDK.DebuggerModel} */ (event.data)));
    self.SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared,
        event => this._debuggerResumed(/** @type {!SDK.DebuggerModel} */ (event.data)));
    self.Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
    self.SDK.targetManager.observeTargets(this);
  }

  /**
   * @return {!SourcesPanel}
   */
  static instance() {
    if (SourcesPanel._instance) {
      return SourcesPanel._instance;
    }
    return /** @type {!SourcesPanel} */ (self.runtime.sharedInstance(SourcesPanel));
  }

  /**
   * @param {!SourcesPanel} panel
   */
  static updateResizerAndSidebarButtons(panel) {
    panel._sourcesView.leftToolbar().removeToolbarItems();
    panel._sourcesView.rightToolbar().removeToolbarItems();
    panel._sourcesView.bottomToolbar().removeToolbarItems();
    const isInWrapper = WrapperView.isShowing() && !self.UI.inspectorView.isDrawerMinimized();
    if (panel._splitWidget.isVertical() || isInWrapper) {
      panel._splitWidget.uninstallResizer(panel._sourcesView.toolbarContainerElement());
    } else {
      panel._splitWidget.installResizer(panel._sourcesView.toolbarContainerElement());
    }
    if (!isInWrapper) {
      panel._sourcesView.leftToolbar().appendToolbarItem(panel._toggleNavigatorSidebarButton);
      if (panel._splitWidget.isVertical()) {
        panel._sourcesView.rightToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);
      } else {
        panel._sourcesView.bottomToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);
      }
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._showThreadsIfNeeded();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  _showThreadsIfNeeded() {
    if (ThreadsSidebarPane.shouldBeShown() && !this._threadsSidebarPane) {
      this._threadsSidebarPane = /** @type {!UI.View} */ (self.UI.viewManager.view('sources.threads'));
      if (this._sidebarPaneStack && this._threadsSidebarPane) {
        this._sidebarPaneStack.showView(
            this._threadsSidebarPane, this._splitWidget.isVertical() ? this._watchSidebarPane : this._callstackPane);
      }
    }
  }

  /**
   * @param {?SDK.Target} target
   */
  _setTarget(target) {
    if (!target) {
      return;
    }
    const debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel) {
      return;
    }

    if (debuggerModel.isPaused()) {
      this._showDebuggerPausedDetails(
          /** @type {!SDK.DebuggerPausedDetails} */ (debuggerModel.debuggerPausedDetails()));
    } else {
      this._paused = false;
      this._clearInterface();
      this._toggleDebuggerSidebarButton.setEnabled(true);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onCurrentTargetChanged(event) {
    const target = /** @type {?SDK.Target} */ (event.data);
    this._setTarget(target);
  }
  /**
   * @return {boolean}
   */
  paused() {
    return this._paused;
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.setFlavor(SourcesPanel, this);
    super.wasShown();
    const wrapper = WrapperView._instance;
    if (wrapper && wrapper.isShowing()) {
      self.UI.inspectorView.setDrawerMinimized(true);
      SourcesPanel.updateResizerAndSidebarButtons(this);
    }
    this.editorView.setMainWidget(this._sourcesView);
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    self.UI.context.setFlavor(SourcesPanel, null);
    if (WrapperView.isShowing()) {
      WrapperView._instance._showViewInWrapper();
      self.UI.inspectorView.setDrawerMinimized(false);
      SourcesPanel.updateResizerAndSidebarButtons(this);
    }
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.ViewLocation}
   */
  resolveLocation(locationName) {
    if (locationName === 'sources.sidebar-top' || locationName === 'sources.sidebar-bottom' ||
        locationName === 'sources.sidebar-tabs') {
      return this._sidebarPaneStack;
    } else {
      return this._navigatorTabbedLocation;
    }
  }

  /**
   * @return {boolean}
   */
  _ensureSourcesViewVisible() {
    if (WrapperView.isShowing()) {
      return true;
    }
    if (!self.UI.inspectorView.canSelectPanel('sources')) {
      return false;
    }
    self.UI.viewManager.showView('sources');
    return true;
  }

  /**
   * @override
   */
  onResize() {
    if (self.Common.settings.moduleSetting('sidebarPosition').get() === 'auto') {
      this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));
    }  // Do not force layout.
  }

  /**
   * @override
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._sourcesView.searchableView();
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerPaused(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    const details = debuggerModel.debuggerPausedDetails();
    if (!this._paused) {
      this._setAsCurrentPanel();
    }

    if (self.UI.context.flavor(SDK.Target) === debuggerModel.target()) {
      this._showDebuggerPausedDetails(/** @type {!SDK.DebuggerPausedDetails} */ (details));
    } else if (!this._paused) {
      self.UI.context.setFlavor(SDK.Target, debuggerModel.target());
    }
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} details
   */
  _showDebuggerPausedDetails(details) {
    this._paused = true;
    this._updateDebuggerButtonsAndStatus();
    self.UI.context.setFlavor(SDK.DebuggerPausedDetails, details);
    this._toggleDebuggerSidebarButton.setEnabled(false);
    this._revealDebuggerSidebar();
    window.focus();
    Host.InspectorFrontendHost.bringToFront();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _debuggerResumed(debuggerModel) {
    const target = debuggerModel.target();
    if (self.UI.context.flavor(SDK.Target) !== target) {
      return;
    }
    this._paused = false;
    this._clearInterface();
    this._toggleDebuggerSidebarButton.setEnabled(true);
    this._switchToPausedTargetTimeout = setTimeout(this._switchToPausedTarget.bind(this, debuggerModel), 500);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerWasEnabled(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    if (self.UI.context.flavor(SDK.Target) !== debuggerModel.target()) {
      return;
    }

    this._updateDebuggerButtonsAndStatus();
  }

  /**
   * @return {?UI.Widget}
   */
  get visibleView() {
    return this._sourcesView.visibleView();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number=} lineNumber 0-based
   * @param {number=} columnNumber
   * @param {boolean=} omitFocus
   */
  showUISourceCode(uiSourceCode, lineNumber, columnNumber, omitFocus) {
    if (omitFocus) {
      const wrapperShowing = WrapperView._instance && WrapperView._instance.isShowing();
      if (!this.isShowing() && !wrapperShowing) {
        return;
      }
    } else {
      this._showEditor();
    }
    this._sourcesView.showSourceLocation(uiSourceCode, lineNumber, columnNumber, omitFocus);
  }

  _showEditor() {
    if (WrapperView._instance && WrapperView._instance.isShowing()) {
      return;
    }
    this._setAsCurrentPanel();
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @param {boolean=} omitFocus
   */
  showUILocation(uiLocation, omitFocus) {
    this.showUISourceCode(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, omitFocus);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {boolean=} skipReveal
   */
  _revealInNavigator(uiSourceCode, skipReveal) {
    const extensions = self.runtime.extensions(NavigatorView);
    Promise.all(extensions.map(extension => extension.instance())).then(filterNavigators.bind(this));

    /**
     * @this {SourcesPanel}
     * @param {!Array.<!Object>} objects
     */
    function filterNavigators(objects) {
      for (let i = 0; i < objects.length; ++i) {
        const navigatorView = /** @type {!NavigatorView} */ (objects[i]);
        const viewId = extensions[i].descriptor()['viewId'];
        if (navigatorView.acceptProject(uiSourceCode.project())) {
          navigatorView.revealUISourceCode(uiSourceCode, true);
          if (skipReveal) {
            this._navigatorTabbedLocation.tabbedPane().selectTab(viewId);
          } else {
            self.UI.viewManager.showView(viewId);
          }
        }
      }
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _populateNavigatorMenu(contextMenu) {
    const groupByFolderSetting = self.Common.settings.moduleSetting('navigatorGroupByFolder');
    contextMenu.appendItemsAtLocation('navigatorMenu');
    contextMenu.viewSection().appendCheckboxItem(
        Common.UIString('Group by folder'), () => groupByFolderSetting.set(!groupByFolderSetting.get()),
        groupByFolderSetting.get());
  }

  /**
   * @param {boolean} ignoreExecutionLineEvents
   */
  setIgnoreExecutionLineEvents(ignoreExecutionLineEvents) {
    this._ignoreExecutionLineEvents = ignoreExecutionLineEvents;
  }

  updateLastModificationTime() {
    this._lastModificationTime = window.performance.now();
  }

  /**
   * @param {!Bindings.LiveLocation} liveLocation
   */
  _executionLineChanged(liveLocation) {
    const uiLocation = liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    if (window.performance.now() - this._lastModificationTime < lastModificationTimeout) {
      return;
    }
    this._sourcesView.showSourceLocation(
        uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, undefined, true);
  }

  _lastModificationTimeoutPassedForTest() {
    lastModificationTimeout = Number.MIN_VALUE;
  }

  _updateLastModificationTimeForTest() {
    lastModificationTimeout = Number.MAX_VALUE;
  }

  _callFrameChanged() {
    const callFrame = self.UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    if (this._executionLineLocation) {
      this._executionLineLocation.dispose();
    }
    this._executionLineLocation = self.Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(
        callFrame.location(), this._executionLineChanged.bind(this), this._liveLocationPool);
  }

  _pauseOnExceptionEnabledChanged() {
    const enabled = self.Common.settings.moduleSetting('pauseOnExceptionEnabled').get();
    this._pauseOnExceptionButton.setToggled(enabled);
    this._pauseOnExceptionButton.setTitle(enabled ? ls`Don't pause on exceptions` : ls`Pause on exceptions`);
    this._debugToolbarDrawer.classList.toggle('expanded', enabled);
  }

  async _updateDebuggerButtonsAndStatus() {
    const currentTarget = self.UI.context.flavor(SDK.Target);
    const currentDebuggerModel = currentTarget ? currentTarget.model(SDK.DebuggerModel) : null;
    if (!currentDebuggerModel) {
      this._togglePauseAction.setEnabled(false);
      this._stepOverAction.setEnabled(false);
      this._stepIntoAction.setEnabled(false);
      this._stepOutAction.setEnabled(false);
      this._stepAction.setEnabled(false);
    } else if (this._paused) {
      this._togglePauseAction.setToggled(true);
      this._togglePauseAction.setEnabled(true);
      this._stepOverAction.setEnabled(true);
      this._stepIntoAction.setEnabled(true);
      this._stepOutAction.setEnabled(true);
      this._stepAction.setEnabled(true);
    } else {
      this._togglePauseAction.setToggled(false);
      this._togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());
      this._stepOverAction.setEnabled(false);
      this._stepIntoAction.setEnabled(false);
      this._stepOutAction.setEnabled(false);
      this._stepAction.setEnabled(false);
    }

    const details = currentDebuggerModel ? currentDebuggerModel.debuggerPausedDetails() : null;
    await this._debuggerPausedMessage.render(
        details, self.Bindings.debuggerWorkspaceBinding, self.Bindings.breakpointManager);
    if (details) {
      this._updateDebuggerButtonsAndStatusForTest();
    }
  }

  _updateDebuggerButtonsAndStatusForTest() {
  }

  _clearInterface() {
    this._updateDebuggerButtonsAndStatus();
    self.UI.context.setFlavor(SDK.DebuggerPausedDetails, null);

    if (this._switchToPausedTargetTimeout) {
      clearTimeout(this._switchToPausedTargetTimeout);
    }
    this._liveLocationPool.disposeAll();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _switchToPausedTarget(debuggerModel) {
    delete this._switchToPausedTargetTimeout;
    if (this._paused || debuggerModel.isPaused()) {
      return;
    }

    for (const debuggerModel of self.SDK.targetManager.models(SDK.DebuggerModel)) {
      if (debuggerModel.isPaused()) {
        self.UI.context.setFlavor(SDK.Target, debuggerModel.target());
        break;
      }
    }
  }

  _togglePauseOnExceptions() {
    self.Common.settings.moduleSetting('pauseOnExceptionEnabled').set(!this._pauseOnExceptionButton.toggled());
  }

  _runSnippet() {
    const uiSourceCode = this._sourcesView.currentUISourceCode();
    if (uiSourceCode) {
      Snippets.evaluateScriptSnippet(uiSourceCode);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _editorSelected(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    if (this.editorView.mainWidget() && self.Common.settings.moduleSetting('autoRevealInNavigator').get()) {
      this._revealInNavigator(uiSourceCode, true);
    }
  }

  /**
   * @return {boolean}
   */
  _togglePause() {
    const target = self.UI.context.flavor(SDK.Target);
    if (!target) {
      return true;
    }
    const debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel) {
      return true;
    }

    if (this._paused) {
      this._paused = false;
      debuggerModel.resume();
    } else {
      // Make sure pauses didn't stick skipped.
      debuggerModel.pause();
    }

    this._clearInterface();
    return true;
  }

  /**
   * @return {?SDK.DebuggerModel}
   */
  _prepareToResume() {
    if (!this._paused) {
      return null;
    }

    this._paused = false;

    this._clearInterface();
    const target = self.UI.context.flavor(SDK.Target);
    return target ? target.model(SDK.DebuggerModel) : null;
  }

  /**
   * @param {!Common.Event} event
   */
  _longResume(event) {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
      debuggerModel.resume();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _terminateExecution(event) {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.runtimeModel().terminateExecution();
      debuggerModel.resume();
    }
  }

  /**
   * @return {boolean}
   */
  _stepOver() {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.stepOver();
    }
    return true;
  }

  /**
   * @return {boolean}
   */
  _stepInto() {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.stepInto();
    }
    return true;
  }

  /**
   * @return {boolean}
   */
  _stepIntoAsync() {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.scheduleStepIntoAsync();
    }
    return true;
  }

  /**
   * @return {boolean}
   */
  _stepOut() {
    const debuggerModel = this._prepareToResume();
    if (debuggerModel) {
      debuggerModel.stepOut();
    }
    return true;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   */
  async _continueToLocation(uiLocation) {
    const executionContext = self.UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext) {
      return;
    }
    // Always use 0 column.
    const rawLocations = await self.Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(
        uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
    const rawLocation = rawLocations.find(location => location.debuggerModel === executionContext.debuggerModel);
    if (rawLocation && this._prepareToResume()) {
      rawLocation.continueToLocation();
    }
  }

  _toggleBreakpointsActive() {
    self.Common.settings.moduleSetting('breakpointsActive')
        .set(!self.Common.settings.moduleSetting('breakpointsActive').get());
  }

  _breakpointsActiveStateChanged() {
    const active = self.Common.settings.moduleSetting('breakpointsActive').get();
    this._toggleBreakpointsActiveAction.setToggled(!active);
    this._sourcesView.toggleBreakpointsActiveState(active);
  }

  /**
   * @return {!UI.Toolbar}
   */
  _createDebugToolbar() {
    const debugToolbar = new UI.Toolbar('scripts-debug-toolbar');

    const longResumeButton =
        new UI.ToolbarButton(Common.UIString('Resume with all pauses blocked for 500 ms'), 'largeicon-play');
    longResumeButton.addEventListener(UI.ToolbarButton.Events.Click, this._longResume, this);
    const terminateExecutionButton =
        new UI.ToolbarButton(ls`Terminate current JavaScript call`, 'largeicon-terminate-execution');
    terminateExecutionButton.addEventListener(UI.ToolbarButton.Events.Click, this._terminateExecution, this);
    debugToolbar.appendToolbarItem(UI.Toolbar.createLongPressActionButton(
        this._togglePauseAction, [terminateExecutionButton, longResumeButton], []));

    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOverAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepIntoAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOutAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepAction));

    debugToolbar.appendSeparator();
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleBreakpointsActiveAction));

    this._pauseOnExceptionButton = new UI.ToolbarToggle('', 'largeicon-pause-on-exceptions');
    this._pauseOnExceptionButton.addEventListener(UI.ToolbarButton.Events.Click, this._togglePauseOnExceptions, this);
    debugToolbar.appendToolbarItem(this._pauseOnExceptionButton);

    return debugToolbar;
  }

  _createDebugToolbarDrawer() {
    const debugToolbarDrawer = createElementWithClass('div', 'scripts-debug-toolbar-drawer');

    const label = Common.UIString('Pause on caught exceptions');
    const setting = self.Common.settings.moduleSetting('pauseOnCaughtException');
    debugToolbarDrawer.appendChild(UI.SettingsUI.createSettingCheckbox(label, setting, true));

    return debugToolbarDrawer;
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    this._appendUISourceCodeItems(event, contextMenu, target);
    this._appendUISourceCodeFrameItems(event, contextMenu, target);
    this.appendUILocationItems(contextMenu, target);
    this._appendRemoteObjectItems(contextMenu, target);
    this._appendNetworkRequestItems(contextMenu, target);
  }

  /**
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendUISourceCodeItems(event, contextMenu, target) {
    if (!(target instanceof Workspace.UISourceCode)) {
      return;
    }

    const uiSourceCode = /** @type {!Workspace.UISourceCode} */ (target);
    if (!uiSourceCode.project().isServiceProject() &&
        !event.target.isSelfOrDescendant(this._navigatorTabbedLocation.widget().element)) {
      contextMenu.revealSection().appendItem(
          Common.UIString('Reveal in sidebar'), this._handleContextMenuReveal.bind(this, uiSourceCode));
    }
  }

  /**
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendUISourceCodeFrameItems(event, contextMenu, target) {
    if (!(target instanceof UISourceCodeFrame)) {
      return;
    }
    if (target.uiSourceCode().contentType().isFromSourceMap() || target.textEditor.selection().isEmpty()) {
      return;
    }
    contextMenu.debugSection().appendAction('debugger.evaluate-selection');
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendUILocationItems(contextMenu, object) {
    if (!(object instanceof Workspace.UILocation)) {
      return;
    }
    const uiLocation = /** @type {!Workspace.UILocation} */ (object);
    const uiSourceCode = uiLocation.uiSourceCode;

    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      const target = self.UI.context.flavor(SDK.Target);
      const debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
      if (debuggerModel && debuggerModel.isPaused()) {
        contextMenu.debugSection().appendItem(
            Common.UIString('Continue to here'), this._continueToLocation.bind(this, uiLocation));
      }

      this._callstackPane.appendBlackboxURLContextMenuItems(contextMenu, uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _handleContextMenuReveal(uiSourceCode) {
    this.editorView.showBoth();
    this._revealInNavigator(uiSourceCode);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendRemoteObjectItems(contextMenu, target) {
    if (!(target instanceof SDK.RemoteObject)) {
      return;
    }
    const remoteObject = /** @type {!SDK.RemoteObject} */ (target);
    const executionContext = self.UI.context.flavor(SDK.ExecutionContext);
    contextMenu.debugSection().appendItem(
        ls`Store as global variable`, () => self.SDK.consoleModel.saveToTempVariable(executionContext, remoteObject));
    if (remoteObject.type === 'function') {
      contextMenu.debugSection().appendItem(
          ls`Show function definition`, this._showFunctionDefinition.bind(this, remoteObject));
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendNetworkRequestItems(contextMenu, target) {
    if (!(target instanceof SDK.NetworkRequest)) {
      return;
    }
    const request = /** @type {!SDK.NetworkRequest} */ (target);
    const uiSourceCode = this._workspace.uiSourceCodeForURL(request.url());
    if (!uiSourceCode) {
      return;
    }
    const openText = Common.UIString('Open in Sources panel');
    contextMenu.revealSection().appendItem(openText, this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0)));
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   */
  _showFunctionDefinition(remoteObject) {
    remoteObject.debuggerModel().functionDetailsPromise(remoteObject).then(this._didGetFunctionDetails.bind(this));
  }

  /**
   * @param {?{location: ?SDK.DebuggerModel.Location}} response
   */
  _didGetFunctionDetails(response) {
    if (!response || !response.location) {
      return;
    }

    const uiLocation = self.Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(response.location);
    if (uiLocation) {
      this.showUILocation(uiLocation);
    }
  }

  _revealNavigatorSidebar() {
    this._setAsCurrentPanel();
    this.editorView.showBoth(true);
  }

  _revealDebuggerSidebar() {
    this._setAsCurrentPanel();
    this._splitWidget.showBoth(true);
  }

  _updateSidebarPosition() {
    let vertically;
    const position = self.Common.settings.moduleSetting('sidebarPosition').get();
    if (position === 'right') {
      vertically = false;
    } else if (position === 'bottom') {
      vertically = true;
    } else {
      vertically = self.UI.inspectorView.element.offsetWidth < 680;
    }

    if (this.sidebarPaneView && vertically === !this._splitWidget.isVertical()) {
      return;
    }

    if (this.sidebarPaneView && this.sidebarPaneView.shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    if (this.sidebarPaneView) {
      this.sidebarPaneView.detach();
    }

    this._splitWidget.setVertical(!vertically);
    this._splitWidget.element.classList.toggle('sources-split-view-vertical', vertically);

    SourcesPanel.updateResizerAndSidebarButtons(this);

    // Create vertical box with stack.
    const vbox = new UI.VBox();
    vbox.element.appendChild(this._debugToolbar.element);
    vbox.element.appendChild(this._debugToolbarDrawer);

    vbox.setMinimumAndPreferredSizes(minToolbarWidth, 25, minToolbarWidth, 100);
    this._sidebarPaneStack = self.UI.viewManager.createStackLocation(this._revealDebuggerSidebar.bind(this));
    this._sidebarPaneStack.widget().element.classList.add('overflow-auto');
    this._sidebarPaneStack.widget().show(vbox.element);
    this._sidebarPaneStack.widget().element.appendChild(this._debuggerPausedMessage.element());
    this._sidebarPaneStack.appendApplicableItems('sources.sidebar-top');

    if (this._threadsSidebarPane) {
      this._sidebarPaneStack.showView(this._threadsSidebarPane);
    }

    if (!vertically) {
      this._sidebarPaneStack.appendView(this._watchSidebarPane);
    }

    this._sidebarPaneStack.showView(this._callstackPane);
    const jsBreakpoints = /** @type {!UI.View} */ (self.UI.viewManager.view('sources.jsBreakpoints'));
    const sourceScopeChainView = /** @type {?UI.View} */
        (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging') ?
             self.UI.viewManager.view('sources.sourceScopeChain') :
             null);
    const scopeChainView = /** @type {!UI.View} */ (self.UI.viewManager.view('sources.scopeChain'));

    if (this._tabbedLocationHeader) {
      this._splitWidget.uninstallResizer(this._tabbedLocationHeader);
      this._tabbedLocationHeader = null;
    }

    if (!vertically) {
      // Populate the rest of the stack.
      if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
        this._sidebarPaneStack.showView(/** @type {!UI.View} */ (sourceScopeChainView));
      }
      this._sidebarPaneStack.showView(scopeChainView);
      this._sidebarPaneStack.showView(jsBreakpoints);
      this._extensionSidebarPanesContainer = this._sidebarPaneStack;
      this.sidebarPaneView = vbox;
      this._splitWidget.uninstallResizer(this._debugToolbar.gripElementForResize());
    } else {
      const splitWidget = new UI.SplitWidget(true, true, 'sourcesPanelDebuggerSidebarSplitViewState', 0.5);
      splitWidget.setMainWidget(vbox);

      // Populate the left stack.
      this._sidebarPaneStack.showView(jsBreakpoints);

      const tabbedLocation = self.UI.viewManager.createTabbedLocation(this._revealDebuggerSidebar.bind(this));
      splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());
      this._tabbedLocationHeader = tabbedLocation.tabbedPane().headerElement();
      this._splitWidget.installResizer(this._tabbedLocationHeader);
      this._splitWidget.installResizer(this._debugToolbar.gripElementForResize());
      if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
        tabbedLocation.appendView(/** @type {!UI.View} */ (sourceScopeChainView));
      }
      tabbedLocation.appendView(scopeChainView);
      tabbedLocation.appendView(this._watchSidebarPane);
      tabbedLocation.appendApplicableItems('sources.sidebar-tabs');
      this._extensionSidebarPanesContainer = tabbedLocation;
      this.sidebarPaneView = splitWidget;
    }

    this._sidebarPaneStack.appendApplicableItems('sources.sidebar-bottom');
    const extensionSidebarPanes = self.Extensions.extensionServer.sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    this._splitWidget.setSidebarWidget(this.sidebarPaneView);
  }

  /**
   * @return {!Promise}
   */
  _setAsCurrentPanel() {
    return self.UI.viewManager.showView('sources');
  }

  /**
   * @param {!Common.Event} event
   */
  _extensionSidebarPaneAdded(event) {
    const pane = /** @type {!Extensions.ExtensionSidebarPane} */ (event.data);
    this._addExtensionSidebarPane(pane);
  }

  /**
   * @param {!Extensions.ExtensionSidebarPane} pane
   */
  _addExtensionSidebarPane(pane) {
    if (pane.panelName() === this.name) {
      this._extensionSidebarPanesContainer.appendView(pane);
    }
  }

  /**
   * @return {!SourcesView}
   */
  sourcesView() {
    return this._sourcesView;
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const entry = items[0].webkitGetAsEntry();
    if (!entry.isDirectory) {
      return;
    }
    Host.InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);
  }
}

export let lastModificationTimeout = 200;
export const minToolbarWidth = 215;

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
export class UILocationRevealer {
  /**
   * @override
   * @param {!Object} uiLocation
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(uiLocation, omitFocus) {
    if (!(uiLocation instanceof Workspace.UILocation)) {
      return Promise.reject(new Error('Internal error: not a ui location'));
    }
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    return Promise.resolve();
  }
}

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
export class DebuggerLocationRevealer {
  /**
   * @override
   * @param {!Object} rawLocation
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(rawLocation, omitFocus) {
    if (!(rawLocation instanceof SDK.DebuggerModel.Location)) {
      return Promise.reject(new Error('Internal error: not a debugger location'));
    }
    const uiLocation = self.Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    if (!uiLocation) {
      return Promise.resolve();
    }
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    return Promise.resolve();
  }
}

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
export class UISourceCodeRevealer {
  /**
   * @override
   * @param {!Object} uiSourceCode
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(uiSourceCode, omitFocus) {
    if (!(uiSourceCode instanceof Workspace.UISourceCode)) {
      return Promise.reject(new Error('Internal error: not a ui source code'));
    }
    SourcesPanel.instance().showUISourceCode(uiSourceCode, undefined, undefined, omitFocus);
    return Promise.resolve();
  }
}

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
export class DebuggerPausedDetailsRevealer {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise}
   */
  reveal(object) {
    return SourcesPanel.instance()._setAsCurrentPanel();
  }
}

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
export class RevealingActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = SourcesPanel.instance();
    if (!panel._ensureSourcesViewVisible()) {
      return false;
    }
    switch (actionId) {
      case 'debugger.toggle-pause':
        panel._togglePause();
        return true;
    }
    return false;
  }
}

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
export class DebuggingActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = SourcesPanel.instance();
    switch (actionId) {
      case 'debugger.step-over':
        panel._stepOver();
        return true;
      case 'debugger.step-into':
        panel._stepIntoAsync();
        return true;
      case 'debugger.step':
        panel._stepInto();
        return true;
      case 'debugger.step-out':
        panel._stepOut();
        return true;
      case 'debugger.run-snippet':
        panel._runSnippet();
        return true;
      case 'debugger.toggle-breakpoints-active':
        panel._toggleBreakpointsActive();
        return true;
      case 'debugger.evaluate-selection':
        const frame = self.UI.context.flavor(UISourceCodeFrame);
        if (frame) {
          let text = frame.textEditor.text(frame.textEditor.selection());
          const executionContext = self.UI.context.flavor(SDK.ExecutionContext);
          if (executionContext) {
            const message = self.SDK.consoleModel.addCommandMessage(executionContext, text);
            text = ObjectUI.JavaScriptREPL.wrapObjectLiteral(text);
            self.SDK.consoleModel.evaluateCommandInConsole(
                executionContext, message, text, /* useCommandLineAPI */ true, /* awaitPromise */ false);
          }
        }
        return true;
    }
    return false;
  }
}

/**
 * @unrestricted
 */
export class WrapperView extends UI.VBox {
  constructor() {
    super();
    this.element.classList.add('sources-view-wrapper');
    WrapperView._instance = this;
    this._view = SourcesPanel.instance()._sourcesView;
  }

  /**
   * @return {boolean}
   */
  static isShowing() {
    return !!WrapperView._instance && WrapperView._instance.isShowing();
  }

  /**
   * @override
   */
  wasShown() {
    if (!SourcesPanel.instance().isShowing()) {
      this._showViewInWrapper();
    } else {
      self.UI.inspectorView.setDrawerMinimized(true);
    }
    SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
  }

  /**
   * @override
   */
  willHide() {
    self.UI.inspectorView.setDrawerMinimized(false);
    setImmediate(() => SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance()));
  }

  _showViewInWrapper() {
    this._view.show(this.element);
  }
}
