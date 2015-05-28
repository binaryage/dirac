// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.HBox}
 */
WebInspector.FilmStripView = function()
{
    WebInspector.HBox.call(this, true);
    this.registerRequiredCSS("components_lazy/filmStripView.css");
    this.contentElement.classList.add("film-strip-view");
    this._mode = WebInspector.FilmStripView.Modes.TimeBased;
    this.reset();
}

WebInspector.FilmStripView.Events = {
    FrameSelected: "FrameSelected",
    FrameEnter: "FrameEnter",
    FrameExit: "FrameExit",
}

WebInspector.FilmStripView.Modes = {
    TimeBased: "TimeBased",
    FrameBased: "FrameBased"
}

WebInspector.FilmStripView.prototype = {
    /**
     * @param {string} mode
     */
    setMode: function(mode)
    {
        this._mode = mode;
        this.update();
    },

    /**
     * @param {!WebInspector.FilmStripModel} filmStripModel
     * @param {number} zeroTime
     * @param {number} spanTime
     */
    setModel: function(filmStripModel, zeroTime, spanTime)
    {
        this._model = filmStripModel;
        this._zeroTime = zeroTime;
        this._spanTime = spanTime;
        var frames = filmStripModel.frames();
        if (!frames.length) {
            this.reset();
            return;
        }
        this.update();
    },

    update: function()
    {
        if (!this._model)
            return;
        var frames = this._model.frames();
        if (!frames.length)
            return;
        this.contentElement.removeChildren();
        this._label.remove();
        var zeroTime = this._zeroTime;

        /**
         * @param {!WebInspector.FilmStripModel.Frame} frame
         * @param {boolean=} skipTimeLabel
         * @return {!Element}
         * @this {WebInspector.FilmStripView}
         */
        function createElementForFrame(frame, skipTimeLabel)
        {
            var time = frame.timestamp;
            var element = createElementWithClass("div", "frame");
            element.createChild("div", "thumbnail").createChild("img").src = "data:image/jpg;base64," + frame.imageData;
            if (!skipTimeLabel)
                element.createChild("div", "time").textContent = Number.millisToString(time - zeroTime);
            element.addEventListener("mousedown", this._onMouseEvent.bind(this, WebInspector.FilmStripView.Events.FrameSelected, time), false);
            element.addEventListener("mouseenter", this._onMouseEvent.bind(this, WebInspector.FilmStripView.Events.FrameEnter, time), false);
            element.addEventListener("mouseout", this._onMouseEvent.bind(this, WebInspector.FilmStripView.Events.FrameExit, time), false);
            element.addEventListener("dblclick", this._onDoubleClick.bind(this, frame), false);
            this.contentElement.appendChild(element);
            return element;
        }

        if (this._mode === WebInspector.FilmStripView.Modes.FrameBased) {
            for (var frame of frames)
                createElementForFrame.call(this, frame);
            return;
        }

        /**
         * @return {!Element}
         * @this {WebInspector.FilmStripView}
         */
        function createEmptyElement()
        {
            var element = createElementWithClass("div", "frame");
            this.contentElement.appendChild(element);
            return element;
        }

        /**
         * @param {number} time
         * @param {!WebInspector.FilmStripModel.Frame} frame
         * @return {number}
         */
        function comparator(time, frame)
        {
            return time - frame.timestamp;
        }

        var width = this.contentElement.clientWidth;
        var scale = this._spanTime / width;

        // Calculate frame width basing on the first frame.
        var tempElement = createElementWithClass("div", "frame");
        tempElement.createChild("div", "thumbnail").createChild("img").src = "data:image/jpg;base64," + frames[0].imageData;
        var frameWidth = Math.ceil(WebInspector.measurePreferredSize(tempElement, this.contentElement).width);
        if (!frameWidth)
            return;

        for (var pos = frameWidth; pos < width; pos += frameWidth) {
            var time = pos * scale + zeroTime;
            var index = frames.upperBound(time, comparator) - 1;
            var element = index >= 0 ? createElementForFrame.call(this, frames[index], true) : createEmptyElement.call(this);
            element.style.width = frameWidth + "px";
        }
    },

    /**
     * @override
     */
    onResize: function()
    {
        if (this._mode === WebInspector.FilmStripView.Modes.FrameBased)
            return;
        this.update();
    },

    /**
     * @param {string} eventName
     * @param {number} timestamp
     */
    _onMouseEvent: function(eventName, timestamp)
    {
        this.dispatchEventToListeners(eventName, timestamp);
    },

    /**
     * @param {!WebInspector.FilmStripModel.Frame} filmStripFrame
     */
    _onDoubleClick: function(filmStripFrame)
    {
        WebInspector.Dialog.show(null, new WebInspector.FilmStripView.DialogDelegate(filmStripFrame, this._zeroTime));
    },

    reset: function()
    {
        this._zeroTime = 0;
        this.contentElement.removeChildren();
        this._label = this.contentElement.createChild("div", "label");
        this._label.textContent = WebInspector.UIString("No frames recorded. Reload page to start recording.");
    },

    setRecording: function()
    {
        this.reset();
        this._label.textContent = WebInspector.UIString("Recording frames...");
    },

    setFetching: function()
    {
        this._label.textContent = WebInspector.UIString("Fetching frames...");
    },

    __proto__: WebInspector.HBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.DialogDelegate}
 * @param {!WebInspector.FilmStripModel.Frame} filmStripFrame
 * @param {number=} zeroTime
 */
