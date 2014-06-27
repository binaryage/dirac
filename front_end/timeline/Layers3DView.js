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
 */
WebInspector.Layers3DView = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("layers-3d-view");
    this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("Not in the composited mode.\nConsider forcing composited mode in Settings."));
    this._canvasElement = this.element.createChild("canvas");
    this._transformController = new WebInspector.TransformController(this._canvasElement);
    this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged, this._update, this);
    this._canvasElement.addEventListener("dblclick", this._onDoubleClick.bind(this), false);
    this._canvasElement.addEventListener("mousedown", this._onMouseDown.bind(this), false);
    this._canvasElement.addEventListener("mouseup", this._onMouseUp.bind(this), false);
    this._canvasElement.addEventListener("mouseout", this._onMouseMove.bind(this), false);
    this._canvasElement.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    this._canvasElement.addEventListener("contextmenu", this._onContextMenu.bind(this), false);
    this._lastActiveObject = {};
    this._picturesForLayer = {};
    this._scrollRectQuadsForLayer = {};
    this._isVisible = {};
    this._layerTree = null;
    WebInspector.settings.showPaintRects.addChangeListener(this._update, this);
}

/** @typedef {{layer: !WebInspector.Layer, scrollRectIndex: number}|{layer: !WebInspector.Layer}} */
WebInspector.Layers3DView.ActiveObject;

/** @typedef {{color: !Array.<number>, borderColor: !Array.<number>, borderWidth: number}} */
WebInspector.Layers3DView.LayerStyle;

/** @typedef {{layerId: string, rect: !Array.<number>, imageURL: string}} */
WebInspector.Layers3DView.Tile;

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
    ObjectHovered: "ObjectHovered",
    ObjectSelected: "ObjectSelected",
    LayerSnapshotRequested: "LayerSnapshotRequested"
}

/**
 * @enum {string}
 */
WebInspector.Layers3DView.ScrollRectTitles = {
    RepaintsOnScroll: WebInspector.UIString("repaints on scroll"),
    TouchEventHandler: WebInspector.UIString("touch event listener"),
    WheelEventHandler: WebInspector.UIString("mousewheel event listener")
}

WebInspector.Layers3DView.FragmentShader = "\
    precision mediump float;\
    varying vec4 vColor;\
    varying vec2 vTextureCoord;\
    uniform sampler2D uSampler;\
    void main(void)\
    {\
        gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * vColor;\
    }";

WebInspector.Layers3DView.VertexShader = "\
    attribute vec3 aVertexPosition;\
    attribute vec2 aTextureCoord;\
    attribute vec4 aVertexColor;\
    uniform mat4 uPMatrix;\
    varying vec2 vTextureCoord;\
    varying vec4 vColor;\
    void main(void)\
    {\
        gl_Position = uPMatrix * vec4(aVertexPosition, 1.0);\
        vColor = aVertexColor;\
        vTextureCoord = aTextureCoord;\
    }";

WebInspector.Layers3DView.SelectedBackgroundColor = [20, 40, 110, 0.66];
WebInspector.Layers3DView.BackgroundColor = [0, 0, 0, 0];
WebInspector.Layers3DView.HoveredBorderColor = [0, 0, 255, 1];
WebInspector.Layers3DView.SelectedBorderColor = [0, 255, 0, 1];
WebInspector.Layers3DView.BorderColor = [0, 0, 0, 1];
WebInspector.Layers3DView.ScrollRectBackgroundColor = [178, 0, 0, 0.4];
WebInspector.Layers3DView.SelectedScrollRectBackgroundColor = [178, 0, 0, 0.6];
WebInspector.Layers3DView.ScrollRectBorderColor = [178, 0, 0, 1];
WebInspector.Layers3DView.BorderWidth = 1;
WebInspector.Layers3DView.SelectedBorderWidth = 2;

WebInspector.Layers3DView.LayerSpacing = 20;
WebInspector.Layers3DView.ScrollRectSpacing = 4;

