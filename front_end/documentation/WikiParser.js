// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {string} wikiMarkupText
 */
WebInspector.WikiParser = function(wikiMarkupText)
{
    var text = wikiMarkupText;
    this._tokenizer = new WebInspector.WikiParser.Tokenizer(text);
    this._document = this._parse();
}

/**
 * @constructor
 */
WebInspector.WikiParser.Section = function()
{
    /** @type {string} */
    this.title;

    /** @type {?WebInspector.WikiParser.Values} */
    this.values;

    /** @type {?WebInspector.WikiParser.ArticleElement} */
    this.singleValue;
}

/**
 * @constructor
 */
WebInspector.WikiParser.Field = function()
{
    /** @type {string} */
    this.name;

    /** @type {?WebInspector.WikiParser.FieldValue} */
    this.value;
}

/** @typedef {(?WebInspector.WikiParser.ArticleElement|!Array.<!WebInspector.WikiParser.Section>)} */
WebInspector.WikiParser.FieldValue;

/** @typedef {?Object.<string, !WebInspector.WikiParser.FieldValue>} */
WebInspector.WikiParser.Values;

/** @typedef {(?WebInspector.WikiParser.Value|?WebInspector.WikiParser.ArticleElement)} */
WebInspector.WikiParser.Value;

/**
 * @package
 * @enum {string}
 */
WebInspector.WikiParser.TokenType = {
    Text: "Text",
    Table: "Table",
    OpeningBraces: "OpeningBraces",
    ClosingBraces: "ClosingBraces",
    Exclamation: "Exclamation",
    OpeningBrackets: "OpeningBrackets",
    ClosingBrackets: "ClosingBrackets",
    EqualSign: "EqualSign",
    EqualSignInBraces: "EqualSignInBraces",
    VerticalLine: "VerticalLine",
    TripleQuotes: "TripleQuotes",
    OpeningCodeTag: "OpeningCodeTag",
    ClosingCodeTag: "ClosingCodeTag",
    Bullet: "Bullet",
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
    this._token = this._internalNextToken();
}

