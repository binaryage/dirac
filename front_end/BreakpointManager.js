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
 * @param {!WebInspector.Setting} breakpointStorage
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.BreakpointManager = function(breakpointStorage, debuggerModel, workspace)
{
    this._storage = new WebInspector.BreakpointManager.Storage(this, breakpointStorage);
    this._debuggerModel = debuggerModel;
    this._workspace = workspace;

    this._breakpointForDebuggerId = {};
    this._breakpointsForUISourceCode = new Map();
    this._breakpointsForPrimaryUISourceCode = new Map();
    this._sourceFilesWithRestoredBreakpoints = {};

    this._debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.BreakpointResolved, this._breakpointResolved, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
}

WebInspector.BreakpointManager.Events = {
    BreakpointAdded: "breakpoint-added",
    BreakpointRemoved: "breakpoint-removed"
}

WebInspector.BreakpointManager._sourceFileId = function(uiSourceCode)
{
    if (!uiSourceCode.url)
        return "";
    var deobfuscatedPrefix = uiSourceCode.formatted() ? "deobfuscated:" : "";
    return deobfuscatedPrefix + uiSourceCode.uri();
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
     * @param {string} sourceFileId
     */
    _provisionalBreakpointsForSourceFileId: function(sourceFileId)
    {
        var result = new StringMap();
        for (var debuggerId in this._breakpointForDebuggerId) {
            var breakpoint = this._breakpointForDebuggerId[debuggerId];
            if (breakpoint._sourceFileId === sourceFileId)
                result.put(breakpoint._breakpointStorageId(), breakpoint);
        }
        return result;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _restoreBreakpoints: function(uiSourceCode)
    {
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        if (!sourceFileId || this._sourceFilesWithRestoredBreakpoints[sourceFileId])
            return;
        this._sourceFilesWithRestoredBreakpoints[sourceFileId] = true;

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
                provisionalBreakpoint._updateInDebugger();
            } else {
                this._innerSetBreakpoint(uiSourceCode, breakpointItem.lineNumber, breakpointItem.columnNumber, breakpointItem.condition, breakpointItem.enabled);
            }
        }
        this._storage.unmute();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._restoreBreakpoints(uiSourceCode);
        if (uiSourceCode.contentType() === WebInspector.resourceTypes.Script || uiSourceCode.contentType() === WebInspector.resourceTypes.Document) {
            uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.SourceMappingChanged, this._uiSourceCodeMappingChanged, this);
            uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._uiSourceCodeFormatted, this);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeFormatted: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
        this._restoreBreakpoints(uiSourceCode);
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
        var breakpoints = this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [];
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i]._updateInDebugger();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeUISourceCode: function(uiSourceCode)
    {
        var breakpoints = this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [];
        for (var i = 0; i < breakpoints.length; ++i)
            breakpoints[i]._resetLocations();
        var sourceFileId = WebInspector.BreakpointManager._sourceFileId(uiSourceCode);
        delete this._sourceFilesWithRestoredBreakpoints[sourceFileId];
        uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.FormattedChanged, this._uiSourceCodeFormatted, this);
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
        this._debuggerModel.setBreakpointsActive(true);
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
            breakpoint._updateBreakpoint(condition, enabled);
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
                    var uiLocation = new WebInspector.UILocation(uiSourceCode, lineNumber, columnNumber);
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

    removeProvisionalBreakpoints: function()
    {
        for (var debuggerId in this._breakpointForDebuggerId)
            this._debuggerModel.removeBreakpoint(debuggerId);
    },

    _projectWillReset: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        var uiSourceCodes = project.uiSourceCodes();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            this._removeUISourceCode(uiSourceCodes[i]);
    },

    _breakpointResolved: function(event)
    {
        var breakpointId = /** @type {!DebuggerAgent.BreakpointId} */ (event.data.breakpointId);
        var location = /** @type {!WebInspector.DebuggerModel.Location} */ (event.data.location);
        var breakpoint = this._breakpointForDebuggerId[breakpointId];
        if (!breakpoint)
            return;
        breakpoint._addResolvedLocation(location);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {boolean} removeFromStorage
     */
    _removeBreakpoint: function(breakpoint, removeFromStorage)
    {
        var uiSourceCode = breakpoint.uiSourceCode();
        var breakpoints = uiSourceCode ? this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [] : [];
        var index = breakpoints.indexOf(breakpoint);
        if (index > -1)
            breakpoints.splice(index, 1);
        console.assert(!breakpoint._debuggerId)
        if (removeFromStorage)
            this._storage._removeBreakpoint(breakpoint);
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

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
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
    /** @type {!Array.<!WebInspector.Script.Location>} */
    this._liveLocations = [];
    /** @type {!Object.<string, !WebInspector.UILocation>} */
    this._uiLocations = {};

    // Force breakpoint update.
    /** @type {string} */ this._condition;
    /** @type {boolean} */ this._enabled;
    this._updateBreakpoint(condition, enabled);
}

WebInspector.BreakpointManager.Breakpoint.prototype = {
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
     * @param {!WebInspector.DebuggerModel.Location} location
     */
    _addResolvedLocation: function(location)
    {
        this._liveLocations.push(this._breakpointManager._debuggerModel.createLiveLocation(location, this._locationUpdated.bind(this, location)));
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @param {!WebInspector.UILocation} uiLocation
     */
    _locationUpdated: function(location, uiLocation)
    {
        var stringifiedLocation = location.scriptId + ":" + location.lineNumber + ":" + location.columnNumber;
        var oldUILocation = /** @type {!WebInspector.UILocation} */ (this._uiLocations[stringifiedLocation]);
        if (oldUILocation)
            this._breakpointManager._uiLocationRemoved(this, oldUILocation);
        if (this._uiLocations[""]) {
            var defaultLocation = this._uiLocations[""];
            delete this._uiLocations[""];
            this._breakpointManager._uiLocationRemoved(this, defaultLocation);
        }
        this._uiLocations[stringifiedLocation] = uiLocation;
        this._breakpointManager._uiLocationAdded(this, uiLocation);
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
        this._updateBreakpoint(this._condition, enabled);
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
        this._updateBreakpoint(condition, this._enabled);
    },

    /**
     * @param {string} condition
     * @param {boolean} enabled
     */
    _updateBreakpoint: function(condition, enabled)
    {
        if (this._enabled === enabled && this._condition === condition)
            return;
        this._removeFromDebugger();
        this._enabled = enabled;
        this._condition = condition;
        this._breakpointManager._storage._updateBreakpoint(this);
        this._fakeBreakpointAtPrimaryLocation();
        this._updateInDebugger();
    },

    _updateInDebugger: function()
    {
        var uiSourceCode = this.uiSourceCode();
        if (!uiSourceCode || !uiSourceCode.hasSourceMapping())
            return;
        var scriptFile = uiSourceCode && uiSourceCode.scriptFile();
        if (this._enabled && !(scriptFile && scriptFile.hasDivergedFromVM()))
            this._setInDebugger();
    },

    /**
     * @param {boolean=} keepInStorage
     */
    remove: function(keepInStorage)
    {
        var removeFromStorage = !keepInStorage;
        this._resetLocations();
        this._removeFromDebugger();
        this._breakpointManager._removeBreakpoint(this, removeFromStorage);
    },

    _setInDebugger: function()
    {
        this._removeFromDebugger();
        var uiSourceCode = this._breakpointManager._workspace.uiSourceCode(this._projectId, this._path);
        if (!uiSourceCode)
            return;
        var rawLocation = uiSourceCode.uiLocationToRawLocation(this._lineNumber, this._columnNumber);
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
        if (debuggerModelLocation)
            this._breakpointManager._debuggerModel.setBreakpointByScriptLocation(debuggerModelLocation, this._condition, this._didSetBreakpointInDebugger.bind(this));
        else if (uiSourceCode.url)
            this._breakpointManager._debuggerModel.setBreakpointByURL(uiSourceCode.url, this._lineNumber, this._columnNumber, this._condition, this._didSetBreakpointInDebugger.bind(this));
    },

    /**
    * @this {WebInspector.BreakpointManager.Breakpoint}
    * @param {?DebuggerAgent.BreakpointId} breakpointId
    * @param {!Array.<!WebInspector.DebuggerModel.Location>} locations
    */
    _didSetBreakpointInDebugger: function(breakpointId, locations)
    {
        if (!breakpointId) {
            this._resetLocations();
            this._breakpointManager._removeBreakpoint(this, false);
            return;
        }

        this._debuggerId = breakpointId;
        this._breakpointManager._breakpointForDebuggerId[breakpointId] = this;

        if (!locations.length) {
            this._fakeBreakpointAtPrimaryLocation();
            return;
        }

        this._resetLocations();
        for (var i = 0; i < locations.length; ++i) {
            var script = this._breakpointManager._debuggerModel.scriptForId(locations[i].scriptId);
            var uiLocation = script.rawLocationToUILocation(locations[i].lineNumber, locations[i].columnNumber);
            if (this._breakpointManager.findBreakpoint(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber)) {
                // location clash
                this.remove();
                return;
            }
        }

        for (var i = 0; i < locations.length; ++i)
            this._addResolvedLocation(locations[i]);
    },

    _removeFromDebugger: function()
    {
        if (!this._debuggerId)
            return;
        this._breakpointManager._debuggerModel.removeBreakpoint(this._debuggerId);
        delete this._breakpointManager._breakpointForDebuggerId[this._debuggerId];
        delete this._debuggerId;
    },

    _resetLocations: function()
    {
        for (var stringifiedLocation in this._uiLocations)
            this._breakpointManager._uiLocationRemoved(this, this._uiLocations[stringifiedLocation]);
        for (var i = 0; i < this._liveLocations.length; ++i)
            this._liveLocations[i].dispose();
        this._liveLocations = [];
        this._uiLocations = {};
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
        this._resetLocations();
        var uiSourceCode = this._breakpointManager._workspace.uiSourceCode(this._projectId, this._path);
        if (!uiSourceCode)
            return;
        var uiLocation = new WebInspector.UILocation(uiSourceCode, this._lineNumber, this._columnNumber);
        this._uiLocations[""] = uiLocation;
        this._breakpointManager._uiLocationAdded(this, uiLocation);
    }
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
