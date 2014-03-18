/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
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
WebInspector.DebuggerModel = function(target)
{
    target.registerDebuggerDispatcher(new WebInspector.DebuggerDispatcher(this));
    this._agent = target.debuggerAgent();
    this._target = target;

    /** @type {?WebInspector.DebuggerPausedDetails} */
    this._debuggerPausedDetails = null;
    /** @type {!Object.<string, !WebInspector.Script>} */
    this._scripts = {};
    /** @type {!StringMap.<!Array.<!WebInspector.Script>>} */
    this._scriptsBySourceURL = new StringMap();

    this._breakpointsActive = true;

    WebInspector.settings.pauseOnExceptionEnabled.addChangeListener(this._pauseOnExceptionStateChanged, this);
    WebInspector.settings.pauseOnCaughtException.addChangeListener(this._pauseOnExceptionStateChanged, this);

    WebInspector.settings.enableAsyncStackTraces.addChangeListener(this._asyncStackTracesStateChanged, this);

    this.enableDebugger();

    this.applySkipStackFrameSettings();
}

/**
 * Keep these in sync with WebCore::ScriptDebugServer
 *
 * @enum {string}
 */
WebInspector.DebuggerModel.PauseOnExceptionsState = {
    DontPauseOnExceptions : "none",
    PauseOnAllExceptions : "all",
    PauseOnUncaughtExceptions: "uncaught"
};

/**
 * @constructor
 * @implements {WebInspector.RawLocation}
 * @param {string} scriptId
 * @param {number} lineNumber
 * @param {number} columnNumber
 */
WebInspector.DebuggerModel.Location = function(scriptId, lineNumber, columnNumber)
{
    this.scriptId = scriptId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
}

WebInspector.DebuggerModel.Events = {
    DebuggerWasEnabled: "DebuggerWasEnabled",
    DebuggerWasDisabled: "DebuggerWasDisabled",
    DebuggerPaused: "DebuggerPaused",
    DebuggerResumed: "DebuggerResumed",
    ParsedScriptSource: "ParsedScriptSource",
    FailedToParseScriptSource: "FailedToParseScriptSource",
    BreakpointResolved: "BreakpointResolved",
    GlobalObjectCleared: "GlobalObjectCleared",
    CallFrameSelected: "CallFrameSelected",
    ConsoleCommandEvaluatedInSelectedCallFrame: "ConsoleCommandEvaluatedInSelectedCallFrame",
    BreakpointsActiveStateChanged: "BreakpointsActiveStateChanged"
}

WebInspector.DebuggerModel.BreakReason = {
    DOM: "DOM",
    EventListener: "EventListener",
    XHR: "XHR",
    Exception: "exception",
    Assert: "assert",
    CSPViolation: "CSPViolation",
    DebugCommand: "debugCommand"
}

