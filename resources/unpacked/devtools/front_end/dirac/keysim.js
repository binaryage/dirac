(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            factory((global.Keysim = {}))
}(this, function(exports) {
    'use strict';

    var _createClass = (function() {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ('value' in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function(Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
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
     * @return {function}
     */
    let appender = function(s) {
        /**
         * @param {string} value
         * @return {string}
         */
        return function(value) {
            return value + s;
        };
    };

    /**
     * @param {number} n
     * @return {function}
     */
    let deleter = function(n) {
        /**
         * @param {string} value
         * @return {string}
         */
        return function(value) {
            const end = value.length - n;
            return (end > 0) ? value.substring(0, end) : "";
        };
    };

    var taskQueueRunning = false;
    var taskQueue = [];

    function processTask(task) {
        try {
            task.job();
        } catch (e) {
            console.error("keysim task has failed:", e, "\n", task);
        }
        wakeTaskQueue();
    }

    function wakeTaskQueue() {
        const task = taskQueue.shift();
        if (task) {
            taskQueueRunning = true;
            setTimeout(processTask.bind(this, task), task.delay);
        } else {
            taskQueueRunning = false;
        }
    }

    function scheduleTask(delay, job) {
        taskQueue.push({delay, job, stack: new Error("scheduled at")});
        if (!taskQueueRunning) {
            wakeTaskQueue();
        }
    }

    /* jshint esnext:true, undef:true, unused:true */

    var keyCodeToKeyIdentifierMap = {
        9: "U+0009", // tab
        27: "U+001B", // esc
        32: "U+0020", // space
        38: 'Up',
        40: 'Down',
        37: 'Left',
        39: 'Right',
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

    var CTRL = 1 << 0;
    var META = 1 << 1;
    var ALT = 1 << 2;
    var SHIFT = 1 << 3;

    // Key Events
    var KeyEvents = {
        DOWN: 1 << 0,
        PRESS: 1 << 1,
        UP: 1 << 2,
        INPUT: 1 << 3
    };
    KeyEvents.ALL = KeyEvents.DOWN | KeyEvents.PRESS | KeyEvents.UP | KeyEvents.INPUT;

    /**
     * Represents a keystroke, or a single key code with a set of active modifiers.
     *
     * @class Keystroke
     */

    var Keystroke = (function() {
        /**
         * @param {number} modifiers A bitmask formed by CTRL, META, ALT, and SHIFT.
         * @param {number} keyCode
         * @param {?function} mutation
         */
        function Keystroke(modifiers, keyCode, mutation) {
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
         *
         * @type {number}
         */

        _createClass(Keystroke, null, [{
            key: 'CTRL',
            value: CTRL,

            /**
             * Gets the bitmask value for the "meta" modifier.
             *
             * @return {number}
             */
            enumerable: true
        }, {
            key: 'META',
            value: META,

            /**
             * Gets the bitmask value for the "alt" modifier.
             *
             * @return {number}
             */
            enumerable: true
        }, {
            key: 'ALT',
            value: ALT,

            /**
             * Gets the bitmask value for the "shift" modifier.
             *
             * @return {number}
             */
            enumerable: true
        }, {
            key: 'SHIFT',
            value: SHIFT,
            enumerable: true
        }]);

        return Keystroke;
    })();

    var Keyboard = (function() {
        /**
         * @param {Object.<number, Keystroke>} charCodeKeyCodeMap
         * @param {Object.<string, number>} actionMap
         */

        function Keyboard(charCodeKeyCodeMap, actionMap) {
            _classCallCheck(this, Keyboard);

            this._charCodeKeyCodeMap = charCodeKeyCodeMap;
            this._actionMap = actionMap;
        }

        /**
         * Determines the character code generated by pressing the given keystroke.
         *
         * @param {Keystroke} keystroke
         * @return {?number}
         */

        Keyboard.prototype.charCodeForKeystroke = function charCodeForKeystroke(keystroke) {
            var map = this._charCodeKeyCodeMap;
            for (var charCode in map) {
                if (Object.prototype.hasOwnProperty.call(map, charCode)) {
                    var keystrokeForCharCode = map[charCode];
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
         * @param {Keystroke} keystroke
         * @param {HTMLElement} target
         * @return {Event}
         */

        Keyboard.prototype.createEventFromKeystroke = function createEventFromKeystroke(type, keystroke, target) {
            var document = target.ownerDocument;
            var window = document.defaultView;
            var Event = window.Event;

            var event = undefined;

            try {
                event = new Event(type);
            } catch (e) {
                event = document.createEvent('UIEvents');
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
                    event.keyIdentifier = keyCodeToKeyIdentifierMap[event.keyCode];
                    break;
            }

            return event;
        };

        /**
         * Fires the correct sequence of events on the given target as if the given
         * action was undertaken by a human.
         *
         * @param {string} action e.g. "alt+shift+left" or "backspace"
         * @param {HTMLElement} target
         * @param {?function} callback
         */
        Keyboard.prototype.dispatchEventsForAction = function(action, target, callback) {
            var keystroke = this.keystrokeForAction(action);
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
         * @param {HTMLElement} target
         * @param {?function} callback
         */
        Keyboard.prototype.dispatchEventsForInput = function(input, target, callback) {
            var currentModifierState = 0;
            for (var i = 0, _length = input.length; i < _length; i++) {
                var keystroke = this.keystrokeForCharCode(input.charCodeAt(i));
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
         * To disable handling of modifier keys, call with `transitionModifers` set
         * to false. Doing so will omit the keydown and keyup events associated with
         * shift, ctrl, alt, and meta keys surrounding the actual keystroke.
         *
         * @param {Keystroke} keystroke
         * @param {HTMLElement} target
         * @param {boolean=} transitionModifiers
         * @param {number} events
         */

        Keyboard.prototype.dispatchEventsForKeystroke = function dispatchEventsForKeystroke(keystroke, target, transitionModifiers = true, events = KeyEvents.ALL, mutation) {
            if (transitionModifiers) {
                this.dispatchModifierStateTransition(target, 0, keystroke.modifiers, events);
            }

            var dispatchEvent = function(e) {
                if (dirac._DEBUG_KEYSIM) {
                    console.log("event dispatch", e.keyCode, e.type, e);
                }
                const res = target.dispatchEvent(e);
                if (dirac._DEBUG_KEYSIM) {
                    console.log("  => (event dispatch) ", res);
                }
                return res;
            };

            var keydownEvent = undefined;
            if (events & KeyEvents.DOWN) {
                keydownEvent = this.createEventFromKeystroke('keydown', keystroke, target);
            }

            if (keydownEvent && dispatchEvent(keydownEvent) && this.targetCanReceiveTextInput(target)) {
                var keypressEvent = undefined;
                if (events & KeyEvents.PRESS) {
                    keypressEvent = this.createEventFromKeystroke('keypress', keystroke, target);
                }
                if (keypressEvent && (keypressEvent.charCode || mutation || keystroke.mutation) && dispatchEvent(keypressEvent)) {
                    if (events & KeyEvents.INPUT) {
                        var inputEvent = this.createEventFromKeystroke('input', keystroke, target);
                        // CodeMirror does read input content back, so we have to add real content into target element
                        // we currently only support cursor at the end of input, no selection changes, etc.
                        const effectiveMutation = mutation || keystroke.mutation;
                        if (effectiveMutation) {
                            const newValue = effectiveMutation(target.value);
                            if (dirac._DEBUG_KEYSIM) {
                                console.log("mutation of value", target.value, newValue, target);
                            }
                            target.value = newValue;
                        }
                        dispatchEvent(inputEvent);
                    }
                }
            }

            if (events & KeyEvents.UP) {
                var keyupEvent = this.createEventFromKeystroke('keyup', keystroke, target);
                dispatchEvent(keyupEvent);
            }

            if (transitionModifiers) {
                this.dispatchModifierStateTransition(target, keystroke.modifiers, 0);
            }
        };

        /**
         * Transitions from one modifier state to another by dispatching key events.
         *
         * @param {EventTarget} target
         * @param {number} fromModifierState
         * @param {number} toModifierState
         * @param {number} events
         * @private
         */

        Keyboard.prototype.dispatchModifierStateTransition = function dispatchModifierStateTransition(target, fromModifierState, toModifierState) {
            var events = arguments.length <= 3 || arguments[3] === undefined ? KeyEvents.ALL : arguments[3];

            var currentModifierState = fromModifierState;
            var didHaveMeta = (fromModifierState & META) === META;
            var willHaveMeta = (toModifierState & META) === META;
            var didHaveCtrl = (fromModifierState & CTRL) === CTRL;
            var willHaveCtrl = (toModifierState & CTRL) === CTRL;
            var didHaveShift = (fromModifierState & SHIFT) === SHIFT;
            var willHaveShift = (toModifierState & SHIFT) === SHIFT;
            var didHaveAlt = (fromModifierState & ALT) === ALT;
            var willHaveAlt = (toModifierState & ALT) === ALT;

            var includeKeyUp = events & KeyEvents.UP;
            var includeKeyPress = events & KeyEvents.PRESS;
            var includeKeyDown = events & KeyEvents.DOWN;

            var dispatchEvent = function(e) {
                //console.log("dispatch", e);
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
         */

        Keyboard.prototype.keystrokeForAction = function keystrokeForAction(action) {
            var keyCode = null;
            var modifiers = 0;

            var parts = action.split('+');
            var lastPart = parts.pop();

            parts.forEach(function(part) {
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
                        break;
                }
            });

            const actionLookup = this._actionMap[lastPart.toUpperCase()];
            if (actionLookup) {
                keyCode = actionLookup.keyCode;
            } else if (lastPart.length === 1) {
                var lastPartKeystroke = this.keystrokeForCharCode(lastPart.charCodeAt(0));
                modifiers |= lastPartKeystroke.modifiers;
                keyCode = lastPartKeystroke.keyCode;
            } else {
                throw new Error('in "' + action + '", invalid action: ' + lastPart);
            }

            return new Keystroke(modifiers, keyCode);
        };

        /**
         * Gets the keystroke used to generate the given character code.
         *
         * @param {number} charCode
         * @return {?Keystroke}
         */

        Keyboard.prototype.keystrokeForCharCode = function keystrokeForCharCode(charCode) {
            return this._charCodeKeyCodeMap[charCode];
        };

        /**
         * @param {EventTarget} target
         * @private
         */

        Keyboard.prototype.targetCanReceiveTextInput = function targetCanReceiveTextInput(target) {
            if (!target) {
                return false;
            }

            switch (target.nodeName && target.nodeName.toLowerCase()) {
                case 'input':
                    var type = target.type;
                    return !(type === 'hidden' || type === 'radio' || type === 'checkbox');

                case 'textarea':
                    return true;

                default:
                    return false;
            }
        };

        return Keyboard;
    })();

    var US_ENGLISH_CHARCODE_KEYCODE_MAP = {
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

    var US_ENGLISH_ACTION_MAP = {
        BACKSPACE: {keyCode: 8, mutation: deleter(1)},
        TAB: {keyCode: 9, mutation: appender("\t")},
        ENTER: {keyCode: 13, mutation: appender("\n")},
        SHIFT: {keyCode: 16},
        CTRL: {keyCode: 17},
        ALT: {keyCode: 18},
        PAUSE: {keyCode: 19},
        CAPSLOCK: {keyCode: 20},
        ESCAPE: {keyCode: 27},
        SPACE: {keyCode: 32, mutation: appender(" ")},
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
     * @return {Keyboard}
     */
    Keyboard.US_ENGLISH = new Keyboard(US_ENGLISH_CHARCODE_KEYCODE_MAP, US_ENGLISH_ACTION_MAP);

    exports.KeyEvents = KeyEvents;
    exports.Keystroke = Keystroke;
    exports.Keyboard = Keyboard;

}));