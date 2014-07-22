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
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.Setting} breakpointStorage
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.TargetManager} targetManager
 */
WebInspector.BreakpointManager = function(breakpointStorage, workspace, targetManager)
{
    this._storage = new WebInspector.BreakpointManager.Storage(this, breakpointStorage);
    this._workspace = workspace;
    this._targetManager = targetManager;

    this._breakpointsActive = true;
    this._breakpointsForUISourceCode = new Map();
    this._breakpointsForPrimaryUISourceCode = new Map();
    /** @type {!StringMultimap.<!WebInspector.BreakpointManager.Breakpoint>} */
    this._provisionalBreakpoints = new StringMultimap();

    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
}

WebInspector.BreakpointManager.Events = {
    BreakpointAdded: "breakpoint-added",
    BreakpointRemoved: "breakpoint-removed",
    BreakpointsActiveStateChanged: "BreakpointsActiveStateChanged"
}

WebInspector.BreakpointManager._sourceFileId = function(uiSourceCode)
{
    if (!uiSourceCode.url)
        return "";
    return uiSourceCode.uri();
}

/**
 * @param {string} sourceFileId
 * @param {number} lineNumber
 * @param {number} columnNumber
 * @return {string}
 */
WebInspector.BreakpointManager._breakpointStorageId = function(sourceFileId, lineNumber, columnNumber)
{
    if (!sourceFileId)
        return "";
    return sourceFileId + ":" + lineNumber + ":" + columnNumber;
}

