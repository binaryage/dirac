// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export class OutputStream {
  /**
   * @param {string} data
   * @return {!Promise}
   */
  async write(data) {
  }

  /**
   * @return {!Promise}
   */
  async close() {
  }
}

/**
 * @implements {Common.OutputStream}
 */
export default class StringOutputStream {
  constructor() {
    this._data = '';
  }

  /**
   * @override
   * @param {string} chunk
   * @return {!Promise}
   */
  async write(chunk) {
    this._data += chunk;
  }

  /**
   * @override
   */
  async close() {
  }

  /**
   * @return {string}
   */
  data() {
    return this._data;
  }
}

/* Legacy exported object */
self.Common = self.Common || {};
Common = Common || {};

/**
 * @interface
 */
Common.OutputStream = OutputStream;
Common.StringOutputStream = StringOutputStream;
