/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.TimelineLayersView = function()
{
    WebInspector.VBox.call(this);
    this._layers3DView = new WebInspector.Layers3DView();
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectSelected, this._onObjectSelected, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectHovered, this._onObjectHovered, this);
    this._layers3DView.show(this.element);
}

WebInspector.TimelineLayersView.prototype = {
    /**
     * @param {!WebInspector.DeferredLayerTree} deferredLayerTree
     */
    showLayerTree: function(deferredLayerTree)
    {
        this._target = deferredLayerTree.target();
        deferredLayerTree.resolve(onLayersReady.bind(this));
        /**
         * @param {!WebInspector.LayerTreeBase} layerTree
         * @this {WebInspector.TimelineLayersView} this
         */
        function onLayersReady(layerTree)
        {
            this._layers3DView.setLayerTree(layerTree);
        }
    },

    /**
     * @param {?WebInspector.Layers3DView.ActiveObject} activeObject
     */
    _selectObject: function(activeObject)
    {
        var layer = activeObject && activeObject.layer;
        if (this._currentlySelectedLayer === activeObject)
            return;
        this._currentlySelectedLayer = activeObject;
        var node = layer ? layer.nodeForSelfOrAncestor() : null;
        if (node)
            node.highlightForTwoSeconds();
        else
            this._target.domModel.hideDOMNodeHighlight();
        this._layers3DView.selectObject(activeObject);
    },

    /**
     * @param {?WebInspector.Layers3DView.ActiveObject} activeObject
     */
    _hoverObject: function(activeObject)
    {
        var layer = activeObject && activeObject.layer;
        if (this._currentlyHoveredLayer === activeObject)
            return;
        this._currentlyHoveredLayer = activeObject;
        var node = layer ? layer.nodeForSelfOrAncestor() : null;
        if (node)
            node.highlight();
        else
            this._target.domModel.hideDOMNodeHighlight();
        this._layers3DView.hoverObject(activeObject);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onObjectSelected: function(event)
    {
        var activeObject = /** @type {!WebInspector.Layers3DView.ActiveObject} */ (event.data);
        this._selectObject(activeObject);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onObjectHovered: function(event)
    {
        var activeObject = /** @type {!WebInspector.Layers3DView.ActiveObject} */ (event.data);
        this._hoverObject(activeObject);
    },

    __proto__: WebInspector.VBox.prototype
}
