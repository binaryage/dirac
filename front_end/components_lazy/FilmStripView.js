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
    this.reset();
}

WebInspector.FilmStripView.Events = {
    FrameSelected: "FrameSelected",
}

WebInspector.FilmStripView.prototype = {
    /**
     * @param {!WebInspector.TracingModel} tracingModel
     * @param {number} zeroTime
     */
    setFramesFromModel: function(tracingModel, zeroTime)
    {
        var frames = new WebInspector.FilmStripModel(tracingModel).frames();
        if (!frames.length) {
            this.reset();
            return;
        }

        this._zeroTime = zeroTime;
        this.contentElement.removeChildren();
        this._label.remove();
        for (var i = 0; i < frames.length; ++i) {
            var element = createElementWithClass("div", "frame");
            element.createChild("div", "thumbnail").createChild("img").src = "data:image/jpg;base64," + frames[i].imageData;
            element.createChild("div", "time").textContent = Number.millisToString(frames[i].timestamp - zeroTime);
            element.addEventListener("mousedown", this._onMouseDown.bind(this, frames[i].timestamp), false);
            element.addEventListener("dblclick", this._onDoubleClick.bind(this, frames[i]), false);
            this.contentElement.appendChild(element);
        }
    },

    /**
     * @param {number} timestamp
     */
    _onMouseDown: function(timestamp)
    {
        this.dispatchEventToListeners(WebInspector.FilmStripView.Events.FrameSelected, timestamp);
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
    shadowRoot.appendChild(WebInspector.View.createStyleElement("components_lazy/filmStripDialog.css"));
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
        if (event.keyIdentifier === "Left") {
            if (WebInspector.isMac() && event.metaKey) {
                this._onFirstFrame();
                return;
            }

            this._onPrevFrame();
            return;
        }
        if (event.keyIdentifier === "Right") {
            if (WebInspector.isMac() && event.metaKey) {
                this._onLastFrame();
                return;
            }

            this._onNextFrame();
        }
        if (event.keyIdentifier === "Home") {
            this._onFirstFrame();
            return;
        }
        if (event.keyIdentifier === "End") {
            this._onLastFrame();
            return;
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
