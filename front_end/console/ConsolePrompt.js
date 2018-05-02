// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Console.ConsolePrompt = class extends UI.Widget {
  constructor() {
    super();
    this._addCompletionsFromHistory = true;
    this._history = new Console.ConsoleHistoryManager();

    this._initialText = '';
    this._editor = null;
    this._isBelowPromptEnabled = Runtime.experiments.isEnabled('consoleBelowPrompt');
    this._eagerPreviewElement = createElementWithClass('div', 'console-eager-preview');
    this._textChangeThrottler = new Common.Throttler(150);
    this._formatter = new ObjectUI.RemoteObjectPreviewFormatter();
    this._requestPreviewBound = this._requestPreview.bind(this);
    this._innerPreviewElement = this._eagerPreviewElement.createChild('div', 'console-eager-inner-preview');
    this._eagerPreviewElement.appendChild(UI.Icon.create('smallicon-command-result', 'preview-result-icon'));

    this.element.tabIndex = 0;

    self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));

    /**
     * @param {!UI.TextEditorFactory} factory
     * @this {Console.ConsolePrompt}
     */
    function gotFactory(factory) {
      this._editor =
          factory.createEditor({lineNumbers: false, lineWrapping: true, mimeType: 'javascript', autoHeight: true});

      this._editor.configureAutocomplete({
        substituteRangeCallback: this._substituteRange.bind(this),
        suggestionsCallback: this._wordsWithQuery.bind(this),
        captureEnter: true
      });
      this._editor.widget().element.addEventListener('keydown', this._editorKeyDown.bind(this), true);
      this._editor.widget().show(this.element);
      this._editor.addEventListener(UI.TextEditor.Events.TextChanged, this._onTextChanged, this);
      if (this._isBelowPromptEnabled)
        this.element.appendChild(this._eagerPreviewElement);

      this.setText(this._initialText);
      delete this._initialText;
      if (this.hasFocus())
        this.focus();
      this.element.tabIndex = -1;

      this._editorSetForTest();
    }
  }

  /**
   * @return {number}
   */
  heightBelowEditor() {
    return this._eagerPreviewElement.offsetHeight;
  }

  _onTextChanged() {
    // ConsoleView and prompt both use a throttler, so we clear the preview
    // ASAP to avoid inconsistency between a fresh viewport and stale preview.
    if (this._isBelowPromptEnabled) {
      const asSoonAsPossible = !this.text();
      this._previewRequestForTest = this._textChangeThrottler.schedule(this._requestPreviewBound, asSoonAsPossible);
    }
    this.dispatchEventToListeners(Console.ConsolePrompt.Events.TextChanged);
  }

  /**
   * @return {!Promise}
   */
  async _requestPreview() {
    const text = this.text().trim();
    const executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext || !text || text.length > Console.ConsolePrompt._MaxLengthForEvaluation) {
      this._innerPreviewElement.removeChildren();
      return;
    }

    const options = {
      expression: SDK.RuntimeModel.wrapObjectLiteralExpressionIfNeeded(text),
      includeCommandLineAPI: true,
      generatePreview: true,
      throwOnSideEffect: true,
      timeout: 500
    };
    const result = await executionContext.evaluate(options, true /* userGesture */, false /* awaitPromise */);
    this._innerPreviewElement.removeChildren();
    if (result.error)
      return;

    if (result.exceptionDetails) {
      const exception = result.exceptionDetails.exception.description;
      if (exception.startsWith('TypeError: '))
        this._innerPreviewElement.textContent = exception;
      return;
    }

    const {preview, type, subtype, description} = result.object;
    if (preview && type === 'object' && subtype !== 'node') {
      this._formatter.appendObjectPreview(this._innerPreviewElement, preview, false /* isEntry */);
    } else {
      const nonObjectPreview = this._formatter.renderPropertyPreview(type, subtype, description.trimEnd(400));
      this._innerPreviewElement.appendChild(nonObjectPreview);
    }
    if (this._innerPreviewElement.deepTextContent() === this.text().trim())
      this._innerPreviewElement.removeChildren();
  }

  /**
   * @return {!Console.ConsoleHistoryManager}
   */
  history() {
    return this._history;
  }

  clearAutocomplete() {
    if (this._editor)
      this._editor.clearAutocomplete();
  }

  /**
   * @return {boolean}
   */
  _isCaretAtEndOfPrompt() {
    return !!this._editor && this._editor.selection().collapseToEnd().equal(this._editor.fullRange().collapseToEnd());
  }

  moveCaretToEndOfPrompt() {
    if (this._editor)
      this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {string} text
   */
  setText(text) {
    if (this._editor)
      this._editor.setText(text);
    else
      this._initialText = text;
    this.dispatchEventToListeners(Console.ConsolePrompt.Events.TextChanged);
  }

  /**
   * @return {string}
   */
  text() {
    return this._editor ? this._editor.text() : this._initialText;
  }

  /**
   * @param {boolean} value
   */
  setAddCompletionsFromHistory(value) {
    this._addCompletionsFromHistory = value;
  }

  /**
   * @param {!Event} event
   */
  _editorKeyDown(event) {
    const keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    let newText;
    let isPrevious;
    // Check against visual coordinates in case lines wrap.
    const selection = this._editor.selection();
    const cursorY = this._editor.visualCoordinates(selection.endLine, selection.endColumn).y;

    switch (keyboardEvent.keyCode) {
      case UI.KeyboardShortcut.Keys.Up.code:
        const startY = this._editor.visualCoordinates(0, 0).y;
        if (keyboardEvent.shiftKey || !selection.isEmpty() || cursorY !== startY)
          break;
        newText = this._history.previous(this.text());
        isPrevious = true;
        break;
      case UI.KeyboardShortcut.Keys.Down.code:
        const fullRange = this._editor.fullRange();
        const endY = this._editor.visualCoordinates(fullRange.endLine, fullRange.endColumn).y;
        if (keyboardEvent.shiftKey || !selection.isEmpty() || cursorY !== endY)
          break;
        newText = this._history.next();
        break;
      case UI.KeyboardShortcut.Keys.P.code:  // Ctrl+P = Previous
        if (Host.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey &&
            !keyboardEvent.shiftKey) {
          newText = this._history.previous(this.text());
          isPrevious = true;
        }
        break;
      case UI.KeyboardShortcut.Keys.N.code:  // Ctrl+N = Next
        if (Host.isMac() && keyboardEvent.ctrlKey && !keyboardEvent.metaKey && !keyboardEvent.altKey &&
            !keyboardEvent.shiftKey)
          newText = this._history.next();
        break;
      case UI.KeyboardShortcut.Keys.Enter.code:
        this._enterKeyPressed(keyboardEvent);
        break;
      case UI.KeyboardShortcut.Keys.Tab.code:
        if (!this.text())
          keyboardEvent.consume();
        break;
    }

    if (newText === undefined)
      return;
    keyboardEvent.consume(true);
    this.setText(newText);

    if (isPrevious)
      this._editor.setSelection(TextUtils.TextRange.createFromLocation(0, Infinity));
    else
      this.moveCaretToEndOfPrompt();
  }

  /**
   * @param {!KeyboardEvent} event
   */
  async _enterKeyPressed(event) {
    if (event.altKey || event.ctrlKey || event.shiftKey)
      return;

    event.consume(true);

    this.clearAutocomplete();

    const str = this.text();
    if (!str.length)
      return;

    const currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!this._isCaretAtEndOfPrompt() || !currentExecutionContext) {
      this._appendCommand(str, true);
      return;
    }
    const result = await currentExecutionContext.runtimeModel.compileScript(str, '', false, currentExecutionContext.id);
    if (str !== this.text())
      return;
    const exceptionDetails = result.exceptionDetails;
    if (exceptionDetails &&
        (exceptionDetails.exception.description.startsWith('SyntaxError: Unexpected end of input') ||
         exceptionDetails.exception.description.startsWith('SyntaxError: Unterminated template literal'))) {
      this._editor.newlineAndIndent();
      this._enterProcessedForTest();
      return;
    }
    await this._appendCommand(str, true);
    this._enterProcessedForTest();
  }

  /**
   * @param {string} text
   * @param {boolean} useCommandLineAPI
   */
  async _appendCommand(text, useCommandLineAPI) {
    this.setText('');
    const currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (currentExecutionContext) {
      const executionContext = currentExecutionContext;
      const message = SDK.consoleModel.addCommandMessage(executionContext, text);
      text = SDK.RuntimeModel.wrapObjectLiteralExpressionIfNeeded(text);
      let preprocessed = false;
      if (text.indexOf('await') !== -1) {
        const preprocessedText = await Formatter.formatterWorkerPool().preprocessTopLevelAwaitExpressions(text);
        preprocessed = !!preprocessedText;
        text = preprocessedText || text;
      }
      SDK.consoleModel.evaluateCommandInConsole(
          executionContext, message, text, useCommandLineAPI, /* awaitPromise */ preprocessed);
      if (Console.ConsolePanel.instance().isShowing())
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);
    }
  }

  _enterProcessedForTest() {
  }

  /**
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!UI.SuggestBox.Suggestions}
   */
  _historyCompletions(prefix, force) {
    if (!this._addCompletionsFromHistory || !this._isCaretAtEndOfPrompt() || (!prefix && !force))
      return [];
    const result = [];
    const text = this.text();
    const set = new Set();
    const data = this._history.historyData();
    for (let i = data.length - 1; i >= 0 && result.length < 50; --i) {
      const item = data[i];
      if (!item.startsWith(text))
        continue;
      if (set.has(item))
        continue;
      set.add(item);
      result.push(
          {text: item.substring(text.length - prefix.length), iconType: 'smallicon-text-prompt', isSecondary: true});
    }
    return result;
  }

  /**
   * @override
   */
  focus() {
    if (this._editor)
      this._editor.widget().focus();
    else
      this.element.focus();
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?TextUtils.TextRange}
   */
  _substituteRange(lineNumber, columnNumber) {
    const token = this._editor.tokenAtTextPosition(lineNumber, columnNumber);
    if (token && token.type === 'js-string')
      return new TextUtils.TextRange(lineNumber, token.startColumn, lineNumber, columnNumber);

    const lineText = this._editor.line(lineNumber);
    let index;
    for (index = columnNumber - 1; index >= 0; index--) {
      if (' =:[({;,!+-*/&|^<>.\t\r\n'.indexOf(lineText.charAt(index)) !== -1)
        break;
    }
    return new TextUtils.TextRange(lineNumber, index + 1, lineNumber, columnNumber);
  }

  /**
   * @param {!TextUtils.TextRange} queryRange
   * @param {!TextUtils.TextRange} substituteRange
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _wordsWithQuery(queryRange, substituteRange, force) {
    const query = this._editor.text(queryRange);
    const before = this._editor.text(new TextUtils.TextRange(0, 0, queryRange.startLine, queryRange.startColumn));
    const historyWords = this._historyCompletions(query, force);
    const token = this._editor.tokenAtTextPosition(substituteRange.startLine, substituteRange.startColumn);
    if (token) {
      const excludedTokens = new Set(['js-comment', 'js-string-2', 'js-def']);
      const trimmedBefore = before.trim();
      if (!trimmedBefore.endsWith('[') && !trimmedBefore.match(/\.\s*(get|set|delete)\s*\(\s*$/))
        excludedTokens.add('js-string');
      if (!trimmedBefore.endsWith('.'))
        excludedTokens.add('js-property');
      if (excludedTokens.has(token.type))
        return Promise.resolve(historyWords);
    }
    return ObjectUI.javaScriptAutocomplete.completionsForTextInCurrentContext(before, query, force)
        .then(words => words.concat(historyWords));
  }

  _editorSetForTest() {
  }
};

/**
 * @const
 * @type {number}
 */
