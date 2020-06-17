// @ts-nocheck
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
      factory((global.Keysim = {}));
})(self, function (exports) {
  'use strict';

  const _createClass = (function () {
    function defineProperties(target, props) {
      for (let i = 0; i < props.length; i++) {
        const descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) {
          descriptor.writable = true;
        }
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) {
        defineProperties(Constructor.prototype, protoProps);
      }
      if (staticProps) {
        defineProperties(Constructor, staticProps);
      }
      return Constructor;
    };
  })();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  /**
   * @param {string} s
   * @return {function(string):string}
   */
  const appender = function (s) {
    return function (value) {
      return value + s;
    };
  };

  /**
   * @param {number} n
   * @return {function(string):string}
   */
  const deleter = function (n) {
    return function (value) {
      const end = value.length - n;
      return (end > 0) ? value.substring(0, end) : '';
    };
  };

  let taskQueueRunning = false;
  const taskQueue = [];

  function processTask(task) {
    try {
      task.job();
    } catch (e) {
      console.error('keysim task has failed:', e, '\n', task);
    }
    wakeTaskQueue();
  }

  function wakeTaskQueue() {
    const task = taskQueue.shift();
    if (task) {
      taskQueueRunning = true;
      setTimeout(function () {
        processTask(task);
      }, task.delay);
    } else {
      taskQueueRunning = false;
    }
  }

  function scheduleTask(delay, job) {
    taskQueue.push({delay, job, stack: new Error('scheduled at')});
    if (!taskQueueRunning) {
      wakeTaskQueue();
    }
  }

  /* jshint esnext:true, undef:true, unused:true */

  // taken from devtools.js
  // noinspection DuplicatedCode
  const staticKeyIdentifiers = new Map([
    [0x12, 'Alt'],
    [0x11, 'Control'],
    [0x10, 'Shift'],
    [0x14, 'CapsLock'],
    [0x5b, 'Win'],
    [0x5c, 'Win'],
    [0x0c, 'Clear'],
    [0x28, 'Down'],
    [0x23, 'End'],
    [0x0a, 'Enter'],
    [0x0d, 'Enter'],
    [0x2b, 'Execute'],
    [0x70, 'F1'],
    [0x71, 'F2'],
    [0x72, 'F3'],
    [0x73, 'F4'],
    [0x74, 'F5'],
    [0x75, 'F6'],
    [0x76, 'F7'],
    [0x77, 'F8'],
    [0x78, 'F9'],
    [0x79, 'F10'],
    [0x7a, 'F11'],
    [0x7b, 'F12'],
    [0x7c, 'F13'],
    [0x7d, 'F14'],
    [0x7e, 'F15'],
    [0x7f, 'F16'],
    [0x80, 'F17'],
    [0x81, 'F18'],
    [0x82, 'F19'],
    [0x83, 'F20'],
    [0x84, 'F21'],
    [0x85, 'F22'],
    [0x86, 'F23'],
    [0x87, 'F24'],
    [0x2f, 'Help'],
    [0x24, 'Home'],
    [0x2d, 'Insert'],
    [0x25, 'Left'],
    [0x22, 'PageDown'],
    [0x21, 'PageUp'],
    [0x13, 'Pause'],
    [0x2c, 'PrintScreen'],
    [0x27, 'Right'],
    [0x91, 'Scroll'],
    [0x29, 'Select'],
    [0x26, 'Up'],
    [0x2e, 'U+007F'], // Standard says that DEL becomes U+007F.
    [0xb0, 'MediaNextTrack'],
    [0xb1, 'MediaPreviousTrack'],
    [0xb2, 'MediaStop'],
    [0xb3, 'MediaPlayPause'],
    [0xad, 'VolumeMute'],
    [0xae, 'VolumeDown'],
    [0xaf, 'VolumeUp'],
  ]);

  function keyCodeToKeyIdentifier(keyCode) {
    let result = staticKeyIdentifiers.get(keyCode);
    if (result !== undefined) {
      return result;
    }
    result = 'U+';
    const hexString = Number(keyCode).toString(16).toUpperCase();
    for (let i = hexString.length; i < 4; ++i) {
      result += '0';
    }
    result += hexString;
    return result;
  }

  const keyCodeToKeyMap = {
    9: 'Tab', // tab
    16: 'Shift',
    27: 'Escape', // esc
    32: ' ', // space
    38: 'ArrowUp',
    40: 'ArrowDown',
    37: 'ArrowLeft',
    39: 'ArrowRight',
    13: 'Enter',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    46: 'U+007F',
    36: 'Home',
    35: 'End',
    33: 'PageUp',
    34: 'PageDown',
    45: 'Insert'
  };

  function keyCodeToKey(keyCode) {
    return keyCodeToKeyMap[keyCode] || String.fromCharCode(keyCode);
  }


  const CTRL = 1 << 0;
  const META = 1 << 1;
  const ALT = 1 << 2;
  const SHIFT = 1 << 3;

  // Key Events
  const KeyEvents = {
    DOWN: 1 << 0,
    PRESS: 1 << 1,
    UP: 1 << 2,
    INPUT: 1 << 3
  };
  KeyEvents.ALL = KeyEvents.DOWN | KeyEvents.PRESS | KeyEvents.UP | KeyEvents.INPUT;

  /**
   * Represents a keystroke, or a single key code with a set of active modifiers.
   * @constructor
   * @param {number} modifiers A bitmask formed by CTRL, META, ALT, and SHIFT.
   * @param {number} keyCode
   * @param {?function(string):string} mutation
   */
  const Keystroke = (function () {
    /** @this {Keystroke} */
    function Keystroke(modifiers, keyCode, mutation = null) {
      _classCallCheck(this, Keystroke);

      this.modifiers = modifiers;
      this.ctrlKey = !!(modifiers & CTRL);
      this.metaKey = !!(modifiers & META);
      this.altKey = !!(modifiers & ALT);
      this.shiftKey = !!(modifiers & SHIFT);
      this.keyCode = keyCode;
      this.mutation = mutation;
    }

    /**
     * Simulates a keyboard with a particular key-to-character and key-to-action
     * mapping. Use `US_ENGLISH` to get a pre-configured keyboard.
     */

    /**
     * Gets the bitmask value for the "control" modifier.
     */
    _createClass(Keystroke, null, [{
      key: 'CTRL',
      value: CTRL,
      enumerable: true
    }, {
      key: 'META',
      value: META,
      enumerable: true
    }, {
      key: 'ALT',
      value: ALT,
      enumerable: true
    }, {
      key: 'SHIFT',
      value: SHIFT,
      enumerable: true
    }]);

    return Keystroke;
  })();

  const Keyboard = (function () {
    /**
     * @constructor
     * @param {!Object.<number, !Keystroke>} charCodeKeyCodeMap
     * @param {!Object.<string, number>} actionMap
     */
    function Keyboard(charCodeKeyCodeMap, actionMap) {
      _classCallCheck(this, Keyboard);

      this._charCodeKeyCodeMap = charCodeKeyCodeMap;
      this._actionMap = actionMap;
    }

    /**
     * Determines the character code generated by pressing the given keystroke.
     *
     * @param {!Keystroke} keystroke
     * @return {?number}
     * @this {Keyboard}
     */
    Keyboard.prototype.charCodeForKeystroke = function charCodeForKeystroke(keystroke) {
      const map = this._charCodeKeyCodeMap;
      for (const charCode in map) {
        if (Object.prototype.hasOwnProperty.call(map, charCode)) {
          const keystrokeForCharCode = map[charCode];
          if (keystroke.keyCode === keystrokeForCharCode.keyCode && keystroke.modifiers === keystrokeForCharCode.modifiers) {
            return parseInt(charCode, 10);
          }
        }
      }
      return null;
    };

    /**
     * Creates an event ready for dispatching onto the given target.
     *
     * @param {string} type One of "keydown", "keypress", "keyup", or "input".
     * @param {!Keystroke} keystroke
     * @param {!HTMLElement} target
     * @return {!Event}
     * @this {Keyboard}
     */
    Keyboard.prototype.createEventFromKeystroke = function createEventFromKeystroke(type, keystroke, target) {
      let doc = target.ownerDocument || document;
      if (target instanceof Document) {
        doc = target;
      }

      const window = doc.defaultView;
      const Event = window.Event;

      let event;

      try {
        event = new Event(type);
      } catch (e) {
        event = doc.createEvent('UIEvents');
      }

      event.initEvent(type, true, true);

      switch (type) {
        case 'input':
          event.data = String.fromCharCode(this.charCodeForKeystroke(keystroke));
          break;

        case 'keydown':
        case 'keypress':
        case 'keyup':
          event.shiftKey = keystroke.shiftKey;
          event.altKey = keystroke.altKey;
          event.metaKey = keystroke.metaKey;
          event.ctrlKey = keystroke.ctrlKey;
          event.keyCode = type === 'keypress' ? this.charCodeForKeystroke(keystroke) : keystroke.keyCode;
          event.charCode = type === 'keypress' ? event.keyCode : 0;
          event.which = event.keyCode;
          event.keyIdentifier = keyCodeToKeyIdentifier(keystroke.keyCode);
          event.key = keyCodeToKey(event.keyCode);
          break;
      }

      return event;
    };

    /**
     * Fires the correct sequence of events on the given target as if the given
     * action was undertaken by a human.
     *
     * @param {string} action e.g. "alt+shift+left" or "backspace"
     * @param {!HTMLElement} target
     * @param {?function()} callback
     * @this {Keyboard}
     */
    Keyboard.prototype.dispatchEventsForAction = function (action, target, callback) {
      const keystroke = this.keystrokeForAction(action);
      scheduleTask(50, () => this.dispatchEventsForKeystroke(keystroke, target));
      if (callback) {
        scheduleTask(100, callback);
      }
    };

    /**
     * Fires the correct sequence of events on the given target as if the given
     * input had been typed by a human.
     *
     * @param {string} input
     * @param {!HTMLElement} target
     * @param {?function(string):string} callback
     * @this {Keyboard}
     */
    Keyboard.prototype.dispatchEventsForInput = function (input, target, callback) {
      let currentModifierState = 0;
      for (let i = 0, _length = input.length; i < _length; i++) {
        const keystroke = this.keystrokeForCharCode(input.charCodeAt(i));
        scheduleTask(30, ((currentModifierState, keystrokeModifiers) =>
          this.dispatchModifierStateTransition(target, currentModifierState, keystrokeModifiers))
          .bind(this, currentModifierState, keystroke.modifiers));
        scheduleTask(20, ((keystroke, char) =>
          this.dispatchEventsForKeystroke(keystroke, target, false, KeyEvents.ALL, appender(char)))
          .bind(this, keystroke, input[i]));
        currentModifierState = keystroke.modifiers;
      }
      scheduleTask(20, () => this.dispatchModifierStateTransition(target, currentModifierState, 0));
      if (callback) {
        scheduleTask(100, callback);
      }
    };

    /**
     * Fires the correct sequence of events on the given target as if the given
     * keystroke was performed by a human. When simulating, for example, typing
     * the letter "A" (assuming a U.S. English keyboard) then the sequence will
     * look like this:
     *
     *   keydown   keyCode=16 (SHIFT) charCode=0      shiftKey=true
     *   keydown   keyCode=65 (A)     charCode=0      shiftKey=true
     *   keypress  keyCode=65 (A)     charCode=65 (A) shiftKey=true
     *   input data=A
     *   keyup     keyCode=65 (A)     charCode=0      shiftKey=true
     *   keyup     keyCode=16 (SHIFT) charCode=0      shiftKey=false
     *
     * If the keystroke would not cause a character to be input, such as when
     * pressing alt+shift+left, the sequence looks like this:
     *
     *   keydown   keyCode=16 (SHIFT) charCode=0 altKey=false shiftKey=true
     *   keydown   keyCode=18 (ALT)   charCode=0 altKey=true  shiftKey=true
     *   keydown   keyCode=37 (LEFT)  charCode=0 altKey=true  shiftKey=true
     *   keyup     keyCode=37 (LEFT)  charCode=0 altKey=true  shiftKey=true
     *   keyup     keyCode=18 (ALT)   charCode=0 altKey=false shiftKey=true
     *   keyup     keyCode=16 (SHIFT) charCode=0 altKey=false shiftKey=false
     *
     * To disable handling of modifier keys, call with `transitionModifiers` set
     * to false. Doing so will omit the keydown and keyup events associated with
     * shift, ctrl, alt, and meta keys surrounding the actual keystroke.
     *
     * @param {!Keystroke} keystroke
     * @param {!HTMLElement} target
     * @param {boolean=} transitionModifiers
     * @param {number} events
     * @param {?function(string):string} mutation
     * @this {Keyboard}
     */

    Keyboard.prototype.dispatchEventsForKeystroke = function dispatchEventsForKeystroke(keystroke, target, transitionModifiers = true, events = KeyEvents.ALL, mutation = null) {
      if (transitionModifiers) {
        this.dispatchModifierStateTransition(target, 0, keystroke.modifiers, events);
      }

      const dispatchEvent = function (e) {
        if (dirac.DEBUG_KEYSIM) {
          console.log('event dispatch', e.keyCode, e.type, e);
        }
        const res = target.dispatchEvent(e);
        if (dirac.DEBUG_KEYSIM) {
          console.log('  => (event dispatch) ', res);
        }
        return res;
      };

      let keydownEvent = undefined;
      if (events & KeyEvents.DOWN) {
        keydownEvent = this.createEventFromKeystroke('keydown', keystroke, target);
      }

      if (keydownEvent && dispatchEvent(keydownEvent) && this.targetCanReceiveTextInput(target)) {
        let keypressEvent = undefined;
        if (events & KeyEvents.PRESS) {
          keypressEvent = this.createEventFromKeystroke('keypress', keystroke, target);
        }
        if (keypressEvent && (keypressEvent.charCode || mutation || keystroke.mutation) && dispatchEvent(keypressEvent)) {
          if (events & KeyEvents.INPUT) {
            const inputEvent = this.createEventFromKeystroke('input', keystroke, target);
            // CodeMirror does read input content back, so we have to add real content into target element
            // we currently only support cursor at the end of input, no selection changes, etc.
            const effectiveMutation = mutation || keystroke.mutation;
            if (effectiveMutation) {
              const newValue = effectiveMutation(target.value);
              if (dirac.DEBUG_KEYSIM) {
                console.log('mutation of value', target.value, newValue, target);
              }
              target.value = newValue;
            }
            dispatchEvent(inputEvent);
          }
        }
      }

      if (events & KeyEvents.UP) {
        const keyupEvent = this.createEventFromKeystroke('keyup', keystroke, target);
        dispatchEvent(keyupEvent);
      }

      if (transitionModifiers) {
        this.dispatchModifierStateTransition(target, keystroke.modifiers, 0);
      }
    };

    /**
     * Transitions from one modifier state to another by dispatching key events.
     *
     * @param {!EventTarget} target
     * @param {number} fromModifierState
     * @param {number} toModifierState
     * @param {number} events
     * @this {Keyboard}
     * @private
     */

    Keyboard.prototype.dispatchModifierStateTransition = function dispatchModifierStateTransition(target, fromModifierState, toModifierState) {
      const events = arguments.length <= 3 || arguments[3] === undefined ? KeyEvents.ALL : arguments[3];

      let currentModifierState = fromModifierState;
      const didHaveMeta = (fromModifierState & META) === META;
      const willHaveMeta = (toModifierState & META) === META;
      const didHaveCtrl = (fromModifierState & CTRL) === CTRL;
      const willHaveCtrl = (toModifierState & CTRL) === CTRL;
      const didHaveShift = (fromModifierState & SHIFT) === SHIFT;
      const willHaveShift = (toModifierState & SHIFT) === SHIFT;
      const didHaveAlt = (fromModifierState & ALT) === ALT;
      const willHaveAlt = (toModifierState & ALT) === ALT;

      const includeKeyUp = events & KeyEvents.UP;
      const includeKeyPress = events & KeyEvents.PRESS;
      const includeKeyDown = events & KeyEvents.DOWN;

      const dispatchEvent = function (e) {
        // console.log("dispatch", e);
        return target.dispatchEvent(e);
      };

      if (includeKeyUp && didHaveMeta === true && willHaveMeta === false) {
        // Release the meta key.
        currentModifierState &= ~META;
        dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionMap.META.keyCode), target));
      }

      if (includeKeyUp && didHaveCtrl === true && willHaveCtrl === false) {
        // Release the ctrl key.
        currentModifierState &= ~CTRL;
        dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionMap.CTRL.keyCode), target));
      }

      if (includeKeyUp && didHaveShift === true && willHaveShift === false) {
        // Release the shift key.
        currentModifierState &= ~SHIFT;
        dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionMap.SHIFT.keyCode), target));
      }

      if (includeKeyUp && didHaveAlt === true && willHaveAlt === false) {
        // Release the alt key.
        currentModifierState &= ~ALT;
        dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionMap.ALT.keyCode), target));
      }

      if (includeKeyDown && didHaveMeta === false && willHaveMeta === true) {
        // Press the meta key.
        currentModifierState |= META;
        dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionMap.META.keyCode), target));
      }

      if (includeKeyDown && didHaveCtrl === false && willHaveCtrl === true) {
        // Press the ctrl key.
        currentModifierState |= CTRL;
        dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionMap.CTRL.keyCode), target));
      }

      if (includeKeyDown && didHaveShift === false && willHaveShift === true) {
        // Press the shift key.
        currentModifierState |= SHIFT;
        dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionMap.SHIFT.keyCode), target));
      }

      if (includeKeyDown && didHaveAlt === false && willHaveAlt === true) {
        // Press the alt key.
        currentModifierState |= ALT;
        dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionMap.ALT.keyCode), target));
      }

      if (currentModifierState !== toModifierState) {
        throw new Error('internal error, expected modifier state: ' + toModifierState + (', got: ' + currentModifierState));
      }
    };

    /**
     * Returns the keystroke associated with the given action.
     *
     * @param {string} action
     * @return {?Keystroke}
     * @this {Keyboard}
     */

    Keyboard.prototype.keystrokeForAction = function keystrokeForAction(action) {
      let keyCode = null;
      let modifiers = 0;
      let mutation = null;

      const parts = action.split('+');
      const lastPart = parts.pop();

      parts.forEach(function (part) {
        switch (part.toUpperCase()) {
          case 'CTRL':
            modifiers |= CTRL;
            break;
          case 'META':
            modifiers |= META;
            break;
          case 'ALT':
            modifiers |= ALT;
            break;
          case 'SHIFT':
            modifiers |= SHIFT;
            break;
          default:
            throw new Error('in "' + action + '", invalid modifier: ' + part);
        }
      });

      const actionLookup = this._actionMap[lastPart.toUpperCase()];
      if (actionLookup) {
        keyCode = actionLookup.keyCode;
        mutation = actionLookup.mutation;
      } else if (lastPart.length === 1) {
        const lastPartKeystroke = this.keystrokeForCharCode(lastPart.charCodeAt(0));
        modifiers |= lastPartKeystroke.modifiers;
        keyCode = lastPartKeystroke.keyCode;
      } else {
        throw new Error('in "' + action + '", invalid action: ' + lastPart);
      }

      return new Keystroke(modifiers, keyCode, mutation);
    };

    /**
     * Gets the keystroke used to generate the given character code.
     *
     * @param {number} charCode
     * @return {?Keystroke}
     * @this {Keyboard}
     */
    Keyboard.prototype.keystrokeForCharCode = function keystrokeForCharCode(charCode) {
      return this._charCodeKeyCodeMap[charCode];
    };

    /**
     * @param {!EventTarget} target
     * @private
     */
    Keyboard.prototype.targetCanReceiveTextInput = function targetCanReceiveTextInput(target) {
      if (!target) {
        return false;
      }

      switch (target.nodeName && target.nodeName.toLowerCase()) {
        case 'input':
          const type = target.type;
          return !(type === 'hidden' || type === 'radio' || type === 'checkbox');

        case 'textarea':
          return true;

        default:
          return false;
      }
    };

    return Keyboard;
  })();

  const US_ENGLISH_CHARCODE_KEYCODE_MAP = {
    32: new Keystroke(0, 32), // <space>
    33: new Keystroke(SHIFT, 49), // !
    34: new Keystroke(SHIFT, 222), // "
    35: new Keystroke(SHIFT, 51), // #
    36: new Keystroke(SHIFT, 52), // $
    37: new Keystroke(SHIFT, 53), // %
    38: new Keystroke(SHIFT, 55), // &
    39: new Keystroke(0, 222), // '
    40: new Keystroke(SHIFT, 57), // (
    41: new Keystroke(SHIFT, 48), // )
    42: new Keystroke(SHIFT, 56), // *
    43: new Keystroke(SHIFT, 187), // +
    44: new Keystroke(0, 188), // ,
    45: new Keystroke(0, 189), // -
    46: new Keystroke(0, 190), // .
    47: new Keystroke(0, 191), // /
    48: new Keystroke(0, 48), // 0
    49: new Keystroke(0, 49), // 1
    50: new Keystroke(0, 50), // 2
    51: new Keystroke(0, 51), // 3
    52: new Keystroke(0, 52), // 4
    53: new Keystroke(0, 53), // 5
    54: new Keystroke(0, 54), // 6
    55: new Keystroke(0, 55), // 7
    56: new Keystroke(0, 56), // 8
    57: new Keystroke(0, 57), // 9
    58: new Keystroke(SHIFT, 186), // :
    59: new Keystroke(0, 186), // ;
    60: new Keystroke(SHIFT, 188), // <
    61: new Keystroke(0, 187), // =
    62: new Keystroke(SHIFT, 190), // >
    63: new Keystroke(SHIFT, 191), // ?
    64: new Keystroke(SHIFT, 50), // @
    65: new Keystroke(SHIFT, 65), // A
    66: new Keystroke(SHIFT, 66), // B
    67: new Keystroke(SHIFT, 67), // C
    68: new Keystroke(SHIFT, 68), // D
    69: new Keystroke(SHIFT, 69), // E
    70: new Keystroke(SHIFT, 70), // F
    71: new Keystroke(SHIFT, 71), // G
    72: new Keystroke(SHIFT, 72), // H
    73: new Keystroke(SHIFT, 73), // I
    74: new Keystroke(SHIFT, 74), // J
    75: new Keystroke(SHIFT, 75), // K
    76: new Keystroke(SHIFT, 76), // L
    77: new Keystroke(SHIFT, 77), // M
    78: new Keystroke(SHIFT, 78), // N
    79: new Keystroke(SHIFT, 79), // O
    80: new Keystroke(SHIFT, 80), // P
    81: new Keystroke(SHIFT, 81), // Q
    82: new Keystroke(SHIFT, 82), // R
    83: new Keystroke(SHIFT, 83), // S
    84: new Keystroke(SHIFT, 84), // T
    85: new Keystroke(SHIFT, 85), // U
    86: new Keystroke(SHIFT, 86), // V
    87: new Keystroke(SHIFT, 87), // W
    88: new Keystroke(SHIFT, 88), // X
    89: new Keystroke(SHIFT, 89), // Y
    90: new Keystroke(SHIFT, 90), // Z
    91: new Keystroke(0, 219), // [
    92: new Keystroke(0, 220), // \
    93: new Keystroke(0, 221), // ]
    96: new Keystroke(0, 192), // `
    97: new Keystroke(0, 65), // a
    98: new Keystroke(0, 66), // b
    99: new Keystroke(0, 67), // c
    100: new Keystroke(0, 68), // d
    101: new Keystroke(0, 69), // e
    102: new Keystroke(0, 70), // f
    103: new Keystroke(0, 71), // g
    104: new Keystroke(0, 72), // h
    105: new Keystroke(0, 73), // i
    106: new Keystroke(0, 74), // j
    107: new Keystroke(0, 75), // k
    108: new Keystroke(0, 76), // l
    109: new Keystroke(0, 77), // m
    110: new Keystroke(0, 78), // n
    111: new Keystroke(0, 79), // o
    112: new Keystroke(0, 80), // p
    113: new Keystroke(0, 81), // q
    114: new Keystroke(0, 82), // r
    115: new Keystroke(0, 83), // s
    116: new Keystroke(0, 84), // t
    117: new Keystroke(0, 85), // u
    118: new Keystroke(0, 86), // v
    119: new Keystroke(0, 87), // w
    120: new Keystroke(0, 88), // x
    121: new Keystroke(0, 89), // y
    122: new Keystroke(0, 90), // z
    123: new Keystroke(SHIFT, 219), // {
    124: new Keystroke(SHIFT, 220), // |
    125: new Keystroke(SHIFT, 221), // }
    126: new Keystroke(SHIFT, 192) // ~
  };

  const US_ENGLISH_ACTION_MAP = {
    BACKSPACE: {keyCode: 8, mutation: deleter(1)},
    TAB: {keyCode: 9, mutation: appender('\t')},
    ENTER: {keyCode: 13, mutation: appender('\n')},
    SHIFT: {keyCode: 16},
    CTRL: {keyCode: 17},
    ALT: {keyCode: 18},
    PAUSE: {keyCode: 19},
    CAPSLOCK: {keyCode: 20},
    ESCAPE: {keyCode: 27},
    SPACE: {keyCode: 32, mutation: appender(' ')},
    PAGEUP: {keyCode: 33},
    PAGEDOWN: {keyCode: 34},
    END: {keyCode: 35},
    HOME: {keyCode: 36},
    LEFT: {keyCode: 37},
    UP: {keyCode: 38},
    RIGHT: {keyCode: 39},
    DOWN: {keyCode: 40},
    INSERT: {keyCode: 45},
    DELETE: {keyCode: 46},
    META: {keyCode: 91},
    F1: {keyCode: 112},
    F2: {keyCode: 113},
    F3: {keyCode: 114},
    F4: {keyCode: 115},
    F5: {keyCode: 116},
    F6: {keyCode: 117},
    F7: {keyCode: 118},
    F8: {keyCode: 119},
    F9: {keyCode: 120},
    F10: {keyCode: 121},
    F11: {keyCode: 122},
    F12: {keyCode: 123}
  };

  /**
   * Gets a keyboard instance configured as a U.S. English keyboard would be.
   *
   * @return {!Keyboard}
   */
  Keyboard.US_ENGLISH = new Keyboard(US_ENGLISH_CHARCODE_KEYCODE_MAP, US_ENGLISH_ACTION_MAP);

  exports.KeyEvents = KeyEvents;
  exports.Keystroke = Keystroke;
  exports.Keyboard = Keyboard;

});
