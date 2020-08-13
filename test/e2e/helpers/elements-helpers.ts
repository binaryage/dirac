// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {performance} from 'perf_hooks';
import * as puppeteer from 'puppeteer';

import {$$, click, getBrowserAndPages, step, timeout, waitFor, waitForFunction} from '../../shared/helper.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';
const CSS_PROPERTY_NAME_SELECTOR = '.webkit-css-property';
const CSS_PROPERTY_SWATCH_SELECTOR = '.color-swatch-inner';
const CSS_STYLE_RULE_SELECTOR = '[aria-label*="css selector"]';
const COMPUTED_PROPERTY_SELECTOR = 'devtools-computed-style-property';
const COMPUTED_STYLES_PANEL_SELECTOR = '[aria-label="Computed panel"]';
const COMPUTED_STYLES_SHOW_ALL_SELECTOR = '[aria-label="Show all"]';
const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
const SECTION_SUBTITLE_SELECTOR = '.styles-section-subtitle';
const MORE_TABS_SELECTOR = '[aria-label="More tabs"]';
const LAYOUT_PANE_TAB_SELECTOR = '[aria-label="Layout"]';
const INACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Enable grid mode"]';
const ACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Disable grid mode"]';
const ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR = '.elements input[type=checkbox]';

export const openLayoutPane = async () => {
  await step('Open Layout pane', async () => {
    await waitFor(MORE_TABS_SELECTOR);
    await click(MORE_TABS_SELECTOR);
    await waitFor(LAYOUT_PANE_TAB_SELECTOR);
    await click(LAYOUT_PANE_TAB_SELECTOR);
  });
};

export const assertInactiveAdorners = async (expectedAdorners: string[]) => {
  await step('Assert inactive adorners in Elements panel', async () => {
    const actualAdorners = await $$(INACTIVE_GRID_ADORNER_SELECTOR);
    const actualAdornersContent = await Promise.all(actualAdorners.map(n => n.evaluate(node => node.textContent)));
    assert.deepEqual(
        actualAdornersContent, expectedAdorners,
        `did not have exactly ${expectedAdorners.length} adorner(s) in the inactive state`);
  });
};

export const assertActiveAdorners = async (expectedAdorners: string[]) => {
  await step('Assert active adorners in Elements panel', async () => {
    const actualAdorners = await $$(ACTIVE_GRID_ADORNER_SELECTOR);
    const actualAdornersContent = await Promise.all(actualAdorners.map(n => n.evaluate(node => node.textContent)));
    assert.deepEqual(
        actualAdornersContent, expectedAdorners,
        `did not have exactly ${expectedAdorners.length} adorner(s) in the inactive state`);
  });
};

export const toggleElementCheckboxInLayoutPane = async () => {
  await step('Click element checkbox in Layout pane', async () => {
    await waitFor(ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR);
    await click(ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR);
  });
};

export const assertContentOfSelectedElementsNode = async (expectedTextContent: string) => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.strictEqual(selectedTextContent, expectedTextContent);
};

/**
 * Gets the text content of the currently selected element.
 */
export const getContentOfSelectedNode = async () => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  return await selectedNode.evaluate(node => node.textContent as string);
};

export const waitForSelectedNodeChange = async (initialValue: string, maxTotalTimeout = 1000) => {
  if (maxTotalTimeout === 0) {
    maxTotalTimeout = Number.POSITIVE_INFINITY;
  }

  const start = performance.now();
  do {
    const currentContent = await getContentOfSelectedNode();
    if (currentContent !== initialValue) {
      return currentContent;
    }

    await timeout(30);

  } while (performance.now() - start < maxTotalTimeout);

  throw new Error(`Selected element did not change in ${maxTotalTimeout}`);
};

export const assertSelectedElementsNodeTextIncludes = async (expectedTextContent: string) => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent as string);
  assert.include(selectedTextContent, expectedTextContent);
};

