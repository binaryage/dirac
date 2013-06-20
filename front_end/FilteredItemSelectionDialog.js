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
 * @extends {WebInspector.DialogDelegate}
 * @implements {WebInspector.ViewportControl.Provider}
 * @param {WebInspector.SelectionDialogContentProvider} delegate
 */
WebInspector.FilteredItemSelectionDialog = function(delegate)
{
    WebInspector.DialogDelegate.call(this);

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "filteredItemSelectionDialog.css", false);
    xhr.send(null);

    this.element = document.createElement("div");
    this.element.className = "filtered-item-list-dialog";
    this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    var styleElement = this.element.createChild("style");
    styleElement.type = "text/css";
    styleElement.textContent = xhr.responseText;

    this._promptElement = this.element.createChild("input", "monospace");
    this._promptElement.addEventListener("input", this._onInput.bind(this), false);
    this._promptElement.type = "text";
    this._promptElement.setAttribute("spellcheck", "false");

    this._filteredItems = [];
    this._viewportControl = new WebInspector.ViewportControl(this);
    this._itemElementsContainer = this._viewportControl.element;
    this._itemElementsContainer.addStyleClass("container");
    this._itemElementsContainer.addStyleClass("monospace");
    this._itemElementsContainer.addEventListener("click", this._onClick.bind(this), false);
    this.element.appendChild(this._itemElementsContainer);

    this._delegate = delegate;
    this._delegate.setRefreshCallback(this._itemsLoaded.bind(this));
    this._itemsLoaded();
}

/**
 * @param {string} query
 * @return {RegExp}
 */
WebInspector.FilteredItemSelectionDialog._createSearchRegex = function(query)
{
    const toEscape = String.regexSpecialCharacters();
    var regexString = "";
    for (var i = 0; i < query.length; ++i) {
        var c = query.charAt(i);
        if (toEscape.indexOf(c) !== -1)
            c = "\\" + c;
        if (i)
            regexString += "[^" + c + "]*";
        regexString += c;
    }
    return new RegExp(regexString, "i");
}

