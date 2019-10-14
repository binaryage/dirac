/*
 * Copyright (C) 2014 Google Inc.  All rights reserved.
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

let _platform;

/**
 * @return {string}
 */
export function platform() {
  if (!_platform) {
    _platform = Host.InspectorFrontendHost.platform();
  }
  return _platform;
}

let _isMac;

/**
 * @return {boolean}
 */
export function isMac() {
  if (typeof _isMac === 'undefined') {
    _isMac = platform() === 'mac';
  }

  return _isMac;
}

let _isWin;

/**
 * @return {boolean}
 */
export function isWin() {
  if (typeof _isWin === 'undefined') {
    _isWin = platform() === 'windows';
  }

  return _isWin;
}

let _isCustomDevtoolsFrontend;

/**
 * @return {boolean}
 */
export function isCustomDevtoolsFrontend() {
  if (typeof _isCustomDevtoolsFrontend === 'undefined') {
    _isCustomDevtoolsFrontend = window.location.toString().startsWith('devtools://devtools/custom/');
  }
  return _isCustomDevtoolsFrontend;
}

let _fontFamily;

/**
 * @return {string}
 */
export function fontFamily() {
  if (_fontFamily) {
    return _fontFamily;
  }
  switch (platform()) {
    case 'linux':
      _fontFamily = 'Roboto, Ubuntu, Arial, sans-serif';
      break;
    case 'mac':
      _fontFamily = '\'Lucida Grande\', sans-serif';
      break;
    case 'windows':
      _fontFamily = '\'Segoe UI\', Tahoma, sans-serif';
      break;
  }
  return _fontFamily;
}

/* Legacy exported object */
self.Host = self.Host || {};

/* Legacy exported object */
Host = Host || {};

Host.platform = platform;
Host.isWin = isWin;
Host.isMac = isMac;
Host.isCustomDevtoolsFrontend = isCustomDevtoolsFrontend;
Host.fontFamily = fontFamily;
