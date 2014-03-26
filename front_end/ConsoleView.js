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

/**
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.Searchable}
 * @constructor
 * @param {boolean} hideContextSelector
 */
WebInspector.ConsoleView = function(hideContextSelector)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("filter.css");

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);

    this._contentsElement = this._searchableView.element;
    this._contentsElement.classList.add("console-view");
    this._visibleViewMessages = [];
    this._urlToMessageCount = {};

    this._clearConsoleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear console log."), "clear-status-bar-item");
    this._clearConsoleButton.addEventListener("click", this._requestClearMessages, this);

    this._executionContextSelector = new WebInspector.StatusBarComboBox(this._executionContextChanged.bind(this), "console-context");
    this._topLevelOptionByContextListId = {};
    this._subOptionsByContextListId = {};

    this._filter = new WebInspector.ConsoleViewFilter(this);
    this._filter.addEventListener(WebInspector.ConsoleViewFilter.Events.FilterChanged, this._updateMessageList.bind(this));

    if (hideContextSelector)
        this._executionContextSelector.element.classList.add("hidden");

    this._filterBar = new WebInspector.FilterBar();

    var statusBarElement = this._contentsElement.createChild("div", "console-status-bar");
    statusBarElement.appendChild(this._clearConsoleButton.element);
    statusBarElement.appendChild(this._filterBar.filterButton().element);
    statusBarElement.appendChild(this._executionContextSelector.element);

    this._filtersContainer = this._contentsElement.createChild("div", "console-filters-header hidden");
    this._filtersContainer.appendChild(this._filterBar.filtersElement());
    this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
    this._filter.addFilters(this._filterBar);

    this.messagesElement = document.createElement("div");
    this.messagesElement.id = "console-messages";
    this.messagesElement.className = "monospace";
    this.messagesElement.addEventListener("click", this._messagesClicked.bind(this), true);
    this._contentsElement.appendChild(this.messagesElement);
    this._scrolledToBottom = true;

    this.promptElement = document.createElement("div");
    this.promptElement.id = "console-prompt";
    this.promptElement.className = "source-code";
    this.promptElement.spellcheck = false;
    this.messagesElement.appendChild(this.promptElement);
    this.messagesElement.appendChild(document.createElement("br"));

    this.topGroup = new WebInspector.ConsoleGroup(null);
    this.messagesElement.insertBefore(this.topGroup.element, this.promptElement);
    this.currentGroup = this.topGroup;

    this._registerShortcuts();
    this.registerRequiredCSS("textPrompt.css");

    this.messagesElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);

    WebInspector.settings.monitoringXHREnabled.addChangeListener(this._monitoringXHREnabledSettingChanged.bind(this));

    this._linkifier = new WebInspector.Linkifier();

    /** @type {!Map.<!WebInspector.ConsoleMessage, !WebInspector.ConsoleViewMessage>} */
    this._messageToViewMessage = new Map();
    /** @type {!Array.<!WebInspector.ConsoleMessage>} */
    this._consoleMessages = [];

    this.prompt = new WebInspector.TextPromptWithHistory(this._completionsForTextPrompt.bind(this));
    this.prompt.setSuggestBoxEnabled("generic-suggest");
    this.prompt.renderAsBlock();
    this.prompt.attach(this.promptElement);
    this.prompt.proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this), false);
    this.prompt.setHistoryData(WebInspector.settings.consoleHistory.get());

    WebInspector.targetManager.targets().forEach(this._targetAdded, this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.TargetAdded, this._onTargetAdded, this);

    this._filterStatusMessageElement = document.createElement("div");
    this._filterStatusMessageElement.classList.add("console-message");
    this._filterStatusTextElement = this._filterStatusMessageElement.createChild("span", "console-info");
    this._filterStatusMessageElement.createTextChild(" ");
    var resetFiltersLink = this._filterStatusMessageElement.createChild("span", "console-info node-link");
    resetFiltersLink.textContent = WebInspector.UIString("Show all messages.");
    resetFiltersLink.addEventListener("click", this._filter.reset.bind(this._filter), true);

    this.messagesElement.insertBefore(this._filterStatusMessageElement, this.topGroup.element);

    this._updateFilterStatus();
}

