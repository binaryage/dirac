// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Sources.SourceMapNamesResolver = {};

Sources.SourceMapNamesResolver._cachedMapSymbol = Symbol('cache');
Sources.SourceMapNamesResolver._cachedIdentifiersSymbol = Symbol('cachedIdentifiers');

/**
 * @unrestricted
 */
Sources.SourceMapNamesResolver.Identifier = class {
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
};

Sources.SourceMapNamesResolver.NameDescriptor = class {
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
};


Sources.SourceMapNamesResolver.MappingRecord = class {
  /**
   * @param {!Sources.SourceMapNamesResolver.NameDescriptor} compiledNameDescriptor
   * @param {!Sources.SourceMapNamesResolver.NameDescriptor} originalNameDescriptor
   */
  constructor(compiledNameDescriptor, originalNameDescriptor) {
    this.compiledNameDescriptor = compiledNameDescriptor;
    this.originalNameDescriptor = originalNameDescriptor;
  }
};

/**
 * @typedef {!Array<!Sources.SourceMapNamesResolver.MappingRecord>}
 */
Sources.SourceMapNamesResolver.Mapping;

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise<!Array<!Sources.SourceMapNamesResolver.Identifier>>}
 */
Sources.SourceMapNamesResolver._scopeIdentifiers = function(scope) {
  var startLocation = scope.startLocation();
  var endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      (startLocation.script() !== endLocation.script()))
    return Promise.resolve(/** @type {!Array<!Sources.SourceMapNamesResolver.Identifier>}*/ ([]));

  var script = startLocation.script();
  return script.requestContent().then(onContent);

  /**
   * @param {?string} content
   * @return {!Promise<!Array<!Sources.SourceMapNamesResolver.Identifier>>}
   */
  function onContent(content) {
    if (!content)
      return Promise.resolve(/** @type {!Array<!Sources.SourceMapNamesResolver.Identifier>}*/ ([]));

    var text = new Common.Text(content);
    var scopeRange = new Common.TextRange(
        startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);
    var scopeText = text.extract(scopeRange);
    var scopeStart = text.toSourceRange(scopeRange).offset;
    var prefix = 'function fui';
    return Common.formatterWorkerPool.javaScriptIdentifiers(prefix + scopeText)
        .then(onIdentifiers.bind(null, text, scopeStart, prefix));
  }

  /**
   * @param {!Common.Text} text
   * @param {number} scopeStart
   * @param {string} prefix
   * @param {!Array<!{name: string, offset: number}>} identifiers
   * @return {!Array<!Sources.SourceMapNamesResolver.Identifier>}
   */
  function onIdentifiers(text, scopeStart, prefix, identifiers) {
    var result = [];
    var cursor = new Common.TextCursor(text.lineEndings());
    for (var i = 0; i < identifiers.length; ++i) {
      var id = identifiers[i];
      if (id.offset < prefix.length)
        continue;
      var start = scopeStart + id.offset - prefix.length;
      cursor.resetTo(start);
      result.push(new Sources.SourceMapNamesResolver.Identifier(id.name, cursor.lineNumber(), cursor.columnNumber()));
    }
    return result;
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise.<!Sources.SourceMapNamesResolver.Mapping>}
 */
