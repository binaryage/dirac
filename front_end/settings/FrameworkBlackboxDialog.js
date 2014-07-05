/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.DialogDelegate}
 */
WebInspector.FrameworkBlackboxDialog = function()
{
    WebInspector.DialogDelegate.call(this);

    this.element = document.createElementWithClass("div", "blackbox-dialog dialog-contents");

    var header = this.element.createChild("div", "header");
    header.createChild("span").textContent = WebInspector.UIString("Framework blackbox patterns");

    var closeButton = header.createChild("div", "close-button-gray done-button");
    closeButton.addEventListener("click", this._onDoneClick.bind(this), false);

    var contents = this.element.createChild("div", "contents");

    var blockHeader = contents.createChild("div", "columns-header");
    blockHeader.createChild("span").textContent = WebInspector.UIString("URI pattern");
    blockHeader.createChild("span").textContent = WebInspector.UIString("Behavior");

    var section = contents.createChild("div", "section");
    var container = section.createChild("div", "settings-list-container");

    var column1 = { id: "pattern", placeholder: "/framework\\.js$" };
    var column2 = { id: "value", options: [WebInspector.UIString("Blackbox")] };

    this._patternsList = new WebInspector.EditableSettingsList([column1, column2], this._patternValuesProvider.bind(this), this._patternValidate.bind(this), this._patternEdit.bind(this));
    this._patternsList.addEventListener(WebInspector.SettingsList.Events.Removed, this._patternRemovedFromList.bind(this));
    container.appendChild(this._patternsList.element);

    /** @type {!Object.<string, boolean>} */
    this._entries = {};
    var patterns = WebInspector.settings.skipStackFramesPattern.getAsArray();
    for (var i = 0; i < patterns.length; ++i)
        this._addPattern(patterns[i]);

    this.element.tabIndex = 0;
}

WebInspector.FrameworkBlackboxDialog.show = function(element)
{
    WebInspector.Dialog.show(element, new WebInspector.FrameworkBlackboxDialog());
    var glassPane = document.getElementById("glass-pane");
    glassPane.classList.add("settings-glass-pane");
}

WebInspector.FrameworkBlackboxDialog.prototype = {
    /**
     * @param {!Element} element
     */
    show: function(element)
    {
        this._dialogElement = element;
        element.appendChild(this.element);
        element.classList.add("settings-dialog", "settings-tab");
    },

    _resize: function()
    {
        if (!this._dialogElement || !this._relativeToElement)
            return;

        const minWidth = 200;
        const minHeight = 150;
        var maxHeight = this._relativeToElement.offsetHeight - 10;
        maxHeight = Math.max(minHeight, maxHeight);
        var maxWidth = Math.min(540, this._relativeToElement.offsetWidth - 10);
        maxWidth = Math.max(minWidth, maxWidth);
        this._dialogElement.style.maxHeight = maxHeight + "px";
        this._dialogElement.style.width = maxWidth + "px";

        WebInspector.DialogDelegate.prototype.position(this._dialogElement, this._relativeToElement);
    },

    /**
     * @param {!Element} element
     * @param {!Element} relativeToElement
     */
    position: function(element, relativeToElement)
    {
        this._relativeToElement = relativeToElement;
        this._resize();
    },

    willHide: function(event)
    {
    },

    /**
     * @param {string} itemId
     * @param {string} columnId
     * @return {string}
     */
    _patternValuesProvider: function(itemId, columnId)
    {
        if (!itemId)
            return "";
        switch (columnId) {
        case "pattern":
            return itemId;
        case "value":
            return WebInspector.UIString("Blackbox");
        default:
            console.assert("Should not be reached.");
        }
        return "";
    },

    /**
     * @param {?string} itemId
     * @param {!Object} data
     * @return {!Array.<string>}
     */
    _patternValidate: function(itemId, data)
    {
        var regex;
        var newPattern = data["pattern"];
        try {
            if (newPattern && !this._entries[newPattern])
                regex = new RegExp(newPattern);
        } catch (e) {
        }
        return regex ? [] : ["pattern"];
    },

    /**
     * @param {?string} itemId
     * @param {!Object} data
     */
    _patternEdit: function(itemId, data)
    {
        var oldPattern = itemId;
        var newPattern = data["pattern"];
        if (!newPattern)
            return;

        var patterns = WebInspector.settings.skipStackFramesPattern.getAsArray();
        var pos = oldPattern ? patterns.indexOf(oldPattern) : -1;
        if (pos === -1)
            patterns.push(newPattern);
        else
            patterns[pos] = newPattern;
        WebInspector.settings.skipStackFramesPattern.setAsArray(patterns);

        if (oldPattern) {
            this._patternsList.removeItem(oldPattern);
            delete this._entries[oldPattern];
        }
        this._addPattern(newPattern);
        this._patternsList.selectItem(newPattern);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _patternRemovedFromList: function(event)
    {
        var pattern = /** @type{?string} */ (event.data);
        if (!pattern)
            return;
        delete this._entries[pattern];

        var patterns = WebInspector.settings.skipStackFramesPattern.getAsArray();
        patterns.remove(pattern);
        WebInspector.settings.skipStackFramesPattern.setAsArray(patterns);
    },

    /**
     * @param {string} pattern
     */
    _addPattern: function(pattern)
    {
        if (!pattern || this._entries[pattern])
            return;
        this._entries[pattern] = true;
        this._patternsList.addItem(pattern, null);
        this._resize();
    },

    focus: function()
    {
        WebInspector.setCurrentFocusElement(this.element);
    },

    _onDoneClick: function()
    {
        WebInspector.Dialog.hide();
    },

    onEnter: function(event)
    {
        var focusElement = WebInspector.currentFocusElement();
        var nodeName = focusElement && focusElement.nodeName.toLowerCase();
        if (nodeName === "input" || nodeName === "select") {
            this.focus();
            event.consume(true);
            return;
        }
    },

    __proto__: WebInspector.DialogDelegate.prototype
}
