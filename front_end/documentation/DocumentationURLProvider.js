// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.DocumentationURLProvider = function()
{
    this._gapFromIndex = 0;
    this._gapFrom = WebInspector.DocumentationURLProvider._gapFromList[0];
    this._state = WebInspector.DocumentationURLProvider.DownloadStates.NotStarted;
    /** @type {!StringMap.<!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>>} */
    this._articleList = new StringMap();
}

/**
 * @enum {string}
 */
WebInspector.DocumentationURLProvider.DownloadStates = {
    NotStarted: "NotStarted",
    InProgress: "InProgress",
    Finished: "Finished",
    Failed: "Failed"
}

/**
 * @return {!WebInspector.DocumentationURLProvider}
 */
WebInspector.DocumentationURLProvider.instance = function()
{
    if (!WebInspector.DocumentationURLProvider._instance)
        WebInspector.DocumentationURLProvider._instance = new WebInspector.DocumentationURLProvider();
    return WebInspector.DocumentationURLProvider._instance;
}

/**
 * @constructor
 * @param {!WebInspector.DocumentationURLProvider.DocumentationSource} sourceRef
 * @param {string} searchTerm
 */
WebInspector.DocumentationURLProvider.ItemDescriptor = function(sourceRef, searchTerm)
{
    this._url = String.sprintf(WebInspector.DocumentationURLProvider._articleUrlFormat, sourceRef.url(), searchTerm);
    this._name = sourceRef.name();
    this._searchItem = searchTerm;
}

WebInspector.DocumentationURLProvider.ItemDescriptor.prototype = {
    /**
     * @return {string}
     */
    url: function()
    {
        return this._url;
    },

    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {string}
     */
    searchItem: function()
    {
        return this._searchItem;
    }
}

/**
 * @constructor
 * FIXME: source parameter is not annotated property due to crbug.com/407097
 * @param {*} source
 * @param {string} url
 * @param {string} name
 */
WebInspector.DocumentationURLProvider.DocumentationSource = function(source, url, name)
{
    this._source = source;
    this._url = url;
    this._name = name;
}

WebInspector.DocumentationURLProvider.DocumentationSource.prototype = {
    /**
     * @return {*}
     */
    source: function()
    {
        return this._source;
    },

    /**
     * @return {string}
     */
    url: function()
    {
        return this._url;
    },

    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    }
}

/**
 * @const
 * @type {!Array.<!WebInspector.DocumentationURLProvider.DocumentationSource>}
 */
