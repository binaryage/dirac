// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars

import {TimelineJSProfileProcessor} from './TimelineJSProfile.js';
import {RecordType, TimelineData, TimelineModelImpl} from './TimelineModel.js';
import {TimelineModelFilter} from './TimelineModelFilter.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class Node {
  /**
   * @param {string|symbol} id
   * @param {?SDK.TracingModel.Event} event
   */
  constructor(id, event) {
    /** @type {number} */
    this.totalTime = 0;
    /** @type {number} */
    this.selfTime = 0;
    /** @type {string|symbol} */
    this.id = id;
    /** @type {?SDK.TracingModel.Event} */
    this.event = event;
    /** @type {?Node} */
    this.parent;

    /** @type {string} */
    this._groupId = '';
    this._isGroupNode = false;
  }

  /**
   * @return {boolean}
   */
  isGroupNode() {
    return this._isGroupNode;
  }

  /**
   * @return {boolean}
   */
  hasChildren() {
    throw 'Not implemented';
  }

  /**
   * @return {!ChildrenCache}
   */
  children() {
    throw 'Not implemented';
  }

  /**
   * @param {function(!SDK.TracingModel.Event):boolean} matchFunction
   * @param {!Array<!Node>=} results
   * @return {!Array<!Node>}
   */
  searchTree(matchFunction, results) {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    for (const child of this.children().values()) {
      child.searchTree(matchFunction, results);
    }
    return results;
  }
}

export class TopDownNode extends Node {
  /**
   * @param {string|symbol} id
   * @param {?SDK.TracingModel.Event} event
   * @param {?TopDownNode} parent
   */
  constructor(id, event, parent) {
    super(id, event);
    /** @type {?TopDownRootNode} */
    this._root = parent && parent._root;
    this._hasChildren = false;
    this._children = null;
    this.parent = parent;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return this._hasChildren;
  }

  /**
   * @override
   * @return {!ChildrenCache}
   */
  children() {
    return this._children || this._buildChildren();
  }

  /**
   * @return {!ChildrenCache}
   */
  _buildChildren() {
    /** @type {!Array<!TopDownNode>} */
    const path = [];
    for (let node = this; node.parent && !node._isGroupNode; node = node.parent) {
      path.push(/** @type {!TopDownNode} */ (node));
    }
    path.reverse();
    /** @type {!ChildrenCache} */
    const children = new Map();
    const self = this;
    const root = this._root;
    const startTime = root._startTime;
    const endTime = root._endTime;
    const instantEventCallback = root._doNotAggregate ? onInstantEvent : undefined;
    const eventIdCallback = root._doNotAggregate ? undefined : _eventId;
    const eventGroupIdCallback = root._eventGroupIdCallback;
    let depth = 0;
    let matchedDepth = 0;
    let currentDirectChild = null;
    TimelineModelImpl.forEachEvent(
        root._events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime, root._filter);

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      ++depth;
      if (depth > path.length + 2) {
        return;
      }
      if (!matchPath(e)) {
        return;
      }
      const duration = Math.min(endTime, e.endTime) - Math.max(startTime, e.startTime);
      if (duration < 0) {
        console.error('Negative event duration');
      }
      processEvent(e, duration);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onInstantEvent(e) {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, 0);
      }
      --depth;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     * @param {number} duration
     */
    function processEvent(e, duration) {
      if (depth === path.length + 2) {
        currentDirectChild._hasChildren = true;
        currentDirectChild.selfTime -= duration;
        return;
      }
      let id;
      let groupId = '';
      if (!eventIdCallback) {
        id = Symbol('uniqueId');
      } else {
        id = eventIdCallback(e);
        groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : '';
        if (groupId) {
          id += '/' + groupId;
        }
      }
      let node = children.get(id);
      if (!node) {
        node = new TopDownNode(id, e, self);
        node._groupId = groupId;
        children.set(id, node);
      }
      node.selfTime += duration;
      node.totalTime += duration;
      currentDirectChild = node;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     * @return {boolean}
     */
    function matchPath(e) {
      if (matchedDepth === path.length) {
        return true;
      }
      if (matchedDepth !== depth - 1) {
        return false;
      }
      if (!e.endTime) {
        return false;
      }
      if (!eventIdCallback) {
        if (e === path[matchedDepth].event) {
          ++matchedDepth;
        }
        return false;
      }
      let id = eventIdCallback(e);
      const groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : '';
      if (groupId) {
        id += '/' + groupId;
      }
      if (id === path[matchedDepth].id) {
        ++matchedDepth;
      }
      return false;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      --depth;
      if (matchedDepth > depth) {
        matchedDepth = depth;
      }
    }

    this._children = children;
    return children;
  }
}

