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
 * @extends {WebInspector.View}
 * @implements {WebInspector.Searchable}
 * @constructor
 * @param {boolean} hideContextSelector
 */
WebInspector.ConsoleView = function(hideContextSelector)
{
    WebInspector.View.call(this);

    this.element.id = "console-view";
    this._urlToMessageCount = {};

    this._requestClearMessages = WebInspector.console.requestClearMessages.bind(WebInspector.console);

    this._clearConsoleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear console log."), "clear-status-bar-item");
    this._clearConsoleButton.addEventListener("click", this._requestClearMessages, this);

    this._frameSelector = new WebInspector.StatusBarComboBox(this._frameChanged.bind(this), "console-context");
    this._contextSelector = new WebInspector.StatusBarComboBox(this._contextChanged.bind(this), "console-context");

    if (hideContextSelector) {
        this._frameSelector.element.addStyleClass("hidden");
        this._contextSelector.element.addStyleClass("hidden");
    }

    this.messagesElement = document.createElement("div");
    this.messagesElement.id = "console-messages";
    this.messagesElement.className = "monospace";
    this.messagesElement.addEventListener("click", this._messagesClicked.bind(this), true);
    this.element.appendChild(this.messagesElement);
    this._scrolledToBottom = true;

    this.promptElement = document.createElement("div");
    this.promptElement.id = "console-prompt";
    this.promptElement.className = "source-code";
    this.promptElement.spellcheck = false;
    this.messagesElement.appendChild(this.promptElement);
    this.messagesElement.appendChild(document.createElement("br"));

    this.topGroup = new WebInspector.ConsoleGroup(null);
    this.messagesElement.insertBefore(this.topGroup.element, this.promptElement);

    this._registerShortcuts();
    this.registerRequiredCSS("textPrompt.css");

    this.messagesElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);

    WebInspector.settings.monitoringXHREnabled.addChangeListener(this._monitoringXHREnabledSettingChanged.bind(this));

    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._consoleMessageAdded, this);
    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageHidden, this._consoleMessageHidden, this);
    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageShown, this._consoleMessageShown, this);
    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);

    this._linkifier = new WebInspector.Linkifier();

    this.prompt = new WebInspector.TextPromptWithHistory(WebInspector.runtimeModel.completionsForTextPrompt.bind(WebInspector.runtimeModel));
    this.prompt.setSuggestBoxEnabled("generic-suggest");
    this.prompt.renderAsBlock();
    this.prompt.attach(this.promptElement);
    this.prompt.proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this), false);
    this.prompt.setHistoryData(WebInspector.settings.consoleHistory.get());

    WebInspector.runtimeModel.contextLists().forEach(this._addFrame, this);
    WebInspector.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.FrameExecutionContextListAdded, this._frameAdded, this);
    WebInspector.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.FrameExecutionContextListRemoved, this._frameRemoved, this);

    this._filterStatusMessageElement = document.createElement("div");
    this._filterStatusMessageElement.classList.add("console-message");
    this._filterStatusTextElement = this._filterStatusMessageElement.createChild("span", "console-info");
    this._filterStatusMessageElement.createTextChild(" ");
    var resetFiltersLink = this._filterStatusMessageElement.createChild("span", "console-info node-link");
    resetFiltersLink.textContent = WebInspector.UIString("Show all messages.");
    resetFiltersLink.addEventListener("click", WebInspector.console.filter.reset.bind(WebInspector.console.filter), true);

    this.messagesElement.insertBefore(this._filterStatusMessageElement, this.topGroup.element);

    this._sourceFilterElement = WebInspector.console.filter.createSourceFilterElement();
    this._levelFilterElement = WebInspector.console.filter.createLevelFilterElement();

    this._updateFilterStatus();
}

