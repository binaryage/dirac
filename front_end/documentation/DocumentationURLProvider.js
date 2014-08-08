// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.DocumentationURLProvider = function() {}

/**
 * @const
 * @type {!Array.<!Object, string>}
 */
WebInspector.DocumentationURLProvider._Sources = [
    { source: window, url: "javascript/" },
    { source: window.Node.prototype, url: "dom/Node/" },
    { source: window.Object, url: "javascript/Object/" },
    { source: window.Math, url: "javascript/Math/" },
    { source: window.Array, url: "javascript/Array/" },
    { source: window.String, url: "javascript/String/" },
    { source: window.Date, url: "javascript/Date/" },
    { source: window.JSON, url: "javascript/JSON/" }
]

/**
 * @const
 */
WebInspector.DocumentationURLProvider._URLFormat = "http://docs.webplatform.org/w/api.php?action=query&titles=%s%s&prop=revisions&rvprop=timestamp|content&format=json"

WebInspector.DocumentationURLProvider.prototype = {
    /**
     * @param {string} searchTerm
     * @return {?string}
     */
    itemPath: function(searchTerm)
    {
        for (var i = 0; i < WebInspector.DocumentationURLProvider._Sources.length; ++i) {
            var sourceRef = WebInspector.DocumentationURLProvider._Sources[i];
            if (sourceRef.source[searchTerm] instanceof Function)
                return String.sprintf(WebInspector.DocumentationURLProvider._URLFormat, sourceRef.url, searchTerm);
        }
        return null;
    }
}
