// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @template T
 */
export default class SourceMapManager extends Common.Object {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super();

    this._target = target;
    this._isEnabled = true;

    /** @type {!Map<!T, string>} */
    this._relativeSourceURL = new Map();
    /** @type {!Map<!T, string>} */
    this._relativeSourceMapURL = new Map();
    /** @type {!Map<!T, string>} */
    this._resolvedSourceMapId = new Map();

    /** @type {!Map<string, !SDK.SourceMap>} */
    this._sourceMapById = new Map();
    /** @type {!Platform.Multimap<string, !T>} */
    this._sourceMapIdToLoadingClients = new Platform.Multimap();
    /** @type {!Platform.Multimap<string, !T>} */
    this._sourceMapIdToClients = new Platform.Multimap();

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }

  /**
   * @param {boolean} isEnabled
   */
  setEnabled(isEnabled) {
    if (isEnabled === this._isEnabled) {
      return;
    }
    this._isEnabled = isEnabled;
    // We need this copy, because `this._resolvedSourceMapId` is getting modified
    // in the loop body and trying to iterate over it at the same time leads to
    // an infinite loop.
    const clients = [...this._resolvedSourceMapId.keys()];
    for (const client of clients) {
      const relativeSourceURL = this._relativeSourceURL.get(client);
      const relativeSourceMapURL = this._relativeSourceMapURL.get(client);
      this.detachSourceMap(client);
      this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectedURLChanged(event) {
    if (event.data !== this._target) {
      return;
    }

    // We need this copy, because `this._resolvedSourceMapId` is getting modified
    // in the loop body and trying to iterate over it at the same time leads to
    // an infinite loop.
    const prevSourceMapIds = new Map(this._resolvedSourceMapId);
    for (const [client, prevSourceMapId] of prevSourceMapIds) {
      const relativeSourceURL = this._relativeSourceURL.get(client);
      const relativeSourceMapURL = this._relativeSourceMapURL.get(client);
      const {sourceMapId} = this._resolveRelativeURLs(relativeSourceURL, relativeSourceMapURL);
      if (prevSourceMapId !== sourceMapId) {
        this.detachSourceMap(client);
        this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
      }
    }
  }

  /**
   * @param {!T} client
   * @return {?SDK.SourceMap}
   */
  sourceMapForClient(client) {
    const sourceMapId = this._resolvedSourceMapId.get(client);
    if (!sourceMapId) {
      return null;
    }
    return this._sourceMapById.get(sourceMapId) || null;
  }

  /**
   * @param {!SDK.SourceMap} sourceMap
   * @return {!Array<!T>}
   */
  clientsForSourceMap(sourceMap) {
    const sourceMapId = this._getSourceMapId(sourceMap.compiledURL(), sourceMap.url());
    if (this._sourceMapIdToClients.has(sourceMapId)) {
      return this._sourceMapIdToClients.get(sourceMapId).valuesArray();
    }
    return this._sourceMapIdToLoadingClients.get(sourceMapId).valuesArray();
  }

  /**
   * @param {string} sourceURL
   * @param {string} sourceMapURL
   */
  _getSourceMapId(sourceURL, sourceMapURL) {
    return `${sourceURL}:${sourceMapURL}`;
  }

  /**
   * @param {string} sourceURL
   * @param {string} sourceMapURL
   * @return {?{sourceURL: string, sourceMapURL: string, sourceMapId: string}}
   */
  _resolveRelativeURLs(sourceURL, sourceMapURL) {
    // |sourceURL| can be a random string, but is generally an absolute path.
    // Complete it to inspected page url for relative links.
    const resolvedSourceURL = Common.ParsedURL.completeURL(this._target.inspectedURL(), sourceURL);
    if (!resolvedSourceURL) {
      return null;
    }
    const resolvedSourceMapURL = Common.ParsedURL.completeURL(resolvedSourceURL, sourceMapURL);
    if (!resolvedSourceMapURL) {
      return null;
    }
    return {
      sourceURL: resolvedSourceURL,
      sourceMapURL: resolvedSourceMapURL,
      sourceMapId: this._getSourceMapId(resolvedSourceURL, resolvedSourceMapURL)
    };
  }

  /**
   * @param {!T} client
   * @param {string} relativeSourceURL
   * @param {?string} relativeSourceMapURL
   */
  attachSourceMap(client, relativeSourceURL, relativeSourceMapURL) {
    if (!relativeSourceMapURL) {
      return;
    }
    console.assert(!this._resolvedSourceMapId.has(client), 'SourceMap is already attached to client');
    const resolvedURLs = this._resolveRelativeURLs(relativeSourceURL, relativeSourceMapURL);
    if (!resolvedURLs) {
      return;
    }
    this._relativeSourceURL.set(client, relativeSourceURL);
    this._relativeSourceMapURL.set(client, relativeSourceMapURL);

    const {sourceURL, sourceMapURL, sourceMapId} = resolvedURLs;
    this._resolvedSourceMapId.set(client, sourceMapId);

    if (!this._isEnabled) {
      return;
    }

    this.dispatchEventToListeners(Events.SourceMapWillAttach, client);

    if (this._sourceMapById.has(sourceMapId)) {
      attach.call(this, sourceMapId, client);
      return;
    }
    if (!this._sourceMapIdToLoadingClients.has(sourceMapId)) {
      SDK.TextSourceMap.load(sourceMapURL, sourceURL).then(onSourceMap.bind(this, sourceMapId));
    }
    this._sourceMapIdToLoadingClients.set(sourceMapId, client);

    /**
     * @param {string} sourceMapId
     * @param {?SDK.SourceMap} sourceMap
     * @this {SourceMapManager}
     */
    function onSourceMap(sourceMapId, sourceMap) {
      this._sourceMapLoadedForTest();
      const clients = this._sourceMapIdToLoadingClients.get(sourceMapId);
      this._sourceMapIdToLoadingClients.deleteAll(sourceMapId);
      if (!clients.size) {
        return;
      }
      if (!sourceMap) {
        for (const client of clients) {
          this.dispatchEventToListeners(Events.SourceMapFailedToAttach, client);
        }
        return;
      }
      this._sourceMapById.set(sourceMapId, sourceMap);
      for (const client of clients) {
        attach.call(this, sourceMapId, client);
      }
    }

    /**
     * @param {string} sourceMapId
     * @param {!T} client
     * @this {SourceMapManager}
     */
    function attach(sourceMapId, client) {
      this._sourceMapIdToClients.set(sourceMapId, client);
      const sourceMap = this._sourceMapById.get(sourceMapId);
      this.dispatchEventToListeners(Events.SourceMapAttached, {client: client, sourceMap: sourceMap});
    }
  }

  /**
   * @param {!T} client
   */
  detachSourceMap(client) {
    const sourceMapId = this._resolvedSourceMapId.get(client);
    this._relativeSourceURL.delete(client);
    this._relativeSourceMapURL.delete(client);
    this._resolvedSourceMapId.delete(client);

    if (!sourceMapId) {
      return;
    }
    if (!this._sourceMapIdToClients.hasValue(sourceMapId, client)) {
      if (this._sourceMapIdToLoadingClients.delete(sourceMapId, client)) {
        this.dispatchEventToListeners(Events.SourceMapFailedToAttach, client);
      }
      return;
    }
    this._sourceMapIdToClients.delete(sourceMapId, client);
    const sourceMap = this._sourceMapById.get(sourceMapId);
    if (!this._sourceMapIdToClients.has(sourceMapId)) {
      this._sourceMapById.delete(sourceMapId);
    }
    this.dispatchEventToListeners(Events.SourceMapDetached, {client: client, sourceMap: sourceMap});
  }

  _sourceMapLoadedForTest() {
  }

  dispose() {
    SDK.targetManager.removeEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }
}

export const Events = {
  SourceMapWillAttach: Symbol('SourceMapWillAttach'),
  SourceMapFailedToAttach: Symbol('SourceMapFailedToAttach'),
  SourceMapAttached: Symbol('SourceMapAttached'),
  SourceMapDetached: Symbol('SourceMapDetached'),
  SourceMapChanged: Symbol('SourceMapChanged')
};

/* Legacy exported object */
self.SDK = self.SDK || {};

/* Legacy exported object */
SDK = SDK || {};

/** @constructor */
SDK.SourceMapManager = SourceMapManager;

SDK.SourceMapManager.Events = Events;