WebInspector.FilteredItemSelectionDialog.prototype = {
    /**
     * @param {Element} element
     * @param {Element} relativeToElement
     */
    position: function(element, relativeToElement)
    {
        const minWidth = 500;
        const minHeight = 204;
        var width = Math.max(relativeToElement.offsetWidth * 2 / 3, minWidth);
        var height = Math.max(relativeToElement.offsetHeight * 2 / 3, minHeight);

        this.element.style.width = width + "px";
        this.element.style.height = height + "px";

        const shadowPadding = 20; // shadow + padding
        element.positionAt(
            relativeToElement.totalOffsetLeft() + Math.max((relativeToElement.offsetWidth - width - 2 * shadowPadding) / 2, shadowPadding),
            relativeToElement.totalOffsetTop() + Math.max((relativeToElement.offsetHeight - height - 2 * shadowPadding) / 2, shadowPadding));
    },

    focus: function()
    {
        WebInspector.setCurrentFocusElement(this._promptElement);
        if (this._filteredItems.length && this._viewportControl.lastVisibleIndex() === -1)
            this._viewportControl.refresh();
    },

    willHide: function()
    {
        if (this._isHiding)
            return;
        this._isHiding = true;
        this._delegate.dispose();
        if (this._filterTimer)
            clearTimeout(this._filterTimer);
    },

    renderAsTwoRows: function()
    {
        this._renderAsTwoRows = true;
    },

    onEnter: function()
    {
        if (!this._delegate.itemCount())
            return;
        this._delegate.selectItem(this._filteredItems[this._selectedIndexInFiltered], this._promptElement.value.trim());
    },

    _itemsLoaded: function()
    {

        if (this._loadTimeout)
            return;
        this._loadTimeout = setTimeout(this._updateAfterItemsLoaded.bind(this), 0);
    },

    _updateAfterItemsLoaded: function()
    {
        delete this._loadTimeout;
        this._filterItems();
    },

    /**
     * @param {number} index
     * @return {Element}
     */
    _createItemElement: function(index)
    {
        var itemElement = document.createElement("div");
        itemElement.className = "filtered-item-list-dialog-item " + (this._renderAsTwoRows ? "two-rows" : "one-row");
        itemElement._titleElement = itemElement.createChild("span");
        itemElement._titleSuffixElement = itemElement.createChild("span");
        itemElement._subtitleElement = itemElement.createChild("div", "filtered-item-list-dialog-subtitle");
        itemElement._subtitleElement.textContent = "\u200B";
        itemElement._index = index;
        this._delegate.renderItem(index, this._promptElement.value.trim(), itemElement._titleElement, itemElement._subtitleElement);
        return itemElement;
    },

    /**
     * @param {string} query
     */
    setQuery: function(query)
    {
        this._promptElement.value = query;
        this._scheduleFilter();
    },

    _filterItems: function()
    {
        delete this._filterTimer;
        if (this._scoringTimer) {
            clearTimeout(this._scoringTimer);
            delete this._scoringTimer;
        }

        var query = this._delegate.rewriteQuery(this._promptElement.value.trim());
        this._query = query;
        var queryLength = query.length;
        var filterRegex = query ? WebInspector.FilteredItemSelectionDialog._createSearchRegex(query) : null;

        var oldSelectedAbsoluteIndex = this._selectedIndexInFiltered ? this._filteredItems[this._selectedIndexInFiltered] : null;
        this._filteredItems = [];
        this._selectedIndexInFiltered = 0;

        var cachedKeys = new Array(this._delegate.itemCount());
        var scores = new Array(this._delegate.itemCount());

        scoreItems.call(this, 0);

        function scoreItems(fromIndex)
        {
            const maxWorkItems = 1000;
            var workDone = 0;
            for (var i = fromIndex; i < this._delegate.itemCount() && workDone < maxWorkItems; ++i) {
                var key = this._delegate.itemKeyAt(i);
                if (filterRegex && !filterRegex.test(key))
                    continue;
                cachedKeys[i] = key;
                this._filteredItems.push(i);
                scores[i] = this._delegate.itemScoreAt(i, query);
                if (query)
                    workDone++;
            }

            if (i < this._delegate.itemCount()) {
                this._scoringTimer = setTimeout(scoreItems.bind(this, i), 0);
                return;
            }

            delete this._scoringTimer;
            const numberOfItemsToSort = 100;
            if (this._filteredItems.length > numberOfItemsToSort)
                this._filteredItems.sortRange(compareFunction.bind(this), 0, this._filteredItems.length - 1, numberOfItemsToSort);
            else
                this._filteredItems.sort(compareFunction.bind(this));

            for (var i = 0; i < this._filteredItems.length; ++i) {
                if (this._filteredItems[i] === oldSelectedAbsoluteIndex) {
                    this._selectedIndexInFiltered = i;
                    break;
                }
            }
            this._viewportControl.refresh();
            if (!query)
                this._selectedIndexInFiltered = 0;
            this._updateSelection(this._selectedIndexInFiltered, false);
        }

        function compareFunction(index1, index2)
        {
            if (scores) {
                var score1 = scores[index1];
                var score2 = scores[index2];
                if (score1 > score2)
                    return -1;
                if (score1 < score2)
                    return 1;
            }
            var key1 = cachedKeys[index1];
            var key2 = cachedKeys[index2];
            return key1.compareTo(key2) || (index2 - index1);
        }
    },

    _onInput: function(event)
    {
        this._scheduleFilter();
    },

    _onKeyDown: function(event)
    {
        var newSelectedIndex = this._selectedIndexInFiltered;

        switch (event.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Down.code:
            if (++newSelectedIndex >= this._filteredItems.length)
                newSelectedIndex = this._filteredItems.length - 1;
            this._updateSelection(newSelectedIndex, true);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.Up.code:
            if (--newSelectedIndex < 0)
                newSelectedIndex = 0;
            this._updateSelection(newSelectedIndex, false);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.PageDown.code:
            newSelectedIndex = Math.min(newSelectedIndex + this._viewportControl.rowsPerViewport(), this._filteredItems.length - 1);
            this._updateSelection(newSelectedIndex, true);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.PageUp.code:
            newSelectedIndex = Math.max(newSelectedIndex - this._viewportControl.rowsPerViewport(), 0);
            this._updateSelection(newSelectedIndex, false);
            event.consume(true);
            break;
        default:
        }
    },

    _scheduleFilter: function()
    {
        if (this._filterTimer)
            return;
        this._filterTimer = setTimeout(this._filterItems.bind(this), 0);
    },

    /**
     * @param {number} index  
     * @param {boolean} makeLast
     */
    _updateSelection: function(index, makeLast)
    { 
        var element = this._viewportControl.renderedElementAt(this._selectedIndexInFiltered);
        if (element)
            element.removeStyleClass("selected");
        this._viewportControl.scrollItemIntoView(index, makeLast);
        this._selectedIndexInFiltered = index;
        element = this._viewportControl.renderedElementAt(index);
        if (element)
            element.addStyleClass("selected");
    },

    _onClick: function(event)
    {
        var itemElement = event.target.enclosingNodeOrSelfWithClass("filtered-item-list-dialog-item");
        if (!itemElement)
            return;
        this._delegate.selectItem(itemElement._index, this._promptElement.value.trim());
        WebInspector.Dialog.hide();
    },

    /**
     * @return {number}
     */
    itemCount: function()
    {
        return this._filteredItems.length;
    },

    /**
     * @param {number} index
     * @return {Element}
     */
    itemElement: function(index)
    {
        var delegateIndex = this._filteredItems[index];
        return this._createItemElement(delegateIndex);
    },

    __proto__: WebInspector.DialogDelegate.prototype
}

