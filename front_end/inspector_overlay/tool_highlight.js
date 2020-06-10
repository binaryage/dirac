// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {dispatch, reset, setPlatform} from './common.js';
import {doReset, drawHighlight} from './tool_highlight_impl.js';

const style = `
body {
  --arrow-width: 15px;
  --arrow-height: 8px;
  --shadow-up: 5px;
  --shadow-down: -5px;
  --shadow-direction: var(--shadow-up);
  --arrow-down: polygon(0 0, 100% 0, 50% 100%);
  --arrow-up: polygon(50% 0, 0 100%, 100% 100%);
}

.px {
  color: rgb(128, 128, 128);
}

#element-title {
  position: absolute;
  z-index: 10;
}

/* Material */

.tooltip-content {
  position: absolute;
  z-index: 10;
  -webkit-user-select: none;
}

.tooltip-content {
  background-color: white;
  padding: 5px 8px;
  border: 1px solid white;
  border-radius: 3px;
  box-sizing: border-box;
  min-width: 100px;
  max-width: min(300px, 100% - 4px);
  z-index: 1;
  background-clip: padding-box;
  will-change: transform;
  text-rendering: optimizeLegibility;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
}

.tooltip-content::after {
  content: "";
  background: white;
  width: var(--arrow-width);
  height: var(--arrow-height);
  clip-path: var(--arrow);
  position: absolute;
  top: var(--arrow-top);
  left: var(--arrow-left);
  visibility: var(--arrow-visibility);
}

.element-info-section {
  margin-top: 12px;
  margin-bottom: 6px;
}

.section-name {
  color: #333;
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .05em;
  line-height: 12px;
}

.element-info {
  display: flex;
  flex-direction: column;
}

.element-info-header {
  display: flex;
  align-items: baseline;
}

.element-info-body {
  display: flex;
  flex-direction: column;
  padding-top: 2px;
  margin-top: 2px;
}

.element-info-row {
  display: flex;
  line-height: 19px;
}

.separator-container {
  display: flex;
  align-items: center;
  flex: auto;
  margin-left: 7px;
}

.separator {
  border-top: 1px solid #ddd;
  width: 100%;
}

.element-info-name {
  flex-shrink: 0;
  color: #666;
}

.element-info-gap {
  flex: auto;
}

.element-info-value-color {
  display: flex;
  color: rgb(48, 57, 66);
  margin-left: 10px;
  align-items: baseline;
}

.element-info-value-contrast {
  display: flex;
  align-items: center;
  text-align: right;
  color: rgb(48, 57, 66);
  margin-left: 10px;
}

.element-info-value-contrast .a11y-icon {
  margin-left: 8px;
}

.element-info-value-icon {
  display: flex;
  align-items: center;
}

.element-info-value-text {
  text-align: right;
  color: rgb(48, 57, 66);
  margin-left: 10px;
  align-items: baseline;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-swatch {
  display: flex;
  margin-right: 2px;
  width: 10px;
  height: 10px;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==);
  line-height: 10px;
}

.color-swatch-inner {
  flex: auto;
  border: 1px solid rgba(128, 128, 128, 0.6);
}

.element-description {
  flex: 1 1;
  font-weight: bold;
  word-wrap: break-word;
  word-break: break-all;
}

.dimensions {
  color: hsl(0, 0%, 45%);
  text-align: right;
  margin-left: 10px;
}

.material-node-width {
  margin-right: 2px;
}

.material-node-height {
  margin-left: 2px;
}

.material-tag-name {
  /* Keep this in sync with inspectorSyntaxHighlight.css (--dom-tag-name-color) */
  color: rgb(136, 18, 128);
}

.material-class-name, .material-node-id {
  /* Keep this in sync with inspectorSyntaxHighlight.css (.webkit-html-attribute-value) */
  color: rgb(26, 26, 166);
}

.contrast-text {
  width: 16px;
  height: 16px;
  text-align: center;
  line-height: 16px;
  margin-right: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0 1px;
}

.a11y-icon {
  width: 16px;
  height: 16px;
  background-repeat: no-repeat;
  display: inline-block;
}

.a11y-icon-not-ok {
  background-image: url('data:image/svg+xml,<svg fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="m9 1.5c-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5-3.36-7.5-7.5-7.5zm0 13.5c-3.315 0-6-2.685-6-6 0-1.3875.4725-2.6625 1.2675-3.675l8.4075 8.4075c-1.0125.795-2.2875 1.2675-3.675 1.2675zm4.7325-2.325-8.4075-8.4075c1.0125-.795 2.2875-1.2675 3.675-1.2675 3.315 0 6 2.685 6 6 0 1.3875-.4725 2.6625-1.2675 3.675z" fill="%239e9e9e"/></svg>');
}

.a11y-icon-warning {
  background-image: url('data:image/svg+xml,<svg fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="m8.25 11.25h1.5v1.5h-1.5zm0-6h1.5v4.5h-1.5zm.7425-3.75c-4.14 0-7.4925 3.36-7.4925 7.5s3.3525 7.5 7.4925 7.5c4.1475 0 7.5075-3.36 7.5075-7.5s-3.36-7.5-7.5075-7.5zm.0075 13.5c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6z" fill="%23e37400"/></svg>');
}

.a11y-icon-ok {
  background-image: url('data:image/svg+xml,<svg fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="m9 1.5c-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5-3.36-7.5-7.5-7.5zm0 13.5c-3.3075 0-6-2.6925-6-6s2.6925-6 6-6 6 2.6925 6 6-2.6925 6-6 6zm-1.5-4.35-1.95-1.95-1.05 1.05 3 3 6-6-1.05-1.05z" fill="%230ca40c"/></svg>');
}

/* Grid row and column labels */
.grid-label-content {
    position: absolute;
    z-index: 10;
    -webkit-user-select: none;
}

.grid-label-content {
    background-color: #1A73E8;
    padding: 2px;
    font-family: Menlo;
    font-size: 10px;
    min-width: 10px;
    min-height: 15px;
    color: #FFFFFF;
    border: 1px solid white;
    border-radius: 2px;
    box-sizing: border-box;
    z-index: 1;
    background-clip: padding-box;
    will-change: transform;
    pointer-events: none;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
}

.grid-label-content::before {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    content: "";
    background: #1A73E8;
    width: 3px;
    height: 3px;
    border: 1px solid white;
    border-width: 0 1px 1px 0;
}

.grid-label-content.bottom-mid::before {
  transform: translateY(-1px) rotate(45deg);
  top: 100%;
}

.grid-label-content.top-mid::before {
  transform: translateY(-3px) rotate(-135deg);
  top: 0%;
}

.grid-label-content.left-mid::before {
  transform: translateX(-3px) rotate(135deg);
  left: 0%
}

.grid-label-content.right-mid::before {
  transform: translateX(3px) rotate(-45deg);
  right: 0%;
}

.grid-label-content.right-top::before {
  transform: translateX(3px) translateY(-1px) rotate(-90deg) skewY(30deg);
  right: 0%;
  top: 0%;
}

.grid-label-content.right-bottom::before {
  transform: translateX(3px) translateY(-3px) skewX(30deg);
  right: 0%;
  top: 100%;
}

.grid-label-content.bottom-right::before {
  transform:  translateX(1px) translateY(-1px) skewY(30deg);
  right: 0%;
  top: 100%;
}

.grid-label-content.bottom-left::before {
  transform:  translateX(-1px) translateY(-1px) rotate(90deg) skewX(30deg);
  left: 0%;
  top: 100%;
}

.grid-label-content.left-top::before {
  transform: translateX(-3px) translateY(-1px) rotate(180deg) skewX(30deg);
  left: 0%;
  top: 0%;
}

.grid-label-content.left-bottom::before {
  transform: translateX(-3px) translateY(-3px) rotate(90deg) skewY(30deg);
  left: 0%;
  top: 100%;
}

.grid-label-content.top-right::before {
  transform:  translateX(1px) translateY(-3px) rotate(-90deg) skewX(30deg);
  right: 0%;
  top: 0%;
}

.grid-label-content.top-left::before {
  transform:  translateX(-1px) translateY(-3px) rotate(180deg) skewY(30deg);
  left: 0%;
  top: 0%;
}

@media (forced-colors: active) {
  :root, body {
      background-color: transparent;
      forced-color-adjust: none;
  }
  .tooltip-content {
      border-color: Highlight;
      background-color: Canvas;
      color: Text;
      forced-color-adjust: none;
  }
  .tooltip-content::after {
      background-color: Highlight;
  }
  .color-swatch-inner,
  .contrast-text,
  .separator {
      border-color: Highlight;
  }
  .dimensions,
  .element-info-name,
  .element-info-value-color,
  .element-info-value-contrast,
  .element-info-value-icon,
  .element-info-value-text,
  .material-tag-name,
  .material-class-name,
  .material-node-id {
      color: CanvasText;
  }
}`;


window.setPlatform = function(platform) {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = style;
  document.head.append(styleTag);

  document.body.classList.add('fill');

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.classList.add('fill');
  document.body.append(canvas);

  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip-container';
  document.body.append(tooltip);

  const gridLabels = document.createElement('div');
  gridLabels.id = 'grid-label-container';
  document.body.append(gridLabels);

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
  doReset(data);
};
window.drawHighlight = drawHighlight;
window.dispatch = dispatch;
