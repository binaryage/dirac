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

// This gets all concatenated module descriptors in the release mode.
var allDescriptors = [];
var _loadedScripts = {};

/**
 * @param {string} url
 * @return {string}
 */
function loadResource(url)
{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    try {
        xhr.send(null);
    } catch (e) {
        console.error(url + " -> " + new Error().stack);
        throw e;
    }
    return xhr.responseText;
}


/**
 * http://tools.ietf.org/html/rfc3986#section-5.2.4
 * @param {string} path
 * @return {string}
 */
function normalizePath(path)
{
    if (path.indexOf("..") === -1 && path.indexOf('.') === -1)
        return path;

    var normalizedSegments = [];
    var segments = path.split("/");
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === ".")
            continue;
        else if (segment === "..")
            normalizedSegments.pop();
        else if (segment)
            normalizedSegments.push(segment);
    }
    var normalizedPath = normalizedSegments.join("/");
    if (normalizedPath[normalizedPath.length - 1] === "/")
        return normalizedPath;
    if (path[0] === "/" && normalizedPath)
        normalizedPath = "/" + normalizedPath;
    if ((path[path.length - 1] === "/") || (segments[segments.length - 1] === ".") || (segments[segments.length - 1] === ".."))
        normalizedPath = normalizedPath + "/";

    return normalizedPath;
}

/**
 * @param {string} scriptName
 */
function loadScript(scriptName)
{
    var sourceURL = self._importScriptPathPrefix + scriptName;
    var schemaIndex = sourceURL.indexOf("://") + 3;
    sourceURL = sourceURL.substring(0, schemaIndex) + normalizePath(sourceURL.substring(schemaIndex));
    if (_loadedScripts[sourceURL])
        return;
    _loadedScripts[sourceURL] = true;
    var scriptSource = loadResource(sourceURL);
    if (!scriptSource)
        throw "empty response arrived for script '" + sourceURL + "'";
    var oldPrefix = self._importScriptPathPrefix;
    self._importScriptPathPrefix += scriptName.substring(0, scriptName.lastIndexOf("/") + 1);
    try {
        self.eval(scriptSource + "\n//# sourceURL=" + sourceURL);
    } finally {
        self._importScriptPathPrefix = oldPrefix;
    }
}

(function() {
    var baseUrl = location.origin + location.pathname;
    self._importScriptPathPrefix = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
})();

/**
 * @constructor
 */
var Runtime = function()
{
    /**
     * @type {!Array.<!Runtime.Module>}
     */
    this._modules = [];
    /**
     * @type {!Object.<string, !Runtime.Module>}
     */
    this._modulesMap = {};
    /**
     * @type {!Array.<!Runtime.Extension>}
     */
    this._extensions = [];

    /**
     * @type {!Object.<string, !function(new:Object)>}
     */
    this._cachedTypeClasses = {};

    /**
     * @type {!Object.<string, !Runtime.ModuleDescriptor>}
     */
    this._descriptorsMap = {};
    for (var i = 0; i < allDescriptors.length; ++i)
        this._descriptorsMap[allDescriptors[i]["name"]] = allDescriptors[i];
}

/**
 * @return {boolean}
 */
Runtime.isReleaseMode = function()
{
    return !!allDescriptors.length;
}

/**
 * @param {string} moduleName
 * @param {string} workerName
 * @return {!SharedWorker}
 */
Runtime.startSharedWorker = function(moduleName, workerName)
{
    if (Runtime.isReleaseMode())
        return new SharedWorker(moduleName + ".js", workerName);

    var content = loadResource(moduleName + "/module.json");
    if (!content)
        throw new Error("Worker is not defined: " + moduleName + " " + new Error().stack);
    var scripts = JSON.parse(content)["scripts"];
    if (scripts.length !== 1)
        throw Error("Runtime.startSharedWorker supports modules with only one script!");
    return new SharedWorker(moduleName + "/" + scripts[0], workerName);
}

/**
 * @param {string} moduleName
 * @return {!Worker}
 */
