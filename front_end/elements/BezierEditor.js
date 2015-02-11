// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.HBox}
 */
WebInspector.BezierEditor = function()
{
    WebInspector.HBox.call(this, true);
    this.registerRequiredCSS("elements/bezierEditor.css");
    this.contentElement.tabIndex = 0;

    this._presetsContainer = this.contentElement.createChild("div", "bezier-presets");
    this._presetIcons = {};
    var presetBeziers = WebInspector.Geometry.CubicBezier.KeywordValues;
    var presetUI = new WebInspector.BezierUI(40, 40, 0, 2, false);

    for (var preset in presetBeziers) {
        var icon = this._presetsContainer.createSVGChild("svg", "bezier-preset monospace");
        presetUI.drawCurve(WebInspector.Geometry.CubicBezier.parse(presetBeziers[preset]), icon);
        icon.addEventListener("mousedown", this._presetSelected.bind(this, icon, preset));
        this._presetIcons[preset] = icon;
        var label = this._presetsContainer.createChild("div", "bezier-preset-label");
        label.textContent = preset;
    }

    var container = this.contentElement.createChild("div", "bezier-editor-container");
    this._curveUI = new WebInspector.BezierUI(150, 290, 70, 7, true);
    this._curve = container.createSVGChild("svg", "bezier-curve");
    WebInspector.installDragHandle(this._curve, this._dragStart.bind(this), this._dragMove.bind(this), this._dragEnd.bind(this), "default");

    this._previewElement = container.createChild("div", "bezier-preview-container");
    this._previewElement.createChild("div", "bezier-preview-animation");
    this._previewOnion = container.createChild("div", "bezier-preview-onion");
}


WebInspector.BezierEditor.Events = {
    BezierChanged: "BezierChanged"
}

