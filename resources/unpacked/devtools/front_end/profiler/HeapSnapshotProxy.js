/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';  // eslint-disable-line no-unused-vars

import {ChildrenProvider} from './ChildrenProvider.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class HeapSnapshotWorkerProxy extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {function(string, *)} eventHandler
   */
  constructor(eventHandler) {
    super();
    this._eventHandler = eventHandler;
    this._nextObjectId = 1;
    this._nextCallId = 1;
    /** @type {!Map<number, function(*)>} */
    this._callbacks = new Map();
    /** @type {!Set<number>} */
    this._previousCallbacks = new Set();
    this._worker = new Common.Worker.WorkerWrapper('heap_snapshot_worker_entrypoint');
    this._worker.onmessage = this._messageReceived.bind(this);
  }

  /**
   * @param {number} profileUid
   * @param {function(!HeapSnapshotProxy)} snapshotReceivedCallback
   * @return {!HeapSnapshotLoaderProxy}
   */
  createLoader(profileUid, snapshotReceivedCallback) {
    const objectId = this._nextObjectId++;
    const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
    this._postMessage({
      callId: this._nextCallId++,
      disposition: 'create',
      objectId: objectId,
      methodName: 'HeapSnapshotWorker.HeapSnapshotLoader'
    });
    return proxy;
  }

  dispose() {
    this._worker.terminate();
    if (this._interval) {
      clearInterval(this._interval);
    }
  }

  disposeObject(objectId) {
    this._postMessage({callId: this._nextCallId++, disposition: 'dispose', objectId: objectId});
  }

  evaluateForTest(script, callback) {
    const callId = this._nextCallId++;
    this._callbacks.set(callId, callback);
    this._postMessage({callId: callId, disposition: 'evaluateForTest', source: script});
  }

  /**
   * @param {?function(...?)} callback
   * @param {string} objectId
   * @param {string} methodName
   * @param {function(new:T, ...?)} proxyConstructor
   * @return {?Object}
   * @template T
   */
  callFactoryMethod(callback, objectId, methodName, proxyConstructor) {
    const callId = this._nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 4);
    const newObjectId = this._nextObjectId++;

    /**
     * @this {HeapSnapshotWorkerProxy}
     */
    function wrapCallback(remoteResult) {
      callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
    }

    if (callback) {
      this._callbacks.set(callId, wrapCallback.bind(this));
      this._postMessage({
        callId: callId,
        disposition: 'factory',
        objectId: objectId,
        methodName: methodName,
        methodArguments: methodArguments,
        newObjectId: newObjectId
      });
      return null;
    }
    this._postMessage({
      callId: callId,
      disposition: 'factory',
      objectId: objectId,
      methodName: methodName,
      methodArguments: methodArguments,
      newObjectId: newObjectId
    });
    return new proxyConstructor(this, newObjectId);
  }

  /**
   * @param {function(*)} callback
   * @param {string} objectId
   * @param {string} methodName
   */
  callMethod(callback, objectId, methodName) {
    const callId = this._nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 3);
    if (callback) {
      this._callbacks.set(callId, callback);
    }
    this._postMessage({
      callId: callId,
      disposition: 'method',
      objectId: objectId,
      methodName: methodName,
      methodArguments: methodArguments
    });
  }

  startCheckingForLongRunningCalls() {
    if (this._interval) {
      return;
    }
    this._checkLongRunningCalls();
    this._interval = setInterval(this._checkLongRunningCalls.bind(this), 300);
  }

  _checkLongRunningCalls() {
    for (const callId of this._previousCallbacks) {
      if (!this._callbacks.has(callId)) {
        this._previousCallbacks.delete(callId);
      }
    }
    const hasLongRunningCalls = !!this._previousCallbacks.size;
    this.dispatchEventToListeners(HeapSnapshotWorkerProxy.Events.Wait, hasLongRunningCalls);
    for (const callId of this._callbacks.keys()) {
      this._previousCallbacks.add(callId);
    }
  }

  /**
   * @param {!MessageEvent} event
   */
  _messageReceived(event) {
    const data = event.data;
    if (data.eventName) {
      if (this._eventHandler) {
        this._eventHandler(data.eventName, data.data);
      }
      return;
    }
    if (data.error) {
      if (data.errorMethodName) {
        Common.Console.Console.instance().error(Common.UIString.UIString(
            'An error occurred when a call to method \'%s\' was requested', data.errorMethodName));
      }
      Common.Console.Console.instance().error(data['errorCallStack']);
      this._callbacks.delete(data.callId);
      return;
    }
    if (!this._callbacks.has(data.callId)) {
      return;
    }
    const callback = this._callbacks.get(data.callId);
    this._callbacks.delete(data.callId);
    callback(data.result);
  }

  _postMessage(message) {
    this._worker.postMessage(message);
  }
}

