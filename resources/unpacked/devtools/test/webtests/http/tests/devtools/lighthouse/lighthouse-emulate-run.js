// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that mobile emulation works.\n');
  await TestRunner.navigatePromise('resources/lighthouse-emulate-pass.html');

  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();
  const {artifacts, lhr} = await LighthouseTestRunner.waitForResults();

  TestRunner.addResult('\n=============== Lighthouse Results ===============');
  TestRunner.addResult(`URL: ${lhr.finalUrl}`);
  TestRunner.addResult(`Version: ${lhr.lighthouseVersion}`);
  TestRunner.addResult(`TestedAsMobileDevice: ${artifacts.TestedAsMobileDevice}`);
  TestRunner.addResult(`ViewportDimensions: ${JSON.stringify(artifacts.ViewportDimensions, null, 2)}`);
  TestRunner.addResult('\n');

  const auditName = 'content-width';
  const audit = lhr.audits[auditName];
  if (audit.scoreDisplayMode === 'error') {
    TestRunner.addResult(`${auditName}: ERROR ${audit.errorMessage}`);
  } else if (audit.scoreDisplayMode === 'binary') {
    TestRunner.addResult(`${auditName}: ${audit.score ? 'pass' : 'fail'} ${audit.explanation}`);
  } else {
    TestRunner.addResult(`${auditName}: ${audit.scoreDisplayMode}`);
  }

  TestRunner.completeTest();
})();
