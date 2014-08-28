// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} wikiMarkupText
 */
WebInspector.WikiParser = function(wikiMarkupText)
{
    this._position = 0;
    this._wikiMarkupText = wikiMarkupText;
    this._document = this._parse();
    /** @type {?WebInspector.WikiParser.Tokenizer} */
    this._tokenizer;
}

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.State = {
    Error: "Error",
    FirstOpen: "FirstOpen",
    SecondOpen: "SecondOpen",
    Title: "Title",
    PropertyName: "PropertyName",
    PropertyValue: "PropertyValue",
    FirstClose: "FirstClose",
    SecondClose: "SecondClose"
}

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.LinkStates = {
    Error: "Error",
    LinkUrl: "LinkUrl",
    LinkName: "LinkName"
}

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.HtmlStates = {
    Error: "Error",
    Entry: "Entry",
    InsideTag: "InsideTag",
    Exit: "Exit"
}

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.ValueState = {
    Error: "Error",
    Outside: "Outside",
    InsideSquare: "InsideSquare"
}

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.TokenType = {
    TripleQuotes: "TripleQuotes",
    OpeningBrackets: "OpeningBrackets",
    OpeningCodeTag: "OpeningCodeTag",
    ClosingBrackets: "ClosingBrackets",
    ClosingCodeTag: "ClosingCodeTag",
    Bullet: "Bullet",
    Text: "Text",
    VerticalLine: "VerticalLine",
    LineEnd: "LineEnd",
    CodeBlock: "CodeBlock"
}

/**
 * @constructor
 * @param {string} result
 * @param {!WebInspector.WikiParser.TokenType} type
 */
WebInspector.WikiParser.Token = function(result, type)
{
    this._value = result;
    this._type = type;
}

WebInspector.WikiParser.Token.prototype = {
    /**
     * @return {string}
     */
    value: function()
    {
        return this._value;
    },

    /**
     * @return {!WebInspector.WikiParser.TokenType}
     */
    type: function()
    {
        return this._type;
    }
}

/**
 * @constructor
 * @param {string} str
 */
WebInspector.WikiParser.Tokenizer = function(str)
{
    this._text = str;
}

WebInspector.WikiParser.Tokenizer.prototype = {
    /**
     * @return {!WebInspector.WikiParser.Token}
     */
    _nextToken: function()
    {
        if (WebInspector.WikiParser.newLineWithSpace.test(this._text)) {
            var result = WebInspector.WikiParser.newLineWithSpace.exec(this._text);
            var begin = result.index + result[0].length;
            var end = this._text.length;
            var lineEnd = WebInspector.WikiParser.newLineWithoutSpace.exec(this._text);
            if (lineEnd)
                end = lineEnd.index;
            var token = this._text.substring(begin, end).replace(/\n */g, "\n");
            this._text = this._text.substring(end + 1);
            return new WebInspector.WikiParser.Token(token, WebInspector.WikiParser.TokenType.CodeBlock);
        }

        for (var i = 0; i < WebInspector.WikiParser._tokenDescriptors.length; ++i) {
            var result = WebInspector.WikiParser._tokenDescriptors[i].regex.exec(this._text);
            if (result) {
                this._text = this._text.substring(result.index + result[0].length);
                return new WebInspector.WikiParser.Token(result[0], WebInspector.WikiParser._tokenDescriptors[i].type);
            }
        }

        for (var lastIndex = 0; lastIndex < this._text.length; ++lastIndex) {
            var testString = this._text.substring(lastIndex);
            for (var i = 0; i < WebInspector.WikiParser._tokenDescriptors.length; ++i) {
                if (WebInspector.WikiParser._tokenDescriptors[i].regex.test(testString)) {
                    var token = this._text.substring(0, lastIndex);
                    this._text = this._text.substring(lastIndex);
                    return new WebInspector.WikiParser.Token(token, WebInspector.WikiParser.TokenType.Text);
                }
            }
        }

        var token = this._text;
        this._text = "";
        return new WebInspector.WikiParser.Token(token, WebInspector.WikiParser.TokenType.Text);
    },

    /**
     * @return {boolean}
     */
    _hasMoreTokens: function()
    {
        return !!this._text.length;
    }
}

