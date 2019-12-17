// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import * as Common from '/front_end/common/common.js';

describe('Trie', () => {
  let trie: Common.Trie.Trie;
  beforeEach(() => {
    trie = new Common.Trie.Trie();
  });

  it('stores and retrieves words', () => {
    trie.add('foo');
    assert.isTrue(trie.has('foo'));
    assert.isFalse(trie.has('bar'));
  });

  it('removes words', () => {
    trie.add('foo');
    assert.isTrue(trie.has('foo'));
    trie.remove('foo');
    assert.isFalse(trie.has('foo'));
  });

  it('completes words based on prefixes', () => {
    trie.add('foo');
    trie.add('food');
    trie.add('flora');
    trie.add('boat');
    trie.add('focus');
    trie.add('banana');
    assert.deepEqual(trie.words('fo'), ['foo', 'food', 'focus']);
    assert.isEmpty(trie.words('cat'));
  });

  it('clears words', () => {
    trie.add('foo');
    assert.isTrue(trie.has('foo'));

    trie.clear();
    assert.isFalse(trie.has('foo'));
    assert.isEmpty(trie.words('foo'));
  });

  it('provides the longest prefix', () => {
    trie.add('super');
    trie.add('supercar');

    // Longest non-word prefix match.
    assert.equal(trie.longestPrefix('supercalifragilisticexpialidocious', false), 'superca');

    // Longest word prefix match.
    assert.equal(trie.longestPrefix('supercalifragilisticexpialidocious', true), 'super');
  });
});
