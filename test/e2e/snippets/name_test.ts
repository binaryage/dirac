// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getAvailableSnippets, openCommandMenu, showSnippetsAutocompletion} from '../helpers/quick_open-helpers.js';
import {createNewSnippet, getOpenSources, openSnippetsSubPane, openSourcesPanel} from '../helpers/sources-helpers.js';

describe('Snippets subpane', () => {
  async function runTest(name: string) {
    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet(name);

    // Title matches
    assert.deepEqual(await getOpenSources(), [name]);

    await openCommandMenu();
    await showSnippetsAutocompletion();

    // Available in autocompletion
    assert.deepEqual(await getAvailableSnippets(), [
      name + '\u200B',
    ]);
  }

  it('can create snippet with simple name', async () => {
    await runTest('MySnippet');
  });

  it('can create snippet with name like default name', async () => {
    await runTest('My Snippet #555');
  });

  it('can create snippet with name with slash', async () => {
    await runTest('My Group #1/Snip #1');
  });

  it('can create snippet with name with backslash', async () => {
    await runTest('My Group #1\\Snip #1');
  });
});