WebInspector.WikiParser.prototype = {
    /**
     * @return {!Object}
     */
    document: function()
    {
        return this._document;
    },

    /**
     * @return {!Object}
     */
    _parse: function()
    {
        var obj = {};
        this._wikiMarkupText = this._wikiMarkupText.replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&#58;/g, ":")
                      .replace(/&quot;/g, "\"")
                      .replace(/&#60;/g, "<")
                      .replace(/&#62;/g, ">")
                      .replace(/{{=}}/g, "=")
                      .replace(/{{!}}/g, "|");
        while (this._position < this._wikiMarkupText.length) {
            var field = this._parseField();
            for (var key in field) {
                console.assert(typeof obj[key] === "undefined", "Duplicate key: " + key);
                obj[key] = field[key];
            }
        }
        return obj;
    },

    /**
     * @return {string}
     */
    _parseValue: function() {
        var states = WebInspector.WikiParser.ValueState;
        var state = states.Outside;
        var value = "";
        while (this._position < this._wikiMarkupText.length) {
            switch (state) {
            case states.Outside:
                if (this._wikiMarkupText[this._position] === "|" || (this._wikiMarkupText[this._position] === "}" && this._wikiMarkupText[this._position + 1] === "}"))
                    return value;
                switch (this._wikiMarkupText[this._position]) {
                case "<":
                    var indexClose = this._wikiMarkupText.indexOf(">", this._position);
                    if (indexClose !== -1) {
                        value += this._wikiMarkupText.substring(this._position, indexClose + 1);
                        this._position = indexClose;
                    }
                    break;
                case "[":
                    state = states.InsideSquare;
                    value += this._wikiMarkupText[this._position];
                    break;
                default:
                    value += this._wikiMarkupText[this._position];
                }
                break;
            case states.InsideSquare:
                if (this._wikiMarkupText[this._position] === "[") {
                    var indexClose = this._wikiMarkupText.indexOf("]]", this._position);
                    if (indexClose !== -1) {
                        value += this._wikiMarkupText.substring(this._position, indexClose + 2);
                        this._position = indexClose + 1;
                    }
                } else {
                    var indexClose = this._wikiMarkupText.indexOf("]", this._position);
                    if (indexClose !== -1) {
                        value += this._wikiMarkupText.substring(this._position, indexClose + 1);
                        this._position = indexClose;
                    }
                }
                state = states.Outside;
                break;
            }
            this._position++;
        }
        return value;
    },

    /**
     * @return {!Object}
     */
    _parseField: function()
    {
        var obj = {};
        var title = "";
        var propertyName = "";
        var propertyValue = "";
        var states = WebInspector.WikiParser.State;
        var state = states.FirstOpen;
        while (this._position < this._wikiMarkupText.length) {
            var skipIncrement = false;
            switch (state) {
            case states.FirstOpen:
                if (this._wikiMarkupText[this._position] === "{")
                    state = states.SecondOpen;
                else
                    state = states.Error;
                break;
            case states.SecondOpen:
                if (this._wikiMarkupText[this._position] === "{")
                    state = states.Title;
                else
                    state = states.Error;
                break;
            case states.Title:
                if (this._wikiMarkupText[this._position] === "|") {
                    title = this._deleteTrailingSpaces(title);
                    if (title !== "")
                        obj[title] = {};
                    state = states.PropertyName;
                } else if (this._wikiMarkupText[this._position] === "}") {
                    title = this._deleteTrailingSpaces(title);
                    if (title !== "")
                        obj[title] = {};
                    state = states.FirstClose;
                } else {
                    title += (this._wikiMarkupText[this._position] === "\n" ? "" : this._wikiMarkupText[this._position]);
                }
                break;
            case states.PropertyName:
                if (this._wikiMarkupText[this._position] === "=") {
                    state = states.PropertyValue;
                    this._deleteTrailingSpaces(propertyName);
                    if (propertyName !== "")
                        obj[title][propertyName] = [];
                } else {
                    if (this._wikiMarkupText[this._position] === "}") {
                        propertyName = this._deleteTrailingSpaces(propertyName);
                        obj[title] = propertyName;
                        state = states.FirstClose;
                    } else {
                        propertyName += this._wikiMarkupText[this._position];
                    }
                }
                break;
            case states.PropertyValue:
                if (this._wikiMarkupText[this._position] === "{" && this._wikiMarkupText[this._position + 1] === "{") {
                    propertyValue = this._parseField();
                    obj[title][propertyName].push(propertyValue);
                    propertyValue = "";
                    skipIncrement = true;
                } else if (this._wikiMarkupText[this._position] === "|") {
                    propertyValue = this._deleteTrailingSpaces(propertyValue);
                    if (propertyValue !== "")
                      obj[title][propertyName] = propertyValue;

                    state = states.PropertyName;
                    if (Array.isArray(obj[title][propertyName]) && obj[title][propertyName].length === 1) {
                        var newObj = obj[title][propertyName][0];
                        obj[title][propertyName] = newObj;
                    }

                    propertyName = "";
                    propertyValue = "";
                } else if (this._position + 1 < this._wikiMarkupText.length && this._wikiMarkupText[this._position] === "}" && this._wikiMarkupText[this._position + 1] === "}") {
                    propertyValue = this._deleteTrailingSpaces(propertyValue);
                    if (propertyValue !== "")
                        obj[title][propertyName].push(propertyValue);
                    if (Array.isArray(obj[title][propertyName]) && obj[title][propertyName].length === 1) {
                        var newObj = obj[title][propertyName][0];
                        obj[title][propertyName] = newObj;
                    }

                    propertyValue = "";
                    state = states.FirstClose;
                } else {
                    propertyValue = this._parseValue();
                    skipIncrement = true;
                }
                break;
            case states.FirstClose:
                if (this._wikiMarkupText[this._position] === "}")
                    state = states.SecondClose;
                else
                    state = states.Error;
                break;
            case states.SecondClose:
                while (this._position < this._wikiMarkupText.length && this._wikiMarkupText[this._position] === "\n")
                    this._position++;
                return obj;
            case states.Error:
                this._position = this._wikiMarkupText.length;
                return {};
            }
            if (!skipIncrement)
                this._position++;
        }
        return obj;
    },

    /**
     * @param {string} str
     * @return {?WebInspector.WikiParser.Block}
     */
    parseString: function(str)
    {
        this._tokenizer = new WebInspector.WikiParser.Tokenizer(str);
        var children = [];
        var blockChildren = [];
        var text = "";
        var self = this;

        function processSimpleText()
        {
            var currentText = self._deleteTrailingSpaces(text);
            if (!currentText.length)
                return;
            var simpleText = new WebInspector.WikiParser.PlainText(currentText, false);
            blockChildren.push(simpleText);
            text = "";
        }

        function processBlock()
        {
            if (blockChildren.length) {
                children.push(new WebInspector.WikiParser.Block(blockChildren, false));
                blockChildren = [];
            }
        }
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.TripleQuotes:
                processSimpleText();
                var highlightText = this._parseHighlight();
                blockChildren.push(highlightText)
                break;
            case WebInspector.WikiParser.TokenType.OpeningBrackets:
                processSimpleText();
                var link = this._parseLink();
                blockChildren.push(link);
                break;
            case WebInspector.WikiParser.TokenType.OpeningCodeTag:
                processSimpleText();
                var code = this._parseCode();
                blockChildren.push(code);
                break;
            case WebInspector.WikiParser.TokenType.Bullet:
                processSimpleText();
                processBlock();
                var bulletText = this._parseBullet();
                children.push(bulletText);
                break;
            case WebInspector.WikiParser.TokenType.CodeBlock:
                processSimpleText();
                processBlock();
                var code = new WebInspector.WikiParser.CodeBlock(token.value());
                children.push(code);
                break;
            case WebInspector.WikiParser.TokenType.LineEnd:
                processSimpleText();
                processBlock();
                break;
            case WebInspector.WikiParser.TokenType.VerticalLine:
            case WebInspector.WikiParser.TokenType.Text:
                text += token.value();
                break;
            default:
                return null;
            }
        }

        processSimpleText();
        processBlock();

        return new WebInspector.WikiParser.Block(children, false);
    },

    /**
     * @return {!WebInspector.WikiParser.Link}
     */
    _parseLink: function()
    {
        var url = "";
        var children = [];
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBrackets:
                return new WebInspector.WikiParser.Link(url, children);
            case WebInspector.WikiParser.TokenType.VerticalLine:
                children.push(this._parseLinkName());
                return new WebInspector.WikiParser.Link(url, children);
            default:
                url += token.value();
            }
        }

        return new WebInspector.WikiParser.Link(url, children);
    },

    /**
     * @return {!WebInspector.WikiParser.Inline}
     */
    _parseLinkName: function()
    {
        var children = [];
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBrackets:
                return new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Inline, children);
            case WebInspector.WikiParser.TokenType.OpeningCodeTag:
                children.push(this._parseCode());
                break;
            default:
                children.push(new WebInspector.WikiParser.PlainText(token.value(), false));
                break;
            }
        }

        return new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Inline, children);
    },

    /**
     * @return {!WebInspector.WikiParser.Inline}
     */
    _parseCode : function()
    {
        var children = [];
        var text = "";
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingCodeTag:
                text = this._deleteTrailingSpaces(text);
                if (text.length) {
                    var simpleText = new WebInspector.WikiParser.PlainText(text, false);
                    children.push(simpleText);
                    text = "";
                }
                var code = new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Code, children);
                return code;
            case WebInspector.WikiParser.TokenType.OpeningBrackets:
                var link = this._parseLink();
                children.push(link);
                break;
            default:
                text += token.value();
            }
        }

        text = this._deleteTrailingSpaces(text);
        if (text.length)
            children.push(new WebInspector.WikiParser.PlainText(text, false));

        return new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Code, children);
    },

    /**
     * @return {!WebInspector.WikiParser.Block}
     */
    _parseBullet: function()
    {
        var children = [];
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken()
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.OpeningBrackets:
                children.push(this._parseLink());
                break;
            case WebInspector.WikiParser.TokenType.OpeningCodeTag:
                children.push(this._parseCode());
                break;
            case WebInspector.WikiParser.TokenType.LineEnd:
                return new WebInspector.WikiParser.Block(children, true);
            default:
                var text = this._deleteTrailingSpaces(token.value());
                if (text.length) {
                    var simpleText = new WebInspector.WikiParser.PlainText(text, false);
                    children.push(simpleText);
                    text = "";
                }
            }
        }

        return new WebInspector.WikiParser.Block(children, true);
    },

    /**
     * @return {!WebInspector.WikiParser.PlainText}
     */
    _parseHighlight: function()
    {
        var text = "";
        while (this._tokenizer._hasMoreTokens()) {
            var token = this._tokenizer._nextToken()
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.TripleQuotes:
                text = this._deleteTrailingSpaces(text);
                return new WebInspector.WikiParser.PlainText(text, true);
            default:
                text += token.value();
            }
        }
        return new WebInspector.WikiParser.PlainText(text, true);
    },

    /**
     * @param {string} str
     * @return {string}
     */
    _deleteTrailingSpaces: function(str)
    {
        return str.replace(/[\n\r]*$/gm, "");
    }
}

