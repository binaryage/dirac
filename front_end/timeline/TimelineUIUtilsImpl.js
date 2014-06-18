// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.TimelineUIUtils}
 */
WebInspector.TimelineUIUtilsImpl = function()
{
    WebInspector.TimelineUIUtils.call(this);
}

WebInspector.TimelineUIUtilsImpl.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isBeginFrame: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.BeginFrame;
    },
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isProgram: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.Program;
    },
    /**
     * @param {string} recordType
     * @return {boolean}
     */
    isCoalescable: function(recordType)
    {
        return !!WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[recordType];
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {?Object}
     */
    countersForRecord: function(record)
    {
        return record.type() === WebInspector.TimelineModel.RecordType.UpdateCounters ? record.data() : null;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {?Object}
     */
    highlightQuadForRecord: function(record)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        switch(record.type()) {
        case recordTypes.Layout:
            return record.data().root;
        case recordTypes.Paint:
            return record.data().clip;
        default:
            return null;
        }
    },

    __proto__: WebInspector.TimelineUIUtils.prototype
}


WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes = {};
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Layout] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Paint] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.Rasterize] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.DecodeImage] = 1;
WebInspector.TimelineUIUtilsImpl._coalescableRecordTypes[WebInspector.TimelineModel.RecordType.ResizeImage] = 1;
