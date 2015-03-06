// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

if (window.domAutomationController) {
    var uiTests = {};

    function UITestSuite()
    {
        WebInspector.TestBase.call(this, window.domAutomationController);
    }

    UITestSuite.prototype = {
        __proto__: WebInspector.TestBase.prototype
    };

    uiTests._tryRun = function() {
        if (uiTests._testSuite && uiTests._pendingTestName) {
            var name = uiTests._pendingTestName;
            delete uiTests._pendingTestName;
            if (UITestSuite.prototype.hasOwnProperty(name))
                new UITestSuite().runTest(name);
            else
                uiTests._testSuite.runTest(name);
        }
    }

    uiTests.runTest = function(name)
    {
        uiTests._pendingTestName = name;
        uiTests._tryRun();
    };

    uiTests.testSuiteReady = function(testSuiteConstructor)
    {
        uiTests._testSuite = testSuiteConstructor(window.domAutomationController);
        uiTests._tryRun();
    };
}
