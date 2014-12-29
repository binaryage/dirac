// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.FileSystemMapping} fileSystemMapping
 */
WebInspector.NetworkMapping = function(workspace, fileSystemMapping)
{
    this._workspace = workspace;
    this._fileSystemMapping = fileSystemMapping;
}

WebInspector.NetworkMapping.prototype = {
    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {string}
     */
    networkURL: function(uiSourceCode)
    {
        // FIXME: This should use fileSystemMapping to determine url.
        return uiSourceCode.networkURL();
    },

    // FIXME: Network URL related workspace methods like uiSourceCodeForURL should be moved here.
}

/**
 * @type {!WebInspector.NetworkMapping}
 */
WebInspector.networkMapping;
