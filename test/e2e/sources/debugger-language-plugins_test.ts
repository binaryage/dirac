// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, enableExperiment, getBrowserAndPages, getResourcesPath, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, getCallFrameLocations, getCallFrameNames, getValuesForScope, listenForSourceFilesAdded, openFileInEditor, openFileInSourcesPanel, openSourcesPanel, PAUSE_ON_EXCEPTION_BUTTON, RESUME_BUTTON, retrieveSourceFilesAdded, retrieveTopCallFrameScriptLocation, switchToCallFrame, waitForAdditionalSourceFiles} from '../helpers/sources-helpers.js';


// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

declare global {
  interface Window {
    __sourceFilesAddedEvents: string[];
  }
}

type RawModule = {
  url: string,
  code?: ArrayBuffer
};

type RawLocationRange = {
  rawModuleId: string,
  startOffset: number,
  endOffset: number
};

type RawLocation = {
  rawModuleId: string,
  codeOffset: number,
  inlineFrameIndex?: number
};

type SourceLocation = {
  rawModuleId: string,
  sourceFileURL: string,
  lineNumber: number,
  columnNumber: number
};

type Variable = {
  scope: string,
  name: string,
  type: string,
  nestedName?: Array<string>
};

type VariableValue = {
  value: string|Array<VariableValue>,
  js_type: string,
  type: string,
  name: string
};

type EvaluatorModule = {
  code?: ArrayBuffer,
  constantValue?: VariableValue
};

type ScopeInfo = {
  type: string,
  typeName: string,
  icon?: string
};

interface EvalBase {
  rootType: TypeInfo;
  payload: unknown;
}

interface FieldInfo {
  name?: string;
  offset: number;
  typeId: unknown;
}

interface TypeInfo {
  typeNames: string[];
  typeId: unknown;
  members: FieldInfo[];
  alignment: number;
  arraySize: number;
  size: number;
  canExpand: boolean;
  hasValue: boolean;
}
type FunctionInfo = {
  name?: string
};

interface TestPluginImpl {
  addRawModule?(rawModuleId: string, symbolsURL: string, rawModule: {url: string}): Promise<Array<string>>;

  removeRawModule?(rawModuleId: string): Promise<void>;

  sourceLocationToRawLocation?(sourceLocation: SourceLocation): Promise<Array<RawLocationRange>>;

  rawLocationToSourceLocation?(rawLocation: RawLocation): Promise<Array<SourceLocation>>;

  getScopeInfo?(type: string): Promise<ScopeInfo>;

  listVariablesInScope?(rawLocation: RawLocation): Promise<Array<Variable>>;

  evaluateVariable?(name: string, location: RawLocation): Promise<EvaluatorModule|null>;

  getTypeInfo?(expression: string, context: RawLocation): Promise<{typeInfos: TypeInfo[], base: EvalBase}|null>;

  getFormatter?(expressionOrField: string|{base: EvalBase, field: FieldInfo[]}, context: RawLocation):
      Promise<{js: string}|null>;
  getFunctionInfo?(rawLocation: RawLocation): Promise<{frames: Array<FunctionInfo>}|null>;

  dispose?(): void;
}

declare function RegisterExtension(
    extensionAPI: unknown, pluginImpl: TestPluginImpl, name: string,
    supportedScriptTypes: {language: string, symbol_types: string[]}): void;