WebInspector.ConsoleView.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onTargetAdded: function(event)
    {
        this._targetAdded(/**@type {!WebInspector.Target} */(event.data));
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _targetAdded: function(target)
    {
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded.bind(this, target), this);
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
        target.consoleModel.messages.forEach(this._consoleMessageAdded.bind(this, target));

        /**
         * @param {!WebInspector.ExecutionContextList} contextList
         * @this {WebInspector.ConsoleView}
         */
        function loadContextList(contextList)
        {
            this._addExecutionContextList(target, contextList);
            this._contextListChanged(target, contextList);
        }
        target.runtimeModel.contextLists().forEach(loadContextList, this);
        target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextListAdded, this._executionContextListAdded.bind(this, target));
        target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextListRemoved, this._executionContextListRemoved, this);

    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.promptElement
    },

    _onFiltersToggled: function(event)
    {
        var toggled = /** @type {boolean} */ (event.data);
        this._filtersContainer.classList.toggle("hidden", !toggled);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _executionContextListAdded: function(target, event)
    {
        var contextList = /** @type {!WebInspector.ExecutionContextList} */ (event.data);
        this._addExecutionContextList(target, contextList);
    },

    /**
     * @param {!WebInspector.ExecutionContextList} contextList
     */
    _addExecutionContextList: function(target, contextList)
    {
        var maxLength = 50;
        var topLevelOption = this._executionContextSelector.createOption(contextList.displayName().trimMiddle(maxLength), contextList.url());
        topLevelOption._executionContext = null;
        topLevelOption._target = target;
        this._topLevelOptionByContextListId[contextList.id()] = topLevelOption;
        this._subOptionsByContextListId[contextList.id()] = [];

        contextList.addEventListener(WebInspector.ExecutionContextList.EventTypes.Reset, this._contextListReset, this);
        contextList.addEventListener(WebInspector.ExecutionContextList.EventTypes.ContextAdded, this._contextListChanged.bind(this, target, contextList));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _executionContextListRemoved: function(event)
    {
        var contextList = /** @type {!WebInspector.ExecutionContextList} */ (event.data);

        this._removeSubOptions(contextList.id());
        var topLevelOption = this._topLevelOptionByContextListId[contextList.id()];
        this._executionContextSelector.removeOption(topLevelOption);
        delete this._topLevelOptionByContextListId[contextList.id()];
        delete this._subOptionsByContextListId[contextList.id()];
        this._executionContextChanged();
    },

    /**
     * @param {string} contextListId
     * @return {boolean}
     */
    _removeSubOptions: function(contextListId)
    {
        var selectedOptionRemoved = false;
        var subOptions = this._subOptionsByContextListId[contextListId];
        for (var i = 0; i < subOptions.length; ++i) {
            selectedOptionRemoved |= this._executionContextSelector.selectedOption() === subOptions[i];
            this._executionContextSelector.removeOption(subOptions[i]);
        }
        this._subOptionsByContextListId[contextListId] = [];
        return selectedOptionRemoved;
    },

    _executionContextChanged: function()
    {
        var runtimeModel = this._currentTarget().runtimeModel;
        var runtimeContext = runtimeModel.currentExecutionContext();
        if (this._currentExecutionContext() !== runtimeContext)
            runtimeModel.setCurrentExecutionContext(this._currentExecutionContext());

        this.prompt.clearAutoComplete(true);
    },

    /**
     * @return {?WebInspector.ExecutionContext}
     */
    _currentExecutionContext: function()
    {
        var option = this._executionContextSelector.selectedOption();
        return option ? option._executionContext : null;
    },

    /**
     * @return {!WebInspector.Target}
     */
    _currentTarget: function()
    {
        var option = this._executionContextSelector.selectedOption();
        return option ? option._target : WebInspector.targetManager.mainTarget();
    },

    /**
     * @param {!Element} proxyElement
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    _completionsForTextPrompt: function(proxyElement, wordRange, force, completionsReadyCallback)
    {
        this._currentTarget().runtimeModel.completionsForTextPrompt(proxyElement, wordRange, force, completionsReadyCallback);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _contextListReset: function(event)
    {
        var contextList = /** @type {!WebInspector.ExecutionContextList} */ (event.data);
        var option = this._topLevelOptionByContextListId[contextList.id()];
        var maxLength = 50;
        option.text = contextList.displayName().trimMiddle(maxLength);
        option.title = contextList.url();

        var selectedRemoved = this._removeSubOptions(contextList.id());

        if (selectedRemoved) {
            this._executionContextSelector.select(option);
            this._executionContextChanged();
        }
    },

    /**
     * @param {!WebInspector.ExecutionContextList} contextList
     */
    _contextListChanged: function(target, contextList)
    {
        var currentExecutionContext = this._currentExecutionContext();
        var shouldSelectOption = this._removeSubOptions(contextList.id());

        var topLevelOption = this._topLevelOptionByContextListId[contextList.id()];
        var nextTopLevelOption = topLevelOption.nextSibling;
        var subOptions = this._subOptionsByContextListId[contextList.id()];
        var executionContexts = contextList.executionContexts();
        for (var i = 0; i < executionContexts.length; ++i) {
            if (executionContexts[i].isMainWorldContext) {
                topLevelOption._executionContext = executionContexts[i];
                continue;
            }
            var subOption = document.createElement("option");
            subOption.text = "\u00a0\u00a0\u00a0\u00a0" + executionContexts[i].name;
            subOption._executionContext = executionContexts[i];
            subOption._target = target;
            this._executionContextSelector.selectElement().insertBefore(subOption, nextTopLevelOption);
            subOptions.push(subOption);

            if (shouldSelectOption && executionContexts[i] === currentExecutionContext) {
                this._executionContextSelector.select(subOption);
                shouldSelectOption = false;
            }
        }

        if (shouldSelectOption)
            this._executionContextSelector.select(topLevelOption);

        this._executionContextChanged();
    },

    willHide: function()
    {
        this.prompt.hideSuggestBox();
        this.prompt.clearAutoComplete(true);
    },

    wasShown: function()
    {
        if (!this.prompt.isCaretInsidePrompt())
            this.prompt.moveCaretToEndOfPrompt();
    },

    focus: function()
    {
        if (this.promptElement === WebInspector.currentFocusElement())
            return;
        WebInspector.setCurrentFocusElement(this.promptElement);
        this.prompt.moveCaretToEndOfPrompt();
    },

    storeScrollPositions: function()
    {
        WebInspector.View.prototype.storeScrollPositions.call(this);
        this._scrolledToBottom = this.messagesElement.isScrolledToBottom();
    },

    restoreScrollPositions: function()
    {
        if (this._scrolledToBottom)
            this._immediatelyScrollIntoView();
        else
            WebInspector.View.prototype.restoreScrollPositions.call(this);
    },

    onResize: function()
    {
        this.prompt.hideSuggestBox();
        this.restoreScrollPositions();
    },

    _isScrollIntoViewScheduled: function()
    {
        return !!this._scrollIntoViewTimer;
    },

    _scheduleScrollIntoView: function()
    {
        if (this._scrollIntoViewTimer)
            return;

        /**
         * @this {WebInspector.ConsoleView}
         */
        function scrollIntoView()
        {
            delete this._scrollIntoViewTimer;
            this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        }
        this._scrollIntoViewTimer = setTimeout(scrollIntoView.bind(this), 20);
    },

    _immediatelyScrollIntoView: function()
    {
        this.promptElement.scrollIntoView(true);
        this._cancelScheduledScrollIntoView();
    },

    _cancelScheduledScrollIntoView: function()
    {
        if (!this._isScrollIntoViewScheduled())
            return;

        clearTimeout(this._scrollIntoViewTimer);
        delete this._scrollIntoViewTimer;
    },

    /**
     * @param {number=} count
     */
    _updateFilterStatus: function(count) {
        count = (typeof count === "undefined") ? (this._consoleMessages.length - this._visibleViewMessages.length) : count;
        this._filterStatusTextElement.textContent = WebInspector.UIString(count == 1 ? "%d message is hidden by filters." : "%d messages are hidden by filters.", count);
        this._filterStatusMessageElement.style.display = count ? "" : "none";
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     */
    _consoleMessageAdded: function(target, message)
    {
        if (this._urlToMessageCount[message.url])
            this._urlToMessageCount[message.url]++;
        else
            this._urlToMessageCount[message.url] = 1;

        var previousMessage = this._consoleMessages.peekLast();
        if (previousMessage && !message.isGroupMessage() && message.isEqual(previousMessage)) {
            previousMessage.timestamp = message.timestamp;
            this._messageToViewMessage.get(previousMessage).incrementRepeatCount();
            return;
        }

        this._consoleMessages.push(message);
        var viewMessage = this._createViewMessage(target, message);

        if (this._filter.shouldBeVisible(viewMessage))
            this._showConsoleMessage(viewMessage);
        else
            this._updateFilterStatus();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onConsoleMessageAdded: function(target, event)
    {
        var message = /** @type {!WebInspector.ConsoleMessage} */ (event.data);
        this._consoleMessageAdded(target, message);
    },

    /**
     * @param {!WebInspector.ConsoleViewMessage} viewMessage
     */
    _showConsoleMessage: function(viewMessage)
    {
        var message = viewMessage.consoleMessage();

        // this.messagesElement.isScrolledToBottom() is forcing style recalculation.
        // We just skip it if the scroll action has been scheduled.
        if (!this._isScrollIntoViewScheduled() && ((viewMessage instanceof WebInspector.ConsoleCommandResult) || this.messagesElement.isScrolledToBottom()))
            this._scheduleScrollIntoView();

        this._visibleViewMessages.push(viewMessage);

        if (message.type === WebInspector.ConsoleMessage.MessageType.EndGroup) {
            var parentGroup = this.currentGroup.parentGroup;
            if (parentGroup)
                this.currentGroup = parentGroup;
        } else {
            if (message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
                var group = new WebInspector.ConsoleGroup(this.currentGroup);
                this.currentGroup.messagesElement.appendChild(group.element);
                this.currentGroup = group;
                viewMessage.group = group;
            }
            this.currentGroup.addMessage(viewMessage);
        }

        if (this._searchRegex && viewMessage.matchesRegex(this._searchRegex)) {
            this._searchResults.push(viewMessage);
            this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        }
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     * @return {!WebInspector.ConsoleViewMessage}
     */
    _createViewMessage: function(target, message)
    {
        var viewMessage = this._messageToViewMessage.get(message);
        if (viewMessage)
            return viewMessage;
        if (message.type === WebInspector.ConsoleMessage.MessageType.Command)
            viewMessage = new WebInspector.ConsoleCommand(target, message);
        else
            viewMessage = new WebInspector.ConsoleViewMessage(target, message, this._linkifier);
        this._messageToViewMessage.put(message, viewMessage);
        return viewMessage;
    },

    _consoleCleared: function()
    {
        this._scrolledToBottom = true;
        this._clearCurrentSearchResultHighlight();
        this._updateFilterStatus(0);

        for (var i = 0; i < this._visibleViewMessages.length; ++i)
            this._visibleViewMessages[i].willHide();

        this._visibleViewMessages = [];
        this._searchResults = [];
        this._messageToViewMessage.clear();
        this._consoleMessages = [];

        if (this._searchRegex)
            this._searchableView.updateSearchMatchesCount(0);

        this.currentGroup = this.topGroup;
        this.topGroup.messagesElement.removeChildren();

        this._linkifier.reset();
    },

    _handleContextMenuEvent: function(event)
    {
        if (event.target.enclosingNodeOrSelfWithNodeName("a"))
            return;

        var contextMenu = new WebInspector.ContextMenu(event);

        function monitoringXHRItemAction()
        {
            WebInspector.settings.monitoringXHREnabled.set(!WebInspector.settings.monitoringXHREnabled.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString("Log XMLHttpRequests"), monitoringXHRItemAction, WebInspector.settings.monitoringXHREnabled.get());

        function preserveLogItemAction()
        {
            WebInspector.settings.preserveConsoleLog.set(!WebInspector.settings.preserveConsoleLog.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Preserve log upon navigation" : "Preserve Log upon Navigation"), preserveLogItemAction, WebInspector.settings.preserveConsoleLog.get());

        var sourceElement = event.target.enclosingNodeOrSelfWithClass("console-message");

        var filterSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Filter"));

        if (sourceElement && sourceElement.message.url) {
            var menuTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Hide messages from %s" : "Hide Messages from %s", new WebInspector.ParsedURL(sourceElement.message.url).displayName);
            filterSubMenu.appendItem(menuTitle, this._filter.addMessageURLFilter.bind(this._filter, sourceElement.message.url));
        }

        filterSubMenu.appendSeparator();
        var unhideAll = filterSubMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Unhide all" : "Unhide All"), this._filter.removeMessageURLFilter.bind(this._filter));
        filterSubMenu.appendSeparator();

        var hasFilters = false;

        for (var url in this._filter.messageURLFilters) {
            filterSubMenu.appendCheckboxItem(String.sprintf("%s (%d)", new WebInspector.ParsedURL(url).displayName, this._urlToMessageCount[url]), this._filter.removeMessageURLFilter.bind(this._filter, url), true);
            hasFilters = true;
        }

        filterSubMenu.setEnabled(hasFilters || (sourceElement && sourceElement.message.url));
        unhideAll.setEnabled(hasFilters);

        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear console" : "Clear Console"), this._requestClearMessages.bind(this));

        var request = (sourceElement && sourceElement.message) ? sourceElement.message.request : null;
        if (request && request.type === WebInspector.resourceTypes.XHR) {
            contextMenu.appendSeparator();
            contextMenu.appendItem(WebInspector.UIString("Replay XHR"), NetworkAgent.replayXHR.bind(null, request.requestId));
        }

        contextMenu.show();
    },

    _updateMessageList: function()
    {
        var group = this.topGroup;
        var visibleMessageIndex = 0;
        var newVisibleMessages = [];

        if (this._searchRegex)
            this._searchResults = [];

        var anchor = null;
        for (var i = 0; i < this._consoleMessages.length; ++i) {
            var sourceMessage = this._consoleMessages[i];
            var sourceViewMessage = this._messageToViewMessage.get(sourceMessage);
            var visibleViewMessage = this._visibleViewMessages[visibleMessageIndex];

            if (visibleViewMessage === sourceViewMessage) {
                if (this._filter.shouldBeVisible(sourceViewMessage)) {
                    newVisibleMessages.push(this._visibleViewMessages[visibleMessageIndex]);

                    if (this._searchRegex && sourceViewMessage.matchesRegex(this._searchRegex))
                        this._searchResults.push(sourceViewMessage);

                    if (sourceMessage.type === WebInspector.ConsoleMessage.MessageType.EndGroup) {
                        anchor = group.element;
                        group = group.parentGroup || group;
                    } else if (sourceMessage.type === WebInspector.ConsoleMessage.MessageType.StartGroup || sourceMessage.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
                        group = sourceViewMessage.group;
                        anchor = group.messagesElement.firstChild;
                    } else
                        anchor = sourceViewMessage.toMessageElement();
                } else {
                    sourceViewMessage.willHide();
                    sourceViewMessage.toMessageElement().remove();
                }
                ++visibleMessageIndex;
            } else {
                if (this._filter.shouldBeVisible(sourceViewMessage)) {

                    if (this._searchRegex && sourceViewMessage.matchesRegex(this._searchRegex))
                        this._searchResults.push(sourceViewMessage);

                    group.addMessage(sourceViewMessage, anchor ? anchor.nextSibling : group.messagesElement.firstChild);
                    newVisibleMessages.push(sourceViewMessage);
                    anchor = sourceViewMessage.toMessageElement();
                }
            }
        }

        if (this._searchRegex)
            this._searchableView.updateSearchMatchesCount(this._searchResults.length);

        this._visibleViewMessages = newVisibleMessages;
        this._updateFilterStatus();
    },

    _monitoringXHREnabledSettingChanged: function(event)
    {
        ConsoleAgent.setMonitoringXHREnabled(event.data);
    },

    _messagesClicked: function()
    {
        if (!this.prompt.isCaretInsidePrompt() && window.getSelection().isCollapsed)
            this.prompt.moveCaretToEndOfPrompt();
    },

    _registerShortcuts: function()
    {
        this._shortcuts = {};

        var shortcut = WebInspector.KeyboardShortcut;
        var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));

        var shortcutL = shortcut.makeDescriptor("l", WebInspector.KeyboardShortcut.Modifiers.Ctrl);
        this._shortcuts[shortcutL.key] = this._requestClearMessages.bind(this);
        var keys = [shortcutL];
        if (WebInspector.isMac()) {
            var shortcutK = shortcut.makeDescriptor("k", WebInspector.KeyboardShortcut.Modifiers.Meta);
            this._shortcuts[shortcutK.key] = this._requestClearMessages.bind(this);
            keys.unshift(shortcutK);
        }
        section.addAlternateKeys(keys, WebInspector.UIString("Clear console"));

        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tab), WebInspector.UIString("Autocomplete common prefix"));
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Right), WebInspector.UIString("Accept suggestion"));

        keys = [
            shortcut.makeDescriptor(shortcut.Keys.Down),
            shortcut.makeDescriptor(shortcut.Keys.Up)
        ];
        section.addRelatedKeys(keys, WebInspector.UIString("Next/previous line"));

        if (WebInspector.isMac()) {
            keys = [
                shortcut.makeDescriptor("N", shortcut.Modifiers.Alt),
                shortcut.makeDescriptor("P", shortcut.Modifiers.Alt)
            ];
            section.addRelatedKeys(keys, WebInspector.UIString("Next/previous command"));
        }

        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Enter), WebInspector.UIString("Execute command"));
    },

    _requestClearMessages: function()
    {
        WebInspector.console.requestClearMessages();
    },

    _promptKeyDown: function(event)
    {
        if (isEnterKey(event)) {
            this._enterKeyPressed(event);
            return;
        }

        var shortcut = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcut];
        if (handler) {
            handler();
            event.preventDefault();
        }
    },

    _enterKeyPressed: function(event)
    {
        if (event.altKey || event.ctrlKey || event.shiftKey)
            return;

        event.consume(true);

        this.prompt.clearAutoComplete(true);

        var str = this.prompt.text;
        if (!str.length)
            return;
        this._appendCommand(str, true);
    },

    /**
     * @param {?WebInspector.RemoteObject} result
     * @param {boolean} wasThrown
     * @param {?WebInspector.ConsoleCommand} originatingCommand
     */
    _printResult: function(result, wasThrown, originatingCommand)
    {
        if (!result)
            return;

        var target = result.target();
        /**
         * @param {string=} url
         * @param {number=} lineNumber
         * @param {number=} columnNumber
         * @this {WebInspector.ConsoleView}
         */
        function addMessage(url, lineNumber, columnNumber)
        {
            var resultMessage = new WebInspector.ConsoleCommandResult(/** @type {!WebInspector.RemoteObject} */ (result), wasThrown, originatingCommand, this._linkifier, url, lineNumber, columnNumber);
            this._messageToViewMessage.put(resultMessage.consoleMessage(), resultMessage);
            target.consoleModel.addMessage(resultMessage.consoleMessage());
        }

        if (result.type !== "function") {
            addMessage.call(this);
            return;
        }

        target.debuggerAgent().getFunctionDetails(result.objectId, didGetDetails.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.FunctionDetails} response
         * @this {WebInspector.ConsoleView}
         */
        function didGetDetails(error, response)
        {
            if (error) {
                console.error(error);
                addMessage.call(this);
                return;
            }

            var url;
            var lineNumber;
            var columnNumber;
            var script = WebInspector.debuggerModel.scriptForId(response.location.scriptId);
            if (script && script.sourceURL) {
                url = script.sourceURL;
                lineNumber = response.location.lineNumber + 1;
                columnNumber = response.location.columnNumber + 1;
            }
            addMessage.call(this, url, lineNumber, columnNumber);
        }
    },

    /**
     * @param {string} text
     * @param {boolean} useCommandLineAPI
     */
    _appendCommand: function(text, useCommandLineAPI)
    {
        this.prompt.text = "";
        this._currentTarget().consoleModel.evaluateCommand(text, useCommandLineAPI);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _commandEvaluated: function(event)
    {
        var data = /**{{result: ?WebInspector.RemoteObject, wasThrown: boolean, text: string, commandMessage: !WebInspector.ConsoleMessage}} */ (event.data);
        this.prompt.pushHistoryItem(data.text);
        WebInspector.settings.consoleHistory.set(this.prompt.historyData.slice(-30));
        this._printResult(data.result, data.wasThrown, /** @type {!WebInspector.ConsoleCommand} */ (this._messageToViewMessage.get(data.commandMessage)));
    },

    /**
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [this.messagesElement];
    },

    searchCanceled: function()
    {
        this._clearCurrentSearchResultHighlight();
        delete this._searchResults;
        delete this._searchRegex;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump)
    {
        this.searchCanceled();
        this._searchableView.updateSearchMatchesCount(0);
        this._searchRegex = createPlainTextSearchRegex(query, "gi");

        this._searchResults = [];
        for (var i = 0; i < this._visibleViewMessages.length; i++) {
            if (this._visibleViewMessages[i].matchesRegex(this._searchRegex))
                this._searchResults.push(this._visibleViewMessages[i]);
        }
        this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        this._currentSearchResultIndex = -1;
        if (shouldJump && this._searchResults.length)
            this._jumpToSearchResult(0);
    },

    jumpToNextSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        this._jumpToSearchResult((this._currentSearchResultIndex + 1) % this._searchResults.length);
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._currentSearchResultIndex - 1;
        if (index === -1)
            index = this._searchResults.length - 1;
        this._jumpToSearchResult(index);
    },

    _clearCurrentSearchResultHighlight: function()
    {
        if (!this._searchResults)
            return;

        var highlightedViewMessage = this._searchResults[this._currentSearchResultIndex];
        if (highlightedViewMessage)
            highlightedViewMessage.clearHighlight();
        this._currentSearchResultIndex = -1;
    },

    _jumpToSearchResult: function(index)
    {
        this._clearCurrentSearchResultHighlight();
        this._currentSearchResultIndex = index;
        this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
        this._searchResults[index].highlightSearchResults(this._searchRegex);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.ConsoleView} view
 */
WebInspector.ConsoleViewFilter = function(view)
{
    this._view = view;
    this._messageURLFilters = WebInspector.settings.messageURLFilters.get();
    this._filterChanged = this.dispatchEventToListeners.bind(this, WebInspector.ConsoleViewFilter.Events.FilterChanged);
};

WebInspector.ConsoleViewFilter.Events = {
    FilterChanged: "FilterChanged"
};

WebInspector.ConsoleViewFilter.prototype = {
    addFilters: function(filterBar)
    {
        this._textFilterUI = new WebInspector.TextFilterUI(true);
        this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._textFilterChanged, this);
        filterBar.addFilter(this._textFilterUI);

        this._levelFilterUI = new WebInspector.NamedBitSetFilterUI();
        this._levelFilterUI.addBit("error", WebInspector.UIString("Errors"));
        this._levelFilterUI.addBit("warning", WebInspector.UIString("Warnings"));
        this._levelFilterUI.addBit("info", WebInspector.UIString("Info"));
        this._levelFilterUI.addBit("log", WebInspector.UIString("Logs"));
        this._levelFilterUI.addBit("debug", WebInspector.UIString("Debug"));
        this._levelFilterUI.bindSetting(WebInspector.settings.messageLevelFilters);
        this._levelFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged, this);
        filterBar.addFilter(this._levelFilterUI);
    },

    _textFilterChanged: function(event)
    {
        this._filterRegex = this._textFilterUI.regex();

        this._filterChanged();
    },

    /**
     * @param {string} url
     */
    addMessageURLFilter: function(url)
    {
        this._messageURLFilters[url] = true;
        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        this._filterChanged();
    },

    /**
     * @param {string} url
     */
    removeMessageURLFilter: function(url)
    {
        if (!url)
            this._messageURLFilters = {};
        else
            delete this._messageURLFilters[url];

        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        this._filterChanged();
    },

    /**
     * @returns {!Object}
     */
    get messageURLFilters()
    {
        return this._messageURLFilters;
    },

    /**
     * @param {!WebInspector.ConsoleViewMessage|undefined} viewMessage
     * @return {boolean}
     */
    shouldBeVisible: function(viewMessage)
    {
        if (!viewMessage)
            return false;
        var message = viewMessage.consoleMessage();
        if ((message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed || message.type === WebInspector.ConsoleMessage.MessageType.EndGroup))
            return true;

        if (message.type === WebInspector.ConsoleMessage.MessageType.Result || message.type === WebInspector.ConsoleMessage.MessageType.Command)
            return true;

        if (message.url && this._messageURLFilters[message.url])
            return false;

        if (message.level && !this._levelFilterUI.accept(message.level))
            return false;

        if (this._filterRegex) {
            this._filterRegex.lastIndex = 0;
            if (!viewMessage.matchesRegex(this._filterRegex))
                return false;
        }

        return true;
    },

    reset: function()
    {
        this._messageURLFilters = {};
        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        WebInspector.settings.messageLevelFilters.set({});
        this._filterChanged();
    },

    __proto__: WebInspector.Object.prototype
};


