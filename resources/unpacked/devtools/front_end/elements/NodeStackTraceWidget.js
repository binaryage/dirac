// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export default class NodeStackTraceWidget extends UI.ThrottledWidget {
  constructor() {
    super(true /* isWebComponent */);
    this.registerRequiredCSS('elements/nodeStackTraceWidget.css');

    this._noStackTraceElement = this.contentElement.createChild('div', 'gray-info-message');
    this._noStackTraceElement.textContent = ls`No stack trace available`;
    this._creationStackTraceElement = this.contentElement.createChild('div', 'stack-trace');

    this._linkifier = new Components.Linkifier(MaxLengthForLinks);
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.addFlavorChangeListener(SDK.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    UI.context.removeFlavorChangeListener(SDK.DOMNode, this.update, this);
  }

  /**
   * @override
   * @protected
   * @return {!Promise<undefined>}
   */
  async doUpdate() {
    const node = UI.context.flavor(SDK.DOMNode);

    if (!node) {
      this._noStackTraceElement.classList.remove('hidden');
      this._creationStackTraceElement.classList.add('hidden');
      return;
    }

    const creationStackTrace = await node.creationStackTrace();
    if (creationStackTrace) {
      this._noStackTraceElement.classList.add('hidden');
      this._creationStackTraceElement.classList.remove('hidden');

      const stackTracePreview = Components.JSPresentationUtils.buildStackTracePreviewContents(
          node.domModel().target(), this._linkifier, creationStackTrace);
      this._creationStackTraceElement.removeChildren();
      this._creationStackTraceElement.appendChild(stackTracePreview.element);
    } else {
      this._noStackTraceElement.classList.remove('hidden');
      this._creationStackTraceElement.classList.add('hidden');
    }
  }
}

/**
 * @const
 * @type {number}
 */
export const MaxLengthForLinks = 40;

/* Legacy exported object */
self.Elements = self.Elements || {};

/* Legacy exported object */
Elements = Elements || {};

/** @constructor */
Elements.NodeStackTraceWidget = NodeStackTraceWidget;

Elements.NodeStackTraceWidget.MaxLengthForLinks = MaxLengthForLinks;
