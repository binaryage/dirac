/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @extends {WebInspector.VBox}
 */
WebInspector.OverridesView = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("overrides.css");
    this.registerRequiredCSS("helpScreen.css");
    this.element.classList.add("overrides-view");

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.shrinkableTabs = false;
    this._tabbedPane.verticalTabLayout = true;

    if (!WebInspector.overridesSupport.isInspectingDevice()) {
        if (!WebInspector.overridesSupport.responsiveDesignAvailable())
            new WebInspector.OverridesView.DeviceTab().appendAsTab(this._tabbedPane);
        new WebInspector.OverridesView.ViewportTab().appendAsTab(this._tabbedPane);
    }
    new WebInspector.OverridesView.UserAgentTab().appendAsTab(this._tabbedPane);
    new WebInspector.OverridesView.SensorsTab().appendAsTab(this._tabbedPane);

    this._lastSelectedTabSetting = WebInspector.settings.createSetting("lastSelectedEmulateTab", "device");
    this._tabbedPane.selectTab(this._lastSelectedTabSetting.get());
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    this._tabbedPane.show(this.element);

    this._warningFooter = this.element.createChild("div", "overrides-footer");
    this._overridesWarningUpdated();
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated, this._overridesWarningUpdated, this);
}

WebInspector.OverridesView.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);
    },

    _overridesWarningUpdated: function()
    {
        var message = WebInspector.overridesSupport.warningMessage();
        this._warningFooter.classList.toggle("hidden", !message);
        this._warningFooter.textContent = message;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} id
 * @param {string} name
 * @param {!Array.<!WebInspector.Setting>} settings
 */
WebInspector.OverridesView.Tab = function(id, name, settings)
{
    WebInspector.VBox.call(this);
    this._id = id;
    this._name = name;
    this._settings = settings;
    for (var i = 0; i < settings.length; ++i)
        settings[i].addChangeListener(this._updateActiveState, this);
}

