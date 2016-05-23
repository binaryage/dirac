// dirac namespace may not exist at this point, play safe
if (!window.dirac) {
    window.dirac = {};
}

// note: if goog/cljs namespace system comes after us, they don't wipe our properties, they just merge theirs in
Object.assign(window.dirac, (function() {

    var featureFlags = {};

    var knownFeatureFlags = [
        "enable-repl",
        "enable-parinfer",
        "enable-friendly-locals",
        "enable-clustered-locals",
        "inline-custom-formatters"];

    function featureToIndex(feature) {
        return knownFeatureFlags.indexOf(feature);
    }

    function hasFeature(feature) {
        var flag = featureFlags[feature];
        if (flag !== undefined) {
            return flag;
        }
        var featureIndex = knownFeatureFlags.indexOf(feature);
        if (featureIndex === -1) {
            return true;
        }
        var activeFlags = Runtime.queryParam("dirac_flags") || "";
        var result = activeFlags[featureIndex] !== '0';
        featureFlags[feature] = result;
        return result;
    }

// taken from https://github.com/joliss/js-string-escape/blob/master/index.js
    function stringEscape(string) {
        return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function(character) {
            // Escape all characters not included in SingleStringCharacters and
            // DoubleStringCharacters on
            // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
            switch (character) {
                case '"':
                case "'":
                case '\\':
                    return '\\' + character
                // Four possible LineTerminator characters need to be escaped:
                case '\n':
                    return '\\n'
                case '\r':
                    return '\\r'
                case '\u2028':
                    return '\\u2028'
                case '\u2029':
                    return '\\u2029'
            }
        })
    }

    function codeAsString(code) {
        return "'" + stringEscape(code) + "'";
    }

    function evalInContext(context, code, callback) {
        if (!context) {
            console.warn("Requested evalInContext with null context:", code);
            return;
        }
        var resultCallback = function(result, wasThrown, value, exceptionDetails) {
            if (dirac._DEBUG_EVAL) {
                console.log("evalInContext/resultCallback: result", result, "wasThrown", wasThrown, "value", value, "exceptionDetails", exceptionDetails);
            }
            if (callback) {
                callback(value, wasThrown, exceptionDetails);
            }
        };
        try {
            if (dirac._DEBUG_EVAL) {
                console.log("evalInContext", context, code);
            }
            context.evaluate(code, "console", true, true, true, false, false, resultCallback);
        } catch (e) {
            console.error("failed js evaluation in context:", context, "code", code);
        }
    }

    function lookupCurrentContext() {
        return WebInspector.context.flavor(WebInspector.ExecutionContext);
    }

    function hasCurrentContext() {
        return lookupCurrentContext() ? true : false;
    }

    function evalInCurrentContext(code, callback) {
        if (dirac._DEBUG_EVAL) {
            console.log("evalInCurrentContext called:", code, callback);
        }
        evalInContext(lookupCurrentContext(), code, callback);
    }

    function lookupDefaultContext() {
        if (dirac._DEBUG_EVAL) {
            console.log("lookupDefaultContext called");
        }
        if (!WebInspector.targetManager) {
            if (dirac._DEBUG_EVAL) {
                console.log("  !WebInspector.targetManager => bail out");
            }
            return null;
        }
        var target = WebInspector.targetManager.mainTarget();
        if (!target) {
            if (dirac._DEBUG_EVAL) {
                console.log("  !target => bail out");
            }
            return null;
        }
        var executionContexts = target.runtimeModel.executionContexts();
        if (dirac._DEBUG_EVAL) {
            console.log("  execution contexts:", executionContexts);
        }
        for (var i = 0; i < executionContexts.length; ++i) {
            var executionContext = executionContexts[i];
            if (executionContext.isDefault || executionContext.isMainWorldContext) {  // isMainWorldContext for backward compatibility
                if (dirac._DEBUG_EVAL) {
                    console.log("  execution context #" + i + " isDefault:", executionContext);
                }
                return executionContext;
            }
        }
        if (executionContexts.length > 0) {
            if (dirac._DEBUG_EVAL) {
                console.log("  lookupDefaultContext failed to find valid context => return the first one");
            }
            return executionContexts[0];
        }
        if (dirac._DEBUG_EVAL) {
            console.log("  lookupDefaultContext failed to find valid context => no context avail");
        }
        return null;
    }

    function hasDefaultContext() {
        return lookupDefaultContext() ? true : false;
    }

    function evalInDefaultContext(code, callback) {
        if (dirac._DEBUG_EVAL) {
            console.log("evalInDefaultContext called:", code, callback);
        }
        evalInContext(lookupDefaultContext(), code, callback);
    }

// --- scope info -----------------------------------------------------------------------------------------------------------

    function getScopeTitle(scope) {
        var title = null;

        switch (scope.type()) {
            case DebuggerAgent.ScopeType.Local:
                title = WebInspector.UIString("Local");
                break;
            case DebuggerAgent.ScopeType.Closure:
                var scopeName = scope.name();
                if (scopeName)
                    title = WebInspector.UIString("Closure (%s)", WebInspector.beautifyFunctionName(scopeName));
                else
                    title = WebInspector.UIString("Closure");
                break;
            case DebuggerAgent.ScopeType.Catch:
                title = WebInspector.UIString("Catch");
                break;
            case DebuggerAgent.ScopeType.Block:
                title = WebInspector.UIString("Block");
                break;
            case DebuggerAgent.ScopeType.Script:
                title = WebInspector.UIString("Script");
                break;
            case DebuggerAgent.ScopeType.With:
                title = WebInspector.UIString("With Block");
                break;
            case DebuggerAgent.ScopeType.Global:
                title = WebInspector.UIString("Global");
                break;
        }

        return title;
    }

    function extractNamesFromScopePromise(scope) {
        var title = getScopeTitle(scope);
        var remoteObject = WebInspector.SourceMapNamesResolver.resolveScopeInObject(scope);

        var result = {title: title};

        return new Promise(function(resolve) {

            function processProperties(properties, internalProperties) {
                if (properties) {
                    var props = properties.map(function(property) {
                        var propertyRecord = {name: property.name};
                        if (property.resolutionSourceProperty) {
                            var identifier = property.resolutionSourceProperty.name;
                            if (identifier != property.name) {
                                propertyRecord.identifier = identifier;
                            }
                        }
                        return propertyRecord;
                    });
                    result.props = props;
                }

                resolve(result);
            }

            remoteObject.getAllProperties(false, processProperties);
        });
    }

    function extractScopeInfoFromScopeChainAsync(callFrame) {
        if (!callFrame) {
            return Promise.resolve(null);
        }

        return new Promise(function(resolve) {
            var scopeNamesPromises = [];

            var scopeChain = callFrame.scopeChain();
            for (var i = 0; i < scopeChain.length; ++i) {
                var scope = scopeChain[i];
                if (scope.type() === DebuggerAgent.ScopeType.Global) {
                    continue;
                }

                scopeNamesPromises.unshift(extractNamesFromScopePromise(scope));
            }

            Promise.all(scopeNamesPromises).then(function(frames) {
                var result = {frames: frames};
                resolve(result);
            });
        });
    }

// --- helpers --------------------------------------------------------------------------------------------------------------

    var namespacesSymbolsCache = new Map();

    function prepareUrlMatcher(namespaceName) {
        var relativeNSPath = dirac.nsToRelpath(namespaceName, "js");
        return function(url) {
            var parser = document.createElement('a');
            parser.href = url;
            return parser.pathname.endsWith(relativeNSPath);
        };
    }

    function unique(a) {
        return Array.from(new Set(a));
    }

    function getRelevantSourceCodes(workspace) {
        return workspace.uiSourceCodes().filter(sc => sc.project().type() === WebInspector.projectTypes.Network);
    }

// --- parsing namespaces ---------------------------------------------------------------------------------------------------

    function parseClojureScriptNamespace(url, cljsSourceCode) {
        var descriptor = dirac.parseNsFromSource(cljsSourceCode);
        if (!descriptor) {
            return null;
        }

        descriptor.url = url;
        return descriptor;
    }

    function parseNamespacesDescriptorsAsync(script) {
        var sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
        if (!sourceMap) {
            return Promise.resolve([]);
        }

        var promises = [];
        for (let url of sourceMap.sourceURLs()) {
            // take only .cljs or .cljc urls, make sure url params and fragments get matched properly
            // examples:
            //   http://localhost:9977/_compiled/demo/clojure/browser/event.cljs?rel=1463085025939
            //   http://localhost:9977/_compiled/demo/dirac_sample/demo.cljs?rel=1463085026941
            var parser = document.createElement('a');
            parser.href = url;
            if (!parser.pathname.match(/\.clj.$/)) {
                continue;
            }
            var contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.SourceMapScript);
            var namespaceDescriptorPromise = contentProvider.requestContent().then(cljsSourceCode => parseClojureScriptNamespace(url, cljsSourceCode || ""));
            promises.push(namespaceDescriptorPromise);
        }

        return Promise.all(promises);
    }

// --- changes --------------------------------------------------------------------------------------------------------------
// this is to reflect dynamically updated files e.g. by Figwheel

    var listeningForWorkspaceChanges = false;

    function invalidateNamespaceSymbolsMatchingUrl(url) {
        for (let namespaceName of namespacesSymbolsCache.keys()) {
            var matcherFn = prepareUrlMatcher(namespaceName);
            if (matcherFn(url)) {
                dirac.invalidateNamespaceSymbolsCache(namespaceName);
            }
        }
    }

    function handleSourceCodeAdded(event) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("handleSourceCodeAdded", event);
        }

        this.invalidateNamespacesCache();
        var uiSourceCode = event.data;
        if (uiSourceCode) {
            invalidateNamespaceSymbolsMatchingUrl(uiSourceCode.url());
        }
    }

    function handleSourceCodeRemoved(event) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("handleSourceCodeRemoved", event);
        }

        this.invalidateNamespacesCache();
        var uiSourceCode = event.data;
        if (uiSourceCode) {
            invalidateNamespaceSymbolsMatchingUrl(uiSourceCode.url());
        }
    }

    function startListeningForWorkspaceChanges() {
        if (listeningForWorkspaceChanges) {
            return;
        }

        if (dirac._DEBUG_COMPLETIONS) {
            console.log("startListeningForWorkspaceChanges");
        }

        var workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace in startListeningForWorkspaceChanges");
            return;
        }

        workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, handleSourceCodeAdded, dirac);
        workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, handleSourceCodeRemoved, dirac);

        listeningForWorkspaceChanges = true;
    }

    function stopListeningForWorkspaceChanges() {
        if (!listeningForWorkspaceChanges) {
            return;
        }

        if (dirac._DEBUG_COMPLETIONS) {
            console.log("stopListeningForWorkspaceChanges");
        }

        var workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace in startListeningForWorkspaceChanges");
            return;
        }

        workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, handleSourceCodeAdded, dirac);
        workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, handleSourceCodeRemoved, dirac);

        listeningForWorkspaceChanges = false;
    }

