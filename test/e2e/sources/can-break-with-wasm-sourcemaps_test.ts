// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages} from '../../shared/helper.js';

import {addBreakpointForLine, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('can add breakpoint for a sourcemapped wasm module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile(target, 'with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
    await addBreakpointForLine(frontend, 5);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
  });
});
