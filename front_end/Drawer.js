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
 * @implements {WebInspector.ViewFactory}
 * @param {!WebInspector.InspectorView} inspectorView
 */
WebInspector.Drawer = function(inspectorView)
{
    this._inspectorView = inspectorView;

    this.element = this._inspectorView.element.createChild("div", "drawer");
    this.element.style.flexBasis = 0;

    this._savedHeight = 200; // Default.

    this._drawerContentsElement = this.element.createChild("div");
    this._drawerContentsElement.id = "drawer-contents";

    this._toggleDrawerButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show drawer."), "console-status-bar-item");
    this._toggleDrawerButton.addEventListener("click", this.toggle, this);

    this._viewFactories = [];
    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.closeableTabs = false;
    this._tabbedPane.markAsRoot();

    // Register console early for it to be the first in the list.
    this.registerView("console", WebInspector.UIString("Console"), this);

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._updateTabStrip, this);
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    WebInspector.installDragHandle(this._tabbedPane.headerElement(), this._startStatusBarDragging.bind(this), this._statusBarDragging.bind(this), this._endStatusBarDragging.bind(this), "row-resize");
    this._tabbedPane.element.createChild("div", "drawer-resizer");
    this._showDrawerOnLoadSetting = WebInspector.settings.createSetting("WebInspector.Drawer.showOnLoad", false);
    this._lastSelectedViewSetting = WebInspector.settings.createSetting("WebInspector.Drawer.lastSelectedView", "console");
}

