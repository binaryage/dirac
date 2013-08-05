/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.ConsoleModel = function()
{
    this.messages = [];
    this.warnings = 0;
    this.errors = 0;
    this.filteredMessages = 0;
    this._interruptRepeatCount = false;
    this.filter = new WebInspector.ConsoleModelFilter();
    this.filter.addEventListener(WebInspector.ConsoleModelFilter.Events.FilterChanged, this._filterChanged.bind(this));

    InspectorBackend.registerConsoleDispatcher(new WebInspector.ConsoleDispatcher(this));
}

WebInspector.ConsoleModel.Events = {
    ConsoleCleared: "console-cleared",
    MessageAdded: "console-message-added",
    MessageShown: "console-message-shown",
    MessageHidden: "console-message-hidden",
    RepeatCountUpdated: "repeat-count-updated"
}

WebInspector.ConsoleModel.prototype = {
    enableAgent: function()
    {
        if (WebInspector.settings.monitoringXHREnabled.get())
            ConsoleAgent.setMonitoringXHREnabled(true);

        this._enablingConsole = true;
        function callback()
        {
            delete this._enablingConsole;
        }
        ConsoleAgent.enable(callback.bind(this));
    },

    /**
     * @return {boolean}
     */
    enablingConsole: function()
    {
        return !!this._enablingConsole;
    },

    /**
     * @param {WebInspector.ConsoleMessage} msg
     * @param {boolean=} isFromBackend
     */
    addMessage: function(msg, isFromBackend)
    {
        msg.index = this.messages.length;
        msg.visible = this.filter.shouldBeVisible(msg);
        msg.previousVisibleIndex = this._lastVisibleMessageIndex();

        this.messages.push(msg);
        this._incrementErrorWarningCount(msg);

        if (isFromBackend)
            this._previousMessage = msg;

        this._interruptRepeatCount = !isFromBackend;

        ++this.filteredMessages;

        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.MessageAdded, msg);

        if (msg.visible) {
            --this.filteredMessages;
            this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.MessageShown, msg);
        }
    },

    /**
     * @return {number}
     */
    _lastVisibleMessageIndex: function()
    {
        if (!this.messages.length)
            return -1;

        var lastMessage = this.messages.peekLast();

        return lastMessage.visible ? lastMessage.index : lastMessage.previousVisibleIndex;
    },

    /**
     * @param {WebInspector.ConsoleMessage} msg
     */
    _incrementErrorWarningCount: function(msg)
    {
        switch (msg.level) {
            case WebInspector.ConsoleMessage.MessageLevel.Warning:
                this.warnings += msg.repeatDelta;
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Error:
                this.errors += msg.repeatDelta;
                break;
        }
    },

    requestClearMessages: function()
    {
        ConsoleAgent.clearMessages();
    },

    _messagesCleared: function()
    {
        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.ConsoleCleared);

        this.filteredMessages = 0;
        this.messages = [];
        delete this._previousMessage;

        this.errors = 0;
        this.warnings = 0;
    },

    /**
     * @param {number} count
     */
    _messageRepeatCountUpdated: function(count)
    {
        var msg = this._previousMessage;
        if (!msg)
            return;

        var prevRepeatCount = msg.totalRepeatCount;

        if (!this._interruptRepeatCount) {
            msg.repeatDelta = count - prevRepeatCount;
            msg.repeatCount = msg.repeatCount + msg.repeatDelta;
            msg.totalRepeatCount = count;
            msg.updateRepeatCount();

            this._incrementErrorWarningCount(msg);
            this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.RepeatCountUpdated, msg);
        } else {
            var msgCopy = msg.clone();
            msgCopy.totalRepeatCount = count;
            msgCopy.repeatCount = (count - prevRepeatCount) || 1;
            msgCopy.repeatDelta = msgCopy.repeatCount;
            this.addMessage(msgCopy, true);
        }
    },

    _filterChanged: function()
    {
        var lastVisible = -1;
        for (var i = 0; i < this.messages.length; ++i) {
            var message = this.messages[i];
            message.previousVisibleIndex = lastVisible;

            var shouldBeVisible = this.filter.shouldBeVisible(message);
            if (shouldBeVisible)
                lastVisible = i;

            if (shouldBeVisible === message.visible)
                continue;

            this.filteredMessages += shouldBeVisible ? -1 : 1;
            message.visible = shouldBeVisible;
            this.dispatchEventToListeners(shouldBeVisible ? WebInspector.ConsoleModel.Events.MessageShown : WebInspector.ConsoleModel.Events.MessageHidden, message);
        }
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {string} source
 * @param {string} level
 * @param {string=} url
 * @param {number=} line
 * @param {number=} column
 * @param {number=} repeatCount
 */
WebInspector.ConsoleMessage = function(source, level, url, line, column, repeatCount)
{
    this.source = source;
    this.level = level;
    this.url = url || null;
    this.line = line || 0;
    this.column = column || 0;
    this.message = "";

    repeatCount = repeatCount || 1;
    this.repeatCount = repeatCount;
    this.repeatDelta = repeatCount;
    this.totalRepeatCount = repeatCount;
}

WebInspector.ConsoleMessage.prototype = {
    /**
     * @return {boolean}
     */
    isErrorOrWarning: function()
    {
        return (this.level === WebInspector.ConsoleMessage.MessageLevel.Warning || this.level === WebInspector.ConsoleMessage.MessageLevel.Error);
    },

    updateRepeatCount: function()
    {
        // Implemented by concrete instances
    },

    /**
     * @return {WebInspector.ConsoleMessage}
     */
    clone: function()
    {
        // Implemented by concrete instances
    },

    /**
     * @return {WebInspector.DebuggerModel.Location}
     */
    location: function()
    {
        // Implemented by concrete instances
    }
}

/**
 * @param {string} source
 * @param {string} level
 * @param {string} message
 * @param {string=} type
 * @param {string=} url
 * @param {number=} line
 * @param {number=} column
 * @param {number=} repeatCount
 * @param {Array.<RuntimeAgent.RemoteObject>=} parameters
 * @param {ConsoleAgent.StackTrace=} stackTrace
 * @param {NetworkAgent.RequestId=} requestId
 * @param {boolean=} isOutdated
 * @return {WebInspector.ConsoleMessage}
 */
WebInspector.ConsoleMessage.create = function(source, level, message, type, url, line, column, repeatCount, parameters, stackTrace, requestId, isOutdated)
{
}

// Note: Keep these constants in sync with the ones in Console.h
WebInspector.ConsoleMessage.MessageSource = {
    XML: "xml",
    JS: "javascript",
    Network: "network",
    ConsoleAPI: "console-api",
    Storage: "storage",
    AppCache: "appcache",
    Rendering: "rendering",
    CSS: "css",
    Security: "security",
    Other: "other",
    Deprecation: "deprecation"
}

WebInspector.ConsoleMessage.MessageType = {
    Log: "log",
    Dir: "dir",
    DirXML: "dirxml",
    Table: "table",
    Trace: "trace",
    Clear: "clear",
    StartGroup: "startGroup",
    StartGroupCollapsed: "startGroupCollapsed",
    EndGroup: "endGroup",
    Assert: "assert",
    Result: "result",
    Profile: "profile",
    ProfileEnd: "profileEnd"
}

WebInspector.ConsoleMessage.MessageLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug"
}


