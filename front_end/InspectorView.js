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

    // We can use split view either for docking or screencast, but not together.
    var settingName = WebInspector.queryParamsObject["can_dock"] ? "InspectorView.splitView" : "InspectorView.screencastSplitView";
    this._splitView = new WebInspector.SplitView(false, settingName, 300, 300);
    this._splitView.setSecondIsSidebar(true);
    this._splitView.setSidebarElementConstraints(150, 50);
    this._splitView.setMainElementConstraints(50, 50);
    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateSplitView.bind(this));

    this._splitView.element.id = "inspector-split-view";
    this._splitView.show(this.element);

    this._overlayView = new WebInspector.ViewWithResizeCallback(this._onOverlayResized.bind(this));
    this._splitView.setMainView(this._overlayView);
    WebInspector.settings.zoomLevel.addChangeListener(this._onOverlayResized, this);

    this._devtoolsElement = this._splitView.sidebarElement();
    this._devtoolsElement.classList.add("vbox");

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setRetainTabsOrder(true);
    this._splitView.setSidebarView(this._tabbedPane);

    this._toolbarElement = document.createElement("div");
    this._toolbarElement.className = "toolbar toolbar-background";
    var headerElement = this._tabbedPane.headerElement();
    headerElement.parentElement.insertBefore(this._toolbarElement, headerElement);

    this._leftToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-left");
    this._toolbarElement.appendChild(headerElement);
    this._rightToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-right");

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

    this._updateSplitView();
}

WebInspector.InspectorView.prototype = {
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
        this._rightToolbarElement.appendChild(element);
    },

    /**
     * @return {!WebInspector.Drawer}
     */
    drawer: function()
    {
        return this._drawer;
    },

    /**
     * @return {!Element}
     */
    devtoolsElement: function()
    {
        return this._devtoolsElement;
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
        this._drawer.showOnLoadIfNecessary();
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

    /**
     * @param {string} id
     * @param {string} title
     * @param {!WebInspector.ViewFactory} factory
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

    _updateSplitView: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide !== WebInspector.DockController.State.Undocked) {
            this._splitView.showBoth();
            var vertical = dockSide === WebInspector.DockController.State.DockedToRight;
            this._splitView.setVertical(vertical);
            if (vertical) {
                this._splitView.uninstallResizer(this._tabbedPane.headerElement());
                this._splitView.installResizer(this._splitView.resizerElement());
            } else {
                this._splitView.uninstallResizer(this._splitView.resizerElement());
                this._splitView.installResizer(this._tabbedPane.headerElement());
            }
        } else {
            this._splitView.showOnlySecond();
        }
    },

    _onOverlayResized: function()
    {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide !== WebInspector.DockController.State.Undocked) {
            // Leave 3px room for resizer.
            var sidebarSize = Math.ceil(this._splitView.sidebarSize() * WebInspector.zoomFactor());
            var bottom = this._splitView.isVertical() ? 0 : sidebarSize;
            var right = this._splitView.isVertical() ? sidebarSize + 3 : 0;
            InspectorFrontendHost.setContentsInsets(0, 0, bottom, right);
        }

        // FIXME: make drawer a view.
        this._drawer.resize();
    },

    /**
     * @param {!WebInspector.View} view
     */
    showScreencastView: function(view)
    {
        this._splitView.setVertical(true);
        if (view.parentView() !== this._overlayView)
            view.show(this._overlayView.element);
        this._splitView.showBoth();
    },

    hideScreencastView: function()
    {
        this._splitView.showOnlySecond();
    },

    /**
     * @param {number} errors
     * @param {number} warnings
     */
    setErrorAndWarningCounts: function(errors, warnings)
    {
        if (!errors && !warnings) {
            this._errorWarningCountElement.classList.add("hidden");
            this._tabbedPane.headerResized();
            return;
        }

        this._errorWarningCountElement.classList.remove("hidden");
        this._errorWarningCountElement.removeChildren();

        if (errors) {
            var errorImageElement = this._errorWarningCountElement.createChild("div", "error-icon-small");
            var errorElement = this._errorWarningCountElement.createChild("span");
            errorElement.id = "error-count";
            errorElement.textContent = errors;
        }

        if (warnings) {
            var warningsImageElement = this._errorWarningCountElement.createChild("div", "warning-icon-small");
            var warningsElement = this._errorWarningCountElement.createChild("span");
            warningsElement.id = "warning-count";
            warningsElement.textContent = warnings;
        }

        if (errors) {
            if (warnings) {
                if (errors == 1) {
                    if (warnings == 1)
                        this._errorWarningCountElement.title = WebInspector.UIString("%d error, %d warning", errors, warnings);
                    else
                        this._errorWarningCountElement.title = WebInspector.UIString("%d error, %d warnings", errors, warnings);
                } else if (warnings == 1)
                    this._errorWarningCountElement.title = WebInspector.UIString("%d errors, %d warning", errors, warnings);
                else
                    this._errorWarningCountElement.title = WebInspector.UIString("%d errors, %d warnings", errors, warnings);
            } else if (errors == 1)
                this._errorWarningCountElement.title = WebInspector.UIString("%d error", errors);
            else
                this._errorWarningCountElement.title = WebInspector.UIString("%d errors", errors);
        } else if (warnings == 1)
            this._errorWarningCountElement.title = WebInspector.UIString("%d warning", warnings);
        else if (warnings)
            this._errorWarningCountElement.title = WebInspector.UIString("%d warnings", warnings);
        else
            this._errorWarningCountElement.title = null;

        this._tabbedPane.headerResized();
    },

    __proto__: WebInspector.View.prototype
};

/**
 * @type {!WebInspector.InspectorView}
 */
WebInspector.inspectorView;
