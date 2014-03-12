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
 * @param {!WebInspector.Target} target
 */
WebInspector.ConsoleModel = function(target)
{
    /** @type {!Array.<!WebInspector.ConsoleMessage>} */
    this.messages = [];
    this.warnings = 0;
    this.errors = 0;
    this._interruptRepeatCount = false;
    this._target = target;
    this._consoleAgent = target.consoleAgent();
    target.registerConsoleDispatcher(new WebInspector.ConsoleDispatcher(this));
}

WebInspector.ConsoleModel.Events = {
    ConsoleCleared: "console-cleared",
    MessageAdded: "console-message-added",
    RepeatCountUpdated: "repeat-count-updated"
}

WebInspector.ConsoleModel.prototype = {
    enableAgent: function()
    {
        if (WebInspector.settings.monitoringXHREnabled.get())
            this._consoleAgent.setMonitoringXHREnabled(true);

        this._enablingConsole = true;

        /**
         * @this {WebInspector.ConsoleModel}
         */
        function callback()
        {
            delete this._enablingConsole;
        }
        this._consoleAgent.enable(callback.bind(this));
    },

    /**
     * @return {boolean}
     */
    enablingConsole: function()
    {
        return !!this._enablingConsole;
    },

    /**
     * @param {!WebInspector.ConsoleModel.UIDelegate} delegate
     */
    setUIDelegate: function(delegate)
    {
        this._uiDelegate = delegate;
    },

    /**
     * @param {!WebInspector.ConsoleMessage} msg
     * @param {boolean=} isFromBackend
     */
    addMessage: function(msg, isFromBackend)
    {
        if (isFromBackend && WebInspector.SourceMap.hasSourceMapRequestHeader(msg.request))
            return;

        msg.index = this.messages.length;
        this.messages.push(msg);
        this._incrementErrorWarningCount(msg);

        if (isFromBackend)
            this._previousMessage = msg;

        this._interruptRepeatCount = !isFromBackend;

        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.MessageAdded, msg);
    },

    /**
     * @param {string} text
     * @param {?string} newPromptText
     * @param {boolean} useCommandLineAPI
     */
    evaluateCommand: function(text, newPromptText, useCommandLineAPI)
    {
        if (!this._uiDelegate)
            this.show();

        var commandMessage = new WebInspector.ConsoleMessage(WebInspector.ConsoleMessage.MessageSource.JS, null, text, WebInspector.ConsoleMessage.MessageType.Command);
        this.addMessage(commandMessage);

        if (newPromptText !== null)
            this._uiDelegate.setPromptText(newPromptText);

        /**
         * @param {?WebInspector.RemoteObject} result
         * @param {boolean} wasThrown
         * @param {?RuntimeAgent.RemoteObject=} valueResult
         * @this {WebInspector.ConsoleModel}
         */
        function printResult(result, wasThrown, valueResult)
        {
            if (!result)
                return;

            this._uiDelegate.printEvaluationResult(result, wasThrown, text, commandMessage);
        }
        this._target.runtimeModel.evaluate(text, "console", useCommandLineAPI, false, false, true, printResult.bind(this));

        WebInspector.userMetrics.ConsoleEvaluated.record();
    },

    show: function()
    {
        WebInspector.Revealer.reveal(this);
    },

    /**
     * @param {string} expression
     */
    evaluate: function(expression)
    {
        this.evaluateCommand(expression, null, false);
    },

    /**
     * @param {string} messageText
     * @param {!WebInspector.ConsoleMessage.MessageLevel=} messageLevel
     * @param {boolean=} showConsole
     */
    log: function(messageText, messageLevel, showConsole)
    {
        var message = new WebInspector.ConsoleMessage(
            WebInspector.ConsoleMessage.MessageSource.Other,
            messageLevel || WebInspector.ConsoleMessage.MessageLevel.Debug,
            messageText);

        this.addMessage(message);
        if (showConsole)
            this.show();
    },

    /**
     * @param {string} error
     */
    showErrorMessage: function(error)
    {
        this.log(error, WebInspector.ConsoleMessage.MessageLevel.Error, true);
    },

    /**
     * @param {!WebInspector.ConsoleMessage} msg
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
        this._consoleAgent.clearMessages();
        this.clearMessages();
    },

    clearMessages: function()
    {
        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.ConsoleCleared);

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

    __proto__: WebInspector.Object.prototype
}

/**
 * @interface
 */
WebInspector.ConsoleModel.UIDelegate = function() { }

