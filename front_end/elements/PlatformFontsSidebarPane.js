/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 */
WebInspector.PlatformFontsSidebarPane = function()
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Fonts"));
    this.element.classList.add("platform-fonts");

    this._sectionTitle = document.createElementWithClass("div", "sidebar-separator");
    this.element.insertBefore(this._sectionTitle, this.bodyElement);
    this._sectionTitle.textContent = WebInspector.UIString("Rendered Fonts");
    this._fontStatsSection = this.bodyElement.createChild("div", "stats-section");
}

WebInspector.PlatformFontsSidebarPane.prototype = {
    _onNodeChange: function()
    {
        if (this._innerUpdateTimeout)
            return;
        this._innerUpdateTimeout = setTimeout(this._innerUpdate.bind(this), 100);
    },

    /**
     * @param {?WebInspector.DOMNode} node
     */
    update: function(node)
    {
        if (!node) {
            delete this._node;
            return;
        }
        this._node = node;
        this._updateTarget(node.target());
        this._innerUpdate();
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _updateTarget: function(target)
    {
        if (this._target === target)
            return;
        if (this._target) {
            this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified, this._onNodeChange, this);
            this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
            this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
        }
        this._target = target;
        this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified, this._onNodeChange, this);
        this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
        this._target.domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    },

    _innerUpdate: function()
    {
        if (this._innerUpdateTimeout) {
            clearTimeout(this._innerUpdateTimeout);
            delete this._innerUpdateTimeout;
        }
        if (!this._node)
            return;
        this._target.cssModel.getPlatformFontsForNode(this._node.id, this._refreshUI.bind(this, this._node));
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {?string} cssFamilyName
     * @param {?Array.<!CSSAgent.PlatformFontUsage>} platformFonts
     */
    _refreshUI: function(node, cssFamilyName, platformFonts)
    {
        if (this._node !== node)
            return;

        this._fontStatsSection.removeChildren();

        var isEmptySection = !platformFonts || !platformFonts.length;
        this._sectionTitle.classList.toggle("hidden", isEmptySection);
        if (isEmptySection)
            return;
        platformFonts.sort(function (a, b) {
            return b.glyphCount - a.glyphCount;
        });
        for (var i = 0; i < platformFonts.length; ++i) {
            var fontStatElement = this._fontStatsSection.createChild("div", "font-stats-item");

            var fontNameElement = fontStatElement.createChild("span", "font-name");
            fontNameElement.textContent = platformFonts[i].familyName;

            var fontDelimeterElement = fontStatElement.createChild("span", "delimeter");
            fontDelimeterElement.textContent = "\u2014";

            var fontUsageElement = fontStatElement.createChild("span", "font-usage");
            var usage = platformFonts[i].glyphCount;
            fontUsageElement.textContent = usage === 1 ? WebInspector.UIString("%d glyph", usage) : WebInspector.UIString("%d glyphs", usage);
        }
    },

    __proto__: WebInspector.SidebarPane.prototype
}
