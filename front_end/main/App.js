// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.Console.UIDelegate}
 */
WebInspector.App = function()
{
    WebInspector.console.setUIDelegate(this);
};

WebInspector.App.prototype = {
    createRootView: function()
    {
    },

    /**
     * @param {!WebInspector.Target} mainTarget
     */
    presentUI: function(mainTarget)
    {
        WebInspector.inspectorView.showInitialPanel();

        WebInspector.overridesSupport.applyInitialOverrides();
        if (!WebInspector.overridesSupport.responsiveDesignAvailable() && WebInspector.overridesSupport.emulationEnabled())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
    },

    showConsole: function()
    {
        WebInspector.Revealer.reveal(WebInspector.console);
    }
};

/**
 * @type {!WebInspector.App}
 */
WebInspector.app;
