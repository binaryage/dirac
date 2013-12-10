/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
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
 * @extends {WebInspector.View}
 * @param {!WebInspector.NetworkRequest} request
 */
WebInspector.RequestTimingView = function(request)
{
    WebInspector.View.call(this);
    this.element.classList.add("resource-timing-view");

    this._request = request;
}

WebInspector.RequestTimingView.prototype = {
    wasShown: function()
    {
        this._request.addEventListener(WebInspector.NetworkRequest.Events.TimingChanged, this._refresh, this);

        if (!this._request.timing) {
            if (!this._emptyView) {
                this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("This request has no detailed timing info."));
                this._emptyView.show(this.element);
                this.innerView = this._emptyView;
            }
            return;
        }

        if (this._emptyView) {
            this._emptyView.detach();
            delete this._emptyView;
        }

        this._refresh();
    },

    willHide: function()
    {
        this._request.removeEventListener(WebInspector.NetworkRequest.Events.TimingChanged, this._refresh, this);
    },

    _refresh: function()
    {
        if (this._tableElement)
            this._tableElement.remove();

        this._tableElement = WebInspector.RequestTimingView.createTimingTable(this._request);
        this.element.appendChild(this._tableElement);
    },

    __proto__: WebInspector.View.prototype
}


WebInspector.RequestTimingView.createTimingTable = function(request)
{
    var tableElement = document.createElement("table");
    tableElement.className = "network-timing-table";
    var rows = [];

    function addRow(title, className, start, end)
    {
        var row = {};
        row.title = title;
        row.className = className;
        row.start = start;
        row.end = end;
        rows.push(row);
    }

    var timing = request.timing;
    var blocking = timing.dnsStart > 0 ? timing.dnsStart : timing.connectStart > 0 ? timing.connectStart : timing.sendStart;
    if (blocking > 0)
        addRow(WebInspector.UIString("Blocking"), "blocking", 0, blocking);

    if (timing.proxyStart !== -1)
        addRow(WebInspector.UIString("Proxy"), "proxy", timing.proxyStart, timing.proxyEnd);

    if (timing.dnsStart !== -1)
        addRow(WebInspector.UIString("DNS Lookup"), "dns", timing.dnsStart, timing.dnsEnd);

    if (timing.connectStart !== -1)
        addRow(WebInspector.UIString("Connecting"), "connecting", timing.connectStart, timing.connectEnd);

    if (timing.sslStart !== -1)
        addRow(WebInspector.UIString("SSL"), "ssl", timing.sslStart, timing.sslEnd);

    addRow(WebInspector.UIString("Sending"), "sending", timing.sendStart, timing.sendEnd);
    addRow(WebInspector.UIString("Waiting"), "waiting", timing.sendEnd, timing.receiveHeadersEnd);
    addRow(WebInspector.UIString("Receiving"), "receiving", (request.responseReceivedTime - timing.requestTime) * 1000, (request.endTime - timing.requestTime) * 1000);

    const chartWidth = 200;
    var total = (request.endTime - timing.requestTime) * 1000;
    var scale = chartWidth / total;

    for (var i = 0; i < rows.length; ++i) {
        var tr = document.createElement("tr");
        tableElement.appendChild(tr);

        var td = document.createElement("td");
        td.textContent = rows[i].title;
        tr.appendChild(td);

        td = document.createElement("td");
        td.width = chartWidth + "px";

        var row = document.createElement("div");
        row.className = "network-timing-row";
        td.appendChild(row);

        var bar = document.createElement("span");
        bar.className = "network-timing-bar " + rows[i].className;
        bar.style.left = Math.floor(scale * rows[i].start) + "px";
        bar.style.right = Math.floor(scale * (total - rows[i].end)) + "px";
        bar.style.backgroundColor = rows[i].color;
        bar.textContent = "\u200B"; // Important for 0-time items to have 0 width.
        row.appendChild(bar);

        var title = document.createElement("span");
        title.className = "network-timing-bar-title";
        if (total - rows[i].end < rows[i].start)
            title.style.right = (scale * (total - rows[i].end) + 3) + "px";
        else
            title.style.left = (scale * rows[i].start + 3) + "px";
        title.textContent = Number.secondsToString((rows[i].end - rows[i].start) / 1000, true);
        row.appendChild(title);

        tr.appendChild(td);
    }
    return tableElement;
}
