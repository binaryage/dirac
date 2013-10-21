 /*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @param {WebInspector.InspectorView} inspectorView
 */
WebInspector.Toolbar = function(inspectorView)
{
    this._inspectorView = inspectorView;

    this.element = inspectorView.element.createChild("div", "toolbar toolbar-background");
    WebInspector.installDragHandle(this.element, this._toolbarDragStart.bind(this), this._toolbarDrag.bind(this), this._toolbarDragEnd.bind(this), "default");

    this._leftToolbarElement = this.element.createChild("div", "toolbar-controls-left");
    this._rightControlsElement = this.element.createChild("div", "toolbar-controls-right");
    this._dropdownButton = this._rightControlsElement.createChild("div", "toolbar-item").createChild("div", "toolbar-dropdown-arrow hidden");
    this._dropdownButton.textContent = "\u00bb"; // &raquo;
    this._dropdownButton.addEventListener("click", this._toggleDropdown.bind(this), false);
    this._errorWarningCountElement = this._rightControlsElement.createChild("div", "hidden");
    this._errorWarningCountElement.id = "error-warning-count";
    this._rightToolbarElement = this._rightControlsElement.createChild("div");
    var closeButtonElement = this._rightControlsElement.createChild("div", "toolbar-item").createChild("div", "close-button");
    closeButtonElement.addEventListener("click", this._onClose, true);

    this._panelDescriptors = [];
}

WebInspector.Toolbar.prototype = {
    resize: function()
    {
        this._updateDropdownButtonAndHideDropdown();
    },

    /**
     * @param {!WebInspector.PanelDescriptor} panelDescriptor
     */
    addPanel: function(panelDescriptor)
    {
        this._panelDescriptors.push(panelDescriptor);
        panelDescriptor._toolbarElement = this._createPanelToolbarItem(panelDescriptor);
        this.element.appendChild(panelDescriptor._toolbarElement);
        this.resize();
    },

    /**
     * @return {Element}
     */
    leftToolbarElement: function()
    {
        return this._leftToolbarElement;
    },

    /**
     * @return {Element}
     */
    rightToolbarElement: function()
    {
        return this._rightToolbarElement;
    },

    /**
     * @return {boolean}
     */
    _allItemsFitOntoToolbar: function()
    {
        var toolbarItems = this.element.querySelectorAll(".toolbar-item.toggleable");
        return toolbarItems.length === 0 || this.element.scrollHeight < toolbarItems[0].offsetHeight * 2;
    },

    /**
     * @param {WebInspector.PanelDescriptor} panelDescriptor
     * @param {boolean=} noCloseButton
     * @return {Element}
     */
    _createPanelToolbarItem: function(panelDescriptor, noCloseButton)
    {
        var toolbarItem = document.createElement("button");
        toolbarItem.className = "toolbar-item toggleable";
        toolbarItem.panelDescriptor = panelDescriptor;
        toolbarItem.addStyleClass(panelDescriptor.name());

        function onToolbarItemClicked()
        {
            this._updateDropdownButtonAndHideDropdown();
            this._inspectorView.setCurrentPanel(panelDescriptor.panel());
        }
        toolbarItem.addEventListener("click", onToolbarItemClicked.bind(this), false);
        toolbarItem.createChild("div", "toolbar-label").textContent = panelDescriptor.title();
        return toolbarItem;
    },

    /**
     * @param {WebInspector.Panel} panel
     */
    panelSelected: function(panel)
    {
        var toolbarItems = this.element.children;
        for (var i = 0; i < toolbarItems.length; ++i) {
            if (toolbarItems[i].panelDescriptor)
                toolbarItems[i].enableStyleClass("toggled-on", toolbarItems[i].panelDescriptor.name() === panel.name);
        }
    },

    /**
     * @return {boolean}
     */
    _isDockedToBottom: function()
    {
        return !!WebInspector.dockController && WebInspector.dockController.dockSide() == WebInspector.DockController.State.DockedToBottom;
    },

    /**
     * @return {boolean}
     */
    _isUndocked: function()
    {
        return !!WebInspector.dockController && WebInspector.dockController.dockSide() == WebInspector.DockController.State.Undocked;
    },

    /**
     * @return {boolean}
     */
    _toolbarDragStart: function(event)
    {
        if (this._isUndocked())
            return false;

        var target = event.target;
        if (target.hasStyleClass("toolbar-item") && target.hasStyleClass("toggleable"))
            return false;

        if (target !== this.element && !target.hasStyleClass("toolbar-item"))
            return false;

        this._lastScreenX = event.screenX;
        this._lastScreenY = event.screenY;
        this._lastHeightDuringDrag = window.innerHeight;
        this._startDistanceToRight = window.innerWidth - event.clientX;
        this._startDinstanceToBottom = window.innerHeight - event.clientY;
        return true;
    },

    _toolbarDragEnd: function(event)
    {
        // We may not get the drag event at the end.
        // Apply last changes manually.
        this._toolbarDrag(event);
        delete this._lastScreenX;
        delete this._lastScreenY;
        delete this._lastHeightDuringDrag;
        delete this._startDistanceToRight;
        delete this._startDinstanceToBottom;
    },

    _toolbarDrag: function(event)
    {
        event.preventDefault();

        if (this._isUndocked())
            return this._toolbarDragMoveWindow(event);

        return this._toolbarDragChangeDocking(event);
    },

    _toolbarDragMoveWindow: function(event)
    {
        var x = event.screenX - this._lastScreenX;
        var y = event.screenY - this._lastScreenY;
        this._lastScreenX = event.screenX;
        this._lastScreenY = event.screenY;
        InspectorFrontendHost.moveWindowBy(x, y);
    },

    _toolbarDragChangeDocking: function(event)
    {
        if (this._isDockedToBottom()) {
            var distanceToRight = window.innerWidth - event.clientX;
            if (distanceToRight < this._startDistanceToRight * 2 / 3) {
                InspectorFrontendHost.requestSetDockSide(WebInspector.DockController.State.DockedToRight);
                return true;
            }
        } else {
            var distanceToBottom = window.innerHeight - event.clientY;
            if (distanceToBottom < this._startDinstanceToBottom * 2 / 3) {
                InspectorFrontendHost.requestSetDockSide(WebInspector.DockController.State.DockedToBottom);
                return true;
            }
        }
    },

    _onClose: function()
    {
        WebInspector.close();
    },

    _setDropdownVisible: function(visible)
    {
        if (!this._dropdown) {
            if (!visible)
                return;
            this._dropdown = new WebInspector.ToolbarDropdown(this);
        }
        if (visible)
            this._dropdown.show();
        else
            this._dropdown.hide();
    },

    _toggleDropdown: function()
    {
        this._setDropdownVisible(!this._dropdown || !this._dropdown.visible);
    },

    _togglePanelsMenu: function(event)
    {
        function activatePanel(panelDescriptor)
        {
            WebInspector.showPanel(panelDescriptor.name());
        }

        var contextMenu = new WebInspector.ContextMenu(event);
        var currentPanelName = this._inspectorView.currentPanel().name;
        var toolbarItems = this.element.querySelectorAll(".toolbar-item.toggleable");
        for (var i = 0; i < toolbarItems.length; ++i) {
            if (toolbarItems[i].offsetTop >= toolbarItems[0].offsetHeight) {
                var descr = toolbarItems[i].panelDescriptor;
                if (descr.name() === currentPanelName)
                    contextMenu.appendCheckboxItem(descr.title(), activatePanel.bind(this, descr), true);
                else
                    contextMenu.appendItem(descr.title(), activatePanel.bind(this, descr));
            }
        }

        contextMenu.showSoftMenu();
    },

    _updateDropdownButtonAndHideDropdown: function()
    {
        WebInspector.invokeOnceAfterBatchUpdate(this, this._innerUpdateDropdownButtonAndHideDropdown);
    },

    _innerUpdateDropdownButtonAndHideDropdown: function()
    {
        this._setDropdownVisible(false);
        if (this.element.scrollHeight > this.element.offsetHeight)
            this._dropdownButton.removeStyleClass("hidden");
        else
            this._dropdownButton.addStyleClass("hidden");
    }
}

