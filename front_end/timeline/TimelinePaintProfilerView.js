// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as UI from '../ui/ui.js';

export class TimelinePaintProfilerView extends UI.SplitWidget.SplitWidget {
  /**
   * @param {!TimelineModel.TimelineFrameModel.TimelineFrameModel} frameModel
   */
  constructor(frameModel) {
    super(false, false);
    this.element.classList.add('timeline-paint-profiler-view');
    this.setSidebarSize(60);
    this.setResizable(false);

    this._frameModel = frameModel;
    this._logAndImageSplitWidget = new UI.SplitWidget.SplitWidget(true, false);
    this._logAndImageSplitWidget.element.classList.add('timeline-paint-profiler-log-split');
    this.setMainWidget(this._logAndImageSplitWidget);
    this._imageView = new TimelinePaintImageView();
    this._logAndImageSplitWidget.setMainWidget(this._imageView);

    this._paintProfilerView =
        new LayerViewer.PaintProfilerView.PaintProfilerView(this._imageView.showImage.bind(this._imageView));
    this._paintProfilerView.addEventListener(
        LayerViewer.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
    this.setSidebarWidget(this._paintProfilerView);

    this._logTreeView = new LayerViewer.PaintProfilerView.PaintProfilerCommandLogView();
    this._logAndImageSplitWidget.setSidebarWidget(this._logTreeView);

    this._needsUpdateWhenVisible = false;
    /** @type {?SDK.PaintProfiler.PaintProfilerSnapshot} */
    this._pendingSnapshot = null;
    /** @type {?SDK.TracingModel.Event} */
    this._event = null;
    /** @type {?SDK.PaintProfiler.PaintProfilerModel} */
    this._paintProfilerModel = null;
    /** @type {?SDK.PaintProfiler.PaintProfilerSnapshot} */
    this._lastLoadedSnapshot = null;
  }

  /**
   * @override
   */
  wasShown() {
    if (this._needsUpdateWhenVisible) {
      this._needsUpdateWhenVisible = false;
      this._update();
    }
  }

  /**
   * @param {!SDK.PaintProfiler.PaintProfilerSnapshot} snapshot
   */
  setSnapshot(snapshot) {
    this._releaseSnapshot();
    this._pendingSnapshot = snapshot;
    this._event = null;
    this._updateWhenVisible();
  }

  /**
   * @param {!SDK.PaintProfiler.PaintProfilerModel} paintProfilerModel
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  setEvent(paintProfilerModel, event) {
    this._releaseSnapshot();
    this._paintProfilerModel = paintProfilerModel;
    this._pendingSnapshot = null;
    this._event = event;

    this._updateWhenVisible();
    if (this._event.name === TimelineModel.TimelineModel.RecordType.Paint) {
      return !!TimelineModel.TimelineModel.TimelineData.forEvent(event).picture;
    }
    if (this._event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      return this._frameModel.hasRasterTile(this._event);
    }
    return false;
  }

  _updateWhenVisible() {
    if (this.isShowing()) {
      this._update();
    } else {
      this._needsUpdateWhenVisible = true;
    }
  }

  _update() {
    this._logTreeView.setCommandLog([]);
    this._paintProfilerView.setSnapshotAndLog(null, [], null);

    let snapshotPromise;
    if (this._pendingSnapshot) {
      snapshotPromise = Promise.resolve({rect: null, snapshot: this._pendingSnapshot});
    } else if (this._event.name === TimelineModel.TimelineModel.RecordType.Paint) {
      const picture = TimelineModel.TimelineModel.TimelineData.forEvent(this._event).picture;
      snapshotPromise = picture.objectPromise()
                            .then(data => this._paintProfilerModel.loadSnapshot(data['skp64']))
                            .then(snapshot => snapshot && {rect: null, snapshot: snapshot});
    } else if (this._event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      snapshotPromise = this._frameModel.rasterTilePromise(this._event);
    } else {
      console.assert(false, 'Unexpected event type or no snapshot');
      return;
    }
    snapshotPromise.then(snapshotWithRect => {
      this._releaseSnapshot();
      if (!snapshotWithRect) {
        this._imageView.showImage();
        return;
      }
      const snapshot = snapshotWithRect.snapshot;
      this._lastLoadedSnapshot = snapshot;
      this._imageView.setMask(snapshotWithRect.rect);
      snapshot.commandLog().then(log => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log));
    });

    /**
     * @param {!SDK.PaintProfiler.PaintProfilerSnapshot} snapshot
     * @param {?Protocol.DOM.Rect} clipRect
     * @param {!Array.<!SDK.PaintProfiler.PaintProfilerLogItem>=} log
     * @this {TimelinePaintProfilerView}
     */
    function onCommandLogDone(snapshot, clipRect, log) {
      this._logTreeView.setCommandLog(log || []);
      this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], clipRect);
    }
  }

  _releaseSnapshot() {
    if (!this._lastLoadedSnapshot) {
      return;
    }
    this._lastLoadedSnapshot.release();
    this._lastLoadedSnapshot = null;
  }

  _onWindowChanged() {
    this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());
  }
}

