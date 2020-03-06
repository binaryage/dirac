// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that console inputs are evaluated in REPL mode\n');

  await TestRunner.loadModule('console_test_runner');
  await TestRunner.showPanel('console');

  TestRunner.addSniffer(TestRunner.RuntimeAgent, 'invoke_evaluate', function(args) {
    TestRunner.addResult('Called RuntimeAgent.invoke_evaluate');
    TestRunner.addResult("Value of 'replMode': " + args.replMode);
  });

  ConsoleTestRunner.evaluateInConsole('let a = 1; let a = 2;', step2);

  function step2() {
    TestRunner.completeTest();
  }
})();
