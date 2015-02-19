// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.ElementsSidebarPane}
 */
WebInspector.AccessibilitySidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Accessibility"));

    // FIXME(aboxhall): move into ElementsSidebarPane.
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onNodeChange, this);
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
}

WebInspector.AccessibilitySidebarPane.prototype = {
    /**
     * @override
     * @param {!WebInspector.Throttler.FinishCallback} finishCallback
     * @protected
     */
    doUpdate: function(finishCallback)
    {
        if (!this.isShowing())
            return;
        /**
         * @param {?AccessibilityAgent.AXNode} accessibilityNode
         * @this {WebInspector.AccessibilitySidebarPane}
         */
        function accessibilityNodeCallback(accessibilityNode)
        {
            this.accessibilityNodeDetails.setNode(accessibilityNode);

            finishCallback();
        }

        this.node().target().accessibilityModel.getAXNode(this.node().id, accessibilityNodeCallback.bind(this));
    },

    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ElementsSidebarPane.prototype.wasShown.call(this);
        if (!this.accessibilityNodeDetails) {
            this.accessibilityNodeDetails = new WebInspector.AccessibilityNodeDetailsSection("Accessibility Node");
            this.bodyElement.appendChild(this.accessibilityNodeDetails.element);
            this.accessibilityNodeDetails.expand();
        }
    },


    /**
     * @param {!WebInspector.Event} event
     */
    _onNodeChange: function(event)
    {
        if (!this.node() || !this.isShowing())
            return;

        var data = event.data;
        var node = /** @type {!WebInspector.DOMNode} */ (data instanceof WebInspector.DOMNode ? data : data.node);
        if (this.node() !== node)
            return;

        this.update();
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
};

/**
 * Section for displaying all information about an accessibility node.
 * @constructor
 * @extends {WebInspector.PropertiesSection}
 * @param {string|!Node} title
 * @param {string=} subtitle
 */
WebInspector.AccessibilityNodeDetailsSection = function(title, subtitle)
{
    // FIXME(aboxhall): Use TreeOutline instead.
    WebInspector.PropertiesSection.call(this, title, subtitle);
    this.headerElement.classList.remove("monospace");
    this.headerElement.classList.add("sidebar-separator");

    /** @type {?AccessibilityAgent.AXNode} */
    this._node = null;

    /** @type {!Array.<!WebInspector.RemoteObjectProperty>} */
    this._properties = [];
};

WebInspector.AccessibilityNodeDetailsSection.prototype = {
    /**
     * @param {?AccessibilityAgent.AXNode} node
     */
    setNode: function(node)
    {
        if (this._node === node)
            return;
        this._node = node;

        /**
         * @param {string} propName
         * @param {*} propValue
         * @return {!WebInspector.RemoteObjectProperty}
         */
        function buildProperty(propName, propValue)
        {
            var propValueObject = WebInspector.RemoteObject.fromLocalObject(propValue);
            return new WebInspector.RemoteObjectProperty(propName, propValueObject);
        }

        var nodeProperties = /** @type {!Array.<!WebInspector.RemoteObjectProperty>} */ ([]);
        if (node) {
            nodeProperties.push(buildProperty("role", node.role));
            if ("name" in node)
                nodeProperties.push(buildProperty("name", node.name));
            if ("description" in node)
                nodeProperties.push(buildProperty("description", node.description));
            if ("help" in node)
                nodeProperties.push(buildProperty("help", node.help));
            if ("value" in node)
                nodeProperties.push(buildProperty("value", node.value));
            if ("widgetProperties" in node) {
                for (var p in node.widgetProperties)
                    nodeProperties.push(buildProperty(p, node.widgetProperties[p]));
            }
            if ("widgetStates" in node) {
                for (var p in node.widgetStates)
                    nodeProperties.push(buildProperty(p, node.widgetStates[p]));
            }
            if ("globalStates" in node) {
                for (var s in node.globalStates)
                    nodeProperties.push(buildProperty(s, node.globalStates[s]));
            }
            if ("liveRegionProperties" in node) {
                for (var p in node.liveRegionProperties)
                    nodeProperties.push(buildProperty(p,  node.liveRegionProperties[p]));
            }
            // TODO(aboxhall): relationships, parent, children
        }

        this._properties = nodeProperties;
        this.update();
    },

    hide: function()
    {
        this.element.classList.add("hidden");
    },

    show: function()
    {
        this.element.classList.remove("hidden");
    },

    update: function()
    {
        this.propertiesTreeOutline.removeChildren();
        if (!this._node || !this._node.nodeId) {
            this.hide();
            return;
        }

        // use this.propertiesTreeOutline.appendChild() for each property
        // this calls _attach() on the treeelement
        function identityComparator() { return 0; }
        var doSkipProto = true;

        WebInspector.ObjectPropertyTreeElement.populateWithProperties(
            this.propertiesTreeOutline,
            this._properties,
            null,
            WebInspector.AccessibilityNodePropertyTreeElement,
            identityComparator,
            doSkipProto,
            null);
        this.show();
    },

    __proto__: WebInspector.PropertiesSection.prototype
};

/**
 * @constructor
 * @extends {WebInspector.ObjectPropertyTreeElement}
 * @param {!WebInspector.RemoteObjectProperty} property
 */
WebInspector.AccessibilityNodePropertyTreeElement = function(property)
{
    WebInspector.ObjectPropertyTreeElement.call(this, property);
};

WebInspector.AccessibilityNodePropertyTreeElement.prototype = {
    /**
     * @override
     */
    startEditing: function(event)
    {
        // Don't allow editing
    },

    /**
     * @override
     */
    update: function()
    {
        WebInspector.ObjectPropertyTreeElement.prototype.update.call(this);
        if (this.property.name === "role" && this.property.value.description === "") {
            this.valueElement.classList.remove("console-formatted-string");
            this.valueElement.classList.add("console-formatted-undefined");
            this.valueElement.textContent = WebInspector.UIString("<No matching ARIA role>");
        }
    },

    __proto__: WebInspector.ObjectPropertyTreeElement.prototype
};