WebInspector.ConsoleModel.UIDelegate.prototype = {
    /**
     * @param {string} text
     */
    setPromptText: function(text) { },

    /**
     * @param {?WebInspector.RemoteObject} result
     * @param {boolean} wasThrown
     * @param {string} promptText
     * @param {!WebInspector.ConsoleMessage} commandMessage
     */
    printEvaluationResult: function(result, wasThrown, promptText, commandMessage) { }
}

/**
 * @constructor
 * @param {string} source
 * @param {?string} level
 * @param {string} text
 * @param {string=} type
 * @param {?string=} url
 * @param {number=} line
 * @param {number=} column
 * @param {number=} repeatCount
 * @param {!NetworkAgent.RequestId=} requestId
 * @param {!Array.<!RuntimeAgent.RemoteObject>=} parameters
 * @param {!Array.<!ConsoleAgent.CallFrame>=} stackTrace
 * @param {boolean=} isOutdated
 */
WebInspector.ConsoleMessage = function(source, level, text, type, url, line, column, repeatCount, requestId, parameters, stackTrace, isOutdated)
{
    this.source = source;
    this.level = level;
    this.messageText = text;
    this.type = type || WebInspector.ConsoleMessage.MessageType.Log;
    this.url = url || null;
    this.line = line || 0;
    this.column = column || 0;
    this.parameters = parameters;
    this.stackTrace = stackTrace;
    this.isOutdated = isOutdated;

    repeatCount = repeatCount || 1;
    this.repeatCount = repeatCount;
    this.repeatDelta = repeatCount;
    this.totalRepeatCount = repeatCount;
    this.request = requestId ? WebInspector.networkLog.requestForId(requestId) : null;
}

WebInspector.ConsoleMessage.prototype = {
    /**
     * @return {boolean}
     */
    isErrorOrWarning: function()
    {
        return (this.level === WebInspector.ConsoleMessage.MessageLevel.Warning || this.level === WebInspector.ConsoleMessage.MessageLevel.Error);
    },

    /**
     * @return {!WebInspector.ConsoleMessage}
     */
    clone: function()
    {
        return new WebInspector.ConsoleMessage(this.source, this.level, this.text, this.type, this.url, this.line, this.column, this.repeatCount, this.requestId, this.parameters, this.stackTrace, this.isOutdated);
    },

    /**
     * @param {?WebInspector.ConsoleMessage} msg
     * @return {boolean}
     */
    isEqual: function(msg)
    {
        if (!msg)
            return false;

        if (this.stackTrace) {
            if (!msg.stackTrace)
                return false;
            var l = this.stackTrace;
            var r = msg.stackTrace;
            if (l.length !== r.length)
                return false;
            for (var i = 0; i < l.length; i++) {
                if (l[i].url !== r[i].url ||
                    l[i].functionName !== r[i].functionName ||
                    l[i].lineNumber !== r[i].lineNumber ||
                    l[i].columnNumber !== r[i].columnNumber)
                    return false;
            }
        }

        return (this.source === msg.source)
            && (this.type === msg.type)
            && (this.level === msg.level)
            && (this.line === msg.line)
            && (this.url === msg.url)
            && (this.messageText === msg.messageText)
            && (this.request === msg.request);
    }
}

// Note: Keep these constants in sync with the ones in Console.h
/**
 * @enum {string}
 */
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

/**
 * @enum {string}
 */
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
    ProfileEnd: "profileEnd",
    Command: "command"
}

/**
 * @enum {string}
 */
WebInspector.ConsoleMessage.MessageLevel = {
    Log: "log",
    Info: "info",
    Warning: "warning",
    Error: "error",
    Debug: "debug"
}

/**
 * @constructor
 * @implements {ConsoleAgent.Dispatcher}
 * @param {!WebInspector.ConsoleModel} console
 */
WebInspector.ConsoleDispatcher = function(console)
{
    this._console = console;
}

WebInspector.ConsoleDispatcher.prototype = {
    /**
     * @param {!ConsoleAgent.ConsoleMessage} payload
     */
    messageAdded: function(payload)
    {
        var consoleMessage = new WebInspector.ConsoleMessage(
            payload.source,
            payload.level,
            payload.text,
            payload.type,
            payload.url,
            payload.line,
            payload.column,
            payload.repeatCount,
            payload.networkRequestId,
            payload.parameters,
            payload.stackTrace,
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
            this._console.clearMessages();
    }
}

/**
 * @type {!WebInspector.ConsoleModel}
 */
WebInspector.console;
