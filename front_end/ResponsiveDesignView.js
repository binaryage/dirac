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

    this._responsiveDesignContainer = new WebInspector.VBox();
    this._createToolbar();
    this._canvasContainer = new WebInspector.View();
    this._canvasContainer.element.classList.add("responsive-design");
    this._canvasContainer.show(this._responsiveDesignContainer.element);

    this._canvas = this._canvasContainer.element.createChild("canvas", "fill");
    this._slidersContainer = this._canvasContainer.element.createChild("div", "vbox responsive-design-sliders-container");
    var hbox = this._slidersContainer.createChild("div", "hbox flex-auto");
    this._heightSliderContainer = this._slidersContainer.createChild("div", "hbox responsive-design-slider-height");
    this._resolutionHeightLabel = this._heightSliderContainer.createChild("div", "responsive-design-resolution-label responsive-design-resolution-height");
    this._pageContainer = hbox.createChild("div", "vbox flex-auto");
    this._widthSliderContainer = hbox.createChild("div", "vbox responsive-design-slider-width");
    this._resolutionWidthLabel = this._widthSliderContainer.createChild("div", "responsive-design-resolution-label responsive-design-resolution-width");

    this._widthSlider = this._widthSliderContainer.createChild("div", "responsive-design-slider-thumb");
    this._widthSlider.createChild("div", "responsive-design-thumb-handle");
    this._createResizer(this._widthSlider, false);
    this._heightSlider = this._heightSliderContainer.createChild("div", "responsive-design-slider-thumb");
    this._heightSlider.createChild("div", "responsive-design-thumb-handle");
    this._createResizer(this._heightSlider, true);

    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    inspectedPagePlaceholder.show(this.element);

    this._enabled = false;

    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateOverridesSupportOnDockSideChange, this);
    this._updateOverridesSupportOnDockSideChange();
};