WebInspector.BreakpointManager.prototype = {

    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target) {
        if (!this._breakpointsActive)
            target.debuggerAgent().setBreakpointsActive(this._breakpointsActive);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target) { },


    /**
     * @param {string} sourceFileId
     * @return {!StringMap.<!WebInspector.BreakpointManager.Breakpoint>}
     */
    _provisionalBreakpointsForSourceFileId: function(sourceFileId)
    {
        var result = new StringMap();
        var breakpoints = this._provisionalBreakpoints.get(sourceFileId).values();
        for (var i = 0; i < breakpoints.length; ++i)
            result.put(breakpoints[i]._breakpointStorageId(), breakpoints[i]);
        return result;
    },

    removeProvisionalBreakpointsForTest: function()
    {
        var breakpoints = this._provisionalBreakpoints.values();
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i].remove();
        this._provisionalBreakpoints.clear();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _restoreBreakpoints: function(uiSourceCode)
    {
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        if (!sourceFileId)
            return;

        this._storage.mute();
        var breakpointItems = this._storage.breakpointItems(uiSourceCode);
        var provisionalBreakpoints = this._provisionalBreakpointsForSourceFileId(sourceFileId);
        for (var i = 0; i < breakpointItems.length; ++i) {
            var breakpointItem = breakpointItems[i];
            var itemStorageId = WebInspector.BreakpointManager._breakpointStorageId(breakpointItem.sourceFileId, breakpointItem.lineNumber, breakpointItem.columnNumber);
            var provisionalBreakpoint = provisionalBreakpoints.get(itemStorageId);
            if (provisionalBreakpoint) {
                if (!this._breakpointsForPrimaryUISourceCode.get(uiSourceCode))
                    this._breakpointsForPrimaryUISourceCode.put(uiSourceCode, []);
                this._breakpointsForPrimaryUISourceCode.get(uiSourceCode).push(provisionalBreakpoint);
                provisionalBreakpoint._updateBreakpoint();
            } else {
                this._innerSetBreakpoint(uiSourceCode, breakpointItem.lineNumber, breakpointItem.columnNumber, breakpointItem.condition, breakpointItem.enabled);
            }
        }
        this._provisionalBreakpoints.removeAll(sourceFileId);
        this._storage.unmute();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._restoreBreakpoints(uiSourceCode);
        if (uiSourceCode.contentType() === WebInspector.resourceTypes.Script || uiSourceCode.contentType() === WebInspector.resourceTypes.Document)
            uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged, this._uiSourceCodeMappingChanged, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._removeUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeMappingChanged: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
        var isIdentity = /** @type {boolean} */ (event.data.isIdentity);
        var target = /** @type {!WebInspector.Target} */ (event.data.target);
        if (isIdentity)
            return;
        var breakpoints = this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [];
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i]._updateInDebuggerForTarget(target);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeUISourceCode: function(uiSourceCode)
    {
        var breakpoints = this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [];
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        for (var i = 0; i < breakpoints.length; ++i) {
            breakpoints[i]._resetLocations();
            if (breakpoints[i].enabled())
                this._provisionalBreakpoints.put(sourceFileId, breakpoints[i]);
        }
        uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged, this._uiSourceCodeMappingChanged, this);
        this._breakpointsForPrimaryUISourceCode.remove(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @param {string} condition
     * @param {boolean} enabled
     * @return {!WebInspector.BreakpointManager.Breakpoint}
     */
    setBreakpoint: function(uiSourceCode, lineNumber, columnNumber, condition, enabled)
    {
        this.setBreakpointsActive(true);
        return this._innerSetBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @param {string} condition
     * @param {boolean} enabled
     * @return {!WebInspector.BreakpointManager.Breakpoint}
     */
    _innerSetBreakpoint: function(uiSourceCode, lineNumber, columnNumber, condition, enabled)
    {
        var breakpoint = this.findBreakpoint(uiSourceCode, lineNumber, columnNumber);
        if (breakpoint) {
            breakpoint._updateState(condition, enabled);
            return breakpoint;
        }
        var projectId = uiSourceCode.project().id();
        var path = uiSourceCode.path();
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        breakpoint = new WebInspector.BreakpointManager.Breakpoint(this, projectId, path, sourceFileId, lineNumber, columnNumber, condition, enabled);
        if (!this._breakpointsForPrimaryUISourceCode.get(uiSourceCode))
            this._breakpointsForPrimaryUISourceCode.put(uiSourceCode, []);
        this._breakpointsForPrimaryUISourceCode.get(uiSourceCode).push(breakpoint);
        return breakpoint;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.BreakpointManager.Breakpoint}
     */
    findBreakpoint: function(uiSourceCode, lineNumber, columnNumber)
    {
        var breakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
        var lineBreakpoints = breakpoints ? breakpoints.get(String(lineNumber)) : null;
        var columnBreakpoints = lineBreakpoints ? lineBreakpoints.get(String(columnNumber)) : null;
        return columnBreakpoints ? columnBreakpoints[0] : null;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {?WebInspector.BreakpointManager.Breakpoint}
     */
    findBreakpointOnLine: function(uiSourceCode, lineNumber)
    {
        var breakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
        var lineBreakpoints = breakpoints ? breakpoints.get(String(lineNumber)) : null;
        return lineBreakpoints ? lineBreakpoints.values()[0][0] : null;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!WebInspector.BreakpointManager.Breakpoint>}
     */
    breakpointsForUISourceCode: function(uiSourceCode)
    {
        var result = [];
        var uiSourceCodeBreakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
        var breakpoints = uiSourceCodeBreakpoints ? uiSourceCodeBreakpoints.values() : [];
        for (var i = 0; i < breakpoints.length; ++i) {
            var lineBreakpoints = breakpoints[i];
            var columnBreakpointArrays = lineBreakpoints ? lineBreakpoints.values() : [];
            result = result.concat.apply(result, columnBreakpointArrays);
        }
        return result;
    },

    /**
     * @return {!Array.<!WebInspector.BreakpointManager.Breakpoint>}
     */
    allBreakpoints: function()
    {
        var result = [];
        var uiSourceCodes = this._breakpointsForUISourceCode.keys();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            result = result.concat(this.breakpointsForUISourceCode(uiSourceCodes[i]));
        return result;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!{breakpoint: !WebInspector.BreakpointManager.Breakpoint, uiLocation: !WebInspector.UILocation}>}
     */
    breakpointLocationsForUISourceCode: function(uiSourceCode)
    {
        var uiSourceCodeBreakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
        var lineNumbers = uiSourceCodeBreakpoints ? uiSourceCodeBreakpoints.keys() : [];
        var result = [];
        for (var i = 0; i < lineNumbers.length; ++i) {
            var lineBreakpoints = uiSourceCodeBreakpoints.get(lineNumbers[i]);
            var columnNumbers = lineBreakpoints.keys();
            for (var j = 0; j < columnNumbers.length; ++j) {
                var columnBreakpoints = lineBreakpoints.get(columnNumbers[j]);
                var lineNumber = parseInt(lineNumbers[i], 10);
                var columnNumber = parseInt(columnNumbers[j], 10);
                for (var k = 0; k < columnBreakpoints.length; ++k) {
                    var breakpoint = columnBreakpoints[k];
                    var uiLocation = uiSourceCode.uiLocation(lineNumber, columnNumber);
                    result.push({breakpoint: breakpoint, uiLocation: uiLocation});
                }
            }
        }
        return result;
    },

    /**
     * @return {!Array.<!{breakpoint: !WebInspector.BreakpointManager.Breakpoint, uiLocation: !WebInspector.UILocation}>}
     */
    allBreakpointLocations: function()
    {
        var result = [];
        var uiSourceCodes = this._breakpointsForUISourceCode.keys();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            result = result.concat(this.breakpointLocationsForUISourceCode(uiSourceCodes[i]));
        return result;
    },

    /**
     * @param {boolean} toggleState
     */
    toggleAllBreakpoints: function(toggleState)
    {
        var breakpoints = this.allBreakpoints();
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i].setEnabled(toggleState);
    },

    removeAllBreakpoints: function()
    {
        var breakpoints = this.allBreakpoints();
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i].remove();
    },

    _projectRemoved: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        var uiSourceCodes = project.uiSourceCodes();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            this._removeUISourceCode(uiSourceCodes[i]);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {boolean} removeFromStorage
     */
    _removeBreakpoint: function(breakpoint, removeFromStorage)
    {
        var uiSourceCode = breakpoint.uiSourceCode();
        var breakpoints = uiSourceCode ? this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [] : [];
        breakpoints.remove(breakpoint);
        if (removeFromStorage)
            this._storage._removeBreakpoint(breakpoint);
        this._provisionalBreakpoints.remove(breakpoint._sourceFileId, breakpoint);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!WebInspector.UILocation} uiLocation
     */
    _uiLocationAdded: function(breakpoint, uiLocation)
    {
        var breakpoints = this._breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
        if (!breakpoints) {
            breakpoints = new StringMap();
            this._breakpointsForUISourceCode.put(uiLocation.uiSourceCode, breakpoints);
        }
        var lineBreakpoints = breakpoints.get(String(uiLocation.lineNumber));
        if (!lineBreakpoints) {
            lineBreakpoints = new StringMap();
            breakpoints.put(String(uiLocation.lineNumber), lineBreakpoints);
        }
        var columnBreakpoints = lineBreakpoints.get(String(uiLocation.columnNumber));
        if (!columnBreakpoints) {
            columnBreakpoints = [];
            lineBreakpoints.put(String(uiLocation.columnNumber), columnBreakpoints);
        }
        columnBreakpoints.push(breakpoint);
        this.dispatchEventToListeners(WebInspector.BreakpointManager.Events.BreakpointAdded, {breakpoint: breakpoint, uiLocation: uiLocation});
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!WebInspector.UILocation} uiLocation
     */
    _uiLocationRemoved: function(breakpoint, uiLocation)
    {
        var breakpoints = this._breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
        if (!breakpoints)
            return;

        var lineBreakpoints = breakpoints.get(String(uiLocation.lineNumber));
        if (!lineBreakpoints)
            return;
        var columnBreakpoints = lineBreakpoints.get(String(uiLocation.columnNumber));
        if (!columnBreakpoints)
            return;
        columnBreakpoints.remove(breakpoint);
        if (!columnBreakpoints.length)
            lineBreakpoints.remove(String(uiLocation.columnNumber));
        if (!lineBreakpoints.size())
            breakpoints.remove(String(uiLocation.lineNumber));
        if (!breakpoints.size())
            this._breakpointsForUISourceCode.remove(uiLocation.uiSourceCode);
        this.dispatchEventToListeners(WebInspector.BreakpointManager.Events.BreakpointRemoved, {breakpoint: breakpoint, uiLocation: uiLocation});
    },

    /**
     * @param {boolean} active
     */
    setBreakpointsActive: function(active)
    {
        if (this._breakpointsActive === active)
            return;

        this._breakpointsActive = active;
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].debuggerAgent().setBreakpointsActive(active);

        this.dispatchEventToListeners(WebInspector.BreakpointManager.Events.BreakpointsActiveStateChanged, active);
    },

    /**
     * @return {boolean}
     */
    breakpointsActive: function()
    {
        return this._breakpointsActive;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.BreakpointManager} breakpointManager
 * @param {string} projectId
 * @param {string} path
 * @param {string} sourceFileId
 * @param {number} lineNumber
 * @param {number} columnNumber
 * @param {string} condition
 * @param {boolean} enabled
 */
