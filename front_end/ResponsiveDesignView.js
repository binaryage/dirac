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

    this._mediaInspector = new WebInspector.MediaQueryInspector();
    this._mediaInspectorContainer = this._responsiveDesignContainer.element.createChild("div", "responsive-design-media-container");
    this._updateMediaQueryInspector();

    this._canvasContainer = new WebInspector.View();
    this._canvasContainer.element.classList.add("responsive-design");
    this._canvasContainer.show(this._responsiveDesignContainer.element);

    this._canvas = this._canvasContainer.element.createChild("canvas", "fill");

    this._rulerGlasspane = this._canvasContainer.element.createChild("div", "responsive-design-ruler-glasspane");
    this._rulerGlasspane.appendChild(this._mediaInspector.rulerDecorationLayer());

    this._warningMessage = this._canvasContainer.element.createChild("div", "responsive-design-warning hidden");
    this._warningMessage.createChild("div", "warning-icon-small");
    this._warningMessage.createChild("span");
    var warningCloseButton = this._warningMessage.createChild("div", "close-button");
    warningCloseButton.addEventListener("click", WebInspector.overridesSupport.clearWarningMessage.bind(WebInspector.overridesSupport), false);
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated, this._overridesWarningUpdated, this);

    this._slidersContainer = this._canvasContainer.element.createChild("div", "vbox responsive-design-sliders-container");
    var hbox = this._slidersContainer.createChild("div", "hbox flex-auto");
    this._heightSliderContainer = this._slidersContainer.createChild("div", "hbox responsive-design-slider-height");
    this._pageContainer = hbox.createChild("div", "vbox flex-auto");
    this._widthSliderContainer = hbox.createChild("div", "vbox responsive-design-slider-width");

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
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.EmulationStateChanged, this._emulationEnabledChanged, this);
    this._mediaInspector.addEventListener(WebInspector.MediaQueryInspector.Events.HeightUpdated, this.onResize, this);
    this._emulationEnabledChanged();
    this._overridesWarningUpdated();
};

// Measured in DIP.
WebInspector.ResponsiveDesignView.SliderWidth = 19;
WebInspector.ResponsiveDesignView.RulerWidth = 22;

