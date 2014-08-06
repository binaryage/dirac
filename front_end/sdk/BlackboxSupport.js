// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.BlackboxSupport = function()
{
}

/**
 * @param {string} url
 */
WebInspector.BlackboxSupport.blackboxURL = function(url)
{
    var regexPatterns = WebInspector.settings.skipStackFramesPattern.getAsArray();
    var name = new WebInspector.ParsedURL(url).lastPathComponent;
    var regexValue = "/" + name.escapeForRegExp() + (url.endsWith(name) ? "$" : "\\b");
    var found = false;
    for (var i = 0; i < regexPatterns.length; ++i) {
        var item = regexPatterns[i];
        if (item.pattern === regexValue) {
            item.disabled = false;
            found = true;
            break;
        }
    }
    if (!found)
        regexPatterns.push({ pattern: regexValue });
    WebInspector.settings.skipStackFramesPattern.setAsArray(regexPatterns);
}

/**
 * @param {string} url
 */
WebInspector.BlackboxSupport.unblackboxURL = function(url)
{
    var regexPatterns = WebInspector.settings.skipStackFramesPattern.getAsArray();
    for (var i = 0; i < regexPatterns.length; ++i) {
        var item = regexPatterns[i];
        if (item.disabled)
            continue;
        try {
            var regex = new RegExp(item.pattern);
            if (regex.test(url))
                item.disabled = true;
        } catch (e) {
        }
    }
    WebInspector.settings.skipStackFramesPattern.setAsArray(regexPatterns);
}

/**
 * @param {string} url
 * @return {boolean}
 */
WebInspector.BlackboxSupport.isBlackboxedURL = function(url)
{
    var regex = WebInspector.settings.skipStackFramesPattern.asRegExp();
    return (url && regex) ? regex.test(url) : false;
}
