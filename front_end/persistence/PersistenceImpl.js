// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export default class PersistenceImpl extends Common.Object {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.BreakpointManager} breakpointManager
   */
  constructor(workspace, breakpointManager) {
    super();
    this._workspace = workspace;
    this._breakpointManager = breakpointManager;
    /** @type {!Map<string, number>} */
    this._filePathPrefixesToBindingCount = new Map();

    /** @type {!Platform.Multimap<!Workspace.UISourceCode, function()>} */
    this._subscribedBindingEventListeners = new Platform.Multimap();

    const linkDecorator = new Persistence.PersistenceUtils.LinkDecorator(this);
    Components.Linkifier.setLinkDecorator(linkDecorator);

    this._mapping =
        new Persistence.Automapping(this._workspace, this._onStatusAdded.bind(this), this._onStatusRemoved.bind(this));
  }

  /**
   * @param {function(!Workspace.UISourceCode):boolean} interceptor
   */
  addNetworkInterceptor(interceptor) {
    this._mapping.addNetworkInterceptor(interceptor);
  }

  refreshAutomapping() {
    this._mapping.scheduleRemap();
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  addBinding(binding) {
    this._innerAddBinding(binding);
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  addBindingForTest(binding) {
    this._innerAddBinding(binding);
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  removeBinding(binding) {
    this._innerRemoveBinding(binding);
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  removeBindingForTest(binding) {
    this._innerRemoveBinding(binding);
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  _innerAddBinding(binding) {
    binding.network[_binding] = binding;
    binding.fileSystem[_binding] = binding;

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._addFilePathBindingPrefixes(binding.fileSystem.url());

    this._moveBreakpoints(binding.fileSystem, binding.network);

    console.assert(!binding.fileSystem.isDirty() || !binding.network.isDirty());
    if (binding.fileSystem.isDirty()) {
      this._syncWorkingCopy(binding.fileSystem);
    } else if (binding.network.isDirty()) {
      this._syncWorkingCopy(binding.network);
    } else if (binding.network.hasCommits() && binding.network.content() !== binding.fileSystem.content()) {
      binding.network.setWorkingCopy(binding.network.content());
      this._syncWorkingCopy(binding.network);
    }

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingCreated, binding);
  }

  /**
   * @param {!PersistenceBinding} binding
   */
  _innerRemoveBinding(binding) {
    if (binding.network[_binding] !== binding) {
      return;
    }
    console.assert(
        binding.network[_binding] === binding.fileSystem[_binding],
        'ERROR: inconsistent binding for networkURL ' + binding.network.url());

    binding.network[_binding] = null;
    binding.fileSystem[_binding] = null;

    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._removeFilePathBindingPrefixes(binding.fileSystem.url());
    this._breakpointManager.copyBreakpoints(binding.network.url(), binding.fileSystem);

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingRemoved, binding);
  }

  /**
   * @param {!Persistence.AutomappingStatus} status
   */
  _onStatusAdded(status) {
    const binding = new PersistenceBinding(status.network, status.fileSystem);
    status[_binding] = binding;
    this._innerAddBinding(binding);
  }

  /**
   * @param {!Persistence.AutomappingStatus} status
   */
  _onStatusRemoved(status) {
    const binding = /** @type {!PersistenceBinding} */ (status[_binding]);
    this._innerRemoveBinding(binding);
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyChanged(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._syncWorkingCopy(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _syncWorkingCopy(uiSourceCode) {
    const binding = uiSourceCode[_binding];
    if (!binding || binding[_muteWorkingCopy]) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    if (!uiSourceCode.isDirty()) {
      binding[_muteWorkingCopy] = true;
      other.resetWorkingCopy();
      binding[_muteWorkingCopy] = false;
      this._contentSyncedForTest();
      return;
    }

    const target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
    if (target.type() === SDK.Target.Type.Node) {
      const newContent = uiSourceCode.workingCopy();
      other.requestContent().then(() => {
        const nodeJSContent = PersistenceImpl.rewrapNodeJSContent(other, other.workingCopy(), newContent);
        setWorkingCopy.call(this, () => nodeJSContent);
      });
      return;
    }

    setWorkingCopy.call(this, () => uiSourceCode.workingCopy());

    /**
     * @param {function():string} workingCopyGetter
     * @this {PersistenceImpl}
     */
    function setWorkingCopy(workingCopyGetter) {
      binding[_muteWorkingCopy] = true;
      other.setWorkingCopyGetter(workingCopyGetter);
      binding[_muteWorkingCopy] = false;
      this._contentSyncedForTest();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyCommitted(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    const newContent = /** @type {string} */ (event.data.content);
    this.syncContent(uiSourceCode, newContent, event.data.encoded);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} newContent
   * @param {boolean} encoded
   */
  syncContent(uiSourceCode, newContent, encoded) {
    const binding = uiSourceCode[_binding];
    if (!binding || binding[_muteCommit]) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    const target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
    if (target.type() === SDK.Target.Type.Node) {
      other.requestContent().then(currentContent => {
        const nodeJSContent = PersistenceImpl.rewrapNodeJSContent(other, currentContent.content, newContent);
        setContent.call(this, nodeJSContent);
      });
      return;
    }
    setContent.call(this, newContent);

    /**
     * @param {string} newContent
     * @this {PersistenceImpl}
     */
    function setContent(newContent) {
      binding[_muteCommit] = true;
      other.setContent(newContent, encoded);
      binding[_muteCommit] = false;
      this._contentSyncedForTest();
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} currentContent
   * @param {string} newContent
   * @return {string}
   */
  static rewrapNodeJSContent(uiSourceCode, currentContent, newContent) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem) {
      if (newContent.startsWith(_NodePrefix) && newContent.endsWith(_NodeSuffix)) {
        newContent = newContent.substring(_NodePrefix.length, newContent.length - _NodeSuffix.length);
      }
      if (currentContent.startsWith(_NodeShebang)) {
        newContent = _NodeShebang + newContent;
      }
    } else {
      if (newContent.startsWith(_NodeShebang)) {
        newContent = newContent.substring(_NodeShebang.length);
      }
      if (currentContent.startsWith(_NodePrefix) && currentContent.endsWith(_NodeSuffix)) {
        newContent = _NodePrefix + newContent + _NodeSuffix;
      }
    }
    return newContent;
  }

  _contentSyncedForTest() {
  }

  /**
   * @param {!Workspace.UISourceCode} from
   * @param {!Workspace.UISourceCode} to
   */
  _moveBreakpoints(from, to) {
    const breakpoints = this._breakpointManager.breakpointLocationsForUISourceCode(from).map(
        breakpointLocation => breakpointLocation.breakpoint);
    for (const breakpoint of breakpoints) {
      breakpoint.remove(false /* keepInStorage */);
      this._breakpointManager.setBreakpoint(
          to, breakpoint.lineNumber(), breakpoint.columnNumber(), breakpoint.condition(), breakpoint.enabled());
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  hasUnsavedCommittedChanges(uiSourceCode) {
    if (this._workspace.hasResourceContentTrackingExtensions()) {
      return false;
    }
    if (uiSourceCode.project().canSetFileContent()) {
      return false;
    }
    if (uiSourceCode[_binding]) {
      return false;
    }
    return !!uiSourceCode.hasCommits();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?PersistenceBinding}
   */
  binding(uiSourceCode) {
    return uiSourceCode[_binding] || null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function()} listener
   */
  subscribeForBindingEvent(uiSourceCode, listener) {
    this._subscribedBindingEventListeners.set(uiSourceCode, listener);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function()} listener
   */
  unsubscribeFromBindingEvent(uiSourceCode, listener) {
    this._subscribedBindingEventListeners.delete(uiSourceCode, listener);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _notifyBindingEvent(uiSourceCode) {
    if (!this._subscribedBindingEventListeners.has(uiSourceCode)) {
      return;
    }
    const listeners = Array.from(this._subscribedBindingEventListeners.get(uiSourceCode));
    for (const listener of listeners) {
      listener.call(null);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Workspace.UISourceCode}
   */
  fileSystem(uiSourceCode) {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.fileSystem : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Workspace.UISourceCode}
   */
  network(uiSourceCode) {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.network : null;
  }

  /**
   * @param {string} filePath
   */
  _addFilePathBindingPrefixes(filePath) {
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this._filePathPrefixesToBindingCount.get(relative) || 0;
      this._filePathPrefixesToBindingCount.set(relative, count + 1);
    }
  }

  /**
   * @param {string} filePath
   */
  _removeFilePathBindingPrefixes(filePath) {
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this._filePathPrefixesToBindingCount.get(relative);
      if (count === 1) {
        this._filePathPrefixesToBindingCount.delete(relative);
      } else {
        this._filePathPrefixesToBindingCount.set(relative, count - 1);
      }
    }
  }

  /**
   * @param {string} filePath
   * @return {boolean}
   */
  filePathHasBindings(filePath) {
    if (!filePath.endsWith('/')) {
      filePath += '/';
    }
    return this._filePathPrefixesToBindingCount.has(filePath);
  }
}

export const _binding = Symbol('Persistence.Binding');
export const _muteCommit = Symbol('Persistence.MuteCommit');
export const _muteWorkingCopy = Symbol('Persistence.MuteWorkingCopy');
export const _NodePrefix = '(function (exports, require, module, __filename, __dirname) { ';
export const _NodeSuffix = '\n});';
export const _NodeShebang = '#!/usr/bin/env node';

export const Events = {
  BindingCreated: Symbol('BindingCreated'),
  BindingRemoved: Symbol('BindingRemoved')
};

/**
 * @unrestricted
 */
export class PathEncoder {
  constructor() {
    /** @type {!Common.CharacterIdMap<string>} */
    this._encoder = new Common.CharacterIdMap();
  }

  /**
   * @param {string} path
   * @return {string}
   */
  encode(path) {
    return path.split('/').map(token => this._encoder.toChar(token)).join('');
  }

  /**
   * @param {string} path
   * @return {string}
   */
  decode(path) {
    return path.split('').map(token => this._encoder.fromChar(token)).join('/');
  }
}

/**
 * @unrestricted
 */
export class PersistenceBinding {
  /**
   * @param {!Workspace.UISourceCode} network
   * @param {!Workspace.UISourceCode} fileSystem
   */
  constructor(network, fileSystem) {
    this.network = network;
    this.fileSystem = fileSystem;
  }
}

/* Legacy exported object */
self.Persistence = self.Persistence || {};

/* Legacy exported object */
Persistence = Persistence || {};

/** @constructor */
Persistence.Persistence = PersistenceImpl;

Persistence.Persistence._binding = _binding;
Persistence.Persistence._muteCommit = _muteCommit;
Persistence.Persistence._muteWorkingCopy = _muteWorkingCopy;
Persistence.Persistence._NodePrefix = _NodePrefix;
Persistence.Persistence._NodeSuffix = _NodeSuffix;
Persistence.Persistence._NodeShebang = _NodeShebang;
Persistence.Persistence.Events = Events;

/** @constructor */
Persistence.PathEncoder = PathEncoder;

/** @constructor */
Persistence.PersistenceBinding = PersistenceBinding;

/** @type {!PersistenceImpl} */
Persistence.persistence;
