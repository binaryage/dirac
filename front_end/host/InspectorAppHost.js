// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
function InspectorAppHostAPI()
{
}

InspectorAppHostAPI.prototype = {
    /**
     * @param {!Window} window
     */
    inspectorAppWindowLoaded: function(window) { },

    beforeInspectorAppLoad: function() { },

    afterInspectorAppLoad: function() { }
}

/**
 * @type {!InspectorAppHostAPI}
 */
var InspectorAppHost;

/**
 * @suppressGlobalPropertiesCheck
 */
(function()
{
    if (window.parent !== window) {
        InspectorAppHost = window.parent.InspectorAppHost;
        InspectorAppHost.inspectorAppWindowLoaded(window);
    }
})();
