// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
* WARNING: do not modify this file by hand!
* it was automatically generated by the bridge generator
* if you made changes to the source code and need to update this file, run:
*  npm run generate-bridge-file test/unittests/scripts/component_bridges/fixtures/multiple-methods.ts
*/

/**
* @typedef {{
* name:string
* isGoodDog:boolean
* }}
*/
// @ts-ignore we export this for Closure not TS
export let Dog;
// eslint-disable-next-line no-unused-vars
class MultipleMethodsClosureInterface extends HTMLElement {
  /**
  * @param {!Dog} dog
  */
  update(dog) {}
  /**
  * @param {string} name
  */
  otherMethod(name) {}
}
/**
* @return {!MultipleMethodsClosureInterface}
*/
export function createMultipleMethods() {
  return /** @type {!MultipleMethodsClosureInterface} */ (document.createElement('devtools-test-component'));
}
