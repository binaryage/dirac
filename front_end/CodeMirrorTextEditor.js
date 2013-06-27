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

importScript("cm/codemirror.js");
importScript("cm/css.js");
importScript("cm/javascript.js");
importScript("cm/xml.js");
importScript("cm/htmlmixed.js");
importScript("cm/matchbrackets.js");
importScript("cm/closebrackets.js");
importScript("cm/markselection.js");
importScript("cm/showhint.js");
importScript("cm/comment.js");
importScript("cm/overlay.js");

/**
 * @constructor
 * @extends {WebInspector.View}
 * @implements {WebInspector.TextEditor}
 * @param {?string} url
 * @param {WebInspector.TextEditorDelegate} delegate
 */
WebInspector.CodeMirrorTextEditor = function(url, delegate)
{
    WebInspector.View.call(this);
    this._delegate = delegate;
    this._url = url;

    this.registerRequiredCSS("cm/codemirror.css");
    this.registerRequiredCSS("cm/showhint.css");
    this.registerRequiredCSS("cm/cmdevtools.css");

    this._codeMirror = window.CodeMirror(this.element, {
        lineNumbers: true,
        gutters: ["CodeMirror-linenumbers"],
        matchBrackets: true,
        smartIndent: false,
        styleSelectedText: true,
        electricChars: false,
        autoCloseBrackets: true
    });
    this._codeMirror._codeMirrorTextEditor = this;
    this._codeMirror.setOption("mode", null);

    var extraKeys = {};
    extraKeys["Ctrl-Space"] = "autocomplete";
    extraKeys[(WebInspector.isMac() ? "Cmd-" : "Ctrl-") + "/"] = "toggleComment";
    var indent = WebInspector.settings.textEditorIndent.get();
    if (indent === WebInspector.TextUtils.Indent.TabCharacter) {
        this._codeMirror.setOption("indentWithTabs", true);
        this._codeMirror.setOption("indentUnit", 4);
    } else {
        this._codeMirror.setOption("indentWithTabs", false);
        this._codeMirror.setOption("indentUnit", indent.length);
        extraKeys.Tab = function(codeMirror)
        {
            if (codeMirror.somethingSelected())
                return CodeMirror.Pass;
            codeMirror.replaceRange(indent, codeMirror.getCursor());
        }
    }
    this._codeMirror.setOption("extraKeys", extraKeys);
    this._codeMirror.setOption("flattenSpans", false);
    this._codeMirror.setOption("maxHighlightLength", 1000);

    this._tokenHighlighter = new WebInspector.CodeMirrorTextEditor.TokenHighlighter(this._codeMirror);
    this._blockIndentController = new WebInspector.CodeMirrorTextEditor.BlockIndentController(this._codeMirror);
    this._fixWordMovement = new WebInspector.CodeMirrorTextEditor.FixWordMovement(this._codeMirror);

    this._codeMirror.on("change", this._change.bind(this));
    this._codeMirror.on("beforeChange", this._beforeChange.bind(this));
    this._codeMirror.on("gutterClick", this._gutterClick.bind(this));
    this._codeMirror.on("cursorActivity", this._cursorActivity.bind(this));
    this._codeMirror.on("scroll", this._scroll.bind(this));
    this._codeMirror.on("focus", this._focus.bind(this));
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this));

    this.element.firstChild.addStyleClass("source-code");
    this.element.firstChild.addStyleClass("fill");
    this._elementToWidget = new Map();
    this._nestedUpdatesCounter = 0;

    this.element.addEventListener("focus", this._handleElementFocus.bind(this), false);
    this.element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
    this.element.tabIndex = 0;
    this._setupSelectionColor();
    this._setupWhitespaceHighlight();
}

WebInspector.CodeMirrorTextEditor.autocompleteCommand = function(codeMirror)
{
    var textEditor = codeMirror._codeMirrorTextEditor;
    if (!textEditor._dictionary || codeMirror.somethingSelected())
        return;
    CodeMirror.showHint(codeMirror, textEditor._autocomplete.bind(textEditor));
}
CodeMirror.commands.autocomplete = WebInspector.CodeMirrorTextEditor.autocompleteCommand;

WebInspector.CodeMirrorTextEditor.LongLineModeLineLengthThreshold = 2000;
WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan = 16;

