// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$, waitFor} from '../../shared/helper.js';

export async function getCurrentUrl() {
  await waitFor('[aria-label="layers"]');
  const element = await $('[aria-label="layers"]');
  return element.evaluate(e => e.getAttribute('test-current-url'));
}
