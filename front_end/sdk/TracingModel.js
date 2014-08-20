/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.TracingModel = function()
{
    this.reset();
    this._active = false;
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.TracingModel.Events = {
    "BufferUsage": "BufferUsage",
    "TracingStarted": "TracingStarted",
    "TracingStopped": "TracingStopped",
    "TracingComplete": "TracingComplete"
}

/** @typedef {!{
        cat: string,
        pid: number,
        tid: number,
        ts: number,
        ph: string,
        name: string,
        args: !Object,
        dur: number,
        id: number,
        s: string
    }}
 */
WebInspector.TracingModel.EventPayload;

/**
 * @enum {string}
 */
WebInspector.TracingModel.Phase = {
    Begin: "B",
    End: "E",
    Complete: "X",
    Instant: "i",
    AsyncBegin: "S",
    AsyncStepInto: "T",
    AsyncStepPast: "p",
    AsyncEnd: "F",
    FlowBegin: "s",
    FlowStep: "t",
    FlowEnd: "f",
    Metadata: "M",
    Counter: "C",
    Sample: "P",
    CreateObject: "N",
    SnapshotObject: "O",
    DeleteObject: "D"
};

WebInspector.TracingModel.MetadataEvent = {
    ProcessSortIndex: "process_sort_index",
    ProcessName: "process_name",
    ThreadSortIndex: "thread_sort_index",
    ThreadName: "thread_name"
}

WebInspector.TracingModel.DevToolsMetadataEventCategory = "disabled-by-default-devtools.timeline";

WebInspector.TracingModel.FrameLifecycleEventCategory = "cc,devtools";

WebInspector.TracingModel.DevToolsMetadataEvent = {
    TracingStartedInPage: "TracingStartedInPage",
    TracingStartedInWorker: "TracingStartedInWorker",
};

WebInspector.TracingModel.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;
        InspectorBackend.registerTracingDispatcher(new WebInspector.TracingDispatcher(this));
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (this._target !== target)
            return;
        delete this._target;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    devtoolsPageMetadataEvents: function()
    {
        return this._devtoolsPageMetadataEvents;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    devtoolsWorkerMetadataEvents: function()
    {
        return this._devtoolsWorkerMetadataEvents;
    },

    /**
     * @param {string} categoryFilter
     * @param {string} options
     * @param {function(?string)=} callback
     */
    start: function(categoryFilter, options, callback)
    {
        WebInspector.profilingLock().acquire();
        this.reset();
        var bufferUsageReportingIntervalMs = 500;
        TracingAgent.start(categoryFilter, options, bufferUsageReportingIntervalMs, callback);
        this._active = true;
    },

    stop: function()
    {
        if (!this._active)
            return;
        TracingAgent.end(this._onStop.bind(this));
        WebInspector.profilingLock().release();
    },

    /**
     * @return {?string}
     */
    sessionId: function()
    {
        return this._sessionId;
    },

    /**
     * @param {string} sessionId
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} events
     */
    setEventsForTest: function(sessionId, events)
    {
        this.reset();
        this._sessionId = sessionId;
        this._eventsCollected(events);
    },

    /**
     * @param {number} usage
     */
    _bufferUsage: function(usage)
    {
        this.dispatchEventToListeners(WebInspector.TracingModel.Events.BufferUsage, usage);
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} events
     */
    _eventsCollected: function(events)
    {
        for (var i = 0; i < events.length; ++i) {
            this._addEvent(events[i]);
            this._rawEvents.push(events[i]);
        }
    },

    _tracingComplete: function()
    {
        this._active = false;
        this.dispatchEventToListeners(WebInspector.TracingModel.Events.TracingComplete);
    },

    /**
     * @param {string} sessionId
     */
    _tracingStarted: function(sessionId)
    {
        this.reset();
        this._active = true;
        this._sessionId = sessionId;
        this.dispatchEventToListeners(WebInspector.TracingModel.Events.TracingStarted);
    },

    _onStop: function()
    {
        this.dispatchEventToListeners(WebInspector.TracingModel.Events.TracingStopped);
        this._active = false;
    },

    reset: function()
    {
        this._processById = {};
        this._minimumRecordTime = 0;
        this._maximumRecordTime = 0;
        this._sessionId = null;
        this._devtoolsPageMetadataEvents = [];
        this._devtoolsWorkerMetadataEvents = [];
        this._rawEvents = [];
    },

    /**
      * @return {!Array.<!WebInspector.TracingModel.EventPayload>}
      */
    rawEvents: function()
    {
        return this._rawEvents;
    },

    /**
      * @param {!WebInspector.TracingModel.EventPayload} payload
      */
    _addEvent: function(payload)
    {
        var process = this._processById[payload.pid];
        if (!process) {
            process = new WebInspector.TracingModel.Process(payload.pid);
            this._processById[payload.pid] = process;
        }
        var thread = process.threadById(payload.tid);
        if (payload.ph !== WebInspector.TracingModel.Phase.Metadata) {
            var timestamp = payload.ts / 1000;
            // We do allow records for unrelated threads to arrive out-of-order,
            // so there's a chance we're getting records from the past.
            if (timestamp && (!this._minimumRecordTime || timestamp < this._minimumRecordTime))
                this._minimumRecordTime = timestamp;
            if (!this._maximumRecordTime || timestamp > this._maximumRecordTime)
                this._maximumRecordTime = timestamp;
            var event = thread.addEvent(payload);
            if (payload.ph === WebInspector.TracingModel.Phase.SnapshotObject)
                process.addObject(event);
            if (event && event.name === WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage &&
                event.category === WebInspector.TracingModel.DevToolsMetadataEventCategory &&
                event.args["sessionId"] === this._sessionId)
                this._devtoolsPageMetadataEvents.push(event);
            if (event && event.name === WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInWorker &&
                event.category === WebInspector.TracingModel.DevToolsMetadataEventCategory &&
                event.args["sessionId"] === this._sessionId)
                this._devtoolsWorkerMetadataEvents.push(event);
            return;
        }
        switch (payload.name) {
        case WebInspector.TracingModel.MetadataEvent.ProcessSortIndex:
            process._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingModel.MetadataEvent.ProcessName:
            process._setName(payload.args["name"]);
            break;
        case WebInspector.TracingModel.MetadataEvent.ThreadSortIndex:
            thread._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingModel.MetadataEvent.ThreadName:
            thread._setName(payload.args["name"]);
            break;
        }
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._minimumRecordTime;
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._maximumRecordTime;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Process>}
     */
    sortedProcesses: function()
    {
        return WebInspector.TracingModel.NamedObject._sort(Object.values(this._processById));
    },

    __proto__: WebInspector.Object.prototype
}


/**
 * @constructor
 * @param {!WebInspector.TracingModel} tracingModel
 */
WebInspector.TracingModel.Loader = function(tracingModel)
{
    this._tracingModel = tracingModel;
    this._events = [];
    this._sessionIdFound = false;
}

WebInspector.TracingModel.Loader.prototype = {
    /**
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} events
     */
    loadNextChunk: function(events) {
        if (this._sessionIdFound) {
            this._tracingModel._eventsCollected(events);
            return;
        }

        var sessionId = null;
        for (var i = 0, length = events.length; i < length; i++) {
            var event = events[i];
            this._events.push(event);

            if (event.name === WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage &&
                event.cat.indexOf(WebInspector.TracingModel.DevToolsMetadataEventCategory) !== -1 &&
                !this._sessionIdFound) {
                sessionId = event.args["sessionId"];
                this._sessionIdFound = true;
            }
        }

        if (this._sessionIdFound) {
            this._tracingModel._tracingStarted(sessionId);
            this._tracingModel._eventsCollected(this._events);
        }
    },

    finish: function()
    {
        if (this._sessionIdFound)
            this._tracingModel._tracingComplete();
        else
            WebInspector.console.error(WebInspector.UIString("Trace event %s not found while loading tracing model.", WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage));
    }
}


/**
 * @constructor
 * @param {!WebInspector.TracingModel.EventPayload} payload
 * @param {number} level
 * @param {?WebInspector.TracingModel.Thread} thread
 */
WebInspector.TracingModel.Event = function(payload, level, thread)
{
    this.name = payload.name;
    this.category = payload.cat;
    this.startTime = payload.ts / 1000;
    if (payload.args) {
        // Create a new object to avoid modifying original payload which may be saved to file.
        this.args = {};
        for (var name in payload.args)
            this.args[name] = payload.args[name];
    }
    this.phase = payload.ph;
    this.level = level;

    if (typeof payload.dur === "number")
        this._setEndTime((payload.ts + payload.dur) / 1000);

    if (payload.id)
        this.id = payload.id;

    this.thread = thread;

    /** @type {?string} */
    this.warning = null;
    /** @type {?WebInspector.TracingModel.Event} */
    this.initiator = null;
    /** @type {?Array.<!ConsoleAgent.CallFrame>} */
    this.stackTrace = null;
    /** @type {?Element} */
    this.previewElement = null;
    /** @type {?string} */
    this.imageURL = null;
    /** @type {number} */
    this.backendNodeId = 0;

    /** @type {number} */
    this.selfTime = 0;
}

WebInspector.TracingModel.Event.prototype = {
    /**
     * @param {number} endTime
     */
    _setEndTime: function(endTime)
    {
        if (endTime < this.startTime) {
            console.assert(false, "Event out of order: " + this.name);
            return;
        }
        this.endTime = endTime;
        this.duration = endTime - this.startTime;
    },

    /**
     * @param {!WebInspector.TracingModel.EventPayload} payload
     */
    _complete: function(payload)
    {
        if (this.name !== payload.name) {
            console.assert(false, "Open/close event mismatch: " + this.name + " vs. " + payload.name + " at " + (payload.ts / 1000));
            return;
        }
        if (payload.args) {
            for (var name in payload.args) {
                if (name in this.args)
                    console.error("Same argument name (" + name +  ") is used for begin and end phases of " + this.name);
                this.args[name] = payload.args[name];
            }
        }
        this._setEndTime(payload.ts / 1000);
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} a
 * @param {!WebInspector.TracingModel.Event} b
 * @return {number}
 */
WebInspector.TracingModel.Event.compareStartTime = function (a, b)
{
    return a.startTime - b.startTime;
}

/**
 * @param {!WebInspector.TracingModel.Event} a
 * @param {!WebInspector.TracingModel.Event} b
 * @return {number}
 */
WebInspector.TracingModel.Event.orderedCompareStartTime = function (a, b)
{
    // Array.mergeOrdered coalesces objects if comparator returns 0.
    // To change this behavior this comparator return -1 in the case events
    // startTime's are equal, so both events got placed into the result array.
    return a.startTime - b.startTime || -1;
}

/**
 * @constructor
 */
WebInspector.TracingModel.NamedObject = function()
{
}

WebInspector.TracingModel.NamedObject.prototype =
{
    /**
     * @param {string} name
     */
    _setName: function(name)
    {
        this._name = name;
    },

    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @param {number} sortIndex
     */
    _setSortIndex: function(sortIndex)
    {
        this._sortIndex = sortIndex;
    },
}

/**
 * @param {!Array.<!WebInspector.TracingModel.NamedObject>} array
 */
WebInspector.TracingModel.NamedObject._sort = function(array)
{
    /**
     * @param {!WebInspector.TracingModel.NamedObject} a
     * @param {!WebInspector.TracingModel.NamedObject} b
     */
    function comparator(a, b)
    {
        return a._sortIndex !== b._sortIndex ? a._sortIndex - b._sortIndex : a.name().localeCompare(b.name());
    }
    return array.sort(comparator);
}

/**
 * @constructor
 * @extends {WebInspector.TracingModel.NamedObject}
 * @param {number} id
 */
WebInspector.TracingModel.Process = function(id)
{
    WebInspector.TracingModel.NamedObject.call(this);
    this._setName("Process " + id);
    this._threads = {};
    this._objects = {};
}

WebInspector.TracingModel.Process.prototype = {
    /**
     * @param {number} id
     * @return {!WebInspector.TracingModel.Thread}
     */
    threadById: function(id)
    {
        var thread = this._threads[id];
        if (!thread) {
            thread = new WebInspector.TracingModel.Thread(this, id);
            this._threads[id] = thread;
        }
        return thread;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    addObject: function(event)
    {
        this.objectsByName(event.name).push(event);
    },

    /**
     * @param {string} name
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    objectsByName: function(name)
    {
        var objects = this._objects[name];
        if (!objects) {
            objects = [];
            this._objects[name] = objects;
        }
        return objects;
    },

    /**
     * @return {!Array.<string>}
     */
    sortedObjectNames: function()
    {
        return Object.keys(this._objects).sort();
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Thread>}
     */
    sortedThreads: function()
    {
        return WebInspector.TracingModel.NamedObject._sort(Object.values(this._threads));
    },

    __proto__: WebInspector.TracingModel.NamedObject.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TracingModel.NamedObject}
 * @param {!WebInspector.TracingModel.Process} process
 * @param {number} id
 */
WebInspector.TracingModel.Thread = function(process, id)
{
    WebInspector.TracingModel.NamedObject.call(this);
    this._process = process;
    this._setName("Thread " + id);
    this._events = [];
    this._stack = [];
    this._maxStackDepth = 0;
}

WebInspector.TracingModel.Thread.prototype = {

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        //FIXME: correctly specify target
        return WebInspector.targetManager.targets()[0];
    },

    /**
     * @param {!WebInspector.TracingModel.EventPayload} payload
     * @return {?WebInspector.TracingModel.Event} event
     */
    addEvent: function(payload)
    {
        var timestamp = payload.ts / 1000;
        for (var top = this._stack.peekLast(); top;) {
            // For B/E pairs, ignore time and look for top matching B event,
            // otherwise, only pop event if it's definitely is in the past.
            if (payload.ph === WebInspector.TracingModel.Phase.End) {
                if (payload.name === top.name) {
                    top._complete(payload);
                    this._stack.pop();
                    return null;
                }
            } else if (top.phase === WebInspector.TracingModel.Phase.Begin || (top.endTime && (top.endTime > timestamp))) {
                break;
            }
            this._stack.pop();
            top = this._stack.peekLast();
        }
        // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
        if (payload.ph === WebInspector.TracingModel.Phase.End)
            return null;

        var event = new WebInspector.TracingModel.Event(payload, this._stack.length, this);
        if (payload.ph === WebInspector.TracingModel.Phase.Begin || payload.ph === WebInspector.TracingModel.Phase.Complete) {
            this._stack.push(event);
            if (this._maxStackDepth < this._stack.length)
                this._maxStackDepth = this._stack.length;
        }
        if (this._events.length && this._events.peekLast().startTime > event.startTime)
            console.assert(false, "Event is our of order: " + event.name);
        this._events.push(event);
        return event;
    },

    /**
     * @return {!WebInspector.TracingModel.Process}
     */
    process: function()
    {
        return this._process;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    events: function()
    {
        return this._events;
    },

    /**
     * @return {number}
     */
    maxStackDepth: function()
    {
        // Reserve one for non-container events.
        return this._maxStackDepth + 1;
    },

    __proto__: WebInspector.TracingModel.NamedObject.prototype
}


/**
 * @constructor
 * @implements {TracingAgent.Dispatcher}
 * @param {!WebInspector.TracingModel} tracingModel
 */
WebInspector.TracingDispatcher = function(tracingModel)
{
    this._tracingModel = tracingModel;
}

WebInspector.TracingDispatcher.prototype = {
    /**
     * @param {number} usage
     */
    bufferUsage: function(usage)
    {
        this._tracingModel._bufferUsage(usage);
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.EventPayload>} data
     */
    dataCollected: function(data)
    {
        this._tracingModel._eventsCollected(data);
    },

    tracingComplete: function()
    {
        this._tracingModel._tracingComplete();
    },

    /**
     * @param {boolean} consoleTimeline
     * @param {string} sessionId
     */
    started: function(consoleTimeline, sessionId)
    {
        this._tracingModel._tracingStarted(sessionId);
    },

    stopped: function()
    {
        this._tracingModel._onStop();
    }
}