/**
 * @constructor
 * @param {WebInspector.Toolbar} toolbar
 */
WebInspector.ToolbarDropdown = function(toolbar)
{
    this._toolbar = toolbar;
    this._arrow = toolbar._dropdownButton;
    this.element = document.createElement("div");
    this.element.className = "toolbar-dropdown toolbar-small";
    this._contentElement = this.element.createChild("div", "scrollable-content");
    this._contentElement.tabIndex = 0;
    this._contentElement.addEventListener("keydown", this._onKeyDown.bind(this), true);
}

WebInspector.ToolbarDropdown.prototype = {
    show: function()
    {
        if (this.visible)
            return;
        var style = this.element.style;
        this._populate();
        var top = this._arrow.totalOffsetTop() + this._arrow.clientHeight;
        this._arrow.addStyleClass("dropdown-visible");
        this.element.style.top = top + "px";
        this.element.style.right = window.innerWidth - this._arrow.totalOffsetLeft() - this._arrow.clientWidth + "px";
        this._contentElement.style.maxHeight = window.innerHeight - top - 20 + "px";
        this._toolbar.element.appendChild(this.element);
    },

    hide: function()
    {
        if (!this.visible)
            return;
        this._arrow.removeStyleClass("dropdown-visible");
        this.element.remove();
        this._contentElement.removeChildren();
    },

    get visible()
    {
        return !!this.element.parentNode;
    },

    _populate: function()
    {
        var toolbarItems = this._toolbar.element.querySelectorAll(".toolbar-item.toggleable");
        for (var i = 0; i < toolbarItems.length; ++i) {
            if (toolbarItems[i].offsetTop >= toolbarItems[0].offsetHeight) {
                this._contentElement.appendChild(this._toolbar._createPanelToolbarItem(toolbarItems[i].panelDescriptor, true));
            }
        }
    },

    _onKeyDown: function(event)
    {
        if (event.keyCode !== WebInspector.KeyboardShortcut.Keys.Esc.code)
            return;
        event.consume();
        this.hide();
    }
}