/**
 * @constructor
 * @implements {ConsoleAgent.Dispatcher}
 * @param {WebInspector.ConsoleModel} console
 */
WebInspector.ConsoleDispatcher = function(console)
{
    this._console = console;
}

WebInspector.ConsoleDispatcher.prototype = {
    /**
     * @param {ConsoleAgent.ConsoleMessage} payload
     */
    messageAdded: function(payload)
    {
        var consoleMessage = WebInspector.ConsoleMessage.create(
            payload.source,
            payload.level,
            payload.text,
            payload.type,
            payload.url,
            payload.line,
            payload.column,
            payload.repeatCount,
            payload.parameters,
            payload.stackTrace,
            payload.networkRequestId,
            this._console._enablingConsole);
        this._console.addMessage(consoleMessage, true);
    },

    /**
     * @param {number} count
     */
    messageRepeatCountUpdated: function(count)
    {
        this._console._messageRepeatCountUpdated(count);
    },

    messagesCleared: function()
    {
        if (!WebInspector.settings.preserveConsoleLog.get())
            this._console._messagesCleared();
    }
}


/**
 * @extends {WebInspector.Object}
 * @constructor
 */
WebInspector.ConsoleModelFilter = function()
{
    this._messageURLFilters = WebInspector.settings.messageURLFilters.get();
    this._messageSourceFilters = WebInspector.settings.messageSourceFilters.get();
    this._messageLevelFilters = WebInspector.settings.messageLevelFilters.get();

    /**
     * @type {Object.<string, string>}
     */
    this._sourceToKeyMap = {};

    for (var key in WebInspector.ConsoleModelFilter._messageSourceGroups) {
        var sources = WebInspector.ConsoleModelFilter._messageSourceGroups[key].sources;
        if (!sources) {
            console.assert(!this._otherKey);
            this._otherKey = key;
            continue;
        }

        for (var i = 0; i < sources.length; ++i)
            this._sourceToKeyMap[sources[i]] = key;
    }

    this._boundFilterChanged = this.dispatchEventToListeners.bind(this, WebInspector.ConsoleModelFilter.Events.FilterChanged);
    this._runningUpdates = 0;
};

