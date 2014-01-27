/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @extends {WebInspector.SidebarView}
 * @param {!WebInspector.TimelineView} timelineView
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.MemoryStatistics = function(timelineView, model)
{
    WebInspector.SidebarView.call(this, WebInspector.SidebarView.SidebarPosition.Start, undefined);
    this.element.id = "memory-graphs-container";

    this._timelineView = timelineView;

    this._counters = [];

    model.addEventListener(WebInspector.TimelineModel.Events.RecordAdded, this._onRecordAdded, this);
    model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);

    this._canvasContainer = this.mainElement();
    this._canvasContainer.id = "memory-graphs-canvas-container";
    this._createCurrentValuesBar();
    this._canvas = this._canvasContainer.createChild("canvas", "fill");
    this._canvas.id = "memory-counters-graph";
    this._lastMarkerXPosition = 0;

    this._canvas.addEventListener("mouseover", this._onMouseOver.bind(this), true);
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this), true);
    this._canvas.addEventListener("mouseout", this._onMouseOut.bind(this), true);
    this._canvas.addEventListener("click", this._onClick.bind(this), true);
    // We create extra timeline grid here to reuse its event dividers.
    this._timelineGrid = new WebInspector.TimelineGrid();
    this._canvasContainer.appendChild(this._timelineGrid.dividersElement);

    // Populate sidebar
    this.sidebarElement().createChild("div", "sidebar-tree sidebar-tree-section").textContent = WebInspector.UIString("COUNTERS");
    this._counterUI = this._createCounterUIList();
}

/**
 * @constructor
 * @param {number} time
 */
