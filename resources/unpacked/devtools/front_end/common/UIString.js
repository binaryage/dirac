/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

self['Common'] = self['Common'] || {};

/**
 * @param {string} string
 * @param {...*} vararg
 * @return {string}
 */
Common.UIString = function(string, vararg) {
  return String.vsprintf(Common.localize(string), Array.prototype.slice.call(arguments, 1));
};

/**
 * @param {string} string
 * @return {string}
 */
Common.localize = function(string) {
  return string;
};

/**
 * @unrestricted
 */
Common.UIStringFormat = class {
  /**
   * @param {string} format
   */
  constructor(format) {
    /** @type {string} */
    this._localizedFormat = Common.localize(format);
    /** @type {!Array.<!Object>} */
    this._tokenizedFormat = String.tokenizeFormatString(this._localizedFormat, String.standardFormatters);
  }

  /**
   * @param {string} a
   * @param {string} b
   * @return {string}
   */
  static _append(a, b) {
    return a + b;
  }

  /**
   * @param {...*} vararg
   * @return {string}
   */
  format(vararg) {
    return String
        .format(
            this._localizedFormat, arguments, String.standardFormatters, '', Common.UIStringFormat._append,
            this._tokenizedFormat)
        .formattedResult;
  }
};

/** @type {!WeakMap<!Array<string>, string>} */
Common._substitutionStrings = new WeakMap();

/**
 * @param {!Array<string>|string} strings
 * @param {...*} vararg
 * @return {string}
 */
self.ls = function(strings, vararg) {
  if (typeof strings === 'string')
    return strings;
  let substitutionString = Common._substitutionStrings.get(strings);
  if (!substitutionString) {
    substitutionString = strings.join('%s');
    Common._substitutionStrings.set(strings, substitutionString);
  }
  return Common.UIString(substitutionString, ...Array.prototype.slice.call(arguments, 1));
};
