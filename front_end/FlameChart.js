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
 * @param {WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart = function(dataProvider)
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("flameChart.css");
    this.element.className = "fill";
    this.element.id = "cpu-flame-chart";

    this._overviewContainer = this.element.createChild("div", "overview-container");
    this._overviewGrid = new WebInspector.OverviewGrid("flame-chart");
    this._overviewCanvas = this._overviewContainer.createChild("canvas", "flame-chart-overview-canvas");
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new WebInspector.FlameChart.OverviewCalculator();
    this._overviewGrid.addEventListener(WebInspector.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);

    this._chartContainer = this.element.createChild("div", "chart-container");
    this._timelineGrid = new WebInspector.TimelineGrid();
    this._chartContainer.appendChild(this._timelineGrid.element);
    this._calculator = new WebInspector.FlameChart.Calculator();

    this._canvas = this._chartContainer.createChild("canvas");
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
    WebInspector.installDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "col-resize");

    this._entryInfo = this._chartContainer.createChild("div", "entry-info");

    this._dataProvider = dataProvider;
    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._barHeight = 15;
    this._minWidth = 1;
    this._paddingLeft = 15;
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._canvas.addEventListener("click", this._onClick.bind(this), false);
    this._linkifier = new WebInspector.Linkifier();
    this._highlightedEntryIndex = -1;

    if (!WebInspector.FlameChart._colorGenerator)
        WebInspector.FlameChart._colorGenerator = new WebInspector.FlameChart.ColorGenerator();
}

/**
 * @constructor
 */
WebInspector.FlameChartDataProvider = function(cpuProfileView)
{
    this._cpuProfileView = cpuProfileView;
}

