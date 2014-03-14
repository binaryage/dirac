/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @interface
 */
WebInspector.LinkifierFormatter = function()
{
}

WebInspector.LinkifierFormatter.prototype = {
    /**
     * @param {!Element} anchor
     * @param {!WebInspector.UILocation} uiLocation
     */
    formatLiveAnchor: function(anchor, uiLocation) { }
}

/**
 * @constructor
 * @param {!WebInspector.LinkifierFormatter=} formatter
 */
WebInspector.Linkifier = function(formatter)
{
    this._formatter = formatter || new WebInspector.Linkifier.DefaultFormatter(WebInspector.Linkifier.MaxLengthForDisplayedURLs);
    this._liveLocations = [];
}

/**
 * @param {!WebInspector.Linkifier.LinkHandler} handler
 */
WebInspector.Linkifier.setLinkHandler = function(handler)
{
    WebInspector.Linkifier._linkHandler = handler;
}

/**
 * @param {string} url
 * @param {number=} lineNumber
 * @return {boolean}
 */
WebInspector.Linkifier.handleLink = function(url, lineNumber)
{
    if (!WebInspector.Linkifier._linkHandler)
        return false;
    return WebInspector.Linkifier._linkHandler.handleLink(url, lineNumber)
}

/**
 * @param {!Object} revealable
 * @param {string} text
 * @param {string=} fallbackHref
 * @param {number=} fallbackLineNumber
 * @param {string=} title
 * @param {string=} classes
 * @return {!Element}
 */
WebInspector.Linkifier.linkifyUsingRevealer = function(revealable, text, fallbackHref, fallbackLineNumber, title, classes)
{
    var a = document.createElement("a");
    a.className = (classes || "") + " webkit-html-resource-link";
    a.textContent = text.trimMiddle(WebInspector.Linkifier.MaxLengthForDisplayedURLs);
    a.title = title || text;
    if (fallbackHref) {
        a.href = fallbackHref;
        a.lineNumber = fallbackLineNumber;
    }
    /**
     * @param {?Event} event
     * @this {Object}
     */
    function clickHandler(event)
    {
        event.consume(true);
        if (fallbackHref && WebInspector.Linkifier.handleLink(fallbackHref, fallbackLineNumber))
            return;

        WebInspector.Revealer.reveal(this);
    }
    a.addEventListener("click", clickHandler.bind(revealable), false);
    return a;
}

WebInspector.Linkifier.prototype = {
    /**
     * @param {string} sourceURL
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @param {string=} classes
     * @return {?Element}
     */
    linkifyLocation: function(sourceURL, lineNumber, columnNumber, classes)
    {
        var rawLocation = WebInspector.debuggerModel.createRawLocationByURL(sourceURL, lineNumber, columnNumber || 0);
        if (!rawLocation)
            return WebInspector.linkifyResourceAsNode(sourceURL, lineNumber, classes);
        return this.linkifyRawLocation(rawLocation, classes);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {string=} classes
     * @return {?Element}
     */
    linkifyRawLocation: function(rawLocation, classes)
    {
        var script = WebInspector.debuggerModel.scriptForId(rawLocation.scriptId);
        if (!script)
            return null;
        var anchor = this._createAnchor(classes);
        var liveLocation = script.createLiveLocation(rawLocation, this._updateAnchor.bind(this, anchor));
        this._liveLocations.push(liveLocation);
        return anchor;
    },

    /**
     * @param {?CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.CSSLocation} rawLocation
     * @param {string=} classes
     * @return {?Element}
     */
    linkifyCSSLocation: function(styleSheetId, rawLocation, classes)
    {
        var anchor = this._createAnchor(classes);
        var liveLocation = WebInspector.cssModel.createLiveLocation(styleSheetId, rawLocation, this._updateAnchor.bind(this, anchor));
        if (!liveLocation)
            return null;
        this._liveLocations.push(liveLocation);
        return anchor;
    },

    /**
     * @param {string=} classes
     * @return {!Element}
     */
    _createAnchor: function(classes)
    {
        var anchor = document.createElement("a");
        anchor.className = (classes || "") + " webkit-html-resource-link";

        /**
         * @param {?Event} event
         */
        function clickHandler(event)
        {
            event.consume(true);
            if (!anchor.__uiLocation)
                return;
            if (WebInspector.Linkifier.handleLink(anchor.__uiLocation.url(), anchor.__uiLocation.lineNumber))
                return;
            WebInspector.Revealer.reveal(anchor.__uiLocation);
        }
        anchor.addEventListener("click", clickHandler, false);
        return anchor;
    },

    reset: function()
    {
        for (var i = 0; i < this._liveLocations.length; ++i)
            this._liveLocations[i].dispose();
        this._liveLocations = [];
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.UILocation} uiLocation
     */
    _updateAnchor: function(anchor, uiLocation)
    {
        anchor.__uiLocation = uiLocation;
        this._formatter.formatLiveAnchor(anchor, uiLocation);
    }
}

/**
 * @constructor
 * @implements {WebInspector.LinkifierFormatter}
 * @param {number=} maxLength
 */
WebInspector.Linkifier.DefaultFormatter = function(maxLength)
{
    this._maxLength = maxLength;
}

WebInspector.Linkifier.DefaultFormatter.prototype = {
    /**
     * @param {!Element} anchor
     * @param {!WebInspector.UILocation} uiLocation
     */
    formatLiveAnchor: function(anchor, uiLocation)
    {
        var text = uiLocation.linkText();
        if (this._maxLength)
            text = text.trimMiddle(this._maxLength);
        anchor.textContent = text;

        var titleText = uiLocation.uiSourceCode.originURL();
        if (typeof uiLocation.lineNumber === "number")
            titleText += ":" + (uiLocation.lineNumber + 1);
        anchor.title = titleText;
    }
}

/**
 * @constructor
 * @extends {WebInspector.Linkifier.DefaultFormatter}
 */
WebInspector.Linkifier.DefaultCSSFormatter = function()
{
    WebInspector.Linkifier.DefaultFormatter.call(this, WebInspector.Linkifier.DefaultCSSFormatter.MaxLengthForDisplayedURLs);
}

WebInspector.Linkifier.DefaultCSSFormatter.MaxLengthForDisplayedURLs = 30;

WebInspector.Linkifier.DefaultCSSFormatter.prototype = {
    /**
     * @param {!Element} anchor
     * @param {!WebInspector.UILocation} uiLocation
     */
    formatLiveAnchor: function(anchor, uiLocation)
    {
        WebInspector.Linkifier.DefaultFormatter.prototype.formatLiveAnchor.call(this, anchor, uiLocation);
        anchor.classList.add("webkit-html-resource-link");
        anchor.setAttribute("data-uncopyable", anchor.textContent);
        anchor.textContent = "";
    },
    __proto__: WebInspector.Linkifier.DefaultFormatter.prototype
}

/**
 * The maximum number of characters to display in a URL.
 * @const
 * @type {number}
 */
WebInspector.Linkifier.MaxLengthForDisplayedURLs = 150;

/**
 * @interface
 */
WebInspector.Linkifier.LinkHandler = function()
{
}

WebInspector.Linkifier.LinkHandler.prototype = {
    /**
     * @param {string} url
     * @param {number=} lineNumber
     * @return {boolean}
     */
    handleLink: function(url, lineNumber) {}
}
