// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class Infobar {
  /**
   * @param {!Type} type
   * @param {string} text
   * @param {!Common.Setting=} disableSetting
   */
  constructor(type, text, disableSetting) {
    this.element = createElementWithClass('div', 'flex-none');
    this._shadowRoot = UI.createShadowRootWithCoreStyles(this.element, 'ui/infobar.css');
    this._contentElement = this._shadowRoot.createChild('div', 'infobar infobar-' + type);

    this._mainRow = this._contentElement.createChild('div', 'infobar-main-row');
    this._mainRow.createChild('div', type + '-icon icon');
    this._mainRowText = this._mainRow.createChild('div', 'infobar-main-title');
    this._mainRowText.textContent = text;
    this._detailsRows = this._contentElement.createChild('div', 'infobar-details-rows hidden');

    this._toggleElement =
        UI.createTextButton(ls`more`, this._onToggleDetails.bind(this), 'infobar-toggle link-style hidden');
    this._mainRow.appendChild(this._toggleElement);

    /** @type {?Common.Setting} */
    this._disableSetting = disableSetting || null;
    if (disableSetting) {
      const disableButton =
          UI.createTextButton(ls`never show`, this._onDisable.bind(this), 'infobar-toggle link-style');
      this._mainRow.appendChild(disableButton);
    }

    this._closeButton = this._contentElement.createChild('div', 'close-button', 'dt-close-button');
    this._closeButton.setTabbable(true);
    self.onInvokeElement(this._closeButton, this.dispose.bind(this));

    /** @type {?function()} */
    this._closeCallback = null;
  }

  /**
   * @param {!Type} type
   * @param {string} text
   * @param {!Common.Setting=} disableSetting
   * @return {?Infobar}
   */
  static create(type, text, disableSetting) {
    if (disableSetting && disableSetting.get()) {
      return null;
    }
    return new Infobar(type, text, disableSetting);
  }

  dispose() {
    this.element.remove();
    this._onResize();
    if (this._closeCallback) {
      this._closeCallback.call(null);
    }
  }

  /**
   * @param {string} text
   */
  setText(text) {
    this._mainRowText.textContent = text;
    this._onResize();
  }

  /**
   * @param {?function()} callback
   */
  setCloseCallback(callback) {
    this._closeCallback = callback;
  }

  /**
   * @param {!UI.Widget} parentView
   */
  setParentView(parentView) {
    this._parentView = parentView;
  }

  _onResize() {
    if (this._parentView) {
      this._parentView.doResize();
    }
  }

  _onDisable() {
    this._disableSetting.set(true);
    this.dispose();
  }

  _onToggleDetails() {
    this._detailsRows.classList.remove('hidden');
    this._toggleElement.remove();
    this._onResize();
  }

  /**
   * @param {string=} message
   * @return {!Element}
   */
  createDetailsRowMessage(message) {
    this._toggleElement.classList.remove('hidden');
    const infobarDetailsRow = this._detailsRows.createChild('div', 'infobar-details-row');
    const detailsRowMessage = infobarDetailsRow.createChild('span', 'infobar-row-message');
    detailsRowMessage.textContent = message || '';
    return detailsRowMessage;
  }
}

/** @enum {string} */
export const Type = {
  Warning: 'warning',
  Info: 'info'
};

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.Infobar = Infobar;

/** @enum {string} */
UI.Infobar.Type = Type;