WebInspector.BreakpointManager.Breakpoint = function(breakpointManager, projectId, path, sourceFileId, lineNumber, columnNumber, condition, enabled)
{
    this._breakpointManager = breakpointManager;
    this._projectId = projectId;
    this._path = path;
    this._lineNumber = lineNumber;
    this._columnNumber = columnNumber;
    this._sourceFileId = sourceFileId;

    /** @type {!Object.<string, number>} */
    this._numberOfDebuggerLocationForUILocation = {};

    // Force breakpoint update.
    /** @type {string} */ this._condition;
    /** @type {boolean} */ this._enabled;
    /** @type {boolean} */ this._isRemoved;
    /** @type {!WebInspector.UILocation|undefined} */ this._fakePrimaryLocation;

    /** @type {!Map.<!WebInspector.Target, !WebInspector.BreakpointManager.TargetBreakpoint>}*/
    this._targetBreakpoints = new Map();
    this._updateState(condition, enabled);
    this._breakpointManager._targetManager.observeTargets(this);
}

WebInspector.BreakpointManager.Breakpoint.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        this._targetBreakpoints.put(target, new WebInspector.BreakpointManager.TargetBreakpoint(target, this));
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var targetBreakpoint = this._targetBreakpoints.remove(target);
        targetBreakpoint._cleanUpAfterDebuggerIsGone();
        targetBreakpoint._removeEventListeners();
    },

    /**
     * @return {string}
     */
    projectId: function()
    {
        return this._projectId;
    },

    /**
     * @return {string}
     */
    path: function()
    {
        return this._path;
    },

    /**
     * @return {number}
     */
    lineNumber: function()
    {
        return this._lineNumber;
    },

    /**
     * @return {number}
     */
    columnNumber: function()
    {
        return this._columnNumber;
    },

    /**
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCode: function()
    {
        return this._breakpointManager._workspace.uiSourceCode(this._projectId, this._path);
    },

    /**
     * @param {?WebInspector.UILocation} oldUILocation
     * @param {!WebInspector.UILocation} newUILocation
     */
    _replaceUILocation: function(oldUILocation, newUILocation)
    {
        if (this._isRemoved)
            return;

        this._removeUILocation(oldUILocation, true);
        this._removeFakeBreakpointAtPrimaryLocation();

        if (!this._numberOfDebuggerLocationForUILocation[newUILocation.id()])
            this._numberOfDebuggerLocationForUILocation[newUILocation.id()] = 0;

        if (++this._numberOfDebuggerLocationForUILocation[newUILocation.id()] === 1)
            this._breakpointManager._uiLocationAdded(this, newUILocation);
    },

    /**
     * @param {?WebInspector.UILocation} uiLocation
     * @param {boolean=} muteCreationFakeBreakpoint
     */
    _removeUILocation: function(uiLocation, muteCreationFakeBreakpoint)
    {
        if (!uiLocation || --this._numberOfDebuggerLocationForUILocation[uiLocation.id()] !== 0)
            return;

        delete this._numberOfDebuggerLocationForUILocation[uiLocation.id()];
        this._breakpointManager._uiLocationRemoved(this, uiLocation);
        if (!muteCreationFakeBreakpoint)
            this._fakeBreakpointAtPrimaryLocation();
    },

    /**
     * @return {boolean}
     */
    enabled: function()
    {
        return this._enabled;
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        this._updateState(this._condition, enabled);
    },

    /**
     * @return {string}
     */
    condition: function()
    {
        return this._condition;
    },

    /**
     * @param {string} condition
     */
    setCondition: function(condition)
    {
        this._updateState(condition, this._enabled);
    },

    /**
     * @param {string} condition
     * @param {boolean} enabled
     */
    _updateState: function(condition, enabled)
    {
        if (this._enabled === enabled && this._condition === condition)
            return;
        this._enabled = enabled;
        this._condition = condition;
        this._breakpointManager._storage._updateBreakpoint(this);
        this._updateBreakpoint();
    },

    _updateBreakpoint: function()
    {
        this._removeFakeBreakpointAtPrimaryLocation();
        this._fakeBreakpointAtPrimaryLocation();
        var targetBreakpoints = this._targetBreakpoints.values();
        for (var i = 0; i < targetBreakpoints.length; ++i)
            targetBreakpoints[i]._updateInDebugger();
    },

    /**
     * @param {boolean=} keepInStorage
     */
    remove: function(keepInStorage)
    {
        this._isRemoved = true;
        var removeFromStorage = !keepInStorage;
        this._removeFakeBreakpointAtPrimaryLocation();
        var targetBreakpoints = this._targetBreakpoints.values();
        for (var i = 0; i < targetBreakpoints.length; ++i) {
            targetBreakpoints[i]._removeFromDebugger();
            targetBreakpoints[i]._removeEventListeners();
        }

        this._breakpointManager._removeBreakpoint(this, removeFromStorage);
        this._breakpointManager._targetManager.unobserveTargets(this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _updateInDebuggerForTarget: function(target)
    {
        this._targetBreakpoints.get(target)._updateInDebugger();
    },

    /**
     * @return {string}
     */
    _breakpointStorageId: function()
    {
        return WebInspector.BreakpointManager._breakpointStorageId(this._sourceFileId, this._lineNumber, this._columnNumber);
    },

    _fakeBreakpointAtPrimaryLocation: function()
    {
        if (this._isRemoved || !Object.isEmpty(this._numberOfDebuggerLocationForUILocation) || this._fakePrimaryLocation)
            return;

        var uiSourceCode = this._breakpointManager._workspace.uiSourceCode(this._projectId, this._path);
        if (!uiSourceCode)
            return;

        this._fakePrimaryLocation = uiSourceCode.uiLocation(this._lineNumber, this._columnNumber);
        this._breakpointManager._uiLocationAdded(this, this._fakePrimaryLocation);
    },

    _removeFakeBreakpointAtPrimaryLocation: function()
    {
        if (this._fakePrimaryLocation) {
            this._breakpointManager._uiLocationRemoved(this, this._fakePrimaryLocation);
            delete this._fakePrimaryLocation;
        }
    },

    _resetLocations: function()
    {
        this._removeFakeBreakpointAtPrimaryLocation();
        var targetBreakpoints = this._targetBreakpoints.values();
        for (var i = 0; i < targetBreakpoints.length; ++i)
            targetBreakpoints[i]._resetLocations();
    }
}

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
 */
WebInspector.BreakpointManager.TargetBreakpoint = function(target, breakpoint)
{
    WebInspector.SDKObject.call(this, target);
    this._breakpoint = breakpoint;
    /** @type {!Array.<!WebInspector.Script.Location>} */
    this._liveLocations = [];

    /** @type {!Object.<string, !WebInspector.UILocation>} */
    this._uiLocations = {};
    target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled, this._cleanUpAfterDebuggerIsGone, this);
    target.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled, this._updateInDebugger, this);
    if (target.debuggerModel.debuggerEnabled())
        this._updateInDebugger();
}

