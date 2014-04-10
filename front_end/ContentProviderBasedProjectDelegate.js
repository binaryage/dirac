/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @implements {WebInspector.ProjectDelegate}
 * @param {!WebInspector.Workspace} workspace
 * @param {string} id
 * @param {string} type
 */
WebInspector.ContentProviderBasedProjectDelegate = function(workspace, id, type)
{
    this._type = type;
    /** @type {!Object.<string, !WebInspector.ContentProvider>} */
    this._contentProviders = {};
    /** @type {!Object.<string, boolean>} */
    this._isContentScriptMap = {};
    this._projectStore = workspace.addProject(id, this);
}

WebInspector.ContentProviderBasedProjectDelegate.prototype = {
    /**
     * @return {string}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {string}
     */
    displayName: function()
    {
        // Overriddden by subclasses
        return "";
    },

    /**
     * @param {string} path
     * @param {function(?Date, ?number)} callback
     */
    requestMetadata: function(path, callback)
    {
        callback(null, null);
    },

    /**
     * @param {string} path
     * @param {function(?string)} callback
     */
    requestFileContent: function(path, callback)
    {
        var contentProvider = this._contentProviders[path];
        contentProvider.requestContent(callback);

        /**
         * @param {?string} content
         * @param {boolean} encoded
         * @param {string} mimeType
         */
        function innerCallback(content, encoded, mimeType)
        {
            callback(content);
        }
    },

    /**
     * @return {boolean}
     */
    canSetFileContent: function()
    {
        return false;
    },

    /**
     * @param {string} path
     * @param {string} newContent
     * @param {function(?string)} callback
     */
    setFileContent: function(path, newContent, callback)
    {
        callback(null);
    },

    /**
     * @return {boolean}
     */
    canRename: function()
    {
        return false;
    },

    /**
     * @param {string} path
     * @param {string} newName
     * @param {function(boolean, string=, string=, string=, !WebInspector.ResourceType=)} callback
     */
    rename: function(path, newName, callback)
    {
        this.performRename(path, newName, innerCallback.bind(this));

        /**
         * @param {boolean} success
         * @param {string=} newName
         * @this {WebInspector.ContentProviderBasedProjectDelegate}
         */
        function innerCallback(success, newName)
        {
            if (success)
                this._updateName(path, /** @type {string} */ (newName));
            callback(success, newName);
        }
    },

    /**
     * @param {string} path
     */
    refresh: function(path)
    {
    },

    /**
     * @param {string} path
     */
    excludeFolder: function(path)
    {
    },

    /**
     * @param {string} path
     * @param {?string} name
     * @param {string} content
     * @param {function(?string)} callback
     */
    createFile: function(path, name, content, callback)
    {
    },

    /**
     * @param {string} path
     */
    deleteFile: function(path)
    {
    },

    remove: function()
    {
    },

    /**
     * @param {string} path
     * @param {string} newName
     * @param {function(boolean, string=)} callback
     */
    performRename: function(path, newName, callback)
    {
        callback(false);
    },

    /**
     * @param {string} path
     * @param {string} newName
     */
    _updateName: function(path, newName)
    {
        var oldPath = path;
        var copyOfPath = path.split("/");
        copyOfPath[copyOfPath.length - 1] = newName;
        var newPath = copyOfPath.join("/");
        this._contentProviders[newPath] = this._contentProviders[oldPath];
        delete this._contentProviders[oldPath];
    },

    /**
     * @param {string} path
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInFileContent: function(path, query, caseSensitive, isRegex, callback)
    {
        var contentProvider = this._contentProviders[path];
        contentProvider.searchInContent(query, caseSensitive, isRegex, callback);
    },

    /**
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @param {!WebInspector.Progress} progress
     * @param {function(!Array.<string>)} callback
     */
    findFilesMatchingSearchRequest: function(searchConfig, progress, callback)
    {
        var result = [];
        var paths = Object.keys(this._contentProviders);
        var totalCount = paths.length;
        if (totalCount === 0) {
            // searchInContent should call back later.
            setTimeout(doneCallback, 0);
            return;
        }

        /**
         * @param {string} path
         * @this {WebInspector.ContentProviderBasedProjectDelegate}
         */
        function filterOutContentScripts(path)
        {
            return !this._isContentScriptMap[path];
        }

        if (!WebInspector.settings.searchInContentScripts.get())
            paths = paths.filter(filterOutContentScripts.bind(this));

        paths = paths.filter(searchConfig.filePathMatchesFileQuery.bind(searchConfig));
        var barrier = new CallbackBarrier();
        progress.setTotalWork(paths.length);
        for (var i = 0; i < paths.length; ++i)
            searchInContent.call(this, paths[i], barrier.createCallback(searchInContentCallback.bind(null, paths[i])));
        barrier.callWhenDone(doneCallback);

        /**
         * @param {string} path
         * @param {function(boolean)} callback
         * @this {WebInspector.ContentProviderBasedProjectDelegate}
         */
        function searchInContent(path, callback)
        {
            var queriesToRun = searchConfig.queries().slice();
            searchNextQuery.call(this);

            /**
             * @this {WebInspector.ContentProviderBasedProjectDelegate}
             */
            function searchNextQuery()
            {
                if (!queriesToRun.length) {
                    callback(true);
                    return;
                }
                var query = queriesToRun.shift();
                this._contentProviders[path].searchInContent(query, !searchConfig.ignoreCase(), searchConfig.isRegex(), contentCallback.bind(this));
            }

            /**
             * @param {!Array.<!WebInspector.ContentProvider.SearchMatch>} searchMatches
             * @this {WebInspector.ContentProviderBasedProjectDelegate}
             */
            function contentCallback(searchMatches)
            {
                if (!searchMatches.length) {
                    callback(false);
                    return;
                }
                searchNextQuery.call(this);
            }
        }

        /**
         * @param {string} path
         * @param {boolean} matches
         */
        function searchInContentCallback(path, matches)
        {
            if (matches)
                result.push(path);
            progress.worked(1);
        }

        function doneCallback()
        {
            callback(result);
            progress.done();
        }
    },

    /**
     * @param {!WebInspector.Progress} progress
     */
    indexContent: function(progress)
    {
        setTimeout(progress.done.bind(progress), 0);
    },

    /**
     * @param {string} parentPath
     * @param {string} name
     * @param {string} url
     * @param {!WebInspector.ContentProvider} contentProvider
     * @param {boolean} isEditable
     * @param {boolean=} isContentScript
     * @return {string}
     */
    addContentProvider: function(parentPath, name, url, contentProvider, isEditable, isContentScript)
    {
        var path = parentPath ? parentPath + "/" + name : name;
        if (this._contentProviders[path])
            return path;
        var fileDescriptor = new WebInspector.FileDescriptor(parentPath, name, url, url, contentProvider.contentType(), isEditable, isContentScript);
        this._contentProviders[path] = contentProvider;
        this._isContentScriptMap[path] = isContentScript || false;
        this._projectStore.addFile(fileDescriptor);
        return path;
    },

    /**
     * @param {string} path
     */
    removeFile: function(path)
    {
        delete this._contentProviders[path];
        delete this._isContentScriptMap[path];
        this._projectStore.removeFile(path);
    },

    /**
     * @return {!Object.<string, !WebInspector.ContentProvider>}
     */
    contentProviders: function()
    {
        return this._contentProviders;
    },

    reset: function()
    {
        this._contentProviders = {};
        this._isContentScriptMap = {};
        this._projectStore.reset();
    }
}
