// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SuggestBoxDelegate}
 * @implements {WebInspector.TextEditorAutocompleteControllerAPI}
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {!CodeMirror} codeMirror
 * @param {?WebInspector.CompletionDictionary} dictionary
 */
WebInspector.TextEditorAutocompleteController = function(textEditor, codeMirror, dictionary)
{
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;

    this._onScroll = this._onScroll.bind(this);
    this._onCursorActivity = this._onCursorActivity.bind(this);
    this._changes = this._changes.bind(this);
    this._beforeChange = this._beforeChange.bind(this);
    this._blur = this._blur.bind(this);

    this._codeMirror.on("changes", this._changes);

    this._additionalWordChars = WebInspector.TextEditorAutocompleteController._NoAdditionalWordChars;
    this._enabled = true;

    this._dictionary = dictionary;
    this._initialized = false;
}

WebInspector.TextEditorAutocompleteController._NoAdditionalWordChars = {};
WebInspector.TextEditorAutocompleteController._CSSAdditionalWordChars = { ".": true, "-": true };

WebInspector.TextEditorAutocompleteController.prototype = {
    _initializeIfNeeded: function()
    {
        if (this._initialized)
            return;
        this._initialized = true;
        this._codeMirror.on("scroll", this._onScroll);
        this._codeMirror.on("cursorActivity", this._onCursorActivity);
        this._codeMirror.on("beforeChange", this._beforeChange);
        this._codeMirror.on("blur", this._blur);
        this._addTextToCompletionDictionary(this._textEditor.text());
    },

    /**
     * @override
     */
    dispose: function()
    {
        this._codeMirror.off("changes", this._changes);
        if (!this._initialized)
            return;
        this._codeMirror.off("scroll", this._onScroll);
        this._codeMirror.off("cursorActivity", this._onCursorActivity);
        this._codeMirror.off("beforeChange", this._beforeChange);
        this._codeMirror.off("blur", this._blur);
    },

    /**
     * @override
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        if (enabled === this._enabled)
            return;
        this._enabled = enabled;
        if (!enabled)
            this._dictionary.reset();
        else
            this._addTextToCompletionDictionary(this._textEditor.text());
    },

    /**
     * @override
     * @param {string} mimeType
     */
    setMimeType: function(mimeType)
    {
        var additionalWordChars = mimeType.indexOf("css") !== -1 ? WebInspector.TextEditorAutocompleteController._CSSAdditionalWordChars : WebInspector.TextEditorAutocompleteController._NoAdditionalWordChars;
        if (additionalWordChars !== this._additionalWordChars) {
            this._additionalWordChars = additionalWordChars;
            this._dictionary.reset();
            this._addTextToCompletionDictionary(this._textEditor.text());
        }
    },

    /**
     * @param {string} char
     * @return {boolean}
     */
    _isWordChar: function(char)
    {
        return WebInspector.TextUtils.isWordChar(char) || !!this._additionalWordChars[char];
    },

    /**
     * @param {string} word
     * @return {boolean}
     */
    _shouldProcessWordForAutocompletion: function(word)
    {
        return !!word.length && (word[0] < '0' || word[0] > '9');
    },

    /**
     * @param {string} text
     */
    _addTextToCompletionDictionary: function(text)
    {
        if (!this._enabled || !this._initialized)
            return;
        var words = WebInspector.TextUtils.textToWords(text, this._isWordChar.bind(this));
        for (var i = 0; i < words.length; ++i) {
            if (this._shouldProcessWordForAutocompletion(words[i]))
                this._dictionary.addWord(words[i]);
        }
    },

    /**
     * @param {string} text
     */
    _removeTextFromCompletionDictionary: function(text)
    {
        if (!this._enabled || !this._initialized)
            return;
        var words = WebInspector.TextUtils.textToWords(text, this._isWordChar.bind(this));
        for (var i = 0; i < words.length; ++i) {
            if (this._shouldProcessWordForAutocompletion(words[i]))
                this._dictionary.removeWord(words[i]);
        }
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!WebInspector.CodeMirrorTextEditor.BeforeChangeObject} changeObject
     */
    _beforeChange: function(codeMirror, changeObject)
    {
        if (!this._enabled)
            return;
        this._updatedLines = this._updatedLines || {};
        for (var i = changeObject.from.line; i <= changeObject.to.line; ++i)
            this._updatedLines[i] = this._textEditor.line(i);
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!WebInspector.CodeMirrorTextEditor.ChangeObject>} changes
     */
    _changes: function(codeMirror, changes)
    {
        if (!changes.length || !this._enabled)
            return;

        if (this._updatedLines) {
            for (var lineNumber in this._updatedLines)
                this._removeTextFromCompletionDictionary(this._updatedLines[lineNumber]);
            delete this._updatedLines;
        }

        var linesToUpdate = {};
        var singleCharInput = false;
        for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
            var changeObject = changes[changeIndex];
            singleCharInput = (changeObject.origin === "+input" && changeObject.text.length === 1 && changeObject.text[0].length === 1) ||
                (this._suggestBox && changeObject.origin === "+delete" && changeObject.removed.length === 1 && changeObject.removed[0].length === 1);

            var editInfo = WebInspector.CodeMirrorTextEditor.changeObjectToEditOperation(changeObject);
            for (var i = editInfo.newRange.startLine; i <= editInfo.newRange.endLine; ++i)
                linesToUpdate[i] = this._textEditor.line(i);
        }
        for (var lineNumber in linesToUpdate)
            this._addTextToCompletionDictionary(linesToUpdate[lineNumber]);

        if (singleCharInput)
            this.autocomplete();
    },

    _blur: function()
    {
        this.finishAutocomplete();
    },

    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!WebInspector.TextRange}
     */
    _autocompleteWordRange: function(lineNumber, columnNumber)
    {
        return this._textEditor.wordRangeForCursorPosition(lineNumber, columnNumber, this._isWordChar.bind(this));
    },

    /**
     * @param {!WebInspector.TextRange} mainSelection
     * @param {!Array.<!{head: !CodeMirror.Pos, anchor: !CodeMirror.Pos}>} selections
     * @return {boolean}
     */
    _validateSelectionsContexts: function(mainSelection, selections)
    {
        var mainSelectionContext = this._textEditor.copyRange(mainSelection);
        for (var i = 0; i < selections.length; ++i) {
            var wordRange = this._autocompleteWordRange(selections[i].head.line, selections[i].head.ch);
            if (!wordRange)
                return false;
            var context = this._textEditor.copyRange(wordRange);
            if (context !== mainSelectionContext)
                return false;
        }
        return true;
    },

    /**
     * @override
     */
    autocomplete: function()
    {
        this._initializeIfNeeded();
        var dictionary = this._dictionary;
        if (this._codeMirror.somethingSelected()) {
            this.finishAutocomplete();
            return;
        }

        var selections = this._codeMirror.listSelections().slice();
        var topSelection = selections.shift();
        var cursor = topSelection.head;
        var substituteRange = this._autocompleteWordRange(cursor.line, cursor.ch);
        if (!substituteRange || substituteRange.startColumn === cursor.ch || !this._validateSelectionsContexts(substituteRange, selections)) {
            this.finishAutocomplete();
            return;
        }

        var prefixRange = substituteRange.clone();
        prefixRange.endColumn = cursor.ch;

        var substituteWord = this._textEditor.copyRange(substituteRange);
        var hasPrefixInDictionary = dictionary.hasWord(substituteWord);
        if (hasPrefixInDictionary)
            dictionary.removeWord(substituteWord);
        var wordsWithPrefix = dictionary.wordsWithPrefix(this._textEditor.copyRange(prefixRange));
        if (hasPrefixInDictionary)
            dictionary.addWord(substituteWord);

        function sortSuggestions(a, b)
        {
            return dictionary.wordCount(b) - dictionary.wordCount(a) || a.length - b.length;
        }

        wordsWithPrefix.sort(sortSuggestions);

        if (!this._suggestBox)
            this._suggestBox = new WebInspector.SuggestBox(this, 6);
        var oldPrefixRange = this._prefixRange;
        this._prefixRange = prefixRange;
        if (!oldPrefixRange || prefixRange.startLine !== oldPrefixRange.startLine || prefixRange.startColumn !== oldPrefixRange.startColumn)
            this._updateAnchorBox();
        this._suggestBox.updateSuggestions(this._anchorBox, wordsWithPrefix, 0, true, this._textEditor.copyRange(prefixRange));
        if (!this._suggestBox.visible())
            this.finishAutocomplete();
    },

    /**
     * @override
     */
    finishAutocomplete: function()
    {
        if (!this._suggestBox)
            return;
        this._suggestBox.hide();
        this._suggestBox = null;
        this._prefixRange = null;
        this._anchorBox = null;
    },

    /**
     * @override
     * @param {!Event} e
     * @return {boolean}
     */
    keyDown: function(e)
    {
        if (!this._suggestBox)
            return false;
        if (e.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code) {
            this.finishAutocomplete();
            return true;
        }
        if (e.keyCode === WebInspector.KeyboardShortcut.Keys.Tab.code) {
            this._suggestBox.acceptSuggestion();
            this.finishAutocomplete();
            return true;
        }
        return this._suggestBox.keyPressed(e);
    },

    /**
     * @override
     * @param {string} suggestion
     * @param {boolean=} isIntermediateSuggestion
     */
    applySuggestion: function(suggestion, isIntermediateSuggestion)
    {
        this._currentSuggestion = suggestion;
    },

    /**
     * @override
     */
    acceptSuggestion: function()
    {
        if (this._prefixRange.endColumn - this._prefixRange.startColumn === this._currentSuggestion.length)
            return;

        var selections = this._codeMirror.listSelections().slice();
        var prefixLength = this._prefixRange.endColumn - this._prefixRange.startColumn;
        for (var i = selections.length - 1; i >= 0; --i) {
            var start = selections[i].head;
            var end = new CodeMirror.Pos(start.line, start.ch - prefixLength);
            this._codeMirror.replaceRange(this._currentSuggestion, start, end, "+autocomplete");
        }
    },

    _onScroll: function()
    {
        if (!this._suggestBox)
            return;
        var cursor = this._codeMirror.getCursor();
        var scrollInfo = this._codeMirror.getScrollInfo();
        var topmostLineNumber = this._codeMirror.lineAtHeight(scrollInfo.top, "local");
        var bottomLine = this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, "local");
        if (cursor.line < topmostLineNumber || cursor.line > bottomLine)
            this.finishAutocomplete();
        else {
            this._updateAnchorBox();
            this._suggestBox.setPosition(this._anchorBox);
        }
    },

    _onCursorActivity: function()
    {
        if (!this._suggestBox)
            return;
        var cursor = this._codeMirror.getCursor();
        if (cursor.line !== this._prefixRange.startLine || cursor.ch > this._prefixRange.endColumn || cursor.ch <= this._prefixRange.startColumn)
            this.finishAutocomplete();
    },

    _updateAnchorBox: function()
    {
        var line = this._prefixRange.startLine;
        var column = this._prefixRange.startColumn;
        var metrics = this._textEditor.cursorPositionToCoordinates(line, column);
        this._anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
    },
}