WebInspector.ResponsiveDesignView.prototype = {
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

    _emulationEnabledChanged: function()
    {
        var enabled = WebInspector.overridesSupport.emulationEnabled();
        this._mediaInspector.setEnabled(enabled);
        if (enabled && !this._enabled) {
            this._invalidateCache();
            this._ignoreResize = true;
            this._enabled = true;
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._pageContainer);
            this._responsiveDesignContainer.show(this.element);
            delete this._ignoreResize;
            this.onResize();
        } else if (!enabled && this._enabled) {
            this._invalidateCache();
            this._ignoreResize = true;
            this._enabled = false;
            this._scale = 1;
            this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
            this._responsiveDesignContainer.detach();
            this._inspectedPagePlaceholder.show(this.element);
            delete this._ignoreResize;
            this.onResize();
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
        this._dipWidth = dipWidth ? Math.max(dipWidth, 1) : 0;
        this._dipHeight = dipHeight ? Math.max(dipHeight, 1) : 0;
        this._updateUI();
    },

    updatePageResizer: function()
    {
        WebInspector.overridesSupport.setPageResizer(this, this._availableDipSize());
    },

    /**
     * @return {!Size}
     */
    _availableDipSize: function()
    {
        if (typeof this._availableSize === "undefined") {
            var zoomFactor = WebInspector.zoomManager.zoomFactor();
            var rect = this._canvasContainer.element.getBoundingClientRect();
            this._availableSize = new Size(Math.max(rect.width * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth, 1),
                                           Math.max(rect.height * zoomFactor - WebInspector.ResponsiveDesignView.RulerWidth, 1));
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
        var available = this._availableDipSize();
        this._slowPositionStart = null;
        this._resizeStartSize = event.target.isVertical() ? (this._dipHeight || available.height) : (this._dipWidth || available.width);
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.FixedScaleRequested, true);
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
        var newSize = this._resizeStartSize + dipOffset;
        newSize = Math.round(newSize / (this._scale || 1));
        newSize = Math.max(Math.min(newSize, WebInspector.OverridesSupport.MaxDeviceSize), 1);
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
        this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.FixedScaleRequested, false);
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

        const rulerBackgroundColor = "rgb(0, 0, 0)";
        const backgroundColor = "rgb(102, 102, 102)";
        const lightLineColor = "rgb(132, 132, 132)";
        const darkLineColor = "rgb(114, 114, 114)";
        const rulerColor = "rgb(125, 125, 125)";
        const textColor = "rgb(186, 186, 186)";

        var scale = this._scale || 1;
        var rulerScale = 1;
        while (Math.abs(rulerScale * scale - 1) > Math.abs((rulerScale + 1) * scale - 1))
            rulerScale++;

        var gridStep = 50 * scale * rulerScale;
        var gridSubStep = 10 * scale * rulerScale;

        var rulerSubStep = 5 * scale * rulerScale;
        var rulerStepCount = 20;

        var rulerWidth = WebInspector.ResponsiveDesignView.RulerWidth;
        var dipGridWidth = dipCanvasWidth - rulerWidth;
        var dipGridHeight = dipCanvasHeight - rulerWidth;
        context.translate(rulerWidth, rulerWidth);

        context.fillStyle = rulerBackgroundColor;
        context.fillRect(-rulerWidth, -rulerWidth, dipGridWidth + rulerWidth, rulerWidth);
        context.fillRect(-rulerWidth, 0, rulerWidth, dipGridHeight);

        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, dipGridWidth, dipGridHeight);

        context.translate(0.5, 0.5);
        context.strokeStyle = rulerColor;
        context.fillStyle = textColor;
        context.lineWidth = 1;

        // Draw vertical ruler.
        for (var x, index = 0; (x = index * rulerSubStep) < dipGridWidth; index++) {
            var y = -rulerWidth / 4;
            if (!(index % (rulerStepCount / 4)))
                y = -rulerWidth / 2;
            if (!(index % (rulerStepCount / 2)))
                y = -rulerWidth + 2;

            if (!(index % rulerStepCount)) {
                context.save();
                context.translate(x, 0);
                context.fillText(Math.round(x / scale), 2, -rulerWidth / 2);
                context.restore();
                y = -rulerWidth;
            }

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, 0);
            context.stroke();
        }

        // Draw horizontal ruler.
        for (var y, index = 0; (y = index * rulerSubStep) < dipGridHeight; index++) {
            var x = -rulerWidth / 4;
            if (!(index % (rulerStepCount / 4)))
                x = -rulerWidth / 2;
            if (!(index % (rulerStepCount / 2)))
                x = -rulerWidth + 2;

            if (!(index % rulerStepCount)) {
                context.save();
                context.translate(0, y);
                context.rotate(-Math.PI / 2);
                context.fillText(Math.round(y / scale), 2, -rulerWidth / 2);
                context.restore();
                x = -rulerWidth;
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
        var availableDip = this._availableDipSize();
        var cssCanvasWidth = rect.width;
        var cssCanvasHeight = rect.height;

        this._mediaInspector.setAxisTransform(WebInspector.ResponsiveDesignView.RulerWidth / zoomFactor, this._scale);

        if (this._cachedZoomFactor !== zoomFactor) {
            var cssRulerWidth = WebInspector.ResponsiveDesignView.RulerWidth / zoomFactor + "px";
            this._rulerGlasspane.style.height = cssRulerWidth;
            this._rulerGlasspane.style.left = cssRulerWidth;
            this._slidersContainer.style.left = cssRulerWidth;
            this._slidersContainer.style.top = cssRulerWidth;
            this._warningMessage.style.height = cssRulerWidth;

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
        var newSize = this._availableDipSize();
        if (!newSize.isEqual(oldSize))
            this.dispatchEventToListeners(WebInspector.OverridesSupport.PageResizer.Events.AvailableSizeChanged, newSize);
        this._updateUI();
        this._inspectedPagePlaceholder.onResize();
    },

    _onZoomChanged: function()
    {
        this._updateUI();
    },

    _createToolbar: function()
    {
        this._toolbarElement = this._responsiveDesignContainer.element.createChild("div", "responsive-design-toolbar");
        this._createButtonsSection();
        this._toolbarElement.createChild("div", "responsive-design-separator");
        this._createDeviceSection();
        this._toolbarElement.createChild("div", "responsive-design-separator");
        this._createNetworkSection();
        this._toolbarElement.createChild("div", "responsive-design-separator");

        var moreButtonContainer = this._toolbarElement.createChild("div", "responsive-design-more-button-container");
        var moreButton = moreButtonContainer.createChild("button", "responsive-design-more-button");
        moreButton.title = WebInspector.UIString("More overrides");
        moreButton.addEventListener("click", this._showEmulationInDrawer.bind(this), false);
        moreButton.textContent = "\u2026";
    },

    _createButtonsSection: function()
    {
        var buttonsSection = this._toolbarElement.createChild("div", "responsive-design-section responsive-design-section-buttons");

        var resetButton = new WebInspector.StatusBarButton(WebInspector.UIString("Reset all overrides."), "clear-status-bar-item");
        buttonsSection.appendChild(resetButton.element);
        resetButton.addEventListener("click", WebInspector.overridesSupport.reset, WebInspector.overridesSupport);

        // Media Query Inspector.
        this._toggleMediaInspectorButton = new WebInspector.StatusBarButton(WebInspector.UIString("Media queries."), "responsive-design-toggle-media-inspector");
        this._toggleMediaInspectorButton.toggled = WebInspector.settings.showMediaQueryInspector.get();
        this._toggleMediaInspectorButton.addEventListener("click", this._onToggleMediaInspectorButtonClick, this);
        WebInspector.settings.showMediaQueryInspector.addChangeListener(this._updateMediaQueryInspector, this);
        buttonsSection.appendChild(this._toggleMediaInspectorButton.element);
    },

    _createDeviceSection: function()
    {
        var deviceSection = this._toolbarElement.createChild("div", "responsive-design-section responsive-design-section-device");

        // Device.
        var deviceElement = deviceSection.createChild("div", "responsive-design-suite responsive-design-suite-top").createChild("div");
        var fieldsetElement = deviceElement.createChild("fieldset");
        fieldsetElement.createChild("label").textContent = WebInspector.UIString("Device");
        fieldsetElement.appendChild(WebInspector.overridesSupport.createDeviceSelect(document));

        var separator = deviceSection.createChild("div", "responsive-design-section-separator");

        var detailsElement = deviceSection.createChild("div", "responsive-design-suite");

        // Dimensions.
        var screenElement = detailsElement.createChild("div", "");
        fieldsetElement = screenElement.createChild("fieldset");

        var emulateResolutionCheckbox = WebInspector.SettingsUI.createSettingCheckbox("", WebInspector.overridesSupport.settings.emulateResolution, true, undefined, WebInspector.UIString("Emulate screen resolution"));
        fieldsetElement.appendChild(emulateResolutionCheckbox);

        var resolutionButton = new WebInspector.StatusBarButton(WebInspector.UIString("Screen resolution"), "responsive-design-icon responsive-design-icon-resolution");
        resolutionButton.setEnabled(false);
        fieldsetElement.appendChild(resolutionButton.element);
        var resolutionFieldset = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.emulateResolution);
        fieldsetElement.appendChild(resolutionFieldset);

        resolutionFieldset.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "3em", WebInspector.OverridesSupport.deviceSizeValidator, true, true, WebInspector.UIString("\u2013")));
        resolutionFieldset.appendChild(document.createTextNode(" \u00D7 "));
        resolutionFieldset.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceHeight, true, 4, "3em", WebInspector.OverridesSupport.deviceSizeValidator, true, true, WebInspector.UIString("\u2013")));

        var swapButton = new WebInspector.StatusBarButton(WebInspector.UIString("Swap dimensions"), "responsive-design-icon responsive-design-icon-swap");
        swapButton.element.tabIndex = -1;
        swapButton.addEventListener("click", WebInspector.overridesSupport.swapDimensions, WebInspector.overridesSupport);
        resolutionFieldset.appendChild(swapButton.element);

        // Device pixel ratio.
        detailsElement.createChild("div", "responsive-design-suite-separator");

        var dprElement = detailsElement.createChild("div", "");
        var resolutionFieldset2 = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.emulateResolution);
        dprElement.appendChild(resolutionFieldset2);
        var dprButton = new WebInspector.StatusBarButton(WebInspector.UIString("Device pixel ratio"), "responsive-design-icon responsive-design-icon-dpr");
        dprButton.setEnabled(false);
        resolutionFieldset2.appendChild(dprButton.element);
        resolutionFieldset2.appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 4, "2.5em", WebInspector.OverridesSupport.deviceScaleFactorValidator, true, true, WebInspector.UIString("\u2013")));

        // Fit to window.
        detailsElement.createChild("div", "responsive-design-suite-separator");
        var fitToWindowElement = detailsElement.createChild("div", "");
        fieldsetElement = fitToWindowElement.createChild("fieldset");
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Fit"), WebInspector.overridesSupport.settings.deviceFitWindow, true, undefined, WebInspector.UIString("Zoom to fit available space")));
    },

    _createNetworkSection: function()
    {
        var networkSection = this._toolbarElement.createChild("div", "responsive-design-section responsive-design-section-network");

        // Bandwidth.
        var bandwidthElement = networkSection.createChild("div", "responsive-design-suite responsive-design-suite-top").createChild("div");
        var fieldsetElement = bandwidthElement.createChild("fieldset");
        var networkCheckbox = fieldsetElement.createChild("label");
        networkCheckbox.textContent = WebInspector.UIString("Network");
        fieldsetElement.appendChild(WebInspector.overridesSupport.createNetworkConditionsSelect(document));

        var separator = networkSection.createChild("div", "responsive-design-section-separator");

        // User agent.
        var userAgentElement = networkSection.createChild("div", "responsive-design-suite").createChild("div");
        fieldsetElement = userAgentElement.createChild("fieldset");
        fieldsetElement.appendChild(WebInspector.SettingsUI.createSettingInputField("UA", WebInspector.overridesSupport.settings.userAgent, false, 0, "", undefined, false, false, WebInspector.UIString("No override")));
    },

    _onToggleMediaInspectorButtonClick: function()
    {
        WebInspector.settings.showMediaQueryInspector.set(!this._toggleMediaInspectorButton.toggled);
    },

    _updateMediaQueryInspector: function()
    {
        this._toggleMediaInspectorButton.toggled = WebInspector.settings.showMediaQueryInspector.get();
        if (this._mediaInspector.isShowing() === WebInspector.settings.showMediaQueryInspector.get())
            return;
        if (this._mediaInspector.isShowing())
            this._mediaInspector.detach();
        else
            this._mediaInspector.show(this._mediaInspectorContainer);
        this.onResize();
    },

    _overridesWarningUpdated: function()
    {
        var message = WebInspector.overridesSupport.warningMessage();
        if (this._warningMessage.querySelector("span").textContent === message)
            return;
        this._warningMessage.classList.toggle("hidden", !message);
        this._warningMessage.querySelector("span").textContent = message;
        this._invalidateCache();
        this.onResize();
    },

    _showEmulationInDrawer: function()
    {
        WebInspector.overridesSupport.reveal();
    },

    __proto__: WebInspector.VBox.prototype
};
