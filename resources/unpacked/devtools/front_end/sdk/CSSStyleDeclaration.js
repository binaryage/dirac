// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../text_utils/text_utils.js';
import {cssMetadata} from './CSSMetadata.js';
import {CSSModel, Edit} from './CSSModel.js';  // eslint-disable-line no-unused-vars
import {CSSProperty} from './CSSProperty.js';
import {CSSRule} from './CSSRule.js';  // eslint-disable-line no-unused-vars
import {Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class CSSStyleDeclaration {
  /**
   * @param {!CSSModel} cssModel
   * @param {?CSSRule} parentRule
   * @param {!Protocol.CSS.CSSStyle} payload
   * @param {!Type} type
   */
  constructor(cssModel, parentRule, payload, type) {
    this._cssModel = cssModel;
    this.parentRule = parentRule;
    /** @type {!Array<!CSSProperty>} */
    this._allProperties;
    /** @type {string|undefined} */
    this.styleSheetId;
    /** @type {?TextUtils.TextRange.TextRange} */
    this.range;
    /** @type {string|undefined} */
    this.cssText;
    /** @type {!Map<string, string>} */
    this._shorthandValues;
    /** @type {!Set<string>} */
    this._shorthandIsImportant;
    /** @type {!Map<string, !CSSProperty>} */
    this._activePropertyMap;
    /** @type {?Array<!CSSProperty>} */
    this._leadingProperties;
    this._reinitialize(payload);
    this.type = type;
  }

  /**
   * @param {!Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this.range) {
      return;
    }
    if (edit.oldRange.equal(this.range)) {
      this._reinitialize(/** @type {!Protocol.CSS.CSSStyle} */ (edit.payload));
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
      for (let i = 0; i < this._allProperties.length; ++i) {
        this._allProperties[i].rebase(edit);
      }
    }
  }

  /**
   * @param {!Protocol.CSS.CSSStyle} payload
   */
  _reinitialize(payload) {
    this.styleSheetId = payload.styleSheetId;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;

    const shorthandEntries = payload.shorthandEntries;
    this._shorthandValues = new Map();
    this._shorthandIsImportant = new Set();
    for (let i = 0; i < shorthandEntries.length; ++i) {
      this._shorthandValues.set(shorthandEntries[i].name, shorthandEntries[i].value);
      if (shorthandEntries[i].important) {
        this._shorthandIsImportant.add(shorthandEntries[i].name);
      }
    }

    this._allProperties = [];

    if (payload.cssText && this.range) {
      const cssText = new TextUtils.Text.Text(payload.cssText);
      let start = {line: this.range.startLine, column: this.range.startColumn};
      for (const cssProperty of payload.cssProperties) {
        const range = cssProperty.range;
        if (range) {
          parseUnusedText.call(this, cssText, start.line, start.column, range.startLine, range.startColumn);
          start = {line: range.endLine, column: range.endColumn};
        }
        this._allProperties.push(CSSProperty.parsePayload(this, this._allProperties.length, cssProperty));
      }
      parseUnusedText.call(this, cssText, start.line, start.column, this.range.endLine, this.range.endColumn);
    } else {
      for (const cssProperty of payload.cssProperties) {
        this._allProperties.push(CSSProperty.parsePayload(this, this._allProperties.length, cssProperty));
      }
    }

    this._generateSyntheticPropertiesIfNeeded();
    this._computeInactiveProperties();

    this._activePropertyMap = new Map();
    for (const property of this._allProperties) {
      if (!property.activeInStyle()) {
        continue;
      }
      this._activePropertyMap.set(property.name, property);
    }

    this.cssText = payload.cssText;
    this._leadingProperties = null;

    /**
     * @this {CSSStyleDeclaration}
     * @param {!TextUtils.Text.Text} cssText
     * @param {number} startLine
     * @param {number} startColumn
     * @param {number} endLine
     * @param {number} endColumn
     */
    function parseUnusedText(cssText, startLine, startColumn, endLine, endColumn) {
      const tr = new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn);
      if (!this.range) {
        return;
      }
      const missingText = cssText.extract(tr.relativeTo(this.range.startLine, this.range.startColumn));

      // Try to fit the malformed css into properties.
      const lines = missingText.split('\n');
      let lineNumber = 0;
      let inComment = false;
      for (const line of lines) {
        let column = 0;
        for (const property of line.split(';')) {
          const strippedProperty = stripComments(property, inComment);
          const trimmedProperty = strippedProperty.text.trim();
          inComment = strippedProperty.inComment;

          if (trimmedProperty) {
            let name;
            let value;
            const colonIndex = trimmedProperty.indexOf(':');
            if (colonIndex === -1) {
              name = trimmedProperty;
              value = '';
            } else {
              name = trimmedProperty.substring(0, colonIndex).trim();
              value = trimmedProperty.substring(colonIndex + 1).trim();
            }
            const range = new TextUtils.TextRange.TextRange(lineNumber, column, lineNumber, column + property.length);
            this._allProperties.push(new CSSProperty(
                this, this._allProperties.length, name, value, false, false, false, false, property,
                range.relativeFrom(startLine, startColumn)));
          }
          column += property.length + 1;
        }
        lineNumber++;
      }
    }

    /**
     * @param {string} text
     * @param {boolean} inComment
     * @return {{text: string, inComment: boolean}}
     */
    function stripComments(text, inComment) {
      let output = '';
      for (let i = 0; i < text.length; i++) {
        if (!inComment && text.substring(i, i + 2) === '/*') {
          inComment = true;
          i++;
        } else if (inComment && text.substring(i, i + 2) === '*/') {
          inComment = false;
          i++;
        } else if (!inComment) {
          output += text[i];
        }
      }
      return {text: output, inComment};
    }
  }

  _generateSyntheticPropertiesIfNeeded() {
    if (this.range) {
      return;
    }

    if (!this._shorthandValues.size) {
      return;
    }

    const propertiesSet = new Set();
    for (const property of this._allProperties) {
      propertiesSet.add(property.name);
    }

    const generatedProperties = [];
    // For style-based properties, generate shorthands with values when possible.
    for (const property of this._allProperties) {
      // For style-based properties, try generating shorthands.
      const shorthands = cssMetadata().shorthands(property.name) || [];
      for (const shorthand of shorthands) {
        if (propertiesSet.has(shorthand)) {
          continue;
        }  // There already is a shorthand this longhands falls under.
        const shorthandValue = this._shorthandValues.get(shorthand);
        if (!shorthandValue) {
          continue;
        }  // Never generate synthetic shorthands when no value is available.

        // Generate synthetic shorthand we have a value for.
        const shorthandImportance = !!this._shorthandIsImportant.has(shorthand);
        const shorthandProperty = new CSSProperty(
            this, this.allProperties().length, shorthand, shorthandValue, shorthandImportance, false, true, false);
        generatedProperties.push(shorthandProperty);
        propertiesSet.add(shorthand);
      }
    }
    this._allProperties = this._allProperties.concat(generatedProperties);
  }

  /**
   * @return {!Array.<!CSSProperty>}
   */
  _computeLeadingProperties() {
    /**
     * @param {!CSSProperty} property
     * @return {boolean}
     */
    function propertyHasRange(property) {
      return !!property.range;
    }

    if (this.range) {
      return this._allProperties.filter(propertyHasRange);
    }

    const leadingProperties = [];
    for (const property of this._allProperties) {
      const shorthands = cssMetadata().shorthands(property.name) || [];
      let belongToAnyShorthand = false;
      for (const shorthand of shorthands) {
        if (this._shorthandValues.get(shorthand)) {
          belongToAnyShorthand = true;
          break;
        }
      }
      if (!belongToAnyShorthand) {
        leadingProperties.push(property);
      }
    }

    return leadingProperties;
  }

  /**
   * @return {!Array.<!CSSProperty>}
   */
  leadingProperties() {
    if (!this._leadingProperties) {
      this._leadingProperties = this._computeLeadingProperties();
    }
    return this._leadingProperties;
  }

  /**
   * @return {!Target}
   */
  target() {
    return this._cssModel.target();
  }

  /**
   * @return {!CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  _computeInactiveProperties() {
    /** @type {!Map<string, !CSSProperty>} */
    const activeProperties = new Map();
    for (let i = 0; i < this._allProperties.length; ++i) {
      const property = this._allProperties[i];
      if (property.disabled || !property.parsedOk) {
        property.setActive(false);
        continue;
      }
      const canonicalName = cssMetadata().canonicalPropertyName(property.name);
      const activeProperty = activeProperties.get(canonicalName);
      if (!activeProperty) {
        activeProperties.set(canonicalName, property);
      } else if (!activeProperty.important || property.important) {
        activeProperty.setActive(false);
        activeProperties.set(canonicalName, property);
      } else {
        property.setActive(false);
      }
    }
  }

  /**
   * @return {!Array<!CSSProperty>}
   */
  allProperties() {
    return this._allProperties;
  }

  /**
   * @param {string} name
   * @return {string}
   */
  getPropertyValue(name) {
    const property = this._activePropertyMap.get(name);
    return property ? property.value : '';
  }

  /**
   * @param {string} name
   * @return {boolean}
   */
  isPropertyImplicit(name) {
    const property = this._activePropertyMap.get(name);
    return property ? property.implicit : false;
  }

  /**
   * @param {string} name
   * @return {!Array.<!CSSProperty>}
   */
  longhandProperties(name) {
    const longhands = cssMetadata().longhands(name);
    const result = [];
    for (let i = 0; longhands && i < longhands.length; ++i) {
      const property = this._activePropertyMap.get(longhands[i]);
      if (property) {
        result.push(property);
      }
    }
    return result;
  }

  /**
   * @param {number} index
   * @return {?CSSProperty}
   */
  propertyAt(index) {
    return (index < this.allProperties().length) ? this.allProperties()[index] : null;
  }

  /**
   * @return {number}
   */
  pastLastSourcePropertyIndex() {
    for (let i = this.allProperties().length - 1; i >= 0; --i) {
      if (this.allProperties()[i].range) {
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * @param {number} index
   * @return {!TextUtils.TextRange.TextRange}
   */
  _insertionRange(index) {
    const property = this.propertyAt(index);
    if (property && property.range) {
      return property.range.collapseToStart();
    }
    if (!this.range) {
      throw new Error('CSSStyleDeclaration.range is null');
    }
    return this.range.collapseToEnd();
  }

  /**
   * @param {number=} index
   * @return {!CSSProperty}
   */
  newBlankProperty(index) {
    index = (typeof index === 'undefined') ? this.pastLastSourcePropertyIndex() : index;
    const property = new CSSProperty(this, index, '', '', false, false, true, false, '', this._insertionRange(index));
    return property;
  }

  /**
   * @param {string} text
   * @param {boolean} majorChange
   * @return {!Promise.<boolean>}
   */
  setText(text, majorChange) {
    if (!this.range || !this.styleSheetId) {
      return Promise.resolve(false);
    }
    return this._cssModel.setStyleText(this.styleSheetId, this.range, text, majorChange);
  }

  /**
   * @param {number} index
   * @param {string} name
   * @param {string} value
   * @param {function(boolean):void=} userCallback
   */
  insertPropertyAt(index, name, value, userCallback) {
    this.newBlankProperty(index).setText(name + ': ' + value + ';', false, true).then(userCallback);
  }

  /**
   * @param {string} name
   * @param {string} value
   * @param {function(boolean):void=} userCallback
   */
  appendProperty(name, value, userCallback) {
    this.insertPropertyAt(this.allProperties().length, name, value, userCallback);
  }
}

/** @enum {string} */
export const Type = {
  Regular: 'Regular',
  Inline: 'Inline',
  Attributes: 'Attributes'
};
