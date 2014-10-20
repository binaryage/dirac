/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.SplitView}
 */
WebInspector.TimelineLayersView = function()
{
    WebInspector.SplitView.call(this, true, false, "timelineLayersView");
    this._rightSplitView = new WebInspector.SplitView(true, true, "timelineLayersViewDetails");
    this._rightSplitView.show(this.mainElement());

    this._paintTiles = [];

    this.sidebarElement().classList.add("outline-disclosure", "layer-tree");
    var sidebarTreeElement = this.sidebarElement().createChild("ol");
    var treeOutline = new TreeOutline(sidebarTreeElement);
    this._layerTreeOutline = new WebInspector.LayerTreeOutline(treeOutline);
    this._layerTreeOutline.addEventListener(WebInspector.LayerTreeOutline.Events.LayerSelected, this._onObjectSelected, this);
    this._layerTreeOutline.addEventListener(WebInspector.LayerTreeOutline.Events.LayerHovered, this._onObjectHovered, this);

    this._layers3DView = new WebInspector.Layers3DView();
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectSelected, this._onObjectSelected, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectHovered, this._onObjectHovered, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.JumpToPaintEventRequested, this._jumpToPaintEvent, this);
    this._layers3DView.show(this._rightSplitView.mainElement());

    this._layerDetailsView = new WebInspector.LayerDetailsView();
    this._layerDetailsView.show(this._rightSplitView.sidebarElement());
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

    /**
     * @param {!WebInspector.TimelineModel} model
     * @param {!WebInspector.TimelineModeViewDelegate} delegate
     */
    setTimelineModelAndDelegate: function(model, delegate)
    {
        this._model = model;
        this._delegate = delegate;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _jumpToPaintEvent: function(event)
    {
        var traceEvent = event.data;
        var eventRecord;

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @return {boolean}
         */
        function findRecordWithEvent(record)
        {
            if (record.traceEvent() === traceEvent) {
                eventRecord = record;
                return true;
            }
            return false;
        }

        this._model.forAllRecords(findRecordWithEvent);
        if (eventRecord) {
            var selection = WebInspector.TimelineSelection.fromRecord(eventRecord);
            this._delegate.select(selection);
        }
    },

    _update: function()
    {
        var layerTree;

        this._target = this._deferredLayerTree.target();
        var originalTiles = this._paintTiles;
        var tilesReadyBarrier = new CallbackBarrier();
        this._deferredLayerTree.resolve(tilesReadyBarrier.createCallback(onLayersReady));
        for (var i = 0; this._paints && i < this._paints.length; ++i)
            this._paints[i].loadPicture(tilesReadyBarrier.createCallback(onSnapshotLoaded.bind(this, this._paints[i])));
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
         * @param {?Array.<number>} rect
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @this {WebInspector.TimelineLayersView}
         */
        function onSnapshotLoaded(paintEvent, rect, snapshot)
        {
            if (!rect || !snapshot)
                return;
            // We're too late and there's a new generation of tiles being loaded.
            if (originalTiles !== this._paintTiles) {
                snapshot.dispose();
                return;
            }
            this._paintTiles.push({layerId: paintEvent.layerId(), rect: rect, snapshot: snapshot, traceEvent: paintEvent.event()});
        }

        /**
         * @this {WebInspector.TimelineLayersView}
         */
        function onLayersAndTilesReady()
        {
            this._layerTreeOutline.update(layerTree);
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
        this._layerTreeOutline.selectLayer(layer);
        this._layers3DView.selectObject(activeObject);
        this._layerDetailsView.setObject(activeObject);
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
        this._layerTreeOutline.hoverLayer(layer);
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
        if (this._target)
            this._target.domModel.hideDOMNodeHighlight();

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

    __proto__: WebInspector.SplitView.prototype
}
