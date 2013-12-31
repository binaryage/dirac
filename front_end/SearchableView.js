/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.Searchable} searchable
 */
WebInspector.SearchableView = function(searchable)
{
    WebInspector.View.call(this);

    this._searchProvider = searchable;

    this.element.classList.add("vbox");
    this.element.style.flex = "auto";
    this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);

    this._footerElementContainer = this.element.createChild("div", "inspector-footer status-bar hidden");
    this._footerElementContainer.style.order = 100;

    this._footerElement = this._footerElementContainer.createChild("table", "toolbar-search");
    this._footerElement.cellSpacing = 0;

    this._firstRowElement = this._footerElement.createChild("tr");
    this._secondRowElement = this._footerElement.createChild("tr", "hidden");

    // Column 1
    var searchControlElementColumn = this._firstRowElement.createChild("td");
    this._searchControlElement = searchControlElementColumn.createChild("span", "toolbar-search-control");
    this._searchInputElement = this._searchControlElement.createChild("input", "search-replace");
    this._searchInputElement.id = "search-input-field";
    this._searchInputElement.placeholder = WebInspector.UIString("Find");

    this._matchesElement = this._searchControlElement.createChild("label", "search-results-matches");
    this._matchesElement.setAttribute("for", "search-input-field");

    this._searchNavigationElement = this._searchControlElement.createChild("div", "toolbar-search-navigation-controls");

    this._searchNavigationPrevElement = this._searchNavigationElement.createChild("div", "toolbar-search-navigation toolbar-search-navigation-prev");
    this._searchNavigationPrevElement.addEventListener("click", this._onPrevButtonSearch.bind(this), false);
    this._searchNavigationPrevElement.title = WebInspector.UIString("Search Previous");

    this._searchNavigationNextElement = this._searchNavigationElement.createChild("div", "toolbar-search-navigation toolbar-search-navigation-next");
    this._searchNavigationNextElement.addEventListener("click", this._onNextButtonSearch.bind(this), false);
    this._searchNavigationNextElement.title = WebInspector.UIString("Search Next");

    this._searchInputElement.addEventListener("mousedown", this._onSearchFieldManualFocus.bind(this), false); // when the search field is manually selected
    this._searchInputElement.addEventListener("keydown", this._onSearchKeyDown.bind(this), true);
    this._searchInputElement.addEventListener("input", this._onInput.bind(this), false);

    this._replaceInputElement = this._secondRowElement.createChild("td").createChild("input", "search-replace toolbar-replace-control");
    this._replaceInputElement.addEventListener("keydown", this._onReplaceKeyDown.bind(this), true);
    this._replaceInputElement.placeholder = WebInspector.UIString("Replace");

    // Column 2
    this._findButtonElement = this._firstRowElement.createChild("td").createChild("button", "hidden");
    this._findButtonElement.textContent = WebInspector.UIString("Find");
    this._findButtonElement.tabIndex = -1;
    this._findButtonElement.addEventListener("click", this._onNextButtonSearch.bind(this), false);

    this._replaceButtonElement = this._secondRowElement.createChild("td").createChild("button");
    this._replaceButtonElement.textContent = WebInspector.UIString("Replace");
    this._replaceButtonElement.disabled = true;
    this._replaceButtonElement.tabIndex = -1;
    this._replaceButtonElement.addEventListener("click", this._replace.bind(this), false);

    // Column 3
    this._prevButtonElement = this._firstRowElement.createChild("td").createChild("button", "hidden");
    this._prevButtonElement.textContent = WebInspector.UIString("Previous");
    this._prevButtonElement.disabled = true;
    this._prevButtonElement.tabIndex = -1;
    this._prevButtonElement.addEventListener("click", this._onPrevButtonSearch.bind(this), false);

    this._replaceAllButtonElement = this._secondRowElement.createChild("td").createChild("button");
    this._replaceAllButtonElement.textContent = WebInspector.UIString("Replace All");
    this._replaceAllButtonElement.addEventListener("click", this._replaceAll.bind(this), false);

    // Column 4
    this._replaceElement = this._firstRowElement.createChild("td").createChild("span");

    this._replaceCheckboxElement = this._replaceElement.createChild("input");
    this._replaceCheckboxElement.type = "checkbox";
    this._replaceCheckboxElement.id = "search-replace-trigger";
    this._replaceCheckboxElement.addEventListener("change", this._updateSecondRowVisibility.bind(this), false);

    this._replaceLabelElement = this._replaceElement.createChild("label");
    this._replaceLabelElement.textContent = WebInspector.UIString("Replace");
    this._replaceLabelElement.setAttribute("for", "search-replace-trigger");

    // Column 5
    var cancelButtonElement = this._firstRowElement.createChild("td").createChild("button");
    cancelButtonElement.textContent = WebInspector.UIString("Cancel");
    cancelButtonElement.tabIndex = -1;
    cancelButtonElement.addEventListener("click", this.closeSearch.bind(this), false);
    this._minimalSearchQuerySize = 3;

    this._registerShortcuts();
}

