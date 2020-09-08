// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//  Copyright (C) 2012 Google Inc. All rights reserved.

//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:

//  1.  Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//  2.  Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//  3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
//      its contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.

//  THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {contrastRatio, rgbaToHsla} from '../front_end/common/ColorUtils.js';

import {Bounds, createElement} from './common.js';  // eslint-disable-line no-unused-vars
import {buildPath, drawRulers, emptyBounds} from './highlight_common.js';
import {drawLayoutGridHighlight} from './highlight_grid_common.js';

const lightGridColor = 'rgba(0,0,0,0.2)';
const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

/** @typedef {!Object<string, Array>} */
let AreaPaths;  // eslint-disable-line no-unused-vars

function _drawAxis(context, rulerAtRight, rulerAtBottom) {
  if (window._gridPainted) {
    return;
  }
  window._gridPainted = true;

  context.save();

  const pageFactor = pageZoomFactor * pageScaleFactor * emulationScaleFactor;
  const scrollX = window.scrollX * pageScaleFactor;
  const scrollY = window.scrollY * pageScaleFactor;
  function zoom(x) {
    return Math.round(x * pageFactor);
  }
  function unzoom(x) {
    return Math.round(x / pageFactor);
  }

  const width = canvasWidth / pageFactor;
  const height = canvasHeight / pageFactor;

  const gridSubStep = 5;
  const gridStep = 50;

  {
    // Draw X grid background
    context.save();
    context.fillStyle = gridBackgroundColor;
    if (rulerAtBottom) {
      context.fillRect(0, zoom(height) - 15, zoom(width), zoom(height));
    } else {
      context.fillRect(0, 0, zoom(width), 15);
    }

    // Clip out backgrounds intersection
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'red';
    if (rulerAtRight) {
      context.fillRect(zoom(width) - 15, 0, zoom(width), zoom(height));
    } else {
      context.fillRect(0, 0, 15, zoom(height));
    }
    context.restore();

    // Draw Y grid background
    context.fillStyle = gridBackgroundColor;
    if (rulerAtRight) {
      context.fillRect(zoom(width) - 15, 0, zoom(width), zoom(height));
    } else {
      context.fillRect(0, 0, 15, zoom(height));
    }
  }

  context.lineWidth = 1;
  context.strokeStyle = darkGridColor;
  context.fillStyle = darkGridColor;
  {
    // Draw labels.
    context.save();
    context.translate(-scrollX, 0.5 - scrollY);
    const maxY = height + unzoom(scrollY);
    for (let y = 2 * gridStep; y < maxY; y += 2 * gridStep) {
      context.save();
      context.translate(scrollX, zoom(y));
      context.rotate(-Math.PI / 2);
      context.fillText(y, 2, rulerAtRight ? zoom(width) - 7 : 13);
      context.restore();
    }
    context.translate(0.5, -0.5);
    const maxX = width + unzoom(scrollX);
    for (let x = 2 * gridStep; x < maxX; x += 2 * gridStep) {
      context.save();
      context.fillText(x, zoom(x) + 2, rulerAtBottom ? scrollY + zoom(height) - 7 : scrollY + 13);
      context.restore();
    }
    context.restore();
  }

  {
    // Draw vertical grid
    context.save();
    if (rulerAtRight) {
      context.translate(zoom(width), 0);
      context.scale(-1, 1);
    }
    context.translate(-scrollX, 0.5 - scrollY);
    const maxY = height + unzoom(scrollY);
    for (let y = gridStep; y < maxY; y += gridStep) {
      context.beginPath();
      context.moveTo(scrollX, zoom(y));
      const markLength = (y % (gridStep * 2)) ? 5 : 8;
      context.lineTo(scrollX + markLength, zoom(y));
      context.stroke();
    }
    context.strokeStyle = lightGridColor;
    for (let y = gridSubStep; y < maxY; y += gridSubStep) {
      if (!(y % gridStep)) {
        continue;
      }
      context.beginPath();
      context.moveTo(scrollX, zoom(y));
      context.lineTo(scrollX + gridSubStep, zoom(y));
      context.stroke();
    }
    context.restore();
  }

  {
    // Draw horizontal grid
    context.save();
    if (rulerAtBottom) {
      context.translate(0, zoom(height));
      context.scale(1, -1);
    }
    context.translate(0.5 - scrollX, -scrollY);
    const maxX = width + unzoom(scrollX);
    for (let x = gridStep; x < maxX; x += gridStep) {
      context.beginPath();
      context.moveTo(zoom(x), scrollY);
      const markLength = (x % (gridStep * 2)) ? 5 : 8;
      context.lineTo(zoom(x), scrollY + markLength);
      context.stroke();
    }
    context.strokeStyle = lightGridColor;
    for (let x = gridSubStep; x < maxX; x += gridSubStep) {
      if (!(x % gridStep)) {
        continue;
      }
      context.beginPath();
      context.moveTo(zoom(x), scrollY);
      context.lineTo(zoom(x), scrollY + gridSubStep);
      context.stroke();
    }
    context.restore();
  }

  context.restore();
}