WebInspector.DebuggerModel.prototype = {
    /**
     * @return {boolean}
     */
    debuggerEnabled: function()
    {
        return !!this._debuggerEnabled;
    },

    enableDebugger: function()
    {
        if (this._debuggerEnabled)
            return;

        this._agent.enable(this._debuggerWasEnabled.bind(this));
    },

    disableDebugger: function()
    {
        if (!this._debuggerEnabled)
            return;

        this._agent.disable(this._debuggerWasDisabled.bind(this));
    },

    /**
     * @param {boolean} skip
     * @param {boolean=} untilReload
     */
    skipAllPauses: function(skip, untilReload)
    {
        if (this._skipAllPausesTimeout) {
            clearTimeout(this._skipAllPausesTimeout);
            delete this._skipAllPausesTimeout;
        }
        this._agent.setSkipAllPauses(skip, untilReload);
    },

    /**
     * @param {number} timeout
     */
    skipAllPausesUntilReloadOrTimeout: function(timeout)
    {
        if (this._skipAllPausesTimeout)
            clearTimeout(this._skipAllPausesTimeout);
        this._agent.setSkipAllPauses(true, true);
        // If reload happens before the timeout, the flag will be already unset and the timeout callback won't change anything.
        this._skipAllPausesTimeout = setTimeout(this.skipAllPauses.bind(this, false), timeout);
    },

    _debuggerWasEnabled: function()
    {
        this._debuggerEnabled = true;
        this._pauseOnExceptionStateChanged();
        this._asyncStackTracesStateChanged();
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerWasEnabled);
    },

    _pauseOnExceptionStateChanged: function()
    {
        var state;
        if (!WebInspector.settings.pauseOnExceptionEnabled.get()) {
            state = WebInspector.DebuggerModel.PauseOnExceptionsState.DontPauseOnExceptions;
        } else if (WebInspector.settings.pauseOnCaughtException.get()) {
            state = WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnAllExceptions;
        } else {
            state = WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnUncaughtExceptions;
        }
        this._agent.setPauseOnExceptions(state);
    },

    _asyncStackTracesStateChanged: function()
    {
        const maxAsyncStackChainDepth = 4;
        var enabled = WebInspector.settings.enableAsyncStackTraces.get() && WebInspector.experimentsSettings.asyncStackTraces.isEnabled();
        this._agent.setAsyncCallStackDepth(enabled ? maxAsyncStackChainDepth : 0);
    },

    _debuggerWasDisabled: function()
    {
        this._debuggerEnabled = false;
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerWasDisabled);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     */
    continueToLocation: function(rawLocation)
    {
        this._agent.continueToLocation(rawLocation);
    },

    stepInto: function()
    {
        /**
         * @this {WebInspector.DebuggerModel}
         */
        function callback()
        {
            this._agent.stepInto();
        }
        this._agent.setOverlayMessage(undefined, callback.bind(this));
    },

    stepOver: function()
    {
        /**
         * @this {WebInspector.DebuggerModel}
         */
        function callback()
        {
            this._agent.stepOver();
        }
        this._agent.setOverlayMessage(undefined, callback.bind(this));
    },

    stepOut: function()
    {
        /**
         * @this {WebInspector.DebuggerModel}
         */
        function callback()
        {
            this._agent.stepOut();
        }
        this._agent.setOverlayMessage(undefined, callback.bind(this));
    },

    resume: function()
    {
        /**
         * @this {WebInspector.DebuggerModel}
         */
        function callback()
        {
            this._agent.resume();
        }
        this._agent.setOverlayMessage(undefined, callback.bind(this));
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {string} condition
     * @param {function(?DebuggerAgent.BreakpointId, !Array.<!WebInspector.DebuggerModel.Location>):void=} callback
     */
    setBreakpointByScriptLocation: function(rawLocation, condition, callback)
    {
        var script = this.scriptForId(rawLocation.scriptId);
        if (script.sourceURL)
            this.setBreakpointByURL(script.sourceURL, rawLocation.lineNumber, rawLocation.columnNumber, condition, callback);
        else
            this.setBreakpointBySourceId(rawLocation, condition, callback);
    },

    /**
     * @param {string} url
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @param {string=} condition
     * @param {function(?DebuggerAgent.BreakpointId, !Array.<!WebInspector.DebuggerModel.Location>)=} callback
     */
    setBreakpointByURL: function(url, lineNumber, columnNumber, condition, callback)
    {
        // Adjust column if needed.
        var minColumnNumber = 0;
        var scripts = this._scriptsBySourceURL.get(url) || [];
        for (var i = 0, l = scripts.length; i < l; ++i) {
            var script = scripts[i];
            if (lineNumber === script.lineOffset)
                minColumnNumber = minColumnNumber ? Math.min(minColumnNumber, script.columnOffset) : script.columnOffset;
        }
        columnNumber = Math.max(columnNumber, minColumnNumber);

        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.BreakpointId} breakpointId
         * @param {!Array.<!DebuggerAgent.Location>} locations
         */
        function didSetBreakpoint(error, breakpointId, locations)
        {
            if (callback) {
                var rawLocations = /** @type {!Array.<!WebInspector.DebuggerModel.Location>} */ (locations);
                callback(error ? null : breakpointId, rawLocations);
            }
        }
        this._agent.setBreakpointByUrl(lineNumber, url, undefined, columnNumber, condition, undefined, didSetBreakpoint);
        WebInspector.userMetrics.ScriptsBreakpointSet.record();
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {string} condition
     * @param {function(?DebuggerAgent.BreakpointId, !Array.<!WebInspector.DebuggerModel.Location>)=} callback
     */
    setBreakpointBySourceId: function(rawLocation, condition, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.BreakpointId} breakpointId
         * @param {!DebuggerAgent.Location} actualLocation
         */
        function didSetBreakpoint(error, breakpointId, actualLocation)
        {
            if (callback) {
                var rawLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (actualLocation);
                callback(error ? null : breakpointId, [rawLocation]);
            }
        }
        this._agent.setBreakpoint(rawLocation, condition, didSetBreakpoint);
        WebInspector.userMetrics.ScriptsBreakpointSet.record();
    },

    /**
     * @param {!DebuggerAgent.BreakpointId} breakpointId
     * @param {function()=} callback
     */
    removeBreakpoint: function(breakpointId, callback)
    {
        this._agent.removeBreakpoint(breakpointId, innerCallback);

        /**
         * @param {?Protocol.Error} error
         */
        function innerCallback(error)
        {
            if (error)
                console.error("Failed to remove breakpoint: " + error);
            if (callback)
                callback();
        }
    },

    /**
     * @param {!DebuggerAgent.BreakpointId} breakpointId
     * @param {!DebuggerAgent.Location} location
     */
    _breakpointResolved: function(breakpointId, location)
    {
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.BreakpointResolved, {breakpointId: breakpointId, location: location});
    },

    _globalObjectCleared: function()
    {
        this._setDebuggerPausedDetails(null);
        this._reset();
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.GlobalObjectCleared);
    },

    _reset: function()
    {
        this._scripts = {};
        this._scriptsBySourceURL.clear();
    },

    /**
     * @return {!Object.<string, !WebInspector.Script>}
     */
    get scripts()
    {
        return this._scripts;
    },

    /**
     * @param {!DebuggerAgent.ScriptId} scriptId
     * @return {!WebInspector.Script}
     */
    scriptForId: function(scriptId)
    {
        return this._scripts[scriptId] || null;
    },

    /**
     * @return {!Array.<!WebInspector.Script>}
     */
    scriptsForSourceURL: function(sourceURL)
    {
        if (!sourceURL)
            return [];
        return this._scriptsBySourceURL.get(sourceURL) || [];
    },

    /**
     * @param {!DebuggerAgent.ScriptId} scriptId
     * @param {string} newSource
     * @param {function(?Protocol.Error, !DebuggerAgent.SetScriptSourceError=)} callback
     */
    setScriptSource: function(scriptId, newSource, callback)
    {
        this._scripts[scriptId].editSource(newSource, this._didEditScriptSource.bind(this, scriptId, newSource, callback));
    },

    /**
     * @param {!DebuggerAgent.ScriptId} scriptId
     * @param {string} newSource
     * @param {function(?Protocol.Error, !DebuggerAgent.SetScriptSourceError=)} callback
     * @param {?Protocol.Error} error
     * @param {!DebuggerAgent.SetScriptSourceError=} errorData
     * @param {!Array.<!DebuggerAgent.CallFrame>=} callFrames
     * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
     * @param {boolean=} needsStepIn
     */
    _didEditScriptSource: function(scriptId, newSource, callback, error, errorData, callFrames, asyncStackTrace, needsStepIn)
    {
        callback(error, errorData);
        if (needsStepIn)
            this.stepInto();
        else if (!error && callFrames && callFrames.length)
            this._pausedScript(callFrames, this._debuggerPausedDetails.reason, this._debuggerPausedDetails.auxData, this._debuggerPausedDetails.breakpointIds, asyncStackTrace);
    },

    /**
     * @return {?Array.<!WebInspector.DebuggerModel.CallFrame>}
     */
    get callFrames()
    {
        return this._debuggerPausedDetails ? this._debuggerPausedDetails.callFrames : null;
    },

    /**
     * @return {?WebInspector.DebuggerPausedDetails}
     */
    debuggerPausedDetails: function()
    {
        return this._debuggerPausedDetails;
    },

    /**
     * @param {?WebInspector.DebuggerPausedDetails} debuggerPausedDetails
     */
    _setDebuggerPausedDetails: function(debuggerPausedDetails)
    {
        if (this._debuggerPausedDetails)
            this._debuggerPausedDetails.dispose();
        this._debuggerPausedDetails = debuggerPausedDetails;
        if (this._debuggerPausedDetails)
            this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPausedDetails);
        if (debuggerPausedDetails) {
            this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);
            this._agent.setOverlayMessage(WebInspector.UIString("Paused in debugger"));
        } else {
            this.setSelectedCallFrame(null);
            this._agent.setOverlayMessage();
        }
    },

    /**
     * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
     * @param {string} reason
     * @param {!Object|undefined} auxData
     * @param {!Array.<string>} breakpointIds
     * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
     */
    _pausedScript: function(callFrames, reason, auxData, breakpointIds, asyncStackTrace)
    {
        this._setDebuggerPausedDetails(new WebInspector.DebuggerPausedDetails(this, callFrames, reason, auxData, breakpointIds, asyncStackTrace));
    },

    _resumedScript: function()
    {
        this._setDebuggerPausedDetails(null);
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerResumed);
    },

    /**
     * @param {!DebuggerAgent.ScriptId} scriptId
     * @param {string} sourceURL
     * @param {number} startLine
     * @param {number} startColumn
     * @param {number} endLine
     * @param {number} endColumn
     * @param {boolean} isContentScript
     * @param {string=} sourceMapURL
     * @param {boolean=} hasSourceURL
     */
    _parsedScriptSource: function(scriptId, sourceURL, startLine, startColumn, endLine, endColumn, isContentScript, sourceMapURL, hasSourceURL)
    {
        var script = new WebInspector.Script(scriptId, sourceURL, startLine, startColumn, endLine, endColumn, isContentScript, sourceMapURL, hasSourceURL);
        this._registerScript(script);
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.ParsedScriptSource, script);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    _registerScript: function(script)
    {
        this._scripts[script.scriptId] = script;
        if (script.isAnonymousScript())
            return;

        var scripts = this._scriptsBySourceURL.get(script.sourceURL);
        if (!scripts) {
            scripts = [];
            this._scriptsBySourceURL.put(script.sourceURL, scripts);
        }
        scripts.push(script);
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    createRawLocation: function(script, lineNumber, columnNumber)
    {
        if (script.sourceURL)
            return this.createRawLocationByURL(script.sourceURL, lineNumber, columnNumber)
        return new WebInspector.DebuggerModel.Location(script.scriptId, lineNumber, columnNumber);
    },

    /**
     * @param {string} sourceURL
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    createRawLocationByURL: function(sourceURL, lineNumber, columnNumber)
    {
        var closestScript = null;
        var scripts = this._scriptsBySourceURL.get(sourceURL) || [];
        for (var i = 0, l = scripts.length; i < l; ++i) {
            var script = scripts[i];
            if (!closestScript)
                closestScript = script;
            if (script.lineOffset > lineNumber || (script.lineOffset === lineNumber && script.columnOffset > columnNumber))
                continue;
            if (script.endLine < lineNumber || (script.endLine === lineNumber && script.endColumn <= columnNumber))
                continue;
            closestScript = script;
            break;
        }
        return closestScript ? new WebInspector.DebuggerModel.Location(closestScript.scriptId, lineNumber, columnNumber) : null;
    },

    /**
     * @return {boolean}
     */
    isPaused: function()
    {
        return !!this.debuggerPausedDetails();
    },

    /**
     * @param {?WebInspector.DebuggerModel.CallFrame} callFrame
     */
    setSelectedCallFrame: function(callFrame)
    {
        this._selectedCallFrame = callFrame;
        if (!this._selectedCallFrame)
            return;

        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.CallFrameSelected, callFrame);
    },

    /**
     * @return {?WebInspector.DebuggerModel.CallFrame}
     */
    selectedCallFrame: function()
    {
        return this._selectedCallFrame;
    },

    /**
     * @param {string} code
     * @param {string} objectGroup
     * @param {boolean} includeCommandLineAPI
     * @param {boolean} doNotPauseOnExceptionsAndMuteConsole
     * @param {boolean} returnByValue
     * @param {boolean} generatePreview
     * @param {function(?WebInspector.RemoteObject, boolean, ?RuntimeAgent.RemoteObject=)} callback
     */
    evaluateOnSelectedCallFrame: function(code, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, callback)
    {
        /**
         * @param {?RuntimeAgent.RemoteObject} result
         * @param {boolean=} wasThrown
         * @this {WebInspector.DebuggerModel}
         */
        function didEvaluate(result, wasThrown)
        {
            if (!result)
                callback(null, false);
            else if (returnByValue)
                callback(null, !!wasThrown, wasThrown ? null : result);
            else
                callback(WebInspector.RemoteObject.fromPayload(result, this._target), !!wasThrown);

            if (objectGroup === "console")
                this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.ConsoleCommandEvaluatedInSelectedCallFrame);
        }

        this.selectedCallFrame().evaluate(code, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, didEvaluate.bind(this));
    },

    /**
     * @param {function(!Object)} callback
     */
    getSelectedCallFrameVariables: function(callback)
    {
        var result = { this: true };

        var selectedCallFrame = this._selectedCallFrame;
        if (!selectedCallFrame)
            callback(result);

        var pendingRequests = 0;

        function propertiesCollected(properties)
        {
            for (var i = 0; properties && i < properties.length; ++i)
                result[properties[i].name] = true;
            if (--pendingRequests == 0)
                callback(result);
        }

        for (var i = 0; i < selectedCallFrame.scopeChain.length; ++i) {
            var scope = selectedCallFrame.scopeChain[i];
            var object = WebInspector.RemoteObject.fromPayload(scope.object, this._target);
            pendingRequests++;
            object.getAllProperties(false, propertiesCollected);
        }
    },

    /**
     * @param {boolean} active
     */
    setBreakpointsActive: function(active)
    {
        if (this._breakpointsActive === active)
            return;
        this._breakpointsActive = active;
        this._agent.setBreakpointsActive(active);
        this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.BreakpointsActiveStateChanged, active);
    },

    /**
     * @return {boolean}
     */
    breakpointsActive: function()
    {
        return this._breakpointsActive;
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.Script.Location}
     */
    createLiveLocation: function(rawLocation, updateDelegate)
    {
        var script = this._scripts[rawLocation.scriptId];
        return script.createLiveLocation(rawLocation, updateDelegate);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location|!DebuggerAgent.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var script = this._scripts[rawLocation.scriptId];
        if (!script)
            return null;
        return script.rawLocationToUILocation(rawLocation.lineNumber, rawLocation.columnNumber);
    },

    /**
     * Handles notification from JavaScript VM about updated stack (liveedit or frame restart action).
     * @param {!Array.<!DebuggerAgent.CallFrame>=} newCallFrames
     * @param {!Object=} details
     * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
     */
    callStackModified: function(newCallFrames, details, asyncStackTrace)
    {
        // FIXME: declare this property in protocol and in JavaScript.
        if (details && details["stack_update_needs_step_in"])
            this.stepInto();
        else if (newCallFrames && newCallFrames.length)
            this._pausedScript(newCallFrames, this._debuggerPausedDetails.reason, this._debuggerPausedDetails.auxData, this._debuggerPausedDetails.breakpointIds, asyncStackTrace);
    },

    applySkipStackFrameSettings: function()
    {
        if (!WebInspector.experimentsSettings.frameworksDebuggingSupport.isEnabled())
            return;
        var settings = WebInspector.settings;
        var patternParameter = settings.skipStackFramesSwitch.get() ? settings.skipStackFramesPattern.get() : undefined;
        this._agent.skipStackFrames(patternParameter);
    },

    __proto__: WebInspector.Object.prototype
}