WebInspector.BezierEditor.prototype = {
    /**
     * @param {?WebInspector.Geometry.CubicBezier} bezier
     */
    setBezier: function(bezier)
    {
        if (!bezier)
            return;
        this._bezier = bezier;
        this._updateUI();
    },

    /**
     * @return {!WebInspector.Geometry.CubicBezier}
     */
    bezier: function()
    {
        return this._bezier;
    },

    wasShown: function()
    {
        this._updateUI();
    },

    _onchange: function()
    {
        this._updateUI();
        this.dispatchEventToListeners(WebInspector.BezierEditor.Events.BezierChanged, this._preset ? this._preset : this._bezier.asCSSText());
    },

    _updateUI: function()
    {
        this._curveUI.drawCurve(this._bezier, this._curve);
        this._previewOnion.removeChildren();
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _dragStart: function(event)
    {
        this._mouseDownPosition = new WebInspector.Geometry.Point(event.x, event.y);
        var ui = this._curveUI;
        this._controlPosition = new WebInspector.Geometry.Point(
            Number.constrain((event.offsetX - ui.radius) / ui.curveWidth(), 0, 1),
            (ui.curveHeight() + ui.marginTop + ui.radius - event.offsetY) / ui.curveHeight());

        var firstControlPointIsCloser = this._controlPosition.distanceTo(this._bezier.controlPoints[0]) < this._controlPosition.distanceTo(this._bezier.controlPoints[1]);
        this._selectedPoint = firstControlPointIsCloser ? 0 : 1;

        this._bezier.controlPoints[this._selectedPoint] = this._controlPosition;
        this._unselectPresets();
        this._onchange();

        event.consume(true);
        return true;
    },

    /**
     * @param {number} mouseX
     * @param {number} mouseY
     */
    _updateControlPosition: function(mouseX, mouseY)
    {
        var deltaX = (mouseX - this._mouseDownPosition.x) / this._curveUI.curveWidth();
        var deltaY = (mouseY - this._mouseDownPosition.y) / this._curveUI.curveHeight();
        var newPosition = new WebInspector.Geometry.Point(Number.constrain(this._controlPosition.x + deltaX, 0, 1), this._controlPosition.y - deltaY);
        this._bezier.controlPoints[this._selectedPoint] = newPosition;
    },

    /**
     * @param {!Event} event
     */
    _dragMove: function(event)
    {
        this._updateControlPosition(event.x, event.y);
        this._onchange();
    },

    /**
     * @param {!Event} event
     */
    _dragEnd: function(event)
    {
        this._updateControlPosition(event.x, event.y);
        this._onchange();
        this._startPreviewAnimation();
    },

    _unselectPresets: function()
    {
        for (var i in this._presetIcons)
            this._presetIcons[i].classList.remove("bezier-preset-selected");
        delete this._preset;
    },

    /**
     * @param {!Element} icon
     * @param {string} presetName
     * @param {!Event} event
     */
    _presetSelected: function(icon, presetName, event)
    {
        this._unselectPresets();
        this._preset = presetName;
        icon.classList.add("bezier-preset-selected");
        this.setBezier(WebInspector.Geometry.CubicBezier.parse(WebInspector.Geometry.CubicBezier.KeywordValues[presetName]));
        this._onchange();
        this._startPreviewAnimation();
        event.consume(true);
    },

    _startPreviewAnimation: function()
    {
        if (this._previewAnimation)
            this._previewAnimation.cancel();

        const animationDuration = 1600;
        const numberOnionSlices = 15;
        var keyframes = [{ transform: "translateX(0px)", easing: this._bezier.asCSSText() }, { transform: "translateX(130px)" }];

        this._previewAnimation = this._previewElement.animate(keyframes, { duration: animationDuration, fill: "forwards" });
        this._previewOnion.removeChildren();
        for (var i = 0; i < numberOnionSlices; i++) {
            var slice = this._previewOnion.createChild("div", "bezier-preview-animation");
            var player = slice.animate(keyframes, animationDuration);
            player.pause();
            player.currentTime = animationDuration * i / numberOnionSlices;
        }
    },

    __proto__: WebInspector.HBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.StylesPopoverIcon}
 * @param {!WebInspector.StylePropertyTreeElementBase} treeElement
 * @param {?WebInspector.StylesPopoverHelper} stylesPopoverHelper
 * @param {?WebInspector.BezierEditor} bezierEditor
 * @param {!Element} nameElement
 * @param {!Element} valueElement
 * @param {string} text
 */
WebInspector.BezierIcon = function(treeElement, stylesPopoverHelper, bezierEditor, nameElement, valueElement, text)
{
    WebInspector.StylesPopoverIcon.call(this, treeElement, stylesPopoverHelper, nameElement, valueElement, text);

    this._stylesPopoverHelper = stylesPopoverHelper;
    this._bezierEditor = bezierEditor;
    this._boundBezierChanged = this._bezierChanged.bind(this);
}

WebInspector.BezierIcon.prototype = {
    /**
     * @override
     * @return {?WebInspector.View}
     */
    view: function()
    {
        return this._bezierEditor;
    },

    /**
     * @return {!Node}
     */
    icon: function()
    {
        /**
         * @return {!Element}
         */
        function createIcon()
        {
            var icon = container.createSVGChild("svg", "popover-icon bezier-icon");
            icon.setAttribute("height", 10);
            icon.setAttribute("width", 10);
            var g = icon.createSVGChild("g");
            var path = g.createSVGChild("path");
            path.setAttribute("d", "M2,8 C2,3 8,7 8,2");
            return icon;
        }

        var container = createElement("nobr");
        this._iconElement = createIcon();
        this._iconElement.addEventListener("click", this._iconClick.bind(this), false);
        this._bezierValueElement = container.createChild("span");
        this._bezierValueElement.textContent = this._text;
        return container;
    },

    /**
     * @override
     * @param {!Event} event
     * @return {boolean}
     */
    toggle: function(event)
    {
        event.consume(true);

        if (!this._stylesPopoverHelper)
            return false;

        if (this._stylesPopoverHelper.isShowing()) {
            this._stylesPopoverHelper.hide(true);
        } else {
            this._bezierEditor.setBezier(WebInspector.Geometry.CubicBezier.parse(this._text));
            this._stylesPopoverHelper.show(this._bezierEditor, this._iconElement);
            this._bezierEditor.addEventListener(WebInspector.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
        }

        return this._stylesPopoverHelper.isShowing();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _bezierChanged: function(event)
    {
        this._bezierValueElement.textContent = /** @type {string} */ (event.data);
        this._valueChanged();
    },

    /**
     * @override
     * @param {!WebInspector.Event} event
     */
    popoverHidden: function(event)
    {
        this._bezierEditor.removeEventListener(WebInspector.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
        WebInspector.StylesPopoverIcon.prototype.popoverHidden.call(this, event);
    },

    __proto__: WebInspector.StylesPopoverIcon.prototype
}
