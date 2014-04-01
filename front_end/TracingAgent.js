/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.TracingAgent = function()
{
    WebInspector.Object.call(this);
    this._active = false;
    InspectorBackend.registerTracingDispatcher(new WebInspector.TracingDispatcher(this));
}

WebInspector.TracingAgent.Events = {
    EventsCollected: "EventsCollected"
};

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
WebInspector.TracingAgent.Event;

/**
 * @enum {string}
 */
WebInspector.TracingAgent.Phase = {
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

WebInspector.TracingAgent.MetadataEvent = {
    ProcessSortIndex: "process_sort_index",
    ProcessName: "process_name",
    ThreadSortIndex: "thread_sort_index",
    ThreadName: "thread_name"
}

WebInspector.TracingAgent.prototype = {
    /**
     * @param {string} categoryPatterns
     * @param {string} options
     * @param {function(?string)=} callback
     */
    start: function(categoryPatterns, options, callback)
    {
        TracingAgent.start(categoryPatterns, options, callback);
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

    _eventsCollected: function(events)
    {
        this.dispatchEventToListeners(WebInspector.TracingAgent.Events.EventsCollected, events);
    },

    _tracingComplete: function()
    {
        this._active = false;
        if (!this._pendingStopCallback)
            return;
        this._pendingStopCallback();
        this._pendingStopCallback = null;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {TracingAgent.Dispatcher}
 * @param {!WebInspector.TracingAgent} tracingAgent
 */
WebInspector.TracingDispatcher = function(tracingAgent)
{
    this._tracingAgent = tracingAgent;
}

WebInspector.TracingDispatcher.prototype = {
    dataCollected: function(data)
    {
        this._tracingAgent._eventsCollected(data);
    },

    tracingComplete: function()
    {
        this._tracingAgent._tracingComplete();
    }
}

/**
 * @type {!WebInspector.TracingAgent}
 */
WebInspector.tracingAgent;
