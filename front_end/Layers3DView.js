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
 * @param {WebInspector.LayerTreeModel} model
 */
WebInspector.Layers3DView = function(model)
{
    WebInspector.View.call(this);
    this.element.classList.add("fill");
    this.element.classList.add("layers-3d-view");
    this._model = model;
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._update, this);
    this._rotatingContainerElement = this.element.createChild("div", "fill rotating-container");
    this.element.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    this.element.addEventListener("mousedown", this._onMouseDown.bind(this), false);
    this._elementsByLayerId = {};
    this._rotateX = 0;
    this._rotateY = 0;
}

WebInspector.Layers3DView.prototype = {
    onResize: function()
    {
        this._scale();
    },

    wasShown: function()
    {
        if (this._needsUpdate)
            this._update();
    },

    _scale: function()
    {
        const padding = 40;
        var scale = 1;
        var root = this._model.root();
        if (!root)
            return;
        var scaleX = this.element.clientWidth / (root.width() + 2 * padding);
        var scaleY = this.element.clientHeight / (root.height() + 2 * padding);
        scale = Math.min(scaleX, scaleY);
        var element = this._elementForLayer(root);
        element.style.webkitTransform = "scale(" + scale + "," + scale +")";
        element.style.webkitTransformOrigin = padding + "px " + padding + "px";
    },

    _update: function()
    {
        if (!this.isShowing()) {
            this._needsUpdate = true;
            return;
        }
        function updateLayer(layer)
        {
            var element = this._elementForLayer(layer);
            this._updateLayerElement(element);
            for (var childElement = element.firstElementChild; childElement;) {
                var nextElement = childElement.nextSibling;
                if (childElement.__layer && !this._model.layerById(childElement.__layer.id()))
                    childElement.remove();
                childElement = nextElement;
            }
        }
        this._model.forEachLayer(updateLayer.bind(this));
        this._needsUpdate = false;
        this._scale();
    },

    /**
     * @param {WebInspector.Layer} layer
     * @return {Element}
     */
    _elementForLayer: function(layer)
    {
        var element = this._elementsByLayerId[layer.id()];
        if (element)
            return element;
        element = document.createElement("div");
        element.className = "layer-container";
        element.__layer = layer;
        ["fill back-wall", "side-wall top", "side-wall right", "side-wall bottom", "side-wall left"].forEach(element.createChild.bind(element, "div"));
        this._elementsByLayerId[layer.id()] = element;
        return element;
    },

    /**
     * @param {Element} element
     */
    _updateLayerElement: function(element)
    {
        var layer = element.__layer;
        var style = element.style;
        var parentElement = layer.parent() ? this._elementForLayer(layer.parent()) : this._rotatingContainerElement;
        element.__depth = (parentElement.__depth || 0) + 1;
        style.backgroundColor = this._colorForLayer(layer, element.__depth);
        style.left  = layer.offsetX() + "px";
        style.top  = layer.offsetY() + "px";
        style.width  = layer.width() + "px";
        style.height  = layer.height() + "px";
        if (parentElement !== element.parentElement)
            parentElement.appendChild(element);
    },

    /**
     * @param {WebInspector.Layer} layer
     * @param {number} depth
     * @return {string}
     */
    _colorForLayer: function(layer, depth)
    {
        const base = 144;
        var component = base + 20 * ((depth - 1) % 5);
        return "rgb(" + component + "," + component + "," + component + ")";
    },

    /**
     * @param {Event} event
     */
    _onMouseDown: function(event)
    {
        if (event.which !== 1)
            return;
        this._originX = event.clientX;
        this._originY = event.clientY;
        this._oldRotateX = this._rotateX;
        this._oldRotateY = this._rotateY;
    },

    /**
     * @param {Event} event
     */
    _onMouseMove: function(event)
    {
        if (event.which !== 1)
            return;
        this._rotateX = this._oldRotateX + (this._originY - event.clientY) / 2;
        this._rotateY = this._oldRotateY - (this._originX - event.clientX) / 4;
        this._rotatingContainerElement.style.webkitTransform = "rotateX(" + this._rotateX + "deg) rotateY(" + this._rotateY + "deg)";
    },

    __proto__: WebInspector.View.prototype
}
