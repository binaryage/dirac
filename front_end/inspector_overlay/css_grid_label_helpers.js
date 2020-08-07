// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {AreaBounds, Bounds, Position} from './common.js';  // eslint-disable-line no-unused-vars

/**
 * There are 12 different types of arrows for labels.
 *
 * The first word in an arrow type corresponds to the side of the label
 * container the arrow is on (e.g. 'left' means the arrow is on the left side of
 * the container).
 *
 * The second word defines where, along that side, the arrow is (e.g. 'top' in
 * a 'leftTop' type means the arrow is at the top of the left side of the
 * container).
 *
 * Here are 2 examples to illustrate:
 *
 *              +----+
 * rightMid:    |     >
 *              +----+
 *
 *              +----+
 * bottomRight: |    |
 *              +--  +
 *                  \|
 */
const GridArrowTypes = {
  leftTop: 'left-top',
  leftMid: 'left-mid',
  leftBottom: 'left-bottom',
  topLeft: 'top-left',
  topMid: 'top-mid',
  topRight: 'top-right',
  rightTop: 'right-top',
  rightMid: 'right-mid',
  rightBottom: 'right-bottom',
  bottomLeft: 'bottom-left',
  bottomMid: 'bottom-mid',
  bottomRight: 'bottom-right',
};

// The size (in px) of a label arrow.
const gridArrowWidth = 3;
// The minimum distance (in px) a label has to be from the edge of the viewport
// to avoid being flipped inside the grid.
const gridPageMargin = 20;
// The minimum distance (in px) 2 labels can be to eachother. This is set to
// allow 2 consecutive 2-digits labels to not overlap.
const gridLabelDistance = 20;
// The maximum number of custom line names that can be displayed in a label.
const maxLineNamesCount = 3;

/** @typedef {!{contentTop: number, contentLeft: number}} */
let GridLabelPositions;  // eslint-disable-line no-unused-vars

/** @typedef {!{positions: Position[], hasFirst: boolean, hasLast: boolean, names?: string[][]}} */
let PositionData;  // eslint-disable-line no-unused-vars

/** @typedef {!{positive: PositionData, negative: PositionData}} */
let TracksPositionData;  // eslint-disable-line no-unused-vars

/** @typedef {!{rows: TracksPositionData, columns: TracksPositionData, bounds: Bounds}} */
let GridPositionNormalizedData;  // eslint-disable-line no-unused-vars

/** @typedef {!{computedSize: number, x: number, y: number}} */
let TrackSize;  // eslint-disable-line no-unused-vars

/** @typedef {!{
 * rotationAngle?: number,
 * columnTrackSizes?: TrackSize[],
 * rowTrackSizes?: TrackSize[],
 * positiveRowLineNumberPositions?: Position[],
 * negativeRowLineNumberPositions?: Position[],
 * positiveColumnLineNumberPositions?: Position[],
 * negativeColumnLineNumberPositions?: Position[],
 * rowLineNameOffsets?: {name: string, x: number, y: number}[],
 * columnLineNameOffsets?: {name: string, x: number, y: number}[],
 * gridHighlightConfig?: Object
 * } */
let GridHighlightConfig;  // eslint-disable-line no-unused-vars

/**
 * Places all of the required grid labels on the overlay. This includes row and
 * column line number labels, and area labels.
 *
 * @param {GridHighlightConfig} config The grid highlight configuration.
 * @param {Bounds} gridBounds The grid container bounds.
 * @param {AreaBounds[]} areaBounds The list of named grid areas with their bounds.
 */