WebInspector.SearchableView.findShortcuts = function()
{
    if (WebInspector.SearchableView._findShortcuts)
        return WebInspector.SearchableView._findShortcuts;
    WebInspector.SearchableView._findShortcuts = [WebInspector.KeyboardShortcut.makeDescriptor("f", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)];
    if (!WebInspector.isMac())
        WebInspector.SearchableView._findShortcuts.push(WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F3));
    return WebInspector.SearchableView._findShortcuts;
}

WebInspector.SearchableView.cancelSearchShortcuts = function()
{
    if (WebInspector.SearchableView._cancelSearchShortcuts)
        return WebInspector.SearchableView._cancelSearchShortcuts;
    WebInspector.SearchableView._cancelSearchShortcuts = [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Esc)];
    return WebInspector.SearchableView._cancelSearchShortcuts;
}

WebInspector.SearchableView.findNextShortcut = function()
{
    if (WebInspector.SearchableView._findNextShortcut)
        return WebInspector.SearchableView._findNextShortcut;
    WebInspector.SearchableView._findNextShortcut = [];
    if (!WebInspector.isMac())
        WebInspector.SearchableView._findNextShortcut.push(WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta));
    return WebInspector.SearchableView._findNextShortcut;
}

WebInspector.SearchableView.findPreviousShortcuts = function()
{
    if (WebInspector.SearchableView._findPreviousShortcuts)
        return WebInspector.SearchableView._findPreviousShortcuts;
    WebInspector.SearchableView._findPreviousShortcuts = [];
    if (!WebInspector.isMac())
        WebInspector.SearchableView._findPreviousShortcuts.push(WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta | WebInspector.KeyboardShortcut.Modifiers.Shift));
    return WebInspector.SearchableView._findPreviousShortcuts;
}

