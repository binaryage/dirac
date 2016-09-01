if (!window.dirac) {
    console.error("window.dirac was expected to exist when loading dirac_lazy overlay");
    throw new Error("window.dirac was expected to exist when loading dirac_lazy overlay");
}

Object.assign(window.dirac, (function() {

    const namespacesSymbolsCache = new Map();

    // --- eval support -----------------------------------------------------------------------------------------------------

    function lookupCurrentContext() {
        return WebInspector.context.flavor(WebInspector.ExecutionContext);
    }

    function evalInContext(context, code, callback) {
        if (!context) {
            console.warn("Requested evalInContext with null context:", code);
            return;
        }
        var resultCallback = function(result, exceptionDetails) {
            if (dirac._DEBUG_EVAL) {
                console.log("evalInContext/resultCallback: result", result, "exceptionDetails", exceptionDetails);
            }
            if (callback) {
                callback(result, exceptionDetails);
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
            if (executionContext.isDefault) {
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

    let debuggerEventsUnsubscriber = null;

    function subscribeDebuggerEvents(callback) {
        if (debuggerEventsUnsubscriber) {
            return false;
        }
        const globalObjectClearedHandler = (...args) => {
            callback("GlobalObjectCleared", ...args);
        };

        WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, globalObjectClearedHandler, this);

        debuggerEventsUnsubscriber = () => {
            WebInspector.targetManager.removeModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, globalObjectClearedHandler, this);
            return true;
        };

        return true;
    }

    function unsubscribeDebuggerEvents() {
        if (!debuggerEventsUnsubscriber) {
            return false;
        }

        const res = debuggerEventsUnsubscriber();
        debuggerEventsUnsubscriber = null;
        return res;
    }

    // --- console ----------------------------------------------------------------------------------------------------------

    function addConsoleMessageToMainTarget(level, text, parameters) {
        const target = WebInspector.targetManager.mainTarget();
        if (!target) {
            console.warn("Unable to add console message to main target: ", text);
            return;
        }
        const consoleModel = target.consoleModel;
        if (!consoleModel) {
            console.warn("Unable to add console message (no consoleModel): ", text);
            return;
        }

        const msg = new WebInspector.ConsoleMessage(target, WebInspector.ConsoleMessage.MessageSource.Other, level, text,
            WebInspector.ConsoleMessage.MessageType.Log, null, null, null, null, parameters);
        consoleModel.addMessage(msg);
    }

    // --- scope info -------------------------------------------------------------------------------------------------------

    function getScopeTitle(scope) {
        let title = null;

        switch (scope.type()) {
            case DebuggerAgent.ScopeType.Local:
                title = WebInspector.UIString("Local");
                break;
            case DebuggerAgent.ScopeType.Closure:
                const scopeName = scope.name();
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
        const title = getScopeTitle(scope);
        const remoteObject = WebInspector.SourceMapNamesResolver.resolveScopeInObject(scope);

        const result = {title: title};

        return new Promise(function(resolve) {

            /**
             * @param {?Array<!WebInspector.RemoteObjectProperty>} properties
             */
            function processProperties(properties) {
                if (properties) {
                    result.props = properties.map(function(property) {
                        const propertyRecord = {name: property.name};
                        if (property.resolutionSourceProperty) {
                            const identifier = property.resolutionSourceProperty.name;
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
            const scopeNamesPromises = [];

            const scopeChain = callFrame.scopeChain();
            for (let i = 0; i < scopeChain.length; ++i) {
                const scope = scopeChain[i];
                if (scope.type() === DebuggerAgent.ScopeType.Global) {
                    continue;
                }

                scopeNamesPromises.unshift(extractNamesFromScopePromise(scope));
            }

            Promise.all(scopeNamesPromises).then(function(frames) {
                const result = {frames: frames};
                resolve(result);
            });
        });
    }

    // --- helpers ----------------------------------------------------------------------------------------------------------

    /**
     * @param {string} namespaceName
     * @return {function(string)}
     */
    function prepareUrlMatcher(namespaceName) {
        const relativeNSPath = dirac.nsToRelpath(namespaceName, "js");
        return /** @suppressGlobalPropertiesCheck */ function(url) {
            const parser = document.createElement('a');
            parser.href = url;
            return parser.pathname.endsWith(relativeNSPath);
        };
    }

    function unique(a) {
        return Array.from(new Set(a));
    }

    function isRelevantSourceCode(uiSourceCode) {
        return uiSourceCode.contentType().isScript() && !uiSourceCode.contentType().isFromSourceMap() &&
            uiSourceCode.project().type() === WebInspector.projectTypes.Network;
    }

    function getRelevantSourceCodes(workspace) {
        return workspace.uiSourceCodes().filter(isRelevantSourceCode);
    }

    // --- parsing namespaces -----------------------------------------------------------------------------------------------

    /**
     * @param {string} url
     * @param {string} cljsSourceCode
     * @return {!Array<dirac.NamespaceDescriptor>}
     */
    function parseClojureScriptNamespaces(url, cljsSourceCode) {
        if (!cljsSourceCode) {
            return [];
        }
        const descriptor = dirac.parseNsFromSource(cljsSourceCode);
        if (!descriptor) {
            return [];
        }

        descriptor.url = url;
        return [descriptor];
    }

    /**
     * @param {string} url
     * @param {string} jsSourceCode
     * @return {!Array<dirac.NamespaceDescriptor>}
     */
    function parsePseudoNamespaces(url, jsSourceCode) {
        if (!jsSourceCode) {
            return [];
        }

        const result = [];
        const re = /goog\.provide\('(.*?)'\);/gm;
        let m;
        while (m = re.exec(jsSourceCode)) {
            const namespaceName = m[1];
            const descriptor = {
                name: namespaceName,
                url: url,
                pseudo: true
            };
            result.push(descriptor);
        }

        return result;
    }

    function ensureSourceMapLoadedAsync(script) {
        if (!script.sourceMapURL) {
            return Promise.resolve(null);
        }
        const sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
        if (sourceMap) {
            return Promise.resolve(sourceMap);
        }
        return new Promise(resolve => {
            let counter = 0;
            const interval = setInterval(() => {
                const sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
                if (sourceMap) {
                    clearInterval(interval);
                    resolve(sourceMap);
                }
                counter += 1;
                if (counter > 50) { // 5s
                    clearInterval(interval);
                    console.warn("source map didn't load in time for", script);
                    resolve(null);
                }
            }, 100);
        });
    }

    /**
     * @param {!WebInspector.Script} script
     * @return {!Promise<!Array<dirac.NamespaceDescriptor>>}
     * @suppressGlobalPropertiesCheck
     */
    function parseNamespacesDescriptorsAsync(script) {
        if (script.isContentScript()) {
            return Promise.resolve([]);
        }

        WebInspector.debuggerWorkspaceBinding.maybeLoadSourceMap(script);
        return ensureSourceMapLoadedAsync(script).then(/** @suppressGlobalPropertiesCheck */ sourceMap => {
            const scriptUrl = script.contentURL();
            let promises = [];
            let realNamespace = false;
            if (sourceMap) {
                for (let url of sourceMap.sourceURLs()) {
                    // take only .cljs or .cljc urls, make sure url params and fragments get matched properly
                    // examples:
                    //   http://localhost:9977/_compiled/demo/clojure/browser/event.cljs?rel=1463085025939
                    //   http://localhost:9977/_compiled/demo/dirac_sample/demo.cljs?rel=1463085026941
                    const parser = document.createElement('a');
                    parser.href = url;
                    if (parser.pathname.match(/\.clj.$/)) {
                        const contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.SourceMapScript);
                        const namespaceDescriptorsPromise = contentProvider.requestContent().then(cljsSourceCode => parseClojureScriptNamespaces(scriptUrl, cljsSourceCode));
                        promises.push(namespaceDescriptorsPromise);
                        realNamespace = true;
                    }
                }
            }

            // we are also interested in pseudo namespaces from google closure library
            if (!realNamespace) {
                const parser = document.createElement('a');
                parser.href = scriptUrl;
                if (parser.pathname.match(/\.js$/)) {
                    const namespaceDescriptorsPromise = script.requestContent().then(jsSourceCode => parsePseudoNamespaces(scriptUrl, jsSourceCode));
                    promises.push(namespaceDescriptorsPromise);
                }
            }

            const concatResults = results => {
                return [].concat.apply([], results);
            };

            return Promise.all(promises).then(concatResults);
        });
    }

    // --- namespace names --------------------------------------------------------------------------------------------------

    function getMacroNamespaceNames(namespaces) {
        let names = [];
        for (let descriptor of Object.values(namespaces)) {
            if (!descriptor.detectedMacroNamespaces) {
                continue;
            }
            names = names.concat(descriptor.detectedMacroNamespaces);
        }
        return dirac.deduplicate(names);
    }

    function getSourceCodeNamespaceDescriptorsAsync(uiSourceCode) {
        if (!uiSourceCode) {
            return Promise.resolve([]);
        }
        const script = getScriptFromSourceCode(uiSourceCode);
        if (!script) {
            return Promise.resolve([]);
        }
        return parseNamespacesDescriptorsAsync(/** @type {!WebInspector.Script} */(script));
    }

    function prepareNamespacesFromDescriptors(namespaceDescriptors) {
        const result = {};
        for (let descriptor of namespaceDescriptors) {
            result[descriptor.name] = descriptor;
        }
        return result;
    }

    function extractNamespacesAsyncWorker() {
        const workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace when extracting all ClojureScript namespace names");
            return Promise.resolve([]);
        }

        const uiSourceCodes = getRelevantSourceCodes(workspace);
        const promises = [];
        if (dirac._DEBUG_CACHES) {
            console.log("extractNamespacesAsyncWorker initial processing of " + uiSourceCodes.length + " source codes");
        }
        for (let uiSourceCode of uiSourceCodes) {
            const namespaceDescriptorsPromise = getSourceCodeNamespaceDescriptorsAsync(uiSourceCode);
            promises.push(namespaceDescriptorsPromise);
        }

        const concatResults = results => {
            return [].concat.apply([], results);
        };

        return Promise.all(promises).then(concatResults);
    }

    let extractNamespacesAsyncInFlightPromise = null;

    function extractNamespacesAsync() {
        // extractNamespacesAsync can take some time parsing all namespaces
        // it could happen that extractNamespacesAsync() is called multiple times from code-completion code
        // here we cache in-flight promise to prevent that
        if (extractNamespacesAsyncInFlightPromise) {
            return extractNamespacesAsyncInFlightPromise;
        }

        if (dirac._namespacesCache) {
            return Promise.resolve(dirac._namespacesCache);
        }

        dirac._namespacesCache = {};
        startListeningForWorkspaceChanges();

        extractNamespacesAsyncInFlightPromise = extractNamespacesAsyncWorker().then(descriptors => {
            const newDescriptors = prepareNamespacesFromDescriptors(descriptors);
            const newDescriptorsCount = Object.keys(newDescriptors).length;
            Object.assign(dirac._namespacesCache, newDescriptors);
            const allDescriptorsCount = Object.keys(dirac._namespacesCache).length;
            if (dirac._DEBUG_CACHES) {
                console.log("extractNamespacesAsync finished _namespacesCache with " + newDescriptorsCount + " items " +
                    "(" + allDescriptorsCount + " in total)");
            }
            dirac.reportNamespacesCacheMutation();
            return dirac._namespacesCache;
        });

        extractNamespacesAsyncInFlightPromise.then(result => extractNamespacesAsyncInFlightPromise = null);
        return extractNamespacesAsyncInFlightPromise;
    }

    function invalidateNamespacesCache() {
        if (dirac._DEBUG_CACHES) {
            console.log("invalidateNamespacesCache");
        }
        dirac._namespacesCache = null;
    }

    function extractSourceCodeNamespacesAsync(uiSourceCode) {
        if (!isRelevantSourceCode(uiSourceCode)) {
            return Promise.resolve({});
        }

        return getSourceCodeNamespaceDescriptorsAsync(uiSourceCode).then(prepareNamespacesFromDescriptors);
    }

    function extractAndMergeSourceCodeNamespacesAsync(uiSourceCode) {
        if (!isRelevantSourceCode(uiSourceCode)) {
            console.warn("extractAndMergeSourceCodeNamespacesAsync called on irrelevant source code", uiSourceCode);
            return;
        }

        if (dirac._DEBUG_CACHES) {
            console.log("extractAndMergeSourceCodeNamespacesAsync", uiSourceCode);
        }
        const jobs = [extractNamespacesAsync(), extractSourceCodeNamespacesAsync(uiSourceCode)];
        return Promise.all(jobs).then(([namespaces, result]) => {
            const addedNamespaceNames = Object.keys(result);
            if (addedNamespaceNames.length) {
                Object.assign(namespaces, result);
                if (dirac._DEBUG_CACHES) {
                    console.log("updated _namespacesCache by merging ", addedNamespaceNames,
                        "from", uiSourceCode.contentURL(),
                        " => new namespaces count:", Object.keys(namespaces).length);
                }
                dirac.reportNamespacesCacheMutation();
            }
            return result;
        });
    }

    function removeNamespacesMatchingUrl(url) {
        extractNamespacesAsync().then(namespaces => {
            const removedNames = [];
            for (let namespaceName of Object.keys(namespaces)) {
                const descriptor = namespaces[namespaceName];
                if (descriptor.url == url) {
                    delete namespaces[namespaceName];
                    removedNames.push(namespaceName);
                }
            }

            if (dirac._DEBUG_CACHES) {
                console.log("removeNamespacesMatchingUrl removed " + removedNames.length + " namespaces for url: " + url +
                    " new namespaces count:" + Object.keys(namespaces).length);
            }
        });
    }

    // --- namespace symbols ------------------------------------------------------------------------------------------------

    /**
     * @param {!Array<!WebInspector.UISourceCode>} uiSourceCodes
     * @param {function(string)} urlMatcherFn
     * @return {!Array<!WebInspector.UISourceCode>}
     */
    function findMatchingSourceCodes(uiSourceCodes, urlMatcherFn) {
        const matching = [];
        for (let i = 0; i < uiSourceCodes.length; i++) {
            const uiSourceCode = uiSourceCodes[i];
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
        const prefix = namespaceName + "/";
        const prefixLength = prefix.length;

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
        const workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
            return Promise.resolve([]);
        }

        return new Promise(resolve => {
            const urlMatcherFn = prepareUrlMatcher(namespaceName);
            const uiSourceCodes = getRelevantSourceCodes(workspace);

            // not there may be multiple matching sources for given namespaceName
            // figwheel reloading is just adding new files and not removing old ones
            const matchingSourceCodes = findMatchingSourceCodes(uiSourceCodes, urlMatcherFn);
            if (!matchingSourceCodes.length) {
                if (dirac._DEBUG_CACHES) {
                    console.warn("cannot find any matching source file for ClojureScript namespace '" + namespaceName + "'");
                }
                resolve([]);
                return;
            }

            // we simply extract names from all matching source maps and then we filter then to match our namespace name and
            // deduplicate them
            const results = [];
            for (let uiSourceCode of matchingSourceCodes) {
                results.push(extractNamesFromSourceMap(uiSourceCode, namespaceName));
            }
            const allNames = [].concat.apply([], results);
            const filteredNames = unique(filterNamesForNamespace(allNames, namespaceName));

            if (dirac._DEBUG_CACHES) {
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
        if (dirac._DEBUG_CACHES) {
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

        const promisedResult = extractMacroNamespaceSymbolsAsyncWorker(namespaceName);

        if (dirac._DEBUG_CACHES) {
            promisedResult.then(result => {
                console.log("extractMacroNamespaceSymbolsAsync resolved", namespaceName, result);
            });
        }

        return promisedResult;
    }

    // --- changes ----------------------------------------------------------------------------------------------------------
    // this is to reflect dynamically updated files e.g. by Figwheel

    let listeningForWorkspaceChanges = false;

    function invalidateNamespaceSymbolsMatchingUrl(url) {
        for (let namespaceName of namespacesSymbolsCache.keys()) {
            const matcherFn = prepareUrlMatcher(namespaceName);
            if (matcherFn(url)) {
                dirac.invalidateNamespaceSymbolsCache(namespaceName);
            }
        }
    }

    function handleSourceCodeAdded(event) {
        const uiSourceCode = event.data;
        if (uiSourceCode && isRelevantSourceCode(uiSourceCode)) {
            const url = uiSourceCode.url();
            if (dirac._DEBUG_WATCHING) {
                console.log("handleSourceCodeAdded", url);
            }
            extractAndMergeSourceCodeNamespacesAsync(uiSourceCode);
            invalidateNamespaceSymbolsMatchingUrl(url);
        }
    }

    function handleSourceCodeRemoved(event) {
        const uiSourceCode = event.data;
        if (uiSourceCode && isRelevantSourceCode(uiSourceCode)) {
            const url = uiSourceCode.url();
            if (dirac._DEBUG_WATCHING) {
                console.log("handleSourceCodeRemoved", url);
            }
            removeNamespacesMatchingUrl(url);
            invalidateNamespaceSymbolsMatchingUrl(url);
        }
    }

    function startListeningForWorkspaceChanges() {
        if (listeningForWorkspaceChanges) {
            return;
        }

        if (dirac._DEBUG_WATCHING) {
            console.log("startListeningForWorkspaceChanges");
        }

        const workspace = WebInspector.workspace;
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

        if (dirac._DEBUG_WATCHING) {
            console.log("stopListeningForWorkspaceChanges");
        }

        const workspace = WebInspector.workspace;
        if (!workspace) {
            console.error("unable to locate WebInspector.workspace in startListeningForWorkspaceChanges");
            return;
        }

        workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, handleSourceCodeAdded, dirac);
        workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, handleSourceCodeRemoved, dirac);

        listeningForWorkspaceChanges = false;
    }

    // --- exported interface -----------------------------------------------------------------------------------------------

    // don't forget to update externs.js too
    return {
        _lazyLoaded: true,
        _namespacesSymbolsCache: namespacesSymbolsCache,
        _namespacesCache: null,
        lookupCurrentContext: lookupCurrentContext,
        evalInCurrentContext: evalInCurrentContext,
        hasCurrentContext: hasCurrentContext,
        evalInDefaultContext: evalInDefaultContext,
        hasDefaultContext: hasDefaultContext,
        subscribeDebuggerEvents: subscribeDebuggerEvents,
        unsubscribeDebuggerEvents: unsubscribeDebuggerEvents,
        addConsoleMessageToMainTarget: addConsoleMessageToMainTarget,
        startListeningForWorkspaceChanges: startListeningForWorkspaceChanges,
        stopListeningForWorkspaceChanges: stopListeningForWorkspaceChanges,
        extractScopeInfoFromScopeChainAsync: extractScopeInfoFromScopeChainAsync,
        extractNamespaceSymbolsAsync: extractNamespaceSymbolsAsync,
        invalidateNamespaceSymbolsCache: invalidateNamespaceSymbolsCache,
        extractMacroNamespaceSymbolsAsync: extractMacroNamespaceSymbolsAsync,
        extractNamespacesAsync: extractNamespacesAsync,
        invalidateNamespacesCache: invalidateNamespacesCache,
        getMacroNamespaceNames: getMacroNamespaceNames
    };

})());
