// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, checkBreakpointDidNotActivate, checkBreakpointIsActive, checkBreakpointIsNotActive, openSourceCodeEditorForFile, retrieveTopCallFrameScriptLocation, retrieveTopCallFrameWithoutResuming, sourceLineNumberSelector} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('can add breakpoint for a sourcemapped wasm module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
    await addBreakpointForLine(frontend, 5);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
  });

  it('hits breakpoint upon refresh for a sourcemapped wasm module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
    });

    await step('add a breakpoint to line No.5', async () => {
      await addBreakpointForLine(frontend, 5);
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('wait for all the source code to appear', async () => {
      await waitFor(await sourceLineNumberSelector(5));
    });

    await checkBreakpointIsActive(5);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      // TODO(chromium:1043047): Switch to bytecode offsets here.
      assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
    });
  });

  // breakpoint activates upon refresh after it is removed
  it.skip(
      '[crbug.com/1073071]: does not hit the breakpoint after it is removed for a sourcemapped wasm module',
      async () => {
        const {target, frontend} = getBrowserAndPages();

        await step('navigate to a page and open the Sources tab', async () => {
          await openSourceCodeEditorForFile('with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
        });

        await step('add a breakpoint to line No.5', async () => {
          await addBreakpointForLine(frontend, 5);
        });

        await step('reload the page', async () => {
          await target.reload();
        });

        await step('wait for all the source code to appear', async () => {
          await waitFor(await sourceLineNumberSelector(5));
        });

        await checkBreakpointIsActive(5);

        await step('remove the breakpoint from the fifth line', async () => {
          await frontend.click(await sourceLineNumberSelector(5));
        });

        await step('reload the page', async () => {
          await target.reload();
        });

        await step('wait for all the source code to appear', async () => {
          await waitFor(await sourceLineNumberSelector(5));
        });

        await checkBreakpointIsNotActive(5);
        await checkBreakpointDidNotActivate();
      });

  // breakpoint activates upon refresh after it is removed
  it.skip('[crbug.com/1073071]: hits two breakpoints that are set and activated separately', async function() {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
    });

    await step('add a breakpoint to line No.5', async () => {
      await addBreakpointForLine(frontend, 5);
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('wait for all the source code to appear', async () => {
      await waitFor(await sourceLineNumberSelector(5));
    });

    await checkBreakpointIsActive(5);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      // TODO(chromium:1043047): Switch to bytecode offsets here.
      assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
    });

    await step('remove the breakpoint from the fifth line', async () => {
      await frontend.click(await sourceLineNumberSelector(5));
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('wait for all the source code to appear', async () => {
      await waitFor(await sourceLineNumberSelector(5));
    });

    await checkBreakpointIsNotActive(5);
    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.6', async () => {
      await addBreakpointForLine(frontend, 6);
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('wait for all the source code to appear', async () => {
      await waitFor(await sourceLineNumberSelector(6));
    });

    await checkBreakpointIsActive(6);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      // TODO(chromium:1043047): Switch to bytecode offsets here.
      assert.deepEqual(scriptLocation, 'with-sourcemap.ll:6');
    });
  });
});