/**
 * @constructor
 * @extends {WebInspector.ConsoleViewMessage}
 * @param {!WebInspector.ConsoleMessage} message
 */
WebInspector.ConsoleCommand = function(target, message)
{
    WebInspector.ConsoleViewMessage.call(this, target, message, null);
}

WebInspector.ConsoleCommand.prototype = {
    wasShown: function()
    {
    },

    willHide: function()
    {
    },

    clearHighlight: function()
    {
        var highlightedMessage = this._formattedCommand;
        delete this._formattedCommand;
        this._formatCommand();
        this._element.replaceChild(this._formattedCommand, highlightedMessage);
    },

    /**
     * @param {!RegExp} regexObject
     */
    highlightSearchResults: function(regexObject)
    {
        regexObject.lastIndex = 0;
        var match = regexObject.exec(this.text);
        var matchRanges = [];
        while (match) {
            matchRanges.push(new WebInspector.SourceRange(match.index, match[0].length));
            match = regexObject.exec(this.text);
        }
        WebInspector.highlightSearchResults(this._formattedCommand, matchRanges);
        this._element.scrollIntoViewIfNeeded();
    },

    /**
     * @param {!RegExp} regexObject
     * @return {boolean}
     */
    matchesRegex: function(regexObject)
    {
        regexObject.lastIndex = 0;
        return regexObject.test(this.text);
    },

    /**
     * @return {!Element}
     */
    toMessageElement: function()
    {
        if (!this._element) {
            this._element = document.createElement("div");
            this._element.command = this;
            this._element.className = "console-user-command";

            this._formatCommand();
            this._element.appendChild(this._formattedCommand);
        }
        return this._element;
    },

    _formatCommand: function()
    {
        this._formattedCommand = document.createElement("span");
        this._formattedCommand.className = "console-message-text source-code";
        this._formattedCommand.textContent = this.text;
    },

    __proto__: WebInspector.ConsoleViewMessage.prototype
}

