// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!Document} doc
 */
WebInspector.Tooltip = function(doc)
{
    this.element = doc.body.createChild("div");
    this._shadowRoot = WebInspector.createShadowRootWithCoreStyles(this.element);
    this._shadowRoot.appendChild(WebInspector.Widget.createStyleElement("ui/tooltip.css"));

    this._tooltipElement = this._shadowRoot.createChild("div", "tooltip");
    this._arrowElement = this._shadowRoot.createChild("div", "tooltip-arrow");
    doc.addEventListener("mousemove", this._mouseMove.bind(this), false);
}

WebInspector.Tooltip.Timing = {
    // Max time between tooltips showing that no opening delay is required.
    "InstantThreshold": 300,
    // Wait time before opening a tooltip.
    "OpeningDelay": 400
}

WebInspector.Tooltip.AlignmentOverride = {
    Right: "Right"
}

WebInspector.Tooltip.prototype = {
    /**
     * @param {!Event} event
     */
    _mouseMove: function(event)
    {
        var path = event.deepPath ? event.deepPath : event.path;
        if (!path)
            return;

        if (this._anchorElement && path.indexOf(this._anchorElement) === -1)
            this._hide();

        for (var element of path) {
            if (element === this._anchorElement) {
                return;
            } else if (element[WebInspector.Tooltip._symbol]) {
                this._show(element);
                return;
            }
        }
    },

    /**
     * @param {!Element} anchorElement
     */
    _show: function(anchorElement)
    {
        var tooltip = anchorElement[WebInspector.Tooltip._symbol];
        this._anchorElement = anchorElement;
        this._tooltipElement.removeChildren();
        if (typeof tooltip.content === "string")
            this._tooltipElement.textContent = tooltip.content;
        else
            this._tooltipElement.appendChild(tooltip.content);

        if (tooltip.actionId) {
            var shortcuts = WebInspector.shortcutRegistry.shortcutDescriptorsForAction(tooltip.actionId);
            if (shortcuts && shortcuts.length) {
                var shortcutElement = this._tooltipElement.createChild("div", "tooltip-shortcut");
                shortcutElement.textContent = shortcuts[0].name;
            }
        }

        this._tooltipElement.classList.add("shown");
        // Reposition to ensure text doesn't overflow unnecessarily.
        this._tooltipElement.positionAt(0, 0);

        // Show tooltip instantly if a tooltip was shown recently.
        var now = Date.now();
        var instant = (this._tooltipLastClosed && now - this._tooltipLastClosed < WebInspector.Tooltip.Timing.InstantThreshold);
        this._tooltipElement.classList.toggle("instant", instant);
        this._tooltipLastOpened = instant ? now : now + WebInspector.Tooltip.Timing.OpeningDelay;

        // Get container element.
        var container = WebInspector.Dialog.modalHostView().element;
        if (!anchorElement.isDescendant(container))
            container = this.element.parentElement;

        // Posititon tooltip based on the anchor element.
        var containerOffset = container.offsetRelativeToWindow(this.element.window());
        var containerOffsetWidth = container.offsetWidth;
        var anchorBox = this._anchorElement.boxInWindow(this.element.window());
        const arrowSize = 4;
        const pageMargin = 2;
        this._tooltipElement.style.maxWidth = (containerOffsetWidth - pageMargin * 2) + "px";
        var tooltipWidth = this._tooltipElement.offsetWidth;
        var tooltipHeight = this._tooltipElement.offsetHeight;
        var tooltipX = anchorBox.x + anchorBox.width / 2 - tooltipWidth / 2;
        if (tooltip.alignment === WebInspector.Tooltip.AlignmentOverride.Right)
            tooltipX = anchorBox.x;
        tooltipX = Number.constrain(tooltipX,
            containerOffset.x + pageMargin,
            containerOffset.x + containerOffsetWidth - tooltipWidth - pageMargin);
        var onBottom = anchorBox.y - arrowSize - anchorBox.height < containerOffset.y;
        var tooltipY = onBottom ? anchorBox.y + anchorBox.height + arrowSize : anchorBox.y - tooltipHeight - arrowSize;
        this._tooltipElement.positionAt(tooltipX, tooltipY);

        // Position arrow next to anchor element.
        this._arrowElement.positionAt(anchorBox.x + anchorBox.width / 2, onBottom ? anchorBox.y + anchorBox.height : anchorBox.y - arrowSize);
        this._arrowElement.classList.toggle("tooltip-arrow-top", !onBottom);
    },

    _hide: function()
    {
        delete this._anchorElement;
        this._tooltipElement.classList.remove("shown");
        if (Date.now() > this._tooltipLastOpened)
            this._tooltipLastClosed = Date.now();
    }
}

WebInspector.Tooltip._symbol = Symbol("Tooltip");

/**
 * @param {!Document} doc
 */
WebInspector.Tooltip.installHandler = function(doc)
{
    new WebInspector.Tooltip(doc);
}

/**
 * @param {!Element} element
 * @param {!Element|string} tooltipContent
 * @param {string=} alignment
 * @param {string=} actionId
 */
WebInspector.Tooltip.install = function(element, tooltipContent, alignment, actionId)
{
    if (Runtime.experiments.isEnabled("tooltips"))
        element[WebInspector.Tooltip._symbol] =  { content: tooltipContent, alignment: alignment, actionId: actionId };
    else if (typeof tooltipContent === "string")
        element.title = tooltipContent;
    else
        console.assert("Cannot set an element without custom tooltips enabled");
}
