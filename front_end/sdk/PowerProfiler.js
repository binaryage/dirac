// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.PowerProfiler = function()
{
    WebInspector.Object.call(this);
    this._dispatcher = new WebInspector.PowerDispatcher(this);
    PowerAgent.getAccuracyLevel(this._onAccuracyLevel.bind(this));
}

WebInspector.PowerProfiler.EventTypes = {
    PowerEventRecorded: "PowerEventRecorded"
}

WebInspector.PowerProfiler.prototype = {

    startProfile: function ()
    {
        PowerAgent.start();
    },

    stopProfile: function ()
    {
        PowerAgent.end();
    },

    getAccuracyLevel: function()
    {
        return this._accuracyLevel;
    },

    _onAccuracyLevel: function(error, result) {
        this._accuracyLevel = "";
        if (error) {
            console.log("Unable to retrieve PowerProfiler accuracy level: " + error);
            return;
        }
        this._accuracyLevel = result;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {PowerAgent.Dispatcher}
 */
WebInspector.PowerDispatcher = function(profiler)
{
    this._profiler = profiler;
    InspectorBackend.registerPowerDispatcher(this);
}

WebInspector.PowerDispatcher.prototype = {
    dataAvailable: function(events)
    {
        for (var i = 0; i < events.length; ++i)
            this._profiler.dispatchEventToListeners(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded, events[i]);
    }
}

/**
 * @type {!WebInspector.PowerProfiler}
 */
WebInspector.powerProfiler;
