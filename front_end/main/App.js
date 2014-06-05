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

    presentUI: function()
    {
        WebInspector.inspectorView.showInitialPanel();

        WebInspector.overridesSupport.applyInitialOverrides();
        if (WebInspector.overridesSupport.hasActiveOverrides() && !WebInspector.experimentsSettings.responsiveDesign.isEnabled())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
    }
};

/**
 * @type {!WebInspector.App}
 */
WebInspector.app;
