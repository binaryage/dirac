/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
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
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelinePresentationModel = function(model)
{
    this._model = model;
    this._filters = [];
    /**
     * @type {!Map.<!WebInspector.TimelineModel.Record, !WebInspector.TimelinePresentationModel.Record>}
     */
    this._recordToPresentationRecord = new Map();
    this.reset();
}

WebInspector.TimelinePresentationModel._coalescingRecords = { };
WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Layout] = 1;
WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Paint] = 1;
WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.Rasterize] = 1;
WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.DecodeImage] = 1;
WebInspector.TimelinePresentationModel._coalescingRecords[WebInspector.TimelineModel.RecordType.ResizeImage] = 1;

WebInspector.TimelinePresentationModel.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._windowStartTime = startTime;
        this._windowEndTime = endTime;
    },

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     * @return {?WebInspector.TimelinePresentationModel.Record}
     */
    toPresentationRecord: function(record)
    {
        return record ? this._recordToPresentationRecord.get(record) || null : null;
    },

    /**
     * @return {!WebInspector.TimelinePresentationModel.Record}
     */
    rootRecord: function()
    {
        return this._rootRecord;
    },

    reset: function()
    {
        this._recordToPresentationRecord.clear();
        var rootPayload = { type: WebInspector.TimelineModel.RecordType.Root };
        var rootRecord = new WebInspector.TimelineModel.Record(this._model, /** @type {!TimelineAgent.TimelineEvent} */ (rootPayload), null);
        this._rootRecord = new WebInspector.TimelinePresentationModel.Record(rootRecord, null);
        /** @type {!Object.<string, !WebInspector.TimelinePresentationModel.Record>} */
        this._coalescingBuckets = {};
        this._windowStartTime = 0;
        this._windowEndTime = Infinity;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    addRecord: function(record)
    {
        var records;
        if (record.type === WebInspector.TimelineModel.RecordType.Program)
            records = record.children;
        else
            records = [record];

        for (var i = 0; i < records.length; ++i)
            this._innerAddRecord(this._rootRecord, records[i]);
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} parentRecord
     * @param {!WebInspector.TimelineModel.Record} record
     */
    _innerAddRecord: function(parentRecord, record)
    {
        var coalescingBucket;

        // On main thread, only coalesce if the last event is of same type.
        if (parentRecord === this._rootRecord)
            coalescingBucket = record.thread ? record.type : "mainThread";
        var coalescedRecord = this._findCoalescedParent(record, parentRecord, coalescingBucket);
        if (coalescedRecord)
            parentRecord = coalescedRecord;

        var formattedRecord = new WebInspector.TimelinePresentationModel.Record(record, parentRecord);
        this._recordToPresentationRecord.put(record, formattedRecord);

        formattedRecord._collapsed = parentRecord === this._rootRecord;
        if (coalescingBucket)
            this._coalescingBuckets[coalescingBucket] = formattedRecord;

        for (var i = 0; record.children && i < record.children.length; ++i)
            this._innerAddRecord(formattedRecord, record.children[i]);

        if (parentRecord._coalesced)
            this._updateCoalescingParent(formattedRecord);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {!WebInspector.TimelinePresentationModel.Record} newParent
     * @param {string=} bucket
     * @return {?WebInspector.TimelinePresentationModel.Record}
     */
    _findCoalescedParent: function(record, newParent, bucket)
    {
        const coalescingThresholdMillis = 5;

        var lastRecord = bucket ? this._coalescingBuckets[bucket] : newParent._presentationChildren.peekLast();
        if (lastRecord && lastRecord._coalesced)
            lastRecord = lastRecord._presentationChildren.peekLast();
        var startTime = record.startTime;
        var endTime = record.endTime;
        if (!lastRecord)
            return null;
        if (lastRecord.record().type !== record.type)
            return null;
        if (!WebInspector.TimelinePresentationModel._coalescingRecords[record.type])
            return null;
        if (lastRecord.record().endTime + coalescingThresholdMillis < startTime)
            return null;
        if (endTime + coalescingThresholdMillis < lastRecord.record().startTime)
            return null;
        if (lastRecord.presentationParent()._coalesced)
            return lastRecord.presentationParent();
        return this._replaceWithCoalescedRecord(lastRecord);
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} presentationRecord
     * @return {!WebInspector.TimelinePresentationModel.Record}
     */
    _replaceWithCoalescedRecord: function(presentationRecord)
    {
        var record = presentationRecord.record();
        var rawRecord = {
            type: record.type,
            startTime: record.startTime,
            endTime: record.endTime,
            data: { }
        };
        if (record.thread)
            rawRecord.thread = "aggregated";
        if (record.type === WebInspector.TimelineModel.RecordType.TimeStamp)
            rawRecord.data["message"] = record.data.message;

        var modelRecord = new WebInspector.TimelineModel.Record(this._model, /** @type {!TimelineAgent.TimelineEvent} */ (rawRecord), null);
        var coalescedRecord = new WebInspector.TimelinePresentationModel.Record(modelRecord, null);
        var parent = presentationRecord._presentationParent;

        coalescedRecord._coalesced = true;
        coalescedRecord._collapsed = true;
        coalescedRecord._presentationChildren.push(presentationRecord);
        presentationRecord._presentationParent = coalescedRecord;
        if (presentationRecord.hasWarnings() || presentationRecord.childHasWarnings())
            coalescedRecord._childHasWarnings = true;

        coalescedRecord._presentationParent = parent;
        parent._presentationChildren[parent._presentationChildren.indexOf(presentationRecord)] = coalescedRecord;
        WebInspector.TimelineUIUtils.aggregateTimeByCategory(modelRecord.aggregatedStats, record.aggregatedStats);

        return coalescedRecord;
    },

    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} presentationRecord
     */
    _updateCoalescingParent: function(presentationRecord)
    {
        var record = presentationRecord.record();
        var parentRecord = presentationRecord._presentationParent.record();
        WebInspector.TimelineUIUtils.aggregateTimeByCategory(parentRecord.aggregatedStats, record.aggregatedStats);
        if (parentRecord.startTime > record.startTime)
            parentRecord.startTime = record.startTime;
        if (parentRecord.endTime < record.endTime) {
            parentRecord.endTime = record.endTime;
            parentRecord.lastChildEndTime = parentRecord.endTime;
        }
    },

    /**
     * @param {?RegExp} textFilter
     */
    setTextFilter: function(textFilter)
    {
        this._textFilter = textFilter;
    },

    invalidateFilteredRecords: function()
    {
        delete this._filteredRecords;
    },

    /**
     * @return {!Array.<!WebInspector.TimelinePresentationModel.Record>}
     */
    filteredRecords: function()
    {
        if (this._filteredRecords)
            return this._filteredRecords;

        var recordsInWindow = [];

        var stack = [{children: this._rootRecord._presentationChildren, index: 0, parentIsCollapsed: false, parentRecord: {}}];
        var revealedDepth = 0;

        function revealRecordsInStack() {
            for (var depth = revealedDepth + 1; depth < stack.length; ++depth) {
                if (stack[depth - 1].parentIsCollapsed) {
                    stack[depth].parentRecord._presentationParent._expandable = true;
                    return;
                }
                stack[depth - 1].parentRecord._collapsed = false;
                recordsInWindow.push(stack[depth].parentRecord);
                stack[depth].windowLengthBeforeChildrenTraversal = recordsInWindow.length;
                stack[depth].parentIsRevealed = true;
                revealedDepth = depth;
            }
        }

        while (stack.length) {
            var entry = stack[stack.length - 1];
            var records = entry.children;
            if (records && entry.index < records.length) {
                var record = records[entry.index];
                ++entry.index;
                var rawRecord = record.record();
                if (rawRecord.startTime < this._windowEndTime && rawRecord.endTime > this._windowStartTime) {
                    if (this._model.isVisible(rawRecord)) {
                        record._presentationParent._expandable = true;
                        if (this._textFilter)
                            revealRecordsInStack();
                        if (!entry.parentIsCollapsed) {
                            recordsInWindow.push(record);
                            revealedDepth = stack.length;
                            entry.parentRecord._collapsed = false;
                        }
                    }
                }

                record._expandable = false;

                stack.push({children: record._presentationChildren,
                            index: 0,
                            parentIsCollapsed: entry.parentIsCollapsed || (record._collapsed && (!this._textFilter || record._expandedOrCollapsedWhileFiltered)),
                            parentRecord: record,
                            windowLengthBeforeChildrenTraversal: recordsInWindow.length});
            } else {
                stack.pop();
                revealedDepth = Math.min(revealedDepth, stack.length - 1);
                entry.parentRecord._visibleChildrenCount = recordsInWindow.length - entry.windowLengthBeforeChildrenTraversal;
            }
        }

        this._filteredRecords = recordsInWindow;
        return recordsInWindow;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {?WebInspector.TimelinePresentationModel.Record} parentRecord
 */
WebInspector.TimelinePresentationModel.Record = function(record, parentRecord)
{
    this._record = record;
    /**
     * @type {!Array.<!WebInspector.TimelinePresentationModel.Record>}
     */
    this._presentationChildren = [];

    if (parentRecord) {
        this._presentationParent = parentRecord;
        parentRecord._presentationChildren.push(this);
    }

    if (this.hasWarnings()) {
        for (var parent = this._presentationParent; parent && !parent._childHasWarnings; parent = parent._presentationParent)
            parent._childHasWarnings = true;
    }

    if (parentRecord && parentRecord.callSiteStackTrace)
        this.callSiteStackTrace = parentRecord.callSiteStackTrace;
}

WebInspector.TimelinePresentationModel.Record.prototype = {
    /**
     * @return {!WebInspector.TimelineModel.Record}
     */
    record: function()
    {
        return this._record;
    },

    /**
     * @return {!Array.<!WebInspector.TimelinePresentationModel.Record>}
     */
    presentationChildren: function()
    {
        return this._presentationChildren;
    },

    /**
     * @return {boolean}
     */
    coalesced: function()
    {
        return this._coalesced;
    },

    /**
     * @return {boolean}
     */
    collapsed: function()
    {
        return this._collapsed;
    },

    /**
     * @param {boolean} collapsed
     */
    setCollapsed: function(collapsed)
    {
        this._collapsed = collapsed;
        this._expandedOrCollapsedWhileFiltered = true;
    },

    /**
     * @return {?WebInspector.TimelinePresentationModel.Record}
     */
    presentationParent: function()
    {
        return this._presentationParent || null;
    },

    /**
     * @return {number}
     */
    visibleChildrenCount: function()
    {
        return this._visibleChildrenCount || 0;
    },

    /**
     * @return {boolean}
     */
    expandable: function()
    {
        return !!this._expandable;
    },

    /**
     * @return {boolean}
     */
    hasWarnings: function()
    {
        return !!this._record.warnings();
    },

    /**
     * @return {boolean}
     */
    childHasWarnings: function()
    {
        return this._childHasWarnings;
    },

    /**
     * @return {?WebInspector.TimelineRecordListRow}
     */
    listRow: function()
    {
        return this._listRow;
    },

    /**
     * @param {!WebInspector.TimelineRecordListRow} listRow
     */
    setListRow: function(listRow)
    {
        this._listRow = listRow;
    },

    /**
     * @return {?WebInspector.TimelineRecordGraphRow}
     */
    graphRow: function()
    {
        return this._graphRow;
    },

    /**
     * @param {!WebInspector.TimelineRecordGraphRow} graphRow
     */
    setGraphRow: function(graphRow)
    {
        this._graphRow = graphRow;
    }
}