// --- namespace symbols ----------------------------------------------------------------------------------------------------

    function findMatchingSourceCodes(uiSourceCodes, urlMatcherFn) {
        var matching = [];
        for (var i = 0; i < uiSourceCodes.length; i++) {
            var uiSourceCode = uiSourceCodes[i];
            if (urlMatcherFn(uiSourceCode.url())) {
                matching.push(uiSourceCode);
            }
        }
        return matching;
    }

    function filterNamesForNamespace(names, namespaceName) {
        var prefix = namespaceName + "/";
        var prefixLength = prefix.length;

        return names.filter(name => name.startsWith(prefix)).map(name => name.substring(prefixLength));
    }

    function extractNamesFromSourceMap(uiSourceCode) {
        var script = uiSourceCode[WebInspector.NetworkProject._scriptSymbol];
        if (!script) {
            console.error("unable to locate script when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return [];
        }
        var sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
        if (!sourceMap) {
            console.error("unable to locate sourceMap when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return [];
        }
        var payload = sourceMap._payload;
        if (!payload) {
            console.error("unable to locate payload when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return [];
        }
        return payload.names || [];
    }

    function extractNamespaceSymbolsAsyncWorker(namespaceName) {
        var workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return Promise.resolve([]);
        }

        return new Promise((function(resolve) {
            var urlMatcherFn = prepareUrlMatcher(namespaceName);
            var uiSourceCodes = getRelevantSourceCodes(workspace);

            // not there may be multiple matching sources for given namespaceName
            // figwheel reloading is just adding new files and not removing old ones
            var matchingSourceCodes = findMatchingSourceCodes(uiSourceCodes, urlMatcherFn);
            if (!matchingSourceCodes.length) {
                if (dirac._DEBUG_COMPLETIONS) {
                    console.warn("cannot find any matching source file for ClojureScript namespace '" + namespaceName + "'");
                }
                resolve([]);
                return;
            }

            // we simply extract names from all matching source maps and then we filter then to match our namespace name and
            // dedupe them
            var results = [];
            for (let uiSourceCode of matchingSourceCodes) {
                results.push(extractNamesFromSourceMap(uiSourceCode));
            }
            var allNames = [].concat.apply([], results);
            var filteredNames = unique(filterNamesForNamespace(allNames, namespaceName));

            if (dirac._DEBUG_COMPLETIONS) {
                console.log("extracted " + filteredNames.length + " symbol names for namespace", namespaceName, matchingSourceCodes.map(i => i.url()));
            }

            resolve(filteredNames);
        }.bind(this)));
    }

    function extractNamespaceSymbolsAsync(namespaceName) {
        if (!namespaceName) {
            return Promise.resolve([]);
        }
        if (namespacesSymbolsCache.has(namespaceName)) {
            return Promise.resolve(namespacesSymbolsCache.get(namespaceName));
        }

        return new Promise((function(resolve) {
            extractNamespaceSymbolsAsyncWorker(namespaceName).then(function(result) {
                namespacesSymbolsCache.set(namespaceName, result);
                startListeningForWorkspaceChanges();
                resolve(result);
            });
        }).bind(this));
    }

    function invalidateNamespaceSymbolsCache(namespaceName) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("invalidateNamespaceSymbolsCache", namespaceName);
        }
        namespacesSymbolsCache.delete(namespaceName);
    }

