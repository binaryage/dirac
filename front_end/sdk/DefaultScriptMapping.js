/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @implements {WebInspector.ScriptSourceMapping}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 */
WebInspector.DefaultScriptMapping = function(debuggerModel, workspace, debuggerWorkspaceBinding)
{
    this._debuggerModel = debuggerModel;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this._workspace = workspace;
    this._projectId = WebInspector.DefaultScriptMapping.projectIdForTarget(debuggerModel.target());
    this._projectDelegate = new WebInspector.DebuggerProjectDelegate(this._workspace, this._projectId, WebInspector.projectTypes.Debugger);
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
    this._debuggerReset();
}

WebInspector.DefaultScriptMapping.prototype = {
    /**
     * @param {!WebInspector.RawLocation} rawLocation
     * @return {!WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
        var script = debuggerModelLocation.script();
        var uiSourceCode = this._uiSourceCodeForScriptId[script.scriptId];
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        return uiSourceCode.uiLocation(lineNumber, columnNumber);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        var scriptId = this._scriptIdForUISourceCode.get(uiSourceCode);
        var script = this._debuggerModel.scriptForId(scriptId);
        return this._debuggerModel.createRawLocation(script, lineNumber, columnNumber);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    addScript: function(script)
    {
        var path = this._projectDelegate.addScript(script);
        var uiSourceCode = this._workspace.uiSourceCode(this._projectId, path);
        if (!uiSourceCode) {
            console.assert(uiSourceCode);
            return;
        }
        this._uiSourceCodeForScriptId[script.scriptId] = uiSourceCode;
        this._scriptIdForUISourceCode.put(uiSourceCode, script.scriptId);
        this._debuggerWorkspaceBinding.setSourceMapping(this._debuggerModel.target(), uiSourceCode, this);
        this._debuggerWorkspaceBinding.pushSourceMapping(script, this);
        script.addEventListener(WebInspector.Script.Events.ScriptEdited, this._scriptEdited.bind(this, script.scriptId));
    },

    /**
     * @return {boolean}
     */
    isIdentity: function()
    {
        return true;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        return true;
    },

    /**
     * @param {string} scriptId
     * @param {!WebInspector.Event} event
     */
    _scriptEdited: function(scriptId, event)
    {
        var content = /** @type {string} */(event.data);
        this._uiSourceCodeForScriptId[scriptId].addRevision(content);
    },

    _debuggerReset: function()
    {
        /** @type {!Object.<string, !WebInspector.UISourceCode>} */
        this._uiSourceCodeForScriptId = {};
        this._scriptIdForUISourceCode = new Map();
        this._projectDelegate.reset();
    },

    dispose: function()
    {
        this._workspace.removeProject(this._projectId);
    }
}

/**
 * @param {!WebInspector.Target} target
 * @return {string}
 */
WebInspector.DefaultScriptMapping.projectIdForTarget = function(target)
{
    return "debugger:" + target.id();
}

/**
 * @constructor
 * @param {!WebInspector.Workspace} workspace
 * @param {string} id
 * @param {!WebInspector.projectTypes} type
 * @extends {WebInspector.ContentProviderBasedProjectDelegate}
 */
WebInspector.DebuggerProjectDelegate = function(workspace, id, type)
{
    WebInspector.ContentProviderBasedProjectDelegate.call(this, workspace, id, type);
}

WebInspector.DebuggerProjectDelegate.prototype = {
    /**
     * @return {string}
     */
    displayName: function()
    {
        return "";
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {string}
     */
    addScript: function(script)
    {
        var contentProvider = script.isInlineScript() ? new WebInspector.ConcatenatedScriptsContentProvider([script]) : script;
        var splitURL = WebInspector.ParsedURL.splitURL(script.sourceURL);
        var name = splitURL[splitURL.length - 1];
        name = "VM" + script.scriptId + (name ? " " + name : "");
        return this.addContentProvider("", name, script.sourceURL, contentProvider);
    },

    __proto__: WebInspector.ContentProviderBasedProjectDelegate.prototype
}
