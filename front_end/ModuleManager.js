/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {!Array.<!WebInspector.ModuleManager.ModuleDescriptor>} descriptors
 */
WebInspector.ModuleManager = function(descriptors)
{
    /**
     * @type {!Array.<!WebInspector.ModuleManager.Module>}
     */
    this._modules = [];
    /**
     * @type {!Object.<string, !WebInspector.ModuleManager.Module>}
     */
    this._modulesMap = {};
    /**
     * @type {!Array.<!WebInspector.ModuleManager.Extension>}
     */
    this._extensions = [];


    /**
     * @type {!Object.<string, !WebInspector.ModuleManager.ModuleDescriptor>}
     */
    this._descriptorsMap = {};
    for (var i = 0; i < descriptors.length; ++i)
        this._descriptorsMap[descriptors[i]["name"]] = descriptors[i];
}

WebInspector.ModuleManager.prototype = {
    /**
     * @param {!Array.<string>} configuration
     */
    registerModules: function(configuration)
    {
        for (var i = 0; i < configuration.length; ++i)
            this.registerModule(configuration[i]);
    },

    /**
     * @param {string} moduleName
     */
    registerModule: function(moduleName)
    {
        if (!this._descriptorsMap[moduleName])
            throw new Error("Module is not defined: " + moduleName + " " + new Error().stack);
        var module = new WebInspector.ModuleManager.Module(this, this._descriptorsMap[moduleName]);
        this._modules.push(module);
        this._modulesMap[moduleName] = module;
    },

    /**
     * @param {string} moduleName
     */
    loadModule: function(moduleName)
    {
        this._modulesMap[moduleName]._load();
    },

    /**
     * @param {string|!Function} type
     * @param {?Object=} context
     * @return {!Array.<!WebInspector.ModuleManager.Extension>}
     */
    extensions: function(type, context)
    {
        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @return {boolean}
         */
        function filter(extension)
        {
            if (extension._type !== type && extension._typeClass !== type)
                return false;
            return !context || extension.isApplicable(context);
        }
        return this._extensions.filter(filter);
    },

    /**
     * @param {string|!Function} type
     * @param {?Object=} context
     * @return {?WebInspector.ModuleManager.Extension}
     */
    extension: function(type, context)
    {
        return this.extensions(type, context)[0] || null;
    },

    /**
     * @param {string|!Function} type
     * @param {?Object=} context
     * @return {!Array.<!Object>}
     */
    instances: function(type, context)
    {
        /**
         * @param {!WebInspector.ModuleManager.Extension} extension
         * @return {?Object}
         */
        function instantiate(extension)
        {
            return extension.instance();
        }
        return this.extensions(type, context).filter(instantiate).map(instantiate);
    },

    /**
     * @param {string|!Function} type
     * @return {?Object}
     */
    instance: function(type, context)
    {
        var extension = this.extension(type, context);
        return extension ? extension.instance() : null;
    },

    /**
     * @param {string|!Function} type
     * @param {string} nameProperty
     * @param {string} orderProperty
     * @return {function(string, string):number}
     */
    orderComparator: function(type, nameProperty, orderProperty)
    {
        var extensions = this.extensions(type);
        var orderForName = {};
        for (var i = 0; i < extensions.length; ++i) {
            var descriptor = extensions[i].descriptor();
            orderForName[descriptor[nameProperty]] = descriptor[orderProperty];
        }

        /**
         * @param {string} name1
         * @param {string} name2
         * @return {number}
         */
        function result(name1, name2)
        {
            if (name1 in orderForName && name2 in orderForName)
                return orderForName[name1] - orderForName[name2];
            if (name1 in orderForName)
                return -1;
            if (name2 in orderForName)
                return 1;
            return name1.compareTo(name2);
        }
        return result;
    }
}

/**
 * @constructor
 */