// --- namespace names ------------------------------------------------------------------------------------------------------

    function extractNamespacesAsyncWorker() {
        var workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace when extracting all ClojureScript namespace names");
            return Promise.resolve([]);
        }

        return new Promise((function(resolve) {
            var uiSourceCodes = getRelevantSourceCodes(workspace);
            var promises = [];
            for (var i = 0; i < uiSourceCodes.length; i++) {
                var uiSourceCode = uiSourceCodes[i];
                if (!uiSourceCode) {
                    continue;
                }
                var script = uiSourceCode[WebInspector.NetworkProject._scriptSymbol];
                if (!script) {
                    continue;
                }
                promises.push(parseNamespacesDescriptorsAsync(script));
            }

            var concatResults = (function(results) {
                return [].concat.apply([], results);
            }).bind(this);

            var extractNamespaceNames = (function(namespaceDescriptors) {
                var names = namespaceDescriptors.filter(desc => !!desc).map(desc => desc.name);
                return names;
            }).bind(this);

            Promise.all(promises).then(concatResults).then(extractNamespaceNames).then(resolve);
        }).bind(this));
    }

    function extractNamespacesAsync() {
        if (dirac._namespacesCache) {
            return Promise.resolve(dirac._namespacesCache);
        }

        return new Promise((function(resolve) {
            extractNamespacesAsyncWorker().then(function(result) {
                dirac._namespacesCache = result;
                startListeningForWorkspaceChanges();
                resolve(result);
            });
        }).bind(this));
    }

    function invalidateNamespacesCache() {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("invalidateNamespacesCache");
        }
        dirac._namespacesCache = null;
    }

