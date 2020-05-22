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

import {createElement} from './common.js';

const lightGridColor = 'rgba(0,0,0,0.2)';
const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

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
 * TODO(alexrudenko): import this and other color helpers from DevTools
 * @param {!Array<number>} rgba
 * @return {!Array<number>}
 */
function rgbaToHsla(rgba) {
  const [r, g, b] = rgba;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;

  let h;
  if (min === max) {
    h = 0;
  } else if (r === max) {
    h = ((1 / 6 * (g - b) / diff) + 1) % 1;
  } else if (g === max) {
    h = (1 / 6 * (b - r) / diff) + 1 / 3;
  } else {
    h = (1 / 6 * (r - g) / diff) + 2 / 3;
  }

  const l = 0.5 * sum;

  let s;
  if (l === 0) {
    s = 0;
  } else if (l === 1) {
    s = 0;
  } else if (l <= 0.5) {
    s = diff / sum;
  } else {
    s = diff / (2 - sum);
  }

  return [h, s, l, rgba[3]];
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

/**
* Calculate the contrast ratio between a foreground and a background color.
* Returns the ratio to 1, for example for two colors with a contrast ratio of 21:1,
* this function will return 21.
* See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
* @param {!Array<number>} fgRGBA
* @param {!Array<number>} bgRGBA
* @return {number}
*/
function contrastRatio(fgRGBA, bgRGBA) {
  // If we have a semi-transparent background color over an unknown
  // background, draw the line for the "worst case" scenario: where
  // the unknown background is the same color as the text.
  bgRGBA = blendColors(bgRGBA, fgRGBA);
  const fgLuminance = luminance(blendColors(fgRGBA, bgRGBA));
  const bgLuminance = luminance(bgRGBA);
  const result = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
  return result.toFixed(2);

  /**
    * Calculate the luminance of this color using the WCAG algorithm.
    * See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
    * @param {!Array<number>} rgba
    * @return {number}
    */
  function luminance(rgba) {
    const rSRGB = rgba[0];
    const gSRGB = rgba[1];
    const bSRGB = rgba[2];

    const r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow(((rSRGB + 0.055) / 1.055), 2.4);
    const g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow(((gSRGB + 0.055) / 1.055), 2.4);
    const b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow(((bSRGB + 0.055) / 1.055), 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
    * Combine the two given color according to alpha blending.
    * @param {!Array<number>} fgRGBA
    * @param {!Array<number>} bgRGBA
    * @return {!Array<number>}
    */
  function blendColors(fgRGBA, bgRGBA) {
    const alpha = fgRGBA[3];
    return [
      ((1 - alpha) * bgRGBA[0]) + (alpha * fgRGBA[0]), ((1 - alpha) * bgRGBA[1]) + (alpha * fgRGBA[1]),
      ((1 - alpha) * bgRGBA[2]) + (alpha * fgRGBA[2]), alpha + (bgRGBA[3] * (1 - alpha))
    ];
  }
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

function _createElementDescription(elementInfo, colorFormat) {
  const elementInfoElement = createElement('div', 'element-info');
  const elementInfoHeaderElement = elementInfoElement.createChild('div', 'element-info-header');
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

function _drawElementTitle(elementInfo, bounds, colorFormat) {
  const tooltipContainer = document.getElementById('tooltip-container');
  tooltipContainer.removeChildren();
  _createMaterialTooltip(tooltipContainer, bounds, _createElementDescription(elementInfo, colorFormat), true);
}

function _createMaterialTooltip(parentElement, bounds, contentElement, withArrow) {
  const tooltipContainer = parentElement.createChild('div');
  const tooltipContent = tooltipContainer.createChild('div', 'tooltip-content');
  tooltipContent.appendChild(contentElement);

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
  const arrowHidden = !withArrow || arrowX < containerMinX || arrowX > containerMaxX;

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

  tooltipContent.style.setProperty('--arrow', onTop ? 'var(--arrow-up)' : 'var(--arrow-down)');
  tooltipContent.style.setProperty('--shadow-direction', onTop ? 'var(--shadow-up)' : 'var(--shadow-down)');
  tooltipContent.style.setProperty('--arrow-top', (onTop ? titleHeight : -arrowHalfWidth) + 'px');
  tooltipContent.style.setProperty('--arrow-left', (arrowX - boxX) + 'px');
}

function _drawRulers(context, bounds, rulerAtRight, rulerAtBottom, color, dash) {
  context.save();
  const width = canvasWidth;
  const height = canvasHeight;
  context.strokeStyle = color || 'rgba(128, 128, 128, 0.3)';
  context.lineWidth = 1;
  context.translate(0.5, 0.5);
  if (dash) {
    context.setLineDash([3, 3]);
  }

  if (rulerAtRight) {
    for (const y in bounds.rightmostXForY) {
      context.beginPath();
      context.moveTo(width, y);
      context.lineTo(bounds.rightmostXForY[y], y);
      context.stroke();
    }
  } else {
    for (const y in bounds.leftmostXForY) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(bounds.leftmostXForY[y], y);
      context.stroke();
    }
  }

  if (rulerAtBottom) {
    for (const x in bounds.bottommostYForX) {
      context.beginPath();
      context.moveTo(x, height);
      context.lineTo(x, bounds.topmostYForX[x]);
      context.stroke();
    }
  } else {
    for (const x in bounds.topmostYForX) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, bounds.topmostYForX[x]);
      context.stroke();
    }
  }

  context.restore();
}

function buildPath(commands, bounds) {
  let commandsIndex = 0;

  function extractPoints(count) {
    const points = [];

    for (let i = 0; i < count; ++i) {
      const x = Math.round(commands[commandsIndex++] * emulationScaleFactor);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minX = Math.min(bounds.minX, x);

      const y = Math.round(commands[commandsIndex++] * emulationScaleFactor);
      bounds.maxY = Math.max(bounds.maxY, y);
      bounds.minY = Math.min(bounds.minY, y);

      bounds.leftmostXForY[y] = Math.min(bounds.leftmostXForY[y] || Number.MAX_VALUE, x);
      bounds.rightmostXForY[y] = Math.max(bounds.rightmostXForY[y] || Number.MIN_VALUE, x);
      bounds.topmostYForX[x] = Math.min(bounds.topmostYForX[x] || Number.MAX_VALUE, y);
      bounds.bottommostYForX[x] = Math.max(bounds.bottommostYForX[x] || Number.MIN_VALUE, y);
      points.push(x, y);
    }
    return points;
  }

  const commandsLength = commands.length;
  const path = new Path2D();
  while (commandsIndex < commandsLength) {
    switch (commands[commandsIndex++]) {
      case 'M':
        path.moveTo.apply(path, extractPoints(1));
        break;
      case 'L':
        path.lineTo.apply(path, extractPoints(1));
        break;
      case 'C':
        path.bezierCurveTo.apply(path, extractPoints(3));
        break;
      case 'Q':
        path.quadraticCurveTo.apply(path, extractPoints(2));
        break;
      case 'Z':
        path.closePath();
        break;
    }
  }
  path.closePath();
  return path;
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

function emptyBounds() {
  const bounds = {
    minX: Number.MAX_VALUE,
    minY: Number.MAX_VALUE,
    maxX: Number.MIN_VALUE,
    maxY: Number.MIN_VALUE,
    leftmostXForY: {},
    rightmostXForY: {},
    topmostYForX: {},
    bottommostYForX: {}
  };
  return bounds;
}

function _drawLayoutGridHighlight(highlight, context) {
  // Draw Grid border
  if (highlight.gridHighlightConfig.gridBorderColor) {
    context.save();
    context.translate(0.5, 0.5);
    context.lineWidth = 0;
    if (highlight.gridHighlightConfig.gridBorderDash) {
      context.setLineDash([3, 3]);
    }
    context.strokeStyle = highlight.gridHighlightConfig.gridBorderColor;
    context.stroke(buildPath(highlight.gridBorder, emptyBounds()));
    context.restore();
  }

  // Draw Cell Border
  if (highlight.gridHighlightConfig.cellBorderColor) {
    const rowBounds = emptyBounds();
    const columnBounds = emptyBounds();
    const rowPath = buildPath(highlight.rows, rowBounds);
    const columnPath = buildPath(highlight.columns, columnBounds);
    context.save();
    context.translate(0.5, 0.5);
    if (highlight.gridHighlightConfig.cellBorderDash) {
      context.setLineDash([3, 3]);
    }
    context.lineWidth = 0;
    context.strokeStyle = highlight.gridHighlightConfig.cellBorderColor;

    context.save();
    context.clip(columnPath);
    context.stroke(rowPath);
    context.restore();

    context.save();
    context.clip(rowPath);
    context.stroke(columnPath);
    context.restore();

    context.restore();

    if (highlight.gridHighlightConfig.showGridExtensionLines) {
      // Extend row gap lines left/up.
      _drawRulers(
          context, rowBounds, /* rulerAtRight */ false, /* rulerAtBottom */ false,
          highlight.gridHighlightConfig.cellBorderColor, highlight.gridHighlightConfig.cellBorderDash);
      // Extend row gap right/down.
      _drawRulers(
          context, rowBounds, /* rulerAtRight */ true, /* rulerAtBottom */ true,
          highlight.gridHighlightConfig.cellBorderColor, highlight.gridHighlightConfig.cellBorderDash);
      // Extend column lines left/up.
      _drawRulers(
          context, columnBounds, /* rulerAtRight */ false, /* rulerAtBottom */ false,
          highlight.gridHighlightConfig.cellBorderColor, highlight.gridHighlightConfig.cellBorderDash);
      // Extend column right/down.
      _drawRulers(
          context, columnBounds, /* rulerAtRight */ true, /* rulerAtBottom */ true,
          highlight.gridHighlightConfig.cellBorderColor, highlight.gridHighlightConfig.cellBorderDash);
    }
  }

  // Row Gaps
  if (highlight.gridHighlightConfig.rowGapColor) {
    context.save();
    context.translate(0.5, 0.5);
    context.lineWidth = 0;
    context.fillStyle = highlight.gridHighlightConfig.rowGapColor;
    const bounds = emptyBounds();
    const path = buildPath(highlight.rowGaps, bounds);
    if (highlight.gridHighlightConfig.rowHatchColor) {
      hatchFillPath(context, path, bounds, 10, highlight.gridHighlightConfig.rowHatchColor, /* flipDirection */ true);
    }
    context.fill(path);
    context.restore();
  }

  // Column Gaps
  if (highlight.gridHighlightConfig.columnGapColor) {
    context.save();
    context.translate(0.5, 0.5);
    context.lineWidth = 0;
    context.fillStyle = highlight.gridHighlightConfig.columnGapColor;
    const bounds = emptyBounds();
    const path = buildPath(highlight.columnGaps, bounds);
    if (highlight.gridHighlightConfig.columnHatchColor) {
      hatchFillPath(context, path, bounds, 10, highlight.gridHighlightConfig.columnHatchColor);
    }
    context.fill(path);
    context.restore();
  }
}

/**
 * Draw line hatching at a 45 degree angle for a given
 * path.
 *   __________
 *   |\  \  \ |
 *   | \  \  \|
 *   |  \  \  |
 *   |\  \  \ |
 *   **********
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Path2D} path
 * @param {Object} bounds
 * @param {delta} delta - vertical gap between hatching lines in pixels
 * @param {string} color
 * @param {boolean=} flipDirection - lines are drawn from top right to bottom left
 *
 */
function hatchFillPath(context, path, bounds, delta, color, flipDirection) {
  const dx = bounds.maxX - bounds.minX;
  const dy = bounds.maxY - bounds.minY;
  context.rect(bounds.minX, bounds.minY, dx, dy);
  context.save();
  context.clip(path);
  context.setLineDash([5, 3]);
  const majorAxis = Math.max(dx, dy);
  context.strokeStyle = color;
  if (flipDirection) {
    for (let i = -majorAxis; i < majorAxis; i += delta) {
      context.beginPath();
      context.moveTo(bounds.maxX - i, bounds.minY);
      context.lineTo(bounds.maxX - dy - i, bounds.maxY);
      context.stroke();
    }
  } else {
    for (let i = -majorAxis; i < majorAxis; i += delta) {
      context.beginPath();
      context.moveTo(i + bounds.minX, bounds.minY);
      context.lineTo(dy + i + bounds.minX, bounds.maxY);
      context.stroke();
    }
  }
  context.restore();
}

function clipLayoutGridCells(highlight, context) {
  // It may seem simpler to, before drawing the desired path, call context.clip()
  // with the rows and then with the columns. However, the 2nd context.clip() call
  // would try to find the intersection of the rows and columns, which is way too
  // expensive if the grid is huge, e.g. a 1000x1000 grid has 1M cells.
  // Therefore, it's better to draw the path first, set the globalCompositeOperation
  // so that the existing canvas content is kept where it overlaps with new content,
  // and then draw the rows and columns.
  if (highlight.gridInfo) {
    for (const grid of highlight.gridInfo) {
      if (!grid.isPrimaryGrid) {
        continue;
      }
      context.save();
      context.globalCompositeOperation = 'destination-in';
      drawPath(context, grid.rows, 'red', null, emptyBounds());
      drawPath(context, grid.columns, 'red', null, emptyBounds());
      context.restore();
    }
  }
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
    // Clip content quad using the data grid cells info to create white stripes.
    if (path.name === 'content') {
      clipLayoutGridCells(highlight, context);
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
      _drawRulers(context, bounds, rulerAtRight, rulerAtBottom);
    }

    if (highlight.elementInfo) {
      _drawElementTitle(highlight.elementInfo, bounds, highlight.colorFormat);
    }
  }
  if (highlight.gridInfo) {
    for (const grid of highlight.gridInfo) {
      _drawLayoutGridHighlight(grid, context);
    }
  }
  context.restore();

  return {bounds: bounds};
}
