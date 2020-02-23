/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
import {ConsoleContextSelector} from './ConsoleContextSelector.js';
import {ConsoleFilter, FilterType} from './ConsoleFilter.js';
import {ConsolePinPane} from './ConsolePinPane.js';
import {ConsolePrompt, Events as ConsolePromptEvents} from './ConsolePrompt.js';
import {ConsoleSidebar, Events} from './ConsoleSidebar.js';
import {ConsoleGroupViewMessage, ConsoleViewMessage, MaxLengthForLinks} from './ConsoleViewMessage.js';  // eslint-disable-line no-unused-vars
import {ConsoleViewport, ConsoleViewportElement, ConsoleViewportProvider} from './ConsoleViewport.js';  // eslint-disable-line no-unused-vars
import {ConsoleDiracPrompt} from './ConsoleDiracPrompt.js';

/**
 * @implements {UI.Searchable}
 * @implements {ConsoleViewportProvider}
 * @unrestricted
 */
export class ConsoleView extends UI.VBox {
  constructor() {
    super();
    this.setMinimumSize(0, 35);
    this.registerRequiredCSS('console/consoleView.css');
    this.registerRequiredCSS('object_ui/objectValue.css');
    this.registerRequiredCSS("console/dirac-hacks.css");
    this.registerRequiredCSS("console/dirac-codemirror.css");
    this.registerRequiredCSS("console/dirac-theme.css");
    this.registerRequiredCSS("console/dirac-prompt.css");
    dirac.initConsole();

    this._searchableView = new UI.SearchableView(this);
    this._searchableView.element.classList.add('console-searchable-view');
    this._searchableView.setPlaceholder(Common.UIString('Find string in logs'));
    this._searchableView.setMinimalSearchQuerySize(0);
    this._sidebar = new ConsoleSidebar();
    this._sidebar.addEventListener(Events.FilterSelected, this._onFilterChanged.bind(this));
    this._isSidebarOpen = false;
    this._filter = new ConsoleViewFilter(this._onFilterChanged.bind(this));

    const consoleToolbarContainer = this.element.createChild('div', 'console-toolbar-container');
    this._splitWidget =
        new UI.SplitWidget(true /* isVertical */, false /* secondIsSidebar */, 'console.sidebar.width', 100);
    this._splitWidget.setMainWidget(this._searchableView);
    this._splitWidget.setSidebarWidget(this._sidebar);
    this._splitWidget.show(this.element);
    this._splitWidget.hideSidebar();
    this._splitWidget.enableShowModeSaving();
    this._isSidebarOpen = this._splitWidget.showMode() === UI.SplitWidget.ShowMode.Both;
    if (this._isSidebarOpen) {
      this._filter._levelMenuButton.setEnabled(false);
    }
    this._splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, event => {
      this._isSidebarOpen = event.data === UI.SplitWidget.ShowMode.Both;
      this._filter._levelMenuButton.setEnabled(!this._isSidebarOpen);
      this._onFilterChanged();
    });
    this._contentsElement = this._searchableView.element;
    this.element.classList.add('console-view');

    /** @type {!Array.<!ConsoleViewMessage>} */
    this._visibleViewMessages = [];
    this._hiddenByFilterCount = 0;
    /** @type {!Set<!ConsoleViewMessage>} */
    this._shouldBeHiddenCache = new Set();

    /** @type {!Map<string, !Array<!ConsoleViewMessage>>} */
    this._groupableMessages = new Map();
    /** @type {!Map<string, !ConsoleViewMessage>} */
    this._groupableMessageTitle = new Map();

    /**
     * @type {!Array.<!Console.ConsoleView.RegexMatchRange>}
     */
    this._regexMatchRanges = [];

    this._consoleContextSelector = new ConsoleContextSelector();

    this._filterStatusText = new UI.ToolbarText();
    this._filterStatusText.element.classList.add('dimmed');
    this._showSettingsPaneSetting = self.Common.settings.createSetting('consoleShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', Common.UIString('Console settings'));
    this._progressToolbarItem = new UI.ToolbarItem(createElement('div'));
    this._groupSimilarSetting = self.Common.settings.moduleSetting('consoleGroupSimilar');
    this._groupSimilarSetting.addChangeListener(() => this._updateMessageList());
    const groupSimilarToggle =
        new UI.ToolbarSettingCheckbox(this._groupSimilarSetting, Common.UIString('Group similar'));