export function drawGridLabels(config, gridBounds, areaBounds) {
  // Find and clear the layer for the node specified in the config, or the default layer:
  // Each node has a layer for grid labels in order to draw multiple grid highlights
  // at once.
  const labelContainerId = window._gridLayerCounter ? `grid-${window._gridLayerCounter++}-labels` : 'grid-labels';
  let labelContainerForNode = document.getElementById(labelContainerId);
  if (!labelContainerForNode) {
    const mainLabelLayerContainer = document.getElementById('grid-label-container');
    labelContainerForNode = mainLabelLayerContainer.createChild('div');
    labelContainerForNode.id = labelContainerId;
  }
  labelContainerForNode.removeChildren();

  // Add the containers for the line and area to the node's layer
  const areaNameContainer = labelContainerForNode.createChild('div', 'area-names');
  const lineNameContainer = labelContainerForNode.createChild('div', 'line-names');
  const lineNumberContainer = labelContainerForNode.createChild('div', 'line-numbers');
  const trackSizesContainer = labelContainerForNode.createChild('div', 'track-sizes');

  // Draw line numbers and names.
  const normalizedData = _normalizePositionData(config, gridBounds);
  if (config.gridHighlightConfig.showLineNames) {
    drawGridLineNames(lineNameContainer, normalizedData);
  } else {
    drawGridLineNumbers(lineNumberContainer, normalizedData);
  }

  // Draw area names.
  drawGridAreaNames(areaNameContainer, areaBounds);

  if (config.columnTrackSizes) {
    // Draw column sizes.
    drawGridTrackSizes(trackSizesContainer, config.rotationAngle, config.columnTrackSizes, 'column');
  }
  if (config.rowTrackSizes) {
    // Draw row sizes.
    drawGridTrackSizes(trackSizesContainer, config.rotationAngle, config.rowTrackSizes, 'row');
  }
}

/**
 * This is a generator function used to iterate over grid label positions in a way
 * that skips the ones that are too close to eachother, in order to avoid overlaps.
 *
 * @param {Position[]} positions
 * @param {string} axis - 'x' or 'y' in Position
 */
function* positionIterator(positions, axis) {
  let lastEmittedPos = null;

  for (const [i, pos] of positions.entries()) {
    // Only emit the position if this is the first.
    const isFirst = i === 0;
    // Or if this is the last.
    const isLast = i === positions.length - 1;
    // Or if there is some minimum distance between the last emitted position.
    const isFarEnoughFromPrevious = pos[axis] - (lastEmittedPos ? lastEmittedPos[axis] : 0) > gridLabelDistance;
    // And if there is also some minium distance from the very last position.
    const isFarEnoughFromLast = !isLast && positions[positions.length - 1][axis] - pos[axis] > gridLabelDistance;

    if (isFirst || isLast || (isFarEnoughFromPrevious && isFarEnoughFromLast)) {
      yield [i, pos];
      lastEmittedPos = pos;
    }
  }
}

const last = array => array[array.length - 1];
const first = array => array[0];

/**
 * Massage the list of line name positions given by the backend for easier consumption.
 *
 * @param {!{name: string, x: number, y: number}[]} namePositions
 * @return {!{positions: {x: number, y: number}[], names: string[][]}}
 */
function _normalizeNameData(namePositions) {
  const positions = [];
  const names = [];

  for (const {name, x, y} of namePositions) {
    const normalizedX = Math.round(x);
    const normalizedY = Math.round(y);

    // If the same position already exists, just add the name to the existing entry, as there can be
    // several custom names for a single line.
    const existingIndex = positions.findIndex(({x, y}) => x === normalizedX && y === normalizedY);
    if (existingIndex > -1) {
      names[existingIndex].push(name);
    } else {
      positions.push({x: normalizedX, y: normalizedY});
      names.push([name]);
    }
  }

  return {positions, names};
}

/**
 * Take the highlight config and bound objects in, and spits out an object with
 * the same information, but with 2 key differences:
 * - the information is organized in a way that makes the rest of the code more
 *   readable
 * - all pixel values are rounded to integers in order to safely compare
 *   positions (on high-dpi monitors floats are passed by the backend, this means
 *   checking if a position is at either edges of the container can't be done).
 *
 * @param {GridHighlightConfig} config The highlight config object from the backend
 * @param {Bounds} bounds The bounds of the grid container
 * @return {GridPositionNormalizedData} The new, normalized, data object
 */