export function doReset() {
  document.getElementById('tooltip-container').removeChildren();
  document.getElementById('grid-label-container').removeChildren();
  window._gridPainted = false;
}

/**
 * @param {!String} hexa
 * @return {!Array<number>}
 */
function parseHexa(hexa) {
  return hexa.match(/#(\w\w)(\w\w)(\w\w)(\w\w)/).slice(1).map(c => parseInt(c, 16) / 255);
}

/**
 * @param {!String} hexa
 * @param {!String} colorFormat
 * @return {!String}
 */
function formatColor(hexa, colorFormat) {
  if (colorFormat === 'rgb') {
    const [r, g, b, a] = parseHexa(hexa);
    // rgb(r g b [ / a])
    return `rgb(${(r * 255).toFixed()} ${(g * 255).toFixed()} ${(b * 255).toFixed()}${
        a === 1 ? '' : ' / ' + Math.round(a * 100) / 100})`;
  }

  if (colorFormat === 'hsl') {
    const [h, s, l, a] = rgbaToHsla(parseHexa(hexa));
    // hsl(hdeg s l [ / a])
    return `hsl(${Math.round(h * 360)}deg ${Math.round(s * 100)} ${Math.round(l * 100)}${
        a === 1 ? '' : ' / ' + Math.round(a * 100) / 100})`;
  }

  if (hexa.endsWith('FF')) {
    // short hex if no alpha
    return hexa.substr(0, 7);
  }

  return hexa;
}

function computeIsLargeFont(contrast) {
  const boldWeights = new Set(['bold', 'bolder', '600', '700', '800', '900']);

  const fontSizePx = parseFloat(contrast.fontSize.replace('px', ''));
  const isBold = boldWeights.has(contrast.fontWeight);

  const fontSizePt = fontSizePx * 72 / 96;
  if (isBold) {
    return fontSizePt >= 14;
  }
  return fontSizePt >= 18;
}

/**
 * Determine the layout type of the highlighted element based on the config.
 * @param {Object} elementInfo The element information, part of the config object passed to drawHighlight
 * @return {String|null} The layout type of the object, or null if none was found
 */
function _getElementLayoutType(elementInfo) {
  // TODO(patrickbrosset): elementInfo.layoutObjectName can be any of the values returned by
  // LayoutObject.GetName on the backend. For now we only care about grid. In the future, modify this code
  // to allow other layout object types. See CRBug 1099682.
  if (elementInfo.layoutObjectName && elementInfo.layoutObjectName.endsWith('Grid')) {
    return 'grid';
  }

  return null;
}

/**
 * Create the DOM node that displays the description of the highlighted element
 * @param {Object} elementInfo The element information, part of the config object passed to drawHighlight
 * @param {String} colorFormat
 * @return {DOMNode}
 */
function _createElementDescription(elementInfo, colorFormat) {
  const elementInfoElement = createElement('div', 'element-info');
  const elementInfoHeaderElement = elementInfoElement.createChild('div', 'element-info-header');

  const layoutType = _getElementLayoutType(elementInfo);
  if (layoutType) {
    elementInfoHeaderElement.createChild('div', `element-layout-type ${layoutType}`);
  }
  const descriptionElement = elementInfoHeaderElement.createChild('div', 'element-description monospace');
  const tagNameElement = descriptionElement.createChild('span', 'material-tag-name');
  tagNameElement.textContent = elementInfo.tagName;
  const nodeIdElement = descriptionElement.createChild('span', 'material-node-id');
  const maxLength = 80;
  nodeIdElement.textContent = elementInfo.idValue ? '#' + elementInfo.idValue.trimEnd(maxLength) : '';
  nodeIdElement.classList.toggle('hidden', !elementInfo.idValue);

  const classNameElement = descriptionElement.createChild('span', 'material-class-name');
  if (nodeIdElement.textContent.length < maxLength) {
    classNameElement.textContent = (elementInfo.className || '').trimEnd(maxLength - nodeIdElement.textContent.length);
  }
  classNameElement.classList.toggle('hidden', !elementInfo.className);
  const dimensionsElement = elementInfoHeaderElement.createChild('div', 'dimensions');
  dimensionsElement.createChild('span', 'material-node-width').textContent =
      Math.round(elementInfo.nodeWidth * 100) / 100;
  dimensionsElement.createTextChild('\u00d7');
  dimensionsElement.createChild('span', 'material-node-height').textContent =
      Math.round(elementInfo.nodeHeight * 100) / 100;

  const style = elementInfo.style || {};
  let elementInfoBodyElement;

  if (elementInfo.isLockedAncestor) {
    addTextRow('Showing the locked ancestor', '');
  }

  const color = style['color'];
  if (color && color !== '#00000000') {
    addColorRow('Color', color, colorFormat);
  }

  const fontFamily = style['font-family'];
  const fontSize = style['font-size'];
  if (fontFamily && fontSize !== '0px') {
    addTextRow('Font', `${fontSize} ${fontFamily}`);
  }

  const bgcolor = style['background-color'];
  if (bgcolor && bgcolor !== '#00000000') {
    addColorRow('Background', bgcolor, colorFormat);
  }

  const margin = style['margin'];
  if (margin && margin !== '0px') {
    addTextRow('Margin', margin);
  }

  const padding = style['padding'];
  if (padding && padding !== '0px') {
    addTextRow('Padding', padding);
  }

  const cbgColor = elementInfo.contrast ? elementInfo.contrast.backgroundColor : null;
  const hasContrastInfo = color && color !== '#00000000' && cbgColor && cbgColor !== '#00000000';

  if (elementInfo.showAccessibilityInfo) {
    addSection('Accessibility');

    if (hasContrastInfo) {
      addContrastRow(style['color'], elementInfo.contrast);
    }

    addTextRow('Name', elementInfo.accessibleName);
    addTextRow('Role', elementInfo.accessibleRole);
    addIconRow(
        'Keyboard-focusable',
        elementInfo.isKeyboardFocusable ? 'a11y-icon a11y-icon-ok' : 'a11y-icon a11y-icon-not-ok');
  }

  function ensureElementInfoBody() {
    if (!elementInfoBodyElement) {
      elementInfoBodyElement = elementInfoElement.createChild('div', 'element-info-body');
    }
  }

  function addSection(name) {
    ensureElementInfoBody();
    const rowElement = elementInfoBodyElement.createChild('div', 'element-info-row element-info-section');
    const nameElement = rowElement.createChild('div', 'section-name');
    nameElement.textContent = name;
    rowElement.createChild('div', 'separator-container').createChild('div', 'separator');
  }

  function addRow(name, rowClassName, valueClassName) {
    ensureElementInfoBody();
    const rowElement = elementInfoBodyElement.createChild('div', 'element-info-row');
    if (rowClassName) {
      rowElement.classList.add(rowClassName);
    }
    const nameElement = rowElement.createChild('div', 'element-info-name');
    nameElement.textContent = name;
    rowElement.createChild('div', 'element-info-gap');
    return rowElement.createChild('div', valueClassName || '');
  }

  function addIconRow(name, value) {
    addRow(name, '', 'element-info-value-icon').createChild('div', value);
  }

  function addTextRow(name, value) {
    addRow(name, '', 'element-info-value-text').createTextChild(value);
  }

  function addColorRow(name, color, colorFormat) {
    const valueElement = addRow(name, '', 'element-info-value-color');
    const swatch = valueElement.createChild('div', 'color-swatch');
    const inner = swatch.createChild('div', 'color-swatch-inner');
    inner.style.backgroundColor = color;
    valueElement.createTextChild(formatColor(color, colorFormat));
  }

  function addContrastRow(fgColor, contrast) {
    const ratio = contrastRatio(parseHexa(fgColor), parseHexa(contrast.backgroundColor));
    const threshold = computeIsLargeFont(contrast) ? 3.0 : 4.5;
    const valueElement = addRow('Contrast', '', 'element-info-value-contrast');
    const sampleText = valueElement.createChild('div', 'contrast-text');
    sampleText.style.color = fgColor;
    sampleText.style.backgroundColor = contrast.backgroundColor;
    sampleText.textContent = 'Aa';
    const valueSpan = valueElement.createChild('span');
    valueSpan.textContent = Math.round(ratio * 100) / 100;
    valueElement.createChild('div', ratio < threshold ? 'a11y-icon a11y-icon-warning' : 'a11y-icon a11y-icon-ok');
  }

  return elementInfoElement;
}

/**
 * @param {Object} elementInfo The highlight config object passed to drawHighlight
 * @param {String} colorFormat
 * @param {Object} bounds
 */
function _drawElementTitle(elementInfo, colorFormat, bounds) {
  // Get the tooltip container and empty it, there can only be one tooltip displayed at the same time.
  const tooltipContainer = document.getElementById('tooltip-container');
  tooltipContainer.removeChildren();

  // Create the necessary wrappers.
  const wrapper = tooltipContainer.createChild('div');
  const tooltipContent = wrapper.createChild('div', 'tooltip-content');

  // Create the tooltip content and append it.
  const tooltip = _createElementDescription(elementInfo, colorFormat);
  tooltipContent.appendChild(tooltip);

  const titleWidth = tooltipContent.offsetWidth;
  const titleHeight = tooltipContent.offsetHeight;
  const arrowHalfWidth = 8;
  const pageMargin = 2;
  const arrowWidth = arrowHalfWidth * 2;
  const arrowInset = arrowHalfWidth + 2;

  const containerMinX = pageMargin + arrowInset;
  const containerMaxX = canvasWidth - pageMargin - arrowInset - arrowWidth;

  // Left align arrow to the tooltip but ensure it is pointing to the element.
  // Center align arrow if the inspected element bounds are too narrow.
  const boundsAreTooNarrow = bounds.maxX - bounds.minX < arrowWidth + 2 * arrowInset;
  let arrowX;
  if (boundsAreTooNarrow) {
    arrowX = (bounds.minX + bounds.maxX) * 0.5 - arrowHalfWidth;
  } else {
    const xFromLeftBound = bounds.minX + arrowInset;
    const xFromRightBound = bounds.maxX - arrowInset - arrowWidth;
    if (xFromLeftBound > containerMinX && xFromLeftBound < containerMaxX) {
      arrowX = xFromLeftBound;
    } else {
      arrowX = Number.constrain(containerMinX, xFromLeftBound, xFromRightBound);
    }
  }
  // Hide arrow if element is completely off the sides of the page.
  const arrowHidden = arrowX < containerMinX || arrowX > containerMaxX;

  let boxX = arrowX - arrowInset;
  boxX = Number.constrain(boxX, pageMargin, canvasWidth - titleWidth - pageMargin);

  let boxY = bounds.minY - arrowHalfWidth - titleHeight;
  let onTop = true;
  if (boxY < 0) {
    boxY = Math.min(canvasHeight - titleHeight, bounds.maxY + arrowHalfWidth);
    onTop = false;
  } else if (bounds.minY > canvasHeight) {
    boxY = canvasHeight - arrowHalfWidth - titleHeight;
  }

  // If tooltip intersects with the bounds, hide it.
  // Allow bounds to contain the box though for the large elements like <body>.
  const includes = boxX >= bounds.minX && boxX + titleWidth <= bounds.maxX && boxY >= bounds.minY &&
      boxY + titleHeight <= bounds.maxY;
  const overlaps =
      boxX < bounds.maxX && boxX + titleWidth > bounds.minX && boxY < bounds.maxY && boxY + titleHeight > bounds.minY;
  if (overlaps && !includes) {
    tooltipContent.style.display = 'none';
    return;
  }

  tooltipContent.style.top = boxY + 'px';
  tooltipContent.style.left = boxX + 'px';
  tooltipContent.style.setProperty('--arrow-visibility', (arrowHidden || includes) ? 'hidden' : 'visible');
  if (arrowHidden) {
    return;
  }

  tooltipContent.style.setProperty('--arrow', onTop ? 'var(--arrow-down)' : 'var(--arrow-up)');
  tooltipContent.style.setProperty('--shadow-direction', onTop ? 'var(--shadow-up)' : 'var(--shadow-down)');
  // When tooltip is on-top remove 1px from the arrow's top value to get rid of whitespace produced by the tooltip's border.
  tooltipContent.style.setProperty('--arrow-top', (onTop ? titleHeight - 1 : -arrowHalfWidth) + 'px');
  tooltipContent.style.setProperty('--arrow-left', (arrowX - boxX) + 'px');
}

function drawPath(context, commands, fillColor, outlineColor, bounds) {
  context.save();
  const path = buildPath(commands, bounds);
  if (fillColor) {
    context.fillStyle = fillColor;
    context.fill(path);
  }
  if (outlineColor) {
    context.lineWidth = 2;
    context.strokeStyle = outlineColor;
    context.stroke(path);
  }
  context.restore();
  return path;
}

export function drawHighlight(highlight, context) {
  context = context || window.context;
  context.save();

  const bounds = emptyBounds();

  for (let paths = highlight.paths.slice(); paths.length;) {
    const path = paths.pop();
    context.save();
    drawPath(context, path.path, path.fillColor, path.outlineColor, bounds);
    if (paths.length) {
      context.globalCompositeOperation = 'destination-out';
      drawPath(context, paths[paths.length - 1].path, 'red', null, bounds);
    }
    context.restore();
  }
  context.restore();

  context.save();

  const rulerAtRight =
      highlight.paths.length && highlight.showRulers && bounds.minX < 20 && bounds.maxX + 20 < canvasWidth;
  const rulerAtBottom =
      highlight.paths.length && highlight.showRulers && bounds.minY < 20 && bounds.maxY + 20 < canvasHeight;

  if (highlight.showRulers) {
    _drawAxis(context, rulerAtRight, rulerAtBottom);
  }

  if (highlight.paths.length) {
    if (highlight.showExtensionLines) {
      drawRulers(context, bounds, rulerAtRight, rulerAtBottom);
    }

    if (highlight.elementInfo) {
      _drawElementTitle(highlight.elementInfo, highlight.colorFormat, bounds);
    }
  }
  if (highlight.gridInfo) {
    for (const grid of highlight.gridInfo) {
      drawLayoutGridHighlight(grid, context);
    }
  }
  context.restore();

  return {bounds: bounds};
}
