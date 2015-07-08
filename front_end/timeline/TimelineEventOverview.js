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
 * @param {string} id
 * @param {?string} title
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview = function(id, title, model)
{
    WebInspector.TimelineOverviewBase.call(this);
    this.element.id = "timeline-overview-" + id;
    this.element.classList.add("overview-strip");
    if (title) {
        this._placeholder = this.element.createChild("div", "timeline-overview-strip-placeholder");
        this._placeholder.textContent = title;
    }
    this._model = model;
}

WebInspector.TimelineEventOverview.prototype = {
    _updatePlaceholder: function()
    {
        if (this._placeholder)
            this._placeholder.classList.toggle("hidden", !this._model.isEmpty());
    },

    /**
     * @param {number} begin
     * @param {number} end
     * @param {number} position
     * @param {number} height
     * @param {string} color
     */
    _renderBar: function(begin, end, position, height, color)
    {
        var x = begin;
        var width = end - begin;
        this._context.fillStyle = color;
        this._context.fillRect(x, position, width, height);
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

    __proto__: WebInspector.TimelineOverviewBase.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview.Input = function(model)
{
    WebInspector.TimelineEventOverview.call(this, "input", WebInspector.UIString("Input"), model);
}

WebInspector.TimelineEventOverview.Input.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        var events = this._model.mainThreadEvents();
        var height = this._canvas.height;
        var descriptors = WebInspector.TimelineUIUtils.eventDispatchDesciptors();
        /** @type {!Map.<string,!WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor>} */
        var descriptorsByType = new Map();
        var maxPriority = -1;
        for (var descriptor of descriptors) {
            for (var type of descriptor.eventTypes)
                descriptorsByType.set(type, descriptor);
            maxPriority = Math.max(maxPriority, descriptor.priority);
        }

        var /** @const */ minWidth = 2 * window.devicePixelRatio;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var canvasWidth = this._canvas.width;
        var scale = canvasWidth / timeSpan;

        for (var priority = 0; priority <= maxPriority; ++priority) {
            for (var i = 0; i < events.length; ++i) {
                var event = events[i];
                if (event.name !== WebInspector.TimelineModel.RecordType.EventDispatch)
                    continue;
                var descriptor = descriptorsByType.get(event.args["data"]["type"]);
                if (!descriptor || descriptor.priority !== priority)
                    continue;
                var start = Number.constrain(Math.floor((event.startTime - timeOffset) * scale), 0, canvasWidth);
                var end = Number.constrain(Math.ceil((event.endTime - timeOffset) * scale), 0, canvasWidth);
                var width = Math.max(end - start, minWidth);
                this._renderBar(start, start + width, 0, height, descriptor.color);
            }
        }
    },

    __proto__: WebInspector.TimelineEventOverview.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview.Network = function(model)
{
    WebInspector.TimelineEventOverview.call(this, "network", WebInspector.UIString("Network"), model);
}

WebInspector.TimelineEventOverview.Network.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        this._updatePlaceholder();
        var height = this._canvas.height;
        var numBands = categoryBand(WebInspector.TimelineUIUtils.NetworkCategory.Other) + 1;
        var bandHeight = height / numBands;
        if (bandHeight % 1) {
            console.error("Network strip height should be a multiple of the categories number");
            bandHeight = Math.floor(bandHeight);
        }
        var devicePixelRatio = window.devicePixelRatio;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var canvasWidth = this._canvas.width;
        var scale = canvasWidth / timeSpan;
        var ctx = this._context;
        var requests = this._model.networkRequests();
        /** @type {!Map<string,!{waiting:!Path2D,transfer:!Path2D}>} */
        var paths = new Map();
        requests.forEach(drawRequest);
        for (var path of paths) {
            ctx.fillStyle = path[0];
            ctx.globalAlpha = 0.3;
            ctx.fill(path[1]["waiting"]);
            ctx.globalAlpha = 1;
            ctx.fill(path[1]["transfer"]);
        }

        /**
         * @param {!WebInspector.TimelineUIUtils.NetworkCategory} category
         * @return {number}
         */
        function categoryBand(category)
        {
            var categories = WebInspector.TimelineUIUtils.NetworkCategory;
            switch (category) {
            case categories.HTML: return 0;
            case categories.Script: return 1;
            case categories.Style: return 2;
            case categories.Media: return 3;
            default: return 4;
            }
        }

        /**
         * @param {!WebInspector.TimelineModel.NetworkRequest} request
         */
        function drawRequest(request)
        {
            var tickWidth = 2 * devicePixelRatio;
            var category = WebInspector.TimelineUIUtils.networkRequestCategory(request);
            var style = WebInspector.TimelineUIUtils.networkCategoryColor(category);
            var band = categoryBand(category);
            var y = band * bandHeight;
            var path = paths.get(style);
            if (!path) {
                path = { waiting: new Path2D(), transfer: new Path2D() };
                paths.set(style, path);
            }
            var s = Math.floor((request.startTime - timeOffset) * scale);
            var e = Math.ceil((request.endTime - timeOffset) * scale);
            path["waiting"].rect(s, y, e - s, bandHeight - 1);
            path["transfer"].rect(e - tickWidth / 2, y, tickWidth, bandHeight - 1);
            if (!request.responseTime)
                return;
            var r = Math.ceil((request.responseTime - timeOffset) * scale);
            path["transfer"].rect(r - tickWidth / 2, y, tickWidth, bandHeight - 1);
        }
    },

    __proto__: WebInspector.TimelineEventOverview.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview}
 * @param {string} id
 * @param {string} title
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview.Thread = function(id, title, model)
{
    WebInspector.TimelineEventOverview.call(this, id, title, model)
    this._fillStyles = {};
    var categories = WebInspector.TimelineUIUtils.categories();
    for (var category in categories) {
        this._fillStyles[category] = categories[category].fillColorStop1;
        categories[category].addEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged, this._onCategoryVisibilityChanged, this);
    }
    this._disabledCategoryFillStyle = "hsl(0, 0%, 67%)";
}

