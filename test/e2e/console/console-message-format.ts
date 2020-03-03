// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {obtainConsoleMessages, showVerboseMessages} from '../helpers/console-helpers.js';
import {resetPages} from '../../shared/helper.js';

describe('The Console Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('shows BigInts formatted', async () => {
    const messages = await obtainConsoleMessages('big-int');

    assert.deepEqual(messages, [
      '1n',
      'BigInt\xA0{2n}',
      '[1n]',
      '[BigInt]',
      'null 1n BigInt\xA0{2n}',
    ]);
  });

  it('shows uncaught promises', async () => {
    const messages = await obtainConsoleMessages('uncaught-promise');

    assert.deepEqual(messages, [
      `Uncaught (in promise) Error: err1
    at uncaught-promise.html:10`,
      `Uncaught (in promise) Error: err2
    at uncaught-promise.html:28`,
      `Uncaught (in promise) DOMException: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
    at throwDOMException (http://localhost:8090/test/e2e/resources/console/uncaught-promise.html:43:11)
    at catcher (http://localhost:8090/test/e2e/resources/console/uncaught-promise.html:36:9)`,
    ]);
  });

  it('shows structured objects', async () => {
    const messages = await obtainConsoleMessages('structured-objects');

    assert.deepEqual(messages, [
      '{}',
      'ƒ Object() { [native code] }',
      '{constructor: ƒ, __defineGetter__: ƒ, __defineSetter__: ƒ, hasOwnProperty: ƒ, __lookupGetter__: ƒ,\xA0…}',
      '{foo: "foo"}',
      '{bar: "bar"}',
      '["test"]',
      '(10)\xA0["test", "test2", empty × 2, "test4", empty × 5, foo: {…}]',
      '(200)\xA0[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, …]',
      '(2)\xA0[1, Array(2)]',
    ]);
  });

  it('escapes and substitutes correctly', async () => {
    const messages = await obtainConsoleMessages('escaping');

    assert.deepEqual(messages, [
      'Test for zero "0" in formatter',
      '% self-escape1 dummy',
      '%s self-escape2 dummy',
      '%ss self-escape3 dummy',
      '%sdummy%s self-escape4',
      '%%% self-escape5 dummy',
      '%dummy self-escape6',
      '(2)\xA0["test", "test2"]',
      'Array(2)',
    ]);
  });

  it('shows built-in objects', async () => {
    const messages = await obtainConsoleMessages('built-ins');

    assert.deepEqual(messages, [
      '/^url\\(\\s*(?:(?:\"(?:[^\\\\\\\"]|(?:\\\\[\\da-f]{1,6}\\s?|\\.))*\"|\'(?:[^\\\\\\\']|(?:\\\\[\\da-f]{1,6}\\s?|\\.))*\')|(?:[!#$%&*-~\\w]|(?:\\\\[\\da-f]{1,6}\\s?|\\.))*)\\s*\\)/i',
      '/foo\\\\bar\\sbaz/i',
      `Error
    at built-ins.html:16`,
      `Error: My error message
    at built-ins.html:19`,
      `Error: my multiline
error message
    at built-ins.html:22`,
      'ƒ () { return 1; }',
      `ƒ () {
        return 2;
      }`,
      `ƒ ( /**/ foo/**/, /*/**/bar,
      /**/baz) {}`,
      'Arguments(2)\xA0[1, "2", callee: (...), Symbol(Symbol.iterator): ƒ]',
      'Uint8Array\xA0[3]',
      'Uint8Array(400)\xA0[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, …]',
      'Uint8Array(400000000)\xA0[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, …]',
      'Uint16Array(3)\xA0[1, 2, 3]',
      'Promise\xA0{<rejected>: -0}',
      'Promise\xA0{<resolved>: 1}',
      'Promise\xA0{<pending>}',
      'Symbol()',
      'Symbol(a)',
      '{a: Symbol(), Symbol(a): 2}',
      'Map(1)\xA0{{…} => {…}}',
      'WeakMap\xA0{{…} => {…}}',
      'Set(1)\xA0{{…}}',
      'WeakSet\xA0{{…}}',
      'Map(1)\xA0{Map(1) => WeakMap}',
      'Map(1)\xA0{Map(0) => WeakMap}',
      'Set(1)\xA0{WeakSet}',
      'Set(1)\xA0{WeakSet}',
      'Map(6)\xA0{" from str " => " to str ", undefined => undefined, null => null, 42 => 42, {…} => {…}, …}',
      'genFunction\xA0{<suspended>}',
    ]);
  });

  it('shows primitives', async () => {
    const messages = await obtainConsoleMessages('primitives');

    assert.deepEqual(messages, [
      'null',
      'undefined',
      'NaN',
      '{}',
      '[ƒ]',
      'Infinity',
      '-Infinity',
      'Number\xA0{42}',
      'String\xA0{"abc"}',
      '0.12',
      '-0',
      'test',
      'https://chromium.org',
      'Number\xA0{42, 1: "foo", a: "bar"}',
      'String\xA0{"abc", 3: "foo", 01: "foo", a: "bar"}',
    ]);
  });

  it('can handle prototype fields', async () => {
    const messages = await obtainConsoleMessages('prototypes');

    assert.deepEqual(messages, [
      '{enumerableProp: 4, __underscoreEnumerableProp__: 5, __underscoreNonEnumerableProp: 2, abc: 3, getFoo: ƒ,\xA0…}',
      '{longSubNamespace: {…}}',
      'namespace.longSubNamespace.x.className\xA0{}',
      '{}',
      'ArrayLike(5)\xA0[empty × 5]',
      'ArrayLike(4294967295)\xA0[empty × 4294967295]',
      'ArrayLike\xA0{length: -5}',
      'ArrayLike\xA0{length: 5.6}',
      'ArrayLike\xA0{length: NaN}',
      'ArrayLike\xA0{length: Infinity}',
      'ArrayLike\xA0{length: -0}',
      'ArrayLike\xA0{length: 4294967296}',
      'NonArrayWithLength\xA0{keys: Array(0)}',
    ]);
  });

  it('can show DOM interactions', async () => {
    const messages = await obtainConsoleMessages('dom-interactions');

    assert.deepEqual(messages, [
      '',
      '',
      '',
      '',
      '#text',
      'HTMLCollection\xA0[select, sel: select]',
      'HTMLCollection(3)\xA0[meta, meta, title, viewport: meta]',
      'HTMLOptionsCollection(2)\xA0[option, option, selectedIndex: 0]',
      'HTMLAllCollection(15)\xA0[html, head, meta, meta, title, body, div#first-child.c1.c2.c3, div#p, form, select, option, option, input, input, script, viewport: meta, first-child: div#first-child.c1.c2.c3, p: div#p, sel: select, input: HTMLCollection(2)]',
      'HTMLFormControlsCollection(3)\xA0[select, input, input, sel: select, input: RadioNodeList(2)]',
      'RadioNodeList(2)\xA0[input, input, value: ""]',
      'DOMTokenList(3)\xA0["c1", "c2", "c3", value: "c1 c2 c3"]',
      'DOMException: Failed to execute \'removeChild\' on \'Node\': The node to be removed is not a child of this node.',
    ]);
  });

  it('can handle sourceURLs in exceptions', async () => {
    const messages = await obtainConsoleMessages('source-url-exceptions');

    assert.deepEqual(messages, [
      `Uncaught ReferenceError: FAIL is not defined
    at foo (foo2.js:1)
    at source-url-exceptions.html:12`,
    ]);
  });

  it('can show stackoverflow exceptions', async () => {
    const messages = await obtainConsoleMessages('stack-overflow');

    assert.deepEqual(messages, [
      `Uncaught RangeError: Maximum call stack size exceeded
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)
    at boo (foo2.js:2)`,
    ]);
  });

  it('can show document.write messages', async () => {
    const messages = await obtainConsoleMessages('document-write');

    assert.deepEqual(messages, [
      'script element',
      'document.write from onload',
    ]);
  });

  it('can show verbose promise unhandledrejections', async () => {
    const messages = await obtainConsoleMessages('onunhandledrejection', showVerboseMessages);

    assert.deepEqual(messages, [
      'onunhandledrejection1',
      'onrejectionhandled1',
      'onunhandledrejection2',
      `Uncaught (in promise) Error: e
    at runSecondPromiseRejection (onunhandledrejection.html:26)`,
      'onrejectionhandled2',
    ]);
  });

  describe('shows messages from before', async () => {
    it('iframe removal', async () => {
      const messages = await obtainConsoleMessages('navigation/after-removal');

      assert.deepEqual(messages, [
        'A message with first argument string Second argument which should not be discarded',
        '2011 "A message with first argument integer"',
        'Window\xA0{parent: Window, opener: null, top: Window, length: 0, frames: Window,\xA0…} "A message with first argument window"',
      ]);
    });

    it('and after iframe navigation', async () => {
      const messages = await obtainConsoleMessages('navigation/after-navigation');

      assert.deepEqual(messages, [
        'A message with first argument string Second argument which should not be discarded',
        '2011 "A message with first argument integer"',
        'Window\xA0{parent: Window, opener: null, top: Window, length: 0, frames: Window,\xA0…} "A message with first argument window"',
        'After iframe navigation.',
      ]);
    });
  });
});
