/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

if (!window.InspectorFrontendHost) {

/**
 * @constructor
 * @implements {InspectorFrontendHostAPI}
 */
WebInspector.InspectorFrontendHostStub = function()
{
    this.isStub = true;
    this._fileBuffers = {};
}

WebInspector.InspectorFrontendHostStub.prototype = {
    getSelectionBackgroundColor: function()
    {
        return "#6e86ff";
    },

    getSelectionForegroundColor: function()
    {
        return "#ffffff";
    },

    platform: function()
    {
        var match = navigator.userAgent.match(/Windows NT/);
        if (match)
            return "windows";
        match = navigator.userAgent.match(/Mac OS X/);
        if (match)
            return "mac";
        return "linux";
    },

    port: function()
    {
        return "unknown";
    },

    bringToFront: function()
    {
        this._windowVisible = true;
    },

    closeWindow: function()
    {
        this._windowVisible = false;
    },

    requestSetDockSide: function(side)
    {
        InspectorFrontendAPI.setDockSide(side);
    },

    moveWindowBy: function(x, y)
    {
    },

    setInjectedScriptForOrigin: function(origin, script)
    {
    },

    loaded: function()
    {
    },

    localizedStringsURL: function()
    {
    },

    inspectedURLChanged: function(url)
    {
        document.title = WebInspector.UIString(Preferences.applicationTitle, url);
    },

    copyText: function(text)
    {
        WebInspector.log("Clipboard is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
    },

    openInNewTab: function(url)
    {
        window.open(url, "_blank");
    },

    save: function(url, content, forceSaveAs)
    {
        WebInspector.log("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
    },

    append: function(url, content)
    {
        WebInspector.log("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
    },

    close: function(url)
    {
    },

    sendMessageToBackend: function(message)
    {
    },

    sendMessageToEmbedder: function(message)
    {
    },

    recordActionTaken: function(actionCode)
    {
    },

    recordPanelShown: function(panelCode)
    {
    },

    recordSettingChanged: function(settingCode)
    {
    },

    supportsFileSystems: function()
    {
        return false;
    },

    requestFileSystems: function()
    {
    },

    addFileSystem: function()
    {
    },

    removeFileSystem: function(fileSystemPath)
    {
    },

    isolatedFileSystem: function(fileSystemId, registeredName)
    {
        return null;
    },

    indexPath: function(requestId, fileSystemPath)
    {
    },

    stopIndexing: function(requestId)
    {
    },

    searchInPath: function(requestId, fileSystemPath, query)
    {
    },

    setZoomFactor: function(zoom)
    {
    },

    isUnderTest: function()
    {
        return false;
    }
}

InspectorFrontendHost = new WebInspector.InspectorFrontendHostStub();

} else {
    // Install message-based handlers with callbacks.
    var lastCallId = 0;
    InspectorFrontendHost._callbacks = [];

    /**
     * @param {number} id
     * @param {?string} error
     */
    InspectorFrontendHost.embedderMessageAck = function(id, error)
    {
        var callback = InspectorFrontendHost._callbacks[id];
        delete InspectorFrontendHost._callbacks[id];
        if (callback)
            callback(error);
    }

    /**
     * @param {string} methodName
     */
    function dispatch(methodName)
    {
        var callId = ++lastCallId;
        var argsArray = Array.prototype.slice.call(arguments, 1);
        var callback = argsArray[argsArray.length - 1];
        if (typeof callback === "function") {
            argsArray.pop();
            InspectorFrontendHost._callbacks[callId] = callback;
        }

        var message = { "id": callId, "method": methodName };
        if (argsArray.length)
            message.params = argsArray;
        InspectorFrontendHost.sendMessageToEmbedder(JSON.stringify(message));
    };

    var methodList = [ "addFileSystem", "append", "bringToFront", "indexPath", "moveWindowBy", "openInNewTab",
                       "removeFileSystem", "requestFileSystems", "requestSetDockSide", "save", "searchInPath",
                       "stopIndexing" ];

    for (var i = 0; i < methodList.length; ++i)
        InspectorFrontendHost[methodList[i]] = dispatch.bind(null, methodList[i]);
}

/**
 * @constructor
 * @extends {WebInspector.HelpScreen}
 */
WebInspector.RemoteDebuggingTerminatedScreen = function(reason)
{
    WebInspector.HelpScreen.call(this, WebInspector.UIString("Detached from the target"));
    var p = this.contentElement.createChild("p");
    p.addStyleClass("help-section");
    p.createChild("span").textContent = "Remote debugging has been terminated with reason: ";
    p.createChild("span", "error-message").textContent = reason;
    p.createChild("br");
    p.createChild("span").textContent = "Please re-attach to the new target.";
}

WebInspector.RemoteDebuggingTerminatedScreen.prototype = {
    __proto__: WebInspector.HelpScreen.prototype
}