WebInspector.ModuleManager.ModuleDescriptor = function()
{
    /**
     * @type {string}
     */
    this.name;

    /**
     * @type {!Array.<!WebInspector.ModuleManager.ExtensionDescriptor>}
     */
    this.extensions;

    /**
     * @type {!Array.<string>}
     */
    this.scripts;
}

/**
 * @constructor
 */
WebInspector.ModuleManager.ExtensionDescriptor = function()
{
    /**
     * @type {string}
     */
    this.type;

    /**
     * @type {string|undefined}
     */
    this.className;

    /**
     * @type {!Array.<string>|undefined}
     */
    this.contextTypes;
}

/**
 * @constructor
 * @param {!WebInspector.ModuleManager} manager
 * @param {!WebInspector.ModuleManager.ModuleDescriptor} descriptor
 */
WebInspector.ModuleManager.Module = function(manager, descriptor)
{
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    var extensions = /** @type {?Array.<!WebInspector.ModuleManager.ExtensionDescriptor>}*/ (descriptor.extensions);
    for (var i = 0; extensions && i < extensions.length; ++i)
        this._manager._extensions.push(new WebInspector.ModuleManager.Extension(this, extensions[i]));
    this._loaded = false;
}

WebInspector.ModuleManager.Module.prototype = {
    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    _load: function()
    {
        if (this._loaded)
            return;

        if (this._isLoading) {
            var oldStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 50;
            console.assert(false, "Module " + this._name + " is loaded from itself: " + new Error().stack);
            Error.stackTraceLimit = oldStackTraceLimit;
            return;
        }

        this._isLoading = true;
        var scripts = this._descriptor.scripts;
        for (var i = 0; scripts && i < scripts.length; ++i)
            loadScript(scripts[i]);
        this._isLoading = false;
        this._loaded = true;
    }
}

/**
 * @constructor
 * @param {!WebInspector.ModuleManager.Module} module
 * @param {!WebInspector.ModuleManager.ExtensionDescriptor} descriptor
 */
WebInspector.ModuleManager.Extension = function(module, descriptor)
{
    this._module = module;
    this._descriptor = descriptor;

    this._type = descriptor.type;
    if (this._type.startsWith("@"))
        this._typeClass = /** @template T @type function(new:T) */ (window.eval(this._type.substring(1)));

    /**
     * @type {?string}
     */
    this._className = descriptor.className || null;
}

WebInspector.ModuleManager.Extension.prototype = {
    /**
     * @return {!Object}
     */
    descriptor: function()
    {
        return this._descriptor;
    },

    /**
     * @return {!WebInspector.ModuleManager.Module}
     */
    module: function()
    {
        return this._module;
    },

    /**
     * @param {?Object} context
     * @return {boolean}
     */
    isApplicable: function(context)
    {
        var contextTypes = /** @type {!Array.<string>|undefined} */ (this._descriptor.contextTypes);
        if (!contextTypes)
            return true;
        for (var i = 0; i < contextTypes.length; ++i) {
            var contextType = /** @type {!Function} */ (window.eval(contextTypes[i]));
            if (context instanceof contextType)
                return true;
        }
        return false;
    },

    /**
     * @return {?Object}
     */
    instance: function()
    {
        if (!this._className)
            return null;

        if (!this._instance) {
            this._module._load();

            var constructorFunction = window.eval(this._className);
            if (!(constructorFunction instanceof Function))
                return null;

            this._instance = new constructorFunction();
        }
        return this._instance;
    }
}

/**
 * @interface
 */
WebInspector.Renderer = function()
{
}

WebInspector.Renderer.prototype = {
    /**
     * @param {!Object} object
     * @return {?Element}
     */
    render: function(object) {}
}

/**
 * @interface
 */
WebInspector.Revealer = function()
{
}

WebInspector.Revealer.prototype = {
    /**
     * @param {!Object} object
     */
    reveal: function(object) {}
}

WebInspector.moduleManager = new WebInspector.ModuleManager(allDescriptors);
