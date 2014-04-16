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
        name: "main",
        extensions: [
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        platform: "windows,linux",
                        shortcut: "F5 Ctrl+R"
                    },
                    {
                        platform: "mac",
                        shortcut: "Meta+R"
                    }
                ],
                className: "WebInspector.Main.ReloadActionDelegate"
            },
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        platform: "windows,linux",
                        shortcut: "Shift+F5 Ctrl+F5 Ctrl+Shift+F5 Shift+Ctrl+R"
                    },
                    {
                        platform: "mac",
                        shortcut: "Shift+Meta+R"
                    }
                ],
                className: "WebInspector.Main.HardReloadActionDelegate"
            },
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        shortcut: "Esc"
                    }
                ],
                className: "WebInspector.InspectorView.DrawerToggleActionDelegate"
            },
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        shortcut: "Alt+R"
                    }
                ],
                className: "WebInspector.Main.DebugReloadActionDelegate"
            },
            {
                type: "ui-setting",
                title: "Disable cache (while DevTools is open)",
                settingName: "cacheDisabled",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Appearance",
                title: "Split panels vertically when docked to right",
                settingName: "splitVerticallyWhenDockedToRight",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Appearance",
                settingType: "custom",
                className: "WebInspector.Main.ShortcutPanelSwitchSettingDelegate"
            },
            {
                type: "ui-setting",
                section: "Extensions",
                settingType: "custom",
                className: "WebInspector.HandlerRegistry.OpenAnchorLocationSettingDelegate"
            }
        ]
    },
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
                type: "drawer-view",
                name: "emulation",
                title: "Emulation",
                order: "10",
                className: "WebInspector.OverridesView"
            },
            {
                type: "drawer-view",
                name: "rendering",
                title: "Rendering",
                order: "11",
                className: "WebInspector.RenderingOptionsView"
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
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.RemoteObject"],
                className: "WebInspector.ElementsPanel.NodeRemoteObjectRevealer"
            },
            {
                type: "ui-setting",
                section: "Elements",
                title: "Color format",
                settingName: "colorFormat",
                settingType: "select",
                options: [
                    [ "As authored", "original" ],
                    [ "HEX: #DAC0DE", "hex", true ],
                    [ "RGB: rgb(128, 255, 255)", "rgb", true ],
                    [ "HSL: hsl(300, 80%, 90%)", "hsl", true ]
                ]
            },
            {
                type: "ui-setting",
                section: "Elements",
                title: "Show user agent styles",
                settingName: "showUserAgentStyles",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Elements",
                title: "Show user agent shadow DOM",
                settingName: "showUAShadowDOM",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Elements",
                title: "Word wrap",
                settingName: "domWordWrap",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Elements",
                title: "Show rulers",
                settingName: "showMetricsRulers",
                settingType: "checkbox"
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
            {
                type: "ui-setting",
                section: "Sources",
                title: "Default indentation",
                settingName: "textEditorIndent",
                settingType: "select",
                options: [
                    ["2 spaces", "  "],
                    ["4 spaces", "    "],
                    ["8 spaces", "        "],
                    ["Tab character", "\t"]
                ]
            }
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
                type: "@WebInspector.DrawerEditor",
                className: "WebInspector.SourcesPanel.DrawerEditor"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.UILocation"],
                className: "WebInspector.SourcesPanel.UILocationRevealer"
            },
            {
                type: "@WebInspector.SourcesView.EditorAction",
                className: "WebInspector.InplaceFormatterEditorAction"
            },
            {
                type: "@WebInspector.SourcesView.EditorAction",
                className: "WebInspector.ScriptFormatterEditorAction"
            },
            {
                type: "navigator-view",
                name: "sources",
                title: "Sources",
                order: 1,
                className: "WebInspector.SourcesNavigatorView"
            },
            {
                type: "navigator-view",
                name: "contentScripts",
                title: "Content scripts",
                order: 2,
                className: "WebInspector.ContentScriptsNavigatorView"
            },
            {
                type: "navigator-view",
                name: "snippets",
                title: "Snippets",
                order: 3,
                className: "WebInspector.SnippetsNavigatorView"
            },
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        platform: "mac",
                        shortcut: "Meta+O Meta+P"
                    },
                    {
                        platform: "windows,linux",
                        shortcut: "Ctrl+O Ctrl+P"
                    }
                ],
                className: "WebInspector.SourcesPanel.ShowGoToSourceDialogActionDelegate"
            },
            {
                type: "ui-setting",
                settingName: "javaScriptDisabled",
                settingType: "custom",
                className: "WebInspector.SourcesPanel.DisableJavaScriptSettingDelegate"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Search in content scripts",
                settingName: "searchInContentScripts",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Enable JavaScript source maps",
                settingName: "jsSourceMapsEnabled",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Detect indentation",
                settingName: "textEditorAutoDetectIndent",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Autocompletion",
                settingName: "textEditorAutocompletion",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Bracket matching",
                settingName: "textEditorBracketMatching",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Show whitespace characters",
                settingName: "showWhitespacesInEditor",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                title: "Enable CSS source maps",
                settingName: "cssSourceMapsEnabled",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                title: "Auto-reload generated CSS",
                parentSettingName: "cssSourceMapsEnabled",
                settingName: "cssReloadEnabled",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Sources",
                experiment: "frameworksDebuggingSupport",
                title: "Skip stepping through sources with particular names",
                settingName: "skipStackFramesSwitch",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                experiment: "frameworksDebuggingSupport",
                parentSettingName: "skipStackFramesSwitch",
                settingType: "custom",
                className: "WebInspector.SourcesPanel.SkipStackFramePatternSettingDelegate"
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
            },
            {
                type: "ui-setting",
                section: "Profiler",
                title: "Show advanced heap snapshot properties",
                settingName: "showAdvancedHeapSnapshotProperties",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Profiler",
                title: "High resolution CPU profiling",
                settingName: "highResolutionCpuProfiling",
                settingType: "checkbox"
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
                type: "drawer-view",
                name: "console",
                title: "Console",
                order: "0",
                className: "WebInspector.ConsolePanel.WrapperView"
            },
            {
                type: "@WebInspector.Revealer",
                contextTypes: ["WebInspector.ConsoleModel"],
                className: "WebInspector.ConsolePanel.ConsoleRevealer"
            },
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        shortcut: "Ctrl+`"
                    }
                ],
                className: "WebInspector.ConsoleView.ShowConsoleActionDelegate"
            },
            {
                type: "ui-setting",
                section: "Console",
                title: "Log XMLHttpRequests",
                settingName: "monitoringXHREnabled",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Console",
                title: "Preserve log upon navigation",
                settingName: "preserveConsoleLog",
                settingType: "checkbox"
            },
            {
                type: "ui-setting",
                section: "Console",
                title: "Show timestamps",
                settingName: "consoleTimestampsEnabled",
                settingType: "checkbox"
            }
        ],
        scripts: [ "ConsolePanel.js" ]
    },
    {
        name: "search",
        extensions: [
             {
                 type: "drawer-view",
                 name: "search",
                 title: "Search",
                 order: "1",
                 className: "WebInspector.AdvancedSearchView"
             },
             {
                 type: "@WebInspector.ActionDelegate",
                 bindings: [
                     {
                         platform: "mac",
                         shortcut: "Meta+Alt+F"
                     },
                     {
                         platform: "windows,linux",
                         shortcut: "Ctrl+Shift+F"
                     }
                 ],
                 className: "WebInspector.AdvancedSearchView.ToggleDrawerViewActionDelegate"
             }
        ],
        scripts: [ "AdvancedSearchView.js" ]
    },
    {
        name: "devices",
        extensions: [
            {
                type: "drawer-view",
                name: "devices",
                title: "Devices",
                order: "12",
                experiment: "devicesPanel",
                className: "WebInspector.DevicesView"
            }
        ],
        scripts: [ "DevicesView.js" ]
    },
    {
        name: "settings",
        extensions: [
            {
                type: "@WebInspector.ActionDelegate",
                bindings: [
                    {
                        shortcut: "F1 Shift+?"
                    }
                ],
                className: "WebInspector.SettingsController.SettingsScreenActionDelegate"
            }
        ]
    },
    {
        name: "extensions",
        extensions: [
            {
                type: "@WebInspector.ExtensionServerAPI",
                className: "WebInspector.ExtensionServer"
            }
        ],
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
                contextTypes: ["WebInspector.LayerTreeSnapshot", "WebInspector.TracingLayerSnapshot"],
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
    }
];
