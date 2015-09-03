// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.BlockedURLsPane = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("network/blockedURLsPane.css");

    this._blockedURLsSetting = WebInspector.moduleSetting("blockedURLs");
    this._blockedURLsSetting.addChangeListener(this._update, this);

    this._toolbar = new WebInspector.Toolbar(this.contentElement);
    this._toolbar.element.addEventListener("click", consumeEvent);
    this._toolbar.appendToolbarItem(new WebInspector.ToolbarText(WebInspector.UIString("Requests containing following URLs will be blocked")));
    this._toolbar.appendToolbarItem(new WebInspector.ToolbarItem(createElementWithClass("div", "flex-auto-important")));
    var addButton = new WebInspector.ToolbarButton(WebInspector.UIString("Add URL"), "add-toolbar-item");
    addButton.addEventListener("click", this._addButtonClicked.bind(this));
    this._toolbar.appendToolbarItem(addButton);
    var clearButton = new WebInspector.ToolbarButton(WebInspector.UIString("Remove all"), "clear-toolbar-item");
    clearButton.addEventListener("click", this._removeAll.bind(this));
    this._toolbar.appendToolbarItem(clearButton);

    this._emptyElement = this.contentElement.createChild("div", "no-blocked-urls");
    this._emptyElement.textContent = WebInspector.UIString("No blocked URLs");
    this._emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);

    this._listElement = this.contentElement.createChild("div", "blocked-urls-list");
    this._filterUI = new WebInspector.BlockedURLsPane.FilterUI();

    /** @type {!Map<string, number>} */
    this._blockedCountForUrl = new Map();
    WebInspector.targetManager.addModelListener(WebInspector.NetworkManager, WebInspector.NetworkManager.EventTypes.RequestFinished, this._onRequestFinished, this);

    this._updateThrottler = new WebInspector.Throttler(200);

    this._update();
}

WebInspector.BlockedURLsPane.prototype = {
    /**
     * @return {!WebInspector.FilterUI}
     */
    filterUI: function()
    {
        return this._filterUI;
    },

    /**
     * @param {!Event} event
     */
    _emptyElementContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Add ^URL"), this._addButtonClicked.bind(this));
        contextMenu.show();
    },

    _addButtonClicked: function()
    {
        this._editing = true;
        var element = this._createElement("", this._blockedURLsSetting.get().length);
        this._listElement.appendChild(element);
        element.scrollIntoView();

        /**
         * @param {boolean} accept
         * @param {!Element} e
         * @param {string} text
         * @this {WebInspector.BlockedURLsPane}
         */
        function finishEditing(accept, e, text)
        {
            this._listElement.removeChild(element);
            this._editing = false;
            if (accept && text)
                this._addBlockedURL(text);
            else
                this._update();
        }

        WebInspector.InplaceEditor.startEditing(element._label, new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false)));
    },

    /**
     * @param {string} url
     */
    _addBlockedURL: function(url)
    {
        var blocked = this._blockedURLsSetting.get();
        blocked.push(url);
        this._blockedURLsSetting.set(blocked);
    },

    /**
     * @param {number} index
     */
    _removeBlockedURL: function(index)
    {
        var blocked = this._blockedURLsSetting.get();
        blocked.splice(index, 1);
        this._blockedURLsSetting.set(blocked);
    },

    /**
     * @param {number} index
     * @param {string} url
     */
    _changeBlockedURL: function(index, url)
    {
        var blocked = this._blockedURLsSetting.get();
        blocked.splice(index, 1, url);
        this._blockedURLsSetting.set(blocked);
    },

    _removeAll: function()
    {
        this._blockedURLsSetting.set([]);
    },

    /**
     * @param {number} index
     * @param {!Event} event
     */
    _contextMenu: function(index, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Add ^URL"), this._addButtonClicked.bind(this));
        contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^URL"), this._removeBlockedURL.bind(this, index));
        contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^all"), this._removeAll.bind(this));
        contextMenu.show();
    },

    /**
     * @param {!Element} element
     * @param {number} index
     */
    _labelClicked: function(element, index)
    {
        this._editing = true;

         /**
         * @param {boolean} accept
         * @param {!Element} e
         * @param {string} text
         * @this {WebInspector.BlockedURLsPane}
         */
        function finishEditing(accept, e, text)
        {
            this._editing = false;
            if (accept)
                this._changeBlockedURL(index, text);
            else
                this._update();
        }

        WebInspector.InplaceEditor.startEditing(element, new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false)));
    },

    /**
     * @return {!Promise<?>}
     */
    _update: function()
    {
        if (this._editing)
            return Promise.resolve();

        this._listElement.removeChildren();
        var blocked = this._blockedURLsSetting.get();
        for (var index = 0; index < blocked.length; index++)
            this._listElement.appendChild(this._createElement(blocked[index], index));

        this._emptyElement.classList.toggle("hidden", !!blocked.length);
        this._filterUI.setActive(!!blocked.length);
        this._filterUI.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged);

        return Promise.resolve();
    },

    /**
     * @param {string} url
     * @param {number} index
     * @return {!Element}
     */
    _createElement: function(url, index)
    {
        var element = createElementWithClass("div", "blocked-url");

        var label = element.createChild("div", "blocked-url-text");
        element._label = label;
        label.textContent = url;

        var count = this._blockedRequestsCount(url);
        var countElement = element.createChild("div", "blocked-count monospace");
        countElement.textContent = String.sprintf("[%d]", count);
        countElement.title = WebInspector.UIString(count === 1 ? "%d request blocked by this URL" : "%d requests blocked by this URL", count);

        var removeButton = element.createChild("div", "remove-button");
        removeButton.title = WebInspector.UIString("Remove URL");
        removeButton.addEventListener("click", this._removeBlockedURL.bind(this, index), false);

        element.addEventListener("contextmenu", this._contextMenu.bind(this, index), true);
        element.addEventListener("dblclick", this._labelClicked.bind(this, label, index), false);
        return element;
    },

    /**
     * @param {string} url
     * @return {number}
     */
    _blockedRequestsCount: function(url)
    {
        if (!url)
            return 0;

        var result = 0;
        for (var blockedUrl of this._blockedCountForUrl.keys()) {
            if (blockedUrl.indexOf(url) !== -1)
                result += this._blockedCountForUrl.get(blockedUrl);
        }
        return result;
    },

    reset: function()
    {
        this._blockedCountForUrl.clear();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestFinished: function(event)
    {
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        if (request.wasBlocked()) {
            var count = this._blockedCountForUrl.get(request.url) || 0;
            this._blockedCountForUrl.set(request.url, count + 1);
            this._updateThrottler.schedule(this._update.bind(this));
        }
    },

    __proto__: WebInspector.VBox.prototype
}


/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.FilterUI}
 */
WebInspector.BlockedURLsPane.FilterUI = function()
{
    WebInspector.Object.call(this);
    this._active = false;
    this._element = createElement("span");
}

WebInspector.BlockedURLsPane.FilterUI.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isActive: function()
    {
        return this._active;
    },

    /**
     * @param {boolean} active
     */
    setActive: function(active)
    {
        this._active = active;
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._element;
    },

    __proto__: WebInspector.Object.prototype
}