WebInspector.OverridesView.Tab.prototype = {
    /**
     * @param {!WebInspector.TabbedPane} tabbedPane
     */
    appendAsTab: function(tabbedPane)
    {
        this._tabbedPane = tabbedPane;
        tabbedPane.appendTab(this._id, this._name, this);
        this._updateActiveState();
    },

    _updateActiveState: function()
    {
        var active = false;
        for (var i = 0; !active && i < this._settings.length; ++i)
            active = this._settings[i].get();
        this._tabbedPane.element.classList.toggle("overrides-activate-" + this._id, active);
        this._tabbedPane.changeTabTitle(this._id, active ? this._name + " \u2713" : this._name);
    },

    /**
     * @param {string} name
     * @param {!WebInspector.Setting} setting
     * @param {function(boolean)=} callback
     */
    _createSettingCheckbox: function(name, setting, callback)
    {
        var checkbox = WebInspector.SettingsUI.createSettingCheckbox(name, setting, true);

        function changeListener(value)
        {
            callback(setting.get());
        }

        if (callback)
            setting.addChangeListener(changeListener);

        return checkbox;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.DeviceTab = function()
{
    WebInspector.OverridesView.Tab.call(this, "device", WebInspector.UIString("Device"), []);
    this.element.classList.add("overrides-device");

    this._deviceSelectElement = WebInspector.overridesSupport.createDeviceSelect(document);
    this._deviceSelectElement.addEventListener("change", this._updateValueLabels.bind(this), false);
    this._deviceSelectElement.addEventListener("keypress", this._keyPressed.bind(this), false);
    this.element.appendChild(this._deviceSelectElement);

    var buttonsBar = this.element.createChild("div");
    var emulateButton = buttonsBar.createChild("button", "settings-tab-text-button");
    emulateButton.textContent = WebInspector.UIString("Emulate");
    emulateButton.addEventListener("click", this._emulateButtonClicked.bind(this), false);
    emulateButton.disabled = WebInspector.overridesSupport.isInspectingDevice();

    var resetButton = buttonsBar.createChild("button", "settings-tab-text-button");
    resetButton.textContent = WebInspector.UIString("Reset");
    resetButton.addEventListener("click", this._resetButtonClicked.bind(this), false);
    this._resetButton = resetButton;

    this._viewportValueLabel = this.element.createChild("div", "overrides-device-value-label");
    this._viewportValueLabel.textContent = WebInspector.UIString("Viewport:");
    this._viewportValueElement = this._viewportValueLabel.createChild("span", "overrides-device-value");

    this._userAgentLabel = this.element.createChild("div", "overrides-device-value-label");
    this._userAgentLabel.textContent = WebInspector.UIString("User agent:");
    this._userAgentValueElement = this._userAgentLabel.createChild("span", "overrides-device-value");

    this._updateValueLabels();
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.HasActiveOverridesChanged, this._hasActiveOverridesChanged, this);
    this._hasActiveOverridesChanged();
}

WebInspector.OverridesView.DeviceTab.prototype = {
    /**
     * @param {?Event} e
     */
    _keyPressed: function(e)
    {
        if (e.keyCode === WebInspector.KeyboardShortcut.Keys.Enter.code)
            this._emulateButtonClicked();
    },

    _emulateButtonClicked: function()
    {
        var option = this._deviceSelectElement.options[this._deviceSelectElement.selectedIndex];
        WebInspector.overridesSupport.emulateDevice(option.metrics, option.userAgent);
    },

    _resetButtonClicked: function()
    {
        WebInspector.overridesSupport.reset();
    },

    _hasActiveOverridesChanged: function()
    {
        this._resetButton.disabled = !WebInspector.overridesSupport.hasActiveOverrides();
    },

    _updateValueLabels: function()
    {
        var option = this._deviceSelectElement.options[this._deviceSelectElement.selectedIndex];
        var metrics;
        if (option.metrics && (metrics = WebInspector.OverridesSupport.DeviceMetrics.parseSetting(option.metrics)))
            this._viewportValueElement.textContent = WebInspector.UIString("%s \xD7 %s, devicePixelRatio = %s", metrics.width, metrics.height, metrics.deviceScaleFactor);
        else
            this._viewportValueElement.textContent = "";
        this._userAgentValueElement.textContent = option.userAgent || "";
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}


/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.ViewportTab = function()
{
    var settings = [WebInspector.overridesSupport.settings.overrideCSSMedia];
    if (!WebInspector.overridesSupport.responsiveDesignAvailable())
        settings = settings.concat([WebInspector.overridesSupport.settings.overrideDeviceResolution, WebInspector.overridesSupport.settings.emulateViewport]);
    WebInspector.OverridesView.Tab.call(this, "viewport", WebInspector.UIString("Screen"), settings);
    this.element.classList.add("overrides-viewport");

    if (!WebInspector.overridesSupport.responsiveDesignAvailable()) {
        this._createDeviceMetricsElement();
        var checkbox = this._createSettingCheckbox(WebInspector.UIString("Emulate viewport"), WebInspector.overridesSupport.settings.emulateViewport);
        this.element.appendChild(checkbox);
    }
    this._createMediaEmulationFragment();

    var footnote = this.element.createChild("p", "help-footnote");
    var footnoteLink = footnote.createChild("a");
    footnoteLink.href = "https://developers.google.com/chrome-developer-tools/docs/mobile-emulation";
    footnoteLink.target = "_blank";
    footnoteLink.createTextChild(WebInspector.UIString("More information about screen emulation"));
}

WebInspector.OverridesView.ViewportTab.prototype = {
    _createDeviceMetricsElement: function()
    {
        var checkbox = this._createSettingCheckbox(WebInspector.UIString("Emulate screen"), WebInspector.overridesSupport.settings.overrideDeviceResolution);
        checkbox.firstChild.disabled = WebInspector.overridesSupport.isInspectingDevice();
        this.element.appendChild(checkbox);

        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceResolution);
        if (WebInspector.overridesSupport.isInspectingDevice())
            fieldsetElement.disabled = true;
        fieldsetElement.id = "metrics-override-section";

        var tableElement = fieldsetElement.createChild("table", "nowrap");

        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td");
        cellElement.appendChild(document.createTextNode(WebInspector.UIString("Resolution:")));
        cellElement = rowElement.createChild("td");

        var widthOverrideInput = WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "80px", WebInspector.OverridesSupport.integerInputValidator, true);
        cellElement.appendChild(widthOverrideInput);
        this._swapDimensionsElement = cellElement.createChild("button", "overrides-swap");
        this._swapDimensionsElement.appendChild(document.createTextNode(" \u21C4 ")); // RIGHTWARDS ARROW OVER LEFTWARDS ARROW.
        this._swapDimensionsElement.title = WebInspector.UIString("Swap dimensions");
        this._swapDimensionsElement.addEventListener("click", WebInspector.overridesSupport.swapDimensions.bind(WebInspector.overridesSupport), false);
        this._swapDimensionsElement.tabIndex = -1;
        var heightOverrideInput = WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceHeight, true, 4, "80px", WebInspector.OverridesSupport.integerInputValidator, true);
        cellElement.appendChild(heightOverrideInput);

        rowElement = tableElement.createChild("tr");
        cellElement = rowElement.createChild("td");
        cellElement.colSpan = 4;

        var widthRangeInput = WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "200px", undefined, true).lastChild;
        widthRangeInput.type = "range";
        widthRangeInput.min = 100;
        widthRangeInput.max = 2000;
        cellElement.appendChild(widthRangeInput);

        rowElement = tableElement.createChild("tr");
        rowElement.title = WebInspector.UIString("Ratio between a device's physical pixels and device-independent pixels.");
        rowElement.createChild("td").appendChild(document.createTextNode(WebInspector.UIString("Device pixel ratio:")));
        rowElement.createChild("td").appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 4, "80px", WebInspector.OverridesSupport.doubleInputValidator, true));

        var textAutosizingOverrideElement = this._createSettingCheckbox(WebInspector.UIString("Enable text autosizing "), WebInspector.overridesSupport.settings.deviceTextAutosizing);
        textAutosizingOverrideElement.title = WebInspector.UIString("Text autosizing is the feature that boosts font sizes on mobile devices.");
        fieldsetElement.appendChild(textAutosizingOverrideElement);

        checkbox = this._createSettingCheckbox(WebInspector.UIString("Shrink to fit"), WebInspector.overridesSupport.settings.deviceFitWindow);
        fieldsetElement.appendChild(checkbox);
        this.element.appendChild(fieldsetElement);
    },

    _createMediaEmulationFragment: function()
    {
        var checkbox = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("CSS media"), WebInspector.overridesSupport.settings.overrideCSSMedia, true);
        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideCSSMedia);
        if (WebInspector.overridesSupport.isInspectingDevice())
            fieldsetElement.disabled = true;

        var mediaSelectElement = fieldsetElement.createChild("select");
        var mediaTypes = WebInspector.CSSStyleModel.MediaTypes;
        var defaultMedia = WebInspector.overridesSupport.settings.emulatedCSSMedia.get();
        for (var i = 0; i < mediaTypes.length; ++i) {
            var mediaType = mediaTypes[i];
            if (mediaType === "all") {
                // "all" is not a device-specific media type.
                continue;
            }
            var option = document.createElement("option");
            option.text = mediaType;
            option.value = mediaType;
            mediaSelectElement.add(option);
            if (mediaType === defaultMedia)
                mediaSelectElement.selectedIndex = mediaSelectElement.options.length - 1;
        }

        mediaSelectElement.addEventListener("change", this._emulateMediaChanged.bind(this, mediaSelectElement), false);
        var fragment = document.createDocumentFragment();
        fragment.appendChild(checkbox);
        fragment.appendChild(fieldsetElement);
        this.element.appendChild(fragment);
    },

    _emulateMediaChanged: function(select)
    {
        var media = select.options[select.selectedIndex].value;
        WebInspector.overridesSupport.settings.emulatedCSSMedia.set(media);
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}


