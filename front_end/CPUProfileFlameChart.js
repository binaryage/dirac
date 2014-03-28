/**
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.CPUProfileFlameChart = function(dataProvider)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.id = "cpu-flame-chart";

    this._overviewPane = new WebInspector.CPUProfileFlameChart.OverviewPane(dataProvider);
    this._overviewPane.show(this.element);

    this._mainPane = new WebInspector.FlameChart(dataProvider, this._overviewPane, true, false);
    this._mainPane.show(this.element);
    this._mainPane.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    this._overviewPane._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
}

WebInspector.CPUProfileFlameChart.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onWindowChanged: function(event)
    {
        this._mainPane.changeWindow(this._overviewPane._overviewGrid.windowLeft(), this._overviewPane._overviewGrid.windowRight());
    },

    /**
     * @param {!number} timeLeft
     * @param {!number} timeRight
     */
    selectRange: function(timeLeft, timeRight)
    {
        this._overviewPane._selectRange(timeLeft, timeRight);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
        this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, event.data);
    },

    update: function()
    {
        this._overviewPane.update();
        this._mainPane.update();
    },

    __proto__: WebInspector.VBox.prototype
};

/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.CPUProfileFlameChart.OverviewCalculator = function()
{
}

WebInspector.CPUProfileFlameChart.OverviewCalculator.prototype = {
    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return 0;
    },

    /**
     * @param {!WebInspector.CPUProfileFlameChart.OverviewPane} overviewPane
     */
    _updateBoundaries: function(overviewPane)
    {
        this._minimumBoundaries = 0;
        var totalTime = overviewPane._dataProvider.totalTime();
        this._maximumBoundaries = totalTime;
        this._xScaleFactor = overviewPane._overviewCanvas.width / totalTime;
    },

    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundaries) * this._xScaleFactor;
    },

    /**
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatTime: function(value, precision)
    {
        return Number.secondsToString((value + this._minimumBoundaries) / 1000);
    },

    /**
     * @return {number}
     */
    maximumBoundary: function()
    {
        return this._maximumBoundaries;
    },

    /**
     * @return {number}
     */
    minimumBoundary: function()
    {
        return this._minimumBoundaries;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._minimumBoundaries;
    },

    /**
     * @return {number}
     */
    boundarySpan: function()
    {
        return this._maximumBoundaries - this._minimumBoundaries;
    }
}

/**
 * @constructor
 */
WebInspector.CPUProfileFlameChart.ColorGenerator = function()
{
    this._colors = {};
    this._currentColorIndex = 0;
}

WebInspector.CPUProfileFlameChart.ColorGenerator.prototype = {
    /**
     * @param {string} id
     * @param {string|!CanvasGradient} color
     */
    setColorForID: function(id, color)
    {
        this._colors[id] = color;
    },

    /**
     * @param {!string} id
     * @param {number=} sat
     * @return {!string}
     */
    colorForID: function(id, sat)
    {
        if (typeof sat !== "number")
            sat = 100;
        var color = this._colors[id];
        if (!color) {
            color = this._createColor(this._currentColorIndex++, sat);
            this._colors[id] = color;
        }
        return color;
    },

    /**
     * @param {!number} index
     * @param {!number} sat
     */
    _createColor: function(index, sat)
    {
        var hue = (index * 7 + 12 * (index % 2)) % 360;
        return "hsla(" + hue + ", " + sat + "%, 66%, 0.7)";
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.FlameChartDelegate}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.CPUProfileFlameChart.OverviewPane = function(dataProvider)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("flame-chart-overview-pane");
    this._overviewContainer = this.element.createChild("div", "overview-container");
    this._overviewGrid = new WebInspector.OverviewGrid("flame-chart");
    this._overviewGrid.element.classList.add("fill");
    this._overviewCanvas = this._overviewContainer.createChild("canvas", "flame-chart-overview-canvas");
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new WebInspector.CPUProfileFlameChart.OverviewCalculator();
    this._dataProvider = dataProvider;
}

