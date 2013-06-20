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
 * @extends {WebInspector.Object}
 * @param {WebInspector.IsolatedFileSystem} isolatedFileSystem
 * @param {WebInspector.Workspace} workspace
 */
WebInspector.FileSystemProjectDelegate = function(isolatedFileSystem, workspace)
{
    this._fileSystem = isolatedFileSystem;
    this._workspace = workspace;
}

WebInspector.FileSystemProjectDelegate._scriptExtensions = ["js", "java", "cc", "cpp", "h", "cs", "py", "php"].keySet();
WebInspector.FileSystemProjectDelegate._styleSheetExtensions = ["css", "scss", "sass"].keySet();

WebInspector.FileSystemProjectDelegate.projectId = function(fileSystemPath)
{
    return "filesystem:" + fileSystemPath;
}

WebInspector.FileSystemProjectDelegate.prototype = {
    /**
     * @return {string}
     */
    id: function()
    {
        return WebInspector.FileSystemProjectDelegate.projectId(this._fileSystem.path());
    },

    /**
     * @return {string}
     */
    type: function()
    {
        return WebInspector.projectTypes.FileSystem;
    },

    /**
     * @return {string}
     */
    fileSystemPath: function()
    {
        return this._fileSystem.path();
    },

    /**
     * @return {string}
     */
    displayName: function()
    {
        return this._fileSystem.path().substr(this._fileSystem.path().lastIndexOf("/") + 1);
    },

    /**
     * @param {string} path
     * @return {string}
     */
    _filePathForPath: function(path)
    {
        return "/" + path;
    },

    /**
     * @param {string} path
     * @param {function(?string,boolean,string)} callback
     */
    requestFileContent: function(path, callback)
    {
        var filePath = this._filePathForPath(path);
        this._fileSystem.requestFileContent(filePath, innerCallback.bind(this));
        
        /**
         * @param {?string} content
         */
        function innerCallback(content)
        {
            var contentType = this._contentTypeForPath(path);
            callback(content, false, contentType.canonicalMimeType());
        }
    },

    /**
     * @return {boolean}
     */
    canSetFileContent: function()
    {
        return true;
    },

    /**
     * @param {string} path
     * @param {string} newContent
     * @param {function(?string)} callback
     */
    setFileContent: function(path, newContent, callback)
    {
        var filePath = this._filePathForPath(path);
        this._fileSystem.setFileContent(filePath, newContent, callback.bind(this, ""));
    },

    /**
     * @return {boolean}
     */
    canRename: function()
    {
        return true;
    },

    /**
     * @param {string} path
     * @param {string} newName
     * @param {function(boolean, string=)} callback
     */
    rename: function(path, newName, callback)
    {
        var filePath = this._filePathForPath(path);
        this._fileSystem.renameFile(filePath, newName, callback);
    },

    /**
     * @param {string} path
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(Array.<WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInFileContent: function(path, query, caseSensitive, isRegex, callback)
    {
        var filePath = this._filePathForPath(path);
        this._fileSystem.requestFileContent(filePath, contentCallback.bind(this));

        /**
         * @param {?string} content
         */
        function contentCallback(content)
        {
            var result = [];
            if (content !== null)
                result = WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex);
            callback(result);
        }
    },

    /**
     * @param {string} path
     * @return {WebInspector.ResourceType}
     */
    _contentTypeForPath: function(path)
    {
        var extensionIndex = path.lastIndexOf(".");
        var extension = "";
        if (extensionIndex !== -1)
            extension = path.substring(extensionIndex + 1).toLowerCase();
        var contentType = WebInspector.resourceTypes.Other;
        if (WebInspector.FileSystemProjectDelegate._scriptExtensions[extension])
            return WebInspector.resourceTypes.Script;
        if (WebInspector.FileSystemProjectDelegate._styleSheetExtensions[extension])
            return WebInspector.resourceTypes.Stylesheet;
        if (extension === "html" || extension === "htm")
            return WebInspector.resourceTypes.Document;
        return WebInspector.resourceTypes.Other;
    },

    populate: function()
    {
        this._fileSystem.requestFilesRecursive("", this._addFile.bind(this));
    },

    /**
     * @param {string} filePath
     */
    _addFile: function(filePath)
    {
        if (!filePath)
            console.assert(false);
        var fullPath = this._fileSystem.path() + "/" + filePath;

        var slash = filePath.lastIndexOf("/");
        var parentPath = filePath.substring(0, slash);
        var name = filePath.substring(slash + 1);

        var url = this._workspace.urlForPath(this._fileSystem.path(), filePath);
        var contentType = this._contentTypeForPath(filePath);
        var fileDescriptor = new WebInspector.FileDescriptor(parentPath, name, "file://" + fullPath, url, contentType, true);
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileAdded, fileDescriptor);
    },

    /**
     * @param {string} path
     */
    _removeFile: function(path)
    {
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileRemoved, path);
    },

    reset: function()
    {
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.Reset, null);
    },
    
    __proto__: WebInspector.Object.prototype
}

/**
 * @type {?WebInspector.FileSystemProjectDelegate}
 */
WebInspector.fileSystemProjectDelegate = null;

/**
 * @constructor
 * @param {WebInspector.IsolatedFileSystemManager} isolatedFileSystemManager
 * @param {WebInspector.Workspace} workspace
 */
WebInspector.FileSystemWorkspaceProvider = function(isolatedFileSystemManager, workspace)
{
    this._isolatedFileSystemManager = isolatedFileSystemManager;
    this._workspace = workspace;
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
    this._simpleProjectDelegates = {};
}

WebInspector.FileSystemWorkspaceProvider.prototype = {
    /**
     * @param {WebInspector.Event} event
     */
    _fileSystemAdded: function(event)
    {
        var fileSystem = /** @type {WebInspector.IsolatedFileSystem} */ (event.data);
        var projectId = WebInspector.FileSystemProjectDelegate.projectId(fileSystem.path());
        var projectDelegate = new WebInspector.FileSystemProjectDelegate(fileSystem, this._workspace)
        this._simpleProjectDelegates[projectDelegate.id()] = projectDelegate;
        console.assert(!this._workspace.project(projectDelegate.id()));
        this._workspace.addProject(projectDelegate);
        projectDelegate.populate();
    },

    /**
     * @param {WebInspector.Event} event
     */
    _fileSystemRemoved: function(event)
    {
        var fileSystem = /** @type {WebInspector.IsolatedFileSystem} */ (event.data);
        var projectId = WebInspector.FileSystemProjectDelegate.projectId(fileSystem.path());
        this._workspace.removeProject(projectId);
        delete this._simpleProjectDelegates[projectId];
    },

    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     */
    fileSystemPath: function(uiSourceCode)
    {
        var projectDelegate = this._simpleProjectDelegates[uiSourceCode.project().id()];
        return projectDelegate.fileSystemPath();
    }
}

/**
 * @type {?WebInspector.FileSystemWorkspaceProvider}
 */
WebInspector.fileSystemWorkspaceProvider = null;
