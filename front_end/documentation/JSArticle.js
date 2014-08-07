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
    /** @type {!Object.<string, ?Array.<!Object.<string> > >} */
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
    var from = wikiParser.document();

    var article = new WebInspector.JSArticle();
    if (typeof from["Page_Title"] !== "undefined" && from["Page_Title"] !== {})
        article.pageTitle = from["Page_Title"];
    if (typeof from["Standardization_Status"] !== "undefined")
        article.standardizationStatus = from["Standardization_Status"];
    if (typeof from["Summary_Section"] !== "undefined")
        article.summary = from["Summary_Section"];
    if (typeof from["API_Object_Method"] !== "undefined")
        article.methods = from["API_Object_Method"];
    if (typeof from["Remarks_Section"] !== "undefined")
        article.remarks = from["Remarks_Section"];

    return article;
}

