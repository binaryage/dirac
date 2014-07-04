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
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 */
WebInspector.ConsoleModel = function(target)
{
    WebInspector.SDKObject.call(this, target);

    /** @type {!Array.<!WebInspector.ConsoleMessage>} */
    this.messages = [];
    this.warnings = 0;
    this.errors = 0;
    this._consoleAgent = target.consoleAgent();
    target.registerConsoleDispatcher(new WebInspector.ConsoleDispatcher(this));
    this._enableAgent();
}

WebInspector.ConsoleModel.Events = {
    ConsoleCleared: "ConsoleCleared",
    MessageAdded: "MessageAdded",
    CommandEvaluated: "CommandEvaluated",
}

WebInspector.ConsoleModel.prototype = {
    _enableAgent: function()
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
     * @param {!WebInspector.ConsoleMessage} msg
     * @param {boolean=} isFromBackend
     */
    addMessage: function(msg, isFromBackend)
    {
        if (isFromBackend && WebInspector.NetworkManager.hasDevToolsRequestHeader(msg.request))
            return;

        msg.index = this.messages.length;
        this.messages.push(msg);
        this._incrementErrorWarningCount(msg);

        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.MessageAdded, msg);
    },

    show: function()
    {
        WebInspector.Revealer.reveal(this);
    },

    /**
     * @param {string} messageText
     * @param {!WebInspector.ConsoleMessage.MessageLevel=} messageLevel
     * @param {boolean=} showConsole
     */
    log: function(messageText, messageLevel, showConsole)
    {
        var message = new WebInspector.ConsoleMessage(
            this.target(),
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
                this.warnings++;
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Error:
                this.errors++;
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
        this.errors = 0;
        this.warnings = 0;
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @param {!WebInspector.ExecutionContext} executionContext
 * @param {string} text
 * @param {boolean=} useCommandLineAPI
 */
WebInspector.ConsoleModel.evaluateCommandInConsole = function(executionContext, text, useCommandLineAPI)
{
    useCommandLineAPI = !!useCommandLineAPI;
    var target = executionContext.target();

    var commandMessage = new WebInspector.ConsoleMessage(target, WebInspector.ConsoleMessage.MessageSource.JS, null, text, WebInspector.ConsoleMessage.MessageType.Command);
    target.consoleModel.addMessage(commandMessage);

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

        this.show();
        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.CommandEvaluated, {result: result, wasThrown: wasThrown, text: text, commandMessage: commandMessage});
    }

    executionContext.evaluate(text, "console", useCommandLineAPI, false, false, true, printResult.bind(target.consoleModel));

    WebInspector.userMetrics.ConsoleEvaluated.record();
}


/**
 * @constructor
 * @param {?WebInspector.Target} target
 * @param {string} source
 * @param {?string} level
 * @param {string} messageText
 * @param {string=} type
 * @param {?string=} url
 * @param {number=} line
 * @param {number=} column
 * @param {!NetworkAgent.RequestId=} requestId
 * @param {!Array.<!RuntimeAgent.RemoteObject>=} parameters
 * @param {!Array.<!ConsoleAgent.CallFrame>=} stackTrace
 * @param {number=} timestamp
 * @param {boolean=} isOutdated
 * @param {!RuntimeAgent.ExecutionContextId=} executionContextId
 */
WebInspector.ConsoleMessage = function(target, source, level, messageText, type, url, line, column, requestId, parameters, stackTrace, timestamp, isOutdated, executionContextId)
{
    this._target = target;
    this.source = source;
    this.level = level;
    this.messageText = messageText;
    this.type = type || WebInspector.ConsoleMessage.MessageType.Log;
    this.url = url || null;
    this.line = line || 0;
    this.column = column || 0;
    this.parameters = parameters;
    this.stackTrace = stackTrace;
    this.timestamp = timestamp || Date.now();
    this.isOutdated = isOutdated;
    this.executionContextId = executionContextId || 0;

    this.request = requestId ? target.networkLog.requestForId(requestId) : null;

    if (this.request) {
        this.stackTrace = this.request.initiator.stackTrace;
        if (this.request.initiator && this.request.initiator.url) {
            this.url = this.request.initiator.url;
            this.line = this.request.initiator.lineNumber;
        }
    }
}

WebInspector.ConsoleMessage.prototype = {
    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @param {!WebInspector.ConsoleMessage} originatingMessage
     */
    setOriginatingMessage: function(originatingMessage)
    {
        this._originatingConsoleMessage = originatingMessage;
    },

    /**
     * @return {?WebInspector.ConsoleMessage}
     */
    originatingMessage: function()
    {
        return this._originatingConsoleMessage;
    },

    /**
     * @return {boolean}
     */
    isGroupMessage: function()
    {
        return this.type === WebInspector.ConsoleMessage.MessageType.StartGroup ||
            this.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed ||
            this.type === WebInspector.ConsoleMessage.MessageType.EndGroup;
    },

    /**
     * @return {boolean}
     */
    isGroupStartMessage: function()
    {
        return this.type === WebInspector.ConsoleMessage.MessageType.StartGroup ||
            this.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed;
    },

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
        return new WebInspector.ConsoleMessage(
            this.target(),
            this.source,
            this.level,
            this.messageText,
            this.type,
            this.url,
            this.line,
            this.column,
            this.request ? this.request.requestId : undefined,
            this.parameters,
            this.stackTrace,
            this.timestamp,
            this.isOutdated,
            this.executionContextId);
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
            if (!msg.stackTrace || this.stackTrace.length !== msg.stackTrace.length)
                return false;

            for (var i = 0; i < msg.stackTrace.length; ++i) {
                if (this.stackTrace[i].url !== msg.stackTrace[i].url ||
                    this.stackTrace[i].functionName !== msg.stackTrace[i].functionName ||
                    this.stackTrace[i].lineNumber !== msg.stackTrace[i].lineNumber ||
                    this.stackTrace[i].columnNumber !== msg.stackTrace[i].columnNumber)
                    return false;
            }
        }

        if (this.parameters) {
            if (!msg.parameters || this.parameters.length !== msg.parameters.length)
                return false;

            for (var i = 0; i < msg.parameters.length; ++i) {
                // Never treat objects as equal - their properties might change over time.
                if (this.parameters[i].type !== msg.parameters[i].type || msg.parameters[i].type === "object" || this.parameters[i].value !== msg.parameters[i].value)
                    return false;
            }
        }

        return (this.target() === msg.target())
            && (this.source === msg.source)
            && (this.type === msg.type)
            && (this.level === msg.level)
            && (this.line === msg.line)
            && (this.url === msg.url)
            && (this.messageText === msg.messageText)
            && (this.request === msg.request)
            && (this.executionContextId === msg.executionContextId);
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
 * @param {!WebInspector.ConsoleMessage} a
 * @param {!WebInspector.ConsoleMessage} b
 * @return {number}
 */
WebInspector.ConsoleMessage.timestampComparator = function (a, b)
{
    return a.timestamp - b.timestamp;
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
            this._console.target(),
            payload.source,
            payload.level,
            payload.text,
            payload.type,
            payload.url,
            payload.line,
            payload.column,
            payload.networkRequestId,
            payload.parameters,
            payload.stackTrace,
            payload.timestamp * 1000, // Convert to ms.
            this._console._enablingConsole,
            payload.executionContextId);
        this._console.addMessage(consoleMessage, true);
    },

    /**
     * @param {number} count
     */
    messageRepeatCountUpdated: function(count)
    {
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
