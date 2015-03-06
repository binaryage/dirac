// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.WorkerTargetManager = function()
{
    /** @type {!Map.<string, !WebInspector.Target>} */
    this._targetsByWorkerId = new Map();
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
    WebInspector.targetManager.observeTargets(this);
    this._onSuspendStateChanged();
    this._lastAnonymousTargetId = 0;
}

WebInspector.WorkerTargetManager.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
         target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._onWorkerAdded, this);
         target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
         target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._onWorkersCleared, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
         target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._onWorkerAdded, this);
         target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
         target.workerManager.removeEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._onWorkersCleared, this);
    },

    _onSuspendStateChanged: function()
    {
        // FIXME: the logic needs to be extended and cover the case when a worker was started after disabling autoconnect
        // and still alive after enabling autoconnect.
        var suspended = WebInspector.targetManager.allTargetsSuspended();
        var mainTarget = WebInspector.targetManager.mainTarget();
        for (var target of WebInspector.targetManager.targets())
            target.workerAgent().setAutoconnectToWorkers(!suspended);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerAdded: function(event)
    {
        var workerManager = /** @type {!WebInspector.WorkerManager} */ (event.target);
        var data = /** @type {{workerId: string, url: string, inspectorConnected: boolean }} */ (event.data);
        new WebInspector.WorkerConnection(workerManager.target(), data.workerId, data.inspectorConnected, onConnectionReady.bind(this, data.workerId));

        /**
         * @this {WebInspector.WorkerTargetManager}
         * @param {string} workerId
         * @param {!InspectorBackendClass.Connection} connection
         */
        function onConnectionReady(workerId, connection)
        {
            var parsedURL = data.url.asParsedURL();
            var workerName = parsedURL ? parsedURL.lastPathComponent : "#" + (++this._lastAnonymousTargetId);
            WebInspector.targetManager.createTarget(WebInspector.UIString("Worker %s", workerName), WebInspector.Target.Type.DedicatedWorker, connection, workerManager.target(), targetCreated.bind(this, workerId));
        }

        /**
         * @this {WebInspector.WorkerTargetManager}
         * @param {string} workerId
         * @param {?WebInspector.Target} target
         */
        function targetCreated(workerId, target)
        {
            if (!target)
                return;
            if (workerId)
                this._targetsByWorkerId.set(workerId, target);

            if (data.inspectorConnected) {
                if (target.parentTarget() && target.parentTarget().isServiceWorker())
                    target.debuggerAgent().pause();
                target.runtimeAgent().run();
            }
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkersCleared: function(event)
    {
        var workerManager = /** @type {!WebInspector.WorkerManager} */ (event.target);
        var target = workerManager.target();

        for (var workerId of this._targetsByWorkerId.keys()) {
            if (this._targetsByWorkerId.get(workerId) === target)
                this._targetsByWorkerId.remove(workerId);
        }
        this._lastAnonymousTargetId = 0;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerRemoved: function(event)
    {
        var workerId = /** @type {string} */ (event.data);
        this._targetsByWorkerId.delete(workerId);
    },

    /**
     * @param {string} workerId
     * @return {?WebInspector.Target}
     */
    targetByWorkerId: function(workerId)
    {
        return this._targetsByWorkerId.get(workerId) || null;
    }
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!WebInspector.Target} target
 * @param {string} workerId
 * @param {boolean} inspectorConnected
 * @param {function(!InspectorBackendClass.Connection)} onConnectionReady
 */
WebInspector.WorkerConnection = function(target, workerId, inspectorConnected, onConnectionReady)
{
    InspectorBackendClass.Connection.call(this);
    //FIXME: remove resourceTreeModel and others from worker targets
    this.suppressErrorsForDomains(["Worker", "Page", "CSS", "DOM", "DOMStorage", "Database", "Network", "IndexedDB", "ServiceWorkerCache"]);
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
        var data = /** @type {{workerId: string, message: string}} */ (event.data);
        if (data.workerId === this._workerId)
            this.dispatch(data.message);
    },

    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        this._workerAgent.sendMessageToWorker(this._workerId, JSON.stringify(messageObject));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerRemoved: function(event)
    {
        var workerId = /** @type {string} */ (event.data);
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

/**
 * @type {?WebInspector.WorkerTargetManager}
 */
WebInspector.workerTargetManager;