WebInspector.DebuggerEventTypes = {
    JavaScriptPause: 0,
    JavaScriptBreakpoint: 1,
    NativeBreakpoint: 2
};

/**
 * @constructor
 * @implements {DebuggerAgent.Dispatcher}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 */
WebInspector.DebuggerDispatcher = function(debuggerModel)
{
    this._debuggerModel = debuggerModel;
}

WebInspector.DebuggerDispatcher.prototype = {
    /**
     * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
     * @param {string} reason
     * @param {!Object=} auxData
     * @param {!Array.<string>=} breakpointIds
     * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
     */
    paused: function(callFrames, reason, auxData, breakpointIds, asyncStackTrace)
    {
        this._debuggerModel._pausedScript(callFrames, reason, auxData, breakpointIds || [], asyncStackTrace);
    },

    /**
     * @override
     */
    resumed: function()
    {
        this._debuggerModel._resumedScript();
    },

    /**
     * @override
     */
    globalObjectCleared: function()
    {
        this._debuggerModel._globalObjectCleared();
    },

    /**
     * @param {!DebuggerAgent.ScriptId} scriptId
     * @param {string} sourceURL
     * @param {number} startLine
     * @param {number} startColumn
     * @param {number} endLine
     * @param {number} endColumn
     * @param {boolean=} isContentScript
     * @param {string=} sourceMapURL
     * @param {boolean=} hasSourceURL
     */
    scriptParsed: function(scriptId, sourceURL, startLine, startColumn, endLine, endColumn, isContentScript, sourceMapURL, hasSourceURL)
    {
        this._debuggerModel._parsedScriptSource(scriptId, sourceURL, startLine, startColumn, endLine, endColumn, !!isContentScript, sourceMapURL, hasSourceURL);
    },

    /**
     * @param {string} sourceURL
     * @param {string} source
     * @param {number} startingLine
     * @param {number} errorLine
     * @param {string} errorMessage
     */
    scriptFailedToParse: function(sourceURL, source, startingLine, errorLine, errorMessage)
    {
    },

    /**
     * @param {!DebuggerAgent.BreakpointId} breakpointId
     * @param {!DebuggerAgent.Location} location
     */
    breakpointResolved: function(breakpointId, location)
    {
        this._debuggerModel._breakpointResolved(breakpointId, location);
    }
}

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.Script} script
 * @param {!DebuggerAgent.CallFrame} payload
 * @param {boolean=} isAsync
 */
