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
    /** @type {!Object.<string, ?Array.<!Object.<string> > >} */
    this.CSSproperties;
}

/**
 * @param {string} wikiMarkupText
 * @return {?WebInspector.CSSArticle}
 */
WebInspector.CSSArticle.parse = function(wikiMarkupText)
{
    var wikiParser = new WebInspector.WikiParser(wikiMarkupText);
    var from = wikiParser.document();

    var article = new WebInspector.CSSArticle();
    if (typeof from["Page_Title"] !== "undefined")
        article.pageTitle = from["Page_Title"];
    if (typeof from["Standardization_Status"] !== "undefined")
        article.standardizationStatus = from["Standardization_Status"];
    if (typeof from["Summary_Section"] !== "undefined")
        article.summary = from["Summary_Section"];
    if (typeof from["CSS Property"] !== "undefined")
        article.CSSproperties = from["CSS Property"];

    return article;
}

