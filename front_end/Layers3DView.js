/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @param {!WebInspector.LayerTreeModel} model
 */
WebInspector.Layers3DView = function(model)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("layers-3d-view");
    this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("Not in the composited mode.\nConsider forcing composited mode in Settings."));
    this._model = model;
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._update, this);
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
    this._rotatingContainerElement = this.element.createChild("div", "fill rotating-container");
    this._transformController = new WebInspector.TransformController(this.element);
    this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged, this._onTransformChanged, this);
    this.element.addEventListener("dblclick", this._onDoubleClick.bind(this), false);
    this.element.addEventListener("click", this._onClick.bind(this), false);
    this.element.addEventListener("mouseout", this._onMouseMove.bind(this), false);
    this.element.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    this.element.addEventListener("contextmenu", this._onContextMenu.bind(this), false);
    this._elementsByLayerId = {};
    this._scaleAdjustmentStylesheet = this.element.ownerDocument.head.createChild("style");
    this._scaleAdjustmentStylesheet.disabled = true;
    this._lastOutlinedElement = {};
    this._layerImage = document.createElement("img");
    this._layerImage.style.width = "100%";
    this._layerImage.style.height = "100%";
    WebInspector.settings.showPaintRects.addChangeListener(this._update, this);
}

/**
 * @enum {string}
 */
WebInspector.Layers3DView.OutlineType = {
    Hovered: "hovered",
    Selected: "selected"
}

/**
 * @enum {string}
 */
WebInspector.Layers3DView.Events = {
    LayerHovered: "LayerHovered",
    LayerSelected: "LayerSelected",
    LayerSnapshotRequested: "LayerSnapshotRequested"
}

WebInspector.Layers3DView.PaintRectColors = [
    WebInspector.Color.fromRGBA([0, 0x5F, 0, 0x3F]),
    WebInspector.Color.fromRGBA([0, 0xAF, 0, 0x3F]),
    WebInspector.Color.fromRGBA([0, 0xFF, 0, 0x3F])
]

/**
 * @enum {string}
 */
WebInspector.Layers3DView.ScrollRectTitles = {
    RepaintsOnScroll: WebInspector.UIString("repaints on scroll"),
    TouchEventHandler: WebInspector.UIString("touch event listener"),
    WheelEventHandler: WebInspector.UIString("mousewheel event listener")
}

