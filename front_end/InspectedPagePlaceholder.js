// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.InspectedPagePlaceholder = function()
{
    WebInspector.View.call(this);
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    this._margins = { top: false, right: false, bottom: false, left: false };
};

WebInspector.InspectedPagePlaceholder.Constraints = {
    Width: 50,
    Height: 50
};

WebInspector.InspectedPagePlaceholder.MarginValue = 3;

WebInspector.InspectedPagePlaceholder.prototype = {
    _findMargins: function()
    {
        var margins = { top: false, right: false, bottom: false, left: false };
        var adjacent = { top: true, right: true, bottom: true, left: true};
        var view = this;
        while (view.parentView()) {
            var parent = view.parentView();
            // This view assumes it's always inside the main split view element, not a sidebar.
            // Every parent which is not a split view, must be of the same size as this view.
            if (parent instanceof WebInspector.SplitView) {
                var side = parent.sidebarSide();
                if (adjacent[side] && !parent.hasCustomResizer())
                    margins[side] = true;
                adjacent[side] = false;
            }
            view = parent;
        }

        if (this._margins.top !== margins.top || this._margins.left !== margins.left || this._margins.right !== margins.right || this._margins.bottom !== margins.bottom) {
            this._margins = margins;
            this._updateMarginValue();
        }
    },

    _updateMarginValue: function()
    {
        var marginValue = Math.round(WebInspector.InspectedPagePlaceholder.MarginValue / WebInspector.zoomManager.zoomFactor()) + "px ";
        var margins = this._margins.top ? marginValue : "0 ";
        margins += this._margins.right ? marginValue : "0 ";
        margins += this._margins.bottom ? marginValue : "0 ";
        margins += this._margins.left ? marginValue : "0 ";
        this.element.style.margin = margins;
    },

    _onZoomChanged: function()
    {
        this._updateMarginValue();
        this._scheduleUpdate();
    },

    onResize: function()
    {
        this._findMargins();
        this._scheduleUpdate();
    },

    _scheduleUpdate: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide !== WebInspector.DockController.State.Undocked) {
            if (this._updateId)
                window.cancelAnimationFrame(this._updateId);
            this._updateId = window.requestAnimationFrame(this._update.bind(this));
        }
    },

    _update: function()
    {
        delete this._updateId;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();

        var marginValue = Math.round(WebInspector.InspectedPagePlaceholder.MarginValue / zoomFactor);
        var insets = {
            top: this._margins.top ? marginValue : 0,
            left: this._margins.left ? marginValue : 0,
            right: this._margins.right ? marginValue : 0,
            bottom: this._margins.bottom ? marginValue : 0};

        var minSize = {
            width: WebInspector.InspectedPagePlaceholder.Constraints.Width - Math.round(insets.left * zoomFactor) - Math.round(insets.right * zoomFactor),
            height: WebInspector.InspectedPagePlaceholder.Constraints.Height - Math.round(insets.top * zoomFactor) - Math.round(insets.bottom * zoomFactor)};

        // This view assumes it's always inside the main split view element, not a sidebar.
        var view = this;
        while (view) {
            if ((view instanceof WebInspector.SplitView) && view.sidebarSide())
                insets[view.sidebarSide()] += view.preferredSidebarSize();
            view = view.parentView();
        }

        var zoomedInsets = {
            top: Math.round(insets.top * zoomFactor),
            left: Math.round(insets.left * zoomFactor),
            bottom: Math.round(insets.bottom * zoomFactor),
            right: Math.round(insets.right * zoomFactor)};

        InspectorFrontendHost.setContentsResizingStrategy(zoomedInsets, minSize);
    },

    __proto__: WebInspector.View.prototype
};
