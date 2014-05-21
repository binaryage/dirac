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

importScript("LayerTreeOutline.js");
importScript("Layers3DView.js");
importScript("LayerDetailsView.js");
importScript("PaintProfilerView.js");
importScript("TransformController.js");

/**
 * @constructor
 * @extends {WebInspector.PanelWithSidebarTree}
 */
WebInspector.LayersPanel = function()
{
    WebInspector.PanelWithSidebarTree.call(this, "layers", 225);
    this.registerRequiredCSS("layersPanel.css");

    this.sidebarElement().classList.add("outline-disclosure");
    this.sidebarTree.element.classList.remove("sidebar-tree");

    this._target = /** @type {!WebInspector.Target} */ (WebInspector.targetManager.activeTarget());
    this._model = new WebInspector.LayerTreeModel(this._target);
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerTreeChanged, this._onLayerTreeUpdated, this);
    this._model.addEventListener(WebInspector.LayerTreeModel.Events.LayerPainted, this._onLayerPainted, this);
    this._currentlySelectedLayer = null;
    this._currentlyHoveredLayer = null;

    this._layerTreeOutline = new WebInspector.LayerTreeOutline(this.sidebarTree);
    this._layerTreeOutline.addEventListener(WebInspector.LayerTreeOutline.Events.LayerSelected, this._onObjectSelected, this);
    this._layerTreeOutline.addEventListener(WebInspector.LayerTreeOutline.Events.LayerHovered, this._onObjectHovered, this);

    this._rightSplitView = new WebInspector.SplitView(false, true, "layerDetailsSplitViewState");
    this._rightSplitView.show(this.mainElement());

    this._layers3DView = new WebInspector.Layers3DView();
    this._layers3DView.show(this._rightSplitView.mainElement());
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectSelected, this._onObjectSelected, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.ObjectHovered, this._onObjectHovered, this);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.LayerSnapshotRequested, this._onSnapshotRequested, this);
    this._layers3DView.registerShortcuts(this.registerShortcuts.bind(this));

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.show(this._rightSplitView.sidebarElement());

    this._layerDetailsView = new WebInspector.LayerDetailsView();
    this._layerDetailsView.addEventListener(WebInspector.LayerDetailsView.Events.ObjectSelected, this._onObjectSelected, this);
    this._tabbedPane.appendTab(WebInspector.LayersPanel.DetailsViewTabs.Details, WebInspector.UIString("Details"), this._layerDetailsView);
    this._paintProfilerView = new WebInspector.PaintProfilerView(this._model, this._layers3DView);
    this._tabbedPane.appendTab(WebInspector.LayersPanel.DetailsViewTabs.Profiler, WebInspector.UIString("Profiler"), this._paintProfilerView);
}

/** @typedef {{layer: !WebInspector.Layer, scrollRectIndex: number}|{layer: !WebInspector.Layer}} */
WebInspector.LayersPanel.ActiveObject;

WebInspector.LayersPanel.DetailsViewTabs = {
    Details: "details",
    Profiler: "profiler"
};

WebInspector.LayersPanel.prototype = {
    wasShown: function()
    {
        WebInspector.Panel.prototype.wasShown.call(this);
        this.sidebarTree.element.focus();
        this._model.enable();
    },

    willHide: function()
    {
        this._model.disable();
        WebInspector.Panel.prototype.willHide.call(this);
    },

    /**
     * @param {!WebInspector.LayerTreeSnapshot} snapshot
     */
    _showSnapshot: function(snapshot)
    {
        var layerTree = new WebInspector.AgentLayerTree(this._target);
        layerTree.setLayers(snapshot.layers, onLayersSet.bind(this));
        /**
         * @this {WebInspector.LayersPanel} this
         */
        function onLayersSet()
        {
            this._model.setLayerTree(layerTree);
        }
    },

    /**
     * @param {!WebInspector.TracingLayerSnapshot} snapshot
     */
    _showTracingSnapshot: function(snapshot)
    {
        var layerTree = new WebInspector.TracingLayerTree(this._target);
        layerTree.setLayers(snapshot.root, onLayersSet.bind(this));
        /**
         * @this {WebInspector.LayersPanel} this
         */
        function onLayersSet()
        {
            this._model.setLayerTree(layerTree);
        }
    },

    _onLayerTreeUpdated: function()
    {
        var layerTree = this._model.layerTree();
        this._layers3DView.setLayerTree(layerTree);
        this._layerTreeOutline.update(layerTree);
        if (this._currentlySelectedLayer && (!layerTree || !layerTree.layerById(this._currentlySelectedLayer.layer.id())))
            this._selectObject(null);
        if (this._currentlyHoveredLayer && (!layerTree || !layerTree.layerById(this._currentlyHoveredLayer.layer.id())))
            this._hoverObject(null);
        this._layerDetailsView.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLayerPainted: function(event)
    {
        this._layers3DView.setLayerTree(this._model.layerTree());
        if (this._currentlySelectedLayer && this._currentlySelectedLayer.layer === event.data)
            this._layerDetailsView.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onObjectSelected: function(event)
    {
        var activeObject = /** @type {!WebInspector.LayersPanel.ActiveObject} */ (event.data);
        this._selectObject(activeObject);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onObjectHovered: function(event)
    {
        var activeObject = /** @type {!WebInspector.LayersPanel.ActiveObject} */ (event.data);
        this._hoverObject(activeObject);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSnapshotRequested: function(event)
    {
        var layer = /** @type {!WebInspector.Layer} */ (event.data);
        this._tabbedPane.selectTab(WebInspector.LayersPanel.DetailsViewTabs.Profiler);
        this._paintProfilerView.profile(layer);
    },

    /**
     * @param {?WebInspector.LayersPanel.ActiveObject} activeObject
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
        this._layerTreeOutline.selectLayer(layer);
        this._layers3DView.selectObject(activeObject);
        this._layerDetailsView.setObject(activeObject);
    },

    /**
     * @param {?WebInspector.LayersPanel.ActiveObject} activeObject
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
        this._layerTreeOutline.hoverLayer(layer);
        this._layers3DView.hoverObject(activeObject);
    },

    __proto__: WebInspector.PanelWithSidebarTree.prototype
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.LayersPanel.LayerTreeRevealer = function()
{
}

WebInspector.LayersPanel.LayerTreeRevealer.prototype = {
    /**
     * @param {!Object} snapshotData
     */
    reveal: function(snapshotData)
    {
        if (snapshotData instanceof WebInspector.LayerTreeSnapshot)
            /** @type {!WebInspector.LayersPanel} */ (WebInspector.inspectorView.showPanel("layers"))._showSnapshot(snapshotData);
        else if (snapshotData instanceof WebInspector.TracingLayerSnapshot)
            /** @type {!WebInspector.LayersPanel} */ (WebInspector.inspectorView.showPanel("layers"))._showTracingSnapshot(snapshotData);
    }
}
