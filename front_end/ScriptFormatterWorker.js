/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
importScripts("utilities.js");
importScripts("cm/headlesscodemirror.js");
importScripts("cm/css.js");
importScripts("cm/javascript.js");
importScripts("cm/xml.js");
importScripts("cm/htmlmixed.js");
WebInspector = {};
FormatterWorker = {};
importScripts("CodeMirrorUtils.js");

var onmessage = function(event) {
    if (!event.data.method)
        return;

    FormatterWorker[event.data.method](event.data.params);
};

/**
 * @param {!Object} params
 */
FormatterWorker.format = function(params)
{
    // Default to a 4-space indent.
    var indentString = params.indentString || "    ";
    var result = {};

    if (params.mimeType === "text/html") {
        var formatter = new FormatterWorker.HTMLFormatter(indentString);
        result = formatter.format(params.content);
    } else if (params.mimeType === "text/css") {
        result.mapping = { original: [0], formatted: [0] };
        result.content = FormatterWorker._formatCSS(params.content, result.mapping, 0, 0, indentString);
    } else {
        result.mapping = { original: [0], formatted: [0] };
        result.content = FormatterWorker._formatScript(params.content, result.mapping, 0, 0, indentString);
    }
    postMessage(result);
}

/**
 * @param {number} totalLength
 * @param {number} chunkSize
 */
FormatterWorker._chunkCount = function(totalLength, chunkSize)
{
    if (totalLength <= chunkSize)
        return 1;

    var remainder = totalLength % chunkSize;
    var partialLength = totalLength - remainder;
    return (partialLength / chunkSize) + (remainder ? 1 : 0);
}

/**
 * @param {!Object} params
 */
FormatterWorker.outline = function(params)
{
    const chunkSize = 100000; // characters per data chunk
    const totalLength = params.content.length;
    const lines = params.content.split("\n");
    const chunkCount = FormatterWorker._chunkCount(totalLength, chunkSize);
    var outlineChunk = [];
    var previousIdentifier = null;
    var previousToken = null;
    var previousTokenType = null;
    var currentChunk = 1;
    var processedChunkCharacters = 0;
    var addedFunction = false;
    var isReadingArguments = false;
    var argumentsText = "";
    var currentFunction = null;
    var tokenizer = WebInspector.CodeMirrorUtils.createTokenizer("text/javascript");
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];
        tokenizer(line, processToken);
    }

    /**
     * @param {string} tokenValue
     * @param {string} tokenType
     * @param {number} column
     * @param {number} newColumn
     */
    function processToken(tokenValue, tokenType, column, newColumn)
    {
        tokenType = tokenType ? WebInspector.CodeMirrorUtils.convertTokenType(tokenType) : null;
        if (tokenType === "javascript-ident") {
            previousIdentifier = tokenValue;
            if (tokenValue && previousToken === "function") {
                // A named function: "function f...".
                currentFunction = { line: i, column: column, name: tokenValue };
                addedFunction = true;
                previousIdentifier = null;
            }
        } else if (tokenType === "javascript-keyword") {
            if (tokenValue === "function") {
                if (previousIdentifier && (previousToken === "=" || previousToken === ":")) {
                    // Anonymous function assigned to an identifier: "...f = function..."
                    // or "funcName: function...".
                    currentFunction = { line: i, column: column, name: previousIdentifier };
                    addedFunction = true;
                    previousIdentifier = null;
                }
            }
        } else if (tokenValue === "." && previousTokenType === "javascript-ident")
            previousIdentifier += ".";
        else if (tokenValue === "(" && addedFunction)
            isReadingArguments = true;
        if (isReadingArguments && tokenValue)
            argumentsText += tokenValue;

        if (tokenValue === ")" && isReadingArguments) {
            addedFunction = false;
            isReadingArguments = false;
            currentFunction.arguments = argumentsText.replace(/,[\r\n\s]*/g, ", ").replace(/([^,])[\r\n\s]+/g, "$1");
            argumentsText = "";
            outlineChunk.push(currentFunction);
        }

        if (tokenValue.trim().length) {
            // Skip whitespace tokens.
            previousToken = tokenValue;
            previousTokenType = tokenType;
        }
        processedChunkCharacters += newColumn - column;

        if (processedChunkCharacters >= chunkSize) {
            postMessage({ chunk: outlineChunk, total: chunkCount, index: currentChunk++ });
            outlineChunk = [];
            processedChunkCharacters = 0;
        }
    }

    postMessage({ chunk: outlineChunk, total: chunkCount, index: chunkCount });
}

/**
 * @param {string} content
 * @param {!{original: !Array.<number>, formatted: !Array.<number>}} mapping
 * @param {number} offset
 * @param {number} formattedOffset
 * @param {string} indentString
 * @return {string}
 */
