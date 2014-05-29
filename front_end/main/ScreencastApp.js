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

    this._currentScreencastState = WebInspector.settings.createSetting("currentScreencastState", "");
    this._lastScreencastState = WebInspector.settings.createSetting("lastScreencastState", "");
    this._toggleScreencastButton = new WebInspector.StatusBarStatesSettingButton(
        "screencast-status-bar-item",
        ["disabled", "left", "top"],
        [WebInspector.UIString("Disable screencast."), WebInspector.UIString("Switch to portrait screencast."), WebInspector.UIString("Switch to landscape screencast.")],
        this._currentScreencastState,
        this._lastScreencastState,
        this._onStatusBarButtonStateChanged.bind(this));
};

WebInspector.ScreencastApp.prototype = {
    createGlobalStatusBarItems: function()
    {
        this.appendInspectStatusBarItem();
        this.appendSettingsStatusBarItem();
        WebInspector.inspectorView.appendToRightToolbar(this._toggleScreencastButton.element);
    },

    createRootView: function()
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, "InspectorView.screencastSplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);

        WebInspector.inspectorView.show(this._rootSplitView.sidebarElement());
        var target = /** @type {!WebInspector.Target} */ (WebInspector.targetManager.activeTarget());
        this._screencastView = new WebInspector.ScreencastView(target);
        this._screencastView.show(this._rootSplitView.mainElement());

        this._onStatusBarButtonStateChanged("disabled");
        rootView.attachToBody();
    },

    presentUI: function()
    {
        WebInspector.App.prototype.presentUI.call(this);
        this._screencastView.initialize();
        this._toggleScreencastButton.toggleInitialState();
    },

    /**
     * @param {string} state
     */
    _onStatusBarButtonStateChanged: function(state)
    {
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
