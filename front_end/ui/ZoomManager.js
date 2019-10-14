// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class ZoomManager extends Common.Object {
  /**
   * @param {!Window} window
   * @param {!InspectorFrontendHostAPI} frontendHost
   */
  constructor(window, frontendHost) {
    super();
    this._frontendHost = frontendHost;
    this._zoomFactor = this._frontendHost.zoomFactor();
    window.addEventListener('resize', this._onWindowResize.bind(this), true);
  }

  /**
   * @return {number}
   */
  zoomFactor() {
    return this._zoomFactor;
  }

  /**
   * @param {number} value
   * @return {number}
   */
  cssToDIP(value) {
    return value * this._zoomFactor;
  }

  /**
   * @param {number} valueDIP
   * @return {number}
   */
  dipToCSS(valueDIP) {
    return valueDIP / this._zoomFactor;
  }

  _onWindowResize() {
    const oldZoomFactor = this._zoomFactor;
    this._zoomFactor = this._frontendHost.zoomFactor();
    if (oldZoomFactor !== this._zoomFactor) {
      this.dispatchEventToListeners(Events.ZoomChanged, {from: oldZoomFactor, to: this._zoomFactor});
    }
  }
}

/** @enum {symbol} */
export const Events = {
  ZoomChanged: Symbol('ZoomChanged')
};

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.ZoomManager = ZoomManager;

/** @enum {symbol} */
UI.ZoomManager.Events = Events;

/**
 * @type {!UI.ZoomManager}
 */
UI.zoomManager;