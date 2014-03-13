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
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.SourcesNavigator = function(workspace)
{
    WebInspector.Object.call(this);
    this._workspace = workspace;

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.shrinkableTabs = true;
    this._tabbedPane.element.classList.add("navigator-tabbed-pane");

    this._sourcesView = new WebInspector.NavigatorView();
    this._sourcesView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._sourceSelected, this);
    this._sourcesView.addEventListener(WebInspector.NavigatorView.Events.ItemRenamingRequested, this._itemRenamingRequested, this);
    this._sourcesView.addEventListener(WebInspector.NavigatorView.Events.ItemCreationRequested, this._itemCreationRequested, this);

    this._contentScriptsView = new WebInspector.NavigatorView();
    this._contentScriptsView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._sourceSelected, this);
    this._contentScriptsView.addEventListener(WebInspector.NavigatorView.Events.ItemRenamingRequested, this._itemRenamingRequested, this);
    this._contentScriptsView.addEventListener(WebInspector.NavigatorView.Events.ItemCreationRequested, this._itemCreationRequested, this);

    this._snippetsView = new WebInspector.SnippetsNavigatorView();
    this._snippetsView.addEventListener(WebInspector.NavigatorView.Events.ItemSelected, this._sourceSelected, this);
    this._snippetsView.addEventListener(WebInspector.NavigatorView.Events.ItemRenamingRequested, this._itemRenamingRequested, this);
    this._snippetsView.addEventListener(WebInspector.NavigatorView.Events.ItemCreationRequested, this._itemCreationRequested, this);

    this._tabbedPane.appendTab(WebInspector.SourcesNavigator.SourcesTab, WebInspector.UIString("Sources"), this._sourcesView);
    this._tabbedPane.selectTab(WebInspector.SourcesNavigator.SourcesTab);
    this._tabbedPane.appendTab(WebInspector.SourcesNavigator.ContentScriptsTab, WebInspector.UIString("Content scripts"), this._contentScriptsView);
    this._tabbedPane.appendTab(WebInspector.SourcesNavigator.SnippetsTab, WebInspector.UIString("Snippets"), this._snippetsView);

    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectWillReset, this._projectWillReset.bind(this), this);
    WebInspector.startBatchUpdate();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    WebInspector.endBatchUpdate();
}

WebInspector.SourcesNavigator.Events = {
    SourceSelected: "SourceSelected",
    SourceRenamed: "SourceRenamed"
}

WebInspector.SourcesNavigator.SourcesTab = "sources";
WebInspector.SourcesNavigator.ContentScriptsTab = "contentScripts";
WebInspector.SourcesNavigator.SnippetsTab = "snippets";

WebInspector.SourcesNavigator.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    get view()
    {
        return this._tabbedPane;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _navigatorViewForUISourceCode: function(uiSourceCode)
    {
        if (uiSourceCode.isContentScript)
            return this._contentScriptsView;
        else if (uiSourceCode.project().type() === WebInspector.projectTypes.Snippets)
            return this._snippetsView;
        else
            return this._sourcesView;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    revealUISourceCode: function(uiSourceCode)
    {
        this._navigatorViewForUISourceCode(uiSourceCode).revealUISourceCode(uiSourceCode, true);
        if (uiSourceCode.isContentScript)
            this._tabbedPane.selectTab(WebInspector.SourcesNavigator.ContentScriptsTab);
        else if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            this._tabbedPane.selectTab(WebInspector.SourcesNavigator.SourcesTab);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    updateIcon: function(uiSourceCode)
    {
        this._navigatorViewForUISourceCode(uiSourceCode).updateIcon(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {boolean} deleteIfCanceled
     */
    _rename: function(uiSourceCode, deleteIfCanceled)
    {
        this._navigatorViewForUISourceCode(uiSourceCode).rename(uiSourceCode, callback.bind(this));

        /**
         * @this {WebInspector.SourcesNavigator}
         * @param {boolean} committed
         */
        function callback(committed)
        {
            if (!committed) {
                if (deleteIfCanceled)
                    uiSourceCode.remove();
                return;
            }

            var data = { uiSourceCode: uiSourceCode };
            this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceRenamed, data);
            this.updateIcon(uiSourceCode);
            this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceSelected, data);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceSelected: function(event)
    {
        this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceSelected, event.data);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _itemRenamingRequested: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._rename(uiSourceCode, false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _itemCreationRequested: function(event)
    {
        var project = event.data.project;
        var path = event.data.path;
        var uiSourceCodeToCopy = event.data.uiSourceCode;
        var filePath;
        var uiSourceCode;

        /**
         * @this {WebInspector.SourcesNavigator}
         * @param {?string} content
         */
        function contentLoaded(content)
        {
            createFile.call(this, content || "");
        }

        if (uiSourceCodeToCopy)
            uiSourceCodeToCopy.requestContent(contentLoaded.bind(this));
        else
            createFile.call(this);

        /**
         * @this {WebInspector.SourcesNavigator}
         * @param {string=} content
         */
        function createFile(content)
        {
            project.createFile(path, null, content || "", fileCreated.bind(this));
        }

        /**
         * @this {WebInspector.SourcesNavigator}
         * @param {?string} path
         */
        function fileCreated(path)
        {
            if (!path)
                return;
            filePath = path;
            uiSourceCode = project.uiSourceCode(filePath);

            var data = { uiSourceCode: uiSourceCode };
            this.dispatchEventToListeners(WebInspector.SourcesNavigator.Events.SourceSelected, data);
            this._rename(uiSourceCode, true);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _addUISourceCode: function(uiSourceCode)
    {
        if (uiSourceCode.project().isServiceProject())
            return;
        this._navigatorViewForUISourceCode(uiSourceCode).addUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeUISourceCode: function(uiSourceCode)
    {
        this._navigatorViewForUISourceCode(uiSourceCode).removeUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._addUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._removeUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _projectWillReset: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        var uiSourceCodes = project.uiSourceCodes();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            this._removeUISourceCode(uiSourceCodes[i]);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.NavigatorView}
 */
WebInspector.SnippetsNavigatorView = function()
{
    WebInspector.NavigatorView.call(this);
}

WebInspector.SnippetsNavigatorView.prototype = {
    /**
     * @param {!Event} event
     */
    handleContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("New"), this._handleCreateSnippet.bind(this));
        contextMenu.show();
    },

    /**
     * @param {!Event} event
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    handleFileContextMenu: function(event, uiSourceCode)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("Run"), this._handleEvaluateSnippet.bind(this, uiSourceCode));
        contextMenu.appendItem(WebInspector.UIString("Rename"), this.requestRename.bind(this, uiSourceCode));
        contextMenu.appendItem(WebInspector.UIString("Remove"), this._handleRemoveSnippet.bind(this, uiSourceCode));
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("New"), this._handleCreateSnippet.bind(this));
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleEvaluateSnippet: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return;
        WebInspector.scriptSnippetModel.evaluateScriptSnippet(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleRemoveSnippet: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return;
        uiSourceCode.project().deleteFile(uiSourceCode.path());
    },

    _handleCreateSnippet: function()
    {
        var data = {};
        data.project = WebInspector.scriptSnippetModel.project();
        data.path = "";
        this.dispatchEventToListeners(WebInspector.NavigatorView.Events.ItemCreationRequested, data);
    },

    /**
     * @override
     */
    sourceDeleted: function(uiSourceCode)
    {
        this._handleRemoveSnippet(uiSourceCode);
    },

    __proto__: WebInspector.NavigatorView.prototype
}
