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
 * @extends {WebInspector.VBox}
 */
WebInspector.TimelineOverviewPane = function()
{
    WebInspector.VBox.call(this);
    this.element.id = "timeline-overview-pane";

    this._overviewCalculator = new WebInspector.TimelineOverviewCalculator();
    this._overviewCalculator._setWindow(0, 1000);

    this._overviewGrid = new WebInspector.OverviewGrid("timeline");
    this.element.appendChild(this._overviewGrid.element);

    this._overviewGrid.setResizeEnabled(false);
    this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
    this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.Click, this._onClick, this);
    this._overviewControls = [];
    this._markers = new Map();
}

WebInspector.TimelineOverviewPane.Events = {
    WindowChanged: "WindowChanged",
    SelectionChanged: "SelectionChanged"
};

WebInspector.TimelineOverviewPane.prototype = {
    /**
     * @override
     */
    wasShown: function()
    {
        this.update();
    },

    /**
     * @override
     */
    onResize: function()
    {
        this.update();
    },

    /**
     * @param {!Array.<!WebInspector.TimelineOverview>} overviewControls
     */
    setOverviewControls: function(overviewControls)
    {
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].dispose();

        for (var i = 0; i < overviewControls.length; ++i) {
            overviewControls[i].show(this._overviewGrid.element);
            if (this._currentSelection)
                overviewControls[i].select(this._currentSelection);
        }
        this._overviewControls = overviewControls;
        this.update();
    },

    /**
     * @param {number} minimumBoundary
     * @param {number} maximumBoundary
     */
    setBounds: function(minimumBoundary, maximumBoundary)
    {
        this._overviewCalculator._setWindow(minimumBoundary, maximumBoundary);
        this._overviewGrid.setResizeEnabled(true);
    },

    update: function()
    {
        if (!this.isShowing())
            return;
        this._overviewCalculator._setDisplayWindow(0, this._overviewGrid.clientWidth());
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].update();
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._updateMarkers();
        this._updateWindow();
    },

    /**
     * @param {?WebInspector.TimelineSelection} selection
     */
    select: function(selection)
    {
        this._currentSelection = selection;
        for (var overviewControl of this._overviewControls)
            overviewControl.select(selection);
    },

    /**
     * @param {!Map<number, !Element>} markers
     */
    setMarkers: function(markers)
    {
        this._markers = markers;
        this._updateMarkers();
    },

    _updateMarkers: function()
    {
        var filteredMarkers = new Map();
        for (var time of this._markers.keys()) {
            var marker = this._markers.get(time);
            var position = Math.round(this._overviewCalculator.computePosition(time));
            // Limit the number of markers to one per pixel.
            if (filteredMarkers.has(position))
                continue;
            filteredMarkers.set(position, marker);
            marker.style.left = position + "px";
        }
        this._overviewGrid.removeEventDividers();
        this._overviewGrid.addEventDividers(filteredMarkers.valuesArray());
    },

    reset: function()
    {
        this._overviewCalculator.reset();
        this._overviewGrid.reset();
        this._overviewGrid.setResizeEnabled(false);
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._markers = new Map();
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].reset();
        this.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onClick: function(event)
    {
        var domEvent = /** @type {!Event} */ (event.data);
        var selection;
        for (var overviewControl of this._overviewControls) {
            selection = overviewControl.selectionFromEvent(domEvent);
            if (selection)
                break;
        }
        if (typeof selection !== "object")
            return;
        event.preventDefault();
        this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.SelectionChanged, selection);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWindowChanged: function(event)
    {
        if (this._muteOnWindowChanged)
            return;
        // Always use first control as a time converter.
        if (!this._overviewControls.length)
            return;
        var windowTimes = this._overviewControls[0].windowTimes(this._overviewGrid.windowLeft(), this._overviewGrid.windowRight());
        this._windowStartTime = windowTimes.startTime;
        this._windowEndTime = windowTimes.endTime;
        this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged, windowTimes);
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime)
    {
        if (startTime === this._windowStartTime && endTime === this._windowEndTime)
            return;
        this._windowStartTime = startTime;
        this._windowEndTime = endTime;
        this._updateWindow();
        this.dispatchEventToListeners(WebInspector.TimelineOverviewPane.Events.WindowChanged, { startTime: startTime, endTime: endTime });
    },

    _updateWindow: function()
    {
        if (!this._overviewControls.length)
            return;
        var windowBoundaries = this._overviewControls[0].windowBoundaries(this._windowStartTime, this._windowEndTime);
        this._muteOnWindowChanged = true;
        this._overviewGrid.setWindow(windowBoundaries.left, windowBoundaries.right);
        this._muteOnWindowChanged = false;
    },

    __proto__: WebInspector.VBox.prototype
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
     * @override
     * @return {number}
     */
    paddingLeft: function()
    {
        return this._paddingLeft;
    },

    /**
     * @override
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea + this._paddingLeft;
    },

    /**
     * @param {number=} minimumRecordTime
     * @param {number=} maximumRecordTime
     */
    _setWindow: function(minimumRecordTime, maximumRecordTime)
    {
        this._minimumBoundary = minimumRecordTime;
        this._maximumBoundary = maximumRecordTime;
    },

    /**
     * @param {number} paddingLeft
     * @param {number} clientWidth
     */
    _setDisplayWindow: function(paddingLeft, clientWidth)
    {
        this._workingArea = clientWidth - paddingLeft;
        this._paddingLeft = paddingLeft;
    },

    reset: function()
    {
        this._setWindow(0, 1000);
    },

    /**
     * @override
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatTime: function(value, precision)
    {
        return Number.preciseMillisToString(value - this.zeroTime(), precision);
    },

    /**
     * @override
     * @return {number}
     */
    maximumBoundary: function()
    {
        return this._maximumBoundary;
    },

    /**
     * @override
     * @return {number}
     */
    minimumBoundary: function()
    {
        return this._minimumBoundary;
    },

    /**
     * @override
     * @return {number}
     */
    zeroTime: function()
    {
        return this._minimumBoundary;
    },

    /**
     * @override
     * @return {number}
     */
    boundarySpan: function()
    {
        return this._maximumBoundary - this._minimumBoundary;
    }
}

