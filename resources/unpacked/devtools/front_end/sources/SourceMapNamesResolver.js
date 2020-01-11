// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const _cachedMapSymbol = Symbol('cache');
export const _cachedIdentifiersSymbol = Symbol('cachedIdentifiers');

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

/**
 * @typedef {!Array<!MappingRecord>}
 */
export class Mapping {
}

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise<!Array<!Identifier>>}
 */
export const _scopeIdentifiers = function(scope) {
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
   * @param {!Common.DeferredContent} deferredContent
   * @return {!Promise<!Array<!Identifier>>}
   */
  function onContent(deferredContent) {
    if (!deferredContent.content) {
      return Promise.resolve(/** @type {!Array<!Identifier>}*/ ([]));
    }

    const content = deferredContent.content;
    const text = new TextUtils.Text(content);
    const scopeRange = new TextUtils.TextRange(
        startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);
    const scopeText = text.extract(scopeRange);
    const scopeStart = text.toSourceRange(scopeRange).offset;
    const prefix = 'function fui';
    return Formatter.formatterWorkerPool()
        .javaScriptIdentifiers(prefix + scopeText)
        .then(onIdentifiers.bind(null, text, scopeStart, prefix));
  }

  /**
   * @param {!TextUtils.Text} text
   * @param {number} scopeStart
   * @param {string} prefix
   * @param {!Array<!{name: string, offset: number}>} identifiers
   * @return {!Array<!Identifier>}
   */
  function onIdentifiers(text, scopeStart, prefix, identifiers) {
    const result = [];
    const cursor = new TextUtils.TextCursor(text.lineEndings());
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
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise<!Mapping>}
 */
export const _resolveScope = function(scope) {
  let identifiersPromise = scope[_cachedIdentifiersSymbol];
  if (identifiersPromise) {
    return identifiersPromise;
  }

  const script = scope.callFrame().script;
  const sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
  if (!sourceMap) {
    return Promise.resolve([]);
  }

  /** @type {!Map<string, !TextUtils.Text>} */
  const textCache = new Map();
  identifiersPromise = _scopeIdentifiers(scope).then(onIdentifiers);
  scope[_cachedIdentifiersSymbol] = identifiersPromise;
  return identifiersPromise;

  /**
   * @param {!Array<!Identifier>} identifiers
   * @return {!Promise<!Mapping>}
   */
  function onIdentifiers(identifiers) {
    const namesMapping = [];
    let missingIdentifiers = [];
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
    let promises = missingIdentifiers.map(id => {
      return resolveSourceName(id).then(onSourceNameResolved.bind(null, namesMapping, id));
    });
    return Promise.all(promises)
        .then(() => namesMapping);
  }

  /**
   * @param {!Mapping} namesMapping
   * @param {!Identifier} id
   * @param {!NameDescriptor} originalNameDescriptor
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
      return Promise.resolve(/** @type {?NameDescriptor} */null);
    }
    const sourceTextRange = new TextUtils.TextRange(
        startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber,
        endEntry.sourceColumnNumber);
    const uiSourceCode = Bindings.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURL(
        script.debuggerModel, startEntry.sourceURL, script.isContentScript());
    if (!uiSourceCode) {
      return Promise.resolve(/** @type {?NameDescriptor} */null);
    }

    return uiSourceCode.requestContent().then(deferredContent => {
      const content = deferredContent.content;
      return onSourceContent(sourceTextRange, startEntry.sourceLineNumber || 1, startEntry.sourceColumnNumber || 1, content);
    });
  }

  /**
   * @param {!TextUtils.TextRange} sourceTextRange
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
      text = new TextUtils.Text(content);
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
export const _allVariablesInCallFrame = function(callFrame) {
  const cached = callFrame[_cachedMapSymbol];
  if (cached) {
    return Promise.resolve(cached);
  }

  const promises = [];
  const scopeChain = callFrame.scopeChain();
  for (let i = 0; i < scopeChain.length; ++i) {
    promises.push(_resolveScope(scopeChain[i]));
  }

  return Promise.all(promises).then(mergeVariables);

  /**
   * @param {!Array<!Mapping>} nameMappings
   * @return {!Mapping}
   */
  function mergeVariables(nameMappings) {
    const mapping = /** @type {!Mapping} */Array.prototype.concat.apply([], nameMappings);
    callFrame[_cachedMapSymbol] = mapping;
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
  if (res.length!==1) {
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
 * @param {!Workspace.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
export const resolveExpression = function(
    callFrame, originalText, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  if (!uiSourceCode.contentType().isFromSourceMap()) {
    return Promise.resolve('');
  }

  return _allVariablesInCallFrame(callFrame).then(
      reverseMapping => findCompiledName(callFrame.debuggerModel, reverseMapping));

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Mapping} mapping
   * @return {!Promise<string>}
   */
  function findCompiledName(debuggerModel, mapping) {
    const record = lookupMappingRecordForOriginalName(mapping,
      originalText, lineNumber, startColumnNumber);
    if (record) {
      return Promise.resolve(record.compiledNameDescriptor.name);
    }

    return _resolveExpression(debuggerModel, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber);
  }
};

/**
 * @param {!SDK.DebuggerModel} debuggerModel
 * @param {!Workspace.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
export const _resolveExpression = function(
    debuggerModel, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  const rawLocations =
      Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, lineNumber, startColumnNumber);
  const rawLocation = rawLocations.find(location => location.debuggerModel === debuggerModel);
  if (!rawLocation) {
    return Promise.resolve('');
  }

  const script = rawLocation.script();
  if (!script) {
    return Promise.resolve('');
  }
  const sourceMap = /** @type {!SDK.TextSourceMap} */ (Bindings.debuggerWorkspaceBinding.sourceMapForScript(script));
  if (!sourceMap) {
    return Promise.resolve('');
  }

  return script.requestContent().then(onContent);

  /**
   * @param {!Common.DeferredContent} deferredContent
   * @return {!Promise<string>}
   */
  function onContent(deferredContent) {
    const content = deferredContent.content;
    if (!content) {
      return Promise.resolve('');
    }

    const text = new TextUtils.Text(content);
    const textRange = sourceMap.reverseMapTextRange(
        uiSourceCode.url(), new TextUtils.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
    const originalText = text.extract(textRange);
    if (!originalText) {
      return Promise.resolve('');
    }
    return Formatter.formatterWorkerPool().evaluatableJavaScriptSubstring(originalText);
  }
};

/**
 * @param {?SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<?SDK.RemoteObject>}
 */
export const resolveThisObject = function(callFrame) {
  if (!callFrame) {
    return Promise.resolve(/** @type {?SDK.RemoteObject} */ null);
  }
  if (!callFrame.scopeChain().length) {
    return Promise.resolve(callFrame.thisObject());
  }

  return _resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);

  /**
   * @param {!Mapping} namesMapping
   * @return {!Promise<?SDK.RemoteObject>}
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
   * @return {?SDK.RemoteObject}
   */
  function onEvaluated(result) {
    return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!SDK.RemoteObject}
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
export class RemoteObject extends SDK.RemoteObject {
  /**
   * @param {!SDK.DebuggerModel.Scope} scope
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
   * @return {!Promise<!SDK.GetPropertiesResult>}
   */
  async getAllProperties(accessorPropertiesOnly, generatePreview) {
    const allProperties = await this._object.getAllProperties(accessorPropertiesOnly, generatePreview);
    const namesMapping = await _resolveScope(this._scope);

    const properties = allProperties.properties;
    const internalProperties = allProperties.internalProperties;
    const newProperties = [];
    if (properties) {
      for (let i = 0; i < properties.length; ++i) {
        const property = properties[i];
        let name = property.name;
        const propertyMapping = collectMappingRecordsForCompiledName(namesMapping, name);
        if (propertyMapping.length>0) {
          // TODO: how to resolve the case when compiled name matches multiple original names?
          //       currently we don't have any information in property which would help us decide which one to take
          name = propertyMapping[0].originalNameDescriptor.name;
        }
        let newProperty = new SDK.RemoteObjectProperty(
          name, property.value, property.enumerable, property.writable, property.isOwn, property.wasThrown,
          property.symbol, property.synthetic);
        if (propertyMapping.length>0) {
          // this is for _prepareScopeVariables, TODO: figure out a better way how to pass this info
          newProperty.originalNameLineNumber = propertyMapping[0].originalNameDescriptor.lineNumber;
          newProperty.originalNameColumnNumber = propertyMapping[0].originalNameDescriptor.columnNumber;
        }
        newProperties.push(newProperty);
        newProperties[newProperties.length-1].resolutionSourceProperty = property;
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
    const namesMapping = await _resolveScope(this._scope);

    let name;
    if (typeof argumentName === 'string') {
      name = argumentName;
    } else {
      name = /** @type {string} */ (argumentName.value);
    }

    let actualName = name;
    let matchingRecords = collectMappingRecordsForOriginalName(namesMapping, name);
    if (matchingRecords.length>0) {
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
   * @return {!Promise<!SDK.CallFunctionResult>}
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
   * @return {!SDK.DebuggerModel}
   */
  debuggerModel() {
    return this._object.debuggerModel();
  }

  /**
   * @override
   * @return {!SDK.RuntimeModel}
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

/* Legacy exported object */
self.Sources = self.Sources || {};

/* Legacy exported object */
Sources = Sources || {};

Sources.SourceMapNamesResolver = {};

// Tests can override this global symbol and therefore can't be exported
Sources.SourceMapNamesResolver._scopeResolvedForTest = function() {};

Sources.SourceMapNamesResolver._cachedMapSymbol = _cachedMapSymbol;
Sources.SourceMapNamesResolver._cachedIdentifiersSymbol = _cachedIdentifiersSymbol;
Sources.SourceMapNamesResolver._scopeIdentifiers = _scopeIdentifiers;
Sources.SourceMapNamesResolver._resolveScope = _resolveScope;
Sources.SourceMapNamesResolver._allVariablesInCallFrame = _allVariablesInCallFrame;
Sources.SourceMapNamesResolver.resolveExpression = resolveExpression;
Sources.SourceMapNamesResolver._resolveExpression = _resolveExpression;
Sources.SourceMapNamesResolver.resolveThisObject = resolveThisObject;
Sources.SourceMapNamesResolver.resolveScopeInObject = resolveScopeInObject;

/** @constructor */
Sources.SourceMapNamesResolver.Identifier = Identifier;

/** @constructor */
Sources.SourceMapNamesResolver.RemoteObject = RemoteObject;
