/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @implements {WebInspector.ViewFactory}
 */
WebInspector.ElementsPanelDescriptor = function()
{
    WebInspector.moduleManager.registerModule(
        {
            name: "ElementsPanel",
            extensions: [
                {
                    type: "@WebInspector.Panel",
                    name: "elements",
                    title: "Elements",
                    className: "WebInspector.ElementsPanel"
                },
                {
                    type: "@WebInspector.ContextMenu.Provider",
                    contextTypes: ["WebInspector.RemoteObject", "WebInspector.DOMNode"],
                    className: "WebInspector.ElementsPanel.ContextMenuProvider"
                }
            ],
            scripts: [ "ElementsPanel.js" ]
        }
    );
    this._init();
}

WebInspector.ElementsPanelDescriptor.prototype = {
    _init: function()
    {
        /**
         * Install emulation view.
         * @this {WebInspector.ElementsPanelDescriptor}
         */
        function toggleEmulationView()
        {
            if (WebInspector.settings.showEmulationViewInDrawer.get())
                WebInspector.inspectorView.registerViewInDrawer("emulation", WebInspector.UIString("Emulation"), this);
            else
                WebInspector.inspectorView.unregisterViewInDrawer("emulation");
        }
        WebInspector.settings.showEmulationViewInDrawer.addChangeListener(toggleEmulationView, this);
        toggleEmulationView.call(this);

        /**
         * Install rendering view.
         * @this {WebInspector.ElementsPanelDescriptor}
         */
        function toggleRenderingView()
        {
            if (WebInspector.settings.showRenderingViewInDrawer.get())
                WebInspector.inspectorView.registerViewInDrawer("rendering", WebInspector.UIString("Rendering"), this);
            else
                WebInspector.inspectorView.unregisterViewInDrawer("rendering");
        }
        WebInspector.settings.showRenderingViewInDrawer.addChangeListener(toggleRenderingView, this);
        toggleRenderingView.call(this);
    },

    /**
     * @param {string=} id
     * @return {?WebInspector.View}
     */
    createView: function(id)
    {
        return WebInspector.panel("elements").createView(id);
    }
}
