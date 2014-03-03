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
 * @extends {WebInspector.MemoryStatistics}
 * @implements {WebInspector.TimelineModeView}
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.CountersGraph = function(delegate, model)
{
    WebInspector.MemoryStatistics.call(this, delegate, model);
}

/**
 * @constructor
 * @extends {WebInspector.CounterUIBase}
 * @param {!WebInspector.CountersGraph} memoryCountersPane
 * @param {string} title
 * @param {string} currentValueLabel
 * @param {!string} color
 * @param {!WebInspector.MemoryStatistics.Counter} counter
 */
WebInspector.CounterUI = function(memoryCountersPane, title, currentValueLabel, color, counter)
{
    WebInspector.CounterUIBase.call(this, memoryCountersPane, title, color, counter)
    this._range = this._swatch.element.createChild("span");

    this._value = memoryCountersPane._currentValuesBar.createChild("span", "memory-counter-value");
    this._value.style.color = color;
    this._currentValueLabel = currentValueLabel;
    this._marker = memoryCountersPane._canvasContainer.createChild("div", "memory-counter-marker");
    this._marker.style.backgroundColor = color;
    this.clearCurrentValueAndMarker();

    this.graphColor = color;
    this.graphYValues = [];
}

WebInspector.CounterUI.prototype = {
    reset: function()
    {
        this._range.textContent = "";
    },

    /**
     * @param {number} minValue
     * @param {number} maxValue
     */
    setRange: function(minValue, maxValue)
    {
        this._range.textContent = WebInspector.UIString("[%d:%d]", minValue, maxValue);
    },

    __proto__: WebInspector.CounterUIBase.prototype
}


WebInspector.CountersGraph.prototype = {
    _createCurrentValuesBar: function()
    {
        this._currentValuesBar = this._graphsContainer.createChild("div");
        this._currentValuesBar.id = "counter-values-bar";
        this._graphsContainer.classList.add("dom-counters");
    },

    _createAllCounters: function()
    {
        this._counters = [];
        this._counterUI = [];
        this._createCounter(WebInspector.UIString("Documents"), WebInspector.UIString("Documents: %d"), "#d00", "documents");
        this._createCounter(WebInspector.UIString("Nodes"), WebInspector.UIString("Nodes: %d"), "#0a0", "nodes");
        this._createCounter(WebInspector.UIString("Listeners"), WebInspector.UIString("Listeners: %d"), "#00d", "jsEventListeners");
        if (WebInspector.experimentsSettings.gpuTimeline.isEnabled())
            this._createCounter(WebInspector.UIString("GPU Memory"), WebInspector.UIString("GPU Memory [KB]: %d"), "#c0c", "gpuMemoryUsedKB");
    },

    /**
     * @param {string} uiName
     * @param {string} uiValueTemplate
     * @param {string} color
     * @param {string} protocolName
     */
    _createCounter: function(uiName, uiValueTemplate, color, protocolName)
    {
        var counter = new WebInspector.MemoryStatistics.Counter(protocolName);
        this._counters.push(counter);
        this._counterUI.push(new WebInspector.CounterUI(this, uiName, uiValueTemplate, color, counter));
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    addRecord: function(record)
    {
        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @this {!WebInspector.CountersGraph}
         */
        function addStatistics(record)
        {
            var counters = record.counters;
            if (!counters)
                return;
            var time = record.endTime || record.startTime;
            for (var i = 0; i < this._counters.length; ++i)
                this._counters[i].appendSample(time, counters);
        }
        WebInspector.TimelineModel.forAllRecords([record], null, addStatistics.bind(this));
        this.scheduleRefresh();
    },

    draw: function()
    {
        WebInspector.MemoryStatistics.prototype.draw.call(this);
        for (var i = 0; i < this._counterUI.length; i++)
            this._drawGraph(this._counterUI[i]);
    },

    /**
     * @param {!WebInspector.CounterUIBase} counterUI
     */
    _drawGraph: function(counterUI)
    {
        var canvas = this._canvas;
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = this._clippedHeight;
        var originY = this._originY;
        var counter = counterUI.counter;
        var values = counter.values;

        if (!values.length)
            return;

        var maxValue;
        var minValue;
        for (var i = counter._minimumIndex; i <= counter._maximumIndex; i++) {
            var value = values[i];
            if (minValue === undefined || value < minValue)
                minValue = value;
            if (maxValue === undefined || value > maxValue)
                maxValue = value;
        }
        minValue = minValue || 0;
        maxValue = maxValue || 1;

        counterUI.setRange(minValue, maxValue);

        if (!counterUI.visible)
            return;

        var yValues = counterUI.graphYValues;
        yValues.length = this._counters.length;

        var maxYRange = maxValue - minValue;
        var yFactor = maxYRange ? height / (maxYRange) : 1;

        ctx.save();
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        var value = values[counter._minimumIndex];
        var currentY = Math.round(originY + height - (value - minValue) * yFactor);
        ctx.moveTo(0, currentY);
        for (var i = counter._minimumIndex; i <= counter._maximumIndex; i++) {
             var x = Math.round(counter.x[i]);
             ctx.lineTo(x, currentY);
             var currentValue = values[i];
             if (typeof currentValue !== "undefined")
                value = currentValue;
             currentY = Math.round(originY + height - (value - minValue) * yFactor);
             ctx.lineTo(x, currentY);
             yValues[i] = currentY;
        }
        ctx.lineTo(width, currentY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = counterUI.graphColor;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    },

    __proto__: WebInspector.MemoryStatistics.prototype
}