FormatterWorker._formatScript = function(content, mapping, offset, formattedOffset, indentString)
{
    var formattedContent;
    try {
        var tokenizer = new FormatterWorker.JavaScriptTokenizer(content);
        var builder = new FormatterWorker.JavaScriptFormattedContentBuilder(tokenizer.content(), mapping, offset, formattedOffset, indentString);
        var formatter = new FormatterWorker.JavaScriptFormatter(tokenizer, builder);
        formatter.format();
        formattedContent = builder.content();
    } catch (e) {
        formattedContent = content;
    }
    return formattedContent;
}

/**
 * @param {string} content
 * @param {!{original: !Array.<number>, formatted: !Array.<number>}} mapping
 * @param {number} offset
 * @param {number} formattedOffset
 * @param {string} indentString
 * @return {string}
 */
FormatterWorker._formatCSS = function(content, mapping, offset, formattedOffset, indentString)
{
    var formattedContent;
    try {
        var builder = new FormatterWorker.CSSFormattedContentBuilder(content, mapping, offset, formattedOffset, indentString);
        var formatter = new FormatterWorker.CSSFormatter(content, builder);
        formatter.format();
        formattedContent = builder.content();
    } catch (e) {
        formattedContent = content;
    }
    return formattedContent;
}

/**
 * @constructor
 * @param {string} indentString
 */
FormatterWorker.HTMLFormatter = function(indentString)
{
    this._indentString = indentString;
}

FormatterWorker.HTMLFormatter.prototype = {
    /**
     * @param {string} content
     */
    format: function(content)
    {
        this.line = content;
        this._content = content;
        this._formattedContent = "";
        this._mapping = { original: [0], formatted: [0] };
        this._position = 0;

        var scriptOpened = false;
        var styleOpened = false;
        var tokenizer = WebInspector.CodeMirrorUtils.createTokenizer("text/html");
        function processToken(tokenValue, tokenType, tokenStart, tokenEnd) {
            if (tokenType !== "xml-tag")
                return;
            if (tokenValue.toLowerCase() === "<script") {
                scriptOpened = true;
            } else if (scriptOpened && tokenValue === ">") {
                scriptOpened = false;
                this._scriptStarted(tokenEnd);
            } else if (tokenValue.toLowerCase() === "</script") {
                this._scriptEnded(tokenStart);
            } else if (tokenValue.toLowerCase() === "<style") {
                styleOpened = true;
            } else if (styleOpened && tokenValue === ">") {
                styleOpened = false;
                this._styleStarted(tokenEnd);
            } else if (tokenValue.toLowerCase() === "</style") {
                this._styleEnded(tokenStart);
            }
        }
        tokenizer(content, processToken.bind(this));

        this._formattedContent += this._content.substring(this._position);
        return { content: this._formattedContent, mapping: this._mapping };
    },

    /**
     * @param {number} cursor
     */
    _scriptStarted: function(cursor)
    {
        this._handleSubFormatterStart(cursor);
    },

    /**
     * @param {number} cursor
     */
    _scriptEnded: function(cursor)
    {
        this._handleSubFormatterEnd(FormatterWorker._formatScript, cursor);
    },

    /**
     * @param {number} cursor
     */
    _styleStarted: function(cursor)
    {
        this._handleSubFormatterStart(cursor);
    },

    /**
     * @param {number} cursor
     */
    _styleEnded: function(cursor)
    {
        this._handleSubFormatterEnd(FormatterWorker._formatCSS, cursor);
    },

    /**
     * @param {number} cursor
     */
    _handleSubFormatterStart: function(cursor)
    {
        this._formattedContent += this._content.substring(this._position, cursor);
        this._formattedContent += "\n";
        this._position = cursor;
    },

    /**
     * @param {function(string, {formatted: !Array.<number>, original: !Array.<number>}, number, number, string)} formatFunction
     * @param {number} cursor
     */
    _handleSubFormatterEnd: function(formatFunction, cursor)
    {
        if (cursor === this._position)
            return;

        var scriptContent = this._content.substring(this._position, cursor);
        this._mapping.original.push(this._position);
        this._mapping.formatted.push(this._formattedContent.length);
        var formattedScriptContent = formatFunction(scriptContent, this._mapping, this._position, this._formattedContent.length, this._indentString);

        this._formattedContent += formattedScriptContent;
        this._position = cursor;
    }
}

Array.prototype.keySet = function()
{
    var keys = {};
    for (var i = 0; i < this.length; ++i)
        keys[this[i]] = true;
    return keys;
};

function require()
{
    return parse;
}

/**
 * @type {!{tokenizer}}
 */
var exports = { tokenizer: null };
importScripts("UglifyJS/parse-js.js");
var parse = exports;

importScripts("JavaScriptFormatter.js");
importScripts("CSSFormatter.js");
