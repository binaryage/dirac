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
 */
WebInspector.Drawer = function()
{
    this.element = document.getElementById("drawer");
    this.element.style.height = 0;

    this._savedHeight = 200; // Default.
    this._mainElement = document.getElementById("main");
    this._toolbarElement = document.getElementById("toolbar");

    this._drawerContentsElement = this.element.createChild("div");
    this._drawerContentsElement.id = "drawer-contents";

    this._footerElementContainer = this.element.createChild("div", "status-bar hidden");
    this._footerElementContainer.id = "drawer-footer";

    this._toggleDrawerButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show drawer."), "console-status-bar-item");
    this._toggleDrawerButton.addEventListener("click", this.toggle, this);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.closeableTabs = false;
    this._tabbedPane.markAsRoot();
    this._addView("console", WebInspector.UIString("Console"), WebInspector.consoleView, false);

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._updateTabStrip, this);
    WebInspector.installDragHandle(this._tabbedPane.headerElement(), this._startStatusBarDragging.bind(this), this._statusBarDragging.bind(this), this._endStatusBarDragging.bind(this), "row-resize");
    this._tabbedPane.element.createChild("div", "drawer-resizer");
}

WebInspector.Drawer.prototype = {
    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        this._toggleDrawerButton.setEnabled(enabled);
    },

    /**
     * @return {Element}
     */
    toggleButtonElement: function()
    {
        return this._toggleDrawerButton.element;
    },

    _constrainHeight: function(height)
    {
        return Number.constrain(height, Preferences.minConsoleHeight, window.innerHeight - this._mainElement.totalOffsetTop() - Preferences.minConsoleHeight);
    },

    isHiding: function()
    {
        return this._isHiding;
    },

    /**
     * @param {string} tabId
     * @param {string} title
     * @param {WebInspector.View} view
     * @param {boolean=} closeable
     */
    _addView: function(tabId, title, view, closeable)
    {
        if (!this._tabbedPane.hasTab(tabId)) {
            this._tabbedPane.appendTab(tabId, title, view,  undefined, false, closeable);
        } else {
            this._tabbedPane.changeTabTitle(tabId, title);
            this._tabbedPane.changeTabView(tabId, view);
        }
    },

    /**
     * @param {string} tabId
     * @param {string} title
     * @param {WebInspector.View} view
     */
    showView: function(tabId, title, view)
    {
        this._addView(tabId, title, view, true);
        this.show();
        this._tabbedPane.selectTab(tabId, true);
        this._updateTabStrip();
    },

    /**
     * @param {string} tabId
     */
    closeView: function(tabId)
    {
        this._tabbedPane.closeTab(tabId);
        this._updateTabStrip();
    },

    /**
     * @param {boolean=} immediately
     */
    show: function(immediately)
    {
        WebInspector.searchController.cancelSearch();
        this.immediatelyFinishAnimation();

        if (this._toggleDrawerButton.toggled)
            return;
        this._toggleDrawerButton.toggled = true;
        this._toggleDrawerButton.title = WebInspector.UIString("Hide drawer.");

        document.body.addStyleClass("drawer-visible");
        this._tabbedPane.show(this._drawerContentsElement);

        var height = this._constrainHeight(this._savedHeight || this.element.offsetHeight);
        var animations = [
            {element: this.element, end: {height: height}},
            {element: this._mainElement, start: {bottom: 0}, end: {bottom: height}}
        ];

        function animationCallback(finished)
        {
            if (WebInspector.inspectorView.currentPanel())
                WebInspector.inspectorView.currentPanel().doResize();
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
        WebInspector.searchController.cancelSearch();
        this.immediatelyFinishAnimation();

        if (!this._toggleDrawerButton.toggled)
            return;
        this._toggleDrawerButton.toggled = false;
        this._toggleDrawerButton.title = WebInspector.UIString("Show console.");

        this._isHiding = true;
        this._savedHeight = this.element.offsetHeight;

        WebInspector.restoreFocusFromElement(this.element);

        // Temporarily set properties and classes to mimic the post-animation values so panels
        // like Elements in their updateStatusBarItems call will size things to fit the final location.
        document.body.removeStyleClass("drawer-visible");
        WebInspector.inspectorView.currentPanel().statusBarResized();
        document.body.addStyleClass("drawer-visible");

        var animations = [
            {element: this.element, end: {height: 0}},
            {element: this._mainElement, end: {bottom: 0}}
        ];

        function animationCallback(finished)
        {
            if (WebInspector.inspectorView.currentPanel())
                WebInspector.inspectorView.currentPanel().doResize();
            if (!finished)
                return;
            this._tabbedPane.detach();
            this._drawerContentsElement.removeChildren();
            document.body.removeStyleClass("drawer-visible");
            delete this._currentAnimation;
            this._mainElement.style.bottom = 0;
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
        var height = this._constrainHeight(parseInt(this.element.style.height, 10));
        this._mainElement.style.bottom = height + "px";
        this.element.style.height = height + "px";
        this._tabbedPane.doResize();
    },

    immediatelyFinishAnimation: function()
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
        if (!this._toggleDrawerButton.toggled)
            return false;

        this._visibleView().storeScrollPositions();
        this._statusBarDragOffset = event.pageY - this.element.totalOffsetTop();
        return true;
    },

    _statusBarDragging: function(event)
    {
        var height = window.innerHeight - event.pageY + this._statusBarDragOffset;
        height = Number.constrain(height, Preferences.minConsoleHeight, window.innerHeight - this._mainElement.totalOffsetTop() - Preferences.minConsoleHeight);

        this._mainElement.style.bottom = height + "px";
        this.element.style.height = height + "px";
        if (WebInspector.inspectorView.currentPanel())
            WebInspector.inspectorView.currentPanel().doResize();
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
     * @param {Element} element
     */
    setFooterElement: function(element)
    {
        if (element) {
            this._footerElementContainer.removeStyleClass("hidden");
            this._footerElementContainer.appendChild(element);
            this._drawerContentsElement.style.bottom = this._footerElementContainer.offsetHeight + "px";
        } else {
            this._footerElementContainer.addStyleClass("hidden");
            this._footerElementContainer.removeChildren();
            this._drawerContentsElement.style.bottom = 0;
        }
        this._tabbedPane.doResize();
    },

    /**
     * @returns {WebInspector.Searchable}
     */
    getSearchProvider: function()
    {
        var view = this._visibleView();
        return /** @type {WebInspector.Searchable} */ (view && view.performSearch ? view : null);
    },

    /**
     * @return {WebInspector.View} view
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
    }
}

/**
 * @type {WebInspector.Drawer}
 */
WebInspector.drawer = null;
