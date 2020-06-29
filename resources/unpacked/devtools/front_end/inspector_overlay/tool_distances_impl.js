//  Copyright 2019 The Chromium Authors. All rights reserved.
//  Use of this source code is governed by a BSD-style license that can be
//  found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

/**
 * @param {!Object} data
 */
export function drawDistances(data) {
  const info = data['distanceInfo'];
  if (!info) {
    return;
  }
  const rect = quadToRect(getVisualQuad(info));
  const context = window.context;
  context.save();
  context.strokeStyle = '#ccc';
  for (const box of info['boxes']) {
    context.strokeRect(box[0], box[1], box[2], box[3]);
  }
  context.strokeStyle = '#f00';
  context.lineWidth = 1;
  context.rect(rect.x - 0.5, rect.y - 0.5, rect.w + 1, rect.h + 1);
  context.stroke();
  context.restore();
}

/**
 * @param {!Object} data
 * @return {!Array<number>}
 */
function getVisualQuad(data) {
  const style = data['style'];
  if (shouldUseVisualBorder(style)) {
    return data['border'];
  }
  if (ShouldUseVisualPadding(style)) {
    return data['padding'];
  }
  return data['content'];

  /**
   * @param {!Object} style
   * @return {boolean}
   */
  function shouldUseVisualBorder(style) {
    const sides = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      const border_width = style[`border-${side}-width`];
      const border_style = style[`border-${side}-style`];
      const border_color = style[`border-${side}-color`];
      if (border_width !== '0px' && border_style !== 'none' && !border_color.endsWith('00')) {
        return true;
      }
    }
    const outline_width = style['outline-width'];
    const outline_style = style['outline-style'];
    const outline_color = style['outline-color'];
    if (outline_width !== '0px' && outline_style !== 'none' && !outline_color.endsWith('00')) {
      return true;
    }
    const box_shadow = style['box-shadow'];
    if (box_shadow !== 'none') {
      return true;
    }
    return false;
  }

  /**
   * @param {!Object} style
   * @return {boolean}
   */
  function ShouldUseVisualPadding(style) {
    const bg_color = style['background-color'];
    const bg_image = style['background-image'];
    if (!bg_color.startsWith('#FFFFFF') && !bg_color.endsWith('00')) {
      return true;
    }
    if (bg_image !== 'none') {
      return true;
    }
    return false;
  }
}

/**
 * @param {!Array<number>} quad
 * @return {!Object}
 */
function quadToRect(quad) {
  return {x: quad[0], y: quad[1], w: quad[4] - quad[0], h: quad[5] - quad[1]};
}
