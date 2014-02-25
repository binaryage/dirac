
// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.SourcesPanel.EditorAction}
 */
WebInspector.InplaceFormatterEditorAction = function()
{
}

WebInspector.InplaceFormatterEditorAction.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _editorSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._updateButton(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorClosed: function(event)
    {
        var wasSelected = /** @type {boolean} */ (event.data.wasSelected);
        if (wasSelected)
            this._updateButton(null);
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     */
    _updateButton: function(uiSourceCode)
    {
        this._button.element.enableStyleClass("hidden", !this._isFormattable(uiSourceCode));
    },

    /**
     * @param {!WebInspector.SourcesPanel} panel
     * @return {!Element}
     */
    button: function(panel)
    {
        if (this._button)
            return this._button.element;

        this._panel = panel;
        this._panel.addEventListener(WebInspector.SourcesPanel.Events.EditorSelected, this._editorSelected.bind(this));
        this._panel.addEventListener(WebInspector.SourcesPanel.Events.EditorClosed, this._editorClosed.bind(this));

        this._button = new WebInspector.StatusBarButton(WebInspector.UIString("Format"), "sources-toggle-pretty-print-status-bar-item");
        this._button.toggled = false;
        this._button.addEventListener("click", this._formatSourceInPlace, this);
        this._updateButton(null);

        return this._button.element;
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    _isFormattable: function(uiSourceCode)
    {
        return !!uiSourceCode && uiSourceCode.contentType() === WebInspector.resourceTypes.Stylesheet;
    },

    _formatSourceInPlace: function()
    {
        var uiSourceCode = this._panel.selectedUISourceCode();
        if (!this._isFormattable(uiSourceCode))
            return;

        if (uiSourceCode.isDirty())
            contentLoaded.call(this, uiSourceCode.workingCopy());
        else
            uiSourceCode.requestContent(contentLoaded.bind(this));

        /**
         * @this {WebInspector.InplaceFormatterEditorAction}
         * @param {?string} content
         */
        function contentLoaded(content)
        {
            var formatter = WebInspector.Formatter.createFormatter(uiSourceCode.contentType());
            formatter.formatContent(uiSourceCode.highlighterType(), content || "", innerCallback.bind(this));
        }

        /**
         * @this {WebInspector.InplaceFormatterEditorAction}
         * @param {string} formattedContent
         * @param {!WebInspector.FormatterSourceMapping} formatterMapping
         */
        function innerCallback(formattedContent, formatterMapping)
        {
            if (uiSourceCode.workingCopy() === formattedContent)
                return;
            var sourceFrame = this._panel.viewForFile(uiSourceCode);
            var start = [0, 0];
            if (sourceFrame) {
                var selection = sourceFrame.selection();
                start = formatterMapping.originalToFormatted(selection.startLine, selection.startColumn);
            }
            uiSourceCode.setWorkingCopy(formattedContent);
            this._panel.showUISourceCode(uiSourceCode, start[0], start[1]);
        }
    },
}
