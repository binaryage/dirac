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
 */
WebInspector.AdvancedSearchController = function()
{
    this._searchId = 0;

    WebInspector.settings.advancedSearchConfig = WebInspector.settings.createSetting("advancedSearchConfig", new WebInspector.SearchConfig("", true, false).toPlainObject());
}

WebInspector.AdvancedSearchController.prototype = {
    show: function()
    {
        var selection = window.getSelection();
        var queryCandidate;
        if (selection.rangeCount)
            queryCandidate = selection.toString().replace(/\r?\n.*/, "");

        if (!this._searchView || !this._searchView.isShowing())
            WebInspector.inspectorView.showViewInDrawer("search");
        if (queryCandidate)
            this._searchView._search.value = queryCandidate;
        this._searchView.focus();

        this.startIndexing();
    },

    /**
     * @param {boolean} finished
     */
    _onIndexingFinished: function(finished)
    {
        delete this._isIndexing;
        this._searchView.indexingFinished(finished);
        if (!finished)
            delete this._pendingSearchConfig;
        if (!this._pendingSearchConfig)
            return;
        var searchConfig = this._pendingSearchConfig
        delete this._pendingSearchConfig;
        this._innerStartSearch(searchConfig);
    },

    startIndexing: function()
    {
        this._isIndexing = true;
        // FIXME: this._currentSearchScope should be initialized based on searchConfig
        this._currentSearchScope = this._searchScopes()[0];
        if (this._progressIndicator)
            this._progressIndicator.done();
        this._progressIndicator = new WebInspector.ProgressIndicator();
        this._searchView.indexingStarted(this._progressIndicator);
        this._currentSearchScope.performIndexing(this._progressIndicator, this._onIndexingFinished.bind(this));
    },

    /**
     * @param {number} searchId
     * @param {!WebInspector.FileBasedSearchResult} searchResult
     */
    _onSearchResult: function(searchId, searchResult)
    {
        if (searchId !== this._searchId)
            return;
        this._searchView.addSearchResult(searchResult);
        if (!searchResult.searchMatches.length)
            return;
        if (!this._searchResultsPane)
            this._searchResultsPane = this._currentSearchScope.createSearchResultsPane(this._searchConfig);
        this._searchView.resultsPane = this._searchResultsPane;
        this._searchResultsPane.addSearchResult(searchResult);
    },

    /**
     * @param {number} searchId
     * @param {boolean} finished
     */
    _onSearchFinished: function(searchId, finished)
    {
        if (searchId !== this._searchId)
            return;
        if (!this._searchResultsPane)
            this._searchView.nothingFound();
        this._searchView.searchFinished(finished);
        delete this._searchConfig;
    },

    /**
     * @param {!WebInspector.SearchConfig} searchConfig
     */
    startSearch: function(searchConfig)
    {
        this.resetSearch();
        ++this._searchId;
        if (!this._isIndexing)
            this.startIndexing();
        this._pendingSearchConfig = searchConfig;
    },

    /**
     * @param {!WebInspector.SearchConfig} searchConfig
     */
    _innerStartSearch: function(searchConfig)
    {
        this._searchConfig = searchConfig;
        // FIXME: this._currentSearchScope should be initialized based on searchConfig
        this._currentSearchScope = this._searchScopes()[0];

        if (this._progressIndicator)
            this._progressIndicator.done();
        this._progressIndicator = new WebInspector.ProgressIndicator();
        this._searchView.searchStarted(this._progressIndicator);
        this._currentSearchScope.performSearch(searchConfig, this._progressIndicator, this._onSearchResult.bind(this, this._searchId), this._onSearchFinished.bind(this, this._searchId));
    },

    resetSearch: function()
    {
        this.stopSearch();

        if (this._searchResultsPane) {
            this._searchView.resetResults();
            delete this._searchResultsPane;
        }
    },

    stopSearch: function()
    {
        if (this._progressIndicator)
            this._progressIndicator.cancel();
        if (this._currentSearchScope)
            this._currentSearchScope.stopSearch();
        delete this._searchConfig;
    },

    /**
     * @return {!Array.<!WebInspector.SearchScope>}
     */
    _searchScopes: function()
    {
        // FIXME: implement multiple search scopes.
        return /** @type {!Array.<!WebInspector.SearchScope>} */ (WebInspector.moduleManager.instances(WebInspector.SearchScope));
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SearchView = function()
{
    WebInspector.VBox.call(this);

    this._controller = WebInspector.advancedSearchController;
    WebInspector.advancedSearchController._searchView = this;

    this.element.classList.add("search-view");

    this._searchPanelElement = this.element.createChild("div", "search-drawer-header");
    this._searchPanelElement.addEventListener("keydown", this._onKeyDown.bind(this), false);

    this._searchResultsElement = this.element.createChild("div");
    this._searchResultsElement.className = "search-results";

    this._search = this._searchPanelElement.createChild("input");
    this._search.placeholder = WebInspector.UIString("Search sources");
    this._search.setAttribute("type", "text");
    this._search.classList.add("search-config-search");
    this._search.setAttribute("results", "0");
    this._search.setAttribute("size", 30);

    this._ignoreCaseLabel = this._searchPanelElement.createChild("label");
    this._ignoreCaseLabel.classList.add("search-config-label");
    this._ignoreCaseCheckbox = this._ignoreCaseLabel.createChild("input");
    this._ignoreCaseCheckbox.setAttribute("type", "checkbox");
    this._ignoreCaseCheckbox.classList.add("search-config-checkbox");
    this._ignoreCaseLabel.appendChild(document.createTextNode(WebInspector.UIString("Ignore case")));

    this._regexLabel = this._searchPanelElement.createChild("label");
    this._regexLabel.classList.add("search-config-label");
    this._regexCheckbox = this._regexLabel.createChild("input");
    this._regexCheckbox.setAttribute("type", "checkbox");
    this._regexCheckbox.classList.add("search-config-checkbox");
    this._regexLabel.appendChild(document.createTextNode(WebInspector.UIString("Regular expression")));

    this._searchStatusBarElement = this.element.createChild("div", "search-status-bar-summary");
    this._searchMessageElement = this._searchStatusBarElement.createChild("span");
    this._searchResultsMessageElement = document.createElement("span");

    this._load();
}

WebInspector.SearchView.prototype = {
    /**
     * @return {!WebInspector.SearchConfig}
     */
    get searchConfig()
    {
        return new WebInspector.SearchConfig(this._search.value, this._ignoreCaseCheckbox.checked, this._regexCheckbox.checked);
    },

    /**
     * @type {!WebInspector.SearchResultsPane}
     */
    set resultsPane(resultsPane)
    {
        this.resetResults();
        this._searchResultsElement.appendChild(resultsPane.element);
    },

    /**
     * @param {!WebInspector.ProgressIndicator} progressIndicator
     */
    searchStarted: function(progressIndicator)
    {
        this.resetResults();
        this._resetCounters();

        this._searchMessageElement.textContent = WebInspector.UIString("Searching...");
        progressIndicator.show(this._searchStatusBarElement);
        this._updateSearchResultsMessage();

        if (!this._searchingView)
            this._searchingView = new WebInspector.EmptyView(WebInspector.UIString("Searching..."));
        this._searchingView.show(this._searchResultsElement);
    },

    /**
     * @param {!WebInspector.ProgressIndicator} progressIndicator
     */
    indexingStarted: function(progressIndicator)
    {
        this._searchMessageElement.textContent = WebInspector.UIString("Indexing...");
        progressIndicator.show(this._searchStatusBarElement);
    },

    /**
     * @param {boolean} finished
     */
    indexingFinished: function(finished)
    {
        this._searchMessageElement.textContent = finished ? "" : WebInspector.UIString("Indexing interrupted.");
    },

    _updateSearchResultsMessage: function()
    {
        if (this._searchMatchesCount && this._searchResultsCount)
            this._searchResultsMessageElement.textContent = WebInspector.UIString("Found %d matches in %d files.", this._searchMatchesCount, this._nonEmptySearchResultsCount);
        else
            this._searchResultsMessageElement.textContent = "";
    },

    resetResults: function()
    {
        if (this._searchingView)
            this._searchingView.detach();
        if (this._notFoundView)
            this._notFoundView.detach();
        this._searchResultsElement.removeChildren();
    },

    _resetCounters: function()
    {
        this._searchMatchesCount = 0;
        this._searchResultsCount = 0;
        this._nonEmptySearchResultsCount = 0;
    },

    nothingFound: function()
    {
        this.resetResults();

        if (!this._notFoundView)
            this._notFoundView = new WebInspector.EmptyView(WebInspector.UIString("No matches found."));
        this._notFoundView.show(this._searchResultsElement);
        this._searchResultsMessageElement.textContent = WebInspector.UIString("No matches found.");
    },

    /**
     * @param {!WebInspector.FileBasedSearchResult} searchResult
     */
    addSearchResult: function(searchResult)
    {
        this._searchMatchesCount += searchResult.searchMatches.length;
        this._searchResultsCount++;
        if (searchResult.searchMatches.length)
            this._nonEmptySearchResultsCount++;
        this._updateSearchResultsMessage();
    },

    /**
     * @param {boolean} finished
     */
    searchFinished: function(finished)
    {
        this._searchMessageElement.textContent = finished ? WebInspector.UIString("Search finished.") : WebInspector.UIString("Search interrupted.");
    },

    focus: function()
    {
        WebInspector.setCurrentFocusElement(this._search);
        this._search.select();
    },

    willHide: function()
    {
        this._controller.stopSearch();
    },

    /**
     * @param {?Event} event
     */
    _onKeyDown: function(event)
    {
        switch (event.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Enter.code:
            this._onAction();
            break;
        }
    },

    _save: function()
    {
        WebInspector.settings.advancedSearchConfig.set(this.searchConfig.toPlainObject());
    },

    _load: function()
    {
        var searchConfig = WebInspector.SearchConfig.fromPlainObject(WebInspector.settings.advancedSearchConfig.get());
        this._search.value = searchConfig.query();
        this._ignoreCaseCheckbox.checked = searchConfig.ignoreCase();
        this._regexCheckbox.checked = searchConfig.isRegex();
    },

    _onAction: function()
    {
        var searchConfig = this.searchConfig;
        if (!searchConfig.query() || !searchConfig.query().length)
            return;

        this._save();
        this._controller.startSearch(searchConfig);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ProjectSearchConfig} searchConfig
 */
WebInspector.SearchResultsPane = function(searchConfig)
{
    this._searchConfig = searchConfig;
    this.element = document.createElement("div");
}

WebInspector.SearchResultsPane.prototype = {
    /**
     * @return {!WebInspector.ProjectSearchConfig}
     */
    get searchConfig()
    {
        return this._searchConfig;
    },

    /**
     * @param {!WebInspector.FileBasedSearchResult} searchResult
     */
    addSearchResult: function(searchResult) { }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.AdvancedSearchController.ToggleDrawerViewActionDelegate = function()
{
}

WebInspector.AdvancedSearchController.ToggleDrawerViewActionDelegate.prototype = {
    /**
     * @param {!Event} event
     * @return {boolean}
     */
    handleAction: function(event)
    {
        if (WebInspector.Dialog.currentInstance())
            return false;
        var searchView = WebInspector.advancedSearchController._searchView;
        if (!searchView || !searchView.isShowing() || searchView._search !== document.activeElement) {
            WebInspector.inspectorView.showPanel("sources");
            WebInspector.advancedSearchController.show();
        } else {
            WebInspector.inspectorView.closeDrawer();
        }
        return true;
    }
}


/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!Array.<!Object>} searchMatches
 */
WebInspector.FileBasedSearchResult = function(uiSourceCode, searchMatches) {
    this.uiSourceCode = uiSourceCode;
    this.searchMatches = searchMatches;
}

/**
 * @interface
 */
WebInspector.SearchScope = function()
{
}

WebInspector.SearchScope.prototype = {
    /**
     * @param {!WebInspector.SearchConfig} searchConfig
     * @param {!WebInspector.Progress} progress
     * @param {function(!WebInspector.FileBasedSearchResult)} searchResultCallback
     * @param {function(boolean)} searchFinishedCallback
     */
    performSearch: function(searchConfig, progress, searchResultCallback, searchFinishedCallback) { },

    /**
     * @param {!WebInspector.Progress} progress
     * @param {function(boolean)} callback
     */
    performIndexing: function(progress, callback) { },

    stopSearch: function() { },

    /**
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @return {!WebInspector.SearchResultsPane}
     */
    createSearchResultsPane: function(searchConfig) { }
}

/**
 * @type {!WebInspector.AdvancedSearchController}
 */
WebInspector.advancedSearchController = new WebInspector.AdvancedSearchController();

importScript("SearchConfig.js");
importScript("FileBasedSearchResultsPane.js");
importScript("SourcesSearchScope.js");
