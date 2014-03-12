/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.InspectorView = function()
{
    WebInspector.View.call(this);
    WebInspector.Dialog.setModalHostView(this);

    // DevTools sidebar is a vertical split of panels tabbed pane and a drawer.
    this._drawerSplitView = new WebInspector.SplitView(false, true, "Inspector.drawerSplitViewState", 200, 200);
    this._drawerSplitView.hideSidebar();
    this._drawerSplitView.enableShowModeSaving();
    this._drawerSplitView.setSidebarElementConstraints(Preferences.minDrawerHeight, Preferences.minDrawerHeight);
    this._drawerSplitView.setMainElementConstraints(25, 25);
    this._drawerSplitView.show(this.element);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setRetainTabOrder(true, WebInspector.moduleManager.orderComparator(WebInspector.Panel, "name", "order"));
    this._tabbedPane.show(this._drawerSplitView.mainElement());
    this._drawer = new WebInspector.Drawer(this._drawerSplitView);

    // Patch tabbed pane header with toolbar actions.
    this._toolbarElement = document.createElement("div");
    this._toolbarElement.className = "toolbar toolbar-background";
    var headerElement = this._tabbedPane.headerElement();
    headerElement.parentElement.insertBefore(this._toolbarElement, headerElement);

    this._leftToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-left");
    this._toolbarElement.appendChild(headerElement);
    this._rightToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-right");

    this._errorWarningCountElement = this._rightToolbarElement.createChild("div", "hidden");
    this._errorWarningCountElement.id = "error-warning-count";

    this._closeButtonToolbarItem = document.createElementWithClass("div", "toolbar-close-button-item");
    var closeButtonElement = this._closeButtonToolbarItem.createChild("div", "close-button");
    closeButtonElement.addEventListener("click", InspectorFrontendHost.closeWindow.bind(InspectorFrontendHost), true);
    this._rightToolbarElement.appendChild(this._closeButtonToolbarItem);

    this.appendToRightToolbar(this._drawer.toggleButtonElement());

    this._history = [];
    this._historyIterator = -1;
    document.addEventListener("keydown", this._keyDown.bind(this), false);
    document.addEventListener("keypress", this._keyPress.bind(this), false);
    this._panelDescriptors = {};

    // Windows and Mac have two different definitions of '[' and ']', so accept both of each.
    this._openBracketIdentifiers = ["U+005B", "U+00DB"].keySet();
    this._closeBracketIdentifiers = ["U+005D", "U+00DD"].keySet();
    this._lastActivePanelSetting = WebInspector.settings.createSetting("lastActivePanel", "elements");

    this._loadPanelDesciptors();
};