WebInspector.CPUProfileFlameChart.OverviewPane.prototype = {
    /**
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._overviewGrid.setWindow(windowStartTime / this._dataProvider.totalTime(), windowEndTime / this._dataProvider.totalTime());
    },

    /**
     * @param {!number} timeLeft
     * @param {!number} timeRight
     */
    _selectRange: function(timeLeft, timeRight)
    {
        this._overviewGrid.setWindow(timeLeft / this._dataProvider.totalTime(), timeRight / this._dataProvider.totalTime());
    },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    _timelineData: function()
    {
        return this._dataProvider.timelineData();
    },

    onResize: function()
    {
        this._scheduleUpdate();
    },

    _scheduleUpdate: function()
    {
        if (this._updateTimerId)
            return;
        this._updateTimerId = requestAnimationFrame(this.update.bind(this));
    },

    update: function()
    {
        this._updateTimerId = 0;
        var timelineData = this._timelineData();
        if (!timelineData)
            return;
        this._resetCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - WebInspector.FlameChart.DividersBarHeight);
        this._overviewCalculator._updateBoundaries(this);
        this._overviewGrid.updateDividers(this._overviewCalculator);
        WebInspector.CPUProfileFlameChart.OverviewPane.drawOverviewCanvas(
            this._dataProvider,
            timelineData,
            this._overviewCanvas.getContext("2d"),
            this._overviewContainer.clientWidth,
            this._overviewContainer.clientHeight - WebInspector.FlameChart.DividersBarHeight
        );
    },

    /**
     * @param {!number} width
     * @param {!number} height
     */
    _resetCanvas: function(width, height)
    {
        var ratio = window.devicePixelRatio;
        this._overviewCanvas.width = width * ratio;
        this._overviewCanvas.height = height * ratio;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChart.TimelineData} timelineData
 * @param {!number} width
 */
WebInspector.CPUProfileFlameChart.OverviewPane.calculateDrawData = function(dataProvider, timelineData, width)
{
    var entryOffsets = timelineData.entryOffsets;
    var entryTotalTimes = timelineData.entryTotalTimes;
    var entryLevels = timelineData.entryLevels;
    var length = entryOffsets.length;

    var drawData = new Uint8Array(width);
    var scaleFactor = width / dataProvider.totalTime();

    for (var entryIndex = 0; entryIndex < length; ++entryIndex) {
        var start = Math.floor(entryOffsets[entryIndex] * scaleFactor);
        var finish = Math.floor((entryOffsets[entryIndex] + entryTotalTimes[entryIndex]) * scaleFactor);
        for (var x = start; x <= finish; ++x)
            drawData[x] = Math.max(drawData[x], entryLevels[entryIndex] + 1);
    }
    return drawData;
}

/**
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChart.TimelineData} timelineData
 * @param {!Object} context
 * @param {!number} width
 * @param {!number} height
 */
WebInspector.CPUProfileFlameChart.OverviewPane.drawOverviewCanvas = function(dataProvider, timelineData, context, width, height)
{
    var ratio = window.devicePixelRatio;
    var canvasWidth = width * ratio;
    var canvasHeight = height * ratio;

    var drawData = WebInspector.CPUProfileFlameChart.OverviewPane.calculateDrawData(dataProvider, timelineData, canvasWidth);
    if (!drawData)
        return;

    var yScaleFactor = canvasHeight / (dataProvider.maxStackDepth() * 1.1);
    context.lineWidth = 1;
    context.translate(0.5, 0.5);
    context.strokeStyle = "rgba(20,0,0,0.4)";
    context.fillStyle = "rgba(214,225,254,0.8)";
    context.moveTo(-1, canvasHeight - 1);
    context.lineTo(-1, Math.round(canvasHeight - drawData[0] * yScaleFactor - 1));
    var value;
    for (var x = 0; x < canvasWidth; ++x) {
        value = Math.round(canvasHeight - drawData[x] * yScaleFactor - 1);
        context.lineTo(x, value);
    }
    context.lineTo(canvasWidth + 1, value);
    context.lineTo(canvasWidth + 1, canvasHeight - 1);
    context.fill();
    context.stroke();
    context.closePath();
}
