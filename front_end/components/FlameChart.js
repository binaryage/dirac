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
    requestWindowTimes: function(startTime, endTime) { }
}

/**
 * @constructor
 * @extends {WebInspector.HBox}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChartDelegate} flameChartDelegate
 * @param {boolean} isTopDown
 */
WebInspector.FlameChart = function(dataProvider, flameChartDelegate, isTopDown)
{
    WebInspector.HBox.call(this);
    this.element.classList.add("flame-chart-main-pane");
    this._flameChartDelegate = flameChartDelegate;
    this._isTopDown = isTopDown;

    this._calculator = new WebInspector.FlameChart.Calculator();

    this._canvas = this.element.createChild("canvas");
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._canvas.addEventListener("click", this._onClick.bind(this), false);
    WebInspector.installDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "move", null);

    this._vScrollElement = this.element.createChild("div", "flame-chart-v-scroll");
    this._vScrollContent = this._vScrollElement.createChild("div");
    this._vScrollElement.addEventListener("scroll", this._scheduleUpdate.bind(this), false);

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
    this._paddingLeft = this._dataProvider.paddingLeft();
    this._markerPadding = 2;
    this._markerRadius = this._barHeight / 2 - this._markerPadding;
    this._highlightedEntryIndex = -1;
    this._selectedEntryIndex = -1;
    this._textWidth = {};
}

WebInspector.FlameChart.DividersBarHeight = 20;

/**
 * @interface
 */
WebInspector.FlameChartDataProvider = function()
{
}

/** @typedef {!{
        entryLevels: (!Array.<number>|!Uint8Array),
        entryTotalTimes: (!Array.<number>|!Float32Array),
        entryOffsets: (!Array.<number>|!Float32Array)
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
     * @param {!CanvasRenderingContext2D} context
     * @param {?string} text
     * @param {number} barX
     * @param {number} barY
     * @param {number} barWidth
     * @param {number} barHeight
     * @param {function(number):number} offsetToPosition
     * @return {boolean}
     */
    decorateEntry: function(entryIndex, context, text, barX, barY, barWidth, barHeight, offsetToPosition) { },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex) { },

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
     * @return {?{startTimeOffset: number, endTimeOffset: number}}
     */
    highlightTimeRange: function(entryIndex) { },

    /**
     * @return {number}
     */
    paddingLeft: function() { },
}

WebInspector.FlameChart.Events = {
    EntrySelected: "EntrySelected"
}


/**
 * @constructor
 * @param {!{min: number, max: number, count: number}|number=} hueSpace
 * @param {!{min: number, max: number, count: number}|number=} satSpace
 * @param {!{min: number, max: number, count: number}|number=} lightnessSpace
 */
