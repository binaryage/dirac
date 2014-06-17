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

    if (!WebInspector.overridesSupport.isInspectingDevice())
        new WebInspector.OverridesView.DeviceTab().appendAsTab(this._tabbedPane);
    new WebInspector.OverridesView.MediaTab().appendAsTab(this._tabbedPane);
    new WebInspector.OverridesView.NetworkTab().appendAsTab(this._tabbedPane);
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
 * @param {!Array.<function():boolean>=} predicates
 */
WebInspector.OverridesView.Tab = function(id, name, settings, predicates)
{
    WebInspector.VBox.call(this);
    this._id = id;
    this._name = name;
    this._settings = settings;
    this._predicates = predicates || [];
    for (var i = 0; i < settings.length; ++i)
        settings[i].addChangeListener(this.updateActiveState, this);
}

WebInspector.OverridesView.Tab.prototype = {
    /**
     * @param {!WebInspector.TabbedPane} tabbedPane
     */
    appendAsTab: function(tabbedPane)
    {
        this._tabbedPane = tabbedPane;
        tabbedPane.appendTab(this._id, this._name, this);
        this.updateActiveState();
    },

    updateActiveState: function()
    {
        if (!this._tabbedPane)
            return;
        var active = false;
        for (var i = 0; !active && i < this._settings.length; ++i)
            active = this._settings[i].get();
        for (var i = 0; !active && i < this._predicates.length; ++i)
            active = this._predicates[i]();
        this._tabbedPane.element.classList.toggle("overrides-activate-" + this._id, active);
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
    WebInspector.OverridesView.Tab.call(this, "device", WebInspector.UIString("Device"), [WebInspector.overridesSupport.settings.emulateDevice]);
    this.element.classList.add("overrides-device");

    this.element.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Device"), WebInspector.overridesSupport.settings.emulateDevice, true));
    this.element.appendChild(this._createDeviceElement());

    var footnote = this.element.createChild("p", "help-footnote");
    var footnoteLink = footnote.createChild("a");
    footnoteLink.href = "https://developers.google.com/chrome-developer-tools/docs/mobile-emulation";
    footnoteLink.target = "_blank";
    footnoteLink.createTextChild(WebInspector.UIString("More information about screen emulation"));
}

WebInspector.OverridesView.DeviceTab.prototype = {
    _createDeviceElement: function()
    {
        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.emulateDevice);
        fieldsetElement.id = "metrics-override-section";

        fieldsetElement.appendChild(WebInspector.overridesSupport.createDeviceSelect(document));

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

        rowElement = tableElement.createChild("tr");
        rowElement.title = WebInspector.UIString("Ratio between a device's physical pixels and device-independent pixels.");
        rowElement.createChild("td").appendChild(document.createTextNode(WebInspector.UIString("Device pixel ratio:")));
        rowElement.createChild("td").appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 4, "80px", WebInspector.OverridesSupport.doubleInputValidator, true));

        var viewportCheckbox = this._createSettingCheckbox(WebInspector.UIString("Emulate mobile"), WebInspector.overridesSupport.settings.emulateViewport);
        viewportCheckbox.title = WebInspector.UIString("Enable meta viewport, overlay scrollbars and default 980px body width");
        fieldsetElement.appendChild(viewportCheckbox);

        // FIXME: move text autosizing to the "misc" tab together with css media, and separate it from device emulation.
        var textAutosizingOverrideElement = this._createSettingCheckbox(WebInspector.UIString("Enable text autosizing "), WebInspector.overridesSupport.settings.deviceTextAutosizing);
        textAutosizingOverrideElement.title = WebInspector.UIString("Text autosizing is the feature that boosts font sizes on mobile devices.");
        fieldsetElement.appendChild(textAutosizingOverrideElement);

        fieldsetElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Shrink to fit"), WebInspector.overridesSupport.settings.deviceFitWindow));

        return fieldsetElement;
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.MediaTab = function()
{
    var settings = [WebInspector.overridesSupport.settings.overrideCSSMedia];
    WebInspector.OverridesView.Tab.call(this, "media", WebInspector.UIString("Media"), settings);
    this.element.classList.add("overrides-media");

    this._createMediaEmulationFragment();
}