WebInspector.WikiParser.Tokenizer.prototype = {
    /**
     * @return {!WebInspector.WikiParser.Token}
     */
    peekToken: function()
    {
        return this._token;
    },

    /**
     * @return {!WebInspector.WikiParser.Token}
     */
    nextToken: function()
    {
        var token = this._token;
        this._token = this._internalNextToken();
        return token;
    },

    /**
     * @return {!WebInspector.WikiParser.Token}
     */
    _internalNextToken: function()
    {
        if (WebInspector.WikiParser.newLineWithSpace.test(this._text)) {
            var result = WebInspector.WikiParser.newLineWithSpace.exec(this._text);
            var begin = result.index;
            var end = this._text.length;
            var lineEnd = WebInspector.WikiParser.newLineWithoutSpace.exec(this._text);
            if (lineEnd)
                end = lineEnd.index;
            var token = this._text.substring(begin, end).replace(/\n /g, "\n").replace(/{{=}}/g, "=");
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
     * @return {!WebInspector.WikiParser.Tokenizer}
     */
    clone: function()
    {
        var tokenizer = new WebInspector.WikiParser.Tokenizer(this._text);
        tokenizer._token = this._token;
        tokenizer._text = this._text;
        return tokenizer;
    },

    /**
     * @return {boolean}
     */
    hasMoreTokens: function()
    {
        return !!this._text.length;
    }
}

WebInspector.WikiParser.table = /^{{{!}}/;
WebInspector.WikiParser.exclamation = /^{{!}}/;
WebInspector.WikiParser.openingBraces = /^{{/;
WebInspector.WikiParser.equalSign = /^=/;
WebInspector.WikiParser.equalSignInBraces = /^{{=}}/;
WebInspector.WikiParser.closingBraces = /^\s*}}/;
WebInspector.WikiParser.oneOpeningBracketWithSpace = /^\n* \[/;
WebInspector.WikiParser.twoOpeningBracketsWithSpace = /^\n* \[\[/;
WebInspector.WikiParser.oneClosingBracket = /^\n*\]/;
WebInspector.WikiParser.twoClosingBrackets = /^\n*\]\]/;
WebInspector.WikiParser.tripleQuotes = /^\n*'''/;
WebInspector.WikiParser.openingCodeTag = /^<code\s*>/;
WebInspector.WikiParser.closingCodeTag = /^<\/code\s*>/;
WebInspector.WikiParser.closingBullet = /^\*/;
WebInspector.WikiParser.lineEnd = /^\n/;
WebInspector.WikiParser.verticalLine = /^\n*\|/;
WebInspector.WikiParser.newLineWithSpace = /^\n [^ ]/;
WebInspector.WikiParser.newLineWithoutSpace = /\n[^ ]/;

/**
 * @constructor
 * @param {!RegExp} regex
 * @param {!WebInspector.WikiParser.TokenType} type
 */
WebInspector.WikiParser.TokenDescriptor = function(regex, type)
{
    this.regex = regex;
    this.type = type;
}

WebInspector.WikiParser._tokenDescriptors = [
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.exclamation, WebInspector.WikiParser.TokenType.Exclamation),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.equalSignInBraces, WebInspector.WikiParser.TokenType.EqualSignInBraces),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.equalSign, WebInspector.WikiParser.TokenType.EqualSign),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.table, WebInspector.WikiParser.TokenType.Table),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.openingBraces, WebInspector.WikiParser.TokenType.OpeningBraces),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.verticalLine, WebInspector.WikiParser.TokenType.VerticalLine),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.closingBraces, WebInspector.WikiParser.TokenType.ClosingBraces),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.twoOpeningBracketsWithSpace, WebInspector.WikiParser.TokenType.OpeningBrackets),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.twoClosingBrackets, WebInspector.WikiParser.TokenType.ClosingBrackets),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.oneOpeningBracketWithSpace, WebInspector.WikiParser.TokenType.OpeningBrackets),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.oneClosingBracket, WebInspector.WikiParser.TokenType.ClosingBrackets),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.newLineWithSpace, WebInspector.WikiParser.TokenType.CodeBlock),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.tripleQuotes, WebInspector.WikiParser.TokenType.TripleQuotes),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.openingCodeTag, WebInspector.WikiParser.TokenType.OpeningCodeTag),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.closingCodeTag, WebInspector.WikiParser.TokenType.ClosingCodeTag),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.closingBullet, WebInspector.WikiParser.TokenType.Bullet),
    new WebInspector.WikiParser.TokenDescriptor(WebInspector.WikiParser.lineEnd, WebInspector.WikiParser.TokenType.LineEnd)
]

WebInspector.WikiParser.prototype = {
    /**
     * @return {!Object}
     */
    document: function()
    {
        return this._document;
    },

    /**
     * @return {?WebInspector.WikiParser.TokenType}
     */
    _secondTokenType: function()
    {
        var tokenizer = this._tokenizer.clone();
        if (!tokenizer.hasMoreTokens())
            return null;
        tokenizer.nextToken();
        if (!tokenizer.hasMoreTokens())
            return null;
        return tokenizer.nextToken().type();
    },

    /**
     * @return {!Object.<string, ?WebInspector.WikiParser.Value>}
     */
    _parse: function()
    {
        var obj = {};
        while (this._tokenizer.hasMoreTokens()) {
            var section = this._parseSection();
            if (section.title)
                obj[section.title] = section.singleValue || section.values;
        }
        return obj;
    },

    /**
     * @return {!WebInspector.WikiParser.Section}
     */
    _parseSection: function()
    {
        var section = new WebInspector.WikiParser.Section();
        if (!this._tokenizer.hasMoreTokens() || this._tokenizer.nextToken().type() !== WebInspector.WikiParser.TokenType.OpeningBraces)
            return section;

        var title = this._deleteTrailingSpaces(this._parseSectionTitle());
        if (!title.length)
            return section;
        section.title = title;
        if (this._tokenizer.peekToken().type() === WebInspector.WikiParser.TokenType.ClosingBraces) {
            this._tokenizer.nextToken();
            return section;
        }
        var secondTokenType = this._secondTokenType();
        if (!secondTokenType || secondTokenType !== WebInspector.WikiParser.TokenType.EqualSign) {
            section.singleValue = this._parseMarkupText();
        } else {
            section.values = {};
            while (this._tokenizer.hasMoreTokens()) {
                var field = this._parseField();
                section.values[field.name] = field.value;
                if (this._tokenizer.peekToken().type() === WebInspector.WikiParser.TokenType.ClosingBraces) {
                    this._tokenizer.nextToken();
                    return section;
                }
            }
        }
        var token = this._tokenizer.nextToken();
        if (token.type() !== WebInspector.WikiParser.TokenType.ClosingBraces)
            throw new Error("Two closing braces expected; found " + token.value());

        return section;
    },

    /**
     * @return {!WebInspector.WikiParser.Field}
     */
    _parseField: function()
    {
        var field = new WebInspector.WikiParser.Field();
        field.name = this._parseFieldName();
        var token = this._tokenizer.peekToken();
        switch (token.type()) {
        case WebInspector.WikiParser.TokenType.OpeningBraces:
            field.value = this._parseArray();
            break;
        case WebInspector.WikiParser.TokenType.LineEnd:
            this._tokenizer.nextToken();
            break;
        case WebInspector.WikiParser.TokenType.ClosingBraces:
            return field;
        default:
            if (field.name.toUpperCase() === "CODE")
                field.value = this._parseExampleCode();
            else
                field.value = this._parseMarkupText();
        }
        return field;
    },

    /**
     * @return {!Array.<!WebInspector.WikiParser.Section>}
     */
    _parseArray: function()
    {
        var array = [];
        while (this._tokenizer.peekToken().type() === WebInspector.WikiParser.TokenType.OpeningBraces)
            array.push(this._parseSection());
        if (this._tokenizer.peekToken().type() === WebInspector.WikiParser.TokenType.VerticalLine)
            this._tokenizer.nextToken();
        return array;
    },

    /**
     * @return {string}
     */
    _parseSectionTitle: function()
    {
        var title = "";
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.peekToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBraces:
                return title;
            case WebInspector.WikiParser.TokenType.VerticalLine:
                this._tokenizer.nextToken();
                return title;
            case WebInspector.WikiParser.TokenType.Text:
                title += this._tokenizer.nextToken().value();
                break;
            default:
                throw new Error("Title could not be parsed. Unexpected token " + token.value());
            }
        }
        return title;
    },

    /**
     * @return {string}
     */
    _parseFieldName: function()
    {
        var name = "";
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.peekToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBraces:
                return name;
            case WebInspector.WikiParser.TokenType.EqualSign:
                this._tokenizer.nextToken();
                return name;
            case WebInspector.WikiParser.TokenType.VerticalLine:
            case WebInspector.WikiParser.TokenType.Text:
                name += this._tokenizer.nextToken().value();
                break;
            default:
                throw new Error("Name could not be parsed. Unexpected token " + token.value());
            }
        }
        return name;
    },

    /**
     * @return {!WebInspector.WikiParser.Block}
     */
    _parseExampleCode: function()
    {
        var code = "";

        /**
         * @return {!WebInspector.WikiParser.Block}
         */
        function wrapIntoArticleElement()
        {
            var plainText = new WebInspector.WikiParser.PlainText(code);
            var block = new WebInspector.WikiParser.Block([plainText])
            var articleElement = new WebInspector.WikiParser.Block([block]);
            return articleElement;
        }

        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.peekToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBraces:
                return wrapIntoArticleElement();
            case WebInspector.WikiParser.TokenType.VerticalLine:
                this._tokenizer.nextToken();
                return wrapIntoArticleElement();
            case WebInspector.WikiParser.TokenType.Exclamation:
                this._tokenizer.nextToken();
                code += "|";
                break;
            case WebInspector.WikiParser.TokenType.EqualSignInBraces:
                this._tokenizer.nextToken();
                code += "=";
                break;
            default:
                this._tokenizer.nextToken();
                code += token.value();
            }
        }
        return wrapIntoArticleElement();
    },

    /**
     * @return {?WebInspector.WikiParser.Block}
     */
    _parseMarkupText: function()
    {
        var children = [];
        var blockChildren = [];
        var text = "";
        var self = this;

        function processSimpleText()
        {
            var currentText = self._deleteTrailingSpaces(text);
            if (!currentText.length)
                return;
            var simpleText = new WebInspector.WikiParser.PlainText(currentText);
            blockChildren.push(simpleText);
            text = "";
        }

        function processBlock()
        {
            if (blockChildren.length) {
                children.push(new WebInspector.WikiParser.Block(blockChildren));
                blockChildren = [];
            }
        }

        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.peekToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.VerticalLine:
            case WebInspector.WikiParser.TokenType.ClosingBraces:
                if (token.type() === WebInspector.WikiParser.TokenType.VerticalLine)
                    this._tokenizer.nextToken();
                processSimpleText();
                processBlock();
                return new WebInspector.WikiParser.Block(children);
            case WebInspector.WikiParser.TokenType.TripleQuotes:
                this._tokenizer.nextToken();
                processSimpleText();
                var highlightText = this._parseHighlight();
                blockChildren.push(highlightText)
                break;
            case WebInspector.WikiParser.TokenType.OpeningBrackets:
                this._tokenizer.nextToken();
                processSimpleText();
                var link = this._parseLink();
                blockChildren.push(link);
                break;
            case WebInspector.WikiParser.TokenType.OpeningCodeTag:
                this._tokenizer.nextToken();
                processSimpleText();
                var code = this._parseCode();
                blockChildren.push(code);
                break;
            case WebInspector.WikiParser.TokenType.Bullet:
                this._tokenizer.nextToken();
                processSimpleText();
                processBlock();
                var bulletText = this._parseBullet();
                children.push(bulletText);
                break;
            case WebInspector.WikiParser.TokenType.CodeBlock:
                this._tokenizer.nextToken();
                processSimpleText();
                processBlock();
                var code = new WebInspector.WikiParser.CodeBlock(this._trimLeadingNewLines(token.value()));
                children.push(code);
                break;
            case WebInspector.WikiParser.TokenType.LineEnd:
                this._tokenizer.nextToken();
                processSimpleText();
                processBlock();
                break;
            case WebInspector.WikiParser.TokenType.EqualSignInBraces:
                this._tokenizer.nextToken();
                text += "=";
                break;
            case WebInspector.WikiParser.TokenType.Exclamation:
                this._tokenizer.nextToken();
                text += "|";
                break;
            case WebInspector.WikiParser.TokenType.ClosingBrackets:
            case WebInspector.WikiParser.TokenType.Text:
            case WebInspector.WikiParser.TokenType.EqualSign:
            case WebInspector.WikiParser.TokenType.Table:
                this._tokenizer.nextToken();
                text += token.value();
                break;
            default:
                this._tokenizer.nextToken();
                return null;
            }
        }

        processSimpleText();
        processBlock();

        return new WebInspector.WikiParser.Block(children);
    },

    /**
     * @return {!WebInspector.WikiParser.Link}
     */
    _parseLink: function()
    {
        var url = "";
        var children = [];
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBrackets:
                return new WebInspector.WikiParser.Link(url, children);
            case WebInspector.WikiParser.TokenType.VerticalLine:
            case WebInspector.WikiParser.TokenType.Exclamation:
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
        var text = "";
        var self = this;
        function processSimpleText()
        {
            text = self._deleteTrailingSpaces(text);
            if (!text.length)
                return;
            var simpleText = new WebInspector.WikiParser.PlainText(text);
            children.push(simpleText);
            text = "";
        }

        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingBrackets:
                processSimpleText();
                return new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Inline, children);
            case WebInspector.WikiParser.TokenType.OpeningCodeTag:
                processSimpleText();
                children.push(this._parseCode());
                break;
            default:
                text += token.value();
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
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.nextToken();
            switch (token.type()) {
            case WebInspector.WikiParser.TokenType.ClosingCodeTag:
                text = this._deleteTrailingSpaces(text);
                if (text.length) {
                    var simpleText = new WebInspector.WikiParser.PlainText(text);
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
            children.push(new WebInspector.WikiParser.PlainText(text));

        return new WebInspector.WikiParser.Inline(WebInspector.WikiParser.ArticleElement.Type.Code, children);
    },

    /**
     * @return {!WebInspector.WikiParser.Block}
     */
    _parseBullet: function()
    {
        var children = [];
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.nextToken()
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
                    var simpleText = new WebInspector.WikiParser.PlainText(text);
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
        while (this._tokenizer.hasMoreTokens()) {
            var token = this._tokenizer.nextToken()
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
    },

    /**
     * @param {string} str
     * @return {string}
     */
    _trimLeadingNewLines: function(str)
    {
        return str.replace(/^\n*/, "");
    }
}

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
 * @param {boolean=} highlight
 */
WebInspector.WikiParser.PlainText = function(text, highlight)
{
    WebInspector.WikiParser.ArticleElement.call(this, WebInspector.WikiParser.ArticleElement.Type.PlainText);
    this._text = text.unescapeHTML();
    this._isHighlighted = highlight || false;
}

WebInspector.WikiParser.PlainText.prototype = {
    /**
     * @return {string}
     */
    text: function()
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
 * @param {boolean=} hasBullet
 */
WebInspector.WikiParser.Block = function(children, hasBullet)
{
    WebInspector.WikiParser.ArticleElement.call(this, WebInspector.WikiParser.ArticleElement.Type.Block);
    this._children = children;
    this._hasBullet = hasBullet || false;
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
    hasChildren: function()
    {
        return !!this._children && !!this._children.length;
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
    this._code = text.unescapeHTML();
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
