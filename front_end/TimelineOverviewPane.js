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
 * @extends {WebInspector.View}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineOverviewPane = function(model)
{
    WebInspector.View.call(this);
    this.element.id = "timeline-overview-pane";

    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._eventDividers = [];

    this._model = model;

    this._overviewGrid = new WebInspector.OverviewGrid("timeline");
    this.element.appendChild(this._overviewGrid.element);

    this._overviewCalculator = new WebInspector.TimelineOverviewCalculator();

    model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
    model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._reset, this);
    this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
}

WebInspector.TimelineOverviewPane.Events = {
    WindowChanged: "WindowChanged"
};

WebInspector.TimelineOverviewPane.prototype = {
    wasShown: function()
    {
        this._update();
    },

    onResize: function()
    {
        this._update();
    },

    /**
     * @param {!WebInspector.TimelineOverviewBase} overviewControl
     */
    willSetOverviewControl: function(overviewControl)
    {
        this._sameOverviewControl = this._overviewControl === overviewControl;
        if (this._sameOverviewControl)
            return;
        this._windowTimes = null;
        if (this._overviewControl) {
            this._windowTimes = this._overviewControl.windowTimes(this.windowLeft(), this.windowRight());
            this._overviewControl.detach();
        }
        this._overviewControl = overviewControl;
        this._overviewControl.show(this._overviewGrid.element);
        this._update();
    },

    didSetOverviewControl: function()
    {
        if (this._sameOverviewControl)
            return;
        if (this._windowTimes && this._windowTimes.startTime >= 0)
            this.setWindowTimes(this._windowTimes.startTime, this._windowTimes.endTime);
        this._update();
    },

    _update: function()
    {
        delete this._refreshTimeout;

        this._updateWindow();
        this._overviewCalculator.setWindow(this._model.minimumRecordTime(), this._model.maximumRecordTime());
        this._overviewCalculator.setDisplayWindow(0, this._overviewGrid.clientWidth());

        this._overviewControl.update();
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._updateEventDividers();
    },

    _updateEventDividers: function()
    {
        var records = this._eventDividers;
        this._overviewGrid.removeEventDividers();
        var dividers = [];
        for (var i = 0; i < records.length; ++i) {
            var record = records[i];
            var positions = this._overviewCalculator.computeBarGraphPercentages(record);
            var dividerPosition = Math.round(positions.start * 10);
            if (dividers[dividerPosition])
                continue;
            var divider = WebInspector.TimelinePresentationModel.createEventDivider(record.type);
            divider.style.left = positions.start + "%";
            dividers[dividerPosition] = divider;
        }
        this._overviewGrid.addEventDividers(dividers);
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     */
    zoomToFrame: function(frame)
    {
        this.setWindowTimes(frame.startTime, frame.endTime);
        this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged);
    },

    _onRecordAdded: function(event)
    {
        var record = event.data;
        var eventDividers = this._eventDividers;
        function addEventDividers(record)
        {
            if (WebInspector.TimelinePresentationModel.isEventDivider(record))
                eventDividers.push(record);
        }
        WebInspector.TimelinePresentationModel.forAllRecords([record], addEventDividers);
        this._scheduleRefresh();
    },

    _reset: function()
    {
        this._windowStartTime = 0;
        this._windowEndTime = Infinity;
        this._overviewCalculator.reset();
        this._overviewGrid.reset();
        this._overviewGrid.setResizeEnabled(false);
        this._eventDividers = [];
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._overviewControl.reset();
        this._update();
    },

    windowStartTime: function()
    {
        return this._windowStartTime || this._model.minimumRecordTime();
    },

    windowEndTime: function()
    {
        return this._windowEndTime < Infinity ? this._windowEndTime : this._model.maximumRecordTime();
    },

    windowLeft: function()
    {
        return this._overviewGrid.windowLeft();
    },

    windowRight: function()
    {
        return this._overviewGrid.windowRight();
    },

    _onWindowChanged: function()
    {
        if (this._ignoreWindowChangedEvent)
            return;
        var times = this._overviewControl.windowTimes(this.windowLeft(), this.windowRight());
        this._windowStartTime = times.startTime;
        this._windowEndTime = times.endTime;
        this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged);
    },

    /**
     * @param {!Number} startTime
     * @param {!Number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._windowStartTime = startTime;
        this._windowEndTime = endTime;
        this._updateWindow();
    },

    _updateWindow: function()
    {
        var windowBoundaries = this._overviewControl.windowBoundaries(this._windowStartTime, this._windowEndTime);
        this._ignoreWindowChangedEvent = true;
        this._overviewGrid.setWindow(windowBoundaries.left, windowBoundaries.right);
        this._overviewGrid.setResizeEnabled(this._model.records.length);
        this._ignoreWindowChangedEvent = false;
    },

    _scheduleRefresh: function()
    {
        if (this._refreshTimeout)
            return;
        if (!this.isShowing())
            return;
        this._refreshTimeout = setTimeout(this._update.bind(this), 300);
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.TimelineOverviewCalculator = function()
{
}

WebInspector.TimelineOverviewCalculator.prototype = {
    /**
     * @param {number} time
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea + this.paddingLeft;
    },

    computeBarGraphPercentages: function(record)
    {
        var start = (WebInspector.TimelineModel.startTimeInSeconds(record) - this._minimumBoundary) / this.boundarySpan() * 100;
        var end = (WebInspector.TimelineModel.endTimeInSeconds(record) - this._minimumBoundary) / this.boundarySpan() * 100;
        return {start: start, end: end};
    },

    /**
     * @param {number=} minimum
     * @param {number=} maximum
     */
    setWindow: function(minimum, maximum)
    {
        this._minimumBoundary = minimum >= 0 ? minimum : undefined;
        this._maximumBoundary = maximum >= 0 ? maximum : undefined;
    },

    /**
     * @param {number} paddingLeft
     * @param {number} clientWidth
     */
    setDisplayWindow: function(paddingLeft, clientWidth)
    {
        this._workingArea = clientWidth - paddingLeft;
        this.paddingLeft = paddingLeft;
    },

    reset: function()
    {
        this.setWindow();
    },

    /**
     * @param {number} value
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        return Number.secondsToString(value, hires);
    },

    maximumBoundary: function()
    {
        return this._maximumBoundary;
    },

    minimumBoundary: function()
    {
        return this._minimumBoundary;
    },

    zeroTime: function()
    {
        return this._minimumBoundary;
    },

    boundarySpan: function()
    {
        return this._maximumBoundary - this._minimumBoundary;
    }
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineOverviewBase = function(model)
{
    WebInspector.View.call(this);
    this.element.classList.add("fill");

    this._model = model;
    this._canvas = this.element.createChild("canvas", "fill");
    this._context = this._canvas.getContext("2d");
}

WebInspector.TimelineOverviewBase.prototype = {
    update: function() { },
    reset: function() { },

    /**
     * @param {number} windowLeft
     * @param {number} windowRight
     */
    windowTimes: function(windowLeft, windowRight)
    {
        var absoluteMin = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - absoluteMin;
        return {
            startTime: absoluteMin + timeSpan * windowLeft,
            endTime: absoluteMin + timeSpan * windowRight
        };
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    windowBoundaries: function(startTime, endTime)
    {
        var absoluteMin = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - absoluteMin;
        var haveRecords = absoluteMin >= 0;
        return {
            left: haveRecords && startTime ? Math.min((startTime - absoluteMin) / timeSpan, 1) : 0,
            right: haveRecords && endTime < Infinity ? (endTime - absoluteMin) / timeSpan : 1
        }
    },

    resetCanvas: function()
    {
        this._canvas.width = this.element.clientWidth * window.devicePixelRatio;
        this._canvas.height = this.element.clientHeight * window.devicePixelRatio;
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TimelinePresentationModel.Filter}
 * @param {!WebInspector.TimelineOverviewPane} pane
 */
WebInspector.TimelineWindowFilter = function(pane)
{
    this._pane = pane;
}

WebInspector.TimelineWindowFilter.prototype = {
    /**
     * @param {!WebInspector.TimelinePresentationModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return record.lastChildEndTime >= this._pane._windowStartTime && record.startTime <= this._pane._windowEndTime;
    }
}
