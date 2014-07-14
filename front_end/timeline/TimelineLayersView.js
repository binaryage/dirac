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
        this._deferredLayerTree = deferredLayerTree;
        this._paints = paints;
        if (this.isShowing())
            this._update();
        else
            this._updateWhenVisible = true;
    },

    wasShown: function()
    {
        if (this._updateWhenVisible) {
            this._updateWhenVisible = false;
            this._update();
        }
    },

    _update: function()
    {
        var layerTree;

        this._weakTarget = this._deferredLayerTree.weakTarget();
        var originalTiles = this._paintTiles;
        var tilesReadyBarrier = new CallbackBarrier();
        this._deferredLayerTree.resolve(tilesReadyBarrier.createCallback(onLayersReady));
        var target = this._weakTarget.get();
        if (target) {
            for (var i = 0; this._paints && i < this._paints.length; ++i)
                WebInspector.PaintProfilerSnapshot.load(target, this._paints[i].picture, tilesReadyBarrier.createCallback(onSnapshotLoaded.bind(this, this._paints[i])));
        }
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
        this._toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
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
        this._toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
        this._layers3DView.hoverObject(activeObject);
    },

    /**
     * @param {?WebInspector.DOMNode} node
     */
    _toggleNodeHighlight: function(node)
    {
        if (node) {
            node.highlightForTwoSeconds();
            return;
        }
        var target = this._weakTarget.get();
        if (target)
            target.domModel.hideDOMNodeHighlight();

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
