/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!Element} element
 */
WebInspector.TransformController = function(element)
{
    this.element = element;
    element.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    element.addEventListener("mousedown", this._onMouseDown.bind(this), false);
    element.addEventListener("mouseup", this._onMouseUp.bind(this), false);
    element.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._reset();
}

/**
 * @enum {string}
 */
WebInspector.TransformController.Events = {
    TransformChanged: "TransformChanged"
}

WebInspector.TransformController.prototype = {
    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(?Event=))} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ResetView, this._resetAndNotify.bind(this));
        var zoomFactor = 1.1;
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ZoomIn, this._onKeyboardZoom.bind(this, zoomFactor));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.ZoomOut, this._onKeyboardZoom.bind(this, 1 / zoomFactor));
        var panDistanceInPixels = 6;
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanUp, this._onPan.bind(this, 0, -panDistanceInPixels));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanDown, this._onPan.bind(this, 0, panDistanceInPixels));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanLeft, this._onPan.bind(this, -panDistanceInPixels, 0));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.PanRight, this._onPan.bind(this, panDistanceInPixels, 0));
        var rotateDegrees = 5;
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCWX, this._onKeyboardRotate.bind(this, rotateDegrees, 0));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCCWX, this._onKeyboardRotate.bind(this, -rotateDegrees, 0));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCWY, this._onKeyboardRotate.bind(this, 0, -rotateDegrees));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.LayersPanelShortcuts.RotateCCWY, this._onKeyboardRotate.bind(this, 0, rotateDegrees));
    },

    _postChangeEvent: function()
    {
        this.dispatchEventToListeners(WebInspector.TransformController.Events.TransformChanged);
    },

    _reset: function()
    {
        this._scale = 1;
        this._offsetX = 0;
        this._offsetY = 0;
        this._rotateX = 0;
        this._rotateY = 0;
    },

    /**
     * @param {?Event=} event
     */
    _resetAndNotify: function(event)
    {
        this._reset();
        this._postChangeEvent();
        if (event)
            event.preventDefault();
    },

    /**
     * @return {number}
     */
    scale: function()
    {
        return this._scale;
    },

    /**
     * @return {number}
     */
    offsetX: function()
    {
        return this._offsetX;
    },

    /**
     * @return {number}
     */
    offsetY: function()
    {
        return this._offsetY;
    },

    /**
     * @return {number}
     */
    rotateX: function()
    {
        return this._rotateX;
    },

    /**
     * @return {number}
     */
    rotateY: function()
    {
        return this._rotateY;
    },

    /**
     * @param {number} scaleFactor
     * @param {number} x
     * @param {number} y
     */
    _onScale: function(scaleFactor, x, y)
    {
        this._scale *= scaleFactor;
        this._offsetX -= (x - this._offsetX) * (scaleFactor - 1);
        this._offsetY -= (y - this._offsetY) * (scaleFactor - 1);
        this._postChangeEvent();
    },

    /**
     * @param {number} offsetX
     * @param {number} offsetY
     */
    _onPan: function(offsetX, offsetY)
    {
        this._offsetX += offsetX;
        this._offsetY += offsetY;
        this._postChangeEvent();
    },

    /**
     * @param {number} rotateX
     * @param {number} rotateY
     */
    _onRotate: function(rotateX, rotateY)
    {
        this._rotateX = rotateX;
        this._rotateY = rotateY;
        this._postChangeEvent();
    },

    /**
     * @param {number} zoomFactor
     */
    _onKeyboardZoom: function(zoomFactor)
    {
        this._onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
    },

    /**
     * @param {number} rotateX
     * @param {number} rotateY
     */
    _onKeyboardRotate: function(rotateX, rotateY)
    {
        this._onRotate(this._rotateX + rotateX, this._rotateY + rotateY);
    },

    /**
     * @param {?Event} event
     */
    _onMouseWheel: function(event)
    {
        if (!event.altKey) {
            /** @const */
            var zoomFactor = 1.1;
            /** @const */
            var mouseWheelZoomSpeed = 1 / 120;
            var scaleFactor = Math.pow(zoomFactor, event.wheelDeltaY * mouseWheelZoomSpeed);
            this._onScale(scaleFactor, event.clientX - this.element.totalOffsetLeft(), event.clientY - this.element.totalOffsetTop());
        } else {
            /** @const */
            var moveFactor = 1 / 20;
            this._onPan(event.wheelDeltaX * moveFactor, event.wheelDeltaY * moveFactor);
        }
    },

    /**
     * @param {?Event} event
     */
    _onMouseMove: function(event)
    {
        if (event.which !== 1 || typeof this._originX !== "number")
            return;
        this._onRotate(this._oldRotateX + (this._originY - event.clientY) / this.element.clientHeight * 180, this._oldRotateY - (this._originX - event.clientX) / this.element.clientWidth * 180);
    },

    /**
     * @param {?Event} event
     */
    _setReferencePoint: function(event)
    {
        this._originX = event.clientX;
        this._originY = event.clientY;
        this._oldRotateX = this._rotateX;
        this._oldRotateY = this._rotateY;
    },

    _resetReferencePoint: function()
    {
        delete this._originX;
        delete this._originY;
        delete this._oldRotateX;
        delete this._oldRotateY;
    },

    /**
     * @param {?Event} event
     */
    _onMouseDown: function(event)
    {
        if (event.which !== 1)
            return;
        this._setReferencePoint(event);
    },

    /**
     * @param {?Event} event
     */
    _onMouseUp: function(event)
    {
        if (event.which !== 1)
            return;
        this._resetReferencePoint();
    },

    __proto__: WebInspector.Object.prototype
}
