// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {LiveLocationWithPool, LiveLocationPool} from '../../../../front_end/bindings/LiveLocation.js';

describe('LiveLocation', () => {
  it('executes updates atomically', async () => {
    const pool = new LiveLocationPool();

    // Create a promise that our async update is blocked on. The test then becomes:
    //   1. schedule two updates to the live location
    //   2. resolve the blocking promise
    //   3. schedule a third update
    //   4. check that all actions were still executed atomically.
    let fulfillBlockingPromise = () => {};
    const blockingPromise = new Promise(fulfill => {
      fulfillBlockingPromise = fulfill;
    });

    const updateDelegateLog: string[] = [];
    const liveLocation = new LiveLocationWithPool(async () => {
      updateDelegateLog.push('enter');
      await blockingPromise;
      updateDelegateLog.push('exit');
    }, pool);

    liveLocation.update();
    liveLocation.update();
    fulfillBlockingPromise();
    await liveLocation.update();

    assert.deepEqual(updateDelegateLog, ['enter', 'exit', 'enter', 'exit', 'enter', 'exit']);
  });
});
