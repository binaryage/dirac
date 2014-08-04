// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.TargetManager} targetManager
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkWorkspaceBinding} networkWorkspaceBinding
 */
WebInspector.DebuggerWorkspaceBinding = function(targetManager, workspace, networkWorkspaceBinding)
{
    this._workspace = workspace;
    this._networkWorkspaceBinding = networkWorkspaceBinding;

    /** @type {!Map.<!WebInspector.Target, !WebInspector.DebuggerWorkspaceBinding.TargetData>} */
    this._targetToData = new Map();
    targetManager.observeTargets(this);

    targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
}

WebInspector.DebuggerWorkspaceBinding.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        this._targetToData.put(target, new WebInspector.DebuggerWorkspaceBinding.TargetData(target, this));
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        this._targetToData.remove(target)._dispose();
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {!WebInspector.SourceMapping} sourceMapping
     */
    pushSourceMapping: function(script, sourceMapping)
    {
        var info = this._ensureInfoForScript(script);
        info._pushSourceMapping(sourceMapping);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!WebInspector.SourceMapping}
     */
    popSourceMapping: function(script)
    {
        var info = this._infoForScript(script.target(), script.scriptId);
        console.assert(info);
        return info._popSourceMapping();
    },

    /**
     * @param {!WebInspector.Script} script
     */
    updateLocations: function(script)
    {
        var info = this._infoForScript(script.target(), script.scriptId);
        if (info)
            info._updateLocations();
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.DebuggerWorkspaceBinding.Location}
     */
    createLiveLocation: function(rawLocation, updateDelegate)
    {
        var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
        console.assert(info);
        var location = new WebInspector.DebuggerWorkspaceBinding.Location(info._script, rawLocation, this, updateDelegate);
        info._addLocation(location);
        return location;
    },

    /**
     * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.DebuggerWorkspaceBinding.Location}
     */
    createCallFrameLiveLocation: function(callFrame, updateDelegate)
    {
        var target = callFrame.target();
        this._ensureInfoForScript(callFrame.script)
        var location = this.createLiveLocation(callFrame.location(), updateDelegate);
        this._registerCallFrameLiveLocation(target, location);
        return location;
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {!WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
        console.assert(info);
        return info._rawLocationToUILocation(rawLocation);
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(target, uiSourceCode, lineNumber, columnNumber)
    {
        return /** @type {!WebInspector.DebuggerModel.Location} */ (uiSourceCode.uiLocationToRawLocation(target, lineNumber, columnNumber));
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {?WebInspector.LiveEditSupport}
     */
    liveEditSupport: function(target)
    {
        var targetData = this._targetToData.get(target);
        return targetData ? targetData._liveEditSupport : null;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _globalObjectCleared: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._reset(debuggerModel.target());
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _reset: function(target)
    {
        var targetData = this._targetToData.get(target);
        targetData.callFrameLocations.values().forEach(function(location) { location.dispose(); });
        targetData.callFrameLocations.clear();
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!WebInspector.DebuggerWorkspaceBinding.ScriptInfo}
     */
    _ensureInfoForScript: function(script)
    {
        var scriptDataMap = this._targetToData.get(script.target()).scriptDataMap;
        var info = scriptDataMap.get(script.scriptId);
        if (!info) {
            info = new WebInspector.DebuggerWorkspaceBinding.ScriptInfo(script);
            scriptDataMap.put(script.scriptId, info);
        }
        return info;
    },


    /**
     * @param {!WebInspector.Target} target
     * @param {string} scriptId
     * @return {?WebInspector.DebuggerWorkspaceBinding.ScriptInfo}
     */
    _infoForScript: function(target, scriptId)
    {
        var data = this._targetToData.get(target);
        if (!data)
            return null;
        return data.scriptDataMap.get(scriptId) || null;
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.DebuggerWorkspaceBinding.Location} location
     */
    _registerCallFrameLiveLocation: function(target, location)
    {
        var locations = this._targetToData.get(target).callFrameLocations;
        locations.add(location);
    },

    /**
     * @param {!WebInspector.DebuggerWorkspaceBinding.Location} location
     */
    _removeLiveLocation: function(location)
    {
        var info = this._infoForScript(location._script.target(), location._script.scriptId);
        if (info)
            info._removeLocation(location);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerResumed: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._reset(debuggerModel.target());
    }
}

/**
 * @constructor
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 */
WebInspector.DebuggerWorkspaceBinding.TargetData = function(target, debuggerWorkspaceBinding)
{
    /** @type {!StringMap.<!WebInspector.DebuggerWorkspaceBinding.ScriptInfo>} */
    this.scriptDataMap = new StringMap();

    /** @type {!Set.<!WebInspector.DebuggerWorkspaceBinding.Location>} */
    this.callFrameLocations = new Set();

    var debuggerModel = target.debuggerModel;
    var workspace = debuggerWorkspaceBinding._workspace;

    this._liveEditSupport = new WebInspector.LiveEditSupport(target, workspace, debuggerWorkspaceBinding);
    this._defaultMapping = new WebInspector.DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new WebInspector.ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._compilerMapping = new WebInspector.CompilerScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding._networkWorkspaceBinding, debuggerWorkspaceBinding);

    /** @type {!WebInspector.LiveEditSupport} */
    this._liveEditSupport = new WebInspector.LiveEditSupport(target, workspace, debuggerWorkspaceBinding);

    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this);
}

WebInspector.DebuggerWorkspaceBinding.TargetData.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _parsedScriptSource: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.data);
        this._defaultMapping.addScript(script);

        if (script.isSnippet()) {
            WebInspector.scriptSnippetModel.addScript(script);
            return;
        }

        this._resourceMapping.addScript(script);

        if (WebInspector.settings.jsSourceMapsEnabled.get())
            this._compilerMapping.addScript(script);
    },

    _dispose: function()
    {
        this._compilerMapping.dispose();
        this._resourceMapping.dispose();
        this._defaultMapping.dispose();
    }
}

