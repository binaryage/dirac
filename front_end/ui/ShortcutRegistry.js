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
    /** @type {!StringMultimap.<string>} */
    this._defaultKeyToActions = new StringMultimap();
    this._registerBindings();
}

WebInspector.ShortcutRegistry.prototype = {
    /**
     * @param {number} key
     * @return {!Array.<string>}
     */
    applicableActions: function(key)
    {
        return this._actionRegistry.applicableActions(this._actionIdsForKey(key), WebInspector.context);
    },

    /**
     * @param {number} key
     * @return {!Array.<string>}
     */
    _actionIdsForKey: function(key)
    {
        var result = new StringSet();
        var defaults = this._defaultActionsForKey(key);
        defaults.values().forEach(function(actionId) {
            result.add(actionId);
        }, this);

        return result.values();
    },

    /**
     * @param {number} key
     * @return {!Set.<string>}
     */
    _defaultActionsForKey: function(key)
    {
        return this._defaultKeyToActions.get(String(key));
    },

    /**
     * @param {!Array.<string>} actionIds
     * @return {!Array.<number>}
     */
    keysForActions: function(actionIds)
    {
        var actionIdSet = actionIds.keySet();
        var result = [];
        this._defaultKeyToActions.keys().forEach(function(key) {
            var actionIdsForKey = this._defaultKeyToActions.get(key);
            actionIdsForKey.values().some(function(actionId) {
               if (actionIdSet.hasOwnProperty(actionId)) {
                   result.push(key);
                   return true;
               }
            });
        }, this);
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
        var actionIds = this.applicableActions(key);
        if (WebInspector.GlassPane.DefaultFocusedViewStack.length > 1) {
            if (actionIds.length && !isPossiblyInputKey())
                event.consume(true);
            return;
        }

        for (var i = 0; i < actionIds.length; ++i) {
            var keyModifiers = key >> 8;
            if (!isPossiblyInputKey()) {
                if (handler.call(this, actionIds[i]))
                    break;
            } else {
                this._pendingActionTimer = setTimeout(handler.bind(this, actionIds[i]), 0);
                break;
            }
        }

        /**
         * @return {boolean}
         */
        function isPossiblyInputKey()
        {
            if (!event || !WebInspector.isBeingEdited(/** @type {!Node} */ (event.target)) || /^F\d+|Control|Shift|Alt|Meta|Win|U\+001B$/.test(keyIdentifier))
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
         * @param {string} actionId
         * @return {boolean}
         * @this {WebInspector.ShortcutRegistry}
         */
        function handler(actionId)
        {
            var result = this._actionRegistry.execute(actionId);
            if (result && event)
                event.consume(true);
            delete this._pendingActionTimer;
            return result;
        }
    },

    /**
     * @param {string} actionId
     * @param {string} shortcut
     */
    registerShortcut: function(actionId, shortcut)
    {
        var key = WebInspector.KeyboardShortcut.makeKeyFromBindingShortcut(shortcut);
        if (!key)
            return;
        this._defaultKeyToActions.put(String(key), actionId);
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
        var extensions = WebInspector.moduleManager.extensions(WebInspector.ActionDelegate);
        extensions.forEach(registerExtension, this);

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @this {WebInspector.ShortcutRegistry}
         */
        function registerExtension(extension)
        {
            var descriptor = extension.descriptor();
            var bindings = descriptor["bindings"];
            for (var i = 0; bindings && i < bindings.length; ++i) {
                if (!platformMatches(bindings[i].platform))
                    continue;
                var shortcuts = bindings[i]["shortcut"].split(/\s+/);
                shortcuts.forEach(this.registerShortcut.bind(this, descriptor["actionId"]));
            }
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

/**
 * @constructor
 */
WebInspector.ShortcutRegistry.ForwardedShortcut = function()
{
}

WebInspector.ShortcutRegistry.ForwardedShortcut.instance = new WebInspector.ShortcutRegistry.ForwardedShortcut();

/** @type {!WebInspector.ShortcutRegistry} */
WebInspector.shortcutRegistry;
