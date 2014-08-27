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
 * @param {!Error=} error
 */
WebInspector.DocumentationView.showDocumentationURL = function(url, error)
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
        var descriptors = this._determineDescriptors(textEditor);

        if (!descriptors.length)
            return;
        if (descriptors.length === 1) {
            var formatString = WebInspector.useLowerCaseMenuTitles() ? "Show documentation for %s.%s" : "Show Documentation for %s.%s";
            contextMenu.appendItem(WebInspector.UIString(formatString, descriptors[0].name(), descriptors[0].searchItem()), WebInspector.DocumentationView.showDocumentationURL.bind(null, descriptors[0].url()));
            return;
        }
        var subMenuItem = contextMenu.appendSubMenuItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show documentation for..." : "Show Documentation for..."));
        for (var i = 0; i < descriptors.length; ++i)
            subMenuItem.appendItem(String.sprintf("%s.%s", descriptors[i].name(), descriptors[i].searchItem()), WebInspector.DocumentationView.showDocumentationURL.bind(null, descriptors[i].url()));
    },

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     * @return {!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>}
     */
    _determineDescriptors: function(textEditor)
    {
        var urlProvider = WebInspector.DocumentationURLProvider.instance();
        var textSelection = textEditor.selection().normalize();

        if (!textSelection.isEmpty()) {
            if (textSelection.startLine !== textSelection.endLine)
                return [];
            return urlProvider.itemDescriptors(textEditor.copyRange(textSelection));
        }

        var descriptors = computeDescriptors(textSelection.startColumn);
        if (descriptors.length)
            return descriptors;

        return computeDescriptors(textSelection.startColumn - 1);

        /**
         * @param {number} column
         * @return {!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>}
         */
        function computeDescriptors(column)
        {
            var token = textEditor.tokenAtTextPosition(textSelection.startLine, column);
            if (!token)
                return [];
            var tokenText = textEditor.line(textSelection.startLine).substring(token.startColumn, token.endColumn);
            return urlProvider.itemDescriptors(tokenText);
        }
    }
}
