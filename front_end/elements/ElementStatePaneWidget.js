// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.StylesSidebarPane.BaseToolbarPaneWidget}
 * @param {!WebInspector.ToolbarItem} toolbarItem
 */
WebInspector.ElementStatePaneWidget = function(toolbarItem)
{
    WebInspector.StylesSidebarPane.BaseToolbarPaneWidget.call(this, toolbarItem);
    this.element.className = "styles-element-state-pane source-code";
    var table = createElement("table");

    var inputs = [];
    this._inputs = inputs;

    /**
     * @param {!Event} event
     */
    function clickListener(event)
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return;
        WebInspector.CSSStyleModel.fromNode(node).forcePseudoState(node, event.target.state, event.target.checked);
    }

    /**
     * @param {string} state
     * @return {!Element}
     */
    function createCheckbox(state)
    {
        var td = createElement("td");
        var label = createCheckboxLabel(":" + state);
        var input = label.checkboxElement;
        input.state = state;
        input.addEventListener("click", clickListener, false);
        inputs.push(input);
        td.appendChild(label);
        return td;
    }

    var tr = table.createChild("tr");
    tr.appendChild(createCheckbox.call(null, "active"));
    tr.appendChild(createCheckbox.call(null, "hover"));

    tr = table.createChild("tr");
    tr.appendChild(createCheckbox.call(null, "focus"));
    tr.appendChild(createCheckbox.call(null, "visited"));

    this.element.appendChild(table);
}

WebInspector.ElementStatePaneWidget.prototype = {
    /**
     * @override
     * @param {?WebInspector.DOMNode} newNode
     */
    onNodeChanged: function(newNode)
    {
        this.toolbarItem().setEnabled(!!newNode);
        if (!newNode && this.isShowing()) {
            this.detach();
            return;
        }

        var nodePseudoState = newNode.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName) || [];
        var inputs = this._inputs;
        for (var i = 0; i < inputs.length; ++i) {
            inputs[i].disabled = !!newNode.pseudoType();
            inputs[i].checked = nodePseudoState.indexOf(inputs[i].state) >= 0;
        }
    },

    __proto__: WebInspector.StylesSidebarPane.BaseToolbarPaneWidget.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.ElementStatePaneWidget.ButtonProvider = function()
{
    this._button = new WebInspector.ToolbarButton(WebInspector.UIString("Toggle Element State"), "element-state-toolbar-item");
    this._button.addEventListener("click", this._clicked, this);
    this._view = new WebInspector.ElementStatePaneWidget(this.item());
}

WebInspector.ElementStatePaneWidget.ButtonProvider.prototype = {
    _clicked: function()
    {
        var stylesSidebarPane = WebInspector.ElementsPanel.instance().sidebarPanes.styles;
        stylesSidebarPane.showToolbarPane(!this._view.isShowing() ? this._view : null);
    },

    /**
     * @override
     * @return {!WebInspector.ToolbarItem}
     */
    item: function()
    {
        return this._button;
    }
}
