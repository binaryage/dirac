// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SourceMapping}
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.DebuggerModel} debuggerModel
 */
WebInspector.FormatterScriptMapping = function(workspace, debuggerModel)
{
    this._workspace = workspace;
    this._debuggerModel = debuggerModel;

    this._init();

    this._projectDelegate = new WebInspector.FormatterProjectDelegate();
    this._workspace.addProject(this._projectDelegate);

    this._debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
}

WebInspector.FormatterScriptMapping.prototype = {
    /**
     * @param {!WebInspector.RawLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
        var script = debuggerModelLocation.script();
        var uiSourceCode = this._uiSourceCodes.get(script);
        if (!uiSourceCode)
            return null;

        var formatData = this._formatData.get(uiSourceCode);
        if (!formatData)
            return null;
        var mapping = formatData.mapping;
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        var formattedLocation = mapping.originalToFormatted(lineNumber, columnNumber);
        return new WebInspector.UILocation(uiSourceCode, formattedLocation[0], formattedLocation[1]);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        var formatData = this._formatData.get(uiSourceCode);
        if (!formatData)
            return null;
        var originalLocation = formatData.mapping.formattedToOriginal(lineNumber, columnNumber)
        return this._debuggerModel.createRawLocation(formatData.scripts[0], originalLocation[0], originalLocation[1]);
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
     * @return {!Array.<!WebInspector.Script>}
     */
    _scriptsForUISourceCode: function(uiSourceCode)
    {
        /**
         * @param {!WebInspector.Script} script
         * @return {boolean}
         */
        function isInlineScript(script)
        {
            return script.isInlineScript();
        }

        if (uiSourceCode.contentType() === WebInspector.resourceTypes.Document)
            return this._debuggerModel.scriptsForSourceURL(uiSourceCode.url).filter(isInlineScript);
        if (uiSourceCode.contentType() === WebInspector.resourceTypes.Script) {
            var rawLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (uiSourceCode.uiLocationToRawLocation(0, 0));
            return rawLocation ? [rawLocation.script()] : [];
        }
        return [];
    },

    _init: function()
    {
        /** @type {!Map.<!WebInspector.Script, !WebInspector.UISourceCode>} */
        this._uiSourceCodes = new Map();
        /** @type {!StringMap.<string>} */
        this._formattedPaths = new StringMap();
        /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.FormatterScriptMapping.FormatData>} */
        this._formatData = new Map();
    },

    _debuggerReset: function()
    {
        var formattedPaths = this._formattedPaths.values();
        for (var i = 0; i < formattedPaths.length; ++i)
            this._projectDelegate._removeFormatted(formattedPaths[i]);
        this._init();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {function(?WebInspector.UISourceCode, !WebInspector.FormatterSourceMapping=)} callback
     */
    _performUISourceCodeScriptFormatting: function(uiSourceCode, callback)
    {
        var path = this._formattedPaths.get(uiSourceCode.project().id() + ":" + uiSourceCode.path());
        if (path) {
            var uiSourceCodePath = path;
            var formattedUISourceCode = this._workspace.uiSourceCode(this._projectDelegate.id(), uiSourceCodePath);
            var formatData = formattedUISourceCode ? this._formatData.get(formattedUISourceCode) : null;
            if (!formatData)
                callback(null);
            else
                callback(formattedUISourceCode, formatData.mapping);
            return;
        }

        uiSourceCode.requestContent(contentLoaded.bind(this));

        /**
         * @this {WebInspector.FormatterScriptMapping}
         * @param {?string} content
         */
        function contentLoaded(content)
        {
            var formatter = WebInspector.Formatter.createFormatter(uiSourceCode.contentType());
            formatter.formatContent(uiSourceCode.highlighterType(), content || "", innerCallback.bind(this));
        }

        /**
         * @this {WebInspector.FormatterScriptMapping}
         * @param {string} formattedContent
         * @param {!WebInspector.FormatterSourceMapping} formatterMapping
         */
        function innerCallback(formattedContent, formatterMapping)
        {
            var scripts = this._scriptsForUISourceCode(uiSourceCode);
            if (!scripts.length) {
                callback(null);
                return;
            }
            var name;
            if (uiSourceCode.contentType() === WebInspector.resourceTypes.Document)
                name = uiSourceCode.displayName();
            else
                name = uiSourceCode.name() || scripts[0].scriptId;
            path = this._projectDelegate._addFormatted(name, uiSourceCode.url, uiSourceCode.contentType(), formattedContent);
            var formattedUISourceCode = /** @type {!WebInspector.UISourceCode} */ (this._workspace.uiSourceCode(this._projectDelegate.id(), path));

            var formatData = new WebInspector.FormatterScriptMapping.FormatData(uiSourceCode.project().id(), uiSourceCode.path(), formatterMapping, scripts);
            this._formatData.put(formattedUISourceCode, formatData);
            this._formattedPaths.put(uiSourceCode.project().id() + ":" + uiSourceCode.path(), path);
            for (var i = 0; i < scripts.length; ++i) {
                this._uiSourceCodes.put(scripts[i], formattedUISourceCode);
                scripts[i].pushSourceMapping(this);
            }
            formattedUISourceCode.setSourceMapping(this);
            callback(formattedUISourceCode, formatterMapping);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} formattedUISourceCode
     * @return {?WebInspector.FormatterSourceMapping}
     */
    _discardFormattedUISourceCodeScript: function(formattedUISourceCode)
    {
        var formatData = this._formatData.get(formattedUISourceCode);
        if (!formatData)
            return null;

        this._formatData.remove(formattedUISourceCode);
        this._formattedPaths.remove(formatData.projectId + ":" + formatData.path);
        for (var i = 0; i < formatData.scripts.length; ++i) {
            this._uiSourceCodes.remove(formatData.scripts[i]);
            formatData.scripts[i].popSourceMapping();
        }
        this._projectDelegate._removeFormatted(formattedUISourceCode.path());
        return formatData.mapping;
    },
}

/**
 * @constructor
 * @param {string} projectId
 * @param {string} path
 * @param {!WebInspector.FormatterSourceMapping} mapping
 * @param {!Array.<!WebInspector.Script>} scripts
 */
WebInspector.FormatterScriptMapping.FormatData = function(projectId, path, mapping, scripts)
{
    this.projectId = projectId;
    this.path = path;
    this.mapping = mapping;
    this.scripts = scripts;
}

/**
 * @constructor
 * @extends {WebInspector.ContentProviderBasedProjectDelegate}
 */
WebInspector.FormatterProjectDelegate = function()
{
    WebInspector.ContentProviderBasedProjectDelegate.call(this, WebInspector.projectTypes.Formatter);
}

WebInspector.FormatterProjectDelegate.prototype = {
    /**
     * @return {string}
     */
    id: function()
    {
        return "formatter:";
    },

    /**
     * @return {string}
     */
    displayName: function()
    {
        return "formatter";
    },

    /**
     * @param {string} name
     * @param {string} sourceURL
     * @param {!WebInspector.ResourceType} contentType
     * @param {string} content
     * @return {string}
     */
    _addFormatted: function(name, sourceURL, contentType, content)
    {
        var contentProvider = new WebInspector.StaticContentProvider(contentType, content);
        return this.addContentProvider(sourceURL, name + ":formatted", "deobfuscated:" + sourceURL, contentProvider, false, false);
    },

    /**
     * @param {string} path
     */
    _removeFormatted: function(path)
    {
        this.removeFile(path);
    },

    __proto__: WebInspector.ContentProviderBasedProjectDelegate.prototype
}

/**
 * @constructor
 * @implements {WebInspector.SourcesView.EditorAction}
 */
WebInspector.ScriptFormatterEditorAction = function()
{
    this._scriptMapping = new WebInspector.FormatterScriptMapping(WebInspector.workspace, WebInspector.debuggerModel);
}

WebInspector.ScriptFormatterEditorAction.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _editorSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._updateButton(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorClosed: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data.uiSourceCode);
        var wasSelected = /** @type {boolean} */ (event.data.wasSelected);

        if (wasSelected)
            this._updateButton(null);
        this._discardFormattedUISourceCodeScript(uiSourceCode);
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     */
    _updateButton: function(uiSourceCode)
    {
        this._button.element.classList.toggle("hidden", !this._isFormatableScript(uiSourceCode));
    },

    /**
     * @param {!WebInspector.SourcesView} sourcesView
     * @return {!Element}
     */
    button: function(sourcesView)
    {
        if (this._button)
            return this._button.element;

        this._sourcesView = sourcesView;
        this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
        this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed, this._editorClosed.bind(this));

        this._button = new WebInspector.StatusBarButton(WebInspector.UIString("Pretty print"), "sources-toggle-pretty-print-status-bar-item");
        this._button.toggled = false;
        this._button.addEventListener("click", this._toggleFormatScriptSource, this);
        this._updateButton(null);

        return this._button.element;
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    _isFormatableScript: function(uiSourceCode)
    {
        if (!uiSourceCode)
            return false;
        var projectType = uiSourceCode.project().type();
        if (projectType !== WebInspector.projectTypes.Network && projectType !== WebInspector.projectTypes.Debugger)
            return false;
        var contentType = uiSourceCode.contentType();
        return contentType === WebInspector.resourceTypes.Script || contentType === WebInspector.resourceTypes.Document;
    },

    _toggleFormatScriptSource: function()
    {
        var uiSourceCode = this._sourcesView.currentUISourceCode();
        if (!this._isFormatableScript(uiSourceCode))
            return;
        this._formatUISourceCodeScript(uiSourceCode);

        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.TogglePrettyPrint,
            enabled: true,
            url: uiSourceCode.originURL()
        });
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _formatUISourceCodeScript: function(uiSourceCode)
    {
        this._scriptMapping._performUISourceCodeScriptFormatting(uiSourceCode, innerCallback.bind(this));

        /**
         * @this {WebInspector.ScriptFormatterEditorAction}
         * @param {?WebInspector.UISourceCode} formattedUISourceCode
         * @param {!WebInspector.FormatterSourceMapping=} mapping
         */
        function innerCallback(formattedUISourceCode, mapping)
        {
            if (!formattedUISourceCode)
                return;
            if (uiSourceCode !== this._sourcesView.currentUISourceCode())
                return;
            var sourceFrame = this._sourcesView.viewForFile(uiSourceCode);
            var start = [0, 0];
            if (sourceFrame) {
                var selection = sourceFrame.selection();
                start = mapping.originalToFormatted(selection.startLine, selection.startColumn);
            }
            this._sourcesView.showSourceLocation(formattedUISourceCode, start[0], start[1]);
            this._updateButton(formattedUISourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _discardFormattedUISourceCodeScript: function(uiSourceCode)
    {
        this._scriptMapping._discardFormattedUISourceCodeScript(uiSourceCode);
    }
}
