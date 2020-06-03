// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

export function drawViewSize() {
  const text = `${viewportSize.width}px \u00D7 ${viewportSize.height}px`;
  context.save();
  context.font = `14px ${window.getComputedStyle(document.body).fontFamily}`;
  const textWidth = context.measureText(text).width;
  context.fillStyle = gridBackgroundColor;
  context.fillRect(canvasWidth - textWidth - 12, 0, canvasWidth, 25);
  context.fillStyle = darkGridColor;
  context.fillText(text, canvasWidth - textWidth - 6, 18);
  context.restore();
}
