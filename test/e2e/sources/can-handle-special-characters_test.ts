// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {resolve} from 'path';
import {click, getBrowserAndPages, goTo, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, getBreakpointDecorators, getExecutionLineText, getOpenSources, openFileInEditor, openFileInSourcesPanel, openSourcesPanel, RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('Sources Tab', async () => {
  async function runTest(filename: string, functionName: string) {
    const {frontend, target} = getBrowserAndPages();

    await openFileInEditor(filename);
    await addBreakpointForLine(frontend, 1);

    const scriptEvaluation = target.evaluate(functionName + '();');
    await waitFor(RESUME_BUTTON);

    // Breakpoint is still visible
    assert.deepEqual(await getBreakpointDecorators(frontend), [2]);

    // Execution line is highlighted and matches the expected file
    assert.strictEqual(await getExecutionLineText(), `    console.log('${functionName}');`);

    // Title of tab matches filename
    assert.deepEqual(await getOpenSources(), [filename]);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  }

  async function loadFromFilePath() {
    const fileUrl =
        'file://' + resolve(__dirname, '..', 'resources', 'sources', 'filesystem', 'special-characters.html');
    await goTo(fileUrl);
    await openSourcesPanel();
  }

  it('can handle filename with space loading over the network', async () => {
    await openFileInSourcesPanel('filesystem/special-characters.html');
    await runTest('with space.js', 'f1');
  });

  it('can handle filename with escape sequence loading over the network', async () => {
    await openFileInSourcesPanel('filesystem/special-characters.html');
    await runTest('with%20space.js', 'f2');
  });

  it('can handle filename with space loading from local file', async () => {
    await loadFromFilePath();
    await runTest('with space.js', 'f1');
  });

  it('can handle filename with escape sequence loading from local file', async () => {
    await loadFromFilePath();
    await runTest('with%20space.js', 'f2');
  });
});
