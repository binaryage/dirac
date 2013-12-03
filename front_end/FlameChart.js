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
 * @constructor
 * @extends {WebInspector.View}
 * @param {WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart = function(dataProvider)
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.className = "fill";
    this.element.id = "cpu-flame-chart";

    this._overviewPane = new WebInspector.FlameChart.OverviewPane(dataProvider);
    this._overviewPane.show(this.element);

    this._mainPane = new WebInspector.FlameChart.MainPane(dataProvider, this._overviewPane);
    this._mainPane.show(this.element);
    this._mainPane.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    this._overviewPane._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);

    if (!WebInspector.FlameChart._colorGenerator)
        WebInspector.FlameChart._colorGenerator = new WebInspector.FlameChart.ColorGenerator();
}

WebInspector.FlameChart.prototype = {
    /**
     * @param {WebInspector.Event} event
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
     * @param {WebInspector.Event} event
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

WebInspector.FlameChartDataProvider.prototype = {
    /**
     * @param {WebInspector.FlameChart.ColorGenerator} colorGenerator
     * @return {Object}
     */
    timelineData: function(colorGenerator) { return null; },

    /**
     * @param {number} entryIndex
     */
    prepareHighlightedEntryInfo: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex) { return false; },

    /**
     * @param {number} entryIndex
     * @return {Object}
     */
    entryData: function(entryIndex) { return null; }
}

/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 */
WebInspector.FlameChart.Calculator = function()
{
}

