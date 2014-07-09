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
 */
WebInspector.SourcesSearchScope = function()
{
    // FIXME: Add title once it is used by search controller.
    this._searchId = 0;
    this._workspace = WebInspector.workspace;
}

WebInspector.SourcesSearchScope.prototype = {
    /**
     * @param {!WebInspector.Progress} progress
     * @param {function(boolean)} indexingFinishedCallback
     */
    performIndexing: function(progress, indexingFinishedCallback)
    {
        this.stopSearch();

        var projects = this._projects();
        var compositeProgress = new WebInspector.CompositeProgress(progress);
        progress.addEventListener(WebInspector.Progress.Events.Canceled, indexingCanceled);
        for (var i = 0; i < projects.length; ++i) {
            var project = projects[i];
            var projectProgress = compositeProgress.createSubProgress(project.uiSourceCodes().length);
            project.indexContent(projectProgress);
        }
        compositeProgress.addEventListener(WebInspector.Progress.Events.Done, indexingFinishedCallback.bind(this, true));

        function indexingCanceled()
        {
            indexingFinishedCallback(false);
            progress.done();
        }
    },

    /**
     * @return {!Array.<!WebInspector.Project>}
     */
    _projects: function()
    {
        /**
         * @param {!WebInspector.Project} project
         * @return {boolean}
         */
        function filterOutServiceProjects(project)
        {
            return !project.isServiceProject() || project.type() === WebInspector.projectTypes.Formatter;
        }

        /**
         * @param {!WebInspector.Project} project
         * @return {boolean}
         */
        function filterOutContentScriptsIfNeeded(project)
        {
            return WebInspector.settings.searchInContentScripts.get() || project.type() !== WebInspector.projectTypes.ContentScripts;
        }

        return this._workspace.projects().filter(filterOutServiceProjects).filter(filterOutContentScriptsIfNeeded);
    },

    /**
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @param {!WebInspector.Progress} progress
     * @param {function(!WebInspector.FileBasedSearchResult)} searchResultCallback
     * @param {function(boolean)} searchFinishedCallback
     */
    performSearch: function(searchConfig, progress, searchResultCallback, searchFinishedCallback)
    {
        this.stopSearch();
        this._searchResultCallback = searchResultCallback;
        this._searchFinishedCallback = searchFinishedCallback;
        this._searchConfig = searchConfig;

        var projects = this._projects();
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
            project.findFilesMatchingSearchRequest(searchConfig, findMatchingFilesProgress, callback);
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

        addDirtyFiles.call(this);

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
         * @this {WebInspector.SourcesSearchScope}
         */
        function addDirtyFiles()
        {
            var matchingFiles = StringSet.fromArray(files);
            var uiSourceCodes = project.uiSourceCodes();
            for (var i = 0; i < uiSourceCodes.length; ++i) {
                if (!uiSourceCodes[i].isDirty())
                    continue;
                var path = uiSourceCodes[i].path();
                if (!matchingFiles.contains(path) && this._searchConfig.filePathMatchesFileQuery(path))
                    files.push(path);
            }
        }

        /**
         * @param {string} path
         * @this {WebInspector.SourcesSearchScope}
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
            if (uiSourceCode.isDirty())
                contentLoaded.call(this, uiSourceCode.path(), uiSourceCode.workingCopy());
            else
                uiSourceCode.checkContentUpdated(contentUpdated.bind(this, uiSourceCode));
        }

        /**
         * @param {!WebInspector.UISourceCode} uiSourceCode
         * @this {WebInspector.SourcesSearchScope}
         */
        function contentUpdated(uiSourceCode)
        {
            uiSourceCode.requestContent(contentLoaded.bind(this, uiSourceCode.path()));
        }

        /**
         * @this {WebInspector.SourcesSearchScope}
         */
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
         * @param {string} path
         * @param {?string} content
         * @this {WebInspector.SourcesSearchScope}
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
                    var nextMatches = WebInspector.ContentProvider.performSearchInContent(content, queries[i], !this._searchConfig.ignoreCase(), this._searchConfig.isRegex())
                    matches = matches.mergeOrdered(nextMatches, matchesComparator);
                }
            }
            var uiSourceCode = project.uiSourceCode(path);
            if (matches && uiSourceCode) {
                var searchResult = new WebInspector.FileBasedSearchResult(uiSourceCode, matches);
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
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @return {!WebInspector.FileBasedSearchResultsPane}
     */
    createSearchResultsPane: function(searchConfig)
    {
        return new WebInspector.FileBasedSearchResultsPane(searchConfig);
    }
}
