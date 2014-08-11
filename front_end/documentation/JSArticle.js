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
    /** @type {string} */
    this.summary;
    /** @type {!Object.<string, ?Array.<!Object.<string>>>} */
    this.methods;
    /** @type {string} */
    this.remarks;
}

/**
 * @param {string} wikiMarkupText
 * @return {!WebInspector.JSArticle}
 */
WebInspector.JSArticle.parse = function(wikiMarkupText)
{
    var wikiParser = new WebInspector.WikiParser(wikiMarkupText);
    var wikiDocument = wikiParser.document();

    var article = new WebInspector.JSArticle();
    if (typeof wikiDocument["Page_Title"] !== "undefined" && wikiDocument["Page_Title"] !== {})
        article.pageTitle = wikiDocument["Page_Title"];
    if (typeof wikiDocument["Standardization_Status"] !== "undefined")
        article.standardizationStatus = wikiDocument["Standardization_Status"];
    if (typeof wikiDocument["Summary_Section"] !== "undefined")
        article.summary = wikiDocument["Summary_Section"];
    if (typeof wikiDocument["API_Object_Method"] !== "undefined")
        article.methods = wikiDocument["API_Object_Method"];
    if (typeof wikiDocument["Remarks_Section"] !== "undefined")
        article.remarks = wikiDocument["Remarks_Section"];

    return article;
}

