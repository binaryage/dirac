/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
 * @extends {WebInspector.View}
 * @constructor
 */
WebInspector.Panel = function(name)
{
    WebInspector.View.call(this);
    WebInspector.panels[name] = this;

    this.element.classList.add("panel");
    this.element.classList.add(name);
    this._panelName = name;

    this._shortcuts = /** !Object.<number, function(Event=):boolean> */ ({});
}

// Should by in sync with style declarations.
WebInspector.Panel.counterRightMargin = 25;

WebInspector.Panel.prototype = {
    get name()
    {
        return this._panelName;
    },

    reset: function()
    {
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.element;
    },

    /**
     * @return {?WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return null;
    },

    /**
     * @param {string} text
     */
    replaceSelectionWith: function(text)
    {
    },

    /**
     * @param {string} query
     * @param {string} text
     */
    replaceAllWith: function(query, text)
    {
    },

    // Should be implemented by ancestors.
    get statusBarItems()
    {
    },

    /**
     * @param {!Element} anchor
     * @return {boolean}
     */
    showAnchorLocation: function(anchor)
    {
        return false;
    },

    /**
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [];
    },

    /**
     * @param {!KeyboardEvent} event
     */
    handleShortcut: function(event)
    {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler(event)) {
            event.handled = true;
            return;
        }

        var searchableView = this.searchableView();
        if (!searchableView)
            return;

        function handleSearchShortcuts(shortcuts, handler)
        {
            for (var i = 0; i < shortcuts.length; ++i) {
                if (shortcuts[i].key !== shortcutKey)
                    continue;
                return handler.call(searchableView);
            }
            return false;
        }

        if (handleSearchShortcuts(WebInspector.SearchableView.findShortcuts(), searchableView.handleFindShortcut))
            event.handled = true;
        else if (handleSearchShortcuts(WebInspector.SearchableView.cancelSearchShortcuts(), searchableView.handleCancelSearchShortcut))
            event.handled = true;
    },

    /**
     * @param {!Array.<!WebInspector.KeyboardShortcut.Descriptor>} keys
     * @param {function(?Event=):boolean} handler
     */
    registerShortcuts: function(keys, handler)
    {
        for (var i = 0; i < keys.length; ++i)
            this._shortcuts[keys[i].key] = handler;
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @extends {WebInspector.Panel}
 * @param {number=} defaultWidth
 * @constructor
 */
WebInspector.PanelWithSidebarTree = function(name, defaultWidth)
{
    WebInspector.Panel.call(this, name);

    this._panelSplitView = new WebInspector.SplitView(true, false, this._panelName + "SidebarWidth", defaultWidth || Preferences.minSidebarWidth);
    this._panelSplitView.setMainElementConstraints(0.5, 0.5);
    this._panelSplitView.show(this.element);

    var sidebarElement = this._panelSplitView.sidebarElement();
    sidebarElement.classList.add("sidebar");
    var sidebarTreeElement = sidebarElement.createChild("ol", "sidebar-tree");
    this.sidebarTree = new TreeOutline(sidebarTreeElement);
}

WebInspector.PanelWithSidebarTree.prototype = {
    /**
     * @return {!Element}
     */
    sidebarElement: function()
    {
        return this._panelSplitView.sidebarElement();
    },

    /**
     * @return {!Element} element
     */
    mainElement: function()
    {
        return this._panelSplitView.mainElement();
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.sidebarTree.element || this.element;
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @interface
 */
WebInspector.PanelDescriptor = function()
{
}

WebInspector.PanelDescriptor.prototype = {
    /**
     * @return {string}
     */
    name: function() {},

    /**
     * @return {string}
     */
    title: function() {},

    /**
     * @return {!WebInspector.Panel}
     */
    panel: function() {}
}

/**
 * @constructor
 * @param {!WebInspector.ModuleManager.Extension} extension
 * @implements {WebInspector.PanelDescriptor}
 */
WebInspector.ModuleManagerExtensionPanelDescriptor = function(extension)
{
    this._name = extension.descriptor()["name"];
    this._title = WebInspector.UIString(extension.descriptor()["title"]);
    this._extension = extension;
}

WebInspector.ModuleManagerExtensionPanelDescriptor.prototype = {
    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @return {!WebInspector.Panel}
     */
    panel: function()
    {
        return /** @type {!WebInspector.Panel} */ (this._extension.instance());
    }
}
