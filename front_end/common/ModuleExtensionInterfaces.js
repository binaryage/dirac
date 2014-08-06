// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
WebInspector.Renderer = function()
{
}

WebInspector.Renderer.prototype = {
    /**
     * @param {!Object} object
     * @return {?Element}
     */
    render: function(object) {}
}

/**
 * @interface
 */
WebInspector.Revealer = function()
{
}

/**
 * @param {?Object} revealable
 * @param {number=} lineNumber
 */
WebInspector.Revealer.reveal = function(revealable, lineNumber)
{
    if (!revealable)
        return;
    var revealer = self.runtime.instance(WebInspector.Revealer, revealable);
    if (revealer)
        revealer.reveal(revealable, lineNumber);
}

WebInspector.Revealer.prototype = {
    /**
     * @param {!Object} object
     * @param {number=} lineNumber
     */
    reveal: function(object, lineNumber) {}
}

/**
 * @interface
 */
WebInspector.NodeRemoteObjectInspector = function()
{
}

WebInspector.NodeRemoteObjectInspector.prototype = {
    /**
     * @param {!Object} object
     */
    inspectNodeObject: function(object) {}
}
