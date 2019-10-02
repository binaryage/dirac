/*
 * Copyright (C) 2019 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Timeline.UIDevtoolsUtils = class {
  /**
   * @return {boolean}
   */
  static isUiDevTools() {
    return Root.Runtime.queryParam('uiDevTools') === 'true';
  }

  /**
   * @return {!Object.<string, !Timeline.TimelineRecordStyle>}
   */
  static categorizeEvents() {
    if (Timeline.UIDevtoolsUtils._eventStylesMap) {
      return Timeline.UIDevtoolsUtils._eventStylesMap;
    }

    const type = Timeline.UIDevtoolsUtils.RecordType;
    const categories = Timeline.UIDevtoolsUtils.categories();
    const drawing = categories['drawing'];
    const rasterizing = categories['rasterizing'];
    const layout = categories['layout'];
    const painting = categories['painting'];
    const other = categories['other'];

    const eventStyles = {};

    // Paint Categories
    eventStyles[type.ViewPaint] = new Timeline.TimelineRecordStyle(ls`View::Paint`, painting);
    eventStyles[type.ViewOnPaint] = new Timeline.TimelineRecordStyle(ls`View::OnPaint`, painting);
    eventStyles[type.ViewPaintChildren] = new Timeline.TimelineRecordStyle(ls`View::PaintChildren`, painting);
    eventStyles[type.ViewOnPaintBackground] = new Timeline.TimelineRecordStyle(ls`View::OnPaintBackground`, painting);
    eventStyles[type.ViewOnPaintBorder] = new Timeline.TimelineRecordStyle(ls`View::OnPaintBorder`, painting);
    eventStyles[type.LayerPaintContentsToDisplayList] =
        new Timeline.TimelineRecordStyle(ls`Layer::PaintContentsToDisplayList`, painting);

    // Layout Categories
    eventStyles[type.ViewLayout] = new Timeline.TimelineRecordStyle(ls`View::Layout`, layout);
    eventStyles[type.ViewLayoutBoundsChanged] =
        new Timeline.TimelineRecordStyle(ls`View::Layout(bounds_changed)`, layout);

    // Raster Categories
    eventStyles[type.RasterTask] = new Timeline.TimelineRecordStyle(ls`RasterTask`, rasterizing);
    eventStyles[type.RasterizerTaskImplRunOnWorkerThread] =
        new Timeline.TimelineRecordStyle(ls`RasterizerTaskImpl::RunOnWorkerThread`, rasterizing);

    // Draw Categories
    eventStyles[type.DirectRendererDrawFrame] =
        new Timeline.TimelineRecordStyle(ls`DirectRenderer::DrawFrame`, drawing);
    eventStyles[type.BeginFrame] = new Timeline.TimelineRecordStyle(ls`Frame Start`, drawing, true);
    eventStyles[type.DrawFrame] = new Timeline.TimelineRecordStyle(ls`Draw Frame`, drawing, true);
    eventStyles[type.NeedsBeginFrameChanged] =
        new Timeline.TimelineRecordStyle(ls`NeedsBeginFrameChanged`, drawing, true);

    // Other Categories
    eventStyles[type.ThreadControllerImplRunTask] =
        new Timeline.TimelineRecordStyle(ls`ThreadControllerImpl::RunTask`, other);

    Timeline.UIDevtoolsUtils._eventStylesMap = eventStyles;
    return eventStyles;
  }

  /**
   * @return {!Object.<string, !Timeline.TimelineCategory>}
   */
  static categories() {
    if (Timeline.UIDevtoolsUtils._categories) {
      return Timeline.UIDevtoolsUtils._categories;
    }
    Timeline.UIDevtoolsUtils._categories = {
      layout: new Timeline.TimelineCategory('layout', ls`Layout`, true, 'hsl(214, 67%, 74%)', 'hsl(214, 67%, 66%)'),
      rasterizing: new Timeline.TimelineCategory(
          'rasterizing', ls`Rasterizing`, true, 'hsl(43, 83%, 72%)', 'hsl(43, 83%, 64%) '),
      drawing: new Timeline.TimelineCategory('drawing', ls`Drawing`, true, 'hsl(256, 67%, 76%)', 'hsl(256, 67%, 70%)'),
      painting:
          new Timeline.TimelineCategory('painting', ls`Painting`, true, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
      other: new Timeline.TimelineCategory('other', ls`System`, false, 'hsl(0, 0%, 87%)', 'hsl(0, 0%, 79%)'),
      idle: new Timeline.TimelineCategory('idle', ls`Idle`, false, 'hsl(0, 0%, 98%)', 'hsl(0, 0%, 98%)')
    };
    return Timeline.UIDevtoolsUtils._categories;
  }

  /**
   * @return {!Array}
   */
  static getMainCategoriesList() {
    return ['idle', 'drawing', 'painting', 'rasterizing', 'layout', 'other'];
  }
};


/**
 * @enum {string}
 */
Timeline.UIDevtoolsUtils.RecordType = {
  ViewPaint: 'View::Paint',
  ViewOnPaint: 'View::OnPaint',
  ViewPaintChildren: 'View::PaintChildren',
  ViewOnPaintBackground: 'View::OnPaintBackground',
  ViewOnPaintBorder: 'View::OnPaintBorder',
  ViewLayout: 'View::Layout',
  ViewLayoutBoundsChanged: 'View::Layout(bounds_changed)',
  LayerPaintContentsToDisplayList: 'Layer::PaintContentsToDisplayList',
  DirectRendererDrawFrame: 'DirectRenderer::DrawFrame',
  RasterTask: 'RasterTask',
  RasterizerTaskImplRunOnWorkerThread: 'RasterizerTaskImpl::RunOnWorkerThread',
  BeginFrame: 'BeginFrame',
  DrawFrame: 'DrawFrame',
  NeedsBeginFrameChanged: 'NeedsBeginFrameChanged',
  ThreadControllerImplRunTask: 'ThreadControllerImpl::RunTask',
};
