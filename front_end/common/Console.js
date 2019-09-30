// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import ObjectWrapper from './Object.js';

/**
 * @unrestricted
 */
export default class Console extends ObjectWrapper {
  constructor() {
    super();
    /** @type {!Array.<!Message>} */
    this._messages = [];
  }

  /**
   * @param {string} text
   * @param {!MessageLevel} level
   * @param {boolean=} show
   */
  addMessage(text, level, show) {
    const message = new Message(text, level || MessageLevel.Info, Date.now(), show || false);
    this._messages.push(message);
    this.dispatchEventToListeners(Common.Console.Events.MessageAdded, message);
  }

  /**
   * @param {string} text
   */
  log(text) {
    this.addMessage(text, MessageLevel.Info);
  }

  /**
   * @param {string} text
   */
  warn(text) {
    this.addMessage(text, MessageLevel.Warning);
  }

  /**
   * @param {string} text
   */
  error(text) {
    this.addMessage(text, MessageLevel.Error, true);
  }

  /**
   * @return {!Array.<!Message>}
   */
  messages() {
    return this._messages;
  }

  show() {
    this.showPromise();
  }

  /**
   * @return {!Promise.<undefined>}
   */
  showPromise() {
    return Common.Revealer.reveal(this);
  }
}

/** @enum {symbol} */
export const Events = {
  MessageAdded: Symbol('messageAdded')
};

/**
 * @enum {string}
 */
export const MessageLevel = {
  Info: 'info',
  Warning: 'warning',
  Error: 'error'
};

/**
 * @unrestricted
 */
export class Message {
  /**
   * @param {string} text
   * @param {!MessageLevel} level
   * @param {number} timestamp
   * @param {boolean} show
   */
  constructor(text, level, timestamp, show) {
    this.text = text;
    this.level = level;
    this.timestamp = (typeof timestamp === 'number') ? timestamp : Date.now();
    this.show = show;
  }
}

/* Legacy exported object */
self.Common = self.Common || {};
Common = Common || {};

Common.console = new Console();

/**
 * @constructor
 */
Common.Console = Console;

/** @enum {symbol} */
Common.Console.Events = Events;

/**
 * @enum {string}
 */
Common.Console.MessageLevel = MessageLevel;

/**
 * @constructor
 */
Common.Console.Message = Message;
