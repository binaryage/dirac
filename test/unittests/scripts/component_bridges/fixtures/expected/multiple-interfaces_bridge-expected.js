// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* WARNING: do not modify this file by hand!
* it was automatically generated by the bridge generator
* if you made changes to the source code and need to update this file, run:
*  npm run generate-bridge-file test/unittests/scripts/component_bridges/fixtures/multiple-interfaces.ts
*/

import './multiple-interfaces.js';
/**
* @typedef {{
* selectedNode:?DOMNode,
* settings:!Settings,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let LayoutPaneData;
/**
* @typedef {{
* smth:string,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let DOMNode;
/**
* @typedef {{
* showGridBorder:string,
* showGridLines:string,
* showGridLineNumbers:string,
* showGridGaps:string,
* showGridAreas:boolean,
* showGridTrackSizes:boolean,
* }}
*/
// @ts-ignore we export this for Closure not TS
export let Settings;
// eslint-disable-next-line no-unused-vars
export class LayoutPaneClosureInterface extends HTMLElement {
  /**
  * @param {!LayoutPaneData} data
  */
  set data(data) {
  }
}
/**
* @return {!LayoutPaneClosureInterface}
*/
export function createLayoutPane() {
  return /** @type {!LayoutPaneClosureInterface} */ (document.createElement('devtools-layout-pane'));
}
