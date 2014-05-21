// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.OverridesSupport.PageResizer}
 * @param {!WebInspector.InspectedPagePlaceholder} inspectedPagePlaceholder
 */
WebInspector.ResponsiveDesignView = function(inspectedPagePlaceholder)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("responsiveDesignView.css");

    this._container = new WebInspector.View();
    this._container.element.classList.add("responsive-design");

    this._canvas = this._container.element.createChild("canvas", "fill");
    this._resetButton = this._container.element.createChild("div", "responsive-design-reset-button");
    this._resetButton.addEventListener("click", this._reset.bind(this), false);
    this._resetButton.title = WebInspector.UIString("Fit available space");

    this._slidersContainer = this._container.element.createChild("div", "vbox responsive-design-sliders-container");
    var hbox = this._slidersContainer.createChild("div", "hbox flex-auto");
    this._heightSliderContainer = this._slidersContainer.createChild("div", "hbox responsive-design-slider-height");
    this._pageContainer = hbox.createChild("div", "vbox flex-auto");
    this._widthSliderContainer = hbox.createChild("div", "vbox responsive-design-slider-width");

    this._widthSlider = this._widthSliderContainer.createChild("div", "responsive-design-slider-thumb");
    this._createResizer(this._widthSlider, false);
    this._widthZeroButton = this._widthSlider.createChild("div", "responsive-design-zero-button");
    this._widthZeroButton.addEventListener("click", this._zeroButtonClicked.bind(this, false));
    this._heightSlider = this._heightSliderContainer.createChild("div", "responsive-design-slider-thumb");
    this._createResizer(this._heightSlider, true);
    this._heightZeroButton = this._heightSlider.createChild("div", "responsive-design-zero-button");
    this._heightZeroButton.addEventListener("click", this._zeroButtonClicked.bind(this, true));

    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    inspectedPagePlaceholder.show(this.element);

    this._enabled = false;

    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateOverridesSupportOnDockSideChange, this);
    this._updateOverridesSupportOnDockSideChange();
};

// Measured in DIP.
WebInspector.ResponsiveDesignView.SliderWidth = 19;
WebInspector.ResponsiveDesignView.RulerWidth = 23;

