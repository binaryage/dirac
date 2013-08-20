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
 */
WebInspector.ScreencastView = function()
{
    WebInspector.View.call(this);
    this.registerRequiredCSS("screencastView.css");

    this.element.addStyleClass("fill");
    this.element.addStyleClass("screencast");

    this._isCasting = false;
    this._imageElement = this.element.createChild("img", "screencast-frame");
    this._imageElement.tabIndex = 1;
    this._imageElement.addEventListener("mousedown", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("mouseup", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("mousemove", this._handleMouseEvent.bind(this), false);
    this._imageElement.addEventListener("keydown", this._handleKeyEvent.bind(this), false);
    this._imageElement.addEventListener("keyup", this._handleKeyEvent.bind(this), false);
    this._imageElement.addEventListener("keypress", this._handleKeyEvent.bind(this), false);
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
    },

    stopCasting: function()
    {
        if (!this._isCasting)
            return;
        this._isCasting = false;
        PageAgent.stopScreencast();
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
    },

    /**
     * @param {Event} event
     */
    _handleMouseEvent: function(event)
    {
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
        var modifiers = 0;
        if (event.altKey)
            modifiers = 1;
        if (event.ctrlKey)
            modifiers += 2;
        if (event.metaKey)
            modifiers += 4;
        if (event.shiftKey)
            modifiers += 8;

        const gutterSize = 40;
        var x = Math.round((event.x - gutterSize) / this._scale / this._zoom);
        var y = Math.round((event.y - gutterSize) / this._scale / this._zoom);
        InputAgent.dispatchMouseEvent(type, x, y, modifiers, event.timeStamp / 1000, button, event.detail, true);
        this.element.focus();
        event.consume();
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

        var modifiers = 0;
        if (event.altKey)
            modifiers = 1;
        if (event.ctrlKey)
            modifiers += 2;
        if (event.metaKey)
            modifiers += 4;
        if (event.shiftKey)
            modifiers += 8;

        var text = event.type === "keypress" ? String.fromCharCode(event.charCode) : undefined;
        InputAgent.dispatchKeyEvent(type, modifiers, event.timeStamp / 1000, text, text ? text.toLowerCase() : undefined,
                                    event.keyIdentifier, event.keyCode /* windowsVirtualKeyCode */, event.keyCode /* nativeVirtualKeyCode */, undefined /* macCharCode */, false, false, false);
        this.element.focus();
        event.consume();
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
        if (maxWidth > ratio * maxHeight) {
            this._imageElement.style.width = (ratio * maxHeight) + bordersSize + "px";
            this._imageElement.style.height = (maxHeight + bordersSize) + "px";
        } else {
            this._imageElement.style.width = (maxWidth + bordersSize) + "px";
            this._imageElement.style.height = maxWidth / ratio + bordersSize + "px";
        }
        this._zoom = (this._imageElement.offsetWidth - bordersSize) / this._imageElement.naturalWidth;
    },

    __proto__: WebInspector.View.prototype
}
