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
}

/**
 * @package
 * @enum {number}
 */
WebInspector.WikiParser.State = {
    Error: 0,
    FirstOpen: 1,
    SecondOpen: 2,
    Title: 3,
    PropertyName: 4,
    PropertyValue: 5,
    FirstClose: 6,
    SecondClose: 7
}

/**
 * @package
 * @enum {number}
 */
WebInspector.WikiParser.ValueState = {
    Error: 0,
    Outside: 1,
    InsideSquare: 2,
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
     * @return {string}
     */
    _deleteTrailingSpaces: function(str)
    {
        return str.replace(/\s*$/gm, "");
    }
}