/**
 * @constructor
 */
WebInspector.SelectionDialogContentProvider = function()
{
}

WebInspector.SelectionDialogContentProvider.prototype = {
    /**
     * @param {function():void} refreshCallback
     */
    setRefreshCallback: function(refreshCallback)
    {
        this._refreshCallback = refreshCallback;
    },

    /**
     * @return {number}
     */
    itemCount: function()
    {
        return 0;
    },

    /**
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return "";
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        return 1;
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @param {Element} titleElement
     * @param {Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
    },

    /**
     * @param {Element} element
     * @param {string} query
     * @return {boolean}
     */
    highlightRanges: function(element, query)
    {
        if (!query)
            return false;

        /**
         * @param {string} text
         * @param {string} query
         * @return {?Array.<{offset:number, length:number}>}
         */
        function rangesForMatch(text, query)
        {
            var sm = new difflib.SequenceMatcher(query, text);
            var opcodes = sm.get_opcodes();
            var ranges = [];

            for (var i = 0; i < opcodes.length; ++i) {
                var opcode = opcodes[i];
                if (opcode[0] === "equal")
                    ranges.push({offset: opcode[3], length: opcode[4] - opcode[3]});
                else if (opcode[0] !== "insert")
                    return null;
            }
            return ranges;
        }

        var text = element.textContent;
        var ranges = rangesForMatch(text, query);
        if (!ranges)
            ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
        if (ranges) {
            WebInspector.highlightRangesWithStyleClass(element, ranges, "highlight");
            return true;
        }
        return false;
    },

    /**
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
    },

    refresh: function()
    {
        this._refreshCallback();
    },

    /**
     * @param {string} query
     * @return {string}
     */
    rewriteQuery: function(query)
    {
        return query;
    },

    dispose: function()
    {
    }
}

/**
 * @constructor
 * @extends {WebInspector.SelectionDialogContentProvider}
 * @param {WebInspector.View} view
 * @param {WebInspector.ContentProvider} contentProvider
 */
WebInspector.JavaScriptOutlineDialog = function(view, contentProvider)
{
    WebInspector.SelectionDialogContentProvider.call(this);

    this._functionItems = [];
    this._view = view;
    contentProvider.requestContent(this._contentAvailable.bind(this));
}