/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.UserAgentTab = function()
{
    WebInspector.OverridesView.Tab.call(this, "user-agent", WebInspector.UIString("User Agent"), [WebInspector.overridesSupport.settings.overrideUserAgent]);
    this.element.classList.add("overrides-user-agent");
    var checkbox = this._createSettingCheckbox(WebInspector.UIString("Spoof user agent"), WebInspector.overridesSupport.settings.overrideUserAgent);
    this.element.appendChild(checkbox);
    this.element.appendChild(this._createUserAgentSelectRowElement());
}

WebInspector.OverridesView.UserAgentTab._userAgents = [
    ["Android 4.0.2 \u2014 Galaxy Nexus", "Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"],
    ["Android 2.3 \u2014 Nexus S", "Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"],
    ["BlackBerry \u2014 BB10", "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+"],
    ["BlackBerry \u2014 PlayBook 2.1", "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+"],
    ["BlackBerry \u2014 9900", "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+"],
    ["Chrome 31 \u2014 Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36"],
    ["Chrome 31 \u2014 Windows", "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.16 Safari/537.36"],
    ["Chrome \u2014 Android Tablet", "Mozilla/5.0 (Linux; Android 4.1.2; Nexus 7 Build/JZ054K) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Safari/535.19"],
    ["Chrome \u2014 Android Mobile", "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19"],
    ["Firefox 14 \u2014 Android Mobile", "Mozilla/5.0 (Android; Mobile; rv:14.0) Gecko/14.0 Firefox/14.0"],
    ["Firefox 14 \u2014 Android Tablet", "Mozilla/5.0 (Android; Tablet; rv:14.0) Gecko/14.0 Firefox/14.0"],
    ["Firefox 4 \u2014 Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:2.0.1) Gecko/20100101 Firefox/4.0.1"],
    ["Firefox 4 \u2014 Windows", "Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1"],
    ["Firefox 7 \u2014 Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1"],
    ["Firefox 7 \u2014 Windows", "Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1"],
    ["Internet Explorer 10", "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)"],
    ["Internet Explorer 7", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)"],
    ["Internet Explorer 8", "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)"],
    ["Internet Explorer 9", "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"],
    ["iPad \u2014 iOS 7", "Mozilla/5.0 (iPad; CPU OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A501 Safari/9537.53"],
    ["iPad \u2014 iOS 6", "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25"],
    ["iPhone \u2014 iOS 7", "Mozilla/5.0 (iPhone; CPU iPhone OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A4449d Safari/9537.53"],
    ["iPhone \u2014 iOS 6", "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25"],
    ["MeeGo \u2014 Nokia N9", "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13"],
    ["Opera 18 \u2014 Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 OPR/18.0.1284.68"],
    ["Opera 18 \u2014 Windows", "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 OPR/18.0.1284.68"],
    ["Opera 12 \u2014 Mac", "Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16"],
    ["Opera 12 \u2014 Windows", "Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16"],
    ["Silk \u2014 Kindle Fire (Desktop view)", "Mozilla/5.0 (Linux; U; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true"],
    ["Silk \u2014 Kindle Fire (Mobile view)", "Mozilla/5.0 (Linux; U; Android 4.2.2; en-us; KFTHWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Mobile Safari/535.19 Silk-Accelerated=true"],
];

