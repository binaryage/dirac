// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.CSSArticle = function()
{
    /** @type {string} */
    this.pageTitle;
    /** @type {string} */
    this.standardizationStatus;
    /** @type {string} */
    this.summary;
    /** @type {!Object.<string, ?Array.<!Object.<string>>>} */
    this.cssProperties;
}

/**
 * @param {string} wikiMarkupText
 * @return {?WebInspector.CSSArticle}
 */
WebInspector.CSSArticle.parse = function(wikiMarkupText)
{
    var wikiParser = new WebInspector.WikiParser(wikiMarkupText);
    var wikiDocument = wikiParser.document();

    var article = new WebInspector.CSSArticle();
    if (typeof wikiDocument["Page_Title"] !== "undefined")
        article.pageTitle = wikiDocument["Page_Title"];
    if (typeof wikiDocument["Standardization_Status"] !== "undefined")
        article.standardizationStatus = wikiDocument["Standardization_Status"];
    if (typeof wikiDocument["Summary_Section"] !== "undefined")
        article.summary = wikiDocument["Summary_Section"];
    if (typeof wikiDocument["CSS Property"] !== "undefined")
        article.cssProperties = wikiDocument["CSS Property"];

    return article;
}