Console.ConsolePrompt._MaxLengthForEvaluation = 2000;

/**
 * @unrestricted
 */
Console.ConsoleHistoryManager = class {
  constructor() {
    /**
     * @type {!Array.<string>}
     */
    this._data = [];

    /**
     * 1-based entry in the history stack.
     * @type {number}
     */
    this._historyOffset = 1;
  }

  /**
   * @return {!Array.<string>}
   */
  historyData() {
    return this._data;
  }

  /**
   * @param {!Array.<string>} data
   */
  setHistoryData(data) {
    this._data = data.slice();
    this._historyOffset = 1;
  }

  /**
   * Pushes a committed text into the history.
   * @param {string} text
   */
  pushHistoryItem(text) {
    if (this._uncommittedIsTop) {
      this._data.pop();
      delete this._uncommittedIsTop;
    }

    this._historyOffset = 1;
    if (text === this._currentHistoryItem())
      return;
    this._data.push(text);
  }

  /**
   * Pushes the current (uncommitted) text into the history.
   * @param {string} currentText
   */
  _pushCurrentText(currentText) {
    if (this._uncommittedIsTop)
      this._data.pop();  // Throw away obsolete uncommitted text.
    this._uncommittedIsTop = true;
    this._data.push(currentText);
  }

  /**
   * @param {string} currentText
   * @return {string|undefined}
   */
  previous(currentText) {
    if (this._historyOffset > this._data.length)
      return undefined;
    if (this._historyOffset === 1)
      this._pushCurrentText(currentText);
    ++this._historyOffset;
    return this._currentHistoryItem();
  }

  /**
   * @return {string|undefined}
   */
  next() {
    if (this._historyOffset === 1)
      return undefined;
    --this._historyOffset;
    return this._currentHistoryItem();
  }

  /**
   * @return {string|undefined}
   */
  _currentHistoryItem() {
    return this._data[this._data.length - this._historyOffset];
  }
};

Console.ConsolePrompt.Events = {
  TextChanged: Symbol('TextChanged')
};
