// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.App = function()
{
};

WebInspector.App.prototype = {
    createRootView: function()
    {
    },

    createGlobalStatusBarItems: function()
    {
    },

    presentUI: function()
    {
        WebInspector.inspectorView.showInitialPanel();

        WebInspector.overridesSupport.applyInitialOverrides();
        if (WebInspector.overridesSupport.hasActiveOverrides())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
    },

    appendInspectStatusBarItem: function()
    {
        if (WebInspector.inspectElementModeController)
            WebInspector.inspectorView.appendToLeftToolbar(WebInspector.inspectElementModeController.toggleSearchButton.element);
    },

    appendSettingsStatusBarItem: function()
    {
        WebInspector.inspectorView.appendToRightToolbar(WebInspector.settingsController.statusBarItem);
    }
};

/**
 * @type {!WebInspector.App}
 */
WebInspector.app;