Sources.SourceMapNamesResolver._resolveScope = function(scope) {
  var identifiersPromise = scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol];
  if (identifiersPromise)
    return identifiersPromise;

  var script = scope.callFrame().script;
  var sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
  if (!sourceMap)
    return Promise.resolve([]);

  /** @type {!Map<string, !Common.Text>} */
  var textCache = new Map();
  identifiersPromise = Sources.SourceMapNamesResolver._scopeIdentifiers(scope).then(onIdentifiers);
  scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol] = identifiersPromise;
  return identifiersPromise;

  /**
   * @param {!Array<!Sources.SourceMapNamesResolver.Identifier>} identifiers
   * @return {!Promise<!Sources.SourceMapNamesResolver.Mapping>}
   */
  function onIdentifiers(identifiers) {
    var namesMapping = [];
    var missingIdentifiers = [];
    // Extract as much as possible from SourceMap.
    for (var i = 0; i < identifiers.length; ++i) {
      var id = identifiers[i];
      var entry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
      if (entry && entry.name) {
        const compiled = new Sources.SourceMapNamesResolver.NameDescriptor(
          id.name, id.lineNumber, id.columnNumber);
        const original = new Sources.SourceMapNamesResolver.NameDescriptor(
          entry.name, entry.sourceLineNumber, entry.sourceColumnNumber);
        namesMapping.push(new Sources.SourceMapNamesResolver.MappingRecord(compiled, original));
      } else {
        missingIdentifiers.push(id);
      }
    }

    // Resolve missing identifier names from sourcemap ranges.
    var promises = missingIdentifiers.map(id => {
      return resolveSourceName(id).then(onSourceNameResolved.bind(null, namesMapping, id));
    });
    return Promise.all(promises)
        .then(() => Sources.SourceMapNamesResolver._scopeResolvedForTest())
        .then(() => namesMapping);
  }

  /**
   * @param {!Sources.SourceMapNamesResolver.Mapping} namesMapping
   * @param {!Sources.SourceMapNamesResolver.Identifier} id
   * @param {?Sources.SourceMapNamesResolver.NameDescriptor} originalNameDescriptor
   */
  function onSourceNameResolved(namesMapping, id, originalNameDescriptor) {
    if (!originalNameDescriptor)
      return;
    const compiled = new Sources.SourceMapNamesResolver.NameDescriptor(id.name, id.lineNumber, id.columnNumber);
    namesMapping.push(new Sources.SourceMapNamesResolver.MappingRecord(compiled, originalNameDescriptor));
  }

  /**
   * @param {!Sources.SourceMapNamesResolver.Identifier} id
   * @return {!Promise<?Sources.SourceMapNamesResolver.NameDescriptor>}
   */
  function resolveSourceName(id) {
    var startEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
    var endEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber + id.name.length);
    if (!startEntry || !endEntry || !startEntry.sourceURL || startEntry.sourceURL !== endEntry.sourceURL ||
        !startEntry.sourceLineNumber || !startEntry.sourceColumnNumber || !endEntry.sourceLineNumber ||
        !endEntry.sourceColumnNumber)
      return Promise.resolve(/** @type {?Sources.SourceMapNamesResolver.NameDescriptor} */(null));
    var sourceTextRange = new Common.TextRange(
        startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber,
        endEntry.sourceColumnNumber);
    var uiSourceCode =
        Bindings.NetworkProject.uiSourceCodeForScriptURL(Workspace.workspace, startEntry.sourceURL, script);
    if (!uiSourceCode)
      return Promise.resolve(/** @type {?Sources.SourceMapNamesResolver.NameDescriptor} */(null));

    return uiSourceCode.requestContent().then(onSourceContent.bind(null,
      sourceTextRange, startEntry.sourceLineNumber, startEntry.sourceColumnNumber));
  }

  /**
   * @param {!Common.TextRange} sourceTextRange
   * @param {number} line
   * @param {number} column
   * @param {?string} content
   * @return {?Sources.SourceMapNamesResolver.NameDescriptor}
   */
  function onSourceContent(sourceTextRange, line, column, content) {
    if (!content)
      return null;
    var text = textCache.get(content);
    if (!text) {
      text = new Common.Text(content);
      textCache.set(content, text);
    }
    var originalIdentifier = text.extract(sourceTextRange).trim();
    if (!/[a-zA-Z0-9_$]+/.test(originalIdentifier)) {
      return null;
    }
    return new Sources.SourceMapNamesResolver.NameDescriptor(originalIdentifier, line, column);
  }
};

Sources.SourceMapNamesResolver._scopeResolvedForTest = function() {};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise.<!Sources.SourceMapNamesResolver.Mapping>}
 */
Sources.SourceMapNamesResolver._allVariablesInCallFrame = function(callFrame) {
  var cached = callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol];
  if (cached)
    return Promise.resolve(cached);

  var promises = [];
  var scopeChain = callFrame.scopeChain();
  for (var i = 0; i < scopeChain.length; ++i)
    promises.push(Sources.SourceMapNamesResolver._resolveScope(scopeChain[i]));

  return Promise.all(promises).then(mergeVariables);

  /**
   * @param {!Array<!Sources.SourceMapNamesResolver.Mapping>} nameMappings
   * @return {!Sources.SourceMapNamesResolver.Mapping}
   */
  function mergeVariables(nameMappings) {
    const mapping = Array.prototype.concat.apply([], nameMappings);
    callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol] = mapping;
    return mapping;
  }
};