/**
 * @constructor
 * @param {!WebInspector.Script} script
 */
WebInspector.DebuggerWorkspaceBinding.ScriptInfo = function(script)
{
    this._script = script;

    /** @type {!Array.<!WebInspector.SourceMapping>} */
    this._sourceMappings = [];

    /** @type {!Set.<!WebInspector.LiveLocation>} */
    this._locations = new Set();
}

WebInspector.DebuggerWorkspaceBinding.ScriptInfo.prototype = {
    /**
     * @param {!WebInspector.SourceMapping} sourceMapping
     */
    _pushSourceMapping: function(sourceMapping)
    {
        this._sourceMappings.push(sourceMapping);
        this._updateLocations();
    },

    /**
     * @return {!WebInspector.SourceMapping}
     */
    _popSourceMapping: function()
    {
        var sourceMapping = this._sourceMappings.pop();
        this._updateLocations();
        return sourceMapping;
    },

    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _addLocation: function(location)
    {
        this._locations.add(location);
        location.update();
    },

    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _removeLocation: function(location)
    {
        this._locations.remove(location);
    },

    _updateLocations: function()
    {
        var items = this._locations.values();
        for (var i = 0; i < items.length; ++i)
            items[i].update();
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {!WebInspector.UILocation}
     */
    _rawLocationToUILocation: function(rawLocation)
    {
        var uiLocation;
        for (var i = this._sourceMappings.length - 1; !uiLocation && i >= 0; --i)
            uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
        console.assert(uiLocation, "Script raw location cannot be mapped to any UI location.");
        return /** @type {!WebInspector.UILocation} */ (uiLocation);
    }
}


/**
 * @constructor
 * @extends {WebInspector.LiveLocation}
 * @param {!WebInspector.Script} script
 * @param {!WebInspector.DebuggerModel.Location} rawLocation
 * @param {!WebInspector.DebuggerWorkspaceBinding} binding
 * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
 */
WebInspector.DebuggerWorkspaceBinding.Location = function(script, rawLocation, binding, updateDelegate)
{
    WebInspector.LiveLocation.call(this, rawLocation, updateDelegate);
    this._script = script;
    this._binding = binding;
}

WebInspector.DebuggerWorkspaceBinding.Location.prototype = {
    /**
     * @return {!WebInspector.UILocation}
     */
    uiLocation: function()
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (this.rawLocation());
        return this._binding.rawLocationToUILocation(debuggerModelLocation);
    },

    dispose: function()
    {
        WebInspector.LiveLocation.prototype.dispose.call(this);
        this._binding._removeLiveLocation(this);
    },

    __proto__: WebInspector.LiveLocation.prototype
}

/**
 * @type {!WebInspector.DebuggerWorkspaceBinding}
 */
WebInspector.debuggerWorkspaceBinding;