WebInspector.OverridesView.MediaTab.prototype = {
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
WebInspector.OverridesView.NetworkTab = function()
{
    var flags = [];
    if (WebInspector.experimentsSettings.networkConditions.isEnabled())
       flags.push(WebInspector.overridesSupport.settings.emulateNetworkConditions);
    WebInspector.OverridesView.Tab.call(this, "network", WebInspector.UIString("Network"), flags, [this._isUserAgentOverrideEnabled.bind(this)]);
    this.element.classList.add("overrides-network");
    if (WebInspector.experimentsSettings.networkConditions.isEnabled()) {
        this.element.appendChild(this._createSettingCheckbox(WebInspector.UIString("Limit network throughput"), WebInspector.overridesSupport.settings.emulateNetworkConditions));
        this.element.appendChild(this._createNetworkConditionsElement());
    }
    this._createUserAgentSection();
}

WebInspector.OverridesView.NetworkTab.prototype = {
    /**
     * @return {!Element}
     */
    _createNetworkConditionsElement: function()
    {
        var fieldsetElement = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.emulateNetworkConditions);

        var networkThroughput = WebInspector.overridesSupport.createNetworkThroughputSelect(document);
        fieldsetElement.appendChild(networkThroughput);
        fieldsetElement.createChild("br");

        var networkDomains = WebInspector.SettingsUI.createSettingInputField("For domains:", WebInspector.overridesSupport.settings.networkConditionsDomains, false, 0, "", WebInspector.OverridesSupport.networkDomainsValidator, false);
        networkDomains.querySelector("input").placeholder = WebInspector.UIString("Leave empty to limit all domains");
        fieldsetElement.appendChild(networkDomains);

        return fieldsetElement;
    },

    /**
     * @return {boolean}
     */
    _isUserAgentOverrideEnabled: function()
    {
        return !!WebInspector.overridesSupport.userAgentOverride();
    },

    _onUserAgentOverrideEnabledChanged: function()
    {
        this.updateActiveState();
        var enabled =  !!WebInspector.overridesSupport.userAgentOverride();
        if (this._userAgentCheckbox.checked !== enabled)
            this._userAgentCheckbox.checked = enabled;
        this._userAgentFieldset.disabled = !enabled;
    },

    _createUserAgentSection: function()
    {
        var settings = [WebInspector.overridesSupport.settings.emulateDevice, WebInspector.settings.responsiveDesignEnabled, WebInspector.overridesSupport.settings.deviceUserAgent];
        for (var i = 0; i < settings.length; i++) {
            settings[i].addChangeListener(this._onUserAgentOverrideEnabledChanged.bind(this));
            settings[i].addChangeListener(WebInspector.overridesSupport.updateUserAgentToMatchDeviceUserAgent.bind(WebInspector.overridesSupport));
        }
        WebInspector.overridesSupport.settings.overrideUserAgent.addChangeListener(this._onUserAgentOverrideEnabledChanged.bind(this));
        WebInspector.overridesSupport.settings.userAgent.addChangeListener(this._onUserAgentOverrideEnabledChanged.bind(this));

        var label = this.element.createChild("label");
        var checkbox = label.createChild("input");
        checkbox.type = "checkbox";
        checkbox.name = WebInspector.UIString("Spoof user agent");
        label.createTextChild(WebInspector.UIString("Spoof user agent"));

        function checkboxChanged()
        {
            var enabled = checkbox.checked;
            WebInspector.overridesSupport.settings.overrideUserAgent.set(enabled);
            if (WebInspector.overridesSupport.isEmulateDeviceEnabled())
                WebInspector.overridesSupport.settings.deviceUserAgent.set(enabled ? WebInspector.overridesSupport.settings.userAgent.get() : "");
        }
        checkbox.addEventListener("change", checkboxChanged, false);

        var fieldsetElement = this.element.createChild("fieldset");
        this._createUserAgentSelectAndInput(fieldsetElement, settings.concat([WebInspector.overridesSupport.settings.userAgent]));

        this._userAgentFieldset = fieldsetElement;
        this._userAgentCheckbox = checkbox;
        this._onUserAgentOverrideEnabledChanged();
    },

    /**
     * @param {!Element} fieldsetElement
     * @param {!Array.<!WebInspector.Setting>} settings
     */
    _createUserAgentSelectAndInput: function(fieldsetElement, settings)
    {
        var userAgents = WebInspector.OverridesSupport._userAgents.concat([[WebInspector.UIString("Other"), "Other"]]);

        var userAgentSelectElement = fieldsetElement.createChild("select");
        for (var i = 0; i < userAgents.length; ++i)
            userAgentSelectElement.add(new Option(userAgents[i][0], userAgents[i][1]));
        userAgentSelectElement.selectedIndex = 0;

        fieldsetElement.createChild("br");

        var otherUserAgentElement = fieldsetElement.createChild("input");
        otherUserAgentElement.type = "text";
        otherUserAgentElement.value = otherUserAgentElement.title = WebInspector.overridesSupport.userAgentOverride();

        /**
         * @param {string} userAgent
         */
        function setUserAgentValue(userAgent)
        {
            WebInspector.overridesSupport.settings.userAgent.set(userAgent);
            if (WebInspector.overridesSupport.isEmulateDeviceEnabled())
                WebInspector.overridesSupport.settings.deviceUserAgent.set(userAgent);
        }

        function userAgentSelected()
        {
            var value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
            if (value !== "Other") {
                setUserAgentValue(value);
                otherUserAgentElement.value = value;
                otherUserAgentElement.title = value;
                otherUserAgentElement.disabled = true;
            } else {
                otherUserAgentElement.disabled = false;
                otherUserAgentElement.focus();
            }
        }

        function settingChanged()
        {
            var deviceUserAgent = WebInspector.overridesSupport.isEmulateDeviceEnabled() ? WebInspector.overridesSupport.settings.deviceUserAgent.get() : "";
            var value = deviceUserAgent || WebInspector.overridesSupport.settings.userAgent.get();
            var options = userAgentSelectElement.options;
            var selectionRestored = false;
            for (var i = 0; i < options.length; ++i) {
                if (options[i].value === value) {
                    userAgentSelectElement.selectedIndex = i;
                    selectionRestored = true;
                    break;
                }
            }

            otherUserAgentElement.disabled = selectionRestored;
            if (!selectionRestored)
                userAgentSelectElement.selectedIndex = options.length - 1;

            if (otherUserAgentElement.value !== value) {
                otherUserAgentElement.value = value;
                otherUserAgentElement.title = value;
            }
        }

        function textKeyDown(event)
        {
            if (isEnterKey(event))
                textChanged();
        }

        function textDoubleClicked()
        {
            userAgentSelectElement.selectedIndex = userAgents.length - 1;
            userAgentSelected();
        }

        function textChanged()
        {
            setUserAgentValue(otherUserAgentElement.value);
        }

        settingChanged();
        for (var i = 0; i < settings.length; i++)
            settings[i].addChangeListener(settingChanged);

        userAgentSelectElement.addEventListener("change", userAgentSelected, false);
        otherUserAgentElement.addEventListener("dblclick", textDoubleClicked, true);
        otherUserAgentElement.addEventListener("blur", textChanged, false);
        otherUserAgentElement.addEventListener("keydown", textKeyDown, false);
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
    var predicates = !WebInspector.overridesSupport.hasTouchInputs() ? [this._isTouchEnabled.bind(this)] : [];
    WebInspector.OverridesView.Tab.call(this, "sensors", WebInspector.UIString("Sensors"), settings, predicates);

    this.element.classList.add("overrides-sensors");
    this.registerRequiredCSS("accelerometer.css");
    if (!WebInspector.overridesSupport.hasTouchInputs())
        this.element.appendChild(this._createTouchCheckbox());
    this._appendGeolocationOverrideControl();
    this._apendDeviceOrientationOverrideControl();
}

WebInspector.OverridesView.SensorsTab.prototype = {
    /**
     * @return {boolean}
     */
    _isTouchEnabled: function()
    {
        return WebInspector.overridesSupport.isTouchEmulationEnabled();
    },

    _onTouchEmulationChanged: function()
    {
        this.updateActiveState();
        var enabled =  WebInspector.overridesSupport.isTouchEmulationEnabled();
        if (this._touchCheckbox.checked !== enabled)
            this._touchCheckbox.checked = enabled;
    },

    /**
     * @return {!Element}
     */
    _createTouchCheckbox: function()
    {
        var settings = [WebInspector.overridesSupport.settings.emulateDevice, WebInspector.settings.responsiveDesignEnabled, WebInspector.overridesSupport.settings.deviceTouch];
        for (var i = 0; i < settings.length; i++) {
            settings[i].addChangeListener(this._onTouchEmulationChanged.bind(this));
            settings[i].addChangeListener(WebInspector.overridesSupport.updateSensorsTouchToMatchDeviceTouch.bind(WebInspector.overridesSupport));
        }
        WebInspector.overridesSupport.settings.sensorsTouch.addChangeListener(this._onTouchEmulationChanged.bind(this));

        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = WebInspector.UIString("Emulate touch screen");
        this._touchCheckbox = input;

        var label = document.createElement("label");
        label.appendChild(input);
        label.createTextChild(WebInspector.UIString("Emulate touch screen"));

        function inputChanged()
        {
            var enabled = input.checked;
            WebInspector.overridesSupport.settings.sensorsTouch.set(enabled);
            if (WebInspector.overridesSupport.isEmulateDeviceEnabled())
                WebInspector.overridesSupport.settings.deviceTouch.set(enabled);
        }
        input.addEventListener("change", inputChanged, false);

        this._onTouchEmulationChanged();

        return label;
    },

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
