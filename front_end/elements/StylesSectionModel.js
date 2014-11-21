// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {?WebInspector.CSSRule} rule
 * @param {!WebInspector.CSSStyleDeclaration} style
 * @param {string} customSelectorText
 * @param {?WebInspector.DOMNode=} inheritedFromNode
 */
WebInspector.StylesSectionModel = function(rule, style, customSelectorText, inheritedFromNode)
{
    this._rule = rule;
    this._style = style;
    this._customSelectorText = customSelectorText;
    this._isAttribute = false;
    this._editable = !!(this._style && this._style.styleSheetId);
    this._inheritedFromNode = inheritedFromNode || null;
}

/**
 * @param {!WebInspector.CSSRule} rule
 * @param {?WebInspector.DOMNode=} inheritedFromNode
 * @return {!WebInspector.StylesSectionModel}
 */
WebInspector.StylesSectionModel.fromRule = function(rule, inheritedFromNode)
{
    return new WebInspector.StylesSectionModel(rule, rule.style, "", inheritedFromNode);
}

/**
 * @param {!WebInspector.CSSStyleDeclaration} style
 * @param {string} selectorText
 * @param {?WebInspector.DOMNode=} inheritedFromNode
 * @return {!WebInspector.StylesSectionModel}
 */
WebInspector.StylesSectionModel.fromStyle = function(style, selectorText, inheritedFromNode)
{
    return new WebInspector.StylesSectionModel(null, style, selectorText, inheritedFromNode);
}

WebInspector.StylesSectionModel.prototype = {
    /**
     * @return {boolean}
     */
    hasMatchingSelectors: function()
    {
        return this.rule() ? this.rule().matchingSelectors.length > 0 : true;
    },

    /**
     * @return {boolean}
     */
    inherited: function()
    {
        return !!this._inheritedFromNode;
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    parentNode: function()
    {
        return this._inheritedFromNode;
    },

    /**
     * @return {string}
     */
    selectorText: function()
    {
        if (this._customSelectorText)
            return this._customSelectorText;
        return this.rule() ? this.rule().selectorText : "";
    },

    /**
     * @return {boolean}
     */
    editable: function()
    {
        return this._editable;
    },

    /**
     * @param {boolean} editable
     */
    setEditable: function(editable)
    {
        this._editable = editable;
    },

    /**
     * @return {!WebInspector.CSSStyleDeclaration}
     */
    style: function()
    {
        return this._style;
    },

    /**
     * @return {?WebInspector.CSSRule}
     */
    rule: function()
    {
        return this._rule;
    },

    /**
     * @return {?Array.<!WebInspector.CSSMedia>}
     */
    media: function()
    {
        return this.rule() ? this.rule().media : null;
    },

    /**
     * @return {boolean}
     */
    isAttribute: function()
    {
        return this._isAttribute;
    },

    /**
     * @param {boolean} isAttribute
     */
    setIsAttribute: function(isAttribute)
    {
        this._isAttribute = isAttribute;
    },

    /**
     * @param {!WebInspector.CSSRule} rule
     */
    updateRule: function(rule)
    {
        this._rule = rule;
        this._style = rule.style;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     */
    updateStyleDeclaration: function(style)
    {
        this._style = style;
        if (this._rule) {
            style.parentRule = this._rule;
            this._rule.style = style;
        }
    },
}