WebInspector.FlameChart.Calculator.prototype = {
    /**
     * @param {WebInspector.FlameChart.MainPane} mainPane
     */
    _updateBoundaries: function(mainPane)
    {
        function log10(x)
        {
            return Math.log(x) / Math.LN10;
        }
        this._decimalDigits = Math.max(0, -Math.floor(log10(mainPane._timelineGrid.gridSliceTime * 1.01)));
        var totalTime = mainPane._timelineData().totalTime;
        this._minimumBoundaries = mainPane._windowLeft * totalTime;
        this._maximumBoundaries = mainPane._windowRight * totalTime;
        this.paddingLeft = mainPane._paddingLeft;
        this._width = mainPane._canvas.width - this.paddingLeft;
        this._timeToPixel = this._width / this.boundarySpan();
    },

    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return (time - this._minimumBoundaries) * this._timeToPixel + this.paddingLeft;
    },

    /**
     * @param {number} value
     * @param {boolean=} hires
     * @return {string}
     */
    formatTime: function(value, hires)
    {
        var format = "%." + this._decimalDigits + "f\u2009ms";
        return WebInspector.UIString(format, value + this._minimumBoundaries);
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
        return 0;
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
     * @param {WebInspector.FlameChart.OverviewPane} overviewPane
     */
    _updateBoundaries: function(overviewPane)
    {
        this._minimumBoundaries = 0;
        var totalTime = overviewPane._timelineData().totalTime;
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
    this._colorPairs = {};
    this._colorIndexes = [];
    this._currentColorIndex = 0;
    this._colorPairForID("(idle)::0", 50);
    this._colorPairForID("(program)::0", 50);
    this._colorPairForID("(garbage collector)::0", 50);
}

WebInspector.FlameChart.ColorGenerator.prototype = {
    /**
     * @param {!string} id
     * @param {number=} sat
     */
    _colorPairForID: function(id, sat)
    {
        if (typeof sat !== "number")
            sat = 100;
        var colorPairs = this._colorPairs;
        var colorPair = colorPairs[id];
        if (!colorPair) {
            colorPairs[id] = colorPair = this._createPair(this._currentColorIndex++, sat);
            this._colorIndexes[colorPair.index] = colorPair;
        }
        return colorPair;
    },

    /**
     * @param {!number} index
     */
    _colorPairForIndex: function(index)
    {
        return this._colorIndexes[index];
    },

    /**
     * @param {!number} index
     * @param {!number} sat
     */
    _createPair: function(index, sat)
    {
        var hue = (index * 7 + 12 * (index % 2)) % 360;
        return {index: index, highlighted: "hsla(" + hue + ", " + sat + "%, 33%, 0.7)", normal: "hsla(" + hue + ", " + sat + "%, 66%, 0.7)"}
    }
}

/**
 * @interface
 */
WebInspector.FlameChart.OverviewPaneInterface = function()
{
}

WebInspector.FlameChart.OverviewPaneInterface.prototype = {
    /**
     * @param {number} zoom
     * @param {number} referencePoint
     */
    zoom: function(zoom, referencePoint) { },

    /**
     * @param {number} windowLeft
     * @param {number} windowRight
     */
    setWindow: function(windowLeft, windowRight) { },
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @implements {WebInspector.FlameChart.OverviewPaneInterface}
 * @param {WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart.OverviewPane = function(dataProvider)
{
    WebInspector.View.call(this);
    this._overviewContainer = this.element.createChild("div", "overview-container");
    this._overviewGrid = new WebInspector.OverviewGrid("flame-chart");
    this._overviewGrid.element.addStyleClass("fill");
    this._overviewCanvas = this._overviewContainer.createChild("canvas", "flame-chart-overview-canvas");
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new WebInspector.FlameChart.OverviewCalculator();
    this._dataProvider = dataProvider;
}

WebInspector.FlameChart.OverviewPane.prototype = {
    /**
     * @param {number} zoom
     * @param {number} referencePoint
     */
    zoom: function(zoom, referencePoint)
    {
        this._overviewGrid.zoom(zoom, referencePoint);
    },

    /**
     * @param {number} windowLeft
     * @param {number} windowRight
     */
    setWindow: function(windowLeft, windowRight)
    {
        this._overviewGrid.setWindow(windowLeft, windowRight);
    },

    /**
     * @param {!number} timeLeft
     * @param {!number} timeRight
     */
    _selectRange: function(timeLeft, timeRight)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return;
        this._overviewGrid.setWindow(timeLeft / timelineData._totalTime, timeRight / timelineData._totalTime);
    },

    _timelineData: function()
    {
        return this._dataProvider.timelineData(WebInspector.FlameChart._colorGenerator);
    },

    onResize: function()
    {
        this._scheduleUpdate();
    },

    _scheduleUpdate: function()
    {
        if (this._updateTimerId)
            return;
        this._updateTimerId = setTimeout(this.update.bind(this), 10);
    },

    update: function()
    {
        this._updateTimerId = 0;
        var timelineData = this._timelineData();
        if (!timelineData)
            return;
        this._overviewCalculator._updateBoundaries(this);
        this._overviewGrid.updateDividers(this._overviewCalculator);
        this._resetCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - 20);
        WebInspector.FlameChart.OverviewPane.drawOverviewCanvas(
            timelineData,
            this._overviewCanvas.getContext("2d"),
            this._overviewContainer.clientWidth,
            this._overviewContainer.clientHeight - 20
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
 * @param {!Object} timelineData
 * @param {!number} width
 */
WebInspector.FlameChart.OverviewPane.calculateDrawData = function(timelineData, width)
{
    var entryOffsets = timelineData.entryOffsets;
    var entryTotalTimes = timelineData.entryTotalTimes;
    var entryLevels = timelineData.entryLevels;
    var length = entryOffsets.length;

    var drawData = new Uint8Array(width);
    var scaleFactor = width / timelineData.totalTime;

    for (var entryIndex = 0; entryIndex < length; ++entryIndex) {
        var start = Math.floor(entryOffsets[entryIndex] * scaleFactor);
        var finish = Math.floor((entryOffsets[entryIndex] + entryTotalTimes[entryIndex]) * scaleFactor);
        for (var x = start; x <= finish; ++x)
            drawData[x] = Math.max(drawData[x], entryLevels[entryIndex] + 1);
    }
    return drawData;
}

/**
 * @param {!Object} timelineData
 * @param {!Object} context
 * @param {!number} width
 * @param {!number} height
 */
WebInspector.FlameChart.OverviewPane.drawOverviewCanvas = function(timelineData, context, width, height)
{
    var drawData = WebInspector.FlameChart.OverviewPane.calculateDrawData(timelineData, width);
    if (!drawData)
        return;

    var ratio = window.devicePixelRatio;
    var canvasWidth = width * ratio;
    var canvasHeight = height * ratio;

    var yScaleFactor = canvasHeight / (timelineData.maxStackDepth * 1.1);
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
 * @param {WebInspector.FlameChartDataProvider} dataProvider
 * @param {WebInspector.FlameChart.OverviewPaneInterface} overviewPane
 */
WebInspector.FlameChart.MainPane = function(dataProvider, overviewPane)
{
    WebInspector.View.call(this);
    this._overviewPane = overviewPane;
    this._chartContainer = this.element.createChild("div", "chart-container");
    this._timelineGrid = new WebInspector.TimelineGrid();
    this._chartContainer.appendChild(this._timelineGrid.element);
    this._calculator = new WebInspector.FlameChart.Calculator();

    this._canvas = this._chartContainer.createChild("canvas");
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._canvas.addEventListener("click", this._onClick.bind(this), false);
    WebInspector.installDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "col-resize");

    this._entryInfo = this._chartContainer.createChild("div", "entry-info");

    this._dataProvider = dataProvider;

    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._windowWidth = 1.0;
    this._barHeight = 15;
    this._minWidth = 1;
    this._paddingLeft = 15;
    this._highlightedEntryIndex = -1;
}

WebInspector.FlameChart.MainPane.prototype = {
    _timelineData: function()
    {
        return this._dataProvider.timelineData(WebInspector.FlameChart._colorGenerator);
    },

    /**
     * @param {!number} windowLeft
     * @param {!number} windowRight
     */
    changeWindow: function(windowLeft, windowRight)
    {
        this._windowLeft = windowLeft;
        this._windowRight = windowRight;
        this._windowWidth = this._windowRight - this._windowLeft;

        this._scheduleUpdate();
    },

    /**
     * @param {MouseEvent} event
     */
    _startCanvasDragging: function(event)
    {
        if (!this._timelineData())
            return false;
        this._isDragging = true;
        this._wasDragged = false;
        this._dragStartPoint = event.pageX;
        this._dragStartWindowLeft = this._windowLeft;
        this._dragStartWindowRight = this._windowRight;

        return true;
    },

    /**
     * @param {MouseEvent} event
     */
    _canvasDragging: function(event)
    {
        var pixelShift = this._dragStartPoint - event.pageX;
        var windowShift = pixelShift / this._totalPixels;

        var windowLeft = Math.max(0, this._dragStartWindowLeft + windowShift);
        if (windowLeft === this._windowLeft)
            return;
        windowShift = windowLeft - this._dragStartWindowLeft;

        var windowRight = Math.min(1, this._dragStartWindowRight + windowShift);
        if (windowRight === this._windowRight)
            return;
        windowShift = windowRight - this._dragStartWindowRight;
        this._overviewPane.setWindow(this._dragStartWindowLeft + windowShift, this._dragStartWindowRight + windowShift);
        this._wasDragged = true;
    },

    _endCanvasDragging: function()
    {
        this._isDragging = false;
    },

    /**
     * @param {MouseEvent} event
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
        this._scheduleUpdate();
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
        var data = this._dataProvider.entryData(this._highlightedEntryIndex);
        this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, data);
    },

    /**
     * @param {MouseEvent} e
     */
    _onMouseWheel: function(e)
    {
        if (e.wheelDeltaY) {
            const zoomFactor = 1.1;
            const mouseWheelZoomSpeed = 1 / 120;

            var zoom = Math.pow(zoomFactor, -e.wheelDeltaY * mouseWheelZoomSpeed);
            var referencePoint = (this._pixelWindowLeft + e.offsetX - this._paddingLeft) / this._totalPixels;
            this._overviewPane.zoom(zoom, referencePoint);
        } else {
            var shift = Number.constrain(-1 * this._windowWidth / 4 * e.wheelDeltaX / 120, -this._windowLeft, 1 - this._windowRight);
            this._overviewPane.setWindow(this._windowLeft + shift, this._windowRight + shift);
        }
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
        var cursorTime = (x + this._pixelWindowLeft - this._paddingLeft) * this._pixelToTime;
        var cursorLevel = Math.floor((this._canvas.height / window.devicePixelRatio - y) / this._barHeight);

        var entryOffsets = timelineData.entryOffsets;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryLevels = timelineData.entryLevels;
        var length = entryOffsets.length;
        for (var i = 0; i < length; ++i) {
            if (cursorTime < entryOffsets[i])
                return -1;
            if (cursorTime < (entryOffsets[i] + entryTotalTimes[i])
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
        var timeWindowRight = this._timeWindowRight;
        var timeToPixel = this._timeToPixel;
        var pixelWindowLeft = this._pixelWindowLeft;
        var paddingLeft = this._paddingLeft;
        var minWidth = this._minWidth;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryOffsets = timelineData.entryOffsets;
        var entryLevels = timelineData.entryLevels;
        var colorEntryIndexes = timelineData.colorEntryIndexes;
        var entryTitles = timelineData.entryTitles;
        var entryDeoptFlags = timelineData.entryDeoptFlags;

        var colorGenerator = WebInspector.FlameChart._colorGenerator;
        var titleIndexes = new Uint32Array(timelineData.entryTotalTimes);
        var lastTitleIndex = 0;
        var dotsWidth = context.measureText("\u2026").width;
        var textPaddingLeft = 2;
        this._minTextWidth = context.measureText("\u2026").width + textPaddingLeft;
        var minTextWidth = this._minTextWidth;

        var marksField = [];
        for (var i = 0; i < timelineData.maxStackDepth; ++i)
            marksField.push(new Uint16Array(width));

        var barHeight = this._barHeight;
        var barX = 0;
        var barWidth = 0;
        var barRight = 0;
        var barLevel = 0;
        var bHeight = height - barHeight;
        context.strokeStyle = "black";
        var colorPair;
        var entryIndex = 0;
        var entryOffset = 0;
        for (var colorIndex = 0; colorIndex < colorEntryIndexes.length; ++colorIndex) {
            colorPair = colorGenerator._colorPairForIndex(colorIndex);
            context.fillStyle = colorPair.normal;
            var indexes = colorEntryIndexes[colorIndex];
            if (!indexes)
                continue;
            context.beginPath();
            for (var i = 0; i < indexes.length; ++i) {
                entryIndex = indexes[i];
                entryOffset = entryOffsets[entryIndex];
                if (entryOffset > timeWindowRight)
                    break;
                barX = Math.ceil(entryOffset * timeToPixel) - pixelWindowLeft + paddingLeft;
                if (barX >= width)
                    continue;
                barRight = Math.floor((entryOffset + entryTotalTimes[entryIndex]) * timeToPixel) - pixelWindowLeft + paddingLeft;
                if (barRight < 0)
                    continue;
                barWidth = (barRight - barX) || minWidth;
                barLevel = entryLevels[entryIndex];
                var marksRow = marksField[barLevel];
                if (barWidth <= marksRow[barX])
                    continue;
                marksRow[barX] = barWidth;
                if (entryIndex === this._highlightedEntryIndex) {
                    context.fill();
                    context.beginPath();
                    context.fillStyle = colorPair.highlighted;
                }
                context.rect(barX, bHeight - barLevel * barHeight, barWidth, barHeight);
                if (entryIndex === this._highlightedEntryIndex) {
                    context.fill();
                    context.beginPath();
                    context.fillStyle = colorPair.normal;
                }
                if (barWidth > minTextWidth)
                    titleIndexes[lastTitleIndex++] = entryIndex;
            }
            context.fill();
        }

        var font = (barHeight - 4) + "px " + window.getComputedStyle(this.element, null).getPropertyValue("font-family");
        var boldFont = "bold " + font;
        var isBoldFontSelected = false;
        context.font = font;
        context.textBaseline = "alphabetic";
        context.fillStyle = "#333";
        this._dotsWidth = context.measureText("\u2026").width;

        var textBaseHeight = bHeight + barHeight - 4;
        for (var i = 0; i < lastTitleIndex; ++i) {
            entryIndex = titleIndexes[i];
            if (isBoldFontSelected) {
                if (!entryDeoptFlags[entryIndex]) {
                    context.font = font;
                    isBoldFontSelected = false;
                }
            } else {
                if (entryDeoptFlags[entryIndex]) {
                    context.font = boldFont;
                    isBoldFontSelected = true;
                }
            }

            entryOffset = entryOffsets[entryIndex];
            barX = Math.floor(entryOffset * timeToPixel) - pixelWindowLeft + paddingLeft;
            barRight = Math.ceil((entryOffset + entryTotalTimes[entryIndex]) * timeToPixel) - pixelWindowLeft + paddingLeft;
            barWidth = (barRight - barX) || minWidth;
            var xText = Math.max(0, barX);
            var widthText = barWidth - textPaddingLeft + barX - xText;
            var title = this._prepareText(context, entryTitles[entryIndex], widthText);
            if (title)
                context.fillText(title, xText + textPaddingLeft, textBaseHeight - entryLevels[entryIndex] * barHeight);
        }

        this._entryInfo.removeChildren();
        if (!this._isDragging) {
            var entryInfo = this._dataProvider.prepareHighlightedEntryInfo(this._highlightedEntryIndex);
            if (entryInfo)
                this._entryInfo.appendChild(this._buildEntryInfo(entryInfo));
        }
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
        if (maxSize < this._dotsWidth)
            return null;
        var titleWidth = context.measureText(title).width;
        if (maxSize > titleWidth)
            return title;
        maxSize -= this._dotsWidth;
        var dotRegExp=/[\.\$]/g;
        var match = dotRegExp.exec(title);
        if (!match) {
            var visiblePartSize = maxSize / titleWidth;
            var newTextLength = Math.floor(title.length * visiblePartSize) + 1;
            var minTextLength = 4;
            if (newTextLength < minTextLength)
                return null;
            var substring;
            do {
                --newTextLength;
                substring = title.substring(0, newTextLength);
            } while (context.measureText(substring).width > maxSize);
            return title.substring(0, newTextLength) + "\u2026";
        }
        while (match) {
            var substring = title.substring(match.index + 1);
            var width = context.measureText(substring).width;
            if (maxSize > width)
                return "\u2026" + substring;
            match = dotRegExp.exec(title);
        }
        var i = 0;
        do {
            ++i;
        } while (context.measureText(title.substring(0, i)).width < maxSize);
        return title.substring(0, i - 1) + "\u2026";
    },

    _updateBoundaries: function()
    {
        this._totalTime = this._timelineData().totalTime;
        this._timeWindowLeft = this._windowLeft * this._totalTime;
        this._timeWindowRight = this._windowRight * this._totalTime;

        this._pixelWindowWidth = this._chartContainer.clientWidth - this._paddingLeft;
        this._totalPixels = Math.floor(this._pixelWindowWidth / this._windowWidth);
        this._pixelWindowLeft = Math.floor(this._totalPixels * this._windowLeft);
        this._pixelWindowRight = Math.floor(this._totalPixels * this._windowRight);

        this._timeToPixel = this._totalPixels / this._totalTime;
        this._pixelToTime = this._totalTime / this._totalPixels;
        this._paddingLeftTime = this._paddingLeft / this._timeToPixel;
    },

    onResize: function()
    {
        this._scheduleUpdate();
    },

    _scheduleUpdate: function()
    {
        if (this._updateTimerId)
            return;
        this._updateTimerId = setTimeout(this.update.bind(this), 10);
    },

    update: function()
    {
        this._updateTimerId = 0;
        if (!this._timelineData())
            return;
        this._updateBoundaries();
        this.draw(this._chartContainer.clientWidth, this._chartContainer.clientHeight);
        this._calculator._updateBoundaries(this);
        this._timelineGrid.element.style.width = this.element.clientWidth;
        this._timelineGrid.updateDividers(this._calculator);
    },

    __proto__: WebInspector.View.prototype
}
