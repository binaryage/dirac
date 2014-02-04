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
    splitView.hideSidebar();

    this._toggleDrawerButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show drawer."), "console-status-bar-item");
    this._toggleDrawerButton.addEventListener("click", this.toggle, this);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.closeableTabs = false;
    this._tabbedPane.setRetainTabOrder(true, WebInspector.moduleManager.orderComparator(WebInspector.Drawer.ViewFactory, "name", "order"));

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    splitView.installResizer(this._tabbedPane.headerElement());
    this._showDrawerOnLoadSetting = WebInspector.settings.createSetting("WebInspector.Drawer.showOnLoad", false);
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
        this._tabbedPane.show(this.element);
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
     * @param {string} tabId
     * @param {string} title
     * @param {!WebInspector.View} view
     */
    _addView: function(tabId, title, view)
    {
        if (!this._tabbedPane.hasTab(tabId)) {
            this._tabbedPane.appendTab(tabId, title, view,  undefined, false);
        } else {
            this._tabbedPane.changeTabTitle(tabId, title);
            this._tabbedPane.changeTabView(tabId, view);
        }
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
        if (!this._toggleDrawerButton.enabled())
            return;
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
        if (!this._toggleDrawerButton.enabled())
            return;
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

    showOnLoadIfNecessary: function()
    {
        if (this._showDrawerOnLoadSetting.get())
            this.showView(this._lastSelectedViewSetting.get(), true);
    },

    /**
     * @param {boolean=} immediate
     */
    _innerShow: function(immediate)
    {
        if (this._toggleDrawerButton.toggled)
            return;

        this._showDrawerOnLoadSetting.set(true);
        this._toggleDrawerButton.toggled = true;
        this._toggleDrawerButton.title = WebInspector.UIString("Hide drawer.");

        this._splitView.showBoth(!immediate);

        if (this._visibleView())
            this._visibleView().focus();
    },

    closeDrawer: function()
    {
        if (!this._toggleDrawerButton.toggled)
            return;
        this._showDrawerOnLoadSetting.set(false);
        this._toggleDrawerButton.toggled = false;
        this._toggleDrawerButton.title = WebInspector.UIString("Show console.");

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
