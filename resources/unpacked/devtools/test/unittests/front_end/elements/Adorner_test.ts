// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Adorner, AdornerCategories} from '../../../../front_end/elements/Adorner.js';

const ADORNER_TAG_NAME = 'DEVTOOLS-ADORNER';
const ADORNER_NAME = 'grid';

function assertIsAdorner(element: HTMLElement) {
  assert.strictEqual(element.tagName, ADORNER_TAG_NAME, `element tag name is not ${ADORNER_TAG_NAME}`);
  assert.isTrue(element instanceof Adorner, 'element is not an instance of Adorner');
  assert.strictEqual(Object.getPrototypeOf(element), Adorner.prototype, 'element is not on Adorner\'s prototype chain');
}

describe('Adorner', () => {
  it('can be created by document.createElement', () => {
    const adorner = document.createElement('devtools-adorner');
    assertIsAdorner(adorner);
  });

  it('can be created by Adorner.create', () => {
    const content = document.createElement('span');
    content.textContent = ADORNER_NAME;
    const adorner = Adorner.create(content, ADORNER_NAME);
    assertIsAdorner(adorner);

    const options = {
      category: AdornerCategories.Layout,
    };
    const adornerWithOptions = Adorner.create(content, ADORNER_NAME, options);
    assertIsAdorner(adornerWithOptions);
    assert.strictEqual(adornerWithOptions.category, AdornerCategories.Layout);
  });
});
