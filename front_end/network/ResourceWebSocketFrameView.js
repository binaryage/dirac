/*
 * Copyright (C) 2012 Research In Motion Limited. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.NetworkRequest} request
 */
WebInspector.ResourceWebSocketFrameView = function(request)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("webSocketFrameView.css");
    this.element.classList.add("websocket-frame-view");
    this._request = request;
    this.element.removeChildren();

    var columns = [
        {id: "data", title: WebInspector.UIString("Data"), sortable: false, weight: 88, longText: true},
        {id: "length", title: WebInspector.UIString("Length"), sortable: false, align: WebInspector.DataGrid.Align.Right, weight: 5},
        {id: "time", title: WebInspector.UIString("Time"), weight: 7}
    ]

    this._dataGrid = new WebInspector.SortableDataGrid(columns, undefined, undefined, undefined, this._onContextMenu.bind(this));
    this._dataGrid.setCellClass("websocket-frame-view-td");
    var comparator = /** @type {!WebInspector.SortableDataGrid.NodeComparator} */ (WebInspector.ResourceWebSocketFrameNodeTimeComparator);
    this._dataGrid.sortNodes(comparator, true);

    this.refresh();
    this._dataGrid.setName("ResourceWebSocketFrameView");
    this._dataGrid.show(this.element);
}

/** @enum {number} */
WebInspector.ResourceWebSocketFrameView.OpCodes = {
    ContinuationFrame: 0,
    TextFrame: 1,
    BinaryFrame: 2,
    ConnectionCloseFrame: 8,
    PingFrame: 9,
    PongFrame: 10
};

/** @type {!Array.<string> } */
WebInspector.ResourceWebSocketFrameView.opCodeDescriptions = (function()
{
    var opCodes = WebInspector.ResourceWebSocketFrameView.OpCodes;
    var map = [];
    map[opCodes.ContinuationFrame] = "Continuation Frame";
    map[opCodes.TextFrame] = "Text Frame";
    map[opCodes.BinaryFrame] = "Binary Frame";
    map[opCodes.ContinuationFrame] = "Connection Close Frame";
    map[opCodes.PingFrame] = "Ping Frame";
    map[opCodes.PongFrame] = "Pong Frame";
    return map;
})();

/**
 * @param {number} opCode
 * @param {boolean} mask
 * @return {string}
 */
WebInspector.ResourceWebSocketFrameView.opCodeDescription = function(opCode, mask)
{
    var rawDescription = WebInspector.ResourceWebSocketFrameView.opCodeDescriptions[opCode] || "";
    var localizedDescription = WebInspector.UIString(rawDescription);
    return WebInspector.UIString("%s (Opcode %d%s)", localizedDescription, opCode, (mask ? ", mask" : ""));
}

WebInspector.ResourceWebSocketFrameView.prototype = {
    refresh: function()
    {
        this._dataGrid.rootNode().removeChildren();
        var frames = this._request.frames();
        for (var i = frames.length - 1; i >= 0; --i)
            this._dataGrid.insertChild(new WebInspector.ResourceWebSocketFrameNode(frames[i]));
    },

    show: function(parentElement, insertBefore)
    {
        this.refresh();
        WebInspector.View.prototype.show.call(this, parentElement, insertBefore);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!WebInspector.DataGridNode} node
     */
    _onContextMenu: function(contextMenu, node)
    {
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy message" : "Copy Message"), this._copyMessage.bind(this, node.data));
    },

    /**
     * @param {!Object} row
     */
    _copyMessage: function(row)
    {
        InspectorFrontendHost.copyText(row.data);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SortableDataGridNode}
 * @param {!WebInspector.NetworkRequest.WebSocketFrame} frame
 */
WebInspector.ResourceWebSocketFrameNode = function(frame)
{
    this._frame = frame;
    this._dataText = frame.text;
    this._length = frame.text.length;
    this._timeText = (new Date(frame.time * 1000)).toLocaleTimeString();

    this._isTextFrame = frame.opCode === WebInspector.ResourceWebSocketFrameView.OpCodes.TextFrame;
    if (!this._isTextFrame)
        this._dataText = WebInspector.ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);

    WebInspector.SortableDataGridNode.call(this, {data: this._dataText, length: this._length, time: this._timeText});
}

WebInspector.ResourceWebSocketFrameNode.prototype = {
    /** override */
    createCells: function()
    {
        var element = this._element;
        element.classList.toggle("websocket-frame-view-row-error", this._frame.type === WebInspector.NetworkRequest.WebSocketFrameType.Error);
        element.classList.toggle("websocket-frame-view-row-outcoming", this._frame.type === WebInspector.NetworkRequest.WebSocketFrameType.Send);
        element.classList.toggle("websocket-frame-view-row-opcode", !this._isTextFrame);
        WebInspector.SortableDataGridNode.prototype.createCells.call(this);
    },

    __proto__: WebInspector.SortableDataGridNode.prototype
}

/**
 * @param {!WebInspector.ResourceWebSocketFrameNode} a
 * @param {!WebInspector.ResourceWebSocketFrameNode} b
 * @return {number}
 */
WebInspector.ResourceWebSocketFrameNodeTimeComparator = function(a, b)
{
    return a._frame.time - b._frame.time;
}