// This testcase reaches into DevTools internals to install the extension plugin. At this point, there is no sensible
// alternative, because loading a real extension is not supported in our test setup.
describe('The Debugger Language Plugins', async () => {
  beforeEach(async () => {
    await enableExperiment('wasmDWARFDebugging');

    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(resourcePath => {
      globalThis.installExtensionPlugin = function(
          registerPluginCallback: (extensionServerClient: unknown, extensionAPI: unknown) => void) {
        const extensionServer = globalThis.Extensions.ExtensionServer.instance();
        /** @type {!{startPage: string, name: string}} */
        const extensionInfo = {
          startPage: `${resourcePath}/sources/language_extensions.html`,
          name: 'TestExtension',
        };
        extensionServer._addExtension(extensionInfo);


        const extensionIFrames = document.body.querySelectorAll(`[data-devtools-extension="${extensionInfo.name}"]`);
        const injectedAPI = globalThis.buildExtensionAPIInjectedScript(
            extensionInfo, undefined, 'default', globalThis.UI.shortcutRegistry.globalShortcutKeys(),
            registerPluginCallback);

        function injectAPICallback(completionCallback: () => void) {
          return (ev: Event) => {
            if (ev.target) {
              const iframeWin = (ev.target as HTMLIFrameElement).contentWindow;
              if (iframeWin) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (iframeWin as any).eval(`${injectedAPI}()`);
              }
            }
            completionCallback();
          };
        }

        return Promise.all(Array.from(extensionIFrames, element => new Promise<void>(resolve => {
                                                          (element as HTMLIFrameElement).onload =
                                                              injectAPICallback(resolve);
                                                        })));
      };
    }, getResourcesPath());
  });

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.evaluate(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          // A simple plugin that resolves to a single source file
          class SingleFilePlugin {
            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const fileUrl = new URL('/source_file.c', rawModule.url || symbols);
              return [fileUrl.href];
            }
          }

          RegisterExtension(
              extensionAPI, new SingleFilePlugin(), 'Single File', {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openFileInSourcesPanel('wasm/global_variable.html');
    await listenForSourceFilesAdded(frontend);
    const additionalFilesPromise = waitForAdditionalSourceFiles(frontend);
    await target.evaluate('go();');
    await additionalFilesPromise;

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);
    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/sources/wasm/global_variable.wasm', '/source_file.c']);
  });


  // Resolve a single code offset to a source line to test the correctness of offset computations.
  it('use correct code offsets to interpret raw locations', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class LocationMappingPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocation?: SourceLocation}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocation];
              }
              return [];
            }
          }
          RegisterExtension(
              extensionAPI, new LocationMappingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor('.paused-status');

    const callFrameLoc = await waitFor('.call-frame-location');
    const scriptLocation = await callFrameLoc.evaluate(location => location.textContent);
    assert.deepEqual(scriptLocation, 'unreachable.ll:6');
  });

  // Resolve the location for a breakpoint.
  it('resolve locations for breakpoints correctly', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.evaluate(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          // This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
          // code offset pair.
          class LocationMappingPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocation?: SourceLocation}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('global_variable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 25, endOffset: 26},
                sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 8, columnNumber: 0},
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocation];
              }
              return [];
            }


            async sourceLocationToRawLocation(sourceLocationArg: SourceLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(sourceLocationArg.rawModuleId) || {};
              if (rawLocationRange && sourceLocation &&
                  JSON.stringify(sourceLocation) === JSON.stringify(sourceLocationArg)) {
                return [rawLocationRange];
              }
              return [];
            }
          }

          RegisterExtension(
              extensionAPI, new LocationMappingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openFileInSourcesPanel('wasm/global_variable.html');
    await target.evaluate('go();');
    await openFileInEditor('global_variable.ll');
    await addBreakpointForLine(frontend, 9);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'global_variable.ll:9');
  });

  it('shows top-level and nested variables', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class VariableListingPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocation?: SourceLocation}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocation];
              }
              return [];
            }

            async getScopeInfo(type: string) {
              return {type, typeName: type};
            }

            async listVariablesInScope(rawLocation: RawLocation) {
              const {rawLocationRange} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [
                  {scope: 'LOCAL', name: 'localX', type: 'int'},
                  {scope: 'GLOBAL', name: 'n1::n2::globalY', nestedName: ['n1', 'n2', 'globalY'], type: 'float'},
                ];
              }
              return [];
            }
          }

          RegisterExtension(
              extensionAPI, new VariableListingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL');
    assert.deepEqual(locals, ['localX: undefined']);
    const globals = await getValuesForScope('GLOBAL', 2);
    assert.deepEqual(globals, ['n1: namespace', 'n2: namespace', 'globalY: undefined']);
  });

  it('shows inline frames', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class InliningPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocations?: SourceLocation[]}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocations: [
                  {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
                  {rawModuleId, sourceFileURL, lineNumber: 10, columnNumber: 2},
                  {rawModuleId, sourceFileURL, lineNumber: 15, columnNumber: 2},
                ],
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocations} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocations && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocations[rawLocation.inlineFrameIndex || 0]];
              }
              return [];
            }

            async getFunctionInfo(rawLocation: RawLocation) {
              const {rawLocationRange} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return {frames: [{name: 'inner_inline_func'}, {name: 'outer_inline_func'}, {name: 'Main'}]};
              }
              return null;
            }

            async getScopeInfo(type: string) {
              return {type, typeName: type};
            }

            async listVariablesInScope(rawLocation: RawLocation) {
              const {rawLocationRange} = this._modules.get(rawLocation.rawModuleId) || {};
              const frame = rawLocation.inlineFrameIndex || 0;
              if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [
                  {scope: 'LOCAL', name: `localX${frame}`, type: 'int'},
                ];
              }
              return [];
            }
          }

          RegisterExtension(
              extensionAPI, new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    // Call stack shows inline function names and source locations.
    const funcNames = await getCallFrameNames();
    assert.deepEqual(
        funcNames, ['inner_inline_func', 'outer_inline_func', 'Main', 'go', 'await in go (async)', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations();
    assert.deepEqual(
        sourceLocations,
        ['unreachable.ll:6', 'unreachable.ll:11', 'unreachable.ll:16', 'unreachable.html:27', 'unreachable.html:30']);

    // We see variables for innermost frame.
    assert.deepEqual(await getValuesForScope('LOCAL'), ['localX0: undefined']);

    // Switching frames affects what variables we see.
    await switchToCallFrame(2);
    assert.deepEqual(await getValuesForScope('LOCAL'), ['localX1: undefined']);

    await switchToCallFrame(3);
    assert.deepEqual(await getValuesForScope('LOCAL'), ['localX2: undefined']);
  });

  it('falls back to wasm function names when inline info not present', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class InliningPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocations?: SourceLocation[]}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocations: [
                  {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
                ],
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocations} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocations && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocations[rawLocation.inlineFrameIndex || 0]];
              }
              return [];
            }

            async getFunctionInfo(rawLocation: RawLocation) {
              const {rawLocationRange} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return {frames: []};
              }
              return null;
            }

            async getScopeInfo(type: string) {
              return {type, typeName: type};
            }

            async listVariablesInScope(_rawLocation: RawLocation) {
              return [];
            }
          }

          RegisterExtension(
              extensionAPI, new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    // Call stack shows inline function names and source locations.
    const funcNames = await getCallFrameNames();
    assert.deepEqual(funcNames, ['Main', 'go', 'await in go (async)', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations();
    assert.deepEqual(sourceLocations, ['unreachable.ll:6', 'unreachable.html:27', 'unreachable.html:30']);
  });

  it('shows variable values with JS formatters', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class VariableListingPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocation?: SourceLocation}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocation];
              }
              return [];
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async listVariablesInScope(rawLocation: RawLocation) {
              return [{scope: 'LOCAL', name: 'local', type: 'TestType'}];
            }

            async getScopeInfo(type: string) {
              return {type, typeName: type};
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async getTypeInfo(expression: string, context: RawLocation):
                Promise<{typeInfos: TypeInfo[], base: EvalBase}|null> {
              if (expression === 'local') {
                const typeInfos = [
                  {
                    typeNames: ['TestType'],
                    typeId: 'TestType',
                    members: [{name: 'member', offset: 1, typeId: 'TestTypeMember'}],
                    alignment: 0,
                    arraySize: 0,
                    size: 4,
                    canExpand: true,
                    hasValue: false,
                  },
                  {
                    typeNames: ['TestTypeMember'],
                    typeId: 'TestTypeMember',
                    members: [{name: 'member2', offset: 1, typeId: 'TestTypeMember2'}],
                    alignment: 0,
                    arraySize: 0,
                    size: 3,
                    canExpand: true,
                    hasValue: false,
                  },
                  {
                    typeNames: ['TestTypeMember2'],
                    typeId: 'TestTypeMember2',
                    members: [],
                    alignment: 0,
                    arraySize: 0,
                    size: 2,
                    canExpand: false,
                    hasValue: true,
                  },
                  {
                    typeNames: ['int'],
                    typeId: 'int',
                    members: [],
                    alignment: 0,
                    arraySize: 0,
                    size: 4,
                    canExpand: false,
                    hasValue: true,
                  },
                ];
                const base = {rootType: typeInfos[0], payload: 28};

                return {typeInfos, base};
              }
              return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async getFormatter(expressionOrField: string|{base: EvalBase, field: FieldInfo[]}, context: RawLocation):
                Promise<{js: string}|null> {
              function format() {
                const sym = Symbol('sym');

                class $tag {
                  [sym]: EvalBase;
                  constructor() {
                    const rootType = {
                      typeNames: ['int'],
                      typeId: 'int',
                      members: [],
                      alignment: 0,
                      arraySize: 0,
                      size: 4,
                      canExpand: false,
                      hasValue: true,
                    };
                    this[sym] = {payload: {value: 19}, rootType};
                  }
                }

                const value = {value: 26, recurse: new $tag()};
                return {tag: {className: '$tag', symbol: sym}, value};
              }

              if (typeof expressionOrField === 'string') {
                return null;
              }

              const {base, field} = expressionOrField;
              if (base.payload === 28 && field.length === 2 && field[0].name === 'member' && field[0].offset === 1 &&
                  field[0].typeId === 'TestTypeMember' && field[1].name === 'member2' && field[1].offset === 1 &&
                  field[1].typeId === 'TestTypeMember2') {
                return {js: `${format.toString()} format()`};
              }
              if ((base.payload as {value: number}).value === 19 && field.length === 0) {
                return {js: '27'};
              }
              return null;
            }
          }


          RegisterExtension(
              extensionAPI, new VariableListingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL', 3, 5);
    assert.deepEqual(locals, [
      'local: TestType',
      'member: TestTypeMember',
      'member2: TestTypeMember2',
      'recurse: 27',
      'value: 26',
      '__proto__: Object',
    ]);
  });

  it('shows variable value in popover', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        () => globalThis.installExtensionPlugin((extensionServerClient: unknown, extensionAPI: unknown) => {
          class VariableListingPlugin {
            _modules: Map<string, {rawLocationRange?: RawLocationRange, sourceLocation?: SourceLocation}>;
            constructor() {
              this._modules = new Map();
            }

            async addRawModule(rawModuleId: string, symbols: string, rawModule: RawModule) {
              const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
              this._modules.set(rawModuleId, {
                rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
                sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
              });
              return [sourceFileURL];
            }

            async rawLocationToSourceLocation(rawLocation: RawLocation) {
              const {rawLocationRange, sourceLocation} = this._modules.get(rawLocation.rawModuleId) || {};
              if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
                  rawLocation.codeOffset < rawLocationRange.endOffset) {
                return [sourceLocation];
              }
              return [];
            }

            async getScopeInfo(type: string) {
              return {type, typeName: type};
            }

            async listVariablesInScope(rawLocation: RawLocation) {
              const {rawLocationRange} = this._modules.get(rawLocation.rawModuleId) || {};
              const {codeOffset} = rawLocation;
              if (!rawLocationRange || rawLocationRange.startOffset > codeOffset ||
                  rawLocationRange.endOffset <= codeOffset) {
                return [];
              }

              // The source code is LLVM IR so there are no meaningful variable names. Most tokens are however
              // identified as js-variable tokens by codemirror, so we can pretend they're variables. The unreachable
              // instruction is where we pause at, so it's really easy to find in the page and is a great mock variable
              // candidate.
              return [{scope: 'LOCAL', name: 'unreachable', type: 'int'}];
            }

            async evaluateVariable(
                name: string, location: RawLocation) {  // eslint-disable-line @typescript-eslint/no-unused-vars
              if (name === 'unreachable') {
                return {constantValue: {value: '23', js_type: 'number', type: 'int', name: 'unreachable'}};
              }
              return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async getTypeInfo(expression: string, context: RawLocation):
                Promise<{typeInfos: TypeInfo[], base: EvalBase}|null> {
              if (expression === 'unreachable') {
                const typeInfos = [{
                  typeNames: ['int'],
                  typeId: 'int',
                  members: [],
                  alignment: 0,
                  arraySize: 0,
                  size: 4,
                  canExpand: false,
                  hasValue: true,
                }];
                const base = {rootType: typeInfos[0], payload: 28};

                return {typeInfos, base};
              }
              return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async getFormatter(expressionOrField: string|{base: EvalBase, field: FieldInfo[]}, context: RawLocation):
                Promise<{js: string}|null> {
              return {js: '23'};
            }
          }

          RegisterExtension(
              extensionAPI, new VariableListingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const pausedPosition = await waitForFunction(async () => {
      const element = await $('.cm-execution-line-tail');
      if (element && await element.evaluate(e => e.isConnected)) {
        return element;
      }
      return undefined;
    });
    await pausedPosition.hover();
    const popover = await waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value = await waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '23');
  });
});
