/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @constructor
 * @param {number} totalValue
 */
WebInspector.PieChart = function(totalValue)
{
    this.element = document.createElement("div");
    this.element.className = "pie-chart";
    this.element.createChild("div", "pie-chart-background");
    var totalString = Number.secondsToString(totalValue, true);
    this.element.createChild("div", "pie-chart-foreground").textContent = totalString;
    this._totalValue = totalValue;
    this._lastAngle = 0;
}

WebInspector.PieChart.prototype = {
    /**
     * @param {number} value
     * @param {string} color
     */
    addSlice: function(value, color)
    {
        var sliceAngle = value / this._totalValue * 360;
        if (sliceAngle > 180) {
            this._innerAddSlice(180, color);
            sliceAngle -= 180;
        }
        this._innerAddSlice(sliceAngle, color);
    },

    /**
     * @param {number} sliceAngle
     * @param {string} color
     */
    _innerAddSlice: function(sliceAngle, color)
    {
        var sliceElement = this.element.createChild("div", "pie-chart-slice");
        sliceElement.style.webkitTransform = "rotate(" + Number(this._lastAngle).toFixed(2) + "deg)"
        var innerSliceElement = sliceElement.createChild("div", "pie-chart-slice-inner");
        innerSliceElement.style.backgroundColor = color;
        innerSliceElement.style.webkitTransform = "rotate(" + Number(sliceAngle).toFixed(2) + "deg)";
        this._lastAngle += sliceAngle;
        if (this._lastAngle > 360)
            console.assert("Pie chard slices are greater than total.");
    }
}
