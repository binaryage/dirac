// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.MessageSink = function()
{
    /** @type {!Array.<!WebInspector.MessageSink.Message>} */
    this._messages = [];
}

/**
 * @enum {string}
 */
WebInspector.MessageSink.Events = {
    MessageAdded: "messageAdded"
}

/**
 * @enum {string}
 */
WebInspector.MessageSink.MessageLevel = {
    Log: "log",
    Warning: "warning",
    Error: "error"
}

/**
 * @constructor
 * @param {string} text
 * @param {!WebInspector.MessageSink.MessageLevel} level
 * @param {number} timestamp
 * @param {boolean} show
 */
WebInspector.MessageSink.Message = function(text, level, timestamp, show)
{
    this.text = text;
    this.level = level;
    this.timestamp = (typeof timestamp === "number") ? timestamp : Date.now();
    this.show = show;
}

WebInspector.MessageSink.prototype = {
    /**
     * @param {string} text
     * @param {!WebInspector.MessageSink.MessageLevel=} level
     * @param {boolean=} show
     */
    addMessage: function(text, level, show)
    {
        var message = new WebInspector.MessageSink.Message(text, level || WebInspector.MessageSink.MessageLevel.Log, Date.now(), show || false);
        this._messages.push(message);
        this.dispatchEventToListeners(WebInspector.MessageSink.Events.MessageAdded, message);
    },

    /**
     * @param {string} text
     * @param {boolean=} show
     */
    addErrorMessage: function(text, show)
    {
        this.addMessage(text, WebInspector.MessageSink.MessageLevel.Error, show);
    },

    /**
     * @return {!Array.<!WebInspector.MessageSink.Message>}
     */
    messages: function()
    {
        return this._messages;
    },

    __proto__: WebInspector.Object.prototype
}

WebInspector.messageSink = new WebInspector.MessageSink();
