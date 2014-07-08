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

    this._paintTiles = [];
    this._layers3DView = new WebInspector.Layers3DView();
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectSelected, this._onObjectSelected, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectHovered, this._onObjectHovered, this);
    this._layers3DView.show(this.element);
}

WebInspector.TimelineLayersView.prototype = {
    /**
     * @param {!WebInspector.DeferredLayerTree} deferredLayerTree
     * @param {?Array.<!WebInspector.LayerPaintEvent>} paints
     */
    showLayerTree: function(deferredLayerTree, paints)
    {
        this._disposeTiles();
        if (!this.isShowing()) {
            this._pendingLayerTree = deferredLayerTree,
            this._pendingPaints = paints;
            return;
        }
        this._actuallyShowLayerTree(deferredLayerTree, paints);
    },

    wasShown: function()
    {
        if (!this._pendingLayerTree)
            return;
        this._actuallyShowLayerTree(this._pendingLayerTree, this._pendingPaints);
        this._pendingLayerTree = null;
        this._pendingPaints = null;
    },

    /**
     * @param {!WebInspector.DeferredLayerTree} deferredLayerTree
     * @param {?Array.<!WebInspector.LayerPaintEvent>} paints
     */
    _actuallyShowLayerTree: function(deferredLayerTree, paints)
    {
        var layerTree;

        this._target = deferredLayerTree.target();
        var originalTiles = this._paintTiles;
        var tilesReadyBarrier = new CallbackBarrier();
        deferredLayerTree.resolve(tilesReadyBarrier.createCallback(onLayersReady));
        for (var i = 0; paints && i < paints.length; ++i)
            WebInspector.PaintProfilerSnapshot.load(paints[i].picture, tilesReadyBarrier.createCallback(onSnapshotLoaded.bind(this, paints[i])));
        tilesReadyBarrier.callWhenDone(onLayersAndTilesReady.bind(this));

        /**
         * @param {!WebInspector.LayerTreeBase} resolvedLayerTree
         */
        function onLayersReady(resolvedLayerTree)
        {
            layerTree = resolvedLayerTree;
        }

        /**
         * @param {!WebInspector.LayerPaintEvent} paintEvent
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @this {WebInspector.TimelineLayersView}
         */
        function onSnapshotLoaded(paintEvent, snapshot)
        {
            if (!snapshot)
                return;
            // We're too late and there's a new generation of tiles being loaded.
            if (originalTiles !== this._paintTiles) {
                snapshot.dispose();
                return;
            }
            this._paintTiles.push({layerId: paintEvent.layerId, rect: paintEvent.rect, snapshot: snapshot});
        }

        /**
         * @this {WebInspector.TimelineLayersView}
         */
        function onLayersAndTilesReady()
        {
            this._layers3DView.setLayerTree(layerTree);
            this._layers3DView.setTiles(this._paintTiles);
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

    _disposeTiles: function()
    {
        for (var i = 0; i < this._paintTiles.length; ++i)
            this._paintTiles[i].snapshot.dispose();
        this._paintTiles = [];
    },

    __proto__: WebInspector.VBox.prototype
}
