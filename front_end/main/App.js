// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.App = function()
{
    if (WebInspector.overridesSupport.canEmulate()) {
        this._toggleEmulationButton = new WebInspector.StatusBarButton(WebInspector.UIString("Toggle emulation enabled."), "emulation-status-bar-item");
        this._toggleEmulationButton.toggled = WebInspector.overridesSupport.emulationEnabled();
        this._toggleEmulationButton.addEventListener("click", this._toggleEmulationEnabled, this);
        WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.EmulationStateChanged, this._emulationEnabledChanged, this);
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

    createRootView: function()
    {
    },

    presentUI: function()
    {
        WebInspector.inspectorView.showInitialPanel();

        WebInspector.overridesSupport.applyInitialOverrides();
        if (!WebInspector.overridesSupport.responsiveDesignAvailable() && WebInspector.overridesSupport.emulationEnabled())
            WebInspector.inspectorView.showViewInDrawer("emulation", true);
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
