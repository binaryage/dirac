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
 * @implements {WebInspector.SourceMapping}
 * @param {!WebInspector.CSSStyleModel} cssModel
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.StylesSourceMapping = function(cssModel, workspace)
{
    this._cssModel = cssModel;
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);

    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameCreatedOrNavigated, this._mainFrameCreatedOrNavigated, this);

    this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetChanged, this);
    this._initialize();
}

WebInspector.StylesSourceMapping.MinorChangeUpdateTimeoutMs = 1000;

WebInspector.StylesSourceMapping.prototype = {
    /**
     * @param {!WebInspector.RawLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var location = /** @type WebInspector.CSSLocation */ (rawLocation);
        var uiSourceCode = this._workspace.uiSourceCodeForURL(location.url);
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(location.lineNumber, location.columnNumber);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!WebInspector.RawLocation}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        return new WebInspector.CSSLocation(this._cssModel.target(), uiSourceCode.url || "", lineNumber, columnNumber);
    },

    /**
     * @return {boolean}
     */
    isIdentity: function()
    {
        return true;
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    addHeader: function(header)
    {
        var url = header.resourceURL();
        if (!url)
            return;

        header.pushSourceMapping(this);
        var map = this._urlToHeadersByFrameId[url];
        if (!map) {
            map = /** @type {!StringMap.<!StringMap.<!WebInspector.CSSStyleSheetHeader>>} */ (new StringMap());
            this._urlToHeadersByFrameId[url] = map;
        }
        var headersById = map.get(header.frameId);
        if (!headersById) {
            headersById = /** @type {!StringMap.<!WebInspector.CSSStyleSheetHeader>} */ (new StringMap());
            map.put(header.frameId, headersById);
        }
        headersById.put(header.id, header);
        var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
        if (uiSourceCode)
            this._bindUISourceCode(uiSourceCode, header);
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        var url = header.resourceURL();
        if (!url)
            return;

        var map = this._urlToHeadersByFrameId[url];
        console.assert(map);
        var headersById = map.get(header.frameId);
        console.assert(headersById);
        headersById.remove(header.id);

        if (!headersById.size()) {
            map.remove(header.frameId);
            if (!map.size()) {
                delete this._urlToHeadersByFrameId[url];
                var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
                if (uiSourceCode)
                    this._unbindUISourceCode(uiSourceCode);
            }
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _unbindUISourceCode: function(uiSourceCode)
    {
        var styleFile = this._styleFiles.get(uiSourceCode);
        if (!styleFile)
            return;
        styleFile.dispose();
        this._styleFiles.remove(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAddedToWorkspace: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        var url = uiSourceCode.url;
        if (!url || !this._urlToHeadersByFrameId[url])
            return;
        this._bindUISourceCode(uiSourceCode, this._urlToHeadersByFrameId[url].values()[0].values()[0]);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    _bindUISourceCode: function(uiSourceCode, header)
    {
        if (this._styleFiles.get(uiSourceCode) || header.isInline)
            return;
        var url = uiSourceCode.url;
        this._styleFiles.put(uiSourceCode, new WebInspector.StyleFile(uiSourceCode, this));
        header.updateLocations();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _projectWillReset: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        var uiSourceCodes = project.uiSourceCodes();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            this._unbindUISourceCode(uiSourceCodes[i]);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._unbindUISourceCode(uiSourceCode);
    },

    _initialize: function()
    {
        /** @type {!Object.<string, !StringMap.<!StringMap.<!WebInspector.CSSStyleSheetHeader>>>} */
        this._urlToHeadersByFrameId = {};
        /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.StyleFile>} */
        this._styleFiles = new Map();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mainFrameCreatedOrNavigated: function(event)
    {
        for (var url in this._urlToHeadersByFrameId) {
            var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
            if (!uiSourceCode)
                continue;
            this._unbindUISourceCode(uiSourceCode);
        }
        this._initialize();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} content
     * @param {boolean} majorChange
     * @param {function(?string)} userCallback
     */
    _setStyleContent: function(uiSourceCode, content, majorChange, userCallback)
    {
        var styleSheetIds = this._cssModel.styleSheetIdsForURL(uiSourceCode.url);
        if (!styleSheetIds.length) {
            userCallback("No stylesheet found: " + uiSourceCode.url);
            return;
        }

        this._isSettingContent = true;

        /**
         * @param {?Protocol.Error} error
         * @this {WebInspector.StylesSourceMapping}
         */
        function callback(error)
        {
            userCallback(error);
            delete this._isSettingContent;
        }
        this._cssModel.setStyleSheetText(styleSheetIds[0], content, majorChange, callback.bind(this));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetChanged: function(event)
    {
        if (this._isSettingContent)
            return;

        if (event.data.majorChange) {
            this._updateStyleSheetText(event.data.styleSheetId);
            return;
        }

        this._updateStyleSheetTextSoon(event.data.styleSheetId);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     */
    _updateStyleSheetTextSoon: function(styleSheetId)
    {
        if (this._updateStyleSheetTextTimer)
            clearTimeout(this._updateStyleSheetTextTimer);

        this._updateStyleSheetTextTimer = setTimeout(this._updateStyleSheetText.bind(this, styleSheetId), WebInspector.StylesSourceMapping.MinorChangeUpdateTimeoutMs);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     */
    _updateStyleSheetText: function(styleSheetId)
    {
        if (this._updateStyleSheetTextTimer) {
            clearTimeout(this._updateStyleSheetTextTimer);
            delete this._updateStyleSheetTextTimer;
        }

        var header = this._cssModel.styleSheetHeaderForId(styleSheetId);
        if (!header)
            return;
        var styleSheetURL = header.resourceURL();
        if (!styleSheetURL)
            return;
        var uiSourceCode = this._workspace.uiSourceCodeForURL(styleSheetURL)
        if (!uiSourceCode)
            return;
        header.requestContent(callback.bind(this, uiSourceCode));

        /**
         * @param {!WebInspector.UISourceCode} uiSourceCode
         * @param {?string} content
         * @this {WebInspector.StylesSourceMapping}
         */
        function callback(uiSourceCode, content)
        {
            var styleFile = this._styleFiles.get(uiSourceCode);
            if (styleFile)
                styleFile.addRevision(content || "");
        }
    }
}

/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!WebInspector.StylesSourceMapping} mapping
 */
WebInspector.StyleFile = function(uiSourceCode, mapping)
{
    this._uiSourceCode = uiSourceCode;
    this._mapping = mapping;
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
}

WebInspector.StyleFile.updateTimeout = 200;

WebInspector.StyleFile.prototype = {
    _workingCopyCommitted: function(event)
    {
        if (this._isAddingRevision)
            return;

        this._commitIncrementalEdit(true);
    },

    _workingCopyChanged: function(event)
    {
        if (this._isAddingRevision)
            return;

        if (this._incrementalUpdateTimer)
            return;
        // FIXME: Extensions tests override updateTimeout because extensions don't have any control over applying changes to domain specific bindings.
        if (WebInspector.StyleFile.updateTimeout >= 0) {
            this._incrementalUpdateTimer = setTimeout(this._commitIncrementalEdit.bind(this, false), WebInspector.StyleFile.updateTimeout)
        } else
            this._commitIncrementalEdit(false);
    },

    /**
     * @param {boolean} majorChange
     */
    _commitIncrementalEdit: function(majorChange)
    {
        this._clearIncrementalUpdateTimer();
        this._mapping._setStyleContent(this._uiSourceCode, this._uiSourceCode.workingCopy(), majorChange, this._styleContentSet.bind(this));
    },

    /**
     * @param {?string} error
     */
    _styleContentSet: function(error)
    {
        if (error)
            WebInspector.console.showErrorMessage(error);
    },

    _clearIncrementalUpdateTimer: function()
    {
        if (!this._incrementalUpdateTimer)
            return;
        clearTimeout(this._incrementalUpdateTimer);
        delete this._incrementalUpdateTimer;
    },

    /**
     * @param {string} content
     */
    addRevision: function(content)
    {
        this._isAddingRevision = true;
        this._uiSourceCode.addRevision(content);
        delete this._isAddingRevision;
    },

    dispose: function()
    {
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    }
}