WebInspector.ConsoleView.prototype = {
    get statusBarItems()
    {
        return [this._clearConsoleButton.element, this._frameSelector.element, this._contextSelector.element, this._sourceFilterElement, this._levelFilterElement];
    },

    /**
     * @param {WebInspector.Event} event
     */
    _frameAdded: function(event)
    {
        var contextList = /** @type {WebInspector.FrameExecutionContextList} */ (event.data);
        this._addFrame(contextList);
    },

    /**
     * @param {WebInspector.FrameExecutionContextList} contextList
     */
    _addFrame: function(contextList)
    {
        var option = this._frameSelector.createOption(contextList.displayName, contextList.url);
        option._contextList = contextList;
        contextList._consoleOption = option;
        contextList.addEventListener(WebInspector.FrameExecutionContextList.EventTypes.ContextsUpdated, this._frameUpdated, this);
        contextList.addEventListener(WebInspector.FrameExecutionContextList.EventTypes.ContextAdded, this._contextAdded, this);
        this._frameChanged();
    },

    /**
     * @param {WebInspector.Event} event
     */
    _frameRemoved: function(event)
    {
        var contextList = /** @type {WebInspector.FrameExecutionContextList} */ (event.data);
        this._frameSelector.removeOption(contextList._consoleOption);
        this._frameChanged();
    },

    _frameChanged: function()
    {
        var context = this._currentFrame();
        if (!context) {
            WebInspector.runtimeModel.setCurrentExecutionContext(null);
            this._contextSelector.element.addStyleClass("hidden");
            return;
        }

        var executionContexts = context.executionContexts();
        if (executionContexts.length)
            WebInspector.runtimeModel.setCurrentExecutionContext(executionContexts[0]);

        if (executionContexts.length === 1) {
            this._contextSelector.element.addStyleClass("hidden");
            return;
        }
        this._contextSelector.element.removeStyleClass("hidden");
        this._contextSelector.removeOptions();
        for (var i = 0; i < executionContexts.length; ++i)
            this._appendContextOption(executionContexts[i]);
    },

    /**
     * @param {WebInspector.ExecutionContext} executionContext
     */
    _appendContextOption: function(executionContext)
    {
        if (!WebInspector.runtimeModel.currentExecutionContext())
            WebInspector.runtimeModel.setCurrentExecutionContext(executionContext);
        var option = this._contextSelector.createOption(executionContext.name, executionContext.id);
        option._executionContext = executionContext;
    },

    /**
     * @param {Event} event
     */
    _contextChanged: function(event)
    {
        var option = this._contextSelector.selectedOption();
        WebInspector.runtimeModel.setCurrentExecutionContext(option ? option._executionContext : null);
    },

    /**
     * @param {WebInspector.Event} event
     */
    _frameUpdated: function(event)
    {
        var contextList = /** @type {WebInspector.FrameExecutionContextList} */ (event.data);
        var option = contextList._consoleOption;
        option.text = contextList.displayName;
        option.title = contextList.url;
    },

    /**
     * @param {WebInspector.Event} event
     */
    _contextAdded: function(event)
    {
        var contextList = /** @type {WebInspector.FrameExecutionContextList} */ (event.data);
        if (contextList === this._currentFrame())
            this._frameChanged();
    },

    /**
     * @return {WebInspector.FrameExecutionContextList|undefined}
     */
    _currentFrame: function()
    {
        var option = this._frameSelector.selectedOption();
        return option ? option._contextList : undefined;
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

    afterShow: function()
    {
        WebInspector.setCurrentFocusElement(this.promptElement);
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

        function scrollIntoView()
        {
            delete this._scrollIntoViewTimer;
            this.promptElement.scrollIntoView(true);
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
        count = (typeof count === "undefined") ? WebInspector.console.filteredMessages : count;
        this._filterStatusTextElement.textContent = WebInspector.UIString(count == 1 ? "%d message is hidden by filters." : "%d messages are hidden by filters.", count);
        this._filterStatusMessageElement.style.display = count ? "" : "none";
    },

    /**
     * @param {WebInspector.Event} event
     */
    _consoleMessageAdded: function(event)
    {
        var message = /** @type {WebInspector.ConsoleMessage} */ (event.data);
        this._urlToMessageCount[message.url] = (this._urlToMessageCount[message.url] || 0) + 1;
        this._updateFilterStatus();
    },

    /**
     * @param {WebInspector.Event} event
     */
    _consoleMessageShown: function(event)
    {
        var message = /** @type {WebInspector.ConsoleMessage} */ (event.data);
        var index = message.index;

        this._showConsoleMessage(index);
        this._updateFilterStatus();
    },

    /**
     * @param {WebInspector.Event} event
     */
    _consoleMessageHidden: function(event)
    {
        var message = /** @type {WebInspector.ConsoleMessage} */ (event.data);
        var element = message.toMessageElement();
        element.remove();
        this._updateFilterStatus();
    },

    /**
     * @param {number} index
     * @private
     */
    _showConsoleMessage: function(index)
    {
        var message = WebInspector.console.messages[index];
        var previousVisible = WebInspector.console.messages[message.previousVisibleIndex];
        var previousVisibleGroup = previousVisible ? previousVisible.group : this.topGroup;

        if (previousVisible && previousVisible.type === WebInspector.ConsoleMessage.MessageType.EndGroup)
            previousVisibleGroup = previousVisible.group.parentGroup;

        // this.messagesElement.isScrolledToBottom() is forcing style recalculation.
        // We just skip it if the scroll action has been scheduled.
        if (!this._isScrollIntoViewScheduled() && ((message instanceof WebInspector.ConsoleCommandResult) || this.messagesElement.isScrolledToBottom()))
            this._scheduleScrollIntoView();

        if (message.type === WebInspector.ConsoleMessage.MessageType.EndGroup) {
            message.group = previousVisibleGroup;
        } else if (message.isGroupStart()) {
            var group = new WebInspector.ConsoleGroup(previousVisibleGroup);
            previousVisibleGroup.messagesElement.insertBefore(group.element, previousVisible ? previousVisible.nextSibling : null);
            message.group = group;
            group.addMessage(message);
        } else {
            message.group = previousVisibleGroup || this.topGroup;
            previousVisibleGroup.addMessage(message, previousVisible);
        }

        if (this._searchRegex && message.matchesRegex(this._searchRegex)) {
            this._searchResultsIndices.push(index);
            WebInspector.searchController.updateSearchMatchesCount(this._searchResultsIndices.length, this._searchProvider);
        }
    },

    _consoleCleared: function()
    {
        this._scrolledToBottom = true;

        for (var i = 0; i < WebInspector.console.messages.length; ++i)
            if (WebInspector.console.filter.shouldBeVisible(WebInspector.console.messages[i]))
                WebInspector.console.messages[i].willHide();

        this._searchResultsIndices = [];

        if (this._searchRegex)
            WebInspector.searchController.updateSearchMatchesCount(0, this._searchProvider);

        this.topGroup.messagesElement.removeChildren();

        this._clearCurrentSearchResultHighlight();
        this._updateFilterStatus(0);

        this._linkifier.reset();
    },

    _handleContextMenuEvent: function(event)
    {
        if (!window.getSelection().isCollapsed) {
            // If there is a selection, we want to show our normal context menu
            // (with Copy, etc.), and not Clear Console.
            return;
        }

        if (event.target.enclosingNodeOrSelfWithNodeName("a"))
            return;

        var contextMenu = new WebInspector.ContextMenu(event);

        function monitoringXHRItemAction()
        {
            WebInspector.settings.monitoringXHREnabled.set(!WebInspector.settings.monitoringXHREnabled.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString("Log XMLHttpRequests"), monitoringXHRItemAction.bind(this), WebInspector.settings.monitoringXHREnabled.get());

        function preserveLogItemAction()
        {
            WebInspector.settings.preserveConsoleLog.set(!WebInspector.settings.preserveConsoleLog.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Preserve log upon navigation" : "Preserve Log upon Navigation"), preserveLogItemAction.bind(this), WebInspector.settings.preserveConsoleLog.get());

        var sourceElement = event.target.enclosingNodeOrSelfWithClass("console-message");

        var filterSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Filter"));

        if (sourceElement && sourceElement.message.url) {
            var menuTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Hide messages from %s" : "Hide Messages from %s", new WebInspector.ParsedURL(sourceElement.message.url).displayName);
            filterSubMenu.appendItem(menuTitle, WebInspector.console.filter.addMessageURLFilter.bind(WebInspector.console.filter, sourceElement.message.url));
        }

        filterSubMenu.appendSeparator();
        var unhideAll = filterSubMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Unhide all" : "Unhide All"), WebInspector.console.filter.resetMessageURLFilters.bind(WebInspector.console.filter));
        filterSubMenu.appendSeparator();

        var hasFilters = false;

        for (var url in WebInspector.console.filter.messageURLFilters()) {
            filterSubMenu.appendCheckboxItem(String.sprintf("%s (%d)", new WebInspector.ParsedURL(url).displayName, this._urlToMessageCount[url]), WebInspector.console.filter.removeMessageURLFilter.bind(WebInspector.console.filter, url), true);
            hasFilters = true;
        }

        filterSubMenu.setEnabled(hasFilters || (sourceElement && sourceElement.message.url));
        unhideAll.setEnabled(hasFilters);

        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear console" : "Clear Console"), this._requestClearMessages);

        var request = (sourceElement && sourceElement.message) ? sourceElement.message.request() : null;
        if (request && request.type === WebInspector.resourceTypes.XHR) {
            contextMenu.appendSeparator();
            contextMenu.appendItem(WebInspector.UIString("Replay XHR"), NetworkAgent.replayXHR.bind(null, request.requestId));
        }

        contextMenu.show();
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
        this._shortcuts[shortcutL.key] = this._requestClearMessages;
        var keys = [shortcutL];
        if (WebInspector.isMac()) {
            var shortcutK = shortcut.makeDescriptor("k", WebInspector.KeyboardShortcut.Modifiers.Meta);
            this._shortcuts[shortcutK.key] = this._requestClearMessages;
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

    evaluateUsingTextPrompt: function(expression, showResultOnly)
    {
        this._appendCommand(expression, this.prompt.text, false, showResultOnly);
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
        this._appendCommand(str, "", true, false);
    },

    _printResult: function(result, wasThrown, originatingCommand)
    {
        if (!result)
            return;
        var message = new WebInspector.ConsoleCommandResult(result, wasThrown, originatingCommand, this._linkifier);
        WebInspector.console.addMessage(message);
    },

    _appendCommand: function(text, newPromptText, useCommandLineAPI, showResultOnly)
    {
        if (!showResultOnly) {
            var commandMessage = new WebInspector.ConsoleCommand(text);
            WebInspector.console.addMessage(commandMessage);
        }
        this.prompt.text = newPromptText;

        function printResult(result, wasThrown)
        {
            if (!result)
                return;

            if (!showResultOnly) {
                this.prompt.pushHistoryItem(text);
                WebInspector.settings.consoleHistory.set(this.prompt.historyData.slice(-30));
            }
            
            this._printResult(result, wasThrown, commandMessage);
        }
        WebInspector.runtimeModel.evaluate(text, "console", useCommandLineAPI, false, false, true, printResult.bind(this));

        WebInspector.userMetrics.ConsoleEvaluated.record();
    },

    elementsToRestoreScrollPositionsFor: function()
    {
        return [this.messagesElement];
    },

    searchCanceled: function()
    {
        this._clearCurrentSearchResultHighlight();
        delete this._searchProvider;
        delete this._searchResultsIndices;
        delete this._searchRegex;
    },

    canSearchAndReplace: function()
    {
        return false;
    },

    canFilter: function()
    {
        return true;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     * @param {WebInspector.Searchable=} self
     */
    performSearch: function(query, shouldJump, self)
    {
        this.searchCanceled();
        this._searchProvider = self || this;
        WebInspector.searchController.updateSearchMatchesCount(0, this._searchProvider);
        this._searchRegex = createPlainTextSearchRegex(query, "gi");

        this._searchResultsIndices = [];
        for (var i = 0; i < WebInspector.console.messages.length; i++) {
            if (WebInspector.console.filter.shouldBeVisible(WebInspector.console.messages[i]) && WebInspector.console.messages[i].matchesRegex(this._searchRegex))
                this._searchResultsIndices.push(i);
        }
        WebInspector.searchController.updateSearchMatchesCount(this._searchResultsIndices.length, this._searchProvider);
        this._currentSearchResultIndex = -1;
        if (shouldJump && this._searchResultsIndices.length)
            this._jumpToSearchResult(0, self);
    },

    /**
     * @return {number}
     */
    minimalSearchQuerySize: function()
    {
        return 0;
    },

    /**
     * @param {string} query
     */
    performFilter: function(query)
    {
        WebInspector.console.filter.setRegexFilter(query);
    },

    /**
     * @param {WebInspector.Searchable=} self
     */
    jumpToNextSearchResult: function(self)
    {
        if (!this._searchResultsIndices || !this._searchResultsIndices.length)
            return;
        this._jumpToSearchResult((this._currentSearchResultIndex + 1) % this._searchResultsIndices.length, self);
    },

    /**
     * @param {WebInspector.Searchable=} self
     */
    jumpToPreviousSearchResult: function(self)
    {
        if (!this._searchResultsIndices || !this._searchResultsIndices.length)
            return;
        var index = this._currentSearchResultIndex - 1;
        if (index === -1)
            index = this._searchResultsIndices.length - 1;
        this._jumpToSearchResult(index, self);
    },

    _clearCurrentSearchResultHighlight: function()
    {
        if (!this._searchResultsIndices)
            return;
        var highlightedMessage = WebInspector.console.messages[this._searchResultsIndices[this._currentSearchResultIndex]];
        if (highlightedMessage)
            highlightedMessage.clearHighlight();
        this._currentSearchResultIndex = -1;
    },

    _jumpToSearchResult: function(index, self)
    {
        this._clearCurrentSearchResultHighlight();
        this._currentSearchResultIndex = index;
        WebInspector.searchController.updateCurrentMatchIndex(this._currentSearchResultIndex, this._searchProvider);
        WebInspector.console.messages[this._searchResultsIndices[index]].highlightSearchResults(this._searchRegex);
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @extends WebInspector.ConsoleMessage
 */
WebInspector.ConsoleCommand = function(text)
{
    this.text = text;
}

WebInspector.ConsoleCommand.prototype = {
    wasShown: function()
    {
    },

    willHide: function()
    {
    },

    isGroupStart: function()
    {
        return false;
    },

    clearHighlight: function()
    {
        var highlightedMessage = this._formattedCommand;
        delete this._formattedCommand;
        this._formatCommand();
        this._element.replaceChild(this._formattedCommand, highlightedMessage);
    },

    highlightSearchResults: function(regexObject)
    {
        regexObject.lastIndex = 0;
        var match = regexObject.exec(this.text);
        var matchRanges = [];
        while (match) {
            matchRanges.push({ offset: match.index, length: match[0].length });
            match = regexObject.exec(this.text);
        }
        WebInspector.highlightSearchResults(this._formattedCommand, matchRanges);
        this._element.scrollIntoViewIfNeeded();
    },

    matchesRegex: function(regexObject)
    {
        regexObject.lastIndex = 0;
        return regexObject.test(this.text);
    },

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

    __proto__: WebInspector.ConsoleMessage.prototype
}

/**
 * @extends {WebInspector.ConsoleMessageImpl}
 * @constructor
 * @param {boolean} result
 * @param {boolean} wasThrown
 * @param {WebInspector.ConsoleCommand} originatingCommand
 * @param {WebInspector.Linkifier} linkifier
 */
WebInspector.ConsoleCommandResult = function(result, wasThrown, originatingCommand, linkifier)
{
    var level = (wasThrown ? WebInspector.ConsoleMessage.MessageLevel.Error : WebInspector.ConsoleMessage.MessageLevel.Log);
    this.originatingCommand = originatingCommand;
    WebInspector.ConsoleMessageImpl.call(this, WebInspector.ConsoleMessage.MessageSource.JS, level, "", linkifier, WebInspector.ConsoleMessage.MessageType.Result, undefined, undefined, undefined, undefined, [result]);
}

WebInspector.ConsoleCommandResult.prototype = {
    /**
     * @override
     * @param {WebInspector.RemoteObject} array
     * @return {boolean}
     */
    useArrayPreviewInFormatter: function(array)
    {
        return false;
    },

    isGroupStart: function()
    {
        return false;
    },

    toMessageElement: function()
    {
        var element = WebInspector.ConsoleMessageImpl.prototype.toMessageElement.call(this);
        element.addStyleClass("console-user-command-result");
        return element;
    },

    __proto__: WebInspector.ConsoleMessageImpl.prototype
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
     * @param {WebInspector.ConsoleMessage} message
     * @param {WebInspector.ConsoleMessage=} previousVisibleMessage
     */
    addMessage: function(message, previousVisibleMessage)
    {
        var element = message.toMessageElement();

        if (message.isGroupStart()) {
            this.messagesElement.parentNode.insertBefore(element, this.messagesElement);
            element.addEventListener("click", this._titleClicked.bind(this), false);
            var groupElement = element.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement && message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
                groupElement.addStyleClass("collapsed");
        } else {
            this.messagesElement.insertBefore(element, !previousVisibleMessage || previousVisibleMessage.isGroupStart() ? this.messagesElement.firstChild : previousVisibleMessage.toMessageElement().nextSibling);
            message.wasShown();
        }

        if (element.previousSibling && message.originatingCommand && element.previousSibling.command === message.originatingCommand)
            element.previousSibling.addStyleClass("console-adjacent-user-command-result");
    },

    _titleClicked: function(event)
    {
        var groupTitleElement = event.target.enclosingNodeOrSelfWithClass("console-group-title");
        if (groupTitleElement) {
            var groupElement = groupTitleElement.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement)
                if (groupElement.hasStyleClass("collapsed"))
                    groupElement.removeStyleClass("collapsed");
                else
                    groupElement.addStyleClass("collapsed");
            groupTitleElement.scrollIntoViewIfNeeded(true);
        }

        event.consume(true);
    }
}

/**
 * @type {?WebInspector.ConsoleView}
 */
WebInspector.consoleView = null;

WebInspector.ConsoleMessage.create = function(source, level, message, type, url, line, column, repeatCount, parameters, stackTrace, requestId, isOutdated)
{
    return new WebInspector.ConsoleMessageImpl(source, level, message, WebInspector.consoleView._linkifier, type, url, line, column, repeatCount, parameters, stackTrace, requestId, isOutdated);
}
