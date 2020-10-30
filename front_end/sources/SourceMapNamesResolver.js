// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Bindings from '../bindings/bindings.js';
import * as Formatter from '../formatter/formatter.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

export const cachedMapSymbol = Symbol('cache');
export const cachedIdentifiersSymbol = Symbol('cachedIdentifiers');

/**
 * @unrestricted
 */
export class Identifier {
  /**
   * @param {string} name
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  constructor(name, lineNumber, columnNumber) {
    this.name = name;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
}

export class NameDescriptor {
  /**
   * @param {string} name
   * @param {number|undefined} lineNumber
   * @param {number|undefined} columnNumber
   */
  constructor(name, lineNumber, columnNumber) {
    this.name = name;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
}


export class MappingRecord {
  /**
   * @param {!NameDescriptor} compiledNameDescriptor
   * @param {!NameDescriptor} originalNameDescriptor
   */
  constructor(compiledNameDescriptor, originalNameDescriptor) {
    this.compiledNameDescriptor = compiledNameDescriptor;
    this.originalNameDescriptor = originalNameDescriptor;
  }
}

export class Mapping extends Array {
}

/**
 * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
 * @return {!Promise<!Array<!Identifier>>}
 */
export const scopeIdentifiers = function(scope) {
  const startLocation = scope.startLocation();
  const endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      (startLocation.script() !== endLocation.script())) {
    return Promise.resolve(/** @type {!Array<!Identifier>}*/ ([]));
  }

  const script = startLocation.script();
  return script.requestContent().then(onContent);

  /**
   * @param {!TextUtils.ContentProvider.DeferredContent} deferredContent
   * @return {!Promise<!Array<!Identifier>>}
   */
  function onContent(deferredContent) {
    if (!deferredContent.content) {
      return Promise.resolve(/** @type {!Array<!Identifier>}*/ ([]));
    }

    const content = deferredContent.content;
    const text = new TextUtils.Text.Text(content);
    const scopeRange = new TextUtils.TextRange.TextRange(
        startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);
    const scopeText = text.extract(scopeRange);
    const scopeStart = text.toSourceRange(scopeRange).offset;
    const prefix = 'function fui';
    return Formatter.FormatterWorkerPool.formatterWorkerPool()
        .javaScriptIdentifiers(prefix + scopeText)
        .then(onIdentifiers.bind(null, text, scopeStart, prefix));
  }

  /**
   * @param {!TextUtils.Text.Text} text
   * @param {number} scopeStart
   * @param {string} prefix
   * @param {!Array<!{name: string, offset: number}>} identifiers
   * @return {!Array<!Identifier>}
   */
  function onIdentifiers(text, scopeStart, prefix, identifiers) {
    const result = [];
    const cursor = new TextUtils.TextCursor.TextCursor(text.lineEndings());
    for (let i = 0; i < identifiers.length; ++i) {
      const id = identifiers[i];
      if (id.offset < prefix.length) {
        continue;
      }
      const start = scopeStart + id.offset - prefix.length;
      cursor.resetTo(start);
      result.push(new Identifier(id.name, cursor.lineNumber(), cursor.columnNumber()));
    }
    return result;
  }
};

/**
 * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
 * @return {!Promise<!Mapping>}
 */
