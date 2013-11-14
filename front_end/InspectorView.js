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
    this.markAsRoot();
    this.element.classList.add("fill", "vbox", "inspector-view");
    this.element.setAttribute("spellcheck", false);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setRetainTabsOrder(true);
    this._tabbedPane.show(this.element);

    var toolbarElement = document.createElement("div");
    toolbarElement.className = "toolbar toolbar-background";
    var headerElement = this._tabbedPane.headerElement();
    headerElement.parentElement.insertBefore(toolbarElement, headerElement);

    this._leftToolbarElement = toolbarElement.createChild("div", "toolbar-controls-left");
    toolbarElement.appendChild(headerElement);
    this._rightToolbarElement = toolbarElement.createChild("div", "toolbar-controls-right");

    this._errorWarningCountElement = this._rightToolbarElement.createChild("div", "hidden");
    this._errorWarningCountElement.id = "error-warning-count";

    this._drawer = new WebInspector.Drawer(this);
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
}

WebInspector.InspectorView.prototype = {
    /**
     * @param {Element} element
     */
    appendToLeftToolbar: function(element)
    {
        this._leftToolbarElement.appendChild(element);
    },

    /**
     * @param {Element} element
     */
    appendToRightToolbar: function(element)
    {
        this._rightToolbarElement.appendChild(element);
    },

    /**
     * @return {WebInspector.Drawer}
     */
    drawer: function()
    {
        return this._drawer;
    },

    /**
     * @param {WebInspector.PanelDescriptor} panelDescriptor
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
     * @return {WebInspector.Panel}
     */
    currentPanel: function()
    {
        return this._currentPanel;
    },

    showInitialPanel: function()
    {
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
        this._tabSelected();
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
     * @param {WebInspector.Panel} x
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
        return this._drawer.closeView(id);
    },

    /**
     * @param {string} id
     * @param {string} title
     * @param {WebInspector.View} view
     */
    showCloseableViewInDrawer: function(id, title, view)
    {
        this._drawer.showCloseableView(id, title, view);
    },

    /**
     * @param {string} id
     * @param {string} title
     * @param {WebInspector.ViewFactory} factory
     */
    registerViewInDrawer: function(id, title, factory)
    {
        this._drawer.registerView(id, title, factory);
    },

    /**
     * @param {string} id
     */
    unregisterViewInDrawer: function(id)
    {
        this._drawer.unregisterView(id);
    },

    /**
     * @param {string} id
     */
    showViewInDrawer: function(id)
    {
        this._drawer.showView(id);
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
        this._drawer.hide();
    },

    /**
     * @return {Element}
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

        // Ctrl/Cmd + 1-9 should show corresponding panel.
        var panelShortcutEnabled = WebInspector.settings.shortcutPanelSwitch.get();
        if (panelShortcutEnabled && !event.shiftKey && !event.altKey && event.keyCode > 0x30 && event.keyCode < 0x3A) {
            var panelName = this._tabbedPane.allTabs()[event.keyCode - 0x31];
            if (panelName) {
                this.showPanel(panelName);
                event.consume(true);
            }
            return;
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
        if (this._openBracketIdentifiers[event.keyIdentifier]) {
            var isRotateLeft = !event.shiftKey && !event.altKey;
            if (isRotateLeft) {
                var panelOrder = this._tabbedPane.allTabs();
                var index = panelOrder.indexOf(this.currentPanel().name);
                index = (index === 0) ? panelOrder.length - 1 : index - 1;
                this.showPanel(panelOrder[index]);
                event.consume(true);
                return;
            }

            var isGoBack = event.altKey;
            if (isGoBack && this._canGoBackInHistory()) {
                this._goBackInHistory();
                event.consume(true);
            }
            return;
        }

        if (this._closeBracketIdentifiers[event.keyIdentifier]) {
            var isRotateRight = !event.shiftKey && !event.altKey;
            if (isRotateRight) {
                var panelOrder = this._tabbedPane.allTabs();
                var index = panelOrder.indexOf(this.currentPanel().name);
                index = (index + 1) % panelOrder.length;
                this.showPanel(panelOrder[index]);
                event.consume(true);
                return;
            }

            var isGoForward = event.altKey;
            if (isGoForward && this._canGoForwardInHistory()) {
                this._goForwardInHistory();
                event.consume(true);
            }
            return;
        }
    },

    _canGoBackInHistory: function()
    {
        return this._historyIterator > 0;
    },

    _goBackInHistory: function()
    {
        this._inHistory = true;
        this.setCurrentPanel(WebInspector.panels[this._history[--this._historyIterator]]);
        delete this._inHistory;
    },

    _canGoForwardInHistory: function()
    {
        return this._historyIterator < this._history.length - 1;
    },

    _goForwardInHistory: function()
    {
        this._inHistory = true;
        this.setCurrentPanel(WebInspector.panels[this._history[++this._historyIterator]]);
        delete this._inHistory;
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
        // FIXME: make drawer a view.
        this.doResize();
        this._drawer.resize();
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @type {WebInspector.InspectorView}
 */
WebInspector.inspectorView = null;
