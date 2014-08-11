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
 * @param {string} searchTerm
 */
WebInspector.DocumentationView.showSearchTerm = function(searchTerm)
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
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show documentation" : "Show Documentation"), this._showDocumentation.bind(this, textEditor));
    },

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     */
    _showDocumentation: function(textEditor)
    {
        var selection = textEditor.selection();
        if (!selection || selection.isEmpty())
            return;
        var selectedText = textEditor.copyRange(selection);
        WebInspector.DocumentationView.showSearchTerm(selectedText);
    }
}