/**
 * @param {WebInspector.View} view
 * @param {WebInspector.ContentProvider} contentProvider
 */
WebInspector.JavaScriptOutlineDialog.show = function(view, contentProvider)
{
    if (WebInspector.Dialog.currentInstance())
        return null;
    var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(new WebInspector.JavaScriptOutlineDialog(view, contentProvider));
    WebInspector.Dialog.show(view.element, filteredItemSelectionDialog);
}

WebInspector.JavaScriptOutlineDialog.prototype = {
    /**
     * @param {?string} content
     * @param {boolean} contentEncoded
     * @param {string} mimeType
     */
    _contentAvailable: function(content, contentEncoded, mimeType)
    {
        this._outlineWorker = new Worker("ScriptFormatterWorker.js");
        this._outlineWorker.onmessage = this._didBuildOutlineChunk.bind(this);
        const method = "outline";
        this._outlineWorker.postMessage({ method: method, params: { content: content } });
    },

    _didBuildOutlineChunk: function(event)
    {
        var data = event.data;
        var chunk = data["chunk"];
        for (var i = 0; i < chunk.length; ++i)
            this._functionItems.push(chunk[i]);

        if (data.total === data.index)
            this.dispose();

        this.refresh();
    },

    /**
     * @return {number}
     */
    itemCount: function()
    {
        return this._functionItems.length;
    },

    /**
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return this._functionItems[itemIndex].name;
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var item = this._functionItems[itemIndex];
        return -item.line;
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @param {Element} titleElement
     * @param {Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
        var item = this._functionItems[itemIndex];
        titleElement.textContent = item.name + (item.arguments ? item.arguments : "");
        this.highlightRanges(titleElement, query);
        subtitleElement.textContent = ":" + (item.line + 1);
    },

    /**
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        var lineNumber = this._functionItems[itemIndex].line;
        if (!isNaN(lineNumber) && lineNumber >= 0)
            this._view.highlightPosition(lineNumber, this._functionItems[itemIndex].column);
        this._view.focus();
    },

    dispose: function()
    {
        if (this._outlineWorker) {
            this._outlineWorker.terminate();
            delete this._outlineWorker;
        }
    },

    __proto__: WebInspector.SelectionDialogContentProvider.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SelectionDialogContentProvider}
 * @param {Map=} defaultScores
 */
WebInspector.SelectUISourceCodeDialog = function(defaultScores)
{
    WebInspector.SelectionDialogContentProvider.call(this);

    this._uiSourceCodes = [];
    var projects = WebInspector.workspace.projects().filter(this.filterProject.bind(this));
    for (var i = 0; i < projects.length; ++i)
        this._uiSourceCodes = this._uiSourceCodes.concat(projects[i].uiSourceCodes().filter(this.filterUISourceCode.bind(this)));
    this._defaultScores = defaultScores;
    WebInspector.workspace.addEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
}

WebInspector.SelectUISourceCodeDialog.prototype = {
    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber)
    {
        // Overridden by subclasses
    },

    /**
     * @param {WebInspector.Project} project
     */
    filterProject: function(project)
    {
        return true;
        // Overridden by subclasses
    },

    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     */
    filterUISourceCode: function(uiSourceCode)
    {
        return uiSourceCode.name();
    },

    /**
     * @return {number}
     */
    itemCount: function()
    {
        return this._uiSourceCodes.length;
    },

    /**
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return this._uiSourceCodes[itemIndex].fullName();
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var uiSourceCode = this._uiSourceCodes[itemIndex];
        var score = this._defaultScores ? (this._defaultScores.get(uiSourceCode) || 0) : 0;
        if (!query || query.length < 2)
            return score;

        if (this._query !== query) {
            this._query = query;
            this._queryToUpperCase = query.toUpperCase();
            this._ignoreCase = query === this._queryToUpperCase;
            this._filterRegex = WebInspector.FilteredItemSelectionDialog._createSearchRegex(query);
        }

        var path = uiSourceCode.fullName();
        return score + 10 * this._scoreTokens(path, this._queryToUpperCase, null);
    },

    /**
     * @param {string} path
     * @param {string} queryToUpperCase
     * @param {?Array.<number>} matchIndexes
     */
    _scoreTokens: function(path, queryToUpperCase, matchIndexes)
    {
        var pathLength = path.length;
        var queryLength = queryToUpperCase.length;
        var indexOfLastSlash = path.lastIndexOf("/");
        var totalLength = pathLength * queryLength;
        var dynamics = new Array(totalLength * 2);

        /**
         * @param {number} pathIndex
         * @param {number} queryIndex
         * @param {boolean} previousWasAMatch
         * @param {?Array.<number>} indexes
         */
        function score(pathIndex, queryIndex, previousWasAMatch, indexes)
        {
            var key = pathIndex * queryLength + queryIndex + (previousWasAMatch ? queryLength * pathLength : 0);
            if (!indexes && key in dynamics)
                return dynamics[key];

            if (queryIndex >= queryLength)
                return 0;

            var match = -1;
            var queryChar = queryToUpperCase[queryIndex];
            while (match === -1 && pathIndex < path.length) {
                var pathChar = path[pathIndex];
                var prevPathChar = path[pathIndex - 1];
                if ((!prevPathChar || prevPathChar === "/") && pathChar.toUpperCase() === queryChar)
                    match = 2; // Word start
                else if ((prevPathChar === "_" || prevPathChar === "-") && pathChar.toUpperCase() === queryChar)
                    match = 1; // Token start
                else if (previousWasAMatch && pathChar.toUpperCase() === queryChar)
                    match = 3; // Subsequent match
                else if (pathChar === queryChar)
                    match = 1; // Upper case match
                else if (pathChar.toUpperCase() === queryChar)
                    match = 0; // Regular letter match
                else
                    pathIndex++;
                previousWasAMatch = false;
            }

            if (pathIndex >= path.length) {
                dynamics[key] = -1;
                return -1;
            }

            // Boost name match score.
            if (pathIndex > indexOfLastSlash)
                match *= 2;

            // skipIndexes and useIndexes are used to collect highlight info if necessary.
            var useIndexes = matchIndexes ? [] : null;
            var useScore = score(pathIndex + 1, queryIndex + 1, match > 0, useIndexes);
            if (useScore >= 0)
                useScore += match;

            var skipIndexes = matchIndexes ? [] : null;
            var skipScore = score(pathIndex + 1, queryIndex, false, skipIndexes);

            var maxScore = Math.max(skipScore, useScore);
            dynamics[key] = maxScore;

            if (matchIndexes) {
                indexes.length = 0;
                if (skipScore > useScore)
                    indexes.push.apply(indexes, skipIndexes);
                else {
                    indexes.push(pathIndex);
                    indexes.push.apply(indexes, useIndexes);
                }
            }
            return maxScore;
        }
        return score(0, 0, false, matchIndexes);
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @param {Element} titleElement
     * @param {Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
        query = this.rewriteQuery(query);
        var uiSourceCode = this._uiSourceCodes[itemIndex];
        titleElement.textContent = uiSourceCode.name().trimEnd(100) + (this._queryLineNumber ? this._queryLineNumber : "");
        subtitleElement.textContent = uiSourceCode.fullName();

        function highlightMatchingScores(element)
        {
            var indexes = [];
            var score = this._scoreTokens(element.textContent, query.toUpperCase(), indexes);
            if (score > 0) {
                var ranges = [];
                for (var i = 0; i < indexes.length; ++i)
                    ranges.push({offset: indexes[i], length: 1});
                return WebInspector.highlightRangesWithStyleClass(element, ranges, "highlight");
            }
            return this.highlightRanges(element, query);
        }
        if (query) {
            if (!highlightMatchingScores.call(this, titleElement))
                highlightMatchingScores.call(this, subtitleElement);
        }
    },

    /**
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        var lineNumberMatch = promptValue.match(/[^:]+\:([\d]*)$/);
        var lineNumber = lineNumberMatch ? Math.max(parseInt(lineNumberMatch[1], 10) - 1, 0) : undefined;
        this.uiSourceCodeSelected(this._uiSourceCodes[itemIndex], lineNumber);
    },

    /**
     * @param {string} query
     * @return {string}
     */
    rewriteQuery: function(query)
    {
        if (!query)
            return query;
        query = query.trim();
        var lineNumberMatch = query.match(/([^:]+)(\:[\d]*)$/);
        this._queryLineNumber = lineNumberMatch ? lineNumberMatch[2] : "";
        return lineNumberMatch ? lineNumberMatch[1] : query;
    },

    /**
     * @param {WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {WebInspector.UISourceCode} */ (event.data);
        if (!this.filterUISourceCode(uiSourceCode))
            return;
        this._uiSourceCodes.push(uiSourceCode)
        this.refresh();
    },

    dispose: function()
    {
        WebInspector.workspace.removeEventListener(WebInspector.UISourceCodeProvider.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    },

    __proto__: WebInspector.SelectionDialogContentProvider.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SelectUISourceCodeDialog}
 * @param {WebInspector.ScriptsPanel} panel
 * @param {Map=} defaultScores
 */
WebInspector.OpenResourceDialog = function(panel, defaultScores)
{
    WebInspector.SelectUISourceCodeDialog.call(this, defaultScores);
    this._panel = panel;
}

WebInspector.OpenResourceDialog.prototype = {

    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber)
    {
        this._panel.showUISourceCode(uiSourceCode, lineNumber);
    },

    /**
     * @param {WebInspector.Project} project
     */
    filterProject: function(project)
    {
        return !project.isServiceProject();
    },

    __proto__: WebInspector.SelectUISourceCodeDialog.prototype
}

