// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.Toolbox = function()
{
    if (!window.opener)
        return;

    WebInspector.zoomManager = new WebInspector.ZoomManager(window.opener.InspectorFrontendHost);
    WebInspector.overridesSupport = window.opener.WebInspector.overridesSupport;
    WebInspector.settings = window.opener.WebInspector.settings;
    WebInspector.experimentsSettings = window.opener.WebInspector.experimentsSettings;
    WebInspector.targetManager = window.opener.WebInspector.targetManager;
    WebInspector.workspace = window.opener.WebInspector.workspace;
    WebInspector.cssWorkspaceBinding = window.opener.WebInspector.cssWorkspaceBinding;
    WebInspector.Revealer = window.opener.WebInspector.Revealer;
    WebInspector.ContextMenu = window.opener.WebInspector.ContextMenu;
    WebInspector.ContextMenu.installHandler(document);
    WebInspector.installPortStyles();

    var delegate = /** @type {!WebInspector.ToolboxDelegate} */ (window.opener.WebInspector["app"]);
    var rootView = new WebInspector.RootView();
    var inspectedPagePlaceholder = new WebInspector.InspectedPagePlaceholder();
    this._responsiveDesignView = new WebInspector.ResponsiveDesignView(inspectedPagePlaceholder);
    this._responsiveDesignView.show(rootView.element);
    rootView.attachToBody();
    delegate.toolboxLoaded(this._responsiveDesignView, inspectedPagePlaceholder);
}

// FIXME: This stub is invoked from the backend and should be removed
// once we migrate to the "pull" model for extensions retrieval.
WebInspector.addExtensions = function() {}

function windowLoaded()
{
    window.removeEventListener("DOMContentLoaded", windowLoaded, false);
    new WebInspector.Toolbox();
}

if (document.readyState === "complete")
    new WebInspector.Toolbox();
else
    window.addEventListener("DOMContentLoaded", windowLoaded, false);
