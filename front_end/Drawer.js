/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {!WebInspector.SplitView} splitView
 */
WebInspector.Drawer = function(splitView)
{
    WebInspector.View.call(this);
    this.element.id = "drawer-contents";

    this._splitView = splitView;
    splitView.hideDefaultResizer();
    this.show(splitView.sidebarElement());

    this._drawerEditorSplitView = new WebInspector.SplitView(true, true, "editorInDrawerSplitViewState", 0.5, 0.5);
    this._drawerEditorSplitView.hideSidebar();
    this._drawerEditorSplitView.addEventListener(WebInspector.SplitView.Events.ShowModeChanged, this._drawerEditorSplitViewShowModeChanged, this);
    this._drawerEditorShownSetting = WebInspector.settings.createSetting("drawerEditorShown", true);
    this._drawerEditorSplitView.show(this.element);

    this._toggleDrawerButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show drawer."), "console-status-bar-item");
    this._toggleDrawerButton.addEventListener("click", this.toggle, this);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.element.id = "drawer-tabbed-pane";
    this._tabbedPane.closeableTabs = false;
    this._tabbedPane.setRetainTabOrder(true, WebInspector.moduleManager.orderComparator(WebInspector.Drawer.ViewFactory, "name", "order"));

    this._toggleDrawerEditorButton = this._drawerEditorSplitView.createShowHideSidebarButton("editor in drawer", "drawer-editor-show-hide-button");
    this._tabbedPane.element.appendChild(this._toggleDrawerEditorButton.element);
    if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
        this.setDrawerEditorAvailable(false);

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    splitView.installResizer(this._tabbedPane.headerElement());
    this._lastSelectedViewSetting = WebInspector.settings.createSetting("WebInspector.Drawer.lastSelectedView", "console");
    this._initializeViewFactories();
}

