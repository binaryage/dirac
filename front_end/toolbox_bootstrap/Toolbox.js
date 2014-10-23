// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @suppressGlobalPropertiesCheck
 */
WebInspector.Toolbox = function()
{
    if (!window.opener)
        return;

    var delegate = /** @type {!WebInspector.ToolboxHost} */ (window.opener.WebInspector["app"]);

    WebInspector.initializeUIUtils(window);
    WebInspector.zoomManager = new WebInspector.ZoomManager(window, delegate.inspectorFrontendHost());
    WebInspector.ContextMenu.installHandler(document);

    var rootView = new WebInspector.RootView();
    delegate.toolboxLoaded(rootView.element);
    rootView.attachToBody();
}

// FIXME: This stub is invoked from the backend and should be removed
// once we migrate to the "pull" model for extensions retrieval.
WebInspector.addExtensions = function() {}

/**
 * FIXME: Remove FIXME once http://crbug.com/425506 is fixed.
 * @suppressGlobalPropertiesCheck
 */
function windowLoaded()
{
    window.removeEventListener("DOMContentLoaded", windowLoaded, false);
    new WebInspector.Toolbox();
}

/**
 * FIXME: Remove FIXME once http://crbug.com/425506 is fixed.
 * @suppressGlobalPropertiesCheck
 */
function initToolbox()
{
    if (document.readyState === "complete")
        new WebInspector.Toolbox();
    else
        window.addEventListener("DOMContentLoaded", windowLoaded, false);
}
initToolbox();
