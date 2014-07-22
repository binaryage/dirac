// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.CSSWorkspaceBinding = function()
{
}

WebInspector.CSSWorkspaceBinding.prototype = {
    /**
     * @param {!WebInspector.CSSLocation} rawLocation
     * @param {function(!WebInspector.UILocation):(boolean|undefined)} updateDelegate
     * @return {!WebInspector.CSSStyleModel.LiveLocation}
     */
    createLiveLocation: function(rawLocation, updateDelegate)
    {
        return /** @type {!WebInspector.CSSStyleModel.LiveLocation} */ (rawLocation.createLiveLocation(updateDelegate));
    },

    /**
     * @param {!WebInspector.CSSProperty} cssProperty
     * @param {boolean} forName
     * @return {?WebInspector.UILocation}
     */
    propertyUILocation: function(cssProperty, forName)
    {
        var style = cssProperty.ownerStyle;
        if (!style || !style.parentRule || !style.styleSheetId)
            return null;

        var range = cssProperty.range;
        if (!range)
            return null;

        var url = style.parentRule.resourceURL();
        if (!url)
            return null;

        var line = forName ? range.startLine : range.endLine;
        // End of range is exclusive, so subtract 1 from the end offset.
        var column = forName ? range.startColumn : range.endColumn - (cssProperty.text && cssProperty.text.endsWith(";") ? 2 : 1);
        var rawLocation = new WebInspector.CSSLocation(style.target(), style.styleSheetId, url, line, column);
        return this.rawLocationToUILocation(rawLocation);
    },

    /**
     * @param {?WebInspector.CSSLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        return rawLocation ? rawLocation.target().cssModel.rawLocationToUILocation(rawLocation) : null;
    }
}

/**
 * @type {!WebInspector.CSSWorkspaceBinding}
 */
WebInspector.cssWorkspaceBinding;
