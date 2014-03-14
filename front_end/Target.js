/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {Protocol.Agents}
 * @param {!InspectorBackendClass.Connection} connection
 * @param {function(!WebInspector.Target)=} callback
 */
WebInspector.Target = function(connection, callback)
{
    Protocol.Agents.call(this, connection.agentsMap());
    this._connection = connection;
    this.isMainFrontend = false;

    this.pageAgent().canScreencast(this._initializeCapability.bind(this, "canScreencast", null));
    this.workerAgent().canInspectWorkers(this._initializeCapability.bind(this, "isMainFrontend", this._loadedWithCapabilities.bind(this, callback)));
}

WebInspector.Target.prototype = {

    _initializeCapability: function(name, callback, error, result)
    {
        this[name] = result;
        Capabilities[name] = result;
        if (callback)
            callback();
    },

    /**
     * @param {function(!WebInspector.Target)=} callback
     */
    _loadedWithCapabilities: function(callback)
    {
        this.consoleModel = new WebInspector.ConsoleModel(this);
        //This and similar lines are needed for compatibility
        WebInspector.console = this.consoleModel;
        this.networkManager = new WebInspector.NetworkManager(this);
        WebInspector.networkManager = this.networkManager;
        this.resourceTreeModel = new WebInspector.ResourceTreeModel(this);
        WebInspector.resourceTreeModel = this.resourceTreeModel;
        this.debuggerModel = new WebInspector.DebuggerModel(this);
        WebInspector.debuggerModel = this.debuggerModel;
        this.runtimeModel = new WebInspector.RuntimeModel(this);
        WebInspector.runtimeModel = this.runtimeModel;

        //we can't name it domAgent, because it clashes with function, WebInspector.DOMAgent should be renamed to DOMModel
        this.domModel = new WebInspector.DOMAgent();
        WebInspector.domAgent = this.domModel;
        this.workerManager = new WebInspector.WorkerManager(this.isMainFrontend);
        WebInspector.workerManager = this.workerManager;

        if (callback)
            callback(this);
    },

    /**
     * @override
     * @param {string} domain
     * @param {!Object} dispatcher
     */
    registerDispatcher: function(domain, dispatcher)
    {
        this._connection.registerDispatcher(domain, dispatcher);
    },

    __proto__: Protocol.Agents.prototype
}

/**
 * @constructor
 */
WebInspector.TargetManager = function()
{
    /** @type {!Array.<!WebInspector.Target>} */
    this._targets = [];
}

WebInspector.TargetManager.prototype = {

    /**
     * @param {!InspectorBackendClass.Connection} connection
     * @param {function(!WebInspector.Target)=} callback
     */
    createTarget: function(connection, callback)
    {
        var newTarget = new WebInspector.Target(connection, callback);
        this._targets.push(newTarget);
    }

}
