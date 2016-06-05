if (!window.dirac) {
    console.error("window.dirac was expected to exist when loading dirac_lazy overlay");
    throw new Error("window.dirac was expected to exist when loading dirac_lazy overlay");
}

Object.assign(window.dirac, (function() {

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

            /**
             * @param {?Array<!WebInspector.RemoteObjectProperty>} properties
             */
            function processProperties(properties) {
                if (properties) {
                    result.props = properties.map(function(property) {
                        var propertyRecord = {name: property.name};
                        if (property.resolutionSourceProperty) {
                            var identifier = property.resolutionSourceProperty.name;
                            if (identifier != property.name) {
                                propertyRecord.identifier = identifier;
                            }
                        }
                        return propertyRecord;
                    });
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

    /**
     * @param {string} namespaceName
     * @return {function(string)}
     */
    function prepareUrlMatcher(namespaceName) {
        var relativeNSPath = dirac.nsToRelpath(namespaceName, "js");
        return /** @suppressGlobalPropertiesCheck */ function(url) {
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

    /**
     * @param {string} url
     * @param {string} cljsSourceCode
     * @return {?dirac.NamespaceDescriptor}
     */
    function parseClojureScriptNamespace(url, cljsSourceCode) {
        var descriptor = dirac.parseNsFromSource(cljsSourceCode);
        if (!descriptor) {
            return null;
        }

        descriptor.url = url;
        return descriptor;
    }

    /**
     * @param {!WebInspector.Script} script
     * @return {!Promise<!Array<dirac.NamespaceDescriptor>>}
     * @suppressGlobalPropertiesCheck
     */
    function parseNamespacesDescriptorsAsync(script) {
        const sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
        if (!sourceMap) {
            return Promise.resolve([]);
        }

        var promises = [];
        for (let url of sourceMap.sourceURLs()) {
            // take only .cljs or .cljc urls, make sure url params and fragments get matched properly
            // examples:
            //   http://localhost:9977/_compiled/demo/clojure/browser/event.cljs?rel=1463085025939
            //   http://localhost:9977/_compiled/demo/dirac_sample/demo.cljs?rel=1463085026941
            const parser = document.createElement('a');
            parser.href = url;
            if (!parser.pathname.match(/\.clj.$/)) {
                continue;
            }
            const contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.SourceMapScript);
            const namespaceDescriptorPromise = contentProvider.requestContent().then(cljsSourceCode => parseClojureScriptNamespace(url, cljsSourceCode || ""));
            promises.push(namespaceDescriptorPromise);
        }

        const removeNullDescriptors =
            /**
             *
             * @param {!Array<?dirac.NamespaceDescriptor>} namespaceDescriptors
             * @return {!Array<dirac.NamespaceDescriptor>}
             */
            namespaceDescriptors => {
                return namespaceDescriptors.filter(descriptor => !!descriptor);
            };

        // parseClojureScriptNamespace may fail and return null, so we filter out null results after gathering all results
        return Promise.all(promises).then(removeNullDescriptors);
    }

// --- changes --------------------------------------------------------------------------------------------------------------
// this is to reflect dynamically updated files e.g. by Figwheel

    var listeningForWorkspaceChanges = false;
    var namespacesSymbolsCache = new Map();
    var macroNamespacesSymbolsCache = new Map();

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

        dirac.invalidateNamespacesCache();
        var uiSourceCode = event.data;
        if (uiSourceCode) {
            invalidateNamespaceSymbolsMatchingUrl(uiSourceCode.url());
        }
    }

    function handleSourceCodeRemoved(event) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("handleSourceCodeRemoved", event);
        }

        dirac.invalidateNamespacesCache();
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

    // --- namespace names --------------------------------------------------------------------------------------------------

    function extractNamespacesAsyncWorker() {
        const workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace when extracting all ClojureScript namespace names");
            return Promise.resolve([]);
        }

        const uiSourceCodes = getRelevantSourceCodes(workspace);
        const promises = [];
        for (var i = 0; i < uiSourceCodes.length; i++) {
            const uiSourceCode = uiSourceCodes[i];
            if (!uiSourceCode) {
                continue;
            }
            const script = getScriptFromSourceCode(uiSourceCode);
            if (!script) {
                continue;
            }
            promises.push(parseNamespacesDescriptorsAsync(/** @type {!WebInspector.Script} */(script)));
        }

        const concatResults = results => {
            return [].concat.apply([], results);
        };

        return Promise.all(promises).then(concatResults);
    }

    function prepareNamespacesCache(namespaceDescriptors) {
        const result = {};
        for (let descriptor of namespaceDescriptors) {
            result[descriptor.name] = descriptor;
        }
        return result;
    }

    var extractNamespacesAsyncInFlightPromise = null;

    function extractNamespacesAsync() {
        if (dirac._namespacesCache) {
            return Promise.resolve(dirac._namespacesCache);
        }

        // extractNamespacesAsync can take some time parsing all namespaces
        // it could happen that extractNamespacesAsync() is called multiple times from code-completion code
        // here we cache in-flight promise to prevent that
        if (extractNamespacesAsyncInFlightPromise) {
            return extractNamespacesAsyncInFlightPromise;
        }

        extractNamespacesAsyncInFlightPromise = extractNamespacesAsyncWorker().then(descriptors => {
            dirac._namespacesCache = prepareNamespacesCache(descriptors);
            startListeningForWorkspaceChanges();
            return dirac._namespacesCache;
        });

        extractNamespacesAsyncInFlightPromise.then(result => extractNamespacesAsyncInFlightPromise = null);
        return extractNamespacesAsyncInFlightPromise;
    }

    function invalidateNamespacesCache() {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("invalidateNamespacesCache");
        }
        dirac._namespacesCache = null;
        // HACK: macro namespaces depend on _namespacesCache, do explicit invalidation here
        // TODO: in future we want to be smarter here
        dirac.invalidateMacroNamespaceSymbolsCache();
    }

    // --- namespace symbols ------------------------------------------------------------------------------------------------

    /**
     * @param {!Array<!WebInspector.UISourceCode>} uiSourceCodes
     * @param {function(string)} urlMatcherFn
     * @return {!Array<!WebInspector.UISourceCode>}
     */
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

    /**
     * @param {!Array<string>} names
     * @param {string} namespaceName
     * @return {!Array<string>}
     */
    function filterNamesForNamespace(names, namespaceName) {
        var prefix = namespaceName + "/";
        var prefixLength = prefix.length;

        return names.filter(name => name.startsWith(prefix)).map(name => name.substring(prefixLength));
    }

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {?WebInspector.Script}
     */
    function getScriptFromSourceCode(uiSourceCode) {
        return WebInspector.NetworkProject.getScriptFromSourceCode(uiSourceCode);
    }

    function extractNamesFromSourceMap(uiSourceCode, namespaceName) {
        const script = getScriptFromSourceCode(uiSourceCode);
        if (!script) {
            console.error("unable to locate script when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return [];
        }
        const sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(/** @type {!WebInspector.Script} */(script));
        if (!sourceMap) {
            console.error("unable to locate sourceMap when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return [];
        }
        const payload = sourceMap.payload();
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

        return new Promise(resolve => {
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
            // deduplicate them
            var results = [];
            for (let uiSourceCode of matchingSourceCodes) {
                results.push(extractNamesFromSourceMap(uiSourceCode, namespaceName));
            }
            var allNames = [].concat.apply([], results);
            var filteredNames = unique(filterNamesForNamespace(allNames, namespaceName));

            if (dirac._DEBUG_COMPLETIONS) {
                console.log("extracted " + filteredNames.length + " symbol names for namespace", namespaceName, matchingSourceCodes.map(i => i.url()));
            }

            resolve(filteredNames);
        });
    }

    function extractNamespaceSymbolsAsync(namespaceName) {
        if (!namespaceName) {
            return Promise.resolve([]);
        }

        if (namespacesSymbolsCache.has(namespaceName)) {
            return namespacesSymbolsCache.get(namespaceName);
        }

        const promisedResult = extractNamespaceSymbolsAsyncWorker(namespaceName);

        namespacesSymbolsCache.set(namespaceName, promisedResult);

        startListeningForWorkspaceChanges();
        return promisedResult;
    }

    function invalidateNamespaceSymbolsCache(namespaceName = null) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("invalidateNamespaceSymbolsCache", namespaceName);
        }
        if (namespaceName) {
            namespacesSymbolsCache.delete(namespaceName);
        } else {
            namespacesSymbolsCache.clear();
        }
    }

    // --- macro namespaces symbols -----------------------------------------------------------------------------------------
    //
    // a situation is a bit more tricky here
    // we don't have source mapping to clojure land in case of macro .clj files (makes no sense)
    // but thanks to our access to all existing (ns ...) forms in the project we can infer at least some information
    // we can at least collect macro symbols referred to via :refer

    function extractMacroNamespaceSymbolsAsyncWorker(namespaceName) {

        const collectMacroSymbols = namespaceDescriptors => {
            const symbols = [];
            for (const descriptor of Object.values(namespaceDescriptors)) {
                const refers = descriptor.macroRefers;
                if (!refers) {
                    continue;
                }
                for (const symbol of Object.keys(refers)) {
                    const ns = refers[symbol];
                    if (ns == namespaceName) {
                        symbols.push(symbol);
                    }
                }
            }
            return dirac.deduplicate(symbols);
        };

        return dirac.extractNamespacesAsync().then(collectMacroSymbols);
    }

    function extractMacroNamespaceSymbolsAsync(namespaceName) {
        if (!namespaceName) {
            return Promise.resolve([]);
        }

        if (macroNamespacesSymbolsCache.has(namespaceName)) {
            return macroNamespacesSymbolsCache.get(namespaceName);
        }

        const promisedResult = extractMacroNamespaceSymbolsAsyncWorker(namespaceName);

        macroNamespacesSymbolsCache.set(namespaceName, promisedResult);

        startListeningForWorkspaceChanges();
        return promisedResult;
    }

    function invalidateMacroNamespaceSymbolsCache(namespaceName = null) {
        if (dirac._DEBUG_COMPLETIONS) {
            console.log("invalidateMacroNamespaceSymbolsCache", namespaceName);
        }
        if (namespaceName) {
            macroNamespacesSymbolsCache.delete(namespaceName);
        } else {
            macroNamespacesSymbolsCache.clear();
        }
    }

// --- exported interface ---------------------------------------------------------------------------------------------------

    // don't forget to update externs.js too
    return {
        _lazyLoaded: true,
        _namespacesSymbolsCache: namespacesSymbolsCache,
        _macroNamespacesSymbolsCache: macroNamespacesSymbolsCache,
        _namespacesCache: null,
        startListeningForWorkspaceChanges: startListeningForWorkspaceChanges,
        stopListeningForWorkspaceChanges: stopListeningForWorkspaceChanges,
        extractScopeInfoFromScopeChainAsync: extractScopeInfoFromScopeChainAsync,
        extractNamespaceSymbolsAsync: extractNamespaceSymbolsAsync,
        invalidateNamespaceSymbolsCache: invalidateNamespaceSymbolsCache,
        extractMacroNamespaceSymbolsAsync: extractMacroNamespaceSymbolsAsync,
        invalidateMacroNamespaceSymbolsCache: invalidateMacroNamespaceSymbolsCache,
        extractNamespacesAsync: extractNamespacesAsync,
        invalidateNamespacesCache: invalidateNamespacesCache
    };

})());