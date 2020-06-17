// @ts-nocheck
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './keysim.js';
import './parinfer.js';
import './parinfer-codemirror.js';

console.log('dirac module import!');

(function () {
  const window = this;

  // dirac namespace may not exist at this point, play safe
  if (!window.dirac) {
    window.dirac = {};
  }

  // note: if goog/cljs namespace system comes after us, they don't wipe our properties, they just merge theirs in
  Object.assign(window.dirac, (function () {
    const readyPromise = new Promise(fulfil => window.dirac._runtimeReadyPromiseCallback = fulfil);

    function getReadyPromise() {
      return readyPromise;
    }

    function markAsReady() {
      window.dirac._runtimeReadyPromiseCallback();
    }

    const featureFlags = {};

    // WARNING: keep this in sync with dirac.background.tools/flag-keys
    const knownFeatureFlags = [
      'enable-repl',
      'enable-parinfer',
      'enable-friendly-locals',
      'enable-clustered-locals',
      'inline-custom-formatters',
      'welcome-message',
      'clean-urls',
      'beautify-function-names',
      'link-actions'];

    function hasFeature(feature) {
      const flag = featureFlags[feature];
      if (flag !== undefined) {
        return flag;
      }
      const featureIndex = knownFeatureFlags.indexOf(feature);
      if (featureIndex === -1) {
        return true;
      }
      const activeFlags = Root.Runtime.queryParam('dirac_flags') || '';
      const result = activeFlags[featureIndex] !== '0';
      featureFlags[feature] = result;
      return result;
    }

    function getToggle(name) {
      if (window.dirac.DEBUG_TOGGLES) {
        console.log("dirac: get toggle '" + name + "' => " + window.dirac[name]);
      }
      return window.dirac[name];
    }

    function setToggle(name, value) {
      if (window.dirac.DEBUG_TOGGLES) {
        console.log("dirac: set toggle '" + name + "' => " + value);
      }
      window.dirac[name] = value;
    }

    function hasDebugFlag(flagName) {
      if (Root.Runtime.queryParam('debug_all') === '1') {
        return true;
      }
      const paramName = 'debug_' + flagName.toLowerCase();
      return Root.Runtime.queryParam(paramName) === '1';
    }

    // taken from https://github.com/joliss/js-string-escape/blob/master/index.js
    function stringEscape(string) {
      return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
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
            return '\\u2029';
        }
      });
    }

    function codeAsString(code) {
      return "'" + stringEscape(code) + "'";
    }

    function loadLazyDirac() {
      return window.runtime.loadModulePromise('dirac_lazy');
    }

    function deduplicate(coll, keyFn = item => '' + item) {
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
      if (!dirac.namespacesCache) {
        return;
      }

      return dirac.namespacesCache[namespaceName];
    }

    function dispatchEventsForAction(action) {
      return new Promise(resolve => {
        const continuation = () => resolve("performed document action: '" + action + "'");
        const keyboard = Keysim.Keyboard.US_ENGLISH;
        keyboard.dispatchEventsForAction(action, window['document'], continuation);
      });
    }

    /**
     * @suppressGlobalPropertiesCheck
     **/
    function collectShadowRoots(root = null) {
      const res = [];
      const startNode = root || document.body;
      for (let node = startNode; node; node = node.traverseNextNode(startNode)) {
        if (node instanceof ShadowRoot) {
          res.push(node);
        }
      }
      return res;
    }

    function querySelectorAllDeep(node, query) {
      const roots = [node].concat(collectShadowRoots(node));
      let res = [];
      for (const node of roots) {
        const partial = node.querySelectorAll(query);
        res = res.concat(Array.from(partial));
      }
      return res;
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

    function extractNamespacesAsync() {
      return loadLazyDirac().then(() => window.dirac.extractNamespacesAsync());
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

    function hasCurrentContext() {
      return loadLazyDirac().then(() => window.dirac.hasCurrentContext());
    }

    function evalInDefaultContext(...args) {
      return loadLazyDirac().then(() => window.dirac.evalInDefaultContext(...args));
    }

    function hasDefaultContext() {
      return loadLazyDirac().then(() => window.dirac.hasDefaultContext());
    }

    function getMainDebuggerModel(...args) {
      return loadLazyDirac().then(() => window.dirac.getMainDebuggerModel(...args));
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

    function evaluateCommandInConsole(...args) {
      return loadLazyDirac().then(() => window.dirac.evaluateCommandInConsole(...args));
    }

    function registerDiracLinkAction(...args) {
      return loadLazyDirac().then(() => window.dirac.registerDiracLinkAction(...args));
    }

// --- exported interface ---------------------------------------------------------------------------------------------------

    // don't forget to update externs.js too
    return {
      DEBUG_EVAL: hasDebugFlag('eval'),
      DEBUG_COMPLETIONS: hasDebugFlag('completions'),
      DEBUG_KEYSIM: hasDebugFlag('keysim'),
      DEBUG_FEEDBACK: hasDebugFlag('feedback'),
      DEBUG_WATCHING: hasDebugFlag('watching'),
      DEBUG_CACHES: hasDebugFlag('caches'),
      DEBUG_TOGGLES: hasDebugFlag('toggles'),

      // we use can_dock url param indicator if we are launched as internal devtools
      hostedInExtension: !Root.Runtime.queryParam('can_dock'),

      // -- feature toggles -----------------------------------------------------------------------------------------------
      hasREPL: hasFeature('enable-repl'),
      hasParinfer: hasFeature('enable-parinfer'),
      hasFriendlyLocals: hasFeature('enable-friendly-locals'),
      hasClusteredLocals: hasFeature('enable-clustered-locals'),
      hasInlineCFs: hasFeature('inline-custom-formatters'),
      hasWelcomeMessage: hasFeature('welcome-message'),
      hasCleanUrls: hasFeature('clean-urls'),
      hasBeautifyFunctionNames: hasFeature('beautify-function-names'),
      hasLinkActions: hasFeature('link-actions'),

      // -- INTERFACE -----------------------------------------------------------------------------------------------------
      getReadyPromise: getReadyPromise,
      markAsReady: markAsReady,
      hasFeature: hasFeature,
      codeAsString: codeAsString,
      stringEscape: stringEscape,
      deduplicate: deduplicate,
      stableSort: stableSort,
      getNamespace: getNamespace,
      dispatchEventsForAction: dispatchEventsForAction,
      querySelectorAllDeep: querySelectorAllDeep,
      setToggle: setToggle,
      getToggle: getToggle,

      // -- LAZY INTERFACE ------------------------------------------------------------------------------------------------
      lookupCurrentContext: lookupCurrentContext,
      evalInCurrentContext: evalInCurrentContext,
      hasCurrentContext: hasCurrentContext,
      evalInDefaultContext: evalInDefaultContext,
      hasDefaultContext: hasDefaultContext,
      getMainDebuggerModel: getMainDebuggerModel,
      subscribeDebuggerEvents: subscribeDebuggerEvents,
      unsubscribeDebuggerEvents: unsubscribeDebuggerEvents,
      addConsoleMessageToMainTarget: addConsoleMessageToMainTarget,
      evaluateCommandInConsole: evaluateCommandInConsole,
      startListeningForWorkspaceChanges: startListeningForWorkspaceChanges,
      stopListeningForWorkspaceChanges: stopListeningForWorkspaceChanges,
      extractScopeInfoFromScopeChainAsync: extractScopeInfoFromScopeChainAsync,
      extractNamespaceSymbolsAsync: extractNamespaceSymbolsAsync,
      extractMacroNamespaceSymbolsAsync: extractMacroNamespaceSymbolsAsync,
      extractNamespacesAsync: extractNamespacesAsync,
      invalidateNamespaceSymbolsCache: invalidateNamespaceSymbolsCache,
      invalidateNamespacesCache: invalidateNamespacesCache,
      getMacroNamespaceNames: getMacroNamespaceNames,
      registerDiracLinkAction: registerDiracLinkAction,

      // ...

      // note: there will be more functions added to this object dynamically by dirac.implant init code
      //       see externs.js for full list of avail functions
    };

  })());

  if (window.dirac.implant) {
    window.dirac.implant.init_implant();
  } else {
    window.initDiracImplantAfterLoad = true;
  }
}).call(self);

console.log('dirac module imported!');
