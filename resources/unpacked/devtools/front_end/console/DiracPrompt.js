/**
 * @constructor
 * @extends {WebInspector.TextPromptWithHistory}
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {!CodeMirror} codeMirrorInstance
 */
WebInspector.DiracPromptWithHistory = function(codeMirrorInstance) {
    /**
     * @param {!Element} proxyElement
     * @param {string} text
     * @param {number} cursorOffset
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    const dummyCompletionsFn = function(proxyElement, text, cursorOffset, wordRange, force, completionsReadyCallback) {
    };
    WebInspector.TextPromptWithHistory.call(this, dummyCompletionsFn);

    this._codeMirror = codeMirrorInstance;
    this._codeMirror.on("changes", this._changes.bind(this));
    this._codeMirror.on("scroll", this._onScroll.bind(this));
    this._codeMirror.on("cursorActivity", this._onCursorActivity.bind(this));
    this._codeMirror.on("blur", this._blur.bind(this));
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
    text: function() {
        const text = this._codeMirror.getValue();
        return text.replace(/[\s\n]+$/gm, ""); // remove trailing newlines and whitespace
    },

    setText: function(x) {
        this._removeSuggestionAids();
        this._codeMirror.setValue(x);
        this.moveCaretToEndOfPrompt();
        this._element.scrollIntoView();
    },

    /**
     * @override
     * @return {boolean}
     */
    isCaretInsidePrompt: function() {
        return this._codeMirror.hasFocus();
    },

    /**
     * @override
     * @return {boolean}
     */
    isCaretAtEndOfPrompt: function() {
        const content = this._codeMirror.getValue();
        const cursor = this._codeMirror.getCursor();
        const endCursor = this._codeMirror.posFromIndex(content.length);
        return (cursor.line == endCursor.line && cursor.ch == endCursor.ch);
    },

    /**
     * @override
     * @return {boolean}
     */
    isCaretOnFirstLine: function() {
        const cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.firstLine());
    },

    /**
     * @override
     * @return {boolean}
     */
    isCaretOnLastLine: function() {
        const cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.lastLine());
    },

    moveCaretToEndOfPrompt: function() {
        this._codeMirror.setCursor(this._codeMirror.lastLine() + 1, 0, null);
    },

    moveCaretToIndex: function(index) {
        const pos = this._codeMirror.posFromIndex(index);
        this._codeMirror.setCursor(pos, null, null);
    },

    finishAutocomplete: function() {
        this._removeSuggestionAids();
        this._prefixRange = null;
        this._anchorBox = null;
    },

    /**
     * @param {!CodeMirror} codeMirror
     * @param {!Array.<!CodeMirror.ChangeObject>} changes
     */
    _changes: function(codeMirror, changes) {
        if (!changes.length)
            return;

        let singleCharInput = false;
        for (let changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
            let changeObject = changes[changeIndex];
            singleCharInput = (changeObject.origin === "+input" && changeObject.text.length === 1 && changeObject.text[0].length === 1) ||
                (this.isSuggestBoxVisible() && changeObject.origin === "+delete" && changeObject.removed.length === 1 && changeObject.removed[0].length === 1);
        }
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_changes", singleCharInput, changes);
        }
        if (singleCharInput) {
            this._ignoreNextCursorActivity = true; // this prevents flickering of suggestion widget
            //noinspection JSUnresolvedFunction
            setImmediate(this.autocomplete.bind(this));
        }
    },

    _blur: function() {
        this.finishAutocomplete();
    },

    _onScroll: function() {
        if (!this.isSuggestBoxVisible())
            return;

        const cursor = this._codeMirror.getCursor();
        const scrollInfo = this._codeMirror.getScrollInfo();
        const topmostLineNumber = this._codeMirror.lineAtHeight(scrollInfo.top, "local");
        const bottomLine = this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, "local");
        if (cursor.line < topmostLineNumber || cursor.line > bottomLine)
            this.finishAutocomplete();
        else {
            this._updateAnchorBox();
            this._suggestBox.setPosition(this._anchorBox);
        }
    },

    _onCursorActivity: function() {
        if (!this.isSuggestBoxVisible()) {
            return;
        }

        if (this._ignoreNextCursorActivity) {
            delete this._ignoreNextCursorActivity;
            return;
        }

        const cursor = this._codeMirror.getCursor();
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
    complete: function(force, reverse) {
        // override with empty implementation to disable TextPrompt's autocomplete implementation
        // we use CodeMirror's changes modelled after TextEditorAutocompleteController.js in DiracPrompt
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("complete called => skip for disabling default auto-complete system");
        }
    },

    /**
     * @override
     */
    _selectStart: function() {
    },

    /**
     * @override
     * @param {boolean=} force
     */
    autoCompleteSoon: function(force) {
        this._ignoreNextCursorActivity = true; // this prevents flickering of suggestion widget
        //noinspection JSUnresolvedFunction
        setImmediate(this.autocomplete.bind(this));
    },

    /**
     * @override
     * @param {string} prefix
     * @return {!WebInspector.SuggestBox.Suggestions}
     */
    additionalCompletions: function(prefix) {
        // we keep this list empty for now, history contains mostly cljs stuff and we don't want to mix it with javascript
        return [];
    },

    _javascriptCompletionTest: function(prefix) {
        // test if prefix starts with "js/", then we treat it as javascript completion
        const m = prefix.match(/^js\/(.*)/);
        if (m) {
            return {
                prefix: m[1],
                offset: 3
            };
        }
    },

    /**
     * @param {boolean=} force
     * @param {boolean=} reverse
     */
    autocomplete: function(force, reverse) {
        this.clearAutoComplete(true);
        this._lastAutocompleteRequest++;

        let shouldExit = false;
        const cursor = this._codeMirror.getCursor();
        const token = this._codeMirror.getTokenAt(cursor);

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

        const prefix = this._codeMirror.getRange(new CodeMirror.Pos(cursor.line, token.start), cursor);
        const javascriptCompletion = this._javascriptCompletionTest(prefix);
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("detected prefix='" + prefix + "'", javascriptCompletion);
        }
        if (javascriptCompletion) {
            this._prefixRange = new WebInspector.TextRange(cursor.line, token.start + javascriptCompletion.offset, cursor.line, cursor.ch);
            const completionsForJavascriptReady = this._completionsForJavascriptReady.bind(this, this._lastAutocompleteRequest, !!reverse, !!force);
            this._loadJavascriptCompletions(this._lastAutocompleteRequest, javascriptCompletion.prefix, force || false, completionsForJavascriptReady);
        } else {
            this._prefixRange = new WebInspector.TextRange(cursor.line, token.start, cursor.line, cursor.ch);
            const completionsForClojureScriptReady = this._completionsForClojureScriptReady.bind(this, this._lastAutocompleteRequest, !!reverse, !!force);
            this._loadClojureScriptCompletions(this._lastAutocompleteRequest, prefix, force || false, completionsForClojureScriptReady);
        }
    },

    /**
     * @param {number} requestId
     * @param {string} input
     * @param {boolean} force
     * @param {function(string, string, !Array.<string>, number=)} completionsReadyCallback
     */
    _loadJavascriptCompletions: function(requestId, input, force, completionsReadyCallback) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_loadJavascriptCompletions", input, force);
        }
        if (requestId != this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadJavascriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }

        const executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no execution context available");
            }
            completionsReadyCallback("", "", []);
            return;
        }

        let prefix = input;
        let expressionString = '';
        const lastDotIndex = input.lastIndexOf(".");
        const lastOpenSquareBracketIndex = input.lastIndexOf("[");

        if (lastOpenSquareBracketIndex > lastDotIndex) {
            // split at last square bracket
            expressionString = input.substring(0, lastOpenSquareBracketIndex + 1);
            prefix = input.substring(lastOpenSquareBracketIndex + 1);
        } else {
            if (lastDotIndex >= 0) {
                // split at last dot
                expressionString = input.substring(0, lastDotIndex + 1);
                prefix = input.substring(lastDotIndex + 1);
            }
        }

        executionContext.completionsForExpression(expressionString, input, 0, prefix, force, completionsReadyCallback.bind(this, expressionString, prefix));
    },

    /**
     * @param {number} requestId
     * @param {boolean} reverse
     * @param {boolean} force
     * @param {string} expression
     * @param {string} prefix
     * @param {!Array.<string>} completions
     * @param {number=} selectedIndex
     */
    _completionsForJavascriptReady: function(requestId, reverse, force, expression, prefix, completions, selectedIndex) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_completionsForJavascriptReady", prefix, reverse, force, expression, completions, selectedIndex);
        }
        if (requestId != this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_completionsForJavascriptReady cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }
        // Filter out dupes.
        let store = new Set();
        completions = completions.filter(item => !store.has(item) && !!store.add(item));
        let annotatedCompletions = completions.map(item => ({title: item}));

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
        const shouldShowForSingleItem = true; // later maybe implement inline completions like in TextPrompt.js

        if (dirac._DEBUG_COMPLETIONS) {
            console.log("calling SuggestBox.updateSuggestions", this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
        }
        this._suggestBox.updateSuggestions(this._anchorBox, annotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);

        // here could be implemented inline completions like in TextPrompt.js
    },

    /**
     * @param {number} requestId
     * @param {string} input
     * @param {boolean} force
     * @param {function(string, string, !Array.<string>, number=)} completionsReadyCallback
     */
    _loadClojureScriptCompletions: function(requestId, input, force, completionsReadyCallback) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_loadClojureScriptCompletions", input, force);
        }
        if (requestId != this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadClojureScriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }
        const executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no execution context available");
            }
            completionsReadyCallback("", "", []);
            return;
        }

        const debuggerModel = executionContext.debuggerModel;
        if (!debuggerModel) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.warn("no debugger model available");
            }
            completionsReadyCallback("", "", []);
            return;
        }

        const suggestStyle = (style = "") => `suggest-cljs ${style}`;

        const namespaceSelector = name => {
            return function(namespaceDescriptors) {
                return namespaceDescriptors[name];
            }
        };
        const selectCurrentNamespace = namespaceSelector(this._currentClojureScriptNamespace);

        const concatAnnotatedResults = results => {
            return [].concat.apply([], results);
        };

        const lastSlashIndex = input.lastIndexOf("/");
        if (lastSlashIndex >= 0) {
            // completion of fully qualified name => split at last slash
            // example for input = "some.namespace/some-sym":
            //   prefix <= "some-sym"
            //   expression <= "some.namespace/"
            //   namespace <= "some.namespace"
            //
            // present only symbols from given namespace, matching given prefix
            // note that some.namespace may be also alias to a namespace or a macro namespace, we will resolve it

            const prefix = input.substring(lastSlashIndex + 1);
            const expression = input.substring(0, lastSlashIndex + 1);
            const namespace = input.substring(0, lastSlashIndex);

            const annotateQualifiedSymbols = (style, symbols) => {
                return symbols.filter(symbol => symbol.startsWith(prefix)).map(symbol => ({
                    title: symbol || "?",
                    className: suggestStyle(style)
                }));
            };

            const currentNamespaceDescriptorPromise = dirac.extractNamespacesAsync().then(selectCurrentNamespace);

            const resolvedNamespacePromise = currentNamespaceDescriptorPromise.then(currentNamespaceDescriptor => {
                if (!currentNamespaceDescriptor) {
                    return namespace;
                }
                const namespaceAliases = currentNamespaceDescriptor.namespaceAliases || {};
                const macroNamespaceAliases = currentNamespaceDescriptor.macroNamespaceAliases || {};
                const allAliases = Object.assign({}, namespaceAliases, macroNamespaceAliases);
                return allAliases[namespace] || namespace; // resolve alias or assume namespace name is a full namespace name
            });

            const namespaceSymbolsPromise = resolvedNamespacePromise.then(dirac.extractNamespaceSymbolsAsync).then(annotateQualifiedSymbols.bind(this, "suggest-cljs-qualified"));
            const macroNamespaceSymbolsPromise = resolvedNamespacePromise.then(dirac.extractMacroNamespaceSymbolsAsync).then(annotateQualifiedSymbols.bind(this, "suggest-cljs-qualified suggest-cljs-macro"));

            // order matters here, see _markAliasedCompletions below
            const jobs = [
                namespaceSymbolsPromise,
                macroNamespaceSymbolsPromise
            ];

            Promise.all(jobs).then(concatAnnotatedResults).then(completionsReadyCallback.bind(this, expression, prefix));
        } else {
            // general completion (without slashes)
            // combine: locals (if paused in debugger), current ns symbols, namespace names and cljs.core symbols
            // filter the list by input prefix

            const annotateSymbols = (style, symbols) => {
                return symbols.filter(symbol => symbol.startsWith(input)).map(symbol => ({
                    title: symbol || "?",
                    className: suggestStyle(style)
                }));
            };

            /**
             * @param {dirac.ScopeInfo} scopeInfo
             * @return {!Array<dirac.ScopeFrameProp>}
             */
            const extractLocalsFromScopeInfo = scopeInfo => {
                let locals = [];
                if (!scopeInfo) {
                    return locals;
                }

                const frames = scopeInfo.frames;
                if (frames) {
                    for (let i = 0; i < frames.length; i++) {
                        const frame = frames[i];
                        const props = frame.props;

                        if (props) {
                            for (let j = 0; j < props.length; j++) {
                                const prop = props[j];
                                locals.push(prop);
                            }
                        }
                    }
                }

                // deduplicate
                const keyFn = item => "" + item.name + item.identifier;
                let store = new Set();
                return locals.filter(item => !store.has(keyFn(item)) && !!store.add(keyFn(item)));
            };

            const extractAndAnnotateLocals = scopeInfo => {
                const locals = extractLocalsFromScopeInfo(scopeInfo);
                const filteredLocals = locals.filter(item => item.name.startsWith(input));
                const annotatedCompletions = filteredLocals.map(item => ({
                    title: item.name || "?",
                    epilogue: item.identifier ? "js/" + item.identifier : undefined,
                    className: suggestStyle("suggest-cljs-scope")
                }));
                annotatedCompletions.reverse(); // we want to display inner scopes first
                return annotatedCompletions;
            };

            const annotateNamespaceNames = (style, namespaces) => {
                return namespaces.filter(name => name.startsWith(input)).map(name => ({
                    title: name || "?",
                    className: suggestStyle(style)
                }));
            };

            const extractNamespaceNames = namespaceDescriptors => {
                return Object.keys(namespaceDescriptors);
            };

            const extractMacroNamespaceNames = namespaceDescriptors => {
                let names = [];
                for (let descriptor of Object.values(namespaceDescriptors)) {
                    if (!descriptor.detectedMacroNamespaces) {
                        continue;
                    }
                    names = names.concat(descriptor.detectedMacroNamespaces);
                }
                return dirac.deduplicate(names);
            };

            const annotateAliasesOrRefers = (kind, prefix, style, namespaceDescriptor) => {
                if (!namespaceDescriptor) {
                    return [];
                }
                const mapping = namespaceDescriptor[kind] || {};
                return Object.keys(mapping).filter(name => name.startsWith(input)).map(name => {
                    const targetName = mapping[name];
                    return {
                        title: name,
                        epilogue: targetName ? prefix + targetName : null, // full target name
                        className: suggestStyle(style)
                    }
                });
            };

            const annotateReplSpecials = symbols => {
                return symbols.filter(symbol => symbol.startsWith(input)).map(symbol => ({
                    title: symbol || "?",
                    className: suggestStyle("suggest-cljs-repl suggest-cljs-special")
                }));
            };
            
            const localsPromise = dirac.extractScopeInfoFromScopeChainAsync(debuggerModel.selectedCallFrame()).then(extractAndAnnotateLocals);
            const currentNamespaceSymbolsPromise = dirac.extractNamespaceSymbolsAsync(this._currentClojureScriptNamespace).then(annotateSymbols.bind(this, "suggest-cljs-in-ns"));
            const namespaceNamesPromise = dirac.extractNamespacesAsync().then(extractNamespaceNames).then(annotateNamespaceNames.bind(this, "suggest-cljs-ns"));
            const macroNamespaceNamesPromise = dirac.extractNamespacesAsync().then(extractMacroNamespaceNames).then(annotateNamespaceNames.bind(this, "suggest-cljs-ns suggest-cljs-macro"));
            const coreNamespaceSymbolsPromise = dirac.extractNamespaceSymbolsAsync("cljs.core").then(annotateSymbols.bind(this, "suggest-cljs-core"));
            const currentNamespaceDescriptor = dirac.extractNamespacesAsync().then(selectCurrentNamespace);
            const namespaceAliasesPromise = currentNamespaceDescriptor.then(annotateAliasesOrRefers.bind(this, "namespaceAliases", "as ", "suggest-ns-alias"));
            const macroNamespaceAliasesPromise = currentNamespaceDescriptor.then(annotateAliasesOrRefers.bind(this, "macroNamespaceAliases", "as ", "suggest-ns-alias suggest-cljs-macro"));
            const namespaceRefersPromise = currentNamespaceDescriptor.then(annotateAliasesOrRefers.bind(this, "namespaceRefers", "in ", "suggest-refer"));
            const macroRefersPromise = currentNamespaceDescriptor.then(annotateAliasesOrRefers.bind(this, "macroRefers", "in ", "suggest-refer suggest-cljs-macro"));
            const replSpecialsPromise = dirac.getReplSpecialsAsync().then(annotateReplSpecials);

            // order matters here, see _markAliasedCompletions below
            const jobs = [
                replSpecialsPromise,
                localsPromise,
                currentNamespaceSymbolsPromise,
                namespaceRefersPromise,
                macroRefersPromise,
                namespaceAliasesPromise,
                macroNamespaceAliasesPromise,
                namespaceNamesPromise,
                macroNamespaceNamesPromise,
                coreNamespaceSymbolsPromise
            ];

            Promise.all(jobs).then(concatAnnotatedResults).then(completionsReadyCallback.bind(this, "", input));
        }
    },

    _markAliasedCompletions: function(annotatedCompletions) {
        let previous = null;
        for (let i = 0; i < annotatedCompletions.length; i++) {
            const current = annotatedCompletions[i];

            if (previous) {
                if (current.title === previous.title) {
                    if (!current.className) {
                        current.className = "";
                    }
                    current.className += " suggest-cljs-aliased";
                }
            }
            previous = current;
        }
    },

    /**
     * @param {number} requestId
     * @param {boolean} reverse
     * @param {boolean} force
     * @param {string} expression
     * @param {string} prefix
     * @param {!Array.<string>} completions
     * @param {number=} selectedIndex
     */
    _completionsForClojureScriptReady: function(requestId, reverse, force, expression, prefix, completions, selectedIndex) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("_completionsForClojureScriptReady", prefix, reverse, force, completions, selectedIndex);
        }

        if (requestId != this._lastAutocompleteRequest) {
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("_loadClojureScriptCompletions cancelled", requestId, this._lastAutocompleteRequest);
            }
            return;
        }

        const sortedAnnotatedCompletions = dirac.stableSort(completions, (a, b) => {
            return a.title.localeCompare(b.title);
        });

        this._markAliasedCompletions(sortedAnnotatedCompletions);

        if (!sortedAnnotatedCompletions.length) {
            this.hideSuggestBox();
            return;
        }

        this._userEnteredText = prefix;
        selectedIndex = (this._disableDefaultSuggestionForEmptyInput && !this.text()) ? -1 : (selectedIndex || 0);

        if (this._suggestBox) {
            this._lastExpression = expression;
            this._updateAnchorBox();
            const shouldShowForSingleItem = true; // later maybe implement inline completions like in TextPrompt.js
            if (dirac._DEBUG_COMPLETIONS) {
                console.log("calling SuggestBox.updateSuggestions", this._anchorBox, sortedAnnotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
            }
            this._suggestBox.updateSuggestions(this._anchorBox, sortedAnnotatedCompletions, selectedIndex, shouldShowForSingleItem, this._userEnteredText);
        }

        // here could be implemented inline completions like in TextPrompt.js
    },


    _updateAnchorBox: function() {
        const line = this._prefixRange.startLine;
        const column = this._prefixRange.startColumn;
        const metrics = this.cursorPositionToCoordinates(line, column);
        this._anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
    },

    /**
     * @param {number} lineNumber
     * @param {number} column
     * @return {?{x: number, y: number, height: number}}
     */
    cursorPositionToCoordinates: function(lineNumber, column) {
        if (lineNumber >= this._codeMirror.lineCount() || lineNumber < 0 || column < 0 || column > this._codeMirror.getLine(lineNumber).length)
            return null;

        const metrics = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, column));

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
    applySuggestion: function(suggestion, isIntermediateSuggestion) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("applySuggestion", this._lastExpression, suggestion);
        }
        this._currentSuggestion = this._lastExpression + suggestion;
    },

    /**
     * @override
     */
    acceptSuggestion: function() {
        if (this._prefixRange.endColumn - this._prefixRange.startColumn === this._currentSuggestion.length)
            return;

        const selections = this._codeMirror.listSelections().slice();
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("acceptSuggestion", this._prefixRange, selections);
        }
        const prefixLength = this._prefixRange.endColumn - this._prefixRange.startColumn;
        for (let i = selections.length - 1; i >= 0; --i) {
            const start = selections[i].head;
            const end = new CodeMirror.Pos(start.line, start.ch - prefixLength);
            this._codeMirror.replaceRange(this._currentSuggestion, start, end, "+autocomplete");
        }
    },

    /**
     * @override
     */
    _acceptSuggestionInternal: function(prefixAccepted) {
    },

    /**
     * @override
     * @return {string}
     */
    getSuggestBoxRepresentation: function() {
        if (!this._suggestBox || !this._suggestBox.visible()) {
            return "suggest box is not visible";
        }
        const res = ["suggest box displays " + this._suggestBox._length + " items:"];

        const children = this._suggestBox._element.children;
        for (let child of children) {
            res.push(" * " + child.textContent);
        }

        return res.join("\n");
    },

    __proto__: WebInspector.TextPromptWithHistory.prototype
};