WebInspector.Drawer.prototype = {
    _initializeViewFactories: function()
    {
        this._viewFactories = {};
        var extensions = WebInspector.moduleManager.extensions(WebInspector.Drawer.ViewFactory);

        for (var i = 0; i < extensions.length; ++i) {
            var descriptor = extensions[i].descriptor();
            var id = descriptor["name"];
            var title = WebInspector.UIString(descriptor["title"]);
            var settingName = descriptor["setting"];
            var setting = settingName ? /** @type {!WebInspector.Setting|undefined} */ (WebInspector.settings[settingName]) : null;

            this._viewFactories[id] = extensions[i];

            if (setting) {
                setting.addChangeListener(this._toggleSettingBasedView.bind(this, id, title, setting));
                if (setting.get())
                    this._tabbedPane.appendTab(id, title, new WebInspector.View());
            } else {
                this._tabbedPane.appendTab(id, title, new WebInspector.View());
            }
        }
        this._tabbedPane.show(this._drawerEditorSplitView.mainElement());
    },

    /**
     * @param {string} id
     * @param {string} title
     * @param {!WebInspector.Setting} setting
     */
    _toggleSettingBasedView: function(id, title, setting)
    {
        this._tabbedPane.closeTab(id);
        if (setting.get())
            this._tabbedPane.appendTab(id, title, new WebInspector.View());
    },

    /**
     * @return {!Element}
     */
    toggleButtonElement: function()
    {
        return this._toggleDrawerButton.element;
    },

    /**
     * @param {string} id
     */
    closeView: function(id)
    {
        this._tabbedPane.closeTab(id);
    },

    /**
     * @param {string} id
     * @param {boolean=} immediate
     */
    showView: function(id, immediate)
    {
        if (!this._tabbedPane.hasTab(id)) {
            // Hidden tab.
            this._innerShow(immediate);
            return;
        }
        var viewFactory = this._viewFactory(id);
        if (viewFactory)
            this._tabbedPane.changeTabView(id, viewFactory.createView());
        this._innerShow(immediate);
        this._tabbedPane.selectTab(id, true);
        // In case this id is already selected, anyways persist it as the last saved value.
        this._lastSelectedViewSetting.set(id);
    },

    /**
     * @param {string} id
     * @param {string} title
     * @param {!WebInspector.View} view
     */
    showCloseableView: function(id, title, view)
    {
        if (!this._tabbedPane.hasTab(id)) {
            this._tabbedPane.appendTab(id, title, view, undefined, false, true);
        } else {
            this._tabbedPane.changeTabView(id, view);
            this._tabbedPane.changeTabTitle(id, title);
        }
        this._innerShow();
        this._tabbedPane.selectTab(id, true);
    },

    showDrawer: function()
    {
        this.showView(this._lastSelectedViewSetting.get());
    },

    wasShown: function()
    {
        this.showView(this._lastSelectedViewSetting.get());
        this._toggleDrawerButton.toggled = true;
        this._toggleDrawerButton.title = WebInspector.UIString("Hide drawer.");
        this._ensureDrawerEditorExistsIfNeeded();
    },

    willHide: function()
    {
        this._toggleDrawerButton.toggled = false;
        this._toggleDrawerButton.title = WebInspector.UIString("Show drawer.");
    },

    /**
     * @param {boolean=} immediate
     */
    _innerShow: function(immediate)
    {
        if (this.isShowing())
            return;

        this._splitView.showBoth(!immediate);

        if (this._visibleView())
            this._visibleView().focus();
    },

    closeDrawer: function()
    {
        if (!this.isShowing())
            return;

        WebInspector.restoreFocusFromElement(this.element);
        this._splitView.hideSidebar(true);
    },

    /**
     * @return {!WebInspector.View} view
     */
    _visibleView: function()
    {
        return this._tabbedPane.visibleView;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        var tabId = this._tabbedPane.selectedTabId;
        if (event.data["isUserGesture"] && !this._tabbedPane.isTabCloseable(tabId))
            this._lastSelectedViewSetting.set(tabId);
        var viewFactory = this._viewFactory(tabId);
        if (viewFactory)
            this._tabbedPane.changeTabView(tabId, viewFactory.createView());
    },

    toggle: function()
    {
        if (this._toggleDrawerButton.toggled)
            this.closeDrawer();
        else
            this.showDrawer();
    },

    /**
     * @return {boolean}
     */
    visible: function()
    {
        return this._toggleDrawerButton.toggled;
    },

    /**
     * @return {string}
     */
    selectedViewId: function()
    {
        return this._tabbedPane.selectedTabId;
    },

    /**
     * @return {?WebInspector.Drawer.ViewFactory}
     */
    _viewFactory: function(id)
    {
        return this._viewFactories[id] ? /** @type {!WebInspector.Drawer.ViewFactory} */ (this._viewFactories[id].instance()) : null;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _drawerEditorSplitViewShowModeChanged: function(event)
    {
        var mode = /** @type {string} */ (event.data);
        var shown = mode === WebInspector.SplitView.ShowMode.Both;

        if (this._isHidingDrawerEditor)
            return;

        this._drawerEditorShownSetting.set(shown);

        if (!shown)
            return;

        this._ensureDrawerEditor();
        this._drawerEditor.view().show(this._drawerEditorSplitView.sidebarElement());
    },

    initialPanelShown: function()
    {
        this._initialPanelWasShown = true;
        this._ensureDrawerEditorExistsIfNeeded();
    },

    _ensureDrawerEditorExistsIfNeeded: function()
    {
        if (!this._initialPanelWasShown || !this.isShowing() || !this._drawerEditorShownSetting.get() || !WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            return;
        this._ensureDrawerEditor();
    },

    _ensureDrawerEditor: function()
    {
        if (this._drawerEditor)
            return;
        this._drawerEditor = WebInspector.moduleManager.instance(WebInspector.DrawerEditor);
        this._drawerEditor.installedIntoDrawer();
    },

    /**
     * @param {boolean} available
     */
    setDrawerEditorAvailable: function(available)
    {
        if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            available = false;
        this._toggleDrawerEditorButton.element.classList.toggle("hidden", !available);
    },

    showDrawerEditor: function()
    {
        if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            return;

        this._splitView.showBoth();
        this._drawerEditorSplitView.showBoth();
    },

    hideDrawerEditor: function()
    {
        this._isHidingDrawerEditor = true;
        this._drawerEditorSplitView.hideSidebar();
        this._isHidingDrawerEditor = false;
    },

    /**
     * @return {boolean}
     */
    isDrawerEditorShown: function()
    {
        return this._drawerEditorShownSetting.get();
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @interface
 */
WebInspector.Drawer.ViewFactory = function()
{
}

WebInspector.Drawer.ViewFactory.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    createView: function() {}
}

/**
 * @constructor
 * @implements {WebInspector.Drawer.ViewFactory}
 * @param {function(new:T)} constructor
 * @template T
 */
WebInspector.Drawer.SingletonViewFactory = function(constructor)
{
    this._constructor = constructor;
}

WebInspector.Drawer.SingletonViewFactory.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    createView: function()
    {
        if (!this._instance)
            this._instance = /** @type {!WebInspector.View} */(new this._constructor());
        return this._instance;
    }
}

/**
 * @interface
 */
WebInspector.DrawerEditor = function()
{
}

WebInspector.DrawerEditor.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    view: function() { },

    installedIntoDrawer: function() { },
}
