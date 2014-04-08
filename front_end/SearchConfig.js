// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.ProjectSearchConfig}
 * @param {string} query
 * @param {boolean} ignoreCase
 * @param {boolean} isRegex
 */
WebInspector.SearchConfig = function(query, ignoreCase, isRegex)
{
    this._query = query;
    this._ignoreCase = ignoreCase;
    this._isRegex = isRegex;
    this._parse();
}

/**
 * @param {{query: string, ignoreCase: boolean, isRegex: boolean}} object
 */
WebInspector.SearchConfig.fromPlainObject = function(object)
{
    return new WebInspector.SearchConfig(object.query, object.ignoreCase, object.isRegex);
}

WebInspector.SearchConfig.prototype = {
    /**
     * @return {string}
     */
    query: function()
    {
        return this._query;
    },

    /**
     * @return {boolean}
     */
    ignoreCase: function()
    {
        return this._ignoreCase;
    },

    /**
     * @return {boolean}
     */
    isRegex: function()
    {
        return this._isRegex;
    },

    /**
     * @return {{query: string, ignoreCase: boolean, isRegex: boolean}}
     */
    toPlainObject: function()
    {
        return { query: this.query(), ignoreCase: this.ignoreCase(), isRegex: this.isRegex() };
    },

    _parse: function()
    {
        var filePattern = "file:(([^\\\\ ]|\\\\.)+)"; // After file: prefix: any symbol except space and backslash or any symbol escaped with a backslash.
        var quotedPattern = "\"(([^\\\\\"]|\\\\.)+)\""; // Inside double quotes: any symbol except double quote and backslash or any symbol escaped with a backslash.
        var unquotedPattern = "(([^\\\\ ]|\\\\.)+)"; // any symbol except space and backslash or any symbol escaped with a backslash.

        var pattern = "(" + filePattern + ")|(" + quotedPattern + ")|(" + unquotedPattern + ")";
        var regexp = new RegExp(pattern, "g");
        var queryParts = this._query.match(regexp) || [];

        /**
         * @type {!Array.<string>}
         */
        this._fileQueries = [];

        /**
         * @type {!Array.<string>}
         */
        this._queries = [];

        for (var i = 0; i < queryParts.length; ++i) {
            var queryPart = queryParts[i];
            if (!queryPart)
                continue;
            if (queryPart.startsWith("file:")) {
                this._fileQueries.push(this._parseFileQuery(queryPart));
                continue;
            }
            if (queryPart.startsWith("\"")) {
                if (!queryPart.endsWith("\""))
                    continue;
                this._queries.push(this._parseQuotedQuery(queryPart));
                continue;
            }
            this._queries.push(this._parseUnquotedQuery(queryPart));
        }
    },

    /**
     * @return {!Array.<string>}
     */
    fileQueries: function()
    {
        return this._fileQueries;
    },

    /**
     * @param {string} filePath
     * @return {boolean}
     */
    filePathMatchesFileQuery: function(filePath)
    {
        if (!this._fileRegexes) {
            this._fileRegexes = [];
            for (var i = 0; i < this._fileQueries.length; ++i)
                this._fileRegexes.push(new RegExp(this._fileQueries[i], this.ignoreCase ? "i" : ""));
        }

        for (var i = 0; i < this._fileRegexes.length; ++i) {
            if (!filePath.match(this._fileRegexes[i]))
                return false;
        }
        return true;
    },

    /**
     * @return {!Array.<string>}
     */
    queries: function()
    {
        return this._queries;
    },

    _parseUnquotedQuery: function(query)
    {
        return query.replace(/\\(.)/g, "$1");
    },

    _parseQuotedQuery: function(query)
    {
        return query.substring(1, query.length - 1).replace(/\\(.)/g, "$1");
    },

    _parseFileQuery: function(query)
    {
        query = query.substr("file:".length);
        var result = "";
        for (var i = 0; i < query.length; ++i) {
            var char = query[i];
            if (char === "*") {
                result += ".*";
            } else if (char === "\\") {
                ++i;
                var nextChar = query[i];
                if (nextChar === " ")
                    result += " ";
            } else {
                if (String.regexSpecialCharacters().indexOf(query.charAt(i)) !== -1)
                    result += "\\";
                result += query.charAt(i);
            }
        }
        return result;
    }
}