WebInspector.TimelineEventOverview.Thread.prototype = {
    /**
     * @override
     */
    dispose: function()
    {
        WebInspector.TimelineOverviewBase.prototype.dispose.call(this);
        var categories = WebInspector.TimelineUIUtils.categories();
        for (var category in categories)
            categories[category].removeEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged, this._onCategoryVisibilityChanged, this);
    },

    _onCategoryVisibilityChanged: function()
    {
        this.update();
    },

    /**
     * @param {!WebInspector.TimelineCategory} category
     * @return {string}
     */
    _categoryColor: function(category)
    {
        return category.hidden ? this._disabledCategoryFillStyle : this._fillStyles[category.name];
    },

    __proto__: WebInspector.TimelineEventOverview.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview.Thread}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview.MainThread = function(model)
{
    WebInspector.TimelineEventOverview.Thread.call(this, "main-thread", WebInspector.UIString("CPU"), model)
}

WebInspector.TimelineEventOverview.MainThread.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        this._updatePlaceholder();
        var events = this._model.mainThreadEvents();
        if (!events.length)
            return;
        var /** @const */ quantSizePx = 4 * window.devicePixelRatio;
        var height = this._canvas.height;
        var baseLine = height;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var scale = this._canvas.width / timeSpan;
        var quantTime = quantSizePx / scale;
        var quantizer = new WebInspector.Quantizer(timeOffset, quantTime, drawSample.bind(this));
        var ctx = this._context;
        var x = 0;
        var categories = WebInspector.TimelineUIUtils.categories();
        var categoryOrder = ["idle", "loading", "painting", "rendering", "scripting", "other"];
        var otherIndex = categoryOrder.indexOf("other");
        var idleIndex = 0;
        console.assert(idleIndex === categoryOrder.indexOf("idle"));
        for (var i = idleIndex + 1; i < categoryOrder.length; ++i)
            categories[categoryOrder[i]]._overviewIndex = i;
        var categoryIndexStack = [];

        /**
         * @param {!Array<number>} counters
         * @this {WebInspector.TimelineEventOverview}
         */
        function drawSample(counters)
        {
            var y = baseLine;
            for (var i = idleIndex + 1; i < counters.length; ++i) {
                if (!counters[i])
                    continue;
                var h = counters[i] / quantTime * height;
                ctx.fillStyle = this._categoryColor(categories[categoryOrder[i]]);
                ctx.fillRect(x, y - h, quantSizePx, h);
                y -= h;
            }
            x += quantSizePx;
        }

        /**
         * @param {!WebInspector.TracingModel.Event} e
         */
        function onEventStart(e)
        {
            var index = categoryIndexStack.length ? categoryIndexStack.peekLast() : idleIndex;
            quantizer.appendInterval(e.startTime, index);
            categoryIndexStack.push(WebInspector.TimelineUIUtils.eventStyle(e).category._overviewIndex || otherIndex);
        }

        /**
         * @param {!WebInspector.TracingModel.Event} e
         */
        function onEventEnd(e)
        {
            quantizer.appendInterval(e.endTime, categoryIndexStack.pop());
        }

        WebInspector.TimelineModel.forEachEvent(events, onEventStart, onEventEnd);
        quantizer.appendInterval(timeOffset + timeSpan + quantTime, idleIndex);  // Kick drawing the last bucket.
    },

    __proto__: WebInspector.TimelineEventOverview.Thread.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview.Thread}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview.OtherThreads = function(model)
{
    WebInspector.TimelineEventOverview.Thread.call(this, "other-threads", WebInspector.UIString("BG"), model);
}

