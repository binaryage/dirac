// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.DocumentationURLProvider = function()
{
}

/**
 * @const
 * @type {!Array.<{source: !Object, url: string, name: string}>}
 */
WebInspector.DocumentationURLProvider._sources = [
    { source: window, url: "javascript/", name: "Global" },
    { source: window.Node.prototype, url: "dom/Node/", name: "Node.prototype" },
    { source: window.Node, url: "dom/Node/", name: "Node" },
    { source: window.Object.prototype, url: "javascript/Object/", name: "Object.prototype" },
    { source: window.Object, url: "javascript/Object/", name: "Object" },
    { source: window.Math, url: "javascript/Math/", name: "Math" },
    { source: window.Array.prototype, url: "javascript/Array/", name: "Array.prototype" },
    { source: window.Array, url: "javascript/Array/", name: "Array" },
    { source: window.String.prototype, url: "javascript/String/", name: "String.prototype" },
    { source: window.String, url: "javascript/String/", name: "String" },
    { source: window.Date.prototype, url: "javascript/Date/", name: "Date.prototype" },
    { source: window.Date, url: "javascript/Date/", name: "Date" },
    { source: window.JSON, url: "javascript/JSON/", name: "JSON" },
    { source: window.Number, url: "javascript/Number/", name: "Number"},
    { source: window.Number.prototype, url: "javascript/Number/", name: "Number.prototype"},
    { source: window.Error.prototype, url: "javascript/Error/", name: "Error.prototype"},
    { source: window.RegExp.prototype, url: "javascript/RegExp/", name: "RegExp.prototype"}
];

/**
 * @const
 */
WebInspector.DocumentationURLProvider._urlFormat = "http://docs.webplatform.org/w/api.php?action=query&titles=%s%s&prop=revisions&rvprop=timestamp|content&format=json"

WebInspector.DocumentationURLProvider.prototype = {
    /**
     * @param {string} searchTerm
     * @return {!Array.<{url: string, name: string}>}
     */
    itemDescriptors: function(searchTerm)
    {
        var descriptors = [];
        for (var i = 0; i < WebInspector.DocumentationURLProvider._sources.length; ++i) {
            var sourceRef = WebInspector.DocumentationURLProvider._sources[i];
            if (!sourceRef.source.hasOwnProperty(searchTerm))
                continue;
            descriptors.push(createDescriptor(searchTerm.toUpperCase() === searchTerm ? "constants" : searchTerm));
        }
        return descriptors;

        /**
         * @param {string} searchTerm
         * @return {{url: string, name: string}}
         */
        function createDescriptor(searchTerm)
        {
            return {
                url: String.sprintf(WebInspector.DocumentationURLProvider._urlFormat, sourceRef.url, searchTerm),
                name: sourceRef.name
            };
        }
    }
}
