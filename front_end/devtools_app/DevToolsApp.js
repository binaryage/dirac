// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {InspectorAppHostAPI}
 */
WebInspector.DevToolsApp = function()
{
    window.InspectorAppHost = this;

    /**
     * @type {?Window}
     */
    this._inspectorWindow = null;
}

WebInspector.DevToolsApp.prototype = {
    /**
     * @param {!Window} inspectorWindow
     * @override
     */
    inspectorAppWindowLoaded: function(inspectorWindow)
    {
        this._inspectorWindow = inspectorWindow;
        if (window.domAutomationController)
            this._inspectorWindow.domAutomationController = window.domAutomationController;
    },

    /**
     * @override
     */
    beforeInspectorAppLoad: function()
    {
        if (this._inspectorWindow.uiTests) {
            // FIXME: move Tests to the host or teach browser counterpart about iframe.
            window.uiTests = this._inspectorWindow.uiTests;
        }
    },

    /**
     * @override
     */
    afterInspectorAppLoad: function()
    {
    }
}

new WebInspector.DevToolsApp();