WebInspector.DocumentationURLProvider._sources = [
    new WebInspector.DocumentationURLProvider.DocumentationSource(window, "javascript/","Global"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Node.prototype, "dom/Node/", "Node.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Node, "dom/Node/", "Node"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Object.prototype, "javascript/Object/", "Object.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Object, "javascript/Object/", "Object"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Math, "javascript/Math/", "Math"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Array.prototype, "javascript/Array/", "Array.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Array, "javascript/Array/", "Array"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(String.prototype, "javascript/String/","String.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(String, "javascript/String/", "String"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Date.prototype, "javascript/Date/", "Date.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Date, "javascript/Date/", "Date"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(JSON, "javascript/JSON/", "JSON"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Number, "javascript/Number/", "Number"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Number.prototype, "javascript/Number/", "Number.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Error.prototype, "javascript/Error/", "Error.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(RegExp.prototype, "javascript/regular_expression/", "RegExp.prototype"),
    new WebInspector.DocumentationURLProvider.DocumentationSource(Function.prototype, "javascript/Function/", "Function.prototype")
];

/**
 * @const
 */
WebInspector.DocumentationURLProvider._articleUrlFormat = "http://docs.webplatform.org/w/api.php?action=query&titles=%s%s&prop=revisions&rvprop=timestamp|content&format=json";

/**
 * @const
 */
WebInspector.DocumentationURLProvider._articleListUrlFormat = "http://docs.webplatform.org/w/api.php?action=query&generator=allpages&gaplimit=500&gapfrom=%s&format=json";

/**
 * @const
 */
WebInspector.DocumentationURLProvider._gapFromList = [
    "dom/Node/",
    "javascript/"
];

WebInspector.DocumentationURLProvider.prototype = {
    /**
     * @param {string} searchTerm
     * @return {!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>}
     */
    itemDescriptors: function(searchTerm)
    {
        if (this._state === WebInspector.DocumentationURLProvider.DownloadStates.Finished)
            return this._articleList.get(searchTerm) || [];
        // If download of available articles list is not finished yet, use approximate method.
        if (this._state === WebInspector.DocumentationURLProvider.DownloadStates.NotStarted)
            this._loadArticleList();

        var descriptors = [];
        var sources = WebInspector.DocumentationURLProvider._sources;
        var propertyName = searchTerm.toUpperCase() === searchTerm ? "constants" : searchTerm;
        for (var i = 0; i < sources.length; ++i) {
            if (!sources[i].source().hasOwnProperty(propertyName))
                continue;
            descriptors.push(new WebInspector.DocumentationURLProvider.ItemDescriptor(sources[i], propertyName));
        }
        return descriptors;
    },

    _loadArticleList: function()
    {
        this._state = WebInspector.DocumentationURLProvider.DownloadStates.InProgress;

        var gapFromList = WebInspector.DocumentationURLProvider._gapFromList;
        if (this._gapFromIndex >= gapFromList.length)
            return;
        if (!this._gapFrom.startsWith(gapFromList[this._gapFromIndex])) {
            ++this._gapFromIndex;
            if (this._gapFromIndex === gapFromList.length) {
                this._state = WebInspector.DocumentationURLProvider.DownloadStates.Finished;
                return;
            }
            this._gapFrom = gapFromList[this._gapFromIndex];
        }
        var url = String.sprintf(WebInspector.DocumentationURLProvider._articleListUrlFormat, this._gapFrom);
        loadXHR(url).then(processData.bind(this), resetDownload.bind(this));

        /**
         * @param {?string} responseText
         * @this {!WebInspector.DocumentationURLProvider}
         */
        function processData(responseText)
        {
            if (!responseText) {
                resetDownload.call(this);
                return;
            }
            var json = JSON.parse(responseText);
            this._gapFrom = json["query-continue"]["allpages"]["gapcontinue"];
            var pages = json["query"]["pages"];
            for (var article in pages)
                this._addDescriptorToList(pages[article]["title"]);
            this._loadArticleList();
        }

        /**
         * @this {!WebInspector.DocumentationURLProvider}
         */
        function resetDownload()
        {
            WebInspector.console.error("Documentation article list download failed");
            this._state = WebInspector.DocumentationURLProvider.DownloadStates.Failed;
        }
    },

    /**
     * @param {string} itemPath
     */
    _addDescriptorToList: function(itemPath)
    {
        var lastSlashIndex = itemPath.lastIndexOf("/");
        if (lastSlashIndex === -1)
            return;
        // There are some properties which have several words in their name.
        // In article list they are written through gap, while in URL they are written through underscore.
        // We are creating URL for current property, so we have to replace all the gaps with underscores.
        var correctedItemPath = itemPath.replace(" ", "_");
        var sourceName = correctedItemPath.substring(0, lastSlashIndex + 1);
        var propertyName = correctedItemPath.substring(lastSlashIndex + 1);
        var sources = WebInspector.DocumentationURLProvider._sources;
        for (var i = 0; i < sources.length; ++i) {
            if (sources[i].url() !== sourceName || !sources[i].source().hasOwnProperty(propertyName))
                continue;
            var descriptors = this._articleList.get(propertyName) || [];
            descriptors.push(new WebInspector.DocumentationURLProvider.ItemDescriptor(sources[i], propertyName));
            this._articleList.set(propertyName, descriptors);
        }
    }
}