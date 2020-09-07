// @ts-nocheck
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

import * as Bindings from '../bindings/bindings.js';
import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {ConsoleContextSelector} from './ConsoleContextSelector.js';
import {ConsoleFilter, FilterType} from './ConsoleFilter.js';
import {ConsolePinPane} from './ConsolePinPane.js';
import {ConsolePrompt, Events as ConsolePromptEvents} from './ConsolePrompt.js';
import {ConsoleSidebar, Events} from './ConsoleSidebar.js';
import {ConsoleGroupViewMessage, ConsoleViewMessage, MaxLengthForLinks} from './ConsoleViewMessage.js';  // eslint-disable-line no-unused-vars
import {ConsoleViewport, ConsoleViewportElement, ConsoleViewportProvider} from './ConsoleViewport.js';  // eslint-disable-line no-unused-vars
import {ConsoleDiracPrompt} from './ConsoleDiracPrompt.js';

/** @type {!ConsoleView} */
let consoleViewInstance;

/**
 * @implements {UI.SearchableView.Searchable}
 * @implements {ConsoleViewportProvider}
 * @unrestricted
 */
export class ConsoleView extends UI.Widget.VBox {
  constructor() {
    super();
    this.setMinimumSize(0, 35);
    this.registerRequiredCSS('console/consoleView.css');
    this.registerRequiredCSS('object_ui/objectValue.css');
    this.registerRequiredCSS('console/dirac-hacks.css');
    this.registerRequiredCSS('console/dirac-codemirror.css');
    this.registerRequiredCSS('console/dirac-theme.css');
    this.registerRequiredCSS('console/dirac-prompt.css');
    dirac.initConsole();

    this._searchableView = new UI.SearchableView.SearchableView(this);
    this._searchableView.element.classList.add('console-searchable-view');
    this._searchableView.setPlaceholder(Common.UIString.UIString('Find string in logs'));
    this._searchableView.setMinimalSearchQuerySize(0);
    this._sidebar = new ConsoleSidebar();
    this._sidebar.addEventListener(Events.FilterSelected, this._onFilterChanged.bind(this));
    this._isSidebarOpen = false;
    this._filter = new ConsoleViewFilter(this._onFilterChanged.bind(this));

    this._consoleToolbarContainer = this.element.createChild('div', 'console-toolbar-container');
    this._splitWidget = new UI.SplitWidget.SplitWidget(
        true /* isVertical */, false /* secondIsSidebar */, 'console.sidebar.width', 100);
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
    /** @type {number} */
    this._lastShownHiddenByFilterCount;
    /** @type {number} */
    this._currentMatchRangeIndex;
    /** @type {?RegExp} */
    this._searchRegex;

    /** @type {!Map<string, !Array<!ConsoleViewMessage>>} */
    this._groupableMessages = new Map();
    /** @type {!Map<string, !ConsoleViewMessage>} */
    this._groupableMessageTitle = new Map();
    /** @type {!Map<number, function():void>} */
    this._shortcuts = new Map();

    /**
     * @type {!Array.<!RegexMatchRange>}
     */
    this._regexMatchRanges = [];

    this._consoleContextSelector = new ConsoleContextSelector();

    this._filterStatusText = new UI.Toolbar.ToolbarText();
    this._filterStatusText.element.classList.add('dimmed');
    this._showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('consoleShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', Common.UIString.UIString('Console settings'));
    this._progressToolbarItem = new UI.Toolbar.ToolbarItem(document.createElement('div'));
    this._groupSimilarSetting = Common.Settings.Settings.instance().moduleSetting('consoleGroupSimilar');
    this._groupSimilarSetting.addChangeListener(() => this._updateMessageList());
    const groupSimilarToggle =
        new UI.Toolbar.ToolbarSettingCheckbox(this._groupSimilarSetting, Common.UIString.UIString('Group similar'));

    const toolbar = new UI.Toolbar.Toolbar('console-main-toolbar', this._consoleToolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('', this._consoleToolbarContainer);
    toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton(ls`console sidebar`));
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(
        /** @type {!UI.Action.Action }*/ (UI.ActionRegistry.ActionRegistry.instance().action('console.clear'))));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._consoleContextSelector.toolbarItem());
    toolbar.appendSeparator();
    const liveExpressionButton = UI.Toolbar.Toolbar.createActionButton(
        /** @type {!UI.Action.Action }*/ (UI.ActionRegistry.ActionRegistry.instance().action('console.create-pin')));
    toolbar.appendToolbarItem(liveExpressionButton);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._filter._textFilterUI);
    toolbar.appendToolbarItem(this._filter._levelMenuButton);
    toolbar.appendToolbarItem(this._progressToolbarItem);
    rightToolbar.appendSeparator();
    rightToolbar.appendToolbarItem(this._filterStatusText);
    rightToolbar.appendToolbarItem(this._showSettingsPaneButton);

    this._preserveLogCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog'),
        Common.UIString.UIString('Do not clear log on page reload / navigation'),
        Common.UIString.UIString('Preserve log'));
    this._hideNetworkMessagesCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._filter._hideNetworkMessagesSetting, this._filter._hideNetworkMessagesSetting.title(),
        Common.UIString.UIString('Hide network'));
    const filterByExecutionContextCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._filter._filterByExecutionContextSetting,
        Common.UIString.UIString('Only show messages from the current context (top, iframe, worker, extension)'),
        Common.UIString.UIString('Selected context only'));
    const monitoringXHREnabledSetting = Common.Settings.Settings.instance().moduleSetting('monitoringXHREnabled');
    this._timestampsSetting = Common.Settings.Settings.instance().moduleSetting('consoleTimestampsEnabled');
    this._consoleHistoryAutocompleteSetting =
        Common.Settings.Settings.instance().moduleSetting('consoleHistoryAutocomplete');

    const settingsPane = new UI.Widget.HBox();
    settingsPane.show(this._contentsElement);
    settingsPane.element.classList.add('console-settings-pane');

    UI.ARIAUtils.setAccessibleName(settingsPane.element, ls`Console settings`);
    UI.ARIAUtils.markAsGroup(settingsPane.element);
    const settingsToolbarLeft = new UI.Toolbar.Toolbar('', settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);
    settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);
    settingsToolbarLeft.appendToolbarItem(filterByExecutionContextCheckbox);
    settingsToolbarLeft.appendToolbarItem(groupSimilarToggle);

    const settingsToolbarRight = new UI.Toolbar.Toolbar('', settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(monitoringXHREnabledSetting));
    const eagerEvalCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('consoleEagerEval'), ls`Eagerly evaluate text in the prompt`);
    settingsToolbarRight.appendToolbarItem(eagerEvalCheckbox);
    settingsToolbarRight.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));
    const userGestureCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('consoleUserActivationEval'));
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
      if ((event.key === 'Enter' &&
           UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!KeyboardEvent} */ (event))) ||
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

    this._viewportThrottler = new Common.Throttler.Throttler(50);
    this._pendingBatchResize = false;
    this._onMessageResizedBound = this._onMessageResized.bind(this);

    this._topGroup = ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;

    this._promptElement = this._messagesElement.createChild('div', 'source-code');
    this._promptElement.id = 'console-prompt';

    const diracPromptElement = this._messagesElement.createChild('div', 'source-code');
    diracPromptElement.id = 'console-prompt-dirac';
    diracPromptElement.spellcheck = false;
    const diracPromptCodeMirrorInstance = dirac.adoptPrompt(diracPromptElement, dirac.hasParinfer);

    diracPromptElement.classList.add('inactive-prompt');

    // FIXME: This is a workaround for the selection machinery bug. See crbug.com/410899
    const selectAllFixer = this._messagesElement.createChild('div', 'console-view-fix-select-all');
    selectAllFixer.textContent = '.';
    UI.ARIAUtils.markAsHidden(selectAllFixer);

    this._registerShortcuts();

    this._messagesElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this._linkifier = new Components.Linkifier.Linkifier(MaxLengthForLinks);

    /** @type {!Array.<!ConsoleViewMessage>} */
    this._consoleMessages = [];
    this._viewMessageSymbol = Symbol('viewMessage');

    this._consoleHistorySetting = Common.Settings.Settings.instance().createLocalSetting('consoleHistory', []);

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

    /** @type {!Object.<number, !SDK.ConsoleModel.ConsoleMessage>} */
    this._pendingDiracCommands = {};
    this._lastDiracCommandId = 1;
    this._prompts = [];
    this._prompts.push({id: 'js',
      prompt: this._prompt,
      element: this._promptElement,
      proxy: this._prompt.element});
    this._activePromptIndex = 0;

    if (dirac.hasREPL) {
      const diracPrompt = new ConsoleDiracPrompt(diracPromptCodeMirrorInstance);
      diracPrompt.setAutocompletionTimeout(0);
      diracPrompt.renderAsBlock();
      const diracProxyElement = diracPrompt.attach(diracPromptElement);
      diracProxyElement.classList.add('console-prompt-dirac-wrapper');
      diracProxyElement.addEventListener('keydown', this._promptKeyDown.bind(this), true);

      this._diracHistorySetting = self.Common.settings.createLocalSetting('diracHistory', []);
      const diracHistoryData = this._diracHistorySetting.get();
      diracPrompt.history().setHistoryData(diracHistoryData);

      const statusElement = diracPromptElement.createChild('div');
      statusElement.id = 'console-status-dirac';

      const statusBannerElement = statusElement.createChild('div', 'status-banner');
      statusBannerElement.addEventListener('click', this._diracStatusBannerClick.bind(this), true);
      const statusContentElement = statusElement.createChild('div', 'status-content');
      statusContentElement.tabIndex = 0; // focusable for page-up/down

      this._diracPromptDescriptor = {id: 'dirac',
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

    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._executionContextChanged, this);

    const defaultPromptIndex = dirac.hostedInExtension ? 0 : 1;
    this._consolePromptIndexSetting = self.Common.settings.createLocalSetting('consolePromptIndex', defaultPromptIndex);

    this._consoleFeedback = 0;

    if (dirac.hasREPL) {
      this.setDiracPromptMode('status');
    } else {
      dirac.feedback('!dirac.hasREPL');
    }
    dirac.feedback('ConsoleView constructed');
    if (dirac.hasWelcomeMessage) {
      this.displayWelcomeMessage();
    } else {
      dirac.feedback('!dirac.hasWelcomeMessage');
    }

    this._messagesElement.addEventListener(
      'mousedown', /** @param {!Event} event */
        event => this._updateStickToBottomOnPointerDown(/** @type {!MouseEvent} */ (event).button === 2), false);
    this._messagesElement.addEventListener('mouseup', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('mouseleave', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('wheel', this._updateStickToBottomOnWheel.bind(this), false);
    this._messagesElement.addEventListener(
        'touchstart', this._updateStickToBottomOnPointerDown.bind(this, false), false);
    this._messagesElement.addEventListener('touchend', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('touchcancel', this._updateStickToBottomOnPointerUp.bind(this), false);

    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.DiracMessage, this._onConsoleDiracMessage, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageUpdated, this._onConsoleMessageUpdated, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
    SDK.ConsoleModel.ConsoleModel.instance().messages().forEach(this._addConsoleMessage, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this._executionContextCreated,
        this);

    const issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this._onIssuesCountChanged.bind(this));
    if (issuesManager.numberOfIssues()) {
      this._onIssuesCountChanged();
    }
  }

  _onIssuesCountChanged() {
    if (BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues() === 0) {
      if (this._issueBarDiv) {
        this._issueBarDiv.element().remove();
        this._issueBarDiv = null;
        this._scheduleViewportRefresh();
      }
    } else if (!this._issueBarDiv) {
      const issueBarAction = /** @type {!UI.Infobar.InfobarAction} */ ({
        text: ls`View issues`,
        highlight: false,
        delegate: () => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.ConsoleInfoBar);
          UI.ViewManager.ViewManager.instance().showView('issues-pane');
        },
        dismiss: false,
      });
      const issueBar = new UI.Infobar.Infobar(
          UI.Infobar.Type.Issue, ls`Some messages have been moved to the Issues panel.`, [issueBarAction]);
      issueBar.element.tabIndex = -1;
      issueBar.element.classList.add('console-message-wrapper');
      // This is a fake {ConsoleViewportElement} so the issue banner can be inserted into the {ConsoleViewport}.
      this._issueBarDiv = {
        willHide() {
          this._cachedIssueBarHeight = issueBar.element.offsetHeight;
        },
        wasShown() {},
        element: () => issueBar.element,
        focusLastChildOrSelf: () => issueBar.element.focus(),
        fastHeight() {
          return this._cachedIssueBarHeight || 37;
        },
        toExportString: () => ls`Some messages have been moved to the Issues panel.`,
        _cachedIssueBarHeight: 0
      };
      this._scheduleViewportRefresh();
    }
  }

  /**
   * @return {!ConsoleView}
   */
  static instance() {
    if (!consoleViewInstance) {
      consoleViewInstance = new ConsoleView();
    }
    return consoleViewInstance;
  }

  static clearConsole() {
    const consoleView = ConsoleView.instance();
    if (consoleView._issueBarDiv) {
      consoleView._issueBarDiv.element().remove();
      consoleView._issueBarDiv = null;
      consoleView._scheduleViewportRefresh();
    }
    SDK.ConsoleModel.ConsoleModel.instance().requestClearMessages();
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
   * @return {!UI.SearchableView.SearchableView}
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
    if (this._issueBarDiv) {
      return this._visibleViewMessages.length + 1;
    }
    return this._visibleViewMessages.length;
  }

  /**
   * @override
   * @param {number} index
   * @return {?ConsoleViewportElement}
   */
  itemElement(index) {
    const issueBar = this._issueBarDiv;
    if (issueBar) {
      if (index === 0) {
        return /** @type {!ConsoleViewportElement} */ (issueBar);
      }
      return this._visibleViewMessages[index - 1];
    }
    return this._visibleViewMessages[index];
  }

  /**
   * @override
   * @param {number} index
   * @return {number}
   */
  fastHeight(index) {
    const issueBar = this._issueBarDiv;
    if (issueBar) {
      if (index === 0) {
        return issueBar.fastHeight() || 37;
      }
      return this._visibleViewMessages[index - 1].fastHeight();
    }
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
    Common.Console.Console.instance().messages().forEach(this._addSinkMessage, this);
    Common.Console.Console.instance().addEventListener(Common.Console.Events.MessageAdded, messageAdded, this);

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
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
    let level = SDK.ConsoleModel.MessageLevel.Verbose;
    switch (message.level) {
      case Common.Console.MessageLevel.Info:
        level = SDK.ConsoleModel.MessageLevel.Info;
        break;
      case Common.Console.MessageLevel.Error:
        level = SDK.ConsoleModel.MessageLevel.Error;
        break;
      case Common.Console.MessageLevel.Warning:
        level = SDK.ConsoleModel.MessageLevel.Warning;
        break;
    }

    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(
        null, SDK.ConsoleModel.MessageSource.Other, level, message.text, SDK.ConsoleModel.MessageType.System, undefined,
        undefined, undefined, undefined, undefined, message.timestamp);
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
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _executionContextCreated(event) {
    const executionContext = event.data;
    if (!executionContext.frameId) {
      return;
    }

    const oldLength = this._consoleMessages.length;
    this._consoleMessages = this._consoleMessages.filter(viewMessage => {
      const consoleMessage = viewMessage.consoleMessage();
      // If a message from the execution context reported already exists, remove
      // it, as pre-existing messages from the execution context will be resent.
      if (consoleMessage.frameId && consoleMessage.executionContextId &&
          consoleMessage.executionContextId === executionContext.id &&
          consoleMessage.frameId === executionContext.frameId) {
        return false;
      }
      return true;
    });
    const messageRemoved = this._consoleMessages.length < oldLength;
    if (messageRemoved) {
      this._updateMessageList();
    }
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
      /** @type {!HTMLElement} */ (this._viewport.contentElement()).focus();
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
   * @return {!Promise.<void>}
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
    }
    this._scheduleViewportRefreshForTest(false);

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

  /**
   * @param {!Event} event
   */
  _diracStatusBannerClick(event) {
    if (!event.target || event.target.tagName !== 'A') {
      return false;
    }
    if (this._diracPromptDescriptor.statusBannerCallback) {
      this._diracPromptDescriptor.statusBannerCallback('click', event);
    }
    return false;
  }

  setDiracPromptStatusContent(s) {
    dirac.feedback("setDiracPromptStatusContent('" + s + "')");
    this._diracPromptDescriptor.statusContent.innerHTML = s;
  }

  setDiracPromptStatusBanner(s) {
    dirac.feedback("setDiracPromptStatusBanner('" + s + "')");
    this._diracPromptDescriptor.statusBanner.innerHTML = s;
  }

  setDiracPromptStatusBannerCallback(callback) {
    this._diracPromptDescriptor.statusBannerCallback = callback;
  }

  /**
   * @param {string} style
   */
  setDiracPromptStatusStyle(style) {
    dirac.feedback("setDiracPromptStatusStyle('" + style + "')");
    const knownStyles = ['error', 'info'];
    if (knownStyles.indexOf(style) === -1) {
      console.warn('unknown style passed to setDiracPromptStatusStyle:', style);
    }
    for (let i = 0; i < knownStyles.length; i++) {
      const s = knownStyles[i];
      this._diracPromptDescriptor.status.classList.toggle('dirac-prompt-status-' + s, style === s);
    }
  }

  /**
   * @param {string} mode
   */
  setDiracPromptMode(mode) {
    dirac.feedback("setDiracPromptMode('" + mode + "')");
    const knownModes = ['edit', 'status'];
    if (knownModes.indexOf(mode) === -1) {
      console.warn('unknown mode passed to setDiracPromptMode:', mode);
    }
    for (let i = 0; i < knownModes.length; i++) {
      const m = knownModes[i];
      this._diracPromptDescriptor.element.classList.toggle('dirac-prompt-mode-' + m, mode === m);
    }
    if (mode === 'edit') {
      this.focus();
    }
  }

  /**
   * @param {string} namespace
   * @param {string | null} compiler
   */
  _buildPromptPlaceholder(namespace, compiler) {
    const placeholderEl = document.createElement('div');
    placeholderEl.classList.add('dirac-prompt-placeholder');
    const namespaceEl =  document.createElement('span');
    namespaceEl.classList.add('dirac-prompt-namespace');
    namespaceEl.textContent = namespace || '';
    if (compiler) {
      const compilerEl = document.createElement('span');
      compilerEl.classList.add('dirac-prompt-compiler');
      compilerEl.textContent = compiler;
      placeholderEl.appendChildren(namespaceEl, compilerEl);
    } else {
      placeholderEl.appendChildren(namespaceEl);
    }
    return placeholderEl;
  }

  _refreshPromptInfo() {
    const promptDescriptor = this._prompts[this._activePromptIndex];
    if (promptDescriptor.id !== 'dirac') {
      return;
    }

    const namespace = this._currentNamespace || '';
    const compiler = this._currentCompiler;
    const placeholderEl = this._buildPromptPlaceholder(namespace, compiler);
    const cm = promptDescriptor.codeMirror;
    // code mirror won't switch the placeholder if the input has focus
    const hadFocus = cm.hasFocus();
    if (hadFocus) {
      cm.display.input.blur();
    }
    promptDescriptor.codeMirror.setOption('placeholder', placeholderEl);
    if (hadFocus) {
      cm.focus();
    }
  }

  /**
   * @param {string} name
   */
  setDiracPromptNS(name) {
    dirac.feedback("setDiracPromptNS('" + name + "')");
    this._currentNamespace = name;
    if (this._diracPromptDescriptor) {
      this._diracPromptDescriptor.prompt.setCurrentClojureScriptNamespace(name);
    }
    this._refreshPromptInfo();
  }

  /**
   * @param {string} name
   */
  setDiracPromptCompiler(name) {
    // dirac.feedback("setDiracPromptCompiler('"+name+"')");
    this._currentCompiler = name;
    this._refreshPromptInfo();
  }

  /**
   * @param {number} _requestId
   */
  onJobStarted(_requestId) {
    dirac.feedback('repl eval job started');
  }

  /**
   * @param {number} requestId
   */
  onJobEnded(requestId) {
    delete this._pendingDiracCommands[requestId];
    dirac.feedback('repl eval job ended');
  }

  /**
   * @return {string}
   */
  getSuggestBoxRepresentation() {
    const promptDescriptor = this.getCurrentPromptDescriptor();
    return promptDescriptor.id + ' prompt: ' + promptDescriptor.prompt.getSuggestBoxRepresentation();
  }

  /**
   * @return {string}
   */
  getPromptRepresentation() {
    return this._prompt.text();
  }

  /**
   * @param {*} message
   */
  handleEvalCLJSConsoleDiracMessage(message) {
    const code = message.parameters[2];
    if (code && typeof code.value === 'string') {
      this.appendDiracCommand(code.value, null);
    }
  }

  /**
   * @param {*} message
   */
  handleEvalJSConsoleDiracMessage(message) {
    const code = message.parameters[2];
    if (code && typeof code.value === 'string') {
      const jsPromptDescriptor = this._getPromptDescriptor('js');
      if (jsPromptDescriptor) {
        jsPromptDescriptor.prompt._appendCommand(code.value, true);
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onConsoleDiracMessage(event) {
    const message = (event.data);
    let command = message.parameters[1];
    if (command) {
      command = command.value;
    }

    switch (command) {
      case 'eval-cljs':
        this.handleEvalCLJSConsoleDiracMessage(message);
        break;
      case 'eval-js':
        this.handleEvalJSConsoleDiracMessage(message);
        break;
      default:
        throw ('unrecognized Dirac message: ' + command);
    }
  }


  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   * @return {?string}
   */
  _alterDiracViewMessage(message) {
    const nestingLevel = this._currentGroup.nestingLevel();

    message.messageText = '';
    if (message.parameters) {
      message.parameters.shift(); // "~~$DIRAC-LOG$~~"
    }

    // do not display location link
    message.url = undefined;
    message.stackTrace = undefined;

    let requestId = -1;
    let kind = '';
    try {
      if (message.parameters) {
        requestId = /** @type {number} */(message.parameters.shift().value); // request-id
        kind = /** @type {string} */(message.parameters.shift().value);
      }
    } catch (e) {
    }

    if (kind === 'result') {
      message.type = SDK.ConsoleModel.MessageType.Result;
    }

    const originatingMessage = this._pendingDiracCommands[requestId];
    if (originatingMessage) {
      message.setOriginatingMessage(originatingMessage);
      this._pendingDiracCommands[requestId] = message;
    }

    return kind ? ('dirac-' + kind) : null;
  }

  /**
   * @param {?SDK.ConsoleModel.MessageLevel} level
   * @returns {string}
   */
  _levelForFeedback(level) {
    return level || '???';
  }

  /**
   * @param {!SDK.ConsoleModel.MessageType} messageType
   * @param {boolean} isDiracFlavored
   * @returns {string}
   */
  _typeForFeedback(messageType, isDiracFlavored) {
    if (isDiracFlavored) {
      return 'DF';
    }
    if (messageType === SDK.ConsoleModel.MessageType.DiracCommand) {
      return 'DC';
    }
    return 'JS';
  }

  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   */
  _createViewMessage(message) {
    // this is a HACK to treat REPL messages as Dirac results
    const isDiracFlavoredMessage = message.messageText === '~~$DIRAC-LOG$~~';
    let extraClass = null;

    if (isDiracFlavoredMessage) {
      extraClass = this._alterDiracViewMessage(message);
    }

    const result = this._createViewMessage2(message);

    if (isDiracFlavoredMessage) {
      const wrapperElement = result.element();
      wrapperElement.classList.add('dirac-flavor');
      if (extraClass) {
        wrapperElement.classList.add(extraClass);
      }
    }

    if (this._consoleFeedback) {
      const levelText = this._levelForFeedback(message.level);
      const typeText = this._typeForFeedback(/** @type {!SDK.ConsoleModel.MessageType} */(message.type), isDiracFlavoredMessage);
      const contentEl = result.contentElement();
      const consoleMessageTextEl = contentEl.querySelector('.console-message-text');
      if (consoleMessageTextEl) {
        const messageText = consoleMessageTextEl.deepTextContent();
        const glue = (messageText.indexOf('\n') === -1) ? '> ' : '>\n'; // log multi-line log messages on a new line
        dirac.feedback(typeText + '.' + levelText + glue + messageText);
      }
    }

    return result;
  }

  /**
   * @param {string} markup
   * @return {boolean}
   */
  appendDiracMarkup(markup) {
    const target = self.SDK.targetManager.mainTarget();
    if (!target) {
      return false;
    }
    const runtimeModel = target.model(self.SDK.RuntimeModel);
    if (!runtimeModel) {
      return false;
    }
    const source = SDK.ConsoleModel.MessageSource.Other;
    const level = SDK.ConsoleModel.MessageLevel.Info;
    const type = SDK.ConsoleModel.MessageType.DiracMarkup;
    const message = new self.SDK.ConsoleMessage(runtimeModel, source, level, markup, type);
    self.SDK.consoleModel.addMessage(message);
    return true;
  }

  displayWelcomeMessage() {
    dirac.feedback('displayWelcomeMessage');
    /**
     * @param {string} text
     */
    const wrapCode = text => {
      return "<code style='background-color:rgba(0, 0, 0, 0.08);padding:0 2px;border-radius:1px'>" + text + '</code>';
    };
    /**
     * @param {string} text
     */
    const wrapBold = text => {
      return '<b>' + text + '</b>';
    };

    const welcomeMessage =
      'Welcome to ' + wrapBold('Dirac DevTools v' + dirac.getVersion()) + '.' +
      ' Cycle CLJS/JS prompts with ' + wrapCode('CTRL+,') + '.' +
      ' Enter ' + wrapCode('dirac') + ' for additional info.';

    if (!this.appendDiracMarkup(welcomeMessage)) {
      console.warn('displayWelcomeMessage: unable to add console message');
    }
  }

  /**
   * @param {number} index
   */
  _normalizePromptIndex(index) {
    const count = this._prompts.length;
    while (index < 0) {
      index += count;
    }
    return index % count;
  }

  /**
   * @param {number} oldPromptIndex
   * @param {number} newPromptIndex
   */
  _switchPromptIfAvail(oldPromptIndex, newPromptIndex) {
    const oldIndex = this._normalizePromptIndex(oldPromptIndex);
    const newIndex = this._normalizePromptIndex(newPromptIndex);
    if (oldIndex === newIndex) {
      return; // nothing to do
    }

    this._switchPrompt(oldIndex, newIndex);
  }

  /**
   * @param {number} oldPromptIndex
   * @param {number} newPromptIndex
   */
  _switchPrompt(oldPromptIndex, newPromptIndex) {
    const oldPromptDescriptor = this._prompts[this._normalizePromptIndex(oldPromptIndex)];
    const newPromptDescriptor = this._prompts[this._normalizePromptIndex(newPromptIndex)];

    newPromptDescriptor.element.classList.remove('inactive-prompt');

    this._prompt = newPromptDescriptor.prompt;
    this._promptElement = newPromptDescriptor.element;
    this._activePromptIndex = this._normalizePromptIndex(newPromptIndex);
    this._consolePromptIndexSetting.set(this._activePromptIndex);
    this._searchableView.setDefaultFocusedElement(this._promptElement);

    oldPromptDescriptor.element.classList.add('inactive-prompt');

    dirac.feedback("switched console prompt to '" + newPromptDescriptor.id + "'");
    this._prompt.setText(''); // clear prompt when switching
    this.focus();

    if (newPromptDescriptor.id === 'dirac') {
      dirac.initRepl();
    }
  }

  _selectNextPrompt() {
    this._switchPromptIfAvail(this._activePromptIndex, this._activePromptIndex + 1);
  }

  _selectPrevPrompt() {
    this._switchPromptIfAvail(this._activePromptIndex, this._activePromptIndex - 1);
  }

  /**
   * @param {string} promptId
   */
  _findPromptIndexById(promptId) {
    for (let i = 0; i < this._prompts.length; i++) {
      const promptDescriptor = this._prompts[i];
      if (promptDescriptor.id === promptId) {
        return i;
      }
    }
    return null;
  }

  /**
   * @param {string} promptId
   */
  _getPromptDescriptor(promptId) {
    const promptIndex = this._findPromptIndexById(promptId);
    if (promptIndex === null) {
      return null;
    }
    return this._prompts[promptIndex];
  }

  /**
   * @param {string} promptId
   */
  switchPrompt(promptId) {
    const selectedPromptIndex = this._findPromptIndexById(promptId);
    if (selectedPromptIndex === null) {
      console.warn('switchPrompt: unknown prompt id ', promptId);
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
   * @return {!HTMLElement}
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
   * @param {string} input
   * @return {!Promise<string>}
   */
  dispatchEventsForPromptInput(input) {
    return new Promise(resolve => {
      const continuation = () => resolve("entered input: '" + input + "'");
      const keyboard = Keysim.Keyboard.US_ENGLISH;
      keyboard.dispatchEventsForInput(input, this.getTargetForPromptEvents(), continuation);
    });
  }

  /**
   * @param {string} action
   * @return {!Promise<string>}
   */
  dispatchEventsForPromptAction(action) {
    return new Promise(resolve => {
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

  /**
   * @param {string} text
   * @param {?number} id
   */
  appendDiracCommand(text, id) {
    if (!text)
      {return;}

    if (!id) {
      id = this._lastDiracCommandId++;
    }

    const command = text;
    const commandId = id;

    const executionContext = self.UI.context.flavor(self.SDK.ExecutionContext);
    if (!executionContext) {
      return;
    }

    this._prompt.setText('');
    const runtimeModel = executionContext.runtimeModel;
    const type = SDK.ConsoleModel.MessageType.DiracCommand;
    const source = SDK.ConsoleModel.MessageSource.JS;
    const level = SDK.ConsoleModel.MessageLevel.Info;
    const commandMessage = new self.SDK.ConsoleMessage(runtimeModel, source, level, text, type);
    commandMessage.setExecutionContextId(executionContext.id);
    self.SDK.consoleModel.addMessage(commandMessage);

    this._prompt.history().pushHistoryItem(text);
    this._diracHistorySetting.set(this._prompt.history().historyData().slice(-persistedHistorySize));

    const debuggerModel = executionContext.debuggerModel;
    let scopeInfoPromise = Promise.resolve(null);
    if (debuggerModel) {
      scopeInfoPromise = dirac.extractScopeInfoFromScopeChainAsync(debuggerModel.selectedCallFrame());
    }

    this._pendingDiracCommands[commandId] = commandMessage;
    scopeInfoPromise.then(function(scopeInfo) {
      dirac.sendEvalRequest(commandId, command, scopeInfo);
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onConsoleMessageAdded(event) {
    const message = /** @type {!SDK.ConsoleModel.ConsoleMessage} */ (event.data);
    this._addConsoleMessage(message);
  }

  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   */
  _normalizeMessageTimestamp(message) {
    message.timestamp = this._consoleMessages.length ? this._consoleMessages.peekLast().consoleMessage().timestamp : 0;
  }

  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   */
  _addConsoleMessage(message) {
    const viewMessage = this._createViewMessage(message);
    consoleMessageToViewMessage.set(message, viewMessage);
    if (message.type === SDK.ConsoleModel.MessageType.Command || message.type === SDK.ConsoleModel.MessageType.Result) {
      const lastMessage = this._consoleMessages.peekLast();
      const newTimestamp = lastMessage && messagesSortedBySymbol.get(lastMessage) || 0;
      messagesSortedBySymbol.set(viewMessage, newTimestamp);
    } else {
      messagesSortedBySymbol.set(viewMessage, viewMessage.consoleMessage().timestamp);
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
    const shouldGroupSimilar = this._groupSimilarSetting.get();
    if (message.isGroupable()) {
      const groupKey = viewMessage.groupKey();
      shouldGoIntoGroup = shouldGroupSimilar && this._groupableMessages.has(groupKey);
      let list = this._groupableMessages.get(groupKey);
      if (!list) {
        list = [];
        this._groupableMessages.set(groupKey, list);
      }
      list.push(viewMessage);
    }

    this._computeShouldMessageBeVisible(viewMessage);
    if (!shouldGoIntoGroup && !insertedInMiddle) {
      this._appendMessageToEnd(
          viewMessage,
          !shouldGroupSimilar /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */);
      this._updateFilterStatus();
      this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    } else {
      this._needsFullUpdate = true;
    }

    this._scheduleViewportRefresh();
    this._consoleMessageAddedForTest(viewMessage);

    /**
     * @param {!ConsoleViewMessage} viewMessage1
     * @param {!ConsoleViewMessage} viewMessage2
     */
    function timeComparator(viewMessage1, viewMessage2) {
      return (messagesSortedBySymbol.get(viewMessage1) || 0) - (messagesSortedBySymbol.get(viewMessage2) || 0);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onConsoleMessageUpdated(event) {
    const message = /** @type {!SDK.ConsoleModel.ConsoleMessage} */ (event.data);
    const viewMessage = consoleMessageToViewMessage.get(message);
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
    if (viewMessage.consoleMessage().type === SDK.ConsoleModel.MessageType.EndGroup) {
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
      this._currentGroup = new ConsoleGroup(this._currentGroup, /** @type {!ConsoleGroupViewMessage} */ (viewMessage));
    }

    this._messageAppendedForTests();
  }

  _messageAppendedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   * @return {!ConsoleViewMessage}
   */
  _createViewMessage2(message) {
    const nestingLevel = this._currentGroup.nestingLevel();
    switch (message.type) {
      case SDK.ConsoleModel.MessageType.Command:
        return new ConsoleCommand(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.DiracCommand:
        return new ConsoleDiracCommand(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.DiracMarkup:
        return new ConsoleDiracMarkup(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.Result:
        return new ConsoleCommandResult(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.StartGroupCollapsed:
      case SDK.ConsoleModel.MessageType.StartGroup:
        return new ConsoleGroupViewMessage(
            message, this._linkifier, nestingLevel, this._updateMessageList.bind(this), this._onMessageResizedBound);
      default:
        return new ConsoleViewMessage(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   * @return {!Promise<void>}
   */
  async _onMessageResized(event) {
    const treeElement = /** @type {!UI.TreeOutline.TreeElement} */ (event.data);
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
    UI.ARIAUtils.alert(ls`Console cleared`, this._viewport.element);
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const eventTarget = /** @type {!Node} */ (event.target);
    if (eventTarget.isSelfOrDescendant(this._promptElement)) {
      contextMenu.show();
      return;
    }

    const sourceElement = eventTarget.enclosingNodeOrSelfWithClass('console-message-wrapper');
    const consoleMessage = (sourceElement && 'message' in sourceElement) ?
        // ts-expect-error We can't convert this to a Weakmap, as it comes from `ConsoleViewMessage` instead.
        /** @type {!ConsoleViewMessage} */ (sourceElement.message).consoleMessage() :
        null;

    if (consoleMessage && consoleMessage.url) {
      const menuTitle = ls`Hide messages from ${new Common.ParsedURL.ParsedURL(consoleMessage.url).displayName}`;
      contextMenu.headerSection().appendItem(
          menuTitle, this._filter.addMessageURLFilter.bind(this._filter, consoleMessage.url));
    }

    contextMenu.defaultSection().appendAction('console.clear');
    contextMenu.defaultSection().appendAction('console.clear.history');
    contextMenu.saveSection().appendItem(Common.UIString.UIString('Save as...'), this._saveConsole.bind(this));
    if (this.element.hasSelection()) {
      contextMenu.clipboardSection().appendItem(
          Common.UIString.UIString('Copy visible styled selection'),
          this._viewport.copyWithStyles.bind(this._viewport));
    }

    if (consoleMessage) {
      const request = SDK.NetworkLog.NetworkLog.requestForConsoleMessage(consoleMessage);
      if (request && SDK.NetworkManager.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(
            ls`Replay XHR`, SDK.NetworkManager.NetworkManager.replayRequest.bind(null, request));
      }
    }

    contextMenu.show();
  }

  async _saveConsole() {
    const url = /** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget()).inspectedURL();
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    const filename = Platform.StringUtilities.sprintf('%s-%d.log', parsedURL ? parsedURL.host : 'console', Date.now());
    const stream = new Bindings.FileUtils.FileOutputStream();

    const progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    progressIndicator.setTitle(Common.UIString.UIString('Writing file…'));
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
   * @param {!ConsoleViewMessage=} lastMessage
   * @return {boolean}
   */
  _tryToCollapseMessages(viewMessage, lastMessage) {
    const timestampsShown = this._timestampsSetting.get();
    if (!timestampsShown && lastMessage && !viewMessage.consoleMessage().isGroupMessage() &&
        viewMessage.consoleMessage().type !== SDK.ConsoleModel.MessageType.Command &&
        viewMessage.consoleMessage().type !== SDK.ConsoleModel.MessageType.Result &&
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
        this._appendMessageToEnd(
            this._consoleMessages[i],
            true /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */);
      }
    }
    this._updateFilterStatus();
    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    this._viewport.invalidate();
  }

  _addGroupableMessagesToEnd() {
    /** @type {!Set<(!SDK.ConsoleModel.ConsoleMessage|!ConsoleViewMessage)>} */
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
        Platform.SetUtilities.addAll(alreadyAdded, viewMessagesInGroup);
        processedGroupKeys.add(key);
        continue;
      }

      // Create artificial group start and end messages.
      let startGroupViewMessage = this._groupableMessageTitle.get(key);
      if (!startGroupViewMessage) {
        const startGroupMessage = new SDK.ConsoleModel.ConsoleMessage(
            null, message.source, message.level, viewMessage.groupTitle(),
            SDK.ConsoleModel.MessageType.StartGroupCollapsed);
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

      const endGroupMessage = new SDK.ConsoleModel.ConsoleMessage(
          null, message.source, message.level, message.messageText, SDK.ConsoleModel.MessageType.EndGroup);
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
    const keyEvent = /** @type {!KeyboardEvent} */ (event);
    const hasActionModifier = keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey;
    if (hasActionModifier || keyEvent.key.length !== 1 || UI.UIUtils.isEditing() ||
        this._messagesElement.hasSelection()) {
      return;
    }
    this._prompt.moveCaretToEndOfPrompt();
    this._focusPrompt();
  }

  /**
   * @param {!Event} event
   */
  _messagesPasted(event) {
    if (UI.UIUtils.isEditing()) {
      return;
    }
    this._prompt.focus();
  }

  _registerShortcuts() {
    this._shortcuts.set(
        UI.KeyboardShortcut.KeyboardShortcut.makeKey('u', UI.KeyboardShortcut.Modifiers.Ctrl),
        this._clearPromptBackwards.bind(this));

    const section = self.UI.shortcutsScreen.section(Common.UIString.UIString('Console'));
    const shortcut = UI.KeyboardShortcut.KeyboardShortcut;
    if (dirac.hasREPL) {
      const keys = [
        shortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Comma, UI.KeyboardShortcut.Modifiers.Ctrl),
        shortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Period, UI.KeyboardShortcut.Modifiers.Ctrl)
      ];
      this._shortcuts[keys[0].key] = this._selectNextPrompt.bind(this);
      this._shortcuts[keys[1].key] = this._selectPrevPrompt.bind(this);
      section.addRelatedKeys(keys, Common.UIString.UIString('Next/previous prompt'));
    }
  }

  _clearPromptBackwards() {
    this._prompt.setText('');
  }

  /**
   * @param {!Event} event
   */
  _promptKeyDown(event) {
    const keyboardEvent = /** @type {!KeyboardEvent} */(event);
    if (keyboardEvent.key === 'PageUp') {
      this._updateStickToBottomOnWheel();
      return;
    } if (isEnterKey(keyboardEvent)) {
      // TODO: this should be eventually moved to ConsoleDiracPrompt.js
      // let's wait for upstream to finish transition to ConsolePrompt.js
      const promptDescriptor = this._prompts[this._activePromptIndex];
      if (promptDescriptor.id === 'dirac') {
        if (event.altKey || event.ctrlKey || event.shiftKey)
          {return;}

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

    const shortcut = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);
    const handler = this._shortcuts.get(shortcut);
    if (handler) {
      handler();
      keyboardEvent.preventDefault();
    }
  }

  /**
   * @param {?SDK.RemoteObject.RemoteObject} result
   * @param {!SDK.ConsoleModel.ConsoleMessage} originatingConsoleMessage
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _printResult(result, originatingConsoleMessage, exceptionDetails) {
    if (!result) {
      return;
    }

    const level = !!exceptionDetails ? SDK.ConsoleModel.MessageLevel.Error : SDK.ConsoleModel.MessageLevel.Info;
    let message;
    if (!exceptionDetails) {
      message = new SDK.ConsoleModel.ConsoleMessage(
          result.runtimeModel(), SDK.ConsoleModel.MessageSource.JS, level, '', SDK.ConsoleModel.MessageType.Result,
          undefined, undefined, undefined, [/** @type {*} */ (result)]);
    } else {
      message = SDK.ConsoleModel.ConsoleMessage.fromException(
          result.runtimeModel(), exceptionDetails, SDK.ConsoleModel.MessageType.Result, undefined, undefined);
    }
    message.setOriginatingMessage(originatingConsoleMessage);
    SDK.ConsoleModel.ConsoleModel.instance().addMessage(message);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _commandEvaluated(event) {
    const data =
        /** @type {{result: ?SDK.RemoteObject.RemoteObject, commandMessage: !SDK.ConsoleModel.ConsoleMessage, exceptionDetails: (!Protocol.Runtime.ExceptionDetails|undefined)}} */
        (event.data);
    if (!data.commandMessage.skipHistory) {
      this._prompt.history().pushHistoryItem(data.commandMessage.messageText);
      this._consoleHistorySetting.set(this._prompt.history().historyData().slice(-persistedHistorySize));
    }
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
    this._searchRegex = null;
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

    this._searchProgressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchProgressIndicator.setTitle(Common.UIString.UIString('Searching…'));
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
    if (this._searchProgressIndicator && this._searchProgressIndicator.isCanceled()) {
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
    if (this._searchProgressIndicator) {
      this._searchProgressIndicator.setWorked(index);
    }
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
      message.searchHighlightNode(matchRange.matchIndex)
          .classList.remove(UI.UIUtils.highlightedCurrentSearchResultClassName);
    }

    index = Platform.NumberUtilities.mod(index, this._regexMatchRanges.length);
    this._currentMatchRangeIndex = index;
    this._searchableView.updateCurrentMatchIndex(index);
    matchRange = this._regexMatchRanges[index];
    const message = this._visibleViewMessages[matchRange.messageIndex];
    const highlightNode = message.searchHighlightNode(matchRange.matchIndex);
    highlightNode.classList.add(UI.UIUtils.highlightedCurrentSearchResultClassName);
    const notifyOffset = this._issueBarDiv ? 1 : 0;
    this._viewport.scrollItemIntoView(matchRange.messageIndex + notifyOffset);
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
        this._messagesElement.clientHeight -
        /** @type {!HTMLElement} */ (this._prompt.belowEditorElement()).offsetHeight;
    return distanceToPromptEditorBottom <= 2;
  }
}

const persistedHistorySize = 300;

/**
 * @unrestricted
 */
export class ConsoleViewFilter {
  /**
   * @param {function():void} filterChangedCallback
   */
  constructor(filterChangedCallback) {
    this._filterChanged = filterChangedCallback;

    this._messageLevelFiltersSetting = ConsoleViewFilter.levelFilterSetting();
    this._hideNetworkMessagesSetting = Common.Settings.Settings.instance().moduleSetting('hideNetworkMessages');
    this._filterByExecutionContextSetting =
        Common.Settings.Settings.instance().moduleSetting('selectedContextFilterEnabled');

    this._messageLevelFiltersSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._hideNetworkMessagesSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._filterByExecutionContextSetting.addChangeListener(this._onFilterChanged.bind(this));
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._onFilterChanged, this);

    const filterKeys = Object.values(FilterType);
    this._suggestionBuilder = new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(filterKeys);
    this._textFilterUI = new UI.Toolbar.ToolbarInput(
        Common.UIString.UIString('Filter'), '', 0.2, 1, Common.UIString.UIString('e.g. /event\\d/ -cdn url:a.com'),
        this._suggestionBuilder.completions.bind(this._suggestionBuilder));
    this._textFilterSetting = Common.Settings.Settings.instance().createSetting('console.textFilter', '');
    if (this._textFilterSetting.get()) {
      this._textFilterUI.setValue(this._textFilterSetting.get());
    }
    this._textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      this._textFilterSetting.set(this._textFilterUI.value());
      this._onFilterChanged();
    });
    this._filterParser = new TextUtils.TextUtils.FilterParser(filterKeys);
    this._currentFilter = new ConsoleFilter('', [], null, this._messageLevelFiltersSetting.get());
    this._updateCurrentFilter();

    /** @type {!Map<!SDK.ConsoleModel.MessageLevel, string>} */
    this._levelLabels = new Map([
      [SDK.ConsoleModel.MessageLevel.Verbose, Common.UIString.UIString('Verbose')],
      [SDK.ConsoleModel.MessageLevel.Info, Common.UIString.UIString('Info')],
      [SDK.ConsoleModel.MessageLevel.Warning, Common.UIString.UIString('Warnings')],
      [SDK.ConsoleModel.MessageLevel.Error, Common.UIString.UIString('Errors')],
    ]);

    this._levelMenuButton = new UI.Toolbar.ToolbarButton(ls`Log levels`);
    this._levelMenuButton.turnIntoSelect();
    this._levelMenuButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._showLevelContextMenu.bind(this));
    UI.ARIAUtils.markAsMenuButton(this._levelMenuButton.element);

    this._updateLevelMenuButtonText();
    this._messageLevelFiltersSetting.addChangeListener(this._updateLevelMenuButtonText.bind(this));
  }

  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} message
   */
  onMessageAdded(message) {
    if (message.type === SDK.ConsoleModel.MessageType.Command || message.type === SDK.ConsoleModel.MessageType.Result ||
        message.isGroupMessage()) {
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
   * @return {!Common.Settings.Setting<!Object<string, boolean>>}
   */
  static levelFilterSetting() {
    return Common.Settings.Settings.instance().createSetting(
        'messageLevelFilters', ConsoleFilter.defaultLevelsFilterValue());
  }

  _updateCurrentFilter() {
    const parsedFilters = this._filterParser.parse(this._textFilterUI.value());
    if (this._hideNetworkMessagesSetting.get()) {
      parsedFilters.push(
          {key: FilterType.Source, text: SDK.ConsoleModel.MessageSource.Network, negative: true, regex: undefined});
    }

    this._currentFilter.executionContext = this._filterByExecutionContextSetting.get() ?
        UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext) :
        null;
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
    for (const name of Object.values(SDK.ConsoleModel.MessageLevel)) {
      isAll = isAll && levels[name] === allValue[name];
      isDefault = isDefault && levels[name] === defaultValue[name];
      if (levels[name]) {
        text = text ? Common.UIString.UIString('Custom levels') :
                      Common.UIString.UIString('%s only', this._levelLabels.get(name));
      }
    }
    if (isAll) {
      text = Common.UIString.UIString('All levels');
    } else if (isDefault) {
      text = Common.UIString.UIString('Default levels');
    } else {
      text = text || Common.UIString.UIString('Hide all');
    }
    this._levelMenuButton.element.classList.toggle('warning', !isAll && !isDefault);
    this._levelMenuButton.setText(text);
    this._levelMenuButton.setTitle(ls`Log level: ${text}`);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _showLevelContextMenu(event) {
    const mouseEvent = /** @type {!Event} */ (event.data);
    const setting = this._messageLevelFiltersSetting;
    const levels = setting.get();

    const contextMenu = new UI.ContextMenu.ContextMenu(
        mouseEvent, true /* useSoftMenu */, this._levelMenuButton.element.totalOffsetLeft(),
        this._levelMenuButton.element.totalOffsetTop() +
            /** @type {!HTMLElement} */ (this._levelMenuButton.element).offsetHeight);
    contextMenu.headerSection().appendItem(
        Common.UIString.UIString('Default'), () => setting.set(ConsoleFilter.defaultLevelsFilterValue()));
    for (const [level, levelText] of this._levelLabels.entries()) {
      contextMenu.defaultSection().appendCheckboxItem(levelText, toggleShowLevel.bind(null, level), levels[level]);
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
   * @override
   * @return {!Element}
   */
  contentElement() {
    if (!this._contentElement) {
      this._contentElement = document.createElement('div');
      this._contentElement.classList.add('console-user-command');
      const icon = UI.Icon.Icon.create('smallicon-user-command', 'command-result-icon');
      this._contentElement.appendChild(icon);

      // ts-expect-error We can't convert this to a Weakmap, as it comes from `ConsoleViewMessage` instead.
      this._contentElement.message = this;

      this._formattedCommand = document.createElement('span');
      this._formattedCommand.classList.add('source-code');
      this._formattedCommand.textContent = Platform.StringUtilities.replaceControlCharacters(this.text);
      this._contentElement.appendChild(this._formattedCommand);

      if (this._formattedCommand.textContent.length < MaxLengthToIgnoreHighlighter) {
        const javascriptSyntaxHighlighter = new UI.SyntaxHighlighter.SyntaxHighlighter('text/javascript', true);
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
      this._contentElement = document.createElement('div');
      this._contentElement.classList.add('console-user-command');
      this._contentElement.message = this;
      const icon = UI.Icon.Icon.create('smallicon-user-command', 'command-result-icon');
      this._contentElement.appendChild(icon);

      this._formattedCommand = document.createElement('span');
      this._formattedCommand.classList.add('console-message-text', 'source-code', 'cm-s-dirac');
      this._contentElement.appendChild(this._formattedCommand);

      CodeMirror.runMode(this.text, 'clojure-parinfer', this._formattedCommand, undefined);

      this.element().classList.add('dirac-flavor'); // applied to wrapper element
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
      this._contentElement = document.createElement('div');
      this._contentElement.classList.add('console-message', 'console-dirac-markup');
      this._contentElement.message = this;

      this._formattedCommand = document.createElement('span');
      this._formattedCommand.classList.add('console-message-text', 'source-code');
      this._formattedCommand.innerHTML = this.consoleMessage().messageText;
      this._contentElement.appendChild(this._formattedCommand);

      this.element().classList.add('dirac-flavor'); // applied to wrapper element
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
      if (this.consoleMessage().level === SDK.ConsoleModel.MessageLevel.Info) {
        const icon = UI.Icon.Icon.create('smallicon-command-result', 'command-result-icon');
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
   * @param {?ConsoleGroupViewMessage} groupMessage
   */
  constructor(parentGroup, groupMessage) {
    this._parentGroup = parentGroup;
    this._nestingLevel = parentGroup ? parentGroup.nestingLevel() + 1 : 0;
    this._messagesHidden =
        groupMessage && groupMessage.collapsed() || this._parentGroup && this._parentGroup.messagesHidden() || false;
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
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'console.show':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        Common.Console.Console.instance().show();
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

/** @type {!WeakMap<!ConsoleViewMessage, number>} */
const messagesSortedBySymbol = new WeakMap();
/** @type {!WeakMap<!SDK.ConsoleModel.ConsoleMessage, !ConsoleViewMessage>} */
const consoleMessageToViewMessage = new WeakMap();

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @const
 * @type {number}
 */
const MaxLengthToIgnoreHighlighter = 10000;

/**
 * @typedef {{messageIndex: number, matchIndex: number}}
 */
// ts-expect-error typedef
export let RegexMatchRange;
