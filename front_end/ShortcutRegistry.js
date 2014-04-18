// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.ActionRegistry} actionRegistry
 */
WebInspector.ShortcutRegistry = function(actionRegistry)
{
    this._actionRegistry = actionRegistry;
    this._registerBindings();
}

WebInspector.ShortcutRegistry.prototype = {
    /**
     * @param {number} key
     * @return {!Array.<!WebInspector.ModuleManager.Extension>}
     */
    applicableActions: function(key)
    {
        var extensions = this._keyToAction[key];
        if (!extensions)
            return [];

        return WebInspector.context.applicableExtensions(extensions).items();
    },

    /**
     * @param {!KeyboardEvent} event
     */
    handleShortcut: function(event)
    {
        this.handleKey(WebInspector.KeyboardShortcut.makeKeyFromEvent(event), event.keyIdentifier, event);
    },

    /**
     * @param {number} key
     * @param {string} keyIdentifier
     * @param {!KeyboardEvent=} event
     */
    handleKey: function(key, keyIdentifier, event)
    {
        var extensions = this.applicableActions(key);
        if (!extensions.length)
            return;

        for (var i = 0; i < extensions.length; ++i) {
            var keyModifiers = key >> 8;
            var modifiers = WebInspector.KeyboardShortcut.Modifiers;
            var possiblyPrintableKey = !!event && (!keyModifiers || !!(keyModifiers & modifiers.Shift));
            if (!possiblyPrintableKey && WebInspector.isWin()) {
                var altGrMask = modifiers.Ctrl | modifiers.Alt;
                possiblyPrintableKey = (keyModifiers & altGrMask) === altGrMask;
            }

            if (!possiblyPrintableKey || /^F\d+|Control|Shift|Alt|Meta|Win|U\+001B$/.test(keyIdentifier)) {
                if (handler.call(this, extensions[i]))
                    return;
            } else {
                this._pendingActionTimer = setTimeout(handler.bind(this, extensions[i]), 0);
                break;
            }
        }

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @return {boolean}
         * @this {WebInspector.ShortcutRegistry}
         */
        function handler(extension)
        {
            var result = this._actionRegistry.execute(extension.descriptor()["actionId"]);
            if (result)
                event.consume(true);
            delete this._pendingActionTimer;
            return result;
        }
    },

    /**
     * @param {?Event} event
     */
    _onKeyPress: function(event)
    {
        if (!this._pendingActionTimer)
            return;

        if (WebInspector.isBeingEdited(event.target)) {
            clearTimeout(this._pendingActionTimer);
            delete this._pendingActionTimer;
        }
    },

    _registerBindings: function()
    {
        document.addEventListener("keypress", this._onKeyPress.bind(this), true);
        this._keyToAction = {};
        var extensions = WebInspector.moduleManager.extensions(WebInspector.ActionDelegate);
        extensions.forEach(registerExtension, this);

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @this {WebInspector.ShortcutRegistry}
         */
        function registerExtension(extension)
        {
            var bindings = extension.descriptor()["bindings"];
            for (var i = 0; bindings && i < bindings.length; ++i) {
                if (!platformMatches(bindings[i].platform))
                    continue;
                var shortcuts = bindings[i].shortcut.split(/\s+/);
                shortcuts.forEach(registerShortcut.bind(this, extension));
            }
        }

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @param {string} shortcut
         * @this {WebInspector.ShortcutRegistry}
         */
        function registerShortcut(extension, shortcut)
        {
            var key = WebInspector.KeyboardShortcut.makeKeyFromBindingShortcut(shortcut);
            if (!key)
                return;
            if (this._keyToAction[key])
                this._keyToAction[key].push(extension);
            else
                this._keyToAction[key] = [extension];
        }

        /**
         * @param {string=} platformsString
         * @return {boolean}
         */
        function platformMatches(platformsString)
        {
            if (!platformsString)
                return true;
            var platforms = platformsString.split(",");
            var isMatch = false;
            var currentPlatform = WebInspector.platform();
            for (var i = 0; !isMatch && i < platforms.length; ++i)
                isMatch = platforms[i] === currentPlatform;
            return isMatch;
        }
    }
}

/** @type {!WebInspector.ShortcutRegistry} */
WebInspector.shortcutRegistry;