WebInspector.FlameChart.ColorGenerator = function(hueSpace, satSpace, lightnessSpace)
{
    this._hueSpace = hueSpace || { min: 0, max: 360, count: 20 };
    this._satSpace = satSpace || 67;
    this._lightnessSpace = lightnessSpace || 80;
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
     * @param {string} id
     * @return {string}
     */
    colorForID: function(id)
    {
        var color = this._colors[id];
        if (!color) {
            color = this._createColor(this._currentColorIndex++);
            this._colors[id] = color;
        }
        return color;
    },

    /**
     * @param {number} index
     * @return {string}
     */
    _createColor: function(index)
    {
        var h = this._indexToValueInSpace(index, this._hueSpace);
        var s = this._indexToValueInSpace(index, this._satSpace);
        var l = this._indexToValueInSpace(index, this._lightnessSpace);
        return "hsl(" + h + ", " + s + "%, " + l + "%)";
    },

    /**
     * @param {number} index
     * @param {!{min: number, max: number, count: number}|number} space
     * @return {number}
     */
    _indexToValueInSpace: function(index, space)
    {
        if (typeof space === "number")
            return space;
        index %= space.count;
        return space.min + index / space.count * (space.max - space.min);
    }
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
     * @param {!WebInspector.FlameChart} mainPane
     */
    _updateBoundaries: function(mainPane)
    {
        this._totalTime = mainPane._dataProvider.totalTime();
        this._zeroTime = mainPane._dataProvider.zeroTime();
        this._minimumBoundaries = this._zeroTime + mainPane._windowLeft * this._totalTime;
        this._maximumBoundaries = this._zeroTime + mainPane._windowRight * this._totalTime;
        this._paddingLeft = mainPane._paddingLeft;
        this._width = mainPane._canvas.width / window.devicePixelRatio - this._paddingLeft;
        this._timeToPixel = this._width / this.boundarySpan();
    },

    /**
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return Math.round((time - this._minimumBoundaries) * this._timeToPixel + this._paddingLeft);
    },

    /**
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatTime: function(value, precision)
    {
        return Number.preciseMillisToString(value - this._zeroTime, precision);
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

WebInspector.FlameChart.prototype = {
    _resetCanvas: function()
    {
        var ratio = window.devicePixelRatio;
        this._canvas.width = this._offsetWidth * ratio;
        this._canvas.height = this._offsetHeight * ratio;
        this._canvas.style.width = this._offsetWidth + "px";
        this._canvas.style.height = this._offsetHeight + "px";
    },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    _timelineData: function()
    {
        var timelineData = this._dataProvider.timelineData();
        if (timelineData !== this._rawTimelineData || timelineData.entryOffsets.length !== this._rawTimelineDataLength)
            this._processTimelineData(timelineData);
        return this._rawTimelineData;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        this._timeWindowLeft = startTime;
        this._timeWindowRight = endTime;
        this._scheduleUpdate();
    },

    /**
     * @param {!MouseEvent} event
     */
    _startCanvasDragging: function(event)
    {
        if (!this._timelineData() || this._timeWindowRight === Infinity)
            return false;
        this._isDragging = true;
        this._maxDragOffset = 0;
        this._dragStartPointX = event.pageX;
        this._dragStartPointY = event.pageY;
        this._dragStartScrollTop = this._vScrollElement.scrollTop;
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
        var pixelShift = this._dragStartPointX - event.pageX;
        var pixelScroll = this._dragStartPointY - event.pageY;
        this._vScrollElement.scrollTop = this._dragStartScrollTop + pixelScroll;
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
        this._maxDragOffset = Math.max(this._maxDragOffset, Math.abs(pixelShift));
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
        const clickThreshold = 5;
        if (this._maxDragOffset > clickThreshold)
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
        var scrollIsThere = this._totalHeight > this._offsetHeight;
        var windowLeft = this._timeWindowLeft ? this._timeWindowLeft : this._dataProvider.zeroTime();
        var windowRight = this._timeWindowRight !== Infinity ? this._timeWindowRight : this._dataProvider.zeroTime() + this._dataProvider.totalTime();

        var panHorizontally = Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY) && !e.shiftKey;
        var panVertically = scrollIsThere && ((e.wheelDeltaY && !e.shiftKey) || (Math.abs(e.wheelDeltaX) === 120 && !e.shiftKey));
        if (panVertically) {
            this._vScrollElement.scrollTop -= e.wheelDeltaY / 120 * this._offsetHeight / 8;
        } else if (panHorizontally) {
            var shift = -e.wheelDeltaX * this._pixelToTime;
            shift = Number.constrain(shift, this._zeroTime - windowLeft, this._totalTime + this._zeroTime - windowRight);
            windowLeft += shift;
            windowRight += shift;
        } else {  // Zoom.
            const mouseWheelZoomSpeed = 1 / 120;
            var zoom = Math.pow(1.2, -(e.wheelDeltaY || e.wheelDeltaX) * mouseWheelZoomSpeed) - 1;
            var cursorTime = this._cursorTime(e.offsetX);
            windowLeft += (windowLeft - cursorTime) * zoom;
            windowRight += (windowRight - cursorTime) * zoom;
        }
        windowLeft = Number.constrain(windowLeft, this._zeroTime, this._totalTime + this._zeroTime);
        windowRight = Number.constrain(windowRight, this._zeroTime, this._totalTime + this._zeroTime);
        this._flameChartDelegate.requestWindowTimes(windowLeft, windowRight);

        // Block swipe gesture.
        e.consume(true);
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
     * @param {number} x
     * @param {number} y
     * @return {number}
     */
    _coordinatesToEntryIndex: function(x, y)
    {
        y += this._scrollTop;
        var timelineData = this._timelineData();
        if (!timelineData)
            return -1;
        var cursorTimeOffset = this._cursorTime(x) - this._zeroTime;
        var cursorLevel;
        var offsetFromLevel;
        if (this._isTopDown) {
            cursorLevel = Math.floor((y - WebInspector.FlameChart.DividersBarHeight) / this._barHeight);
            offsetFromLevel = y - WebInspector.FlameChart.DividersBarHeight - cursorLevel * this._barHeight;
        } else {
            cursorLevel = Math.floor((this._canvas.height / window.devicePixelRatio - y) / this._barHeight);
            offsetFromLevel = this._canvas.height / window.devicePixelRatio - cursorLevel * this._barHeight;
        }
        var entryOffsets = timelineData.entryOffsets;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryIndexes = this._timelineLevels[cursorLevel];
        if (!entryIndexes || !entryIndexes.length)
            return -1;

        function comparator(time, entryIndex)
        {
            return time - entryOffsets[entryIndex];
        }
        var indexOnLevel = Math.max(entryIndexes.upperBound(cursorTimeOffset, comparator) - 1, 0);

        /**
         * @this {WebInspector.FlameChart}
         * @param {number} entryIndex
         * @return {boolean}
         */
        function checkEntryHit(entryIndex)
        {
            if (entryIndex === undefined)
                return false;
            var startTime = entryOffsets[entryIndex];
            var duration = entryTotalTimes[entryIndex];
            if (isNaN(duration)) {
                var dx = (startTime - cursorTimeOffset) / this._pixelToTime;
                var dy = this._barHeight / 2 - offsetFromLevel;
                return dx * dx + dy * dy < this._markerRadius * this._markerRadius;
            }
            var endTime = startTime + duration;
            var barThreshold = 3 * this._pixelToTime;
            return startTime - barThreshold < cursorTimeOffset && cursorTimeOffset < endTime + barThreshold;
        }

        var entryIndex = entryIndexes[indexOnLevel];
        if (checkEntryHit.call(this, entryIndex))
            return entryIndex;
        entryIndex = entryIndexes[indexOnLevel + 1];
        if (checkEntryHit.call(this, entryIndex))
            return entryIndex;
        return -1;
    },

    /**
     * @param {number} height
     * @param {number} width
     */
    _draw: function(width, height)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return;

        var context = this._canvas.getContext("2d");
        context.save();
        var ratio = window.devicePixelRatio;
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

        var titleIndices = new Uint32Array(timelineData.entryTotalTimes);
        var nextTitleIndex = 0;
        var markerIndices = new Uint32Array(timelineData.entryTotalTimes);
        var nextMarkerIndex = 0;
        var textPadding = this._dataProvider.textPadding();
        this._minTextWidth = 2 * textPadding + this._measureWidth(context, "\u2026");
        var minTextWidth = this._minTextWidth;

        var barHeight = this._barHeight;

        var offsetToPosition = this._offsetToPosition.bind(this);
        var textBaseHeight = this._baseHeight + barHeight - this._dataProvider.textBaseline();
        var colorBuckets = {};
        var minVisibleBarLevel = Math.max(Math.floor((this._scrollTop - this._baseHeight) / barHeight), 0);
        var maxVisibleBarLevel = Math.min(Math.floor((this._scrollTop - this._baseHeight + height) / barHeight), this._dataProvider.maxStackDepth());

        context.translate(0, -this._scrollTop);

        function comparator(time, entryIndex)
        {
            return time - entryOffsets[entryIndex];
        }

        for (var level = minVisibleBarLevel; level <= maxVisibleBarLevel; ++level) {
            // Entries are ordered by start time within a level, so find the last visible entry.
            var levelIndexes = this._timelineLevels[level];
            var rightIndexOnLevel = levelIndexes.lowerBound(timeWindowRight, comparator) - 1;
            var lastDrawOffset = Infinity;
            for (var entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
                var entryIndex = levelIndexes[entryIndexOnLevel];
                var entryOffset = entryOffsets[entryIndex];
                var entryOffsetRight = entryOffset + (isNaN(entryTotalTimes[entryIndex]) ? 0 : entryTotalTimes[entryIndex]);
                if (entryOffsetRight <= timeWindowLeft)
                    break;

                var barX = this._offsetToPosition(entryOffset);
                if (barX >= lastDrawOffset)
                    continue;
                var barRight = Math.min(this._offsetToPosition(entryOffsetRight), lastDrawOffset);
                lastDrawOffset = barX;

                var color = this._dataProvider.entryColor(entryIndex);
                var bucket = colorBuckets[color];
                if (!bucket) {
                    bucket = [];
                    colorBuckets[color] = bucket;
                }
                bucket.push(entryIndex);
            }
        }

        var colors = Object.keys(colorBuckets);
        // We don't use for-in here because it couldn't be optimized.
        for (var c = 0; c < colors.length; ++c) {
            var color = colors[c];
            context.fillStyle = color;
            context.strokeStyle = color;
            var indexes = colorBuckets[color];

            // First fill the boxes.
            context.beginPath();
            for (var i = 0; i < indexes.length; ++i) {
                var entryIndex = indexes[i];
                var entryOffset = entryOffsets[entryIndex];
                var barX = this._offsetToPosition(entryOffset);
                var barRight = this._offsetToPosition(entryOffset + entryTotalTimes[entryIndex]);
                var barWidth = Math.max(barRight - barX, minWidth);
                var barLevel = entryLevels[entryIndex];
                var barY = this._levelToHeight(barLevel);
                if (isNaN(entryTotalTimes[entryIndex])) {
                    context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
                    context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
                    markerIndices[nextMarkerIndex++] = entryIndex;
                } else {
                    context.rect(barX, barY, barWidth, barHeight);
                    if (barWidth > minTextWidth || this._dataProvider.forceDecoration(entryIndex))
                        titleIndices[nextTitleIndex++] = entryIndex;
                }
            }
            context.fill();
        }

        context.strokeStyle = "rgb(0, 0, 0)";
        context.beginPath();
        for (var m = 0; m < nextMarkerIndex; ++m) {
            var entryIndex = markerIndices[m];
            var entryOffset = entryOffsets[entryIndex];
            var barX = this._offsetToPosition(entryOffset);
            var barLevel = entryLevels[entryIndex];
            var barY = this._levelToHeight(barLevel);
            context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
            context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
        }
        context.stroke();

        context.textBaseline = "alphabetic";

        for (var i = 0; i < nextTitleIndex; ++i) {
            var entryIndex = titleIndices[i];
            var entryOffset = entryOffsets[entryIndex];
            var barX = this._offsetToPosition(entryOffset);
            var barRight = this._offsetToPosition(entryOffset + entryTotalTimes[entryIndex]);
            var barWidth = Math.max(barRight - barX, minWidth);
            var barLevel = entryLevels[entryIndex];
            var barY = this._levelToHeight(barLevel);
            var text = this._dataProvider.entryTitle(entryIndex);
            if (text && text.length) {
                context.font = this._dataProvider.entryFont(entryIndex);
                text = this._prepareText(context, text, barWidth - 2 * textPadding);
            }

            if (this._dataProvider.decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, offsetToPosition))
                continue;
            if (!text || !text.length)
                continue;

            context.fillStyle = this._dataProvider.textColor(entryIndex);
            context.fillText(text, barX + textPadding, textBaseHeight - barLevel * this._barHeightDelta);
        }
        context.restore();

        var offsets = this._dataProvider.dividerOffsets(this._calculator.minimumBoundary(), this._calculator.maximumBoundary());
        WebInspector.TimelineGrid.drawCanvasGrid(this._canvas, this._calculator, offsets);

        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
        this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    },

    /**
     * @param {?WebInspector.FlameChart.TimelineData} timelineData
     */
    _processTimelineData: function(timelineData)
    {
        if (!timelineData) {
            this._timelineLevels = null;
            this._rawTimelineData = null;
            this._rawTimelineDataLength = 0;
            return;
        }

        var entryCounters = new Uint32Array(this._dataProvider.maxStackDepth() + 1);
        for (var i = 0; i < timelineData.entryLevels.length; ++i)
            ++entryCounters[timelineData.entryLevels[i]];
        var levelIndexes = new Array(entryCounters.length);
        for (var i = 0; i < levelIndexes.length; ++i) {
            levelIndexes[i] = new Uint32Array(entryCounters[i]);
            entryCounters[i] = 0;
        }
        for (var i = 0; i < timelineData.entryLevels.length; ++i) {
            var level = timelineData.entryLevels[i];
            levelIndexes[level][entryCounters[level]++] = i;
        }
        this._timelineLevels = levelIndexes;
        this._rawTimelineData = timelineData;
        this._rawTimelineDataLength = timelineData.entryOffsets.length;
    },

    /**
     * @param {number} entryIndex
     */
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
        var timeRange = this._dataProvider.highlightTimeRange(entryIndex);
        if (!timeRange)
            return;
        var timelineData = this._timelineData();
        var barX = this._offsetToPosition(timeRange.startTimeOffset);
        var barRight = this._offsetToPosition(timeRange.endTimeOffset);
        if (barRight === 0 || barX === this._canvas.width)
            return;
        var barWidth = Math.max(barRight - barX, this._minWidth);
        var barY = this._levelToHeight(timelineData.entryLevels[entryIndex]) - this._scrollTop;
        var style = element.style;
        style.left = barX + "px";
        style.top = barY + "px";
        style.width = barWidth + "px";
        style.height = this._barHeight + "px";
        this.element.appendChild(element);
    },

    _offsetToPosition: function(offset)
    {
        var value = Math.floor(offset * this._timeToPixel) - this._pixelWindowLeft + this._paddingLeft;
        return Math.min(this._canvas.width, Math.max(0, value));
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

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {string} title
     * @param {number} maxSize
     * @return {string}
     */
    _prepareText: function(context, title, maxSize)
    {
        var titleWidth = this._measureWidth(context, title);
        if (maxSize >= titleWidth)
            return title;

        var l = 2;
        var r = title.length;
        while (l < r) {
            var m = (l + r) >> 1;
            if (this._measureWidth(context, title.trimMiddle(m)) <= maxSize)
                l = m + 1;
            else
                r = m;
        }
        title = title.trimMiddle(r - 1);
        return title !== "\u2026" ? title : "";
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

        var font = context.font;
        var textWidths = this._textWidth[font];
        if (!textWidths) {
            textWidths = {};
            this._textWidth[font] = textWidths;
        }
        var width = textWidths[text];
        if (!width) {
            width = context.measureText(text).width;
            textWidths[text] = width;
        }
        return width;
    },

    _updateBoundaries: function()
    {
        this._totalTime = this._dataProvider.totalTime();
        this._zeroTime = this._dataProvider.zeroTime();

        if (this._timeWindowRight !== Infinity) {
            this._windowLeft = (this._timeWindowLeft - this._zeroTime) / this._totalTime;
            this._windowRight = (this._timeWindowRight - this._zeroTime) / this._totalTime;
            this._windowWidth = this._windowRight - this._windowLeft;
        } else {
            this._windowLeft = 0;
            this._windowRight = 1;
            this._windowWidth = 1;
        }

        this._pixelWindowWidth = this._offsetWidth - this._paddingLeft;
        this._totalPixels = Math.floor(this._pixelWindowWidth / this._windowWidth);
        this._pixelWindowLeft = Math.floor(this._totalPixels * this._windowLeft);
        this._pixelWindowRight = Math.floor(this._totalPixels * this._windowRight);

        this._timeToPixel = this._totalPixels / this._totalTime;
        this._pixelToTime = this._totalTime / this._totalPixels;
        this._paddingLeftTime = this._paddingLeft / this._timeToPixel;

        this._baseHeight = this._isTopDown ? WebInspector.FlameChart.DividersBarHeight : this._offsetHeight - this._barHeight;

        this._totalHeight = this._levelToHeight(this._dataProvider.maxStackDepth() + 1);
        this._vScrollContent.style.height = this._totalHeight + "px";
        this._scrollTop = this._vScrollElement.scrollTop;
        this._updateScrollBar();
    },

    onResize: function()
    {
        this._updateScrollBar();
    },

    _updateScrollBar: function()
    {
        var showScroll = this._totalHeight > this._offsetHeight;
        this._vScrollElement.classList.toggle("hidden", !showScroll);
        this._offsetWidth = this.element.offsetWidth - (WebInspector.isMac() ? 0 : this._vScrollElement.offsetWidth);
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
        if (!this._timelineData())
            return;
        this._resetCanvas();
        this._updateBoundaries();
        this._calculator._updateBoundaries(this);
        this._draw(this._offsetWidth, this._offsetHeight);
    },

    reset: function()
    {
        this._highlightedEntryIndex = -1;
        this._selectedEntryIndex = -1;
        this._textWidth = {};
        this.update();
    },

    __proto__: WebInspector.HBox.prototype
}
