// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ActionRegistry = function()
{
    /** @type {!StringMap.<!WebInspector.ModuleManager.Extension>} */
    this._actionsById = new StringMap();
    this._registerActions();
}

WebInspector.ActionRegistry.prototype = {
    _registerActions: function()
    {
        WebInspector.moduleManager.extensions(WebInspector.ActionDelegate).forEach(registerExtension, this);

        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @this {WebInspector.ActionRegistry}
         */
        function registerExtension(extension)
        {
            var actionId = extension.descriptor()["actionId"];
            console.assert(actionId);
            console.assert(!this._actionsById.get(actionId));
            this._actionsById.put(actionId, extension);
        }
    },

    /**
     * @param {string} actionId
     * @param {!Event} event
     * @return {boolean}
     */
    execute: function(actionId, event)
    {
        var extension = this._actionsById.get(actionId);
        console.assert(extension, "No action found for actionId '" + actionId + "'");
        return extension.instance().handleAction(WebInspector.context, event);
    }
}

/**
 * @interface
 */
WebInspector.ActionDelegate = function()
{
}

WebInspector.ActionDelegate.prototype = {
    /**
     * @param {!WebInspector.Context} context
     * @param {!Event} event
     * @return {boolean}
     */
    handleAction: function(context, event) {}
}

/** @type {!WebInspector.ActionRegistry} */
WebInspector.actionRegistry;
