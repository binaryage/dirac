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
export function assertNotNull<T>(val: T): asserts val is NonNullable<T> {
  if (val === null) {
    assert.fail('Expected thing to be not null but it was');
  }
}

/**
 * An easy way to assert the component's shadowRoot exists so you're able to assert on its contents.
 */
export function assertShadowRoot(shadowRoot: ShadowRoot|null): asserts shadowRoot is ShadowRoot {
  assert.instanceOf(shadowRoot, ShadowRoot);
}

type Constructor<T> = {
  new (...args: unknown[]): T
};

/**
 * Asserts that `element` is of type `T`.
 */
export function assertElement<T extends Element>(
    element: Element|null, elementClass: Constructor<T>): asserts element is T {
  assert.instanceOf(element, elementClass);
}

/**
 * Asserts that all emenents of `nodeList` are at least of type `T`.
 */
export function assertElements<T extends Element>(
    nodeList: NodeListOf<Element>, elementClass: Constructor<T>): asserts nodeList is NodeListOf<T> {
  nodeList.forEach(e => assert.instanceOf(e, elementClass));
}

/**
 * Returns a promise that resolves when an element finishes being scrolled.
 */
export function waitForScrollDone<T extends Element>(element: T, scrollDeltaThreshold = 3): Promise<void> {
  let lastKnownScroll = -1;
  return new Promise(resolve => {
    const onScrollEventListener = () => {
      // When we do smooth scrolling, the last two scroll events won't have the
      // exact same scroll left, but they will be very close. e.g. as the smooth
      // scroll finishes, the last two scroll events will have nearly but not
      // quite the same values. So, if they are 1px or 2px apart, we treat that
      // as finished.
      if (element.scrollLeft - lastKnownScroll < scrollDeltaThreshold && lastKnownScroll > -1) {
        element.removeEventListener('scroll', onScrollEventListener);
        resolve();
      } else {
        lastKnownScroll = element.scrollLeft;
      }
    };
    element.addEventListener('scroll', onScrollEventListener);
  });
}

/**
 * Dispatches a mouse click event. Errors if the event was not dispatched successfully.
 */
export function dispatchClickEvent<T extends Element>(element: T, options: MouseEventInit = {}) {
  const clickEvent = new MouseEvent('click', options);
  const success = element.dispatchEvent(clickEvent);
  if (!success) {
    assert.fail('Failed to trigger click event successfully.');
  }
}