export function _normalizePositionData(config, bounds) {
  const width = Math.round(bounds.maxX - bounds.minX);
  const height = Math.round(bounds.maxY - bounds.minY);

  const data = {
    rows: {
      positive: {positions: [], hasFirst: false, hasLast: false},
      negative: {positions: [], hasFirst: false, hasLast: false},
    },
    columns: {
      positive: {positions: [], hasFirst: false, hasLast: false},
      negative: {positions: [], hasFirst: false, hasLast: false},
    },
    bounds: {
      minX: Math.round(bounds.minX),
      maxX: Math.round(bounds.maxX),
      minY: Math.round(bounds.minY),
      maxY: Math.round(bounds.maxY),
      width,
      height,
    }
  };

  // Line numbers and line names can't be shown together at once for now.
  // If showLineNames is set to true, then don't show line numbers, even if the
  // data is present.

  if (config.gridHighlightConfig.showLineNames) {
    const rowData = _normalizeNameData(config.rowLineNameOffsets);
    data.rows.positive = {
      positions: rowData.positions,
      names: rowData.names,
      hasFirst: rowData.positions.length && first(rowData.positions).y === data.bounds.minY,
      hasLast: rowData.positions.length && last(rowData.positions).y === data.bounds.maxY
    };

    const columnData = _normalizeNameData(config.columnLineNameOffsets);
    data.columns.positive = {
      positions: columnData.positions,
      names: columnData.names,
      hasFirst: columnData.positions.length && first(columnData.positions).x === data.bounds.minX,
      hasLast: columnData.positions.length && last(columnData.positions).x === data.bounds.maxX
    };
  } else {
    const normalizeXY = ({x, y}) => ({x: Math.round(x), y: Math.round(y)});
    // TODO (alexrudenko): hasFirst & hasLast checks won't probably work for rotated grids.
    if (config.positiveRowLineNumberPositions) {
      data.rows.positive = {
        positions: config.positiveRowLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.positiveRowLineNumberPositions).y) === data.bounds.minY,
        hasLast: Math.round(last(config.positiveRowLineNumberPositions).y) === data.bounds.maxY,
      };
    }

    if (config.negativeRowLineNumberPositions) {
      data.rows.negative = {
        positions: config.negativeRowLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.negativeRowLineNumberPositions).y) === data.bounds.minY,
        hasLast: Math.round(last(config.negativeRowLineNumberPositions).y) === data.bounds.maxY
      };
    }

    if (config.positiveColumnLineNumberPositions) {
      data.columns.positive = {
        positions: config.positiveColumnLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.positiveColumnLineNumberPositions).x) === data.bounds.minX,
        hasLast: Math.round(last(config.positiveColumnLineNumberPositions).x) === data.bounds.maxX
      };
    }

    if (config.negativeColumnLineNumberPositions) {
      data.columns.negative = {
        positions: config.negativeColumnLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.negativeColumnLineNumberPositions).x) === data.bounds.minX,
        hasLast: Math.round(last(config.negativeColumnLineNumberPositions).x) === data.bounds.maxX
      };
    }
  }

  return data;
}

/**
 * Places the grid row and column number labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {GridPositionNormalizedData} data
 */
export function drawGridLineNumbers(container, data) {
  if (!data.columns.positive.names) {
    for (const [i, pos] of positionIterator(data.columns.positive.positions, 'x')) {
      const element = _createLabelElement(container, (i + 1).toString());
      _placePositiveColumnLabel(element, pos, data);
    }
  }

  if (!data.rows.positive.names) {
    for (const [i, pos] of positionIterator(data.rows.positive.positions, 'y')) {
      const element = _createLabelElement(container, (i + 1).toString());
      _placePositiveRowLabel(element, pos, data);
    }
  }

  for (const [i, pos] of positionIterator(data.columns.negative.positions, 'x')) {
    // Negative positions are sorted such that the first position corresponds to the line closest to start edge of the grid.
    const element = _createLabelElement(container, (data.columns.negative.positions.length * -1 + i).toString());
    _placeNegativeColumnLabel(element, pos, data);
  }

  for (const [i, pos] of positionIterator(data.rows.negative.positions, 'y')) {
    // Negative positions are sorted such that the first position corresponds to the line closest to start edge of the grid.
    const element = _createLabelElement(container, (data.rows.negative.positions.length * -1 + i).toString());
    _placeNegativeRowLabel(element, pos, data);
  }
}

