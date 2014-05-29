// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.App}
 */
WebInspector.AdvancedApp = function()
{
    WebInspector.App.call(this);
};

WebInspector.AdvancedApp.prototype = {
    createGlobalStatusBarItems: function()
    {
        this.appendInspectStatusBarItem();

        if (WebInspector.experimentsSettings.responsiveDesign.isEnabled()) {
            this._toggleResponsiveDesignButton = new WebInspector.StatusBarButton(WebInspector.UIString("Responsive design mode."), "responsive-design-status-bar-item");
            this._toggleResponsiveDesignButton.toggled = WebInspector.settings.responsiveDesignMode.get();
            this._toggleResponsiveDesignButton.addEventListener("click", this._toggleResponsiveDesign, this);
            WebInspector.inspectorView.appendToLeftToolbar(this._toggleResponsiveDesignButton.element);
            WebInspector.settings.responsiveDesignMode.addChangeListener(this._responsiveDesignModeChanged, this);
        }

        this.appendSettingsStatusBarItem();
        WebInspector.inspectorView.appendToRightToolbar(/** @type {!Element} */ (WebInspector.dockController.element));
    },

    _toggleResponsiveDesign: function()
    {
        WebInspector.settings.responsiveDesignMode.set(!this._toggleResponsiveDesignButton.toggled);
    },

    _responsiveDesignModeChanged: function()
    {
        this._toggleResponsiveDesignButton.toggled = WebInspector.settings.responsiveDesignMode.get();
    },

    createRootView: function()
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, WebInspector.dockController.canDock() ? "InspectorView.splitViewState" : "InspectorView.dummySplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);

        WebInspector.inspectorView.show(this._rootSplitView.sidebarElement());

        this._inspectedPagePlaceholder = new WebInspector.InspectedPagePlaceholder();
        this._inspectedPagePlaceholder.addEventListener(WebInspector.InspectedPagePlaceholder.Events.Update, this._onSetInspectedPageBounds, this);
        if (WebInspector.experimentsSettings.responsiveDesign.isEnabled()) {
            var responsiveDesignView = new WebInspector.ResponsiveDesignView(this._inspectedPagePlaceholder);
            responsiveDesignView.show(this._rootSplitView.mainElement());
        } else
            this._inspectedPagePlaceholder.show(this._rootSplitView.mainElement());

        WebInspector.dockController.addEventListener(WebInspector.DockController.Events.BeforeDockSideChanged, this._onBeforeDockSideChange, this);
        WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._onDockSideChange, this);
        WebInspector.dockController.addEventListener(WebInspector.DockController.Events.AfterDockSideChanged, this._onAfterDockSideChange, this);
        this._onDockSideChange();

        rootView.attachToBody();
    },

    _onBeforeDockSideChange: function()
    {
        this._changingDockSide = true;
    },

    _onDockSideChange: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide === WebInspector.DockController.State.Undocked) {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }

        this._rootSplitView.setVertical(dockSide === WebInspector.DockController.State.DockedToLeft || dockSide === WebInspector.DockController.State.DockedToRight);
        this._rootSplitView.setSecondIsSidebar(dockSide === WebInspector.DockController.State.DockedToRight || dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.showBoth();
    },

    _onAfterDockSideChange: function()
    {
        this._changingDockSide = false;
        this._inspectedPagePlaceholder.update();
    },

    _isDocked: function()
    {
        return WebInspector.dockController.dockSide() !== WebInspector.DockController.State.Undocked;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSetInspectedPageBounds: function(event)
    {
        if (this._changingDockSide || !this._isDocked())
            return;
        var bounds = /** @type {{x: number, y: number, width: number, height: number}} */ (event.data);
        InspectorFrontendHost.setInspectedPageBounds(bounds);
    },

    __proto__: WebInspector.App.prototype
};
