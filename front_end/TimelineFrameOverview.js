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
 * @extends {WebInspector.TimelineOverviewBase}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineFrameOverview = function(model)
{
    WebInspector.TimelineOverviewBase.call(this, model);
    this.element.id = "timeline-overview-frames";
    this.reset();

    this._outerPadding = 4 * window.devicePixelRatio;
    this._maxInnerBarWidth = 10 * window.devicePixelRatio;
    this._topPadding = 6 * window.devicePixelRatio;

    // The below two are really computed by update() -- but let's have something so that windowTimes() is happy.
    this._actualPadding = 5 * window.devicePixelRatio;
    this._actualOuterBarWidth = this._maxInnerBarWidth + this._actualPadding;

    this._fillStyles = {};
    var categories = WebInspector.TimelinePresentationModel.categories();
    for (var category in categories)
        this._fillStyles[category] = WebInspector.TimelinePresentationModel.createFillStyleForCategory(this._context, this._maxInnerBarWidth, 0, categories[category]);
    this._frameTopShadeGradient = this._context.createLinearGradient(0, 0, 0, this._topPadding);
    this._frameTopShadeGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    this._frameTopShadeGradient.addColorStop(1, "rgba(255, 255, 255, 0.2)");
}

WebInspector.TimelineFrameOverview.prototype = {
    reset: function()
    {
        this._recordsPerBar = 1;
        /** @type {!Array.<!{startTime:number, endTime:number}>} */
        this._barTimes = [];
        this._mainThreadFrames = [];
        this._backgroundFrames = [];
        this._framesById = {};
    },

    update: function()
    {
        this.resetCanvas();
        this._barTimes = [];

        var backgroundFramesHeight = 15 * window.devicePixelRatio;
        var mainThreadFramesHeight = this._canvas.height - backgroundFramesHeight;
        const minBarWidth = 4 * window.devicePixelRatio;
        var frameCount = this._backgroundFrames.length || this._mainThreadFrames.length;
        var framesPerBar = Math.max(1, frameCount * minBarWidth / this._canvas.width);

        var mainThreadVisibleFrames;
        var backgroundVisibleFrames;
        if (this._backgroundFrames.length) {
            backgroundVisibleFrames = this._aggregateFrames(this._backgroundFrames, framesPerBar);
            mainThreadVisibleFrames = new Array(backgroundVisibleFrames.length);
            for (var i = 0; i < backgroundVisibleFrames.length; ++i) {
                var frameId = backgroundVisibleFrames[i].mainThreadFrameId;
                mainThreadVisibleFrames[i] = frameId && this._framesById[frameId];
            }
        } else {
            mainThreadVisibleFrames = this._aggregateFrames(this._mainThreadFrames, framesPerBar);
        }

        this._context.save();
        this._setCanvasWindow(0, backgroundFramesHeight, this._canvas.width, mainThreadFramesHeight);
        var scale = (mainThreadFramesHeight - this._topPadding) / this._computeTargetFrameLength(mainThreadVisibleFrames);
        this._renderBars(mainThreadVisibleFrames, scale, mainThreadFramesHeight);
        this._context.fillStyle = this._frameTopShadeGradient;
        this._context.fillRect(0, 0, this._canvas.width, this._topPadding);
        this._drawFPSMarks(scale, mainThreadFramesHeight);
        this._context.restore();

        var bottom = backgroundFramesHeight + 0.5;
        this._context.strokeStyle = "rgba(120, 120, 120, 0.8)";
        this._context.beginPath();
        this._context.moveTo(0, bottom);
        this._context.lineTo(this._canvas.width, bottom);
        this._context.stroke();

        if (backgroundVisibleFrames) {
            const targetFPS = 30.0;
            scale = (backgroundFramesHeight - this._topPadding) / (1.0 / targetFPS);
            this._renderBars(backgroundVisibleFrames, scale, backgroundFramesHeight);
        }
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     */
    addFrame: function(frame)
    {
        var frames;
        if (frame.isBackground) {
            frames = this._backgroundFrames;
        } else {
            frames = this._mainThreadFrames;
            this._framesById[frame.id] = frame;
        }
        frames.push(frame);
    },

    /**
     * @param {number} x0
     * @param {number} y0
     * @param {number} width
     * @param {number} height
     */
    _setCanvasWindow: function(x0, y0, width, height)
    {
        this._context.translate(x0, y0);
        this._context.beginPath();
        this._context.moveTo(0, 0);
        this._context.lineTo(width, 0);
        this._context.lineTo(width, height);
        this._context.lineTo(0, height);
        this._context.lineTo(0, 0);
        this._context.clip();
    },

    /**
     * @param {!Array.<!WebInspector.TimelineFrame>} frames
     * @param {number} framesPerBar
     * @return {!Array.<!WebInspector.TimelineFrame>}
     */
    _aggregateFrames: function(frames, framesPerBar)
    {
        var visibleFrames = [];
        for (var barNumber = 0, currentFrame = 0; currentFrame < frames.length; ++barNumber) {
            var barStartTime = frames[currentFrame].startTime;
            var longestFrame = null;
            var longestDuration = 0;

            for (var lastFrame = Math.min(Math.floor((barNumber + 1) * framesPerBar), frames.length);
                 currentFrame < lastFrame; ++currentFrame) {
                var duration = this._frameDuration(frames[currentFrame]);
                if (!longestFrame || longestDuration < duration) {
                    longestFrame = frames[currentFrame];
                    longestDuration = duration;
                }
            }
            var barEndTime = frames[currentFrame - 1].endTime;
            if (longestFrame) {
                visibleFrames.push(longestFrame);
                this._barTimes.push({ startTime: barStartTime, endTime: barEndTime });
            }
        }
        return visibleFrames;
    },

    /**
     * @param {!WebInspector.TimelineFrame} frame
     */
    _frameDuration: function(frame)
    {
        var relatedFrame = frame.mainThreadFrameId && this._framesById[frame.mainThreadFrameId];
        return frame.duration + (relatedFrame ? relatedFrame.duration : 0);
    },

    /**
     * @param {!Array.<!WebInspector.TimelineFrame>} frames
     * @return {number}
     */
    _computeTargetFrameLength: function(frames)
    {
        var durations = [];
        for (var i = 0; i < frames.length; ++i) {
            if (frames[i])
                durations.push(frames[i].duration);
        }
        var medianFrameLength = durations.qselect(Math.floor(durations.length / 2));

        // Optimize appearance for 30fps. However, if at least half frames won't fit at this scale,
        // fall back to using autoscale.
        const targetFPS = 30;
        var result = 1.0 / targetFPS;
        if (result >= medianFrameLength)
            return result;

        var maxFrameLength = Math.max.apply(Math, durations);
        return Math.min(medianFrameLength * 2, maxFrameLength);
    },

    /**
     * @param {!Array.<!WebInspector.TimelineFrame>} frames
     * @param {number} scale
     * @param {number} windowHeight
     */
    _renderBars: function(frames, scale, windowHeight)
    {
        const maxPadding = 5 * window.devicePixelRatio;
        this._actualOuterBarWidth = Math.min((this._canvas.width - 2 * this._outerPadding) / frames.length, this._maxInnerBarWidth + maxPadding);
        this._actualPadding = Math.min(Math.floor(this._actualOuterBarWidth / 3), maxPadding);

        var barWidth = this._actualOuterBarWidth - this._actualPadding;
        for (var i = 0; i < frames.length; ++i) {
            if (frames[i])
                this._renderBar(this._barNumberToScreenPosition(i), barWidth, windowHeight, frames[i], scale);
        }
    },

    /**
     * @param {number} n
     */
    _barNumberToScreenPosition: function(n)
    {
        return this._outerPadding + this._actualOuterBarWidth * n;
    },

    /**
     * @param {number} scale
     * @param {number} height
     */
    _drawFPSMarks: function(scale, height)
    {
        const fpsMarks = [30, 60];

        this._context.save();
        this._context.beginPath();
        this._context.font = (10 * window.devicePixelRatio) + "px " + window.getComputedStyle(this.element, null).getPropertyValue("font-family");
        this._context.textAlign = "right";
        this._context.textBaseline = "alphabetic";

        const labelPadding = 4 * window.devicePixelRatio;
        const baselineHeight = 3 * window.devicePixelRatio;
        var lineHeight = 12 * window.devicePixelRatio;
        var labelTopMargin = 0;
        var labelOffsetY = 0; // Labels are going to be under their grid lines.

        for (var i = 0; i < fpsMarks.length; ++i) {
            var fps = fpsMarks[i];
            // Draw lines one pixel above they need to be, so 60pfs line does not cross most of the frames tops.
            var y = height - Math.floor(1.0 / fps * scale) - 0.5;
            var label = WebInspector.UIString("%d\u2009fps", fps);
            var labelWidth = this._context.measureText(label).width + 2 * labelPadding;
            var labelX = this._canvas.width;

            if (!i && labelTopMargin < y - lineHeight)
                labelOffsetY = -lineHeight; // Labels are going to be over their grid lines.
            var labelY = y + labelOffsetY;
            if (labelY < labelTopMargin || labelY + lineHeight > height)
                break; // No space for the label, so no line as well.

            this._context.moveTo(0, y);
            this._context.lineTo(this._canvas.width, y);

            this._context.fillStyle = "rgba(255, 255, 255, 0.5)";
            this._context.fillRect(labelX - labelWidth, labelY, labelWidth, lineHeight);
            this._context.fillStyle = "black";
            this._context.fillText(label, labelX - labelPadding, labelY + lineHeight - baselineHeight);
            labelTopMargin = labelY + lineHeight;
        }
        this._context.strokeStyle = "rgba(60, 60, 60, 0.4)";
        this._context.stroke();
        this._context.restore();
    },

    /**
     * @param {number} left
     * @param {number} width
     * @param {number} windowHeight
     * @param {!WebInspector.TimelineFrame} frame
     * @param {number} scale
     */
    _renderBar: function(left, width, windowHeight, frame, scale)
    {
        var categories = Object.keys(WebInspector.TimelinePresentationModel.categories());
        if (!categories.length)
            return;
        var x = Math.floor(left) + 0.5;
        width = Math.floor(width);

        for (var i = 0, bottomOffset = windowHeight; i < categories.length; ++i) {
            var category = categories[i];
            var duration = frame.timeByCategory[category];

            if (!duration)
                continue;
            var height = Math.round(duration * scale);
            var y = Math.floor(bottomOffset - height) + 0.5;

            this._context.save();
            this._context.translate(x, 0);
            this._context.scale(width / this._maxInnerBarWidth, 1);
            this._context.fillStyle = this._fillStyles[category];
            this._context.fillRect(0, y, this._maxInnerBarWidth, Math.floor(height));
            this._context.strokeStyle = WebInspector.TimelinePresentationModel.categories()[category].borderColor;
            this._context.beginPath();
            this._context.moveTo(0, y);
            this._context.lineTo(this._maxInnerBarWidth, y);
            this._context.stroke();
            this._context.restore();

            bottomOffset -= height;
        }
        // Draw a contour for the total frame time.
        var y0 = Math.floor(windowHeight - frame.duration * scale) + 0.5;
        var y1 = windowHeight + 0.5;

        this._context.strokeStyle = "rgba(90, 90, 90, 0.3)";
        this._context.beginPath();
        this._context.moveTo(x, y1);
        this._context.lineTo(x, y0);
        this._context.lineTo(x + width, y0);
        this._context.lineTo(x + width, y1);
        this._context.stroke();
    },

    /**
     * @param {number} windowLeft
     * @param {number} windowRight
     * @return {!{startTime: number, endTime: number}}
     */
    windowTimes: function(windowLeft, windowRight)
    {
        if (!this._barTimes.length)
            return WebInspector.TimelineOverviewBase.prototype.windowTimes.call(this, windowLeft, windowRight);
        var windowSpan = this._canvas.width;
        var leftOffset = windowLeft * windowSpan - this._outerPadding + this._actualPadding;
        var rightOffset = windowRight * windowSpan - this._outerPadding;
        var firstBar = Math.floor(Math.max(leftOffset, 0) / this._actualOuterBarWidth);
        var lastBar = Math.min(Math.floor(rightOffset / this._actualOuterBarWidth), this._barTimes.length - 1);
        if (firstBar >= this._barTimes.length)
            return {startTime: Infinity, endTime: Infinity};

        const snapToRightTolerancePixels = 3;
        return {
            startTime: this._barTimes[firstBar].startTime,
            endTime: (rightOffset + snapToRightTolerancePixels > windowSpan) || (lastBar >= this._barTimes.length) ? Infinity : this._barTimes[lastBar].endTime
        }
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {!{left: number, right: number}}
     */
    windowBoundaries: function(startTime, endTime)
    {
        if (this._barTimes.length === 0)
            return {left: 0, right: 1};
        /**
         * @param {number} time
         * @param {!{startTime:number, endTime:number}} barTime
         * @return {number}
         */
        function barStartComparator(time, barTime)
        {
            return time - barTime.startTime;
        }
        /**
         * @param {number} time
         * @param {!{startTime:number, endTime:number}} barTime
         * @return {number}
         */
        function barEndComparator(time, barTime)
        {
            // We need a frame where time is in [barTime.startTime, barTime.endTime), so exclude exact matches against endTime.
            if (time === barTime.endTime)
                return 1;
            return time - barTime.endTime;
        }
        return {
            left: this._windowBoundaryFromTime(startTime, barEndComparator),
            right: this._windowBoundaryFromTime(endTime, barStartComparator)
        }
    },

    /**
     * @param {number} time
     * @param {function(number, !{startTime:number, endTime:number}):number} comparator
     */
    _windowBoundaryFromTime: function(time, comparator)
    {
        if (time === Infinity)
            return 1;
        var index = this._firstBarAfter(time, comparator);
        if (!index)
            return 0;
        return (this._barNumberToScreenPosition(index) - this._actualPadding / 2) / this._canvas.width;
    },

    /**
     * @param {number} time
     * @param {function(number, {startTime:number, endTime:number}):number} comparator
     */
    _firstBarAfter: function(time, comparator)
    {
        return insertionIndexForObjectInListSortedByFunction(time, this._barTimes, comparator);
    },

    __proto__: WebInspector.TimelineOverviewBase.prototype
}
