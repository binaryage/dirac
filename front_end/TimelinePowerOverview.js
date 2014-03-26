// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.TimelinePowerOverviewDataProvider = function()
{
    this._records = [];
    if (Capabilities.canProfilePower)
        WebInspector.powerProfiler.addEventListener(WebInspector.PowerProfiler.EventTypes.PowerEventRecorded, this._onRecordAdded, this);
}

WebInspector.TimelinePowerOverviewDataProvider.prototype = {
    /**
     * @return {!Array.<!PowerAgent.PowerEvent>}
     */
    records : function()
    {
        // The last record is not used, as its "value" is not set.
        return this._records.slice(0, this._records.length - 1);
    },

    _onRecordAdded: function(event)
    {
        // "value" of original PowerEvent means the average power between previous sampling to current one.
        // Here, it is converted to average power between current sampling to next one.
        var record = event.data;
        var length = this._records.length;
        if (length)
            this._records[length - 1].value = record.value;
        this._records.push(record);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineOverviewBase}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelinePowerOverview = function(model)
{
    WebInspector.TimelineOverviewBase.call(this, model);
    this.element.id = "timeline-overview-power";
    this._dataProvider = new WebInspector.TimelinePowerOverviewDataProvider();

    this._maxPowerLabel = this.element.createChild("div", "max memory-graph-label");
    this._minPowerLabel = this.element.createChild("div", "min memory-graph-label");
}

WebInspector.TimelinePowerOverview.prototype = {
    timelineStarted: function()
    {
        if (Capabilities.canProfilePower)
            WebInspector.powerProfiler.startProfile();
    },

    timelineStopped: function()
    {
        if (Capabilities.canProfilePower)
            WebInspector.powerProfiler.stopProfile();
    },

    _resetPowerLabels: function()
    {
        this._maxPowerLabel.textContent = "";
        this._minPowerLabel.textContent = "";
    },

    update: function()
    {
        this.resetCanvas();

        var records = this._dataProvider.records();
        if (!records.length) {
            this._resetPowerLabels();
            return;
        }

        const lowerOffset = 3;
        var maxPower = 0;
        var minPower = 100000000000;
        var minTime = this._model.minimumRecordTime();
        var maxTime = this._model.maximumRecordTime();
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (record.timestamp < minTime || record.timestamp > maxTime)
                continue;
            maxPower = Math.max(maxPower, record.value);
            minPower = Math.min(minPower, record.value);
        }
        minPower = Math.min(minPower, maxPower);


        var width = this._canvas.width;
        var height = this._canvas.height - lowerOffset;
        var xFactor = width / (maxTime - minTime);
        var yFactor = height / Math.max(maxPower - minPower, 1);

        var histogram = new Array(width);
        for (var i = 0; i < records.length - 1; i++) {
            var record = records[i];
            if (record.timestamp < minTime || record.timestamp > maxTime)
                continue;
            var x = Math.round((record.timestamp - minTime) * xFactor);
            var y = Math.round((record.value- minPower ) * yFactor);
            histogram[x] = Math.max(histogram[x] || 0, y);
        }

        var y = 0;
        var isFirstPoint = true;
        var ctx = this._context;
        ctx.save();
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        ctx.moveTo(-1, this._canvas.height);
        for (var x = 0; x < histogram.length; x++) {
            if (typeof histogram[x] === "undefined")
                continue;
            if (isFirstPoint) {
                isFirstPoint = false;
                y = histogram[x];
                ctx.lineTo(-1, height - y);
            }
            ctx.lineTo(x, height - y);
            y = histogram[x];
            ctx.lineTo(x, height - y);
        }

        ctx.lineTo(width, height - y);
        ctx.lineTo(width, this._canvas.height);
        ctx.lineTo(-1, this._canvas.height);
        ctx.closePath();

        ctx.fillStyle = "rgba(255,192,0, 0.8);";
        ctx.fill();

        ctx.lineWidth = 0.5;
        ctx.strokeStyle = "rgba(20,0,0,0.8)";
        ctx.stroke();
        ctx.restore();

        this._maxPowerLabel.textContent = WebInspector.UIString("%.2f\u2009watts", maxPower);
        this._minPowerLabel.textContent = WebInspector.UIString("%.2f\u2009watts", minPower);;
    },

    __proto__: WebInspector.TimelineOverviewBase.prototype
}


