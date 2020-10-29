// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LinearMemoryInspector} from '../../../../front_end/linear_memory_inspector/LinearMemoryInspector.js';
import {toHexString} from '../../../../front_end/linear_memory_inspector/LinearMemoryInspectorUtils.js';
import {LinearMemoryNavigator} from '../../../../front_end/linear_memory_inspector/LinearMemoryNavigator.js';
import {ByteSelectedEvent, LinearMemoryViewer} from '../../../../front_end/linear_memory_inspector/LinearMemoryViewer.js';
import {getElementsWithinComponent, getElementWithinComponent, getEventPromise, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

import {NAVIGATOR_ADDRESS_SELECTOR, NAVIGATOR_HISTORY_BUTTON_SELECTOR, NAVIGATOR_PAGE_BUTTON_SELECTOR} from './LinearMemoryNavigator_test.js';
import {VIEWER_BYTE_CELL_SELECTOR} from './LinearMemoryViewer_test.js';

const {assert} = chai;

const NAVIGATOR_SELECTOR = 'devtools-linear-memory-inspector-navigator';
const VIEWER_SELECTOR = 'devtools-linear-memory-inspector-viewer';

describe('LinearMemoryInspector', () => {
  function getViewer(component: LinearMemoryInspector) {
    return getElementWithinComponent(component, VIEWER_SELECTOR, LinearMemoryViewer);
  }

  function getNavigator(component: LinearMemoryInspector) {
    return getElementWithinComponent(component, NAVIGATOR_SELECTOR, LinearMemoryNavigator);
  }

  function setUpComponent() {
    const component = new LinearMemoryInspector();

    const flexWrapper = document.createElement('div');
    flexWrapper.style.width = '500px';
    flexWrapper.style.height = '500px';
    flexWrapper.style.display = 'flex';
    flexWrapper.appendChild(component);
    renderElementIntoDOM(flexWrapper);

    const size = 1000;
    const memory = [];
    for (let i = 0; i < size; ++i) {
      memory[i] = i;
    }
    const data = {
      memory: new Uint8Array(memory),
      address: 20,
    };
    component.data = data;

    return {component, data};
  }

  it('renders the navigator component', async () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    assert.isNotNull(navigator);
  });

  it('renders the viewer component', async () => {
    const {component} = setUpComponent();
    const viewer = getViewer(component);
    assert.isNotNull(viewer);
  });

  it('can navigate addresses back and forth in history', async () => {
    const {component} = setUpComponent();

    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_HISTORY_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton, forwardButton] = buttons;

    const viewer = getViewer(component);
    const byteCells = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);

    const visitedByteValue = [];
    const historyLength = Math.min(byteCells.length, 10);

    for (let i = 0; i < historyLength; ++i) {
      const byteSelectedPromise = getEventPromise<ByteSelectedEvent>(viewer, 'byteSelected');
      byteCells[i].click();
      const byteSelectedEvent = await byteSelectedPromise;
      visitedByteValue.push(byteSelectedEvent.data);
    }

    for (let i = historyLength - 1; i >= 0; --i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);
      backwardButton.click();
    }

    for (let i = 0; i < historyLength; ++i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);

      forwardButton.click();
    }
  });

  it('can turn the page back and forth', async () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_PAGE_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton, forwardButton] = buttons;

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const addressBefore = parseInt(address.value, 16);

    const viewer = getViewer(component);
    let numBytesPerPage = viewer.getNumBytesPerPage();

    forwardButton.click();
    let addressAfter = parseInt(address.value, 16);
    let expectedAddressAfter = addressBefore + numBytesPerPage;
    assert.strictEqual(addressAfter, expectedAddressAfter);

    backwardButton.click();
    addressAfter = parseInt(address.value, 16);
    // The number of bytes per page can change since we render twice: once
    // initially to estimate how much we can fit, and then rendering to fit
    // the assigned size, so we need to re-retrieve it.
    numBytesPerPage = viewer.getNumBytesPerPage();
    expectedAddressAfter -= numBytesPerPage;
    assert.strictEqual(addressAfter, Math.max(0, expectedAddressAfter));
  });

  it('synchronizes selected addresses in navigator and viewer', async () => {
    const {component, data} = setUpComponent();
    const navigator = getNavigator(component);

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const viewer = getViewer(component);
    const selectedByte = getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);

    const actualByteValue = parseInt(selectedByte.innerText, 16);
    const expectedByteValue = data.memory[parseInt(address.value, 16)];
    assert.strictEqual(actualByteValue, expectedByteValue);
  });

  it('formats a hexadecimal number', async () => {
    const number = 23;
    assert.strictEqual(toHexString(number, 0), '17');
  });

  it('formats a hexadecimal number and adds padding', async () => {
    const decimalNumber = 23;
    assert.strictEqual(toHexString(decimalNumber, 5), '00017');
  });
});
