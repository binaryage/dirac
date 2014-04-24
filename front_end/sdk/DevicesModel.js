/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

var Adb = {};

/**
 * @typedef {{adbBrowserChromeVersion:!string, compatibleVersion: boolean, adbBrowserName: !string, source: !string, adbBrowserVersion: !string}}
 */
Adb.Browser;

/**
 * @typedef {{adbModel:!string, adbSerial:!string, browsers:!Array.<!Adb.Browser>, adbPortStatus:!Array.<number>, adbConnected: boolean}}
 */
Adb.Device;

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.DevicesModel = function()
{
    /** @type {!Array.<!Adb.Device>} */
    this._devices = [];
};

WebInspector.DevicesModel.Events = {
    DevicesChanged: "DevicesChanged"
};

WebInspector.DevicesModel.prototype = {
    /** @return {!Array.<!Adb.Device>} */
    getDevices: function() {
        return this._devices;
    },

    /**
     * @param {!Array.<!Adb.Device>} targets
     */
    populateRemoteDevices: function(targets)
    {
        this._devices = targets;
        this.dispatchEventToListeners(WebInspector.DevicesModel.Events.DevicesChanged, this._devices);
    },

    /**
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addEventListener: function(eventType, listener, thisObject)
    {
        if (!this.hasEventListeners(eventType) && eventType === WebInspector.DevicesModel.Events.DevicesChanged)
            InspectorFrontendHost.startRemoteDevicesListener();

        WebInspector.Object.prototype.addEventListener.call(this, eventType, listener, thisObject);
    },

    /**
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    removeEventListener: function(eventType, listener, thisObject)
    {
        WebInspector.Object.prototype.removeEventListener.call(this, eventType, listener, thisObject);
        if (!this.hasEventListeners(eventType) && eventType === WebInspector.DevicesModel.Events.DevicesChanged)
            InspectorFrontendHost.stopRemoteDevicesListener();
    },

    __proto__: WebInspector.Object.prototype
};