WebInspector.OverridesView.UserAgentTab.prototype = {
    /**
     * @return {!Element}
     */
    _createUserAgentSelectRowElement: function()
    {
        var userAgent = WebInspector.overridesSupport.settings.userAgent.get();
        var userAgents = WebInspector.OverridesView.UserAgentTab._userAgents.concat([[WebInspector.UIString("Other"), "Other"]]);

        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideUserAgent);

        this._selectElement = fieldsetElement.createChild("select");
        fieldsetElement.createChild("br");
        this._otherUserAgentElement = fieldsetElement.createChild("input");
        this._otherUserAgentElement.type = "text";
        this._otherUserAgentElement.value = userAgent;
        this._otherUserAgentElement.title = userAgent;

        var selectionRestored = false;
        for (var i = 0; i < userAgents.length; ++i) {
            var agent = userAgents[i];
            var option = new Option(agent[0], agent[1]);
            this._selectElement.add(option);
            if (userAgent === agent[1]) {
                this._selectElement.selectedIndex = i;
                selectionRestored = true;
            }
        }

        if (!selectionRestored) {
            if (!userAgent)
                this._selectElement.selectedIndex = 0;
            else
                this._selectElement.selectedIndex = userAgents.length - 1;
        }

        this._selectElement.addEventListener("change", this._userAgentChanged.bind(this, true), false);
        WebInspector.overridesSupport.settings.userAgent.addChangeListener(this._userAgentSettingChanged, this);

        fieldsetElement.addEventListener("dblclick", textDoubleClicked.bind(this), false);
        this._otherUserAgentElement.addEventListener("blur", textChanged.bind(this), false);

        /**
         * @this {WebInspector.OverridesView.UserAgentTab}
         */
        function textDoubleClicked()
        {
            this._selectElement.selectedIndex = userAgents.length - 1;
            this._userAgentChanged();
        }

        /**
         * @this {WebInspector.OverridesView.UserAgentTab}
         */
        function textChanged()
        {
            if (WebInspector.overridesSupport.settings.userAgent.get() !== this._otherUserAgentElement.value)
                WebInspector.overridesSupport.settings.userAgent.set(this._otherUserAgentElement.value);
        }

        return fieldsetElement;
    },

    /**
     * @param {boolean=} isUserGesture
     */
    _userAgentChanged: function(isUserGesture)
    {
        var value = this._selectElement.options[this._selectElement.selectedIndex].value;
        if (value !== "Other") {
            WebInspector.overridesSupport.settings.userAgent.set(value);
            this._otherUserAgentElement.value = value;
            this._otherUserAgentElement.title = value;
            this._otherUserAgentElement.disabled = true;
        } else {
            this._otherUserAgentElement.disabled = false;
            this._otherUserAgentElement.focus();
        }
    },

    _userAgentSettingChanged: function()
    {
        var value = WebInspector.overridesSupport.settings.userAgent.get();
        var options = this._selectElement.options;
        var foundMatch = false;
        for (var i = 0; i < options.length; ++i) {
            if (options[i].value === value) {
                if (this._selectElement.selectedIndex !== i)
                    this._selectElement.selectedIndex = i;
                foundMatch = true;
                break;
            }
        }

        this._otherUserAgentElement.disabled = foundMatch;
        if (!foundMatch)
            this._selectElement.selectedIndex = options.length - 1;

        if (this._otherUserAgentElement.value !== value) {
            this._otherUserAgentElement.value = value;
            this._otherUserAgentElement.title = value;
        }
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}


