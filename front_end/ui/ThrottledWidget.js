// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class ThrottledWidget extends UI.VBox {
  /**
   * @param {boolean=} isWebComponent
   * @param {number=} timeout
   */
  constructor(isWebComponent, timeout) {
    super(isWebComponent);
    this._updateThrottler = new Common.Throttler(timeout === undefined ? 100 : timeout);
    this._updateWhenVisible = false;
  }

  /**
   * @protected
   * @return {!Promise<?>}
   */
  doUpdate() {
    return Promise.resolve();
  }

  update() {
    this._updateWhenVisible = !this.isShowing();
    if (this._updateWhenVisible) {
      return;
    }
    this._updateThrottler.schedule(innerUpdate.bind(this));

    /**
     * @this {ThrottledWidget}
     * @return {!Promise<?>}
     */
    function innerUpdate() {
      if (this.isShowing()) {
        return this.doUpdate();
      }
      this._updateWhenVisible = true;
      return Promise.resolve();
    }
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (this._updateWhenVisible) {
      this.update();
    }
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.ThrottledWidget = ThrottledWidget;
