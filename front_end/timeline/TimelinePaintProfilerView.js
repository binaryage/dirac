// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SplitView}
 */
WebInspector.TimelinePaintProfilerView = function()
{
    WebInspector.SplitView.call(this, false, false);
    this.element.classList.add("timeline-paint-profiler-view");

    this.setSidebarSize(60);
    this.setResizable(false);
    this._logAndImageSplitView = new WebInspector.SplitView(true, false);
    this._logAndImageSplitView.show(this.mainElement());
    this._imageView = new WebInspector.TimelinePaintImageView();
    this._imageView.show(this._logAndImageSplitView.mainElement());

    this._paintProfilerView = new WebInspector.PaintProfilerView(this._imageView.showImage.bind(this._imageView));
    this._paintProfilerView.addEventListener(WebInspector.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
    this._paintProfilerView.show(this.sidebarElement());

    this._logTreeView = new WebInspector.PaintProfilerCommandLogView();
    this._logTreeView.show(this._logAndImageSplitView.sidebarElement());
}

WebInspector.TimelinePaintProfilerView.prototype = {
    wasShown: function()
    {
        if (this._updateWhenVisible) {
            this._updateWhenVisible = false;
            this._update();
        }
    },

    /**
     * @param {!WeakReference.<!WebInspector.Target>} weakTarget
     * @param {string} encodedPicture
     */
    setPicture: function(weakTarget, encodedPicture)
    {
        this._disposeSnapshot();
        this._picture = encodedPicture;
        this._weakTarget = weakTarget;
        if (this.isShowing())
            this._update();
        else
            this._updateWhenVisible = true;
    },

    _update: function()
    {
        var target = this._weakTarget.get();
        if (!target)
            return;
        WebInspector.PaintProfilerSnapshot.load(target, this._picture, onSnapshotLoaded.bind(this));
        /**
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @this WebInspector.TimelinePaintProfilerView
         */
        function onSnapshotLoaded(snapshot)
        {
            this._disposeSnapshot();
            this._lastLoadedSnapshot = snapshot;
            snapshot.commandLog(onCommandLogDone.bind(this, snapshot));
        }

        /**
         * @param {!WebInspector.PaintProfilerSnapshot=} snapshot
         * @param {!Array.<!WebInspector.PaintProfilerLogItem>=} log
         * @this {WebInspector.TimelinePaintProfilerView}
         */
        function onCommandLogDone(snapshot, log)
        {
            this._logTreeView.setCommandLog(log);
            this._paintProfilerView.setSnapshotAndLog(snapshot || null, log || []);
        }
    },

    _disposeSnapshot: function()
    {
        if (!this._lastLoadedSnapshot)
            return;
        this._lastLoadedSnapshot.dispose();
        this._lastLoadedSnapshot = null;
    },

    _onWindowChanged: function()
    {
        var window = this._paintProfilerView.windowBoundaries();
        this._logTreeView.updateWindow(window.left, window.right);
    },

    __proto__: WebInspector.SplitView.prototype
};

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.TimelinePaintImageView = function()
{
    WebInspector.View.call(this);
    this.element.classList.add("fill", "paint-profiler-image-view");
    this._imageElement = this.element.createChild("img");
    this._imageElement.addEventListener("load", this._updateImagePosition.bind(this), false);

    this._transformController = new WebInspector.TransformController(this.element, true);
    this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged, this._updateImagePosition, this);
}

WebInspector.TimelinePaintImageView.prototype = {
    onResize: function()
    {
        this._updateImagePosition();
    },

    _updateImagePosition: function()
    {
        var width = this._imageElement.width;
        var height = this._imageElement.height;

        var paddingFactor = 1.1;
        var scaleX = this.element.clientWidth / width / paddingFactor;
        var scaleY = this.element.clientHeight / height / paddingFactor;
        var scale = Math.min(scaleX, scaleY);

        var matrix = new WebKitCSSMatrix()
            .translate(this._transformController.offsetX(), this._transformController.offsetY())
            .scale(this._transformController.scale(), this._transformController.scale())
            .translate(this.element.clientWidth / 2, this.element.clientHeight / 2)
            .scale(scale, scale)
            .translate(-width / 2, -height / 2);

        this._imageElement.style.webkitTransform = matrix.toString();
    },

    /**
     * @param {string=} imageURL
     */
    showImage: function(imageURL)
    {
        this._imageElement.classList.toggle("hidden", !imageURL);
        this._imageElement.src = imageURL;
    },

    __proto__: WebInspector.View.prototype
};
