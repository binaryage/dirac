// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.MediaQueryInspector = function()
{
    WebInspector.View.call(this);
    this.element.classList.add("media-inspector-view");
    this.element.addEventListener("click", this._onMediaQueryClicked.bind(this), false);
    this.element.addEventListener("contextmenu", this._onContextMenu.bind(this), false);
    this._mediaThrottler = new WebInspector.Throttler(100);
    this._zeroOffset = 0;

    this._rulerDecorationLayer = document.createElementWithClass("div", "fill");
    this._rulerDecorationLayer.classList.add("media-inspector-ruler-decoration");
    this._rulerDecorationLayer.addEventListener("click", this._onRulerDecorationClicked.bind(this), false);

    WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded, this._scheduleMediaQueriesUpdate, this);
    WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, this._scheduleMediaQueriesUpdate, this);
    WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._scheduleMediaQueriesUpdate, this);
    WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged, this._scheduleMediaQueriesUpdate, this);
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._renderMediaQueries.bind(this), this);
    this._scheduleMediaQueriesUpdate();
}

WebInspector.MediaQueryInspector.Events = {
    HeightUpdated: "HeightUpdated"
}

WebInspector.MediaQueryInspector._ThresholdPadding = 1;

WebInspector.MediaQueryInspector.prototype = {
    /**
     * @return {!Element}
     */
    rulerDecorationLayer: function()
    {
        return this._rulerDecorationLayer;
    },

    /**
     * @return {!Array.<number>}
     */
    _mediaQueryThresholds: function()
    {
        if (!this._cachedQueryModels)
            return [];
        var thresholds = [];
        for (var i = 0; i < this._cachedQueryModels.length; ++i) {
            var model = this._cachedQueryModels[i];
            if (model.minWidthExpression)
                thresholds.push(model.minWidthExpression.computedLength());
            if (model.maxWidthExpression)
                thresholds.push(model.maxWidthExpression.computedLength());
        }
        thresholds.sortNumbers();
        var filtered = [];
        for (var i = 0; i < thresholds.length; ++i) {
            if (i == 0 || thresholds[i] - filtered.peekLast() > WebInspector.MediaQueryInspector._ThresholdPadding)
                filtered.push(thresholds[i]);
        }
        return filtered;
    },

    /**
     * @param {?Event} event
     */
    _onRulerDecorationClicked: function(event)
    {
        var thresholdElement = event.target.enclosingNodeOrSelfWithClass("media-inspector-threshold-serif");
        if (!thresholdElement)
            return;
        WebInspector.settings.showMediaQueryInspector.set(true);
        var revealValue = thresholdElement._value;
        for (var mediaQueryContainer = this.element.firstChild; mediaQueryContainer; mediaQueryContainer = mediaQueryContainer.nextSibling) {
            var model = mediaQueryContainer._model;
            if ((model.minWidthExpression && Math.abs(model.minWidthExpression.computedLength() - revealValue) <= WebInspector.MediaQueryInspector._ThresholdPadding)
                || (model.maxWidthExpression && Math.abs(model.maxWidthExpression.computedLength() - revealValue) <= WebInspector.MediaQueryInspector._ThresholdPadding)) {
                mediaQueryContainer.scrollIntoViewIfNeeded(false);
                return;
            }
        }
    },

    /**
     * @param {number} offset
     */
    translateZero: function(offset)
    {
        this._zeroOffset = offset;
        this._renderMediaQueries();
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        this._enabled = enabled;
    },

    /**
     * @param {?Event} event
     */
    _onMediaQueryClicked: function(event)
    {
        var mediaQueryMarkerContainer = event.target.enclosingNodeOrSelfWithClass("media-inspector-marker-container");
        if (!mediaQueryMarkerContainer)
            return;
        var model = mediaQueryMarkerContainer._model;
        if (model.sectionNumber === 0) {
            WebInspector.overridesSupport.settings.deviceWidth.set(model.maxWidthExpression.computedLength());
            return;
        }
        if (model.sectionNumber === 2) {
            WebInspector.overridesSupport.settings.deviceWidth.set(model.minWidthExpression.computedLength());
            return;
        }
        var currentWidth = WebInspector.overridesSupport.settings.deviceWidth.get();
        if (currentWidth !== model.minWidthExpression.computedLength())
            WebInspector.overridesSupport.settings.deviceWidth.set(model.minWidthExpression.computedLength());
        else
            WebInspector.overridesSupport.settings.deviceWidth.set(model.maxWidthExpression.computedLength());
    },

    /**
     * @param {?Event} event
     */
    _onContextMenu: function(event)
    {
        var mediaQueryMarkerContainer = event.target.enclosingNodeOrSelfWithClass("media-inspector-marker-container");
        if (!mediaQueryMarkerContainer)
            return;

        var model = mediaQueryMarkerContainer._model;
        var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(model.sourceURL);
        if (!uiSourceCode || typeof model.lineNumber !== "number" || typeof model.columnNumber !== "number")
            return;

        var contextMenu = new WebInspector.ContextMenu(event);
        var location = uiSourceCode.uiLocation(model.lineNumber, model.columnNumber);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in source code" : "Reveal In Source Code"), this._revealSourceLocation.bind(this, location));
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.UILocation} location
     */
    _revealSourceLocation: function(location)
    {
        WebInspector.Revealer.reveal(location);
    },

    _scheduleMediaQueriesUpdate: function()
    {
        if (!this._enabled)
            return;
        this._mediaThrottler.schedule(this._refetchMediaQueries.bind(this));
    },

    /**
     * @param {!WebInspector.Throttler.FinishCallback} finishCallback
     */
    _refetchMediaQueries: function(finishCallback)
    {
        if (!this._enabled) {
            finishCallback();
            return;
        }

        /**
         * @param {!Array.<!WebInspector.CSSMedia>} cssMedias
         * @this {!WebInspector.MediaQueryInspector}
         */
        function callback(cssMedias)
        {
            this._rebuildMediaQueries(cssMedias);
            finishCallback();
        }
        WebInspector.cssModel.getMediaQueries(callback.bind(this));
    },

    /**
     * @param {!Array.<!WebInspector.CSSMedia>} cssMedias
     */
    _rebuildMediaQueries: function(cssMedias)
    {
        var queryModels = [];
        for (var i = 0; i < cssMedias.length; ++i) {
            var cssMedia = cssMedias[i];
            if (!cssMedia.mediaList)
                continue;
            for (var j = 0; j < cssMedia.mediaList.length; ++j) {
                var mediaQueryExpressions = cssMedia.mediaList[j];
                var queryModel = this._mediaQueryToUIModel(cssMedia, mediaQueryExpressions);
                if (queryModel)
                    queryModels.push(queryModel);
            }
        }
        queryModels.sort(queryModelComparator);
        this._cachedQueryModels = queryModels;
        this._renderMediaQueries();

        /**
         * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model1
         * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model2
         * @return {number}
         */
        function queryModelComparator(model1, model2)
        {
            if (model1.sectionNumber !== model2.sectionNumber)
                return model1.sectionNumber - model2.sectionNumber;
            if (model1.sectionNumber === 0)
                return model1.maxWidthExpression.computedLength() - model2.maxWidthExpression.computedLength();
            if (model1.sectionNumber === 2)
                return model1.minWidthExpression.computedLength() - model2.minWidthExpression.computedLength();
            return model1.minWidthExpression.computedLength() - model2.minWidthExpression.computedLength() || model1.maxWidthExpression.computedLength() - model2.maxWidthExpression.computedLength();
        }
    },

    _renderMediaQueries: function()
    {
        if (!this._cachedQueryModels)
            return;
        this._renderRulerDecorations();
        if (!this.isShowing())
            return;
        var scrollTop = this.element.scrollTop;
        var heightChanges = this.element.children.length !== this._cachedQueryModels.length;
        this.element.removeChildren();
        for (var i = 0; i < this._cachedQueryModels.length; ++i) {
            var model = this._cachedQueryModels[i];
            var bar = this._createElementFromMediaQueryModel(model);
            bar._model = model;
            this.element.appendChild(bar);
        }
        this.element.scrollTop = scrollTop;
        this.element.classList.toggle("media-inspector-view-fixed-height", this._cachedQueryModels.length > 5);
        if (heightChanges)
            this.dispatchEventToListeners(WebInspector.MediaQueryInspector.Events.HeightUpdated);
    },

    _renderRulerDecorations: function()
    {
        this._rulerDecorationLayer.removeChildren();
        var zoomFactor = WebInspector.zoomManager.zoomFactor();

        var thresholds = this._mediaQueryThresholds();
        for (var i = 0; i < thresholds.length; ++i) {
            var thresholdElement = this._rulerDecorationLayer.createChild("div", "media-inspector-threshold-serif");
            thresholdElement._value = thresholds[i];
            thresholdElement.style.left = thresholds[i] / zoomFactor + "px";
        }
    },

    wasShown: function()
    {
        this._renderMediaQueries();
    },

    /**
     * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model
     * @return {!Element}
     */
    _createElementFromMediaQueryModel: function(model)
    {
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var minWidthValue = model.minWidthExpression ? model.minWidthExpression.computedLength() : 0;

        var container = document.createElementWithClass("div", "media-inspector-marker-container hbox");
        var markerElement = container.createChild("div", "media-inspector-marker");
        const styleClassPerSection = [
            "media-inspector-marker-max-width",
            "media-inspector-marker-min-max-width",
            "media-inspector-marker-min-width"
        ];
        markerElement.classList.add(styleClassPerSection[model.sectionNumber]);
        var leftPixelValue = minWidthValue ? minWidthValue / zoomFactor + this._zeroOffset : 0;
        markerElement.style.left = leftPixelValue + "px";
        var widthPixelValue = null;
        if (model.maxWidthExpression && model.minWidthExpression)
            widthPixelValue = (model.maxWidthExpression.computedLength() - minWidthValue) / zoomFactor;
        else if (model.maxWidthExpression)
            widthPixelValue = model.maxWidthExpression.computedLength() / zoomFactor + this._zeroOffset;
        else
            markerElement.style.right = "0";
        if (typeof widthPixelValue === "number")
            markerElement.style.width = widthPixelValue + "px";

        var maxLabelFiller = container.createChild("div", "media-inspector-max-label-filler");
        if (model.maxWidthExpression) {
            maxLabelFiller.style.maxWidth = widthPixelValue + leftPixelValue + "px";
            var label = container.createChild("span", "media-inspector-marker-label media-inspector-max-label");
            label.textContent = model.maxWidthExpression.computedLength() + "px";
        }

        if (model.minWidthExpression) {
            var minLabelFiller = maxLabelFiller.createChild("div", "media-inspector-min-label-filler");
            minLabelFiller.style.maxWidth = leftPixelValue + "px";
            var label = minLabelFiller.createChild("span", "media-inspector-marker-label media-inspector-min-label");
            label.textContent = model.minWidthExpression.computedLength() + "px";
        }

        return container;
    },

    /**
     * @param {!WebInspector.CSSMedia} parentCSSMedia
     * @param {!Array.<!WebInspector.CSSMediaQueryExpression>} mediaQueryExpressions
     * @return {?WebInspector.MediaQueryInspector.MediaQueryUIModel}
     */
    _mediaQueryToUIModel: function(parentCSSMedia, mediaQueryExpressions)
    {
        var maxWidthExpression = null;
        var maxWidthPixels = Number.MAX_VALUE;
        var minWidthExpression = null;
        var minWidthPixels = Number.MIN_VALUE;
        for (var i = 0; i < mediaQueryExpressions.length; ++i) {
            var expression = mediaQueryExpressions[i];
            var feature = expression.feature();
            if (feature.indexOf("width") === -1)
                continue;
            var pixels = expression.computedLength();
            if (feature.startsWith("max-") && pixels < maxWidthPixels) {
                maxWidthExpression = expression;
                maxWidthPixels = pixels;
            } else if (feature.startsWith("min-") && pixels > minWidthPixels) {
                minWidthExpression = expression;
                minWidthPixels = pixels;
            }
        }
        if (minWidthPixels > maxWidthPixels || (!maxWidthExpression && !minWidthExpression))
            return null;

        var sectionNumber;
        if (maxWidthExpression && !minWidthExpression)
            sectionNumber = 0;
        else if (minWidthExpression && maxWidthExpression)
            sectionNumber = 1;
        else
            sectionNumber = 2;

        return {
            sectionNumber: sectionNumber,
            mediaText: parentCSSMedia.text,
            sourceURL: parentCSSMedia.sourceURL,
            lineNumber: parentCSSMedia.lineNumberInSource(),
            columnNumber: parentCSSMedia.columnNumberInSource(),
            minWidthExpression: minWidthExpression,
            maxWidthExpression: maxWidthExpression
        };
    },

    __proto__: WebInspector.View.prototype
};

/** @typedef {{sectionNumber: number, mediaText: string, sourceURL: string, lineNumber: (?number|undefined), columnNumber: (?number|undefined), minWidthExpression: ?WebInspector.CSSMediaQueryExpression, maxWidthExpression: ?WebInspector.CSSMediaQueryExpression}} */
WebInspector.MediaQueryInspector.MediaQueryUIModel;
