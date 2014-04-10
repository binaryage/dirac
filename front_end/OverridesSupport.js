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
 * @extends {WebInspector.Object}
 */
WebInspector.OverridesSupport = function()
{
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._onMainFrameNavigated.bind(this), this);
    this._deviceMetricsOverrideEnabled = false;
    this._emulateViewportEnabled = false;
    this._userAgent = "";
    this.maybeHasActiveOverridesChanged();

    WebInspector.settings.overrideUserAgent.addChangeListener(this._userAgentChanged, this);
    WebInspector.settings.userAgent.addChangeListener(this._userAgentChanged, this);

    WebInspector.settings.overrideDeviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
    WebInspector.settings.deviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
    WebInspector.settings.emulateViewport.addChangeListener(this._deviceMetricsChanged, this);
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
 * @return {boolean}
 */
WebInspector.OverridesSupport.isInspectingDevice = function()
{
    return !!WebInspector.queryParam("remoteFrontend");
}

WebInspector.OverridesSupport.Events = {
    OverridesWarningUpdated: "OverridesWarningUpdated",
    HasActiveOverridesChanged: "HasActiveOverridesChanged",
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
 * @return {!WebInspector.OverridesSupport.DeviceMetrics}
 */
WebInspector.OverridesSupport.DeviceMetrics.parseSetting = function(value)
{
    var width = 0;
    var height = 0;
    var deviceScaleFactor = 1;
    var textAutosizing = true;
    if (value) {
        var splitMetrics = value.split("x");
        if (splitMetrics.length >= 3) {
            width = parseInt(splitMetrics[0], 10);
            height = parseInt(splitMetrics[1], 10);
            deviceScaleFactor = parseFloat(splitMetrics[2]);
            if (splitMetrics.length == 4)
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
    },

    /**
     * Compute the font scale factor.
     *
     * Chromium on Android uses a device scale adjustment for fonts used in text autosizing for
     * improved legibility. This function computes this adjusted value for text autosizing.
     *
     * For a description of the Android device scale adjustment algorithm, see:
     *     chrome/browser/chrome_content_browser_client.cc, GetFontScaleMultiplier(...)
     *
     * @return {number} font scale factor.
     */
    fontScaleFactor: function()
    {
        if (this.isValid()) {
            var minWidth = Math.min(this.width, this.height) / this.deviceScaleFactor;

            var kMinFSM = 1.05;
            var kWidthForMinFSM = 320;
            var kMaxFSM = 1.3;
            var kWidthForMaxFSM = 800;

            if (minWidth <= kWidthForMinFSM)
                return kMinFSM;
            if (minWidth >= kWidthForMaxFSM)
                return kMaxFSM;

            // The font scale multiplier varies linearly between kMinFSM and kMaxFSM.
            var ratio = (minWidth - kWidthForMinFSM) / (kWidthForMaxFSM - kWidthForMinFSM);

            return ratio * (kMaxFSM - kMinFSM) + kMinFSM;
        }

        return 1;
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
 * @return {!WebInspector.OverridesSupport.GeolocationPosition}
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
    GeolocationAgent.clearGeolocationOverride();
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
 * @return {!WebInspector.OverridesSupport.DeviceOrientation}
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
    /**
     * @param {string} deviceMetrics
     * @param {string} userAgent
     */
    emulateDevice: function(deviceMetrics, userAgent)
    {
        this._deviceMetricsChangedListenerMuted = true;
        this._userAgentChangedListenerMuted = true;
        WebInspector.settings.deviceMetrics.set(deviceMetrics);
        WebInspector.settings.userAgent.set(userAgent);
        WebInspector.settings.overrideDeviceMetrics.set(true);
        WebInspector.settings.overrideUserAgent.set(true);
        WebInspector.settings.emulateTouchEvents.set(true);
        WebInspector.settings.emulateViewport.set(true);
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    reset: function()
    {
        this._deviceMetricsChangedListenerMuted = true;
        this._userAgentChangedListenerMuted = true;
        WebInspector.settings.overrideDeviceMetrics.set(false);
        WebInspector.settings.overrideUserAgent.set(false);
        WebInspector.settings.emulateTouchEvents.set(false);
        WebInspector.settings.overrideDeviceOrientation.set(false);
        WebInspector.settings.overrideGeolocation.set(false);
        WebInspector.settings.overrideCSSMedia.set(false);
        WebInspector.settings.emulateViewport.set(false);
        WebInspector.settings.deviceMetrics.set("");
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    applyInitialOverrides: function()
    {
        if (WebInspector.settings.overrideDeviceOrientation.get())
            this._deviceOrientationChanged();

        if (WebInspector.settings.overrideGeolocation.get())
            this._geolocationPositionChanged();

        if (WebInspector.settings.emulateTouchEvents.get())
            this._emulateTouchEventsChanged();

        if (WebInspector.settings.overrideCSSMedia.get())
            this._cssMediaChanged();

        if (WebInspector.settings.overrideDeviceMetrics.get())
            this._deviceMetricsChanged();

        if (WebInspector.settings.overrideUserAgent.get())
            this._userAgentChanged();
    },

    _userAgentChanged: function()
    {
        if (this._userAgentChangedListenerMuted)
            return;
        var userAgent = WebInspector.settings.overrideUserAgent.get() ? WebInspector.settings.userAgent.get() : "";
        NetworkAgent.setUserAgentOverride(userAgent);
        this._updateUserAgentWarningMessage(this._userAgent !== userAgent ? WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering.") : "");
        this._userAgent = userAgent;
        this.maybeHasActiveOverridesChanged();
    },

    _deviceMetricsChanged: function()
    {
        if (this._deviceMetricsChangedListenerMuted)
            return;
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(WebInspector.settings.overrideDeviceMetrics.get() ? WebInspector.settings.deviceMetrics.get() : "");
        if (!metrics.isValid())
            return;

        var dipWidth = Math.round(metrics.width);
        var dipHeight = Math.round(metrics.height);
        var metricsOverrideEnabled = !!(dipWidth && dipHeight);

        // Disable override without checks.
        if (metricsOverrideEnabled && WebInspector.OverridesSupport.isInspectingDevice()) {
            this._updateDeviceMetricsWarningMessage(WebInspector.UIString("Screen emulation on the device is not available."));
            return;
        }

        PageAgent.setDeviceMetricsOverride(dipWidth, dipHeight, metricsOverrideEnabled ? metrics.deviceScaleFactor : 0, WebInspector.settings.emulateViewport.get(), WebInspector.settings.deviceFitWindow.get(), metrics.textAutosizing, metrics.fontScaleFactor(), apiCallback.bind(this));
        this.maybeHasActiveOverridesChanged();

        /**
         * @param {?Protocol.Error} error
         * @this {WebInspector.OverridesSupport}
         */
        function apiCallback(error)
        {
            if (error) {
                this._updateDeviceMetricsWarningMessage(WebInspector.UIString("Screen emulation is not available on this page."));
                return;
            }

            var viewportEnabled =  WebInspector.settings.emulateViewport.get();
            this._updateDeviceMetricsWarningMessage(this._deviceMetricsOverrideEnabled !== metricsOverrideEnabled || (metricsOverrideEnabled && this._emulateViewportEnabled != viewportEnabled) ?
                WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering.") : "");
            this._deviceMetricsOverrideEnabled = metricsOverrideEnabled;
            this._emulateViewportEnabled = viewportEnabled;
            this._deviceMetricsOverrideAppliedForTest();
        }
    },

    _deviceMetricsOverrideAppliedForTest: function()
    {
        // Used for sniffing in tests.
    },

    _geolocationPositionChanged: function()
    {
        if (!WebInspector.settings.overrideGeolocation.get()) {
            GeolocationAgent.clearGeolocationOverride();
            return;
        }
        var geolocation = WebInspector.OverridesSupport.GeolocationPosition.parseSetting(WebInspector.settings.geolocationOverride.get());
        if (geolocation.error)
            GeolocationAgent.setGeolocationOverride();
        else
            GeolocationAgent.setGeolocationOverride(geolocation.latitude, geolocation.longitude, 150);
        this.maybeHasActiveOverridesChanged();
    },

    _deviceOrientationChanged: function()
    {
        if (!WebInspector.settings.overrideDeviceOrientation.get()) {
            PageAgent.clearDeviceOrientationOverride();
            return;
        }

        var deviceOrientation = WebInspector.OverridesSupport.DeviceOrientation.parseSetting(WebInspector.settings.deviceOrientationOverride.get());
        PageAgent.setDeviceOrientationOverride(deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
        this.maybeHasActiveOverridesChanged();
    },

    _emulateTouchEventsChanged: function()
    {
        if (WebInspector.OverridesSupport.isInspectingDevice() && WebInspector.settings.emulateTouchEvents.get())
            return;

        var emulateTouch = WebInspector.settings.emulateTouchEvents.get();
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].domModel.emulateTouchEventObjects(emulateTouch);
        this.maybeHasActiveOverridesChanged();
    },

    _cssMediaChanged: function()
    {
        PageAgent.setEmulatedMedia(WebInspector.settings.overrideCSSMedia.get() ? WebInspector.settings.emulatedCSSMedia.get() : "");
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].cssModel.mediaQueryResultChanged();
        this.maybeHasActiveOverridesChanged();
    },

    /**
     * @return {boolean}
     */
    hasActiveOverrides: function()
    {
        return this._hasActiveOverrides;
    },

    maybeHasActiveOverridesChanged: function()
    {
        var hasActiveOverrides = WebInspector.settings.overrideUserAgent.get() || WebInspector.settings.overrideDeviceMetrics.get() ||
            WebInspector.settings.overrideGeolocation.get() || WebInspector.settings.overrideDeviceOrientation.get() ||
            WebInspector.settings.emulateTouchEvents.get() || WebInspector.settings.overrideCSSMedia.get();
        if (this._hasActiveOverrides !== hasActiveOverrides) {
            this._hasActiveOverrides = hasActiveOverrides;
            this.dispatchEventToListeners(WebInspector.OverridesSupport.Events.HasActiveOverridesChanged);
        }
    },

    _onMainFrameNavigated: function()
    {
        this._deviceMetricsChanged();
        this._updateUserAgentWarningMessage("");
    },

    /**
     * @param {string} warningMessage
     */
    _updateDeviceMetricsWarningMessage: function(warningMessage)
    {
        this._deviceMetricsWarningMessage = warningMessage;
        this.dispatchEventToListeners(WebInspector.OverridesSupport.Events.OverridesWarningUpdated);
    },

    /**
     * @param {string} warningMessage
     */
    _updateUserAgentWarningMessage: function(warningMessage)
    {
        this._userAgentWarningMessage = warningMessage;
        this.dispatchEventToListeners(WebInspector.OverridesSupport.Events.OverridesWarningUpdated);
    },

    /**
     * @return {string}
     */
    warningMessage: function()
    {
        return this._deviceMetricsWarningMessage || this._userAgentWarningMessage || "";
    },

    __proto__: WebInspector.Object.prototype
}


/**
 * @type {!WebInspector.OverridesSupport}
 */
WebInspector.overridesSupport;
