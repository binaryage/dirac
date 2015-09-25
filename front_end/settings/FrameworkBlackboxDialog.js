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
    this.element.classList.add("blackbox-dialog", "dialog-contents");

    var header = this.element.createChild("div", "header");
    header.createChild("span").textContent = WebInspector.UIString("Framework blackbox patterns");

    var contents = this.element.createChild("div", "contents");

    var contentScriptsSection = contents.createChild("div", "blackbox-content-scripts");
    contentScriptsSection.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Blackbox content scripts"), WebInspector.moduleSetting("skipContentScripts"), true));

    var blockHeader = contents.createChild("div", "columns-header");
    blockHeader.createChild("span").textContent = WebInspector.UIString("URI pattern");
    blockHeader.createChild("span").textContent = WebInspector.UIString("Behavior");

    var section = contents.createChild("div", "section");
    var container = section.createChild("div", "settings-list-container");

    this._blackboxLabel = WebInspector.UIString("Blackbox");
    this._disabledLabel = WebInspector.UIString("Disabled");

    var column1 = { id: "pattern", placeholder: "/framework\\.js$" };
    var column2 = { id: "value", options: [this._blackboxLabel, this._disabledLabel] };

    this._patternsList = new WebInspector.EditableSettingsList([column1, column2], this._patternValuesProvider.bind(this), this._patternValidate.bind(this), this._patternEdit.bind(this));
    this._patternsList.element.classList.add("blackbox-patterns-list");
    this._patternsList.addEventListener(WebInspector.SettingsList.Events.Removed, this._patternRemovedFromList.bind(this));
    container.appendChild(this._patternsList.element);

    /** @type {!Map.<string, string>} */
    this._entries = new Map();
    var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
    for (var i = 0; i < patterns.length; ++i)
        this._addPattern(patterns[i].pattern, patterns[i].disabled);

    this.element.tabIndex = 0;
}

WebInspector.FrameworkBlackboxDialog.show = function()
{
    var dialog = new WebInspector.FrameworkBlackboxDialog();
    WebInspector.Dialog.show(dialog, false, true);
    var glassPane = dialog.element.ownerDocument.getElementById("glass-pane");
    glassPane.classList.add("settings-glass-pane");
}

WebInspector.FrameworkBlackboxDialog.prototype = {
    /**
     * @override
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
        if (!this._dialogElement || !this._container)
            return;

        const minWidth = 200;
        const minHeight = 150;
        var maxHeight = this._container.offsetHeight - 10;
        maxHeight = Math.max(minHeight, maxHeight);
        var maxWidth = Math.min(540, this._container.offsetWidth - 10);
        maxWidth = Math.max(minWidth, maxWidth);
        this._dialogElement.style.maxHeight = maxHeight + "px";
        this._dialogElement.style.width = maxWidth + "px";

        WebInspector.DialogDelegate.prototype.position(this._dialogElement, this._container);
    },

    /**
     * @override
     * @param {!Element} element
     * @param {!Element} container
     */
    position: function(element, container)
    {
        this._container = container;
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
            return /** @type {string} */ (this._entries.get(itemId));
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
        var oldPattern = itemId;
        var newPattern = data["pattern"];
        try {
            if (newPattern && (oldPattern === newPattern || !this._entries.has(newPattern)))
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
        var disabled = (data["value"] === this._disabledLabel);

        var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        for (var i = 0; i <= patterns.length; ++i) {
            if (i === patterns.length) {
                patterns.push({ pattern: newPattern, disabled: disabled });
                break;
            }
            if (patterns[i].pattern === oldPattern) {
                patterns[i] = { pattern: newPattern, disabled: disabled };
                break;
            }
        }
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(patterns);

        if (oldPattern && oldPattern === newPattern) {
            this._entries.set(newPattern, disabled ? this._disabledLabel : this._blackboxLabel);
            this._patternsList.itemForId(oldPattern).classList.toggle("disabled", disabled);
            this._patternsList.refreshItem(newPattern);
            return;
        }

        if (oldPattern) {
            this._patternsList.removeItem(oldPattern);
            this._entries.remove(oldPattern);
        }
        this._addPattern(newPattern, disabled);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _patternRemovedFromList: function(event)
    {
        var pattern = /** @type{?string} */ (event.data);
        if (!pattern)
            return;
        this._entries.remove(pattern);

        var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        for (var i = 0; i < patterns.length; ++i) {
            if (patterns[i].pattern === pattern) {
                patterns.splice(i, 1);
                break;
            }
        }
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(patterns);
    },

    /**
     * @param {string} pattern
     * @param {boolean=} disabled
     */
    _addPattern: function(pattern, disabled)
    {
        if (!pattern || this._entries.has(pattern))
            return;
        this._entries.set(pattern, disabled ? this._disabledLabel : this._blackboxLabel);
        var listItem = this._patternsList.addItem(pattern, null);
        listItem.classList.toggle("disabled", disabled);
        this._resize();
    },

    focus: function()
    {
        WebInspector.setCurrentFocusElement(this.element);
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