WebInspector.CodeMirrorTextEditor.prototype = {
    undo: function()
    {
        this._codeMirror.undo();
    },

    redo: function()
    {
        this._codeMirror.redo();
    },

    _setupSelectionColor: function()
    {
        if (WebInspector.CodeMirrorTextEditor._selectionStyleInjected)
            return;
        WebInspector.CodeMirrorTextEditor._selectionStyleInjected = true;
        var backgroundColor = WebInspector.getSelectionBackgroundColor();
        var backgroundColorRule = backgroundColor ? ".CodeMirror .CodeMirror-selected { background-color: " + backgroundColor + ";}" : "";
        var foregroundColor = WebInspector.getSelectionForegroundColor();
        var foregroundColorRule = foregroundColor ? ".CodeMirror .CodeMirror-selectedtext:not(.CodeMirror-persist-highlight) { color: " + foregroundColor + "!important;}" : "";
        if (!foregroundColorRule && !backgroundColorRule)
            return;

        var style = document.createElement("style");
        style.textContent = backgroundColorRule + foregroundColorRule;
        document.head.appendChild(style);
    },

    _setupWhitespaceHighlight: function()
    {
        if (WebInspector.CodeMirrorTextEditor._whitespaceStyleInjected || !WebInspector.settings.showWhitespacesInEditor.get())
            return;
        WebInspector.CodeMirrorTextEditor._whitespaceStyleInjected = true;
        const classBase = ".cm-whitespace-";
        const spaceChar = "·";
        var spaceChars = "";
        var rules = "";
        for(var i = 1; i <= WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan; ++i) {
            spaceChars += spaceChar;
            var rule = classBase + i + "::before { content: '" + spaceChars + "';}\n";
            rules += rule;
        }
        rules += ".cm-tab:before { display: block !important; }\n";
        var style = document.createElement("style");
        style.textContent = rules;
        document.head.appendChild(style);
    },

    _autocomplete: function(codeMirror)
    {
        var cursor = codeMirror.getCursor();
        var prefixRange = this._wordRangeForCursorPosition(cursor.line, cursor.ch, true);
        if (!prefixRange)
            return null;
        var prefix = this.copyRange(prefixRange);
        this._dictionary.removeWord(prefix);
        var wordsWithPrefix = this._dictionary.wordsWithPrefix(this.copyRange(prefixRange));
        this._dictionary.addWord(prefix);

        var data = {
            list: wordsWithPrefix,
            from: new CodeMirror.Pos(prefixRange.startLine, prefixRange.startColumn),
            to: new CodeMirror.Pos(prefixRange.endLine, prefixRange.endColumn)
        };
        CodeMirror.on(data, "close", this._handleAutocompletionClose.bind(this));

        return data;
    },

    _handleKeyDown: function(e)
    {
        if (!!this._consumeEsc && e.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code)
            e.consume(true);
        delete this._consumeEsc;
    },

    _handleAutocompletionClose: function()
    {
        this._consumeEsc = true;
    },

    /**
     * @param {string} text
     */
    _addTextToCompletionDictionary: function(text)
    {
        var words = WebInspector.TextUtils.textToWords(text);
        for(var i = 0; i < words.length; ++i) {
            this._dictionary.addWord(words[i]);
        }
    },

    /**
     * @param {string} text
     */
    _removeTextFromCompletionDictionary: function(text)
    {
        var words = WebInspector.TextUtils.textToWords(text);
        for(var i = 0; i < words.length; ++i) {
            this._dictionary.removeWord(words[i]);
        }
    },

    /**
     * @param {WebInspector.CompletionDictionary} dictionary
     */
    setCompletionDictionary: function(dictionary)
    {
        this._dictionary = dictionary;
        this._addTextToCompletionDictionary(this.text());
    },

    /**
     * @param {number} lineNumber
     * @param {number} column
     * @return {?{x: number, y: number, height: number}}
     */
    cursorPositionToCoordinates: function(lineNumber, column)
    {
        if (lineNumber >= this._codeMirror.lineCount || column > this._codeMirror.getLine(lineNumber).length || lineNumber < 0 || column < 0)
            return null;

        var metrics = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, column));

        return {
            x: metrics.left,
            y: metrics.top,
            height: metrics.bottom - metrics.top
        };
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {?WebInspector.TextRange}
     */
    coordinatesToCursorPosition: function(x, y)
    {
        var element = document.elementFromPoint(x, y);
        if (!element || !element.isSelfOrDescendant(this._codeMirror.getWrapperElement()))
            return null;
        var gutterBox = this._codeMirror.getGutterElement().boxInWindow();
        if (x >= gutterBox.x && x <= gutterBox.x + gutterBox.width &&
            y >= gutterBox.y && y <= gutterBox.y + gutterBox.height)
            return null;
        var coords = this._codeMirror.coordsChar({left: x, top: y});
        ++coords.ch;
        return this._toRange(coords, coords);
    },

    _convertTokenType: function(tokenType)
    {
        if (tokenType.startsWith("variable") || tokenType.startsWith("property") || tokenType === "def")
            return "javascript-ident";
        if (tokenType === "string-2")
            return "javascript-regexp";
        if (tokenType === "number" || tokenType === "comment" || tokenType === "string" || tokenType === "keyword")
            return "javascript-" + tokenType;
        return null;
    },

    /**
     * @param {number} lineNumber
     * @param {number} column
     * @return {?{startColumn: number, endColumn: number, type: string}}
     */
    tokenAtTextPosition: function(lineNumber, column)
    {
        if (lineNumber < 0 || lineNumber >= this._codeMirror.lineCount())
            return null;
        var token = this._codeMirror.getTokenAt(new CodeMirror.Pos(lineNumber, column || 1));
        if (!token || !token.type)
            return null;
        var convertedType = this._convertTokenType(token.type);
        if (!convertedType)
            return null;
        return {
            startColumn: token.start,
            endColumn: token.end - 1,
            type: convertedType
        };
    },

    /**
     * @param {WebInspector.TextRange} textRange
     * @return {string}
     */
    copyRange: function(textRange)
    {
        var pos = this._toPos(textRange);
        return this._codeMirror.getRange(pos.start, pos.end);
    },

    /**
     * @return {boolean}
     */
    isClean: function()
    {
        return this._codeMirror.isClean();
    },

    markClean: function()
    {
        this._codeMirror.markClean();
    },

    _hasLongLines: function()
    {
        function lineIterator(lineHandle)
        {
            if (lineHandle.text.length > WebInspector.CodeMirrorTextEditor.LongLineModeLineLengthThreshold)
                hasLongLines = true;
            return hasLongLines;
        }
        var hasLongLines = false;
        this._codeMirror.eachLine(lineIterator);
        return hasLongLines;
    },

    _whitespaceOverlayMode: function(mimeType)
    {
        var modeName = mimeType + "+whitespaces";
        if (CodeMirror.modes[modeName])
            return modeName;

        function modeConstructor(config, parserConfig)
        {
            function nextToken(stream)
            {
                if (stream.peek() === " ") {
                    var spaces = 0;
                    while (spaces < WebInspector.CodeMirrorTextEditor.MaximumNumberOfWhitespacesPerSingleSpan && stream.peek() === " ") {
                        ++spaces;
                        stream.next();
                    }
                    return "whitespace whitespace-" + spaces;
                }
                while (!stream.eol() && stream.peek() !== " ")
                    stream.next();
                return null;
            }
            var whitespaceMode = {
                token: nextToken
            };
            return CodeMirror.overlayMode(CodeMirror.getMode(config, mimeType), whitespaceMode, false);
        }
        CodeMirror.defineMode(modeName, modeConstructor);
        return modeName;
    },

    _enableLongLinesMode: function()
    {
        this._codeMirror.setOption("matchBrackets", false);
        this._codeMirror.setOption("styleSelectedText", false);
        this._longLinesMode = true;
    },

    _disableLongLinesMode: function()
    {
        this._codeMirror.setOption("matchBrackets", true);
        this._codeMirror.setOption("styleSelectedText", true);
        this._longLinesMode = false;
    },

    /**
     * @param {string} mimeType
     */
    set mimeType(mimeType)
    {
        if (this._hasLongLines())
            this._enableLongLinesMode();
        else
            this._disableLongLinesMode();
        var showWhitespaces = WebInspector.settings.showWhitespacesInEditor.get();
        this._codeMirror.setOption("mode", showWhitespaces ? this._whitespaceOverlayMode(mimeType) : mimeType);
        switch (mimeType) {
        case "text/html": this._codeMirror.setOption("theme", "web-inspector-html"); break;
        case "text/css":
        case "text/x-scss":
            this._codeMirror.setOption("theme", "web-inspector-css");
            break;
        case "text/javascript": this._codeMirror.setOption("theme", "web-inspector-js"); break;
        }
    },

    /**
     * @param {boolean} readOnly
     */
    setReadOnly: function(readOnly)
    {
        this._codeMirror.setOption("readOnly", readOnly ? "nocursor" : false);
    },

    /**
     * @return {boolean}
     */
    readOnly: function()
    {
        return !!this._codeMirror.getOption("readOnly");
    },

    /**
     * @param {Object} highlightDescriptor
     */
    removeHighlight: function(highlightDescriptor)
    {
        highlightDescriptor.clear();
    },

    /**
     * @param {WebInspector.TextRange} range
     * @param {string} cssClass
     * @return {Object}
     */
    highlightRange: function(range, cssClass)
    {
        cssClass = "CodeMirror-persist-highlight " + cssClass;
        var pos = this._toPos(range);
        ++pos.end.ch;
        return this._codeMirror.markText(pos.start, pos.end, {
            className: cssClass,
            startStyle: cssClass + "-start",
            endStyle: cssClass + "-end"
        });
    },

    /**
     * @param {string} regex
     * @param {string} cssClass
     * @return {Object}
     */
    highlightRegex: function(regex, cssClass) { },

    /**
     * @return {Element}
     */
    defaultFocusedElement: function()
    {
        return this.element;
    },

    focus: function()
    {
        this._codeMirror.focus();
    },

    _handleElementFocus: function()
    {
        this._codeMirror.focus();
    },

    beginUpdates: function()
    {
        ++this._nestedUpdatesCounter;
    },

    endUpdates: function()
    {
        if (!--this._nestedUpdatesCounter)
            this._codeMirror.refresh();
    },

    /**
     * @param {number} lineNumber
     */
    revealLine: function(lineNumber)
    {
        var pos = new CodeMirror.Pos(lineNumber, 0);
        var scrollInfo = this._codeMirror.getScrollInfo();
        var topLine = this._codeMirror.lineAtHeight(scrollInfo.top, "local");
        var bottomLine = this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, "local");

        var margin = null;
        var lineMargin = 3;
        if ((lineNumber < topLine + lineMargin) || (lineNumber >= bottomLine - lineMargin)) {
            // scrollIntoView could get into infinite loop if margin exceeds half of the clientHeight.
            margin = (scrollInfo.clientHeight*0.9/2) >>> 0;
        }
        this._codeMirror.scrollIntoView(pos, margin);
    },

    _gutterClick: function(instance, lineNumber, gutter, event)
    {
        this.dispatchEventToListeners(WebInspector.TextEditor.Events.GutterClick, { lineNumber: lineNumber, event: event });
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        var target = event.target.enclosingNodeOrSelfWithClass("CodeMirror-gutter-elt");
        if (target)
            this._delegate.populateLineGutterContextMenu(contextMenu, parseInt(target.textContent, 10) - 1);
        else
            this._delegate.populateTextAreaContextMenu(contextMenu, 0);
        contextMenu.show();
    },

    /**
     * @param {number} lineNumber
     * @param {boolean} disabled
     * @param {boolean} conditional
     */
    addBreakpoint: function(lineNumber, disabled, conditional)
    {
        var className = "cm-breakpoint" + (conditional ? " cm-breakpoint-conditional" : "") + (disabled ? " cm-breakpoint-disabled" : "");
        this._codeMirror.addLineClass(lineNumber, "wrap", className);
    },

    /**
     * @param {number} lineNumber
     */
    removeBreakpoint: function(lineNumber)
    {
        var wrapClasses = this._codeMirror.getLineHandle(lineNumber).wrapClass;
        if (!wrapClasses)
            return;
        var classes = wrapClasses.split(" ");
        for(var i = 0; i < classes.length; ++i) {
            if (classes[i].startsWith("cm-breakpoint"))
                this._codeMirror.removeLineClass(lineNumber, "wrap", classes[i]);
        }
    },

    /**
     * @param {number} lineNumber
     */
    setExecutionLine: function(lineNumber)
    {
        this._executionLine = this._codeMirror.getLineHandle(lineNumber);
        this._codeMirror.addLineClass(this._executionLine, "wrap", "cm-execution-line");
    },

    clearExecutionLine: function()
    {
        if (this._executionLine)
            this._codeMirror.removeLineClass(this._executionLine, "wrap", "cm-execution-line");
        delete this._executionLine;
    },

    /**
     * @param {number} lineNumber
     * @param {Element} element
     */
    addDecoration: function(lineNumber, element)
    {
        var widget = this._codeMirror.addLineWidget(lineNumber, element);
        this._elementToWidget.put(element, widget);
    },

    /**
     * @param {number} lineNumber
     * @param {Element} element
     */
    removeDecoration: function(lineNumber, element)
    {
        var widget = this._elementToWidget.remove(element);
        if (widget)
            this._codeMirror.removeLineWidget(widget);
    },

    /**
     * @param {WebInspector.TextRange} range
     */
    markAndRevealRange: function(range)
    {
        if (!range)
            return;
        this.revealLine(range.startLine);
        this.setSelection(range);
    },

    /**
     * @param {number} lineNumber
     * @param {number=} columnNumber
     */
    highlightPosition: function(lineNumber, columnNumber)
    {
        if (lineNumber < 0)
            return;
        lineNumber = Math.min(lineNumber, this._codeMirror.lineCount() - 1);
        if (typeof columnNumber !== "number" || columnNumber < 0 || columnNumber > this._codeMirror.getLine(lineNumber).length)
            columnNumber = 0;

        this.clearPositionHighlight();
        this._highlightedLine = this._codeMirror.getLineHandle(lineNumber);
        if (!this._highlightedLine)
          return;
        this.revealLine(lineNumber);
        this._codeMirror.addLineClass(this._highlightedLine, null, "cm-highlight");
        this._clearHighlightTimeout = setTimeout(this.clearPositionHighlight.bind(this), 2000);
        if (!this.readOnly())
            this._codeMirror.setSelection(new CodeMirror.Pos(lineNumber, columnNumber));
    },

    clearPositionHighlight: function()
    {
        if (this._clearHighlightTimeout)
            clearTimeout(this._clearHighlightTimeout);
        delete this._clearHighlightTimeout;

         if (this._highlightedLine)
            this._codeMirror.removeLineClass(this._highlightedLine, null, "cm-highlight");
        delete this._highlightedLine;
    },

    /**
     * @return {Array.<Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [];
    },

    /**
     * @param {WebInspector.TextEditor} textEditor
     */
    inheritScrollPositions: function(textEditor)
    {
    },

    onResize: function()
    {
        this._codeMirror.refresh();
    },

    /**
     * @param {WebInspector.TextRange} range
     * @param {string} text
     * @return {WebInspector.TextRange}
     */
    editRange: function(range, text)
    {
        var pos = this._toPos(range);
        this._codeMirror.replaceRange(text, pos.start, pos.end);
        var newRange = this._toRange(pos.start, this._codeMirror.posFromIndex(this._codeMirror.indexFromPos(pos.start) + text.length));
        this._delegate.onTextChanged(range, newRange);
        return newRange;
    },

    /**
     * @param {number} lineNumber
     * @param {number} column
     * @param {boolean=} prefixOnly
     * @return {?WebInspector.TextRange}
     */
    _wordRangeForCursorPosition: function(lineNumber, column, prefixOnly)
    {
        var line = this.line(lineNumber);
        if (!WebInspector.TextUtils.isWordChar(line.charAt(column - 1)))
            return null;
        var wordStart = column - 1;
        while(wordStart > 0 && WebInspector.TextUtils.isWordChar(line.charAt(wordStart - 1)))
            --wordStart;
        if (prefixOnly)
            return new WebInspector.TextRange(lineNumber, wordStart, lineNumber, column);
        var wordEnd = column;
        while(wordEnd < line.length && WebInspector.TextUtils.isWordChar(line.charAt(wordEnd)))
            ++wordEnd;
        return new WebInspector.TextRange(lineNumber, wordStart, lineNumber, wordEnd);
    },

    _beforeChange: function(codeMirror, changeObject)
    {
        if (!this._dictionary)
            return;
        this._updatedLines = this._updatedLines || {};
        for(var i = changeObject.from.line; i <= changeObject.to.line; ++i)
            this._updatedLines[i] = this.line(i);
    },

    _change: function(codeMirror, changeObject)
    {
        var widgets = this._elementToWidget.values();
        for (var i = 0; i < widgets.length; ++i)
            this._codeMirror.removeLineWidget(widgets[i]);
        this._elementToWidget.clear();

        if (this._updatedLines) {
            for(var lineNumber in this._updatedLines)
                this._removeTextFromCompletionDictionary(this._updatedLines[lineNumber]);
            delete this._updatedLines;
        }

        var linesToUpdate = {};
        do {
            var oldRange = this._toRange(changeObject.from, changeObject.to);
            var newRange = oldRange.clone();
            var linesAdded = changeObject.text.length;
            if (linesAdded === 0) {
                newRange.endLine = newRange.startLine;
                newRange.endColumn = newRange.startColumn;
            } else if (linesAdded === 1) {
                newRange.endLine = newRange.startLine;
                newRange.endColumn = newRange.startColumn + changeObject.text[0].length;
            } else {
                newRange.endLine = newRange.startLine + linesAdded - 1;
                newRange.endColumn = changeObject.text[linesAdded - 1].length;
            }

            if (!this._muteTextChangedEvent)
                this._delegate.onTextChanged(oldRange, newRange);

            for(var i = newRange.startLine; i <= newRange.endLine; ++i) {
                linesToUpdate[i] = true;
            }
            if (this._dictionary) {
                for(var i = newRange.startLine; i <= newRange.endLine; ++i)
                    linesToUpdate[i] = this.line(i);
            }
        } while (changeObject = changeObject.next);
        if (this._dictionary) {
            for(var lineNumber in linesToUpdate)
                this._addTextToCompletionDictionary(linesToUpdate[lineNumber]);
        }
    },

    _cursorActivity: function()
    {
        var start = this._codeMirror.getCursor("anchor");
        var end = this._codeMirror.getCursor("head");
        this._delegate.selectionChanged(this._toRange(start, end));
    },

    _scroll: function()
    {
        if (this._scrollTimer)
            clearTimeout(this._scrollTimer);
        var topmostLineNumber = this._codeMirror.lineAtHeight(this._codeMirror.getScrollInfo().top, "local");
        this._scrollTimer = setTimeout(this._delegate.scrollChanged.bind(this._delegate, topmostLineNumber), 100);
    },

    _focus: function()
    {
        this._delegate.editorFocused();
    },

    /**
     * @param {number} lineNumber
     */
    scrollToLine: function(lineNumber)
    {
        function performScroll()
        {
            var pos = new CodeMirror.Pos(lineNumber, 0);
            var coords = this._codeMirror.charCoords(pos, "local");
            this._codeMirror.scrollTo(0, coords.top);
        }

        setTimeout(performScroll.bind(this), 0);
    },

    /**
     * @return {WebInspector.TextRange}
     */
    selection: function()
    {
        var start = this._codeMirror.getCursor(true);
        var end = this._codeMirror.getCursor(false);

        if (start.line > end.line || (start.line == end.line && start.ch > end.ch))
            return this._toRange(end, start);

        return this._toRange(start, end);
    },

    /**
     * @return {WebInspector.TextRange?}
     */
    lastSelection: function()
    {
        return this._lastSelection;
    },

    /**
     * @param {WebInspector.TextRange} textRange
     */
    setSelection: function(textRange)
    {
        function performSelectionSet()
        {
            this._lastSelection = textRange;
            var pos = this._toPos(textRange);
            this._codeMirror.setSelection(pos.start, pos.end);
        }

        setTimeout(performSelectionSet.bind(this), 0);
    },

    /**
     * @param {string} text
     */
    setText: function(text)
    {
        this._muteTextChangedEvent = true;
        this._codeMirror.setValue(text);
        this._codeMirror.clearHistory();
        delete this._muteTextChangedEvent;
    },

    /**
     * @return {string}
     */
    text: function()
    {
        return this._codeMirror.getValue();
    },

    /**
     * @return {WebInspector.TextRange}
     */
    range: function()
    {
        var lineCount = this.linesCount;
        var lastLine = this._codeMirror.getLine(lineCount - 1);
        return this._toRange(new CodeMirror.Pos(0, 0), new CodeMirror.Pos(lineCount - 1, lastLine.length));
    },

    /**
     * @param {number} lineNumber
     * @return {string}
     */
    line: function(lineNumber)
    {
        return this._codeMirror.getLine(lineNumber);
    },

    /**
     * @return {number}
     */
    get linesCount()
    {
        return this._codeMirror.lineCount();
    },

    /**
     * @param {number} line
     * @param {string} name
     * @param {Object?} value
     */
    setAttribute: function(line, name, value)
    {
        var handle = this._codeMirror.getLineHandle(line);
        if (handle.attributes === undefined) handle.attributes = {};
        handle.attributes[name] = value;
    },

    /**
     * @param {number} line
     * @param {string} name
     * @return {Object|null} value
     */
    getAttribute: function(line, name)
    {
        var handle = this._codeMirror.getLineHandle(line);
        return handle.attributes && handle.attributes[name] !== undefined ? handle.attributes[name] : null;
    },

    /**
     * @param {number} line
     * @param {string} name
     */
    removeAttribute: function(line, name)
    {
        var handle = this._codeMirror.getLineHandle(line);
        if (handle && handle.attributes)
            delete handle.attributes[name];
    },

    /**
     * @param {WebInspector.TextRange} range
     * @return {{start: CodeMirror.Pos, end: CodeMirror.Pos}}
     */
    _toPos: function(range)
    {
        return {
            start: new CodeMirror.Pos(range.startLine, range.startColumn),
            end: new CodeMirror.Pos(range.endLine, range.endColumn)
        }
    },

    _toRange: function(start, end)
    {
        return new WebInspector.TextRange(start.line, start.ch, end.line, end.ch);
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @param {CodeMirror} codeMirror
 */
WebInspector.CodeMirrorTextEditor.TokenHighlighter = function(codeMirror)
{
    this._codeMirror = codeMirror;
    this._codeMirror.on("cursorActivity", this._cursorChange.bind(this));
}

WebInspector.CodeMirrorTextEditor.TokenHighlighter.prototype = {
    _cursorChange: function()
    {
        this._codeMirror.operation(this._removeHighlight.bind(this));
        var selectionStart = this._codeMirror.getCursor("start");
        var selectionEnd = this._codeMirror.getCursor("end");
        if (selectionStart.line !== selectionEnd.line)
            return;
        if (selectionStart.ch === selectionEnd.ch)
            return;

        var selectedText = this._codeMirror.getSelection();
        if (this._isWord(selectedText, selectionStart.line, selectionStart.ch, selectionEnd.ch))
            this._codeMirror.operation(this._addHighlight.bind(this, selectedText, selectionStart));
    },

    _isWord: function(selectedText, lineNumber, startColumn, endColumn)
    {
        var line = this._codeMirror.getLine(lineNumber);
        var leftBound = startColumn === 0 || !WebInspector.TextUtils.isWordChar(line.charAt(startColumn - 1));
        var rightBound = endColumn === line.length || !WebInspector.TextUtils.isWordChar(line.charAt(endColumn));
        return leftBound && rightBound && WebInspector.TextUtils.isWord(selectedText);
    },

    _removeHighlight: function()
    {
        if (this._highlightDescriptor) {
            this._codeMirror.removeOverlay(this._highlightDescriptor.overlay);
            this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line, "wrap", "cm-line-with-selection");
            delete this._highlightDescriptor;
        }
    },

    _addHighlight: function(token, selectionStart)
    {
        const tokenFirstChar = token.charAt(0);
        /**
         * @param {CodeMirror.StringStream} stream
         */
        function nextToken(stream)
        {
            if (stream.match(token) && (stream.eol() || !WebInspector.TextUtils.isWordChar(stream.peek())))
                return stream.column() === selectionStart.ch ? "token-highlight column-with-selection" : "token-highlight";

            var eatenChar;
            do {
                eatenChar = stream.next();
            } while (eatenChar && (WebInspector.TextUtils.isWordChar(eatenChar) || stream.peek() !== tokenFirstChar));
        }

        var overlayMode = {
            token: nextToken
        };
        this._codeMirror.addOverlay(overlayMode);
        this._codeMirror.addLineClass(selectionStart.line, "wrap", "cm-line-with-selection")
        this._highlightDescriptor = {
            overlay: overlayMode,
            selectionStart: selectionStart
        };
    }
}