WebInspector.BreakpointManager.TargetBreakpoint.prototype = {

    _resetLocations: function()
    {
        var uiLocations = Object.values(this._uiLocations);
        for (var i = 0; i < uiLocations.length; ++i)
            this._breakpoint._removeUILocation(uiLocations[i]);

        this._uiLocations = {};

        for (var i = 0; i < this._liveLocations.length; ++i)
            this._liveLocations[i].dispose();
        this._liveLocations = [];
    },

    /**
     * @param {boolean=} callbackImmediately
     */
    _removeFromDebugger: function(callbackImmediately)
    {
        this._resetLocations();
        if (!this._debuggerId)
            return;
        var debuggerId = this._debuggerId;
        this.target().debuggerModel.removeBreakpoint(this._debuggerId, callbackImmediately ? undefined : didRemoveFromDebugger.bind(this));

        /**
         * @this {WebInspector.BreakpointManager.TargetBreakpoint}
         */
        function didRemoveFromDebugger()
        {
            if (this._debuggerId === debuggerId)
                this._didRemoveFromDebugger();
        }
        if (callbackImmediately)
            this._didRemoveFromDebugger();
    },

    _updateInDebugger: function()
    {
        this._removeFromDebugger();
        var uiSourceCode = this._breakpoint.uiSourceCode();
        if (!uiSourceCode || !this._breakpoint._enabled)
            return;
        var scriptFile = uiSourceCode.scriptFileForTarget(this.target());
        if (scriptFile && scriptFile.hasDivergedFromVM())
            return;

        var lineNumber = this._breakpoint._lineNumber;
        var columnNumber = this._breakpoint._columnNumber;
        var debuggerModelLocation = WebInspector.debuggerWorkspaceBinding.uiLocationToRawLocation(this.target(), uiSourceCode, lineNumber, columnNumber);
        var condition = this._breakpoint.condition();
        if (debuggerModelLocation)
            this.target().debuggerModel.setBreakpointByScriptLocation(debuggerModelLocation, condition, this._didSetBreakpointInDebugger.bind(this));
        else if (uiSourceCode.url)
            this.target().debuggerModel.setBreakpointByURL(uiSourceCode.url, lineNumber, columnNumber, condition, this._didSetBreakpointInDebugger.bind(this));
    },

    /**
     * @param {?DebuggerAgent.BreakpointId} breakpointId
     * @param {!Array.<!WebInspector.DebuggerModel.Location>} locations
     */
    _didSetBreakpointInDebugger: function(breakpointId, locations)
    {
        if (!breakpointId) {
            this._breakpoint.remove(true);
            return;
        }

        if (this._debuggerId)
            this._removeFromDebugger(true);

        this._debuggerId = breakpointId;
        this.target().debuggerModel.addBreakpointListener(this._debuggerId, this._breakpointResolved, this);
        for (var i = 0; i < locations.length; ++i)
            if (!this._addResolvedLocation(locations[i]))
                return;
    },

    _didRemoveFromDebugger: function()
    {
        this._resetLocations();
        this.target().debuggerModel.removeBreakpointListener(this._debuggerId, this._breakpointResolved, this);
        delete this._debuggerId;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _breakpointResolved: function(event)
    {
        this._addResolvedLocation(/** @type {!WebInspector.DebuggerModel.Location}*/ (event.data));
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @param {!WebInspector.UILocation} uiLocation
     */
    _locationUpdated: function(location, uiLocation)
    {
        var oldUILocation = this._uiLocations[location.id()] || null;
        this._uiLocations[location.id()] = uiLocation;
        this._breakpoint._replaceUILocation(oldUILocation, uiLocation);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @return {boolean}
     */
    _addResolvedLocation: function(location)
    {
        var uiLocation = WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(location);
        var breakpoint = this._breakpoint._breakpointManager.findBreakpoint(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
        if (breakpoint && breakpoint !== this._breakpoint) {
            // location clash
            this._breakpoint.remove();
            return false;
        }
        this._liveLocations.push(WebInspector.debuggerWorkspaceBinding.createLiveLocation(location, this._locationUpdated.bind(this, location)));
        return true;
    },

    _cleanUpAfterDebuggerIsGone: function()
    {
        this._resetLocations();
        if (this._debuggerId)
            this._didRemoveFromDebugger();
    },

    _removeEventListeners: function()
    {
        this.target().debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerWasDisabled, this._cleanUpAfterDebuggerIsGone, this);
        this.target().debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerWasEnabled, this._updateInDebugger, this);
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @param {!WebInspector.BreakpointManager} breakpointManager
 * @param {!WebInspector.Setting} setting
 */
WebInspector.BreakpointManager.Storage = function(breakpointManager, setting)
{
    this._breakpointManager = breakpointManager;
    this._setting = setting;
    var breakpoints = this._setting.get();
    /** @type {!Object.<string, !WebInspector.BreakpointManager.Storage.Item>} */
    this._breakpoints = {};
    for (var i = 0; i < breakpoints.length; ++i) {
        var breakpoint = /** @type {!WebInspector.BreakpointManager.Storage.Item} */ (breakpoints[i]);
        breakpoint.columnNumber = breakpoint.columnNumber || 0;
        this._breakpoints[breakpoint.sourceFileId + ":" + breakpoint.lineNumber + ":" + breakpoint.columnNumber] = breakpoint;
    }
}

WebInspector.BreakpointManager.Storage.prototype = {
    mute: function()
    {
        this._muted = true;
    },

    unmute: function()
    {
        delete this._muted;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!WebInspector.BreakpointManager.Storage.Item>}
     */
    breakpointItems: function(uiSourceCode)
    {
        var result = [];
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        for (var id in this._breakpoints) {
            var breakpoint = this._breakpoints[id];
            if (breakpoint.sourceFileId === sourceFileId)
                result.push(breakpoint);
        }
        return result;
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     */
    _updateBreakpoint: function(breakpoint)
    {
        if (this._muted || !breakpoint._breakpointStorageId())
            return;
        this._breakpoints[breakpoint._breakpointStorageId()] = new WebInspector.BreakpointManager.Storage.Item(breakpoint);
        this._save();
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     */
    _removeBreakpoint: function(breakpoint)
    {
        if (this._muted)
            return;
        delete this._breakpoints[breakpoint._breakpointStorageId()];
        this._save();
    },

    _save: function()
    {
        var breakpointsArray = [];
        for (var id in this._breakpoints)
            breakpointsArray.push(this._breakpoints[id]);
        this._setting.set(breakpointsArray);
    }
}

/**
 * @constructor
 * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
 */
WebInspector.BreakpointManager.Storage.Item = function(breakpoint)
{
    this.sourceFileId = breakpoint._sourceFileId;
    this.lineNumber = breakpoint.lineNumber();
    this.columnNumber = breakpoint.columnNumber();
    this.condition = breakpoint.condition();
    this.enabled = breakpoint.enabled();
}

/** @type {!WebInspector.BreakpointManager} */
WebInspector.breakpointManager;