/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.SensorsTab = function()
{
    var settings = [WebInspector.overridesSupport.settings.overrideGeolocation, WebInspector.overridesSupport.settings.overrideDeviceOrientation];
    if (!WebInspector.overridesSupport.hasTouchInputs() && !WebInspector.overridesSupport.responsiveDesignAvailable())
        settings.push(WebInspector.overridesSupport.settings.emulateTouchEvents);
    WebInspector.OverridesView.Tab.call(this, "sensors", WebInspector.UIString("Sensors"), settings);

    this.element.classList.add("overrides-sensors");
    this.registerRequiredCSS("accelerometer.css");
    if (!WebInspector.overridesSupport.hasTouchInputs() && !WebInspector.overridesSupport.responsiveDesignAvailable())
        this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Emulate touch screen"), WebInspector.overridesSupport.settings.emulateTouchEvents));
    this._appendGeolocationOverrideControl();
    this._apendDeviceOrientationOverrideControl();
}

WebInspector.OverridesView.SensorsTab.prototype = {
    _appendGeolocationOverrideControl: function()
    {
        const geolocationSetting = WebInspector.overridesSupport.settings.geolocationOverride.get();
        var geolocation = WebInspector.OverridesSupport.GeolocationPosition.parseSetting(geolocationSetting);
        this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Emulate geolocation coordinates"), WebInspector.overridesSupport.settings.overrideGeolocation, this._geolocationOverrideCheckboxClicked.bind(this)));
        this.element.appendChild(this._createGeolocationOverrideElement(geolocation));
        this._geolocationOverrideCheckboxClicked(WebInspector.overridesSupport.settings.overrideGeolocation.get());
    },

    /**
     * @param {boolean} enabled
     */
    _geolocationOverrideCheckboxClicked: function(enabled)
    {
        if (enabled && !this._latitudeElement.value)
            this._latitudeElement.focus();
    },

    _applyGeolocationUserInput: function()
    {
        this._setGeolocationPosition(WebInspector.OverridesSupport.GeolocationPosition.parseUserInput(this._latitudeElement.value.trim(), this._longitudeElement.value.trim(), this._geolocationErrorElement.checked), true);
    },

    /**
     * @param {?WebInspector.OverridesSupport.GeolocationPosition} geolocation
     * @param {boolean} userInputModified
     */
    _setGeolocationPosition: function(geolocation, userInputModified)
    {
        if (!geolocation)
            return;

        if (!userInputModified) {
            this._latitudeElement.value = geolocation.latitude;
            this._longitudeElement.value = geolocation.longitude;
        }

        var value = geolocation.toSetting();
        WebInspector.overridesSupport.settings.geolocationOverride.set(value);
    },

    /**
     * @param {!WebInspector.OverridesSupport.GeolocationPosition} geolocation
     * @return {!Element}
     */
    _createGeolocationOverrideElement: function(geolocation)
    {
        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideGeolocation);
        fieldsetElement.id = "geolocation-override-section";

        var tableElement = fieldsetElement.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td");
        cellElement = rowElement.createChild("td");
        cellElement.appendChild(document.createTextNode(WebInspector.UIString("Lat = ")));
        this._latitudeElement = WebInspector.SettingsUI.createInput(cellElement, "geolocation-override-latitude", String(geolocation.latitude), this._applyGeolocationUserInput.bind(this), true);
        cellElement.appendChild(document.createTextNode(" , "));
        cellElement.appendChild(document.createTextNode(WebInspector.UIString("Lon = ")));
        this._longitudeElement = WebInspector.SettingsUI.createInput(cellElement, "geolocation-override-longitude", String(geolocation.longitude), this._applyGeolocationUserInput.bind(this), true);
        rowElement = tableElement.createChild("tr");
        cellElement = rowElement.createChild("td");
        cellElement.colSpan = 2;
        var geolocationErrorLabelElement = document.createElement("label");
        var geolocationErrorCheckboxElement = geolocationErrorLabelElement.createChild("input");
        geolocationErrorCheckboxElement.id = "geolocation-error";
        geolocationErrorCheckboxElement.type = "checkbox";
        geolocationErrorCheckboxElement.checked = !geolocation || geolocation.error;
        geolocationErrorCheckboxElement.addEventListener("click", this._applyGeolocationUserInput.bind(this), false);
        geolocationErrorLabelElement.appendChild(document.createTextNode(WebInspector.UIString("Emulate position unavailable")));
        this._geolocationErrorElement = geolocationErrorCheckboxElement;
        cellElement.appendChild(geolocationErrorLabelElement);

        return fieldsetElement;
    },

    _apendDeviceOrientationOverrideControl: function()
    {
        const deviceOrientationSetting = WebInspector.overridesSupport.settings.deviceOrientationOverride.get();
        var deviceOrientation = WebInspector.OverridesSupport.DeviceOrientation.parseSetting(deviceOrientationSetting);
        this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Accelerometer"), WebInspector.overridesSupport.settings.overrideDeviceOrientation, this._deviceOrientationOverrideCheckboxClicked.bind(this)));
        this.element.appendChild(this._createDeviceOrientationOverrideElement(deviceOrientation));
        this._deviceOrientationOverrideCheckboxClicked(WebInspector.overridesSupport.settings.overrideDeviceOrientation.get());
    },

    /**
     * @param {boolean} enabled
     */
    _deviceOrientationOverrideCheckboxClicked: function(enabled)
    {
        if (enabled && !this._alphaElement.value)
            this._alphaElement.focus();
    },

    _applyDeviceOrientationUserInput: function()
    {
        this._setDeviceOrientation(WebInspector.OverridesSupport.DeviceOrientation.parseUserInput(this._alphaElement.value.trim(), this._betaElement.value.trim(), this._gammaElement.value.trim()), WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserInput);
    },

    _resetDeviceOrientation: function()
    {
        this._setDeviceOrientation(new WebInspector.OverridesSupport.DeviceOrientation(0, 0, 0), WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.ResetButton);
    },

    /**
     * @param {?WebInspector.OverridesSupport.DeviceOrientation} deviceOrientation
     * @param {!WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource} modificationSource
     */
    _setDeviceOrientation: function(deviceOrientation, modificationSource)
    {
        if (!deviceOrientation)
            return;

        if (modificationSource != WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserInput) {
            this._alphaElement.value = deviceOrientation.alpha;
            this._betaElement.value = deviceOrientation.beta;
            this._gammaElement.value = deviceOrientation.gamma;
        }

        if (modificationSource != WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserDrag)
            this._setBoxOrientation(deviceOrientation);

        var value = deviceOrientation.toSetting();
        WebInspector.overridesSupport.settings.deviceOrientationOverride.set(value);
    },

    /**
     * @param {!Element} parentElement
     * @param {string} id
     * @param {string} label
     * @param {string} defaultText
     * @return {!Element}
     */
    _createAxisInput: function(parentElement, id, label, defaultText)
    {
        var div = parentElement.createChild("div", "accelerometer-axis-input-container");
        div.appendChild(document.createTextNode(label));
        return WebInspector.SettingsUI.createInput(div, id, defaultText, this._applyDeviceOrientationUserInput.bind(this), true);
    },

    /**
     * @param {!WebInspector.OverridesSupport.DeviceOrientation} deviceOrientation
     */
    _createDeviceOrientationOverrideElement: function(deviceOrientation)
    {
        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.overrideDeviceOrientation);
        fieldsetElement.id = "device-orientation-override-section";
        var tableElement = fieldsetElement.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td", "accelerometer-inputs-cell");

        this._alphaElement = this._createAxisInput(cellElement, "device-orientation-override-alpha", "\u03B1: ", String(deviceOrientation.alpha));
        this._betaElement = this._createAxisInput(cellElement, "device-orientation-override-beta", "\u03B2: ", String(deviceOrientation.beta));
        this._gammaElement = this._createAxisInput(cellElement, "device-orientation-override-gamma", "\u03B3: ", String(deviceOrientation.gamma));

        var resetButton = cellElement.createChild("button", "settings-tab-text-button accelerometer-reset-button");
        resetButton.textContent = WebInspector.UIString("Reset");
        resetButton.addEventListener("click", this._resetDeviceOrientation.bind(this), false);

        this._stageElement = rowElement.createChild("td","accelerometer-stage");
        this._boxElement = this._stageElement.createChild("section", "accelerometer-box");

        this._boxElement.createChild("section", "front");
        this._boxElement.createChild("section", "top");
        this._boxElement.createChild("section", "back");
        this._boxElement.createChild("section", "left");
        this._boxElement.createChild("section", "right");
        this._boxElement.createChild("section", "bottom");

        WebInspector.installDragHandle(this._stageElement, this._onBoxDragStart.bind(this), this._onBoxDrag.bind(this), this._onBoxDragEnd.bind(this), "move");
        this._setBoxOrientation(deviceOrientation);
        return fieldsetElement;
    },

    /**
     * @param {!WebInspector.OverridesSupport.DeviceOrientation} deviceOrientation
     */
    _setBoxOrientation: function(deviceOrientation)
    {
        var matrix = new WebKitCSSMatrix();
        this._boxMatrix = matrix.rotate(-deviceOrientation.beta, deviceOrientation.gamma, -deviceOrientation.alpha);
        this._boxElement.style.webkitTransform = this._boxMatrix.toString();
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _onBoxDrag: function(event)
    {
        var mouseMoveVector = this._calculateRadiusVector(event.x, event.y);
        if (!mouseMoveVector)
            return true;

        event.consume(true);
        var axis = WebInspector.Geometry.crossProduct(this._mouseDownVector, mouseMoveVector);
        axis.normalize();
        var angle = WebInspector.Geometry.calculateAngle(this._mouseDownVector, mouseMoveVector);
        var matrix = new WebKitCSSMatrix();
        var rotationMatrix = matrix.rotateAxisAngle(axis.x, axis.y, axis.z, angle);
        this._currentMatrix = rotationMatrix.multiply(this._boxMatrix)
        this._boxElement.style.webkitTransform = this._currentMatrix;
        var eulerAngles = WebInspector.Geometry.EulerAngles.fromRotationMatrix(this._currentMatrix);
        var newOrientation = new WebInspector.OverridesSupport.DeviceOrientation(-eulerAngles.alpha, -eulerAngles.beta, eulerAngles.gamma);
        this._setDeviceOrientation(newOrientation, WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource.UserDrag);
        return false;
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _onBoxDragStart: function(event)
    {
        if (!WebInspector.overridesSupport.settings.overrideDeviceOrientation.get())
            return false;

        this._mouseDownVector = this._calculateRadiusVector(event.x, event.y);

        if (!this._mouseDownVector)
            return false;

        event.consume(true);
        return true;
    },

    _onBoxDragEnd: function()
    {
        this._boxMatrix = this._currentMatrix;
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {?WebInspector.Geometry.Vector}
     */
    _calculateRadiusVector: function(x, y)
    {
        var rect = this._stageElement.getBoundingClientRect();
        var radius = Math.max(rect.width, rect.height) / 2;
        var sphereX = (x - rect.left - rect.width / 2) / radius;
        var sphereY = (y - rect.top - rect.height / 2) / radius;
        var sqrSum = sphereX * sphereX + sphereY * sphereY;
        if (sqrSum > 0.5)
            return new WebInspector.Geometry.Vector(sphereX, sphereY, 0.5 / Math.sqrt(sqrSum));

        return new WebInspector.Geometry.Vector(sphereX, sphereY, Math.sqrt(1 - sqrSum));
    },

    __proto__ : WebInspector.OverridesView.Tab.prototype
}

/** @enum {string} */
WebInspector.OverridesView.SensorsTab.DeviceOrientationModificationSource = {
    UserInput: "userInput",
    UserDrag: "userDrag",
    ResetButton: "resetButton"
}
