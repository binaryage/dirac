// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
const testFiles = glob.sync(path.join(__dirname, '**/*_test.ts')).map(fileName => fileName.replace(/\.ts$/, '.js'));

module.exports = {
  file: path.join(__dirname, '..', 'conductor', 'mocha_hooks.js'),
  spec: testFiles,
}
