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
    this._imageContainerElement = this._logAndImageSplitView.mainElement().createChild("div", "fill paint-profiler-image-view");
    this._imageElement = this._imageContainerElement.createChild("img");
    this._imageElement.addEventListener("load", this._updateImagePosition.bind(this), false);

    this._paintProfilerView = new WebInspector.PaintProfilerView(this._showImage.bind(this));
    this._paintProfilerView.addEventListener(WebInspector.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
    this._paintProfilerView.show(this.sidebarElement());

    this._logTreeView = new WebInspector.PaintProfilerCommandLogView();
    this._logTreeView.show(this._logAndImageSplitView.sidebarElement());

    this._transformController = new WebInspector.TransformController(this._imageContainerElement, true);
    this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged, this._updateImagePosition, this);
}

WebInspector.TimelinePaintProfilerView.prototype = {
    wasShown: function()
    {
        this._innerSetPicture(this._picture);
    },

    /**
     * @param {string} encodedPicture
     */
    setPicture: function(encodedPicture)
    {
        if (this._lastLoadedSnapshot) {
            this._lastLoadedSnapshot.dispose();
            this._lastLoadedSnapshot = null;
        }
        this._picture = encodedPicture;
        if (!this.isShowing())
            return;
        this._innerSetPicture(this._picture);
    },

    /**
     * @param {string} encodedPicture
     */
    _innerSetPicture: function(encodedPicture)
    {
        WebInspector.PaintProfilerSnapshot.load(encodedPicture, onSnapshotLoaded.bind(this));
        /**
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @this WebInspector.TimelinePaintProfilerView
         */
        function onSnapshotLoaded(snapshot)
        {
            this._lastLoadedSnapshot = snapshot;
            snapshot.commandLog(onCommandLogDone.bind(this, snapshot));
        }

        /**
         * @param {!WebInspector.PaintProfilerSnapshot=} snapshot
         * @param {!Array.<!Object>=} log
         * @this {WebInspector.TimelinePaintProfilerView}
         */
        function onCommandLogDone(snapshot, log)
        {
            this._logTreeView.setCommandLog(log);
            this._paintProfilerView.setSnapshotAndLog(snapshot || null, log || []);
        }
    },

    _updateImagePosition: function()
    {
        var width = this._imageElement.width;
        var height = this._imageElement.height;

        var container = this._logAndImageSplitView.mainElement();
        var paddingFactor = 1.1;
        var scaleX = container.clientWidth / width / paddingFactor;
        var scaleY = container.clientHeight / height / paddingFactor;
        var scale = Math.min(scaleX, scaleY);

        var matrix = new WebKitCSSMatrix()
            .translate(this._transformController.offsetX(), this._transformController.offsetY())
            .scale(this._transformController.scale(), this._transformController.scale())
            .translate(container.clientWidth / 2, container.clientHeight / 2)
            .scale(scale, scale)
            .translate(-width / 2, -height / 2);

        this._imageElement.style.webkitTransform = matrix.toString();
    },

    _onWindowChanged: function()
    {
        var window = this._paintProfilerView.windowBoundaries();
        this._logTreeView.updateWindow(window.left, window.right);
    },

    /**
     * @param {string=} imageURL
     */
    _showImage: function(imageURL)
    {
        this._imageElement.classList.toggle("hidden", !imageURL);
        this._imageElement.src = imageURL;
    },

    __proto__: WebInspector.SplitView.prototype
};

