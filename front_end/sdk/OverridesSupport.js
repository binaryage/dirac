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
 * @param {boolean} responsiveDesignAvailable
 */
WebInspector.OverridesSupport = function(responsiveDesignAvailable)
{
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._onMainFrameNavigated.bind(this), this);
    this._overrideDeviceResolution = false;
    this._emulateViewportEnabled = false;
    this._userAgent = "";
    this._pageResizer = null;
    WebInspector.targetManager.observeTargets(this);
    this._responsiveDesignAvailable = responsiveDesignAvailable;
}

WebInspector.OverridesSupport.Events = {
    OverridesWarningUpdated: "OverridesWarningUpdated",
    HasActiveOverridesChanged: "HasActiveOverridesChanged",
}

/**
 * @interface
 * @extends {WebInspector.EventTarget}
 */
WebInspector.OverridesSupport.PageResizer = function()
{
};

WebInspector.OverridesSupport.PageResizer.Events = {
    AvailableSizeChanged: "AvailableSizeChanged",  // No data.
    ResizeRequested: "ResizeRequested"  // Data is of type {!Size}.
};

WebInspector.OverridesSupport.PageResizer.prototype = {
    /**
     * Zero width and height mean default size.
     * Scale should be applied to page-scale-dependent UI bits. Zero means no scale.
     * @param {number} dipWidth
     * @param {number} dipHeight
     * @param {number} scale
     */
    update: function(dipWidth, dipHeight, scale) { },

    /**
     * Available size for the page.
     * @return {!Size}
     */
    availableDipSize: function() { }
};

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
    var width = screen.width;
    var height = screen.height;
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

/**
 * @param {string} value
 */
WebInspector.OverridesSupport.inputValidator = function(value)
{
    if (value >= 0 && value <= 10000)
        return "";
    return WebInspector.UIString("Value must be non-negative integer");
}

