/*
 * Copyright (C) 2011 Brian Grinstead All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.Spectrum = function()
{
    /**
     * @param {!Element} parentElement
     */
    function appendSwitcherIcon(parentElement)
    {
        var icon = parentElement.createSVGChild("svg");
        icon.setAttribute("height", 16);
        icon.setAttribute("width", 16);
        var path = icon.createSVGChild("path");
        path.setAttribute("d", "M5,6 L11,6 L8,2 Z M5,10 L11,10 L8,14 Z");
        return icon;
    }

    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("elements/spectrum.css");
    this.contentElement.tabIndex = 0;

    this._colorElement = this.contentElement.createChild("div", "spectrum-color");
    this._colorDragElement = this._colorElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");
    var contrastRatioSVG = this._colorElement.createSVGChild("svg", "spectrum-contrast-container fill");
    this._contrastRatioLine = contrastRatioSVG.createSVGChild("path", "spectrum-contrast-line");

    var toolbar = new WebInspector.Toolbar(this.contentElement);
    toolbar.element.classList.add("spectrum-eye-dropper");
    this._colorPickerButton = new WebInspector.ToolbarButton(WebInspector.UIString("Toggle color picker"), "eyedropper-toolbar-item");
    this._colorPickerButton.setToggled(true);
    this._colorPickerButton.addEventListener("click", this._toggleColorPicker.bind(this, undefined));
    toolbar.appendToolbarItem(this._colorPickerButton);

    var swatchElement = this.contentElement.createChild("span", "swatch");
    this._swatchInnerElement = swatchElement.createChild("span", "swatch-inner");

    this._hueElement = this.contentElement.createChild("div", "spectrum-hue");
    this._hueSlider = this._hueElement.createChild("div", "spectrum-slider");
    this._alphaElement = this.contentElement.createChild("div", "spectrum-alpha");
    this._alphaElementBackground = this._alphaElement.createChild("div", "spectrum-alpha-background");
    this._alphaSlider = this._alphaElement.createChild("div", "spectrum-slider");

    var displaySwitcher = this.contentElement.createChild("div", "spectrum-display-switcher spectrum-switcher");
    appendSwitcherIcon(displaySwitcher);
    displaySwitcher.addEventListener("click", this._formatViewSwitch.bind(this));

    // RGBA/HSLA display.
    this._displayContainer = this.contentElement.createChild("div", "spectrum-text source-code");
    this._textValues = [];
    for (var i = 0; i < 4; ++i) {
        var inputValue = this._displayContainer.createChild("input", "spectrum-text-value");
        inputValue.maxLength = 4;
        this._textValues.push(inputValue);
        inputValue.addEventListener("keydown", this._inputChanged.bind(this), false);
        inputValue.addEventListener("input", this._inputChanged.bind(this), false);
        inputValue.addEventListener("mousewheel", this._inputChanged.bind(this), false);
    }

    this._textLabels = this._displayContainer.createChild("div", "spectrum-text-label");

    // HEX display.
    this._hexContainer = this.contentElement.createChild("div", "spectrum-text spectrum-text-hex source-code");
    this._hexValue = this._hexContainer.createChild("input", "spectrum-text-value");
    this._hexValue.maxLength = 7;
    this._hexValue.addEventListener("keydown", this._inputChanged.bind(this), false);
    this._hexValue.addEventListener("mousewheel", this._inputChanged.bind(this), false);

    var label = this._hexContainer.createChild("div", "spectrum-text-label");
    label.textContent = "HEX";

    WebInspector.installDragHandle(this._hueElement, dragStart.bind(this, positionHue.bind(this)), positionHue.bind(this), null, "default");
    WebInspector.installDragHandle(this._alphaElement, dragStart.bind(this, positionAlpha.bind(this)), positionAlpha.bind(this), null, "default");
    WebInspector.installDragHandle(this._colorElement, dragStart.bind(this, positionColor.bind(this)), positionColor.bind(this), null, "default");

    if (Runtime.experiments.isEnabled("colorPalettes")) {
        this.element.classList.add("palettes-enabled");
        /** @type {!Array.<!WebInspector.Spectrum.Palette>} */
        this._palettes = [];
        this._palettePanel = this._createPalettePanel();
        this._palettePanelShowing = false;
        this._paletteContainer = this.contentElement.createChild("div", "spectrum-palette");
        var paletteSwitcher = this.contentElement.createChild("div", "spectrum-palette-switcher spectrum-switcher");
        appendSwitcherIcon(paletteSwitcher);
        paletteSwitcher.addEventListener("click", this._togglePalettePanel.bind(this, true));
        new WebInspector.Spectrum.PaletteGenerator(this._generatedPaletteLoaded.bind(this));
    }

    /**
     * @param {function(!Event)} callback
     * @param {!Event} event
     * @return {boolean}
     * @this {WebInspector.Spectrum}
     */
    function dragStart(callback, event)
    {
        this._hueAlphaLeft = this._hueElement.totalOffsetLeft();
        this._colorOffset = this._colorElement.totalOffset();
        callback(event);
        return true;
    }

    /**
     * @param {!Event} event
     * @this {WebInspector.Spectrum}
     */
    function positionHue(event)
    {
        var hsva = this._hsv.slice();
        hsva[0] = Number.constrain(1 - (event.x - this._hueAlphaLeft) / this._hueAlphaWidth, 0, 1);
        this._innerSetColor(hsva,  "", undefined, WebInspector.Spectrum._ChangeSource.Other);
    }

    /**
     * @param {!Event} event
     * @this {WebInspector.Spectrum}
     */
    function positionAlpha(event)
    {
        var newAlpha = Math.round((event.x - this._hueAlphaLeft) / this._hueAlphaWidth * 100) / 100;
        var hsva = this._hsv.slice();
        hsva[3] = Number.constrain(newAlpha, 0, 1);
        var colorFormat = undefined;
        if (this._color().hasAlpha() && (this._colorFormat === WebInspector.Color.Format.ShortHEX || this._colorFormat === WebInspector.Color.Format.HEX || this._colorFormat === WebInspector.Color.Format.Nickname))
            colorFormat = WebInspector.Color.Format.RGB;
        this._innerSetColor(hsva, "", colorFormat, WebInspector.Spectrum._ChangeSource.Other);
    }

    /**
     * @param {!Event} event
     * @this {WebInspector.Spectrum}
     */
    function positionColor(event)
    {
        var hsva = this._hsv.slice();
        hsva[1] = Number.constrain((event.x - this._colorOffset.left) / this.dragWidth, 0, 1);
        hsva[2] = Number.constrain(1 - (event.y - this._colorOffset.top) / this.dragHeight, 0, 1);
        this._innerSetColor(hsva,  "", undefined, WebInspector.Spectrum._ChangeSource.Other);
    }
}

