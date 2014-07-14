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
 * @param {!WebInspector.NetworkWorkspaceBinding} networkWorkspaceBinding
 */
WebInspector.CompilerScriptMapping = function(debuggerModel, workspace, networkWorkspaceBinding)
{
    this._target = debuggerModel.target();
    this._debuggerModel = debuggerModel;
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    this._networkWorkspaceBinding = networkWorkspaceBinding;
    /** @type {!Object.<string, !WebInspector.SourceMap>} */
    this._sourceMapForSourceMapURL = {};
    /** @type {!Object.<string, !Array.<function(?WebInspector.SourceMap)>>} */
    this._pendingSourceMapLoadingCallbacks = {};
    /** @type {!Object.<string, !WebInspector.SourceMap>} */
    this._sourceMapForScriptId = {};
    /** @type {!Map.<!WebInspector.SourceMap, !WebInspector.Script>} */
    this._scriptForSourceMap = new Map();
    /** @type {!StringMap.<!WebInspector.SourceMap>} */
    this._sourceMapForURL = new StringMap();
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
}

WebInspector.CompilerScriptMapping.prototype = {
    /**
     * @param {!WebInspector.RawLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
        var sourceMap = this._sourceMapForScriptId[debuggerModelLocation.scriptId];
        if (!sourceMap)
            return null;
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        var entry = sourceMap.findEntry(lineNumber, columnNumber);
        if (!entry || entry.length === 2)
            return null;
        var url = /** @type {string} */ (entry[2]);
        var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(/** @type {number} */ (entry[3]), /** @type {number} */ (entry[4]));
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        if (!uiSourceCode.url)
            return null;
        var sourceMap = this._sourceMapForURL.get(uiSourceCode.url);
        if (!sourceMap)
            return null;
        var script = /** @type {!WebInspector.Script} */ (this._scriptForSourceMap.get(sourceMap));
        console.assert(script);
        var mappingSearchLinesCount = 5;
        // We do not require precise (breakpoint) location but limit the number of lines to search or mapping.
        var entry = sourceMap.findEntryReversed(uiSourceCode.url, lineNumber, mappingSearchLinesCount);
        if (!entry)
            return null;
        return this._debuggerModel.createRawLocation(script, /** @type {number} */ (entry[0]), /** @type {number} */ (entry[1]));
    },

    /**
     * @param {!WebInspector.Script} script
     */
    addScript: function(script)
    {
        script.pushSourceMapping(this);
        script.addEventListener(WebInspector.Script.Events.SourceMapURLAdded, this._sourceMapURLAdded.bind(this));
        this._processScript(script);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceMapURLAdded: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.target);
        this._processScript(script);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    _processScript: function(script)
    {
        this.loadSourceMapForScript(script, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.CompilerScriptMapping}
         */
        function sourceMapLoaded(sourceMap)
        {
            if (!sourceMap)
                return;

            if (this._scriptForSourceMap.get(sourceMap)) {
                this._sourceMapForScriptId[script.scriptId] = sourceMap;
                script.updateLocations();
                return;
            }

            this._sourceMapForScriptId[script.scriptId] = sourceMap;
            this._scriptForSourceMap.put(sourceMap, script);

            var sourceURLs = sourceMap.sources();
            for (var i = 0; i < sourceURLs.length; ++i) {
                var sourceURL = sourceURLs[i];
                if (this._sourceMapForURL.get(sourceURL))
                    continue;
                this._sourceMapForURL.put(sourceURL, sourceMap);
                if (!this._workspace.hasMappingForURL(sourceURL) && !this._workspace.uiSourceCodeForURL(sourceURL)) {
                    var contentProvider = sourceMap.sourceContentProvider(sourceURL, WebInspector.resourceTypes.Script);
                    this._networkWorkspaceBinding.addFileForURL(sourceURL, contentProvider, script.isContentScript());
                }
                var uiSourceCode = this._workspace.uiSourceCodeForURL(sourceURL);
                if (uiSourceCode)
                    this._bindUISourceCode(uiSourceCode);
                else
                    this._target.consoleModel.showErrorMessage(WebInspector.UIString("Failed to locate workspace file mapped to URL %s from source map %s", sourceURL, sourceMap.url()));
            }
            script.updateLocations();
        }
    },

    /**
     * @return {boolean}
     */
    isIdentity: function()
    {
        return false;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        if (!uiSourceCode.url)
            return true;
        var sourceMap = this._sourceMapForURL.get(uiSourceCode.url);
        if (!sourceMap)
            return true;
        return !!sourceMap.findEntryReversed(uiSourceCode.url, lineNumber, 0);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _bindUISourceCode: function(uiSourceCode)
    {
        uiSourceCode.setSourceMappingForTarget(this._target, this);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _unbindUISourceCode: function(uiSourceCode)
    {
        uiSourceCode.setSourceMappingForTarget(this._target, null);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAddedToWorkspace: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        if (!uiSourceCode.url || !this._sourceMapForURL.get(uiSourceCode.url))
            return;
        this._bindUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {function(?WebInspector.SourceMap)} callback
     */
    loadSourceMapForScript: function(script, callback)
    {
        // script.sourceURL can be a random string, but is generally an absolute path -> complete it to inspected page url for
        // relative links.
        if (!script.sourceMapURL) {
            callback(null);
            return;
        }
        var scriptURL = WebInspector.ParsedURL.completeURL(script.target().resourceTreeModel.inspectedPageURL(), script.sourceURL);
        if (!scriptURL) {
            callback(null);
            return;
        }
        var sourceMapURL = WebInspector.ParsedURL.completeURL(scriptURL, script.sourceMapURL);
        if (!sourceMapURL) {
            callback(null);
            return;
        }

        var sourceMap = this._sourceMapForSourceMapURL[sourceMapURL];
        if (sourceMap) {
            callback(sourceMap);
            return;
        }

        var pendingCallbacks = this._pendingSourceMapLoadingCallbacks[sourceMapURL];
        if (pendingCallbacks) {
            pendingCallbacks.push(callback);
            return;
        }

        pendingCallbacks = [callback];
        this._pendingSourceMapLoadingCallbacks[sourceMapURL] = pendingCallbacks;

        WebInspector.SourceMap.load(sourceMapURL, scriptURL, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.CompilerScriptMapping}
         */
        function sourceMapLoaded(sourceMap)
        {
            var url = /** @type {string} */ (sourceMapURL);
            var callbacks = this._pendingSourceMapLoadingCallbacks[url];
            delete this._pendingSourceMapLoadingCallbacks[url];
            if (!callbacks)
                return;
            if (sourceMap)
                this._sourceMapForSourceMapURL[url] = sourceMap;
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](sourceMap);
        }
    },

    _debuggerReset: function()
    {
        /**
         * @param {string} sourceURL
         * @this {WebInspector.CompilerScriptMapping}
         */
        function unbindUISourceCodeForURL(sourceURL)
        {
            var uiSourceCode = this._workspace.uiSourceCodeForURL(sourceURL);
            if (!uiSourceCode)
                return;
            this._unbindUISourceCode(uiSourceCode);
        }

        this._sourceMapForURL.keys().forEach(unbindUISourceCodeForURL.bind(this));

        this._sourceMapForSourceMapURL = {};
        this._pendingSourceMapLoadingCallbacks = {};
        this._sourceMapForScriptId = {};
        this._scriptForSourceMap.clear();
        this._sourceMapForURL.clear();
    },

    dispose: function()
    {
        this._workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    }
}
