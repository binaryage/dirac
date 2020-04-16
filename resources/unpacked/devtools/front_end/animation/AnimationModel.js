// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/**
 * @unrestricted
 */
export class AnimationModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._runtimeModel = /** @type {!SDK.RuntimeModel.RuntimeModel} */ (target.model(SDK.RuntimeModel.RuntimeModel));
    this._agent = target.animationAgent();
    target.registerAnimationDispatcher(new AnimationDispatcher(this));
    /** @type {!Map.<string, !AnimationImpl>} */
    this._animationsById = new Map();
    /** @type {!Map.<string, !AnimationGroup>} */
    this._animationGroups = new Map();
    /** @type {!Set.<string>} */
    this._pendingAnimations = new Set();
    this._playbackRate = 1;
    const resourceTreeModel =
        /** @type {!SDK.ResourceTreeModel.ResourceTreeModel} */ (target.model(SDK.ResourceTreeModel.ResourceTreeModel));
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated, this._reset, this);
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    if (screenCaptureModel) {
      this._screenshotCapture = new ScreenshotCapture(this, screenCaptureModel);
    }
  }

  _reset() {
    this._animationsById.clear();
    this._animationGroups.clear();
    this._pendingAnimations.clear();
    this.dispatchEventToListeners(Events.ModelReset);
  }

  /**
   * @param {string} id
   */
  animationCreated(id) {
    this._pendingAnimations.add(id);
  }

  /**
   * @param {string} id
   */
  _animationCanceled(id) {
    this._pendingAnimations.delete(id);
    this._flushPendingAnimationsIfNeeded();
  }

  /**
   * @param {!Protocol.Animation.Animation} payload
   */
  animationStarted(payload) {
    // We are not interested in animations without effect or target.
    if (!payload.source || !payload.source.backendNodeId) {
      return;
    }

    const animation = AnimationImpl.parsePayload(this, payload);

    // Ignore Web Animations custom effects & groups.
    if (animation.type() === 'WebAnimation' && animation.source().keyframesRule().keyframes().length === 0) {
      this._pendingAnimations.delete(animation.id());
    } else {
      this._animationsById.set(animation.id(), animation);
      this._pendingAnimations.add(animation.id());
    }

    this._flushPendingAnimationsIfNeeded();
  }

  _flushPendingAnimationsIfNeeded() {
    for (const id of this._pendingAnimations) {
      if (!this._animationsById.get(id)) {
        return;
      }
    }

    while (this._pendingAnimations.size) {
      this._matchExistingGroups(this._createGroupFromPendingAnimations());
    }
  }

  /**
   * @param {!AnimationGroup} incomingGroup
   * @return {boolean}
   */
  _matchExistingGroups(incomingGroup) {
    let matchedGroup = null;
    for (const group of this._animationGroups.values()) {
      if (group._matches(incomingGroup)) {
        matchedGroup = group;
        group._update(incomingGroup);
        break;
      }
    }

    if (!matchedGroup) {
      this._animationGroups.set(incomingGroup.id(), incomingGroup);
      if (this._screenshotCapture) {
        this._screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(), incomingGroup._screenshots);
      }
    }
    this.dispatchEventToListeners(Events.AnimationGroupStarted, matchedGroup || incomingGroup);
    return !!matchedGroup;
  }

  /**
   * @return {!AnimationGroup}
   */
  _createGroupFromPendingAnimations() {
    console.assert(this._pendingAnimations.size);
    const firstAnimationId = this._pendingAnimations.values().next().value;
    this._pendingAnimations.delete(firstAnimationId);

    const firstAnimation = this._animationsById.get(firstAnimationId);
    const groupedAnimations = [firstAnimation];
    const groupStartTime = firstAnimation.startTime();
    const remainingAnimations = new Set();
    for (const id of this._pendingAnimations) {
      const anim = this._animationsById.get(id);
      if (anim.startTime() === groupStartTime) {
        groupedAnimations.push(anim);
      } else {
        remainingAnimations.add(id);
      }
    }
    this._pendingAnimations = remainingAnimations;
    return new AnimationGroup(this, firstAnimationId, groupedAnimations);
  }

  /**
   * @param {number} playbackRate
   */
  setPlaybackRate(playbackRate) {
    this._playbackRate = playbackRate;
    this._agent.setPlaybackRate(playbackRate);
  }

  /**
   * @param {!Array.<string>} animations
   */
  _releaseAnimations(animations) {
    this._agent.releaseAnimations(animations);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    this._reset();
    return this._agent.disable();
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    if (!this._enabled) {
      return Promise.resolve();
    }
    return this._agent.enable();
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }
    this._agent.enable();
    this._enabled = true;
  }
}

