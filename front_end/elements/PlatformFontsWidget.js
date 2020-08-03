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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {ComputedStyleModel, Events} from './ComputedStyleModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class PlatformFontsWidget extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!ComputedStyleModel} sharedModel
   */
  constructor(sharedModel) {
    super(true);
    this.registerRequiredCSS('elements/platformFontsWidget.css');

    this._sharedModel = sharedModel;
    this._sharedModel.addEventListener(Events.ComputedStyleChanged, this.update, this);

    this._sectionTitle = document.createElement('div');
    this._sectionTitle.classList.add('title');
    this.contentElement.classList.add('platform-fonts');
    this.contentElement.appendChild(this._sectionTitle);
    this._sectionTitle.textContent = Common.UIString.UIString('Rendered Fonts');
    this._fontStatsSection = this.contentElement.createChild('div', 'stats-section');
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    const cssModel = this._sharedModel.cssModel();
    const node = this._sharedModel.node();
    if (!node || !cssModel) {
      return Promise.resolve();
    }

    return cssModel.platformFontsPromise(node.id).then(this._refreshUI.bind(this, node));
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {?Array.<!Protocol.CSS.PlatformFontUsage>} platformFonts
   */
  _refreshUI(node, platformFonts) {
    if (this._sharedModel.node() !== node) {
      return;
    }

    this._fontStatsSection.removeChildren();

    const isEmptySection = !platformFonts || !platformFonts.length;
    this._sectionTitle.classList.toggle('hidden', isEmptySection);
    if (isEmptySection) {
      return;
    }

    platformFonts.sort(function(a, b) {
      return b.glyphCount - a.glyphCount;
    });
    for (let i = 0; i < platformFonts.length; ++i) {
      const fontStatElement = this._fontStatsSection.createChild('div', 'font-stats-item');

      const fontNameElement = fontStatElement.createChild('span', 'font-name');
      fontNameElement.textContent = platformFonts[i].familyName;

      const fontDelimeterElement = fontStatElement.createChild('span', 'font-delimeter');
      fontDelimeterElement.textContent = '\u2014';

      const fontOrigin = fontStatElement.createChild('span');
      fontOrigin.textContent = platformFonts[i].isCustomFont ? Common.UIString.UIString('Network resource') :
                                                               Common.UIString.UIString('Local file');

      const fontUsageElement = fontStatElement.createChild('span', 'font-usage');
      const usage = platformFonts[i].glyphCount;
      fontUsageElement.textContent =
          usage === 1 ? Common.UIString.UIString('(%d glyph)', usage) : Common.UIString.UIString('(%d glyphs)', usage);
    }
  }
}