/**
 * @param {WebInspector.ScriptsPanel} panel
 * @param {Element} relativeToElement
 * @param {string=} name
 * @param {Map=} defaultScores
 */
WebInspector.OpenResourceDialog.show = function(panel, relativeToElement, name, defaultScores)
{
    if (WebInspector.Dialog.currentInstance())
        return;

    var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(new WebInspector.OpenResourceDialog(panel, defaultScores));
    filteredItemSelectionDialog.renderAsTwoRows();
    if (name)
        filteredItemSelectionDialog.setQuery(name);
    WebInspector.Dialog.show(relativeToElement, filteredItemSelectionDialog);
}

/**
 * @constructor
 * @extends {WebInspector.SelectUISourceCodeDialog}
 * @param {string} type
 * @param {function(WebInspector.UISourceCode)} callback
 */
WebInspector.SelectUISourceCodeForProjectTypeDialog = function(type, callback)
{
    this._type = type;
    WebInspector.SelectUISourceCodeDialog.call(this);
    this._callback = callback;
}

WebInspector.SelectUISourceCodeForProjectTypeDialog.prototype = {
    /**
     * @param {WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber)
    {
        this._callback(uiSourceCode);
    },

    /**
     * @param {WebInspector.Project} project
     */
    filterProject: function(project)
    {
        return project.type() === this._type;
    },

    __proto__: WebInspector.SelectUISourceCodeDialog.prototype
}

/**
 * @param {string} type
 * @param {function(WebInspector.UISourceCode)} callback
 * @param {Element} relativeToElement
 */
WebInspector.SelectUISourceCodeForProjectTypeDialog.show = function(name, type, callback, relativeToElement)
{
    if (WebInspector.Dialog.currentInstance())
        return;

    var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(new WebInspector.SelectUISourceCodeForProjectTypeDialog(type, callback));
    filteredItemSelectionDialog.setQuery(name);
    filteredItemSelectionDialog.renderAsTwoRows();
    WebInspector.Dialog.show(relativeToElement, filteredItemSelectionDialog);
}
