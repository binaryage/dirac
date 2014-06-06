// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.App}
 */
WebInspector.ScreencastApp = function()
{
    WebInspector.App.call(this);

    var lastScreencastState = WebInspector.settings.createSetting("lastScreencastState", "left");
    this._currentScreencastState = WebInspector.settings.createSetting("currentScreencastState", "disabled");
    this._toggleScreencastButton = new WebInspector.StatusBarStatesSettingButton(
        "screencast-status-bar-item",
        ["disabled", "left", "top"],
        [WebInspector.UIString("Disable screencast."), WebInspector.UIString("Switch to portrait screencast."), WebInspector.UIString("Switch to landscape screencast.")],
        this._currentScreencastState.get(),
        this._currentScreencastState,
        lastScreencastState,
        this._onStatusBarButtonStateChanged.bind(this));
};

WebInspector.ScreencastApp.prototype = {
    createRootView: function()
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, "InspectorView.screencastSplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);

        WebInspector.inspectorView.show(this._rootSplitView.sidebarElement());
        var target = /** @type {!WebInspector.Target} */ (WebInspector.targetManager.activeTarget());
        this._screencastView = new WebInspector.ScreencastView(target);
        this._screencastView.show(this._rootSplitView.mainElement());

        this._onStatusBarButtonStateChanged(this._currentScreencastState.get());
        rootView.attachToBody();
    },

    presentUI: function()
    {
        WebInspector.App.prototype.presentUI.call(this);
        this._screencastView.initialize();
    },

    /**
     * @param {string} state
     */
    _onStatusBarButtonStateChanged: function(state)
    {
        if (!this._rootSplitView)
            return;
        if (state === "disabled") {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }

        this._rootSplitView.setVertical(state === "left");
        this._rootSplitView.setSecondIsSidebar(true);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), state === "top");
        this._rootSplitView.showBoth();
    },

    __proto__: WebInspector.App.prototype
};

/**
 * @constructor
 * @implements {WebInspector.StatusBarButton.Provider}
 */
WebInspector.ScreencastApp.StatusBarButtonProvider = function()
{
}

WebInspector.ScreencastApp.StatusBarButtonProvider.prototype = {
    /**
     * @return {?WebInspector.StatusBarButton}
     */
    button: function()
    {
        if (!(WebInspector.app instanceof WebInspector.ScreencastApp))
            return null;
        return /** @type {!WebInspector.ScreencastApp} */ (WebInspector.app)._toggleScreencastButton;
    }
}