WebInspector.TimelineEventOverview.OtherThreads.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        this._updatePlaceholder();
        this._model.virtualThreads().forEach(this._drawThread.bind(this));
    },

    /**
     * @param {!WebInspector.TimelineModel.VirtualThread} thread
     */
    _drawThread: function(thread)
    {
        var events = thread.events;
        var height = this._canvas.height;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var scale = this._canvas.width / timeSpan;
        var ditherer = new WebInspector.Dithering();
        var categoryStack = [];
        var lastX = 0;

        /**
         * @param {!WebInspector.TracingModel.Event} e
         * @this {WebInspector.TimelineEventOverview}
         */
        function onEventStart(e)
        {
            var pos = (e.startTime - timeOffset) * scale;
            if (categoryStack.length) {
                var category = categoryStack.peekLast();
                var bar = ditherer.appendInterval(category, lastX, pos);
                if (bar)
                    this._renderBar(bar.start, bar.end, 0, height, this._categoryColor(category));
            }
            categoryStack.push(WebInspector.TimelineUIUtils.eventStyle(e).category);
            lastX = pos;
        }

        /**
         * @param {!WebInspector.TracingModel.Event} e
         * @this {WebInspector.TimelineEventOverview}
         */
        function onEventEnd(e)
        {
            var category = categoryStack.pop();
            var pos = (e.endTime - timeOffset) * scale;
            var bar = ditherer.appendInterval(category, lastX, pos);
            if (bar)
                this._renderBar(bar.start, bar.end, 0, height, this._categoryColor(category));
            lastX = pos;
        }

        WebInspector.TimelineModel.forEachEvent(events, onEventStart.bind(this), onEventEnd.bind(this));
    },

    __proto__: WebInspector.TimelineEventOverview.Thread.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameModelBase} frameModel
 */
WebInspector.TimelineEventOverview.Responsiveness = function(model, frameModel)
{
    WebInspector.TimelineEventOverview.call(this, "responsiveness", null, model)
    this._frameModel = frameModel;
}

WebInspector.TimelineEventOverview.Responsiveness.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        var height = this._canvas.height;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var scale = this._canvas.width / timeSpan;
        var frames = this._frameModel.frames();
        var ctx = this._context;
        var fillPath = new Path2D();
        var markersPath = new Path2D();
        for (var i = 0; i < frames.length; ++i) {
            var frame = frames[i];
            if (!frame.hasWarnings())
                continue;
            paintWarningDecoration(frame.startTime, frame.duration);
        }

        var events = this._model.mainThreadEvents();
        for (var i = 0; i < events.length; ++i) {
            if (!events[i].warning)
                continue;
            paintWarningDecoration(events[i].startTime, events[i].duration);
        }

        ctx.fillStyle = "hsl(0, 80%, 90%)";
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.fill(fillPath);
        ctx.stroke(markersPath);

        /**
         * @param {number} time
         * @param {number} duration
         */
        function paintWarningDecoration(time, duration)
        {
            var x = Math.round(scale * (time - timeOffset));
            var w = Math.round(scale * duration);
            fillPath.rect(x, 0, w, height);
            markersPath.moveTo(x + w, 0);
            markersPath.lineTo(x + w, height);
        }
    },

    __proto__: WebInspector.TimelineEventOverview.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineEventOverview}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineFrameModelBase} frameModel
 */
WebInspector.TimelineEventOverview.Frames = function(model, frameModel)
{
    WebInspector.TimelineEventOverview.call(this, "framerate", "Framerate", model);
    this._frameModel = frameModel;
}

