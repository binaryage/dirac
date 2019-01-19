// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

ColorPicker.ContrastInfo = class extends Common.Object {
  /**
   * @param {?SDK.CSSModel.ContrastInfo} contrastInfo
   */
  constructor(contrastInfo) {
    super();
    this._isNull = true;
    /** @type {?number} */
    this._contrastRatio = null;
    /** @type {?Object<string, number>} */
    this._contrastRatioThresholds = null;
    /** @type {?Common.Color} */
    this._fgColor = null;
    /** @type {?Common.Color} */
    this._bgColor = null;

    if (!contrastInfo)
      return;

    if (!contrastInfo.computedFontSize || !contrastInfo.computedFontWeight || !contrastInfo.backgroundColors ||
        contrastInfo.backgroundColors.length !== 1)
      return;

    this._isNull = false;
    const isLargeFont =
        ColorPicker.ContrastInfo.computeIsLargeFont(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);

    this._contrastRatioThresholds =
        ColorPicker.ContrastInfo._ContrastThresholds[(isLargeFont ? 'largeFont' : 'normalFont')];
    const bgColorText = contrastInfo.backgroundColors[0];
    const bgColor = Common.Color.parse(bgColorText);
    if (bgColor)
      this._setBgColorInternal(bgColor);
  }

  /**
   * @return {boolean}
   */
  isNull() {
    return this._isNull;
  }

  /**
   * @param {!Common.Color} fgColor
   */
  setColor(fgColor) {
    this._fgColor = fgColor;
    this._updateContrastRatio();
    this.dispatchEventToListeners(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated);
  }

  /**
   * @return {?Common.Color}
   */
  color() {
    return this._fgColor;
  }

  /**
   * @return {?number}
   */
  contrastRatio() {
    return this._contrastRatio;
  }

  /**
   * @param {!Common.Color} bgColor
   */
  setBgColor(bgColor) {
    this._setBgColorInternal(bgColor);
    this.dispatchEventToListeners(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated);
  }

  /**
   * @param {!Common.Color} bgColor
   */
  _setBgColorInternal(bgColor) {
    this._bgColor = bgColor;

    if (!this._fgColor)
      return;

    const fgRGBA = this._fgColor.rgba();

    // If we have a semi-transparent background color over an unknown
    // background, draw the line for the "worst case" scenario: where
    // the unknown background is the same color as the text.
    if (bgColor.hasAlpha()) {
      const blendedRGBA = [];
      Common.Color.blendColors(bgColor.rgba(), fgRGBA, blendedRGBA);
      this._bgColor = new Common.Color(blendedRGBA, Common.Color.Format.RGBA);
    }

    this._contrastRatio = Common.Color.calculateContrastRatio(fgRGBA, this._bgColor.rgba());
  }

  /**
   * @return {?Common.Color}
   */
  bgColor() {
    return this._bgColor;
  }

  _updateContrastRatio() {
    if (!this._bgColor || !this._fgColor)
      return;
    this._contrastRatio = Common.Color.calculateContrastRatio(this._fgColor.rgba(), this._bgColor.rgba());
  }

  /**
   * @param {string} level
   * @return {?number}
   */
  contrastRatioThreshold(level) {
    if (!this._contrastRatioThresholds)
      return null;
    return this._contrastRatioThresholds[level];
  }

  /**
   * @param {string} fontSize
   * @param {string} fontWeight
   * @return {boolean}
   */
  static computeIsLargeFont(fontSize, fontWeight) {
    const boldWeights = ['bold', 'bolder', '600', '700', '800', '900'];

    const fontSizePx = parseFloat(fontSize.replace('px', ''));
    const isBold = (boldWeights.indexOf(fontWeight) !== -1);

    const fontSizePt = fontSizePx * 72 / 96;
    if (isBold)
      return fontSizePt >= 14;
    else
      return fontSizePt >= 18;
  }
};

/** @enum {symbol} */
ColorPicker.ContrastInfo.Events = {
  ContrastInfoUpdated: Symbol('ContrastInfoUpdated')
};

ColorPicker.ContrastInfo._ContrastThresholds = {
  largeFont: {aa: 3.0, aaa: 4.5},
  normalFont: {aa: 4.5, aaa: 7.0}
};