// --- exported interface ---------------------------------------------------------------------------------------------------

// don't forget to update externs.js too
    return {
        _DEBUG_EVAL: false,
        _DEBUG_COMPLETIONS: false,
        _DEBUG_KEYSIM: false,
        _namespacesSymbolsCache: namespacesSymbolsCache,
        _namespacesCache: null,
        hasREPL: hasFeature("enable-repl"),
        hasParinfer: hasFeature("enable-parinfer"),
        hasFriendlyLocals: hasFeature("enable-friendly-locals"),
        hasClusteredLocals: hasFeature("enable-clustered-locals"),
        hasInlineCFs: hasFeature("inline-custom-formatters"),
        hasFeature: hasFeature,
        codeAsString: codeAsString,
        stringEscape: stringEscape,
        startListeningForWorkspaceChanges: startListeningForWorkspaceChanges,
        stopListeningForWorkspaceChanges: stopListeningForWorkspaceChanges,
        evalInCurrentContext: evalInCurrentContext,
        extractScopeInfoFromScopeChainAsync: extractScopeInfoFromScopeChainAsync,
        extractNamespaceSymbolsAsync: extractNamespaceSymbolsAsync,
        invalidateNamespaceSymbolsCache: invalidateNamespaceSymbolsCache,
        extractNamespacesAsync: extractNamespacesAsync,
        invalidateNamespacesCache: invalidateNamespacesCache,
        hasCurrentContext: hasCurrentContext,
        evalInDefaultContext: evalInDefaultContext,
        hasDefaultContext: hasDefaultContext
        // note: there will be more functions added to this object dynamically by dirac.implant init code
        //       see externs.js for full list of avail functions
    };

})());