WebInspector.DebuggerModel.CallFrame = function(debuggerModel, script, payload, isAsync)
{
    this._debuggerModel = debuggerModel;
    this._debuggerAgent = debuggerModel._agent;
    this._script = script;
    this._payload = payload;
    /** @type {!Array.<!WebInspector.Script.Location>} */
    this._locations = [];
    this._isAsync = isAsync;
}

/**
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
 * @param {boolean=} isAsync
 * @return {!Array.<!WebInspector.DebuggerModel.CallFrame>}
 */
WebInspector.DebuggerModel.CallFrame.fromPayloadArray = function(debuggerModel, callFrames, isAsync)
{
    var result = [];
    for (var i = 0; i < callFrames.length; ++i) {
        var callFrame = callFrames[i];
        var script = debuggerModel.scriptForId(callFrame.location.scriptId);
        if (script)
            result.push(new WebInspector.DebuggerModel.CallFrame(debuggerModel, script, callFrame, isAsync));
    }
    return result;
}

WebInspector.DebuggerModel.CallFrame.prototype = {
    /**
     * @return {!WebInspector.Script}
     */
    get script()
    {
        return this._script;
    },

    /**
     * @return {string}
     */
    get type()
    {
        return this._payload.type;
    },

    /**
     * @return {string}
     */
    get id()
    {
        return this._payload.callFrameId;
    },

    /**
     * @return {!Array.<!DebuggerAgent.Scope>}
     */
    get scopeChain()
    {
        return this._payload.scopeChain;
    },

    /**
     * @return {!RuntimeAgent.RemoteObject}
     */
    get this()
    {
        return this._payload.this;
    },

    /**
     * @return {!RuntimeAgent.RemoteObject|undefined}
     */
    get returnValue()
    {
        return this._payload.returnValue;
    },

    /**
     * @return {string}
     */
    get functionName()
    {
        return this._payload.functionName;
    },

    /**
     * @return {!WebInspector.DebuggerModel.Location}
     */
    get location()
    {
        var rawLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (this._payload.location);
        return rawLocation;
    },

    /**
     * @return {boolean}
     */
    isAsync: function()
    {
        return !!this._isAsync;
    },

    /**
     * @param {string} code
     * @param {string} objectGroup
     * @param {boolean} includeCommandLineAPI
     * @param {boolean} doNotPauseOnExceptionsAndMuteConsole
     * @param {boolean} returnByValue
     * @param {boolean} generatePreview
     * @param {function(?RuntimeAgent.RemoteObject, boolean=)=} callback
     */
    evaluate: function(code, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {boolean=} wasThrown
         */
        function didEvaluateOnCallFrame(error, result, wasThrown)
        {
            if (error) {
                console.error(error);
                callback(null, false);
                return;
            }
            callback(result, wasThrown);
        }
        this._debuggerAgent.evaluateOnCallFrame(this._payload.callFrameId, code, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, didEvaluateOnCallFrame);
    },

    /**
     * @param {function(?Protocol.Error=)=} callback
     */
    restart: function(callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<!DebuggerAgent.CallFrame>=} callFrames
         * @param {!Object=} details
         * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
         * @this {WebInspector.DebuggerModel.CallFrame}
         */
        function protocolCallback(error, callFrames, details, asyncStackTrace)
        {
            if (!error)
                this._debuggerModel.callStackModified(callFrames, details, asyncStackTrace);
            if (callback)
                callback(error);
        }
        this._debuggerAgent.restartFrame(this._payload.callFrameId, protocolCallback.bind(this));
    },

    /**
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.LiveLocation}
     */
    createLiveLocation: function(updateDelegate)
    {
        var location = this._script.createLiveLocation(this.location, updateDelegate);
        this._locations.push(location);
        return location;
    },

    dispose: function()
    {
        for (var i = 0; i < this._locations.length; ++i)
            this._locations[i].dispose();
        this._locations = [];
    }
}

