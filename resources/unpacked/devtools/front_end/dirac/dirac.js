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
        "inline-custom-formatters",
        "welcome-message",
        "clean-urls",
        "beautify-function-names"];

    function hasFeature(feature) {
        const flag = featureFlags[feature];
        if (flag !== undefined) {
            return flag;
        }
        const featureIndex = knownFeatureFlags.indexOf(feature);
        if (featureIndex === -1) {
            return true;
        }
        const activeFlags = Runtime.queryParam("dirac_flags") || "";
        const result = activeFlags[featureIndex] !== '0';
        featureFlags[feature] = result;
        return result;
    }

    function hasDebugFlag(flagName) {
        if (Runtime.queryParam("debug_all") == "1") {
            return true;
        }
        const paramName = "debug_" + flagName.toLowerCase();
        return Runtime.queryParam(paramName) == "1";
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
                    return '\\' + character;
                // Four possible LineTerminator characters need to be escaped:
                case '\n':
                    return '\\n';
                case '\r':
                    return '\\r';
                case '\u2028':
                    return '\\u2028';
                case '\u2029':
                    return '\\u2029'
            }
        })
    }

    function codeAsString(code) {
        return "'" + stringEscape(code) + "'";
    }

    function loadLazyDirac() {
        return window.runtime.loadModulePromise("dirac_lazy");
    }

    function deduplicate(coll, keyFn = item => "" + item) {
        const store = new Set();
        return coll.filter(item => !store.has(keyFn(item)) && !!store.add(keyFn(item)));
    }

    // http://stackoverflow.com/a/20767836/84283
    function stableSort(array, comparator) {
        const wrapped = array.map((d, i) => ({d: d, i: i}));

        wrapped.sort((a, b) => {
            const cmp = comparator(a.d, b.d);
            return cmp === 0 ? a.i - b.i : cmp;
        });

        return wrapped.map(wrapper => wrapper.d);
    }

    function getNamespace(namespaceName) {
        if (!dirac._namespacesCache) {
            return;
        }

        return dirac._namespacesCache[namespaceName];
    }

    // --- lazy APIs --------------------------------------------------------------------------------------------------------
    // calling any of these functions will trigger loading dirac_lazy overlay
    // which will eventually overwrite those functions when fully loaded

    function startListeningForWorkspaceChanges(...args) {
        return loadLazyDirac().then(() => window.dirac.startListeningForWorkspaceChanges(...args));
    }

    function stopListeningForWorkspaceChanges(...args) {
        return loadLazyDirac().then(() => window.dirac.stopListeningForWorkspaceChanges(...args));
    }

    function extractScopeInfoFromScopeChainAsync(...args) {
        return loadLazyDirac().then(() => window.dirac.extractScopeInfoFromScopeChainAsync(...args));
    }

    function extractNamespaceSymbolsAsync(...args) {
        return loadLazyDirac().then(() => window.dirac.extractNamespaceSymbolsAsync(...args));
    }

    function invalidateNamespaceSymbolsCache(...args) {
        return loadLazyDirac().then(() => window.dirac.invalidateNamespaceSymbolsCache(...args));
    }

    function extractMacroNamespaceSymbolsAsync(...args) {
        return loadLazyDirac().then(() => window.dirac.extractMacroNamespaceSymbolsAsync(...args));
    }

    function extractNamespacesAsync(...args) {
        return loadLazyDirac().then(() => window.dirac.extractNamespacesAsync(...args));
    }

    function invalidateNamespacesCache(...args) {
        return loadLazyDirac().then(() => window.dirac.invalidateNamespacesCache(...args));
    }

    function getMacroNamespaceNames(...args) {
        return loadLazyDirac().then(() => window.dirac.getMacroNamespaceNames(...args));
    }

    function lookupCurrentContext(...args) {
        return loadLazyDirac().then(() => window.dirac.lookupCurrentContext(...args));
    }

    function evalInCurrentContext(...args) {
        return loadLazyDirac().then(() => window.dirac.evalInCurrentContext(...args));
    }

    function hasCurrentContext(...args) {
        return loadLazyDirac().then(() => window.dirac.hasCurrentContext(...args));
    }

    function evalInDefaultContext(...args) {
        return loadLazyDirac().then(() => window.dirac.evalInDefaultContext(...args));
    }

    function hasDefaultContext(...args) {
        return loadLazyDirac().then(() => window.dirac.hasDefaultContext(...args));
    }

    function subscribeDebuggerEvents(...args) {
        return loadLazyDirac().then(() => window.dirac.subscribeDebuggerEvents(...args));
    }

    function unsubscribeDebuggerEvents(...args) {
        return loadLazyDirac().then(() => window.dirac.unsubscribeDebuggerEvents(...args));
    }

    function addConsoleMessageToMainTarget(...args) {
        return loadLazyDirac().then(() => window.dirac.addConsoleMessageToMainTarget(...args));
    }

// --- exported interface ---------------------------------------------------------------------------------------------------

    // don't forget to update externs.js too
    return {
        _DEBUG_EVAL: hasDebugFlag("eval"),
        _DEBUG_COMPLETIONS: hasDebugFlag("completions"),
        _DEBUG_KEYSIM: hasDebugFlag("keysim"),
        _DEBUG_FEEDBACK: hasDebugFlag("feedback"),
        _DEBUG_WATCHING: hasDebugFlag("watching"),
        _DEBUG_CACHES: hasDebugFlag("caches"),
        _DEBUG_BACKEND_API: hasDebugFlag("backend_api"),
        _DEBUG_BACKEND_CSS: hasDebugFlag("backend_css"),

        // -- feature toggles -----------------------------------------------------------------------------------------------
        hasREPL: hasFeature("enable-repl"),
        hasParinfer: hasFeature("enable-parinfer"),
        hasFriendlyLocals: hasFeature("enable-friendly-locals"),
        hasClusteredLocals: hasFeature("enable-clustered-locals"),
        hasInlineCFs: hasFeature("inline-custom-formatters"),
        hasWelcomeMessage: hasFeature("welcome-message"),
        hasCleanUrls: hasFeature("clean-urls"),
        hasBeautifyFunctionNames: hasFeature("beautify-function-names"),

        // -- INTERFACE -----------------------------------------------------------------------------------------------------
        hasFeature: hasFeature,
        codeAsString: codeAsString,
        stringEscape: stringEscape,
        deduplicate: deduplicate,
        stableSort: stableSort,
        getNamespace: getNamespace,

        // -- LAZY INTERFACE ------------------------------------------------------------------------------------------------
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
        extractMacroNamespaceSymbolsAsync: extractMacroNamespaceSymbolsAsync,
        extractNamespacesAsync: extractNamespacesAsync,
        invalidateNamespaceSymbolsCache: invalidateNamespaceSymbolsCache,
        invalidateNamespacesCache: invalidateNamespacesCache,
        getMacroNamespaceNames: getMacroNamespaceNames

        // ...

        // note: there will be more functions added to this object dynamically by dirac.implant init code
        //       see externs.js for full list of avail functions
    };

})());
