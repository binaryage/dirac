// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.HBox}
 * @implements {WebInspector.TracingManagerClient}
 * @param {!WebInspector.NetworkTimeCalculator} calculator
 */
WebInspector.NetworkFilmStripView = function(calculator)
{
    WebInspector.HBox.call(this, true);
    this.registerRequiredCSS("network/networkFilmStripView.css");
    this.element.classList.add("network-film-strip-view");
    this.contentElement.classList.add("shadow-network-film-strip-view");

    /** @type {!WebInspector.NetworkTimeCalculator} */
    this._calculator = calculator;

    this.reset();
}

WebInspector.NetworkFilmStripView._maximumFrameCount = 60;

WebInspector.NetworkFilmStripView.Events = {
    FrameSelected: "FrameSelected",
}

WebInspector.NetworkFilmStripView.prototype = {
    /**
     * @override
     */
    tracingStarted: function()
    {
    },

    /**
     * @override
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    traceEventsCollected: function(events)
    {
        if (this._tracingModel)
            this._tracingModel.addEvents(events);
    },

    /**
     * @override
     */
    tracingComplete: function()
    {
        if (!this._tracingModel)
            return;
        this._tracingModel.tracingComplete();

        var frames = [];
        var browserProcess = this._tracingModel.processByName("Browser");
        if (browserProcess) {
            var mainThread = browserProcess.threadByName("CrBrowserMain");
            if (mainThread) {
                var events = mainThread.events();
                for (var i = 0; i < events.length; ++i) {
                    if (events[i].category === "disabled-by-default-devtools.screenshot" && events[i].name === "CaptureFrame") {
                        var data = events[i].args.data;
                        var timestamp = events[i].startTime / 1000.0;
                        if (data)
                            frames.push(new WebInspector.NetworkFilmStripFrame(this, data, timestamp));
                    }
                }
            }
        }

        if (!frames.length) {
            this.reset();
            return;
        }
        this._label.remove();

        for (var i = 0; i < frames.length; ++i)
            frames[i].show(this.contentElement);
        this._frames = frames;
        this._updateTimeOffset(true);
    },

    reset: function()
    {
        this.contentElement.removeChildren();
        /** @type {?number} */
        this._timeOffset = null;
        /** @type {!Array.<!WebInspector.NetworkFilmStripFrame>} */
        this._frames = [];
        /** @type {?WebInspector.NetworkFilmStripFrame} */
        this._selectedFrame = null;

        /** @type {?WebInspector.TracingModel} */
        this._tracingModel = null;

        this._label = this.contentElement.createChild("div", "label");
        this._label.textContent = WebInspector.UIString("No frames recorded. Reload page to start recording.");
    },

    /**
     * @override
     */
    tracingBufferUsage: function()
    {
    },

    /**
     * @override
     * @param {number} progress
     */
    eventsRetrievalProgress: function(progress)
    {
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._calculator.addEventListener(WebInspector.NetworkTimeCalculator.Events.BoundariesChanged, this._onTimeOffsetChanged, this);
        this._updateTimeOffset();
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._calculator.removeEventListener(WebInspector.NetworkTimeCalculator.Events.BoundariesChanged, this._onTimeOffsetChanged, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onTimeOffsetChanged: function(event)
    {
        this._updateTimeOffset();
    },

    /**
     * @param {boolean=} force
     */
    _updateTimeOffset: function(force)
    {
        var offset = this._calculator.zeroTime();
        if (offset === this._timeOffset && !force)
            return;
        this._timeOffset = offset;
        for (var i = 0; i < this._frames.length; ++i)
            this._frames[i]._setTimeOffset(offset);
    },

    startRecording: function()
    {
        if (this._target)
            return;

        this.reset();
        this._target = WebInspector.targetManager.mainTarget();
        this._tracingModel = new WebInspector.TracingModel(new WebInspector.TempFileBackingStorage("tracing"));
        this._target.tracingManager.start(this, "-*,disabled-by-default-devtools.screenshot", "");
        this._label.textContent = WebInspector.UIString("Recording frames...");
    },

    stopRecording: function()
    {
        if (!this._target)
            return;

        this._target.tracingManager.stop();
        this._target = null;
    },

    /**
     * @param {!WebInspector.NetworkFilmStripFrame} frame
     */
    _selectFrame: function(frame)
    {
        this.dispatchEventToListeners(WebInspector.NetworkFilmStripView.Events.FrameSelected, frame);
    },

    __proto__: WebInspector.HBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.NetworkFilmStripView} parent
 * @param {?string} imageData
 * @param {number} timestamp
 */
WebInspector.NetworkFilmStripFrame = function(parent, imageData, timestamp)
{
    this._parent = parent;
    this._timestamp = timestamp;
    this._element = createElementWithClass("div", "frame");
    this._element.createChild("div", "thumbnail").createChild("img").src = "data:image/jpg;base64," + imageData;
    this._timeLabel = this._element.createChild("div", "time");
    this._element.addEventListener("mousedown", this._onMouseDown.bind(this), false);
}

WebInspector.NetworkFilmStripFrame.prototype = {
    /**
     * @param {!Element} parent
     */
    show: function(parent)
    {
        parent.appendChild(this._element);
    },

    /**
     * @param {!Event} event
     */
    _onMouseDown: function(event)
    {
        this._parent._selectFrame(this);
    },

    /**
     * @return {number}
     */
    timestamp: function()
    {
        return this._timestamp;
    },

    /**
     * @param {number} offset
     */
    _setTimeOffset: function(offset)
    {
        this._timeLabel.textContent = Number.secondsToString(this._timestamp - offset);
    }
}
