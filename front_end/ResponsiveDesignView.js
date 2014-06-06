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
    this.setMinimumSize(150, 150);
    this.registerRequiredCSS("responsiveDesignView.css");
    this.element.classList.add("overflow-hidden");

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
    WebInspector.settings.responsiveDesign.enabled.addChangeListener(this._responsiveDesignEnabledChanged, this);
    WebInspector.overridesSupport.settings.emulateViewport.addChangeListener(this._maybeEnableResponsiveDesign, this);
    WebInspector.overridesSupport.settings.emulateTouchEvents.addChangeListener(this._maybeEnableResponsiveDesign, this);
    WebInspector.overridesSupport.settings.overrideDeviceResolution.addChangeListener(this._maybeEnableResponsiveDesign, this);
    this._responsiveDesignEnabledChanged();
    this._overridesWarningUpdated();
};

// Measured in DIP.
WebInspector.ResponsiveDesignView.SliderWidth = 19;
WebInspector.ResponsiveDesignView.RulerWidth = 20;

WebInspector.ResponsiveDesignView.prototype = {
    _maybeEnableResponsiveDesign: function()
    {
        if (this._enabled)
            return;
        if (WebInspector.overridesSupport.settings.emulateViewport.get() ||
                WebInspector.overridesSupport.settings.emulateTouchEvents.get() ||
                WebInspector.overridesSupport.settings.overrideDeviceResolution.get()) {
            WebInspector.settings.responsiveDesign.enabled.set(true);
        }
    },

    _invalidateCache: function()
    {
        delete this._cachedScale;
        delete this._cachedCssCanvasWidth;
        delete this._cachedCssCanvasHeight;
        delete this._cachedCssHeight;
        delete this._cachedCssWidth;
        delete this._cachedZoomFactor;
        delete this._availableSize;
    },

    _responsiveDesignEnabledChanged: function()
    {
        var enabled = WebInspector.settings.responsiveDesign.enabled.get();
        if (enabled && !this._enabled) {
            this._invalidateCache();
            this._ignoreResize = true;
            this._enabled = true;
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._pageContainer);
            this._responsiveDesignContainer.show(this.element);
            this.update(this._dipWidth || 0, this._dipHeight || 0, this._scale || 0);
            delete this._ignoreResize;
        } else if (!enabled && this._enabled) {
            this._invalidateCache();
            this._ignoreResize = true;
            this._enabled = false;
            this._scale = 0;
            this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
            this._responsiveDesignContainer.detach();
            this._inspectedPagePlaceholder.show(this.element);
            delete this._ignoreResize;
        }
    },

    /**
     * WebInspector.OverridesSupport.PageResizer override.
     * @param {number} dipWidth
     * @param {number} dipHeight
     * @param {number} scale
     */
    update: function(dipWidth, dipHeight, scale)
    {
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
            this._responsiveDesignEnabledChanged();
            var zoomFactor = WebInspector.zoomManager.zoomFactor();
            var rect = this._canvasContainer.element.getBoundingClientRect();
            this._availableSize = new Size(rect.width * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth,
                                           rect.height * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth);
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
        this._slowPositionStart = null;
        this._resizeStartSize = event.target.isVertical() ? (this._dipHeight || available.height) : (this._dipWidth || available.width);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeUpdate: function(event)
    {
        if (event.data.shiftKey !== !!this._slowPositionStart)
            this._slowPositionStart = event.data.shiftKey ? event.data.currentPosition : null;
        var cssOffset = this._slowPositionStart ? (event.data.currentPosition - this._slowPositionStart) / 10 + this._slowPositionStart - event.data.startPosition : event.data.currentPosition - event.data.startPosition;
        var dipOffset = Math.round(cssOffset * WebInspector.zoomManager.zoomFactor());
        var newSize = Math.max(this._resizeStartSize + dipOffset, 1);
        var requested = {};
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
        if (!this._enabled || !this.isShowing())
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
        var oldSize = this._availableSize;
        delete this._availableSize;
        if (!this.availableDipSize().isEqual(oldSize))
            this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.AvailableSizeChanged);
        this._updateUI();
        this._inspectedPagePlaceholder.onResize();
    },

    _onZoomChanged: function()
    {
        this._updateUI();
    },

    _createToolbar: function()
    {
        var toolbarElement = this._responsiveDesignContainer.element.createChild("div", "responsive-design-toolbar");
        this._toolbarSection = toolbarElement.createChild("div", "responsive-design-composite-section hbox");

        this._expandedDeviceSection = document.createElementWithClass("div", "responsive-design-composite-section vbox");
        this._expandedScreenTouchSection = document.createElementWithClass("div", "responsive-design-composite-section hbox");

        this._expandSection = document.createElementWithClass("div", "responsive-design-section vbox");
        WebInspector.settings.responsiveDesign.toolbarExpanded = WebInspector.settings.createSetting("responsiveDesign.toolbarExpanded", false);
        this._expandButton = this._expandSection.createChild("div", "responsive-design-expand");
        this._expandButton.createChild("div", "responsive-design-icon responsive-design-icon-expand");
        this._expandButton.createChild("span");
        this._expandButton.addEventListener("click", this._toggleToolbarExpanded.bind(this));
        WebInspector.settings.responsiveDesign.toolbarExpanded.addChangeListener(this._toolbarExpandedChanged, this);

        // Device
        this._deviceSection = document.createElementWithClass("div", "responsive-design-section");
        var deviceLabel = this._deviceSection.createChild("label");
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
        this._deviceSection.appendChild(deviceSelect);
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
        this._screenSection = document.createElementWithClass("div", "responsive-design-section");
        this._screenSection.appendChild(WebInspector.SettingsUI.createSettingCheckbox("Screen", WebInspector.overridesSupport.settings.overrideDeviceResolution, true));

        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceResolution);
        this._screenSection.appendChild(fieldsetElement);
        fieldsetElement.createChild("div", "responsive-design-icon responsive-design-icon-resolution").title = WebInspector.UIString("Screen resolution");

        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "3em", WebInspector.OverridesSupport.integerInputValidator, true));
        fieldsetElement.appendChild(document.createTextNode(" \u00D7 "));
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceHeight, true, 4, "3em", WebInspector.OverridesSupport.integerInputValidator, true));

        this._swapDimensionsElement = fieldsetElement.createChild("button", "responsive-design-icon responsive-design-icon-swap");
        this._swapDimensionsElement.title = WebInspector.UIString("Swap dimensions");
        this._swapDimensionsElement.addEventListener("click", WebInspector.overridesSupport.swapDimensions.bind(WebInspector.overridesSupport), false);

        fieldsetElement.createChild("div", "responsive-design-icon responsive-design-icon-dpr").title = WebInspector.UIString("Device pixel ratio");
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 4, "2.5em", WebInspector.OverridesSupport.doubleInputValidator, true));

        // Touch and viewport
        this._touchSection = document.createElementWithClass("div", "responsive-design-section");
        this._touchSection.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Touch"), WebInspector.overridesSupport.settings.emulateTouchEvents, true));
        this._touchSection.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Viewport"), WebInspector.overridesSupport.settings.emulateViewport, true));

        // User agent.
        this._userAgentSection = document.createElementWithClass("div", "responsive-design-composite-section vbox solid");
        var userAgentRow = this._userAgentSection.createChild("div", "responsive-design-composite-section hbox solid");
        userAgentRow.createChild("div", "responsive-design-section hbox").appendChild(WebInspector.SettingsUI.createSettingCheckbox("User Agent", WebInspector.overridesSupport.settings.overrideUserAgent, true));
        var userAgentSelectAndInput = WebInspector.overridesSupport.createUserAgentSelectAndInput(document);
        userAgentRow.createChild("div", "responsive-design-section hbox").appendChild(userAgentSelectAndInput.select);
        this._userAgentSection.createChild("div", "responsive-design-section hbox").appendChild(userAgentSelectAndInput.input);

        this._toolbarExpandedChanged();
    },

    _toggleToolbarExpanded: function()
    {
        WebInspector.settings.responsiveDesign.toolbarExpanded.set(!WebInspector.settings.responsiveDesign.toolbarExpanded.get());
    },

    _toolbarExpandedChanged: function()
    {
        var expanded = WebInspector.settings.responsiveDesign.toolbarExpanded.get();
        this._expandButton.classList.toggle("expanded", expanded);
        this._expandButton.querySelector("span").textContent = WebInspector.UIString(expanded ? "Collapse" : "Expand");

        if (expanded) {
            this._expandedScreenTouchSection.setChildren([this._screenSection, this._touchSection]);
            this._expandedDeviceSection.setChildren([this._deviceSection, this._expandedScreenTouchSection]);
            this._toolbarSection.setChildren([this._expandSection, this._expandedDeviceSection, this._userAgentSection]);
        } else {
            this._toolbarSection.setChildren([this._expandSection, this._deviceSection, this._screenSection, this._touchSection]);
        }

        this.onResize();
    },

    _overridesWarningUpdated: function()
    {
        var message = WebInspector.overridesSupport.warningMessage();
        if (this._warningMessage.textContent === message)
            return;
        this._warningMessage.classList.toggle("hidden", !message);
        this._warningMessage.textContent = message;
        this._invalidateCache();
        this.onResize();
    },

    __proto__: WebInspector.VBox.prototype
};
