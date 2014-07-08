/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

/**
 * @constructor
 */
function InspectorFrontendAPIClass()
{
    this._isLoaded = false;
    this._pendingCommands = [];

    var descriptors = [
        ["appendedToURL", ["url"]],
        ["canceledSaveURL", ["url"]],
        ["contextMenuCleared", []],
        ["contextMenuItemSelected", ["id"]],
        ["dispatchEventToListeners", ["eventType", "eventData"]],
        ["dispatchMessage", ["messageObject"]],
        ["embedderMessageAck", ["id", "error"]],
        ["enterInspectElementMode", [], true],
        ["fileSystemsLoaded", ["fileSystems"]],
        ["fileSystemRemoved", ["fileSystemPath"]],
        ["fileSystemAdded", ["errorMessage", "fileSystem"]],
        ["indexingTotalWorkCalculated", ["requestId", "fileSystemPath", "totalWork"]],
        ["indexingWorked", ["requestId", "fileSystemPath", "worked"]],
        ["indexingDone", ["requestId", "fileSystemPath"]],
        ["keyEventUnhandled", ["event"], true],
        ["revealSourceLine", ["url", "lineNumber", "columnNumber"], true],
        ["savedURL", ["url"]],
        ["searchCompleted", ["requestId", "fileSystemPath", "files"]],
        ["setToolbarColors", ["backgroundColor", "color"]],
        ["setUseSoftMenu", ["useSoftMenu"]],
        ["showConsole", [], true]
    ];
    for (var i = 0; i < descriptors.length; ++i)
        this[descriptors[i][0]] = this._dispatch.bind(this, descriptors[i][0], descriptors[i][1], descriptors[i][2]);
}

InspectorFrontendAPIClass.prototype = {
    loadCompleted: function()
    {
        this._isLoaded = true;
        for (var i = 0; i < this._pendingCommands.length; ++i)
            this._pendingCommands[i]();
        this._pendingCommands = [];
        if (window.opener)
            window.opener.postMessage(["loadCompleted"], "*");
    },

    /**
     * @param {string} name
     * @param {!Array.<string>} signature
     * @param {boolean} runOnceLoaded
     */
    _dispatch: function(name, signature, runOnceLoaded)
    {
        var params = Array.prototype.slice.call(arguments, 3);
        if (runOnceLoaded)
            this._runOnceLoaded(dispatchAfterLoad);
        else
            dispatchAfterLoad();

        function dispatchAfterLoad()
        {
            // Single argument methods get dispatched with the param.
            if (signature.length < 2) {
                WebInspector.notifications.dispatchEventToListeners("InspectorFrontendAPI." + name, params[0]);
                return;
            }
            var data = {};
            for (var i = 0; i < signature.length; ++i)
                data[signature[i]] = params[i];
            WebInspector.notifications.dispatchEventToListeners("InspectorFrontendAPI." + name, data);
        }
    },

    /**
     * @param {function()} command
     */
    _runOnceLoaded: function(command)
    {
        if (this._isLoaded) {
            command();
            return;
        }
        this._pendingCommands.push(command);
    }
}

var InspectorFrontendAPI = new InspectorFrontendAPIClass();