/**
 * @const
 */
WebInspector.ConsoleModelFilter.Events = {
    FilterChanged: "FilterChanged"
};

/**
 * @const
 */
WebInspector.ConsoleModelFilter._messageSourceGroups = {
    JS: { sources: [WebInspector.ConsoleMessage.MessageSource.JS], title: "JavaScript", styleClass: "filter-type-javascript"},
    Network: { sources: [WebInspector.ConsoleMessage.MessageSource.Network], title: "Network", styleClass: "filter-type-network"},
    Logging: { sources: [WebInspector.ConsoleMessage.MessageSource.ConsoleAPI], title: "Logging", styleClass: "filter-type-logging"},
    CSS: { sources: [WebInspector.ConsoleMessage.MessageSource.CSS], title: "CSS", styleClass: "filter-type-css"},
    Other: { title: "Other", styleClass: "filter-type-other"}
};


WebInspector.ConsoleModelFilter.prototype = {
    /**
     * @param {string} url
     */
    addMessageURLFilter: function(url)
    {
        this.beginUpdate();
        this._messageURLFilters[url] = true;
        this.endUpdate();
    },

    /**
     * @param {string} url
     */
    removeMessageURLFilter: function(url)
    {
        this.beginUpdate();
        delete this._messageURLFilters[url];
        this.endUpdate();
    },

    resetMessageURLFilters: function()
    {
        this.beginUpdate();
        this._messageURLFilters = {};
        this.endUpdate();
    },

    /**
     * @return {Object.<string, boolean>}
     */
    messageURLFilters: function()
    {
        return this._messageURLFilters;
    },

    reset: function()
    {
        this.beginUpdate();
        this._messageSourceFilters = {};
        this._messageURLFilters = {};
        this._messageLevelFilters = {};
        this.endUpdate();
    },

    /**
     * @param {string} query
     */
    setRegexFilter: function(query)
    {
        this.beginUpdate();
        if (!query)
            delete this._filterRegex;
        else
            this._filterRegex = createPlainTextSearchRegex(query, "gi");
        this.endUpdate();
    },

    /**
     * @param {string} source
     * @param {boolean} value
     */
    setMessageSourceFilter: function(source, value)
    {
        this.beginUpdate();
        if (!value)
            this._messageSourceFilters[source] = true;
        else
            delete this._messageSourceFilters[source];
        this.endUpdate();
    },

    /**
     * @param {string} level
     * @param {boolean} value
     */
    setLevelFilter: function(level, value)
    {
        this.beginUpdate();
        if (!value)
            delete this._messageLevelFilters[level];
        else
            this._messageLevelFilters[level] = true;
        this.endUpdate();
    },

    beginUpdate: function()
    {
        ++this._runningUpdates;
    },

    endUpdate: function()
    {
        console.assert(this._runningUpdates);

        if (!--this._runningUpdates) {
            WebInspector.settings.messageSourceFilters.set(this._messageSourceFilters);
            WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
            WebInspector.settings.messageLevelFilters.set(this._messageLevelFilters);
            this._boundFilterChanged();
        }
    },

    /**
     * @param {WebInspector.ConsoleMessage} message
     * @return {boolean}
     */
    shouldBeVisible: function(message)
    {
        if (message.type === WebInspector.ConsoleMessage.MessageType.StartGroup ||
            message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed ||
            message.type === WebInspector.ConsoleMessage.MessageType.EndGroup ||
            message.type === WebInspector.ConsoleMessage.MessageType.Clear)
            return true;

        if (message.url && this._messageURLFilters[message.url])
            return false;

        if (message.level && this._messageLevelFilters[message.level])
            return false;

        if (this._filterRegex) {
            this._filterRegex.lastIndex = 0;
            if (!message.matchesRegex(this._filterRegex))
                return false;
        }

        // We store group keys, and we have resolved group by message source.
        if (message.source) {
            if (this._sourceToKeyMap[message.source])
                return !this._messageSourceFilters[this._sourceToKeyMap[message.source]];
            else
                return !this._messageSourceFilters[this._otherKey];
        }

        return true;
    },

    /**
     * @return {Element}
     */
    createSourceFilterElement: function()
    {
        var sourceFilterButton = new WebInspector.StatusBarButton(WebInspector.UIString("Filter"), "console-filter", 2);
        sourceFilterButton.element.addEventListener("mousedown", this._handleSourceFilterButtonMouseDown.bind(this), false);

        return sourceFilterButton.element;
    },

    /**
     * @param {Event} event
     */
    _handleSourceFilterButtonMouseDown: function(event)
    {
        if (!event.button)
            this._createSourceFilterMenu(event).showSoftMenu();
    },

    /**
     * @param {Event} event
     * @return {WebInspector.ContextMenu}
     */
    _createSourceFilterMenu: function(event)
    {
        var menu = new WebInspector.ContextMenu(event);

        for (var sourceGroup in WebInspector.ConsoleModelFilter._messageSourceGroups) {
            var filter = WebInspector.ConsoleModelFilter._messageSourceGroups[sourceGroup];

            menu.appendCheckboxItem(WebInspector.UIString(WebInspector.UIString(filter.title)), this.setMessageSourceFilter.bind(this, sourceGroup, this._messageSourceFilters[sourceGroup]), !this._messageSourceFilters[sourceGroup]);
        }

        return menu;
    },

    /**
     * @return {Element}
     */
    createLevelFilterElement: function()
    {
        var filterBarElements = [];

        var filterBarElement = document.createElement("div");
        filterBarElement.className = "scope-bar status-bar-item";

        /**
         * @param {string} level
         * @param {MouseEvent} event
         */
        function toggleLevelFilter(level, event)
        {
            this.beginUpdate();
            var selectMultiple = WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.altKey && !event.shiftKey;

            if (level === "all") {
                this._messageLevelFilters = {};
            } else {
                if (!selectMultiple) {
                    this._messageLevelFilters = {error: true, warning: true, log: true, debug: true};
                    delete this._messageLevelFilters[level];
                } else {
                    if (this._messageLevelFilters[level])
                        delete this._messageLevelFilters[level];
                    else
                        this._messageLevelFilters[level] = true;
                }
            }

            updateLevelFilterBar.call(this);

            this.endUpdate();
        };

        /**
         * @param {string} level
         * @param {string} label
         */
        function createLevelFilterBarElement(level, label)
        {
            var categoryElement = document.createElement("li");
            categoryElement.category = level;
            categoryElement.className = level;
            categoryElement.textContent = label;
            var toggleFilterBound = /** @type {function(Event)} */ (toggleLevelFilter.bind(this, level));
            categoryElement.addEventListener("click", toggleFilterBound, false);

            filterBarElements[level] = categoryElement;
            filterBarElement.appendChild(categoryElement);
        };

        function updateLevelFilterBar()
        {
            var all = !(this._messageLevelFilters["error"] || this._messageLevelFilters["warning"] || this._messageLevelFilters["log"] || this._messageLevelFilters["debug"]);

            filterBarElements["all"].enableStyleClass("selected", all);

            filterBarElements["error"].enableStyleClass("selected", !all && !this._messageLevelFilters["error"]);
            filterBarElements["warning"].enableStyleClass("selected", !all && !this._messageLevelFilters["warning"]);
            filterBarElements["log"].enableStyleClass("selected", !all && !this._messageLevelFilters["log"]);
            filterBarElements["debug"].enableStyleClass("selected", !all && !this._messageLevelFilters["debug"]);
        };

        createLevelFilterBarElement.call(this, "all", WebInspector.UIString("All"));

        var dividerElement = document.createElement("div");
        dividerElement.addStyleClass("scope-bar-divider");
        filterBarElement.appendChild(dividerElement);

        createLevelFilterBarElement.call(this, "error", WebInspector.UIString("Errors"));
        createLevelFilterBarElement.call(this, "warning", WebInspector.UIString("Warnings"));
        createLevelFilterBarElement.call(this, "log", WebInspector.UIString("Logs"));
        createLevelFilterBarElement.call(this, "debug", WebInspector.UIString("Debug"));

        updateLevelFilterBar.call(this);

        this.addEventListener(WebInspector.ConsoleModelFilter.Events.FilterChanged, updateLevelFilterBar.bind(this));

        return filterBarElement;
    },

    __proto__: WebInspector.Object.prototype
};


/**
 * @type {?WebInspector.ConsoleModel}
 */
WebInspector.console = null;