WebInspector.Spectrum._ChangeSource = {
    Input: "Input",
    Model: "Model",
    Other: "Other"
}

WebInspector.Spectrum.Events = {
    ColorChanged: "ColorChanged",
    SizeChanged: "SizeChanged"
};

WebInspector.Spectrum.prototype = {
    /**
     * @return {!Element}
     */
    _createPalettePanel: function()
    {
        var panel = this.contentElement.createChild("div", "palette-panel");
        var title = panel.createChild("div", "palette-title");
        title.textContent = WebInspector.UIString("Color Palettes");
        var toolbar = new WebInspector.Toolbar(panel);
        var closeButton = new WebInspector.ToolbarButton("Return to color picker", "delete-toolbar-item");
        closeButton.addEventListener("click", this._togglePalettePanel.bind(this, false));
        toolbar.appendToolbarItem(closeButton);
        return panel;
    },

    /**
     * @param {boolean} show
     */
    _togglePalettePanel: function(show)
    {
        if (this._palettePanelShowing === show)
            return;
        this._palettePanelShowing = show;
        this._palettePanel.classList.toggle("palette-panel-showing", show);
    },

    /**
     * @param {string} colorText
     * @param {number=} animationDelay
     * @return {!Element}
     */
    _createPaletteColor: function(colorText, animationDelay)
    {
        var element = createElementWithClass("div", "spectrum-palette-color");
        element.style.background = String.sprintf("linear-gradient(%s, %s), url(Images/checker.png)", colorText, colorText);
        if (animationDelay)
            element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: animationDelay, fill: "backwards" });
        WebInspector.Tooltip.install(element, colorText);
        return element;
    },

    /**
     * @param {!WebInspector.Spectrum.Palette} palette
     * @param {!Event=} event
     */
    _showPalette: function(palette, event)
    {
        this._paletteContainer.removeChildren();
        for (var i = 0; i < palette.colors.length; i++) {
            var colorElement = this._createPaletteColor(palette.colors[i], i * 100 / palette.colors.length);
            colorElement.addEventListener("click", this._paletteColorSelected.bind(this, palette.colors[i]));
            colorElement.addEventListener("mouseover", this._liveApplyStart.bind(this, palette.colors[i]));
            colorElement.addEventListener("mouseout", this._liveApplyEnd.bind(this));
            this._paletteContainer.appendChild(colorElement);
        }
        this._togglePalettePanel(false);

        var rowsNeeded = Math.max(1, Math.ceil(palette.colors.length / 8));
        var paletteColorHeight = 12;
        var paletteMargin = 12;
        this.element.style.height = (this._paletteContainer.offsetTop + paletteMargin + (paletteColorHeight + paletteMargin) * rowsNeeded) + "px";
        this.dispatchEventToListeners(WebInspector.Spectrum.Events.SizeChanged);
    },

    /**
     * @param {string} colorText
     */
    _liveApplyStart: function(colorText)
    {
        this._underlyingHSV = this._hsv;
        this._underlyingFormat = this._colorFormat;
        this._underlyingColorString = this._colorString;
        var color = WebInspector.Color.parse(colorText);
        if (!color)
            return;
        this._innerSetColor(color.hsva(), colorText, color.format(), WebInspector.Spectrum._ChangeSource.Other);
    },

    _liveApplyEnd: function()
    {
        if (!this._underlyingHSV)
            return;
        this._innerSetColor(this._underlyingHSV, this._underlyingColorString, this._underlyingFormat, WebInspector.Spectrum._ChangeSource.Other);
        delete this._underlyingHSV;
        delete this._underlyingFormat;
        delete this._underlyingColorString;
    },

    /**
     * @param {!WebInspector.Spectrum.Palette} generatedPalette
     */
    _generatedPaletteLoaded: function(generatedPalette)
    {
        this._palettes.push(generatedPalette);
        this._palettes.push(WebInspector.Spectrum.MaterialPalette);
        // TODO(samli): Load custom palettes.
        for (var palette of this._palettes)
            this._palettePanel.appendChild(this._createPreviewPaletteElement(palette));
        this._showPalette(this._palettes[0].colors.length ? this._palettes[0] : this._palettes[1]);
    },

    /**
     * @param {!WebInspector.Spectrum.Palette} palette
     * @return {!Element}
     */
    _createPreviewPaletteElement: function(palette)
    {
        var colorsPerPreviewRow = 6;
        var previewElement = createElementWithClass("div", "palette-preview");
        var titleElement = previewElement.createChild("div", "palette-preview-title");
        titleElement.textContent = palette.title;
        for (var i = 0; i < colorsPerPreviewRow && i < palette.colors.length; i++)
            previewElement.appendChild(this._createPaletteColor(palette.colors[i]));
        previewElement.addEventListener("click", this._showPalette.bind(this, palette));
        return previewElement;
    },

    /**
     * @param {string} colorText
     */
    _paletteColorSelected: function(colorText)
    {
        var color = WebInspector.Color.parse(colorText);
        if (!color)
            return;
        this._innerSetColor(color.hsva(), colorText, color.format(), WebInspector.Spectrum._ChangeSource.Other);
        delete this._underlyingHSV;
    },

    /**
     * @param {!WebInspector.Color} color
     * @param {string} colorFormat
     */
    setColor: function(color, colorFormat)
    {
        this._originalFormat = colorFormat;
        this._innerSetColor(color.hsva(), "", colorFormat, WebInspector.Spectrum._ChangeSource.Model);
    },

    /**
     * @param {!Array<number>|undefined} hsva
     * @param {string|undefined} colorString
     * @param {string|undefined} colorFormat
     * @param {string} changeSource
     */
    _innerSetColor: function(hsva, colorString, colorFormat, changeSource)
    {
        if (hsva !== undefined)
            this._hsv = hsva;
        if (colorString !== undefined)
            this._colorString = colorString;
        if (colorFormat !== undefined) {
            console.assert(colorFormat !== WebInspector.Color.Format.Original, "Spectrum's color format cannot be Original");
            if (colorFormat === WebInspector.Color.Format.RGBA)
                colorFormat = WebInspector.Color.Format.RGB;
            else if (colorFormat === WebInspector.Color.Format.HSLA)
                colorFormat = WebInspector.Color.Format.HSL;
            this._colorFormat = colorFormat;
        }

        this._updateHelperLocations();
        this._updateUI();

        if (changeSource !== WebInspector.Spectrum._ChangeSource.Input)
            this._updateInput();
        if (changeSource !== WebInspector.Spectrum._ChangeSource.Model)
            this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged, this.colorString());
    },

    /**
     * @param {!WebInspector.Color} color
     */
    setContrastColor: function(color)
    {
        this._contrastColor = color;
        this._updateUI();
    },

    /**
     * @return {!WebInspector.Color}
     */
    _color: function()
    {
        return WebInspector.Color.fromHSVA(this._hsv);
    },

    /**
     * @return {string}
     */
    colorString: function()
    {
        if (this._colorString)
            return this._colorString;
        var cf = WebInspector.Color.Format;
        var color = this._color();
        var colorString = color.asString(this._colorFormat);
        if (colorString)
            return colorString;

        if (this._colorFormat === cf.Nickname || this._colorFormat === cf.ShortHEX) {
            colorString = color.asString(cf.HEX);
            if (colorString)
                return colorString;
        }

        console.assert(color.hasAlpha());
        return this._colorFormat === cf.HSL ? /** @type {string} */(color.asString(cf.HSLA)) : /** @type {string} */(color.asString(cf.RGBA));
    },

    _updateHelperLocations: function()
    {
        var h = this._hsv[0];
        var s = this._hsv[1];
        var v = this._hsv[2];
        var alpha = this._hsv[3];

        // Where to show the little circle that displays your current selected color.
        var dragX = s * this.dragWidth;
        var dragY = this.dragHeight - (v * this.dragHeight);

        dragX = Math.max(-this._colorDragElementHeight,
                        Math.min(this.dragWidth - this._colorDragElementHeight, dragX - this._colorDragElementHeight));
        dragY = Math.max(-this._colorDragElementHeight,
                        Math.min(this.dragHeight - this._colorDragElementHeight, dragY - this._colorDragElementHeight));

        this._colorDragElement.positionAt(dragX, dragY);

        // Where to show the bar that displays your current selected hue.
        var hueSlideX = (1 - h) * this._hueAlphaWidth - this.slideHelperWidth;
        this._hueSlider.style.left = hueSlideX + "px";
        var alphaSlideX = alpha * this._hueAlphaWidth - this.slideHelperWidth;
        this._alphaSlider.style.left = alphaSlideX + "px";
    },

    _updateInput: function()
    {
        var cf = WebInspector.Color.Format;
        if (this._colorFormat === cf.HEX || this._colorFormat === cf.ShortHEX || this._colorFormat === cf.Nickname) {
            this._hexContainer.hidden = false;
            this._displayContainer.hidden = true;
            if (this._colorFormat === cf.ShortHEX && this._color().canBeShortHex())
                this._hexValue.value = this._color().asString(cf.ShortHEX);
            else
                this._hexValue.value = this._color().asString(cf.HEX);
        } else {
            // RGBA, HSLA display.
            this._hexContainer.hidden = true;
            this._displayContainer.hidden = false;
            var isRgb = this._colorFormat === cf.RGB;
            this._textLabels.textContent = isRgb ? "RGBA" : "HSLA";
            var colorValues = isRgb ? this._color().canonicalRGBA() : this._color().canonicalHSLA();
            for (var i = 0; i < 3; ++i) {
                this._textValues[i].value = colorValues[i];
                if (!isRgb && (i === 1 || i === 2))
                    this._textValues[i].value += "%";
            }
            this._textValues[3].value= Math.round(colorValues[3] * 100) / 100;
        }
    },

    /**
     * @param {number} requiredContrast
     */
    _drawContrastRatioLine: function(requiredContrast)
    {
        if (!this._contrastColor || !this.dragWidth || !this.dragHeight)
            return;

        /** const */ var width = this.dragWidth;
        /** const */ var height = this.dragHeight;
        /** const */ var dS = 0.02;
        /** const */ var epsilon = 0.01;

        var fgRGBA = [];
        WebInspector.Color.hsva2rgba(this._hsv, fgRGBA);
        var fgLuminance = WebInspector.Color.luminance(fgRGBA);
        var bgRGBA = this._contrastColor.rgba();
        var bgLuminance = WebInspector.Color.luminance(bgRGBA);
        var delta = fgLuminance < bgLuminance ? 1 : -1;

        var lastV = this._hsv[2];
        var currentSlope = 0;
        var candidateHSVA = [this._hsv[0], 0, 0, this._hsv[3]];
        var pathBuilder = [];
        var candidateRGBA = [];
        WebInspector.Color.hsva2rgba(candidateHSVA, candidateRGBA);
        var flattenedRGBA = [];
        WebInspector.Color.flattenColors(candidateRGBA, bgRGBA, flattenedRGBA);

        /**
         * Approach the desired contrast ratio by modifying the given component
         * from the given starting value.
         * @param {number} index
         * @param {number} x
         * @return {?number}
         */
        function approach(index, x)
        {
            while (0 <= x && x <= 1) {
                candidateHSVA[index] = x;
                WebInspector.Color.hsva2rgba(candidateHSVA, candidateRGBA);
                WebInspector.Color.flattenColors(candidateRGBA, bgRGBA, flattenedRGBA);
                var contrast = WebInspector.Color.calculateContrastRatio(flattenedRGBA, bgRGBA);
                var dContrast = contrast - requiredContrast;
                if (Math.abs(dContrast) < epsilon) {
                    return x;
                } else {
                    // 21 is the maximum possible value for contrast ratio:
                    // http://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html#contrast-ratiodef
                    x += delta * (dContrast / 21);
                }
            }
            return null;
        }

        for (var s = 0; s < 1 + dS; s += dS) {
            s = Math.min(1, s);
            candidateHSVA[1] = s;
            var v = lastV;
            v = lastV + currentSlope * dS;

            v = approach(2, v);
            if (v === null)
                break;

            currentSlope = (v - lastV) / dS;

            pathBuilder.push(pathBuilder.length ? "L" : "M");
            pathBuilder.push(s * width);
            pathBuilder.push((1 - v) * height);
        }

        if (s < 1 + dS) {
            s -= dS;
            delta = -delta;
            candidateHSVA[2] = 1;
            s = approach(1, s);
            if (s !== null)
                pathBuilder = pathBuilder.concat(["L", s * width, 0])
        }

        this._contrastRatioLine.setAttribute("d", pathBuilder.join(" "));
    },

    _updateUI: function()
    {
        var h = WebInspector.Color.fromHSVA([this._hsv[0], 1, 1, 1]);
        this._colorElement.style.backgroundColor = /** @type {string} */ (h.asString(WebInspector.Color.Format.RGB));
        if (Runtime.experiments.isEnabled("colorContrastRatio")) {
            // TODO(samli): Determine size of text and switch between AA/AAA ratings.
            this._drawContrastRatioLine(4.5);
        }
        this._swatchInnerElement.style.backgroundColor = /** @type {string} */ (this._color().asString(WebInspector.Color.Format.RGBA));
        // Show border if the swatch is white.
        this._swatchInnerElement.classList.toggle("swatch-inner-white", this._color().hsla()[2] > 0.9);
        this._colorDragElement.style.backgroundColor = /** @type {string} */ (this._color().asString(WebInspector.Color.Format.RGBA));
        var noAlpha = WebInspector.Color.fromHSVA(this._hsv.slice(0,3).concat(1));
        this._alphaElementBackground.style.backgroundImage = String.sprintf("linear-gradient(to right, rgba(0,0,0,0), %s)", noAlpha.asString(WebInspector.Color.Format.RGB));
    },

    _formatViewSwitch: function()
    {
        var cf = WebInspector.Color.Format;
        var format = cf.RGB;
        if (this._colorFormat === cf.RGB)
            format = cf.HSL;
        else if (this._colorFormat === cf.HSL && !this._color().hasAlpha())
            format = this._originalFormat === cf.ShortHEX ? cf.ShortHEX : cf.HEX;
        this._innerSetColor(undefined, "", format, WebInspector.Spectrum._ChangeSource.Other);
    },

    /**
     * @param {!Event} event
     */
    _inputChanged: function(event)
    {
        /**
         * @param {!Element} element
         * @return {string}
         */
        function elementValue(element)
        {
            return element.value;
        }

        var inputElement = /** @type {!Element} */(event.currentTarget);
        var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
        var pageKeyPressed = (event.keyIdentifier === "PageUp" || event.keyIdentifier === "PageDown");
        if (arrowKeyOrMouseWheelEvent || pageKeyPressed) {
            var newValue = WebInspector.createReplacementString(inputElement.value, event);
            if (newValue) {
                inputElement.value = newValue;
                inputElement.selectionStart = 0;
                inputElement.selectionEnd = newValue.length;
            }
            event.consume(true);
        }

        const cf = WebInspector.Color.Format;
        var colorString;
        if (this._colorFormat === cf.HEX || this._colorFormat === cf.ShortHEX) {
            colorString = this._hexValue.value;
        } else {
            var format = this._colorFormat === cf.RGB ? "rgba" : "hsla";
            var values = this._textValues.map(elementValue).join(",");
            colorString = String.sprintf("%s(%s)", format, values);
        }

        var color = WebInspector.Color.parse(colorString);
        if (!color)
            return;
        var hsv = color.hsva();
        if (this._colorFormat === cf.HEX || this._colorFormat === cf.ShortHEX)
            this._colorFormat = color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
        this._innerSetColor(hsv, colorString, undefined, WebInspector.Spectrum._ChangeSource.Input);
    },

    wasShown: function()
    {
        this._hueAlphaWidth = this._hueElement.offsetWidth;
        this.slideHelperWidth = this._hueSlider.offsetWidth / 2;
        this.dragWidth = this._colorElement.offsetWidth;
        this.dragHeight = this._colorElement.offsetHeight;
        this._colorDragElementHeight = this._colorDragElement.offsetHeight / 2;
        this._innerSetColor(undefined, undefined, undefined, WebInspector.Spectrum._ChangeSource.Model);
        this._toggleColorPicker(true);
        WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.EventTypes.ColorPicked, this._colorPicked, this);
    },

    willHide: function()
    {
        this._toggleColorPicker(false);
        WebInspector.targetManager.removeModelListener(WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.EventTypes.ColorPicked, this._colorPicked, this);
    },

    /**
     * @param {boolean=} enabled
     * @param {!WebInspector.Event=} event
     */
    _toggleColorPicker: function(enabled, event)
    {
        if (enabled === undefined)
            enabled = !this._colorPickerButton.toggled();
        this._colorPickerButton.setToggled(enabled);
        for (var target of WebInspector.targetManager.targets())
            target.pageAgent().setColorPickerEnabled(enabled);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _colorPicked: function(event)
    {
        var rgbColor = /** @type {!DOMAgent.RGBA} */ (event.data);
        var rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
        var color = WebInspector.Color.fromRGBA(rgba);
        this._innerSetColor(color.hsva(), "", undefined, WebInspector.Spectrum._ChangeSource.Other);
        InspectorFrontendHost.bringToFront();
    },


    __proto__: WebInspector.VBox.prototype
}

