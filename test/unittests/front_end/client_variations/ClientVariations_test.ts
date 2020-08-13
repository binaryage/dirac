// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as ClientVariations from '../../../../front_end/client_variations/client_variations.js';

describe('formatClientVariations', () => {
  it('formats input containing both types of variation IDs', () => {
    const result = ClientVariations.Formatter.formatClientVariations({
      variationIds: [111, 222, 333],
      triggerVariationIds: [444, 555],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active client experiment variation IDs.\n  repeated int32 variation_id = [111, 222, 333];\n  // Active client experiment variation IDs that trigger server-side behavior.\n  repeated int32 trigger_variation_id = [444, 555];\n}');
  });

  it('formats input containing only plain variation IDs', () => {
    const result = ClientVariations.Formatter.formatClientVariations({
      variationIds: [111, 222, 333],
      triggerVariationIds: [],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active client experiment variation IDs.\n  repeated int32 variation_id = [111, 222, 333];\n}');
  });

  it('formats input containing only trigger variation IDs', () => {
    const result = ClientVariations.Formatter.formatClientVariations({
      variationIds: [],
      triggerVariationIds: [444, 555],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active client experiment variation IDs that trigger server-side behavior.\n  repeated int32 trigger_variation_id = [444, 555];\n}');
  });

  it('formats input containing no variation IDs', () => {
    const result = ClientVariations.Formatter.formatClientVariations({
      variationIds: [],
      triggerVariationIds: [],
    });
    assert.deepEqual(result, 'message ClientVariations {\n}');
  });
});

describe('parseClientVariations', () => {
  it('returns empty lists for unparseable text', () => {
    const result = ClientVariations.Parser.parseClientVariations('gibberish');
    assert.deepEqual(result, {
      variationIds: [],
      triggerVariationIds: [],
    });
  });

  it('returns empty lists for empty input', () => {
    const result = ClientVariations.Parser.parseClientVariations('');
    assert.deepEqual(result, {
      variationIds: [],
      triggerVariationIds: [],
    });
  });

  it('parses a valid serialized proto', () => {
    const result = ClientVariations.Parser.parseClientVariations('CG8I3gEIzQIYvAMYqwQ=');
    assert.deepEqual(result, {
      variationIds: [111, 222, 333],
      triggerVariationIds: [444, 555],
    });
  });
});
