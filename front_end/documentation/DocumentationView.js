// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.DocumentationView = function()
{
    WebInspector.VBox.call(this);
}

/**
 * @param {string} url
 */
WebInspector.DocumentationView.showDocumentationURL = function(url)
{
    if (!WebInspector.DocumentationView._view)
        WebInspector.DocumentationView._view = new WebInspector.DocumentationView();
    var view = WebInspector.DocumentationView._view;
    WebInspector.inspectorView.showCloseableViewInDrawer("documentation", WebInspector.UIString("Documentation"), view);
}

WebInspector.DocumentationView.prototype = {
    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.DocumentationView.ContextMenuProvider = function()
{
}

WebInspector.DocumentationView.ContextMenuProvider.prototype = {
    /**
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        if (!(target instanceof WebInspector.CodeMirrorTextEditor))
            return;
        var textEditor = /** @type {!WebInspector.CodeMirrorTextEditor} */ (target);
        var selection = textEditor.selection();
        if (!selection || selection.isEmpty() || selection.startLine !== selection.endLine)
            return;
        var selectedText = textEditor.copyRange(selection);
        var urlProvider = new WebInspector.DocumentationURLProvider();
        var possibleProperties = urlProvider.itemDescriptors(selectedText);
        if (!possibleProperties.length)
            return;
        if (possibleProperties.length === 1) {
            var formatString = WebInspector.useLowerCaseMenuTitles() ? "Show documentation for %s.%s" : "Show Documentation for %s.%s";
            contextMenu.appendItem(WebInspector.UIString(formatString, possibleProperties[0].name, selectedText), WebInspector.DocumentationView.showDocumentationURL.bind(null, possibleProperties[0].url));
            return;
        }
        var subMenuItem = contextMenu.appendSubMenuItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show documentation for..." : "Show Documentation for..."));
        for (var i = 0; i < possibleProperties.length; ++i)
            subMenuItem.appendItem(String.sprintf("%s.%s", possibleProperties[i].name, selectedText), WebInspector.DocumentationView.showDocumentationURL.bind(null, possibleProperties[i].url));
    }
}
