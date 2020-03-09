// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that lighthouse panel passes flags.\n');
  await TestRunner.navigatePromise('resources/lighthouse-basic.html');

  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  const dialogElement = LighthouseTestRunner.getContainerElement();
  dialogElement.querySelector('input[name="lighthouse.device_type"][value="desktop"]').click();
  // Turn off simulated throttling.
  dialogElement.querySelector('.lighthouse-settings-pane > div').shadowRoot
               .querySelectorAll('span')[1].shadowRoot
               .querySelector('input').click();

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();

  const {artifacts, lhr} = await LighthouseTestRunner.waitForResults();
  TestRunner.addResult('\n=============== Lighthouse Results ===============');
  TestRunner.addResult(`emulatedFormFactor: ${lhr.configSettings.emulatedFormFactor}`);
  TestRunner.addResult(`disableStorageReset: ${lhr.configSettings.disableStorageReset}`);
  TestRunner.addResult(`throttlingMethod: ${lhr.configSettings.throttlingMethod}`);
  TestRunner.addResult(`TestedAsMobileDevice: ${artifacts.TestedAsMobileDevice}`);

  TestRunner.completeTest();
})();
