// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Console.ConsolePinPane = class extends UI.ThrottledWidget {
  constructor() {
    super(true, 250);
    this.registerRequiredCSS('console/consolePinPane.css');
    this.registerRequiredCSS('object_ui/objectValue.css');
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);

    /** @type {!Set<!Console.ConsolePin>} */
    this._pins = new Set();
    this._pinsSetting = Common.settings.createLocalSetting('consolePins', []);
    for (const expression of this._pinsSetting.get())
      this.addPin(expression);
  }

  _savePins() {
    const toSave = Array.from(this._pins).map(pin => pin.expression());
    this._pinsSetting.set(toSave);
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    const contextMenu = new UI.ContextMenu(event);
    const target = event.deepElementFromPoint();
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
      if (targetPinElement) {
        const targetPin = targetPinElement[Console.ConsolePin._PinSymbol];
        contextMenu.editSection().appendItem(ls`Edit expression`, targetPin.focus.bind(targetPin));
        contextMenu.editSection().appendItem(ls`Remove expression`, this._removePin.bind(this, targetPin));
        targetPin.appendToContextMenu(contextMenu);
      }
    }
    contextMenu.editSection().appendItem(ls`Remove all expressions`, this._removeAllPins.bind(this));
    contextMenu.show();
  }

  _removeAllPins() {
    for (const pin of this._pins)
      this._removePin(pin);
  }

  /**
   * @param {!Console.ConsolePin} pin
   */
  _removePin(pin) {
    pin.element().remove();
    this._pins.delete(pin);
    this._savePins();
  }

  /**
   * @param {string} expression
   * @param {boolean=} userGesture
   */
  addPin(expression, userGesture) {
    const pin = new Console.ConsolePin(expression, this);
    this.contentElement.appendChild(pin.element());
    this._pins.add(pin);
    this._savePins();
    if (userGesture)
      pin.focus();
    this.update();
  }

  /**
   * @override
   */
  doUpdate() {
    if (!this._pins.size || !this.isShowing())
      return Promise.resolve();
    if (this.isShowing())
      this.update();
    const updatePromises = Array.from(this._pins, pin => pin.updatePreview());
    return Promise.all(updatePromises).then(this._updatedForTest.bind(this));
  }

  _updatedForTest() {
  }
};

Console.ConsolePin = class extends Common.Object {
  /**
   * @param {string} expression
   * @param {!Console.ConsolePinPane} pinPane
   */
  constructor(expression, pinPane) {
    super();
    const deletePinIcon = UI.Icon.create('smallicon-cross', 'console-delete-pin');
    deletePinIcon.addEventListener('click', () => pinPane._removePin(this));

    const fragment = UI.Fragment.build`
    <div class='console-pin'>
      ${deletePinIcon}
      <div class='console-pin-name' $='name'></div>
      <div class='console-pin-preview' $='preview'>${ls`not available`}</div>
    </div>`;
    this._pinElement = fragment.element();
    this._pinPreview = fragment.$('preview');
    const nameElement = fragment.$('name');
    nameElement.title = expression;
    this._pinElement[Console.ConsolePin._PinSymbol] = this;

    /** @type {?SDK.RemoteObject} */
    this._resultObject = null;
    /** @type {?UI.TextEditor} */
    this._editor = null;
    this._committedExpression = expression;

    this._editorPromise = self.runtime.extension(UI.TextEditorFactory).instance().then(factory => {
      this._editor = factory.createEditor({
        lineNumbers: false,
        lineWrapping: true,
        mimeType: 'javascript',
        autoHeight: true,
        placeholder: ls`Expression`
      });
      this._editor.configureAutocomplete(ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
      this._editor.widget().show(nameElement);
      this._editor.widget().element.classList.add('console-pin-editor');
      this._editor.widget().element.tabIndex = -1;
      this._editor.setText(expression);
      this._editor.widget().element.addEventListener('keydown', event => {
        if (event.key === 'Tab' && !this._editor.text())
          event.consume();
      }, true);
      this._editor.widget().element.addEventListener('focusout', event => {
        const text = this._editor.text();
        const trimmedText = text.trim();
        if (text.length !== trimmedText.length)
          this._editor.setText(trimmedText);
        this._committedExpression = trimmedText;
        pinPane._savePins();
      });
    });
  }

  /**
   * @return {string}
   */
  expression() {
    return this._committedExpression;
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._pinElement;
  }

  async focus() {
    await this._editorPromise;
    this._editor.widget().focus();
    this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  appendToContextMenu(contextMenu) {
    if (this._resultObject)
      contextMenu.appendApplicableItems(this._resultObject);
  }

  /**
   * @return {!Promise}
   */
  async updatePreview() {
    if (!this._editor)
      return;
    const text = this._editor.textWithCurrentSuggestion().trim();
    const isEditing = this._pinElement.hasFocus();
    const throwOnSideEffect = isEditing && text !== this._committedExpression;
    const timeout = throwOnSideEffect ? 250 : undefined;
    const {preview, result} = await ObjectUI.JavaScriptREPL.evaluateAndBuildPreview(
        text, throwOnSideEffect, timeout, !isEditing /* allowErrors */);
    this._resultObject = result ? (result.object || null) : null;
    const previewText = preview.deepTextContent();
    if (!previewText || previewText !== this._pinPreview.deepTextContent()) {
      this._pinPreview.removeChildren();
      if (result && SDK.RuntimeModel.isSideEffectFailure(result)) {
        const sideEffectLabel = this._pinPreview.createChild('span', 'object-value-calculate-value-button');
        sideEffectLabel.textContent = `(...)`;
        sideEffectLabel.title = ls`Evaluate, allowing side effects`;
      } else if (previewText) {
        this._pinPreview.appendChild(preview);
      } else if (!isEditing) {
        this._pinPreview.createTextChild(ls`not available`);
      }
      this._pinPreview.title = previewText;
    }

    const isError = result && result.exceptionDetails && !SDK.RuntimeModel.isSideEffectFailure(result);
    this._pinElement.classList.toggle('error-level', isError);
  }
};

Console.ConsolePin._PinSymbol = Symbol('pinSymbol');
