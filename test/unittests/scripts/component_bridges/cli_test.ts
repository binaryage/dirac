// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import {parseTypeScriptComponent} from '../../../../scripts/component_bridges/cli.js';

import {pathForFixture} from './test_utils.js';


const runFixtureTestAndAssertMatch = (fixtureName: string) => {
  const sourcePath = pathForFixture(`${fixtureName}.ts`);
  const expectedPath = pathForFixture(path.join('expected', `${fixtureName}_bridge-expected.js`));

  const {output} = parseTypeScriptComponent(sourcePath);

  const actualCode = fs.readFileSync(output, {encoding: 'utf8'});
  const expectedCode = fs.readFileSync(expectedPath, {encoding: 'utf8'});

  assert.strictEqual(actualCode, expectedCode, `Fixture did not match expected: ${fixtureName}`);

  return {actualCode, expectedCode};
};

describe('bridges CLI fixture tests', () => {
  it('basic component', () => {
    runFixtureTestAndAssertMatch('basic-component');
  });

  it('component with multiple methods only includes the public ones', () => {
    runFixtureTestAndAssertMatch('multiple-methods');
  });

  it('picks out the right interfaces for components with array parameters', () => {
    runFixtureTestAndAssertMatch('array-params');
  });

  it('correctly pulls out getters and setters into the public interface', () => {
    runFixtureTestAndAssertMatch('getters-setters-component');
  });

  it('can handle setters with object literal data parameter', () => {
    runFixtureTestAndAssertMatch('setters-object-literal');
  });
});