/**
 * @constructor
 * @param {!Array.<!WebInspector.DebuggerModel.CallFrame>} callFrames
 * @param {?WebInspector.DebuggerModel.StackTrace} asyncStackTrace
 * @param {string=} description
 */
WebInspector.DebuggerModel.StackTrace = function(callFrames, asyncStackTrace, description)
{
    this.callFrames = callFrames;
    this.asyncStackTrace = asyncStackTrace;
    this.description = description;
}

/**
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!DebuggerAgent.StackTrace=} payload
 * @param {boolean=} isAsync
 * @return {?WebInspector.DebuggerModel.StackTrace}
 */
WebInspector.DebuggerModel.StackTrace.fromPayload = function(debuggerModel, payload, isAsync)
{
    if (!payload)
        return null;
    var callFrames = WebInspector.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, payload.callFrames, isAsync);
    if (!callFrames.length)
        return null;
    var asyncStackTrace = WebInspector.DebuggerModel.StackTrace.fromPayload(debuggerModel, payload.asyncStackTrace, true);
    return new WebInspector.DebuggerModel.StackTrace(callFrames, asyncStackTrace, payload.description);
}

WebInspector.DebuggerModel.StackTrace.prototype = {
    dispose: function()
    {
        for (var i = 0; i < this.callFrames.length; ++i)
            this.callFrames[i].dispose();
        if (this.asyncStackTrace)
            this.asyncStackTrace.dispose();
    }
}

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
 * @param {string} reason
 * @param {!Object|undefined} auxData
 * @param {!Array.<string>} breakpointIds
 * @param {!DebuggerAgent.StackTrace=} asyncStackTrace
 */
WebInspector.DebuggerPausedDetails = function(debuggerModel, callFrames, reason, auxData, breakpointIds, asyncStackTrace)
{
    this.callFrames = WebInspector.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames);
    this.reason = reason;
    this.auxData = auxData;
    this.breakpointIds = breakpointIds;
    this.asyncStackTrace = WebInspector.DebuggerModel.StackTrace.fromPayload(debuggerModel, asyncStackTrace, true);
}

WebInspector.DebuggerPausedDetails.prototype = {
    dispose: function()
    {
        for (var i = 0; i < this.callFrames.length; ++i)
            this.callFrames[i].dispose();
        if (this.asyncStackTrace)
            this.asyncStackTrace.dispose();
    }
}

/**
 * @type {!WebInspector.DebuggerModel}
 */
WebInspector.debuggerModel;