WebInspector.InspectorView.prototype = {
    _loadPanelDesciptors: function()
    {
        WebInspector.startBatchUpdate();
        WebInspector.moduleManager.extensions(WebInspector.Panel).forEach(processPanelExtensions.bind(this));
        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @this {!WebInspector.InspectorView}
         */
        function processPanelExtensions(extension)
        {
            this.addPanel(new WebInspector.ModuleManagerExtensionPanelDescriptor(extension));
        }
        WebInspector.endBatchUpdate();
    },

    /**
     * @param {!Element} element
     */
    appendToLeftToolbar: function(element)
    {
        this._leftToolbarElement.appendChild(element);
    },

    /**
     * @param {!Element} element
     */
    appendToRightToolbar: function(element)
    {
        this._rightToolbarElement.insertBefore(element, this._closeButtonToolbarItem);
    },

    /**
     * @param {!WebInspector.PanelDescriptor} panelDescriptor
     */
    addPanel: function(panelDescriptor)
    {
        var panelName = panelDescriptor.name();
        this._panelDescriptors[panelName] = panelDescriptor;
        this._tabbedPane.appendTab(panelName, panelDescriptor.title(), new WebInspector.View());
        if (this._lastActivePanelSetting.get() === panelName)
            this._tabbedPane.selectTab(panelName);
    },

    /**
     * @param {string} panelName
     * @return {?WebInspector.Panel}
     */
    panel: function(panelName)
    {
        var panelDescriptor = this._panelDescriptors[panelName];
        var panelOrder = this._tabbedPane.allTabs();
        if (!panelDescriptor && panelOrder.length)
            panelDescriptor = this._panelDescriptors[panelOrder[0]];
        return panelDescriptor ? panelDescriptor.panel() : null;
    },

    /**
     * @param {string} panelName
     * @return {?WebInspector.Panel}
     */
    showPanel: function(panelName)
    {
        var panel = this.panel(panelName);
        if (panel)
            this.setCurrentPanel(panel);
        return panel;
    },

    /**
     * @return {!WebInspector.Panel}
     */
    currentPanel: function()
    {
        return this._currentPanel;
    },

    showInitialPanel: function()
    {
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
        this._tabSelected();
        this._drawer.initialPanelShown();
    },

    showDrawerEditor: function()
    {
        this._drawer.showDrawerEditor();
    },

    /**
     * @return {boolean}
     */
    isDrawerEditorShown: function()
    {
        return this._drawer.isDrawerEditorShown();
    },

    hideDrawerEditor: function()
    {
        this._drawer.hideDrawerEditor();
    },

    /**
     * @param {boolean} available
     */
    setDrawerEditorAvailable: function(available)
    {
        this._drawer.setDrawerEditorAvailable(available);
    },

    _tabSelected: function()
    {
        var panelName = this._tabbedPane.selectedTabId;
        var panel = this._panelDescriptors[this._tabbedPane.selectedTabId].panel();
        this._tabbedPane.changeTabView(panelName, panel);

        this._currentPanel = panel;
        this._lastActivePanelSetting.set(panel.name);
        this._pushToHistory(panel.name);
        WebInspector.userMetrics.panelShown(panel.name);
        panel.focus();
    },

    /**
     * @param {!WebInspector.Panel} x
     */
    setCurrentPanel: function(x)
    {
        if (this._currentPanel === x)
            return;

        this._tabbedPane.changeTabView(x.name, x);
        this._tabbedPane.selectTab(x.name);
    },

    /**
     * @param {string} id
     */
    closeViewInDrawer: function(id)
    {
        this._drawer.closeView(id);
    },

    /**
     * @param {string} id
     * @param {string} title
     * @param {!WebInspector.View} view
     */
    showCloseableViewInDrawer: function(id, title, view)
    {
        this._drawer.showCloseableView(id, title, view);
    },

    showDrawer: function()
    {
        this._drawer.showDrawer();
    },

    /**
     * @return {boolean}
     */
    drawerVisible: function()
    {
        return this._drawer.isShowing();
    },

    /**
     * @param {string} id
     * @param {boolean=} immediate
     */
    showViewInDrawer: function(id, immediate)
    {
        this._drawer.showView(id, immediate);
    },

    /**
     * @return {string}
     */
    selectedViewInDrawer: function()
    {
        return this._drawer.selectedViewId();
    },

    closeDrawer: function()
    {
        this._drawer.closeDrawer();
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this._currentPanel ? this._currentPanel.defaultFocusedElement() : null;
    },

    _keyPress: function(event)
    {
        // BUG 104250: Windows 7 posts a WM_CHAR message upon the Ctrl+']' keypress.
        // Any charCode < 32 is not going to be a valid keypress.
        if (event.charCode < 32 && WebInspector.isWin())
            return;
        clearTimeout(this._keyDownTimer);
        delete this._keyDownTimer;
    },

    _keyDown: function(event)
    {
        if (!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event))
            return;

        var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
        // Ctrl/Cmd + 1-9 should show corresponding panel.
        var panelShortcutEnabled = WebInspector.settings.shortcutPanelSwitch.get();
        if (panelShortcutEnabled && !event.shiftKey && !event.altKey) {
            var panelIndex = -1;
            if (event.keyCode > 0x30 && event.keyCode < 0x3A)
                panelIndex = event.keyCode - 0x31;
            else if (event.keyCode > 0x60 && event.keyCode < 0x6A && keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD)
                panelIndex = event.keyCode - 0x61;
            if (panelIndex !== -1) {
                var panelName = this._tabbedPane.allTabs()[panelIndex];
                if (panelName) {
                    this.showPanel(panelName);
                    event.consume(true);
                }
                return;
            }
        }

        // BUG85312: On French AZERTY keyboards, AltGr-]/[ combinations (synonymous to Ctrl-Alt-]/[ on Windows) are used to enter ]/[,
        // so for a ]/[-related keydown we delay the panel switch using a timer, to see if there is a keypress event following this one.
        // If there is, we cancel the timer and do not consider this a panel switch.
        if (!WebInspector.isWin() || (!this._openBracketIdentifiers[event.keyIdentifier] && !this._closeBracketIdentifiers[event.keyIdentifier])) {
            this._keyDownInternal(event);
            return;
        }

        this._keyDownTimer = setTimeout(this._keyDownInternal.bind(this, event), 0);
    },

    _keyDownInternal: function(event)
    {
        var direction = 0;

        if (this._openBracketIdentifiers[event.keyIdentifier])
            direction = -1;

        if (this._closeBracketIdentifiers[event.keyIdentifier])
            direction = 1;

        if (!direction)
            return;

        if (!event.shiftKey && !event.altKey) {
            this._changePanelInDirection(direction);
            event.consume(true);
            return;
        }

        if (event.altKey && this._moveInHistory(direction))
            event.consume(true)
    },

    _changePanelInDirection: function(direction)
    {
        var panelOrder = this._tabbedPane.allTabs();
        var index = panelOrder.indexOf(this.currentPanel().name);
        index = (index + panelOrder.length + direction) % panelOrder.length;
        this.showPanel(panelOrder[index]);
    },

    _moveInHistory: function(move)
    {
        var newIndex = this._historyIterator + move;
        if (newIndex >= this._history.length || newIndex < 0)
            return false;

        this._inHistory = true;
        this._historyIterator = newIndex;
        this.setCurrentPanel(WebInspector.panels[this._history[this._historyIterator]]);
        delete this._inHistory;

        return true;
    },

    _pushToHistory: function(panelName)
    {
        if (this._inHistory)
            return;

        this._history.splice(this._historyIterator + 1, this._history.length - this._historyIterator - 1);
        if (!this._history.length || this._history[this._history.length - 1] !== panelName)
            this._history.push(panelName);
        this._historyIterator = this._history.length - 1;
    },

    onResize: function()
    {
        WebInspector.Dialog.modalHostRepositioned();
    },

    /**
     * @return {!Element}
     */
    topResizerElement: function()
    {
        return this._tabbedPane.headerElement();
    },

    _createImagedCounterElementIfNeeded: function(count, id, styleName)
    {
        if (!count)
            return;

        var imageElement = this._errorWarningCountElement.createChild("div", styleName);
        var counterElement = this._errorWarningCountElement.createChild("span");
        counterElement.id = id;
        counterElement.textContent = count;
    },

    /**
     * @param {number} errors
     * @param {number} warnings
     */
    setErrorAndWarningCounts: function(errors, warnings)
    {
        this._errorWarningCountElement.classList.toggle("hidden", !errors && !warnings);
        this._errorWarningCountElement.removeChildren();

        this._createImagedCounterElementIfNeeded(errors, "error-count", "error-icon-small");
        this._createImagedCounterElementIfNeeded(warnings, "warning-count", "warning-icon-small");

        var errorString = errors ?  WebInspector.UIString("%d error%s", errors, errors > 1 ? "s" : "") : "";
        var warningString = warnings ?  WebInspector.UIString("%d warning%s", warnings, warnings > 1 ? "s" : "") : "";
        var commaString = errors && warnings ? ", " : "";
        this._errorWarningCountElement.title = errorString + commaString + warningString;
        this._tabbedPane.headerResized();
    },

    __proto__: WebInspector.View.prototype
};

/**
 * @type {!WebInspector.InspectorView}
 */
WebInspector.inspectorView;

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.RootView = function()
{
    WebInspector.View.call(this);
    this.markAsRoot();
    this.element.classList.add("fill", "root-view");
    this.element.setAttribute("spellcheck", false);
    window.addEventListener("resize", this.doResize.bind(this), true);
};

WebInspector.RootView.prototype = {
    __proto__: WebInspector.View.prototype
};
