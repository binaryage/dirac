// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ForwardedInputEventHandler = function()
{
}

WebInspector.ForwardedInputEventHandler.prototype = {
    /**
     * @param {string} type
     * @param {string} keyIdentifier
     * @param {number} keyCode
     * @param {number} modifiers
     */
    keyEventReceived: function(type, keyIdentifier, keyCode, modifiers)
    {
        if (type !== "keydown")
            return;

        // FIXME: Wire this to the shortcut/action subsystem.
        if (keyIdentifier === "F8" && !modifiers)
            /** @type {!WebInspector.SourcesPanel} */ (WebInspector.inspectorView.showPanel("sources")).togglePause();

        WebInspector.shortcutRegistry.handleKey(WebInspector.KeyboardShortcut.makeKey(keyCode, modifiers), keyIdentifier);
    }
}

/** @type {!WebInspector.ForwardedInputEventHandler} */
WebInspector.forwardedEventHandler = new WebInspector.ForwardedInputEventHandler();
