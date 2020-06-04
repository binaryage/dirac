// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * These helpers are designed to be used when testing components or other code that renders into the DOM.
 * By using these helpers we ensure the DOM is correctly cleaned between test runs.
 *
 * Note that `resetTestDOM` is automatically run before each test (see `test_setup.ts`).
 **/

const {assert} = chai;

const TEST_CONTAINER_ID = '__devtools-test-container-id';

interface RenderOptions {
  allowMultipleChildren?: boolean
}

/**
 * Renders a given element into the DOM. By default it will error if it finds an element already rendered but this can be controlled via the options.
 **/
export const renderElementIntoDOM = (element: HTMLElement, renderOptions: RenderOptions = {}) => {
  const container = document.getElementById(TEST_CONTAINER_ID);

  if (!container) {
    assert.fail(`renderIntoDOM expected to find ${TEST_CONTAINER_ID}`);
    return;
  }

  const allowMultipleChildren = !!renderOptions.allowMultipleChildren;

  if (container.childNodes.length !== 0 && !allowMultipleChildren) {
    assert.fail('renderIntoDOM expects the container to be empty');
    return;
  }

  container.appendChild(element);
  return element;
};

/**
 * Completely cleans out the test DOM to ensure it's empty for the next test run.
 * This is run automatically between tests - you should not be manually calling this yourself.
 **/
export const resetTestDOM = () => {
  const previousContainer = document.getElementById(TEST_CONTAINER_ID);
  if (previousContainer) {
    previousContainer.remove();
  }

  const newContainer = document.createElement('div');
  newContainer.id = TEST_CONTAINER_ID;

  document.body.appendChild(newContainer);
};

/**
 * This is useful to keep TypeScript happy in a test - if you have a value that's potentially `null` you can use this function to assert that it isn't, and satisfy TypeScript that the value is present.
 */
export const assertNotNull = <T>(val: T): asserts val is NonNullable<T> => {
  if (val === null) {
    assert.fail('Expected thing to be not null but it was');
  }
};

/**
 * An easy way to assert the component's shadowRoot exists so you're able to assert on its contents.
 */
export const assertShadowRoot = (shadowRoot: ShadowRoot|null): asserts shadowRoot is ShadowRoot => {
  if (!shadowRoot) {
    assert.fail('Expected shadowRoot to exist');
  }
};
