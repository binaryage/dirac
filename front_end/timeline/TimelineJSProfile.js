// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


WebInspector.TimelineJSProfileProcessor = { };

/**
 * @param {!WebInspector.TimelineModelImpl} timelineModel
 * @param {!ProfilerAgent.CPUProfile} jsProfile
 */
WebInspector.TimelineJSProfileProcessor.mergeJSProfileIntoTimeline = function(timelineModel, jsProfile)
{
    if (!jsProfile.samples)
        return;
    var jsProfileModel = new WebInspector.CPUProfileDataModel(jsProfile);
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;
    var gcNode = jsProfileModel.gcNode;

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    function processRecord(record)
    {
        if (record.type() !== WebInspector.TimelineModel.RecordType.FunctionCall &&
            record.type() !== WebInspector.TimelineModel.RecordType.EvaluateScript)
            return;
        var recordStartTime = record.startTime();
        var recordEndTime = record.endTime();
        var originalChildren = record.children().splice(0);
        var childIndex = 0;

        /**
         * @param {number} depth
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @param {number} startTime
         */
        function onOpenFrame(depth, node, startTime)
        {
            if (node === idleNode || node === programNode || node === gcNode)
                return;
            var event = {
                type: "JSFrame",
                data: node,
                startTime: startTime
            };
            putOriginalChildrenUpToTime(startTime);
            record = new WebInspector.TimelineModel.RecordImpl(timelineModel, event, record);
        }

        /**
         * @param {number} depth
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @param {number} startTime
         * @param {number} totalTime
         * @param {number} selfTime
         */
        function onCloseFrame(depth, node, startTime, totalTime, selfTime)
        {
            if (node === idleNode || node === programNode || node === gcNode)
                return;
            record.setEndTime(Math.min(startTime + totalTime, recordEndTime));
            record._selfTime = record.endTime() - record.startTime();
            putOriginalChildrenUpToTime(record.endTime());
            var deoptReason = node.deoptReason;
            if (deoptReason && deoptReason !== "no reason")
                record.addWarning(deoptReason);
            record = record.parent;
        }

        /**
         * @param {number} endTime
         */
        function putOriginalChildrenUpToTime(endTime)
        {
            for (; childIndex < originalChildren.length; ++childIndex)  {
                var child = originalChildren[childIndex];
                var midTime = (child.startTime() + child.endTime()) / 2;
                if (midTime >= endTime)
                    break;
                child.parent = record;
                record.children().push(child);
            }
        }

        jsProfileModel.forEachFrame(onOpenFrame, onCloseFrame, recordStartTime, recordEndTime);
        putOriginalChildrenUpToTime(recordEndTime);
    }

    timelineModel.forAllRecords(processRecord);
}

/**
 * @param {!WebInspector.TracingTimelineModel} timelineModel
 * @param {!ProfilerAgent.CPUProfile} jsProfile
 * @return {!Array.<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile = function(timelineModel, jsProfile)
{
    if (!jsProfile.samples)
        return [];
    var jsProfileModel = new WebInspector.CPUProfileDataModel(jsProfile);
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;
    var gcNode = jsProfileModel.gcNode;
    var samples = jsProfileModel.samples;
    var timestamps = jsProfileModel.timestamps;
    var jsEvents = [];
    var mainThread = timelineModel.mainThreadEvents()[0].thread;
    for (var i = 0; i < samples.length; ++i) {
        var node = jsProfileModel.nodeByIndex(i);
        if (node === programNode || node === gcNode || node === idleNode)
            continue;
        var stackTrace = node._stackTraceArray;
        if (!stackTrace) {
            stackTrace = /** @type {!ConsoleAgent.StackTrace} */ (new Array(node.depth + 1));
            node._stackTraceArray = stackTrace;
            for (var j = 0; node.parent; node = node.parent)
                stackTrace[j++] = /** @type {!ConsoleAgent.CallFrame} */ (node);
        }
        var payload = /** @type {!WebInspector.TracingModel.EventPayload} */ ({
            ph: WebInspector.TracingModel.Phase.Instant,
            cat: WebInspector.TracingModel.DevToolsMetadataEventCategory,
            name: WebInspector.TracingTimelineModel.RecordType.JSSample,
            ts: timestamps[i] * 1000,
            args: { }
        });
        var jsEvent = new WebInspector.TracingModel.Event(payload, 0, mainThread);
        jsEvent.stackTrace = stackTrace;
        jsEvents.push(jsEvent);
    }
    return jsEvents;
}
