// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.App}
 */
WebInspector.SimpleApp = function()
{
    WebInspector.App.call(this);
};

WebInspector.SimpleApp.prototype = {
    presentUI: function()
    {
        var rootView = new WebInspector.RootView();
        WebInspector.inspectorView.show(rootView.element);
        WebInspector.inspectorView.showInitialPanel();
        rootView.attachToBody();
    },

    __proto__: WebInspector.App.prototype
};
