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
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.DOMNodeHighlighter}
 * @param {!WebInspector.Target} target
 */
WebInspector.ScreencastView = function(target)
{
    WebInspector.VBox.call(this);
    this._target = target;

    this.setMinimumSize(150, 150);
    this.registerRequiredCSS("screencastView.css");
};

WebInspector.ScreencastView._bordersSize = 44;

WebInspector.ScreencastView._navBarHeight = 29;

WebInspector.ScreencastView._HttpRegex = /^https?:\/\/(.+)/;

WebInspector.ScreencastView.prototype = {
    initialize: function()
    {
        this.element.classList.add("screencast");

        this._createNavigationBar();

        this._viewportElement = this.element.createChild("div", "screencast-viewport hidden");
        this._canvasContainerElement = this._viewportElement.createChild("div", "screencast-canvas-container");
        this._glassPaneElement = this._canvasContainerElement.createChild("div", "screencast-glasspane hidden");

        this._canvasElement = this._canvasContainerElement.createChild("canvas");
        this._canvasElement.tabIndex = 1;
        this._canvasElement.addEventListener("mousedown", this._handleMouseEvent.bind(this), false);
        this._canvasElement.addEventListener("mouseup", this._handleMouseEvent.bind(this), false);
        this._canvasElement.addEventListener("mousemove", this._handleMouseEvent.bind(this), false);
        this._canvasElement.addEventListener("mousewheel", this._handleMouseEvent.bind(this), false);
        this._canvasElement.addEventListener("click", this._handleMouseEvent.bind(this), false);
        this._canvasElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);
        this._canvasElement.addEventListener("keydown", this._handleKeyEvent.bind(this), false);
        this._canvasElement.addEventListener("keyup", this._handleKeyEvent.bind(this), false);
        this._canvasElement.addEventListener("keypress", this._handleKeyEvent.bind(this), false);

        this._titleElement = this._canvasContainerElement.createChild("div", "screencast-element-title monospace hidden");
        this._tagNameElement = this._titleElement.createChild("span", "screencast-tag-name");
        this._nodeIdElement = this._titleElement.createChild("span", "screencast-node-id");
        this._classNameElement = this._titleElement.createChild("span", "screencast-class-name");
        this._titleElement.appendChild(document.createTextNode(" "));
        this._nodeWidthElement = this._titleElement.createChild("span");
        this._titleElement.createChild("span", "screencast-px").textContent = "px";
        this._titleElement.appendChild(document.createTextNode(" \u00D7 "));
        this._nodeHeightElement = this._titleElement.createChild("span");
        this._titleElement.createChild("span", "screencast-px").textContent = "px";

        this._imageElement = new Image();
        this._isCasting = false;
        this._context = this._canvasElement.getContext("2d");
        this._checkerboardPattern = this._createCheckerboardPattern(this._context);

        this._shortcuts = /** !Object.<number, function(Event=):boolean> */ ({});
        this._shortcuts[WebInspector.KeyboardShortcut.makeKey("l", WebInspector.KeyboardShortcut.Modifiers.Ctrl)] = this._focusNavigationBar.bind(this);

        WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastFrame, this._screencastFrame, this);
        WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastVisibilityChanged, this._screencastVisibilityChanged, this);

        WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStarted, this._onTimeline.bind(this, true), this);
        WebInspector.timelineManager.addEventListener(WebInspector.TimelineManager.EventTypes.TimelineStopped, this._onTimeline.bind(this, false), this);
        this._timelineActive = WebInspector.timelineManager.isStarted();

        WebInspector.cpuProfilerModel.addEventListener(WebInspector.CPUProfilerModel.EventTypes.ProfileStarted, this._onProfiler.bind(this, true), this);
        WebInspector.cpuProfilerModel.addEventListener(WebInspector.CPUProfilerModel.EventTypes.ProfileStopped, this._onProfiler.bind(this, false), this);
        this._profilerActive = WebInspector.cpuProfilerModel.isRecordingProfile();

        this._updateGlasspane();
    },

    wasShown: function()
    {
        this._startCasting();
    },

    willHide: function()
    {
        this._stopCasting();
    },

    _startCasting: function()
    {
        if (this._timelineActive || this._profilerActive)
            return;
        if (this._isCasting)
            return;
        this._isCasting = true;

        const maxImageDimension = 2048;
        var dimensions = this._viewportDimensions();
        if (dimensions.width < 0 || dimensions.height < 0) {
            this._isCasting = false;
            return;
        }
        dimensions.width *= window.devicePixelRatio;
        dimensions.height *= window.devicePixelRatio;
        this._target.pageAgent().startScreencast("jpeg", 80, Math.min(maxImageDimension, dimensions.width), Math.min(maxImageDimension, dimensions.height));
        this._target.domModel.setHighlighter(this);
    },

    _stopCasting: function()
    {
        if (!this._isCasting)
            return;
        this._isCasting = false;
        this._target.pageAgent().stopScreencast();
        this._target.domModel.setHighlighter(null);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _screencastFrame: function(event)
    {
        var metadata = /** type {PageAgent.ScreencastFrameMetadata} */(event.data.metadata);
        var base64Data = /** type {string} */(event.data.data);
        this._imageElement.src = "data:image/jpg;base64," + base64Data;
        this._pageScaleFactor = metadata.pageScaleFactor;
        this._screenOffsetTop = metadata.offsetTop;
        this._deviceWidth = metadata.deviceWidth;
        this._deviceHeight = metadata.deviceHeight;
        this._scrollOffsetX = metadata.scrollOffsetX;
        this._scrollOffsetY = metadata.scrollOffsetY;

        var deviceSizeRatio = metadata.deviceHeight / metadata.deviceWidth;
        var dimensionsCSS = this._viewportDimensions();

        this._imageZoom = Math.min(dimensionsCSS.width / this._imageElement.naturalWidth, dimensionsCSS.height / (this._imageElement.naturalWidth * deviceSizeRatio));
        this._viewportElement.classList.remove("hidden");
        var bordersSize = WebInspector.ScreencastView._bordersSize;
        if (this._imageZoom < 1.01 / window.devicePixelRatio)
            this._imageZoom = 1 / window.devicePixelRatio;
        this._screenZoom = this._imageElement.naturalWidth * this._imageZoom / metadata.deviceWidth;
        this._viewportElement.style.width = metadata.deviceWidth * this._screenZoom + bordersSize + "px";
        this._viewportElement.style.height = metadata.deviceHeight * this._screenZoom + bordersSize + "px";

        this.highlightDOMNode(this._highlightNode, this._highlightConfig);
    },

    _isGlassPaneActive: function()
    {
        return !this._glassPaneElement.classList.contains("hidden");
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _screencastVisibilityChanged: function(event)
    {
        this._targetInactive = !event.data.visible;
        this._updateGlasspane();
    },

    /**
     * @param {boolean} on
     * @private
     */
    _onTimeline: function(on)
    {
        this._timelineActive = on;
        if (this._timelineActive)
            this._stopCasting();
        else
            this._startCasting();
        this._updateGlasspane();
    },

    /**
     * @param {boolean} on
     * @param {!WebInspector.Event} event
     * @private
     */
    _onProfiler: function(on, event) {
        this._profilerActive = on;
        if (this._profilerActive)
            this._stopCasting();
        else
            this._startCasting();
        this._updateGlasspane();
    },

    _updateGlasspane: function()
    {
        if (this._targetInactive) {
            this._glassPaneElement.textContent = WebInspector.UIString("The tab is inactive");
            this._glassPaneElement.classList.remove("hidden");
        } else if (this._timelineActive) {
            this._glassPaneElement.textContent = WebInspector.UIString("Timeline is active");
            this._glassPaneElement.classList.remove("hidden");
        } else if (this._profilerActive) {
            this._glassPaneElement.textContent = WebInspector.UIString("CPU profiler is active");
            this._glassPaneElement.classList.remove("hidden");
        } else {
            this._glassPaneElement.classList.add("hidden");
        }
    },

    /**
     * @param {!Event} event
     */
    _handleMouseEvent: function(event)
    {
        if (this._isGlassPaneActive()) {
          event.consume();
          return;
        }

        if (!this._pageScaleFactor)
            return;

        if (!this._inspectModeConfig || event.type === "mousewheel") {
            this._simulateTouchGestureForMouseEvent(event);
            event.preventDefault();
            if (event.type === "mousedown")
                this._canvasElement.focus();
            return;
        }

        var position = this._convertIntoScreenSpace(event);
        this._target.domModel.nodeForLocation(position.x / this._pageScaleFactor + this._scrollOffsetX, position.y / this._pageScaleFactor + this._scrollOffsetY, callback.bind(this));

        /**
         * @param {?WebInspector.DOMNode} node
         * @this {WebInspector.ScreencastView}
         */
        function callback(node)
        {
            if (!node)
                return;
            if (event.type === "mousemove")
                this.highlightDOMNode(node, this._inspectModeConfig);
            else if (event.type === "click")
                WebInspector.Revealer.reveal(node);
        }
    },

    /**
     * @param {!Event} event
     */
    _handleKeyEvent: function(event)
    {
        if (this._isGlassPaneActive()) {
            event.consume();
            return;
        }

        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(/** @type {!KeyboardEvent} */ (event));
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler(event)) {
            event.consume();
            return;
        }

        var type;
        switch (event.type) {
        case "keydown": type = "keyDown"; break;
        case "keyup": type = "keyUp"; break;
        case "keypress": type = "char"; break;
        default: return;
        }

        var text = event.type === "keypress" ? String.fromCharCode(event.charCode) : undefined;
        InputAgent.dispatchKeyEvent(type, this._modifiersForEvent(event), event.timeStamp / 1000, text, text ? text.toLowerCase() : undefined,
                                    event.keyIdentifier, event.keyCode /* windowsVirtualKeyCode */, event.keyCode /* nativeVirtualKeyCode */, false, false, false);
        event.consume();
        this._canvasElement.focus();
    },

    /**
     * @param {!Event} event
     */
    _handleContextMenuEvent: function(event)
    {
        event.consume(true);
    },

    /**
     * @param {!Event} event
     */
    _simulateTouchGestureForMouseEvent: function(event)
    {
        var convertedPosition = this._convertIntoScreenSpace(event);
        var zoomedPosition = this._zoomIntoScreenSpace(event);
        var timeStamp = event.timeStamp / 1000;

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function clearPinch()
        {
            delete this._lastPinchAnchor;
            delete this._lastPinchZoomedY;
            delete this._lastPinchScale;
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function clearScroll()
        {
            delete this._lastScrollZoomedPosition;
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function scrollBegin()
        {
            InputAgent.dispatchGestureEvent("scrollBegin", convertedPosition.x, convertedPosition.y, timeStamp);
            this._lastScrollZoomedPosition = zoomedPosition;
            clearPinch.call(this);
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function scrollUpdate()
        {
            var dx = this._lastScrollZoomedPosition ? zoomedPosition.x - this._lastScrollZoomedPosition.x : 0;
            var dy = this._lastScrollZoomedPosition ? zoomedPosition.y - this._lastScrollZoomedPosition.y : 0;
            if (dx || dy) {
                InputAgent.dispatchGestureEvent("scrollUpdate", convertedPosition.x, convertedPosition.y, timeStamp, dx, dy);
                this._lastScrollZoomedPosition = zoomedPosition;
            }
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function scrollEnd()
        {
            if (this._lastScrollZoomedPosition) {
                InputAgent.dispatchGestureEvent("scrollEnd", convertedPosition.x, convertedPosition.y, timeStamp);
                clearScroll.call(this);
                return true;
            }
            return false;
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function pinchBegin()
        {
            InputAgent.dispatchGestureEvent("pinchBegin", convertedPosition.x, convertedPosition.y, timeStamp);
            this._lastPinchAnchor = convertedPosition;
            this._lastPinchZoomedY = zoomedPosition.y;
            this._lastPinchScale = 1;
            clearScroll.call(this);
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function pinchUpdate()
        {
            var dy = this._lastPinchZoomedY ? this._lastPinchZoomedY - zoomedPosition.y : 0;
            if (dy) {
                var scale = Math.exp(dy * 0.002);
                InputAgent.dispatchGestureEvent("pinchUpdate", this._lastPinchAnchor.x, this._lastPinchAnchor.y, timeStamp, 0, 0, scale / this._lastPinchScale);
                this._lastPinchScale = scale;
            }
        }

        /**
         * @this {!WebInspector.ScreencastView}
         */
        function pinchEnd()
        {
            if (this._lastPinchAnchor) {
                InputAgent.dispatchGestureEvent("pinchEnd", this._lastPinchAnchor.x, this._lastPinchAnchor.y, timeStamp);
                clearPinch.call(this);
                return true;
            }
            return false;
        }

        switch (event.which) {
        case 1: // Left
            if (event.type === "mousedown") {
                if (event.shiftKey) {
                    pinchBegin.call(this);
                } else {
                    scrollBegin.call(this);
                }
            } else if (event.type === "mousemove") {
                if (event.shiftKey) {
                    if (scrollEnd.call(this))
                        pinchBegin.call(this);
                    pinchUpdate.call(this);
                } else {
                    if (pinchEnd.call(this))
                        scrollBegin.call(this);
                    scrollUpdate.call(this);
                }
            } else if (event.type === "mouseup") {
                pinchEnd.call(this);
                scrollEnd.call(this);
            } else if (event.type === "mousewheel") {
                if (!this._lastPinchAnchor && !this._lastScrollZoomedPosition) {
                    if (event.shiftKey) {
                        var factor = 1.1;
                        var scale = event.wheelDeltaY < 0 ? 1 / factor : factor;
                        InputAgent.dispatchGestureEvent("pinchBegin", convertedPosition.x, convertedPosition.y, timeStamp);
                        InputAgent.dispatchGestureEvent("pinchUpdate", convertedPosition.x, convertedPosition.y, timeStamp, 0, 0, scale);
                        InputAgent.dispatchGestureEvent("pinchEnd", convertedPosition.x, convertedPosition.y, timeStamp);
                    } else {
                        InputAgent.dispatchGestureEvent("scrollBegin", convertedPosition.x, convertedPosition.y, timeStamp);
                        InputAgent.dispatchGestureEvent("scrollUpdate", convertedPosition.x, convertedPosition.y, timeStamp, event.wheelDeltaX, event.wheelDeltaY);
                        InputAgent.dispatchGestureEvent("scrollEnd", convertedPosition.x, convertedPosition.y, timeStamp);
                    }
                }
            } else if (event.type === "click") {
                if (!event.shiftKey) {
                    InputAgent.dispatchMouseEvent("mousePressed", convertedPosition.x, convertedPosition.y, 0, timeStamp, "left", 1, true);
                    InputAgent.dispatchMouseEvent("mouseReleased", convertedPosition.x, convertedPosition.y, 0, timeStamp, "left", 1, true);
                    // FIXME: migrate to tap once it dispatches clicks again.
                    // InputAgent.dispatchGestureEvent("tapDown", x, y, timeStamp);
                    // InputAgent.dispatchGestureEvent("tap", x, y, timeStamp);
                }
            }
            break;

        case 2: // Middle
            if (event.type === "mousedown") {
                InputAgent.dispatchGestureEvent("tapDown", convertedPosition.x, convertedPosition.y, timeStamp);
            } else if (event.type === "mouseup") {
                InputAgent.dispatchGestureEvent("tap", convertedPosition.x, convertedPosition.y, timeStamp);
            }
            break;

        case 3: // Right
        case 0: // None
        default:
        }
    },

    /**
     * @param {!Event} event
     * @return {!{x: number, y: number}}
     */
    _zoomIntoScreenSpace: function(event)
    {
        var position  = {};
        position.x = Math.round(event.offsetX / this._screenZoom);
        position.y = Math.round(event.offsetY / this._screenZoom);
        return position;
    },

    /**
     * @param {!Event} event
     * @return {!{x: number, y: number}}
     */
    _convertIntoScreenSpace: function(event)
    {
        var position = this._zoomIntoScreenSpace(event);
        position.y = Math.round(position.y - this._screenOffsetTop);
        return position;
    },

    /**
     * @param {!Event} event
     * @return {number}
     */
    _modifiersForEvent: function(event)
    {
        var modifiers = 0;
        if (event.altKey)
            modifiers = 1;
        if (event.ctrlKey)
            modifiers += 2;
        if (event.metaKey)
            modifiers += 4;
        if (event.shiftKey)
            modifiers += 8;
        return modifiers;
    },

    onResize: function()
    {
        if (this._deferredCasting) {
            clearTimeout(this._deferredCasting);
            delete this._deferredCasting;
        }

        this._stopCasting();
        this._deferredCasting = setTimeout(this._startCasting.bind(this), 100);
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @param {?DOMAgent.HighlightConfig} config
     * @param {!RuntimeAgent.RemoteObjectId=} objectId
     */
    highlightDOMNode: function(node, config, objectId)
    {
        this._highlightNode = node;
        this._highlightConfig = config;
        if (!node) {
            this._model = null;
            this._config = null;
            this._node = null;
            this._titleElement.classList.add("hidden");
            this._repaint();
            return;
        }

        this._node = node;
        node.boxModel(callback.bind(this));

        /**
         * @param {?DOMAgent.BoxModel} model
         * @this {WebInspector.ScreencastView}
         */
        function callback(model)
        {
            if (!model || !this._pageScaleFactor) {
                this._repaint();
                return;
            }
            this._model = this._scaleModel(model);
            this._config = config;
            this._repaint();
        }
    },

    /**
     * @param {!DOMAgent.BoxModel} model
     * @return {!DOMAgent.BoxModel}
     */
    _scaleModel: function(model)
    {
        /**
         * @param {!DOMAgent.Quad} quad
         * @this {WebInspector.ScreencastView}
         */
        function scaleQuad(quad)
        {
            for (var i = 0; i < quad.length; i += 2) {
                quad[i] = (quad[i] - this._scrollOffsetX) * this._pageScaleFactor * this._screenZoom;
                quad[i + 1] = ((quad[i + 1] - this._scrollOffsetY) * this._pageScaleFactor + this._screenOffsetTop) * this._screenZoom;
            }
        }

        scaleQuad.call(this, model.content);
        scaleQuad.call(this, model.padding);
        scaleQuad.call(this, model.border);
        scaleQuad.call(this, model.margin);
        return model;
    },

    _repaint: function()
    {
        var model = this._model;
        var config = this._config;

        var canvasWidth = this._canvasElement.getBoundingClientRect().width;
        var canvasHeight = this._canvasElement.getBoundingClientRect().height;
        this._canvasElement.width = window.devicePixelRatio * canvasWidth;
        this._canvasElement.height = window.devicePixelRatio * canvasHeight;

        this._context.save();
        this._context.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Paint top and bottom gutter.
        this._context.save();
        this._context.fillStyle = this._checkerboardPattern;
        this._context.fillRect(0, 0, canvasWidth, this._screenOffsetTop * this._screenZoom);
        this._context.fillRect(0, this._screenOffsetTop * this._screenZoom + this._imageElement.naturalHeight * this._imageZoom, canvasWidth, canvasHeight);
        this._context.restore();

        if (model && config) {
            this._context.save();
            const transparentColor = "rgba(0, 0, 0, 0)";
            var hasContent = model.content && config.contentColor !== transparentColor;
            var hasPadding = model.padding && config.paddingColor !== transparentColor;
            var hasBorder = model.border && config.borderColor !== transparentColor;
            var hasMargin = model.margin && config.marginColor !== transparentColor;

            var clipQuad;
            if (hasMargin && (!hasBorder || !this._quadsAreEqual(model.margin, model.border))) {
                this._drawOutlinedQuadWithClip(model.margin, model.border, config.marginColor);
                clipQuad = model.border;
            }
            if (hasBorder && (!hasPadding || !this._quadsAreEqual(model.border, model.padding))) {
                this._drawOutlinedQuadWithClip(model.border, model.padding, config.borderColor);
                clipQuad = model.padding;
            }
            if (hasPadding && (!hasContent || !this._quadsAreEqual(model.padding, model.content))) {
                this._drawOutlinedQuadWithClip(model.padding, model.content, config.paddingColor);
                clipQuad = model.content;
            }
            if (hasContent)
                this._drawOutlinedQuad(model.content, config.contentColor);
            this._context.restore();

            this._drawElementTitle();

            this._context.globalCompositeOperation = "destination-over";
        }

        this._context.drawImage(this._imageElement, 0, this._screenOffsetTop * this._screenZoom, this._imageElement.naturalWidth * this._imageZoom, this._imageElement.naturalHeight * this._imageZoom);
        this._context.restore();

    },


    /**
     * @param {!DOMAgent.Quad} quad1
     * @param {!DOMAgent.Quad} quad2
     * @return {boolean}
     */
    _quadsAreEqual: function(quad1, quad2)
    {
        for (var i = 0; i < quad1.length; ++i) {
            if (quad1[i] !== quad2[i])
                return false;
        }
        return true;
    },

    /**
     * @param {!DOMAgent.RGBA} color
     * @return {string}
     */
    _cssColor: function(color)
    {
        if (!color)
            return "transparent";
        return WebInspector.Color.fromRGBA([color.r, color.g, color.b, color.a]).toString(WebInspector.Color.Format.RGBA) || "";
    },

    /**
     * @param {!DOMAgent.Quad} quad
     * @return {!CanvasRenderingContext2D}
     */
    _quadToPath: function(quad)
    {
        this._context.beginPath();
        this._context.moveTo(quad[0], quad[1]);
        this._context.lineTo(quad[2], quad[3]);
        this._context.lineTo(quad[4], quad[5]);
        this._context.lineTo(quad[6], quad[7]);
        this._context.closePath();
        return this._context;
    },

    /**
     * @param {!DOMAgent.Quad} quad
     * @param {!DOMAgent.RGBA} fillColor
     */
    _drawOutlinedQuad: function(quad, fillColor)
    {
        this._context.save();
        this._context.lineWidth = 2;
        this._quadToPath(quad).clip();
        this._context.fillStyle = this._cssColor(fillColor);
        this._context.fill();
        this._context.restore();
    },

    /**
     * @param {!DOMAgent.Quad} quad
     * @param {!DOMAgent.Quad} clipQuad
     * @param {!DOMAgent.RGBA} fillColor
     */
    _drawOutlinedQuadWithClip: function (quad, clipQuad, fillColor)
    {
        this._context.fillStyle = this._cssColor(fillColor);
        this._context.save();
        this._context.lineWidth = 0;
        this._quadToPath(quad).fill();
        this._context.globalCompositeOperation = "destination-out";
        this._context.fillStyle = "red";
        this._quadToPath(clipQuad).fill();
        this._context.restore();
    },

    _drawElementTitle: function()
    {
        if (!this._node)
            return;

        var canvasWidth = this._canvasElement.getBoundingClientRect().width;
        var canvasHeight = this._canvasElement.getBoundingClientRect().height;

        var lowerCaseName = this._node.localName() || this._node.nodeName().toLowerCase();
        this._tagNameElement.textContent = lowerCaseName;
        this._nodeIdElement.textContent = this._node.getAttribute("id") ? "#" + this._node.getAttribute("id") : "";
        this._nodeIdElement.textContent = this._node.getAttribute("id") ? "#" + this._node.getAttribute("id") : "";
        var className = this._node.getAttribute("class");
        if (className && className.length > 50)
           className = className.substring(0, 50) + "\u2026";
        this._classNameElement.textContent = className || "";
        this._nodeWidthElement.textContent = this._model.width;
        this._nodeHeightElement.textContent = this._model.height;

        var marginQuad = this._model.margin;
        var titleWidth = this._titleElement.offsetWidth + 6;
        var titleHeight = this._titleElement.offsetHeight + 4;

        var anchorTop = this._model.margin[1];
        var anchorBottom = this._model.margin[7];

        const arrowHeight = 7;
        var renderArrowUp = false;
        var renderArrowDown = false;

        var boxX = Math.max(2, this._model.margin[0]);
        if (boxX + titleWidth > canvasWidth)
            boxX = canvasWidth - titleWidth - 2;

        var boxY;
        if (anchorTop > canvasHeight) {
            boxY = canvasHeight - titleHeight - arrowHeight;
            renderArrowDown = true;
        } else if (anchorBottom < 0) {
            boxY = arrowHeight;
            renderArrowUp = true;
        } else if (anchorBottom + titleHeight + arrowHeight < canvasHeight) {
            boxY = anchorBottom + arrowHeight - 4;
            renderArrowUp = true;
        } else if (anchorTop - titleHeight - arrowHeight > 0) {
            boxY = anchorTop - titleHeight - arrowHeight + 3;
            renderArrowDown = true;
        } else
            boxY = arrowHeight;

        this._context.save();
        this._context.translate(0.5, 0.5);
        this._context.beginPath();
        this._context.moveTo(boxX, boxY);
        if (renderArrowUp) {
            this._context.lineTo(boxX + 2 * arrowHeight, boxY);
            this._context.lineTo(boxX + 3 * arrowHeight, boxY - arrowHeight);
            this._context.lineTo(boxX + 4 * arrowHeight, boxY);
        }
        this._context.lineTo(boxX + titleWidth, boxY);
        this._context.lineTo(boxX + titleWidth, boxY + titleHeight);
        if (renderArrowDown) {
            this._context.lineTo(boxX + 4 * arrowHeight, boxY + titleHeight);
            this._context.lineTo(boxX + 3 * arrowHeight, boxY + titleHeight + arrowHeight);
            this._context.lineTo(boxX + 2 * arrowHeight, boxY + titleHeight);
        }
        this._context.lineTo(boxX, boxY + titleHeight);
        this._context.closePath();
        this._context.fillStyle = "rgb(255, 255, 194)";
        this._context.fill();
        this._context.strokeStyle = "rgb(128, 128, 128)";
        this._context.stroke();

        this._context.restore();

        this._titleElement.classList.remove("hidden");
        this._titleElement.style.top = (boxY + 3) + "px";
        this._titleElement.style.left = (boxX + 3) + "px";
    },

    /**
     * @return {!{width: number, height: number}}
     */
    _viewportDimensions: function()
    {
        const gutterSize = 30;
        const bordersSize = WebInspector.ScreencastView._bordersSize;
        var width = this.element.offsetWidth - bordersSize - gutterSize;
        var height = this.element.offsetHeight - bordersSize - gutterSize - WebInspector.ScreencastView._navBarHeight;
        return { width: width, height: height };
    },

    /**
     * @param {boolean} enabled
     * @param {boolean} inspectUAShadowDOM
     * @param {!DOMAgent.HighlightConfig} config
     * @param {function(?Protocol.Error)=} callback
     */
    setInspectModeEnabled: function(enabled, inspectUAShadowDOM, config, callback)
    {
        this._inspectModeConfig = enabled ? config : null;
        if (callback)
            callback(null);
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     */
    _createCheckerboardPattern: function(context)
    {
        var pattern = /** @type {!HTMLCanvasElement} */(document.createElement("canvas"));
        const size = 32;
        pattern.width = size * 2;
        pattern.height = size * 2;
        var pctx = pattern.getContext("2d");

        pctx.fillStyle = "rgb(195, 195, 195)";
        pctx.fillRect(0, 0, size * 2, size * 2);

        pctx.fillStyle = "rgb(225, 225, 225)";
        pctx.fillRect(0, 0, size, size);
        pctx.fillRect(size, size, size, size);
        return context.createPattern(pattern, "repeat");
    },

    _createNavigationBar: function()
    {
        this._navigationBar = this.element.createChild("div", "toolbar-background toolbar-colors screencast-navigation");
        if (WebInspector.queryParam("hideNavigation"))
            this._navigationBar.classList.add("hidden");

        this._navigationBack = this._navigationBar.createChild("button", "back");
        this._navigationBack.disabled = true;
        this._navigationBack.addEventListener("click", this._navigateToHistoryEntry.bind(this, -1), false);

        this._navigationForward = this._navigationBar.createChild("button", "forward");
        this._navigationForward.disabled = true;
        this._navigationForward.addEventListener("click", this._navigateToHistoryEntry.bind(this, 1), false);

        this._navigationReload = this._navigationBar.createChild("button", "reload");
        this._navigationReload.addEventListener("click", this._navigateReload.bind(this), false);

        this._navigationUrl = this._navigationBar.createChild("input");
        this._navigationUrl.type = "text";
        this._navigationUrl.addEventListener('keyup', this._navigationUrlKeyUp.bind(this), true);

        this._navigationProgressBar = new WebInspector.ScreencastView.ProgressTracker(this._navigationBar.createChild("div", "progress"));

        this._requestNavigationHistory();
        WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.InspectedURLChanged, this._requestNavigationHistory, this);
    },

    _navigateToHistoryEntry: function(offset)
    {
        var newIndex = this._historyIndex + offset;
        if (newIndex < 0 || newIndex >= this._historyEntries.length)
          return;
        PageAgent.navigateToHistoryEntry(this._historyEntries[newIndex].id);
        this._requestNavigationHistory();
    },

    _navigateReload: function()
    {
        WebInspector.resourceTreeModel.reloadPage();
    },

    _navigationUrlKeyUp: function(event)
    {
        if (event.keyIdentifier != 'Enter')
            return;
        var url = this._navigationUrl.value;
        if (!url)
            return;
        if (!url.match(WebInspector.ScreencastView._HttpRegex))
            url = "http://" + url;
        PageAgent.navigate(url);
        this._canvasElement.focus();
    },

    _requestNavigationHistory: function()
    {
        PageAgent.getNavigationHistory(this._onNavigationHistory.bind(this));
    },

    _onNavigationHistory: function(error, currentIndex, entries)
    {
        if (error)
          return;

        this._historyIndex = currentIndex;
        this._historyEntries = entries;

        this._navigationBack.disabled = currentIndex == 0;
        this._navigationForward.disabled = currentIndex == (entries.length - 1);

        var url = entries[currentIndex].url;
        var match = url.match(WebInspector.ScreencastView._HttpRegex);
        if (match)
            url = match[1];
        InspectorFrontendHost.inspectedURLChanged(url);
        this._navigationUrl.value = url;
    },

    _focusNavigationBar: function()
    {
        this._navigationUrl.focus();
        this._navigationUrl.select();
        return true;
    },

  __proto__: WebInspector.VBox.prototype
}

/**
 * @param {!Element} element
 * @constructor
 */
WebInspector.ScreencastView.ProgressTracker = function(element) {
    this._element = element;

    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._onMainFrameNavigated, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.Load, this._onLoad, this);

    WebInspector.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestStarted, this._onRequestStarted, this);
    WebInspector.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestFinished, this._onRequestFinished, this);
};

WebInspector.ScreencastView.ProgressTracker.prototype = {
    _onMainFrameNavigated: function()
    {
        this._requestIds = {};
        this._startedRequests = 0;
        this._finishedRequests = 0;
        this._maxDisplayedProgress = 0;
        this._updateProgress(0.1);  // Display first 10% on navigation start.
    },

    _onLoad: function()
    {
        delete this._requestIds;
        this._updateProgress(1);  // Display 100% progress on load, hide it in 0.5s.
        setTimeout(function() {
            if (!this._navigationProgressVisible())
                this._displayProgress(0);
        }.bind(this), 500);
    },

    _navigationProgressVisible: function()
    {
        return !!this._requestIds;
    },

    _onRequestStarted: function(event)
    {
      if (!this._navigationProgressVisible())
          return;
      var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
      // Ignore long-living WebSockets for the sake of progress indicator, as we won't be waiting them anyway.
      if (request.type === WebInspector.resourceTypes.WebSocket)
          return;
      this._requestIds[request.requestId] = request;
      ++this._startedRequests;
    },

    _onRequestFinished: function(event)
    {
        if (!this._navigationProgressVisible())
            return;
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        if (!(request.requestId in this._requestIds))
            return;
        ++this._finishedRequests;
        setTimeout(function() {
            this._updateProgress(this._finishedRequests / this._startedRequests * 0.9);  // Finished requests drive the progress up to 90%.
        }.bind(this), 500);  // Delay to give the new requests time to start. This makes the progress smoother.
    },

    _updateProgress: function(progress)
    {
        if (!this._navigationProgressVisible())
          return;
        if (this._maxDisplayedProgress >= progress)
          return;
        this._maxDisplayedProgress = progress;
        this._displayProgress(progress);
    },

    _displayProgress: function(progress)
    {
        this._element.style.width = (100 * progress) + "%";
    }
};
