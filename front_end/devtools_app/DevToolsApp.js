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

    // FIXME: These methods are invoked from the backend and should be removed
    // once we migrate to the "pull" model for extensions retrieval.
    WebInspector.addExtensions = this._wrapInvocation.bind(this, "addExtensions");
    WebInspector.setInspectedTabId = this._wrapInvocation.bind(this, "setInspectedTabId");
    this._invokeOnWebInspectorOnceLoaded = [];

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
        while (this._invokeOnWebInspectorOnceLoaded.length) {
            var methodAndParams = this._invokeOnWebInspectorOnceLoaded.shift();
            this._invokeOnWebInspector(methodAndParams[0], methodAndParams[1]);
        }
    },

    /**
     * @param {string} method
     */
    _wrapInvocation: function(method)
    {
        var params = Array.prototype.slice.call(arguments, 1);
        if (this._inspectorWindow) {
            this._invokeOnWebInspector(method, params);
        } else {
            this._invokeOnWebInspectorOnceLoaded.push([method, params]);
        }
    },

    /**
     * @param {string} method
     * @param {!Array.<*>} params
     */
    _invokeOnWebInspector: function(method, params)
    {
        var webInspector = this._inspectorWindow["WebInspector"];
        webInspector[method].apply(webInspector, params);
    }
}

new WebInspector.DevToolsApp();