export const resolveScope = function(scope) {
  let identifiersPromise = scope[cachedIdentifiersSymbol];
  if (identifiersPromise) {
    return identifiersPromise;
  }

  const script = scope.callFrame().script;
  const sourceMap = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().sourceMapForScript(script);
  if (!sourceMap) {
    return Promise.resolve(/** @type {!Mapping} */([]));
  }

  /** @type {!Map<string, !TextUtils.Text.Text>} */
  const textCache = new Map();
  identifiersPromise = scopeIdentifiers(scope).then(onIdentifiers);
  scope[cachedIdentifiersSymbol] = identifiersPromise;
  return identifiersPromise;

  /**
   * @param {!Array<!Identifier>} identifiers
   * @return {!Promise<!Mapping>}
   */
  function onIdentifiers(identifiers) {
    const namesMapping = /** @type {!Mapping} */([]);
    const missingIdentifiers = [];
    // Extract as much as possible from SourceMap.
    for (let i = 0; i < identifiers.length; ++i) {
      const id = identifiers[i];
      const entry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
      if (entry && entry.name) {
        const compiled = new NameDescriptor(id.name, id.lineNumber, id.columnNumber);
        const original = new NameDescriptor(entry.name, entry.sourceLineNumber, entry.sourceColumnNumber);
        namesMapping.push(new MappingRecord(compiled, original));
      } else {
        missingIdentifiers.push(id);
      }
    }

    // Resolve missing identifier names from sourcemap ranges.
    const promises = missingIdentifiers.map(id => {
      return resolveSourceName(id).then(
        (originalNameDescriptor) => onSourceNameResolved(namesMapping, id, originalNameDescriptor))
    });
    return Promise.all(promises)
        .then(() => namesMapping);
  }

  /**
   * @param {!Mapping} namesMapping
   * @param {!Identifier} id
   * @param {?NameDescriptor} originalNameDescriptor
   */
  function onSourceNameResolved(namesMapping, id, originalNameDescriptor) {
    if (!originalNameDescriptor) {
      return;
    }
    const compiled = new NameDescriptor(id.name, id.lineNumber, id.columnNumber);
    namesMapping.push(new MappingRecord(compiled, originalNameDescriptor));
  }

  /**
   * @param {!Identifier} id
   * @return {!Promise<?NameDescriptor>}
   */
  function resolveSourceName(id) {
    const startEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
    const endEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber + id.name.length);
    if (!startEntry || !endEntry || !startEntry.sourceURL || startEntry.sourceURL !== endEntry.sourceURL ||
        !startEntry.sourceLineNumber || !startEntry.sourceColumnNumber || !endEntry.sourceLineNumber ||
        !endEntry.sourceColumnNumber) {
      return Promise.resolve(null);
    }
    const sourceTextRange = new TextUtils.TextRange.TextRange(
        startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber,
        endEntry.sourceColumnNumber);
    const uiSourceCode =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(
            script.debuggerModel, startEntry.sourceURL, script.isContentScript());
    if (!uiSourceCode) {
      return Promise.resolve(null);
    }

    return uiSourceCode.requestContent().then(deferredContent => {
      const content = deferredContent.content;
      return onSourceContent(sourceTextRange, startEntry.sourceLineNumber || 1, startEntry.sourceColumnNumber || 1, content);
    });
  }

  /**
   * @param {!TextUtils.TextRange.TextRange} sourceTextRange
   * @param {number} line
   * @param {number} column
   * @param {?string} content
   * @return {?NameDescriptor}
   */
  function onSourceContent(sourceTextRange, line, column, content) {
    if (!content) {
      return null;
    }
    let text = textCache.get(content);
    if (!text) {
      text = new TextUtils.Text.Text(content);
      textCache.set(content, text);
    }
    const originalIdentifier = text.extract(sourceTextRange).trim();
    if (!/[a-zA-Z0-9_$]+/.test(originalIdentifier)) {
      return null;
    }
    return new NameDescriptor(originalIdentifier, line, column);
  }
};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<!Mapping>}
 */
export const allVariablesInCallFrame = function(callFrame) {
  const cached = callFrame[cachedMapSymbol];
  if (cached) {
    return Promise.resolve(cached);
  }

  const promises = [];
  const scopeChain = callFrame.scopeChain();
  for (let i = 0; i < scopeChain.length; ++i) {
    promises.push(resolveScope(scopeChain[i]));
  }

  return Promise.all(promises).then(mergeVariables);

  /**
   * @param {!Array<!Mapping>} nameMappings
   * @return {!Mapping}
   */
  function mergeVariables(nameMappings) {
    const mapping = /** @type {!Mapping} */(Array.prototype.concat.apply([], nameMappings));
    callFrame[cachedMapSymbol] = mapping;
    return mapping;
  }
};

/**
 * @param {!Mapping} mapping
 * @param {string} name
 * @param {number} line
 * @param {number} column
 * @return {?MappingRecord}
 */
const lookupMappingRecordForOriginalName = function(mapping, name, line, column) {
  const res = mapping.filter(value => {
    const desc = value.originalNameDescriptor;
    return desc.name === name && desc.lineNumber === line && desc.columnNumber === column;
  });
  if (res.length !== 1) {
    return null;
  }
  return res[0];
};

/**
 * @param {!Mapping} mapping
 * @param {string} name
 * @return {!Array<!MappingRecord>}
 */
const collectMappingRecordsForOriginalName = function(mapping, name) {
  return mapping.filter(value => {
    const desc = value.originalNameDescriptor;
    return desc.name === name;
  });
};