WebInspector.FlameChartDataProvider.prototype = {
    /**
     * @param {WebInspector.FlameChart.ColorGenerator} colorGenerator
     * @return {Object}
     */
    timelineData: function(colorGenerator)
    {
        return this._timelineData || this._calculateTimelineData(colorGenerator);
    },

    /**
     * @param {WebInspector.FlameChart.ColorGenerator} colorGenerator
     * @return {Object}
     */
    _calculateTimelineData: function(colorGenerator)
    {
        if (!this._cpuProfileView.profileHead)
            return null;

        var samples = this._cpuProfileView.samples;
        var idToNode = this._cpuProfileView._idToNode;
        var gcNode = this._cpuProfileView._gcNode;
        var samplesCount = samples.length;
        var samplingInterval = this._cpuProfileView.samplingIntervalMs;

        var index = 0;
        var entries = /** @type {Array.<!WebInspector.FlameChart.Entry>} */ ([]);

        var openIntervals = [];
        var stackTrace = [];
        var colorEntryIndexes = [];
        var maxDepth = 5; // minimum stack depth for the case when we see no activity.
        var depth = 0;

        for (var sampleIndex = 0; sampleIndex < samplesCount; sampleIndex++) {
            var node = idToNode[samples[sampleIndex]];
            stackTrace.length = 0;
            while (node) {
                stackTrace.push(node);
                node = node.parent;
            }
            stackTrace.pop(); // Remove (root) node

            maxDepth = Math.max(maxDepth, depth);
            depth = 0;
            node = stackTrace.pop();
            var intervalIndex;

            // GC samples have no stack, so we just put GC node on top of the last recoreded sample.
            if (node === gcNode) {
                while (depth < openIntervals.length) {
                    intervalIndex = openIntervals[depth].index;
                    entries[intervalIndex].duration += samplingInterval;
                    ++depth;
                }
                // If previous stack is also GC then just continue.
                if (openIntervals.length > 0 && openIntervals.peekLast().node === node) {
                    entries[intervalIndex].selfTime += samplingInterval;
                    continue;
                }
            }

            while (node && depth < openIntervals.length && node === openIntervals[depth].node) {
                intervalIndex = openIntervals[depth].index;
                entries[intervalIndex].duration += samplingInterval;
                node = stackTrace.pop();
                ++depth;
            }
            if (depth < openIntervals.length)
                openIntervals.length = depth;
            if (!node) {
                entries[intervalIndex].selfTime += samplingInterval;
                continue;
            }

            while (node) {
                var colorPair = colorGenerator._colorPairForID(node.functionName + ":" + node.url + ":" + node.lineNumber);
                var indexesForColor = colorEntryIndexes[colorPair.index];
                if (!indexesForColor)
                    indexesForColor = colorEntryIndexes[colorPair.index] = [];

                var entry = new WebInspector.FlameChart.Entry(colorPair, depth, samplingInterval, sampleIndex * samplingInterval, node);
                indexesForColor.push(entries.length);
                entries.push(entry);
                openIntervals.push({node: node, index: index});
                ++index;

                node = stackTrace.pop();
                ++depth;
            }
            entries[entries.length - 1].selfTime += samplingInterval;
        }

        var entryColorIndexes = new Uint16Array(entries.length);
        var entryLevels = new Uint8Array(entries.length);
        var entryTotalTimes = new Float32Array(entries.length);
        var entryOffsets = new Float32Array(entries.length);
        var entryTitles = new Array(entries.length);
        var entryDeoptFlags = new Uint8Array(entries.length);

        for (var i = 0; i < entries.length; ++i) {
            var entry = entries[i];
            entryColorIndexes[i] = colorPair.index;
            entryLevels[i] = entry.depth;
            entryTotalTimes[i] = entry.duration;
            entryOffsets[i] = entry.startTime;
            entryTitles[i] = entry.node.functionName;
            var reason = entry.node.deoptReason;
            entryDeoptFlags[i] = (reason && reason !== "no reason");
        }

        this._timelineData = {
            maxStackDepth: Math.max(maxDepth, depth),
            entries: entries,
            totalTime: this._cpuProfileView.profileHead.totalTime,
            entryColorIndexes: entryColorIndexes,
            entryLevels: entryLevels,
            entryTotalTimes: entryTotalTimes,
            entryOffsets: entryOffsets,
            colorEntryIndexes: colorEntryIndexes,
            entryTitles: entryTitles,
            entryDeoptFlags: entryDeoptFlags
        };

        return this._timelineData;
    },

    /**
     * @param {number} ms
     */
    _millisecondsToString: function(ms)
    {
        if (ms === 0)
            return "0";
        if (ms < 1000)
            return WebInspector.UIString("%.1f\u2009ms", ms);
        return Number.secondsToString(ms / 1000, true);
    },

    /**
     * @param {number} entryIndex
     */
    prepareHighlightedEntryInfo: function(entryIndex)
    {
        var entry = this._timelineData.entries[entryIndex];
        if (!entry)
            return null;
        var node = entry.node;
        if (!node)
            return null;

        var entryInfo = [];
        function pushEntryInfoRow(title, text)
        {
            var row = {};
            row.title = title;
            row.text = text;
            entryInfo.push(row);
        }

        pushEntryInfoRow(WebInspector.UIString("Name"), node.functionName);
        var selfTime = this._millisecondsToString(entry.selfTime);
        var totalTime = this._millisecondsToString(entry.duration);
        pushEntryInfoRow(WebInspector.UIString("Self time"), selfTime);
        pushEntryInfoRow(WebInspector.UIString("Total time"), totalTime);
        if (node.url)
            pushEntryInfoRow(WebInspector.UIString("URL"), node.url + ":" + node.lineNumber);
        pushEntryInfoRow(WebInspector.UIString("Aggregated self time"), Number.secondsToString(node.selfTime / 1000, true));
        pushEntryInfoRow(WebInspector.UIString("Aggregated total time"), Number.secondsToString(node.totalTime / 1000, true));
        if (node.deoptReason && node.deoptReason !== "no reason")
            pushEntryInfoRow(WebInspector.UIString("Not optimized"), node.deoptReason);

        return entryInfo;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex)
    {
        return this._timelineData.entries[entryIndex].node.scriptId !== "0";
    },

    /**
     * @param {number} entryIndex
     * @return {Object}
     */
    entryData: function(entryIndex)
    {
        return this._timelineData.entries[entryIndex].node;
    }
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
     * @param {WebInspector.FlameChart} flameChart
     */
    _updateBoundaries: function(flameChart)
    {
        function log10(x)
        {
            return Math.log(x) / Math.LN10;
        }
        this._decimalDigits = Math.max(0, -Math.floor(log10(flameChart._timelineGrid.gridSliceTime * 1.01)));
        var totalTime = flameChart._timelineData().totalTime;
        this._minimumBoundaries = flameChart._windowLeft * totalTime;
        this._maximumBoundaries = flameChart._windowRight * totalTime;
        this.paddingLeft = flameChart._paddingLeft;
        this._width = flameChart._canvas.width - this.paddingLeft;
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
     * @return {string}
     */
    formatTime: function(value)
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
     * @param {WebInspector.FlameChart} flameChart
     */
    _updateBoundaries: function(flameChart)
    {
        this._minimumBoundaries = 0;
        var totalTime = flameChart._timelineData().totalTime;
        this._maximumBoundaries = totalTime;
        this._xScaleFactor = flameChart._canvas.width / totalTime;
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
     * @return {string}
     */
    formatTime: function(value)
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
 * @constructor
 * @param {!Object} colorPair
 * @param {!number} depth
 * @param {!number} duration
 * @param {!number} startTime
 * @param {Object} node
 */
WebInspector.FlameChart.Entry = function(colorPair, depth, duration, startTime, node)
{
    this.colorPair = colorPair;
    this.depth = depth;
    this.duration = duration;
    this.startTime = startTime;
    this.node = node;
    this.selfTime = 0;
}

WebInspector.FlameChart.prototype = {
    _timelineData: function()
    {
        return this._dataProvider.timelineData(WebInspector.FlameChart._colorGenerator);
    },

    /**
     * @param {!number} timeLeft
     * @param {!number} timeRight
     */
    selectRange: function(timeLeft, timeRight)
    {
        this._overviewGrid.setWindow(timeLeft / this._totalTime, timeRight / this._totalTime);
    },

    _onWindowChanged: function(event)
    {
        this._scheduleUpdate();
    },

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
        this._overviewGrid.setWindow(this._dragStartWindowLeft + windowShift, this._dragStartWindowRight + windowShift);
        this._wasDragged = true;
    },

    _endCanvasDragging: function()
    {
        this._isDragging = false;
    },

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

    _onClick: function(e)
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

    _onMouseWheel: function(e)
    {
        if (e.wheelDeltaY) {
            const zoomFactor = 1.1;
            const mouseWheelZoomSpeed = 1 / 120;

            var zoom = Math.pow(zoomFactor, -e.wheelDeltaY * mouseWheelZoomSpeed);
            var overviewReference = (this._pixelWindowLeft + e.offsetX - this._paddingLeft) / this._totalPixels;
            this._overviewGrid.zoom(zoom, overviewReference);
        } else {
            var shift = Number.constrain(-1 * this._windowWidth / 4 * e.wheelDeltaX / 120, -this._windowLeft, 1 - this._windowRight);
            this._overviewGrid.setWindow(this._windowLeft + shift, this._windowRight + shift);
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
        var timelineEntries = timelineData.entries;
        var cursorTime = (x + this._pixelWindowLeft - this._paddingLeft) * this._pixelToTime;
        var cursorLevel = Math.floor((this._canvas.height / window.devicePixelRatio - y) / this._barHeight);

        for (var i = 0; i < timelineEntries.length; ++i) {
            if (cursorTime < timelineEntries[i].startTime)
                return -1;
            if (cursorTime < (timelineEntries[i].startTime + timelineEntries[i].duration)
                && cursorLevel === timelineEntries[i].depth)
                return i;
        }
        return -1;
    },

    onResize: function()
    {
        this._updateOverviewCanvas = true;
        this._scheduleUpdate();
    },

    _drawOverviewCanvas: function(width, height)
    {
        if (!this._timelineData())
            return;

        var timelineEntries = this._timelineData().entries;

        var drawData = new Uint8Array(width);
        var scaleFactor = width / this._totalTime;

        for (var entryIndex = 0; entryIndex < timelineEntries.length; ++entryIndex) {
            var entry = timelineEntries[entryIndex];
            var start = Math.floor(entry.startTime * scaleFactor);
            var finish = Math.floor((entry.startTime + entry.duration) * scaleFactor);
            for (var x = start; x < finish; ++x)
                drawData[x] = Math.max(drawData[x], entry.depth + 1);
        }

        var ratio = window.devicePixelRatio;
        var canvasWidth = width * ratio;
        var canvasHeight = height * ratio;
        this._overviewCanvas.width = canvasWidth;
        this._overviewCanvas.height = canvasHeight;
        this._overviewCanvas.style.width = width + "px";
        this._overviewCanvas.style.height = height + "px";

        var context = this._overviewCanvas.getContext("2d");

        var yScaleFactor = canvasHeight / (this._timelineData().maxStackDepth * 1.1);
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

    _scheduleUpdate: function()
    {
        if (this._updateTimerId)
            return;
        this._updateTimerId = setTimeout(this.update.bind(this), 10);
    },

    _updateBoundaries: function()
    {
        this._windowLeft = this._overviewGrid.windowLeft();
        this._windowRight = this._overviewGrid.windowRight();
        this._windowWidth = this._windowRight - this._windowLeft;

        this._totalTime = this._timelineData().totalTime;
        this._timeWindowLeft = this._windowLeft * this._totalTime;
        this._timeWindowRight = this._windowRight * this._totalTime;

        this._pixelWindowWidth = this._chartContainer.clientWidth;
        this._totalPixels = Math.floor(this._pixelWindowWidth / this._windowWidth);
        this._pixelWindowLeft = Math.floor(this._totalPixels * this._windowLeft);
        this._pixelWindowRight = Math.floor(this._totalPixels * this._windowRight);

        this._timeToPixel = this._totalPixels / this._totalTime;
        this._pixelToTime = this._totalTime / this._totalPixels;
        this._paddingLeftTime = this._paddingLeft / this._timeToPixel;
    },

    update: function()
    {
        this._updateTimerId = 0;
        if (!this._timelineData())
            return;
        this._updateBoundaries();
        this.draw(this._chartContainer.clientWidth, this._chartContainer.clientHeight);
        this._calculator._updateBoundaries(this);
        this._overviewCalculator._updateBoundaries(this);
        this._timelineGrid.element.style.width = this.element.clientWidth;
        this._timelineGrid.updateDividers(this._calculator);
        this._overviewGrid.updateDividers(this._overviewCalculator);
        if (this._updateOverviewCanvas) {
            this._drawOverviewCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - 20);
            this._updateOverviewCanvas = false;
        }
    },

    __proto__: WebInspector.View.prototype
};
