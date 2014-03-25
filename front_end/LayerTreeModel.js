/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

/**
  * @constructor
  * @extends {WebInspector.Object}
  */
WebInspector.LayerTreeModel = function()
{
    WebInspector.Object.call(this);
    this._layersById = {};
    // We fetch layer tree lazily and get paint events asynchronously, so keep the last painted
    // rect separate from layer so we can get it after refreshing the tree.
    this._lastPaintRectByLayerId = {};
    this._backendNodeIdToNodeId = {};
    InspectorBackend.registerLayerTreeDispatcher(new WebInspector.LayerTreeDispatcher(this));
    WebInspector.domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._onDocumentUpdated, this);
}

WebInspector.LayerTreeModel.Events = {
    LayerTreeChanged: "LayerTreeChanged",
    LayerPainted: "LayerPainted",
}

WebInspector.LayerTreeModel.prototype = {
    disable: function()
    {
        if (!this._enabled)
            return;
        this._enabled = false;
        this._backendNodeIdToNodeId = {};
        LayerTreeAgent.disable();
    },

    /**
     * @param {function()=} callback
     */
    enable: function(callback)
    {
        if (this._enabled)
            return;
        this._enabled = true;
        LayerTreeAgent.enable();
    },

    /**
     * @param {!WebInspector.LayerTreeSnapshot} snapshot
     */
    setSnapshot: function(snapshot)
    {
        this.disable();
        this._resolveNodesAndRepopulate(snapshot.layers);
    },

    /**
     * @return {?WebInspector.Layer}
     */
    root: function()
    {
        return this._root;
    },

    /**
     * @return {?WebInspector.Layer}
     */
    contentRoot: function()
    {
        return this._contentRoot;
    },

    /**
     * @param {function(!WebInspector.Layer)} callback
     * @param {?WebInspector.Layer=} root
     * @return {boolean}
     */
    forEachLayer: function(callback, root)
    {
        if (!root) {
            root = this.root();
            if (!root)
                return false;
        }
        return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
    },

    /**
     * @param {string} id
     * @return {?WebInspector.Layer}
     */
    layerById: function(id)
    {
        return this._layersById[id] || null;
    },

    /**
     * @param {!Array.<!LayerTreeAgent.Layer>=} payload
     */
    _resolveNodesAndRepopulate: function(payload)
    {
        if (payload)
            this._resolveBackendNodeIdsForLayers(payload, onBackendNodeIdsResolved.bind(this));
        else
            onBackendNodeIdsResolved.call(this);
        /**
         * @this {WebInspector.LayerTreeModel}
         */
        function onBackendNodeIdsResolved()
        {
            this._repopulate(payload || []);
            this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerTreeChanged);
        }
    },

    /**
     * @param {!Array.<!LayerTreeAgent.Layer>} layers
     */
    _repopulate: function(layers)
    {
        this._root = null;
        this._contentRoot = null;
        // Payload will be null when not in the composited mode.
        if (!layers)
            return;
        var oldLayersById = this._layersById;
        this._layersById = {};
        for (var i = 0; i < layers.length; ++i) {
            var layerId = layers[i].layerId;
            var layer = oldLayersById[layerId];
            if (layer)
                layer._reset(layers[i]);
            else
                layer = new WebInspector.Layer(layers[i]);
            this._layersById[layerId] = layer;
            if (layers[i].backendNodeId) {
                layer._setNodeId(this._backendNodeIdToNodeId[layers[i].backendNodeId]);
                if (!this._contentRoot)
                    this._contentRoot = layer;
            }
            var lastPaintRect = this._lastPaintRectByLayerId[layerId];
            if (lastPaintRect)
                layer._lastPaintRect = lastPaintRect;
            var parentId = layer.parentId();
            if (parentId) {
                var parent = this._layersById[parentId];
                if (!parent)
                    console.assert(parent, "missing parent " + parentId + " for layer " + layerId);
                parent.addChild(layer);
            } else {
                if (this._root)
                    console.assert(false, "Multiple root layers");
                this._root = layer;
            }
        }
        this._lastPaintRectByLayerId = {};
    },

    /**
     * @param {!Array.<!LayerTreeAgent.Layer>=} layers
     */
    _layerTreeChanged: function(layers)
    {
        if (!this._enabled)
            return;
        this._resolveNodesAndRepopulate(layers);
    },

    /**
     * @param {!Array.<!LayerTreeAgent.Layer>} layers
     * @param {function()} callback
     */
    _resolveBackendNodeIdsForLayers: function(layers, callback)
    {
        var idsToResolve = {};
        var requestedIds = [];
        for (var i = 0; i < layers.length; ++i) {
            var backendNodeId = layers[i].backendNodeId;
            if (!backendNodeId || idsToResolve[backendNodeId] ||
                (this._backendNodeIdToNodeId[backendNodeId] && WebInspector.domModel.nodeForId(this._backendNodeIdToNodeId[backendNodeId]))) {
                continue;
            }
            idsToResolve[backendNodeId] = true;
            requestedIds.push(backendNodeId);
        }
        if (!requestedIds.length) {
            callback();
            return;
        }
        WebInspector.domModel.pushNodesByBackendIdsToFrontend(requestedIds, populateBackendNodeIdMap.bind(this));

        /**
         * @this {WebInspector.LayerTreeModel}
         * @param {?Array.<number>} nodeIds
         */
        function populateBackendNodeIdMap(nodeIds)
        {
            if (nodeIds) {
                for (var i = 0; i < requestedIds.length; ++i) {
                    var nodeId = nodeIds[i];
                    if (nodeId)
                        this._backendNodeIdToNodeId[requestedIds[i]] = nodeId;
                }
            }
            callback();
        }
    },

    /**
     * @param {!LayerTreeAgent.LayerId} layerId
     * @param {!DOMAgent.Rect} clipRect
     */
    _layerPainted: function(layerId, clipRect)
    {
        var layer = this._layersById[layerId];
        if (!layer) {
            this._lastPaintRectByLayerId[layerId] = clipRect;
            return;
        }
        layer._didPaint(clipRect);
        this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerPainted, layer);
    },

    _onDocumentUpdated: function()
    {
        this.disable();
        this.enable();
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {!LayerTreeAgent.Layer} layerPayload
 */
WebInspector.Layer = function(layerPayload)
{
    this._scrollRects = [];
    this._reset(layerPayload);
}

WebInspector.Layer.prototype = {
    /**
     * @return {string}
     */
    id: function()
    {
        return this._layerPayload.layerId;
    },

    /**
     * @return {string}
     */
    parentId: function()
    {
        return this._layerPayload.parentLayerId;
    },

    /**
     * @return {!WebInspector.Layer}
     */
    parent: function()
    {
        return this._parent;
    },

    /**
     * @return {boolean}
     */
    isRoot: function()
    {
        return !this.parentId();
    },

    /**
     * @return {!Array.<!WebInspector.Layer>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @param {!WebInspector.Layer} child
     */
    addChild: function(child)
    {
        if (child._parent)
            console.assert(false, "Child already has a parent");
        this._children.push(child);
        child._parent = this;
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     */
    _setNodeId: function(nodeId)
    {
        this._nodeId = nodeId;
    },

    /**
     * @return {?DOMAgent.NodeId}
     */
    nodeId: function()
    {
        return this._nodeId;
    },

    /**
     * @return {?DOMAgent.NodeId}
     */
    nodeIdForSelfOrAncestor: function()
    {
        for (var layer = this; layer; layer = layer._parent) {
            var nodeId = layer._nodeId;
            if (nodeId)
                return nodeId;
        }
        return null;
    },

    /**
     * @return {number}
     */
    offsetX: function()
    {
        return this._layerPayload.offsetX;
    },

    /**
     * @return {number}
     */
    offsetY: function()
    {
        return this._layerPayload.offsetY;
    },

    /**
     * @return {number}
     */
    width: function()
    {
        return this._layerPayload.width;
    },

    /**
     * @return {number}
     */
    height: function()
    {
        return this._layerPayload.height;
    },

    /**
     * @return {!Array.<number>}
     */
    transform: function()
    {
        return this._layerPayload.transform;
    },

    /**
     * @return {!Array.<number>}
     */
    anchorPoint: function()
    {
        return [
            this._layerPayload.anchorX || 0,
            this._layerPayload.anchorY || 0,
            this._layerPayload.anchorZ || 0,
        ];
    },

    /**
     * @return {boolean}
     */
    invisible: function()
    {
        return this._layerPayload.invisible;
    },

    /**
     * @return {number}
     */
    paintCount: function()
    {
        return this._paintCount || this._layerPayload.paintCount;
    },

    /**
     * @return {?DOMAgent.Rect}
     */
    lastPaintRect: function()
    {
        return this._lastPaintRect;
    },

    /**
     * @return {!Array.<!LayerTreeAgent.ScrollRect>}
     */
    scrollRects: function()
    {
        return this._scrollRects;
    },

    /**
     * @param {function(!Array.<string>)} callback
     */
    requestCompositingReasons: function(callback)
    {
        var wrappedCallback = InspectorBackend.wrapClientCallback(callback, "LayerTreeAgent.reasonsForCompositingLayer(): ", undefined, []);
        LayerTreeAgent.compositingReasons(this.id(), wrappedCallback);
    },

    /**
     * @param {function(!WebInspector.PaintProfilerSnapshot=)} callback
     */
    requestSnapshot: function(callback)
    {
        var wrappedCallback = InspectorBackend.wrapClientCallback(callback, "LayerTreeAgent.makeSnapshot(): ", WebInspector.PaintProfilerSnapshot);
        LayerTreeAgent.makeSnapshot(this.id(), wrappedCallback);
    },

    /**
     * @param {!DOMAgent.Rect} rect
     */
    _didPaint: function(rect)
    {
        this._lastPaintRect = rect;
        this._paintCount = this.paintCount() + 1;
        this._image = null;
    },

    /**
     * @param {!LayerTreeAgent.Layer} layerPayload
     */
    _reset: function(layerPayload)
    {
        this._children = [];
        this._parent = null;
        this._paintCount = 0;
        this._layerPayload = layerPayload;
        this._image = null;
        this._nodeId = 0;
        this._scrollRects = this._layerPayload.scrollRects || [];
    }
}

/**
 * @constructor
 * @param {!Array.<!LayerTreeAgent.Layer>} layers
 */
WebInspector.LayerTreeSnapshot = function(layers)
{
    this.layers = layers;
}

/**
 * @constructor
 * @implements {LayerTreeAgent.Dispatcher}
 * @param {!WebInspector.LayerTreeModel} layerTreeModel
 */
WebInspector.LayerTreeDispatcher = function(layerTreeModel)
{
    this._layerTreeModel = layerTreeModel;
}

WebInspector.LayerTreeDispatcher.prototype = {
    /**
     * @param {!Array.<!LayerTreeAgent.Layer>=} layers
     */
    layerTreeDidChange: function(layers)
    {
        this._layerTreeModel._layerTreeChanged(layers);
    },

    /**
     * @param {!LayerTreeAgent.LayerId} layerId
     * @param {!DOMAgent.Rect} clipRect
     */
    layerPainted: function(layerId, clipRect)
    {
        this._layerTreeModel._layerPainted(layerId, clipRect);
    }
}