/**
 * Places the grid track size labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {number} rotationAngle
 * @param {!Array<TrackSize>} trackSizes
 * @param {string} direction
 */
export function drawGridTrackSizes(container, rotationAngle, trackSizes, direction) {
  for (const {x, y, computedSize, authoredSize} of trackSizes) {
    const size = computedSize.toFixed(2);
    const formattedComputed = `${size.endsWith('.00') ? size.slice(0, -3) : size}px`;
    const element = _createLabelElement(container, `${authoredSize ? authoredSize + '·' : ''}${formattedComputed}`);
    const labelWidth = _getAdjustedLabelWidth(element);
    const labelHeight = element.getBoundingClientRect().height;

    const flipIn = direction === 'column' ? y < gridPageMargin : x - labelWidth < gridPageMargin;
    const arrowType =
        _flipArrowTypeIfNeeded(direction === 'column' ? GridArrowTypes.bottomMid : GridArrowTypes.rightMid, flipIn);
    const {contentLeft, contentTop} = _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight);
    element.classList.add(arrowType);
    element.style.left = contentLeft + 'px';
    element.style.top = contentTop + 'px';
  }
}

/**
 * Places the grid row and column name labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {GridPositionNormalizedData} data
 */
export function drawGridLineNames(container, data) {
  for (const [i, pos] of data.columns.positive.positions.entries()) {
    const names = data.columns.positive.names[i];
    const element = _createLabelElement(container, _makeLineNameLabelContent(names));
    _placePositiveColumnLabel(element, pos, data);
  }

  for (const [i, pos] of data.rows.positive.positions.entries()) {
    const names = data.rows.positive.names[i];
    const element = _createLabelElement(container, _makeLineNameLabelContent(names));
    _placePositiveRowLabel(element, pos, data);
  }
}

/**
 * Turn an array of custom line names into DOM content that can be used in a label.
 *
 * @param {string[]} names
 * @return {HTMLElement}
 */
function _makeLineNameLabelContent(names) {
  const content = document.createElement('ul');
  const namesToDisplay = names.slice(0, maxLineNamesCount);

  for (const name of namesToDisplay) {
    content.createChild('li', 'line-name').textContent = name;
  }

  return content;
}

/**
 * Places the grid area name labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {AreaBounds[]} areaBounds
 */
export function drawGridAreaNames(container, areaBounds) {
  for (const {name, bounds} of areaBounds) {
    const element = _createLabelElement(container, name);

    // The list of all points comes from the path created by the backend. This
    // path is a rectangle with its starting point being the top left corner.
    const topLeftCorner = bounds.allPoints[0];

    element.style.left = topLeftCorner.x + 'px';
    element.style.top = topLeftCorner.y + 'px';
  }
}

/**
 * Create the necessary DOM for a single label element.
 *
 * @param {HTMLElement} container The DOM element where to append the label
 * @param {string|HTMLElement} textContent The text, or DOM node to display in the label
 * @return {Element} The new label element
 */
function _createLabelElement(container, textContent) {
  const wrapper = container.createChild('div');
  const element = wrapper.createChild('div', 'grid-label-content');

  if (typeof textContent === 'string') {
    element.textContent = textContent;
  } else {
    element.appendChild(textContent);
  }

  return element;
}

/**
 * Determine the position of a positive row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 */
