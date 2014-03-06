/**
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
 * @interface
 */
WebInspector.FlameChartDelegate = function() { }

WebInspector.FlameChartDelegate.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime) { },
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart = function(dataProvider)
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.id = "cpu-flame-chart";

    this._overviewPane = new WebInspector.FlameChart.OverviewPane(dataProvider);
    this._overviewPane.show(this.element);

    this._mainPane = new WebInspector.FlameChart.MainPane(dataProvider, this._overviewPane, false, false);
    this._mainPane.show(this.element);
    this._mainPane.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    this._overviewPane._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
}

WebInspector.FlameChart.DividersBarHeight = 20;

WebInspector.FlameChart.prototype = {
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

    __proto__: WebInspector.View.prototype
};

/**
 * @interface
 */
WebInspector.FlameChartDataProvider = function()
{
}

/** @typedef {!{
        entryLevels: !Array.<number>,
        entryTotalTimes: !Array.<number>,
        entryOffsets: !Array.<number>
    }}
 */
WebInspector.FlameChart.TimelineData;

WebInspector.FlameChartDataProvider.prototype = {
    /**
     * @return {number}
     */
    barHeight: function() { },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime) { },

    /**
     * @return {number}
     */
    zeroTime: function() { },

    /**
     * @return {number}
     */
    totalTime: function() { },

    /**
     * @return {number}
     */
    maxStackDepth: function() { },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    timelineData: function() { },

    /**
     * @param {number} entryIndex
     * @return {?Array.<!{title: string, text: string}>}
     */
    prepareHighlightedEntryInfo: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryTitle: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryFont: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    entryColor: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    textColor: function(entryIndex) { },

    /**
     * @return {number}
     */
    textBaseline: function() { },

    /**
     * @return {number}
     */
    textPadding: function() { },

    /**
     * @return {!{startTimeOffset: number, endTimeOffset: number}}
     */
    highlightTimeRange: function(entryIndex) { }
}

/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.FlameChart.Calculator = function()
{
    this._paddingLeft = 0;
}

WebInspector.FlameChart.Calculator.prototype = {
    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return this._paddingLeft;
    },

    /**
     * @param {!WebInspector.FlameChart.MainPane} mainPane
     */
    _updateBoundaries: function(mainPane)
    {
        function log10(x)
        {
            return Math.log(x) / Math.LN10;
        }
        this._decimalDigits = Math.max(0, -Math.floor(log10(mainPane._timelineGrid.gridSliceTime * 1.01)));
        this._totalTime = mainPane._dataProvider.totalTime();
        this._minimumBoundaries = mainPane._windowLeft * this._totalTime;
        this._maximumBoundaries = mainPane._windowRight * this._totalTime;
        this._paddingLeft = mainPane._paddingLeft;
        this._width = mainPane._canvas.width / window.devicePixelRatio - this._paddingLeft;
        this._timeToPixel = this._width / this.boundarySpan();
        this._zeroTime = mainPane._dataProvider.zeroTime();
    },

    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundaries) * this._timeToPixel + this._paddingLeft;
    },

    /**
     * @param {number} value
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        var format = "%." + this._decimalDigits + "f\u2009ms";
        return WebInspector.UIString(format, value);
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
        return this._zeroTime;
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
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.FlameChart.OverviewCalculator = function()
{
}

WebInspector.FlameChart.OverviewCalculator.prototype = {
    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return 0;
    },

    /**
     * @param {!WebInspector.FlameChart.OverviewPane} overviewPane
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
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        return Number.secondsToString((value + this._minimumBoundaries) / 1000, hires);
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

WebInspector.FlameChart.Events = {
    EntrySelected: "EntrySelected"
}

/**
 * @constructor
 */
WebInspector.FlameChart.ColorGenerator = function()
{
    this._colors = {};
    this._currentColorIndex = 0;
}

