// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LinearMemoryNavigator, Navigation, PageNavigationEvent, RefreshEvent} from '../../../../front_end/linear_memory_inspector/LinearMemoryNavigator.js';
import {assertElement, assertElements, assertShadowRoot, getEventPromise, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

export const NAVIGATOR_ADDRESS_SELECTOR = '[data-input]';
export const NAVIGATOR_PAGE_BUTTON_SELECTOR = '[data-button=pageNavigation]';
export const NAVIGATOR_HISTORY_BUTTON_SELECTOR = '[data-button=historyNavigation]';
export const NAVIGATOR_REFRESH_BUTTON_SELECTOR = '[data-button=refresh]';

describe('LinearMemoryNavigator', () => {
  let component: LinearMemoryNavigator;

  beforeEach(renderNavigator);

  function renderNavigator() {
    component = new LinearMemoryNavigator();
    renderElementIntoDOM(component);

    component.data = {
      address: 20,
    };
  }

  async function assertNavigationEvents(eventType: string) {
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const pageNavigationButtons = shadowRoot.querySelectorAll(`[data-button=${eventType}]`);
    assertElements(pageNavigationButtons, HTMLButtonElement);
    assert.lengthOf(pageNavigationButtons, 2);

    const navigation = [];
    for (const button of pageNavigationButtons) {
      const eventPromise = getEventPromise<PageNavigationEvent>(component, eventType);
      button.click();
      const event = await eventPromise;
      navigation.push(event.data);
    }

    assert.deepEqual(navigation, [Navigation.Backward, Navigation.Forward]);
  }

  it('renders navigator address', async () => {
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assertElement(input, HTMLInputElement);
    assert.strictEqual(input.value, '0x00000014');
  });

  it('re-renders address on address change', async () => {
    component.data = {
      address: 16,
    };

    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assertElement(input, HTMLInputElement);
    assert.strictEqual(input.value, '0x00000010');
  });

  it('sends event when clicking on refresh', async () => {
    const eventPromise = getEventPromise<RefreshEvent>(component, 'refresh');

    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const refreshButton = shadowRoot.querySelector(NAVIGATOR_REFRESH_BUTTON_SELECTOR);
    assertElement(refreshButton, HTMLButtonElement);
    refreshButton.click();

    assert.isNotNull(await eventPromise);
  });

  it('sends events when clicking previous and next page', async () => {
    await assertNavigationEvents('historyNavigation');
  });

  it('sends events when clicking undo and redo', async () => {
    await assertNavigationEvents('pageNavigation');
  });
});
