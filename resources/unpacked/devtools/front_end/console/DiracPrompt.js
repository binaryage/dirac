/**
 * @param {!Element} proxyElement
 * @param {string} text
 * @param {number} cursorOffset
 * @param {!Range} wordRange
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
var dummyCompletionsFn = function(proxyElement, text, cursorOffset, wordRange, force, completionsReadyCallback) {
};

/**
 * @constructor
 * @extends {WebInspector.TextPromptWithHistory}
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {!CodeMirror} codeMirrorInstance
 */
WebInspector.DiracPromptWithHistory = function(codeMirrorInstance)
{
    WebInspector.TextPromptWithHistory.call(this, dummyCompletionsFn);

    this._codeMirror = codeMirrorInstance;
    this._codeMirror.on("changes", this._changes.bind(this));
    this._codeMirror.on("scroll", this._onScroll.bind(this));
    this._codeMirror.on("cursorActivity", this._onCursorActivity.bind(this));
    this._codeMirror.on("blur", this._blur.bind(this))
    this._currentClojureScriptNamespace = null;
    this._lastAutocompleteRequest = 0;
};

WebInspector.DiracPromptWithHistory.prototype = {

    setCurrentClojureScriptNamespace: function(ns) {
      this._currentClojureScriptNamespace = ns;
    },

    /**
      * @override
      * @return {string}
      */
    text: function()
    {
        var text = this._codeMirror.getValue();
        return text.replace(/[\s\n]+$/gm, ""); // remove trailing newlines and whitespace
    },

    setText: function(x)
    {
        this._removeSuggestionAids();
        this._codeMirror.setValue(x);
        this.moveCaretToEndOfPrompt();
        this._element.scrollIntoView();
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretInsidePrompt: function()
    {
        return this._codeMirror.hasFocus();
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretAtEndOfPrompt: function()
    {
        var content = this._codeMirror.getValue();
        var cursor = this._codeMirror.getCursor();
        var endCursor = this._codeMirror.posFromIndex(content.length);
        return (cursor.line == endCursor.line && cursor.ch == endCursor.ch);
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretOnFirstLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.firstLine());
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretOnLastLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.lastLine());
    },

    moveCaretToEndOfPrompt: function()
    {
       this._codeMirror.setCursor(this._codeMirror.lastLine()+1, 0, null);
    },

    moveCaretToIndex: function(index)
    {
       var pos = this._codeMirror.posFromIndex(index);
       this._codeMirror.setCursor(pos, null, null);
    },

    finishAutocomplete: function()
    {
        this._removeSuggestionAids();
        this._prefixRange = null;
        this._anchorBox = null;
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!CodeMirror.ChangeObject>} changes
     */
    _changes: function(codeMirror, changes)
    {
        if (!changes.length)
            return;

        var singleCharInput = false;
        for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
            var changeObject = changes[changeIndex];
            singleCharInput = (changeObject.origin === "+input" && changeObject.text.length === 1 && changeObject.text[0].length === 1) ||
                (this.isSuggestBoxVisible() && changeObject.origin === "+delete" && changeObject.removed.length === 1 && changeObject.removed[0].length === 1);
        }
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_changes", singleCharInput, changes);
        }
        if (singleCharInput) {
            this._ignoreNextCursorActivity = true; // this prevents flickering of suggestion widget
            setImmediate(this.autocomplete.bind(this));
        }
    },

    _blur: function()
    {
        this.finishAutocomplete();
    },

    _onScroll: function()
    {
        if (!this.isSuggestBoxVisible())
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
        if (!this.isSuggestBoxVisible()) {
            return;
        }

        if (this._ignoreNextCursorActivity) {
            delete this._ignoreNextCursorActivity;
            return;
        }

        var cursor = this._codeMirror.getCursor();
        if (cursor.line !== this._prefixRange.startLine ||
            cursor.ch > this._prefixRange.endColumn ||
            cursor.ch <= this._prefixRange.startColumn) {
            this.finishAutocomplete();
        }
    },

    /**
     * @override
     * @param {boolean=} force
     * @param {boolean=} reverse
     */
    complete: function(force, reverse)
    {
        // override with empty implementation to disable TextPrompt's autocomplete implementation
        // we use CodeMirror's changes modelled after TextEditorAutocompleteController.js in DiracPrompt
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("complete called => skip for disabling default auto-complete system");
        }
    },

    /**
     * @override
     * @param {boolean=} force
     */
    _updateAutoComplete: function(force)
    {
        // override with empty implementation to disable TextPrompt's autocomplete implementation
        // we use CodeMirror's changes modelled after TextEditorAutocompleteController.js in DiracPrompt
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_updateAutoComplete called => skip for disabling default auto-complete system");
        }
    },

    /**
     * @override
     * @param {string} prefix
     * @return {!WebInspector.SuggestBox.Suggestions}
     */
    additionalCompletions: function(prefix)
    {
        // we keep this list empty for now, history contains mostly cljs stuff and we don't want to mix it with javascript
        return [];
    },

    _javascriptCompletionTest: function (prefix) {
      // test if prefix starts with "js/", then we treat it as javascript completion
      var m = prefix.match(/^js\/(.*)/)
      if (m) {
        return {prefix: m[1],
                offset: 3};
      }
    },

    /**
     * @param {boolean=} force
     * @param {boolean=} reverse
     */
    autocomplete: function(force, reverse)
    {
        this.clearAutoComplete(true);
        this._lastAutocompleteRequest++;

        var shouldExit = false;
        var cursor = this._codeMirror.getCursor();
        var token = this._codeMirror.getTokenAt(cursor);

        if (dirac._DEBUG_COMPLETIONS) {
            console.log("autocomplete:", cursor, token);
        }

        if (!token) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("no autocomplete because no token");
            }
            shouldExit = true;
        } else if (this._codeMirror.somethingSelected()) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("no autocomplete because codeMirror.somethingSelected()");
            }
            shouldExit = true;
        } else if (!force) {
            if (token.end != cursor.ch) {
                if (dirac._DEBUG_COMPLETIONS) {
                    console.log("no autocomplete because cursor is not at the end of detected token");
                }
                shouldExit = true;
            }
        }

        if (shouldExit) {
            this.hideSuggestBox();
            return;
        }

        var prefix = this._codeMirror.getRange(new CodeMirror.Pos(cursor.line, token.start), cursor);
        var javascriptCompletion = this._javascriptCompletionTest(prefix);
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("detected prefix='"+prefix+"'", javascriptCompletion);
        }
        if (javascriptCompletion) {
          this._prefixRange = new WebInspector.TextRange(cursor.line, token.start+javascriptCompletion.offset, cursor.line, cursor.ch);
          var input = javascriptCompletion.prefix;
          this._loadJavascriptCompletions(this._lastAutocompleteRequest, input, force || false, this._completionsForJavascriptReady.bind(this, this._lastAutocompleteRequest, input, !!reverse, !!force));
        } else {
          this._prefixRange = new WebInspector.TextRange(cursor.line, token.start, cursor.line, cursor.ch);
          var input = prefix;
          this._loadClojureScriptCompletions(this._lastAutocompleteRequest, input, force || false, this._completionsForClojureScriptReady.bind(this, this._lastAutocompleteRequest, input, !!reverse, !!force));
        }
    },

    /**
     * @param {number} requestId
     * @param {string} input
     * @param {boolean} force
     * @param {function(string, !Array.<string>, number=)} completionsReadyCallback
     */
    _loadJavascriptCompletions: function(requestId, input, force, completionsReadyCallback)
    {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_loadJavascriptCompletions", input, force);
        }
        if (requestId!=this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadJavascriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }

        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no execution context available");
            }
            completionsReadyCallback("", []);
            return;
        }

        var prefix = input;
        var expressionString = '';
        var lastDotIndex = input.lastIndexOf(".");
        var lastOpenSquareBracketIndex = input.lastIndexOf("[");

        if (lastOpenSquareBracketIndex > lastDotIndex) {
            // split at last square bracket
            expressionString = input.substring(0, lastOpenSquareBracketIndex+1);
            prefix = input.substring(lastOpenSquareBracketIndex+1);
        } else {
            if (lastDotIndex >= 0) {
                // split at last dot
                expressionString = input.substring(0, lastDotIndex+1);
                prefix = input.substring(lastDotIndex+1);
            }
        }

        executionContext.completionsForExpression(expressionString, input, 0, prefix, force, completionsReadyCallback.bind(this, expressionString));
    },

    /**
     * @param {number} requestId
     * @param {string} prefix
     * @param {boolean} reverse
     * @param {boolean} force
     * @param {string} expression
     * @param {!Array.<string>} completions
     * @param {number=} selectedIndex
     */
    _completionsForJavascriptReady: function(requestId, prefix, reverse, force, expression, completions, selectedIndex)
    {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_completionsForJavascriptReady", prefix, reverse, force, expression, completions, selectedIndex);
        }
        if (requestId!=this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_completionsForJavascriptReady cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }
        // Filter out dupes.
        var store = new Set();
        completions = completions.filter(item => !store.has(item) && !!store.add(item));
        var annotatedCompletions = completions.map(item => ({title: item}));

        if (prefix || force) {
            if (prefix)
                annotatedCompletions = annotatedCompletions.concat(this.additionalCompletions(prefix));
            else
                annotatedCompletions = this.additionalCompletions(prefix).concat(annotatedCompletions);
        }

        if (!annotatedCompletions.length) {
            this.hideSuggestBox();
            return;
        }

        this._userEnteredText = prefix;

        selectedIndex = (this._disableDefaultSuggestionForEmptyInput && !this.text()) ? -1 : (selectedIndex || 0);

        this._lastExpression = expression;
        this._updateAnchorBox();
        var shouldShowForSingleItem = true; // TODO: later maybe implement inline completions like in TextPrompt.js


        if (dirac._DEBUG_COMPLETIONS) {
            console.log("calling SuggestBox.updateSuggestions", this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
        }
        this._suggestBox.updateSuggestions(this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);

        // TODO: here could be implemented inline completions like in TextPrompt.js
    },

    _extractLocalsFromScopeInfo: function (scopeInfo) {
        var locals = [];
        if (!scopeInfo) {
          return locals;
        }

        var frames = scopeInfo.frames;
        if (frames) {
          for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            var props = frame.props;

            if (props) {
              for (var j=0; j<props.length; j++) {
                var prop = props[j];
                locals.push(prop);
              }
            }
          }
        }

        // dedupe
        var keyFn = item => "" + item.name + item.identifier;
        var store = new Set();
        var uniqueLocals = locals.filter(item => !store.has(keyFn(item)) && !!store.add(keyFn(item)));
        return uniqueLocals;
    },

    /**
     * @param {number} requestId
     * @param {string} input
     * @param {boolean} force
     * @param {function(string, !Array.<string>, number=)} completionsReadyCallback
     */
    _loadClojureScriptCompletions: function(requestId, input, force, completionsReadyCallback)
    {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_loadClojureScriptCompletions", input, force);
        }
        if (requestId!=this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadClojureScriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no execution context available");
            }
            completionsReadyCallback("", []);
            return;
        }

        var debuggerModel = executionContext.debuggerModel;
        if (!debuggerModel) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no debugger model available");
            }
            completionsReadyCallback("", []);
            return;
        }

        var lastSlashIndex = input.lastIndexOf("/");
        if (lastSlashIndex >= 0) {
          // completion of fully qualified name => split at last slash
          // example for input = "some.namespace/some-sym":
          //   prefix <= "some-sym"
          //   expression <= "some.namespace/"
          //   namespace <= "some.namespace"
          //
          // present only symbols from given namespace, matching given prefix

          var prefix = input.substring(lastSlashIndex+1);
          var expression = input.substring(0, lastSlashIndex+1);
          var namespace = input.substring(0, lastSlashIndex);

          var annotateSymbols = (function(style, symbols) {
              return symbols.filter(symbol => symbol.startsWith(prefix)).map(symbol => ({title: symbol || "?",
                                                                                         className: style}));
          }).bind(this);

          return dirac.extractNamespaceSymbolsAsync(namespace)
                      .then(annotateSymbols.bind(this, "suggest-cljs-qualified"))
                      .then(completionsReadyCallback.bind(this, expression));
        } else {
          // general completion (without slashes)
          // combine: locals (if paused in debugger), current ns symbols, namespace names and cljs.core symbols
          // filter the list by input prefix

          var annotateSymbols = (function(style, symbols) {
              return symbols.filter(symbol => symbol.startsWith(input)).map(symbol => ({title: symbol || "?",
                                                                                    className: style}));
          }).bind(this);

          var extractAndAnnotateLocals = (function (scopeInfo) {
              var locals = this._extractLocalsFromScopeInfo(scopeInfo);
              var filteredLocals = locals.filter(item => item.name.startsWith(input));
              var annotatedCompletions = filteredLocals.map(item => ({title: item.name || "?",
                                                                       info: item.identifier?"js/"+item.identifier:undefined,
                                                                  className: "suggest-cljs-scope"}));
              annotatedCompletions.reverse(); // we want to display inner scopes first
              return annotatedCompletions;
          }).bind(this);

          var annotateNamespaces = (function(namespaces) {
              return namespaces.filter(name => name.startsWith(input)).map(name => ({title: name || "?",
                                                                                 className: "suggest-cljs-ns"}));
          }).bind(this);

          var concatAnnotatedResults = (function(results) {
              return [].concat.apply([], results);
          }).bind(this);

          var localsPromise = dirac.extractScopeInfoFromScopeChainAsync(debuggerModel.selectedCallFrame()).then(extractAndAnnotateLocals);
          var currentNSSymbolsPromise = dirac.extractNamespaceSymbolsAsync(this._currentClojureScriptNamespace).then(annotateSymbols.bind(this, "suggest-cljs-in-ns"));
          var namespacesPromise = dirac.extractNamespacesAsync().then(annotateNamespaces);
          var cljsCoreNSSymbolsPromise = dirac.extractNamespaceSymbolsAsync("cljs.core").then(annotateSymbols.bind(this, "suggest-cljs-core"));

          var jobs = [localsPromise, currentNSSymbolsPromise, namespacesPromise, cljsCoreNSSymbolsPromise];
          Promise.all(jobs).then(concatAnnotatedResults).then(completionsReadyCallback.bind(this, ''));
        }
    },

    _markAliasedCompletions: function(annotatedCompletions) {
        var previous = null;
        for (var i=0; i<annotatedCompletions.length; i++) {
            var current = annotatedCompletions[i];

            if (previous) {
                if (current.title === previous.title) {
                    if (!current.className) {
                        current.className = "";
                    }
                    current.className += " suggest-aliased";
                }
            }
            previous = current;
        }
    },

    /**
     * @param {number} requestId
     * @param {string} prefix
     * @param {boolean} reverse
     * @param {boolean} force
     * @param {string} expression
     * @param {!Array.<string>} completions
     * @param {number=} selectedIndex
     */
    _completionsForClojureScriptReady: function(requestId, prefix, reverse, force, expression, completions, selectedIndex)
    {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_completionsForClojureScriptReady", prefix, reverse, force, completions, selectedIndex);
        }

        if (requestId!=this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadClojureScriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }

        var annotatedCompletions = completions;
        annotatedCompletions.sort(function(a, b) { return a.title.localeCompare(b.title); });

        this._markAliasedCompletions(annotatedCompletions);

        if (!annotatedCompletions.length) {
            this.hideSuggestBox();
            return;
        }

        this._userEnteredText = prefix;
        selectedIndex = (this._disableDefaultSuggestionForEmptyInput && !this.text()) ? -1 : (selectedIndex || 0);

        if (this._suggestBox) {
            this._lastExpression = expression;
            this._updateAnchorBox();
            var shouldShowForSingleItem = true; // TODO: later maybe implement inline completions like in TextPrompt.js
            if (dirac._DEBUG_COMPLETIONS) {
               console.log("calling SuggestBox.updateSuggestions", this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
            }
            this._suggestBox.updateSuggestions(this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
        }

        // TODO: here could be implemented inline completions like in TextPrompt.js
    },


    _updateAnchorBox: function()
    {
        var line = this._prefixRange.startLine;
        var column = this._prefixRange.startColumn;
        var metrics = this.cursorPositionToCoordinates(line, column);
        this._anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
    },

    /**
     * @param {number} lineNumber
     * @param {number} column
     * @return {?{x: number, y: number, height: number}}
     */
    cursorPositionToCoordinates: function(lineNumber, column)
    {
        if (lineNumber >= this._codeMirror.lineCount() || lineNumber < 0 || column < 0 || column > this._codeMirror.getLine(lineNumber).length)
            return null;

        var metrics = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, column));

        return {
            x: metrics.left,
            y: metrics.top,
            height: metrics.bottom - metrics.top
        };
    },

   /**
     * @override
     * @param {string} suggestion
     * @param {boolean=} isIntermediateSuggestion
     */
    applySuggestion: function(suggestion, isIntermediateSuggestion)
    {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("applySuggestion", this._lastExpression, suggestion);
        }
        this._currentSuggestion = this._lastExpression + suggestion;
    },

    /**
     * @override
     */
    acceptSuggestion: function()
    {
        if (this._prefixRange.endColumn - this._prefixRange.startColumn === this._currentSuggestion.length)
            return;

        var selections = this._codeMirror.listSelections().slice();
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("acceptSuggestion", this._prefixRange, selections);
        }
        var prefixLength = this._prefixRange.endColumn - this._prefixRange.startColumn;
        for (var i = selections.length - 1; i >= 0; --i) {
            var start = selections[i].head;
            var end = new CodeMirror.Pos(start.line, start.ch - prefixLength);
            this._codeMirror.replaceRange(this._currentSuggestion, start, end, "+autocomplete");
        }
    },

    _acceptSuggestionInternal: function(prefixAccepted)
    {
    },

    __proto__: WebInspector.TextPromptWithHistory.prototype
};