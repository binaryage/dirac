/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */


/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.InspectorFrontendEventSink = function() {
}

WebInspector.InspectorFrontendEventSink.prototype = {
    /**
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addEventListener: function(eventType, listener, thisObject)
    {
        if (!this.hasEventListeners(eventType))
            InspectorFrontendHost.subscribe(eventType);

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

        if (!this.hasEventListeners(eventType))
            InspectorFrontendHost.unsubscribe(eventType);
    },

    __proto__: WebInspector.Object.prototype
};