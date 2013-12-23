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
 * @param {!WebInspector.TimelineView} timelineView
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.DOMCountersGraph = function(timelineView, model)
{
    WebInspector.MemoryStatistics.call(this, timelineView, model);
}

/**
 * @constructor
 * @extends {WebInspector.CounterUIBase}
 * @param {!WebInspector.DOMCountersGraph} memoryCountersPane
 * @param {string} title
 * @param {string} currentValueLabel
 * @param {!string} color
 * @param {function(!WebInspector.DOMCountersGraph.Counter):number} valueGetter
 */
WebInspector.DOMCounterUI = function(memoryCountersPane, title, currentValueLabel, color, valueGetter)
{
    WebInspector.CounterUIBase.call(this, memoryCountersPane, title, color, valueGetter)
    this._range = this._swatch.element.createChild("span");

    this._value = memoryCountersPane._currentValuesBar.createChild("span", "memory-counter-value");
    this._value.style.color = color;
    this._currentValueLabel = currentValueLabel;

    this.graphColor = color;
    this.graphYValues = [];
}

/**
 * @constructor
 * @extends {WebInspector.MemoryStatistics.Counter}
 * @param {number} time
 * @param {number} documentCount
 * @param {number} nodeCount
 * @param {number} listenerCount
 */
WebInspector.DOMCountersGraph.Counter = function(time, documentCount, nodeCount, listenerCount, usedGPUMemoryKBytes)
{
    WebInspector.MemoryStatistics.Counter.call(this, time);
    this.documentCount = documentCount;
    this.nodeCount = nodeCount;
    this.listenerCount = listenerCount;
    this.usedGPUMemoryKBytes = usedGPUMemoryKBytes;
}