/**
 * @unrestricted
 */
export class TimelinePaintImageView extends UI.Widget.Widget {
  constructor() {
    super(true);
    this.registerRequiredCSS('timeline/timelinePaintProfiler.css');
    this.contentElement.classList.add('fill', 'paint-profiler-image-view');
    this._imageContainer = this.contentElement.createChild('div', 'paint-profiler-image-container');
    this._imageElement = this._imageContainer.createChild('img');
    this._maskElement = this._imageContainer.createChild('div');
    this._imageElement.addEventListener('load', this._updateImagePosition.bind(this), false);

    this._transformController = new LayerViewer.TransformController.TransformController(this.contentElement, true);
    this._transformController.addEventListener(
        LayerViewer.TransformController.Events.TransformChanged, this._updateImagePosition, this);
  }

  /**
   * @override
   */
  onResize() {
    if (this._imageElement.src) {
      this._updateImagePosition();
    }
  }

  _updateImagePosition() {
    const width = this._imageElement.naturalWidth;
    const height = this._imageElement.naturalHeight;
    const clientWidth = this.contentElement.clientWidth;
    const clientHeight = this.contentElement.clientHeight;

    const paddingFraction = 0.1;
    const paddingX = clientWidth * paddingFraction;
    const paddingY = clientHeight * paddingFraction;
    const scaleX = (clientWidth - paddingX) / width;
    const scaleY = (clientHeight - paddingY) / height;
    const scale = Math.min(scaleX, scaleY);

    if (this._maskRectangle) {
      const style = this._maskElement.style;
      style.width = width + 'px';
      style.height = height + 'px';
      style.borderLeftWidth = this._maskRectangle.x + 'px';
      style.borderTopWidth = this._maskRectangle.y + 'px';
      style.borderRightWidth = (width - this._maskRectangle.x - this._maskRectangle.width) + 'px';
      style.borderBottomWidth = (height - this._maskRectangle.y - this._maskRectangle.height) + 'px';
    }
    this._transformController.setScaleConstraints(0.5, 10 / scale);
    let matrix = new WebKitCSSMatrix()
                     .scale(this._transformController.scale(), this._transformController.scale())
                     .translate(clientWidth / 2, clientHeight / 2)
                     .scale(scale, scale)
                     .translate(-width / 2, -height / 2);
    const bounds = UI.Geometry.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
    this._transformController.clampOffsets(
        paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX, paddingY - bounds.maxY,
        clientHeight - paddingY - bounds.minY);
    matrix = new WebKitCSSMatrix()
                 .translate(this._transformController.offsetX(), this._transformController.offsetY())
                 .multiply(matrix);
    this._imageContainer.style.webkitTransform = matrix.toString();
  }

  /**
   * @param {string=} imageURL
   */
  showImage(imageURL) {
    this._imageContainer.classList.toggle('hidden', !imageURL);
    if (imageURL) {
      this._imageElement.src = imageURL;
    }
  }

  /**
   * @param {?Protocol.DOM.Rect} maskRectangle
   */
  setMask(maskRectangle) {
    this._maskRectangle = maskRectangle;
    this._maskElement.classList.toggle('hidden', !maskRectangle);
  }
}
