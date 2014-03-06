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
    this.reset();
}

/**
 * @enum {string}
 */
WebInspector.TransformController.Events = {
    TransformChanged: "TransformChanged"
}

/**
 * @enum {number}
 */
WebInspector.TransformController.TransformType = {
    Offset: 1 << 0,
    Scale: 1 << 1,
    Rotation: 1 << 2
}

WebInspector.TransformController.prototype = {
    /**
     * @param {number} changeType
     */
    _postChangeEvent: function(changeType)
    {
        this.dispatchEventToListeners(WebInspector.TransformController.Events.TransformChanged, changeType);
    },

    /**
     * @param {?Event} event
     */
    _onMouseMove: function(event)
    {
        if (event.which !== 1)
            return;
        // Set reference point if we missed mousedown.
        if (typeof this._originX !== "number")
            this._setReferencePoint(event);
        this._rotateX = this._oldRotateX + (this._originY - event.clientY) / 2;
        this._rotateY = this._oldRotateY - (this._originX - event.clientX) / 4;
        this._postChangeEvent(WebInspector.TransformController.TransformType.Rotation);
    },

    reset: function()
    {
        this._scale = 1;
        this._offsetX = 0;
        this._offsetY = 0;
        this._rotateX = 0;
        this._rotateY = 0;
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
     * @param {?Event} event
     */
    _onMouseWheel: function(event)
    {
        if (event.shiftKey) {
            const zoomFactor = 1.1;
            const mouseWheelZoomSpeed = 1 / 120;
            var scaleFactor = Math.pow(zoomFactor, event.wheelDeltaY * mouseWheelZoomSpeed);
            this._scale *= scaleFactor;
            this._offsetX -= (event.clientX - this.element.totalOffsetLeft() - this._offsetX) * (scaleFactor - 1);
            this._offsetY -= (event.clientY - this.element.totalOffsetTop() - this._offsetY) * (scaleFactor - 1);
            this._postChangeEvent(WebInspector.TransformController.TransformType.Scale | WebInspector.TransformController.TransformType.Offset);
        } else {
            this._offsetX += event.wheelDeltaX;
            this._offsetY += event.wheelDeltaY;
            this._postChangeEvent(WebInspector.TransformController.TransformType.Offset);
        }
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
