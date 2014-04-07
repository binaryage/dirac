/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 */
WebInspector.TracingModel = function()
{
    this.reset();
}

WebInspector.TracingModel.prototype = {
    reset: function()
    {
        this._processById = {};
        this._minimumRecordTime = null;
        this._maximumRecordTime = null;
    },

    /**
      * @param {!Array.<!WebInspector.TracingAgent.Event>} payload
      */
    addEvents: function(payload)
    {
        for (var i = 0; i < payload.length; ++i)
            this.addEvent(payload[i]);
    },

    /**
      * @param {!WebInspector.TracingAgent.Event} payload
      */
    addEvent: function(payload)
    {
        var process = this._processById[payload.pid];
        if (!process) {
            process = new WebInspector.TracingModel.Process(payload.pid);
            this._processById[payload.pid] = process;
        }
        if (payload.ph === WebInspector.TracingAgent.Phase.SnapshotObject) {
            process.addObject(payload);
            return;
        }
        var thread = process.threadById(payload.tid);
        if (payload.ph !== WebInspector.TracingAgent.Phase.Metadata) {
            var timestamp = payload.ts;
            // We do allow records for unrelated threads to arrive out-of-order,
            // so there's a chance we're getting records from the past.
            if (timestamp && (!this._minimumRecordTime || timestamp < this._minimumRecordTime))
                this._minimumRecordTime = timestamp;
            if (!this._maximumRecordTime || timestamp > this._maximumRecordTime)
                this._maximumRecordTime = timestamp;
            thread.addEvent(payload);
            return;
        }
        switch (payload.name) {
        case WebInspector.TracingAgent.MetadataEvent.ProcessSortIndex:
            process._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingAgent.MetadataEvent.ProcessName:
            process._setName(payload.args["name"]);
            break;
        case WebInspector.TracingAgent.MetadataEvent.ThreadSortIndex:
            thread._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingAgent.MetadataEvent.ThreadName:
            thread._setName(payload.args["name"]);
            break;
        }
    },

    /**
     * @return {?number}
     */
    minimumRecordTime: function()
    {
        return this._minimumRecordTime;
    },

    /**
     * @return {?number}
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
    }
}

/**
 * @constructor
 * @param {!WebInspector.TracingAgent.Event} payload
 * @param {number} level
 */
WebInspector.TracingModel.Event = function(payload, level)
{
    this.name = payload.name;
    this.category = payload.cat;
    this.startTime = payload.ts;
    this.args = payload.args;
    this.phase = payload.ph;
    this.level = level;
}

WebInspector.TracingModel.Event.prototype = {
    /**
     * @param {number} duration
     */
    _setDuration: function(duration)
    {
        this.endTime = this.startTime + duration;
        this.duration = duration;
    },

    /**
     * @param {!WebInspector.TracingAgent.Event} payload
     */
    _complete: function(payload)
    {
        if (this.name !== payload.name) {
            console.assert(false, "Open/close event mismatch: " + this.name + " vs. " + payload.name);
            return;
        }
        var duration = payload.ts - this.startTime;
        if (duration < 0) {
            console.assert(false, "Event out of order: " + this.name);
            return;
        }
        this._setDuration(duration);
    }
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
            thread = new WebInspector.TracingModel.Thread(id);
            this._threads[id] = thread;
        }
        return thread;
    },

    /**
     * @param {!WebInspector.TracingAgent.Event} event
     */
    addObject: function(event)
    {
        this.objectsByName(event.name).push(new WebInspector.TracingModel.Event(event, 0));
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
 * @param {number} id
 */
WebInspector.TracingModel.Thread = function(id)
{
    WebInspector.TracingModel.NamedObject.call(this);
    this._setName("Thread " + id);
    this._events = [];
    this._stack = [];
    this._maxStackDepth = 0;
}

WebInspector.TracingModel.Thread.prototype = {
    /**
     * @param {!WebInspector.TracingAgent.Event} payload
     */
    addEvent: function(payload)
    {
        for (var top = this._stack.peekLast(); top && top.endTime && top.endTime <= payload.ts;) {
            this._stack.pop();
            top = this._stack.peekLast();
        }
        if (payload.ph === WebInspector.TracingAgent.Phase.End) {
            var openEvent = this._stack.pop();
            // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
            if (openEvent)
                openEvent._complete(payload);
            return;
        }

        var event = new WebInspector.TracingModel.Event(payload, this._stack.length);
        if (payload.ph === WebInspector.TracingAgent.Phase.Begin || payload.ph === WebInspector.TracingAgent.Phase.Complete) {
            if (payload.ph === WebInspector.TracingAgent.Phase.Complete)
                event._setDuration(payload.dur);
            this._stack.push(event);
            if (this._maxStackDepth < this._stack.length)
                this._maxStackDepth = this._stack.length;
        }
        if (this._events.length && this._events.peekLast().startTime > event.startTime)
            console.assert(false, "Event is our of order: " + event.name);
        this._events.push(event);
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