WebInspector.TimelineEventOverview.Frames.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();
        this._updatePlaceholder();
        var height = this._canvas.height;
        var /** @const */ padding = 1 * window.devicePixelRatio;
        var /** @const */ baseFrameDurationMs = 1e3 / 60;
        var visualHeight = height - 2 * padding;
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var scale = this._canvas.width / timeSpan;
        var frames = this._frameModel.frames();
        var baseY = height - padding;
        var ctx = this._context;
        var bottomY = baseY + 10 * window.devicePixelRatio;
        var y = bottomY;
        if (!frames.length)
            return;

        var lineWidth = window.devicePixelRatio;
        var offset = lineWidth & 1 ? 0.5 : 0;
        var tickDepth = 1.5 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (var i = 0; i < frames.length; ++i) {
            var frame = frames[i];
            var x = Math.round((frame.startTime - timeOffset) * scale) + offset;
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + tickDepth);
            y = frame.idle ? bottomY : Math.round(baseY - visualHeight * Math.min(baseFrameDurationMs / frame.duration, 1)) - offset;
            ctx.lineTo(x, y + tickDepth);
            ctx.lineTo(x, y);
        }
        if (frames.length) {
            var lastFrame = frames.peekLast();
            var x = Math.round((lastFrame.startTime + lastFrame.duration - timeOffset) * scale) + offset;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(x, bottomY);
        ctx.fillStyle = "hsl(110, 50%, 88%)";
        ctx.strokeStyle = "hsl(110, 50%, 60%)";
        ctx.lineWidth = lineWidth;
        ctx.fill();
        ctx.stroke();
    },

    __proto__: WebInspector.TimelineEventOverview.prototype
}

/**
 * @constructor
 * @template T
 */
WebInspector.Dithering = function()
{
    /** @type {!Map.<?T,number>} */
    this._groupError = new Map();
    this._position = 0;
    this._lastReportedPosition = 0;
}

WebInspector.Dithering.prototype = {
    /**
     * @param {!T} group
     * @param {number} start
     * @param {number} end
     * @return {?{start: number, end: number}}
     * @template T
     */
    appendInterval: function(group, start, end)
    {
        this._innerAppend(null, start); // Append an empty space before.
        return this._innerAppend(group, end); // Append the interval itself.
    },

    /**
     * @param {?T} group
     * @param {number} position
     * @return {?{start: number, end: number}}
     * @template T
     */
    _innerAppend: function(group, position)
    {
        if (position < this._position)
            return null;
        var result = null;
        var length = position - this._position;
        length += this._groupError.get(group) || 0;
        if (length >= 1) {
            if (!group)
                length -= this._distributeExtraAmount(length - 1);
            var newReportedPosition = this._lastReportedPosition + Math.floor(length);
            result = { start: this._lastReportedPosition, end: newReportedPosition };
            this._lastReportedPosition = newReportedPosition;
            length %= 1;
        }
        this._groupError.set(group, length);
        this._position = position;
        return result;
    },

    /**
     * @param {number} amount
     * @return {number}
     */
    _distributeExtraAmount: function(amount)
    {
        var canConsume = 0;
        for (var g of this._groupError.keys()) {
            if (g)
                canConsume += 1 - this._groupError.get(g);
        }
        var toDistribute = Math.min(amount, canConsume);
        if (toDistribute <= 0)
            return 0;
        var ratio = toDistribute / canConsume;
        for (var g of this._groupError.keys()) {
            if (!g)
                continue;
            var value = this._groupError.get(g);
            value += (1 - value) * ratio;
            this._groupError.set(g, value);
        }
        return toDistribute;
    }
}

/**
 * @constructor
 * @param {number} startTime
 * @param {number} quantDuration
 * @param {function(!Array<number>)} callback
 */
WebInspector.Quantizer = function(startTime, quantDuration, callback)
{
    this._lastTime = startTime;
    this._quantDuration = quantDuration;
    this._callback = callback;
    this._counters = [];
    this._remainder = quantDuration;
}

WebInspector.Quantizer.prototype = {
    /**
     * @param {number} time
     * @param {number} group
     */
    appendInterval: function(time, group)
    {
        var interval = time - this._lastTime;
        if (interval <= this._remainder) {
            this._counters[group] = (this._counters[group] || 0) + interval;
            this._remainder -= interval;
            this._lastTime = time;
            return;
        }
        this._counters[group] = (this._counters[group] || 0) + this._remainder;
        this._callback(this._counters);
        interval -= this._remainder;
        while (interval >= this._quantDuration) {
            var counters = [];
            counters[group] = this._quantDuration;
            this._callback(counters);
            interval -= this._quantDuration;
        }
        this._counters = [];
        this._counters[group] = interval;
        this._lastTime = time;
        this._remainder = this._quantDuration - interval;
    }
}