/**
 * @extends {WebInspector.ConsoleViewMessage}
 * @constructor
 * @param {!WebInspector.RemoteObject} result
 * @param {boolean} wasThrown
 * @param {?WebInspector.ConsoleCommand} originatingCommand
 * @param {!WebInspector.Linkifier} linkifier
 * @param {string=} url
 * @param {number=} lineNumber
 * @param {number=} columnNumber
 */
WebInspector.ConsoleCommandResult = function(result, wasThrown, originatingCommand, linkifier, url, lineNumber, columnNumber)
{
    this.originatingCommand = originatingCommand;
    var level = wasThrown ? WebInspector.ConsoleMessage.MessageLevel.Error : WebInspector.ConsoleMessage.MessageLevel.Log;

    var message = new WebInspector.ConsoleMessage(WebInspector.ConsoleMessage.MessageSource.JS, level, "", WebInspector.ConsoleMessage.MessageType.Result, url, lineNumber, columnNumber, undefined, [result]);
    WebInspector.ConsoleViewMessage.call(this, result.target(), message, linkifier);
}

WebInspector.ConsoleCommandResult.prototype = {
    /**
     * @override
     * @param {!WebInspector.RemoteObject} array
     * @return {boolean}
     */
    useArrayPreviewInFormatter: function(array)
    {
        return false;
    },

    /**
     * @return {!Element}
     */
    toMessageElement: function()
    {
        var element = WebInspector.ConsoleViewMessage.prototype.toMessageElement.call(this);
        element.classList.add("console-user-command-result");
        return element;
    },

    __proto__: WebInspector.ConsoleViewMessage.prototype
}

