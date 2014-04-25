// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


WebInspector.TimelineJSProfileProcessor = { };

/**
 * @param {!WebInspector.TimelineModel} timelineModel
 * @param {!ProfilerAgent.CPUProfile} jsProfile
 */
WebInspector.TimelineJSProfileProcessor.mergeJSProfileIntoTimeline = function(timelineModel, jsProfile)
{
    if (!jsProfile.samples)
        return;
    var jsProfileModel = new WebInspector.CPUProfileDataModel(jsProfile);
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    function processRecord(record)
    {
        if (record.type !== WebInspector.TimelineModel.RecordType.FunctionCall &&
            record.type !== WebInspector.TimelineModel.RecordType.EvaluateScript)
            return;
        var recordStartTime = record.startTime();
        var recordEndTime = record.endTime();
        var parentRecord = record;

        // FIXME: current children should go into appropriate JS Frame records.
        record.children.splice(0, record.children.length);

        /**
         * @param {number} depth
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @param {number} startTime
         */
        function onOpenFrame(depth, node, startTime)
        {
            if (node === idleNode || node === programNode)
                return;
            var event = {
                type: "JSFrame",
                data: node,
                startTime: startTime
            };
            parentRecord = new WebInspector.TimelineModel.Record(timelineModel, event, parentRecord);
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
            if (node === idleNode || node === programNode)
                return;
            parentRecord.setEndTime(Math.min(startTime + totalTime, recordEndTime));
            parentRecord._selfTime = parentRecord.endTime() - parentRecord.startTime();
            parentRecord = parentRecord.parent;
        }

        jsProfileModel.forEachFrame(onOpenFrame, onCloseFrame, recordStartTime, recordEndTime);
    }

    timelineModel.forAllRecords(processRecord);
}
