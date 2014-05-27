// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.TimelineTraceEventBindings = function()
{
    this._resetProcessingState();
}

WebInspector.TimelineTraceEventBindings.prototype = {
    _resetProcessingState: function()
    {
        this._sendRequestEvents = {};
        this._timerEvents = {};
        this._requestAnimationFrameEvents = {};
        this._layoutInvalidate = {};
        this._lastScheduleStyleRecalculation = {};
        this._webSocketCreateEvents = {};

        this._lastRecalculateStylesEvent = null;
        this._currentScriptEvent = null;
        this._lastMainThreadEvent = null;
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     */
    setEvents: function(events)
    {
        this._resetProcessingState();
        for (var i = 0, length = events.length; i < length; i++)
            this._processMainThreadEvent(events[i]);
        this._resetProcessingState();
    },

    _processMainThreadEvent: function(event)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;

        if (this._currentScriptEvent && event.startTime > this._currentScriptEvent.endTime)
            this._currentScriptEvent = null;

        switch (event.name) {
        case recordTypes.CallStack:
            if (this._lastMainThreadEvent)
                this._lastMainThreadEvent.stackTrace = event.args.stack;
            break

        case recordTypes.ResourceSendRequest:
            this._sendRequestEvents[event.args.data["requestId"]] = event;
            break;

        case recordTypes.ResourceReceiveResponse:
        case recordTypes.ResourceReceivedData:
        case recordTypes.ResourceFinish:
            event.initiator = this._sendRequestEvents[event.args.data["requestId"]];
            break;

        case recordTypes.TimerInstall:
            this._timerEvents[event.args.data["timerId"]] = event;
            break;

        case recordTypes.TimerFire:
            event.initiator = this._timerEvents[event.args.data["timerId"]];
            break;

        case recordTypes.RequestAnimationFrame:
            this._requestAnimationFrameEvents[event.args.data["id"]] = event;
            break;

        case recordTypes.FireAnimationFrame:
            event.initiator = this._requestAnimationFrameEvents[event.args.data["id"]];
            break;

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[event.args.frame] = event;
            break;

        case recordTypes.RecalculateStyles:
            event.initiator = this._lastScheduleStyleRecalculation[event.args.frame];
            this._lastRecalculateStylesEvent = event;
            break;

        case recordTypes.InvalidateLayout:
            // Consider style recalculation as a reason for layout invalidation,
            // but only if we had no earlier layout invalidation records.
            var layoutInitator = event;
            var frameId = event.args.frame;
            if (!this._layoutInvalidate[frameId] && this._lastRecalculateStylesEvent && this._lastRecalculateStylesEvent.endTime >  event.startTime)
                layoutInitator = this._lastRecalculateStylesEvent.initiator;
            this._layoutInvalidate[frameId] = layoutInitator;
            break;

        case recordTypes.Layout:
            var frameId = event.args["beginData"]["frame"];
            event.initiator = this._layoutInvalidate[frameId];
            this._layoutInvalidate[frameId] = null;
            if (this._currentScriptEvent)
                event.warning = WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck.");
            break;

        case recordTypes.WebSocketCreate:
            this._webSocketCreateEvents[event.args.data["identifier"]] = event;
            break;

        case recordTypes.WebSocketSendHandshakeRequest:
        case recordTypes.WebSocketReceiveHandshakeResponse:
        case recordTypes.WebSocketDestroy:
            event.initiator = this._webSocketCreateEvents[event.args.data["identifier"]];
            break;

        case WebInspector.TimelineModel.RecordType.EvaluateScript:
        case WebInspector.TimelineModel.RecordType.FunctionCall:
            if (!this._currentScriptEvent)
                this._currentScriptEvent = event;
            break;
        }
        this._lastMainThreadEvent = event;
    }
}

