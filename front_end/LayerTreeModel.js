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
    InspectorBackend.registerLayerTreeDispatcher(new WebInspector.LayerTreeDispatcher(this));
    WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._onDocumentUpdated, this);
}

WebInspector.LayerTreeModel.Events = {
    LayerTreeChanged: "LayerTreeChanged",
    LayerPainted: "LayerPainted",
}

/**
 * @param {function(T)} clientCallback
 * @param {string} errorPrefix
 * @param {function(new:T,S)=} constructor
 * @param {T=} defaultValue
 * @return {function(?string, S)}
 * @template T,S
 */
WebInspector.LayerTreeModel._wrapCallback = function(clientCallback, errorPrefix, constructor, defaultValue)
{
    /**
     * @param {?string} error
     * @param {S} value
     * @template S
     */
    function callbackWrapper(error, value)
    {
        if (error) {
            console.error(errorPrefix + error);
            clientCallback(defaultValue);
            return;
        }
        if (constructor)
            clientCallback(new constructor(value));
        else
            clientCallback(value);
    }
    return callbackWrapper;
}

WebInspector.LayerTreeModel.prototype = {
    disable: function()
    {
        if (!this._enabled)
            return;
        this._enabled = false;
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
        WebInspector.domAgent.requestDocument(onDocumentAvailable.bind(this));
        function onDocumentAvailable()
        {
            // The agent might have been disabled while we were waiting for the document.
            if (!this._enabled)
                return;
            LayerTreeAgent.enable();
        }
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
     * @param {?WebInspector.Layer} root
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
     * @param {!Array.<!LayerTreeAgent.Layer>} payload
     */
    _repopulate: function(payload)
    {
        var oldLayersById = this._layersById;
        this._layersById = {};
        for (var i = 0; i < payload.length; ++i) {
            var layerId = payload[i].layerId;
            var layer = oldLayersById[layerId];
            if (layer)
                layer._reset(payload[i]);
            else
                layer = new WebInspector.Layer(payload[i]);
            this._layersById[layerId] = layer;
            var parentId = layer.parentId();
            if (!this._contentRoot && layer.nodeId())
                this._contentRoot = layer;
            var lastPaintRect = this._lastPaintRectByLayerId[layerId];
            if (lastPaintRect)
                layer._lastPaintRect = lastPaintRect;
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
     * @param {!Array.<!LayerTreeAgent.Layer>=} payload
     */
    _layerTreeChanged: function(payload)
    {
        this._root = null;
        this._contentRoot = null;
        // Payload will be null when not in the composited mode.
        if (payload)
            this._repopulate(payload);
        this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerTreeChanged);
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
     * @return {?DOMAgent.NodeId}
     */
    nodeId: function()
    {
        return this._layerPayload.nodeId;
    },

    /**
     * @return {?DOMAgent.NodeId}
     */
    nodeIdForSelfOrAncestor: function()
    {
        for (var layer = this; layer; layer = layer._parent) {
            var nodeId = layer._layerPayload.nodeId;
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
     * @param {function(!Array.<string>)} callback
     */
    requestCompositingReasons: function(callback)
    {
        var wrappedCallback = WebInspector.LayerTreeModel._wrapCallback(callback, "LayerTreeAgent.reasonsForCompositingLayer(): ", undefined, []);
        LayerTreeAgent.compositingReasons(this.id(), wrappedCallback);
    },

    /**
     * @param {function(!WebInspector.LayerSnapshot=)} callback
     */
    requestSnapshot: function(callback)
    {
        var wrappedCallback = WebInspector.LayerTreeModel._wrapCallback(callback, "LayerTreeAgent.makeSnapshot(): ", WebInspector.LayerSnapshot.bind(null, this));
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
    }
}

/**
 * @constructor
 * @param {!WebInspector.Layer} layer
 * @param {string} snapshotId
 */
WebInspector.LayerSnapshot = function(layer, snapshotId)
{
    this._id = snapshotId;
    this._layer = layer;
}

WebInspector.LayerSnapshot.prototype = {
    dispose: function()
    {
        LayerTreeAgent.releaseSnapshot(this._id);
    },

    /**
     * @param {?number} firstStep
     * @param {?number} lastStep
     * @param {function(string=)} callback
     */
    requestImage: function(firstStep, lastStep, callback)
    {
        var wrappedCallback = WebInspector.LayerTreeModel._wrapCallback(callback, "LayerTreeAgent.replaySnapshot(): ");
        LayerTreeAgent.replaySnapshot(this._id, firstStep || undefined, lastStep || undefined, wrappedCallback);
    },

    /**
     * @param {function(!Array.<!LayerTreeAgent.PaintProfile>=)} callback
     */
    profile: function(callback)
    {
        var wrappedCallback = WebInspector.LayerTreeModel._wrapCallback(callback, "LayerTreeAgent.profileSnapshot(): ");
        LayerTreeAgent.profileSnapshot(this._id, 5, 1, wrappedCallback);
    }
};

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
     * @param {!Array.<!LayerTreeAgent.Layer>=} payload
     */
    layerTreeDidChange: function(payload)
    {
        this._layerTreeModel._layerTreeChanged(payload);
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
