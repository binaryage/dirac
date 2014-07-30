/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {Protocol.Agents}
 * @param {string} name
 * @param {!InspectorBackendClass.Connection} connection
 * @param {function(!WebInspector.Target)=} callback
 */
WebInspector.Target = function(name, connection, callback)
{
    Protocol.Agents.call(this, connection.agentsMap());
    /** @type {!WeakReference.<!WebInspector.Target>} */
    this._weakReference = new WeakReference(this);
    this._name = name;
    this._connection = connection;
    connection.addEventListener(InspectorBackendClass.Connection.Events.Disconnected, this._onDisconnect, this);
    this._id = WebInspector.Target._nextId++;

    /** @type {!Map.<!Function, !WebInspector.SDKModel>} */
    this._modelByConstructor = new Map();

    /** @type {!Object.<string, boolean>} */
    this._capabilities = {};
    this.pageAgent().canScreencast(this._initializeCapability.bind(this, WebInspector.Target.Capabilities.CanScreencast, null));
    if (WebInspector.experimentsSettings.timelinePowerProfiler.isEnabled())
        this.powerAgent().canProfilePower(this._initializeCapability.bind(this, WebInspector.Target.Capabilities.CanProfilePower, null));
    this.workerAgent().canInspectWorkers(this._initializeCapability.bind(this, WebInspector.Target.Capabilities.CanInspectWorkers, this._loadedWithCapabilities.bind(this, callback)));

    /** @type {!WebInspector.Lock} */
    this.profilingLock = new WebInspector.Lock();
}

/**
 * @enum {string}
 */
WebInspector.Target.Capabilities = {
    CanScreencast: "CanScreencast",
    HasTouchInputs: "HasTouchInputs",
    CanProfilePower: "CanProfilePower",
    CanInspectWorkers: "CanInspectWorkers"
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
     *
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {!WeakReference.<!WebInspector.Target>}
     */
    weakReference: function()
    {
       return this._weakReference;
    },

    /**
     * @param {string} name
     * @param {function()|null} callback
     * @param {?Protocol.Error} error
     * @param {boolean} result
     */
    _initializeCapability: function(name, callback, error, result)
    {
        this._capabilities[name] = result;
        if (callback)
            callback();
    },

    /**
     * @param {string} capability
     * @return {boolean}
     */
    hasCapability: function(capability)
    {
        return !!this._capabilities[capability];
    },

    /**
     * @param {function(!WebInspector.Target)=} callback
     */
    _loadedWithCapabilities: function(callback)
    {
        /** @type {!WebInspector.ConsoleModel} */
        this.consoleModel = new WebInspector.ConsoleModel(this);

        /** @type {!WebInspector.NetworkManager} */
        this.networkManager = new WebInspector.NetworkManager(this);

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

        /** @type {!WebInspector.CSSStyleModel} */
        this.cssModel = new WebInspector.CSSStyleModel(this);
        if (!WebInspector.cssModel)
            WebInspector.cssModel = this.cssModel;

        /** @type {!WebInspector.WorkerManager} */
        this.workerManager = new WebInspector.WorkerManager(this, this.hasCapability(WebInspector.Target.Capabilities.CanInspectWorkers));
        if (!WebInspector.workerManager)
            WebInspector.workerManager = this.workerManager;

        if (this.hasCapability(WebInspector.Target.Capabilities.CanProfilePower))
            WebInspector.powerProfiler = new WebInspector.PowerProfiler();

        /** @type {!WebInspector.TimelineManager} */
        this.timelineManager = new WebInspector.TimelineManager(this);

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

        /** @type {!WebInspector.HeapProfilerModel} */
        this.heapProfilerModel = new WebInspector.HeapProfilerModel(this);

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
        return !this.hasCapability(WebInspector.Target.Capabilities.CanInspectWorkers);
    },

    /**
     * @return {boolean}
     */
    isMobile: function()
    {
        // FIXME: either add a separate capability or rename CanScreencast to IsMobile.
        return this.hasCapability(WebInspector.Target.Capabilities.CanScreencast);
    },

    _onDisconnect: function()
    {
        WebInspector.targetManager.removeTarget(this);
        this._dispose();
    },

    _dispose: function()
    {
        this._weakReference.clear();
        this.debuggerModel.dispose();
        this.networkManager.dispose();
        this.cpuProfilerModel.dispose();
    },

    /**
     * @return {boolean}
     */
    isDetached: function()
    {
        return this._connection.isClosed();
    },

    __proto__: Protocol.Agents.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Target} target
 */