WebInspector.FilmStripView.DialogDelegate = function(filmStripFrame, zeroTime)
{
    WebInspector.DialogDelegate.call(this);
    var shadowRoot = this.element.createShadowRoot();
    shadowRoot.appendChild(WebInspector.Widget.createStyleElement("components_lazy/filmStripDialog.css"));
    this._contentElement = shadowRoot.createChild("div", "filmstrip-dialog");
    this._contentElement.tabIndex = 0;

    this._frames = filmStripFrame.model().frames();
    this._index = filmStripFrame.index;
    this._zeroTime = zeroTime || filmStripFrame.model().zeroTime();

    this._imageElement = this._contentElement.createChild("img");
    var footerElement = this._contentElement.createChild("div", "filmstrip-dialog-footer");
    footerElement.createChild("div", "flex-auto");
    var prevButton = createTextButton("\u25C0", this._onPrevFrame.bind(this), undefined, WebInspector.UIString("Previous frame"));
    footerElement.appendChild(prevButton);
    this._timeLabel = footerElement.createChild("div", "filmstrip-dialog-label");
    var nextButton = createTextButton("\u25B6", this._onNextFrame.bind(this), undefined, WebInspector.UIString("Next frame"));
    footerElement.appendChild(nextButton);
    footerElement.createChild("div", "flex-auto");

    this._render();
    this._contentElement.addEventListener("keydown", this._keyDown.bind(this), false);
}

WebInspector.FilmStripView.DialogDelegate.prototype = {
    /**
     * @override
     */
    focus: function()
    {
        this._contentElement.focus();
    },

    /**
     * @param {!Event} event
     */
    _keyDown: function(event)
    {
        switch (event.keyIdentifier) {
        case "Left":
            if (WebInspector.isMac() && event.metaKey)
                this._onFirstFrame();
            else
                this._onPrevFrame();
            break;

        case "Right":
            if (WebInspector.isMac() && event.metaKey)
                this._onLastFrame();
            else
                this._onNextFrame();
            break;

        case "Home":
            this._onFirstFrame();
            break;

        case "End":
            this._onLastFrame();
            break;
        }
    },

    _onPrevFrame: function()
    {
        if (this._index > 0)
            --this._index;
        this._render();
    },

    _onNextFrame: function()
    {
        if (this._index < this._frames.length - 1)
            ++this._index;
        this._render();
    },

    _onFirstFrame: function()
    {
        this._index = 0;
        this._render();
    },

    _onLastFrame: function()
    {
        this._index = this._frames.length - 1;
        this._render();
    },

    _render: function()
    {
        var frame = this._frames[this._index];
        this._imageElement.src = "data:image/jpg;base64," + frame.imageData;
        this._timeLabel.textContent = Number.millisToString(frame.timestamp - this._zeroTime);
    },

    __proto__: WebInspector.DialogDelegate.prototype
}
