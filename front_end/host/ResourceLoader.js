// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const ResourceLoader = {};
export default ResourceLoader;

export let _lastStreamId = 0;

/** @type {!Object.<number, !Common.OutputStream>} */
export const _boundStreams = {};

/**
 * @param {!Common.OutputStream} stream
 * @return {number}
 */
export const _bindOutputStream = function(stream) {
  _boundStreams[++_lastStreamId] = stream;
  return _lastStreamId;
};

/**
 * @param {number} id
 */
export const _discardOutputStream = function(id) {
  _boundStreams[id].close();
  delete _boundStreams[id];
};

/**
 * @param {number} id
 * @param {string} chunk
 */
export const streamWrite = function(id, chunk) {
  _boundStreams[id].write(chunk);
};

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {function(number, !Object.<string, string>, string)} callback
 */
export function load(url, headers, callback) {
  const stream = new Common.StringOutputStream();
  loadAsStream(url, headers, stream, mycallback);

  /**
   * @param {number} statusCode
   * @param {!Object.<string, string>} headers
   */
  function mycallback(statusCode, headers) {
    callback(statusCode, headers, stream.data());
  }
}

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {!Common.OutputStream} stream
 * @param {function(number, !Object.<string, string>)=} callback
 */
export const loadAsStream = function(url, headers, stream, callback) {
  const streamId = _bindOutputStream(stream);
  const parsedURL = new Common.ParsedURL(url);
  if (parsedURL.isDataURL()) {
    loadXHR(url).then(dataURLDecodeSuccessful).catch(dataURLDecodeFailed);
    return;
  }

  const rawHeaders = [];
  if (headers) {
    for (const key in headers) {
      rawHeaders.push(key + ': ' + headers[key]);
    }
  }
  Host.InspectorFrontendHost.loadNetworkResource(url, rawHeaders.join('\r\n'), streamId, finishedCallback);

  /**
   * @param {!InspectorFrontendHostAPI.LoadNetworkResourceResult} response
   */
  function finishedCallback(response) {
    if (callback) {
      callback(response.statusCode, response.headers || {});
    }
    _discardOutputStream(streamId);
  }

  /**
   * @param {string} text
   */
  function dataURLDecodeSuccessful(text) {
    streamWrite(streamId, text);
    finishedCallback(/** @type {!InspectorFrontendHostAPI.LoadNetworkResourceResult} */ ({statusCode: 200}));
  }

  function dataURLDecodeFailed() {
    finishedCallback(/** @type {!InspectorFrontendHostAPI.LoadNetworkResourceResult} */ ({statusCode: 404}));
  }
};

/* Legacy exported object */
self.Host = self.Host || {};

/* Legacy exported object */
Host = Host || {};

Host.ResourceLoader = ResourceLoader;

Host.ResourceLoader._lastStreamId = _lastStreamId;

/** @type {!Object.<number, !Common.OutputStream>} */
Host.ResourceLoader._boundStreams = _boundStreams;

/**
 * @param {!Common.OutputStream} stream
 * @return {number}
 */
Host.ResourceLoader._bindOutputStream = _bindOutputStream;

/**
 * @param {number} id
 */
Host.ResourceLoader._discardOutputStream = _discardOutputStream;

/**
 * @param {number} id
 * @param {string} chunk
 */
Host.ResourceLoader.streamWrite = streamWrite;

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {function(number, !Object.<string, string>, string)} callback
 */
Host.ResourceLoader.load = load;

/**
 * @param {string} url
 * @param {?Object.<string, string>} headers
 * @param {!Common.OutputStream} stream
 * @param {function(number, !Object.<string, string>)=} callback
 */
Host.ResourceLoader.loadAsStream = loadAsStream;