export class TopDownRootNode extends TopDownNode {
  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {!Array<!TimelineModelFilter>} filters
   * @param {number} startTime
   * @param {number} endTime
   * @param {boolean=} doNotAggregate
   * @param {?function(!SDK.TracingModel.Event):string=} eventGroupIdCallback
   */
  constructor(events, filters, startTime, endTime, doNotAggregate, eventGroupIdCallback) {
    super('', null, null);
    this._root = this;
    this._events = events;
    this._filter = e => filters.every(f => f.accept(e));
    this._startTime = startTime;
    this._endTime = endTime;
    this._eventGroupIdCallback = eventGroupIdCallback;
    this._doNotAggregate = doNotAggregate;
    this.totalTime = endTime - startTime;
    this.selfTime = this.totalTime;
  }

  /**
   * @override
   * @return {!ChildrenCache}
   */
  children() {
    return this._children || this._grouppedTopNodes();
  }

  /**
   * @return {!ChildrenCache}
   */
  _grouppedTopNodes() {
    const flatNodes = super.children();
    for (const node of flatNodes.values()) {
      this.selfTime -= node.totalTime;
    }
    if (!this._eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map();
    for (const node of flatNodes.values()) {
      const groupId = this._eventGroupIdCallback(/** @type {!SDK.TracingModel.Event} */ (node.event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, /** @type {!SDK.TracingModel.Event} */ (node.event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node, node.selfTime, node.totalTime);
    }
    this._children = groupNodes;
    return groupNodes;
  }
}

export class BottomUpRootNode extends Node {
  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {!TimelineModelFilter} textFilter
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   * @param {number} startTime
   * @param {number} endTime
   * @param {?function(!SDK.TracingModel.Event):string} eventGroupIdCallback
   */
  constructor(events, textFilter, filters, startTime, endTime, eventGroupIdCallback) {
    super('', null);
    /** @type {?ChildrenCache} */
    this._children = null;
    this._events = events;
    this._textFilter = textFilter;
    this._filter = e => filters.every(f => f.accept(e));
    this._startTime = startTime;
    this._endTime = endTime;
    this._eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = endTime - startTime;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return true;
  }

  /**
   * @param {!ChildrenCache} children
   * @return {!ChildrenCache}
   */
  _filterChildren(children) {
    for (const [id, child] of children) {
      if (child.event && !this._textFilter.accept(child.event)) {
        children.delete(/** @type {string|symbol} */ (id));
      }
    }
    return children;
  }

  /**
   * @override
   * @return {!ChildrenCache}
   */
  children() {
    if (!this._children) {
      this._children = this._filterChildren(this._grouppedTopNodes());
    }
    return this._children;
  }

  /**
   * @return {!ChildrenCache}
   */
  _ungrouppedTopNodes() {
    const root = this;
    const startTime = this._startTime;
    const endTime = this._endTime;
    /** @type {!ChildrenCache} */
    const nodeById = new Map();
    /** @type {!Array<number>} */
    const selfTimeStack = [endTime - startTime];
    /** @type {!Array<boolean>} */
    const firstNodeStack = [];
    /** @type {!Map<string, number>} */
    const totalTimeById = new Map();
    TimelineModelImpl.forEachEvent(this._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._filter);

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      const duration = Math.min(e.endTime, endTime) - Math.max(e.startTime, startTime);
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = _eventId(e);
      const noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack) {
        totalTimeById.set(id, duration);
      }
      firstNodeStack.push(noNodeOnStack);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      const id = _eventId(e);
      let node = nodeById.get(id);
      if (!node) {
        node = new BottomUpNode(root, id, e, false, root);
        nodeById.set(id, node);
      }
      node.selfTime += selfTimeStack.pop();
      if (firstNodeStack.pop()) {
        node.totalTime += totalTimeById.get(id);
        totalTimeById.delete(id);
      }
      if (firstNodeStack.length) {
        node.setHasChildren();
      }
    }

    this.selfTime = selfTimeStack.pop();
    for (const pair of nodeById) {
      if (pair[1].selfTime <= 0) {
        nodeById.delete(/** @type {string} */ (pair[0]));
      }
    }
    return nodeById;
  }

  /**
   * @return {!ChildrenCache}
   */
  _grouppedTopNodes() {
    const flatNodes = this._ungrouppedTopNodes();
    if (!this._eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map();
    for (const node of flatNodes.values()) {
      const groupId = this._eventGroupIdCallback(/** @type {!SDK.TracingModel.Event} */ (node.event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, /** @type {!SDK.TracingModel.Event} */ (node.event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node, node.selfTime, node.selfTime);
    }
    return groupNodes;
  }
}

export class GroupNode extends Node {
  /**
   * @param {string} id
   * @param {!BottomUpRootNode|!TopDownRootNode} parent
   * @param {!SDK.TracingModel.Event} event
   */
  constructor(id, parent, event) {
    super(id, event);
    this._children = new Map();
    this.parent = parent;
    this._isGroupNode = true;
  }

  /**
   * @param {!BottomUpNode} child
   * @param {number} selfTime
   * @param {number} totalTime
   */
  addChild(child, selfTime, totalTime) {
    this._children.set(child.id, child);
    this.selfTime += selfTime;
    this.totalTime += totalTime;
    child.parent = this;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return true;
  }

  /**
   * @override
   * @return {!ChildrenCache}
   */
  children() {
    return this._children;
  }
}

export class BottomUpNode extends Node {
  /**
   * @param {!BottomUpRootNode} root
   * @param {string} id
   * @param {!SDK.TracingModel.Event} event
   * @param {boolean} hasChildren
   * @param {!Node} parent
   */
  constructor(root, id, event, hasChildren, parent) {
    super(id, event);
    this.parent = parent;
    this._root = root;
    this._depth = (parent._depth || 0) + 1;
    /** @type {?ChildrenCache} */
    this._cachedChildren = null;
    this._hasChildren = hasChildren;
  }

  setHasChildren() {
    this._hasChildren = true;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return this._hasChildren;
  }

  /**
   * @override
   * @return {!ChildrenCache}
   */
  children() {
    if (this._cachedChildren) {
      return this._cachedChildren;
    }
    /** @type {!Array<number>} */
    const selfTimeStack = [0];
    /** @type {!Array<string>} */
    const eventIdStack = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    const eventStack = [];
    /** @type {!ChildrenCache} */
    const nodeById = new Map();
    const startTime = this._root._startTime;
    const endTime = this._root._endTime;
    let lastTimeMarker = startTime;
    const self = this;
    TimelineModelImpl.forEachEvent(
        this._root._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._root._filter);

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      const duration = Math.min(e.endTime, endTime) - Math.max(e.startTime, startTime);
      if (duration < 0) {
        console.assert(false, 'Negative duration of an event');
      }
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = _eventId(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      const selfTime = selfTimeStack.pop();
      const id = eventIdStack.pop();
      eventStack.pop();
      let node;
      for (node = self; node._depth > 1; node = node.parent) {
        if (node.id !== eventIdStack[eventIdStack.length + 1 - node._depth]) {
          return;
        }
      }
      if (node.id !== id || eventIdStack.length < self._depth) {
        return;
      }
      const childId = eventIdStack[eventIdStack.length - self._depth];
      node = nodeById.get(childId);
      if (!node) {
        const event = eventStack[eventStack.length - self._depth];
        const hasChildren = eventStack.length > self._depth;
        node = new BottomUpNode(self._root, childId, event, hasChildren, self);
        nodeById.set(childId, node);
      }
      const totalTime = Math.min(e.endTime, endTime) - Math.max(e.startTime, lastTimeMarker);
      node.selfTime += selfTime;
      node.totalTime += totalTime;
      lastTimeMarker = Math.min(e.endTime, endTime);
    }

    this._cachedChildren = this._root._filterChildren(nodeById);
    return this._cachedChildren;
  }

  /**
   * @override
   * @param {function(!SDK.TracingModel.Event):boolean} matchFunction
   * @param {!Array<!Node>=} results
   * @return {!Array<!Node>}
   */
  searchTree(matchFunction, results) {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    return results;
  }
}

/**
 * @param {!SDK.TracingModel.Event} event
 * @return {?string}
 */
export function eventURL(event) {
  const data = event.args['data'] || event.args['beginData'];
  if (data && data['url']) {
    return data['url'];
  }
  let frame = eventStackFrame(event);
  while (frame) {
    const url = frame['url'];
    if (url) {
      return url;
    }
    frame = frame.parent;
  }
  return null;
}

/**
 * @param {!SDK.TracingModel.Event} event
 * @return {?Protocol.Runtime.CallFrame}
 */
export function eventStackFrame(event) {
  if (event.name === RecordType.JSFrame) {
    return /** @type {?Protocol.Runtime.CallFrame} */ (event.args['data'] || null);
  }
  return TimelineData.forEvent(event).topFrame();
}

/**
 * @param {!SDK.TracingModel.Event} event
 * @return {string}
 */
export function _eventId(event) {
  if (event.name === RecordType.TimeStamp) {
    return `${event.name}:${event.args.data.message}`;
  }
  if (event.name !== RecordType.JSFrame) {
    return event.name;
  }
  const frame = event.args['data'];
  const location = frame['scriptId'] || frame['url'] || '';
  const functionName = frame['functionName'];
  const name = TimelineJSProfileProcessor.isNativeRuntimeFrame(frame) ?
      TimelineJSProfileProcessor.nativeGroup(functionName) || functionName :
      `${functionName}:${frame['lineNumber']}:${frame['columnNumber']}`;
  return `f:${name}@${location}`;
}

/**
 * @typedef {Map<string|symbol, !Node>}
 */
export let ChildrenCache;
