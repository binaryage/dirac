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
    this._layersById = {};
    InspectorBackend.registerLayerTreeDispatcher(new WebInspector.LayerTreeDispatcher(this));
    LayerTreeAgent.enable();
}

WebInspector.LayerTreeModel.Events = {
    LayerTreeChanged: "LayerTreeChanged"
}

WebInspector.LayerTreeModel.prototype = {
    dispose: function()
    {
        LayerTreeAgent.disable();
    },

    /**
     * @return {WebInspector.Layer}
     */
    root: function()
    {
        return this._root;
    },

    /**
     * @param {function(WebInspector.Layer)} callback
     * @param {WebInspector.Layer=} root
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
     * @param {function()=} callback
     */
    requestLayers: function(callback)
    {
        if (!callback)
            callback = function() {}
        if (typeof this._root !== "undefined") {
            callback();
            return;
        }
        if (this._pendingRequestLayersCallbacks) {
            this._pendingRequestLayersCallbacks.push(callback);
            return;
        }
        this._pendingRequestLayersCallbacks = [];
        this._pendingRequestLayersCallbacks.push(callback);
        function onGetLayers(error, layers)
        {
            this._root = null;
            if (error) {
                console.error("LayerTreeAgent.getLayers(): " + error);
                return;
            }
            this._repopulate(layers);
            for (var i = 0; i < this._pendingRequestLayersCallbacks.length; ++i)
                this._pendingRequestLayersCallbacks[i]();
            delete this._pendingRequestLayersCallbacks;
        }
        function onDocumentAvailable()
        {
            LayerTreeAgent.getLayers(undefined, onGetLayers.bind(this))
        }
        WebInspector.domAgent.requestDocument(onDocumentAvailable.bind(this));
    },

    /**
     * @param{Array.<LayerTreeAgent.Layer>} payload
     */
    _repopulate: function(payload)
    {
        var oldLayersById = this._layersById;
        this._layersById = {};
        for (var i = 0; i < payload.length; ++i) {
            var layer = oldLayersById[payload[i].layerId];
            if (layer)
                layer._reset(payload[i]);
            else
                layer = new WebInspector.Layer(payload[i]);
            this._layersById[layer.id()] = layer;
            var parentId = layer.parentId();
            if (parentId)
                this._layersById[parentId].addChild(layer);
            else {
                if (this._root)
                    console.assert(false, "Multiple root layers");
                this._root = layer;
            }
        }
        this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerTreeChanged);
    },

    _layerTreeChanged: function()
    {
        delete this._root;
        this.requestLayers();
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {LayerTreeAgent.Layer} layerPayload
 */
WebInspector.Layer = function(layerPayload)
{
    this._reset(layerPayload);
}

WebInspector.Layer.prototype = {
    /**
     * @return {string?}
     */
    id: function()
    {
        return this._layerPayload.layerId;
    },

    /**
     * @return {string?}
     */
    parentId: function()
    {
        return this._layerPayload.parentLayerId;
    },

    /**
     * @return {WebInspector.Layer}
     */
    parent: function()
    {
        return this._parent;
    },

    isRoot: function()
    {
        return !!this.parentId();
    },

    children: function()
    {
        return this._children;
    },

    /**
     * @param {WebInspector.Layer} child
     */
    addChild: function(child)
    {
        if (child._parent)
            console.assert(false, "Child already has a parent");
        this._children.push(child);
        child._parent = this;
    },

    nodeIdForSelfOrAncestor: function()
    {
        for (var layer = this; layer; layer = layer._parent) {
            var nodeId = layer._layerPayload["nodeId"];
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
     * @param {LayerTreeAgent.Layer} layerPayload
     */
    _reset: function(layerPayload)
    {
        this._children = [];
        this._parent = null;
        this._layerPayload = layerPayload;
    }
}

/**
 * @constructor
 * @implements {LayerTreeAgent.Dispatcher}
 * @param {WebInspector.LayerTreeModel} layerTreeModel
 */
WebInspector.LayerTreeDispatcher = function(layerTreeModel)
{
    this._layerTreeModel = layerTreeModel;
}

WebInspector.LayerTreeDispatcher.prototype = {
    layerTreeDidChange: function()
    {
        this._layerTreeModel._layerTreeChanged();
    }
}
