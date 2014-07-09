// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.OverridesUI = {}

/**
 * @param {!Document} document
 * @return {!Element}
 */
WebInspector.OverridesUI.createDeviceSelect = function(document)
{
    var deviceSelectElement = document.createElement("select");

    var selectDeviceOption = new Option(WebInspector.UIString("<Select model>"), WebInspector.UIString("<Select model>"));
    selectDeviceOption.device = new WebInspector.OverridesSupport.Device("", "");
    deviceSelectElement.add(selectDeviceOption);

    addGroup(WebInspector.UIString("Devices"), WebInspector.OverridesUI._phones.concat(WebInspector.OverridesUI._tablets));
    addGroup(WebInspector.UIString("Notebooks"), WebInspector.OverridesUI._notebooks);

    /**
     * @param {string} name
     * @param {!Array.<!Array.<string>>} devices
     */
    function addGroup(name, devices)
    {
        devices = devices.slice();
        devices.sort();
        var groupElement = deviceSelectElement.createChild("optgroup");
        groupElement.label = name;
        for (var i = 0; i < devices.length; ++i) {
            var device = devices[i];
            var option = new Option(device[0], device[0]);
            option.device = new WebInspector.OverridesSupport.Device(device[2], device[1]);
            groupElement.appendChild(option);
        }
    }

    deviceSelectElement.addEventListener("change", deviceSelected, false);

    var emulatedSettingChangedMuted = false;
    WebInspector.overridesSupport.settings.emulateResolution.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.deviceWidth.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.deviceHeight.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.deviceScaleFactor.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.emulateMobile.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.emulateTouch.addChangeListener(emulatedSettingChanged);
    WebInspector.overridesSupport.settings.userAgent.addChangeListener(emulatedSettingChanged);
    emulatedSettingChanged();

    function deviceSelected()
    {
        if (deviceSelectElement.selectedIndex === 0)
            return;

        var option = deviceSelectElement.options[deviceSelectElement.selectedIndex];
        emulatedSettingChangedMuted = true;
        WebInspector.overridesSupport.emulateDevice(option.device);
        emulatedSettingChangedMuted = false;
    }

    function emulatedSettingChanged()
    {
        if (emulatedSettingChangedMuted)
            return;

        var index = 0;
        for (var i = 1; i < deviceSelectElement.options.length; ++i) {
            var option = deviceSelectElement.options[i];
            if (WebInspector.overridesSupport.isEmulatingDevice(option.device)) {
                index = i;
                break;
            }
        }
        deviceSelectElement.selectedIndex = index;
    }

    return deviceSelectElement;
}

/**
 * @param {!Document} document
 * @return {!Element}
 */
WebInspector.OverridesUI.createNetworkConditionsSelect = function(document)
{
    var networkConditionsSetting = WebInspector.overridesSupport.settings.networkConditions;
    var conditionsSelectElement = document.createElement("select");
    var presets = WebInspector.OverridesUI._networkConditionsPresets;
    for (var i = 0; i < presets.length; ++i) {
        var preset = presets[i];
        var throughput = preset.throughput | 0;
        var latency = preset.latency | 0;
        var isThrottling = (throughput > 0) || latency;
        if (!isThrottling) {
            conditionsSelectElement.add(new Option(preset.title, preset.id));
        } else {
            var throughputText = (throughput < 1024) ? WebInspector.UIString("%d Kbps", throughput) : WebInspector.UIString("%d Mbps", (throughput / 1024) | 0);
            var title = WebInspector.UIString("%s (%s %dms RTT)", preset.title, throughputText, latency);
            var option = new Option(title, preset.id);
            option.title = WebInspector.UIString("Maximum download throughput: %s.\r\nMinimum round-trip time: %dms.", throughputText, latency);
            conditionsSelectElement.add(option);
        }
    }

    settingChanged();
    networkConditionsSetting.addChangeListener(settingChanged);
    conditionsSelectElement.addEventListener("change", presetSelected, false);

    function presetSelected()
    {
        var selectedOption = conditionsSelectElement.options[conditionsSelectElement.selectedIndex];
        conditionsSelectElement.title = selectedOption.title;
        var presetId = selectedOption.value;
        var preset = presets[presets.length - 1];
        for (var i = 0; i < presets.length; ++i) {
            if (presets[i].id === presetId) {
                preset = presets[i];
                break;
            }
        }
        var kbps = 1024 / 8;
        networkConditionsSetting.removeChangeListener(settingChanged);
        networkConditionsSetting.set({throughput: preset.throughput * kbps, latency: preset.latency});
        networkConditionsSetting.addChangeListener(settingChanged);
    }

    function settingChanged()
    {
        var conditions = networkConditionsSetting.get();
        var presetIndex = presets.length - 1;
        for (var i = 0; i < presets.length; ++i) {
            if (presets[i].throughput === conditions.throughput && presets[i].latency === conditions.latency) {
                conditionsSelectElement.selectedIndex = i;
                break;
            }
        }
        conditionsSelectElement.selectedIndex = presetIndex;
        conditionsSelectElement.title = conditionsSelectElement.options[presetIndex].title;
    }

    return conditionsSelectElement;
}

//Second element is user agent value.
//Third element lists device metrics separated by 'x':
//- screen width,
//- screen height,
//- device scale factor,
//- touch (true by default if not present),
//- mobile (true by default if not present).
WebInspector.OverridesUI._phones = [
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

WebInspector.OverridesUI._tablets = [
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

WebInspector.OverridesUI._notebooks = [
 ["Notebook with touch",
  "",
  "1280x950x1x1x0"],
 ["Notebook with HiDPI screen",
  "",
  "1440x900x2x0x0"],
 ["Generic notebook",
  "",
  "1280x800x1x0x0"],
];

/** @type {!Array.<!WebInspector.OverridesSupport.NetworkConditionsPreset>} */
WebInspector.OverridesUI._networkConditionsPresets = [
    {id: "offline", title: "Offline", throughput: 0, latency: 0},
    {id: "gprs", title: "GPRS", throughput: 50, latency: 500},
    {id: "edge", title: "EDGE", throughput: 250, latency: 300},
    {id: "3g", title: "3G", throughput: 750, latency: 100},
    {id: "dsl", title: "DSL", throughput: 2 * 1024, latency: 5},
    {id: "wifi", title: "WiFi", throughput: 30 * 1024, latency: 2},
    {id: "online", title: "No throttling", throughput: WebInspector.OverridesSupport.NetworkThroughputUnlimitedValue, latency: 0}
];
