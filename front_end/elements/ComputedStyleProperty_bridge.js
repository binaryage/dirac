// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* WARNING: do not modify this file by hand!
* it was automatically generated by the bridge generator
* if you made changes to the source code and need to update this file, run:
*  npm run generate-bridge-file front_end/elements/ComputedStyleProperty.ts
*/

import './ComputedStyleProperty.js';
/**
* @typedef {{
* inherited:boolean,
* expanded:boolean,
* onNavigateToSource:function(Event):void,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let ComputedStylePropertyData;
// eslint-disable-next-line no-unused-vars
export class ComputedStylePropertyClosureInterface extends HTMLElement {
  /**
  * @return {boolean}
  */
  isExpanded() {
    throw new Error('Not implemented in _bridge.js');
  }
  /**
  * @param {!ComputedStylePropertyData} data
  */
  set data(data) {
  }
}
/**
* @return {!ComputedStylePropertyClosureInterface}
*/
export function createComputedStyleProperty() {
  return /** @type {!ComputedStylePropertyClosureInterface} */ (
      document.createElement('devtools-computed-style-property'));
}
