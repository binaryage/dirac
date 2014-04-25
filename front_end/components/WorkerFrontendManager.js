
/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
WebInspector.WorkerFrontendManager = function()
{
    this._workerIdToWindow = {};

    WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._workerAdded, this);
    WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._workerRemoved, this);
    WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._workersCleared, this);
    WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.MessageFromWorker, this._sendMessageToWorkerInspector, this);

    window.addEventListener("message", this._handleMessage.bind(this), true);
}

WebInspector.WorkerFrontendManager.prototype = {

    /**
     * @param {!WebInspector.Event} event
     */
    _workerAdded: function(event)
    {
        var data = /** @type {{workerId: number, url: string, inspectorConnected: boolean}} */ (event.data);

        if (data.inspectorConnected)
            this._openInspectorWindow(data.workerId, true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _workerRemoved: function(event)
    {
        var data = /** @type {{workerId: number, url: string}} */ (event.data);

        this.closeWorkerInspector(data.workerId);
    },

    _workersCleared: function()
    {
        for (var workerId in this._workerIdToWindow)
            this.closeWorkerInspector(workerId);
    },

    _handleMessage: function(event)
    {
        var data = /** @type {{workerId: string, command: string, message: !Object}} */ (event.data);
        var workerId = data["workerId"];
        workerId = parseInt(workerId, 10);
        var command = data.command;
        var message = data.message;

        if (command == "sendMessageToBackend")
            WorkerAgent.sendMessageToWorker(workerId, message);
    },

    _sendMessageToWorkerInspector: function(event)
    {
        var data = (event.data);

        var workerInspectorWindow = this._workerIdToWindow[data.workerId];
        if (workerInspectorWindow)
            workerInspectorWindow.postMessage(data.message, "*");
    },

    openWorkerInspector: function(workerId)
    {
        var existingInspector = this._workerIdToWindow[workerId];
        if (existingInspector) {
            existingInspector.focus();
            return;
        }

        this._openInspectorWindow(workerId, false);
        WorkerAgent.connectToWorker(workerId);
    },

    _openInspectorWindow: function(workerId, workerIsPaused)
    {
        var search = window.location.search;
        var hash = window.location.hash;
        var url = window.location.href;
        // Make sure hash is in rear
        url = url.replace(hash, "");
        url += (search ? "&dedicatedWorkerId=" : "?dedicatedWorkerId=") + workerId;
        if (workerIsPaused)
            url += "&workerPaused=true";
        url = url.replace("docked=true&", "");
        url = url.replace("can_dock=true&", "");
        url += hash;
        var width = WebInspector.settings.workerInspectorWidth.get();
        var height = WebInspector.settings.workerInspectorHeight.get();
        // Set location=0 just to make sure the front-end will be opened in a separate window, not in new tab.
        var workerInspectorWindow = window.open(url, undefined, "location=0,width=" + width + ",height=" + height);
        workerInspectorWindow.addEventListener("resize", this._onWorkerInspectorResize.bind(this, workerInspectorWindow), false);
        this._workerIdToWindow[workerId] = workerInspectorWindow;
        workerInspectorWindow.addEventListener("beforeunload", this._workerInspectorClosing.bind(this, workerId), true);

        // Listen to beforeunload in detached state and to the InspectorClosing event in case of attached inspector.
        window.addEventListener("unload", this._pageInspectorClosing.bind(this), true);
    },

    closeWorkerInspector: function(workerId)
    {
        var workerInspectorWindow = this._workerIdToWindow[workerId];
        if (workerInspectorWindow)
            workerInspectorWindow.close();
    },

    _onWorkerInspectorResize: function(workerInspectorWindow)
    {
        var doc = workerInspectorWindow.document;
        WebInspector.settings.workerInspectorWidth.set(doc.width);
        WebInspector.settings.workerInspectorHeight.set(doc.height);
    },

    _workerInspectorClosing: function(workerId, event)
    {
        if (event.target.location.href === "about:blank")
            return;
        if (this._ignoreWorkerInspectorClosing)
            return;
        delete this._workerIdToWindow[workerId];
        WorkerAgent.disconnectFromWorker(workerId);
    },

    _pageInspectorClosing: function()
    {
        this._ignoreWorkerInspectorClosing = true;
        for (var workerId in this._workerIdToWindow) {
            this._workerIdToWindow[workerId].close();
            WorkerAgent.disconnectFromWorker(parseInt(workerId, 10));
        }
    }

}
/**
 * @type {?WebInspector.WorkerFrontendManager}
 */
WebInspector.workerFrontendManager = null;