WebInspector.Layers3DView.prototype = {
    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(?Event=))} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        this._transformController.registerShortcuts(registerShortcutDelegate);
    },

    onResize: function()
    {
        this._update();
    },

    willHide: function()
    {
    },

    wasShown: function()
    {
        if (this._needsUpdate)
            this._update();
    },

    /**
     * @param {!WebInspector.Layers3DView.OutlineType} type
     * @param {?WebInspector.Layers3DView.ActiveObject} activeObject
     */
    _setOutline: function(type, activeObject)
    {
        this._lastActiveObject[type] = activeObject;
        this._update();
    },

    /**
     * @param {?WebInspector.Layers3DView.ActiveObject} activeObject
     */
    hoverObject: function(activeObject)
    {
        this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered, activeObject);
    },

    /**
     * @param {?WebInspector.Layers3DView.ActiveObject} activeObject
     */
    selectObject: function(activeObject)
    {
        this._setOutline(WebInspector.Layers3DView.OutlineType.Hovered, null);
        this._setOutline(WebInspector.Layers3DView.OutlineType.Selected, activeObject);
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @param {string=} imageURL
     */
    showImageForLayer: function(layer, imageURL)
    {
        this.setTiles([{layerId: layer.id(), rect: [0, 0, layer.width(), layer.height()], imageURL: imageURL}])
    },

    /**
     * @param {!Array.<!WebInspector.Layers3DView.Tile>} tiles
     */
    setTiles: function(tiles)
    {
        this._picturesForLayer = {};
        tiles.forEach(this._setTile, this);
    },

    /**
     * @param {!WebInspector.Layers3DView.Tile} tile
     */
    _setTile: function(tile)
    {
        var texture = this._gl.createTexture();
        texture.image = new Image();
        texture.image.addEventListener("load", this._handleLoadedTexture.bind(this, texture, tile.layerId, tile.rect), false);
        texture.image.src = tile.imageURL;
    },

    /**
     * @param {!Element} canvas
     * @return {!Object}
     */
    _initGL: function(canvas)
    {
        var gl = canvas.getContext("webgl");
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.enable(gl.DEPTH_TEST);
        return gl;
    },

    /**
     * @param {!Object} type
     * @param {string} script
     */
    _createShader: function(type, script)
    {
        var shader = this._gl.createShader(type);
        this._gl.shaderSource(shader, script);
        this._gl.compileShader(shader);
        this._gl.attachShader(this._shaderProgram, shader);
    },

    /**
     * @param {string} attributeName
     * @param {string} glName
     */
    _enableVertexAttribArray: function(attributeName, glName)
    {
        this._shaderProgram[attributeName] = this._gl.getAttribLocation(this._shaderProgram, glName);
        this._gl.enableVertexAttribArray(this._shaderProgram[attributeName]);
    },

    _initShaders: function()
    {
        this._shaderProgram = this._gl.createProgram();
        this._createShader(this._gl.FRAGMENT_SHADER, WebInspector.Layers3DView.FragmentShader);
        this._createShader(this._gl.VERTEX_SHADER, WebInspector.Layers3DView.VertexShader);
        this._gl.linkProgram(this._shaderProgram);
        this._gl.useProgram(this._shaderProgram);

        this._shaderProgram.vertexPositionAttribute = this._gl.getAttribLocation(this._shaderProgram, "aVertexPosition");
        this._gl.enableVertexAttribArray(this._shaderProgram.vertexPositionAttribute);
        this._shaderProgram.vertexColorAttribute = this._gl.getAttribLocation(this._shaderProgram, "aVertexColor");
        this._gl.enableVertexAttribArray(this._shaderProgram.vertexColorAttribute);
        this._shaderProgram.textureCoordAttribute = this._gl.getAttribLocation(this._shaderProgram, "aTextureCoord");
        this._gl.enableVertexAttribArray(this._shaderProgram.textureCoordAttribute);

        this._shaderProgram.pMatrixUniform = this._gl.getUniformLocation(this._shaderProgram, "uPMatrix");
        this._shaderProgram.samplerUniform = this._gl.getUniformLocation(this._shaderProgram, "uSampler");
    },

    _resizeCanvas: function()
    {
        this._canvasElement.width = this._canvasElement.offsetWidth * window.devicePixelRatio;
        this._canvasElement.height = this._canvasElement.offsetHeight * window.devicePixelRatio;
        this._gl.viewportWidth = this._canvasElement.width;
        this._gl.viewportHeight = this._canvasElement.height;
    },

    /**
     * @return {!CSSMatrix}
     */
    _calculateProjectionMatrix: function()
    {
        var scaleFactorForMargins = 1.2;
        var viewport = this._layerTree.viewportSize();
        var baseWidth = viewport ? viewport.width : this._layerTree.contentRoot().width();
        var baseHeight = viewport ? viewport.height : this._layerTree.contentRoot().height();
        var canvasWidth = this._canvasElement.width;
        var canvasHeight = this._canvasElement.height;
        var scaleX = canvasWidth / baseWidth / scaleFactorForMargins;
        var scaleY = canvasHeight / baseHeight / scaleFactorForMargins;
        var viewScale = Math.min(scaleX, scaleY);
        var scale = this._transformController.scale();
        var offsetX = this._transformController.offsetX() * window.devicePixelRatio;
        var offsetY = this._transformController.offsetY() * window.devicePixelRatio;
        var rotateX = this._transformController.rotateX();
        var rotateY = this._transformController.rotateY();
        return new WebKitCSSMatrix().translate(offsetX, offsetY, 0).scale(scale, scale, scale).translate(canvasWidth / 2, canvasHeight / 2, 0)
            .rotate(rotateX, rotateY, 0).scale(viewScale, viewScale, viewScale).translate(-baseWidth / 2, -baseHeight / 2, 0);
    },

    _initProjectionMatrix: function()
    {
        this._pMatrix = new WebKitCSSMatrix().scale(1, -1, -1).translate(-1, -1, 0)
            .scale(2 / this._canvasElement.width, 2 / this._canvasElement.height, 1 / 1000000).multiply(this._calculateProjectionMatrix());
        this._gl.uniformMatrix4fv(this._shaderProgram.pMatrixUniform, false, this._arrayFromMatrix(this._pMatrix));
    },

    /**
     * @param {!Object} texture
     * @param {string} layerId
     * @param {!Array.<number>} rect
     */
    _handleLoadedTexture: function(texture, layerId, rect)
    {
        this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
        this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, texture.image);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.LINEAR);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._gl.LINEAR);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
        this._gl.bindTexture(this._gl.TEXTURE_2D, null);
        if (!this._picturesForLayer[layerId])
            this._picturesForLayer[layerId] = [];
        this._picturesForLayer[layerId].push({texture: texture, rect: rect});
        this._update();
    },

    _initWhiteTexture: function()
    {
        this._whiteTexture = this._gl.createTexture();
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._whiteTexture);
        var whitePixel = new Uint8Array([255, 255, 255, 255]);
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, 1, 1, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE, whitePixel);
    },

    _initGLIfNecessary: function()
    {
        if (this._gl)
            return this._gl;
        this._gl = this._initGL(this._canvasElement);
        this._initShaders();
        this._initWhiteTexture();
        return this._gl;
    },

    /**
     * @param {!CSSMatrix} m
     * @return {!Float32Array}
     */
    _arrayFromMatrix: function(m)
    {
        return new Float32Array([m.m11, m.m12, m.m13, m.m14, m.m21, m.m22, m.m23, m.m24, m.m31, m.m32, m.m33, m.m34, m.m41, m.m42, m.m43, m.m44]);
    },

    /**
     * @param {!Array.<number>} color
     * @return {!Array.<number>}
     */
    _makeColorsArray: function(color)
    {
        var colors = [];
        var normalizedColor = [color[0] / 255, color[1] / 255, color[2] / 255, color[3]];
        for (var i = 0; i < 4; i++) {
            colors = colors.concat(normalizedColor);
        }
        return colors;
    },

    /**
     * @param {!Object} attribute
     * @param {!Array.<number>} array
     * @param {!number} length
     */
    _setVertexAttribute: function(attribute, array, length)
    {
        var gl = this._gl;
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
        gl.vertexAttribPointer(attribute, length, gl.FLOAT, false, 0, 0);
    },

    /**
     * @param {!Array.<number>} vertices
     * @param {!Array.<number>} color
     * @param {!Object} glMode
     * @param {!Object=} texture
     */
    _drawRectangle: function(vertices, color, glMode, texture)
    {
        this._setVertexAttribute(this._shaderProgram.vertexPositionAttribute, vertices, 3);
        this._setVertexAttribute(this._shaderProgram.textureCoordAttribute, [0, 1, 1, 1, 1, 0, 0, 0], 2);

        if (texture) {
            var white = [255, 255, 255, 1];
            this._setVertexAttribute(this._shaderProgram.vertexColorAttribute, this._makeColorsArray(white), white.length);
            this._gl.activeTexture(this._gl.TEXTURE0);
            this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
            this._gl.uniform1i(this._shaderProgram.samplerUniform, 0);
        } else {
            this._setVertexAttribute(this._shaderProgram.vertexColorAttribute, this._makeColorsArray(color), color.length);
            this._gl.bindTexture(this._gl.TEXTURE_2D, this._whiteTexture);
        }

        var numberOfVertices = 4;
        this._gl.drawArrays(glMode, 0, numberOfVertices);
    },

    /**
     * @param {!WebInspector.Layers3DView.OutlineType} type
     * @param {!WebInspector.Layer} layer
     * @param {number=} scrollRectIndex
     */
    _isObjectActive: function(type, layer, scrollRectIndex)
    {
        var activeObject = this._lastActiveObject[type];
        return activeObject && activeObject.layer && activeObject.layer.id() === layer.id() && (typeof scrollRectIndex !== "number" || activeObject.scrollRectIndex === scrollRectIndex);
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @return {!WebInspector.Layers3DView.LayerStyle}
     */
    _styleForLayer: function(layer)
    {
        var isSelected = this._isObjectActive(WebInspector.Layers3DView.OutlineType.Selected, layer);
        var isHovered = this._isObjectActive(WebInspector.Layers3DView.OutlineType.Hovered, layer);
        var color = isSelected ? WebInspector.Layers3DView.SelectedBackgroundColor : WebInspector.Layers3DView.BackgroundColor;
        var borderColor;
        if (isSelected)
            borderColor = WebInspector.Layers3DView.SelectedBorderColor;
        else if (isHovered)
            borderColor = WebInspector.Layers3DView.HoveredBorderColor;
        else
            borderColor = WebInspector.Layers3DView.BorderColor;
        var borderWidth = isSelected ? WebInspector.Layers3DView.SelectedBorderWidth : WebInspector.Layers3DView.BorderWidth;
        return {color: color, borderColor: borderColor, borderWidth: borderWidth};
    },

    /**
     * @param {!Array.<number>} quad
     * @param {number} z
     * @return {!Array.<number>}
     */
    _calculateVerticesForQuad: function(quad, z)
    {
        return [quad[0], quad[1], z, quad[2], quad[3], z, quad[4], quad[5], z, quad[6], quad[7], z];
    },

    /**
     * Finds coordinates of point on layer quad, having offsets (ratioX * width) and (ratioY * height)
     * from the left corner of the initial layer rect, where width and heigth are layer bounds.
     * @param {!Array.<number>} quad
     * @param {number} ratioX
     * @param {number} ratioY
     * @return {!Array.<number>}
     */
    _calculatePointOnQuad: function(quad, ratioX, ratioY)
    {
        var x0 = quad[0];
        var y0 = quad[1];
        var x1 = quad[2];
        var y1 = quad[3];
        var x2 = quad[4];
        var y2 = quad[5];
        var x3 = quad[6];
        var y3 = quad[7];
        // Point on the first quad side clockwise
        var firstSidePointX = x0 + ratioX * (x1 - x0);
        var firstSidePointY = y0 + ratioX * (y1 - y0);
        // Point on the third quad side clockwise
        var thirdSidePointX = x3 + ratioX * (x2 - x3);
        var thirdSidePointY = y3 + ratioX * (y2 - y3);
        var x = firstSidePointX + ratioY * (thirdSidePointX - firstSidePointX);
        var y = firstSidePointY + ratioY * (thirdSidePointY - firstSidePointY);
        return [x, y];
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @param {!DOMAgent.Rect} rect
     * @return {!Array.<number>}
     */
    _calculateRectQuad: function(layer, rect)
    {
        var quad = layer.quad();
        var rx1 = rect.x / layer.width();
        var rx2 = (rect.x + rect.width) / layer.width();
        var ry1 = rect.y / layer.height();
        var ry2 = (rect.y + rect.height) / layer.height();
        return this._calculatePointOnQuad(quad, rx1, ry1).concat(this._calculatePointOnQuad(quad, rx2, ry1))
            .concat(this._calculatePointOnQuad(quad, rx2, ry2)).concat(this._calculatePointOnQuad(quad, rx1, ry2));
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @return {!Array.<!Array.<number>>}
     */
    _calculateScrollRectQuadsForLayer: function(layer)
    {
        var quads = [];
        for (var i = 0; i < layer.scrollRects().length; ++i)
            quads.push(this._calculateRectQuad(layer, layer.scrollRects()[i].rect));
        return quads;
    },

    /**
     * @param {!WebInspector.Layer} layer
     * @param {number} index
     * @return {number}
     */
    _calculateScrollRectDepth: function(layer, index)
    {
        return this._depthByLayerId[layer.id()] * WebInspector.Layers3DView.LayerSpacing + index * WebInspector.Layers3DView.ScrollRectSpacing + 1;
    },

    /**
     * @param {!WebInspector.Layer} layer
     */
    _drawLayer: function(layer)
    {
        var gl = this._gl;
        var vertices;
        var style = this._styleForLayer(layer);
        var layerDepth = this._depthByLayerId[layer.id()] * WebInspector.Layers3DView.LayerSpacing;
        if (this._isVisible[layer.id()]) {
            vertices = this._calculateVerticesForQuad(layer.quad(), layerDepth);
            gl.lineWidth(style.borderWidth);
            this._drawRectangle(vertices, style.borderColor, gl.LINE_LOOP);
            gl.lineWidth(1);
        }
        this._scrollRectQuadsForLayer[layer.id()] = this._calculateScrollRectQuadsForLayer(layer);
        var scrollRectQuads = this._scrollRectQuadsForLayer[layer.id()];
        for (var i = 0; i < scrollRectQuads.length; ++i) {
            vertices = this._calculateVerticesForQuad(scrollRectQuads[i], this._calculateScrollRectDepth(layer, i));
            var isSelected = this._isObjectActive(WebInspector.Layers3DView.OutlineType.Selected, layer, i);
            var color = isSelected ? WebInspector.Layers3DView.SelectedScrollRectBackgroundColor : WebInspector.Layers3DView.ScrollRectBackgroundColor;
            this._drawRectangle(vertices, color, gl.TRIANGLE_FAN);
            this._drawRectangle(vertices, WebInspector.Layers3DView.ScrollRectBorderColor, gl.LINE_LOOP);
        }
        var tiles = this._picturesForLayer[layer.id()] || [];
        for (var i = 0; i < tiles.length; ++i) {
            var tile = tiles[i];
            var quad = this._calculateRectQuad(layer, {x: tile.rect[0], y: tile.rect[1], width: tile.rect[2] - tile.rect[0], height: tile.rect[3] - tile.rect[1]});
            vertices = this._calculateVerticesForQuad(quad, layerDepth);
            this._drawRectangle(vertices, style.color, gl.TRIANGLE_FAN, tile.texture);
        }
    },

    _drawViewport: function()
    {
        var viewport = this._layerTree.viewportSize();
        var vertices = [0, 0, 0, viewport.width, 0, 0, viewport.width, viewport.height, 0, 0, viewport.height, 0];
        var color = [0, 0, 0, 1];
        this._gl.lineWidth(3.0);
        this._drawRectangle(vertices, color, this._gl.LINE_LOOP);
        this._gl.lineWidth(1.0);
    },

    _calculateDepths: function()
    {
        this._depthByLayerId = {};
        this._isVisible = {};
        var depth = 0;
        var root = this._layerTree.root();
        var queue = [root];
        this._depthByLayerId[root.id()] = 0;
        this._isVisible[root.id()] = false;
        while (queue.length > 0) {
            var layer = queue.shift();
            var children = layer.children();
            for (var i = 0; i < children.length; ++i) {
                this._depthByLayerId[children[i].id()] = ++depth;
                this._isVisible[children[i].id()] = children[i] === this._layerTree.contentRoot() || this._isVisible[layer.id()];
                queue.push(children[i]);
            }
        }
    },


    /**
     * @param {?WebInspector.LayerTreeBase} layerTree
     */
    setLayerTree: function(layerTree)
    {
        this._layerTree = layerTree;
        this._update();
    },

    _update: function()
    {
        if (!this.isShowing()) {
            this._needsUpdate = true;
            return;
        }
        var contentRoot = this._layerTree && this._layerTree.contentRoot();
        if (!contentRoot || !this._layerTree.root()) {
            this._emptyView.show(this.element);
            return;
        }
        this._emptyView.detach();

        var gl = this._initGLIfNecessary();
        this._resizeCanvas();
        this._initProjectionMatrix();
        this._calculateDepths();

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (this._layerTree.viewportSize())
            this._drawViewport();
        this._layerTree.forEachLayer(this._drawLayer.bind(this));
    },

    /**
     * Intersects quad with given transform matrix and line l(t) = (x0, y0, t)
     * @param {!Array.<number>} vertices
     * @param {!CSSMatrix} matrix
     * @param {!number} x0
     * @param {!number} y0
     * @return {(number|undefined)}
     */
    _intersectLineAndRect: function(vertices, matrix, x0, y0)
    {
        var epsilon = 1e-8;
        var i;
        // Vertices of the quad with transform matrix applied
        var points = [];
        for (i = 0; i < 4; ++i)
            points[i] = WebInspector.Geometry.multiplyVectorByMatrixAndNormalize(new WebInspector.Geometry.Vector(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]), matrix);
        // Calculating quad plane normal
        var normal = WebInspector.Geometry.crossProduct(WebInspector.Geometry.subtract(points[1], points[0]), WebInspector.Geometry.subtract(points[2], points[1]));
        // General form of the equation of the quad plane: A * x + B * y + C * z + D = 0
        var A = normal.x;
        var B = normal.y;
        var C = normal.z;
        var D = -(A * points[0].x + B * points[0].y + C * points[0].z);
        // Finding t from the equation
        var t = -(D + A * x0 + B * y0) / C;
        // Point of the intersection
        var pt = new WebInspector.Geometry.Vector(x0, y0, t);
        // Vectors from the intersection point to vertices of the quad
        var tVects = points.map(WebInspector.Geometry.subtract.bind(null, pt));
        // Intersection point lies inside of the polygon if scalar products of normal of the plane and
        // cross products of successive tVects are all nonstrictly above or all nonstrictly below zero
        for (i = 0; i < tVects.length; ++i) {
            var product = WebInspector.Geometry.scalarProduct(normal, WebInspector.Geometry.crossProduct(tVects[i], tVects[(i + 1) % tVects.length]));
            if (product < 0)
                return undefined;
        }
        return t;
    },

    /**
     * @param {?Event} event
     * @return {?WebInspector.Layers3DView.ActiveObject}
     */
    _activeObjectFromEventPoint: function(event)
    {
        if (!this._layerTree)
            return null;
        var closestIntersectionPoint = Infinity;
        var closestLayer = null;
        var projectionMatrix = new WebKitCSSMatrix().scale(1, -1, -1).translate(-1, -1, 0).multiply(this._calculateProjectionMatrix());
        var x0 = (event.clientX - this._canvasElement.totalOffsetLeft()) * window.devicePixelRatio;
        var y0 = -(event.clientY - this._canvasElement.totalOffsetTop()) * window.devicePixelRatio;

        /**
         * @param {!WebInspector.Layer} layer
         * @this {WebInspector.Layers3DView}
         */
        function checkIntersection(layer)
        {
            var t;
            if (this._isVisible[layer.id()]) {
                t = this._intersectLineAndRect(this._calculateVerticesForQuad(layer.quad(), this._depthByLayerId[layer.id()] * WebInspector.Layers3DView.LayerSpacing), projectionMatrix, x0, y0);
                if (t < closestIntersectionPoint) {
                    closestIntersectionPoint = t;
                    closestLayer = {layer: layer};
                }
            }
            var scrollRectQuads = this._scrollRectQuadsForLayer[layer.id()];
            for (var i = 0; i < scrollRectQuads.length; ++i) {
                t = this._intersectLineAndRect(this._calculateVerticesForQuad(scrollRectQuads[i], this._calculateScrollRectDepth(layer, i)), projectionMatrix, x0, y0);
                if (t < closestIntersectionPoint) {
                    closestIntersectionPoint = t;
                    closestLayer = {layer: layer, scrollRectIndex: i};
                }
            }
        }

        this._layerTree.forEachLayer(checkIntersection.bind(this));
        return closestLayer;
    },

    /**
     * @param {?Event} event
     */
    _onContextMenu: function(event)
    {
        var activeObject = this._activeObjectFromEventPoint(event);
        var node = activeObject && activeObject.layer && activeObject.layer.nodeForSelfOrAncestor();
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem("Reset view", this._transformController.resetAndNotify.bind(this._transformController), false);
        if (node)
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
        this.dispatchEventToListeners(WebInspector.Layers3DView.Events.ObjectHovered, this._activeObjectFromEventPoint(event));
    },

    /**
     * @param {?Event} event
     */
    _onMouseDown: function(event)
    {
        this._mouseDownX = event.clientX;
        this._mouseDownY = event.clientY;
    },

    /**
     * @param {?Event} event
     */
    _onMouseUp: function(event)
    {
        const maxDistanceInPixels = 6;
        if (this._mouseDownX && Math.abs(event.clientX - this._mouseDownX) < maxDistanceInPixels && Math.abs(event.clientY - this._mouseDownY) < maxDistanceInPixels)
            this.dispatchEventToListeners(WebInspector.Layers3DView.Events.ObjectSelected, this._activeObjectFromEventPoint(event));
        delete this._mouseDownX;
        delete this._mouseDownY;
    },

    /**
     * @param {?Event} event
     */
    _onDoubleClick: function(event)
    {
        var object = this._activeObjectFromEventPoint(event);
        if (object && object.layer)
            this.dispatchEventToListeners(WebInspector.Layers3DView.Events.LayerSnapshotRequested, object.layer);
        event.stopPropagation();
    },

    __proto__: WebInspector.VBox.prototype
}
