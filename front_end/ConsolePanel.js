/*
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.ViewFactory}
 */
WebInspector.ConsolePanel = function()
{
    WebInspector.Panel.call(this, "console");
    this._view = WebInspector.consoleView;
}

WebInspector.ConsolePanel.prototype = {
    /**
     * @param {string=} id
     * @return {?WebInspector.View}
     */
    createView: function(id)
    {
        if (!this._consoleViewWrapper) {
            this._consoleViewWrapper = new WebInspector.ConsolePanel.WrapperView();
            this._consoleViewWrapper.element.classList.add("fill", "console-view-wrapper");
            if (WebInspector.inspectorView.currentPanel() !== this)
                this._showViewInWrapper();
        }
        return this._consoleViewWrapper;
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this._view.defaultFocusedElement();
    },

    wasShown: function()
    {
        WebInspector.Panel.prototype.wasShown.call(this);
        if (WebInspector.inspectorView.drawer().visible() && WebInspector.inspectorView.selectedViewInDrawer() === "console") {
            WebInspector.inspectorView.drawer().hide(true);
            this._drawerWasVisible = true;
        }
        this._view.show(this.element);
    },

    willHide: function()
    {
        if (this._drawerWasVisible) {
            WebInspector.inspectorView.drawer().show(true);
            delete this._drawerWasVisible;
        }

        WebInspector.Panel.prototype.willHide.call(this);
        this._showViewInWrapper();
    },

    _showViewInWrapper: function()
    {
        if (this._consoleViewWrapper)
            this._consoleViewWrapper.setWrappedView(this._view);
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.ConsolePanel.WrapperView = function()
{
    WebInspector.View.call(this);
}

WebInspector.ConsolePanel.WrapperView.prototype = {
    /**
     * @param {!WebInspector.View} view
     */
    setWrappedView: function(view)
    {
        this._view = view;
        this._view.show(this.element);
    },

    focus: function()
    {
        if (this._view)
            this._view.focus();
        else
            WebInspector.View.prototype.focus.call(this);
    },

    __proto__: WebInspector.View.prototype
}
