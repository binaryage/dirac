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
    this._warningMessage = this._responsiveDesignContainer.element.createChild("div", "responsive-design-warning hidden");
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated, this._overridesWarningUpdated, this);

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
    WebInspector.settings.responsiveDesignMode.addChangeListener(this._responsiveDesignModeChanged, this);

    WebInspector.overridesSupport.settings.emulateViewport.addChangeListener(this._maybeEnableResponsiveDesign, this);
    WebInspector.overridesSupport.settings.emulateTouchEvents.addChangeListener(this._maybeEnableResponsiveDesign, this);
    WebInspector.overridesSupport.settings.overrideDeviceResolution.addChangeListener(this._maybeEnableResponsiveDesign, this);

    this._updateOverridesSupportOnDockSideChange();
};

// Measured in DIP.
WebInspector.ResponsiveDesignView.SliderWidth = 19;
WebInspector.ResponsiveDesignView.RulerWidth = 20;
WebInspector.ResponsiveDesignView.ToolbarHeight = 24;

WebInspector.ResponsiveDesignView.prototype = {
    _maybeEnableResponsiveDesign: function()
    {
        if (this._enabled)
            return;
        if (WebInspector.overridesSupport.settings.emulateViewport.get() ||
                WebInspector.overridesSupport.settings.emulateTouchEvents.get() ||
                WebInspector.overridesSupport.settings.overrideDeviceResolution.get()) {
            WebInspector.settings.responsiveDesignMode.set(true);
        }
    },

    _responsiveDesignModeChanged: function()
    {
        if (WebInspector.dockController.dockSide() === WebInspector.DockController.State.Undocked) {
            WebInspector.overridesSupport.setPageResizer(null);
            return;
        }

        delete this._cachedScale;
        delete this._cachedCssCanvasWidth;
        delete this._cachedCssCanvasHeight;
        delete this._cachedCssHeight;
        delete this._cachedCssWidth;
        delete this._cachedZoomFactor;
        delete this._availableSize;

        var enabled = WebInspector.settings.responsiveDesignMode.get();
        if (enabled && !this._enabled) {
            this._ignoreResize = true;
            this._enabled = true;
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._pageContainer);
            this._responsiveDesignContainer.show(this.element);
            WebInspector.overridesSupport.setPageResizer(this);
            delete this._ignoreResize;
        }

        if (!enabled && this._enabled) {
            this._ignoreResize = true;
            this._enabled = false;
            this._scale = 0;
            this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
            this._responsiveDesignContainer.detach();
            this._inspectedPagePlaceholder.show(this.element);
            WebInspector.overridesSupport.setPageResizer(null);
            delete this._ignoreResize;
        }
    },

    _updateOverridesSupportOnDockSideChange: function()
    {
        this._responsiveDesignModeChanged();
    },

    /**
     * WebInspector.OverridesSupport.PageResizer override.
     * @param {number} dipWidth
     * @param {number} dipHeight
     * @param {number} scale
     */
    update: function(dipWidth, dipHeight, scale)
    {
        if (!this._enabled)
            return;

        this._scale = scale;
        this._dipWidth = dipWidth;
        this._dipHeight = dipHeight;
        this._resolutionWidthLabel.textContent = dipWidth + "px";
        this._resolutionHeightLabel.textContent = dipHeight + "px";
        this._updateUI();
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
        const textColor = "rgb(180, 180, 180)";

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

        // Device
        var sectionElement = this._toolbarElement.createChild("div", "responsive-design-section");
        var deviceLabel = sectionElement.createChild("label");
        var deviceCheckbox = deviceLabel.createChild("input");
        deviceCheckbox.type = "checkbox";
        deviceLabel.createTextChild(WebInspector.UIString("Device"));
        deviceLabel.title = WebInspector.UIString("Emulate device");
        deviceCheckbox.addEventListener("change", deviceChecked, false);

        function deviceChecked()
        {
            if (deviceCheckbox.checked) {
                var option = deviceSelect.options[deviceSelect.selectedIndex];
                WebInspector.overridesSupport.emulateDevice(option.metrics, option.userAgent);
            } else {
                WebInspector.overridesSupport.resetEmulatedDevice();
            }
        }

        var deviceSelect = WebInspector.overridesSupport.createDeviceSelect(document);
        sectionElement.appendChild(deviceSelect);
        deviceSelect.addEventListener("change", emulateDevice, false);

        function emulateDevice()
        {
            var option = deviceSelect.options[deviceSelect.selectedIndex];
            WebInspector.overridesSupport.emulateDevice(option.metrics, option.userAgent);
        }

        updateDeviceCheckboxStatus();

        WebInspector.overridesSupport.settings.emulateViewport.addChangeListener(updateDeviceCheckboxStatus);
        WebInspector.overridesSupport.settings.emulateTouchEvents.addChangeListener(updateDeviceCheckboxStatus);
        WebInspector.overridesSupport.settings.overrideDeviceResolution.addChangeListener(updateDeviceCheckboxStatus);

        function updateDeviceCheckboxStatus()
        {
            deviceCheckbox.checked = WebInspector.overridesSupport.settings.emulateViewport.get() &&
                WebInspector.overridesSupport.settings.emulateTouchEvents.get() &&
                WebInspector.overridesSupport.settings.overrideDeviceResolution.get();
        }

        // Screen
        sectionElement = this._toolbarElement.createChild("div", "responsive-design-section");
        sectionElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox("Screen", WebInspector.overridesSupport.settings.overrideDeviceResolution, true));

        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceResolution);
        sectionElement.appendChild(fieldsetElement);
        fieldsetElement.createChild("div", "responsive-design-icon responsive-design-icon-resolution").title = WebInspector.UIString("Screen resolution");

        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "3em", WebInspector.OverridesSupport.inputValidator, true));
        fieldsetElement.appendChild(document.createTextNode(" \u00D7 "));
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceHeight, true, 4, "3em", WebInspector.OverridesSupport.inputValidator, true));

        this._swapDimensionsElement = fieldsetElement.createChild("button", "responsive-design-icon responsive-design-icon-swap");
        this._swapDimensionsElement.title = WebInspector.UIString("Swap dimensions");
        this._swapDimensionsElement.addEventListener("click", WebInspector.overridesSupport.swapDimensions.bind(WebInspector.overridesSupport), false);

        fieldsetElement.createChild("div", "responsive-design-icon responsive-design-icon-dpr").title = WebInspector.UIString("Device pixel ratio");
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 2, "2em", WebInspector.OverridesSupport.inputValidator, true));

        // Touch and viewport
        sectionElement = this._toolbarElement.createChild("div", "responsive-design-section");
        sectionElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Touch"), WebInspector.overridesSupport.settings.emulateTouchEvents, true));
        sectionElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Viewport"), WebInspector.overridesSupport.settings.emulateViewport, true));
    },

    _overridesWarningUpdated: function()
    {
        var message = WebInspector.overridesSupport.warningMessage();
        if (this._warningMessage.textContent === message)
            return;
        this._warningMessage.classList.toggle("hidden", !message);
        this._warningMessage.textContent = message;
        this._responsiveDesignModeChanged();
        this.onResize();
    },

    __proto__: WebInspector.VBox.prototype
};