export const waitForSelectedTreeElementSelectorWithTextcontent = async (expectedTextContent: string) => {
  await waitForFunction(async () => {
    const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForChildrenOfSelectedElementNode = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const focusElementsTree = async () => {
  await click(SELECTED_TREE_ELEMENT_SELECTOR);
};

export const navigateToSidePane = async (paneName: string) => {
  await click(`[aria-label="${paneName}"]`);
  await waitFor(`[aria-label="${paneName} panel"]`);
};

export const waitForElementsStyleSection = async () => {
  // Wait for the file to be loaded and selectors to be shown
  await waitFor('.styles-selector');
};

export const waitForElementsComputedSection = async () => {
  await waitFor(COMPUTED_PROPERTY_SELECTOR);
};

export const getContentOfComputedPane = async () => {
  const pane = await waitFor('.computed-properties');
  const tree = await waitFor('.tree-outline', pane);
  return await tree.evaluate(node => node.textContent as string);
};

export const waitForComputedPaneChange = async (initialValue: string) => {
  await waitForFunction(async () => {
    const value = await getContentOfComputedPane();
    return value !== initialValue;
  });
};

export const getAllPropertiesFromComputedPane = async () => {
  const properties = await $$(COMPUTED_PROPERTY_SELECTOR);
  return (await Promise.all(properties.map(elem => elem.evaluate(node => {
           const name = node.querySelector('[slot="property-name"]');
           const value = node.querySelector('[slot="property-value"]');

           return (!name || !value) ? null : {
             name: name.textContent ? name.textContent.trim().replace(/:$/, '') : '',
             value: value.textContent ? value.textContent.trim().replace(/;$/, '') : '',
           };
         }))))
      .filter(prop => !!prop);
};

export const expandSelectedNodeRecursively = async () => {
  const EXPAND_RECURSIVELY = '[aria-label="Expand recursively"]';

  // Find the selected node, right click.
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  await click(selectedNode, {clickOptions: {button: 'right'}});

  // Wait for the 'expand recursively' option, and click it.
  await waitFor(EXPAND_RECURSIVELY);
  await click(EXPAND_RECURSIVELY);
};

export const forcePseudoState = async (pseudoState: string) => {
  // Open element state pane and wait for it to be loaded asynchronously
  await click('[aria-label="Toggle Element State"]');
  await waitFor(`[aria-label="${pseudoState}"]`);

  await click(`[aria-label="${pseudoState}"]`);
};

export const removePseudoState = async (pseudoState: string) => {
  await click(`[aria-label="${pseudoState}"]`);
};

export const getComputedStylesForDomNode = async (elementSelector: string, styleAttribute: string) => {
  const {target} = getBrowserAndPages();

  return target.evaluate((elementSelector, styleAttribute) => {
    const element = document.querySelector(elementSelector);
    if (!element) {
      throw new Error(`${elementSelector} could not be found`);
    }
    return getComputedStyle(element)[styleAttribute];
  }, elementSelector, styleAttribute);
};

export const toggleShowAllComputedProperties = async () => {
  const initialContent = await getContentOfComputedPane();

  const computedPanel = await waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  const showAllButton = await waitFor(COMPUTED_STYLES_SHOW_ALL_SELECTOR, computedPanel);
  await click(showAllButton);
  await waitForComputedPaneChange(initialContent);
};

export const waitForDomNodeToBeVisible = async (elementSelector: string) => {
  const {target} = getBrowserAndPages();

  // DevTools will force Blink to make the hover shown, so we have
  // to wait for the element to be DOM-visible (e.g. no `display: none;`)
  await target.waitForSelector(elementSelector, {visible: true});
};

export const waitForDomNodeToBeHidden = async (elementSelector: string) => {
  const {target} = getBrowserAndPages();
  await target.waitForSelector(elementSelector, {hidden: true});
};

export const assertGutterDecorationForDomNodeExists = async () => {
  await waitFor('.elements-gutter-decoration');
};

export const getAriaLabelSelectorFromPropertiesSelector = (selectorForProperties: string) =>
    `[aria-label="${selectorForProperties}, css selector"]`;


export const waitForStyleRule = async (expectedSelector: string) => {
  await waitForFunction(async () => {
    const rules = await getDisplayedStyleRules();
    return rules.map(rule => rule.selectorText).includes(expectedSelector);
  });
};

export const getDisplayedStyleRules = async () => {
  const allRuleSelectors = await $$(CSS_STYLE_RULE_SELECTOR);
  const rules = [];
  for (const ruleSelector of allRuleSelectors) {
    const propertyNames = await getDisplayedCSSPropertyNames(ruleSelector);
    const selectorText = await ruleSelector.evaluate(node => {
      const attribute = node.getAttribute('aria-label') || '';
      return attribute.substring(0, attribute.lastIndexOf(', css selector'));
    });
    rules.push({selectorText, propertyNames});
  }

  return rules;
};

export const getDisplayedCSSPropertyNames = async (propertiesSection: puppeteer.ElementHandle<Element>) => {
  const cssPropertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = (await Promise.all(cssPropertyNames.map(
                                 node => node.evaluate(n => n.textContent),
                                 )))
                                .filter(c => !!c);
  return propertyNamesText;
};

export const getStyleRule = (selector: string) => {
  return waitFor(`[aria-label="${selector}, css selector"]`);
};

export const getCSSPropertySwatchStyle = async (ruleSection: puppeteer.ElementHandle<Element>) => {
  const swatches = await $$(CSS_PROPERTY_SWATCH_SELECTOR, ruleSection);
  const style = await swatches[0].evaluate(node => node.getAttribute('style'));
  return (swatches.length, style);
};

export const getStyleSectionSubtitles = async () => {
  const subtitles = await $$(SECTION_SUBTITLE_SELECTOR);
  return Promise.all(subtitles.map(node => node.evaluate(n => n.textContent)));
};

export const getCSSPropertyInRule = async (ruleSection: puppeteer.ElementHandle<Element>, name: string) => {
  const propertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, ruleSection);
  for (const node of propertyNames) {
    const parent =
        await node.evaluateHandle((node, name) => (name === node.textContent) ? node.parentNode : undefined, name);
    if (parent) {
      return parent;
    }
  }
  return undefined;
};

export const focusCSSPropertyValue = async (selector: string, propertyName: string) => {
  await waitForStyleRule(selector);
  const rule = await getStyleRule(selector);
  const property = await getCSSPropertyInRule(rule, propertyName);
  await click('.value', {root: property});
};

export async function editCSSProperty(selector: string, propertyName: string, newValue: string) {
  await focusCSSPropertyValue(selector, propertyName);

  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.type(newValue);
  await frontend.keyboard.press('Enter');
}

export const getBreadcrumbsTextContent = async () => {
  const crumbs = await $$('li.crumb > a');

  const crumbsAsText: string[] =
      await Promise.all(crumbs.map(node => node.evaluate(node => node.textContent as string)));
  return crumbsAsText;
};

export const getSelectedBreadcrumbTextContent = async () => {
  const selectedCrumb = await waitFor('li.crumb.selected > a');
  const text = selectedCrumb.evaluate(node => node.textContent as string);
  return text;
};

export const navigateToElementsTab = async () => {
  // Open Elements panel
  await click('#tab-elements');
  await waitFor(ELEMENTS_PANEL_SELECTOR);
};

export const clickOnFirstLinkInStylesPanel = async () => {
  const stylesPane = await waitFor('div.styles-pane');
  await click('div.styles-section-subtitle span.devtools-link', {root: stylesPane});
};