/** @enum {symbol} */
export const Events = {
  AnimationGroupStarted: Symbol('AnimationGroupStarted'),
  ModelReset: Symbol('ModelReset')
};

/**
 * @unrestricted
 */
export class AnimationImpl {
  /**
   * @param {!AnimationModel} animationModel
   * @param {!Protocol.Animation.Animation} payload
   */
  constructor(animationModel, payload) {
    this._animationModel = animationModel;
    this._payload = payload;
    this._source =
        new AnimationEffect(animationModel, /** @type {!Protocol.Animation.AnimationEffect} */ (this._payload.source));
  }

  /**
   * @param {!AnimationModel} animationModel
   * @param {!Protocol.Animation.Animation} payload
   * @return {!AnimationImpl}
   */
  static parsePayload(animationModel, payload) {
    return new AnimationImpl(animationModel, payload);
  }

  /**
   * @return {!Protocol.Animation.Animation}
   */
  payload() {
    return this._payload;
  }

  /**
   * @return {string}
   */
  id() {
    return this._payload.id;
  }

  /**
   * @return {string}
   */
  name() {
    return this._payload.name;
  }

  /**
   * @return {boolean}
   */
  paused() {
    return this._payload.pausedState;
  }

  /**
   * @return {string}
   */
  playState() {
    return this._playState || this._payload.playState;
  }

  /**
   * @param {string} playState
   */
  setPlayState(playState) {
    this._playState = playState;
  }

  /**
   * @return {number}
   */
  playbackRate() {
    return this._payload.playbackRate;
  }

  /**
   * @return {number}
   */
  startTime() {
    return this._payload.startTime;
  }

  /**
   * @return {number}
   */
  endTime() {
    if (!this.source().iterations) {
      return Infinity;
    }
    return this.startTime() + this.source().delay() + this.source().duration() * this.source().iterations() +
        this.source().endDelay();
  }

  /**
   * @return {number}
   */
  _finiteDuration() {
    const iterations = Math.min(this.source().iterations(), 3);
    return this.source().delay() + this.source().duration() * iterations;
  }

  /**
   * @return {number}
   */
  currentTime() {
    return this._payload.currentTime;
  }

  /**
   * @return {!AnimationEffect}
   */
  source() {
    return this._source;
  }

  /**
   * @return {!Type}
   */
  type() {
    return (
        /** @type {!Type} */ (this._payload.type));
  }

  /**
   * @param {!AnimationImpl} animation
   * @return {boolean}
   */
  overlaps(animation) {
    // Infinite animations
    if (!this.source().iterations() || !animation.source().iterations()) {
      return true;
    }

    const firstAnimation = this.startTime() < animation.startTime() ? this : animation;
    const secondAnimation = firstAnimation === this ? animation : this;
    return firstAnimation.endTime() >= secondAnimation.startTime();
  }

  /**
   * @param {number} duration
   * @param {number} delay
   */
  setTiming(duration, delay) {
    this._source.node().then(this._updateNodeStyle.bind(this, duration, delay));
    this._source._duration = duration;
    this._source._delay = delay;
    this._animationModel._agent.setTiming(this.id(), duration, delay);
  }

  /**
   * @param {number} duration
   * @param {number} delay
   * @param {!SDK.DOMModel.DOMNode} node
   */
  _updateNodeStyle(duration, delay, node) {
    let animationPrefix;
    if (this.type() === Type.CSSTransition) {
      animationPrefix = 'transition-';
    } else if (this.type() === Type.CSSAnimation) {
      animationPrefix = 'animation-';
    } else {
      return;
    }

    const cssModel = node.domModel().cssModel();
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'duration', duration + 'ms');
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'delay', delay + 'ms');
  }

  /**
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  remoteObjectPromise() {
    return this._animationModel._agent.resolveAnimation(this.id()).then(
        payload => payload && this._animationModel._runtimeModel.createRemoteObject(payload));
  }

  /**
   * @return {string}
   */
  _cssId() {
    return this._payload.cssId || '';
  }
}

/** @enum {string} */
export const Type = {
  CSSTransition: 'CSSTransition',
  CSSAnimation: 'CSSAnimation',
  WebAnimation: 'WebAnimation'
};

/**
 * @unrestricted
 */
export class AnimationEffect {
  /**
   * @param {!AnimationModel} animationModel
   * @param {!Protocol.Animation.AnimationEffect} payload
   */
  constructor(animationModel, payload) {
    this._animationModel = animationModel;
    this._payload = payload;
    if (payload.keyframesRule) {
      this._keyframesRule = new KeyframesRule(payload.keyframesRule);
    }
    this._delay = this._payload.delay;
    this._duration = this._payload.duration;
  }

