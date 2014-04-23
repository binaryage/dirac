/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 */
WebInspector.ThreadsToolbar = function()
{
    this.element = document.createElement("div");
    this.element.className = "status-bar scripts-debug-toolbar threads-toolbar hidden";
    this._comboBox = new WebInspector.StatusBarComboBox(this._onComboBoxSelectionChange.bind(this));
    this.element.appendChild(this._comboBox.element);

    this._reset();
    if (WebInspector.experimentsSettings.workersInMainWindow.isEnabled()) {
        WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerAdded, this._workerAdded, this);
        WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkerRemoved, this._workerRemoved, this);
        WebInspector.workerManager.addEventListener(WebInspector.WorkerManager.Events.WorkersCleared, this._workersCleared, this);
    }
}

WebInspector.ThreadsToolbar.prototype = {

    _reset: function()
    {
        if (!WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
             return;

        this._threadIdToOption = {};

        var connectedThreads = WebInspector.workerManager.threadsList();
        for (var i = 0; i < connectedThreads.length; ++i)  {
            var threadId = connectedThreads[i];
            this._addOption(threadId, WebInspector.workerManager.threadUrl(threadId));
        }

        this._alterVisibility();
        this._comboBox.select(this._threadIdToOption[WebInspector.workerManager.selectedThreadId()]);
    },

    /**
     * @param {number} workerId
     * @param {string} url
     */
    _addOption: function(workerId, url)
    {
        var option = this._comboBox.createOption(url, "", String(workerId));
        this._threadIdToOption[workerId] = option;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _workerAdded: function(event)
    {
        var data = /** @type {{workerId: number, url: string}} */ (event.data);
        this._addOption(data.workerId, data.url);
        this._alterVisibility();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _workerRemoved: function(event)
    {
        var data = /** @type {{workerId: number, url: string}} */ (event.data);
        this._comboBox.removeOption(this._threadIdToOption[data.workerId]);
        delete this._threadIdToOption[data.workerId];
        this._alterVisibility();
    },

    _workersCleared: function()
    {
        this._comboBox.removeOptions();
        this._reset();
    },

    _onComboBoxSelectionChange: function()
    {
        var selectedOption = this._comboBox.selectedOption();
        if (!selectedOption)
            return;

        WebInspector.workerManager.setSelectedThreadId(parseInt(selectedOption.value, 10));
    },

    _alterVisibility: function()
    {
        var hidden = this._comboBox.size() === 1;
        this.element.classList.toggle("hidden", hidden);
    }

}