/**
 * @param {!Mapping} mapping
 * @param {string} name
 * @return {!Array<!MappingRecord>}
 */
const collectMappingRecordsForCompiledName = function(mapping, name) {
  return mapping.filter(value => {
    const desc = value.compiledNameDescriptor;
    return desc.name === name;
  });
};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {string} originalText
 * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
export const resolveExpression = function(
    callFrame, originalText, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  if (uiSourceCode.mimeType() === 'application/wasm') {
    // For WebAssembly disassembly, lookup the different possiblities.
    return Promise.resolve(
        `memories["${originalText}"] ?? locals["${originalText}"] ?? tables["${originalText}"] ?? functions["${
            originalText}"] ?? globals["${originalText}"] ?? imports["${originalText}"] ?? exports["${originalText}"]`);
  }
  if (!uiSourceCode.contentType().isFromSourceMap()) {
    return Promise.resolve('');
  }

  return allVariablesInCallFrame(callFrame).then(
      reverseMapping => findCompiledName(callFrame.debuggerModel, reverseMapping));

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Mapping} mapping
   * @return {!Promise<string>}
   */
  function findCompiledName(debuggerModel, mapping) {
    const record = lookupMappingRecordForOriginalName(mapping,
      originalText, lineNumber, startColumnNumber);
    if (record) {
      return Promise.resolve(record.compiledNameDescriptor.name);
    }

    return resolveExpressionAsync(debuggerModel, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber);
  }
};

/**
 * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
 * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
export const resolveExpressionAsync =
    async function(debuggerModel, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  const rawLocations =
      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
          uiSourceCode, lineNumber, startColumnNumber);
  const rawLocation = rawLocations.find(location => location.debuggerModel === debuggerModel);
  if (!rawLocation) {
    return '';
  }

  const script = rawLocation.script();
  if (!script) {
    return '';
  }
  const sourceMap =
      /** @type {!SDK.SourceMap.TextSourceMap} */ (
          Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().sourceMapForScript(script));
  if (!sourceMap) {
    return '';
  }

  return script.requestContent().then(onContent);

  /**
   * @param {!TextUtils.ContentProvider.DeferredContent} deferredContent
   * @return {!Promise<string>}
   */
  function onContent(deferredContent) {
    const content = deferredContent.content;
    if (!content) {
      return Promise.resolve('');
    }

    const text = new TextUtils.Text.Text(content);
    const textRange = sourceMap.reverseMapTextRange(
        uiSourceCode.url(),
        new TextUtils.TextRange.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
    if (!textRange) {
      return Promise.resolve('');
    }
    const originalText = text.extract(textRange);
    if (!originalText) {
      return Promise.resolve('');
    }
    return Formatter.FormatterWorkerPool.formatterWorkerPool().evaluatableJavaScriptSubstring(originalText);
  }
};

/**
 * @param {?SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
 */
export const resolveThisObject = function(callFrame) {
  if (!callFrame) {
    return Promise.resolve(null);
  }
  if (!callFrame.scopeChain().length) {
    return Promise.resolve(callFrame.thisObject());
  }

  return resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);

  /**
   * @param {!Mapping} namesMapping
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  function onScopeResolved(namesMapping) {
    const thisRecords = collectMappingRecordsForOriginalName(namesMapping, 'this');
    if (thisRecords.size !== 1) {
      return Promise.resolve(callFrame.thisObject());
    }

    const compiledName = thisRecords[0].compiledNameDescriptor.name;
    return callFrame
        .evaluate({
          expression: compiledName,
          objectGroup: 'backtrace',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: true
        })
        .then(onEvaluated);
  }

  /**
   * @param {!SDK.RuntimeModel.EvaluationResult} result
   * @return {?SDK.RemoteObject.RemoteObject}
   */
  function onEvaluated(result) {
    return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
  }
};

/**
 * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
 * @return {!SDK.RemoteObject.RemoteObject}
 */
export const resolveScopeInObject = function(scope) {
  const startLocation = scope.startLocation();
  const endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      startLocation.script() !== endLocation.script()) {
    return scope.object();
  }

  return new RemoteObject(scope);
};

/**
 * @unrestricted
 */
export class RemoteObject extends SDK.RemoteObject.RemoteObject {
  /**
   * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
   */
  constructor(scope) {
    super();
    this._scope = scope;
    this._object = scope.object();
  }

  /**
   * @override
   * @return {?Protocol.Runtime.CustomPreview}
   */
  customPreview() {
    return this._object.customPreview();
  }

