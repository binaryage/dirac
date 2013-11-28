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

var InspectorFrontendAPI = {
    _pendingCommands: [],

    // Methods called by the embedder on load, potentially before front-end is initialized.
    //////////////////////////////////////////////////////////////////////////////////////////////////

    showConsole: function()
    {
        InspectorFrontendAPI._runOnceLoaded(function() {
            WebInspector.showPanel("console");
        });
    },

    enterInspectElementMode: function()
    {
        InspectorFrontendAPI._runOnceLoaded(function() {
            WebInspector.showPanel("elements");
            if (WebInspector.inspectElementModeController)
                WebInspector.inspectElementModeController.toggleSearch();
        });
    },

    /**
     * Focus on a particular line in the specified resource.
     * @param {string} url The url to the resource.
     * @param {number} lineNumber The line number to focus on.
     * @param {number} columnNumber The column number to focus on.
     */
    revealSourceLine: function(url, lineNumber, columnNumber)
    {
        InspectorFrontendAPI._runOnceLoaded(function() {
            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
            if (uiSourceCode) {
                WebInspector.showPanel("sources").showUISourceCode(uiSourceCode, lineNumber, columnNumber);
                return;
            }

            /**
             * @param {WebInspector.Event} event
             */
            function listener(event)
            {
                var uiSourceCode = /** @type {WebInspector.UISourceCode} */ (event.data);
                if (uiSourceCode.url === url) {
                    WebInspector.showPanel("sources").showUISourceCode(uiSourceCode, lineNumber, columnNumber);
                    WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener);
                }
            }

            WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener);
        });
    },

    /**
     * @param {string} backgroundColor
     * @param {string} color
     */
    setToolbarColors: function(backgroundColor, color)
    {
        WebInspector.setToolbarColors(backgroundColor, color);
    },

    /**
     * @param {string} url
     */
    loadTimelineFromURL: function(url)
    {
        InspectorFrontendAPI._runOnceLoaded(function() {
            /** @type {WebInspector.TimelinePanel} */ (WebInspector.showPanel("timeline")).loadFromURL(url);
        });
    },

    // FIXME: remove this legacy support.
    setAttachedWindow: function(side)
    {
    },

    // FIXME: remove this legacy support.
    setDockSide: function(side)
    {
        WebInspector.dockController.setDockSide(side);
    },

    dispatchMessage: function(messageObject)
    {
        InspectorBackend.dispatch(messageObject);
    },

    // Callbacks to the methods called from within initialized front-end.
    //////////////////////////////////////////////////////////////////////////////////////////////////

    contextMenuItemSelected: function(id)
    {
        WebInspector.contextMenuItemSelected(id);
    },

    contextMenuCleared: function()
    {
        WebInspector.contextMenuCleared();
    },

    fileSystemsLoaded: function(fileSystems)
    {
        WebInspector.isolatedFileSystemDispatcher.fileSystemsLoaded(fileSystems);
    },

    fileSystemRemoved: function(fileSystemPath)
    {
        WebInspector.isolatedFileSystemDispatcher.fileSystemRemoved(fileSystemPath);
    },

    fileSystemAdded: function(errorMessage, fileSystem)
    {
        WebInspector.isolatedFileSystemDispatcher.fileSystemAdded(errorMessage, fileSystem);
    },

    indexingTotalWorkCalculated: function(requestId, fileSystemPath, totalWork)
    {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingTotalWorkCalculated(requestId, totalWork);
    },

    indexingWorked: function(requestId, fileSystemPath, worked)
    {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingWorked(requestId, worked);
    },

    indexingDone: function(requestId, fileSystemPath)
    {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingDone(requestId);
    },

    searchCompleted: function(requestId, fileSystemPath, files)
    {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.searchCompleted(requestId, files);
    },

    /**
     * @param {string} url
     */
    savedURL: function(url)
    {
        WebInspector.fileManager.savedURL(url);
    },

    /**
     * @param {string} url
     */
    canceledSaveURL: function(url)
    {
        WebInspector.fileManager.canceledSaveURL(url);
    },

    /**
     * @param {string} url
     */
    appendedToURL: function(url)
    {
        WebInspector.fileManager.appendedToURL(url);
    },

    /**
     * @param {number} id
     * @param {?string} error
     */
    embedderMessageAck: function(id, error)
    {
        InspectorFrontendHost.embedderMessageAck(id, error);
    },

    // Called from within front-end
    ///////////////////////////////

    loadCompleted: function()
    {
        InspectorFrontendAPI._isLoaded = true;
        for (var i = 0; i < InspectorFrontendAPI._pendingCommands.length; ++i)
            InspectorFrontendAPI._pendingCommands[i]();
        InspectorFrontendAPI._pendingCommands = [];
        if (window.opener)
            window.opener.postMessage(["loadCompleted"], "*");
    },

    /**
     * @param {Object} queryParamsObject
     */
    dispatchQueryParameters: function(queryParamsObject)
    {
        if ("dispatch" in queryParamsObject)
            InspectorFrontendAPI._dispatch(JSON.parse(window.decodeURI(queryParamsObject["dispatch"])));
    },

    // Testing harness support
    //////////////////////////

    evaluateForTest: function(callId, script)
    {
        WebInspector.evaluateForTestInFrontend(callId, script);
    },

    dispatchMessageAsync: function(messageObject)
    {
        WebInspector.dispatch(messageObject);
    },

    // Implementation details
    /////////////////////////

    _dispatch: function(signature)
    {
        InspectorFrontendAPI._runOnceLoaded(function() {
            var methodName = signature.shift();
            return InspectorFrontendAPI[methodName].apply(InspectorFrontendAPI, signature);
        });
    },

    /**
     * @param {function()} command
     */
    _runOnceLoaded: function(command)
    {
        if (InspectorFrontendAPI._isLoaded) {
            command();
            return;
        }
        InspectorFrontendAPI._pendingCommands.push(command);
    }
}

if (window.opener && window.dispatchStandaloneTestRunnerMessages) {
    function onMessageFromOpener(event)
    {
        if (event.source === window.opener)
            InspectorFrontendAPI._dispatch(event.data);
    }
    window.addEventListener("message", onMessageFromOpener, true);
}
