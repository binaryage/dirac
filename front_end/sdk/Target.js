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
    /** @type {boolean} */
    this.isMainFrontend = false;
    this._id = WebInspector.Target._nextId++;
    /** @type {boolean} */
    this.canScreencast = false;
    this.pageAgent().canScreencast(this._initializeCapability.bind(this, "canScreencast", null));

    /** @type {boolean} */
    this.hasTouchInputs = false;
    this.pageAgent().hasTouchInputs(this._initializeCapability.bind(this, "hasTouchInputs", null));

    if (WebInspector.experimentsSettings.timelinePowerProfiler.isEnabled())
        this.powerAgent().canProfilePower(this._initializeCapability.bind(this, "canProfilePower", null));

    this.workerAgent().canInspectWorkers(this._initializeCapability.bind(this, "isMainFrontend", this._loadedWithCapabilities.bind(this, callback)));

    /** @type {!WebInspector.Lock} */
    this.profilingLock = new WebInspector.Lock();
}

WebInspector.Target._nextId = 1;

WebInspector.Target.prototype = {

    /**
     * @return {number}
     */
    id: function()
    {
        return this._id;
    },

    /**
     * @param {string} name
     * @param {function()|null} callback
     * @param {?Protocol.Error} error
     * @param {*} result
     */
    _initializeCapability: function(name, callback, error, result)
    {
        this[name] = result;
        if (!Capabilities[name])
            Capabilities[name] = result;
        if (callback)
            callback();
    },

    /**
     * @param {function(!WebInspector.Target)=} callback
     */
    _loadedWithCapabilities: function(callback)
    {
        /** @type {!WebInspector.ConsoleModel} */
        this.consoleModel = new WebInspector.ConsoleModel(this);
        // This and similar lines are needed for compatibility.
        if (!WebInspector.console)
            WebInspector.console = this.consoleModel;

        /** @type {!WebInspector.NetworkManager} */
        this.networkManager = new WebInspector.NetworkManager(this);
        if (!WebInspector.networkManager)
            WebInspector.networkManager = this.networkManager;

        /** @type {!WebInspector.ResourceTreeModel} */
        this.resourceTreeModel = new WebInspector.ResourceTreeModel(this);
        if (!WebInspector.resourceTreeModel)
            WebInspector.resourceTreeModel = this.resourceTreeModel;

        /** @type {!WebInspector.NetworkLog} */
        this.networkLog = new WebInspector.NetworkLog(this);
        if (!WebInspector.networkLog)
            WebInspector.networkLog = this.networkLog;

        /** @type {!WebInspector.DebuggerModel} */
        this.debuggerModel = new WebInspector.DebuggerModel(this);
        if (!WebInspector.debuggerModel)
            WebInspector.debuggerModel = this.debuggerModel;

        /** @type {!WebInspector.RuntimeModel} */
        this.runtimeModel = new WebInspector.RuntimeModel(this);
        if (!WebInspector.runtimeModel)
            WebInspector.runtimeModel = this.runtimeModel;

        /** @type {!WebInspector.DOMModel} */
        this.domModel = new WebInspector.DOMModel(this);
        if (!WebInspector.domModel)
            WebInspector.domModel = this.domModel;

        /** @type {!WebInspector.CSSStyleModel} */
        this.cssModel = new WebInspector.CSSStyleModel(this);
        if (!WebInspector.cssModel)
            WebInspector.cssModel = this.cssModel;

        /** @type {!WebInspector.WorkerManager} */
        this.workerManager = new WebInspector.WorkerManager(this, this.isMainFrontend);
        if (!WebInspector.workerManager)
            WebInspector.workerManager = this.workerManager;

        if (this.canProfilePower)
            WebInspector.powerProfiler = new WebInspector.PowerProfiler();

        /** @type {!WebInspector.TimelineManager} */
        this.timelineManager = new WebInspector.TimelineManager(this);
        if (!WebInspector.timelineManager)
            WebInspector.timelineManager = this.timelineManager;

        /** @type {!WebInspector.DatabaseModel} */
        this.databaseModel = new WebInspector.DatabaseModel(this);
        if (!WebInspector.databaseModel)
            WebInspector.databaseModel = this.databaseModel;

        /** @type {!WebInspector.DOMStorageModel} */
        this.domStorageModel = new WebInspector.DOMStorageModel(this);
        if (!WebInspector.domStorageModel)
            WebInspector.domStorageModel = this.domStorageModel;

        /** @type {!WebInspector.CPUProfilerModel} */
        this.cpuProfilerModel = new WebInspector.CPUProfilerModel(this);
        if (!WebInspector.cpuProfilerModel)
            WebInspector.cpuProfilerModel = this.cpuProfilerModel;

        new WebInspector.DebuggerScriptMapping(this.debuggerModel, WebInspector.workspace, WebInspector.networkWorkspaceBinding);

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

    /**
     * @return {boolean}
     */
    isWorkerTarget: function()
    {
        return !this.isMainFrontend;
    },

    /**
     * @return {boolean}
     */
    isMobile: function()
    {
        // FIXME: either add a separate capability or rename canScreencast to isMobile.
        return this.canScreencast;
    },

    __proto__: Protocol.Agents.prototype
}

/**
 * @constructor
 * @param {!WebInspector.Target} target
 */
WebInspector.TargetAware = function(target)
{
    this._target = target;
}

WebInspector.TargetAware.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Target} target
 */
WebInspector.TargetAwareObject = function(target)
{
    WebInspector.Object.call(this);
    this._target = target;
}

WebInspector.TargetAwareObject.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 */
WebInspector.TargetManager = function()
{
    /** @type {!Array.<!WebInspector.Target>} */
    this._targets = [];
    /** @type {!Array.<!WebInspector.TargetManager.Observer>} */
    this._observers = [];
}

WebInspector.TargetManager.prototype = {

    /**
     * @param {!WebInspector.TargetManager.Observer} targetObserver
     */
    observeTargets: function(targetObserver)
    {
        WebInspector.targetManager.targets().forEach(targetObserver.targetAdded.bind(targetObserver));
        this._observers.push(targetObserver);
    },

    /**
     * @param {!InspectorBackendClass.Connection} connection
     * @param {function(!WebInspector.Target)=} callback
     */
    createTarget: function(connection, callback)
    {
        var target = new WebInspector.Target(connection, callbackWrapper.bind(this));

        /**
         * @this {WebInspector.TargetManager}
         * @param {!WebInspector.Target} newTarget
         */
        function callbackWrapper(newTarget)
        {
            this._targets.push(newTarget);
            var copy = this._observers;
            for (var i = 0; i < copy.length; ++i)
                copy[i].targetAdded(newTarget);

            if (callback)
                callback(newTarget);
        }
    },

    /**
     * @return {!Array.<!WebInspector.Target>}
     */
    targets: function()
    {
        return this._targets;
    },

    /**
     * @return {?WebInspector.Target}
     */
    activeTarget: function()
    {
        return this._targets[0];
    }
}

/**
 * @interface
 */
WebInspector.TargetManager.Observer = function()
{
}

WebInspector.TargetManager.Observer.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target) { },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target) { },
}

/**
 * @type {!WebInspector.TargetManager}
 */
WebInspector.targetManager;