/**
 * @constructor
 */
WebInspector.ConsoleGroup = function(parentGroup)
{
    this.parentGroup = parentGroup;

    var element = document.createElement("div");
    element.className = "console-group";
    element.group = this;
    this.element = element;

    if (parentGroup) {
        var bracketElement = document.createElement("div");
        bracketElement.className = "console-group-bracket";
        element.appendChild(bracketElement);
    }

    var messagesElement = document.createElement("div");
    messagesElement.className = "console-group-messages";
    element.appendChild(messagesElement);
    this.messagesElement = messagesElement;
}

WebInspector.ConsoleGroup.prototype = {
    /**
     * @param {!WebInspector.ConsoleViewMessage} viewMessage
     * @param {!Node=} node
     */
    addMessage: function(viewMessage, node)
    {
        var message = viewMessage.consoleMessage();
        var element = viewMessage.toMessageElement();

        if (message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
            this.messagesElement.parentNode.insertBefore(element, this.messagesElement);
            element.addEventListener("click", this._titleClicked.bind(this), false);
            var groupElement = element.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement && message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
                groupElement.classList.add("collapsed");
        } else {
            this.messagesElement.insertBefore(element, node || null);
            viewMessage.wasShown();
        }

        if (element.previousSibling && viewMessage.originatingCommand && element.previousSibling.command === viewMessage.originatingCommand)
            element.previousSibling.classList.add("console-adjacent-user-command-result");
    },

    _titleClicked: function(event)
    {
        var groupTitleElement = event.target.enclosingNodeOrSelfWithClass("console-group-title");
        if (groupTitleElement) {
            var groupElement = groupTitleElement.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement && !groupElement.classList.toggle("collapsed")) {
                if (groupElement.group) {
                    groupElement.group.wasShown();
                }
            }
            groupTitleElement.scrollIntoViewIfNeeded(true);
        }
        event.consume(true);
    },

    wasShown: function()
    {
        if (this.element.classList.contains("collapsed"))
            return;
        var node = this.messagesElement.firstChild;
        while (node) {
            if (node.classList.contains("console-message") && node.message)
                node.message.wasShown();
            if (node.classList.contains("console-group") && node.group)
                node.group.wasShown();
            node = node.nextSibling;
        }
    }
}