HeapSnapshotWorkerProxy.Events = {
  Wait: Symbol('Wait')
};

/**
 * @unrestricted
 */
export class HeapSnapshotProxyObject {
  /**
   * @param {!HeapSnapshotWorkerProxy} worker
   * @param {number} objectId
   */
  constructor(worker, objectId) {
    this._worker = worker;
    this._objectId = objectId;
  }

  /**
   * @param {string} workerMethodName
   * @param {!Array.<*>} args
   */
  _callWorker(workerMethodName, args) {
    args.splice(1, 0, this._objectId);
    return this._worker[workerMethodName].apply(this._worker, args);
  }

  dispose() {
    this._worker.disposeObject(this._objectId);
  }

  disposeWorker() {
    this._worker.dispose();
  }

  /**
   * @param {?function(...?)} callback
   * @param {string} methodName
   * @param {function (new:T, ...?)} proxyConstructor
   * @param {...*} var_args
   * @return {!T}
   * @template T
   */
  callFactoryMethod(callback, methodName, proxyConstructor, var_args) {
    return this._callWorker('callFactoryMethod', Array.prototype.slice.call(arguments, 0));
  }

  /**
   * @param {string} methodName
   * @param {...*} var_args
   * @return {!Promise.<?T>}
   * @template T
   */
  _callMethodPromise(methodName, var_args) {
    const args = Array.prototype.slice.call(arguments);
    return new Promise(resolve => this._callWorker('callMethod', [resolve, ...args]));
  }
}

/**
 * @implements {Common.StringOutputStream.OutputStream}
 * @unrestricted
 */
export class HeapSnapshotLoaderProxy extends HeapSnapshotProxyObject {
  /**
   * @param {!HeapSnapshotWorkerProxy} worker
   * @param {number} objectId
   * @param {number} profileUid
   * @param {function(!HeapSnapshotProxy)} snapshotReceivedCallback
   */
  constructor(worker, objectId, profileUid, snapshotReceivedCallback) {
    super(worker, objectId);
    this._profileUid = profileUid;
    this._snapshotReceivedCallback = snapshotReceivedCallback;
  }

  /**
   * @override
   * @param {string} chunk
   * @return {!Promise}
   */
  write(chunk) {
    return this._callMethodPromise('write', chunk);
  }

  /**
   * @override
   */
  async close() {
    await this._callMethodPromise('close');
    const snapshotProxy =
        await new Promise(resolve => this.callFactoryMethod(resolve, 'buildSnapshot', HeapSnapshotProxy));
    this.dispose();
    snapshotProxy.setProfileUid(this._profileUid);
    await snapshotProxy.updateStaticData();
    this._snapshotReceivedCallback(snapshotProxy);
  }
}

/**
 * @unrestricted
 */
export class HeapSnapshotProxy extends HeapSnapshotProxyObject {
  /**
   * @param {!HeapSnapshotWorkerProxy} worker
   * @param {number} objectId
   */
  constructor(worker, objectId) {
    super(worker, objectId);
    /** @type {?HeapSnapshotModel.HeapSnapshotModel.StaticData} */
    this._staticData = null;
  }

  /**
   * @param {!HeapSnapshotModel.HeapSnapshotModel.SearchConfig} searchConfig
   * @param {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter} filter
   * @return {!Promise<!Array<number>>}
   */
  search(searchConfig, filter) {
    return this._callMethodPromise('search', searchConfig, filter);
  }

  /**
   * @param {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter} filter
   * @return {!Promise<!Object<string, !HeapSnapshotModel.HeapSnapshotModel.Aggregate>>}
   */
  aggregatesWithFilter(filter) {
    return this._callMethodPromise('aggregatesWithFilter', filter);
  }

  /**
   * @return {!Promise<!Object.<string, !HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff>>}
   */
  aggregatesForDiff() {
    return this._callMethodPromise('aggregatesForDiff');
  }

  /**
   * @param {string} baseSnapshotId
   * @param {!Object<string, !HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff>} baseSnapshotAggregates
   * @return {!Promise<!Object<string, !HeapSnapshotModel.HeapSnapshotModel.Diff>>}
   */
  calculateSnapshotDiff(baseSnapshotId, baseSnapshotAggregates) {
    return this._callMethodPromise('calculateSnapshotDiff', baseSnapshotId, baseSnapshotAggregates);
  }

  /**
   * @param {number} snapshotObjectId
   * @return {!Promise<?string>}
   */
  nodeClassName(snapshotObjectId) {
    return this._callMethodPromise('nodeClassName', snapshotObjectId);
  }