WebInspector.Drawer.prototype = {
    /**
     * @return {!Element}
     */
    toggleButtonElement: function()
    {
        return this._toggleDrawerButton.element;
    },

    _constrainHeight: function(height)
    {
        return Number.constrain(height, Preferences.minConsoleHeight, this._inspectorView.element.offsetHeight - Preferences.minConsoleHeight);
    },

    isHiding: function()
    {
        return this._isHiding;
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
     * @param {string} title
     * @param {!WebInspector.ViewFactory} factory
     */
    registerView: function(id, title, factory)
    {
        if (this._tabbedPane.hasTab(id))
            this._tabbedPane.closeTab(id);
        this._viewFactories[id] = factory;
        this._tabbedPane.appendTab(id, title, new WebInspector.View());
    },

    /**
     * @param {string} id
     */
    unregisterView: function(id)
    {
        if (this._tabbedPane.hasTab(id))
            this._tabbedPane.closeTab(id);
        delete this._viewFactories[id];
    },

    /**
     * @param {string=} id
     * @return {?WebInspector.View}
     */
    createView: function(id)
    {
        return WebInspector.panel("console").createView(id);
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
     * @param {boolean=} immediately
     */
    showView: function(id, immediately)
    {
        if (!this._toggleDrawerButton.enabled())
            return;
        if (this._viewFactories[id])
            this._tabbedPane.changeTabView(id, this._viewFactories[id].createView(id));
        this._innerShow(immediately);
        this._tabbedPane.selectTab(id, true);
        this._updateTabStrip();
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
        this._updateTabStrip();
    },

    /**
     * @param {boolean=} immediately
     */
    show: function(immediately)
    {
        this.showView(this._tabbedPane.selectedTabId, immediately);
    },

    showOnLoadIfNecessary: function()
    {
        if (this._showDrawerOnLoadSetting.get())
            this.showView(this._lastSelectedViewSetting.get(), true);
    },

    /**
     * @param {boolean=} immediately
     */
    _innerShow: function(immediately)
    {
        this._immediatelyFinishAnimation();

        if (this._toggleDrawerButton.toggled)
            return;
        this._showDrawerOnLoadSetting.set(true);
        this._toggleDrawerButton.toggled = true;
        this._toggleDrawerButton.title = WebInspector.UIString("Hide drawer.");

        document.body.addStyleClass("drawer-visible");
        this._tabbedPane.show(this._drawerContentsElement);

        var height = this._constrainHeight(this._savedHeight);
        var animations = [
            {element: this.element, start: {"flex-basis": 23}, end: {"flex-basis": height}},
        ];

        function animationCallback(finished)
        {
            if (this._inspectorView.currentPanel())
                this._inspectorView.currentPanel().doResize();
            if (!finished)
                return;
            this._updateTabStrip();
            if (this._visibleView()) {
                // Get console content back
                this._tabbedPane.changeTabView(this._tabbedPane.selectedTabId, this._visibleView());
                if (this._visibleView().afterShow)
                    this._visibleView().afterShow();
            }
            delete this._currentAnimation;
        }

        this._currentAnimation = WebInspector.animateStyle(animations, this._animationDuration(immediately), animationCallback.bind(this));

        if (immediately)
            this._currentAnimation.forceComplete();
    },

    /**
     * @param {boolean=} immediately
     */
    hide: function(immediately)
    {
        this._immediatelyFinishAnimation();

        if (!this._toggleDrawerButton.toggled)
            return;
        this._showDrawerOnLoadSetting.set(false);
        this._toggleDrawerButton.toggled = false;
        this._toggleDrawerButton.title = WebInspector.UIString("Show console.");

        this._isHiding = true;
        this._savedHeight = this.element.offsetHeight;

        WebInspector.restoreFocusFromElement(this.element);

        // Temporarily set properties and classes to mimic the post-animation values so panels
        // like Elements in their updateStatusBarItems call will size things to fit the final location.
        document.body.removeStyleClass("drawer-visible");
        this._inspectorView.currentPanel().statusBarResized();
        document.body.addStyleClass("drawer-visible");

        var animations = [
            {element: this.element, start: {"flex-basis": this.element.offsetHeight }, end: {"flex-basis": 23}},
        ];

        function animationCallback(finished)
        {
            if (this._inspectorView.currentPanel())
                this._inspectorView.currentPanel().doResize();
            if (!finished)
                return;
            this._tabbedPane.detach();
            this._drawerContentsElement.removeChildren();
            document.body.removeStyleClass("drawer-visible");
            delete this._currentAnimation;
            delete this._isHiding;
        }

        this._currentAnimation = WebInspector.animateStyle(animations, this._animationDuration(immediately), animationCallback.bind(this));

        if (immediately)
            this._currentAnimation.forceComplete();
    },

    resize: function()
    {
        if (!this._toggleDrawerButton.toggled)
            return;

        this._visibleView().storeScrollPositions();
        var height = this._constrainHeight(this.element.offsetHeight);
        this.element.style.flexBasis = height + "px";
        this._tabbedPane.doResize();
    },

    _immediatelyFinishAnimation: function()
    {
        if (this._currentAnimation)
            this._currentAnimation.forceComplete();
    },

    /**
     * @param {boolean=} immediately
     * @return {number}
     */
    _animationDuration: function(immediately)
    {
        return immediately ? 0 : 50;
    },

    /**
     * @return {boolean}
     */
    _startStatusBarDragging: function(event)
    {
        if (!this._toggleDrawerButton.toggled || event.target !== this._tabbedPane.headerElement())
            return false;

        this._visibleView().storeScrollPositions();
        this._statusBarDragOffset = event.pageY - this.element.totalOffsetTop();
        return true;
    },

    _statusBarDragging: function(event)
    {
        var height = window.innerHeight - event.pageY + this._statusBarDragOffset;
        height = Number.constrain(height, Preferences.minConsoleHeight, this._inspectorView.element.offsetHeight - Preferences.minConsoleHeight);

        this.element.style.flexBasis = height + "px";
        if (this._inspectorView.currentPanel())
            this._inspectorView.currentPanel().doResize();
        this._tabbedPane.doResize();

        event.consume(true);
    },

    _endStatusBarDragging: function(event)
    {
        this._savedHeight = this.element.offsetHeight;
        delete this._statusBarDragOffset;

        event.consume();
    },

    /**
     * @return {!WebInspector.View} view
     */
    _visibleView: function()
    {
        return this._tabbedPane.visibleView;
    },

    _updateTabStrip: function()
    {
        this._tabbedPane.onResize();
        this._tabbedPane.doResize();
    },

    _tabSelected: function()
    {
        var tabId = this._tabbedPane.selectedTabId;
        if (!this._tabbedPane.isTabCloseable(tabId))
            this._lastSelectedViewSetting.set(tabId);
        if (this._viewFactories[tabId])
            this._tabbedPane.changeTabView(tabId, this._viewFactories[tabId].createView(tabId));
    },

    toggle: function()
    {
        if (this._toggleDrawerButton.toggled)
            this.hide();
        else
            this.show();
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
    }
}