function _placePositiveRowLabel(element, pos, data) {
  const x = pos.x;
  const y = pos.y;
  const isAtSharedStartCorner = y === data.bounds.minY && data.columns && data.columns.positive.hasFirst;
  const isAtSharedEndCorner = y === data.bounds.maxY && data.columns && data.columns.negative.hasFirst;
  const isTooCloseToViewportStart = y < gridPageMargin;
  const isTooCloseToViewportEnd = canvasHeight - y < gridPageMargin;
  const flipIn = x < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.rightMid;
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = GridArrowTypes.rightTop;
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = GridArrowTypes.rightBottom;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 */
function _placeNegativeRowLabel(element, pos, data) {
  const x = pos.x;
  const y = pos.y;
  const isAtSharedStartCorner = y === data.bounds.minY && data.columns && data.columns.positive.hasLast;
  const isAtSharedEndCorner = y === data.bounds.maxY && data.columns && data.columns.negative.hasLast;
  const isTooCloseToViewportStart = y < gridPageMargin;
  const isTooCloseToViewportEnd = canvasHeight - y < gridPageMargin;
  const flipIn = canvasWidth - x < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.leftMid;
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = GridArrowTypes.leftTop;
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = GridArrowTypes.leftBottom;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a positive column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 */
function _placePositiveColumnLabel(element, pos, data) {
  const x = pos.x;
  const y = pos.y;
  const isAtSharedStartCorner = x === data.bounds.minX && data.rows && data.rows.positive.hasFirst;
  const isAtSharedEndCorner = x === data.bounds.maxX && data.rows && data.rows.negative.hasFirst;
  const isTooCloseToViewportStart = x < gridPageMargin;
  const isTooCloseToViewportEnd = canvasWidth - x < gridPageMargin;
  const flipIn = y < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.bottomMid;
  if (isTooCloseToViewportStart) {
    arrowType = GridArrowTypes.bottomLeft;
  } else if (isTooCloseToViewportEnd) {
    arrowType = GridArrowTypes.bottomRight;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 */
function _placeNegativeColumnLabel(element, pos, data) {
  const x = pos.x;
  const y = pos.y;
  const isAtSharedStartCorner = x === data.bounds.minX && data.rows && data.rows.positive.hasLast;
  const isAtSharedEndCorner = x === data.bounds.maxX && data.rows && data.rows.negative.hasLast;
  const isTooCloseToViewportStart = x < gridPageMargin;
  const isTooCloseToViewportEnd = canvasWidth - x < gridPageMargin;
  const flipIn = canvasHeight - y < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.topMid;
  if (isTooCloseToViewportStart) {
    arrowType = GridArrowTypes.topLeft;
  } else if (isTooCloseToViewportEnd) {
    arrowType = GridArrowTypes.topRight;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Correctly place a line number label element in the page. The given
 * coordinates are the ones where the arrow of the label needs to point.
 * Therefore, the width of the text in the label, and the position of the arrow
 * relative to the label are taken into account here to calculate the final x
 * and y coordinates of the label DOM element.
 *
 * @param {HTMLElement} element The label element
 * @param {string} arrowType One of GridArrowTypes' values
 * @param {number} x Where to place the label on the x axis
 * @param {number} y Where to place the label on the y axis
 */
function _placeLineNumberLabel(element, arrowType, x, y) {
  const labelWidth = _getAdjustedLabelWidth(element);
  const labelHeight = element.getBoundingClientRect().height;
  const {contentLeft, contentTop} = _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight);

  element.classList.add(arrowType);
  element.style.left = contentLeft + 'px';
  element.style.top = contentTop + 'px';
}

/**
 * Forces the width of the provided grid label element to be an even
 * number of pixels to allow centered placement of the arrow
 *
 * @param {HTMLElement} element
 * @return {number} The width of the element
 */
function _getAdjustedLabelWidth(element) {
  let labelWidth = element.getBoundingClientRect().width;
  if (labelWidth % 2 === 1) {
    labelWidth += 1;
    element.style.width = labelWidth + 'px';
  }
  return labelWidth;
}

/**
 * In some cases, a label doesn't fit where it's supposed to be displayed.
 * This happens when it's too close to the edge of the viewport. When it does,
 * the label's position is flipped so that instead of being outside the grid, it
 * moves inside the grid.
 *
 * Example of a leftMid arrowType, which is by default outside the grid:
 *  -----------------------------
 * |                             |   +------+
 * |                             |   |      |
 * |-----------------------------|  <       |
 * |                             |   |      |
 * |                             |   +------+
 *  -----------------------------
 * When flipped, the label will be drawn inside the grid, so the arrow now needs
 * to point the other way:
 *  -----------------------------
 * |                  +------+   |
 * |                  |      |   |
 * |------------------|       >--|
 * |                  |      |   |
 * |                  +------+   |
 *  -----------------------------
 *
 * @param {string} arrowType
 * @param {boolean} flipIn
 * @return {string} The new arrow type
 */
function _flipArrowTypeIfNeeded(arrowType, flipIn) {
  if (!flipIn) {
    return arrowType;
  }

  switch (arrowType) {
    case GridArrowTypes.leftTop:
      return GridArrowTypes.rightTop;
    case GridArrowTypes.leftMid:
      return GridArrowTypes.rightMid;
    case GridArrowTypes.leftBottom:
      return GridArrowTypes.rightBottom;
    case GridArrowTypes.rightTop:
      return GridArrowTypes.leftTop;
    case GridArrowTypes.rightMid:
      return GridArrowTypes.leftMid;
    case GridArrowTypes.rightBottom:
      return GridArrowTypes.leftBottom;
    case GridArrowTypes.topLeft:
      return GridArrowTypes.bottomLeft;
    case GridArrowTypes.topMid:
      return GridArrowTypes.bottomMid;
    case GridArrowTypes.topRight:
      return GridArrowTypes.bottomRight;
    case GridArrowTypes.bottomLeft:
      return GridArrowTypes.topLeft;
    case GridArrowTypes.bottomMid:
      return GridArrowTypes.topMid;
    case GridArrowTypes.bottomRight:
      return GridArrowTypes.topRight;
  }
}

/**
 * Returns the required properties needed to place a label arrow based on the
 * arrow type and dimensions of the label
 *
 * @param {string} arrowType
 * @param {number} x
 * @param {number} y
 * @param {number} labelWidth
 * @param {number} labelHeight
 * @returns {GridLabelPositions}
 */
function _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight) {
  let contentTop;
  let contentLeft;
  switch (arrowType) {
    case GridArrowTypes.leftTop:
      contentTop = y;
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.leftMid:
      contentTop = y - (labelHeight / 2);
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.leftBottom:
      contentTop = y - labelHeight;
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.rightTop:
      contentTop = y;
      contentLeft = x - gridArrowWidth - labelWidth;
      break;
    case GridArrowTypes.rightMid:
      contentTop = y - (labelHeight / 2);
      contentLeft = x - gridArrowWidth - labelWidth;
      break;
    case GridArrowTypes.rightBottom:
      contentTop = y - labelHeight;
      contentLeft = x - labelWidth - gridArrowWidth;
      break;
    case GridArrowTypes.topLeft:
      contentTop = y + gridArrowWidth;
      contentLeft = x;
      break;
    case GridArrowTypes.topMid:
      contentTop = y + gridArrowWidth;
      contentLeft = x - (labelWidth / 2);
      break;
    case GridArrowTypes.topRight:
      contentTop = y + gridArrowWidth;
      contentLeft = x - labelWidth;
      break;
    case GridArrowTypes.bottomLeft:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x;
      break;
    case GridArrowTypes.bottomMid:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x - (labelWidth / 2);
      break;
    case GridArrowTypes.bottomRight:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x - labelWidth;
      break;
  }
  return {
    contentTop,
    contentLeft,
  };
}
