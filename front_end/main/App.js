// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.App = function()
{
    if (WebInspector.overridesSupport.responsiveDesignAvailable()) {
        this._toggleEmulationButton = new WebInspector.StatusBarButton(WebInspector.UIString("Toggle device mode."), "emulation-status-bar-item");
        this._toggleEmulationButton.toggled = WebInspector.overridesSupport.emulationEnabled();
        this._toggleEmulationButton.addEventListener("click", this._toggleEmulationEnabled, this);
        WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.EmulationStateChanged, this._emulationEnabledChanged, this);
        WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated, this._overridesWarningUpdated, this);
    }
};

WebInspector.App.prototype = {
    _toggleEmulationEnabled: function()
    {
        WebInspector.overridesSupport.setEmulationEnabled(!this._toggleEmulationButton.toggled);
    },

    _emulationEnabledChanged: function()
    {
        this._toggleEmulationButton.toggled = WebInspector.overridesSupport.emulationEnabled();
        if (!WebInspector.overridesSupport.responsiveDesignAvailable() && WebInspector.overridesSupport.emulationEnabled())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
    },

    _overridesWarningUpdated: function()
    {
        if (!this._toggleEmulationButton)
            return;
        var message = WebInspector.overridesSupport.warningMessage();
        this._toggleEmulationButton.title = message || WebInspector.UIString("Toggle device mode.");
        this._toggleEmulationButton.element.classList.toggle("warning", !!message);
    },

    createRootView: function()
    {
    },

    /**
     * @param {!WebInspector.Target} mainTarget
     */
    presentUI: function(mainTarget)
    {
        WebInspector.inspectorView.showInitialPanel();

        WebInspector.overridesSupport.applyInitialOverrides();
        if (!WebInspector.overridesSupport.responsiveDesignAvailable() && WebInspector.overridesSupport.emulationEnabled())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
        this._overridesWarningUpdated();
    }
};

/**
 * @constructor
 * @implements {WebInspector.StatusBarButton.Provider}
 */
WebInspector.App.EmulationButtonProvider = function()
{
}

WebInspector.App.EmulationButtonProvider.prototype = {
    /**
     * @return {?WebInspector.StatusBarButton}
     */
    button: function()
    {
        if (!(WebInspector.app instanceof WebInspector.App))
            return null;
        return WebInspector.app._toggleEmulationButton || null;
    }
}

/**
 * @type {!WebInspector.App}
 */
WebInspector.app;