Runtime.startWorker = function(moduleName)
{
    if (Runtime.isReleaseMode())
        return new Worker(moduleName + ".js");

    var content = loadResource(moduleName + "/module.json");
    if (!content)
        throw new Error("Worker is not defined: " + moduleName + " " + new Error().stack);
    var message = [];
    var scripts = JSON.parse(content)["scripts"];
    for (var i = 0; i < scripts.length; ++i) {
        var url = self._importScriptPathPrefix + moduleName + "/" + scripts[i];
        var parts = url.split("://");
        url = parts.length === 1 ? url : parts[0] + "://" + normalizePath(parts[1]);
        message.push({
            source: loadResource(moduleName + "/" + scripts[i]),
            url: url
        });
    }

    /**
     * @suppress {checkTypes}
     */
    var loader = function() {
        self.onmessage = function(event) {
            self.onmessage = null;
            var scripts = event.data;
            for (var i = 0; i < scripts.length; ++i) {
                var source = scripts[i]["source"];
                self.eval(source + "\n//# sourceURL=" + scripts[i]["url"]);
            }
        };
    };

    var blob = new Blob(["(" + loader.toString() + ")()\n//# sourceURL=" + moduleName], { type: "text/javascript" });
    var workerURL = window.URL.createObjectURL(blob);
    try {
        var worker = new Worker(workerURL);
        worker.postMessage(message);
        return worker;
    } finally {
        window.URL.revokeObjectURL(workerURL);
    }
}