/** @typedef {{ title: string, colors: !Array.<string> }} */
WebInspector.Spectrum.Palette;

/**
 * @constructor
 * @param {function(!WebInspector.Spectrum.Palette)} callback
 */
WebInspector.Spectrum.PaletteGenerator = function(callback)
{
    this._callback = callback;
    var target = WebInspector.targetManager.mainTarget();
    if (!target)
        return;
    var cssModel = WebInspector.CSSStyleModel.fromTarget(target);
    /** @type {!Map.<string, number>} */
    this._frequencyMap = new Map();
    var stylesheetPromises = [];
    for (var stylesheet of cssModel.allStyleSheets())
        stylesheetPromises.push(new Promise(this._processStylesheet.bind(this, stylesheet)));
    Promise.all(stylesheetPromises)
        .catchException(null)
        .then(this._finish.bind(this));
}

WebInspector.Spectrum.PaletteGenerator.prototype = {
    /**
     * @param {string} a
     * @param {string} b
     * @return {number}
     */
    _frequencyComparator: function(a, b)
    {
        return this._frequencyMap.get(b) - this._frequencyMap.get(a);
    },

    _finish: function()
    {
        var colors = this._frequencyMap.keysArray();
        colors = colors.sort(this._frequencyComparator.bind(this));
        var paletteColors = [];
        var colorsPerRow = 8;
        while (paletteColors.length < colorsPerRow && colors.length) {
            var colorText = colors.shift();
            var color = WebInspector.Color.parse(colorText);
            if (!color || color.nickname() === "white" || color.nickname() === "black")
                continue;
            paletteColors.push(colorText);
        }
        this._callback({ title: "Page colors", colors: paletteColors });
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} stylesheet
     * @param {function(?)} resolve
     * @this {WebInspector.Spectrum.PaletteGenerator}
     */
    _processStylesheet: function(stylesheet, resolve)
    {
        /**
         * @param {?string} text
         * @this {WebInspector.Spectrum.PaletteGenerator}
         */
        function parseContent(text)
        {
            var regexResult = text.match(/((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/g) || [];
            for (var c of regexResult) {
                var frequency = this._frequencyMap.get(c) || 0;
                this._frequencyMap.set(c, ++frequency);
            }
            resolve(null);
        }

        stylesheet.requestContent(parseContent.bind(this));
    }
}

WebInspector.Spectrum.MaterialPalette = { title: "Material", colors: [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
    "#FF5722",
    "#795548",
    "#9E9E9E",
    "#607D8B"
]};