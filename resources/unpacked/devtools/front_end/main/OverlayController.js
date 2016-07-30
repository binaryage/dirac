// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.OverlayController = function() {
    WebInspector.moduleSetting("disablePausedStateOverlay").addChangeListener(this._updateAllOverlayMessages, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._updateOverlayMessage, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._updateOverlayMessage, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._updateOverlayMessage, this);
}

WebInspector.OverlayController.prototype = {
    _updateAllOverlayMessages: function() {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.Browser))
            this._updateTargetOverlayMessage(/** @type {!WebInspector.DebuggerModel} */ (WebInspector.DebuggerModel.fromTarget(target)));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateOverlayMessage: function(event) {
        this._updateTargetOverlayMessage(/** @type {!WebInspector.DebuggerModel} */ (event.target));
    },

    /**
     * @param {!WebInspector.DebuggerModel} debuggerModel
     */
    _updateTargetOverlayMessage: function(debuggerModel) {
        if (!debuggerModel.target().hasBrowserCapability())
            return;
        var message = debuggerModel.isPaused() && !WebInspector.moduleSetting("disablePausedStateOverlay").get() ? WebInspector.UIString("Paused in debugger") : undefined;
        // this try-catch wrapping is just a HACK to silence regression:
        //     Internal Dirac Error: DevTools code has thrown an unhandled exception
        //     TypeError: debuggerModel.target(...).pageAgent(...).setOverlayMessage is not a function
        //         at WebInspector.OverlayController._updateTargetOverlayMessage
        //          (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:10985:198) at
        //          WebInspector.OverlayController._updateOverlayMessage
        //          (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:10983:7) at
        //          WebInspector.DebuggerModel.dispatchEventToListeners
        //          (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:752:185) at
        //          WebInspector.DebuggerModel._setDebuggerPausedDetails
        //          (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:5715:6) at
        //          WebInspector.DebuggerModel._pausedScript
        //          (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:5719:129) at
        //          WebInspector.DebuggerDispatcher.paused (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:5780:22) at Object.dispatch (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:4355:63) at WebInspector.WebSocketConnection.dispatch (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:4295:31) at WebInspector.WebSocketConnection._onMessage (chrome-extension://epkhgbbmecfbomdhhgjnlidlmdgiapfp/devtools/front_end/inspector.js:10997:31)
        try {
            debuggerModel.target().pageAgent().setOverlayMessage(message);
        } catch (e) {

        }
    }
}