// Third element lists device metrics separated by 'x':
// - screen width,
// - screen height,
// - device scale factor,
WebInspector.OverridesSupport._phones = [
    ["Apple iPhone 3GS",
     "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5",
     "320x480x1"],
    ["Apple iPhone 4",
     "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5",
     "320x480x2"],
    ["Apple iPhone 5",
     "Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53",
     "320x568x2"],
    ["BlackBerry Z10",
     "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
     "384x640x2"],
    ["BlackBerry Z30",
     "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
     "360x640x2"],
    ["Google Nexus 4",
     "Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 4 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19",
     "384x640x2"],
    ["Google Nexus 5",
     "Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 5 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19",
     "360x640x3"],
    ["Google Nexus S",
     "Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; Nexus S Build/GRJ22) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "320x533x1.5"],
    ["HTC Evo, Touch HD, Desire HD, Desire",
     "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Sprint APA9292KT Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "320x533x1.5"],
    ["HTC One X, EVO LTE",
     "Mozilla/5.0 (Linux; Android 4.0.3; HTC One X Build/IML74K) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19",
     "360x640x2"],
    ["HTC Sensation, Evo 3D",
     "Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; HTC Sensation Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "360x640x1.5"],
    ["LG Optimus 2X, Optimus 3D, Optimus Black",
     "Mozilla/5.0 (Linux; U; Android 2.2; en-us; LG-P990/V08c Build/FRG83) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1 MMS/LG-Android-MMS-V1.0/1.2",
     "320x533x1.5"],
    ["LG Optimus G",
     "Mozilla/5.0 (Linux; Android 4.0; LG-E975 Build/IMM76L) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19",
     "384x640x2"],
    ["LG Optimus LTE, Optimus 4X HD",
     "Mozilla/5.0 (Linux; U; Android 2.3; en-us; LG-P930 Build/GRJ90) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "424x753x1.7"],
    ["LG Optimus One",
     "Mozilla/5.0 (Linux; U; Android 2.2.1; en-us; LG-MS690 Build/FRG83) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "213x320x1.5"],
    ["Motorola Defy, Droid, Droid X, Milestone",
     "Mozilla/5.0 (Linux; U; Android 2.0; en-us; Milestone Build/ SHOLS_U2_01.03.1) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17",
     "320x569x1.5"],
    ["Motorola Droid 3, Droid 4, Droid Razr, Atrix 4G, Atrix 2",
     "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Droid Build/FRG22D) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "540x960x1"],
    ["Motorola Droid Razr HD",
     "Mozilla/5.0 (Linux; U; Android 2.3; en-us; DROID RAZR 4G Build/6.5.1-73_DHD-11_M1-29) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "720x1280x1"],
    ["Nokia C5, C6, C7, N97, N8, X7",
     "NokiaN97/21.1.107 (SymbianOS/9.4; Series60/5.0 Mozilla/5.0; Profile/MIDP-2.1 Configuration/CLDC-1.1) AppleWebkit/525 (KHTML, like Gecko) BrowserNG/7.1.4",
     "360x640x1"],
    ["Nokia Lumia 7X0, Lumia 8XX, Lumia 900, N800, N810, N900",
     "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 820)",
     "320x533x1.5"],
    ["Samsung Galaxy Note 3",
     "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "540x960x2"],
    ["Samsung Galaxy Note II",
     "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "360x640x2"],
    ["Samsung Galaxy Note",
     "Mozilla/5.0 (Linux; U; Android 2.3; en-us; SAMSUNG-SGH-I717 Build/GINGERBREAD) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "400x640x2"],
    ["Samsung Galaxy S III, Galaxy Nexus",
     "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "360x640x2"],
    ["Samsung Galaxy S, S II, W",
     "Mozilla/5.0 (Linux; U; Android 2.1; en-us; GT-I9000 Build/ECLAIR) AppleWebKit/525.10+ (KHTML, like Gecko) Version/3.0.4 Mobile Safari/523.12.2",
     "320x533x1.5"],
    ["Samsung Galaxy S4",
     "Mozilla/5.0 (Linux; Android 4.2.2; GT-I9505 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.59 Mobile Safari/537.36",
     "360x640x3"],
    ["Sony Xperia S, Ion",
     "Mozilla/5.0 (Linux; U; Android 4.0; en-us; LT28at Build/6.1.C.1.111) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "360x640x2"],
    ["Sony Xperia Sola, U",
     "Mozilla/5.0 (Linux; U; Android 2.3; en-us; SonyEricssonST25i Build/6.0.B.1.564) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "480x854x1"],
    ["Sony Xperia Z, Z1",
     "Mozilla/5.0 (Linux; U; Android 4.2; en-us; SonyC6903 Build/14.1.G.1.518) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
     "360x640x3"],
];

WebInspector.OverridesSupport._tablets = [
    ["Amazon Kindle Fire HDX 7\u2033",
     "Mozilla/5.0 (Linux; U; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
     "1920x1200x2"],
    ["Amazon Kindle Fire HDX 8.9\u2033",
     "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
     "2560x1600x2"],
    ["Amazon Kindle Fire (First Generation)",
     "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_3; en-us; Silk/1.0.141.16-Gen4_11004310) AppleWebkit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16 Silk-Accelerated=true",
     "1024x600x1"],
    ["Apple iPad 1 / 2 / iPad Mini",
     "Mozilla/5.0 (iPad; CPU OS 4_3_5 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8L1 Safari/6533.18.5",
     "1024x768x1"],
    ["Apple iPad 3 / 4",
     "Mozilla/5.0 (iPad; CPU OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53",
     "1024x768x2"],
    ["BlackBerry PlayBook",
     "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+",
     "1024x600x1"],
    ["Google Nexus 10",
     "Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.72 Safari/537.36",
     "1280x800x2"],
    ["Google Nexus 7 2",
     "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.72 Safari/537.36",
     "960x600x2"],
    ["Google Nexus 7",
     "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.72 Safari/537.36",
     "966x604x1.325"],
    ["Motorola Xoom, Xyboard",
     "Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/525.10 (KHTML, like Gecko) Version/3.0.4 Mobile Safari/523.12.2",
     "1280x800x1"],
    ["Samsung Galaxy Tab 7.7, 8.9, 10.1",
     "Mozilla/5.0 (Linux; U; Android 2.2; en-us; SCH-I800 Build/FROYO) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "1280x800x1"],
    ["Samsung Galaxy Tab",
     "Mozilla/5.0 (Linux; U; Android 2.2; en-us; SCH-I800 Build/FROYO) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
     "1024x600x1"],
];

WebInspector.OverridesSupport.prototype = {
    /**
     * @return {boolean}
     */
    responsiveDesignAvailable: function()
    {
        return this._responsiveDesignAvailable;
    },

    /**
     * @param {?WebInspector.OverridesSupport.PageResizer} pageResizer
     */
    setPageResizer: function(pageResizer)
    {
        if (pageResizer === this._pageResizer)
            return;

        if (this._pageResizer) {
            this._pageResizer.removeEventListener(WebInspector.OverridesSupport.PageResizer.Events.AvailableSizeChanged, this._onPageResizerAvailableSizeChanged, this);
            this._pageResizer.removeEventListener(WebInspector.OverridesSupport.PageResizer.Events.ResizeRequested, this._onPageResizerResizeRequested, this);
        }
        this._pageResizer = pageResizer;
        if (this._pageResizer) {
            this._pageResizer.addEventListener(WebInspector.OverridesSupport.PageResizer.Events.AvailableSizeChanged, this._onPageResizerAvailableSizeChanged, this);
            this._pageResizer.addEventListener(WebInspector.OverridesSupport.PageResizer.Events.ResizeRequested, this._onPageResizerResizeRequested, this);
        }
        this._deviceMetricsChanged();
    },

    /**
     * @param {string} deviceMetrics
     * @param {string} userAgent
     */
    emulateDevice: function(deviceMetrics, userAgent)
    {
        var metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(deviceMetrics);
        this._deviceMetricsChangedListenerMuted = true;
        this._userAgentChangedListenerMuted = true;
        this.settings.userAgent.set(userAgent);
        this.settings.overrideDeviceResolution.set(true);
        this.settings.deviceWidth.set(metrics.width);
        this.settings.deviceHeight.set(metrics.height);
        this.settings.deviceScaleFactor.set(metrics.deviceScaleFactor);
        this.settings.deviceTextAutosizing.set(metrics.textAutosizing);
        this.settings.overrideUserAgent.set(true);
        this.settings.emulateTouchEvents.set(true);
        this.settings.emulateViewport.set(true);
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    resetEmulatedDevice: function()
    {
        this._deviceMetricsChangedListenerMuted = true;
        this._userAgentChangedListenerMuted = true;
        this.settings.overrideDeviceResolution.set(false);
        this.settings.overrideUserAgent.set(false);
        this.settings.emulateTouchEvents.set(false);
        this.settings.emulateViewport.set(false);
        delete this._deviceMetricsChangedListenerMuted;
        delete this._userAgentChangedListenerMuted;
        this._deviceMetricsChanged();
        this._userAgentChanged();
    },

    reset: function()
    {
        this.settings.overrideDeviceOrientation.set(false);
        this.settings.overrideGeolocation.set(false);
        this.settings.overrideCSSMedia.set(false);
        this.resetEmulatedDevice();
    },

    applyInitialOverrides: function()
    {
        if (!this._target) {
            this._applyInitialOverridesOnTargetAdded = true;
            return;
        }

        if (this.settings.overrideDeviceOrientation.get())
            this._deviceOrientationChanged();

        if (this.settings.overrideGeolocation.get())
            this._geolocationPositionChanged();

        if (this.settings.emulateTouchEvents.get())
            this._emulateTouchEventsChanged();

        if (this.settings.overrideCSSMedia.get())
            this._cssMediaChanged();

        if (this.settings.overrideDeviceResolution.get() || this.settings.emulateViewport.get())
            this._deviceMetricsChanged();

        if (this.settings.overrideUserAgent.get())
            this._userAgentChanged();

        this._showRulersChanged();
    },

    _userAgentChanged: function()
    {
        if (this._userAgentChangedListenerMuted)
            return;
        var userAgent = this.settings.overrideUserAgent.get() ? this.settings.userAgent.get() : "";
        NetworkAgent.setUserAgentOverride(userAgent);
        if (this._userAgent !== userAgent)
            this._updateUserAgentWarningMessage(WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering."));
        this._userAgent = userAgent;
        this.maybeHasActiveOverridesChanged();
    },

    _onPageResizerAvailableSizeChanged: function()
    {
        this._deviceMetricsChanged();
    },

    _onPageResizerResizeRequested: function(event)
    {
        var size = /** @type {!Size} */ (event.data);
        if (size.width !== this.settings.deviceWidth.get())
            this.settings.deviceWidth.set(size.width);
        if (size.height !== this.settings.deviceHeight.get())
            this.settings.deviceHeight.set(size.height);
    },

    _deviceMetricsChanged: function()
    {
        this._showRulersChanged();

        if (this._deviceMetricsChangedListenerMuted)
            return;
        var responsiveDesignAvailableAndDisabled = this._responsiveDesignAvailable && !WebInspector.settings.responsiveDesignMode.get();
        var overrideDeviceResolution = this.settings.overrideDeviceResolution.get();
        if (responsiveDesignAvailableAndDisabled || (!overrideDeviceResolution && !this.settings.emulateViewport.get())) {
            PageAgent.clearDeviceMetricsOverride(apiCallback.bind(this));
            if (this._pageResizer)
                this._pageResizer.update(0, 0, 0);
            this.maybeHasActiveOverridesChanged();
            return;
        }

        var dipWidth = overrideDeviceResolution ? this.settings.deviceWidth.get() : 0;
        var dipHeight = overrideDeviceResolution ? this.settings.deviceHeight.get() : 0;

        // Disable override without checks.
        if (this.isInspectingDevice())
            return;

        var overrideWidth = dipWidth;
        var overrideHeight = dipHeight;
        if (this._pageResizer) {
            var available = this._pageResizer.availableDipSize();
            if (available.width >= dipWidth && available.height >= dipHeight) {
                this._pageResizer.update(dipWidth, dipHeight, 0);
                // When we have enough space, no page size override is required. This will speed things up and remove lag.
                overrideWidth = 0;
                overrideHeight = 0;
            } else {
                this._pageResizer.update(Math.min(dipWidth, available.width), Math.min(dipHeight, available.height), 0);
            }
        }

        // Do not emulate resolution more often than 10Hz.
        this._setDeviceMetricsTimers = (this._setDeviceMetricsTimers || 0) + 1;
        if (overrideWidth || overrideHeight)
            setTimeout(setDeviceMetricsOverride.bind(this), 100);
        else
            setDeviceMetricsOverride.call(this);

        /**
         * @this {WebInspector.OverridesSupport}
         */
        function setDeviceMetricsOverride()
        {
            // Drop heavy intermediate commands.
            this._setDeviceMetricsTimers--;
            var isExpensive = overrideWidth || overrideHeight;
            if (isExpensive && this._setDeviceMetricsTimers) {
                var commandThreshold = 100;
                var time = window.performance.now();
                if (time - this._lastExpensivePageAgentCommandTime < commandThreshold)
                    return;
                this._lastExpensivePageAgentCommandTime = time;
            }

            PageAgent.setDeviceMetricsOverride(
                overrideWidth, overrideHeight, this.settings.deviceScaleFactor.get(),
                this.settings.emulateViewport.get(), this._pageResizer ? false : this.settings.deviceFitWindow.get(),
                this.settings.deviceTextAutosizing.get(), this._fontScaleFactor(overrideWidth || dipWidth, overrideHeight || dipHeight),
                apiCallback.bind(this));
        }

        this.maybeHasActiveOverridesChanged();

        /**
         * @param {?Protocol.Error} error
         * @this {WebInspector.OverridesSupport}
         */
        function apiCallback(error)
        {
            if (error) {
                this._updateDeviceMetricsWarningMessage(WebInspector.UIString("Screen emulation is not available on this page."));
                this._deviceMetricsOverrideAppliedForTest();
                return;
            }

            var overrideDeviceResolution = this.settings.overrideDeviceResolution.get();
            var viewportEnabled = this.settings.emulateViewport.get();
            if (this._overrideDeviceResolution !== overrideDeviceResolution || this._emulateViewportEnabled !== viewportEnabled)
                this._updateDeviceMetricsWarningMessage(WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering."));
            this._overrideDeviceResolution = overrideDeviceResolution;
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
        if (this.hasTouchInputs() && this.settings.emulateTouchEvents.get())
            return;

        var emulateTouch = this.settings.emulateTouchEvents.get();
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].domModel.emulateTouchEventObjects(emulateTouch);
        this.maybeHasActiveOverridesChanged();
    },

    _cssMediaChanged: function()
    {
        if (this.isInspectingDevice() && this.settings.overrideCSSMedia.get())
            return;

        PageAgent.setEmulatedMedia(this.settings.overrideCSSMedia.get() ? this.settings.emulatedCSSMedia.get() : "");
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].cssModel.mediaQueryResultChanged();
        this.maybeHasActiveOverridesChanged();
    },

    /**
     * @return {boolean}
     */
    showMetricsRulers: function()
    {
        var rulersInPageResizer = this._pageResizer && this.settings.overrideDeviceResolution.get();
        return WebInspector.settings.showMetricsRulers.get() && !rulersInPageResizer;
    },

    _showRulersChanged: function()
    {
        if (WebInspector.experimentsSettings.responsiveDesign.isEnabled())
            return;
        PageAgent.setShowViewportSizeOnResize(true, this.showMetricsRulers());
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
        var hasActiveOverrides =
            this.settings.overrideUserAgent.get() ||
            ((this.settings.overrideDeviceResolution.get() || this.settings.emulateViewport.get()) && !this.isInspectingDevice()) ||
            this.settings.overrideGeolocation.get() ||
            this.settings.overrideDeviceOrientation.get() ||
            (this.settings.emulateTouchEvents.get() && !this.hasTouchInputs()) ||
            (this.settings.overrideCSSMedia.get() && !this.isInspectingDevice());
        if (this._hasActiveOverrides !== hasActiveOverrides) {
            this._hasActiveOverrides = hasActiveOverrides;
            this.dispatchEventToListeners(WebInspector.OverridesSupport.Events.HasActiveOverridesChanged);
        }
    },

    _onMainFrameNavigated: function()
    {
        this._deviceMetricsChanged();
        this._updateUserAgentWarningMessage("");
        this._updateDeviceMetricsWarningMessage("");
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

        this.settings.overrideDeviceResolution = WebInspector.settings.createSetting("overrideDeviceResolution", false);
        this.settings.deviceWidth = WebInspector.settings.createSetting("deviceWidth", 800);
        this.settings.deviceHeight = WebInspector.settings.createSetting("deviceHeight", 600);
        this.settings.deviceScaleFactor = WebInspector.settings.createSetting("deviceScaleFactor", window.devicePixelRatio);
        this.settings.deviceTextAutosizing = WebInspector.settings.createSetting("deviceTextAutosizing", true);

        this.settings.deviceFitWindow = WebInspector.settings.createSetting("deviceFitWindow", true);
        this.settings.emulateViewport = WebInspector.settings.createSetting("emulateViewport", false);
        this.settings.emulateTouchEvents = WebInspector.settings.createSetting("emulateTouchEvents", false);
        this.settings.overrideGeolocation = WebInspector.settings.createSetting("overrideGeolocation", false);
        this.settings.geolocationOverride = WebInspector.settings.createSetting("geolocationOverride", "");
        this.settings.overrideDeviceOrientation = WebInspector.settings.createSetting("overrideDeviceOrientation", false);
        this.settings.deviceOrientationOverride = WebInspector.settings.createSetting("deviceOrientationOverride", "");
        this.settings.overrideCSSMedia = WebInspector.settings.createSetting("overrideCSSMedia", false);
        this.settings.emulatedCSSMedia = WebInspector.settings.createSetting("emulatedCSSMedia", "print");
        this.settings.emulatedDevice = WebInspector.settings.createSetting("emulatedDevice", "Google Nexus 5");

        this.maybeHasActiveOverridesChanged();

        this.settings.overrideUserAgent.addChangeListener(this._userAgentChanged, this);
        this.settings.userAgent.addChangeListener(this._userAgentChanged, this);

        this.settings.overrideDeviceResolution.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceWidth.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceHeight.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceScaleFactor.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceTextAutosizing.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.emulateViewport.addChangeListener(this._deviceMetricsChanged, this);
        this.settings.deviceFitWindow.addChangeListener(this._deviceMetricsChanged, this);

        this.settings.overrideGeolocation.addChangeListener(this._geolocationPositionChanged, this);
        this.settings.geolocationOverride.addChangeListener(this._geolocationPositionChanged, this);

        this.settings.overrideDeviceOrientation.addChangeListener(this._deviceOrientationChanged, this);
        this.settings.deviceOrientationOverride.addChangeListener(this._deviceOrientationChanged, this);

        this.settings.emulateTouchEvents.addChangeListener(this._emulateTouchEventsChanged, this);

        this.settings.overrideCSSMedia.addChangeListener(this._cssMediaChanged, this);
        this.settings.emulatedCSSMedia.addChangeListener(this._cssMediaChanged, this);

        WebInspector.settings.showMetricsRulers.addChangeListener(this._showRulersChanged, this);

        if (this._applyInitialOverridesOnTargetAdded) {
            delete this._applyInitialOverridesOnTargetAdded;
            this.applyInitialOverrides();
        }
    },

    swapDimensions: function()
    {
        var width = WebInspector.overridesSupport.settings.deviceWidth.get();
        var height = WebInspector.overridesSupport.settings.deviceHeight.get();
        WebInspector.overridesSupport.settings.deviceWidth.set(height);
        WebInspector.overridesSupport.settings.deviceHeight.set(width);
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

    /**
     * Compute the font scale factor.
     *
     * Chromium on Android uses a device scale adjustment for fonts used in text autosizing for
     * improved legibility. This function computes this adjusted value for text autosizing.
     *
     * For a description of the Android device scale adjustment algorithm, see:
     *     chrome/browser/chrome_content_browser_client.cc, GetFontScaleMultiplier(...)
     *
     * @param {number} width
     * @param {number} height
     * @return {number} font scale factor.
     */
    _fontScaleFactor: function(width, height)
    {
        if (!this.settings.overrideDeviceResolution.get())
            return 1;
        if (!width && !height)
            return 1;

        var deviceScaleFactor = this.settings.deviceScaleFactor.get();

        var minWidth = Math.min(width, height) / deviceScaleFactor;

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
    },

    /**
     * @param {!Document} document
     * @return {!Element}
     */
    createDeviceSelect: function(document)
    {
        var deviceSelectElement = document.createElement("select");
        deviceSelectElement.disabled = WebInspector.overridesSupport.isInspectingDevice();

        var devices = WebInspector.OverridesSupport._phones.concat(WebInspector.OverridesSupport._tablets);
        devices.sort();
        for (var i = 0; i < devices.length; ++i) {
            var device = devices[i];
            var option = new Option(device[0], device[0]);
            option.userAgent = device[1];
            option.metrics = device[2];
            deviceSelectElement.add(option);
        }

        settingChanged();
        WebInspector.overridesSupport.settings.emulatedDevice.addChangeListener(settingChanged);
        deviceSelectElement.addEventListener("change", deviceSelected, false);

        function deviceSelected()
        {
            var option = deviceSelectElement.options[deviceSelectElement.selectedIndex];
            WebInspector.overridesSupport.settings.emulatedDevice.removeChangeListener(settingChanged);
            WebInspector.overridesSupport.settings.emulatedDevice.set(option.value);
            WebInspector.overridesSupport.settings.emulatedDevice.addChangeListener(settingChanged);
        }

        function settingChanged()
        {
            var selectionRestored = false;
            for (var i = 0; i < devices.length; ++i) {
                var device = devices[i];
                if (WebInspector.overridesSupport.settings.emulatedDevice.get() === device[0]) {
                    deviceSelectElement.selectedIndex = i;
                    selectionRestored = true;
                    break;
                }
            }

            if (!selectionRestored)
                deviceSelectElement.selectedIndex = devices.length - 1;
        }

        return deviceSelectElement;
    },

    __proto__: WebInspector.Object.prototype
}


/**
 * @type {!WebInspector.OverridesSupport}
 */
WebInspector.overridesSupport;
