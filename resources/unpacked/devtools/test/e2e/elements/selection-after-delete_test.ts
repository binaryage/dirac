// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {click, getBrowserAndPages, resourcesPath, waitForElementWithTextContent} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, expandSelectedNodeRecursively, getContentOfSelectedNode, waitForElementsStyleSection, waitForSelectedNodeChange} from '../helpers/elements-helpers.js';

describe('The Elements tab', async () => {
  // Flaky test
  it.skip('[crbug.com/1071851]: can delete elements in the tree', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/selection-after-delete.html`);

    // Wait for the file to be loaded and selectors to be shown
    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');
    await expandSelectedNodeRecursively();

    // Wait for the expansion and select the final child in the tree.
    const child = await waitForElementWithTextContent('child2');
    await click(child);

    const expected = [
      '<div class=​"child3">\u200B</div>\u200B',
      '<div class=​"child1">\u200B</div>\u200B',
      '<div class=​"left">\u200B</div>\u200B',
      '<div id=​"testTreeContainer">\u200B</div>\u200B',
      '<body>\u200B</body>\u200B',
    ];

    // Start deleting and ensure that the selected child is the one expected.
    do {
      const nextVal = expected.shift() || '';

      const initialValue = await getContentOfSelectedNode();
      await frontend.keyboard.press('Backspace');
      await waitForSelectedNodeChange(initialValue);

      await assertContentOfSelectedElementsNode(nextVal);
    } while (expected.length);
  });
});
