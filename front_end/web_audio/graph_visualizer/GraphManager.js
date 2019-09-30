// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A class that maps each context to its corresponding graph.
// It controls which graph to render when the context is switched or updated.
WebAudio.GraphVisualizer.GraphManager = class extends Common.Object {
  constructor() {
    super();

    /** @type {!Map<!Protocol.WebAudio.GraphObjectId, !WebAudio.GraphVisualizer.GraphView>} */
    this._graphMapByContextId = new Map();
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   */
  createContext(contextId) {
    const graph = new WebAudio.GraphVisualizer.GraphView(contextId);
    // When a graph has any update, request redraw.
    graph.addEventListener(WebAudio.GraphVisualizer.GraphView.Events.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.set(contextId, graph);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   */
  destroyContext(contextId) {
    if (!this._graphMapByContextId.has(contextId)) {
      return;
    }

    const graph = this._graphMapByContextId.get(contextId);
    graph.removeEventListener(WebAudio.GraphVisualizer.GraphView.Events.ShouldRedraw, this._notifyShouldRedraw, this);
    this._graphMapByContextId.delete(contextId);
  }

  hasContext(contextId) {
    return this._graphMapByContextId.has(contextId);
  }

  clearGraphs() {
    this._graphMapByContextId.clear();
  }

  /**
   * Get graph by contextId.
   * If the user starts listening for WebAudio events after the page has been running a context for awhile,
   * the graph might be undefined.
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @return {?WebAudio.GraphVisualizer.GraphView}
   */
  getGraph(contextId) {
    return this._graphMapByContextId.get(contextId);
  }

  /**
   * @param {!Common.Event} event
   */
  _notifyShouldRedraw(event) {
    const graph = /** @type {!WebAudio.GraphVisualizer.GraphView} */ (event.data);
    this.dispatchEventToListeners(WebAudio.GraphVisualizer.GraphView.Events.ShouldRedraw, graph);
  }
};