WebInspector.SDKObject = function(target)
{
    WebInspector.Object.call(this);
    this._target = target;
}

WebInspector.SDKObject.prototype = {
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
 * @extends {WebInspector.SDKObject}
 * @param {!Function} modelClass
 * @param {!WebInspector.Target} target
 */
WebInspector.SDKModel = function(modelClass, target)
{
    WebInspector.SDKObject.call(this, target);
    target._modelByConstructor.put(modelClass, this);
}

WebInspector.SDKModel.prototype = {
    __proto__: WebInspector.SDKObject.prototype
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
    /** @type {!Object.<string, !Array.<{modelClass: !Function, thisObject: (!Object|undefined), listener: function(!WebInspector.Event)}>>} */
    this._listeners = {};
}

WebInspector.TargetManager.prototype = {
    /**
     * @param {!Function} modelClass
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addModelListener: function(modelClass, eventType, listener, thisObject)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var model = this._targets[i]._modelByConstructor.get(modelClass);
            model.addEventListener(eventType, listener, thisObject);
        }
        if (!this._listeners[eventType])
            this._listeners[eventType] = [];
        this._listeners[eventType].push({ modelClass: modelClass, thisObject: thisObject, listener: listener });
    },

    /**
     * @param {!Function} modelClass
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    removeModelListener: function(modelClass, eventType, listener, thisObject)
    {
        if (!this._listeners[eventType])
            return;

        for (var i = 0; i < this._targets.length; ++i) {
            var model = this._targets[i]._modelByConstructor.get(modelClass);
            model.removeEventListener(eventType, listener, thisObject);
        }

        var listeners = this._listeners[eventType];
        for (var i = 0; i < listeners.length; ++i) {
            if (listeners[i].modelClass === modelClass && listeners[i].listener === listener && listeners[i].thisObject === thisObject)
                listeners.splice(i--, 1);
        }
        if (!listeners.length)
            delete this._listeners[eventType];
    },

    /**
     * @param {!WebInspector.TargetManager.Observer} targetObserver
     */
    observeTargets: function(targetObserver)
    {
        this.targets().forEach(targetObserver.targetAdded.bind(targetObserver));
        this._observers.push(targetObserver);
    },

    /**
     * @param {!WebInspector.TargetManager.Observer} targetObserver
     */
    unobserveTargets: function(targetObserver)
    {
        this._observers.remove(targetObserver);
    },

    /**
     * @param {string} name
     * @param {!InspectorBackendClass.Connection} connection
     * @param {function(!WebInspector.Target)=} callback
     */
    createTarget: function(name, connection, callback)
    {
        var target = new WebInspector.Target(name, connection, callbackWrapper.bind(this));

        /**
         * @this {WebInspector.TargetManager}
         * @param {!WebInspector.Target} newTarget
         */
        function callbackWrapper(newTarget)
        {
            this.addTarget(newTarget);
            if (callback)
                callback(newTarget);
        }
    },

    /**
     * @param {!WebInspector.Target} target
     */
    addTarget: function(target)
    {
        this._targets.push(target);
        var copy = this._observers.slice();
        for (var i = 0; i < copy.length; ++i)
            copy[i].targetAdded(target);

        for (var eventType in this._listeners) {
            var listeners = this._listeners[eventType];
            for (var i = 0; i < listeners.length; ++i) {
                var model = target._modelByConstructor.get(listeners[i].modelClass);
                model.addEventListener(eventType, listeners[i].listener, listeners[i].thisObject);
            }
        }
    },

    /**
     * @param {!WebInspector.Target} target
     */
    removeTarget: function(target)
    {
        this._targets.remove(target);
        var copy = this._observers.slice();
        for (var i = 0; i < copy.length; ++i)
            copy[i].targetRemoved(target);

        for (var eventType in this._listeners) {
            var listeners = this._listeners[eventType];
            for (var i = 0; i < listeners.length; ++i) {
                var model = target._modelByConstructor.get(listeners[i].modelClass);
                model.removeEventListener(eventType, listeners[i].listener, listeners[i].thisObject);
            }
        }
    },

    /**
     * @return {!Array.<!WebInspector.Target>}
     */
    targets: function()
    {
        return this._targets.slice();
    },

    /**
     * @return {?WebInspector.Target}
     */
    mainTarget: function()
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
WebInspector.targetManager = new WebInspector.TargetManager();
