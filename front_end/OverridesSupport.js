/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 */
WebInspector.OverridesSupport = function()
{
    this._updateAllOverrides();

    WebInspector.settings.overrideUserAgent.addChangeListener(this._userAgentChanged, this);
    WebInspector.settings.userAgent.addChangeListener(this._userAgentChanged, this);

    WebInspector.settings.overrideDeviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
    WebInspector.settings.deviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
    WebInspector.settings.deviceFitWindow.addChangeListener(this._deviceMetricsChanged, this);

    WebInspector.settings.overrideGeolocation.addChangeListener(this._geolocationPositionChanged, this);
    WebInspector.settings.geolocationOverride.addChangeListener(this._geolocationPositionChanged, this);

    WebInspector.settings.overrideDeviceOrientation.addChangeListener(this._deviceOrientationChanged, this);
    WebInspector.settings.deviceOrientationOverride.addChangeListener(this._deviceOrientationChanged, this);

    WebInspector.settings.emulateTouchEvents.addChangeListener(this._emulateTouchEventsChanged, this);

    WebInspector.settings.overrideCSSMedia.addChangeListener(this._cssMediaChanged, this);
    WebInspector.settings.emulatedCSSMedia.addChangeListener(this._cssMediaChanged, this);
}

/**
 * @constructor
 * @param {number} width
 * @param {number} height
 * @param {number} deviceScaleFactor
 * @param {boolean} textAutosizing
 */
WebInspector.OverridesSupport.DeviceMetrics = function(width, height, deviceScaleFactor, textAutosizing)
{
    this.width = width;
    this.height = height;
    this.deviceScaleFactor = deviceScaleFactor;
    this.textAutosizing = textAutosizing;
}

/**
 * @return {WebInspector.OverridesSupport.DeviceMetrics}
 */
WebInspector.OverridesSupport.DeviceMetrics.parseSetting = function(value)
{
    var width = 0;
    var height = 0;
    var deviceScaleFactor = 1;
    var textAutosizing = false;
    if (value) {
        var splitMetrics = value.split("x");
        if (splitMetrics.length === 4) {
            width = parseInt(splitMetrics[0], 10);
            height = parseInt(splitMetrics[1], 10);
            deviceScaleFactor = parseFloat(splitMetrics[2]);
            textAutosizing = splitMetrics[3] == 1;
        }
    }
    return new WebInspector.OverridesSupport.DeviceMetrics(width, height, deviceScaleFactor, textAutosizing);
}

/**
 * @return {?WebInspector.OverridesSupport.DeviceMetrics}
 */
WebInspector.OverridesSupport.DeviceMetrics.parseUserInput = function(widthString, heightString, deviceScaleFactorString, textAutosizing)
{
    function isUserInputValid(value, isInteger)
    {
        if (!value)
            return true;
        return isInteger ? /^[0]*[1-9][\d]*$/.test(value) : /^[0]*([1-9][\d]*(\.\d+)?|\.\d+)$/.test(value);
    }

    if (!widthString ^ !heightString)
        return null;

    var isWidthValid = isUserInputValid(widthString, true);
    var isHeightValid = isUserInputValid(heightString, true);
    var isDeviceScaleFactorValid = isUserInputValid(deviceScaleFactorString, false);

    if (!isWidthValid && !isHeightValid && !isDeviceScaleFactorValid)
        return null;

    var width = isWidthValid ? parseInt(widthString || "0", 10) : -1;
    var height = isHeightValid ? parseInt(heightString || "0", 10) : -1;
    var deviceScaleFactor = isDeviceScaleFactorValid ? parseFloat(deviceScaleFactorString) : -1;

    return new WebInspector.OverridesSupport.DeviceMetrics(width, height, deviceScaleFactor, textAutosizing);
}