/**
 * @interface
 */
WebInspector.TimelineOverview = function(model)
{
}

WebInspector.TimelineOverview.prototype = {
    /**
     * @param {?Element} parentElement
     * @param {!Element=} insertBefore
     */
    show: function(parentElement, insertBefore) { },

    update: function() { },

    dispose: function() { },

    reset: function() { },

    /**
     * @param {!WebInspector.TimelineSelection} selection
     */
    select: function(selection) { },

    /**
     * @param {!Event} event
     * @return {?WebInspector.TimelineSelection|undefined}
     */
    selectionFromEvent: function(event) { },

    /**
     * @param {number} windowLeft
     * @param {number} windowRight
     * @return {!{startTime: number, endTime: number}}
     */
    windowTimes: function(windowLeft, windowRight) { },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {!{left: number, right: number}}
     */
    windowBoundaries: function(startTime, endTime) { },

    timelineStarted: function() { },

    timelineStopped: function() { },
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TimelineOverview}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineOverviewBase = function(model)
{
    WebInspector.VBox.call(this);

    this._model = model;
    this._canvas = this.element.createChild("canvas", "fill");
    this._context = this._canvas.getContext("2d");
}

WebInspector.TimelineOverviewBase.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
    },

    /**
     * @override
     */
    dispose: function()
    {
        this.detach();
    },

    /**
     * @override
     */
    reset: function()
    {
    },

    /**
     * @override
     */
    timelineStarted: function()
    {
    },

    /**
     * @override
     */
    timelineStopped: function()
    {
    },

    /**
     * @override
     * @param {!WebInspector.TimelineSelection} selection
     */
    select: function(selection) { },

    /**
     * @override
     * @param {!Event} event
     * @return {?WebInspector.TimelineSelection|undefined}
     */
    selectionFromEvent: function(event)
    {
        return undefined;
    },

    /**
     * @override
     * @param {number} windowLeft
     * @param {number} windowRight
     * @return {!{startTime: number, endTime: number}}
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
     * @override
     * @param {number} startTime
     * @param {number} endTime
     * @return {!{left: number, right: number}}
     */
    windowBoundaries: function(startTime, endTime)
    {
        var absoluteMin = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - absoluteMin;
        var haveRecords = absoluteMin > 0;
        return {
            left: haveRecords && startTime ? Math.min((startTime - absoluteMin) / timeSpan, 1) : 0,
            right: haveRecords && endTime < Infinity ? (endTime - absoluteMin) / timeSpan : 1
        };
    },

    resetCanvas: function()
    {
        this._canvas.width = this.element.clientWidth * window.devicePixelRatio;
        this._canvas.height = this.element.clientHeight * window.devicePixelRatio;
    },

    __proto__: WebInspector.VBox.prototype
}
