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
    mainTarget.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
    mainTarget.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._onWorkersCleared, this);

    /** @type {!Object.<string, !WebInspector.Target>} */
    this._workerTargetById = {};
}

WebInspector.WorkerTargetManager.prototype = {

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerAdded: function(event)
    {
        var data = /** @type {{workerId: number, url: string}} */ (event.data);
        new WebInspector.WorkerConnection(this._mainTarget, data.workerId, onConnectionReady.bind(this));

        /**
         * @this {WebInspector.WorkerTargetManager}
         * @param {!InspectorBackendClass.Connection} connection
         */
        function onConnectionReady(connection)
        {
            this._targetManager.createTarget(event.data.url, connection, targetCreated.bind(this))
        }

        /**
         * @this {WebInspector.WorkerTargetManager}
         * @param {!WebInspector.Target} target
         */
        function targetCreated(target)
        {
            this._workerTargetById[String(data.workerId)] = target;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkerRemoved: function(event)
    {
        var workerId = String(event.data);
        var target = this._workerTargetById[workerId];
        delete this._workerTargetById[workerId];
        this._targetManager.removeTarget(target);
    },

    _onWorkersCleared: function()
    {
        var targets = Object.values(this._workerTargetById);
        for (var i = 0; i < targets.length; ++i)
            this._targetManager.removeTarget(targets[i]);
        this._workerTargetById = [];
    }

}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!WebInspector.Target} target
 * @param {number} workerId
 * @param {!function(!InspectorBackendClass.Connection)} onConnectionReady
 */
WebInspector.WorkerConnection = function(target, workerId, onConnectionReady)
{
    InspectorBackendClass.Connection.call(this);
    this._target = target;
    this._workerId = workerId;
    this._workerAgent = target.workerAgent();
    this._workerAgent.connectToWorker(workerId, onConnectionReady.bind(null, this));
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.MessageFromWorker, this._dispatchMessageFromWorker, this);
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._onWorkerRemoved, this);
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._close, this);
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
    },

    __proto__: InspectorBackendClass.Connection.prototype
}