  /**
   * @override
   * @return {!Protocol.Runtime.RemoteObjectId|undefined}
   */
  get objectId() {
    return this._object.objectId;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return this._object.type;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get subtype() {
    return this._object.subtype;
  }

  /**
   * @override
   * @return {*}
   */
  get value() {
    return this._object.value;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get description() {
    return this._object.description;
  }

  /**
   * @override
   * @return {boolean}
   */
  get hasChildren() {
    return this._object.hasChildren;
  }

  /**
   * @override
   * @return {!Protocol.Runtime.ObjectPreview|undefined}
   */
  get preview() {
    return this._object.preview;
  }

  /**
   * @override
   * @return {number}
   */
  arrayLength() {
    return this._object.arrayLength();
  }

  /**
   * @override
   * @param {boolean} generatePreview
   */
  getOwnProperties(generatePreview) {
    return this._object.getOwnProperties(generatePreview);
  }

  /**
   * @override
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!SDK.RemoteObject.GetPropertiesResult>}
   */
  async getAllProperties(accessorPropertiesOnly, generatePreview) {
    const allProperties = await this._object.getAllProperties(accessorPropertiesOnly, generatePreview);
    const namesMapping = await resolveScope(this._scope);

    const properties = allProperties.properties;
    const internalProperties = allProperties.internalProperties;
    const newProperties = [];
    if (properties) {
      for (let i = 0; i < properties.length; ++i) {
        const property = properties[i];
        let name = property.name;
        const propertyMapping = collectMappingRecordsForCompiledName(namesMapping, name);
        if (propertyMapping.length > 0) {
          // TODO: how to resolve the case when compiled name matches multiple original names?
          //       currently we don't have any information in property which would help us decide which one to take
          name = propertyMapping[0].originalNameDescriptor.name;
        }
        const newProperty = new SDK.RemoteObject.RemoteObjectProperty(
          name, property.value, property.enumerable, property.writable, property.isOwn, property.wasThrown,
          property.symbol, property.synthetic);
        if (propertyMapping.length > 0) {
          // this is for _prepareScopeVariables, TODO: figure out a better way how to pass this info
          newProperty.originalNameLineNumber = propertyMapping[0].originalNameDescriptor.lineNumber;
          newProperty.originalNameColumnNumber = propertyMapping[0].originalNameDescriptor.columnNumber;
        }
        newProperties.push(newProperty);
        newProperties[newProperties.length - 1].resolutionSourceProperty = property;
      }
    }
    return {properties: newProperties, internalProperties: internalProperties};
  }

  /**
   * @override
   * @param {string|!Protocol.Runtime.CallArgument} argumentName
   * @param {string} value
   * @return {!Promise<string|undefined>}
   */
  async setPropertyValue(argumentName, value) {
    const namesMapping = await resolveScope(this._scope);

    let name;
    if (typeof argumentName === 'string') {
      name = argumentName;
    } else {
      name = /** @type {string} */ (argumentName.value);
    }

    let actualName = name;
    const matchingRecords = collectMappingRecordsForOriginalName(namesMapping, name);
    if (matchingRecords.length > 0) {
      // TODO: how to resolve the case when original name matches multiple compiled names?
      actualName = matchingRecords[0].compiledNameDescriptor.name;
    }
    return this._object.setPropertyValue(actualName, value);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.CallArgument} name
   * @return {!Promise<string|undefined>}
   */
  async deleteProperty(name) {
    return this._object.deleteProperty(name);
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @return {!Promise<!SDK.RemoteObject.CallFunctionResult>}
   */
  callFunction(functionDeclaration, args) {
    return this._object.callFunction(functionDeclaration, args);
  }


  /**
   * @override
   * @param {function(this:Object, ...):T} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @return {!Promise<T>}
   * @template T
   */
  callFunctionJSON(functionDeclaration, args) {
    return this._object.callFunctionJSON(functionDeclaration, args);
  }

  /**
   * @override
   */
  release() {
    this._object.release();
  }

  /**
   * @override
   * @return {!SDK.DebuggerModel.DebuggerModel}
   */
  debuggerModel() {
    return this._object.debuggerModel();
  }

  /**
   * @override
   * @return {!SDK.RuntimeModel.RuntimeModel}
   */
  runtimeModel() {
    return this._object.runtimeModel();
  }

  /**
   * @override
   * @return {boolean}
   */
  isNode() {
    return this._object.isNode();
  }
}
