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
 * @implements {WebInspector.DOMNodeHighlighter}
 */
WebInspector.ScreencastView = function()
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("screencastView.css");

    this.element.addStyleClass("fill");
    this.element.addStyleClass("screencast");
    this._viewportElement = this.element.createChild("div", "screencast-viewport");

    this._isCasting = false;
    this._imageElement = this._viewportElement.createChild("img");
    this._imageElement.tabIndex = 1;
    this._imageElement.addEventListener("mousedown", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("mouseup", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("mousemove", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("mousewheel", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("click", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);
    this._imageElement.addEventListener("keydown", this._handleKeyEvent.bind(this), false);
    this._imageElement.addEventListener("keyup", this._handleKeyEvent.bind(this), false);
    this._imageElement.addEventListener("keypress", this._handleKeyEvent.bind(this), false);

    this._titleElement = this._viewportElement.createChild("div", "screencast-element-title monospace hidden");
    this._tagNameElement = this._titleElement.createChild("span", "screencast-tag-name");
    this._nodeIdElement = this._titleElement.createChild("span", "screencast-node-id");
    this._classNameElement = this._titleElement.createChild("span", "screencast-class-name");
    this._titleElement.appendChild(document.createTextNode(" "));
    this._nodeWidthElement = this._titleElement.createChild("span");
    this._titleElement.createChild("span", "screencast-px").textContent = "px";
    this._titleElement.appendChild(document.createTextNode(" \u00D7 "));
    this._nodeHeightElement = this._titleElement.createChild("span");
    this._titleElement.createChild("span", "screencast-px").textContent = "px";

    this._canvasElement = this._viewportElement.createChild("canvas");
    this._context = this._canvasElement.getContext("2d");

    this._scale = 0.7;

    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.ScreencastFrame, this._screencastFrame, this);
}

WebInspector.ScreencastView.prototype = {
    wasShown: function()
    {
        this.startCasting();
    },

    willHide: function()
    {
        this.stopCasting();
    },

    startCasting: function()
    {
        if (this._isCasting)
            return;
        this._isCasting = true;
        PageAgent.startScreencast("jpeg", 80, this._scale);
        WebInspector.domAgent.setHighlighter(this);
    },

    stopCasting: function()
    {
        if (!this._isCasting)
            return;
        this._isCasting = false;
        PageAgent.stopScreencast();
        WebInspector.domAgent.setHighlighter(null);
    },

    /**
     * @param {WebInspector.Event} event
     */
    _screencastFrame: function(event)
    {
        var base64Data = /** type {string} */(event.data);
        var previousWidth = this._imageElement.naturalWidth;
        var previousHeight = this._imageElement.naturalHeight;
        this._imageElement.src = "data:image/jpg;base64," + base64Data;
        if (previousWidth !== this._imageElement.naturalWidth || previousHeight !== this._imageElement.naturalHeight)
            this.onResize();
        this.highlightDOMNode(this._highlightNodeId, this._highlightConfig);
    },

    /**
     * @param {Event} event
     */
    _handleMouseEvent: function(event)
    {
        if (!WebInspector.inspectElementModeController.enabled()) {
            this._simulateTouchGestureForMouseEvent(event);
            event.consume(true);
            return;
        }
        var type;
        switch (event.type) {
        case "mousedown": type = "mousePressed"; break;
        case "mouseup": type = "mouseReleased"; break;
        case "mousemove": type = "mouseMoved"; break;
        default: return;
        }
        var button;
        switch (event.which) {
        case 0: button = "none"; break;
        case 1: button = "left"; break;
        case 2: button = "middle"; break;
        case 3: button = "right"; break;
        default: return;
        }

        var position = this._convertIntoScreenSpace(event);
        InputAgent.dispatchMouseEvent(type, position.x, position.y, this._modifiersForEvent(event), event.timeStamp / 1000, button, event.detail, true);
        this.element.focus();
        event.consume(true);
    },

    /**
     * @param {Event} event
     */
    _handleKeyEvent: function(event)
    {
        var type;
        switch (event.type) {
        case "keydown": type = "keyDown"; break;
        case "keyup": type = "keyUp"; break;
        case "keypress": type = "char"; break;
        default: return;
        }

        var text = event.type === "keypress" ? String.fromCharCode(event.charCode) : undefined;
        InputAgent.dispatchKeyEvent(type, this._modifiersForEvent(event), event.timeStamp / 1000, text, text ? text.toLowerCase() : undefined,
                                    event.keyIdentifier, event.keyCode /* windowsVirtualKeyCode */, event.keyCode /* nativeVirtualKeyCode */, undefined /* macCharCode */, false, false, false);
        this.element.focus();
        event.consume(true);
    },

    /**
     * @param {Event} event
     */
    _handleContextMenuEvent: function(event)
    {
        event.consume(true);
    },

    /**
     * @param {Event} event
     */
    _simulateTouchGestureForMouseEvent: function(event)
    {
        var position = this._convertIntoScreenSpace(event);
        var timeStamp = event.timeStamp / 1000;
        var x = position.x;
        var y = position.y;

        switch (event.which) {
        case 1: // Left
            if (event.type === "mousedown") {
                InputAgent.dispatchGestureEvent("scrollBegin", x, y, timeStamp);
            } else if (event.type === "mousemove") {
                var dx = this._lastScrollPosition ? position.x - this._lastScrollPosition.x : 0;
                var dy = this._lastScrollPosition ? position.y - this._lastScrollPosition.y : 0;
                if (dx || dy)
                    InputAgent.dispatchGestureEvent("scrollUpdate", x, y, timeStamp, dx, dy);
            } else if (event.type === "mouseup") {
                InputAgent.dispatchGestureEvent("scrollEnd", x, y, timeStamp);
            } else if (event.type === "mousewheel") {
                InputAgent.dispatchGestureEvent("scrollBegin", x, y, timeStamp);
                InputAgent.dispatchGestureEvent("scrollUpdate", x, y, timeStamp, event.wheelDeltaX, event.wheelDeltaY);
                InputAgent.dispatchGestureEvent("scrollEnd", x, y, timeStamp);
            } else if (event.type === "click") {
                InputAgent.dispatchGestureEvent("tapDown", x, y, timeStamp);
                InputAgent.dispatchGestureEvent("tap", x, y, timeStamp);
            }
            this._lastScrollPosition = position;
            break;

        case 2: // Middle
            if (event.type === "mousedown") {
                InputAgent.dispatchGestureEvent("tapDown", x, y, timeStamp);
            } else if (event.type === "mouseup") {
                InputAgent.dispatchGestureEvent("tap", x, y, timeStamp);
            }
            break;

        case 3: // Right
            if (event.type === "mousedown") {
                this._pinchStart = position;
                InputAgent.dispatchGestureEvent("pinchBegin", x, y, timeStamp);
            } else if (event.type === "mousemove") {
                var dx = this._pinchStart ? position.x - this._pinchStart.x : 0;
                var dy = this._pinchStart ? position.y - this._pinchStart.y : 0;
                if (dx || dy) {
                    var scale = Math.pow(dy < 0 ? 0.999 : 1.001, Math.abs(dy));
                    InputAgent.dispatchGestureEvent("pinchUpdate", this._pinchStart.x, this._pinchStart.y, timeStamp, 0, 0, scale);
                }
            } else if (event.type === "mouseup") {
                InputAgent.dispatchGestureEvent("pinchEnd", x, y, timeStamp);
            }
            break;
        case 0: // None
        default:
        }
    },

    /**
     * @param {Event} event
     * @return {{x: number, y: number}}
     */
    _convertIntoScreenSpace: function(event)
    {
        var position  = {};
        const gutterSize = 40;
        position.x = Math.round((event.x - gutterSize) / this._scale / this._zoom);
        position.y = Math.round((event.y - gutterSize) / this._scale / this._zoom);
        return position;
    },

    /**
     * @param {Event} event
     * @return number
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
        if (!this._imageElement.naturalWidth)
            return;

        const gutterSize = 30;
        const bordersSize = 60;
        var ratio = this._imageElement.naturalWidth / this._imageElement.naturalHeight;
        var maxWidth = this.element.offsetWidth - bordersSize - gutterSize;
        var maxHeight = this.element.offsetHeight - bordersSize - gutterSize;
        var width;
        var height;
        if (maxWidth > ratio * maxHeight) {
            width = ratio * maxHeight;
            height = maxHeight;
        } else {
            width = maxWidth;
            height = maxWidth / ratio;
        }
        this._viewportElement.style.width = width + bordersSize + "px";
        this._viewportElement.style.height = height + bordersSize + "px";
        this._repaintHighlight();
        this._zoom = this._imageElement.offsetWidth / this._imageElement.naturalWidth;
    },

    /**
     * @param {DOMAgent.NodeId} nodeId
     * @param {?DOMAgent.HighlightConfig} config
     * @param {RuntimeAgent.RemoteObjectId=} objectId
     */
    highlightDOMNode: function(nodeId, config, objectId)
    {
        this._highlightNodeId = nodeId;
        this._highlightConfig = config;
        if (!nodeId) {
            this._model = null;
            this._config = null;
            this._node = null;
            this._titleElement.addStyleClass("hidden");
            this._repaintHighlight();
            return;
        }

        this._node = WebInspector.domAgent.nodeForId(nodeId);
        DOMAgent.getBoxModel(nodeId, callback.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {DOMAgent.BoxModel} model
         */
        function callback(error, model)
        {
            if (error)
                return;
            this._model = this._scaleModel(model);
            this._config = config;
            this._repaintHighlight();
        }
    },

    /**
     * @param {DOMAgent.BoxModel} model
     * @return {DOMAgent.BoxModel}
     */
    _scaleModel: function(model)
    {
        var scale = this._canvasElement.offsetWidth / model.visibleContentRect.width;
        /**
         * @param {DOMAgent.Quad} quad
         */
        function scaleQuad(quad)
        {
            for (var i = 0; i < quad.length; i += 2) {
                quad[i] = (quad[i] - model.visibleContentRect.x) * scale;
                quad[i + 1] = (quad[i + 1] - model.visibleContentRect.y) * scale;
            }
        }
        scaleQuad(model.content);
        scaleQuad(model.padding);
        scaleQuad(model.border);
        scaleQuad(model.margin);
        return model;
    },

    _repaintHighlight: function()
    {
        var model = this._model;
        var config = this._config;

        this._canvasElement.width = window.devicePixelRatio * this._canvasElement.offsetWidth;
        this._canvasElement.height = window.devicePixelRatio * this._canvasElement.offsetHeight;

        if (!model || !config)
            return;

        this._context.scale(window.devicePixelRatio, window.devicePixelRatio);

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
    },


    /**
     * @param {DOMAgent.Quad} quad1
     * @param {DOMAgent.Quad} quad2
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
     * @param {DOMAgent.RGBA} color
     * @return {string}
     */
    _cssColor: function(color)
    {
        return WebInspector.Color.fromRGBA([color.r, color.g, color.b, color.a]).toString(WebInspector.Color.Format.RGBA) || "";
    },

    /**
     * @param {DOMAgent.Quad} quad
     * @return {CanvasRenderingContext2D}
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
     * @param {DOMAgent.Quad} quad
     * @param {DOMAgent.RGBA} fillColor
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
     * @param {DOMAgent.Quad} quad
     * @param {DOMAgent.Quad} clipQuad
     * @param {DOMAgent.RGBA} fillColor
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

        var canvasWidth = this._canvasElement.offsetWidth;
        var canvasHeight = this._canvasElement.offsetHeight;

        this._tagNameElement.textContent = this._node.nodeName().toLowerCase();
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

        this._titleElement.removeStyleClass("hidden");
        this._titleElement.style.top = (boxY + 3) + "px";
        this._titleElement.style.left = (boxX + 3) + "px";
    },

    __proto__: WebInspector.View.prototype
}
