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
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
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
        if (!header || !WebInspector.experimentsSettings.sass.isEnabled())
            return;

        var wasHeaderKnown = header.sourceURL && !!this._completeSourceMapURLForCSSURL[header.sourceURL];
        this.removeHeader(header);
        if (wasHeaderKnown)
            header.updateLocations();
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

    /**
     * @param {string} url
     */
    _reloadCSS: function(url)
    {
        var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
        if (!uiSourceCode)
            return;

        NetworkAgent.loadResourceForFrontend(WebInspector.resourceTreeModel.mainFrame.id, url, contentLoaded.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {string} content
         */
        function contentLoaded(error, content)
        {
            if (error) {
                console.error("Could not load content for " + url + " : " + error);
                return;
            }

            this._isAddingRevision = true;
            uiSourceCode.addRevision(content);
            // this._isAddingRevision will be deleted in this._styleSheetChanged().

            var completeSourceMapURL = this._completeSourceMapURLForCSSURL[url];
            if (!completeSourceMapURL)
                return;
            var ids = this._cssModel.styleSheetIdsForURL(url);
            if (!ids)
                return;
            var headers = [];
            for (var i = 0; i < ids.length; ++i)
                headers.push(this._cssModel.styleSheetHeaderForId(ids[i]));
            this._loadSourceMapAndBindUISourceCode(headers, true, completeSourceMapURL);
        }
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
        this._loadSourceMapAndBindUISourceCode([header], false, completeSourceMapURL);
    },

    /**
     * @param {WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        var sourceURL = header.sourceURL;
        if (!sourceURL || !header.sourceMapURL || header.isInline || !this._completeSourceMapURLForCSSURL[sourceURL])
            return;
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
     * @param {Array.<WebInspector.CSSStyleSheetHeader>} headersWithSameSourceURL
     * @param {boolean} forceRebind
     * @param {string} completeSourceMapURL
     */
    _loadSourceMapAndBindUISourceCode: function(headersWithSameSourceURL, forceRebind, completeSourceMapURL)
    {
        console.assert(headersWithSameSourceURL.length);
        var sourceURL = headersWithSameSourceURL[0].sourceURL;
        this._loadSourceMapForStyleSheet(completeSourceMapURL, sourceURL, forceRebind, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         */
        function sourceMapLoaded(sourceMap)
        {
            if (!sourceMap)
                return;

            this._sourceMapByStyleSheetURL[sourceURL] = sourceMap;
            for (var i = 0; i < headersWithSameSourceURL.length; ++i) {
                if (forceRebind)
                    headersWithSameSourceURL[i].updateLocations();
                else
                    this._bindUISourceCode(headersWithSameSourceURL[i], sourceMap);
            }
        }
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
     * @param {boolean} forceReload
     * @param {function(?WebInspector.SourceMap)} callback
     */
    _loadSourceMapForStyleSheet: function(completeSourceMapURL, completeStyleSheetURL, forceReload, callback)
    {
        var sourceMap = this._sourceMapByURL[completeSourceMapURL];
        if (sourceMap && !forceReload) {
            callback(sourceMap);
            return;
        }

        var pendingCallbacks = this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
        if (pendingCallbacks) {
            pendingCallbacks.push(callback);
            return;
        }

        pendingCallbacks = [callback];
        this._pendingSourceMapLoadingCallbacks[completeSourceMapURL] = pendingCallbacks;

        WebInspector.SourceMap.load(completeSourceMapURL, completeStyleSheetURL, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         */
        function sourceMapLoaded(sourceMap)
        {
            var callbacks = this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
            delete this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
            if (!callbacks)
                return;
            if (sourceMap)
                this._sourceMapByURL[completeSourceMapURL] = sourceMap;
            else
                delete this._sourceMapByURL[completeSourceMapURL];
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](sourceMap);
        }
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
            if (!this._workspace.hasMappingForURL(url) && !this._workspace.uiSourceCodeForURL(url)) {
                var contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.Stylesheet, "text/x-scss");
                var uiSourceCode = this._networkWorkspaceProvider.addFileForURL(url, contentProvider, true);
                uiSourceCode.setSourceMapping(this);
            }
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
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {WebInspector.UISourceCode} */ (event.data);
        var cssURLs = this._cssURLsForSASSURL[uiSourceCode.url];
        if (!cssURLs)
            return;
        uiSourceCode.setSourceMapping(this);
        for (var i = 0; i < cssURLs.length; ++i) {
            var ids = this._cssModel.styleSheetIdsForURL(cssURLs[i]);
            for (var j = 0; j < ids.length; ++j) {
                var header = this._cssModel.styleSheetHeaderForId(ids[j]);
                console.assert(header);
                header.updateLocations();
            }
        }
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
        /** @type {Object.<string, WebInspector.SourceMap>} */
        this._sourceMapByURL = {};
        /** @type {Object.<string, Array.<function(?WebInspector.SourceMap)>>} */
        this._pendingSourceMapLoadingCallbacks = {};
        this._sourceMapByStyleSheetURL = {};
        this._cssURLsForSASSURL = {};
        this._timeoutForURL = {};
    }
}