    const toolbar = new UI.Toolbar('console-main-toolbar', consoleToolbarContainer);
    const rightToolbar = new UI.Toolbar('', consoleToolbarContainer);
    toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton(ls`console sidebar`));
    toolbar.appendToolbarItem(UI.Toolbar.createActionButton(
        /** @type {!UI.Action }*/ (self.UI.actionRegistry.action('console.clear'))));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._consoleContextSelector.toolbarItem());
    toolbar.appendSeparator();
    const liveExpressionButton =
        UI.Toolbar.createActionButton(/** @type {!UI.Action }*/ (self.UI.actionRegistry.action('console.create-pin')));
    toolbar.appendToolbarItem(liveExpressionButton);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._filter._textFilterUI);
    toolbar.appendToolbarItem(this._filter._levelMenuButton);
    toolbar.appendToolbarItem(this._progressToolbarItem);
    rightToolbar.appendSeparator();
    rightToolbar.appendToolbarItem(this._filterStatusText);
    rightToolbar.appendToolbarItem(this._showSettingsPaneButton);

    this._preserveLogCheckbox = new UI.ToolbarSettingCheckbox(
        self.Common.settings.moduleSetting('preserveConsoleLog'),
        Common.UIString('Do not clear log on page reload / navigation'), Common.UIString('Preserve log'));
    this._hideNetworkMessagesCheckbox = new UI.ToolbarSettingCheckbox(
        this._filter._hideNetworkMessagesSetting, this._filter._hideNetworkMessagesSetting.title(),
        Common.UIString('Hide network'));
    const filterByExecutionContextCheckbox = new UI.ToolbarSettingCheckbox(
        this._filter._filterByExecutionContextSetting,
        Common.UIString('Only show messages from the current context (top, iframe, worker, extension)'),
        Common.UIString('Selected context only'));
    const monitoringXHREnabledSetting = self.Common.settings.moduleSetting('monitoringXHREnabled');
    this._timestampsSetting = self.Common.settings.moduleSetting('consoleTimestampsEnabled');
    this._consoleHistoryAutocompleteSetting = self.Common.settings.moduleSetting('consoleHistoryAutocomplete');

    const settingsPane = new UI.HBox();
    settingsPane.show(this._contentsElement);
    settingsPane.element.classList.add('console-settings-pane');

    UI.ARIAUtils.setAccessibleName(settingsPane.element, ls`Console settings`);
    UI.ARIAUtils.markAsGroup(settingsPane.element);
    const settingsToolbarLeft = new UI.Toolbar('', settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);
    settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);
    settingsToolbarLeft.appendToolbarItem(filterByExecutionContextCheckbox);
    settingsToolbarLeft.appendToolbarItem(groupSimilarToggle);

    const settingsToolbarRight = new UI.Toolbar('', settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(monitoringXHREnabledSetting));
    const eagerEvalCheckbox = new UI.ToolbarSettingCheckbox(
        self.Common.settings.moduleSetting('consoleEagerEval'), ls`Eagerly evaluate text in the prompt`);
    settingsToolbarRight.appendToolbarItem(eagerEvalCheckbox);
    settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));
    const userGestureCheckbox =
        new UI.ToolbarSettingCheckbox(self.Common.settings.moduleSetting('consoleUserActivationEval'));
    settingsToolbarRight.appendToolbarItem(userGestureCheckbox);
    if (!this._showSettingsPaneSetting.get()) {
      settingsPane.element.classList.add('hidden');
    }
    this._showSettingsPaneSetting.addChangeListener(
        () => settingsPane.element.classList.toggle('hidden', !this._showSettingsPaneSetting.get()));

    this._pinPane = new ConsolePinPane(liveExpressionButton);
    this._pinPane.element.classList.add('console-view-pinpane');
    this._pinPane.show(this._contentsElement);
    this._pinPane.element.addEventListener('keydown', event => {
      if ((event.key === 'Enter' && UI.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!KeyboardEvent} */ (event))) ||
          event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
        this._prompt.focus();
        event.consume();
      }
    });

    this._viewport = new ConsoleViewport(this);
    this._viewport.setStickToBottom(true);
    this._viewport.contentElement().classList.add('console-group', 'console-group-messages');
    this._contentsElement.appendChild(this._viewport.element);
    this._messagesElement = this._viewport.element;
    this._messagesElement.id = 'console-messages';
    this._messagesElement.classList.add('monospace');
    this._messagesElement.addEventListener('click', this._messagesClicked.bind(this), false);
    this._messagesElement.addEventListener('paste', this._messagesPasted.bind(this), true);
    this._messagesElement.addEventListener('clipboard-paste', this._messagesPasted.bind(this), true);
    UI.ARIAUtils.markAsGroup(this._messagesElement);

    this._viewportThrottler = new Common.Throttler(50);
    this._pendingBatchResize = false;
    this._onMessageResizedBound = this._onMessageResized.bind(this);

    this._topGroup = ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;

    this._promptElement = this._messagesElement.createChild('div', 'source-code');
    this._promptElement.id = 'console-prompt';

    const diracPromptElement = this._messagesElement.createChild("div", "source-code");
    diracPromptElement.id = "console-prompt-dirac";
    diracPromptElement.spellcheck = false;
    const diracPromptCodeMirrorInstance = dirac.adoptPrompt(diracPromptElement, dirac.hasParinfer);

    diracPromptElement.classList.add("inactive-prompt");

    // FIXME: This is a workaround for the selection machinery bug. See crbug.com/410899
    const selectAllFixer = this._messagesElement.createChild('div', 'console-view-fix-select-all');
    selectAllFixer.textContent = '.';
    UI.ARIAUtils.markAsHidden(selectAllFixer);

    this._registerShortcuts();

    this._messagesElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this._linkifier = new Components.Linkifier(MaxLengthForLinks);

    /** @type {!Array.<!ConsoleViewMessage>} */
    this._consoleMessages = [];
    this._viewMessageSymbol = Symbol('viewMessage');

    this._consoleHistorySetting = self.Common.settings.createLocalSetting('consoleHistory', []);

    this._prompt = new ConsolePrompt();
    this._prompt.show(this._promptElement);
    this._prompt.element.addEventListener('keydown', this._promptKeyDown.bind(this), true);
    this._prompt.addEventListener(ConsolePromptEvents.TextChanged, this._promptTextChanged, this);

    this._messagesElement.addEventListener('keydown', this._messagesKeyDown.bind(this), false);
    this._prompt.element.addEventListener('focusin', () => {
      if (this._isScrolledToBottom()) {
        this._viewport.setStickToBottom(true);
      }
    });

    this._consoleHistoryAutocompleteSetting.addChangeListener(this._consoleHistoryAutocompleteChanged, this);

    const historyData = this._consoleHistorySetting.get();
    this._prompt.history().setHistoryData(historyData);
    this._consoleHistoryAutocompleteChanged();

    this._updateFilterStatus();
    this._timestampsSetting.addChangeListener(this._consoleTimestampsSettingChanged, this);

    this._pendingDiracCommands = {};
    this._lastDiracCommandId = 1;
    this._prompts = [];
    this._prompts.push({id: "js",
      prompt: this._prompt,
      element: this._promptElement,
      proxy: this._prompt.element});
    this._activePromptIndex = 0;

    if (dirac.hasREPL) {
      const diracPrompt = new ConsoleDiracPrompt(diracPromptCodeMirrorInstance);
      diracPrompt.setAutocompletionTimeout(0);
      diracPrompt.renderAsBlock();
      const diracProxyElement = diracPrompt.attach(diracPromptElement);
      diracProxyElement.classList.add("console-prompt-dirac-wrapper");
      diracProxyElement.addEventListener("keydown", this._promptKeyDown.bind(this), true);

      this._diracHistorySetting = Common.settings.createLocalSetting("diracHistory", []);
      const diracHistoryData = this._diracHistorySetting.get();
      diracPrompt.history().setHistoryData(diracHistoryData);

      const statusElement = diracPromptElement.createChild("div");
      statusElement.id = "console-status-dirac";

      const statusBannerElement = statusElement.createChild("div", "status-banner");
      statusBannerElement.addEventListener("click", this._diracStatusBannerClick.bind(this), true);
      const statusContentElement = statusElement.createChild("div", "status-content");
      statusContentElement.tabIndex = 0; // focusable for page-up/down

      this._diracPromptDescriptor = {id: "dirac",
        prompt: diracPrompt,
        element: diracPromptElement,
        proxy: diracProxyElement,
        status: statusElement,
        statusContent: statusContentElement,
        statusBanner: statusBannerElement,
        codeMirror: diracPromptCodeMirrorInstance};
      this._prompts.push(this._diracPromptDescriptor);
    }

    this._registerWithMessageSink();

    self.UI.context.addFlavorChangeListener(SDK.ExecutionContext, this._executionContextChanged, this);

    const defaultPromptIndex = dirac.hostedInExtension?0:1;
    this._consolePromptIndexSetting = Common.settings.createLocalSetting("consolePromptIndex", defaultPromptIndex);

    this._consoleFeedback = 0;

    if (dirac.hasREPL) {
      this.setDiracPromptMode("status");
    } else {
      dirac.feedback("!dirac.hasREPL");
    }
    dirac.feedback("ConsoleView constructed");
    if (dirac.hasWelcomeMessage) {
      this.displayWelcomeMessage();
    } else {
      dirac.feedback("!dirac.hasWelcomeMessage");
    }

    this._messagesElement.addEventListener(
      'mousedown', event => this._updateStickToBottomOnPointerDown(event.button === 2), false);
    this._messagesElement.addEventListener('mouseup', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('mouseleave', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('wheel', this._updateStickToBottomOnWheel.bind(this), false);
    this._messagesElement.addEventListener(
        'touchstart', this._updateStickToBottomOnPointerDown.bind(this, false), false);
    this._messagesElement.addEventListener('touchend', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('touchcancel', this._updateStickToBottomOnPointerUp.bind(this), false);

    self.SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    self.SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.DiracMessage, this._onConsoleDiracMessage, this);
    self.SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded, this);
    self.SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageUpdated, this._onConsoleMessageUpdated, this);
    self.SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
    self.SDK.consoleModel.messages().forEach(this._addConsoleMessage, this);

    this._switchToLastPrompt();
  }

  /**
   * @return {!ConsoleView}
   */
  static instance() {
    if (!ConsoleView._instance) {
      ConsoleView._instance = new ConsoleView();
    }
    return ConsoleView._instance;
  }

  static clearConsole() {
    self.SDK.consoleModel.requestClearMessages();
  }

  _onFilterChanged() {
    this._filter._currentFilter.levelsMask =
        this._isSidebarOpen ? ConsoleFilter.allLevelsFilterValue() : this._filter._messageLevelFiltersSetting.get();
    this._cancelBuildHiddenCache();
    if (this._immediatelyFilterMessagesForTest) {
      for (const viewMessage of this._consoleMessages) {
        this._computeShouldMessageBeVisible(viewMessage);
      }
      this._updateMessageList();
      return;
    }
    this._buildHiddenCache(0, this._consoleMessages.slice());
  }

  _setImmediatelyFilterMessagesForTest() {
    this._immediatelyFilterMessagesForTest = true;
  }

  /**
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  _clearHistory() {
    this._consoleHistorySetting.set([]);
    this._prompt.history().setHistoryData([]);
  }

  _consoleHistoryAutocompleteChanged() {
    this._prompt.setAddCompletionsFromHistory(this._consoleHistoryAutocompleteSetting.get());
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._visibleViewMessages.length;
  }

  /**
   * @override
   * @param {number} index
   * @return {?ConsoleViewportElement}
   */
  itemElement(index) {
    return this._visibleViewMessages[index];
  }

  /**
   * @override
   * @param {number} index
   * @return {number}
   */
  fastHeight(index) {
    return this._visibleViewMessages[index].fastHeight();
  }

  /**
   * @override
   * @return {number}
   */
  minimumRowHeight() {
    return 16;
  }

  _registerWithMessageSink() {
    self.Common.console.messages().forEach(this._addSinkMessage, this);
    self.Common.console.addEventListener(Common.Console.Events.MessageAdded, messageAdded, this);

    /**
     * @param {!Common.Event} event
     * @this {ConsoleView}
     */
    function messageAdded(event) {
      this._addSinkMessage(/** @type {!Common.Console.Message} */ (event.data));
    }
  }

  /**
   * @param {!Common.Console.Message} message
   */
  _addSinkMessage(message) {
    let level = SDK.ConsoleMessage.MessageLevel.Verbose;
    switch (message.level) {
      case Common.Console.MessageLevel.Info:
        level = SDK.ConsoleMessage.MessageLevel.Info;
        break;
      case Common.Console.MessageLevel.Error:
        level = SDK.ConsoleMessage.MessageLevel.Error;
        break;
      case Common.Console.MessageLevel.Warning:
        level = SDK.ConsoleMessage.MessageLevel.Warning;
        break;
    }

    const consoleMessage = new SDK.ConsoleMessage(
        null, SDK.ConsoleMessage.MessageSource.Other, level, message.text, SDK.ConsoleMessage.MessageType.System,
        undefined, undefined, undefined, undefined, undefined, message.timestamp);
    this._addConsoleMessage(consoleMessage);
  }

  _consoleTimestampsSettingChanged() {
    this._updateMessageList();
    this._consoleMessages.forEach(viewMessage => viewMessage.updateTimestamp());
    this._groupableMessageTitle.forEach(viewMessage => viewMessage.updateTimestamp());
  }

  _executionContextChanged() {
    this._switchToLastPrompt();
    this._prompt.clearAutocomplete();
  }

  /**
   * @override
   */
  willHide() {
    this._hidePromptSuggestBox();
  }

  /**
   * @override
   */
  wasShown() {
    this._viewport.refresh();
  }

  /**
   * @override
   */
  focus() {
    if (this._viewport.hasVirtualSelection()) {
      this._viewport.contentElement().focus();
    } else {
      this._focusPrompt();
    }
  }

  _focusPrompt() {
    if (!this._prompt.hasFocus()) {
      const oldStickToBottom = this._viewport.stickToBottom();
      const oldScrollTop = this._viewport.element.scrollTop;
      this._prompt.focus();
      this._viewport.setStickToBottom(oldStickToBottom);
      this._viewport.element.scrollTop = oldScrollTop;
    }
  }

  /**
   * @override
   */
  restoreScrollPositions() {
    if (this._viewport.stickToBottom()) {
      this._immediatelyScrollToBottom();
    } else {
      super.restoreScrollPositions();
    }
  }

  /**
   * @override
   */
  onResize() {
    this._scheduleViewportRefresh();
    this._hidePromptSuggestBox();
    if (this._viewport.stickToBottom()) {
      this._immediatelyScrollToBottom();
    }
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      this._visibleViewMessages[i].onResize();
    }
  }

  _hidePromptSuggestBox() {
    this._prompt.clearAutocomplete();
  }

  /**
   * @return {!Promise.<undefined>}
   */
  _invalidateViewport() {
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      return Promise.resolve();
    }
    if (this._needsFullUpdate) {
      this._updateMessageList();
      delete this._needsFullUpdate;
    } else {
      this._viewport.invalidate();
    }
    return Promise.resolve();
  }

  _scheduleViewportRefresh() {
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      this._scheduleViewportRefreshForTest(true);
      return;
    } else {
      this._scheduleViewportRefreshForTest(false);
    }
    this._scheduledRefreshPromiseForTest = this._viewportThrottler.schedule(this._invalidateViewport.bind(this));
  }

  /**
   * @param {boolean} muted
   */
  _scheduleViewportRefreshForTest(muted) {
    // This functions is sniffed in tests.
  }

  _immediatelyScrollToBottom() {
    // This will scroll viewport and trigger its refresh.
    this._viewport.setStickToBottom(true);
    this._promptElement.scrollIntoView(true);
  }

  _updateFilterStatus() {
    if (this._hiddenByFilterCount === this._lastShownHiddenByFilterCount) {
      return;
    }
    this._filterStatusText.setText(ls`${this._hiddenByFilterCount} hidden`);
    this._filterStatusText.setVisible(!!this._hiddenByFilterCount);
    this._lastShownHiddenByFilterCount = this._hiddenByFilterCount;
  }

  _switchToLastPrompt() {
    this._switchPromptIfAvail(this._activePromptIndex, this._consolePromptIndexSetting.get());
  }

  _diracStatusBannerClick(event) {
    if (!event.target || event.target.tagName != "A") {
      return false;
    }
    if (this._diracPromptDescriptor.statusBannerCallback) {
      this._diracPromptDescriptor.statusBannerCallback("click", event);
    }
    return false;
  }

  setDiracPromptStatusContent(s) {
    dirac.feedback("setDiracPromptStatusContent('"+s+"')");
    this._diracPromptDescriptor.statusContent.innerHTML = s;
  }

  setDiracPromptStatusBanner(s) {
    dirac.feedback("setDiracPromptStatusBanner('"+s+"')");
    this._diracPromptDescriptor.statusBanner.innerHTML = s;
  }

  setDiracPromptStatusBannerCallback(callback) {
    this._diracPromptDescriptor.statusBannerCallback = callback;
  }

  setDiracPromptStatusStyle(style) {
    dirac.feedback("setDiracPromptStatusStyle('"+style+"')");
    const knownStyles = ["error", "info"];
    if (knownStyles.indexOf(style)===-1) {
      console.warn("unknown style passed to setDiracPromptStatusStyle:", style);
    }
    for (let i = 0; i < knownStyles.length; i++) {
      let s = knownStyles[i];
      this._diracPromptDescriptor.status.classList.toggle("dirac-prompt-status-"+s, style===s);
    }
  }

  setDiracPromptMode(mode) {
    dirac.feedback("setDiracPromptMode('"+mode+"')");
    const knownModes = ["edit", "status"];
    if (knownModes.indexOf(mode)===-1) {
      console.warn("unknown mode passed to setDiracPromptMode:", mode);
    }
    for (let i = 0; i < knownModes.length; i++) {
      let m = knownModes[i];
      this._diracPromptDescriptor.element.classList.toggle("dirac-prompt-mode-"+m, mode===m);
    }
    if (mode==="edit") {
      this.focus();
    }
  }

  _buildPromptPlaceholder(namespace, compiler) {
    const placeholderEl = createElementWithClass("div", "dirac-prompt-placeholder");
    const namespaceEl = createElementWithClass("span", "dirac-prompt-namespace");
    namespaceEl.textContent = namespace || "";
    if (compiler) {
      const compilerEl = createElementWithClass("span", "dirac-prompt-compiler");
      compilerEl.textContent = compiler;
      placeholderEl.appendChildren(namespaceEl, compilerEl);
    } else {
      placeholderEl.appendChildren(namespaceEl);
    }
    return placeholderEl;
  }

  _refreshPromptInfo() {
    const promptDescriptor = this._prompts[this._activePromptIndex];
    if (promptDescriptor.id !== "dirac") {
      return;
    }

    const namespace = this._currentNamespace || "";
    const compiler = this._currentCompiler;
    const placeholderEl = this._buildPromptPlaceholder(namespace, compiler);
    promptDescriptor.codeMirror.setOption("placeholder", placeholderEl);
  }

  setDiracPromptNS(name) {
    dirac.feedback("setDiracPromptNS('"+name+"')");
    this._currentNamespace = name;
    if (this._diracPromptDescriptor) {
      this._diracPromptDescriptor.prompt.setCurrentClojureScriptNamespace(name);
    }
    this._refreshPromptInfo();
  }

  setDiracPromptCompiler(name) {
    //dirac.feedback("setDiracPromptCompiler('"+name+"')");
    this._currentCompiler = name;
    this._refreshPromptInfo();
  }

  onJobStarted(requestId) {
    dirac.feedback("repl eval job started");
  }

  onJobEnded(requestId) {
    delete this._pendingDiracCommands[requestId];
    dirac.feedback("repl eval job ended");
  }

  /**
   * @return {string}
   */
  getSuggestBoxRepresentation() {
    const promptDescriptor = this.getCurrentPromptDescriptor();
    return promptDescriptor.id + " prompt: " + promptDescriptor.prompt.getSuggestBoxRepresentation();
  }

  /**
   * @return {string}
   */
  getPromptRepresentation() {
    return this._prompt.text();
  }

  handleEvalCLJSConsoleDiracMessage(message) {
    const code = message.parameters[2];
    if (code && typeof code.value == 'string') {
      this.appendDiracCommand(code.value, null);
    }
  }

  handleEvalJSConsoleDiracMessage(message) {
    const code = message.parameters[2];
    if (code && typeof code.value == 'string') {
      const jsPromptDescriptor = this._getPromptDescriptor("js");
      if (jsPromptDescriptor) {
        jsPromptDescriptor.prompt._appendCommand(code.value, true);
      }
    }
  }

  _onConsoleDiracMessage(event) {
    const message = (event.data);
    let command = message.parameters[1];
    if (command)
      command = command.value;

    switch (command) {
      case "eval-cljs":
        this.handleEvalCLJSConsoleDiracMessage(message);
        break;
      case "eval-js":
        this.handleEvalJSConsoleDiracMessage(message);
        break;
      default:
        throw ("unrecognized Dirac message: " + command);
    }
  }


  _alterDiracViewMessage(message) {
    var nestingLevel = this._currentGroup.nestingLevel();

    message.messageText = "";
    message.parameters.shift(); // "~~$DIRAC-LOG$~~"

    // do not display location link
    message.url = undefined;
    message.stackTrace = undefined;

    let requestId = null;
    let kind = "";
    try {
      requestId = message.parameters.shift().value; // request-id
      kind = message.parameters.shift().value;
    } catch (e) {
    }

    if (kind === "result") {
      message.type = SDK.ConsoleMessage.MessageType.Result;
    }

    const originatingMessage = this._pendingDiracCommands[requestId];
    if (originatingMessage) {
      message.setOriginatingMessage(originatingMessage);
      this._pendingDiracCommands[requestId] = message;
    }

    return kind ? ("dirac-" + kind) : null;
  }

  _levelForFeedback(level) {
    return level || "???";
  }

  _typeForFeedback(messageType, isDiracFlavored) {
    if (isDiracFlavored) {
      return "DF";
    }
    if (messageType === SDK.ConsoleMessage.MessageType.DiracCommand) {
      return "DC";
    }
    return "JS";
  }

  _createViewMessage(message) {
    // this is a HACK to treat REPL messages as Dirac results
    const isDiracFlavoredMessage = message.messageText === "~~$DIRAC-LOG$~~";
    let extraClass = null;

    if (isDiracFlavoredMessage) {
      extraClass = this._alterDiracViewMessage(message);
    }

    const result = this._createViewMessage2(message);

    if (isDiracFlavoredMessage) {
      const wrapperElement = result.element();
      wrapperElement.classList.add("dirac-flavor");
      if (extraClass) {
        wrapperElement.classList.add(extraClass);
      }
    }

    if (this._consoleFeedback) {
      try {
        const levelText = this._levelForFeedback(message.level);
        const typeText = this._typeForFeedback(message.type, isDiracFlavoredMessage);
        const messageText = result.contentElement().querySelector(".console-message-text").deepTextContent();
        const glue = (messageText.indexOf("\n") === -1) ? "> " : ">\n"; // log multi-line log messages on a new line
        dirac.feedback(typeText + "." + levelText + glue + messageText);
      } catch (e) {
      }
    }

    return result;
  }

  /**
   * @param {string} markup
   * @return {boolean}
   */
  appendDiracMarkup(markup) {
    const target = SDK.targetManager.mainTarget();
    if (!target) {
      return false;
    }
    const runtimeModel = target.model(SDK.RuntimeModel);
    if (!runtimeModel) {
      return false;
    }
    const source = SDK.ConsoleMessage.MessageSource.Other;
    const level = SDK.ConsoleMessage.MessageLevel.Info;
    const type = SDK.ConsoleMessage.MessageType.DiracMarkup;
    const message = new SDK.ConsoleMessage(runtimeModel, source, level, markup, type);
    SDK.consoleModel.addMessage(message);
    return true;
  }

  displayWelcomeMessage() {
    dirac.feedback('displayWelcomeMessage');
    const wrapCode = (text) => {
      return "<code style='background-color:rgba(0, 0, 0, 0.08);padding:0 2px;border-radius:1px'>" + text + "</code>";
    };
    const wrapBold = (text) => {
      return "<b>" + text + "</b>";
    };

    const welcomeMessage =
      "Welcome to " + wrapBold("Dirac DevTools v" + dirac.getVersion()) + "." +
      " Cycle CLJS/JS prompts with " + wrapCode("CTRL+,") + "." +
      " Enter " + wrapCode("dirac") + " for additional info.";

    if (!this.appendDiracMarkup(welcomeMessage)) {
      console.warn("displayWelcomeMessage: unable to add console message");
    }
  }

  _normalizePromptIndex(index) {
    const count = this._prompts.length;
    while (index<0) {
      index += count;
    }
    return index % count;
  }

  _switchPromptIfAvail(oldPromptIndex, newPromptIndex) {
    const oldIndex = this._normalizePromptIndex(oldPromptIndex);
    const newIndex = this._normalizePromptIndex(newPromptIndex);
    if (oldIndex === newIndex) {
      return; // nothing to do
    }

    this._switchPrompt(oldIndex, newIndex);
  }

  _switchPrompt(oldPromptIndex, newPromptIndex) {
    const oldPromptDescriptor = this._prompts[this._normalizePromptIndex(oldPromptIndex)];
    const newPromptDescriptor = this._prompts[this._normalizePromptIndex(newPromptIndex)];

    newPromptDescriptor.element.classList.remove("inactive-prompt");

    this._prompt = newPromptDescriptor.prompt;
    this._promptElement = newPromptDescriptor.element;
    this._activePromptIndex = this._normalizePromptIndex(newPromptIndex);
    this._consolePromptIndexSetting.set(this._activePromptIndex);
    this._searchableView.setDefaultFocusedElement(this._promptElement);

    oldPromptDescriptor.element.classList.add("inactive-prompt");

    dirac.feedback("switched console prompt to '" + newPromptDescriptor.id + "'");
    this._prompt.setText(""); // clear prompt when switching
    this.focus();

    if (newPromptDescriptor.id === "dirac") {
      dirac.initRepl();
    }
  }

  _selectNextPrompt() {
    this._switchPromptIfAvail(this._activePromptIndex, this._activePromptIndex+1);
  }

  _selectPrevPrompt() {
    this._switchPromptIfAvail(this._activePromptIndex, this._activePromptIndex-1);
  }

  _findPromptIndexById(id) {
    for (let i=0; i<this._prompts.length; i++) {
      const promptDescriptor = this._prompts[i];
      if (promptDescriptor.id === id) {
        return i;
      }
    }
    return null;
  }

  _getPromptDescriptor(promptId) {
    const promptIndex = this._findPromptIndexById(promptId);
    if (promptIndex === null) {
      return null;
    }
    return this._prompts[promptIndex];
  }

  switchPrompt(promptId) {
    const selectedPromptIndex = this._findPromptIndexById(promptId);
    if (selectedPromptIndex === null) {
      console.warn("switchPrompt: unknown prompt id ", promptId);
      return;
    }
    this._switchPromptIfAvail(this._activePromptIndex, selectedPromptIndex);
  }

  /**
   * @return {!Object}
   */
  getCurrentPromptDescriptor() {
    return this._prompts[this._activePromptIndex];
  }

  /**
   * @return {!Element}
   */
  getTargetForPromptEvents() {
    const promptDescriptor = this.getCurrentPromptDescriptor();
    let inputEl = promptDescriptor.proxy;
    if (promptDescriptor.codeMirror) {
      inputEl = promptDescriptor.codeMirror.getInputField();
    }
    return inputEl;
  }

  /**
   * @return {!Promise}
   */
  dispatchEventsForPromptInput(input) {
    return new Promise((resolve) => {
      const continuation = () => resolve("entered input: '" + input + "'");
      const keyboard = Keysim.Keyboard.US_ENGLISH;
      keyboard.dispatchEventsForInput(input, this.getTargetForPromptEvents(), continuation);
    });
  }

  /**
   * @return {!Promise}
   */
  dispatchEventsForPromptAction(action) {
    return new Promise((resolve) => {
      const continuation = () => resolve("performed action: '" + action + "'");
      const keyboard = Keysim.Keyboard.US_ENGLISH;
      keyboard.dispatchEventsForAction(action, this.getTargetForPromptEvents(), continuation);
    });
  }

  /**
   * @return {number}
   */
  enableConsoleFeedback() {
    this._consoleFeedback++;
    return this._consoleFeedback;
  }

  /**
   * @return {number}
   */
  disableConsoleFeedback() {
    this._consoleFeedback--;
    return this._consoleFeedback;
  }

  appendDiracCommand(text, id) {
    if (!text)
      return;

    if (!id) {
      id = this._lastDiracCommandId++;
    }

    const command = text;
    const commandId = id;

    const executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext) {
      return;
    }

    this._prompt.setText("");
    const runtimeModel = executionContext.runtimeModel;
    const type = SDK.ConsoleMessage.MessageType.DiracCommand;
    const source = SDK.ConsoleMessage.MessageSource.JS;
    const level = SDK.ConsoleMessage.MessageLevel.Info;
    const commandMessage = new SDK.ConsoleMessage(runtimeModel, source, level, text, type);
    commandMessage.setExecutionContextId(executionContext.id);
    SDK.consoleModel.addMessage(commandMessage);

    this._prompt.history().pushHistoryItem(text);
    this._diracHistorySetting.set(this._prompt.history().historyData().slice(-persistedHistorySize));

    const debuggerModel = executionContext.debuggerModel;
    let scopeInfoPromise = Promise.resolve(null);
    if (debuggerModel) {
      scopeInfoPromise = dirac.extractScopeInfoFromScopeChainAsync(debuggerModel.selectedCallFrame());
    }

    this._pendingDiracCommands[commandId] = commandMessage;
    scopeInfoPromise.then(function (scopeInfo) {
      dirac.sendEvalRequest(commandId, command, scopeInfo);
    });
  }

  /**
   * @param {!Common.Event} event
   */
  _onConsoleMessageAdded(event) {
    const message = /** @type {!SDK.ConsoleMessage} */ (event.data);
    this._addConsoleMessage(message);
  }

  _normalizeMessageTimestamp(message) {
    message.timestamp = this._consoleMessages.length ? this._consoleMessages.peekLast().consoleMessage().timestamp : 0;
  }

  /**
   * @param {!SDK.ConsoleMessage} message
   */
  _addConsoleMessage(message) {
    const viewMessage = this._createViewMessage(message);
    message[this._viewMessageSymbol] = viewMessage;
    if (message.type === SDK.ConsoleMessage.MessageType.Command ||
        message.type === SDK.ConsoleMessage.MessageType.Result) {
      const lastMessage = this._consoleMessages.peekLast();
      viewMessage[_messageSortingTimeSymbol] = lastMessage ? lastMessage[_messageSortingTimeSymbol] : 0;
    } else {
      viewMessage[_messageSortingTimeSymbol] = viewMessage.consoleMessage().timestamp;
    }

    let insertAt;
    if (!this._consoleMessages.length ||
        timeComparator(viewMessage, this._consoleMessages[this._consoleMessages.length - 1]) > 0) {
      insertAt = this._consoleMessages.length;
    } else {
      insertAt = this._consoleMessages.upperBound(viewMessage, timeComparator);
    }
    const insertedInMiddle = insertAt < this._consoleMessages.length;
    this._consoleMessages.splice(insertAt, 0, viewMessage);

    this._filter.onMessageAdded(message);
    this._sidebar.onMessageAdded(viewMessage);

    // If we already have similar messages, go slow path.
    let shouldGoIntoGroup = false;
    if (message.isGroupable()) {
      const groupKey = viewMessage.groupKey();
      shouldGoIntoGroup = this._groupSimilarSetting.get() && this._groupableMessages.has(groupKey);
      let list = this._groupableMessages.get(groupKey);
      if (!list) {
        list = [];
        this._groupableMessages.set(groupKey, list);
      }
      list.push(viewMessage);
    }

    this._computeShouldMessageBeVisible(viewMessage);
    if (!shouldGoIntoGroup && !insertedInMiddle) {
      this._appendMessageToEnd(viewMessage);
      this._updateFilterStatus();
      this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    } else {
      this._needsFullUpdate = true;
    }

    this._scheduleViewportRefresh();
    this._consoleMessageAddedForTest(viewMessage);

    /**
     * @param {!ConsoleViewMessage} viewMessage1
     * @param {!Console.ConsoleViewMessage} viewMessage2
     */
    function timeComparator(viewMessage1, viewMessage2) {
      return viewMessage1[_messageSortingTimeSymbol] - viewMessage2[_messageSortingTimeSymbol];
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onConsoleMessageUpdated(event) {
    const message = /** @type {!SDK.ConsoleMessage} */ (event.data);
    const viewMessage = message[this._viewMessageSymbol];
    if (viewMessage) {
      viewMessage.updateMessageElement();
      this._computeShouldMessageBeVisible(viewMessage);
      this._updateMessageList();
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  _consoleMessageAddedForTest(viewMessage) {
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  _shouldMessageBeVisible(viewMessage) {
    return !this._shouldBeHiddenCache.has(viewMessage);
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  _computeShouldMessageBeVisible(viewMessage) {
    if (this._filter.shouldBeVisible(viewMessage) &&
        (!this._isSidebarOpen || this._sidebar.shouldBeVisible(viewMessage))) {
      this._shouldBeHiddenCache.delete(viewMessage);
    } else {
      this._shouldBeHiddenCache.add(viewMessage);
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @param {boolean=} preventCollapse
   */
  _appendMessageToEnd(viewMessage, preventCollapse) {
    if (!this._shouldMessageBeVisible(viewMessage)) {
      this._hiddenByFilterCount++;
      return;
    }

    if (!preventCollapse && this._tryToCollapseMessages(viewMessage, this._visibleViewMessages.peekLast())) {
      return;
    }

    const lastMessage = this._visibleViewMessages.peekLast();
    if (viewMessage.consoleMessage().type === SDK.ConsoleMessage.MessageType.EndGroup) {
      if (lastMessage && !this._currentGroup.messagesHidden()) {
        lastMessage.incrementCloseGroupDecorationCount();
      }
      this._currentGroup = this._currentGroup.parentGroup() || this._currentGroup;
      return;
    }
    if (!this._currentGroup.messagesHidden()) {
      const originatingMessage = viewMessage.consoleMessage().originatingMessage();
      if (lastMessage && originatingMessage && lastMessage.consoleMessage() === originatingMessage) {
        viewMessage.toMessageElement().classList.add('console-adjacent-user-command-result');
      }

      this._visibleViewMessages.push(viewMessage);
      this._searchMessage(this._visibleViewMessages.length - 1);
    }

    if (viewMessage.consoleMessage().isGroupStartMessage()) {
      this._currentGroup = new ConsoleGroup(this._currentGroup, viewMessage);
    }

    this._messageAppendedForTests();
  }

  _messageAppendedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {!SDK.ConsoleMessage} message
   * @return {!ConsoleViewMessage}
   */
  _createViewMessage2(message) {
    const nestingLevel = this._currentGroup.nestingLevel();
    switch (message.type) {
      case SDK.ConsoleMessage.MessageType.Command:
        return new ConsoleCommand(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleMessage.MessageType.DiracCommand:
        return new ConsoleDiracCommand(message, this._linkifier, this._badgePool, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleMessage.MessageType.DiracMarkup:
        return new ConsoleDiracMarkup(message, this._linkifier, this._badgePool, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleMessage.MessageType.Result:
        return new ConsoleCommandResult(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleMessage.MessageType.StartGroupCollapsed:
      case SDK.ConsoleMessage.MessageType.StartGroup:
        return new ConsoleGroupViewMessage(
            message, this._linkifier, nestingLevel, this._updateMessageList.bind(this), this._onMessageResizedBound);
      default:
        return new ConsoleViewMessage(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
    }
  }

  /**
   * @param {!Common.Event} event
   * @return {!Promise}
   */
  async _onMessageResized(event) {
    const treeElement = /** @type {!UI.TreeElement} */ (event.data);
    if (this._pendingBatchResize || !treeElement.treeOutline) {
      return;
    }
    this._pendingBatchResize = true;
    await Promise.resolve();
    const treeOutlineElement = treeElement.treeOutline.element;
    this._viewport.setStickToBottom(this._isScrolledToBottom());
    // Scroll, in case mutations moved the element below the visible area.
    if (treeOutlineElement.offsetHeight <= this._messagesElement.offsetHeight) {
      treeOutlineElement.scrollIntoViewIfNeeded();
    }

    this._pendingBatchResize = false;
  }

  _consoleCleared() {
    const hadFocus = this._viewport.element.hasFocus();
    this._cancelBuildHiddenCache();
    this._currentMatchRangeIndex = -1;
    this._consoleMessages = [];
    this._groupableMessages.clear();
    this._groupableMessageTitle.clear();
    this._sidebar.clear();
    this._updateMessageList();
    this._hidePromptSuggestBox();
    this._viewport.setStickToBottom(true);
    this._linkifier.reset();
    this._filter.clear();
    if (hadFocus) {
      this._prompt.focus();
    }
  }

  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu(event);
    if (event.target.isSelfOrDescendant(this._promptElement)) {
      contextMenu.show();
      return;
    }

    const sourceElement = event.target.enclosingNodeOrSelfWithClass('console-message-wrapper');
    const consoleMessage = sourceElement ? sourceElement.message.consoleMessage() : null;

    if (consoleMessage && consoleMessage.url) {
      const menuTitle = ls`Hide messages from ${new Common.ParsedURL(consoleMessage.url).displayName}`;
      contextMenu.headerSection().appendItem(
          menuTitle, this._filter.addMessageURLFilter.bind(this._filter, consoleMessage.url));
    }

    contextMenu.defaultSection().appendAction('console.clear');
    contextMenu.defaultSection().appendAction('console.clear.history');
    contextMenu.saveSection().appendItem(Common.UIString('Save as...'), this._saveConsole.bind(this));
    if (this.element.hasSelection()) {
      contextMenu.clipboardSection().appendItem(
          Common.UIString('Copy visible styled selection'), this._viewport.copyWithStyles.bind(this._viewport));
    }

    if (consoleMessage) {
      const request = SDK.NetworkLog.requestForConsoleMessage(consoleMessage);
      if (request && SDK.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(ls`Replay XHR`, SDK.NetworkManager.replayRequest.bind(null, request));
      }
    }

    contextMenu.show();
  }

  async _saveConsole() {
    const url = self.SDK.targetManager.mainTarget().inspectedURL();
    const parsedURL = Common.ParsedURL.fromString(url);
    const filename = String.sprintf('%s-%d.log', parsedURL ? parsedURL.host : 'console', Date.now());
    const stream = new Bindings.FileOutputStream();

    const progressIndicator = new UI.ProgressIndicator();
    progressIndicator.setTitle(Common.UIString('Writing file…'));
    progressIndicator.setTotalWork(this.itemCount());

    /** @const */
    const chunkSize = 350;

    if (!await stream.open(filename)) {
      return;
    }
    this._progressToolbarItem.element.appendChild(progressIndicator.element);

    let messageIndex = 0;
    while (messageIndex < this.itemCount() && !progressIndicator.isCanceled()) {
      const messageContents = [];
      let i;
      for (i = 0; i < chunkSize && i + messageIndex < this.itemCount(); ++i) {
        const message = /** @type {!ConsoleViewMessage} */ (this.itemElement(messageIndex + i));
        messageContents.push(message.toExportString());
      }
      messageIndex += i;
      await stream.write(messageContents.join('\n') + '\n');
      progressIndicator.setWorked(messageIndex);
    }

    stream.close();
    progressIndicator.done();
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @param {!Console.ConsoleViewMessage=} lastMessage
   * @return {boolean}
   */
  _tryToCollapseMessages(viewMessage, lastMessage) {
    const timestampsShown = this._timestampsSetting.get();
    if (!timestampsShown && lastMessage && !viewMessage.consoleMessage().isGroupMessage() &&
        viewMessage.consoleMessage().type !== SDK.ConsoleMessage.MessageType.Command &&
        viewMessage.consoleMessage().type !== SDK.ConsoleMessage.MessageType.Result &&
        viewMessage.consoleMessage().isEqual(lastMessage.consoleMessage())) {
      lastMessage.incrementRepeatCount();
      if (viewMessage.isLastInSimilarGroup()) {
        lastMessage.setInSimilarGroup(true, true);
      }
      return true;
    }

    return false;
  }

  /**
   * @param {number} startIndex
   * @param {!Array<!ConsoleViewMessage>} viewMessages
   */
  _buildHiddenCache(startIndex, viewMessages) {
    const startTime = Date.now();
    let i;
    for (i = startIndex; i < viewMessages.length; ++i) {
      this._computeShouldMessageBeVisible(viewMessages[i]);
      if (i % 10 === 0 && Date.now() - startTime > 12) {
        break;
      }
    }

    if (i === viewMessages.length) {
      this._updateMessageList();
      return;
    }
    this._buildHiddenCacheTimeout =
        this.element.window().requestAnimationFrame(this._buildHiddenCache.bind(this, i, viewMessages));
  }

  _cancelBuildHiddenCache() {
    this._shouldBeHiddenCache.clear();
    if (this._buildHiddenCacheTimeout) {
      this.element.window().cancelAnimationFrame(this._buildHiddenCacheTimeout);
      delete this._buildHiddenCacheTimeout;
    }
  }

  _updateMessageList() {
    this._topGroup = ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;
    this._regexMatchRanges = [];
    this._hiddenByFilterCount = 0;
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      this._visibleViewMessages[i].resetCloseGroupDecorationCount();
      this._visibleViewMessages[i].resetIncrementRepeatCount();
    }
    this._visibleViewMessages = [];
    if (this._groupSimilarSetting.get()) {
      this._addGroupableMessagesToEnd();
    } else {
      for (let i = 0; i < this._consoleMessages.length; ++i) {
        this._consoleMessages[i].setInSimilarGroup(false);
        this._appendMessageToEnd(this._consoleMessages[i]);
      }
    }
    this._updateFilterStatus();
    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    this._viewport.invalidate();
  }

  _addGroupableMessagesToEnd() {
    /** @type {!Set<!SDK.ConsoleMessage>} */
    const alreadyAdded = new Set();
    /** @type {!Set<string>} */
    const processedGroupKeys = new Set();
    for (let i = 0; i < this._consoleMessages.length; ++i) {
      const viewMessage = this._consoleMessages[i];
      const message = viewMessage.consoleMessage();
      if (alreadyAdded.has(message)) {
        continue;
      }

      if (!message.isGroupable()) {
        this._appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }

      const key = viewMessage.groupKey();
      const viewMessagesInGroup = this._groupableMessages.get(key);
      if (!viewMessagesInGroup || viewMessagesInGroup.length < 5) {
        viewMessage.setInSimilarGroup(false);
        this._appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }

      if (processedGroupKeys.has(key)) {
        continue;
      }

      if (!viewMessagesInGroup.find(x => this._shouldMessageBeVisible(x))) {
        // Optimize for speed.
        alreadyAdded.addAll(viewMessagesInGroup);
        processedGroupKeys.add(key);
        continue;
      }

      // Create artificial group start and end messages.
      let startGroupViewMessage = this._groupableMessageTitle.get(key);
      if (!startGroupViewMessage) {
        const startGroupMessage = new SDK.ConsoleMessage(
            null, message.source, message.level, viewMessage.groupTitle(),
            SDK.ConsoleMessage.MessageType.StartGroupCollapsed);
        startGroupViewMessage = this._createViewMessage(startGroupMessage);
        this._groupableMessageTitle.set(key, startGroupViewMessage);
      }
      startGroupViewMessage.setRepeatCount(viewMessagesInGroup.length);
      this._appendMessageToEnd(startGroupViewMessage);

      for (const viewMessageInGroup of viewMessagesInGroup) {
        viewMessageInGroup.setInSimilarGroup(true, viewMessagesInGroup.peekLast() === viewMessageInGroup);
        this._appendMessageToEnd(viewMessageInGroup, true);
        alreadyAdded.add(viewMessageInGroup.consoleMessage());
      }

      const endGroupMessage = new SDK.ConsoleMessage(
          null, message.source, message.level, message.messageText, SDK.ConsoleMessage.MessageType.EndGroup);
      this._appendMessageToEnd(this._createViewMessage(endGroupMessage));
    }
  }

  /**
   * @param {!Event} event
   */
  _messagesClicked(event) {
    const target = /** @type {?Node} */ (event.target);
    // Do not focus prompt if messages have selection.
    if (!this._messagesElement.hasSelection()) {
      const clickedOutsideMessageList =
          target === this._messagesElement || this._prompt.belowEditorElement().isSelfOrAncestor(target);
      if (clickedOutsideMessageList) {
        this._prompt.moveCaretToEndOfPrompt();
        this._focusPrompt();
      }
    }
  }

  /**
   * @param {!Event} event
   */
  _messagesKeyDown(event) {
    const hasActionModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (hasActionModifier || event.key.length !== 1 || UI.isEditing() || this._messagesElement.hasSelection()) {
      return;
    }
    this._prompt.moveCaretToEndOfPrompt();
    this._focusPrompt();
  }

  /**
   * @param {!Event} event
   */
  _messagesPasted(event) {
    if (UI.isEditing()) {
      return;
    }
    this._prompt.focus();
  }

  _registerShortcuts() {
    this._shortcuts = {};
    this._shortcuts[UI.KeyboardShortcut.makeKey('u', UI.KeyboardShortcut.Modifiers.Ctrl)] =
        this._clearPromptBackwards.bind(this);

    const section = UI.shortcutsScreen.section(Common.UIString('Console'));
    const shortcut = UI.KeyboardShortcut;
    if (dirac.hasREPL) {
      let keys = [
        shortcut.makeDescriptor(shortcut.Keys.Comma, UI.KeyboardShortcut.Modifiers.Ctrl),
        shortcut.makeDescriptor(shortcut.Keys.Period, UI.KeyboardShortcut.Modifiers.Ctrl)
      ];
      this._shortcuts[keys[0].key] = this._selectNextPrompt.bind(this);
      this._shortcuts[keys[1].key] = this._selectPrevPrompt.bind(this);
      section.addRelatedKeys(keys, Common.UIString("Next/previous prompt"));
    }
  }

  _clearPromptBackwards() {
    this._prompt.setText('');
  }

  /**
   * @param {!Event} event
   */
  _promptKeyDown(event) {
    const keyboardEvent = /** @type {!KeyboardEvent} */ event;
    if (keyboardEvent.key === 'PageUp') {
      this._updateStickToBottomOnWheel();
      return;
    } else if (isEnterKey(keyboardEvent)) {
      // TODO: this should be eventually moved to ConsoleDiracPrompt.js
      // let's wait for upstream to finish transition to ConsolePrompt.js
      const promptDescriptor = this._prompts[this._activePromptIndex];
      if (promptDescriptor.id === "dirac") {
        if (event.altKey || event.ctrlKey || event.shiftKey)
          return;

        event.consume(true);

        this._prompt.clearAutocomplete();

        const str = this._prompt.text();
        if (!str.length) {
          return;
        }

        this.appendDiracCommand(str, null);
        return;
      }
    }

    const shortcut = UI.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);
    const handler = this._shortcuts[shortcut];
    if (handler) {
      handler();
      keyboardEvent.preventDefault();
    }
  }

  /**
   * @param {?SDK.RemoteObject} result
   * @param {!SDK.ConsoleMessage} originatingConsoleMessage
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _printResult(result, originatingConsoleMessage, exceptionDetails) {
    if (!result) {
      return;
    }

    const level = !!exceptionDetails ? SDK.ConsoleMessage.MessageLevel.Error : SDK.ConsoleMessage.MessageLevel.Info;
    let message;
    if (!exceptionDetails) {
      message = new SDK.ConsoleMessage(
          result.runtimeModel(), SDK.ConsoleMessage.MessageSource.JS, level, '', SDK.ConsoleMessage.MessageType.Result,
          undefined, undefined, undefined, [result]);
    } else {
      message = SDK.ConsoleMessage.fromException(
          result.runtimeModel(), exceptionDetails, SDK.ConsoleMessage.MessageType.Result, undefined, undefined);
    }
    message.setOriginatingMessage(originatingConsoleMessage);
    self.SDK.consoleModel.addMessage(message);
  }

  /**
   * @param {!Common.Event} event
   */
  _commandEvaluated(event) {
    const data =
        /** @type {{result: ?SDK.RemoteObject, commandMessage: !SDK.ConsoleMessage, exceptionDetails: (!Protocol.Runtime.ExceptionDetails|undefined)}} */
        (event.data);
    this._prompt.history().pushHistoryItem(data.commandMessage.messageText);
    this._consoleHistorySetting.set(this._prompt.history().historyData().slice(-persistedHistorySize));
    this._printResult(data.result, data.commandMessage, data.exceptionDetails);
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this._messagesElement];
  }

  /**
   * @override
   */
  searchCanceled() {
    this._cleanupAfterSearch();
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      const message = this._visibleViewMessages[i];
      message.setSearchRegex(null);
    }
    this._currentMatchRangeIndex = -1;
    this._regexMatchRanges = [];
    delete this._searchRegex;
    this._viewport.refresh();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this.searchCanceled();
    this._searchableView.updateSearchMatchesCount(0);

    this._searchRegex = searchConfig.toSearchRegex(true);

    this._regexMatchRanges = [];
    this._currentMatchRangeIndex = -1;

    if (shouldJump) {
      this._searchShouldJumpBackwards = !!jumpBackwards;
    }

    this._searchProgressIndicator = new UI.ProgressIndicator();
    this._searchProgressIndicator.setTitle(Common.UIString('Searching…'));
    this._searchProgressIndicator.setTotalWork(this._visibleViewMessages.length);
    this._progressToolbarItem.element.appendChild(this._searchProgressIndicator.element);

    this._innerSearch(0);
  }

  _cleanupAfterSearch() {
    delete this._searchShouldJumpBackwards;
    if (this._innerSearchTimeoutId) {
      clearTimeout(this._innerSearchTimeoutId);
      delete this._innerSearchTimeoutId;
    }
    if (this._searchProgressIndicator) {
      this._searchProgressIndicator.done();
      delete this._searchProgressIndicator;
    }
  }

  _searchFinishedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {number} index
   */
  _innerSearch(index) {
    delete this._innerSearchTimeoutId;
    if (this._searchProgressIndicator.isCanceled()) {
      this._cleanupAfterSearch();
      return;
    }

    const startTime = Date.now();
    for (; index < this._visibleViewMessages.length && Date.now() - startTime < 100; ++index) {
      this._searchMessage(index);
    }

    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    if (typeof this._searchShouldJumpBackwards !== 'undefined' && this._regexMatchRanges.length) {
      this._jumpToMatch(this._searchShouldJumpBackwards ? -1 : 0);
      delete this._searchShouldJumpBackwards;
    }

    if (index === this._visibleViewMessages.length) {
      this._cleanupAfterSearch();
      setTimeout(this._searchFinishedForTests.bind(this), 0);
      return;
    }

    this._innerSearchTimeoutId = setTimeout(this._innerSearch.bind(this, index), 100);
    this._searchProgressIndicator.setWorked(index);
  }

  /**
   * @param {number} index
   */
  _searchMessage(index) {
    const message = this._visibleViewMessages[index];
    message.setSearchRegex(this._searchRegex);
    for (let i = 0; i < message.searchCount(); ++i) {
      this._regexMatchRanges.push({messageIndex: index, matchIndex: i});
    }
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    this._jumpToMatch(this._currentMatchRangeIndex + 1);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    this._jumpToMatch(this._currentMatchRangeIndex - 1);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  /**
   * @param {number} index
   */
  _jumpToMatch(index) {
    if (!this._regexMatchRanges.length) {
      return;
    }

    let matchRange;
    if (this._currentMatchRangeIndex >= 0) {
      matchRange = this._regexMatchRanges[this._currentMatchRangeIndex];
      const message = this._visibleViewMessages[matchRange.messageIndex];
      message.searchHighlightNode(matchRange.matchIndex).classList.remove(UI.highlightedCurrentSearchResultClassName);
    }

    index = mod(index, this._regexMatchRanges.length);
    this._currentMatchRangeIndex = index;
    this._searchableView.updateCurrentMatchIndex(index);
    matchRange = this._regexMatchRanges[index];
    const message = this._visibleViewMessages[matchRange.messageIndex];
    const highlightNode = message.searchHighlightNode(matchRange.matchIndex);
    highlightNode.classList.add(UI.highlightedCurrentSearchResultClassName);
    this._viewport.scrollItemIntoView(matchRange.messageIndex);
    highlightNode.scrollIntoViewIfNeeded();
  }

  /**
   * @param {boolean=} isRightClick
   */
  _updateStickToBottomOnPointerDown(isRightClick) {
    this._muteViewportUpdates = !isRightClick;
    this._viewport.setStickToBottom(false);
    if (this._waitForScrollTimeout) {
      clearTimeout(this._waitForScrollTimeout);
      delete this._waitForScrollTimeout;
    }
  }

  _updateStickToBottomOnPointerUp() {
    if (!this._muteViewportUpdates) {
      return;
    }

    // Delay querying isScrolledToBottom to give time for smooth scroll
    // events to arrive. The value for the longest timeout duration is
    // retrieved from crbug.com/575409.
    this._waitForScrollTimeout = setTimeout(updateViewportState.bind(this), 200);

    /**
     * @this {!ConsoleView}
     */
    function updateViewportState() {
      this._muteViewportUpdates = false;
      if (this.isShowing()) {
        this._viewport.setStickToBottom(this._isScrolledToBottom());
      }
      if (this._maybeDirtyWhileMuted) {
        this._scheduleViewportRefresh();
        delete this._maybeDirtyWhileMuted;
      }
      delete this._waitForScrollTimeout;
      this._updateViewportStickinessForTest();
    }
  }

  _updateViewportStickinessForTest() {
    // This method is sniffed in tests.
  }

  _updateStickToBottomOnWheel() {
    this._updateStickToBottomOnPointerDown();
    this._updateStickToBottomOnPointerUp();
  }

  _promptTextChanged() {
    const oldStickToBottom = this._viewport.stickToBottom();
    const willStickToBottom = this._isScrolledToBottom();
    this._viewport.setStickToBottom(willStickToBottom);
    if (willStickToBottom && !oldStickToBottom) {
      this._scheduleViewportRefresh();
    }
    this._promptTextChangedForTest();
  }

  _promptTextChangedForTest() {
    // This method is sniffed in tests.
  }

  /**
   * @return {boolean}
   */
  _isScrolledToBottom() {
    const distanceToPromptEditorBottom = this._messagesElement.scrollHeight - this._messagesElement.scrollTop -
        this._messagesElement.clientHeight - this._prompt.belowEditorElement().offsetHeight;
    return distanceToPromptEditorBottom <= 2;
  }
}

const persistedHistorySize = 300;

/**
 * @unrestricted
 */
export class ConsoleViewFilter {
  /**
   * @param {function()} filterChangedCallback
   */
  constructor(filterChangedCallback) {
    this._filterChanged = filterChangedCallback;

    this._messageLevelFiltersSetting = ConsoleViewFilter.levelFilterSetting();
    this._hideNetworkMessagesSetting = self.Common.settings.moduleSetting('hideNetworkMessages');
    this._filterByExecutionContextSetting = self.Common.settings.moduleSetting('selectedContextFilterEnabled');

    this._messageLevelFiltersSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._hideNetworkMessagesSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._filterByExecutionContextSetting.addChangeListener(this._onFilterChanged.bind(this));
    self.UI.context.addFlavorChangeListener(SDK.ExecutionContext, this._onFilterChanged, this);

    const filterKeys = Object.values(FilterType);
    this._suggestionBuilder = new UI.FilterSuggestionBuilder(filterKeys);
    this._textFilterUI = new UI.ToolbarInput(
        Common.UIString('Filter'), '', 0.2, 1, Common.UIString('e.g. /event\\d/ -cdn url:a.com'),
        this._suggestionBuilder.completions.bind(this._suggestionBuilder));
    this._textFilterSetting = self.Common.settings.createSetting('console.textFilter', '');
    if (this._textFilterSetting.get()) {
      this._textFilterUI.setValue(this._textFilterSetting.get());
    }
    this._textFilterUI.addEventListener(UI.ToolbarInput.Event.TextChanged, () => {
      this._textFilterSetting.set(this._textFilterUI.value());
      this._onFilterChanged();
    });
    this._filterParser = new TextUtils.FilterParser(filterKeys);
    this._currentFilter = new ConsoleFilter('', [], null, this._messageLevelFiltersSetting.get());
    this._updateCurrentFilter();

    this._levelLabels = {};
    this._levelLabels[SDK.ConsoleMessage.MessageLevel.Verbose] = Common.UIString('Verbose');
    this._levelLabels[SDK.ConsoleMessage.MessageLevel.Info] = Common.UIString('Info');
    this._levelLabels[SDK.ConsoleMessage.MessageLevel.Warning] = Common.UIString('Warnings');
    this._levelLabels[SDK.ConsoleMessage.MessageLevel.Error] = Common.UIString('Errors');

    this._levelMenuButton = new UI.ToolbarButton(ls`Log levels`);
    this._levelMenuButton.turnIntoSelect();
    this._levelMenuButton.addEventListener(UI.ToolbarButton.Events.Click, this._showLevelContextMenu.bind(this));
    UI.ARIAUtils.markAsMenuButton(this._levelMenuButton.element);

    this._updateLevelMenuButtonText();
    this._messageLevelFiltersSetting.addChangeListener(this._updateLevelMenuButtonText.bind(this));
  }

  /**
   * @param {!SDK.ConsoleMessage} message
   */
  onMessageAdded(message) {
    if (message.type === SDK.ConsoleMessage.MessageType.Command ||
        message.type === SDK.ConsoleMessage.MessageType.Result || message.isGroupMessage()) {
      return;
    }
    if (message.context) {
      this._suggestionBuilder.addItem(FilterType.Context, message.context);
    }
    if (message.source) {
      this._suggestionBuilder.addItem(FilterType.Source, message.source);
    }
    if (message.url) {
      this._suggestionBuilder.addItem(FilterType.Url, message.url);
    }
  }

  /**
   * @return {!Common.Setting}
   */
  static levelFilterSetting() {
    return self.Common.settings.createSetting('messageLevelFilters', ConsoleFilter.defaultLevelsFilterValue());
  }

  _updateCurrentFilter() {
    const parsedFilters = this._filterParser.parse(this._textFilterUI.value());
    if (this._hideNetworkMessagesSetting.get()) {
      parsedFilters.push({key: FilterType.Source, text: SDK.ConsoleMessage.MessageSource.Network, negative: true});
    }

    this._currentFilter.executionContext =
        this._filterByExecutionContextSetting.get() ? self.UI.context.flavor(SDK.ExecutionContext) : null;
    this._currentFilter.parsedFilters = parsedFilters;
    this._currentFilter.levelsMask = this._messageLevelFiltersSetting.get();
  }

  _onFilterChanged() {
    this._updateCurrentFilter();
    this._filterChanged();
  }

  _updateLevelMenuButtonText() {
    let isAll = true;
    let isDefault = true;
    const allValue = ConsoleFilter.allLevelsFilterValue();
    const defaultValue = ConsoleFilter.defaultLevelsFilterValue();

    let text = null;
    const levels = this._messageLevelFiltersSetting.get();
    for (const name of Object.values(SDK.ConsoleMessage.MessageLevel)) {
      isAll = isAll && levels[name] === allValue[name];
      isDefault = isDefault && levels[name] === defaultValue[name];
      if (levels[name]) {
        text = text ? Common.UIString('Custom levels') : Common.UIString('%s only', this._levelLabels[name]);
      }
    }
    if (isAll) {
      text = Common.UIString('All levels');
    } else if (isDefault) {
      text = Common.UIString('Default levels');
    } else {
      text = text || Common.UIString('Hide all');
    }
    this._levelMenuButton.element.classList.toggle('warning', !isAll && !isDefault);
    this._levelMenuButton.setText(text);
    this._levelMenuButton.setTitle(ls`Log level: ${text}`);
  }

  /**
   * @param {!Common.Event} event
   */
  _showLevelContextMenu(event) {
    const mouseEvent = /** @type {!Event} */ (event.data);
    const setting = this._messageLevelFiltersSetting;
    const levels = setting.get();

    const contextMenu = new UI.ContextMenu(
        mouseEvent, true /* useSoftMenu */, this._levelMenuButton.element.totalOffsetLeft(),
        this._levelMenuButton.element.totalOffsetTop() + this._levelMenuButton.element.offsetHeight);
    contextMenu.headerSection().appendItem(
        Common.UIString('Default'), () => setting.set(ConsoleFilter.defaultLevelsFilterValue()));
    for (const level in this._levelLabels) {
      contextMenu.defaultSection().appendCheckboxItem(
          this._levelLabels[level], toggleShowLevel.bind(null, level), levels[level]);
    }
    contextMenu.show();

    /**
     * @param {string} level
     */
    function toggleShowLevel(level) {
      levels[level] = !levels[level];
      setting.set(levels);
    }
  }

  /**
   * @param {string} url
   */
  addMessageURLFilter(url) {
    if (!url) {
      return;
    }
    const suffix = this._textFilterUI.value() ? ` ${this._textFilterUI.value()}` : '';
    this._textFilterUI.setValue(`-url:${url}${suffix}`);
    this._textFilterSetting.set(this._textFilterUI.value());
    this._onFilterChanged();
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    return this._currentFilter.shouldBeVisible(viewMessage);
  }

  clear() {
    this._suggestionBuilder.clear();
  }

  reset() {
    this._messageLevelFiltersSetting.set(ConsoleFilter.defaultLevelsFilterValue());
    this._filterByExecutionContextSetting.set(false);
    this._hideNetworkMessagesSetting.set(false);
    this._textFilterUI.setValue('');
    this._onFilterChanged();
  }
}

/**
 * @unrestricted
 */
export class ConsoleCommand extends ConsoleViewMessage {

  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier} linkifier
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {number} nestingLevel
   * @param {function(!Common.Event)} onResize
   */
  constructor(consoleMessage, linkifier, badgePool, nestingLevel, onResize) {
    super(consoleMessage, linkifier, badgePool, nestingLevel, onResize);
    this._contentElement = null;
    this._formattedCommand = null;
  }
  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    if (!this._contentElement) {
      this._contentElement = createElementWithClass('div', 'console-user-command');
      const icon = UI.Icon.create('smallicon-user-command', 'command-result-icon');
      this._contentElement.appendChild(icon);

      this._contentElement.message = this;

      this._formattedCommand = createElementWithClass('span', 'source-code');
      this._formattedCommand.textContent = this.text.replaceControlCharacters();
      this._contentElement.appendChild(this._formattedCommand);

      if (this._formattedCommand.textContent.length < MaxLengthToIgnoreHighlighter) {
        const javascriptSyntaxHighlighter = new UI.SyntaxHighlighter('text/javascript', true);
        javascriptSyntaxHighlighter.syntaxHighlightNode(this._formattedCommand).then(this._updateSearch.bind(this));
      } else {
        this._updateSearch();
      }

      this.updateTimestamp();
    }
    return this._contentElement;
  }

  _updateSearch() {
    this.setSearchRegex(this.searchRegex());
  }
}

/**
 * @unrestricted
 */
class ConsoleDiracCommand extends ConsoleCommand {
  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    if (!this._contentElement) {
      this._contentElement = createElementWithClass("div", "console-user-command");
      const icon = UI.Icon.create('smallicon-user-command', 'command-result-icon');
      this._contentElement.appendChild(icon);

      this._contentElement.message = this;

      this._formattedCommand = createElementWithClass("span", "console-message-text source-code cm-s-dirac");
      this._contentElement.appendChild(this._formattedCommand);

      CodeMirror.runMode(this.text, "clojure-parinfer", this._formattedCommand, undefined);

      this.element().classList.add("dirac-flavor"); // applied to wrapper element
    }
    return this._contentElement;
  }
}

/**
 * @unrestricted
 */
class ConsoleDiracMarkup extends ConsoleCommand {
  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    if (!this._contentElement) {
      this._contentElement = createElementWithClass("div", "console-message console-dirac-markup");
      this._contentElement.message = this;

      this._formattedCommand = createElementWithClass("span", "console-message-text source-code");
      this._formattedCommand.innerHTML = this.consoleMessage().messageText;
      this._contentElement.appendChild(this._formattedCommand);

      this.element().classList.add("dirac-flavor"); // applied to wrapper element
    }
    return this._contentElement;
  }
}

/**
 * @unrestricted
 */
class ConsoleCommandResult extends ConsoleViewMessage {
  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    const element = super.contentElement();
    if (!element.classList.contains('console-user-command-result')) {
      element.classList.add('console-user-command-result');
      if (this.consoleMessage().level === SDK.ConsoleMessage.MessageLevel.Info) {
        const icon = UI.Icon.create('smallicon-command-result', 'command-result-icon');
        element.insertBefore(icon, element.firstChild);
      }
    }
    return element;
  }
}

/**
 * @unrestricted
 */
export class ConsoleGroup {
  /**
   * @param {?ConsoleGroup} parentGroup
   * @param {?ConsoleViewMessage} groupMessage
   */
  constructor(parentGroup, groupMessage) {
    this._parentGroup = parentGroup;
    this._nestingLevel = parentGroup ? parentGroup.nestingLevel() + 1 : 0;
    this._messagesHidden =
        groupMessage && groupMessage.collapsed() || this._parentGroup && this._parentGroup.messagesHidden();
  }

  /**
   * @return {!ConsoleGroup}
   */
  static createTopGroup() {
    return new ConsoleGroup(null, null);
  }

  /**
   * @return {boolean}
   */
  messagesHidden() {
    return this._messagesHidden;
  }

  /**
   * @return {number}
   */
  nestingLevel() {
    return this._nestingLevel;
  }

  /**
   * @return {?ConsoleGroup}
   */
  parentGroup() {
    return this._parentGroup;
  }
}

/**
 * @implements {UI.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'console.show':
        Host.InspectorFrontendHost.bringToFront();
        self.Common.console.show();
        ConsoleView.instance()._focusPrompt();
        return true;
      case 'console.clear':
        ConsoleView.clearConsole();
        return true;
      case 'console.clear.history':
        ConsoleView.instance()._clearHistory();
        return true;
      case 'console.create-pin':
        ConsoleView.instance()._pinPane.addPin('', true /* userGesture */);
        return true;
    }
    return false;
  }
}

/** @type {symbol} */
const _messageSortingTimeSymbol = Symbol('messageSortingTime');

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @const
 * @type {number}
 */
const MaxLengthToIgnoreHighlighter = 10000;