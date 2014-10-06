/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @interface
 */
WebInspector.ExtensionServerAPI = function() { }

WebInspector.ExtensionServerAPI.prototype = {
    /**
     * @param {!Array.<!ExtensionDescriptor>} descriptors
     */
    addExtensions: function(descriptors) { }
}

/**
 * @constructor
 */
WebInspector.ExtensionServerProxy = function()
{
}

WebInspector.ExtensionServerProxy.prototype = {
    setFrontendReady: function()
    {
        this._frontendReady = true;
        this._pushExtensionsToServer();
    },

    _addExtensions: function(extensions)
    {
        if (extensions.length === 0)
            return;

        console.assert(!this._pendingExtensions);
        this._pendingExtensions = extensions;
        this._pushExtensionsToServer();
    },

    _pushExtensionsToServer: function()
    {
        if (!this._frontendReady || !this._pendingExtensions)
            return;

        self.runtime.instancePromise(WebInspector.ExtensionServerAPI).then(pushExtensions.bind(this)).done();

        /**
         * @param {!Object} object
         * @this {WebInspector.ExtensionServerProxy}
         */
        function pushExtensions(object)
        {
            this._extensionServer = /** @type {!WebInspector.ExtensionServerAPI} */ (object);

            if (WebInspector.extensionServerProxy._overridePlatformExtensionAPIForTest)
                window.buildPlatformExtensionAPI = WebInspector.extensionServerProxy._overridePlatformExtensionAPIForTest;

            this._extensionServer.addExtensions(this._pendingExtensions);
            delete this._pendingExtensions;
        }
    }
}

WebInspector.extensionServerProxy = new WebInspector.ExtensionServerProxy();

WebInspector.addExtensions = function(extensions)
{
    WebInspector.extensionServerProxy._addExtensions(extensions);
}

WebInspector.setInspectedTabId = function(tabId)
{
    WebInspector._inspectedTabId = tabId;
}
