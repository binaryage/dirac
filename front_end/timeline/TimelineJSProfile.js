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