/**
 * @constructor
 * @param {CodeMirror} codeMirror
 */
WebInspector.CodeMirrorTextEditor.BlockIndentController = function(codeMirror)
{
    codeMirror.addKeyMap(this);
}

WebInspector.CodeMirrorTextEditor.BlockIndentController.prototype = {
    name: "blockIndentKeymap",

    Enter: function(codeMirror)
    {
        if (codeMirror.somethingSelected())
            return CodeMirror.Pass;
        var cursor = codeMirror.getCursor();
        var line = codeMirror.getLine(cursor.line);
        if (line.substr(cursor.ch - 1, 2) === "{}") {
            codeMirror.execCommand("newlineAndIndent");
            codeMirror.setCursor(cursor);
            codeMirror.execCommand("newlineAndIndent");
            codeMirror.execCommand("indentMore");
        } else if (line.substr(cursor.ch-1, 1) === "{") {
            codeMirror.execCommand("newlineAndIndent");
            codeMirror.execCommand("indentMore");
        } else
            return CodeMirror.Pass;
    },

    "'}'": function(codeMirror)
    {
        var cursor = codeMirror.getCursor();
        var line = codeMirror.getLine(cursor.line);
        for(var i = 0 ; i < line.length; ++i)
            if (!WebInspector.TextUtils.isSpaceChar(line.charAt(i)))
                return CodeMirror.Pass;

        codeMirror.replaceRange("}", cursor);
        var matchingBracket = codeMirror._codeMirrorTextEditor._longLinesMode ? null : codeMirror.findMatchingBracket();
        if (!matchingBracket || !matchingBracket.match)
            return;

        line = codeMirror.getLine(matchingBracket.to.line);
        var desiredIndentation = 0;
        while (desiredIndentation < line.length && WebInspector.TextUtils.isSpaceChar(line.charAt(desiredIndentation)))
            ++desiredIndentation;

        codeMirror.replaceRange(line.substr(0, desiredIndentation) + "}", new CodeMirror.Pos(cursor.line, 0), new CodeMirror.Pos(cursor.line, cursor.ch + 1));
    }
}

