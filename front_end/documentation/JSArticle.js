// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.JSArticle = function()
{
    /** @type {string} */
    this.pageTitle;
    /** @type {string} */
    this.standardizationStatus;
    /** @type {?WebInspector.WikiParser.Block} */
    this.summary;
    /** @type {!Array.<!WebInspector.JSArticle.Parameter>} */
    this.parameters = [];
    /** @type {?WebInspector.JSArticle.Method} */
    this.methods;
    /** @type {?WebInspector.WikiParser.Block} */
    this.remarks;
    /** @type {!Array.<!WebInspector.JSArticle.Example>} */
    this.examples = [];
}

/**
 * @constructor
 * @param {string} name
 * @param {string} dataType
 * @param {string} optional
 * @param {?WebInspector.WikiParser.Block} description
 */
WebInspector.JSArticle.Parameter = function(name, dataType, optional, description)
{
    this.name = name;
    this.dataType = dataType;
    this.optional = optional;
    this.description = description;
}

/**
 * @constructor
 * @param {string} language
 * @param {string} code
 * @param {string} liveUrl
 * @param {?WebInspector.WikiParser.Block} description
 */
WebInspector.JSArticle.Example = function(language, code, liveUrl, description)
{
    this.language = language;
    this.code = code;
    this.liveUrl = liveUrl;
    this.description = description;
}

/**
 * @constructor
 * @param {string} dataType
 * @param {string} returnValue
 */
WebInspector.JSArticle.Method = function(dataType, returnValue)
{
    this.dataType = dataType;
    this.returnValue = returnValue;
}

/**
 * @param {string} wikiMarkupText
 * @return {!WebInspector.JSArticle}
 */
WebInspector.JSArticle.parse = function(wikiMarkupText)
{
    /**
     * @param {string} string
     * @param {string} debugInfo
     * @return {?WebInspector.WikiParser.Block}
     */
    function parseString(string, debugInfo)
    {
        var result = wikiParser.parseString(string);
        if (!result)
            console.error("Can't parse " + debugInfo);
        return result;
    }

    var wikiParser = new WebInspector.WikiParser(wikiMarkupText);
    var wikiDocument = wikiParser.document();

    var article = new WebInspector.JSArticle();
    article.pageTitle = wikiDocument["Page_Title"];
    if (typeof article.pageTitle !== "string")
        delete article.pageTitle;
    article.standardizationStatus = wikiDocument["Standardization_Status"];
    if (article.standardizationStatus !== "string")
        delete article.standardizationStatus;
    var apiObjectMethod = wikiDocument["API_Object_Method"];
    if (apiObjectMethod) {
        var dataType = apiObjectMethod["Javascript_data_type"];
        var returnValue = apiObjectMethod["Return_value_name"];
        if (dataType && returnValue)
            article.methods = new WebInspector.JSArticle.Method(dataType, returnValue);
    }

    var remarks = wikiDocument["Remarks_Section"] ? wikiDocument["Remarks_Section"]["Remarks"] : null;
    if (remarks)
        article.remarks = parseString(remarks, "remarks");

    var summary = wikiDocument["Summary_Section"];
    if (summary)
        article.summary = parseString(summary, "summary");

    var examples = wikiDocument["Examples_Section"] ? wikiDocument["Examples_Section"]["Examples"] : [];
    if (!Array.isArray(examples) && typeof examples !== "undefined")
        examples = [examples];

    for (var i = 0; i < examples.length; ++i) {
        var language = examples[i]["Single Example"]["Language"];
        var code = examples[i]["Single Example"]["Code"];
        var liveUrl = examples[i]["Single Example"]["LiveURL"];
        var description = parseString(examples[i]["Single Example"]["Description"], "example description");
        article.examples.push(new WebInspector.JSArticle.Example(language, code, liveUrl, description));
    }

    var parameters = apiObjectMethod ? apiObjectMethod["Parameters"] : [];
    if (!Array.isArray(parameters) && typeof parameters !== "undefined")
        parameters = [parameters];

    for (var i = 0; i < parameters.length; ++i) {
        var name = parameters[i]["Method Parameter"]["Name"];
        var dataType = parameters[i]["Method Parameter"]["Data type"];
        var optional = parameters[i]["Method Parameter"]["Optional"];
        var description = parseString(parameters[i]["Method Parameter"]["Description"], "method description");
        article.parameters.push(new WebInspector.JSArticle.Parameter(name, dataType, optional, description));
    }

    return article;
}
