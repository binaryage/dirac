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
 * @param {WebInspector.CSSStyleModel} cssModel
 * @param {WebInspector.Workspace} workspace
 * @param {WebInspector.SimpleWorkspaceProvider} networkWorkspaceProvider
 */
WebInspector.SASSSourceMapping = function(cssModel, workspace, networkWorkspaceProvider)
{
    this._cssModel = cssModel;
    this._workspace = workspace;
    this._networkWorkspaceProvider = networkWorkspaceProvider;
    this._completeSourceMapURLForCSSURL = {};
    this._cssURLsForSASSURL = {};
    this._timeoutForURL = {};
    this._reset();
    WebInspector.fileManager.addEventListener(WebInspector.FileManager.EventTypes.SavedURL, this._fileSaveFinished, this);
    this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetChanged, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted, this._uiSourceCodeContentCommitted, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._reset, this);
}

WebInspector.SASSSourceMapping.prototype = {
    /**
     * @param {WebInspector.Event} event
     */
    _styleSheetChanged: function(event)
    {
        var id = /** @type {!CSSAgent.StyleSheetId} */ (event.data.styleSheetId);
        var isAddingRevision = this._isAddingRevision;
        delete this._isAddingRevision;
        if (isAddingRevision)
            return;
        var header = this._cssModel.styleSheetHeaderForId(id);
        if (!header || !header.sourceMapURL || !header.sourceURL || header.isInline || !WebInspector.experimentsSettings.sass.isEnabled())
            return;

        header.popSourceMapping();
    },

    /**
     * @param {WebInspector.Event} event
     */
    _fileSaveFinished: function(event)
    {
        var sassURL = /** @type {string} */ (event.data);
        this._sassFileSaved(sassURL);
    },

    /**
     * @param {string} sassURL
     */
    _sassFileSaved: function(sassURL)
    {
        function callback()
        {
            delete this._timeoutForURL[sassURL];
            var cssURLs = this._cssURLsForSASSURL[sassURL];
            if (!cssURLs)
                return;
            for (var i = 0; i < cssURLs.length; ++i)
                this._reloadCSS(cssURLs[i]);
        }

        var timer = this._timeoutForURL[sassURL];
        if (timer) {
            clearTimeout(timer);
            delete this._timeoutForURL[sassURL];
        }
        if (!WebInspector.settings.cssReloadEnabled.get() || !this._cssURLsForSASSURL[sassURL])
            return;
        var timeout = WebInspector.settings.cssReloadTimeout.get();
        if (timeout && isFinite(timeout))
            this._timeoutForURL[sassURL] = setTimeout(callback.bind(this), Number(timeout));
    },

    _reloadCSS: function(url)
    {
        var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
        if (!uiSourceCode)
            return;
        var newContent = InspectorFrontendHost.loadResourceSynchronously(url);
        this._isAddingRevision = true;
        uiSourceCode.addRevision(newContent);
        // this._isAddingRevision will be deleted in this._styleSheetChanged().

        var completeSourceMapURL = this._completeSourceMapURLForCSSURL[url];
        if (!completeSourceMapURL)
            return;
        this._loadSourceMapAndBindUISourceCode(url, true, completeSourceMapURL);
    },

    /**
     * @param {WebInspector.CSSStyleSheetHeader} header
     */
    addHeader: function(header)
    {
        if (!header.sourceMapURL || !header.sourceURL || header.isInline || !WebInspector.experimentsSettings.sass.isEnabled())
            return;
        var completeSourceMapURL = WebInspector.ParsedURL.completeURL(header.sourceURL, header.sourceMapURL);
        if (!completeSourceMapURL)
            return;
        this._completeSourceMapURLForCSSURL[header.sourceURL] = completeSourceMapURL;
        this._loadSourceMapAndBindUISourceCode(header, false, completeSourceMapURL);
    },

    /**
     * @param {WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        if (!header.sourceMapURL || !header.sourceURL || header.isInline)
            return;
        var sourceURL = header.sourceURL;
        delete this._sourceMapByStyleSheetURL[sourceURL];
        delete this._completeSourceMapURLForCSSURL[sourceURL];
        for (var sassURL in this._cssURLsForSASSURL) {
            var urls = this._cssURLsForSASSURL[sassURL];
            urls.remove(sourceURL);
            if (!urls.length)
                delete this._cssURLsForSASSURL[sassURL];
        }
        var completeSourceMapURL = WebInspector.ParsedURL.completeURL(sourceURL, header.sourceMapURL);
        if (completeSourceMapURL)
            delete this._sourceMapByURL[completeSourceMapURL];
    },

    /**
     * @param {WebInspector.CSSStyleSheetHeader} header
     * @param {boolean} forceRebind
     * @param {string} completeSourceMapURL
     */
    _loadSourceMapAndBindUISourceCode: function(header, forceRebind, completeSourceMapURL)
    {
        var sourceMap = this._loadSourceMapForStyleSheet(completeSourceMapURL, header.sourceURL, forceRebind);
        if (!sourceMap)
            return;

        this._sourceMapByStyleSheetURL[header.sourceURL] = sourceMap;
        this._bindUISourceCode(header, sourceMap);
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     */
    _addCSSURLforSASSURL: function(cssURL, sassURL)
    {
        var cssURLs;
        if (this._cssURLsForSASSURL.hasOwnProperty(sassURL))
            cssURLs = this._cssURLsForSASSURL[sassURL];
        else {
            cssURLs = [];
            this._cssURLsForSASSURL[sassURL] = cssURLs;
        }
        if (cssURLs.indexOf(cssURL) === -1)
            cssURLs.push(cssURL);
    },

    /**
     * @param {string} completeSourceMapURL
     * @param {string} completeStyleSheetURL
     * @param {boolean=} forceReload
     * @return {WebInspector.SourceMap}
     */
    _loadSourceMapForStyleSheet: function(completeSourceMapURL, completeStyleSheetURL, forceReload)
    {
        var sourceMap = this._sourceMapByURL[completeSourceMapURL];
        if (sourceMap && !forceReload)
            return sourceMap;
        sourceMap = WebInspector.SourceMap.load(completeSourceMapURL, completeStyleSheetURL);
        if (!sourceMap) {
            delete this._sourceMapByURL[completeSourceMapURL];
            return null;
        }
        this._sourceMapByURL[completeSourceMapURL] = sourceMap;
        return sourceMap;
    },

    /**
     * @param {WebInspector.CSSStyleSheetHeader} header
     * @param {WebInspector.SourceMap} sourceMap
     */
    _bindUISourceCode: function(header, sourceMap)
    {
        header.pushSourceMapping(this);
        var rawURL = header.sourceURL;
        var sources = sourceMap.sources();
        for (var i = 0; i < sources.length; ++i) {
            var url = sources[i];
            if (!this._workspace.hasMappingForURL(url)) {
                if (!this._workspace.uiSourceCodeForURL(url)) {
                    var content = InspectorFrontendHost.loadResourceSynchronously(url);
                    var contentProvider = new WebInspector.StaticContentProvider(WebInspector.resourceTypes.Stylesheet, content, "text/x-scss");
                    var uiSourceCode = this._networkWorkspaceProvider.addFileForURL(url, contentProvider, true);
                    uiSourceCode.setSourceMapping(this);
                    this._addCSSURLforSASSURL(rawURL, url);
                }
            } else
                this._addCSSURLforSASSURL(rawURL, url);
        }
    },

    /**
     * @param {WebInspector.RawLocation} rawLocation
     * @return {WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var location = /** @type WebInspector.CSSLocation */ (rawLocation);
        var entry;
        var sourceMap = this._sourceMapByStyleSheetURL[location.url];
        if (!sourceMap)
            return null;
        entry = sourceMap.findEntry(location.lineNumber, location.columnNumber);
        if (!entry || entry.length === 2)
            return null;
        var uiSourceCode = this._workspace.uiSourceCodeForURL(entry[2]);
        if (!uiSourceCode)
            return null;
        return new WebInspector.UILocation(uiSourceCode, entry[3], entry[4]);
    },

    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {WebInspector.RawLocation}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        // FIXME: Implement this when ui -> raw mapping has clients.
        return new WebInspector.CSSLocation(uiSourceCode.url || "", lineNumber, columnNumber);
    },

    /**
     * @return {boolean}
     */
    isIdentity: function()
    {
        return false;
    },

    /**
     * @param {WebInspector.Event} event
     */
    _uiSourceCodeContentCommitted: function(event)
    {
        var uiSourceCode = /** @type {WebInspector.UISourceCode} */ (event.data.uiSourceCode);
        this._sassFileSaved(uiSourceCode.url);
    },

    _reset: function()
    {
        this._sourceMapByURL = {};
        this._sourceMapByStyleSheetURL = {};
        this._cssURLsForSASSURL = {};
        this._timeoutForURL = {};
    }
}
