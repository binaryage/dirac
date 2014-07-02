// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.TargetsToolbar = function()
{
    this.element = document.createElementWithClass("div", "status-bar scripts-debug-toolbar targets-toolbar hidden");
    this._comboBox = new WebInspector.StatusBarComboBox(this._onComboBoxSelectionChange.bind(this));
    this.element.appendChild(this._comboBox.element);

    /** @type {!Map.<!WebInspector.Target, !Element>} */
    this._targetToOption = new Map();
    if (!WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
        return;

    WebInspector.context.addFlavorChangeListener(WebInspector.Target, this._targetChangedExternally, this);
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.TargetsToolbar.prototype = {

    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var option = this._comboBox.createOption(target.name());
        option.__target = target;
        this._targetToOption.put(target, option);
        if (WebInspector.context.flavor(WebInspector.Target) === target)
            this._comboBox.select(option);

        this._updateVisibility();
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var option = this._targetToOption.remove(target);
        this._comboBox.removeOption(option);
        this._updateVisibility();
    },

    _onComboBoxSelectionChange: function()
    {
        var selectedOption = this._comboBox.selectedOption();
        if (!selectedOption)
            return;

        WebInspector.context.setFlavor(WebInspector.Target, selectedOption.__target);
    },

    _updateVisibility: function()
    {
        var hidden = this._comboBox.size() === 1;
        this.element.classList.toggle("hidden", hidden);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _targetChangedExternally: function(event)
    {
        var target = /** @type {?WebInspector.Target} */ (event.data);
        if (target) {
            var option = /** @type {!Element} */ (this._targetToOption.get(target));
            this._comboBox.select(option);
        }
    }

}
