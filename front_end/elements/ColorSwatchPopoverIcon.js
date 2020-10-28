// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as ColorPicker from '../color_picker/color_picker.js';
import * as Common from '../common/common.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as UI from '../ui/ui.js';

import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class BezierPopoverIcon {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.Swatches.BezierSwatch} swatch
   */
  constructor(treeElement, swatchPopoverHelper, swatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._swatch = swatch;

    this._swatch.iconElement().title = Common.UIString.UIString('Open cubic bezier editor.');
    this._swatch.iconElement().addEventListener('click', this._iconClick.bind(this), false);
    this._swatch.iconElement().addEventListener(
        'mousedown', /** @param {!Event} event */ event => event.consume(), false);

    this._boundBezierChanged = this._bezierChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    event.consume(true);
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    this._bezierEditor = new InlineEditor.BezierEditor.BezierEditor();
    let cubicBezier = UI.Geometry.CubicBezier.parse(this._swatch.bezierText());
    if (!cubicBezier) {
      cubicBezier =
          /** @type {!UI.Geometry.CubicBezier} */ (UI.Geometry.CubicBezier.parse('linear'));
    }
    this._bezierEditor.setBezier(cubicBezier);
    this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
    this._swatchPopoverHelper.show(this._bezierEditor, this._swatch.iconElement(), this._onPopoverHidden.bind(this));
    this._scrollerElement = this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _bezierChanged(event) {
    this._swatch.setBezierText(/** @type {string} */ (event.data));
    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._bezierEditor) {
      this._bezierEditor.removeEventListener(InlineEditor.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
    }
    this._bezierEditor = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}

/**
 * @unrestricted
 */
export class ColorSwatchPopoverIcon {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.ColorSwatch.ColorSwatchClosureInterface} swatch
   */
  constructor(treeElement, swatchPopoverHelper, swatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._swatch = swatch;
    this._swatch.addEventListener('swatch-click', this._iconClick.bind(this));
    this._contrastInfo = null;

    this._boundSpectrumChanged = this._spectrumChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @return {!ColorPicker.Spectrum.Palette}
   */
  _generateCSSVariablesPalette() {
    const matchedStyles = this._treeElement.matchedStyles();
    const style = this._treeElement.property.ownerStyle;
    const cssVariables = matchedStyles.availableCSSVariables(style);
    const colors = [];
    const colorNames = [];
    for (const cssVariable of cssVariables) {
      if (cssVariable === this._treeElement.property.name) {
        continue;
      }
      const value = matchedStyles.computeCSSVariable(style, cssVariable);
      if (!value) {
        continue;
      }
      const color = Common.Color.Color.parse(value);
      if (!color) {
        continue;
      }
      colors.push(value);
      colorNames.push(cssVariable);
    }
    return {title: 'CSS Variables', mutable: false, matchUserFormat: true, colors: colors, colorNames: colorNames};
  }

  /**
   * @param {!ColorPicker.ContrastInfo.ContrastInfo} contrastInfo
   */
  setContrastInfo(contrastInfo) {
    this._contrastInfo = contrastInfo;
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    event.consume(true);
    this.showPopover();
  }

  showPopover() {
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    const color = this._swatch.color;
    let format = this._swatch.format;
    if (!color || !format) {
      return;
    }

    if (format === Common.Color.Format.Original) {
      format = color.format();
    }
    this._spectrum = new ColorPicker.Spectrum.Spectrum(this._contrastInfo);
    this._spectrum.setColor(color, format);
    this._spectrum.addPalette(this._generateCSSVariablesPalette());

    this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged, this._spectrumResized, this);
    this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged, this._boundSpectrumChanged);
    this._swatchPopoverHelper.show(this._spectrum, this._swatch, this._onPopoverHidden.bind(this));
    this._scrollerElement = this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _spectrumResized(event) {
    this._swatchPopoverHelper.reposition();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _spectrumChanged(event) {
    const color = Common.Color.Color.parse(/** @type {string} */ (event.data));
    if (!color) {
      return;
    }

    const colorName = this._spectrum ? this._spectrum.colorName() : undefined;
    const text = colorName && colorName.startsWith('--') ? `var(${colorName})` : color.asString();

    this._swatch.renderColor(color);
    const value = this._swatch.firstElementChild;
    if (value) {
      value.remove();
      this._swatch.createChild('span').textContent = text;
    }

    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._spectrum) {
      this._spectrum.removeEventListener(ColorPicker.Spectrum.Events.ColorChanged, this._boundSpectrumChanged);
    }
    this._spectrum = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}

/**
 * @unrestricted
 */
export class ShadowSwatchPopoverHelper {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.Swatches.CSSShadowSwatch} shadowSwatch
   */
  constructor(treeElement, swatchPopoverHelper, shadowSwatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._shadowSwatch = shadowSwatch;
    this._iconElement = shadowSwatch.iconElement();

    this._iconElement.title = Common.UIString.UIString('Open shadow editor.');
    this._iconElement.addEventListener('click', this._iconClick.bind(this), false);
    this._iconElement.addEventListener('mousedown', event => event.consume(), false);

    this._boundShadowChanged = this._shadowChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    event.consume(true);
    this.showPopover();
  }

  showPopover() {
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    this._cssShadowEditor = new InlineEditor.CSSShadowEditor.CSSShadowEditor();
    this._cssShadowEditor.setModel(this._shadowSwatch.model());
    this._cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged, this._boundShadowChanged);
    this._swatchPopoverHelper.show(this._cssShadowEditor, this._iconElement, this._onPopoverHidden.bind(this));
    this._scrollerElement = this._iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _shadowChanged(event) {
    this._shadowSwatch.setCSSShadow(/** @type {!InlineEditor.CSSShadowModel.CSSShadowModel} */ (event.data));
    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._cssShadowEditor) {
      this._cssShadowEditor.removeEventListener(
          InlineEditor.CSSShadowEditor.Events.ShadowChanged, this._boundShadowChanged);
    }
    this._cssShadowEditor = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}
