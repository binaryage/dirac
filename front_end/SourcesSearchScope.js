/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @implements {WebInspector.SearchScope}
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.SourcesSearchScope = function(workspace)
{
    // FIXME: Add title once it is used by search controller.
    WebInspector.SearchScope.call(this)
    this._searchId = 0;
    this._workspace = workspace;
}

WebInspector.SourcesSearchScope.prototype = {
    /**
     * @param {!WebInspector.Progress} progress
     * @param {function(boolean)} indexingFinishedCallback
     */
    performIndexing: function(progress, indexingFinishedCallback)
    {
        this.stopSearch();

        function filterOutServiceProjects(project)
        {
            return !project.isServiceProject();
        }

        var projects = this._workspace.projects().filter(filterOutServiceProjects);
        var barrier = new CallbackBarrier();
        var compositeProgress = new WebInspector.CompositeProgress(progress);
        progress.addEventListener(WebInspector.Progress.Events.Canceled, indexingCanceled.bind(this));
        for (var i = 0; i < projects.length; ++i) {
            var project = projects[i];
            var projectProgress = compositeProgress.createSubProgress(project.uiSourceCodes().length);
            project.indexContent(projectProgress, barrier.createCallback());
        }
        barrier.callWhenDone(indexingFinishedCallback.bind(this, true));

        function indexingCanceled()
        {
            indexingFinishedCallback(false);
            progress.done();
        }
    },

    /**
     * @param {!WebInspector.SearchConfig} searchConfig
     * @param {!WebInspector.Progress} progress
     * @param {function(!WebInspector.FileBasedSearchResultsPane.SearchResult)} searchResultCallback
     * @param {function(boolean)} searchFinishedCallback
     */
    performSearch: function(searchConfig, progress, searchResultCallback, searchFinishedCallback)
    {
        this.stopSearch();
        this._searchResultCallback = searchResultCallback;
        this._searchFinishedCallback = searchFinishedCallback;
        this._searchConfig = searchConfig;

        /**
         * @param {!WebInspector.Project} project
         */
        function filterOutServiceProjects(project)
        {
            return !project.isServiceProject();
        }

        var projects = this._workspace.projects().filter(filterOutServiceProjects);
        var barrier = new CallbackBarrier();
        var compositeProgress = new WebInspector.CompositeProgress(progress);
        for (var i = 0; i < projects.length; ++i) {
            var project = projects[i];
            var weight = project.uiSourceCodes().length;
            var projectProgress = new WebInspector.CompositeProgress(compositeProgress.createSubProgress(weight));
            var findMatchingFilesProgress = projectProgress.createSubProgress();
            var searchContentProgress = projectProgress.createSubProgress();
            var barrierCallback = barrier.createCallback();
            var callback = this._processMatchingFilesForProject.bind(this, this._searchId, project, searchContentProgress, barrierCallback);
            project.findFilesMatchingSearchRequest(searchConfig.queries(), searchConfig.fileQueries(), !searchConfig.ignoreCase, searchConfig.isRegex, findMatchingFilesProgress, callback);
        }
        barrier.callWhenDone(this._searchFinishedCallback.bind(this, true));
    },

    /**
     * @param {number} searchId
     * @param {!WebInspector.Project} project
     * @param {!WebInspector.Progress} progress
     * @param {function()} callback
     * @param {!Array.<string>} files
     */
    _processMatchingFilesForProject: function(searchId, project, progress, callback, files)
    {
        if (searchId !== this._searchId) {
            this._searchFinishedCallback(false);
            return;
        }

        if (!files.length) {
            progress.done();
            callback();
            return;
        }

        progress.setTotalWork(files.length);

        var fileIndex = 0;
        var maxFileContentRequests = 20;
        var callbacksLeft = 0;

        for (var i = 0; i < maxFileContentRequests && i < files.length; ++i)
            scheduleSearchInNextFileOrFinish.call(this);

        /**
         * @param {!string} path
         */
        function searchInNextFile(path)
        {
            var uiSourceCode = project.uiSourceCode(path);
            if (!uiSourceCode) {
                --callbacksLeft;
                progress.worked(1);
                scheduleSearchInNextFileOrFinish.call(this);
                return;
            }
            uiSourceCode.requestContent(contentLoaded.bind(this, path));
        }

        function scheduleSearchInNextFileOrFinish()
        {
            if (fileIndex >= files.length) {
                if (!callbacksLeft) {
                    progress.done();
                    callback();
                    return;
                }
                return;
            }

            ++callbacksLeft;
            var path = files[fileIndex++];
            setTimeout(searchInNextFile.bind(this, path), 0);
        }

        /**
         * @param {!string} path
         * @param {?string} content
         */
        function contentLoaded(path, content)
        {
            /**
             * @param {!WebInspector.ContentProvider.SearchMatch} a
             * @param {!WebInspector.ContentProvider.SearchMatch} b
             */
            function matchesComparator(a, b)
            {
                return a.lineNumber - b.lineNumber;
            }

            progress.worked(1);
            var matches = [];
            var queries = this._searchConfig.queries();
            if (content !== null) {
                for (var i = 0; i < queries.length; ++i) {
                    var nextMatches = WebInspector.ContentProvider.performSearchInContent(content, queries[i], !this._searchConfig.ignoreCase, this._searchConfig.isRegex)
                    matches = matches.mergeOrdered(nextMatches, matchesComparator);
                }
            }
            var uiSourceCode = project.uiSourceCode(path);
            if (matches && uiSourceCode) {
                var searchResult = new WebInspector.FileBasedSearchResultsPane.SearchResult(uiSourceCode, matches);
                this._searchResultCallback(searchResult);
            }

            --callbacksLeft;
            scheduleSearchInNextFileOrFinish.call(this);
        }
    },

    stopSearch: function()
    {
        ++this._searchId;
    },

    /**
     * @param {!WebInspector.SearchConfig} searchConfig
     */
    createSearchResultsPane: function(searchConfig)
    {
        return new WebInspector.FileBasedSearchResultsPane(searchConfig);
    },

    __proto__: WebInspector.SearchScope.prototype
}
