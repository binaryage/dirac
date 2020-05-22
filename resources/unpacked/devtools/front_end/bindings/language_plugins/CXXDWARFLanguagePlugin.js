// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../sdk/sdk.js';
import {DebuggerLanguagePlugin, DebuggerLanguagePluginError, RawLocation, RawModule, SourceLocation, Variable, VariableValue} from '../DebuggerLanguagePlugins.js';  // eslint-disable-line no-unused-vars


/**
 * @typedef {{
 *            sources:!Array<string>
 *          }}
 */
let AddRawModuleResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            rawLocation:!Array<!RawLocation>
 *          }}
 */
let SourceLocationToRawLocationResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            sourceLocation:!Array<!SourceLocation>
 *          }}
 */
let RawLocationToSourceLocationResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            variable:!Array<!Variable>
 *          }}
 */
let ListVariablesInScopeResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            value:!RawModule
 *          }}
 */
let EvaluateVariableResponse;  // eslint-disable-line no-unused-vars

/**
 * @param {string} method
 * @param {!Object} params
 * @return {!Promise<!AddRawModuleResponse|!SourceLocationToRawLocationResponse|!RawLocationToSourceLocationResponse|!ListVariablesInScopeResponse|!EvaluateVariableResponse>}
 *
 */
async function _sendJsonRPC(method, params) {
  const payload = JSON.stringify({jsonrpc: '2.0', method: method, params, id: 0});
  const request = new Request(
      'http://localhost:8888',
      {method: 'POST', headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}, body: payload});
  const response = await fetch(request);
  if (response.status !== 200) {
    throw new DebuggerLanguagePluginError(response.status.toString(), 'JSON-RPC request failed');
  }
  const result = (await response.json()).result;
  if (result.error) {
    throw new DebuggerLanguagePluginError(result.error.code, result.error.message);
  }
  return result;
}

/**
 * @implements {DebuggerLanguagePlugin}
 */
export class CXXDWARFLanguagePlugin {
  /**
   * @override
   * @param {!SDK.Script.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
    return script.isWasm() &&                       // Only handle wasm scripts
        !script.sourceURL.startsWith('wasm://') &&  // Only handle scripts with valid response URL
        (script.sourceMapURL === 'wasm://dwarf' ||  // Only handle scripts with either embedded dwarf ...
         !script.sourceMapURL);                     // ... or no source map at all (look up symbols out of band).
  }

  /** Notify the plugin about a new script
   * @override
   * @param {string} rawModuleId
   * @param {string} symbols
   * @param {!RawModule} rawModule
   * @return {!Promise<!Array<string>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async addRawModule(rawModuleId, symbols, rawModule) {
    return (await _sendJsonRPC(
                'addRawModule', {rawModuleId: rawModuleId, symbols: symbols, rawModule: getProtocolModule(rawModule)}))
        .sources;

    function getProtocolModule(rawModule) {
      if (!rawModule.code) {
        return {url: rawModule.url};
      }
      const moduleBytes = new Uint8Array(rawModule.code);

      let binary = '';
      const len = moduleBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(moduleBytes[i]);
      }

      return {code: btoa(binary)};
    }
  }

  /** Find locations in raw modules from a location in a source file
   * @override
   * @param {!SourceLocation} sourceLocation
   * @return {!Promise<!Array<!RawLocation>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async sourceLocationToRawLocation(sourceLocation) {
    return (await _sendJsonRPC('sourceLocationToRawLocation', sourceLocation)).rawLocation;
  }

  /** Find locations in source files from a location in a raw module
   * @override
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!SourceLocation>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async rawLocationToSourceLocation(rawLocation) {
    return (await _sendJsonRPC('rawLocationToSourceLocation', rawLocation)).sourceLocation;
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @override
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!Variable>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async listVariablesInScope(rawLocation) {
    return (await _sendJsonRPC('listVariablesInScope', rawLocation)).variable;
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @override
   * @param {string} name
   * @param {!RawLocation} location
   * @return {!Promise<?RawModule>}
   * @throws {DebuggerLanguagePluginError}
  */
  async evaluateVariable(name, location) {
    return (await _sendJsonRPC('evaluateVariable', {name: name, location: location})).value;
  }

  /**
   * @override
   */
  dispose() {
  }

  /** Get the representation when value contains a string
   * @param {!VariableValue} value
   */
  _reprString(value) {
    return value.value;
  }

  /** Get the representation when value contains a number
   * @param {!VariableValue} value
   */
  _reprNumber(value) {
    return Number(value.value);
  }

  /** Get the representation when value is a compound value
   * @param {!VariableValue} value
   */
  _reprCompound(value) {
    const result = {};
    for (const property of value.value) {
      result[property.name] = this._repr(property);
    }
    return result;
  }

  /** Get the representation when value contains an array of values
   * @param {!VariableValue} value
   */
  _reprArray(value) {
    if (value.value.length > 0 && value.value[0].name && value.value[0].name.endsWith(']')) {
      return value.value.map(v => this._repr(v));
    }
    return this._reprCompound(value);
  }

  /** Get the representation for a variable value
   * @param {!VariableValue} value
   */
  _repr(value) {
    if (Array.isArray(value.value)) {
      return this._reprArray(value);
    }
    console.error(`Repr for type ${value.type}`);
    const numberTypes = [
      'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'float', 'double',
      'long double'
    ];
    if (numberTypes.indexOf(value.type) > -1) {
      return this._reprNumber(value);
    }
    return this._reprString(value);
  }

  /** Produce a language specific representation of a variable value
   * @override
   * @param {!VariableValue} value
   * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
   */
  async getRepresentation(value) {
    return new SDK.RemoteObject.LocalJSONObject(this._repr(value));
  }
}
