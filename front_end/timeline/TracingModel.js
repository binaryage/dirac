/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.TargetAwareObject}
 */
WebInspector.TracingModel = function(target)
{
    WebInspector.TargetAwareObject.call(this, target);
    this.reset();
    this._active = false;
    InspectorBackend.registerTracingDispatcher(new WebInspector.TracingDispatcher(this));
}

WebInspector.TracingModel.Events = {
    "BufferUsage": "BufferUsage"
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
};

WebInspector.TracingModel.prototype = {
    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    devtoolsMetadataEvents: function()
    {
        return this._devtoolsMetadataEvents;
    },

    /**
     * @param {string} categoryFilter
     * @param {string} options
     * @param {function(?string)=} callback
     */
    start: function(categoryFilter, options, callback)
    {
        this.reset();
        var bufferUsageReportingIntervalMs = 500;
        /**
         * @param {?string} error
         * @param {string} sessionId
         * @this {WebInspector.TracingModel}
         */
        function callbackWrapper(error, sessionId)
        {
            this._sessionId = sessionId;
            if (callback)
                callback(error);
        }
        TracingAgent.start(categoryFilter, options, bufferUsageReportingIntervalMs, callbackWrapper.bind(this));
        this._active = true;
    },

    /**
     * @param {function()} callback
     */
    stop: function(callback)
    {
        if (!this._active) {
            callback();
            return;
        }
        this._pendingStopCallback = callback;
        TracingAgent.end();
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
        this._tracingComplete();
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
        for (var i = 0; i < events.length; ++i)
            this._addEvent(events[i]);
    },

    _tracingComplete: function()
    {
        this._active = false;
        if (!this._pendingStopCallback)
            return;
        this._pendingStopCallback();
        this._pendingStopCallback = null;
    },

    reset: function()
    {
        this._processById = {};
        this._minimumRecordTime = 0;
        this._maximumRecordTime = 0;
        this._sessionId = null;
        this._devtoolsMetadataEvents = [];
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
                this._devtoolsMetadataEvents.push(event);
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

    __proto__: WebInspector.TargetAwareObject.prototype
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
    this.args = payload.args;
    this.phase = payload.ph;
    this.level = level;

    if (payload.dur)
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
            console.assert(false, "Open/close event mismatch: " + this.name + " vs. " + payload.name);
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
     * @param {!WebInspector.TracingModel.EventPayload} payload
     * @return {?WebInspector.TracingModel.Event} event
     */
    addEvent: function(payload)
    {
        for (var top = this._stack.peekLast(); top && top.endTime && top.endTime <= payload.ts / 1000;) {
            this._stack.pop();
            top = this._stack.peekLast();
        }
        if (payload.ph === WebInspector.TracingModel.Phase.End) {
            var openEvent = this._stack.pop();
            // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
            if (openEvent)
                openEvent._complete(payload);
            return null;
        }

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
    }
}