Runtime.prototype = {
    /**
     * @param {!Array.<string>} configuration
     */
    registerModules: function(configuration)
    {
        for (var i = 0; i < configuration.length; ++i)
            this._registerModule(configuration[i]);
    },

    /**
     * @param {string} moduleName
     */
    _registerModule: function(moduleName)
    {
        if (!this._descriptorsMap[moduleName]) {
            var content = loadResource(moduleName + "/module.json");
            if (!content)
                throw new Error("Module is not defined: " + moduleName + " " + new Error().stack);
            var module = /** @type {!Runtime.ModuleDescriptor} */ (self.eval("(" + content + ")"));
            module["name"] = moduleName;
            this._descriptorsMap[moduleName] = module;
        }
        var module = new Runtime.Module(this, this._descriptorsMap[moduleName]);
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
     * @param {!Runtime.Extension} extension
     * @param {?function(function(new:Object)):boolean} predicate
     * @return {boolean}
     */
    _checkExtensionApplicability: function(extension, predicate)
    {
        if (!predicate)
            return false;
        var contextTypes = /** @type {!Array.<string>|undefined} */ (extension.descriptor().contextTypes);
        if (!contextTypes)
            return true;
        for (var i = 0; i < contextTypes.length; ++i) {
            var contextType = this._resolve(contextTypes[i]);
            var isMatching = !!contextType && predicate(contextType);
            if (isMatching)
                return true;
        }
        return false;
    },

    /**
     * @param {!Runtime.Extension} extension
     * @param {?Object} context
     * @return {boolean}
     */
    isExtensionApplicableToContext: function(extension, context)
    {
        if (!context)
            return true;
        return this._checkExtensionApplicability(extension, isInstanceOf);

        /**
         * @param {!Function} targetType
         * @return {boolean}
         */
        function isInstanceOf(targetType)
        {
            return context instanceof targetType;
        }
    },

    /**
     * @param {!Runtime.Extension} extension
     * @param {!Array.<!Function>=} currentContextTypes
     * @return {boolean}
     */
    isExtensionApplicableToContextTypes: function(extension, currentContextTypes)
    {
        if (!extension.descriptor().contextTypes)
            return true;

        // FIXME: Remove this workaround once Set is available natively.
        for (var i = 0; i < currentContextTypes.length; ++i)
            currentContextTypes[i]["__applicable"] = true;
        var result = this._checkExtensionApplicability(extension, currentContextTypes ? isContextTypeKnown : null);
        for (var i = 0; i < currentContextTypes.length; ++i)
            delete currentContextTypes[i]["__applicable"];
        return result;

        /**
         * @param {!Function} targetType
         * @return {boolean}
         */
        function isContextTypeKnown(targetType)
        {
            return !!targetType["__applicable"];
        }
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Array.<!Runtime.Extension>}
     */
    extensions: function(type, context)
    {
        /**
         * @param {!Runtime.Extension} extension
         * @return {boolean}
         */
        function filter(extension)
        {
            if (extension._type !== type && extension._typeClass() !== type)
                return false;
            return !context || extension.isApplicable(context);
        }
        return this._extensions.filter(filter);
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {?Runtime.Extension}
     */
    extension: function(type, context)
    {
        return this.extensions(type, context)[0] || null;
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Array.<!Object>}
     */
    instances: function(type, context)
    {
        /**
         * @param {!Runtime.Extension} extension
         * @return {?Object}
         */
        function instantiate(extension)
        {
            return extension.instance();
        }
        return this.extensions(type, context).filter(instantiate).map(instantiate);
    },

    /**
     * @param {*} type
     * @param {?Object=} context
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
            return compare(name1, name2);
        }

        /**
         * @param {string} left
         * @param {string} right
         * @return {number}
         */
        function compare(left, right)
        {
            if (left > right)
              return 1;
            if (left < right)
                return -1;
            return 0;
        }
        return result;
    },

    /**
     * @return {?function(new:Object)}
     */
    _resolve: function(typeName)
    {
        if (!this._cachedTypeClasses[typeName]) {
            var path = typeName.split(".");
            var object = window;
            for (var i = 0; object && (i < path.length); ++i)
                object = object[path[i]];
            if (object)
                this._cachedTypeClasses[typeName] = /** @type function(new:Object) */(object);
        }
        return this._cachedTypeClasses[typeName];
    }
}

/**
 * @constructor
 */
Runtime.ModuleDescriptor = function()
{
    /**
     * @type {string}
     */
    this.name;

    /**
     * @type {!Array.<!Runtime.ExtensionDescriptor>}
     */
    this.extensions;

    /**
     * @type {!Array.<string>|undefined}
     */
    this.dependencies;

    /**
     * @type {!Array.<string>}
     */
    this.scripts;
}

/**
 * @constructor
 */
Runtime.ExtensionDescriptor = function()
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
 * @param {!Runtime} manager
 * @param {!Runtime.ModuleDescriptor} descriptor
 */
Runtime.Module = function(manager, descriptor)
{
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    var extensions = /** @type {?Array.<!Runtime.ExtensionDescriptor>}*/ (descriptor.extensions);
    for (var i = 0; extensions && i < extensions.length; ++i)
        this._manager._extensions.push(new Runtime.Extension(this, extensions[i]));
    this._loaded = false;
}

Runtime.Module.prototype = {
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
        var dependencies = this._descriptor.dependencies;
        for (var i = 0; dependencies && i < dependencies.length; ++i)
            this._manager.loadModule(dependencies[i]);
        if (this._descriptor.scripts) {
            if (Runtime.isReleaseMode()) {
                loadScript(this._name + ".js");
            } else {
                var scripts = this._descriptor.scripts;
                for (var i = 0; i < scripts.length; ++i)
                    loadScript(this._name + "/" + scripts[i]);
            }
        }
        this._isLoading = false;
        this._loaded = true;
    }
}

/**
 * @constructor
 * @param {!Runtime.Module} module
 * @param {!Runtime.ExtensionDescriptor} descriptor
 */
Runtime.Extension = function(module, descriptor)
{
    this._module = module;
    this._descriptor = descriptor;

    this._type = descriptor.type;
    this._hasTypeClass = this._type.charAt(0) === "@";

    /**
     * @type {?string}
     */
    this._className = descriptor.className || null;
}

Runtime.Extension.prototype = {
    /**
     * @return {!Object}
     */
    descriptor: function()
    {
        return this._descriptor;
    },

    /**
     * @return {!Runtime.Module}
     */
    module: function()
    {
        return this._module;
    },

    /**
     * @return {?function(new:Object)}
     */
    _typeClass: function()
    {
        if (!this._hasTypeClass)
            return null;
        return this._module._manager._resolve(this._type.substring(1));
    },

    /**
     * @param {?Object} context
     * @return {boolean}
     */
    isApplicable: function(context)
    {
        return this._module._manager.isExtensionApplicableToContext(this, context);
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
 * @type {!Runtime}
 */
var runtime;