WebInspector.ResponsiveDesignView.prototype = {
    _updateOverridesSupportOnDockSideChange: function()
    {
        WebInspector.overridesSupport.setPageResizer(WebInspector.dockController.dockSide() !== WebInspector.DockController.State.Undocked ? this : null);
    },

    /**
     * WebInspector.OverridesSupport.PageResizer override.
     * @param {number} dipWidth
     * @param {number} dipHeight
     * @param {number} scale
     */
    enable: function(dipWidth, dipHeight, scale)
    {
        if (!this._enabled) {
            this._ignoreResize = true;
            this._enabled = true;
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._pageContainer);
            this._container.show(this.element);
            delete this._ignoreResize;
        }

        this._scale = scale;
        this._dipWidth = dipWidth;
        this._dipHeight = dipHeight;
        this._updateUI();
    },

    /**
     * WebInspector.OverridesSupport.PageResizer override.
     */
    disable: function()
    {
        if (!this._enabled)
            return;

        this._ignoreResize = true;
        this._enabled = false;
        this._scale = 0;
        this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
        this._container.detach();
        this._inspectedPagePlaceholder.show(this.element);
        delete this._ignoreResize;
    },

    /**
     * WebInspector.OverridesSupport.PageResizer override.
     * @return {!Size}
     */
    availableDipSize: function()
    {
        if (typeof this._availableSize === "undefined") {
            var zoomFactor = WebInspector.zoomManager.zoomFactor();
            var rect = this.element.getBoundingClientRect();
            this._availableSize = new Size(rect.width * zoomFactor - WebInspector.ResponsiveDesignView.SliderWidth - WebInspector.ResponsiveDesignView.RulerWidth,
                                           rect.height * zoomFactor - WebInspector.ResponsiveDesignView.SliderWidth - WebInspector.ResponsiveDesignView.RulerWidth);
        }
        return this._availableSize;
    },

    /**
     * @param {!Element} element
     * @param {boolean} vertical
     * @return {!WebInspector.ResizerWidget}
     */
    _createResizer: function(element, vertical)
    {
        var resizer = new WebInspector.ResizerWidget();
        resizer.addElement(element);
        resizer.setVertical(vertical);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);
        return resizer;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeStart: function(event)
    {
        var available = this.availableDipSize();
        this._resizeStartSize = event.target.isVertical() ? (this._dipHeight || available.height) : (this._dipWidth || available.width);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeUpdate: function(event)
    {
        var cssOffset = event.data.currentPosition - event.data.startPosition;
        var dipOffset = cssOffset * WebInspector.zoomManager.zoomFactor();
        var newSize = this._resizeStartSize + dipOffset;
        var requested = new Size(this._dipWidth, this._dipHeight);
        if (event.target.isVertical())
            requested.height = Number.constrain(newSize, 1, this.availableDipSize().height);
        else
            requested.width = Number.constrain(newSize, 1, this.availableDipSize().width);
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.ResizeRequested, requested);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStartSize;
    },

    /**
     * @param {boolean} isHeight
     */
    _zeroButtonClicked: function(isHeight)
    {
        var size = new Size(this._dipWidth, this._dipHeight);
        var available = this.availableDipSize();
        if (isHeight)
            size.height = this._dipHeight ? 0 : available.height;
        else
            size.width = this._dipWidth ? 0 : available.width;
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.ResizeRequested, size);
    },

    /**
     * Draws canvas of the specified css size in DevTools page space.
     * Canvas contains grid and rulers.
     * @param {number} cssCanvasWidth
     * @param {number} cssCanvasHeight
     */
    _drawCanvas: function(cssCanvasWidth, cssCanvasHeight)
    {
        if (!this._enabled)
            return;

        var canvas = this._canvas;
        var context = canvas.getContext("2d");
        canvas.style.width = cssCanvasWidth + "px";
        canvas.style.height = cssCanvasHeight + "px";

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var dipCanvasWidth = cssCanvasWidth * zoomFactor;
        var dipCanvasHeight = cssCanvasHeight * zoomFactor;

        var deviceScaleFactor = window.devicePixelRatio;
        canvas.width = deviceScaleFactor * cssCanvasWidth;
        canvas.height = deviceScaleFactor * cssCanvasHeight;
        context.scale(canvas.width / dipCanvasWidth, canvas.height / dipCanvasHeight);

        context.font = "10px " + WebInspector.monospaceFontFamily();

        const gridSubStep = 10;
        const gridStep = 50;
        const rulerBackgroundColor = "rgb(54, 54, 54)";
        const backgroundColor = "rgb(102, 102, 102)";
        const lightLineColor = "rgb(132, 132, 132)";
        const darkLineColor = "rgb(114, 114, 114)";
        const textColor = "rgb(180, 180, 180)";

        var scale = this._scale || 1;
        var rulerWidth = WebInspector.ResponsiveDesignView.RulerWidth;
        var dipGridWidth = dipCanvasWidth / scale - rulerWidth;
        var dipGridHeight = dipCanvasHeight / scale - rulerWidth;
        rulerWidth /= scale;
        context.scale(scale, scale);
        context.translate(rulerWidth, rulerWidth);

        context.fillStyle = rulerBackgroundColor;
        context.fillRect(0, -rulerWidth, dipGridWidth, rulerWidth);
        context.fillRect(-rulerWidth, 0, rulerWidth, dipGridHeight);

        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, dipGridWidth, dipGridHeight);

        context.translate(0.5, 0.5);
        context.fillStyle = textColor;
        context.lineWidth = 1;

        {
            // Draw vertical lines.
            for (var x = 0; x < dipGridWidth; x += gridSubStep) {
                var color = darkLineColor;
                var y = -rulerWidth / 6;
                if (!(x % (2 * gridSubStep)))
                    y = -rulerWidth / 3;
                if (!(x % gridStep)) {
                    if (x) {
                        context.save();
                        context.translate(x, 0);
                        context.fillText(x, 2, -rulerWidth / 2);
                        context.restore();
                    }
                    y = -rulerWidth;
                    color = lightLineColor;
                }
                context.strokeStyle = color;

                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x, dipGridHeight);
                context.stroke();
            }
        }

        {
            // Draw horizontal lines.
            for (var y = 0; y < dipGridHeight; y += gridSubStep) {
                var color = darkLineColor;
                var x = -rulerWidth / 6;
                if (!(y % (2 * gridSubStep)))
                    x = -rulerWidth / 3;
                if (!(y % gridStep)) {
                    if (y) {
                        context.save();
                        context.translate(0, y);
                        context.rotate(-Math.PI / 2);
                        context.fillText(y, 2, -rulerWidth / 2);
                        context.restore();
                    }
                    x = -rulerWidth;
                    color = lightLineColor;
                }
                context.strokeStyle = color;

                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(dipGridWidth, y);
                context.stroke();
            }
            context.restore();
        }
    },

    _updateUI: function()
    {
        if (!this._enabled)
            return;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._canvas.parentElement.getBoundingClientRect();
        var availableDip = this.availableDipSize();
        var cssCanvasWidth = rect.width;
        var cssCanvasHeight = rect.height;

        this._widthSlider.classList.toggle("hidden", !!this._scale);
        this._heightSlider.classList.toggle("hidden", !!this._scale);
        this._widthSlider.classList.toggle("reversed", !this._dipWidth);
        this._heightSlider.classList.toggle("reversed", !this._dipHeight);

        if (this._cachedZoomFactor !== zoomFactor) {
            var cssRulerWidth = WebInspector.ResponsiveDesignView.RulerWidth / zoomFactor + "px";
            this._resetButton.style.width = cssRulerWidth;
            this._resetButton.style.height = cssRulerWidth;
            this._slidersContainer.style.left = cssRulerWidth;
            this._slidersContainer.style.top = cssRulerWidth;

            var cssSliderWidth = WebInspector.ResponsiveDesignView.SliderWidth / zoomFactor + "px";
            this._heightSliderContainer.style.flexBasis = cssSliderWidth;
            this._heightSliderContainer.style.marginBottom = "-" + cssSliderWidth;
            this._widthSliderContainer.style.flexBasis = cssSliderWidth;
            this._widthSliderContainer.style.marginRight = "-" + cssSliderWidth;
        }

        var cssWidth = this._dipWidth ? (this._dipWidth / zoomFactor + "px") : (availableDip.width / zoomFactor + "px");
        var cssHeight = this._dipHeight ? (this._dipHeight / zoomFactor + "px") : (availableDip.height / zoomFactor + "px");
        if (this._cachedCssWidth !== cssWidth || this._cachedCssHeight !== cssHeight) {
            this._slidersContainer.style.width = cssWidth;
            this._slidersContainer.style.height = cssHeight;
            this._inspectedPagePlaceholder.onResize();
        }

        if (this._cachedScale !== this._scale || this._cachedCssCanvasWidth !== cssCanvasWidth || this._cachedCssCanvasHeight !== cssCanvasHeight || this._cachedZoomFactor !== zoomFactor)
            this._drawCanvas(cssCanvasWidth, cssCanvasHeight);

        this._cachedScale = this._scale;
        this._cachedCssCanvasWidth = cssCanvasWidth;
        this._cachedCssCanvasHeight = cssCanvasHeight;
        this._cachedCssHeight = cssHeight;
        this._cachedCssWidth = cssWidth;
        this._cachedZoomFactor = zoomFactor;
    },

    onResize: function()
    {
        if (!this._enabled || this._ignoreResize)
            return;
        delete this._availableSize;
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.AvailableSizeChanged);
        this._updateUI();
    },

    _onZoomChanged: function()
    {
        this._updateUI();
    },

    /**
     * Resets emulated size to available space.
     */
    _reset: function()
    {
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.ResizeRequested, this.availableDipSize());
    },

    __proto__: WebInspector.VBox.prototype
};