WebInspector.OverridesSupport.DeviceMetrics.prototype = {
    /**
     * @return {boolean}
     */
    isValid: function()
    {
        return this.isWidthValid() && this.isHeightValid() && this.isDeviceScaleFactorValid();
    },

    /**
     * @return {boolean}
     */
    isWidthValid: function()
    {
        return this.width >= 0;
    },

    /**
     * @return {boolean}
     */
    isHeightValid: function()
    {
        return this.height >= 0;
    },

    /**
     * @return {boolean}
     */
    isDeviceScaleFactorValid: function()
    {
        return this.deviceScaleFactor > 0;
    },

    /**
     * @return {boolean}
     */
    isTextAutosizingValid: function()
    {
        return true;
    },

    /**
     * @return {string}
     */
    toSetting: function()
    {
        if (!this.isValid())
            return "";

        return this.width && this.height ? this.width + "x" + this.height + "x" + this.deviceScaleFactor + "x" + (this.textAutosizing ? "1" : "0") : "";
    },

    /**
     * @return {string}
     */
    widthToInput: function()
    {
        return this.isWidthValid() && this.width ? String(this.width) : "";
    },

    /**
     * @return {string}
     */
    heightToInput: function()
    {
        return this.isHeightValid() && this.height ? String(this.height) : "";
    },

    /**
     * @return {string}
     */
    deviceScaleFactorToInput: function()
    {
        return this.isDeviceScaleFactorValid() && this.deviceScaleFactor ? String(this.deviceScaleFactor) : "";
    }
}

/**
 * @constructor
 * @param {number} latitude
 * @param {number} longitude
 */
WebInspector.OverridesSupport.GeolocationPosition = function(latitude, longitude, error)
{
    this.latitude = latitude;
    this.longitude = longitude;
    this.error = error;
}

WebInspector.OverridesSupport.GeolocationPosition.prototype = {
    /**
     * @return {string}
     */
    toSetting: function()
    {
        return (typeof this.latitude === "number" && typeof this.longitude === "number" && typeof this.error === "string") ? this.latitude + "@" + this.longitude + ":" + this.error : "";
    }
}

/**
 * @return {WebInspector.OverridesSupport.GeolocationPosition}
 */
WebInspector.OverridesSupport.GeolocationPosition.parseSetting = function(value)
{
    if (value) {
        var splitError = value.split(":");
        if (splitError.length === 2) {
            var splitPosition = splitError[0].split("@")
            if (splitPosition.length === 2)
                return new WebInspector.OverridesSupport.GeolocationPosition(parseFloat(splitPosition[0]), parseFloat(splitPosition[1]), splitError[1]);
        }
    }
    return new WebInspector.OverridesSupport.GeolocationPosition(0, 0, "");
}

/**
 * @return {?WebInspector.OverridesSupport.GeolocationPosition}
 */
WebInspector.OverridesSupport.GeolocationPosition.parseUserInput = function(latitudeString, longitudeString, errorStatus)
{
    function isUserInputValid(value)
    {
        if (!value)
            return true;
        return /^[-]?[0-9]*[.]?[0-9]*$/.test(value);
    }

    if (!latitudeString ^ !latitudeString)
        return null;

    var isLatitudeValid = isUserInputValid(latitudeString);
    var isLongitudeValid = isUserInputValid(longitudeString);

    if (!isLatitudeValid && !isLongitudeValid)
        return null;

    var latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
    var longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;

    return new WebInspector.OverridesSupport.GeolocationPosition(latitude, longitude, errorStatus ? "PositionUnavailable" : "");
}

WebInspector.OverridesSupport.GeolocationPosition.clearGeolocationOverride = function()
{
    PageAgent.clearGeolocationOverride();
}

/**
 * @constructor
 * @param {number} alpha
 * @param {number} beta
 * @param {number} gamma
 */
WebInspector.OverridesSupport.DeviceOrientation = function(alpha, beta, gamma)
{
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
}

WebInspector.OverridesSupport.DeviceOrientation.prototype = {
    /**
     * @return {string}
     */
    toSetting: function()
    {
        return JSON.stringify(this);
    }
}

/**
 * @return {WebInspector.OverridesSupport.DeviceOrientation}
 */
WebInspector.OverridesSupport.DeviceOrientation.parseSetting = function(value)
{
    if (value) {
        var jsonObject = JSON.parse(value);
        return new WebInspector.OverridesSupport.DeviceOrientation(jsonObject.alpha, jsonObject.beta, jsonObject.gamma);
    }
    return new WebInspector.OverridesSupport.DeviceOrientation(0, 0, 0);
}

/**
 * @return {?WebInspector.OverridesSupport.DeviceOrientation}
 */