/**
 * @interface
 */
WebInspector.TextEditorAutocompleteControllerAPI = function() {}

WebInspector.TextEditorAutocompleteControllerAPI.prototype = {
    dispose: function() { },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled) { },

    /**
     * @param {string} mimeType
     */
    setMimeType: function(mimeType) { },

    autocomplete: function() { },

    finishAutocomplete: function() { },

    /**
     * @param {!Event} e
     * @return {boolean}
     */
    keyDown: function(e) { }
}

/**
 * @constructor
 * @implements {WebInspector.TextEditorAutocompleteControllerAPI}
 */
WebInspector.DummyTextEditorAutocompleteController = function() { }

WebInspector.DummyTextEditorAutocompleteController.prototype = {
    /**
     * @override
     */
    dispose: function() { },

    /**
     * @override
     * @param {boolean} enabled
     */
    setEnabled: function(enabled) { },

    /**
     * @override
     * @param {string} mimeType
     */
    setMimeType: function(mimeType) { },

    /**
     * @override
     */
    autocomplete: function() { },

    /**
     * @override
     */
    finishAutocomplete: function() { },

    /**
     * @override
     * @param {!Event} e
     * @return {boolean}
     */
    keyDown: function(e)
    {
        return false;
    }
}

WebInspector.TextEditorAutocompleteController.Dummy = new WebInspector.DummyTextEditorAutocompleteController();