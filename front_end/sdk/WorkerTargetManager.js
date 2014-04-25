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
            this._targetManager.createTarget(connection)
        }
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
    this._workerId = workerId;
    this._workerAgent = target.workerAgent();
    this._workerAgent.connectToWorker(workerId, onConnectionReady.bind(null, this));
    target.workerManager.addEventListener(WebInspector.WorkerManager.Events.MessageFromWorker, this._dispatchMessageFromWorker, this);
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

    __proto__: InspectorBackendClass.Connection.prototype
}