/**
 * @constructor
 * @param {CodeMirror} codeMirror
 */
WebInspector.CodeMirrorTextEditor.FixWordMovement = function(codeMirror)
{
    function moveLeft(shift, codeMirror)
    {
        var cursor = codeMirror.getCursor("head");
        if (cursor.ch !== 0 || cursor.line === 0)
            return CodeMirror.Pass;
        codeMirror.setExtending(shift);
        codeMirror.execCommand("goLineUp");
        codeMirror.execCommand("goLineEnd")
        codeMirror.setExtending(false);
    }
    function moveRight(shift, codeMirror)
    {
        var cursor = codeMirror.getCursor("head");
        var line = codeMirror.getLine(cursor.line);
        if (cursor.ch !== line.length || cursor.line + 1 === codeMirror.lineCount())
            return CodeMirror.Pass;
        codeMirror.setExtending(shift);
        codeMirror.execCommand("goLineDown");
        codeMirror.execCommand("goLineStart");
        codeMirror.setExtending(false);
    }

    var modifierKey = WebInspector.isMac() ? "Alt" : "Ctrl";
    var leftKey = modifierKey + "-Left";
    var rightKey = modifierKey + "-Right";
    var keyMap = {};
    keyMap[leftKey] = moveLeft.bind(this, false);
    keyMap[rightKey] = moveRight.bind(this, false);
    keyMap["Shift-" + leftKey] = moveLeft.bind(this, true);
    keyMap["Shift-" + rightKey] = moveRight.bind(this, true);
    codeMirror.addKeyMap(keyMap);
}