WebInspector.WikiParser.oneOpeningBracket = /^\n*\[[^\[]/;
WebInspector.WikiParser.twoOpeningBrackets = /^\n*\[\[/;
WebInspector.WikiParser.oneClosingBracket = /^\n*\][^\]]/;
WebInspector.WikiParser.twoClosingBrackets = /^\n*\]\]/;
WebInspector.WikiParser.tripleQuotes = /^\n*'''/;
WebInspector.WikiParser.openingCodeTag = /^<\s*code\s*>/;
WebInspector.WikiParser.closingCodeTag = /^<\s*\/\s*code\s*>/;
WebInspector.WikiParser.closingBullet = /^\*/;
WebInspector.WikiParser.lineEnd = /^\n/;
WebInspector.WikiParser.verticalLine = /^\|/;
WebInspector.WikiParser.newLineWithSpace = /^\n /;
WebInspector.WikiParser.newLineWithoutSpace = /\n[^ ]/;

/**
 * @constructor
 * @param {!RegExp} regex
 * @param {!WebInspector.WikiParser.TokenType} type
 */
WebInspector.WikiParser.TokenDesciptor = function(regex, type)
{
    this.regex = regex;
    this.type = type;
}

WebInspector.WikiParser._tokenDescriptors = [
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.newLineWithSpace, WebInspector.WikiParser.TokenType.CodeBlock),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.tripleQuotes, WebInspector.WikiParser.TokenType.TripleQuotes),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.oneOpeningBracket, WebInspector.WikiParser.TokenType.OpeningBrackets),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.twoOpeningBrackets, WebInspector.WikiParser.TokenType.OpeningBrackets),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.oneClosingBracket, WebInspector.WikiParser.TokenType.ClosingBrackets),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.twoClosingBrackets, WebInspector.WikiParser.TokenType.ClosingBrackets),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.openingCodeTag, WebInspector.WikiParser.TokenType.OpeningCodeTag),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.closingCodeTag, WebInspector.WikiParser.TokenType.ClosingCodeTag),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.closingBullet, WebInspector.WikiParser.TokenType.Bullet),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.verticalLine, WebInspector.WikiParser.TokenType.VerticalLine),
    new WebInspector.WikiParser.TokenDesciptor(WebInspector.WikiParser.lineEnd, WebInspector.WikiParser.TokenType.LineEnd)
];

/**
 * @constructor
 * @param {!WebInspector.WikiParser.ArticleElement.Type} type
 */
WebInspector.WikiParser.ArticleElement = function(type)
{
    this._type = type;
}

WebInspector.WikiParser.ArticleElement.prototype = {
    /**
     * @return {!WebInspector.WikiParser.ArticleElement.Type}
     */
    type: function()
    {
        return this._type;
    }
}

/**
 * @enum {string}
 */
WebInspector.WikiParser.ArticleElement.Type = {
    PlainText: "PlainText",
    Link: "Link",
    Code: "Code",
    Block: "Block",
    CodeBlock: "CodeBlock",
    Inline: "Inline"
};

/**
 * @constructor
 * @extends {WebInspector.WikiParser.ArticleElement}
 * @param {string} text
 * @param {boolean} highlight
 */
WebInspector.WikiParser.PlainText = function(text, highlight)
{
    WebInspector.WikiParser.ArticleElement.call(this, WebInspector.WikiParser.ArticleElement.Type.PlainText);
    this._text = text;
    this._isHighlighted = highlight;
}

WebInspector.WikiParser.PlainText.prototype = {
    /**
     * @return {string}
     */
    text : function()
    {
        return this._text;
    },

    /**
     * @return {boolean}
     */
    isHighlighted: function()
    {
        return this._isHighlighted;
    },

    __proto__: WebInspector.WikiParser.ArticleElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.WikiParser.ArticleElement}
 * @param {!Array.<!WebInspector.WikiParser.ArticleElement>} children
 * @param {boolean} hasBullet
 */
WebInspector.WikiParser.Block = function(children, hasBullet)
{
    WebInspector.WikiParser.ArticleElement.call(this, WebInspector.WikiParser.ArticleElement.Type.Block);
    this._children = children;
    this._hasBullet = hasBullet
}

WebInspector.WikiParser.Block.prototype = {
    /**
     * @return {!Array.<!WebInspector.WikiParser.ArticleElement>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @return {boolean}
     */
    hasBullet: function()
    {
        return this._hasBullet;
    },

    __proto__: WebInspector.WikiParser.ArticleElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.WikiParser.ArticleElement}
 * @param {string} text
 */
WebInspector.WikiParser.CodeBlock = function(text)
{
    WebInspector.WikiParser.ArticleElement.call(this, WebInspector.WikiParser.ArticleElement.Type.CodeBlock);
    this._code = text;
}

WebInspector.WikiParser.CodeBlock.prototype = {
    /**
     * @return {string}
     */
    code: function()
    {
        return this._code;
    },

    __proto__: WebInspector.WikiParser.ArticleElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.WikiParser.ArticleElement}
 * @param {!WebInspector.WikiParser.ArticleElement.Type} type
 * @param {!Array.<!WebInspector.WikiParser.ArticleElement>} children
 */
WebInspector.WikiParser.Inline = function(type, children)
{
    WebInspector.WikiParser.ArticleElement.call(this, type)
    this._children = children;
}

WebInspector.WikiParser.Inline.prototype = {
    /**
     * @return {!Array.<!WebInspector.WikiParser.ArticleElement>}
     */
    children: function()
    {
        return this._children;
    },

    __proto__: WebInspector.WikiParser.ArticleElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.WikiParser.Inline}
 * @param {string} url
 * @param {!Array.<!WebInspector.WikiParser.ArticleElement>} children
 */
WebInspector.WikiParser.Link = function(url, children)
{
    WebInspector.WikiParser.Inline.call(this, WebInspector.WikiParser.ArticleElement.Type.Link, children);
    this._url = url;
}

WebInspector.WikiParser.Link.prototype = {
    /**
     * @return {string}
     */
    url : function()
    {
        return this._url;
    },

    __proto__: WebInspector.WikiParser.Inline.prototype
}
