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
     * @param {!Array.<string>} actionIds
     * @return {!Array.<number>}
     */
    keysForActions: function(actionIds)
    {
        var actionIdSet = actionIds.keySet();
        var result = [];
        for (var key in this._keyToAction) {
            var extensions = this._keyToAction[key];
            extensions.some(function(extension) {
               if (actionIdSet.hasOwnProperty(extension.descriptor()["actionId"])) {
                   result.push(key);
                   return true;
               }
            });
        }
        return result;
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
            if (!isPossiblyInputKey()) {
                if (handler.call(this, extensions[i]))
                    break;
            } else {
                this._pendingActionTimer = setTimeout(handler.bind(this, extensions[i]), 0);
                break;
            }
        }

        /**
         * @return {boolean}
         */
        function isPossiblyInputKey()
        {
            if (!event || !WebInspector.isBeingEdited(event.target) || /^F\d+|Control|Shift|Alt|Meta|Win|U\+001B$/.test(keyIdentifier))
                return false;

            if (!keyModifiers)
                return true;

            var modifiers = WebInspector.KeyboardShortcut.Modifiers;
            if ((keyModifiers & (modifiers.Ctrl | modifiers.Alt)) === (modifiers.Ctrl | modifiers.Alt))
                return WebInspector.isWin();

            return !hasModifier(modifiers.Ctrl) && !hasModifier(modifiers.Alt) && !hasModifier(modifiers.Meta);
        }

        /**
         * @param {number} mod
         * @return {boolean}
         */
        function hasModifier(mod)
        {
            return !!(keyModifiers & mod);
        }

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @return {boolean}
         * @this {WebInspector.ShortcutRegistry}
         */
        function handler(extension)
        {
            var result = this._actionRegistry.execute(extension.descriptor()["actionId"]);
            if (result && event)
                event.consume(true);
            delete this._pendingActionTimer;
            return result;
        }
    },

    /**
     * @param {?Event} event
     */
    _onInput: function(event)
    {
        if (this._pendingActionTimer) {
            clearTimeout(this._pendingActionTimer);
            delete this._pendingActionTimer;
        }
    },

    _registerBindings: function()
    {
        document.addEventListener("input", this._onInput.bind(this), true);
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
                var shortcuts = bindings[i]["shortcut"].split(/\s+/);
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
