// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @suppressGlobalPropertiesCheck
 */
WebInspector.DevToolsApp = function()
{
    this._iframe = document.querySelector("iframe.inspector-app-iframe");

    /**
     * @type {!Window}
     */
    this._inspectorWindow = this._iframe.contentWindow;
    this._inspectorWindow.InspectorFrontendHost = window.InspectorFrontendHost;

    //FIXME: fix in a proper way once DevToolsAPI is separated from InspectorFrontendAPI.
    var addExtensionsOriginal = window.InspectorFrontendAPI.addExtensions;
    window.InspectorFrontendAPI.addExtensions = function(extensions)
    {
        if (this._inspectorWindow.WebInspector.addExtensions)
            this._inspectorWindow.WebInspector.addExtensions(extensions);
        addExtensionsOriginal(extensions);
    }.bind(this);

    var setInspectedTabIdOriginal = window.InspectorFrontendAPI.setInspectedTabId;
    window.InspectorFrontendAPI.setInspectedTabId = function(tabId)
    {
        if (this._inspectorWindow.WebInspector.setInspectedTabId)
            this._inspectorWindow.WebInspector.setInspectedTabId(tabId);
        setInspectedTabIdOriginal(tabId);
    }.bind(this);
}

WebInspector.DevToolsApp.prototype = {
}

runOnWindowLoad(function() { new WebInspector.DevToolsApp(); });
