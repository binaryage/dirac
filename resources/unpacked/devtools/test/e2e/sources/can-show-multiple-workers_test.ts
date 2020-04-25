// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {click, getBrowserAndPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {createSelectorsForWorkerFile, expandFileTree, NestedFileSelector} from '../helpers/sources-helpers.js';

const WORKER1_SELECTORS = createSelectorsForFile('worker1.js');
const WORKER2_SELECTORS = createSelectorsForFile('worker2.js');

function createSelectorsForFile(fileName: string) {
  return createSelectorsForWorkerFile(fileName, 'test/e2e/resources/sources', fileName);
}

async function openNestedWorkerFile(selectors: NestedFileSelector) {
  const workerFile = await expandFileTree(selectors);

  return workerFile.asElement()!.evaluate(node => node.textContent);
}

describe('The Sources Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  it('can show multiple dedicated workers with different scripts', async () => {
    const {target} = getBrowserAndPages();

    // Have the target load the page.
    await target.goto(`${resourcesPath}/sources/different-workers.html`);

    // Locate the button for switching to the sources tab.
    await click('#tab-sources');

    // Wait for the navigation panel to show up
    await waitFor('.navigator-file-tree-item');

    const worker1FileName = await openNestedWorkerFile(WORKER1_SELECTORS);
    assert.strictEqual(worker1FileName, 'worker1.js');

    const worker2FileName = await openNestedWorkerFile(WORKER2_SELECTORS);
    assert.strictEqual(worker2FileName, 'worker2.js');
  });
});