  /**
   * @return {number}
   */
  delay() {
    return this._delay;
  }

  /**
   * @return {number}
   */
  endDelay() {
    return this._payload.endDelay;
  }

  /**
   * @return {number}
   */
  iterationStart() {
    return this._payload.iterationStart;
  }

  /**
   * @return {number}
   */
  iterations() {
    // Animations with zero duration, zero delays and infinite iterations can't be shown.
    if (!this.delay() && !this.endDelay() && !this.duration()) {
      return 0;
    }
    return this._payload.iterations || Infinity;
  }

  /**
   * @return {number}
   */
  duration() {
    return this._duration;
  }

  /**
   * @return {string}
   */
  direction() {
    return this._payload.direction;
  }

  /**
   * @return {string}
   */
  fill() {
    return this._payload.fill;
  }

  /**
   * @return {!Promise.<!SDK.DOMModel.DOMNode>}
   */
  node() {
    if (!this._deferredNode) {
      this._deferredNode = new SDK.DOMModel.DeferredDOMNode(this._animationModel.target(), this.backendNodeId());
    }
    return this._deferredNode.resolvePromise();
  }

  /**
   * @return {!SDK.DOMModel.DeferredDOMNode}
   */
  deferredNode() {
    return new SDK.DOMModel.DeferredDOMNode(this._animationModel.target(), this.backendNodeId());
  }

  /**
   * @return {number}
   */
  backendNodeId() {
    return /** @type {number} */ (this._payload.backendNodeId);
  }

  /**
   * @return {?KeyframesRule}
   */
  keyframesRule() {
    return this._keyframesRule;
  }

  /**
   * @return {string}
   */
  easing() {
    return this._payload.easing;
  }
}

/**
 * @unrestricted
 */