WebInspector.FlameChart.ColorGenerator.prototype = {
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
 * @extends {WebInspector.View}
 * @implements {WebInspector.FlameChartDelegate}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart.OverviewPane = function(dataProvider)
{
    WebInspector.View.call(this);
    this.element.classList.add("flame-chart-overview-pane");
    this._overviewContainer = this.element.createChild("div", "overview-container");
    this._overviewGrid = new WebInspector.OverviewGrid("flame-chart");
    this._overviewGrid.element.classList.add("fill");
    this._overviewCanvas = this._overviewContainer.createChild("canvas", "flame-chart-overview-canvas");
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new WebInspector.FlameChart.OverviewCalculator();
    this._dataProvider = dataProvider;
}

WebInspector.FlameChart.OverviewPane.prototype = {
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
        WebInspector.FlameChart.OverviewPane.drawOverviewCanvas(
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

    __proto__: WebInspector.View.prototype
}

/**
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChart.TimelineData} timelineData
 * @param {!number} width
 */
WebInspector.FlameChart.OverviewPane.calculateDrawData = function(dataProvider, timelineData, width)
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
WebInspector.FlameChart.OverviewPane.drawOverviewCanvas = function(dataProvider, timelineData, context, width, height)
{
    var drawData = WebInspector.FlameChart.OverviewPane.calculateDrawData(dataProvider, timelineData, width);
    if (!drawData)
        return;

    var ratio = window.devicePixelRatio;
    var canvasWidth = width * ratio;
    var canvasHeight = height * ratio;

    var yScaleFactor = canvasHeight / (dataProvider.maxStackDepth() * 1.1);
    context.lineWidth = 1;
    context.translate(0.5, 0.5);
    context.strokeStyle = "rgba(20,0,0,0.4)";
    context.fillStyle = "rgba(214,225,254,0.8)";
    context.moveTo(-1, canvasHeight - 1);
    if (drawData)
      context.lineTo(-1, Math.round(height - drawData[0] * yScaleFactor - 1));
    var value;
    for (var x = 0; x < width; ++x) {
        value = Math.round(canvasHeight - drawData[x] * yScaleFactor - 1);
        context.lineTo(x * ratio, value);
    }
    context.lineTo(canvasWidth + 1, value);
    context.lineTo(canvasWidth + 1, canvasHeight - 1);
    context.fill();
    context.stroke();
    context.closePath();
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChartDelegate} flameChartDelegate
 * @param {boolean} isTopDown
 * @param {boolean} timeBasedWindow
 */
WebInspector.FlameChart.MainPane = function(dataProvider, flameChartDelegate, isTopDown, timeBasedWindow)
{
    WebInspector.View.call(this);
    this.element.classList.add("flame-chart-main-pane");
    this._flameChartDelegate = flameChartDelegate;
    this._isTopDown = isTopDown;
    this._timeBasedWindow = timeBasedWindow;

    this._timelineGrid = new WebInspector.TimelineGrid();
    this.element.appendChild(this._timelineGrid.element);
    this._calculator = new WebInspector.FlameChart.Calculator();

    this._canvas = this.element.createChild("canvas");
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._canvas.addEventListener("click", this._onClick.bind(this), false);
    WebInspector.installDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "move", null);

    this._entryInfo = this.element.createChild("div", "profile-entry-info");
    this._highlightElement = this.element.createChild("div", "flame-chart-highlight-element");
    this._selectedElement = this.element.createChild("div", "flame-chart-selected-element");

    this._dataProvider = dataProvider;

    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._windowWidth = 1.0;
    this._timeWindowLeft = 0;
    this._timeWindowRight = Infinity;
    this._barHeight = dataProvider.barHeight();
    this._barHeightDelta = this._isTopDown ? -this._barHeight : this._barHeight;
    this._minWidth = 1;
    this._paddingLeft = 15;
    this._highlightedEntryIndex = -1;
    this._selectedEntryIndex = -1;
    this._textWidth = {};
}

WebInspector.FlameChart.MainPane.prototype = {
    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    _timelineData: function()
    {
        return this._dataProvider.timelineData();
    },

    /**
     * @param {!number} windowLeft
     * @param {!number} windowRight
     */
    changeWindow: function(windowLeft, windowRight)
    {
        console.assert(!this._timeBasedWindow);
        this._windowLeft = windowLeft;
        this._windowRight = windowRight;
        this._windowWidth = this._windowRight - this._windowLeft;

        this._scheduleUpdate();
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        console.assert(this._timeBasedWindow);
        this._timeWindowLeft = startTime;
        this._timeWindowRight = endTime;
        this._scheduleUpdate();
    },

    /**
     * @param {!MouseEvent} event
     */
    _startCanvasDragging: function(event)
    {
        if (!this._timelineData())
            return false;
        this._isDragging = true;
        this._wasDragged = false;
        this._dragStartPoint = event.pageX;
        this._dragStartWindowLeft = this._timeWindowLeft;
        this._dragStartWindowRight = this._timeWindowRight;
        this._canvas.style.cursor = "";

        return true;
    },

    /**
     * @param {!MouseEvent} event
     */
    _canvasDragging: function(event)
    {
        var pixelShift = this._dragStartPoint - event.pageX;
        var windowShift = pixelShift / this._totalPixels;
        var windowTime = this._windowWidth * this._totalTime;
        var timeShift = windowTime * pixelShift / this._pixelWindowWidth;
        timeShift = Number.constrain(
            timeShift,
            this._zeroTime - this._dragStartWindowLeft,
            this._zeroTime + this._totalTime - this._dragStartWindowRight
        );
        var windowLeft = this._dragStartWindowLeft + timeShift;
        var windowRight = this._dragStartWindowRight + timeShift;
        this._flameChartDelegate.requestWindowTimes(windowLeft, windowRight);
        this._wasDragged = true;
    },

    _endCanvasDragging: function()
    {
        this._isDragging = false;
    },

    /**
     * @param {?MouseEvent} event
     */
    _onMouseMove: function(event)
    {
        if (this._isDragging)
            return;
        var entryIndex = this._coordinatesToEntryIndex(event.offsetX, event.offsetY);

        if (this._highlightedEntryIndex === entryIndex)
            return;

        if (entryIndex === -1 || !this._dataProvider.canJumpToEntry(entryIndex))
            this._canvas.style.cursor = "default";
        else
            this._canvas.style.cursor = "pointer";

        this._highlightedEntryIndex = entryIndex;

        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
        this._entryInfo.removeChildren();

        if (this._highlightedEntryIndex === -1)
            return;

        if (!this._isDragging) {
            var entryInfo = this._dataProvider.prepareHighlightedEntryInfo(this._highlightedEntryIndex);
            if (entryInfo)
                this._entryInfo.appendChild(this._buildEntryInfo(entryInfo));
        }
    },

    _onClick: function()
    {
        // onClick comes after dragStart and dragEnd events.
        // So if there was drag (mouse move) in the middle of that events
        // we skip the click. Otherwise we jump to the sources.
        if (this._wasDragged)
            return;
        if (this._highlightedEntryIndex === -1)
            return;
        this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, this._highlightedEntryIndex);
    },

    /**
     * @param {?MouseEvent} e
     */
    _onMouseWheel: function(e)
    {
        var windowLeft = this._timeWindowLeft ? this._timeWindowLeft : this._dataProvider.zeroTime();
        var windowRight = this._timeWindowRight !== Infinity ? this._timeWindowRight : this._dataProvider.zeroTime() + this._dataProvider.totalTime();

        if (e.wheelDeltaY) {
            const mouseWheelZoomSpeed = 1 / 120;
            var zoom = Math.pow(1.2, -e.wheelDeltaY * mouseWheelZoomSpeed) - 1;
            var cursorTime = this._cursorTime(e.offsetX);
            windowLeft += (windowLeft - cursorTime) * zoom;
            windowRight += (windowRight - cursorTime) * zoom;
        } else {
            var shift = e.wheelDeltaX * this._pixelToTime;
            shift = Number.constrain(shift, this._zeroTime - windowLeft, this._totalTime + this._zeroTime - windowRight);
            windowLeft += shift;
            windowRight += shift;
        }
        windowLeft = Number.constrain(windowLeft, this._zeroTime, this._totalTime + this._zeroTime);
        windowRight = Number.constrain(windowRight, this._zeroTime, this._totalTime + this._zeroTime);
        this._flameChartDelegate.requestWindowTimes(windowLeft, windowRight);
    },

    /**
     * @param {number} x
     * @return {number}
     */
    _cursorTime: function(x)
    {
        return (x + this._pixelWindowLeft - this._paddingLeft) * this._pixelToTime + this._zeroTime;
    },

    /**
     * @param {!number} x
     * @param {!number} y
     */
    _coordinatesToEntryIndex: function(x, y)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return -1;
        var cursorTimeOffset = this._cursorTime(x) - this._zeroTime;
        var cursorLevel = this._isTopDown ? Math.floor((y - WebInspector.FlameChart.DividersBarHeight) / this._barHeight) : Math.floor((this._canvas.height / window.devicePixelRatio - y) / this._barHeight);
        var entryOffsets = timelineData.entryOffsets;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryLevels = timelineData.entryLevels;
        var length = entryOffsets.length;
        for (var i = 0; i < length; ++i) {
            if (cursorTimeOffset < entryOffsets[i])
                return -1;
            if (cursorTimeOffset < (entryOffsets[i] + entryTotalTimes[i])
                && cursorLevel === entryLevels[i])
                return i;
        }
        return -1;
    },

    /**
     * @param {!number} height
     * @param {!number} width
     */
    draw: function(width, height)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return;
        var ratio = window.devicePixelRatio;
        this._canvas.width = width * ratio;
        this._canvas.height = height * ratio;
        this._canvas.style.width = width + "px";
        this._canvas.style.height = height + "px";

        var context = this._canvas.getContext("2d");
        context.scale(ratio, ratio);
        var timeWindowRight = this._timeWindowRight - this._zeroTime;
        var timeWindowLeft = this._timeWindowLeft - this._zeroTime;
        var timeToPixel = this._timeToPixel;
        var pixelWindowLeft = this._pixelWindowLeft;
        var paddingLeft = this._paddingLeft;
        var minWidth = this._minWidth;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryOffsets = timelineData.entryOffsets;
        var entryLevels = timelineData.entryLevels;

        var titleIndexes = new Uint32Array(timelineData.entryTotalTimes);
        var lastTitleIndex = 0;
        var textPadding = this._dataProvider.textPadding();
        var dotsWidth = this._measureWidth(context, "\u2026");
        this._minTextWidth = 2 * textPadding + dotsWidth;
        var minTextWidth = this._minTextWidth;

        var lastDrawOffset = new Int32Array(this._dataProvider.maxStackDepth());
        for (var i = 0; i < lastDrawOffset.length; ++i)
            lastDrawOffset[i] = -1;

        var barX = 0;
        var barY = 0;
        var barWidth = 0;
        var barRight = 0;
        var barLevel = 0;
        var barHeight = this._barHeight;
        this._baseHeight = this._isTopDown ? WebInspector.FlameChart.DividersBarHeight : height - this._barHeight;
        context.strokeStyle = "black";
        var color;
        var entryIndex = 0;
        var entryOffset = 0;

        var colorBuckets = {};
        var colors = [];
        var bucket = [];

        var textBaseHeight = this._baseHeight + this._barHeight - this._dataProvider.textBaseline();
        var lastUsedFont = "";
        var font;
        var textColor;
        var lastTextColor = "";
        var text = "";
        var xText = 0;
        var textWidth = 0;
        var title = "";
        var i = 0;
        var c = 0;

        var entryOffsetRight = 0;
        var maxBarLevel = height / this._barHeight;
        for (entryIndex = 0; entryIndex < entryOffsets.length; ++entryIndex) {
            // stop if we reached right border in time (entries were ordered by start time).
            entryOffset = entryOffsets[entryIndex];
            if (entryOffset > timeWindowRight)
                break;

            // skip if it is not visible (top/bottom side)
            barLevel = entryLevels[entryIndex];
            if (barLevel > maxBarLevel)
                continue;

            // skip if it is not visible (left side).
            entryOffsetRight = entryOffset + entryTotalTimes[entryIndex];
            if (entryOffsetRight < timeWindowLeft)
                continue;

            barRight = this._offsetToPosition(entryOffsetRight);

            if (barRight <= lastDrawOffset[barLevel])
                continue;
            barX = Math.max(this._offsetToPosition(entryOffset), lastDrawOffset[barLevel]);
            lastDrawOffset[barLevel] = barRight;

            barWidth = barRight - barX;

            color = this._dataProvider.entryColor(entryIndex);
            bucket = colorBuckets[color];
            if (!bucket) {
                bucket = [];
                colorBuckets[color] = bucket;
            }
            bucket.push(entryIndex);
        }
        colors = Object.keys(colorBuckets);
        // We don't use for in here because it couldn't be optimized.
        for (c = 0; c < colors.length; ++c) {
            color = colors[c];
            context.fillStyle = color;
            var indexes = colorBuckets[color];
            context.beginPath();
            for (i = 0; i < indexes.length; ++i) {
                entryIndex = indexes[i];
                entryOffset = entryOffsets[entryIndex];
                barX = this._offsetToPosition(entryOffset);
                barRight = this._offsetToPosition(entryOffset + entryTotalTimes[entryIndex]);
                barWidth = Math.max(barRight - barX, minWidth);
                barLevel = entryLevels[entryIndex];
                barY = this._levelToHeight(barLevel);
                context.rect(barX, barY, barWidth, this._barHeight);
                if (barWidth > minTextWidth)
                    titleIndexes[lastTitleIndex++] = entryIndex;
            }
            context.fill();
        }

        context.textBaseline = "alphabetic";

        for (i = 0; i < lastTitleIndex; ++i) {
            entryIndex = titleIndexes[i];
            text = this._dataProvider.entryTitle(entryIndex);
            if (!text || !text.length)
                continue;
            font = this._dataProvider.entryFont(entryIndex);
            entryOffset = entryOffsets[entryIndex];
            barX = this._offsetToPosition(entryOffset);
            barRight = this._offsetToPosition(entryOffset + entryTotalTimes[entryIndex]);
            barWidth = Math.max(barRight - barX, minWidth);
            xText = Math.max(0, barX);
            textWidth = barWidth - 2 * textPadding + barX - xText;
            title = this._prepareText(context, text, textWidth);
            if (!title)
                continue;
            if (font !== lastUsedFont) {
                context.font = font;
                lastUsedFont = font;
            }
            textColor = this._dataProvider.textColor(entryIndex);
            if (textColor !== lastTextColor) {
                context.fillStyle = textColor;
                lastTextColor = textColor;
            }
            context.fillText(title, xText + textPadding, textBaseHeight - entryLevels[entryIndex] * this._barHeightDelta);
        }
        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
        this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    },

    setSelectedEntry: function(entryIndex)
    {
        this._selectedEntryIndex = entryIndex;
        this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    },

    _updateElementPosition: function(element, entryIndex)
    {
        if (element.parentElement)
            element.remove();
        if (entryIndex === -1)
            return;
        var timelineData = this._timelineData();
        var timeRange = this._dataProvider.highlightTimeRange(entryIndex);
        var barX = this._offsetToPosition(timeRange.startTimeOffset);
        var barRight = this._offsetToPosition(timeRange.endTimeOffset);
        var barWidth = Math.max(barRight - barX, this._minWidth);
        var barY = this._levelToHeight(timelineData.entryLevels[entryIndex]);
        var style = element.style;
        style.left = barX + "px";
        style.top = barY + "px";
        style.width = barWidth + "px";
        style.height = this._barHeight + "px";
        this.element.appendChild(element);
    },

    _offsetToPosition: function(offset)
    {
        return Math.floor(offset * this._timeToPixel) - this._pixelWindowLeft + this._paddingLeft;
    },

    _levelToHeight: function(level)
    {
         return this._baseHeight - level * this._barHeightDelta;
    },

    _buildEntryInfo: function(entryInfo)
    {
        var infoTable = document.createElement("table");
        infoTable.className = "info-table";
        for (var i = 0; i < entryInfo.length; ++i) {
            var row = infoTable.createChild("tr");
            var titleCell = row.createChild("td");
            titleCell.textContent = entryInfo[i].title;
            titleCell.className = "title";
            var textCell = row.createChild("td");
            textCell.textContent = entryInfo[i].text;
        }
        return infoTable;
    },

    _prepareText: function(context, title, maxSize)
    {
        var titleWidth = this._measureWidth(context, title);
        if (maxSize > titleWidth)
            return title;
        maxSize -= this._measureWidth(context, "\u2026");
        var dotRegExp=/[\.\$]/g;
        var match = dotRegExp.exec(title);
        if (!match) {
            var visiblePartSize = maxSize / titleWidth;
            var newTextLength = Math.floor(title.length * visiblePartSize) + 1;
            var minTextLength = 2;
            if (newTextLength < minTextLength)
                return null;
            var substring;
            do {
                --newTextLength;
                substring = title.substring(0, newTextLength);
            } while (this._measureWidth(context, substring).width > maxSize);
            return title.substring(0, newTextLength) + "\u2026";
        }
        while (match) {
            var substring = title.substring(match.index + 1);
            var width = this._measureWidth(context, substring).width;
            if (maxSize > width)
                return "\u2026" + substring;
            match = dotRegExp.exec(title);
        }
        var i = 0;
        do {
            ++i;
        } while (this._measureWidth(context, title.substring(0, i)).width < maxSize);
        return title.substring(0, i - 1) + "\u2026";
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {string} text
     * @return {number}
     */
    _measureWidth: function(context, text)
    {
        if (text.length > 20)
            return context.measureText(text).width;

        var width = this._textWidth[text];
        if (!width) {
            width = context.measureText(text).width;
            this._textWidth[text] = width;
        }
        return width;
    },

    _updateBoundaries: function()
    {
        this._totalTime = this._dataProvider.totalTime();
        this._zeroTime = this._dataProvider.zeroTime();
        if (this._timeBasedWindow) {
            if (this._timeWindowRight !== Infinity) {
                this._windowLeft = (this._timeWindowLeft - this._zeroTime) / this._totalTime;
                this._windowRight = (this._timeWindowRight - this._zeroTime) / this._totalTime;
                this._windowWidth = this._windowRight - this._windowLeft;
            } else {
                this._windowLeft = 0;
                this._windowRight = 1;
                this._windowWidth = 1;
            }
        } else {
            this._timeWindowLeft = this._windowLeft * this._totalTime;
            this._timeWindowRight = this._windowRight * this._totalTime;
        }

        this._pixelWindowWidth = this._offsetWidth - this._paddingLeft;
        this._totalPixels = Math.floor(this._pixelWindowWidth / this._windowWidth);
        this._pixelWindowLeft = Math.floor(this._totalPixels * this._windowLeft);
        this._pixelWindowRight = Math.floor(this._totalPixels * this._windowRight);

        this._timeToPixel = this._totalPixels / this._totalTime;
        this._pixelToTime = this._totalTime / this._totalPixels;
        this._paddingLeftTime = this._paddingLeft / this._timeToPixel;
    },

    onResize: function()
    {
        this._offsetWidth = this.element.offsetWidth;
        this._offsetHeight = this.element.offsetHeight;
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
        if (!this._timelineData()) {
            this._timelineGrid.hideDividers();
            return;
        }
        this._updateBoundaries();
        if (this._timelineData().entryLevels.length)
            this._timelineGrid.showDividers();
        else
            this._timelineGrid.hideDividers();
        this.draw(this._offsetWidth, this._offsetHeight);
        this._calculator._updateBoundaries(this);
        this._timelineGrid.element.style.width = this._offsetWidth;
        var offsets = this._dataProvider.dividerOffsets(this._calculator.minimumBoundary(), this._calculator.maximumBoundary());
        this._timelineGrid.updateDividers(this._calculator, offsets, true);
    },

    reset: function()
    {
        this._highlightedEntryIndex = -1;
        this._selectedEntryIndex = -1;
        this._textWidth = {};
        this.update();
    },

    __proto__: WebInspector.View.prototype
}
