// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../text_utils/text_utils.js';

import {CSSLocation, CSSModel, Edit} from './CSSModel.js';     // eslint-disable-line no-unused-vars
import {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class CSSMediaQuery {
  /**
   * @param {!Protocol.CSS.MediaQuery} payload
   */
  constructor(payload) {
    this._active = payload.active;
    /** @type {?Array<!CSSMediaQueryExpression>} */
    this._expressions = [];
    for (let j = 0; j < payload.expressions.length; ++j) {
      this._expressions.push(CSSMediaQueryExpression.parsePayload(payload.expressions[j]));
    }
  }

  /**
   * @param {!Protocol.CSS.MediaQuery} payload
   * @return {!CSSMediaQuery}
   */
  static parsePayload(payload) {
    return new CSSMediaQuery(payload);
  }

  /**
   * @return {boolean}
   */
  active() {
    return this._active;
  }

  /**
   * @return {?Array<!CSSMediaQueryExpression>}
   */
  expressions() {
    return this._expressions;
  }
}


/**
 * @unrestricted
 */
export class CSSMediaQueryExpression {
  /**
   * @param {!Protocol.CSS.MediaQueryExpression} payload
   */
  constructor(payload) {
    this._value = payload.value;
    this._unit = payload.unit;
    this._feature = payload.feature;
    /** @type {?TextUtils.TextRange.TextRange} */
    this._valueRange = payload.valueRange ? TextUtils.TextRange.TextRange.fromObject(payload.valueRange) : null;
    this._computedLength = payload.computedLength || null;
  }

  /**
   * @param {!Protocol.CSS.MediaQueryExpression} payload
   * @return {!CSSMediaQueryExpression}
   */
  static parsePayload(payload) {
    return new CSSMediaQueryExpression(payload);
  }

  /**
   * @return {number}
   */
  value() {
    return this._value;
  }

  /**
   * @return {string}
   */
  unit() {
    return this._unit;
  }

  /**
   * @return {string}
   */
  feature() {
    return this._feature;
  }

  /**
   * @return {?TextUtils.TextRange.TextRange}
   */
  valueRange() {
    return this._valueRange;
  }

  /**
   * @return {?number}
   */
  computedLength() {
    return this._computedLength;
  }
}


/**
 * @unrestricted
 */
export class CSSMedia {
  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSMedia} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this._reinitialize(payload);
  }

  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSMedia} payload
   * @return {!CSSMedia}
   */
  static parsePayload(cssModel, payload) {
    return new CSSMedia(cssModel, payload);
  }

  /**
   * @param {!CSSModel} cssModel
   * @param {!Array.<!Protocol.CSS.CSSMedia>} payload
   * @return {!Array.<!CSSMedia>}
   */
  static parseMediaArrayPayload(cssModel, payload) {
    const result = [];
    for (let i = 0; i < payload.length; ++i) {
      result.push(CSSMedia.parsePayload(cssModel, payload[i]));
    }
    return result;
  }

  /**
   * @param {!Protocol.CSS.CSSMedia} payload
   */
  _reinitialize(payload) {
    this.text = payload.text;
    this.source = payload.source;
    this.sourceURL = payload.sourceURL || '';
    /** @type {?TextUtils.TextRange.TextRange} */
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    /** @type {?Array<!CSSMediaQuery>} */
    this.mediaList = null;
    if (payload.mediaList) {
      this.mediaList = [];
      for (let i = 0; i < payload.mediaList.length; ++i) {
        this.mediaList.push(CSSMediaQuery.parsePayload(payload.mediaList[i]));
      }
    }
  }

  /**
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this.range) {
      return;
    }
    if (edit.oldRange.equal(this.range)) {
      this._reinitialize(/** @type {!Protocol.CSS.CSSMedia} */ (edit.payload));
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
  }

  /**
   * @param {!CSSMedia} other
   * @return {boolean}
   */
  equal(other) {
    if (!this.styleSheetId || !this.range || !other.range) {
      return false;
    }
    return this.styleSheetId === other.styleSheetId && this.range.equal(other.range);
  }

  /**
   * @return {boolean}
   */
  active() {
    if (!this.mediaList) {
      return true;
    }
    for (let i = 0; i < this.mediaList.length; ++i) {
      if (this.mediaList[i].active()) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return {number|undefined}
   */
  lineNumberInSource() {
    if (!this.range) {
      return undefined;
    }
    const header = this.header();
    if (!header) {
      return undefined;
    }
    return header.lineNumberInSource(this.range.startLine);
  }

  /**
   * @return {number|undefined}
   */
  columnNumberInSource() {
    if (!this.range) {
      return undefined;
    }
    const header = this.header();
    if (!header) {
      return undefined;
    }
    return header.columnNumberInSource(this.range.startLine, this.range.startColumn);
  }

  /**
   * @return {?CSSStyleSheetHeader}
   */
  header() {
    return this.styleSheetId ? this._cssModel.styleSheetHeaderForId(this.styleSheetId) : null;
  }

  /**
   * @return {?CSSLocation}
   */
  rawLocation() {
    const header = this.header();
    if (!header || this.lineNumberInSource() === undefined) {
      return null;
    }
    const lineNumber = Number(this.lineNumberInSource());
    return new CSSLocation(header, lineNumber, this.columnNumberInSource());
  }
}

export const Source = {
  LINKED_SHEET: 'linkedSheet',
  INLINE_SHEET: 'inlineSheet',
  MEDIA_RULE: 'mediaRule',
  IMPORT_RULE: 'importRule',
};
