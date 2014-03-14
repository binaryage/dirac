/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @type {!Array.<!WebInspector.ModuleManager.ModuleDescriptor>}
 */
var allDescriptors = [
    {
        name: "elements",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "elements",
                title: "Elements",
                order: 0,
                className: "WebInspector.ElementsPanel"
            },
            {
                type: "@WebInspector.ContextMenu.Provider",
                contextTypes: ["WebInspector.RemoteObject", "WebInspector.DOMNode"],
                className: "WebInspector.ElementsPanel.ContextMenuProvider"
            },
            {
                type: "@WebInspector.Drawer.ViewFactory",
                name: "emulation",
                title: "Emulation",
                order: "10",
                setting: "showEmulationViewInDrawer",
                className: "WebInspector.ElementsPanel.OverridesViewFactory"
            },
            {
                type: "@WebInspector.Drawer.ViewFactory",
                name: "rendering",
                title: "Rendering",
                order: "11",
                setting: "showRenderingViewInDrawer",
                className: "WebInspector.ElementsPanel.RenderingViewFactory"
            },
            {
                type: "@WebInspector.Renderer",
                contextTypes: ["WebInspector.DOMNode"],
                className: "WebInspector.ElementsTreeOutline.Renderer"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.DOMNode"],
                className: "WebInspector.ElementsPanel.DOMNodeRevealer"
            }
        ],
        scripts: [ "ElementsPanel.js" ]
    },
    {
        name: "network",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "network",
                title: "Network",
                order: 1,
                className: "WebInspector.NetworkPanel"
            },
            {
                type: "@WebInspector.ContextMenu.Provider",
                contextTypes: ["WebInspector.NetworkRequest", "WebInspector.Resource", "WebInspector.UISourceCode"],
                className: "WebInspector.NetworkPanel.ContextMenuProvider"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.NetworkRequest"],
                className: "WebInspector.NetworkPanel.RequestRevealer"
            }
        ],
        scripts: [ "NetworkPanel.js" ]
    },
    {
        name: "codemirror",
        extensions: [
            {
                type: "@WebInspector.InplaceEditor",
                className: "WebInspector.CodeMirrorUtils"
            },
            {
              type: "@WebInspector.TokenizerFactory",
              className: "WebInspector.CodeMirrorUtils.TokenizerFactory"
            },
        ],
        scripts: [ "CodeMirrorTextEditor.js" ]
    },
    {
        name: "sources",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "sources",
                title: "Sources",
                order: 2,
                className: "WebInspector.SourcesPanel"
            },
            {
                type: "@WebInspector.ContextMenu.Provider",
                contextTypes: ["WebInspector.UISourceCode", "WebInspector.RemoteObject"],
                className: "WebInspector.SourcesPanel.ContextMenuProvider"
            },
            {
                type: "@WebInspector.SearchScope",
                className: "WebInspector.SourcesSearchScope"
            },
            {
                type: "@WebInspector.Drawer.ViewFactory",
                name: "search",
                title: "Search",
                order: "1",
                className: "WebInspector.AdvancedSearchController.ViewFactory"
            },
            {
                type: "@WebInspector.DrawerEditor",
                className: "WebInspector.SourcesPanel.DrawerEditor"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.UILocation"],
                className: "WebInspector.SourcesPanel.UILocationRevealer"
            }
        ],
        scripts: [ "SourcesPanel.js" ]
    },
    {
        name: "timeline",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "timeline",
                title: "Timeline",
                order: 3,
                className: "WebInspector.TimelinePanel"
            }
        ],
        scripts: [ "TimelinePanel.js" ]
    },
    {
        name: "profiles",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "profiles",
                title: "Profiles",
                order: 4,
                className: "WebInspector.ProfilesPanel"
            },
            {
                type: "@WebInspector.ContextMenu.Provider",
                contextTypes: ["WebInspector.RemoteObject"],
                className: "WebInspector.ProfilesPanel.ContextMenuProvider"
            }
        ],
        scripts: [ "ProfilesPanel.js" ]
    },
    {
        name: "resources",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "resources",
                title: "Resources",
                order: 5,
                className: "WebInspector.ResourcesPanel"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.Resource"],
                className: "WebInspector.ResourcesPanel.ResourceRevealer"
            }
        ],
        scripts: [ "ResourcesPanel.js" ]
    },
    {
        name: "audits",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "audits",
                title: "Audits",
                order: 6,
                className: "WebInspector.AuditsPanel"
            }
        ],
        scripts: [ "AuditsPanel.js" ]
    },
    {
        name: "console",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "console",
                title: "Console",
                order: 20,
                className: "WebInspector.ConsolePanel"
            },
            {
                type: "@WebInspector.Drawer.ViewFactory",
                name: "console",
                title: "Console",
                order: "0",
                className: "WebInspector.ConsolePanel.ViewFactory"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.ConsoleModel"],
                className: "WebInspector.ConsolePanel.ConsoleRevealer"
            }
        ],
        scripts: [ "ConsolePanel.js" ]
    },
    {
        extensions: [
            {
                type: "@WebInspector.ExtensionServerAPI",
                className: "WebInspector.ExtensionServer"
            }
        ],
        name: "extensions",
        scripts: [ "ExtensionServer.js" ]
    },
    {
        name: "layers",
        extensions: [
            {
                type: "@WebInspector.Panel",
                name: "layers",
                title: "Layers",
                order: 7,
                className: "WebInspector.LayersPanel"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.LayerTreeSnapshot"],
                className: "WebInspector.LayersPanel.LayerTreeRevealer"
            }
        ],
        scripts: [ "LayersPanel.js" ]
    },
    {
        name: "handler-registry",
        extensions: [
            {
                type: "@WebInspector.ContextMenu.Provider",
                contextTypes: ["WebInspector.UISourceCode", "WebInspector.Resource", "WebInspector.NetworkRequest", "Node"],
                className: "WebInspector.HandlerRegistry.ContextMenuProvider"
            }
        ]
    },
    {
        name: "sources-formatter-actions",
        extensions: [
            {
                type: "@WebInspector.SourcesPanel.EditorAction",
                className: "WebInspector.InplaceFormatterEditorAction"
            },
            {
                type: "@WebInspector.SourcesPanel.EditorAction",
                className: "WebInspector.ScriptFormatterEditorAction"
            }
        ]
    }
];
