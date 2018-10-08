if (!window.dirac) {
  console.error("window.dirac was expected to exist when loading dirac_lazy overlay");
  throw new Error("window.dirac was expected to exist when loading dirac_lazy overlay");
}

Object.assign(window.dirac, (function() {

  const namespacesSymbolsCache = new Map();

  // --- eval support -----------------------------------------------------------------------------------------------------

  function lookupCurrentContext() {
    return UI.context.flavor(SDK.ExecutionContext);
  }

  function evalInContext(context, code, silent, callback) {
    if (!context) {
      console.warn("Requested evalInContext with null context:", code);
      return;
    }
    const resultCallback = function(result, exceptionDetails) {
      if (dirac._DEBUG_EVAL) {
        console.log("evalInContext/resultCallback: result", result, "exceptionDetails", exceptionDetails);
      }
      if (callback) {
        let exceptionDescription = null;
        if (exceptionDetails) {
          const exception = exceptionDetails.exception;
          if (exception) {
            exceptionDescription = exception.description;
          }
          if (!exceptionDescription) {
            exceptionDescription = exceptionDetails.text;
          }
          if (!exceptionDescription) {
            exceptionDescription = "?";
          }
        }

        callback(result, exceptionDescription);
      }
    };
    try {
      if (dirac._DEBUG_EVAL) {
        console.log("evalInContext", context, silent, code);
      }
      context.evaluate({
        expression: code,
        objectGroup: 'console',
        includeCommandLineAPI: true,
        silent: silent,
        returnByValue: true,
        generatePreview: false
      }, false, false).then(answer => resultCallback(answer.object, answer.exceptionDetails));
    } catch (e) {
      console.error("failed js evaluation in context:", context, "code", code);
    }
  }

  function hasCurrentContext() {
    return !!lookupCurrentContext();
  }

  function evalInCurrentContext(code, silent, callback) {
    if (dirac._DEBUG_EVAL) {
      console.log("evalInCurrentContext called:", code, silent, callback);
    }
    evalInContext(lookupCurrentContext(), code, silent, callback);
  }

  function lookupDefaultContext() {
    if (dirac._DEBUG_EVAL) {
      console.log("lookupDefaultContext called");
    }
    if (!SDK.targetManager) {
      if (dirac._DEBUG_EVAL) {
        console.log("  !SDK.targetManager => bail out");
      }
      return null;
    }
    let target = SDK.targetManager.mainTarget();
    if (!target) {
      if (dirac._DEBUG_EVAL) {
        console.log("  !target => bail out");
      }
      return null;
    }
    const runtimeModel = target.model(SDK.RuntimeModel);
    if (!runtimeModel) {
      if (dirac._DEBUG_EVAL) {
        console.log("  !runtimeModel => bail out");
      }
      return null;
    }
    const executionContexts = runtimeModel.executionContexts();
    if (dirac._DEBUG_EVAL) {
      console.log("  execution contexts:", executionContexts);
    }
    for (let i = 0; i < executionContexts.length; ++i) {
      const executionContext = executionContexts[i];
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
    return !!lookupDefaultContext();
  }

  function evalInDefaultContext(code, silent, callback) {
    if (dirac._DEBUG_EVAL) {
      console.log("evalInDefaultContext called:", code, silent, callback);
    }
    evalInContext(lookupDefaultContext(), code, silent, callback);
  }

  let debuggerEventsUnsubscribers = new Map();

  /**
   * @return {boolean}
   */
  function subscribeDebuggerEvents(callback) {
    if (debuggerEventsUnsubscribers.has(callback)) {
      throw new Error("subscribeDebuggerEvents called without prior unsubscribeDebuggerEvents for callback " + callback);
    }
    const globalObjectClearedHandler = (...args) => {
      callback("GlobalObjectCleared", ...args);
    };
    const debuggerPausedHandler = (...args) => {
      callback("DebuggerPaused", ...args);
    };
    const debuggerResumedHandler = (...args) => {
      callback("DebuggerResumed", ...args);
    };

    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, globalObjectClearedHandler, window.dirac);
    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, debuggerPausedHandler, window.dirac);
    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, debuggerResumedHandler, window.dirac);

    debuggerEventsUnsubscribers.set(callback, () => {
      SDK.targetManager.removeModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, globalObjectClearedHandler, window.dirac);
      SDK.targetManager.removeModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, debuggerPausedHandler, window.dirac);
      SDK.targetManager.removeModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, debuggerResumedHandler, window.dirac);
      return true;
    });

    return true;
  }

  /**
   * @return {boolean}
   */
  function unsubscribeDebuggerEvents(callback) {
    if (!debuggerEventsUnsubscribers.has(callback)) {
      throw new Error("unsubscribeDebuggerEvents called without prior subscribeDebuggerEvents for callback " + callback);
    }

    const unsubscriber = debuggerEventsUnsubscribers.get(callback);
    debuggerEventsUnsubscribers.delete(callback);
    return unsubscriber();
  }

  // --- console ----------------------------------------------------------------------------------------------------------

  function addConsoleMessageToMainTarget(type, level, text, parameters) {
    const target = SDK.targetManager.mainTarget();
    if (!target) {
      console.warn("Unable to add console message to main target (no target): ", text);
      return;
    }
    const runtimeModel = target.model(SDK.RuntimeModel);
    if (!runtimeModel) {
      console.warn("Unable to add console message to main target (no runtime model): ", text);
      return;
    }
    const sanitizedText = text || "";
    const msg = new SDK.ConsoleMessage(runtimeModel, SDK.ConsoleMessage.MessageSource.Other, level,
      sanitizedText, type, undefined, undefined, undefined, parameters);
    SDK.consoleModel.addMessage(msg);
  }

  // --- scope info -------------------------------------------------------------------------------------------------------

  function getScopeTitle(scope) {
    let title = null;

    switch (scope.type()) {
      case Protocol.Debugger.ScopeType.Local:
        title = Common.UIString("Local");
        break;
      case Protocol.Debugger.ScopeType.Closure:
        const scopeName = scope.name();
        if (scopeName)
          title = Common.UIString("Closure (%s)", UI.beautifyFunctionName(scopeName));
        else
          title = Common.UIString("Closure");
        break;
      case Protocol.Debugger.ScopeType.Catch:
        title = Common.UIString("Catch");
        break;
      case Protocol.Debugger.ScopeType.Block:
        title = Common.UIString("Block");
        break;
      case Protocol.Debugger.ScopeType.Script:
        title = Common.UIString("Script");
        break;
      case Protocol.Debugger.ScopeType.With:
        title = Common.UIString("With Block");
        break;
      case Protocol.Debugger.ScopeType.Global:
        title = Common.UIString("Global");
        break;
    }

    return title;
  }

  function extractNamesFromScopePromise(scope) {
    const title = getScopeTitle(scope);
    const remoteObject = Sources.SourceMapNamesResolver.resolveScopeInObject(scope);

    const result = {title: title};
    let resolved = false;

    return new Promise(function(resolve) {

      function processProperties(answer) {
        const properties = answer.properties;
        if (properties) {
          result.props = properties.map(function(property) {
            const propertyRecord = {name: property.name};
            if (property.resolutionSourceProperty) {
              const identifier = property.resolutionSourceProperty.name;
              if (identifier !== property.name) {
                propertyRecord.identifier = identifier;
              }
            }
            return propertyRecord;
          });
        }

        resolved = true;
        resolve(result);
      }

      function timeoutProperties() {
        if (resolved) {
          return;
        }
        console.warn("Unable to retrieve properties from remote object", remoteObject);
        resolve(result);
      }

      remoteObject.getAllProperties(false, false).then(processProperties);
      setTimeout(timeoutProperties, dirac._REMOTE_OBJECT_PROPERTIES_FETCH_TIMEOUT);
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
        if (scope.type() === Protocol.Debugger.ScopeType.Global) {
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
      uiSourceCode.project().type() === Workspace.projectTypes.Network;
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
   * @param {?string} jsSourceCode
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
    const sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
    if (sourceMap) {
      return Promise.resolve(sourceMap);
    }
    return new Promise(resolve => {
      let counter = 0;
      const interval = setInterval(() => {
        const sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
        if (sourceMap) {
          clearInterval(interval);
          resolve(sourceMap);
        }
        counter += 1;
        if (counter > 100) { // 10s
          clearInterval(interval);
          console.warn("source map didn't load in time for", script);
          resolve(null);
        }
      }, 100);
    });
  }

  /**
   * @param {!SDK.Script} script
   * @return {!Promise<!Array<dirac.NamespaceDescriptor>>}
   * @suppressGlobalPropertiesCheck
   */
  function parseNamespacesDescriptorsAsync(script) {
    if (script.isContentScript()) {
      return Promise.resolve([]);
    }

    // I assume calling maybeLoadSourceMap is no longer needed, source maps are loaded lazily when referenced
    // Bindings.debuggerWorkspaceBinding.maybeLoadSourceMap(script);
    return ensureSourceMapLoadedAsync(script).then(/** @suppressGlobalPropertiesCheck */sourceMap => {
      const scriptUrl = script.contentURL();
      let promises = [];
      let realNamespace = false;
      if (sourceMap) {
        for (let url of sourceMap.sourceURLs()) {
          // take only .cljs or .cljc urls, make sure url params and fragments get matched properly
          // examples:
          //   http://localhost:9977/.compiled/demo/clojure/browser/event.cljs?rel=1463085025939
          //   http://localhost:9977/.compiled/demo/dirac_sample/demo.cljs?rel=1463085026941
          const parser = document.createElement('a');
          parser.href = url;
          if (parser.pathname.match(/\.clj.$/)) {
            const contentProvider = sourceMap.sourceContentProvider(url, Common.resourceTypes.SourceMapScript);
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
    //noinspection JSCheckFunctionSignatures
    return parseNamespacesDescriptorsAsync(script);
  }

  function prepareNamespacesFromDescriptors(namespaceDescriptors) {
    const result = {};
    for (let descriptor of namespaceDescriptors) {
      result[descriptor.name] = descriptor;
    }
    return result;
  }

  function extractNamespacesAsyncWorker() {
    const workspace = Workspace.workspace;
    if (!workspace) {
      console.error("unable to locate Workspace when extracting all ClojureScript namespace names");
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
      if (!dirac._namespacesCache) {
        dirac._namespacesCache = {};
      }
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
        if (descriptor.url === url) {
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
   * @param {!Array<!Workspace.UISourceCode>} uiSourceCodes
   * @param {function(string)} urlMatcherFn
   * @return {!Array<!Workspace.UISourceCode>}
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
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?SDK.Script}
   */
  function getScriptFromSourceCode(uiSourceCode) {
    const target = SDK.targetManager.mainTarget();
    if (!target) {
      throw new Error(
        `getScriptFromSourceCode called when there is no main target\n` +
        `uiSourceCode: name=${uiSourceCode.name()} url=${uiSourceCode.url()} project=${uiSourceCode.project().type()}\n`);
    }
    const debuggerModel = /** @type {!SDK.DebuggerModel} */ (target.model(SDK.DebuggerModel));
    if (!debuggerModel) {
      throw new Error(
        `getScriptFromSourceCode called when main target has no debuggerModel target=${target}\n` +
        `uiSourceCode: name=${uiSourceCode.name()} url=${uiSourceCode.url()} project=${uiSourceCode.project().type()}\n`);
    }
    const scriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(uiSourceCode, debuggerModel);
    if (!scriptFile) {
      // do not treat missing script file as a fatal error, only log error into internal dirac console
      // see https://github.com/binaryage/dirac/issues/79
      console.error(
        `uiSourceCode expected to have scriptFile associated\n` +
        `uiSourceCode: name=${uiSourceCode.name()} url=${uiSourceCode.url()} project=${uiSourceCode.project().type()}\n`);
      return null;
    }
    const script = scriptFile.getScript();
    if (!script) {
      throw new Error(
        `uiSourceCode expected to have _script associated\n` +
        `uiSourceCode: name=${uiSourceCode.name()} url=${uiSourceCode.url()} project=${uiSourceCode.project().type()}\n`);
    }
    if (!(script instanceof SDK.Script)) {
      throw new Error(
        `getScriptFromSourceCode expected to return an instance of SDK.Script\n` +
        `uiSourceCode: name=${uiSourceCode.name()} url=${uiSourceCode.url()} project=${uiSourceCode.project().type()}\n`);
    }
    return script;
  }

  function extractNamesFromSourceMap(uiSourceCode, namespaceName) {
    const script = getScriptFromSourceCode(uiSourceCode);
    if (!script) {
      console.error("unable to locate script when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
      return [];
    }
    const sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(/** @type {!SDK.Script} */(script));
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
    const workspace = Workspace.workspace;
    if (!workspace) {
      console.error("unable to locate Workspace when extracting symbols for ClojureScript namespace '" + namespaceName + "'");
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
          if (ns === namespaceName) {
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

    const workspace = Workspace.workspace;
    if (!workspace) {
      console.error("unable to locate Workspace in startListeningForWorkspaceChanges");
      return;
    }

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, handleSourceCodeAdded, dirac);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, handleSourceCodeRemoved, dirac);

    listeningForWorkspaceChanges = true;
  }

  function stopListeningForWorkspaceChanges() {
    if (!listeningForWorkspaceChanges) {
      return;
    }

    if (dirac._DEBUG_WATCHING) {
      console.log("stopListeningForWorkspaceChanges");
    }

    const workspace = Workspace.workspace;
    if (!workspace) {
      console.error("unable to locate Workspace in stopListeningForWorkspaceChanges");
      return;
    }

    workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, handleSourceCodeAdded, dirac);
    workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, handleSourceCodeRemoved, dirac);

    listeningForWorkspaceChanges = false;
  }

  function registerDiracLinkAction(action) {
    if (Components.Linkifier.diracLinkHandlerAction) {
      throw new Error("registerDiracLinkAction already set");
    }
    Components.Linkifier.diracLinkHandlerAction = action;
  }

  // --- exported interface -----------------------------------------------------------------------------------------------

  // don't forget to update externs.js too
  return {
    _lazyLoaded: true,
    _namespacesSymbolsCache: namespacesSymbolsCache,
    _namespacesCache: null,
    _REMOTE_OBJECT_PROPERTIES_FETCH_TIMEOUT: 1000,
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
    getMacroNamespaceNames: getMacroNamespaceNames,
    registerDiracLinkAction: registerDiracLinkAction

  };

})());
