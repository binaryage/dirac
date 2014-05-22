/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @extends {WebInspector.Object}
 * @param {boolean} canDock
 */
WebInspector.DockController = function(canDock)
{
    this._canDock = canDock;
    if (!canDock) {
        this._dockSide = WebInspector.DockController.State.Undocked;
        this._updateUI();
        return;
    }

    WebInspector.settings.currentDockState = WebInspector.settings.createSetting("currentDockState", "");
    WebInspector.settings.lastDockState = WebInspector.settings.createSetting("lastDockState", "");
    var states = [WebInspector.DockController.State.DockedToBottom, WebInspector.DockController.State.Undocked, WebInspector.DockController.State.DockedToRight];
    var titles = [WebInspector.UIString("Dock to main window."), WebInspector.UIString("Undock into separate window."), WebInspector.UIString("Dock to main window.")];
    if (WebInspector.experimentsSettings.dockToLeft.isEnabled()) {
        states.push(WebInspector.DockController.State.DockedToLeft);
        titles.push(WebInspector.UIString("Dock to main window."));
    }
    this._dockToggleButton = new WebInspector.StatusBarStatesSettingButton(
        "dock-status-bar-item",
        states,
        titles,
        WebInspector.settings.currentDockState,
        WebInspector.settings.lastDockState,
        this._dockSideChanged.bind(this));
}

WebInspector.DockController.State = {
    DockedToBottom: "bottom",
    DockedToRight: "right",
    DockedToLeft: "left",
    Undocked: "undocked"
}

// Use BeforeDockSideChanged to do something before all the UI bits are updated,
// DockSideChanged to update UI, and AfterDockSideChanged to perform actions
// after frontend is docked/undocked in the browser.
WebInspector.DockController.Events = {
    BeforeDockSideChanged: "BeforeDockSideChanged",
    DockSideChanged: "DockSideChanged",
    AfterDockSideChanged: "AfterDockSideChanged"
}

WebInspector.DockController.prototype = {
    /**
     * @return {?Element}
     */
    get element()
    {
        return this._canDock ? this._dockToggleButton.element : null;
    },

    /**
     * @return {string}
     */
    dockSide: function()
    {
        return this._dockSide;
    },

    /**
     * @return {boolean}
     */
    canDock: function()
    {
        return this._canDock;
    },

    /**
     * @return {boolean}
     */
    isVertical: function()
    {
        return this._dockSide === WebInspector.DockController.State.DockedToRight || this._dockSide === WebInspector.DockController.State.DockedToLeft;
    },

    /**
     * @param {string} dockSide
     */
    _dockSideChanged: function(dockSide)
    {
        if (this._dockSide === dockSide)
            return;

        this.dispatchEventToListeners(WebInspector.DockController.Events.BeforeDockSideChanged, dockSide);
        InspectorFrontendHost.setIsDocked(dockSide !== WebInspector.DockController.State.Undocked, this._setIsDockedResponse.bind(this));
        this._dockSide = dockSide;
        this._updateUI();
        this.dispatchEventToListeners(WebInspector.DockController.Events.DockSideChanged, this._dockSide);
    },

    _setIsDockedResponse: function()
    {
        this.dispatchEventToListeners(WebInspector.DockController.Events.AfterDockSideChanged, this._dockSide);
    },

    _updateUI: function()
    {
        var body = document.body;
        switch (this._dockSide) {
        case WebInspector.DockController.State.DockedToBottom:
            body.classList.remove("undocked");
            body.classList.remove("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.add("dock-to-bottom");
            break;
        case WebInspector.DockController.State.DockedToRight:
            body.classList.remove("undocked");
            body.classList.add("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        case WebInspector.DockController.State.DockedToLeft:
            body.classList.remove("undocked");
            body.classList.remove("dock-to-right");
            body.classList.add("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        case WebInspector.DockController.State.Undocked:
            body.classList.add("undocked");
            body.classList.remove("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        }
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @type {!WebInspector.DockController}
 */
WebInspector.dockController;