  /**
   * @param {number} nodeIndex
   * @return {!HeapSnapshotProviderProxy}
   */
  createEdgesProvider(nodeIndex) {
    return this.callFactoryMethod(null, 'createEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
  }

  /**
   * @param {number} nodeIndex
   * @return {!HeapSnapshotProviderProxy}
   */
  createRetainingEdgesProvider(nodeIndex) {
    return this.callFactoryMethod(null, 'createRetainingEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
  }

  /**
   * @param {string} baseSnapshotId
   * @param {string} className
   * @return {?HeapSnapshotProviderProxy}
   */
  createAddedNodesProvider(baseSnapshotId, className) {
    return this.callFactoryMethod(
        null, 'createAddedNodesProvider', HeapSnapshotProviderProxy, baseSnapshotId, className);
  }

  /**
   * @param {!Array.<number>} nodeIndexes
   * @return {?HeapSnapshotProviderProxy}
   */
  createDeletedNodesProvider(nodeIndexes) {
    return this.callFactoryMethod(null, 'createDeletedNodesProvider', HeapSnapshotProviderProxy, nodeIndexes);
  }

  /**
   * @param {function(*):boolean} filter
   * @return {?HeapSnapshotProviderProxy}
   */
  createNodesProvider(filter) {
    return this.callFactoryMethod(null, 'createNodesProvider', HeapSnapshotProviderProxy, filter);
  }

  /**
   * @param {string} className
   * @param {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter} nodeFilter
   * @return {?HeapSnapshotProviderProxy}
   */
  createNodesProviderForClass(className, nodeFilter) {
    return this.callFactoryMethod(
        null, 'createNodesProviderForClass', HeapSnapshotProviderProxy, className, nodeFilter);
  }

  /**
   * @return {!Promise<!Array<!HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode>>}
   */
  allocationTracesTops() {
    return this._callMethodPromise('allocationTracesTops');
  }

  /**
   * @param {number} nodeId
   * @return {!Promise<!HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers>}
   */
  allocationNodeCallers(nodeId) {
    return this._callMethodPromise('allocationNodeCallers', nodeId);
  }

  /**
   * @param {number} nodeIndex
   * @return {!Promise<?Array<!HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame>>}
   */
  allocationStack(nodeIndex) {
    return this._callMethodPromise('allocationStack', nodeIndex);
  }

  /**
   * @override
   */
  dispose() {
    throw new Error('Should never be called');
  }

  get nodeCount() {
    return this._staticData.nodeCount;
  }

  get rootNodeIndex() {
    return this._staticData.rootNodeIndex;
  }

  /**
   * @return {!Promise}
   */
  async updateStaticData() {
    this._staticData = await this._callMethodPromise('updateStaticData');
  }

  /**
   * @return {!Promise<!HeapSnapshotModel.HeapSnapshotModel.Statistics>}
   */
  getStatistics() {
    return this._callMethodPromise('getStatistics');
  }

  /**
   * @param {number} nodeIndex
   * @return {!Promise<?HeapSnapshotModel.HeapSnapshotModel.Location>}
   */
  getLocation(nodeIndex) {
    return this._callMethodPromise('getLocation', nodeIndex);
  }

  /**
   * @return {!Promise.<?HeapSnapshotModel.HeapSnapshotModel.Samples>}
   */
  getSamples() {
    return this._callMethodPromise('getSamples');
  }

  get totalSize() {
    return this._staticData.totalSize;
  }

  get uid() {
    return this._profileUid;
  }

  setProfileUid(profileUid) {
    this._profileUid = profileUid;
  }

  /**
   * @return {number}
   */
  maxJSObjectId() {
    return this._staticData.maxJSObjectId;
  }
}

/**
 * @implements {ChildrenProvider}
 * @unrestricted
 */
export class HeapSnapshotProviderProxy extends HeapSnapshotProxyObject {
  /**
   * @param {!HeapSnapshotWorkerProxy} worker
   * @param {number} objectId
   */
  constructor(worker, objectId) {
    super(worker, objectId);
  }

  /**
   * @override
   * @param {number} snapshotObjectId
   * @return {!Promise<number>}
   */
  nodePosition(snapshotObjectId) {
    return this._callMethodPromise('nodePosition', snapshotObjectId);
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  isEmpty() {
    return this._callMethodPromise('isEmpty');
  }

  /**
   * @override
   * @param {number} startPosition
   * @param {number} endPosition
   * @return {!Promise<!HeapSnapshotModel.HeapSnapshotModel.ItemsRange>}
   */
  serializeItemsRange(startPosition, endPosition) {
    return this._callMethodPromise('serializeItemsRange', startPosition, endPosition);
  }

  /**
   * @override
   * @param {!HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig} comparator
   * @return {!Promise}
   */
  sortAndRewind(comparator) {
    return this._callMethodPromise('sortAndRewind', comparator);
  }
}