export class KeyframesRule {
  /**
   * @param {!Protocol.Animation.KeyframesRule} payload
   */
  constructor(payload) {
    this._payload = payload;
    this._keyframes = this._payload.keyframes.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  /**
   * @param {!Array.<!Protocol.Animation.KeyframeStyle>} payload
   */
  _setKeyframesPayload(payload) {
    this._keyframes = payload.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  /**
   * @return {string|undefined}
   */
  name() {
    return this._payload.name;
  }

  /**
   * @return {!Array.<!KeyframeStyle>}
   */
  keyframes() {
    return this._keyframes;
  }
}

/**
 * @unrestricted
 */
export class KeyframeStyle {
  /**
   * @param {!Protocol.Animation.KeyframeStyle} payload
   */
  constructor(payload) {
    this._payload = payload;
    this._offset = this._payload.offset;
  }

  /**
   * @return {string}
   */
  offset() {
    return this._offset;
  }

  /**
   * @param {number} offset
   */
  setOffset(offset) {
    this._offset = offset * 100 + '%';
  }

  /**
   * @return {number}
   */
  offsetAsNumber() {
    return parseFloat(this._offset) / 100;
  }

  /**
   * @return {string}
   */
  easing() {
    return this._payload.easing;
  }
}

/**
 * @unrestricted
 */
export class AnimationGroup {
  /**
   * @param {!AnimationModel} animationModel
   * @param {string} id
   * @param {!Array.<!AnimationImpl>} animations
   */
  constructor(animationModel, id, animations) {
    this._animationModel = animationModel;
    this._id = id;
    this._animations = animations;
    this._paused = false;
    this._screenshots = [];
    this._screenshotImages = [];
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {!Array.<!AnimationImpl>}
   */
  animations() {
    return this._animations;
  }

  release() {
    this._animationModel._animationGroups.delete(this.id());
    this._animationModel._releaseAnimations(this._animationIds());
  }

  /**
   * @return {!Array.<string>}
   */
  _animationIds() {
    /**
     * @param {!AnimationImpl} animation
     * @return {string}
     */
    function extractId(animation) {
      return animation.id();
    }

    return this._animations.map(extractId);
  }

  /**
   * @return {number}
   */
  startTime() {
    return this._animations[0].startTime();
  }

  /**
   * @return {number}
   */
  finiteDuration() {
    let maxDuration = 0;
    for (let i = 0; i < this._animations.length; ++i) {
      maxDuration = Math.max(maxDuration, this._animations[i]._finiteDuration());
    }
    return maxDuration;
  }

  /**
   * @param {number} currentTime
   */
  seekTo(currentTime) {
    this._animationModel._agent.seekAnimations(this._animationIds(), currentTime);
  }

  /**
   * @return {boolean}
   */
  paused() {
    return this._paused;
  }

  /**
   * @param {boolean} paused
   */
  togglePause(paused) {
    if (paused === this._paused) {
      return;
    }
    this._paused = paused;
    this._animationModel._agent.setPaused(this._animationIds(), paused);
  }

  /**
   * @return {!Promise<number>}
   */
  currentTimePromise() {
    let longestAnim = null;
    for (const anim of this._animations) {
      if (!longestAnim || anim.endTime() > longestAnim.endTime()) {
        longestAnim = anim;
      }
    }
    return this._animationModel._agent.getCurrentTime(longestAnim.id()).then(currentTime => currentTime || 0);
  }

  /**
   * @param {!AnimationGroup} group
   * @return {boolean}
   */
  _matches(group) {
    /**
     * @param {!AnimationImpl} anim
     * @return {string}
     */
    function extractId(anim) {
      if (anim.type() === Type.WebAnimation) {
        return anim.type() + anim.id();
      }
      return anim._cssId();
    }

    if (this._animations.length !== group._animations.length) {
      return false;
    }
    const left = this._animations.map(extractId).sort();
    const right = group._animations.map(extractId).sort();
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * @param {!AnimationGroup} group
   */
  _update(group) {
    this._animationModel._releaseAnimations(this._animationIds());
    this._animations = group._animations;
  }

  /**
   * @return {!Array.<!Image>}
   */
  screenshots() {
    for (let i = 0; i < this._screenshots.length; ++i) {
      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + this._screenshots[i];
      this._screenshotImages.push(image);
    }
    this._screenshots = [];
    return this._screenshotImages;
  }
}

/**
 * @implements {Protocol.AnimationDispatcher}
 * @unrestricted
 */
export class AnimationDispatcher {
  constructor(animationModel) {
    this._animationModel = animationModel;
  }

  /**
   * @override
   * @param {string} id
   */
  animationCreated(id) {
    this._animationModel.animationCreated(id);
  }

  /**
   * @override
   * @param {string} id
   */
  animationCanceled(id) {
    this._animationModel._animationCanceled(id);
  }

  /**
   * @override
   * @param {!Protocol.Animation.Animation} payload
   */
  animationStarted(payload) {
    this._animationModel.animationStarted(payload);
  }
}

/**
 * @unrestricted
 */
export class ScreenshotCapture {
  /**
   * @param {!AnimationModel} animationModel
   * @param {!SDK.ScreenCaptureModel.ScreenCaptureModel} screenCaptureModel
   */
  constructor(animationModel, screenCaptureModel) {
    /** @type {!Array<!Request>} */
    this._requests = [];
    this._screenCaptureModel = screenCaptureModel;
    this._animationModel = animationModel;
    this._animationModel.addEventListener(Events.ModelReset, this._stopScreencast, this);
  }

  /**
   * @param {number} duration
   * @param {!Array<string>} screenshots
   */
  captureScreenshots(duration, screenshots) {
    const screencastDuration = Math.min(duration / this._animationModel._playbackRate, 3000);
    const endTime = screencastDuration + window.performance.now();
    this._requests.push({endTime: endTime, screenshots: screenshots});

    if (!this._endTime || endTime > this._endTime) {
      clearTimeout(this._stopTimer);
      this._stopTimer = setTimeout(this._stopScreencast.bind(this), screencastDuration);
      this._endTime = endTime;
    }

    if (this._capturing) {
      return;
    }
    this._capturing = true;
    this._screenCaptureModel.startScreencast(
        'jpeg', 80, undefined, 300, 2, this._screencastFrame.bind(this), visible => {});
  }

  /**
   * @param {string} base64Data
   * @param {!Protocol.Page.ScreencastFrameMetadata} metadata
   */
  _screencastFrame(base64Data, metadata) {
    /**
     * @param {!Request} request
     * @return {boolean}
     */
    function isAnimating(request) {
      return request.endTime >= now;
    }

    if (!this._capturing) {
      return;
    }

    const now = window.performance.now();
    this._requests = this._requests.filter(isAnimating);
    for (const request of this._requests) {
      request.screenshots.push(base64Data);
    }
  }

  _stopScreencast() {
    if (!this._capturing) {
      return;
    }

    delete this._stopTimer;
    delete this._endTime;
    this._requests = [];
    this._capturing = false;
    this._screenCaptureModel.stopScreencast();
  }
}

SDK.SDKModel.SDKModel.register(AnimationModel, SDK.SDKModel.Capability.DOM, false);

/** @typedef {{ endTime: number, screenshots: !Array.<string>}} */
export let Request;
