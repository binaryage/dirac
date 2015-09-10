// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.Linkifier.LinkHandler}
 */
WebInspector.FrontendWebSocketAPI = function()
{
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchFrontendAPIMessage, this._onFrontendAPIMessage, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FrontendAPIAttached, this._onAttach, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FrontendAPIDetached, this._onDetach, this);
}

WebInspector.FrontendWebSocketAPI.prototype = {
    _onAttach: function()
    {
        WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted, this._workingCopyChanged, this);
        WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeWorkingCopyChanged, this._workingCopyChanged, this);
        WebInspector.Linkifier.setLinkHandler(this);
    },

    _onDetach: function()
    {
        WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted, this._workingCopyChanged, this);
        WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeWorkingCopyChanged, this._workingCopyChanged, this);
        WebInspector.Linkifier.setLinkHandler(null);
    },

    /**
     * @override
     * @param {string} url
     * @param {number=} lineNumber
     * @return {boolean}
     */
    handleLink: function(url, lineNumber)
    {
        var uiSourceCode = WebInspector.networkMapping.uiSourceCodeForURLForAnyTarget(url);
        if (uiSourceCode)
            url = uiSourceCode.originURL();
        if (url.startsWith("file://")) {
            var file = url.substring(7);
            this._issueFrontendAPINotification("Frontend.revealLocation", { file: file, line: lineNumber });
            return true;
        }
        return false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onFrontendAPIMessage: function(event)
    {
        var message = JSON.parse(/** @type {string} */ (event.data));
        this._dispatchFrontendAPIMessage(message["id"], message["method"], message["params"] || null);
    },

    /**
     * @param {number} id
     * @param {string} method
     * @param {?Object} params
     */
    _dispatchFrontendAPIMessage: function(id, method, params)
    {
        this._dispatchingFrontendMessage = true;
        switch (method) {
        case "Frontend.updateBuffer":
            var file = params["file"];
            var buffer = params["buffer"];
            var save = params["save"];
            var uiSourceCode = WebInspector.workspace.filesystemUISourceCode("file://" + file);
            if (uiSourceCode) {
                if (buffer !== uiSourceCode.workingCopy())
                    uiSourceCode.setWorkingCopy(buffer);
                if (save && uiSourceCode.workingCopy())
                    uiSourceCode.commitWorkingCopy();
                else if (uiSourceCode.workingCopy() === uiSourceCode.content())
                    uiSourceCode.resetWorkingCopy();
            }
            this._issueResponse(id);
            break;
        default:
            WebInspector.console.log("Unhandled API message: " + method);
        }
        this._dispatchingFrontendMessage = false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _workingCopyChanged: function(event)
    {
        if (this._dispatchingFrontendMessage)
            return;
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data["uiSourceCode"]);
        var url = uiSourceCode.originURL();
        if (url.startsWith("file://"))
            url = url.substring(7);
        this._issueFrontendAPINotification("Frontend.bufferUpdated", { file: url, buffer: uiSourceCode.workingCopy() });
    },

    /**
     * @param {number} id
     * @param {!Object=} params
     */
    _issueResponse: function(id, params)
    {
        var object = {id: id};
        if (params)
            object.params = params;
        InspectorFrontendHost.sendFrontendAPINotification(JSON.stringify(object));
    },

    /**
     * @param {string} method
     * @param {?Object} params
     */
    _issueFrontendAPINotification: function(method, params)
    {
        InspectorFrontendHost.sendFrontendAPINotification(JSON.stringify({ method: method, params: params }));
    }
}
