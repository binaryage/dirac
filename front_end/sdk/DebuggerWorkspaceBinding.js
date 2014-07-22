// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.DebuggerWorkspaceBinding = function()
{
}

WebInspector.DebuggerWorkspaceBinding.prototype = {

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.Script.Location}
     */
    createLiveLocation: function(rawLocation, updateDelegate)
    {
        return rawLocation.createLiveLocation(updateDelegate);
    },

    /**
     * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.Script.Location}
     */
    createCallFrameLiveLocation: function(callFrame, updateDelegate)
    {
        return callFrame.createLiveLocation(updateDelegate);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        return rawLocation.target().debuggerModel.rawLocationToUILocation(rawLocation);
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(target, uiSourceCode, lineNumber, columnNumber)
    {
        return /** @type {!WebInspector.DebuggerModel.Location} */ (uiSourceCode.uiLocationToRawLocation(target, lineNumber, columnNumber));
    }
}

/**
 * @type {!WebInspector.DebuggerWorkspaceBinding}
 */
WebInspector.debuggerWorkspaceBinding;
