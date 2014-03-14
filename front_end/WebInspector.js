/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

window.WebInspector = {
    _queryParamsObject: {}
}

WebInspector.Events = {
    InspectorLoaded: "InspectorLoaded"
}

/**
 * @param {string} name
 * @return {?string}
 */
WebInspector.queryParam = function(name)
{
    return WebInspector._queryParamsObject.hasOwnProperty(name) ? WebInspector._queryParamsObject[name] : null;
}

{(function parseQueryParameters()
{
    var queryParams = window.location.search;
    if (!queryParams)
        return;
    var params = queryParams.substring(1).split("&");
    for (var i = 0; i < params.length; ++i) {
        var pair = params[i].split("=");
        WebInspector._queryParamsObject[pair[0]] = pair[1];
    }

    // Patch settings from the URL param (for tests).
    var settingsParam = WebInspector.queryParam("settings");
    if (settingsParam) {
        try {
            var settings = JSON.parse(window.decodeURI(settingsParam));
            for (var key in settings)
                window.localStorage[key] = settings[key];
        } catch(e) {
            // Ignore malformed settings.
        }
    }
})();}
