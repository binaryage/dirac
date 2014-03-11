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
 * @param {number=} totalValue
 * @param {function(number):string=} formatter
 */
WebInspector.PieChart = function(totalValue, formatter)
{
    const shadowOffset = 0.04;
    this.element = document.createElementWithClass("div", "pie-chart");
    var svg = this._createSVGChild(this.element, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", (100 * (1 + shadowOffset)) + "%");
    this._group = this._createSVGChild(svg, "g");
    var shadow = this._createSVGChild(this._group, "circle");
    shadow.setAttribute("r", 1);
    shadow.setAttribute("cy", shadowOffset);
    shadow.setAttribute("fill", "hsl(0,0%,70%)");
    var background = this._createSVGChild(this._group, "circle");
    background.setAttribute("r", 1);
    background.setAttribute("fill", "hsl(0,0%,92%)");
    if (totalValue) {
        var totalString = formatter ? formatter(totalValue) : totalValue;
        this._totalElement = this.element.createChild("div", "pie-chart-foreground");
        this._totalElement.textContent = totalString;
        this._totalValue = totalValue;
    }
    this._lastAngle = -Math.PI/2;
    this.setSize(100);
}

WebInspector.PieChart.prototype = {
    /**
     * @param {number} value
     */
    setTotal: function(value)
    {
        this._totalValue = value;
    },

    /**
     * @param {number} value
     */
    setSize: function(value)
    {
        this._group.setAttribute("transform", "scale(" + (value / 2) + ") translate(1,1)");
        var size = value + "px";
        this.element.style.width = size;
        this.element.style.height = size;
        if (this._totalElement)
            this._totalElement.style.lineHeight = size;
    },

    /**
     * @param {number} value
     * @param {string} color
     */
    addSlice: function(value, color)
    {
        var sliceAngle = value / this._totalValue * 2 * Math.PI;
        if (!isFinite(sliceAngle))
            return;
        sliceAngle = Math.min(sliceAngle, 2 * Math.PI * 0.9999);
        var path = this._createSVGChild(this._group, "path");
        var x1 = Math.cos(this._lastAngle);
        var y1 = Math.sin(this._lastAngle);
        this._lastAngle += sliceAngle;
        var x2 = Math.cos(this._lastAngle);
        var y2 = Math.sin(this._lastAngle);
        var largeArc = sliceAngle > Math.PI ? 1 : 0;
        path.setAttribute("d", "M0,0 L" + x1 + "," + y1 + " A1,1,0," + largeArc + ",1," + x2 + "," + y2 + " Z");
        path.setAttribute("fill", color);
    },

    /**
     * @param {!Element} parent
     * @param {string} childType
     * @return {!Element}
     */
    _createSVGChild: function(parent, childType)
    {
        var child = document.createElementNS("http://www.w3.org/2000/svg", childType);
        parent.appendChild(child);
        return child;
    }
}