WebInspector.MemoryStatistics.Counter = function(time)
{
    this.time = time;
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.SwatchCheckbox = function(title, color)
{
    this.element = document.createElement("div");
    this._swatch = this.element.createChild("div", "swatch");
    this.element.createChild("span", "title").textContent = title;
    this._color = color;
    this.checked = true;

    this.element.addEventListener("click", this._toggleCheckbox.bind(this), true);
}

WebInspector.SwatchCheckbox.Events = {
    Changed: "Changed"
}

WebInspector.SwatchCheckbox.prototype = {
    get checked()
    {
        return this._checked;
    },

    set checked(v)
    {
        this._checked = v;
        if (this._checked)
            this._swatch.style.backgroundColor = this._color;
        else
            this._swatch.style.backgroundColor = "";
    },

    _toggleCheckbox: function(event)
    {
        this.checked = !this.checked;
        this.dispatchEventToListeners(WebInspector.SwatchCheckbox.Events.Changed);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 */
WebInspector.CounterUIBase = function(memoryCountersPane, title, graphColor, valueGetter)
{
    this._memoryCountersPane = memoryCountersPane;
    this.valueGetter = valueGetter;
    var container = memoryCountersPane.sidebarElement().createChild("div", "memory-counter-sidebar-info");
    var swatchColor = graphColor;
    this._swatch = new WebInspector.SwatchCheckbox(WebInspector.UIString(title), swatchColor);
    this._swatch.addEventListener(WebInspector.SwatchCheckbox.Events.Changed, this._toggleCounterGraph.bind(this));
    container.appendChild(this._swatch.element);

    this._value = null;
    this.graphColor =graphColor;
    this.strokeColor = graphColor;
    this.graphYValues = [];
}

WebInspector.CounterUIBase.prototype = {
    _toggleCounterGraph: function(event)
    {
        if (this._swatch.checked)
            this._value.classList.remove("hidden");
        else
            this._value.classList.add("hidden");
        this._memoryCountersPane.refresh();
    },

    updateCurrentValue: function(countersEntry)
    {
        this._value.textContent = Number.bytesToString(this.valueGetter(countersEntry));
    },

    clearCurrentValueAndMarker: function(ctx)
    {
        this._value.textContent = "";
    },

    get visible()
    {
        return this._swatch.checked;
    },
}

WebInspector.MemoryStatistics.prototype = {
    _createCurrentValuesBar: function()
    {
        throw new Error("Not implemented");
    },

    _createCounterUIList: function()
    {
        throw new Error("Not implemented");
    },

    _onRecordsCleared: function()
    {
        this._counters = [];
    },

    /**
     * @return {number}
     */
    height: function()
    {
        return this.element.offsetHeight;
    },

    _canvasHeight: function()
    {
        throw new Error("Not implemented");
    },

    onResize: function()
    {
        WebInspector.SidebarView.prototype.onResize.call(this);

        var width = this._canvasContainer.offsetWidth + 1;
        this._canvas.style.width = width + "px";
        this._timelineGrid.dividersElement.style.width = width + "px";
        var parentElement = this._canvas.parentElement;

        this._canvas.width = width;
        this._canvas.height = parentElement.clientHeight - 15;
        this.refresh();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRecordAdded: function(event)
    {
        throw new Error("Not implemented");
    },

    draw: function()
    {
        this._calculateVisibleIndexes();
        this._calculateXValues();
        this._clear();

        this._setVerticalClip(10, this._canvas.height - 20);
    },

    _calculateVisibleIndexes: function()
    {
        var calculator = this._timelineView.calculator;
        var start = calculator.minimumBoundary() * 1000;
        var end = calculator.maximumBoundary() * 1000;
        function comparator(value, sample)
        {
            return value - sample.time;
        }

        // Maximum index of element whose time <= start.
        this._minimumIndex = Number.constrain(this._counters.upperBound(start, comparator) - 1, 0, this._counters.length - 1);

        // Minimum index of element whose time >= end.
        this._maximumIndex = Number.constrain(this._counters.lowerBound(end, comparator), 0, this._counters.length - 1);

        // Current window bounds.
        this._minTime = start;
        this._maxTime = end;
    },

    /**
     * @param {!MouseEvent} event
     */
     _onClick: function(event)
    {
        var x = event.x - event.target.offsetParent.offsetLeft;
        var i = this._recordIndexAt(x);
        var counter = this._counters[i];
        if (counter)
            this._timelineView.revealRecordAt(counter.time / 1000);
    },

    /**
     * @param {!MouseEvent} event
     */
     _onMouseOut: function(event)
    {
        delete this._markerXPosition;

        var ctx = this._canvas.getContext("2d");
        this._clearCurrentValueAndMarker(ctx);
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     */
    _clearCurrentValueAndMarker: function(ctx)
    {
        for (var i = 0; i < this._counterUI.length; i++)
            this._counterUI[i].clearCurrentValueAndMarker(ctx);
    },

    /**
     * @param {!MouseEvent} event
     */
     _onMouseOver: function(event)
    {
        this._onMouseMove(event);
    },

    /**
     * @param {!MouseEvent} event
     */
     _onMouseMove: function(event)
    {
        var x = event.x - event.target.offsetParent.offsetLeft
        this._markerXPosition = x;
        this._refreshCurrentValues();
    },

    _refreshCurrentValues: function()
    {
        if (!this._counters.length)
            return;
        if (this._markerXPosition === undefined)
            return;
        if (this._maximumIndex === -1)
            return;
        var i = this._recordIndexAt(this._markerXPosition);

        this._updateCurrentValue(this._counters[i]);

        this._highlightCurrentPositionOnGraphs(this._markerXPosition, i);
    },

    _updateCurrentValue: function(counterEntry)
    {
        for (var j = 0; j < this._counterUI.length; j++)
            this._counterUI[j].updateCurrentValue(counterEntry);
    },

    _recordIndexAt: function(x)
    {
        var i;
        for (i = this._minimumIndex + 1; i <= this._maximumIndex; i++) {
            var statX = this._counters[i].x;
            if (x < statX)
                break;
        }
        i--;
        return i;
    },

    _highlightCurrentPositionOnGraphs: function(x, index)
    {
        var ctx = this._canvas.getContext("2d");
        this._restoreImageUnderMarker(ctx);
        this._drawMarker(ctx, x, index);
    },

    _restoreImageUnderMarker: function(ctx)
    {
        throw new Error("Not implemented");
    },

    _drawMarker: function(ctx, x, index)
    {
        throw new Error("Not implemented");
    },

    refresh: function()
    {
        this._timelineGrid.updateDividers(this._timelineView.calculator);
        this.draw();
        this._refreshCurrentValues();
    },

    _setVerticalClip: function(originY, height)
    {
        this._originY = originY;
        this._clippedHeight = height;
    },

    _calculateXValues: function()
    {
        if (!this._counters.length)
            return;

        var width = this._canvas.width;
        var xFactor = width / (this._maxTime - this._minTime);

        this._counters[this._minimumIndex].x = 0;
        for (var i = this._minimumIndex + 1; i < this._maximumIndex; i++)
             this._counters[i].x = xFactor * (this._counters[i].time - this._minTime);
        this._counters[this._maximumIndex].x = width;
    },

    _clear: function()
    {
        var ctx = this._canvas.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._discardImageUnderMarker();
    },

    _discardImageUnderMarker: function()
    {
        throw new Error("Not implemented");
    },

    __proto__: WebInspector.SidebarView.prototype
}