WebInspector.DOMCounterUI.prototype = {
    /**
     * @param {number} minValue
     * @param {number} maxValue
     */
    setRange: function(minValue, maxValue)
    {
        this._range.textContent = WebInspector.UIString("[%d:%d]", minValue, maxValue);
    },

    updateCurrentValue: function(countersEntry)
    {
        this._value.textContent = WebInspector.UIString(this._currentValueLabel, this.valueGetter(countersEntry));
    },

    clearCurrentValueAndMarker: function(ctx)
    {
        this._value.textContent = "";
        this.restoreImageUnderMarker(ctx);
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     */
    saveImageUnderMarker: function(ctx, x, y, radius)
    {
        const w = radius + 1;
        var imageData = ctx.getImageData(x - w, y - w, 2 * w, 2 * w);
        this._imageUnderMarker = {
            x: x - w,
            y: y - w,
            imageData: imageData
        };
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     */
    restoreImageUnderMarker: function(ctx)
    {
        if (!this.visible)
            return;
        if (this._imageUnderMarker)
            ctx.putImageData(this._imageUnderMarker.imageData, this._imageUnderMarker.x, this._imageUnderMarker.y);
        this.discardImageUnderMarker();
    },

    discardImageUnderMarker: function()
    {
        delete this._imageUnderMarker;
    },

    __proto__: WebInspector.CounterUIBase.prototype
}


WebInspector.DOMCountersGraph.prototype = {
    _createCurrentValuesBar: function()
    {
        this._currentValuesBar = this._canvasContainer.createChild("div");
        this._currentValuesBar.id = "counter-values-bar";
        this._canvasContainer.classList.add("dom-counters");
    },

    /**
     * @return {!Element}
     */
    resizeElement: function()
    {
        return this._currentValuesBar;
    },

    /**
     * @return {!Array.<!WebInspector.DOMCounterUI>}
     */
    _createCounterUIList: function()
    {
        function getDocumentCount(entry)
        {
            return entry.documentCount;
        }
        function getNodeCount(entry)
        {
            return entry.nodeCount;
        }
        function getListenerCount(entry)
        {
            return entry.listenerCount;
        }
        function getUsedGPUMemoryKBytes(entry)
        {
            return entry.usedGPUMemoryKBytes;
        }
        var counterUIs = [
            new WebInspector.DOMCounterUI(this, "Documents", "Documents: %d", "#d00", getDocumentCount),
            new WebInspector.DOMCounterUI(this, "Nodes", "Nodes: %d", "#0a0", getNodeCount),
            new WebInspector.DOMCounterUI(this, "Listeners", "Listeners: %d", "#00d", getListenerCount)
        ];
        if (WebInspector.experimentsSettings.gpuTimeline.isEnabled())
            counterUIs.push(new WebInspector.DOMCounterUI(this, "GPU Memory", "GPU Memory [KB]: %d", "#c0c", getUsedGPUMemoryKBytes));
        return counterUIs;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRecordAdded: function(event)
    {
        /**
         * @param {!Array.<!T>} array
         * @param {!S} item
         * @param {!function(!T,!S):!number} comparator
         * @return {!number}
         * @template T,S
         */
        function findInsertionLocation(array, item, comparator)
        {
            var index = array.length;
            while (index > 0 && comparator(array[index - 1], item) > 0)
                --index;
            return index;
        }

        /**
         * @this {WebInspector.DOMCountersGraph}
         */
        function addStatistics(record)
        {
            var counters = record["counters"];
            var isGPURecord = record.data && typeof record.data["usedGPUMemoryBytes"] !== "undefined";
            if (isGPURecord) {
                counters = counters || {
                    "startTime": record.startTime,
                    "endTime": record.endTime
                };
                counters["usedGPUMemoryKBytes"] = Math.round(record.data["usedGPUMemoryBytes"] / 1024);
            }
            if (!counters)
                return;

            var time = record.endTime || record.startTime;
            var counter = new WebInspector.DOMCountersGraph.Counter(
                time,
                counters["documents"],
                counters["nodes"],
                counters["jsEventListeners"],
                counters["usedGPUMemoryKBytes"]
            );

            function compare(record, time)
            {
                return record.time - time;
            }
            var index = findInsertionLocation(this._counters, time, compare);
            this._counters.splice(index, 0, counter);
            if (isGPURecord) {
                // Populate missing values from preceeding records.
                // FIXME: Refactor the code to make each WebInspector.DOMCountersGraph.Counter
                // be responsible for a single graph to avoid such synchronizations.
                for (var i = index - 1; i >= 0 && typeof this._counters[i].usedGPUMemoryKBytes === "undefined"; --i) { }
                var usedGPUMemoryKBytes = this._counters[i >= 0 ? i : index].usedGPUMemoryKBytes;
                for (i = Math.max(i, 0); i < index; ++i)
                    this._counters[i].usedGPUMemoryKBytes = usedGPUMemoryKBytes;
                var copyFrom = index > 0 ? index - 1 : index + 1;
                if (copyFrom < this._counters.length) {
                    this._counters[index].documentCount = this._counters[copyFrom].documentCount;
                    this._counters[index].nodeCount = this._counters[copyFrom].nodeCount;
                    this._counters[index].listenerCount = this._counters[copyFrom].listenerCount;
                } else {
                    this._counters[index].documentCount =  0;
                    this._counters[index].nodeCount = 0;
                    this._counters[index].listenerCount = 0;
                }
            }
        }
        WebInspector.TimelinePresentationModel.forAllRecords([event.data], null, addStatistics.bind(this));
    },

    draw: function()
    {
        WebInspector.MemoryStatistics.prototype.draw.call(this);
        for (var i = 0; i < this._counterUI.length; i++)
            this._drawGraph(this._counterUI[i]);
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     */
    _restoreImageUnderMarker: function(ctx)
    {
        for (var i = 0; i < this._counterUI.length; i++) {
            var counterUI = this._counterUI[i];
            if (!counterUI.visible)
                continue;
            counterUI.restoreImageUnderMarker(ctx);
        }
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} index
     */
    _saveImageUnderMarker: function(ctx, x, index)
    {
        const radius = 2;
        for (var i = 0; i < this._counterUI.length; i++) {
            var counterUI = this._counterUI[i];
            if (!counterUI.visible)
                continue;
            var y = counterUI.graphYValues[index];
            counterUI.saveImageUnderMarker(ctx, x, y, radius);
        }
    },

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} index
     */
    _drawMarker: function(ctx, x, index)
    {
        this._saveImageUnderMarker(ctx, x, index);
        const radius = 2;
        for (var i = 0; i < this._counterUI.length; i++) {
            var counterUI = this._counterUI[i];
            if (!counterUI.visible)
                continue;
            var y = counterUI.graphYValues[index];
            ctx.beginPath();
            ctx.arc(x + 0.5, y + 0.5, radius, 0, Math.PI * 2, true);
            ctx.lineWidth = 1;
            ctx.fillStyle = counterUI.graphColor;
            ctx.strokeStyle = counterUI.graphColor;
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
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
        var valueGetter = counterUI.valueGetter;

        if (!this._counters.length)
            return;

        var maxValue;
        var minValue;
        for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
            var value = valueGetter(this._counters[i]);
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
        var value = valueGetter(this._counters[this._minimumIndex]) || 0;
        var currentY = Math.round(originY + height - (value - minValue) * yFactor);
        ctx.moveTo(0, currentY);
        for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
             var x = Math.round(this._counters[i].x);
             ctx.lineTo(x, currentY);
             var currentValue = valueGetter(this._counters[i]);
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

    _discardImageUnderMarker: function()
    {
        for (var i = 0; i < this._counterUI.length; i++)
            this._counterUI[i].discardImageUnderMarker();
    },

    __proto__: WebInspector.MemoryStatistics.prototype
}