// Measured in DIP.
WebInspector.ResponsiveDesignView.SliderWidth = 19;
WebInspector.ResponsiveDesignView.RulerWidth = 20;
WebInspector.ResponsiveDesignView.ToolbarHeight = 24;

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
            this._responsiveDesignContainer.show(this.element);
            delete this._ignoreResize;
        }

        this._scale = scale;
        this._dipWidth = dipWidth;
        this._dipHeight = dipHeight;
        this._resolutionWidthLabel.textContent = dipWidth + "px";
        this._resolutionHeightLabel.textContent = dipHeight + "px";
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
        this._responsiveDesignContainer.detach();
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
            this._availableSize = new Size(rect.width * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth,
                                           rect.height * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth - WebInspector.ResponsiveDesignView.ToolbarHeight);
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
        var newSize = Math.max(this._resizeStartSize + dipOffset, 1);
        var requested = new Size(this._dipWidth, this._dipHeight);
        if (event.target.isVertical())
            requested.height = newSize;
        else
            requested.width = newSize;
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

        context.font = "11px " + WebInspector.fontFamily();

        const rulerStep = 100;
        const rulerSubStep = 5;
        const gridStep = 50;
        const gridSubStep = 10;
        const rulerBackgroundColor = "rgb(64, 64, 64)";
        const backgroundColor = "rgb(102, 102, 102)";
        const lightLineColor = "rgb(132, 132, 132)";
        const darkLineColor = "rgb(114, 114, 114)";
        const textColor = "rgb(220, 220, 220)";

        var scale = this._scale || 1;
        var rulerWidth = WebInspector.ResponsiveDesignView.RulerWidth;
        var dipGridWidth = dipCanvasWidth / scale - rulerWidth;
        var dipGridHeight = dipCanvasHeight / scale - rulerWidth;
        rulerWidth /= scale;
        context.scale(scale, scale);
        context.translate(rulerWidth, rulerWidth);

        context.fillStyle = rulerBackgroundColor;
        context.fillRect(-rulerWidth, -rulerWidth, dipGridWidth + rulerWidth, rulerWidth);
        context.fillRect(-rulerWidth, 0, rulerWidth, dipGridHeight);

        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, dipGridWidth, dipGridHeight);

        context.translate(0.5, 0.5);
        context.strokeStyle = textColor;
        context.fillStyle = textColor;
        context.lineWidth = 1;

        // Draw vertical ruler.
        for (var x = 0; x < dipGridWidth; x += rulerSubStep) {
            var color = darkLineColor;
            var y = -rulerWidth / 4;
            if (!(x % (rulerStep / 2)))
                y = -rulerWidth / 2;

            if (!(x % rulerStep)) {
                if (x) {
                    context.save();
                    context.translate(x, 0);
                    context.fillText(x, 2, -rulerWidth / 2);
                    context.restore();
                }
                y = -rulerWidth * 2 / 3;
            }

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, 0);
            context.stroke();
        }

        // Draw horizontal ruler.
        for (var y = 0; y < dipGridHeight; y += rulerSubStep) {
            var color = darkLineColor;
            x = -rulerWidth / 4;
            if (!(y % (rulerStep / 2)))
                x = -rulerWidth / 2;

            if (!(y % rulerStep)) {
                if (y) {
                    context.save();
                    context.translate(0, y);
                    context.rotate(-Math.PI / 2);
                    context.fillText(y, 2, -rulerWidth / 2);
                    context.restore();
                }
                x = -rulerWidth * 2 / 3;
            }

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(0, y);
            context.stroke();
        }

        // Draw grid.
        drawGrid(darkLineColor, gridSubStep);
        drawGrid(lightLineColor, gridStep);

        /**
         * @param {string} color
         * @param {number} step
         */
        function drawGrid(color, step)
        {
            context.strokeStyle = color;
            for (var x = 0; x < dipGridWidth; x += step) {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, dipGridHeight);
                context.stroke();
            }
            for (var y = 0; y < dipGridHeight; y += step) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(dipGridWidth, y);
                context.stroke();
            }
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

    _createToolbar: function()
    {
        this._toolbarElement = this._responsiveDesignContainer.element.createChild("div", "responsive-design-toolbar");

        const metricsSetting = WebInspector.overridesSupport.settings.deviceMetrics.get();
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(metricsSetting);

        /**
         * @this {WebInspector.ResponsiveDesignView}
         */
        function swapDimensionsClicked()
        {
            var widthValue = this._widthOverrideElement.value;
            this._widthOverrideElement.value = this._heightOverrideElement.value;
            this._heightOverrideElement.value = widthValue;
            this._applyDeviceMetricsUserInput();
        }

        this._toolbarElement.appendChild(document.createTextNode("Screen")).title = WebInspector.UIString("Screen resolution");
        this._widthOverrideElement = WebInspector.SettingsUI.createInput(this._toolbarElement, "responsive-design-override-width", String(metrics.width), this._applyDeviceMetricsUserInput.bind(this), true, "3em");
        this._toolbarElement.appendChild(document.createTextNode(" \u00D7 "));
        this._heightOverrideElement = WebInspector.SettingsUI.createInput(this._toolbarElement, "responsive-design-override-height", String(metrics.height), this._applyDeviceMetricsUserInput.bind(this), true, "3em");
        this._swapDimensionsElement = this._toolbarElement.createChild("button", "responsive-design-override-swap");
        this._swapDimensionsElement.appendChild(document.createTextNode(" \u21C4 ")); // RIGHTWARDS ARROW OVER LEFTWARDS ARROW.
        this._swapDimensionsElement.title = WebInspector.UIString("Swap dimensions");
        this._swapDimensionsElement.addEventListener("click", swapDimensionsClicked.bind(this), false);
        this._swapDimensionsElement.tabIndex = -1;

        var span = this._toolbarElement.createChild("span");
        span.textContent = WebInspector.UIString("Dpr");
        span.title = WebInspector.UIString("Device pixel ratio");
        this._deviceScaleFactorOverrideElement = WebInspector.SettingsUI.createInput(this._toolbarElement, "responsive-design-device-scale", String(metrics.deviceScaleFactor), this._applyDeviceMetricsUserInput.bind(this), true, "2em");

        var textAutosizingOverrideElement = WebInspector.SettingsUI.createNonPersistedCheckbox(WebInspector.UIString("Enable text autosizing "), this._applyDeviceMetricsUserInput.bind(this));
        textAutosizingOverrideElement.title = WebInspector.UIString("Text autosizing is the feature that boosts font sizes on mobile devices.");
        this._textAutosizingOverrideCheckbox = textAutosizingOverrideElement.firstChild;
        this._textAutosizingOverrideCheckbox.checked = metrics.textAutosizing;
        WebInspector.overridesSupport.settings.deviceMetrics.addChangeListener(this._updateDeviceMetricsElement, this);
    },

    _updateDeviceMetricsElement: function()
    {
        const metricsSetting = WebInspector.overridesSupport.settings.deviceMetrics.get();
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(metricsSetting);

        if (this._widthOverrideElement.value != metrics.width)
            this._widthOverrideElement.value = metrics.width;
        if (this._heightOverrideElement.value != metrics.height)
            this._heightOverrideElement.value = metrics.height;
        if (this._deviceScaleFactorOverrideElement.value != metrics.deviceScaleFactor)
            this._deviceScaleFactorOverrideElement.value = metrics.deviceScaleFactor;
        if (this._textAutosizingOverrideCheckbox.checked !== metrics.textAutosizing)
            this._textAutosizingOverrideCheckbox.checked = metrics.textAutosizing;
    },

    _applyDeviceMetricsUserInput: function()
    {
        WebInspector.OverridesSupport.DeviceMetrics.applyOverrides(this._widthOverrideElement, this._heightOverrideElement, this._deviceScaleFactorOverrideElement, this._textAutosizingOverrideCheckbox);
    },

    __proto__: WebInspector.VBox.prototype
};