WebInspector.SearchableView.prototype = {
    /**
     * @param {!KeyboardEvent} event
     */
    _onKeyDown: function(event)
    {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler(event))
            event.consume(true);
    },

    _registerShortcuts: function()
    {
        this._shortcuts = {};

        /**
         * @param {!Array.<!WebInspector.KeyboardShortcut.Descriptor>} shortcuts
         * @param {function()} handler
         * @this {WebInspector.SearchableView}
         */
        function register(shortcuts, handler)
        {
            for (var i = 0; i < shortcuts.length; ++i)
                this._shortcuts[shortcuts[i].key] = handler;
        }

        register.call(this, WebInspector.SearchableView.findShortcuts(), this.handleFindShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.cancelSearchShortcuts(), this.handleCancelSearchShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.findNextShortcut(), this.handleFindNextShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.findPreviousShortcuts(), this.handleFindPreviousShortcut.bind(this));
    },

    /**
     * @param {number} minimalSearchQuerySize
     */
    setMinimalSearchQuerySize: function(minimalSearchQuerySize)
    {
        this._minimalSearchQuerySize = minimalSearchQuerySize;
    },

    /**
     * @param {boolean} canReplace
     */
    setCanReplace: function(canReplace)
    {
        this._canReplace = canReplace;
    },

    /**
     * @param {number} matches
     */
    updateSearchMatchesCount: function(matches)
    {
        this._searchProvider.currentSearchMatches = matches;
        this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentQuery ? matches : 0, -1);
    },

    /**
     * @param {number} currentMatchIndex
     */
    updateCurrentMatchIndex: function(currentMatchIndex)
    {
        this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentSearchMatches, currentMatchIndex);
    },

    /**
     * @return {boolean}
     */
    isSearchVisible: function()
    {
        return this._searchIsVisible;
    },

    closeSearch: function()
    {
        this.cancelSearch();
        WebInspector.setCurrentFocusElement(WebInspector.previousFocusElement());
    },

    _toggleSearchBar: function(toggled)
    {
        this._footerElementContainer.enableStyleClass("hidden", !toggled);
        this.doResize();
    },

    cancelSearch: function()
    {
        if (!this._searchIsVisible)
            return;
        this.resetSearch();
        delete this._searchIsVisible;
        this._toggleSearchBar(false);
    },

    resetSearch: function()
    {
        this._clearSearch();
        this._updateReplaceVisibility();
        this._matchesElement.textContent = "";
    },

    /**
     * @return {boolean}
     */
    handleFindNextShortcut: function()
    {
        if (!this._searchIsVisible)
            return true;
        this._searchProvider.jumpToPreviousSearchResult();
        return true;
    },

    /**
     * @return {boolean}
     */
    handleFindPreviousShortcut: function()
    {
        if (!this._searchIsVisible)
            return true;
        this._searchProvider.jumpToNextSearchResult();
        return true;
    },

    /**
     * @return {boolean}
     */
    handleFindShortcut: function()
    {
        this.showSearchField();
        return true;
    },

    /**
     * @return {boolean}
     */
    handleCancelSearchShortcut: function()
    {
        if (!this._searchIsVisible)
            return false;
        this.closeSearch();
        return true;
    },

    /**
     * @param {boolean} enabled
     */
    _updateSearchNavigationButtonState: function(enabled)
    {
        this._replaceButtonElement.disabled = !enabled;
        this._prevButtonElement.disabled = !enabled;
        if (enabled) {
            this._searchNavigationPrevElement.classList.add("enabled");
            this._searchNavigationNextElement.classList.add("enabled");
        } else {
            this._searchNavigationPrevElement.classList.remove("enabled");
            this._searchNavigationNextElement.classList.remove("enabled");
        }
    },

    /**
     * @param {number} matches
     * @param {number} currentMatchIndex
     */
    _updateSearchMatchesCountAndCurrentMatchIndex: function(matches, currentMatchIndex)
    {
        if (!this._currentQuery)
            this._matchesElement.textContent = "";
        else if (matches === 0 || currentMatchIndex >= 0)
            this._matchesElement.textContent = WebInspector.UIString("%d of %d", currentMatchIndex + 1, matches);
        else if (matches === 1)
            this._matchesElement.textContent = WebInspector.UIString("1 match");
        else
            this._matchesElement.textContent = WebInspector.UIString("%d matches", matches);
        this._updateSearchNavigationButtonState(matches > 0);
    },

    showSearchField: function()
    {
        if (this._searchIsVisible)
            this.cancelSearch();

        this._toggleSearchBar(true);

        this._updateReplaceVisibility();
        if (WebInspector.currentFocusElement() !== this._searchInputElement) {
            var selection = window.getSelection();
            if (selection.rangeCount) {
                var queryCandidate = selection.toString().replace(/\r?\n.*/, "");
                if (queryCandidate)
                    this._searchInputElement.value = queryCandidate;
            }
        }
        this._performSearch(false, false);
        this._searchInputElement.focus();
        this._searchInputElement.select();
        this._searchIsVisible = true;
    },

    _updateReplaceVisibility: function()
    {
        this._replaceElement.enableStyleClass("hidden", !this._canReplace);
        if (!this._canReplace) {
            this._replaceCheckboxElement.checked = false;
            this._updateSecondRowVisibility();
        }
    },

    /**
     * @param {!Event} event
     */
    _onSearchFieldManualFocus: function(event)
    {
        WebInspector.setCurrentFocusElement(event.target);
    },

    /**
     * @param {!KeyboardEvent} event
     */
    _onSearchKeyDown: function(event)
    {
        if (isEnterKey(event)) {
            // FIXME: This won't start backwards search with Shift+Enter correctly.
            if (!this._currentQuery)
                this._performSearch(true, true);
            else
                this._jumpToNextSearchResult(event.shiftKey);
        }
    },

    /**
     * @param {!KeyboardEvent} event
     */
    _onReplaceKeyDown: function(event)
    {
        if (isEnterKey(event))
            this._replace();
    },

    /**
     * @param {boolean=} isBackwardSearch
     */
    _jumpToNextSearchResult: function(isBackwardSearch)
    {
        if (!this._currentQuery || !this._searchNavigationPrevElement.classList.contains("enabled"))
            return;

        if (isBackwardSearch)
            this._searchProvider.jumpToPreviousSearchResult();
        else
            this._searchProvider.jumpToNextSearchResult();
    },

    _onNextButtonSearch: function(event)
    {
        if (!this._searchNavigationNextElement.classList.contains("enabled"))
            return;
        // Simulate next search on search-navigation-button click.
        this._jumpToNextSearchResult();
        this._searchInputElement.focus();
    },

    _onPrevButtonSearch: function(event)
    {
        if (!this._searchNavigationPrevElement.classList.contains("enabled"))
            return;
        // Simulate previous search on search-navigation-button click.
        this._jumpToNextSearchResult(true);
        this._searchInputElement.focus();
    },

    _clearSearch: function()
    {
        delete this._currentQuery;
        if (!!this._searchProvider.currentQuery) {
            delete this._searchProvider.currentQuery;
            this._searchProvider.searchCanceled();
        }
        this._updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
    },

    /**
     * @param {boolean} forceSearch
     * @param {boolean} shouldJump
     */
    _performSearch: function(forceSearch, shouldJump)
    {
        var query = this._searchInputElement.value;
        if (!query || (!forceSearch && query.length < this._minimalSearchQuerySize && !this._currentQuery)) {
            this._clearSearch();
            return;
        }

        this._currentQuery = query;
        this._searchProvider.currentQuery = query;
        this._searchProvider.performSearch(query, shouldJump);
    },

    _updateSecondRowVisibility: function()
    {
        if (this._replaceCheckboxElement.checked) {
            this._footerElement.classList.add("toolbar-search-replace");
            this._secondRowElement.classList.remove("hidden");
            this._prevButtonElement.classList.remove("hidden");
            this._findButtonElement.classList.remove("hidden");
            this._replaceCheckboxElement.tabIndex = -1;
            this._replaceInputElement.focus();
        } else {
            this._footerElement.classList.remove("toolbar-search-replace");
            this._secondRowElement.classList.add("hidden");
            this._prevButtonElement.classList.add("hidden");
            this._findButtonElement.classList.add("hidden");
            this._replaceCheckboxElement.tabIndex = 0;
            this._searchInputElement.focus();
        }
        this.doResize();
    },

    _replace: function()
    {
        this._searchProvider.replaceSelectionWith(this._replaceInputElement.value);
        delete this._currentQuery;
        this._performSearch(true, true);
    },

    _replaceAll: function()
    {
        this._searchProvider.replaceAllWith(this._searchInputElement.value, this._replaceInputElement.value);
    },

    _onInput: function(event)
    {
        this._onValueChanged();
    },

    _onValueChanged: function()
    {
        this._performSearch(false, true);
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @interface
 */
WebInspector.Searchable = function()
{
}

WebInspector.Searchable.prototype = {
    searchCanceled: function() { },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump) { },

    jumpToNextSearchResult: function() { },

    jumpToPreviousSearchResult: function() { },
}