/**
 * @param {!Sources.SourceMapNamesResolver.Mapping} mapping
 * @param {string} name
 * @param {number} line
 * @param {number} column
 * @return {?Sources.SourceMapNamesResolver.MappingRecord}
 */
Sources.SourceMapNamesResolver.lookupMappingRecordForOriginalName = function(mapping, name, line, column) {
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
 * @param {!Sources.SourceMapNamesResolver.Mapping} mapping
 * @param {string} name
 * @param {number} line
 * @param {number} column
 * @return {?Sources.SourceMapNamesResolver.MappingRecord}
 */
Sources.SourceMapNamesResolver.lookupMappingRecordForCompiledName = function(mapping, name, line, column) {
  const res = mapping.filter(value => {
    const desc = value.compiledNameDescriptor;
    return desc.name === name && desc.lineNumber === line && desc.columnNumber === column;
  });
  if (res.length!==1) {
    return null;
  }
  return res[0];
};

/**
 * @param {!Sources.SourceMapNamesResolver.Mapping} mapping
 * @param {string} name
 * @return {!Array<!Sources.SourceMapNamesResolver.MappingRecord>}
 */
Sources.SourceMapNamesResolver.collectMappingRecordsForOriginalName = function(mapping, name) {
  return mapping.filter(value => {
    const desc = value.originalNameDescriptor;
    return desc.name === name;
  });
};

/**
 * @param {!Sources.SourceMapNamesResolver.Mapping} mapping
 * @param {string} name
 * @return {!Array<!Sources.SourceMapNamesResolver.MappingRecord>}
 */
Sources.SourceMapNamesResolver.collectMappingRecordsForCompiledName = function(mapping, name) {
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
Sources.SourceMapNamesResolver.resolveExpression = function(
    callFrame, originalText, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  if (!uiSourceCode.contentType().isFromSourceMap())
    return Promise.resolve('');

  return Sources.SourceMapNamesResolver._allVariablesInCallFrame(callFrame).then(findCompiledName);

  /**
   * @param {!Sources.SourceMapNamesResolver.Mapping} mapping
   * @return {!Promise<string>}
   */
  function findCompiledName(mapping) {
    const record = Sources.SourceMapNamesResolver.lookupMappingRecordForOriginalName(mapping,
      originalText, lineNumber, startColumnNumber);
    if (record) {
      return Promise.resolve(record.compiledNameDescriptor.name);
    }

    return Sources.SourceMapNamesResolver._resolveExpression(
        callFrame, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber);
  }
};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {!Workspace.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
Sources.SourceMapNamesResolver._resolveExpression = function(
    callFrame, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  var rawLocation = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(
      callFrame.debuggerModel, uiSourceCode, lineNumber, startColumnNumber);
  if (!rawLocation)
    return Promise.resolve('');

  var script = rawLocation.script();
  if (!script)
    return Promise.resolve('');
  var sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
  if (!sourceMap)
    return Promise.resolve('');

  return script.requestContent().then(onContent);

  /**
   * @param {?string} content
   * @return {!Promise<string>}
   */
  function onContent(content) {
    if (!content)
      return Promise.resolve('');

    var text = new Common.Text(content);
    var textRange = sourceMap.reverseMapTextRange(
        uiSourceCode.url(), new Common.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
    var originalText = text.extract(textRange);
    if (!originalText)
      return Promise.resolve('');
    return Common.formatterWorkerPool.evaluatableJavaScriptSubstring(originalText);
  }
};

/**
 * @param {?SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<?SDK.RemoteObject>}
 */
Sources.SourceMapNamesResolver.resolveThisObject = function(callFrame) {
  if (!callFrame)
    return Promise.resolve(/** @type {?SDK.RemoteObject} */ (null));
  if (!callFrame.scopeChain().length)
    return Promise.resolve(callFrame.thisObject());

  return Sources.SourceMapNamesResolver._resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);

  /**
   * @param {!Sources.SourceMapNamesResolver.Mapping} namesMapping
   * @return {!Promise<?SDK.RemoteObject>}
   */
  function onScopeResolved(namesMapping) {
    const thisRecords = Sources.SourceMapNamesResolver.collectMappingRecordsForOriginalName(namesMapping, 'this');
    if (thisRecords.size !== 1)
      return Promise.resolve(callFrame.thisObject());

    var compiledName = thisRecords[0].compiledNameDescriptor.name;
    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    callFrame.evaluate(compiledName, 'backtrace', false, true, false, true, onEvaluated.bind(null, callback));
    return promise;
  }

  /**
   * @param {function(!SDK.RemoteObject)} callback
   * @param {?Protocol.Runtime.RemoteObject} evaluateResult
   */
  function onEvaluated(callback, evaluateResult) {
    var remoteObject = evaluateResult ?
        callFrame.debuggerModel.target().runtimeModel.createRemoteObject(evaluateResult) :
        callFrame.thisObject();
    callback(remoteObject);
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!SDK.RemoteObject}
 */
Sources.SourceMapNamesResolver.resolveScopeInObject = function(scope) {
  var startLocation = scope.startLocation();
  var endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      startLocation.script() !== endLocation.script())
    return scope.object();

  return new Sources.SourceMapNamesResolver.RemoteObject(scope);
};

/**
 * @unrestricted
 */
Sources.SourceMapNamesResolver.RemoteObject = class extends SDK.RemoteObject {
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
   * @return {number}
   */
  arrayLength() {
    return this._object.arrayLength();
  }

  /**
   * @override
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getOwnProperties(generatePreview, callback) {
    this._object.getOwnProperties(generatePreview, callback);
  }

  /**
   * @override
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array<!SDK.RemoteObjectProperty>, ?Array<!SDK.RemoteObjectProperty>)} callback
   */
  getAllProperties(accessorPropertiesOnly, generatePreview, callback) {
    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @this {Sources.SourceMapNamesResolver.RemoteObject}
     */
    function wrappedCallback(properties, internalProperties) {
      Sources.SourceMapNamesResolver._resolveScope(this._scope)
          .then(resolveNames.bind(null, properties, internalProperties));
    }

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @param {!Sources.SourceMapNamesResolver.Mapping} namesMapping
     */
    function resolveNames(properties, internalProperties, namesMapping) {
      var newProperties = [];
      if (properties) {
        for (var i = 0; i < properties.length; ++i) {
          var property = properties[i];
          var name = property.name;
          const propertyMapping = Sources.SourceMapNamesResolver.collectMappingRecordsForCompiledName(namesMapping, name);
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

      callback(newProperties, internalProperties);
    }

    this._object.getAllProperties(accessorPropertiesOnly, generatePreview, wrappedCallback.bind(this));
  }

  /**
   * @override
   * @param {string|!Protocol.Runtime.CallArgument} argumentName
   * @param {string} value
   * @param {function(string=)} callback
   */
  setPropertyValue(argumentName, value, callback) {
    Sources.SourceMapNamesResolver._resolveScope(this._scope).then(resolveName.bind(this));

    /**
     * @param {!Sources.SourceMapNamesResolver.Mapping} namesMapping
     * @this {Sources.SourceMapNamesResolver.RemoteObject}
     */
    function resolveName(namesMapping) {
      var name;
      if (typeof argumentName === 'string')
        name = argumentName;
      else
        name = /** @type {string} */ (argumentName.value);

      var actualName = name;
      let matchingRecords = Sources.SourceMapNamesResolver.collectMappingRecordsForOriginalName(namesMapping, name);
      if (matchingRecords.length>0) {
        // TODO: how to resolve the case when original name matches multiple compiled names?
        actualName = matchingRecords[0].compiledNameDescriptor.name;
      }
      this._object.setPropertyValue(actualName, value, callback);
    }
  }

  /**
   * @override
   * @return {!Promise<?Array<!SDK.EventListener>>}
   */
  eventListeners() {
    return this._object.eventListeners();
  }

  /**
   * @override
   * @param {!Protocol.Runtime.CallArgument} name
   * @param {function(string=)} callback
   */
  deleteProperty(name, callback) {
    this._object.deleteProperty(name, callback);
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @param {function(?SDK.RemoteObject, boolean=)=} callback
   */
  callFunction(functionDeclaration, args, callback) {
    this._object.callFunction(functionDeclaration, args, callback);
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @param {function(*)} callback
   */
  callFunctionJSON(functionDeclaration, args, callback) {
    this._object.callFunctionJSON(functionDeclaration, args, callback);
  }

  /**
   * @override
   * @return {!SDK.Target}
   */
  target() {
    return this._object.target();
  }

  /**
   * @override
   * @return {?SDK.DebuggerModel}
   */
  debuggerModel() {
    return this._object.debuggerModel();
  }

  /**
   * @override
   * @return {boolean}
   */
  isNode() {
    return this._object.isNode();
  }
};
