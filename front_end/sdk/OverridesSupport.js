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
 * @implements {WebInspector.TargetManager.Observer}
 * @extends {WebInspector.Object}
 */
WebInspector.OverridesSupport = function()
{
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._onMainFrameNavigated.bind(this), this);
    this._deviceMetricsOverrideEnabled = false;
    this._emulateViewportEnabled = false;
    this._userAgent = "";

    WebInspector.targetManager.observeTargets(this);
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
        this.settings.deviceMetrics.set(deviceMetrics);
        this.settings.userAgent.set(userAgent);
        this.settings.overrideDeviceMetrics.set(true);
        this.settings.overrideUserAgent.set(true);
        this.settings.emulateTouchEvents.set(true);
        this.settings.emulateViewport.set(true);
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    reset: function()
    {
        this._deviceMetricsChangedListenerMuted = true;
        this._userAgentChangedListenerMuted = true;
        this.settings.overrideDeviceMetrics.set(false);
        this.settings.overrideUserAgent.set(false);
        this.settings.emulateTouchEvents.set(false);
        this.settings.overrideDeviceOrientation.set(false);
        this.settings.overrideGeolocation.set(false);
        this.settings.overrideCSSMedia.set(false);
        this.settings.emulateViewport.set(false);
        this.settings.deviceMetrics.set("");
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    applyInitialOverrides: function()
    {
        if (this.settings.overrideDeviceOrientation.get())
            this._deviceOrientationChanged();

        if (this.settings.overrideGeolocation.get())
            this._geolocationPositionChanged();

        if (this.settings.emulateTouchEvents.get())
            this._emulateTouchEventsChanged();

        if (this.settings.overrideCSSMedia.get())
            this._cssMediaChanged();

        if (this.settings.overrideDeviceMetrics.get())
            this._deviceMetricsChanged();

        if (this.settings.overrideUserAgent.get())
            this._userAgentChanged();
    },

    _userAgentChanged: function()
    {
        if (this._userAgentChangedListenerMuted)
            return;
        var userAgent = this.settings.overrideUserAgent.get() ? this.settings.userAgent.get() : "";
        NetworkAgent.setUserAgentOverride(userAgent);
        this._updateUserAgentWarningMessage(this._userAgent !== userAgent ? WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering.") : "");
        this._userAgent = userAgent;
        this.maybeHasActiveOverridesChanged();
    },

    _deviceMetricsChanged: function()
    {
        if (this._deviceMetricsChangedListenerMuted)
            return;
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(this.settings.overrideDeviceMetrics.get() ? this.settings.deviceMetrics.get() : "");
        if (!metrics.isValid())
            return;

        var dipWidth = Math.round(metrics.width);
        var dipHeight = Math.round(metrics.height);
        var metricsOverrideEnabled = !!(dipWidth && dipHeight);

        // Disable override without checks.
        if (metricsOverrideEnabled && this.isInspectingDevice()) {
            this._updateDeviceMetricsWarningMessage(WebInspector.UIString("Screen emulation on the device is not available."));
            return;
        }

        PageAgent.setDeviceMetricsOverride(dipWidth, dipHeight, metricsOverrideEnabled ? metrics.deviceScaleFactor : 0, this.settings.emulateViewport.get(), this.settings.deviceFitWindow.get(), metrics.textAutosizing, metrics.fontScaleFactor(), apiCallback.bind(this));
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

            var viewportEnabled =  this.settings.emulateViewport.get();
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
        if (!this.settings.overrideGeolocation.get()) {
            GeolocationAgent.clearGeolocationOverride();
            return;
        }
        var geolocation = WebInspector.OverridesSupport.GeolocationPosition.parseSetting(this.settings.geolocationOverride.get());
        if (geolocation.error)
            GeolocationAgent.setGeolocationOverride();
        else
            GeolocationAgent.setGeolocationOverride(geolocation.latitude, geolocation.longitude, 150);
        this.maybeHasActiveOverridesChanged();
    },

    _deviceOrientationChanged: function()
    {
        if (!this.settings.overrideDeviceOrientation.get()) {
            PageAgent.clearDeviceOrientationOverride();
            return;
        }

        var deviceOrientation = WebInspector.OverridesSupport.DeviceOrientation.parseSetting(this.settings.deviceOrientationOverride.get());
        PageAgent.setDeviceOrientationOverride(deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
        this.maybeHasActiveOverridesChanged();
    },

    _emulateTouchEventsChanged: function()
    {
        if (WebInspector.overridesSupport.hasTouchInputs() && this.settings.emulateTouchEvents.get())
            return;

        var emulateTouch = this.settings.emulateTouchEvents.get();
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].domModel.emulateTouchEventObjects(emulateTouch);
        this.maybeHasActiveOverridesChanged();
    },

    _cssMediaChanged: function()
    {
        PageAgent.setEmulatedMedia(this.settings.overrideCSSMedia.get() ? this.settings.emulatedCSSMedia.get() : "");
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
        var hasActiveOverrides = this.settings.overrideUserAgent.get() || this.settings.overrideDeviceMetrics.get() ||
            this.settings.overrideGeolocation.get() || this.settings.overrideDeviceOrientation.get() ||
            this.settings.emulateTouchEvents.get() || this.settings.overrideCSSMedia.get();
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

    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        // FIXME: adapt this to multiple targets.
        if (this._target)
            return;
        this._target = target;

        this.settings = {};
        this.settings.overrideUserAgent = WebInspector.settings.createSetting("overrideUserAgent", false);
        this.settings.userAgent = WebInspector.settings.createSetting("userAgent", "");
        this.settings.overrideDeviceMetrics = WebInspector.settings.createSetting("overrideDeviceMetrics", false);
        this.settings.deviceMetrics = WebInspector.settings.createSetting("deviceMetrics", "");
        this.settings.deviceFitWindow = WebInspector.settings.createSetting("deviceFitWindow", true);
        this.settings.emulateViewport = WebInspector.settings.createSetting("emulateViewport", false);
        this.settings.emulateTouchEvents = WebInspector.settings.createSetting("emulateTouchEvents", false);
        this.settings.overrideGeolocation = WebInspector.settings.createSetting("overrideGeolocation", false);
        this.settings.geolocationOverride = WebInspector.settings.createSetting("geolocationOverride", "");
        this.settings.overrideDeviceOrientation = WebInspector.settings.createSetting("overrideDeviceOrientation", false);
        this.settings.deviceOrientationOverride = WebInspector.settings.createSetting("deviceOrientationOverride", "");
        this.settings.overrideCSSMedia = WebInspector.settings.createSetting("overrideCSSMedia", false);
        this.settings.emulatedCSSMedia = WebInspector.settings.createSetting("emulatedCSSMedia", "print");

        this.maybeHasActiveOverridesChanged();

        this.settings.overrideUserAgent.addChangeListener(this._userAgentChanged, this);
        this.settings.userAgent.addChangeListener(this._userAgentChanged, this);

        this.settings.overrideDeviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceMetrics.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.emulateViewport.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceFitWindow.addChangeListener(this._deviceMetricsChanged, this);

        this.settings.overrideGeolocation.addChangeListener(this._geolocationPositionChanged, this);
        this.settings.geolocationOverride.addChangeListener(this._geolocationPositionChanged, this);

        this.settings.overrideDeviceOrientation.addChangeListener(this._deviceOrientationChanged, this);
        this.settings.deviceOrientationOverride.addChangeListener(this._deviceOrientationChanged, this);

        this.settings.emulateTouchEvents.addChangeListener(this._emulateTouchEventsChanged, this);

        this.settings.overrideCSSMedia.addChangeListener(this._cssMediaChanged, this);
        this.settings.emulatedCSSMedia.addChangeListener(this._cssMediaChanged, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        // FIXME: adapt this to multiple targets.
    },

    /**
     * @return {boolean}
     */
    isInspectingDevice: function()
    {
        return !!this._target && this._target.isMobile();
    },

    /**
     * @return {boolean}
     */
    hasTouchInputs: function()
    {
        return !!this._target && this._target.hasTouchInputs;
    },

    __proto__: WebInspector.Object.prototype
}


/**
 * @type {!WebInspector.OverridesSupport}
 */
WebInspector.overridesSupport;
