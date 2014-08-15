// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * @constructor
 * @param {!WebInspector.Target} mainTarget
 * @param {!WebInspector.TargetManager} targetManager
 */
WebInspector.WorkerTargetManager = function(mainTarget, targetManager)
{
    this._mainTarget = mainTarget;
    this._targetManager = targetManager;
    mainTarget.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._onWorkerAdded, this);
    WebInspector.profilingLock.addEventListener(WebInspector.Lock.Events.StateChanged, this._onProfilingStateChanged, this);
    this._onProfilingStateChanged();
}

WebInspector.WorkerTargetManager.prototype = {
    _onProfilingStateChanged: function()
    {
        var acquired = WebInspector.profilingLock.isAcquired();
        this._mainTarget.workerAgent().setAutoconnectToWorkers(!acquired);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerAdded: function(event)
    {
        var data = /** @type {{workerId: number, url: string, inspectorConnected: boolean}} */ (event.data);
        new WebInspector.WorkerConnection(this._mainTarget, data.workerId, data.inspectorConnected, onConnectionReady.bind(this));

        /**
         * @this {WebInspector.WorkerTargetManager}
         * @param {!InspectorBackendClass.Connection} connection
         */
        function onConnectionReady(connection)
        {
            this._targetManager.createTarget(WebInspector.UIString("Worker %s", data.url.asParsedURL().lastPathComponent), connection, targetCreated)
        }

        /**
         * @param {!WebInspector.Target} target
         */
        function targetCreated(target)
        {
            if (data.inspectorConnected)
                target.runtimeAgent().run();
        }
    }
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!WebInspector.Target} target
 * @param {number} workerId
 * @param {boolean} inspectorConnected
 * @param {!function(!InspectorBackendClass.Connection)} onConnectionReady
 */
WebInspector.WorkerConnection = function(target, workerId, inspectorConnected, onConnectionReady)
{
    InspectorBackendClass.Connection.call(this);
    //FIXME: remove resourceTreeModel and others from worker targets
    this.suppressErrorsForDomains(["Worker", "Page", "CSS", "DOM", "DOMStorage", "Database", "Network"]);
    this._target = target;
    this._workerId = workerId;
    this._workerAgent = target.workerAgent();
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.MessageFromWorker, this._dispatchMessageFromWorker, this);
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._close, this);
    if (!inspectorConnected)
        this._workerAgent.connectToWorker(workerId, onConnectionReady.bind(null, this));
    else
        onConnectionReady.call(null, this);
}

WebInspector.WorkerConnection.prototype = {

    /**
     * @param {!WebInspector.Event} event
     */
    _dispatchMessageFromWorker: function(event)
    {
        var data = /** @type {{workerId: number, command: string, message: !Object}} */ (event.data);
        if (data.workerId === this._workerId)
            this.dispatch(data.message);
    },

    /**
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        this._workerAgent.sendMessageToWorker(this._workerId, messageObject);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerRemoved: function(event)
    {
        var workerId = /** @type {number} */ (event.data);
        if (workerId === this._workerId)
            this._close();
    },

    _close: function()
    {
        this._target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.MessageFromWorker, this._dispatchMessageFromWorker, this);
        this._target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
        this._target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._close, this);
        this.connectionClosed("worker_terminated");
    },

    __proto__: InspectorBackendClass.Connection.prototype
}