WebInspector.OverridesSupport.DeviceOrientation.parseUserInput = function(alphaString, betaString, gammaString)
{
    function isUserInputValid(value)
    {
        if (!value)
            return true;
        return /^[-]?[0-9]*[.]?[0-9]*$/.test(value);
    }

    if (!alphaString ^ !betaString ^ !gammaString)
        return null;

    var isAlphaValid = isUserInputValid(alphaString);
    var isBetaValid = isUserInputValid(betaString);
    var isGammaValid = isUserInputValid(gammaString);

    if (!isAlphaValid && !isBetaValid && !isGammaValid)
        return null;

    var alpha = isAlphaValid ? parseFloat(alphaString) : -1;
    var beta = isBetaValid ? parseFloat(betaString) : -1;
    var gamma = isGammaValid ? parseFloat(gammaString) : -1;

    return new WebInspector.OverridesSupport.DeviceOrientation(alpha, beta, gamma);
}

WebInspector.OverridesSupport.DeviceOrientation.clearDeviceOrientationOverride = function()
{
    PageAgent.clearDeviceOrientationOverride();
}

WebInspector.OverridesSupport.prototype = {
    _updateAllOverrides: function()
    {
        this._userAgentChanged();
        this._deviceMetricsChanged();
        this._deviceOrientationChanged();
        this._geolocationPositionChanged();
        this._emulateTouchEventsChanged();
        this._cssMediaChanged();
    },

    _userAgentChanged: function()
    {
        NetworkAgent.setUserAgentOverride(WebInspector.settings.overrideUserAgent.get() ? WebInspector.settings.userAgent.get() : "");
    },

    _deviceMetricsChanged: function()
    {
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(WebInspector.settings.overrideDeviceMetrics.get() ? WebInspector.settings.deviceMetrics.get() : "");
        if (metrics.isValid()) {
            var active = metrics.width > 0 && metrics.height > 0;
            var dipWidth = Math.round(metrics.width / metrics.deviceScaleFactor);
            var dipHeight = Math.round(metrics.height / metrics.deviceScaleFactor);
            PageAgent.setDeviceMetricsOverride(dipWidth, dipHeight, metrics.deviceScaleFactor, WebInspector.settings.deviceFitWindow.get(), metrics.textAutosizing);
        }
        this._revealOverridesTabIfNeeded();
    },

    _geolocationPositionChanged: function()
    {
        if (!WebInspector.settings.overrideGeolocation.get()) {
            PageAgent.clearGeolocationOverride();
            return;
        }
        var geolocation = WebInspector.OverridesSupport.GeolocationPosition.parseSetting(WebInspector.settings.geolocationOverride.get());
        if (geolocation.error)
            PageAgent.setGeolocationOverride();
        else
            PageAgent.setGeolocationOverride(geolocation.latitude, geolocation.longitude, 150);
        this._revealOverridesTabIfNeeded();
    },

    _deviceOrientationChanged: function()
    {
        if (!WebInspector.settings.overrideDeviceOrientation.get()) {
            PageAgent.clearDeviceOrientationOverride();
            return;
        }
        var deviceOrientation = WebInspector.OverridesSupport.DeviceOrientation.parseSetting(WebInspector.settings.deviceOrientationOverride.get());
        PageAgent.setDeviceOrientationOverride(deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
        this._revealOverridesTabIfNeeded();
    },

    _emulateTouchEventsChanged: function()
    {
        WebInspector.domAgent.emulateTouchEventObjects(WebInspector.settings.emulateTouchEvents.get());
    },

    _cssMediaChanged: function()
    {
        PageAgent.setEmulatedMedia(WebInspector.settings.overrideCSSMedia.get() ? WebInspector.settings.emulatedCSSMedia.get() : "");
        WebInspector.cssModel.mediaQueryResultChanged();
        this._revealOverridesTabIfNeeded();
    },

    _revealOverridesTabIfNeeded: function()
    {
        if (WebInspector.settings.overrideUserAgent.get() || WebInspector.settings.overrideDeviceMetrics.get() ||
                WebInspector.settings.overrideGeolocation.get() || WebInspector.settings.overrideDeviceOrientation.get() ||
                WebInspector.settings.emulateTouchEvents.get() || WebInspector.settings.overrideCSSMedia.get() ||
                WebInspector.settings.overrideCSSMedia.get()) {
            if (!WebInspector.settings.showEmulationViewInDrawer.get())
                WebInspector.settings.showEmulationViewInDrawer.set(true);
            WebInspector.inspectorView.showViewInDrawer("emulation");
        }
    }
}


/**
 * @type {WebInspector.OverridesSupport}
 */
WebInspector.overridesSupport;