WebInspector.Layers3DView.prototype = {
    onResize: function()
    {
        this._update();
    },

    willHide: function()
    {
        this._scaleAdjustmentStylesheet.disabled = true;
    },

    wasShown: function()
    {
        this._scaleAdjustmentStylesheet.disabled = false;
        if (this._needsUpdate)
            this._update();
    },

    /**
     * @param {!WebInspector.Layers3DView.OutlineType} type
     * @param {?WebInspector.Layer} layer
     */
    _setOutline: function(type, layer)
    {
        var element = layer ? this._elementForLayer(layer) : null;
        var previousElement = this._lastOutlinedElement[type];
        if (previousElement === element)
            return;
        this._lastOutlinedElement[type] = element;
        if (previousElement) {
            previousElement.classList.remove(type);
            this._updateElementColor(previousElement);
        }
        if (element) {
            element.classList.add(type);
            this._updateElementColor(element);
        }
    },

    /**
     * @param {!WebInspector.Layer} layer
     */
    hoverLayer: function(layer)
    {
        this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered, layer);
    },

    /**
     * @param {!WebInspector.Layer} layer
     */
    selectLayer: function(layer)
    {
        this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered, null);
        this._setOutline(WebInspector.Layers3DView.OutlineType.Selected, layer);
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @param {string=} imageURL
     */
    showImageForLayer: function(layer, imageURL)
    {
        var element = this._elementForLayer(layer);
        this._layerImage.removeAttribute("src");
        if (imageURL)
            this._layerImage.src = imageURL;
        element.appendChild(this._layerImage);
    },

    _scaleToFit: function()
    {
        var root = this._model.contentRoot();
        if (!root)
            return;

        const padding = 40;
        var scaleX = this._clientWidth / (root.width() + 2 * padding);
        var scaleY = this._clientHeight / (root.height() + 2 * padding);
        var autoScale = Math.min(scaleX, scaleY);

        this._scale = autoScale * this._transformController.scale();
        this._paddingX = ((this._clientWidth / autoScale - root.width()) >> 1) * this._scale;
        this._paddingY = ((this._clientHeight / autoScale - root.height()) >> 1) * this._scale;
        const screenLayerSpacing = 20;
        this._layerSpacing = screenLayerSpacing + "px";
        const screenLayerThickness = 4;
        var layerThickness = screenLayerThickness + "px";

        var stylesheetContent = ".layer-container .side-wall { height: " + layerThickness + "; width: " + layerThickness + "; } " +
            ".layer-container .back-wall { -webkit-transform: translateZ(-" + layerThickness + "); } " +
            ".layer-container { -webkit-transform: translateZ(" + this._layerSpacing + "); }";
        // Workaround for double style recalculation upon assignment to style sheet's text content.
        var stylesheetTextNode = this._scaleAdjustmentStylesheet.firstChild;
        if (!stylesheetTextNode || stylesheetTextNode.nodeType !== Node.TEXT_NODE || stylesheetTextNode.nextSibling)
            this._scaleAdjustmentStylesheet.textContent = stylesheetContent;
        else
            stylesheetTextNode.nodeValue = stylesheetContent;

        var style = this._elementForLayer(root).style;
        style.left = Math.round(this._paddingX) + "px";
        style.top = Math.round(this._paddingY) + "px";
        style.webkitTransformOrigin = "";
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onTransformChanged: function(event)
    {
        var changedTransforms = /** @type {number} */ (event.data);
        if (changedTransforms & WebInspector.TransformController.TransformType.Scale)
            this._update();
        else
            this._updateTransform();
    },

    _updateTransform: function()
    {
        var root = this._model.contentRoot();
        if (!root)
            return;
        var offsetX = this._transformController.offsetX();
        var offsetY = this._transformController.offsetY();
        var style = this._rotatingContainerElement.style;
        // Translate well to front so that no matter how we turn the plane, no parts of it goes below  parent.
        // This makes sure mouse events go to proper layers, not straight to the parent.
        style.webkitTransform = "translateZ(10000px)" +
            " rotateX(" + this._transformController.rotateX() + "deg) rotateY(" + this._transformController.rotateY() + "deg)" +
            " translateX(" + offsetX + "px) translateY(" + offsetY + "px)";
        // Compute where the center of shitfted and scaled root layer would be and use is as origin for rotation.
        style.webkitTransformOrigin = Math.round(this._paddingX + offsetX + root.width() * this._scale / 2) + "px " + Math.round(this._paddingY + offsetY + root.height() * this._scale / 2) + "px";
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @return {!Element}
     */
    _createScrollRectElement: function(layer)
    {
        var element = document.createElement("div");
        var parentLayerElement = this._elementsByLayerId[layer.id()];
        element.className = "scroll-rect";
        parentLayerElement.appendChild(element);
        return element;
    },

    /**
     * @param {!LayerTreeAgent.ScrollRect} rect
     * @param {!Element} element
     */
    _updateScrollRectElement: function(rect, element)
    {
        var style = element.style;
        style.width = Math.round(rect.rect.width * this._scale) + "px";
        style.height = Math.round(rect.rect.height * this._scale) + "px";
        style.left = Math.round(rect.rect.x * this._scale) + "px";
        style.top = Math.round(rect.rect.y * this._scale) + "px";
        element.title = WebInspector.Layers3DView.ScrollRectTitles[rect.type];
    },

    /**
     * @param {!WebInspector.Layer} layer
     */
    _updateScrollRectsForLayer: function(layer)
    {
        var layerDetails = this._elementsByLayerId[layer.id()].__layerDetails;

        /**
         * @param {!Element} element
         */
        function removeElement(element)
        {
            element.remove()
        }

        if (layer.scrollRects().length !== layerDetails.scrollRectElements.length) {
            layerDetails.scrollRectElements.forEach(removeElement);
            layerDetails.scrollRectElements = layer.scrollRects().map(this._createScrollRectElement.bind(this, layer));
        }
        for (var i = 0; i < layer.scrollRects().length; ++i)
            this._updateScrollRectElement(layer.scrollRects()[i], layerDetails.scrollRectElements[i]);
    },

    _update: function()
    {
        if (!this.isShowing()) {
            this._needsUpdate = true;
            return;
        }
        if (!this._model.contentRoot()) {
            this._emptyView.show(this.element);
            this._rotatingContainerElement.removeChildren();
            return;
        }
        this._emptyView.detach();

        /**
         * @this {WebInspector.Layers3DView}
         */
        function updateLayer(layer)
        {
            this._updateLayerElement(this._elementForLayer(layer));
            this._updateScrollRectsForLayer(layer);
        }
        this._clientWidth = this.element.clientWidth;
        this._clientHeight = this.element.clientHeight;
        for (var layerId in this._elementsByLayerId) {
            if (this._model.layerById(layerId))
                continue;
            this._elementsByLayerId[layerId].remove();
            delete this._elementsByLayerId[layerId];
        }
        this._scaleToFit();
        this._updateTransform();
        this._model.forEachLayer(updateLayer.bind(this));
        this._needsUpdate = false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLayerPainted: function(event)
    {
        var layer = /** @type {!WebInspector.Layer} */ (event.data);
        this._updatePaintRect(this._elementForLayer(layer));
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @return {!Element}
     */
    _elementForLayer: function(layer)
    {
        var element = this._elementsByLayerId[layer.id()];
        if (element) {
            // We might have missed an update were a layer with given id was gone and re-created,
            // so update reference to point to proper layer object.
            element.__layerDetails.layer = layer;
            return element;
        }
        element = document.createElement("div");
        element.__layerDetails = new WebInspector.LayerDetails(layer, element.createChild("div", "paint-rect"));
        ["fill back-wall", "side-wall top", "side-wall right", "side-wall bottom", "side-wall left"].forEach(element.createChild.bind(element, "div"));
        this._elementsByLayerId[layer.id()] = element;
        return element;
    },

    /**
     * @param {!Element} element
     */
    _updateLayerElement: function(element)
    {
        var layer = element.__layerDetails.layer;
        var style = element.style;

        var contentRoot = /** @type {!WebInspector.Layer} */ (this._model.contentRoot());
        var isContentRoot = layer === contentRoot;
        var isRoot = layer === this._model.root();
        var parentElement;
        if (isContentRoot) {
            parentElement = this._rotatingContainerElement;
            element.__layerDetails.depth = 0;
        } else if (isRoot) {
            parentElement = this._elementForLayer(contentRoot);
            element.__layerDetails.depth = undefined;
        } else {
            parentElement = this._elementForLayer(layer.parent());
            element.__layerDetails.depth = parentElement.__layerDetails.isAboveContentRoot() ? undefined : parentElement.__layerDetails.depth + 1;
        }
        if (!element.__layerDetails.isAboveContentRoot())
            element.className = "layer-container";
        else
            element.className = "layer-transparent";
        element.classList.toggle("invisible", layer.invisible());
        this._updateElementColor(element);
        if (parentElement !== element.parentElement)
            parentElement.appendChild(element);

        style.width = Math.round(layer.width() * this._scale) + "px";
        style.height = Math.round(layer.height() * this._scale) + "px";
        this._updatePaintRect(element);
        if (isContentRoot || isRoot)
            return;
        style.left = Math.round(layer.offsetX() * this._scale) + "px";
        style.top = Math.round(layer.offsetY() * this._scale) + "px";
        var transform = layer.transform();
        if (transform) {
            transform = transform.slice();
            // Adjust offset in the transform matrix according to scale.
            for (var i = 12; i < 15; ++i)
                transform[i] *= this._scale;
            // Avoid exponential notation in CSS.
            style.webkitTransform = "matrix3d(" + transform.map(toFixed5).join(",") + ") translateZ(" + this._layerSpacing + ")";
            var anchor = layer.anchorPoint();
            style.webkitTransformOrigin = Math.round(anchor[0] * 100) + "% " + Math.round(anchor[1] * 100) + "% " + anchor[2];
        } else {
            style.webkitTransform = "";
            style.webkitTransformOrigin = "";
        }

        function toFixed5(x)
        {
            return x.toFixed(5);
        }
    },

    /**
     * @param {!Element} element
     */
    _updatePaintRect: function(element)
    {
        var details = element.__layerDetails;
        var paintRect = details.layer.lastPaintRect();
        var paintRectElement = details.paintRectElement;
        if (!paintRect || !WebInspector.settings.showPaintRects.get()) {
            paintRectElement.classList.add("hidden");
            return;
        }
        paintRectElement.classList.remove("hidden");
        if (details.paintCount === details.layer.paintCount())
            return;
        details.paintCount = details.layer.paintCount();
        var style = paintRectElement.style;
        style.left = Math.round(paintRect.x * this._scale) + "px";
        style.top = Math.round(paintRect.y * this._scale) + "px";
        style.width = Math.round(paintRect.width * this._scale) + "px";
        style.height = Math.round(paintRect.height * this._scale) + "px";
        var color = WebInspector.Layers3DView.PaintRectColors[details.paintCount % WebInspector.Layers3DView.PaintRectColors.length];
        style.borderWidth = Math.ceil(1 / this._scale) + "px";
        style.borderColor = color.toString(WebInspector.Color.Format.RGBA);
    },

    /**
     * @param {!Element} element
     */
    _updateElementColor: function(element)
    {
        var color;
        if (element === this._lastOutlinedElement[WebInspector.Layers3DView.OutlineType.Selected])
            color = WebInspector.Color.PageHighlight.Content.toString(WebInspector.Color.Format.RGBA) || "";
        else {
            const base = 144;
            var component = base + 20 * ((element.__layerDetails.depth - 1) % 5);
            color = "rgba(" + component + "," + component + "," + component + ", 0.8)";
        }
        element.style.backgroundColor = color;
    },

    /**
     * @param {?Event} event
     * @return {?WebInspector.Layer}
     */
    _layerFromEventPoint: function(event)
    {
        var element = this.element.ownerDocument.elementFromPoint(event.pageX, event.pageY);
        if (!element)
            return null;
        element = element.enclosingNodeOrSelfWithClass("layer-container");
        return element && element.__layerDetails && element.__layerDetails.layer;
    },

    /**
     * @param {?Event} event
     */
    _onContextMenu: function(event)
    {
        var layer = this._layerFromEventPoint(event);
        var node = layer ? layer.nodeForSelfOrAncestor() : null;
        if (!node)
            return;
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(node);
        contextMenu.show();
    },

    /**
     * @param {?Event} event
     */
    _onMouseMove: function(event)
    {
        if (event.which)
            return;
        this.dispatchEventToListeners(WebInspector.Layers3DView.Events.LayerHovered, this._layerFromEventPoint(event));
    },

    /**
     * @param {?Event} event
     */
    _onClick: function(event)
    {
        this.dispatchEventToListeners(WebInspector.Layers3DView.Events.LayerSelected, this._layerFromEventPoint(event));
    },

    /**
     * @param {?Event} event
     */
    _onDoubleClick: function(event)
    {
        var layer = this._layerFromEventPoint(event);
        if (layer)
            this.dispatchEventToListeners(WebInspector.Layers3DView.Events.LayerSnapshotRequested, layer);
        event.stopPropagation();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.Layer} layer
 * @param {!Element} paintRectElement
 */
WebInspector.LayerDetails = function(layer, paintRectElement)
{
    this.layer = layer;
    this.depth = 0;
    this.paintRectElement = paintRectElement;
    this.paintCount = 0;
    this.scrollRectElements = [];
}

WebInspector.LayerDetails.prototype = {
    /**
     * @return {boolean}
     */
    isAboveContentRoot: function()
    {
        return this.depth === undefined;
    }
}
