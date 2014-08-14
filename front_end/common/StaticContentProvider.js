// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.ResourceType} contentType
 * @param {string} content
 */
WebInspector.StaticContentProvider = function(contentType, content)
{
    this._content = content;
    this._contentType = contentType;
}

WebInspector.StaticContentProvider.prototype = {
    /**
     * @return {string}
     */
    contentURL: function()
    {
        return "";
    },

    /**
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return this._contentType;
    },

    /**
     * @param {function(?string)} callback
     */
    requestContent: function(callback)
    {
        callback(this._content);
    },

    /**
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        /**
         * @this {WebInspector.StaticContentProvider}
         */
        function performSearch()
        {
            callback(WebInspector.ContentProvider.performSearchInContent(this._content, query, caseSensitive, isRegex));
        }

        // searchInContent should call back later.
        self.setTimeout(performSearch.bind(this), 0);
    }
}
