/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {TreeOutline}
 * @param {!WebInspector.Target} target
 * @param {boolean=} omitRootDOMNode
 * @param {boolean=} selectEnabled
 * @param {function(!WebInspector.ContextMenu, !WebInspector.DOMNode)=} contextMenuCallback
 * @param {function(!WebInspector.DOMNode, string, boolean)=} setPseudoClassCallback
 */
WebInspector.ElementsTreeOutline = function(target, omitRootDOMNode, selectEnabled, contextMenuCallback, setPseudoClassCallback)
{
    this._target = target;
    this._domModel = target.domModel;
    this.element = document.createElement("ol");
    this.element.className = "elements-tree-outline";
    this.element.addEventListener("mousedown", this._onmousedown.bind(this), false);
    this.element.addEventListener("mousemove", this._onmousemove.bind(this), false);
    this.element.addEventListener("mouseout", this._onmouseout.bind(this), false);
    this.element.addEventListener("dragstart", this._ondragstart.bind(this), false);
    this.element.addEventListener("dragover", this._ondragover.bind(this), false);
    this.element.addEventListener("dragleave", this._ondragleave.bind(this), false);
    this.element.addEventListener("drop", this._ondrop.bind(this), false);
    this.element.addEventListener("dragend", this._ondragend.bind(this), false);
    this.element.addEventListener("keydown", this._onkeydown.bind(this), false);

    TreeOutline.call(this, this.element);

    this._includeRootDOMNode = !omitRootDOMNode;
    this._selectEnabled = selectEnabled;
    /** @type {?WebInspector.DOMNode} */
    this._rootDOMNode = null;
    /** @type {?WebInspector.DOMNode} */
    this._selectedDOMNode = null;
    this._eventSupport = new WebInspector.Object();

    this._visible = false;

    this.element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
    this._contextMenuCallback = contextMenuCallback;
    this._setPseudoClassCallback = setPseudoClassCallback;
    this._createNodeDecorators();
}

/**
 * @enum {string}
 */
WebInspector.ElementsTreeOutline.Events = {
    SelectedNodeChanged: "SelectedNodeChanged",
    ElementsTreeUpdated: "ElementsTreeUpdated"
}

/**
 * @const
 * @type {!Object.<string, string>}
 */
WebInspector.ElementsTreeOutline.MappedCharToEntity = {
    "\u00a0": "nbsp",
    "\u2002": "ensp",
    "\u2003": "emsp",
    "\u2009": "thinsp",
    "\u200a": "#8202", // Hairspace
    "\u200b": "#8203", // ZWSP
    "\u200c": "zwnj",
    "\u200d": "zwj",
    "\u200e": "lrm",
    "\u200f": "rlm",
    "\u202a": "#8234", // LRE
    "\u202b": "#8235", // RLE
    "\u202c": "#8236", // PDF
    "\u202d": "#8237", // LRO
    "\u202e": "#8238" // RLO
}

WebInspector.ElementsTreeOutline.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @return {!WebInspector.DOMModel}
     */
    domModel: function()
    {
        return this._domModel;
    },

    /**
     * @param {number} width
     */
    setVisibleWidth: function(width)
    {
        this._visibleWidth = width;
        if (this._multilineEditing)
            this._multilineEditing.setWidth(this._visibleWidth);
    },

    _createNodeDecorators: function()
    {
        this._nodeDecorators = [];
        this._nodeDecorators.push(new WebInspector.ElementsTreeOutline.PseudoStateDecorator());
    },

    wireToDOMModel: function()
    {
        this._elementsTreeUpdater = new WebInspector.ElementsTreeUpdater(this._target.domModel, this);
    },

    unwireFromDOMModel: function()
    {
        if (this._elementsTreeUpdater)
            this._elementsTreeUpdater.dispose();
    },
    /**
     * @param {boolean} visible
     */
    setVisible: function(visible)
    {
        this._visible = visible;
        if (!this._visible)
            return;

        this._updateModifiedNodes();
        if (this._selectedDOMNode)
            this._revealAndSelectNode(this._selectedDOMNode, false);
    },

    addEventListener: function(eventType, listener, thisObject)
    {
        this._eventSupport.addEventListener(eventType, listener, thisObject);
    },

    removeEventListener: function(eventType, listener, thisObject)
    {
        this._eventSupport.removeEventListener(eventType, listener, thisObject);
    },

    get rootDOMNode()
    {
        return this._rootDOMNode;
    },

    set rootDOMNode(x)
    {
        if (this._rootDOMNode === x)
            return;

        this._rootDOMNode = x;

        this._isXMLMimeType = x && x.isXMLNode();

        this.update();
    },

    get isXMLMimeType()
    {
        return this._isXMLMimeType;
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    selectedDOMNode: function()
    {
        return this._selectedDOMNode;
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @param {boolean=} focus
     */
    selectDOMNode: function(node, focus)
    {
        if (this._selectedDOMNode === node) {
            this._revealAndSelectNode(node, !focus);
            return;
        }

        this._selectedDOMNode = node;
        this._revealAndSelectNode(node, !focus);

        // The _revealAndSelectNode() method might find a different element if there is inlined text,
        // and the select() call would change the selectedDOMNode and reenter this setter. So to
        // avoid calling _selectedNodeChanged() twice, first check if _selectedDOMNode is the same
        // node as the one passed in.
        if (this._selectedDOMNode === node)
            this._selectedNodeChanged();
    },

    /**
     * @return {boolean}
     */
    editing: function()
    {
        var node = this.selectedDOMNode();
        if (!node)
            return false;
        var treeElement = this.findTreeElement(node);
        if (!treeElement)
            return false;
        return treeElement._editing || false;
    },

    update: function()
    {
        var selectedNode = this.selectedTreeElement ? this.selectedTreeElement._node : null;

        this.removeChildren();

        if (!this.rootDOMNode)
            return;

        var treeElement;
        if (this._includeRootDOMNode) {
            treeElement = new WebInspector.ElementsTreeElement(this.rootDOMNode);
            treeElement.selectable = this._selectEnabled;
            this.appendChild(treeElement);
        } else {
            // FIXME: this could use findTreeElement to reuse a tree element if it already exists
            var node = this.rootDOMNode.firstChild;
            while (node) {
                treeElement = new WebInspector.ElementsTreeElement(node);
                treeElement.selectable = this._selectEnabled;
                this.appendChild(treeElement);
                node = node.nextSibling;
            }
        }

        if (selectedNode)
            this._revealAndSelectNode(selectedNode, true);
    },

    updateSelection: function()
    {
        if (!this.selectedTreeElement)
            return;
        var element = this.treeOutline.selectedTreeElement;
        element.updateSelection();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    updateOpenCloseTags: function(node)
    {
        var treeElement = this.findTreeElement(node);
        if (treeElement)
            treeElement.updateTitle();
        var children = treeElement.children;
        var closingTagElement = children[children.length - 1];
        if (closingTagElement && closingTagElement._elementCloseTag)
            closingTagElement.updateTitle();
    },

    _selectedNodeChanged: function()
    {
        this._eventSupport.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedDOMNode);
    },

    /**
     * @param {!Array.<!WebInspector.DOMNode>} nodes
     */
    _fireElementsTreeUpdated: function(nodes)
    {
        this._eventSupport.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?TreeElement}
     */
    findTreeElement: function(node)
    {
        function isAncestorNode(ancestor, node)
        {
            return ancestor.isAncestor(node);
        }

        function parentNode(node)
        {
            return node.parentNode;
        }

        var treeElement = TreeOutline.prototype.findTreeElement.call(this, node, isAncestorNode, parentNode);
        if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
            // The text node might have been inlined if it was short, so try to find the parent element.
            treeElement = TreeOutline.prototype.findTreeElement.call(this, node.parentNode, isAncestorNode, parentNode);
        }

        return treeElement;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?TreeElement}
     */
    createTreeElementFor: function(node)
    {
        var treeElement = this.findTreeElement(node);
        if (treeElement)
            return treeElement;
        if (!node.parentNode)
            return null;

        treeElement = this.createTreeElementFor(node.parentNode);
        return treeElement ? treeElement._showChild(node) : null;
    },

    set suppressRevealAndSelect(x)
    {
        if (this._suppressRevealAndSelect === x)
            return;
        this._suppressRevealAndSelect = x;
    },

    /**
     * @param {?WebInspector.DOMNode} node
     * @param {boolean} omitFocus
     */
    _revealAndSelectNode: function(node, omitFocus)
    {
        if (this._suppressRevealAndSelect)
            return;

        if (!this._includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode)
            node = this.rootDOMNode.firstChild;
        if (!node)
            return;
        var treeElement = this.createTreeElementFor(node);
        if (!treeElement)
            return;

        treeElement.revealAndSelect(omitFocus);
    },

    /**
     * @return {?TreeElement}
     */
    _treeElementFromEvent: function(event)
    {
        var scrollContainer = this.element.parentElement;

        // We choose this X coordinate based on the knowledge that our list
        // items extend at least to the right edge of the outer <ol> container.
        // In the no-word-wrap mode the outer <ol> may be wider than the tree container
        // (and partially hidden), in which case we are left to use only its right boundary.
        var x = scrollContainer.totalOffsetLeft() + scrollContainer.offsetWidth - 36;

        var y = event.pageY;

        // Our list items have 1-pixel cracks between them vertically. We avoid
        // the cracks by checking slightly above and slightly below the mouse
        // and seeing if we hit the same element each time.
        var elementUnderMouse = this.treeElementFromPoint(x, y);
        var elementAboveMouse = this.treeElementFromPoint(x, y - 2);
        var element;
        if (elementUnderMouse === elementAboveMouse)
            element = elementUnderMouse;
        else
            element = this.treeElementFromPoint(x, y + 2);

        return element;
    },

    _onmousedown: function(event)
    {
        var element = this._treeElementFromEvent(event);

        if (!element || element.isEventWithinDisclosureTriangle(event))
            return;

        element.select();
    },

    _onmousemove: function(event)
    {
        var element = this._treeElementFromEvent(event);
        if (element && this._previousHoveredElement === element)
            return;

        if (this._previousHoveredElement) {
            this._previousHoveredElement.hovered = false;
            delete this._previousHoveredElement;
        }

        if (element) {
            element.hovered = true;
            this._previousHoveredElement = element;
        }

        if (element && element._node)
            this._domModel.highlightDOMNodeWithConfig(element._node.id, { mode: "all", showInfo: !WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) });
        else
            this._domModel.hideDOMNodeHighlight();
    },

    _onmouseout: function(event)
    {
        var nodeUnderMouse = document.elementFromPoint(event.pageX, event.pageY);
        if (nodeUnderMouse && nodeUnderMouse.isDescendant(this.element))
            return;

        if (this._previousHoveredElement) {
            this._previousHoveredElement.hovered = false;
            delete this._previousHoveredElement;
        }

        this._domModel.hideDOMNodeHighlight();
    },

    _ondragstart: function(event)
    {
        if (!window.getSelection().isCollapsed)
            return false;
        if (event.target.nodeName === "A")
            return false;

        var treeElement = this._treeElementFromEvent(event);
        if (!treeElement)
            return false;

        if (!this._isValidDragSourceOrTarget(treeElement))
            return false;

        if (treeElement._node.nodeName() === "BODY" || treeElement._node.nodeName() === "HEAD")
            return false;

        event.dataTransfer.setData("text/plain", treeElement.listItemElement.textContent);
        event.dataTransfer.effectAllowed = "copyMove";
        this._treeElementBeingDragged = treeElement;

        this._domModel.hideDOMNodeHighlight();

        return true;
    },

    _ondragover: function(event)
    {
        if (!this._treeElementBeingDragged)
            return false;

        var treeElement = this._treeElementFromEvent(event);
        if (!this._isValidDragSourceOrTarget(treeElement))
            return false;

        var node = treeElement._node;
        while (node) {
            if (node === this._treeElementBeingDragged._node)
                return false;
            node = node.parentNode;
        }

        treeElement.updateSelection();
        treeElement.listItemElement.classList.add("elements-drag-over");
        this._dragOverTreeElement = treeElement;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        return false;
    },

    _ondragleave: function(event)
    {
        this._clearDragOverTreeElementMarker();
        event.preventDefault();
        return false;
    },

    /**
     * @param {?TreeElement} treeElement
     * @return {boolean}
     */
    _isValidDragSourceOrTarget: function(treeElement)
    {
        if (!treeElement)
            return false;

        var node = treeElement.representedObject;
        if (!(node instanceof WebInspector.DOMNode))
            return false;

        if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE)
            return false;

        return true;
    },

    _ondrop: function(event)
    {
        event.preventDefault();
        var treeElement = this._treeElementFromEvent(event);
        if (treeElement)
            this._doMove(treeElement);
    },

    /**
     * @param {!TreeElement} treeElement
     */
    _doMove: function(treeElement)
    {
        if (!this._treeElementBeingDragged)
            return;

        var parentNode;
        var anchorNode;

        if (treeElement._elementCloseTag) {
            // Drop onto closing tag -> insert as last child.
            parentNode = treeElement._node;
        } else {
            var dragTargetNode = treeElement._node;
            parentNode = dragTargetNode.parentNode;
            anchorNode = dragTargetNode;
        }

        var wasExpanded = this._treeElementBeingDragged.expanded;
        this._treeElementBeingDragged._node.moveTo(parentNode, anchorNode, this._selectNodeAfterEdit.bind(this, wasExpanded));

        delete this._treeElementBeingDragged;
    },

    _ondragend: function(event)
    {
        event.preventDefault();
        this._clearDragOverTreeElementMarker();
        delete this._treeElementBeingDragged;
    },

    _clearDragOverTreeElementMarker: function()
    {
        if (this._dragOverTreeElement) {
            this._dragOverTreeElement.updateSelection();
            this._dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");
            delete this._dragOverTreeElement;
        }
    },

    /**
     * @param {?Event} event
     */
    _onkeydown: function(event)
    {
        var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
        var node = /** @type {!WebInspector.DOMNode} */ (this.selectedDOMNode());
        console.assert(node);
        var treeElement = this.getCachedTreeElement(node);
        if (!treeElement)
            return;

        if (!treeElement._editing && WebInspector.KeyboardShortcut.hasNoModifiers(keyboardEvent) && keyboardEvent.keyCode === WebInspector.KeyboardShortcut.Keys.H.code) {
            this._toggleHideShortcut(node);
            event.consume(true);
            return;
        }
    },

    _contextMenuEventFired: function(event)
    {
        var treeElement = this._treeElementFromEvent(event);
        if (!treeElement)
            return;

        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(treeElement._node);
        contextMenu.show();
    },

    populateContextMenu: function(contextMenu, event)
    {
        var treeElement = this._treeElementFromEvent(event);
        if (!treeElement)
            return;

        var isPseudoElement = !!treeElement._node.pseudoType();
        var isTag = treeElement._node.nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
        var textNode = event.target.enclosingNodeOrSelfWithClass("webkit-html-text-node");
        if (textNode && textNode.classList.contains("bogus"))
            textNode = null;
        var commentNode = event.target.enclosingNodeOrSelfWithClass("webkit-html-comment");
        contextMenu.appendApplicableItems(event.target);
        if (textNode) {
            contextMenu.appendSeparator();
            treeElement._populateTextContextMenu(contextMenu, textNode);
        } else if (isTag) {
            contextMenu.appendSeparator();
            treeElement._populateTagContextMenu(contextMenu, event);
        } else if (commentNode) {
            contextMenu.appendSeparator();
            treeElement._populateNodeContextMenu(contextMenu, textNode);
        } else if (isPseudoElement) {
            treeElement._populateScrollIntoView(contextMenu);
        } else if (treeElement._node.isShadowRoot()) {
            this.treeOutline._populateContextMenu(contextMenu, treeElement._node);
        }
    },

    _updateModifiedNodes: function()
    {
        if (this._elementsTreeUpdater)
            this._elementsTreeUpdater._updateModifiedNodes();
    },

    _populateContextMenu: function(contextMenu, node)
    {
        if (this._contextMenuCallback)
            this._contextMenuCallback(contextMenu, node);
    },

    handleShortcut: function(event)
    {
        var node = this.selectedDOMNode();
        var treeElement = this.getCachedTreeElement(node);
        if (!node || !treeElement)
            return;

        if (event.keyIdentifier === "F2" && treeElement.hasEditableNode()) {
            this._toggleEditAsHTML(node);
            event.handled = true;
            return;
        }

        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && node.parentNode) {
            if (event.keyIdentifier === "Up" && node.previousSibling) {
                node.moveTo(node.parentNode, node.previousSibling, this._selectNodeAfterEdit.bind(this, treeElement.expanded));
                event.handled = true;
                return;
            }
            if (event.keyIdentifier === "Down" && node.nextSibling) {
                node.moveTo(node.parentNode, node.nextSibling.nextSibling, this._selectNodeAfterEdit.bind(this, treeElement.expanded));
                event.handled = true;
                return;
            }
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    _toggleEditAsHTML: function(node)
    {
        var treeElement = this.getCachedTreeElement(node);
        if (!treeElement)
            return;

        if (treeElement._editing && treeElement._htmlEditElement && WebInspector.isBeingEdited(treeElement._htmlEditElement))
            treeElement._editing.commit();
        else
            treeElement._editAsHTML();
    },

    /**
     * @param {boolean} wasExpanded
     * @param {?Protocol.Error} error
     * @param {!DOMAgent.NodeId=} nodeId
     */
    _selectNodeAfterEdit: function(wasExpanded, error, nodeId)
    {
        if (error)
            return;

        // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
        this._updateModifiedNodes();

        var newNode = nodeId ? this._domModel.nodeForId(nodeId) : null;
        if (!newNode)
            return;

        this.selectDOMNode(newNode, true);

        var newTreeItem = this.findTreeElement(newNode);
        if (wasExpanded) {
            if (newTreeItem)
                newTreeItem.expand();
        }
        return newTreeItem;
    },

    /**
     * Runs a script on the node's remote object that toggles a class name on
     * the node and injects a stylesheet into the head of the node's document
     * containing a rule to set "visibility: hidden" on the class and all it's
     * ancestors.
     *
     * @param {!WebInspector.DOMNode} node
     * @param {function(?WebInspector.RemoteObject, boolean=)=} userCallback
     */
    _toggleHideShortcut: function(node, userCallback)
    {
        var pseudoType = node.pseudoType();
        var effectiveNode = pseudoType ? node.parentNode : node;
        if (!effectiveNode)
            return;

        function resolvedNode(object)
        {
            if (!object)
                return;

            /**
             * @param {?string} pseudoType
             * @suppressReceiverCheck
             * @this {!Element}
             */
            function toggleClassAndInjectStyleRule(pseudoType)
            {
                const classNamePrefix = "__web-inspector-hide";
                const classNameSuffix = "-shortcut__";
                const styleTagId = "__web-inspector-hide-shortcut-style__";
                const styleRules = ".__web-inspector-hide-shortcut__, .__web-inspector-hide-shortcut__ * { visibility: hidden !important; } .__web-inspector-hidebefore-shortcut__::before { visibility: hidden !important; } .__web-inspector-hideafter-shortcut__::after { visibility: hidden !important; }";

                var className = classNamePrefix + (pseudoType || "") + classNameSuffix;
                this.classList.toggle(className);

                var style = document.head.querySelector("style#" + styleTagId);
                if (style)
                    return;

                style = document.createElement("style");
                style.id = styleTagId;
                style.type = "text/css";
                style.textContent = styleRules;
                document.head.appendChild(style);
            }

            object.callFunction(toggleClassAndInjectStyleRule, [{ value: pseudoType }], userCallback);
            object.release();
        }

        effectiveNode.resolveToObject("", resolvedNode);
    },

    __proto__: TreeOutline.prototype
}

/**
 * @interface
 */
WebInspector.ElementsTreeOutline.ElementDecorator = function()
{
}

WebInspector.ElementsTreeOutline.ElementDecorator.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorate: function(node)
    {
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorateAncestor: function(node)
    {
    }
}

/**
 * @constructor
 * @implements {WebInspector.ElementsTreeOutline.ElementDecorator}
 */
WebInspector.ElementsTreeOutline.PseudoStateDecorator = function()
{
    WebInspector.ElementsTreeOutline.ElementDecorator.call(this);
}

WebInspector.ElementsTreeOutline.PseudoStateDecorator.prototype = {
    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorate: function(node)
    {
        if (node.nodeType() !== Node.ELEMENT_NODE)
            return null;
        var propertyValue = node.getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName);
        if (!propertyValue)
            return null;
        return WebInspector.UIString("Element state: %s", ":" + propertyValue.join(", :"));
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?string}
     */
    decorateAncestor: function(node)
    {
        if (node.nodeType() !== Node.ELEMENT_NODE)
            return null;

        var descendantCount = node.descendantUserPropertyCount(WebInspector.CSSStyleModel.PseudoStatePropertyName);
        if (!descendantCount)
            return null;
        if (descendantCount === 1)
            return WebInspector.UIString("%d descendant with forced state", descendantCount);
        return WebInspector.UIString("%d descendants with forced state", descendantCount);
    }
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {boolean=} elementCloseTag
 */
WebInspector.ElementsTreeElement = function(node, elementCloseTag)
{
    // The title will be updated in onattach.
    TreeElement.call(this, "", node);
    this._node = node;

    this._elementCloseTag = elementCloseTag;
    this._updateHasChildren();

    if (this._node.nodeType() == Node.ELEMENT_NODE && !elementCloseTag)
        this._canAddAttributes = true;
    this._searchQuery = null;
    this._expandedChildrenLimit = WebInspector.ElementsTreeElement.InitialChildrenLimit;
}

WebInspector.ElementsTreeElement.InitialChildrenLimit = 500;

// A union of HTML4 and HTML5-Draft elements that explicitly
// or implicitly (for HTML5) forbid the closing tag.
// FIXME: Revise once HTML5 Final is published.
WebInspector.ElementsTreeElement.ForbiddenClosingTagElements = [
    "area", "base", "basefont", "br", "canvas", "col", "command", "embed", "frame",
    "hr", "img", "input", "keygen", "link", "meta", "param", "source"
].keySet();

// These tags we do not allow editing their tag name.
WebInspector.ElementsTreeElement.EditTagBlacklist = [
    "html", "head", "body"
].keySet();

WebInspector.ElementsTreeElement.prototype = {
    highlightSearchResults: function(searchQuery)
    {
        if (this._searchQuery !== searchQuery) {
            this._updateSearchHighlight(false);
            delete this._highlightResult; // A new search query.
        }

        this._searchQuery = searchQuery;
        this._searchHighlightsVisible = true;
        this.updateTitle(true);
    },

    hideSearchHighlights: function()
    {
        delete this._searchHighlightsVisible;
        this._updateSearchHighlight(false);
    },

    _updateSearchHighlight: function(show)
    {
        if (!this._highlightResult)
            return;

        function updateEntryShow(entry)
        {
            switch (entry.type) {
                case "added":
                    entry.parent.insertBefore(entry.node, entry.nextSibling);
                    break;
                case "changed":
                    entry.node.textContent = entry.newText;
                    break;
            }
        }

        function updateEntryHide(entry)
        {
            switch (entry.type) {
                case "added":
                    entry.node.remove();
                    break;
                case "changed":
                    entry.node.textContent = entry.oldText;
                    break;
            }
        }

        // Preserve the semantic of node by following the order of updates for hide and show.
        if (show) {
            for (var i = 0, size = this._highlightResult.length; i < size; ++i)
                updateEntryShow(this._highlightResult[i]);
        } else {
            for (var i = (this._highlightResult.length - 1); i >= 0; --i)
                updateEntryHide(this._highlightResult[i]);
        }
    },

    get hovered()
    {
        return this._hovered;
    },

    set hovered(x)
    {
        if (this._hovered === x)
            return;

        this._hovered = x;

        if (this.listItemElement) {
            if (x) {
                this.updateSelection();
                this.listItemElement.classList.add("hovered");
            } else {
                this.listItemElement.classList.remove("hovered");
            }
        }
    },

    get expandedChildrenLimit()
    {
        return this._expandedChildrenLimit;
    },

    set expandedChildrenLimit(x)
    {
        if (this._expandedChildrenLimit === x)
            return;

        this._expandedChildrenLimit = x;
        if (this.treeOutline && !this._updateChildrenInProgress)
            this._updateChildren(true);
    },

    get expandedChildCount()
    {
        var count = this.children.length;
        if (count && this.children[count - 1]._elementCloseTag)
            count--;
        if (count && this.children[count - 1].expandAllButton)
            count--;
        return count;
    },

    /**
     * @param {!WebInspector.DOMNode} child
     * @return {?WebInspector.ElementsTreeElement}
     */
    _showChild: function(child)
    {
        if (this._elementCloseTag)
            return null;

        var index = this._visibleChildren().indexOf(child);
        if (index === -1)
            return null;

        if (index >= this.expandedChildrenLimit) {
            this._expandedChildrenLimit = index + 1;
            this._updateChildren(true);
        }

        // Whether index-th child is visible in the children tree
        return this.expandedChildCount > index ? this.children[index] : null;
    },

    updateSelection: function()
    {
        var listItemElement = this.listItemElement;
        if (!listItemElement)
            return;

        if (!this._readyToUpdateSelection) {
            if (document.body.offsetWidth > 0)
                this._readyToUpdateSelection = true;
            else {
                // The stylesheet hasn't loaded yet or the window is closed,
                // so we can't calculate what we need. Return early.
                return;
            }
        }

        if (!this.selectionElement) {
            this.selectionElement = document.createElement("div");
            this.selectionElement.className = "selection selected";
            listItemElement.insertBefore(this.selectionElement, listItemElement.firstChild);
        }

        this.selectionElement.style.height = listItemElement.offsetHeight + "px";
    },

    onattach: function()
    {
        if (this._hovered) {
            this.updateSelection();
            this.listItemElement.classList.add("hovered");
        }

        this.updateTitle();
        this._preventFollowingLinksOnDoubleClick();
        this.listItemElement.draggable = true;
    },

    _preventFollowingLinksOnDoubleClick: function()
    {
        var links = this.listItemElement.querySelectorAll("li .webkit-html-tag > .webkit-html-attribute > .webkit-html-external-link, li .webkit-html-tag > .webkit-html-attribute > .webkit-html-resource-link");
        if (!links)
            return;

        for (var i = 0; i < links.length; ++i)
            links[i].preventFollowOnDoubleClick = true;
    },

    onpopulate: function()
    {
        if (this.children.length || this._showInlineText() || this._elementCloseTag)
            return;

        this.updateChildren();
    },

    /**
     * @param {boolean=} fullRefresh
     */
    updateChildren: function(fullRefresh)
    {
        if (this._elementCloseTag)
            return;
        this._node.getChildNodes(this._updateChildren.bind(this, fullRefresh));
    },

    /**
     * @param {boolean=} closingTag
     * @return {!WebInspector.ElementsTreeElement}
     */
    insertChildElement: function(child, index, closingTag)
    {
        var newElement = new WebInspector.ElementsTreeElement(child, closingTag);
        newElement.selectable = this.treeOutline._selectEnabled;
        this.insertChild(newElement, index);
        return newElement;
    },

    moveChild: function(child, targetIndex)
    {
        var wasSelected = child.selected;
        this.removeChild(child);
        this.insertChild(child, targetIndex);
        if (wasSelected)
            child.select();
    },

    /**
     * @param {boolean=} fullRefresh
     */
    _updateChildren: function(fullRefresh)
    {
        if (this._updateChildrenInProgress || !this.treeOutline._visible)
            return;

        this._updateChildrenInProgress = true;
        var selectedNode = this.treeOutline.selectedDOMNode();
        var originalScrollTop = 0;
        if (fullRefresh) {
            var treeOutlineContainerElement = this.treeOutline.element.parentNode;
            originalScrollTop = treeOutlineContainerElement.scrollTop;
            var selectedTreeElement = this.treeOutline.selectedTreeElement;
            if (selectedTreeElement && selectedTreeElement.hasAncestor(this))
                this.select();
            this.removeChildren();
        }

        /**
         * @this {WebInspector.ElementsTreeElement}
         * @return {?WebInspector.ElementsTreeElement}
         */
        function updateChildrenOfNode()
        {
            var treeOutline = this.treeOutline;
            var visibleChildren = this._visibleChildren();
            var treeChildIndex = 0;
            var elementToSelect = null;

            for (var i = 0; i < visibleChildren.length; ++i) {
                var child = visibleChildren[i];
                var currentTreeElement = this.children[treeChildIndex];
                if (!currentTreeElement || currentTreeElement._node !== child) {
                    // Find any existing element that is later in the children list.
                    var existingTreeElement = null;
                    for (var j = (treeChildIndex + 1), size = this.expandedChildCount; j < size; ++j) {
                        if (this.children[j]._node === child) {
                            existingTreeElement = this.children[j];
                            break;
                        }
                    }

                    if (existingTreeElement && existingTreeElement.parent === this) {
                        // If an existing element was found and it has the same parent, just move it.
                        this.moveChild(existingTreeElement, treeChildIndex);
                    } else {
                        // No existing element found, insert a new element.
                        if (treeChildIndex < this.expandedChildrenLimit) {
                            var newElement = this.insertChildElement(child, treeChildIndex);
                            if (child === selectedNode)
                                elementToSelect = newElement;
                            if (this.expandedChildCount > this.expandedChildrenLimit)
                                this.expandedChildrenLimit++;
                        }
                    }
                }

                ++treeChildIndex;
            }
            return elementToSelect;
        }

        // Remove any tree elements that no longer have this node (or this node's contentDocument) as their parent.
        for (var i = (this.children.length - 1); i >= 0; --i) {
            var currentChild = this.children[i];
            var currentNode = currentChild._node;
            if (!currentNode)
                continue;
            var currentParentNode = currentNode.parentNode;

            if (currentParentNode === this._node)
                continue;

            var selectedTreeElement = this.treeOutline.selectedTreeElement;
            if (selectedTreeElement && (selectedTreeElement === currentChild || selectedTreeElement.hasAncestor(currentChild)))
                this.select();

            this.removeChildAtIndex(i);
        }

        var elementToSelect = updateChildrenOfNode.call(this);
        this.updateTitle();
        this._adjustCollapsedRange();

        var lastChild = this.children[this.children.length - 1];
        if (this._node.nodeType() == Node.ELEMENT_NODE && (!lastChild || !lastChild._elementCloseTag))
            this.insertChildElement(this._node, this.children.length, true);

        // We want to restore the original selection and tree scroll position after a full refresh, if possible.
        if (fullRefresh && elementToSelect) {
            elementToSelect.select();
            if (treeOutlineContainerElement && originalScrollTop <= treeOutlineContainerElement.scrollHeight)
                treeOutlineContainerElement.scrollTop = originalScrollTop;
        }

        delete this._updateChildrenInProgress;
    },

    _adjustCollapsedRange: function()
    {
        var visibleChildren = this._visibleChildren();
        // Ensure precondition: only the tree elements for node children are found in the tree
        // (not the Expand All button or the closing tag).
        if (this.expandAllButtonElement && this.expandAllButtonElement.__treeElement.parent)
            this.removeChild(this.expandAllButtonElement.__treeElement);

        const childNodeCount = visibleChildren.length;

        // In case some nodes from the expanded range were removed, pull some nodes from the collapsed range into the expanded range at the bottom.
        for (var i = this.expandedChildCount, limit = Math.min(this.expandedChildrenLimit, childNodeCount); i < limit; ++i)
            this.insertChildElement(visibleChildren[i], i);

        const expandedChildCount = this.expandedChildCount;
        if (childNodeCount > this.expandedChildCount) {
            var targetButtonIndex = expandedChildCount;
            if (!this.expandAllButtonElement) {
                var button = document.createElement("button");
                button.className = "show-all-nodes";
                button.value = "";
                var item = new TreeElement(button, null, false);
                item.selectable = false;
                item.expandAllButton = true;
                this.insertChild(item, targetButtonIndex);
                this.expandAllButtonElement = item.listItemElement.firstChild;
                this.expandAllButtonElement.__treeElement = item;
                this.expandAllButtonElement.addEventListener("click", this.handleLoadAllChildren.bind(this), false);
            } else if (!this.expandAllButtonElement.__treeElement.parent)
                this.insertChild(this.expandAllButtonElement.__treeElement, targetButtonIndex);
            this.expandAllButtonElement.textContent = WebInspector.UIString("Show All Nodes (%d More)", childNodeCount - expandedChildCount);
        } else if (this.expandAllButtonElement)
            delete this.expandAllButtonElement;
    },

    handleLoadAllChildren: function()
    {
        this.expandedChildrenLimit = Math.max(this._visibleChildCount(), this.expandedChildrenLimit + WebInspector.ElementsTreeElement.InitialChildrenLimit);
    },

    expandRecursively: function()
    {
        /**
         * @this {WebInspector.ElementsTreeElement}
         */
        function callback()
        {
            TreeElement.prototype.expandRecursively.call(this, Number.MAX_VALUE);
        }

        this._node.getSubtree(-1, callback.bind(this));
    },

    /**
     * @override
     */
    onexpand: function()
    {
        if (this._elementCloseTag)
            return;

        this.updateTitle();
        this.treeOutline.updateSelection();
    },

    oncollapse: function()
    {
        if (this._elementCloseTag)
            return;

        this.updateTitle();
        this.treeOutline.updateSelection();
    },

    /**
     * @override
     */
    onreveal: function()
    {
        if (this.listItemElement) {
            var tagSpans = this.listItemElement.getElementsByClassName("webkit-html-tag-name");
            if (tagSpans.length)
                tagSpans[0].scrollIntoViewIfNeeded(true);
            else
                this.listItemElement.scrollIntoViewIfNeeded(true);
        }
    },

    /**
     * @override
     * @param {boolean=} selectedByUser
     * @return {boolean}
     */
    onselect: function(selectedByUser)
    {
        this.treeOutline.suppressRevealAndSelect = true;
        this.treeOutline.selectDOMNode(this._node, selectedByUser);
        if (selectedByUser)
            this._node.highlight();
        this.updateSelection();
        this.treeOutline.suppressRevealAndSelect = false;
        return true;
    },

    /**
     * @override
     * @return {boolean}
     */
    ondelete: function()
    {
        var startTagTreeElement = this.treeOutline.findTreeElement(this._node);
        startTagTreeElement ? startTagTreeElement.remove() : this.remove();
        return true;
    },

    /**
     * @override
     * @return {boolean}
     */
    onenter: function()
    {
        // On Enter or Return start editing the first attribute
        // or create a new attribute on the selected element.
        if (this._editing)
            return false;

        this._startEditing();

        // prevent a newline from being immediately inserted
        return true;
    },

    selectOnMouseDown: function(event)
    {
        TreeElement.prototype.selectOnMouseDown.call(this, event);

        if (this._editing)
            return;

        if (this.treeOutline._showInElementsPanelEnabled) {
            WebInspector.inspectorView.showPanel("elements");
            this.treeOutline.selectDOMNode(this._node, true);
        }

        // Prevent selecting the nearest word on double click.
        if (event.detail >= 2)
            event.preventDefault();
    },

    /**
     * @override
     * @return {boolean}
     */
    ondblclick: function(event)
    {
        if (this._editing || this._elementCloseTag)
            return false;

        if (this._startEditingTarget(event.target))
            return false;

        if (this.hasChildren && !this.expanded)
            this.expand();
        return false;
    },

    /**
     * @return {boolean}
     */
    hasEditableNode: function()
    {
        return !this.representedObject.isShadowRoot() && !this.representedObject.ancestorUserAgentShadowRoot();
    },

    _insertInLastAttributePosition: function(tag, node)
    {
        if (tag.getElementsByClassName("webkit-html-attribute").length > 0)
            tag.insertBefore(node, tag.lastChild);
        else {
            var nodeName = tag.textContent.match(/^<(.*?)>$/)[1];
            tag.textContent = '';
            tag.appendChild(document.createTextNode('<'+nodeName));
            tag.appendChild(node);
            tag.appendChild(document.createTextNode('>'));
        }

        this.updateSelection();
    },

    _startEditingTarget: function(eventTarget)
    {
        if (this.treeOutline.selectedDOMNode() != this._node)
            return;

        if (this._node.nodeType() != Node.ELEMENT_NODE && this._node.nodeType() != Node.TEXT_NODE)
            return false;

        var textNode = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-text-node");
        if (textNode)
            return this._startEditingTextNode(textNode);

        var attribute = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-attribute");
        if (attribute)
            return this._startEditingAttribute(attribute, eventTarget);

        var tagName = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-tag-name");
        if (tagName)
            return this._startEditingTagName(tagName);

        var newAttribute = eventTarget.enclosingNodeOrSelfWithClass("add-attribute");
        if (newAttribute)
            return this._addNewAttribute();

        return false;
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {?Event} event
     */
    _populateTagContextMenu: function(contextMenu, event)
    {
        // Add attribute-related actions.
        var treeElement = this._elementCloseTag ? this.treeOutline.findTreeElement(this._node) : this;
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add attribute" : "Add Attribute"), treeElement._addNewAttribute.bind(treeElement));

        var attribute = event.target.enclosingNodeOrSelfWithClass("webkit-html-attribute");
        var newAttribute = event.target.enclosingNodeOrSelfWithClass("add-attribute");
        if (attribute && !newAttribute)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Edit attribute" : "Edit Attribute"), this._startEditingAttribute.bind(this, attribute, event.target));
        contextMenu.appendSeparator();
        if (this.treeOutline._setPseudoClassCallback) {
            var pseudoSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Force element state" : "Force Element State"));
            this._populateForcedPseudoStateItems(pseudoSubMenu);
            contextMenu.appendSeparator();
        }
        this._populateNodeContextMenu(contextMenu);
        this.treeOutline._populateContextMenu(contextMenu, this._node);
        this._populateScrollIntoView(contextMenu);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _populateScrollIntoView: function(contextMenu)
    {
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Scroll into view" : "Scroll into View"), this._scrollIntoView.bind(this));
    },

    _populateForcedPseudoStateItems: function(subMenu)
    {
        const pseudoClasses = ["active", "hover", "focus", "visited"];
        var node = this._node;
        var forcedPseudoState = (node ? node.getUserProperty("pseudoState") : null) || [];
        for (var i = 0; i < pseudoClasses.length; ++i) {
            var pseudoClassForced = forcedPseudoState.indexOf(pseudoClasses[i]) >= 0;
            subMenu.appendCheckboxItem(":" + pseudoClasses[i], this.treeOutline._setPseudoClassCallback.bind(null, node, pseudoClasses[i], !pseudoClassForced), pseudoClassForced, false);
        }
    },

    _populateTextContextMenu: function(contextMenu, textNode)
    {
        if (!this._editing)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Edit text" : "Edit Text"), this._startEditingTextNode.bind(this, textNode));
        this._populateNodeContextMenu(contextMenu);
    },

    _populateNodeContextMenu: function(contextMenu)
    {
        // Add free-form node-related actions.
        var openTagElement = this.treeOutline.getCachedTreeElement(this.representedObject) || this;
        var isEditable = this.hasEditableNode();
        if (isEditable && !this._editing)
            contextMenu.appendItem(WebInspector.UIString("Edit as HTML"), openTagElement._editAsHTML.bind(openTagElement));
        var isShadowRoot = this.representedObject.isShadowRoot();
        if (!isShadowRoot)
            contextMenu.appendItem(WebInspector.UIString("Copy as HTML"), this._copyHTML.bind(this));

        // Place it here so that all "Copy"-ing items stick together.
        if (this.representedObject.nodeType() === Node.ELEMENT_NODE)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy CSS path" : "Copy CSS Path"), this._copyCSSPath.bind(this));
        if (!isShadowRoot)
            contextMenu.appendItem(WebInspector.UIString("Copy XPath"), this._copyXPath.bind(this));
        if (isEditable)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Delete node" : "Delete Node"), this.remove.bind(this));
    },

    _startEditing: function()
    {
        if (this.treeOutline.selectedDOMNode() !== this._node)
            return;

        var listItem = this._listItemNode;

        if (this._canAddAttributes) {
            var attribute = listItem.getElementsByClassName("webkit-html-attribute")[0];
            if (attribute)
                return this._startEditingAttribute(attribute, attribute.getElementsByClassName("webkit-html-attribute-value")[0]);

            return this._addNewAttribute();
        }

        if (this._node.nodeType() === Node.TEXT_NODE) {
            var textNode = listItem.getElementsByClassName("webkit-html-text-node")[0];
            if (textNode)
                return this._startEditingTextNode(textNode);
            return;
        }
    },

    _addNewAttribute: function()
    {
        // Cannot just convert the textual html into an element without
        // a parent node. Use a temporary span container for the HTML.
        var container = document.createElement("span");
        this._buildAttributeDOM(container, " ", "");
        var attr = container.firstElementChild;
        attr.style.marginLeft = "2px"; // overrides the .editing margin rule
        attr.style.marginRight = "2px"; // overrides the .editing margin rule

        var tag = this.listItemElement.getElementsByClassName("webkit-html-tag")[0];
        this._insertInLastAttributePosition(tag, attr);
        attr.scrollIntoViewIfNeeded(true);
        return this._startEditingAttribute(attr, attr);
    },

    _triggerEditAttribute: function(attributeName)
    {
        var attributeElements = this.listItemElement.getElementsByClassName("webkit-html-attribute-name");
        for (var i = 0, len = attributeElements.length; i < len; ++i) {
            if (attributeElements[i].textContent === attributeName) {
                for (var elem = attributeElements[i].nextSibling; elem; elem = elem.nextSibling) {
                    if (elem.nodeType !== Node.ELEMENT_NODE)
                        continue;

                    if (elem.classList.contains("webkit-html-attribute-value"))
                        return this._startEditingAttribute(elem.parentNode, elem);
                }
            }
        }
    },

    _startEditingAttribute: function(attribute, elementForSelection)
    {
        if (WebInspector.isBeingEdited(attribute))
            return true;

        var attributeNameElement = attribute.getElementsByClassName("webkit-html-attribute-name")[0];
        if (!attributeNameElement)
            return false;

        var attributeName = attributeNameElement.textContent;
        var attributeValueElement = attribute.getElementsByClassName("webkit-html-attribute-value")[0];

        function removeZeroWidthSpaceRecursive(node)
        {
            if (node.nodeType === Node.TEXT_NODE) {
                node.nodeValue = node.nodeValue.replace(/\u200B/g, "");
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE)
                return;

            for (var child = node.firstChild; child; child = child.nextSibling)
                removeZeroWidthSpaceRecursive(child);
        }

        var domNode;
        var listItemElement = attribute.enclosingNodeOrSelfWithNodeName("li");
        if (attributeName && attributeValueElement && listItemElement && listItemElement.treeElement)
            domNode = listItemElement.treeElement.representedObject;
        var attributeValue = domNode ? domNode.getAttribute(attributeName) : undefined;
        if (typeof attributeValue !== "undefined")
            attributeValueElement.textContent = attributeValue;

        // Remove zero-width spaces that were added by nodeTitleInfo.
        removeZeroWidthSpaceRecursive(attribute);

        var config = new WebInspector.InplaceEditor.Config(this._attributeEditingCommitted.bind(this), this._editingCancelled.bind(this), attributeName);

        function handleKeyDownEvents(event)
        {
            var isMetaOrCtrl = WebInspector.isMac() ?
                event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey :
                event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;
            if (isEnterKey(event) && (event.isMetaOrCtrlForTest || !config.multiline || isMetaOrCtrl))
                return "commit";
            else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code || event.keyIdentifier === "U+001B")
                return "cancel";
            else if (event.keyIdentifier === "U+0009") // Tab key
                return "move-" + (event.shiftKey ? "backward" : "forward");
            else {
                WebInspector.handleElementValueModifications(event, attribute);
                return "";
            }
        }

        config.customFinishHandler = handleKeyDownEvents;

        this._editing = WebInspector.InplaceEditor.startEditing(attribute, config);

        window.getSelection().setBaseAndExtent(elementForSelection, 0, elementForSelection, 1);

        return true;
    },

    /**
     * @param {!Element} textNodeElement
     */
    _startEditingTextNode: function(textNodeElement)
    {
        if (WebInspector.isBeingEdited(textNodeElement))
            return true;

        var textNode = this._node;
        // We only show text nodes inline in elements if the element only
        // has a single child, and that child is a text node.
        if (textNode.nodeType() === Node.ELEMENT_NODE && textNode.firstChild)
            textNode = textNode.firstChild;

        var container = textNodeElement.enclosingNodeOrSelfWithClass("webkit-html-text-node");
        if (container)
            container.textContent = textNode.nodeValue(); // Strip the CSS or JS highlighting if present.
        var config = new WebInspector.InplaceEditor.Config(this._textNodeEditingCommitted.bind(this, textNode), this._editingCancelled.bind(this));
        this._editing = WebInspector.InplaceEditor.startEditing(textNodeElement, config);
        window.getSelection().setBaseAndExtent(textNodeElement, 0, textNodeElement, 1);

        return true;
    },

    /**
     * @param {!Element=} tagNameElement
     */
    _startEditingTagName: function(tagNameElement)
    {
        if (!tagNameElement) {
            tagNameElement = this.listItemElement.getElementsByClassName("webkit-html-tag-name")[0];
            if (!tagNameElement)
                return false;
        }

        var tagName = tagNameElement.textContent;
        if (WebInspector.ElementsTreeElement.EditTagBlacklist[tagName.toLowerCase()])
            return false;

        if (WebInspector.isBeingEdited(tagNameElement))
            return true;

        var closingTagElement = this._distinctClosingTagElement();

        /**
         * @param {?Event} event
         */
        function keyupListener(event)
        {
            if (closingTagElement)
                closingTagElement.textContent = "</" + tagNameElement.textContent + ">";
        }

        /**
         * @param {!Element} element
         * @param {string} newTagName
         * @this {WebInspector.ElementsTreeElement}
         */
        function editingComitted(element, newTagName)
        {
            tagNameElement.removeEventListener('keyup', keyupListener, false);
            this._tagNameEditingCommitted.apply(this, arguments);
        }

        /**
         * @this {WebInspector.ElementsTreeElement}
         */
        function editingCancelled()
        {
            tagNameElement.removeEventListener('keyup', keyupListener, false);
            this._editingCancelled.apply(this, arguments);
        }

        tagNameElement.addEventListener('keyup', keyupListener, false);

        var config = new WebInspector.InplaceEditor.Config(editingComitted.bind(this), editingCancelled.bind(this), tagName);
        this._editing = WebInspector.InplaceEditor.startEditing(tagNameElement, config);
        window.getSelection().setBaseAndExtent(tagNameElement, 0, tagNameElement, 1);
        return true;
    },

    _startEditingAsHTML: function(commitCallback, error, initialValue)
    {
        if (error)
            return;
        if (this._editing)
            return;

        function consume(event)
        {
            if (event.eventPhase === Event.AT_TARGET)
                event.consume(true);
        }

        initialValue = this._convertWhitespaceToEntities(initialValue).text;

        this._htmlEditElement = document.createElement("div");
        this._htmlEditElement.className = "source-code elements-tree-editor";

        // Hide header items.
        var child = this.listItemElement.firstChild;
        while (child) {
            child.style.display = "none";
            child = child.nextSibling;
        }
        // Hide children item.
        if (this._childrenListNode)
            this._childrenListNode.style.display = "none";
        // Append editor.
        this.listItemElement.appendChild(this._htmlEditElement);
        this.treeOutline.childrenListElement.parentElement.addEventListener("mousedown", consume, false);

        this.updateSelection();

        /**
         * @param {!Element} element
         * @param {string} newValue
         * @this {WebInspector.ElementsTreeElement}
         */
        function commit(element, newValue)
        {
            commitCallback(initialValue, newValue);
            dispose.call(this);
        }

        /**
         * @this {WebInspector.ElementsTreeElement}
         */
        function dispose()
        {
            delete this._editing;
            delete this.treeOutline._multilineEditing;

            // Remove editor.
            this.listItemElement.removeChild(this._htmlEditElement);
            delete this._htmlEditElement;
            // Unhide children item.
            if (this._childrenListNode)
                this._childrenListNode.style.removeProperty("display");
            // Unhide header items.
            var child = this.listItemElement.firstChild;
            while (child) {
                child.style.removeProperty("display");
                child = child.nextSibling;
            }

            this.treeOutline.childrenListElement.parentElement.removeEventListener("mousedown", consume, false);
            this.updateSelection();
            this.treeOutline.element.focus();
        }

        var config = new WebInspector.InplaceEditor.Config(commit.bind(this), dispose.bind(this));
        config.setMultilineOptions(initialValue, { name: "xml", htmlMode: true }, "web-inspector-html", WebInspector.settings.domWordWrap.get(), true);
        this._editing = WebInspector.InplaceEditor.startEditing(this._htmlEditElement, config);
        this._editing.setWidth(this.treeOutline._visibleWidth);
        this.treeOutline._multilineEditing = this._editing;
    },

    _attributeEditingCommitted: function(element, newText, oldText, attributeName, moveDirection)
    {
        delete this._editing;

        var treeOutline = this.treeOutline;

        /**
         * @param {?Protocol.Error=} error
         * @this {WebInspector.ElementsTreeElement}
         */
        function moveToNextAttributeIfNeeded(error)
        {
            if (error)
                this._editingCancelled(element, attributeName);

            if (!moveDirection)
                return;

            treeOutline._updateModifiedNodes();

            // Search for the attribute's position, and then decide where to move to.
            var attributes = this._node.attributes();
            for (var i = 0; i < attributes.length; ++i) {
                if (attributes[i].name !== attributeName)
                    continue;

                if (moveDirection === "backward") {
                    if (i === 0)
                        this._startEditingTagName();
                    else
                        this._triggerEditAttribute(attributes[i - 1].name);
                } else {
                    if (i === attributes.length - 1)
                        this._addNewAttribute();
                    else
                        this._triggerEditAttribute(attributes[i + 1].name);
                }
                return;
            }

            // Moving From the "New Attribute" position.
            if (moveDirection === "backward") {
                if (newText === " ") {
                    // Moving from "New Attribute" that was not edited
                    if (attributes.length > 0)
                        this._triggerEditAttribute(attributes[attributes.length - 1].name);
                } else {
                    // Moving from "New Attribute" that holds new value
                    if (attributes.length > 1)
                        this._triggerEditAttribute(attributes[attributes.length - 2].name);
                }
            } else if (moveDirection === "forward") {
                if (!/^\s*$/.test(newText))
                    this._addNewAttribute();
                else
                    this._startEditingTagName();
            }
        }

        if (!attributeName.trim() && !newText.trim()) {
            element.remove();
            moveToNextAttributeIfNeeded.call(this);
            return;
        }

        if (oldText !== newText) {
            this._node.setAttribute(attributeName, newText, moveToNextAttributeIfNeeded.bind(this));
            return;
        }

        this.updateTitle();
        moveToNextAttributeIfNeeded.call(this);
    },

    _tagNameEditingCommitted: function(element, newText, oldText, tagName, moveDirection)
    {
        delete this._editing;
        var self = this;

        function cancel()
        {
            var closingTagElement = self._distinctClosingTagElement();
            if (closingTagElement)
                closingTagElement.textContent = "</" + tagName + ">";

            self._editingCancelled(element, tagName);
            moveToNextAttributeIfNeeded.call(self);
        }

        /**
         * @this {WebInspector.ElementsTreeElement}
         */
        function moveToNextAttributeIfNeeded()
        {
            if (moveDirection !== "forward") {
                this._addNewAttribute();
                return;
            }

            var attributes = this._node.attributes();
            if (attributes.length > 0)
                this._triggerEditAttribute(attributes[0].name);
            else
                this._addNewAttribute();
        }

        newText = newText.trim();
        if (newText === oldText) {
            cancel();
            return;
        }

        var treeOutline = this.treeOutline;
        var wasExpanded = this.expanded;

        function changeTagNameCallback(error, nodeId)
        {
            if (error || !nodeId) {
                cancel();
                return;
            }
            var newTreeItem = treeOutline._selectNodeAfterEdit(wasExpanded, error, nodeId);
            moveToNextAttributeIfNeeded.call(newTreeItem);
        }

        this._node.setNodeName(newText, changeTagNameCallback);
    },

    /**
     * @param {!WebInspector.DOMNode} textNode
     * @param {!Element} element
     * @param {string} newText
     */
    _textNodeEditingCommitted: function(textNode, element, newText)
    {
        delete this._editing;

        /**
         * @this {WebInspector.ElementsTreeElement}
         */
        function callback()
        {
            this.updateTitle();
        }
        textNode.setNodeValue(newText, callback.bind(this));
    },

    /**
     * @param {!Element} element
     * @param {*} context
     */
    _editingCancelled: function(element, context)
    {
        delete this._editing;

        // Need to restore attributes structure.
        this.updateTitle();
    },

    /**
     * @return {!Element}
     */
    _distinctClosingTagElement: function()
    {
        // FIXME: Improve the Tree Element / Outline Abstraction to prevent crawling the DOM

        // For an expanded element, it will be the last element with class "close"
        // in the child element list.
        if (this.expanded) {
            var closers = this._childrenListNode.querySelectorAll(".close");
            return closers[closers.length-1];
        }

        // Remaining cases are single line non-expanded elements with a closing
        // tag, or HTML elements without a closing tag (such as <br>). Return
        // null in the case where there isn't a closing tag.
        var tags = this.listItemElement.getElementsByClassName("webkit-html-tag");
        return (tags.length === 1 ? null : tags[tags.length-1]);
    },

    /**
     * @param {boolean=} onlySearchQueryChanged
     */
    updateTitle: function(onlySearchQueryChanged)
    {
        // If we are editing, return early to prevent canceling the edit.
        // After editing is committed updateTitle will be called.
        if (this._editing)
            return;

        if (onlySearchQueryChanged) {
            if (this._highlightResult)
                this._updateSearchHighlight(false);
        } else {
            var nodeInfo = this._nodeTitleInfo(WebInspector.linkifyURLAsNode);
            if (nodeInfo.shadowRoot)
                this.listItemElement.classList.add("shadow-root");
            var highlightElement = document.createElement("span");
            highlightElement.className = "highlight";
            highlightElement.appendChild(nodeInfo.titleDOM);
            this.title = highlightElement;
            this._updateDecorations();
            delete this._highlightResult;
        }

        delete this.selectionElement;
        if (this.selected)
            this.updateSelection();
        this._preventFollowingLinksOnDoubleClick();
        this._highlightSearchResults();
    },

    /**
     * @return {?Element}
     */
    _createDecoratorElement: function()
    {
        var node = this._node;
        var decoratorMessages = [];
        var parentDecoratorMessages = [];
        for (var i = 0; i < this.treeOutline._nodeDecorators.length; ++i) {
            var decorator = this.treeOutline._nodeDecorators[i];
            var message = decorator.decorate(node);
            if (message) {
                decoratorMessages.push(message);
                continue;
            }

            if (this.expanded || this._elementCloseTag)
                continue;

            message = decorator.decorateAncestor(node);
            if (message)
                parentDecoratorMessages.push(message)
        }
        if (!decoratorMessages.length && !parentDecoratorMessages.length)
            return null;

        var decoratorElement = document.createElement("div");
        decoratorElement.classList.add("elements-gutter-decoration");
        if (!decoratorMessages.length)
            decoratorElement.classList.add("elements-has-decorated-children");
        decoratorElement.title = decoratorMessages.concat(parentDecoratorMessages).join("\n");
        return decoratorElement;
    },

    _updateDecorations: function()
    {
        if (this._decoratorElement)
            this._decoratorElement.remove();
        this._decoratorElement = this._createDecoratorElement();
        if (this._decoratorElement && this.listItemElement)
            this.listItemElement.insertBefore(this._decoratorElement, this.listItemElement.firstChild);
    },

    /**
     * @param {!Node} parentElement
     * @param {string} name
     * @param {string} value
     * @param {boolean=} forceValue
     * @param {!WebInspector.DOMNode=} node
     * @param {function(string, string, string, boolean=, string=)=} linkify
     */
    _buildAttributeDOM: function(parentElement, name, value, forceValue, node, linkify)
    {
        var closingPunctuationRegex = /[\/;:\)\]\}]/g;
        var highlightIndex = 0;
        var highlightCount;
        var additionalHighlightOffset = 0;
        var result;

        /**
         * @param {string} match
         * @param {number} replaceOffset
         * @return {string}
         */
        function replacer(match, replaceOffset) {
            while (highlightIndex < highlightCount && result.entityRanges[highlightIndex].offset < replaceOffset) {
                result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
                ++highlightIndex;
            }
            additionalHighlightOffset += 1;
            return match + "\u200B";
        }

        /**
         * @param {!Element} element
         * @param {string} value
         * @this {WebInspector.ElementsTreeElement}
         */
        function setValueWithEntities(element, value)
        {
            var attrValueElement = element.createChild("span", "webkit-html-attribute-value");
            result = this._convertWhitespaceToEntities(value);
            highlightCount = result.entityRanges.length;
            value = result.text.replace(closingPunctuationRegex, replacer);
            while (highlightIndex < highlightCount) {
                result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
                ++highlightIndex;
            }
            attrValueElement.textContent = value;
            WebInspector.highlightRangesWithStyleClass(attrValueElement, result.entityRanges, "webkit-html-entity-value");
        }

        var hasText = (forceValue || value.length > 0);
        var attrSpanElement = parentElement.createChild("span", "webkit-html-attribute");
        var attrNameElement = attrSpanElement.createChild("span", "webkit-html-attribute-name");
        attrNameElement.textContent = name;

        if (hasText)
            attrSpanElement.appendChild(document.createTextNode("=\u200B\""));

        if (linkify && (name === "src" || name === "href")) {
            var rewrittenHref = node.resolveURL(value);
            if (rewrittenHref === null) {
                setValueWithEntities.call(this, attrSpanElement, value);
            } else {
                value = value.replace(closingPunctuationRegex, "$&\u200B");
                if (value.startsWith("data:"))
                    value = value.trimMiddle(60);
                attrSpanElement.appendChild(linkify(rewrittenHref, value, "webkit-html-attribute-value", node.nodeName().toLowerCase() === "a"));
            }
        } else {
            setValueWithEntities.call(this, attrSpanElement, value);
        }

        if (hasText)
            attrSpanElement.appendChild(document.createTextNode("\""));
    },

    /**
     * @param {!Node} parentElement
     * @param {string} pseudoElementName
     */
    _buildPseudoElementDOM: function(parentElement, pseudoElementName)
    {
        var pseudoElement = parentElement.createChild("span", "webkit-html-pseudo-element");
        pseudoElement.textContent = "::" + pseudoElementName;
        parentElement.appendChild(document.createTextNode("\u200B"));
    },

    /**
     * @param {!Node} parentElement
     * @param {string} tagName
     * @param {boolean} isClosingTag
     * @param {boolean} isDistinctTreeElement
     * @param {function(string, string, string, boolean=, string=)=} linkify
     */
    _buildTagDOM: function(parentElement, tagName, isClosingTag, isDistinctTreeElement, linkify)
    {
        var node = this._node;
        var classes = [ "webkit-html-tag" ];
        if (isClosingTag && isDistinctTreeElement)
            classes.push("close");
        var tagElement = parentElement.createChild("span", classes.join(" "));
        tagElement.appendChild(document.createTextNode("<"));
        var tagNameElement = tagElement.createChild("span", isClosingTag ? "" : "webkit-html-tag-name");
        tagNameElement.textContent = (isClosingTag ? "/" : "") + tagName;
        if (!isClosingTag && node.hasAttributes()) {
            var attributes = node.attributes();
            for (var i = 0; i < attributes.length; ++i) {
                var attr = attributes[i];
                tagElement.appendChild(document.createTextNode(" "));
                this._buildAttributeDOM(tagElement, attr.name, attr.value, false, node, linkify);
            }
        }
        tagElement.appendChild(document.createTextNode(">"));
        parentElement.appendChild(document.createTextNode("\u200B"));
    },

    /**
     * @param {string} text
     * @return {!{text: string, entityRanges: !Array.<!WebInspector.SourceRange>}}
     */
    _convertWhitespaceToEntities: function(text)
    {
        var result = "";
        var resultLength = 0;
        var lastIndexAfterEntity = 0;
        var entityRanges = [];
        var charToEntity = WebInspector.ElementsTreeOutline.MappedCharToEntity;
        for (var i = 0, size = text.length; i < size; ++i) {
            var char = text.charAt(i);
            if (charToEntity[char]) {
                result += text.substring(lastIndexAfterEntity, i);
                var entityValue = "&" + charToEntity[char] + ";";
                entityRanges.push({offset: result.length, length: entityValue.length});
                result += entityValue;
                lastIndexAfterEntity = i + 1;
            }
        }
        if (result)
            result += text.substring(lastIndexAfterEntity);
        return {text: result || text, entityRanges: entityRanges};
    },

    /**
     * @param {function(string, string, string, boolean=, string=)=} linkify
     */
    _nodeTitleInfo: function(linkify)
    {
        var node = this._node;
        var info = {titleDOM: document.createDocumentFragment(), hasChildren: this.hasChildren};

        switch (node.nodeType()) {
            case Node.ATTRIBUTE_NODE:
                this._buildAttributeDOM(info.titleDOM, node.name, node.value, true);
                break;

            case Node.ELEMENT_NODE:
                if (node.pseudoType()) {
                    this._buildPseudoElementDOM(info.titleDOM, node.pseudoType());
                    info.hasChildren = false;
                    break;
                }

                var tagName = node.nodeNameInCorrectCase();
                if (this._elementCloseTag) {
                    this._buildTagDOM(info.titleDOM, tagName, true, true);
                    info.hasChildren = false;
                    break;
                }

                this._buildTagDOM(info.titleDOM, tagName, false, false, linkify);

                var showInlineText = this._showInlineText() && !this.hasChildren;
                if (!this.expanded && !showInlineText && (this.treeOutline.isXMLMimeType || !WebInspector.ElementsTreeElement.ForbiddenClosingTagElements[tagName])) {
                    if (this.hasChildren) {
                        var textNodeElement = info.titleDOM.createChild("span", "webkit-html-text-node bogus");
                        textNodeElement.textContent = "\u2026";
                        info.titleDOM.appendChild(document.createTextNode("\u200B"));
                    }
                    this._buildTagDOM(info.titleDOM, tagName, true, false);
                }

                // If this element only has a single child that is a text node,
                // just show that text and the closing tag inline rather than
                // create a subtree for them
                if (showInlineText) {
                    var textNodeElement = info.titleDOM.createChild("span", "webkit-html-text-node");
                    var result = this._convertWhitespaceToEntities(node.firstChild.nodeValue());
                    textNodeElement.textContent = result.text;
                    WebInspector.highlightRangesWithStyleClass(textNodeElement, result.entityRanges, "webkit-html-entity-value");
                    info.titleDOM.appendChild(document.createTextNode("\u200B"));
                    this._buildTagDOM(info.titleDOM, tagName, true, false);
                    info.hasChildren = false;
                }
                break;

            case Node.TEXT_NODE:
                if (node.parentNode && node.parentNode.nodeName().toLowerCase() === "script") {
                    var newNode = info.titleDOM.createChild("span", "webkit-html-text-node webkit-html-js-node");
                    newNode.textContent = node.nodeValue();

                    var javascriptSyntaxHighlighter = new WebInspector.DOMSyntaxHighlighter("text/javascript", true);
                    javascriptSyntaxHighlighter.syntaxHighlightNode(newNode);
                } else if (node.parentNode && node.parentNode.nodeName().toLowerCase() === "style") {
                    var newNode = info.titleDOM.createChild("span", "webkit-html-text-node webkit-html-css-node");
                    newNode.textContent = node.nodeValue();

                    var cssSyntaxHighlighter = new WebInspector.DOMSyntaxHighlighter("text/css", true);
                    cssSyntaxHighlighter.syntaxHighlightNode(newNode);
                } else {
                    info.titleDOM.appendChild(document.createTextNode("\""));
                    var textNodeElement = info.titleDOM.createChild("span", "webkit-html-text-node");
                    var result = this._convertWhitespaceToEntities(node.nodeValue());
                    textNodeElement.textContent = result.text;
                    WebInspector.highlightRangesWithStyleClass(textNodeElement, result.entityRanges, "webkit-html-entity-value");
                    info.titleDOM.appendChild(document.createTextNode("\""));
                }
                break;

            case Node.COMMENT_NODE:
                var commentElement = info.titleDOM.createChild("span", "webkit-html-comment");
                commentElement.appendChild(document.createTextNode("<!--" + node.nodeValue() + "-->"));
                break;

            case Node.DOCUMENT_TYPE_NODE:
                var docTypeElement = info.titleDOM.createChild("span", "webkit-html-doctype");
                docTypeElement.appendChild(document.createTextNode("<!DOCTYPE " + node.nodeName()));
                if (node.publicId) {
                    docTypeElement.appendChild(document.createTextNode(" PUBLIC \"" + node.publicId + "\""));
                    if (node.systemId)
                        docTypeElement.appendChild(document.createTextNode(" \"" + node.systemId + "\""));
                } else if (node.systemId)
                    docTypeElement.appendChild(document.createTextNode(" SYSTEM \"" + node.systemId + "\""));

                if (node.internalSubset)
                    docTypeElement.appendChild(document.createTextNode(" [" + node.internalSubset + "]"));

                docTypeElement.appendChild(document.createTextNode(">"));
                break;

            case Node.CDATA_SECTION_NODE:
                var cdataElement = info.titleDOM.createChild("span", "webkit-html-text-node");
                cdataElement.appendChild(document.createTextNode("<![CDATA[" + node.nodeValue() + "]]>"));
                break;
            case Node.DOCUMENT_FRAGMENT_NODE:
                var fragmentElement = info.titleDOM.createChild("span", "webkit-html-fragment");
                if (node.isInShadowTree()) {
                    var shadowRootType = node.shadowRootType();
                    if (shadowRootType) {
                        info.shadowRoot = true;
                        fragmentElement.classList.add("shadow-root");
                    }
                }
                fragmentElement.textContent = node.nodeNameInCorrectCase().collapseWhitespace();
                break;
            default:
                info.titleDOM.appendChild(document.createTextNode(node.nodeNameInCorrectCase().collapseWhitespace()));
        }
        return info;
    },

    /**
     * @return {boolean}
     */
    _showInlineText: function()
    {
        if (this._node.importedDocument() || this._node.templateContent() || this._visibleShadowRoots().length > 0 || this._node.hasPseudoElements())
            return false;
        if (this._node.nodeType() !== Node.ELEMENT_NODE)
            return false;
        if (!this._node.firstChild || this._node.firstChild !== this._node.lastChild || this._node.firstChild.nodeType() !== Node.TEXT_NODE)
            return false;
        var textChild = this._node.firstChild;
        if (textChild.nodeValue().length < Preferences.maxInlineTextChildLength)
            return true;
        return false;
    },

    remove: function()
    {
        if (this._node.pseudoType())
            return;
        var parentElement = this.parent;
        if (!parentElement)
            return;

        var self = this;
        function removeNodeCallback(error, removedNodeId)
        {
            if (error)
                return;

            parentElement.removeChild(self);
            parentElement._adjustCollapsedRange();
        }

        if (!this._node.parentNode || this._node.parentNode.nodeType() === Node.DOCUMENT_NODE)
            return;
        this._node.removeNode(removeNodeCallback);
    },

    _editAsHTML: function()
    {
        var node = this._node;
        if (node.pseudoType())
            return;

        var treeOutline = this.treeOutline;
        var parentNode = node.parentNode;
        var index = node.index;
        var wasExpanded = this.expanded;

        function selectNode(error, nodeId)
        {
            if (error)
                return;

            // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
            treeOutline._updateModifiedNodes();

            var newNode = parentNode ? parentNode.children()[index] || parentNode : null;
            if (!newNode)
                return;

            treeOutline.selectDOMNode(newNode, true);

            if (wasExpanded) {
                var newTreeItem = treeOutline.findTreeElement(newNode);
                if (newTreeItem)
                    newTreeItem.expand();
            }
        }

        function commitChange(initialValue, value)
        {
            if (initialValue !== value)
                node.setOuterHTML(value, selectNode);
            else
                return;
        }

        node.getOuterHTML(this._startEditingAsHTML.bind(this, commitChange));
    },

    _copyHTML: function()
    {
        this._node.copyNode();
    },

    _copyCSSPath: function()
    {
        InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.cssPath(this._node, true));
    },

    _copyXPath: function()
    {
        InspectorFrontendHost.copyText(WebInspector.DOMPresentationUtils.xPath(this._node, true));
    },

    _highlightSearchResults: function()
    {
        if (!this._searchQuery || !this._searchHighlightsVisible)
            return;
        if (this._highlightResult) {
            this._updateSearchHighlight(true);
            return;
        }

        var text = this.listItemElement.textContent;
        var regexObject = createPlainTextSearchRegex(this._searchQuery, "gi");

        var offset = 0;
        var match = regexObject.exec(text);
        var matchRanges = [];
        while (match) {
            matchRanges.push(new WebInspector.SourceRange(match.index, match[0].length));
            match = regexObject.exec(text);
        }

        // Fall back for XPath, etc. matches.
        if (!matchRanges.length)
            matchRanges.push(new WebInspector.SourceRange(0, text.length));

        this._highlightResult = [];
        WebInspector.highlightSearchResults(this.listItemElement, matchRanges, this._highlightResult);
    },

    _scrollIntoView: function()
    {
        function scrollIntoViewCallback(object)
        {
            /**
             * @suppressReceiverCheck
             * @this {!Element}
             */
            function scrollIntoView()
            {
                this.scrollIntoViewIfNeeded(true);
            }

            if (object)
                object.callFunction(scrollIntoView);
        }

        this._node.resolveToObject("", scrollIntoViewCallback);
    },

    /**
     * @return {!Array.<!WebInspector.DOMModel>}
     */
    _visibleShadowRoots: function()
    {
        var roots = this._node.shadowRoots();
        if (roots.length && !WebInspector.settings.showUAShadowDOM.get()) {
            roots = roots.filter(function(root) {
                return root.shadowRootType() === WebInspector.DOMNode.ShadowRootTypes.Author;
            });
        }
        return roots;
    },

    /**
     * @return {!Array.<!WebInspector.DOMNode>} visibleChildren
     */
    _visibleChildren: function()
    {
        var visibleChildren = this._visibleShadowRoots();
        if (this._node.importedDocument())
            visibleChildren.push(this._node.importedDocument());
        if (this._node.templateContent())
            visibleChildren.push(this._node.templateContent());
        var pseudoElements = this._node.pseudoElements();
        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.Before]);
        if (this._node.childNodeCount())
            visibleChildren = visibleChildren.concat(this._node.children());
        if (pseudoElements[WebInspector.DOMNode.PseudoElementNames.After])
            visibleChildren.push(pseudoElements[WebInspector.DOMNode.PseudoElementNames.After]);
        return visibleChildren;
    },

    /**
     * @return {number}
     */
    _visibleChildCount: function()
    {
        var childCount = this._node.childNodeCount() + this._visibleShadowRoots().length;
        if (this._node.importedDocument())
            ++childCount;
        if (this._node.templateContent())
            ++childCount;
        for (var pseudoType in this._node.pseudoElements())
            ++childCount;
        return childCount;
    },

    _updateHasChildren: function()
    {
        this.hasChildren = !this._elementCloseTag && !this._showInlineText() && this._visibleChildCount() > 0;
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @param {!WebInspector.DOMModel} domModel
 * @param {!WebInspector.ElementsTreeOutline} treeOutline
 */
WebInspector.ElementsTreeUpdater = function(domModel, treeOutline)
{
    domModel.addEventListener(WebInspector.DOMModel.Events.NodeInserted, this._nodeInserted, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributesUpdated, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributesUpdated, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
    domModel.addEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);

    this._domModel = domModel;
    this._treeOutline = treeOutline;
    /** @type {!Map.<!WebInspector.DOMNode, !WebInspector.ElementsTreeUpdater.UpdateEntry>} */
    this._recentlyModifiedNodes = new Map();
}

WebInspector.ElementsTreeUpdater.prototype = {
    dispose: function()
    {
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeInserted, this._nodeInserted, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributesUpdated, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributesUpdated, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
        this._domModel.removeEventListener(WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {boolean} isUpdated
     * @param {!WebInspector.DOMNode=} parentNode
     */
    _nodeModified: function(node, isUpdated, parentNode)
    {
        if (this._treeOutline._visible)
            this._updateModifiedNodesSoon();

        var entry = this._recentlyModifiedNodes.get(node);
        if (!entry) {
            entry = new WebInspector.ElementsTreeUpdater.UpdateEntry(isUpdated, parentNode);
            this._recentlyModifiedNodes.put(node, entry);
            return;
        }

        entry.isUpdated |= isUpdated;
        if (parentNode)
            entry.parent = parentNode;
    },

    _documentUpdated: function(event)
    {
        var inspectedRootDocument = event.data;

        this._reset();

        if (!inspectedRootDocument)
            return;

        this._treeOutline.rootDOMNode = inspectedRootDocument;
    },

    _attributesUpdated: function(event)
    {
        this._nodeModified(event.data.node, true);
    },

    _characterDataModified: function(event)
    {
        this._nodeModified(event.data, true);
    },

    _nodeInserted: function(event)
    {
        this._nodeModified(event.data, false, event.data.parentNode);
    },

    _nodeRemoved: function(event)
    {
        this._nodeModified(event.data.node, false, event.data.parent);
    },

    _childNodeCountUpdated: function(event)
    {
        var treeElement = this._treeOutline.findTreeElement(event.data);
        if (treeElement) {
            var oldHasChildren = treeElement.hasChildren;
            treeElement._updateHasChildren();
            if (treeElement.hasChildren !== oldHasChildren)
                treeElement.updateTitle();
        }
    },

    _updateModifiedNodesSoon: function()
    {
        if (this._updateModifiedNodesTimeout)
            return;
        this._updateModifiedNodesTimeout = setTimeout(this._updateModifiedNodes.bind(this), 50);
    },

    _updateModifiedNodes: function()
    {
        if (this._updateModifiedNodesTimeout) {
            clearTimeout(this._updateModifiedNodesTimeout);
            delete this._updateModifiedNodesTimeout;
        }

        var updatedParentTreeElements = [];

        var hidePanelWhileUpdating = this._recentlyModifiedNodes.size() > 10;
        if (hidePanelWhileUpdating) {
            var treeOutlineContainerElement = this._treeOutline.element.parentNode;
            var originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
            this._treeOutline.element.classList.add("hidden");
        }

        var nodes = this._recentlyModifiedNodes.keys();
        for (var i = 0, size = nodes.length; i < size; ++i) {
            var node = nodes[i];
            var entry = this._recentlyModifiedNodes.get(node);
            var parent = entry.parent;

            if (parent === this._treeOutline._rootDOMNode) {
                // Document's children have changed, perform total update.
                this._treeOutline.update();
                this._treeOutline.element.classList.remove("hidden");
                return;
            }

            if (entry.isUpdated) {
                var nodeItem = this._treeOutline.findTreeElement(node);
                if (nodeItem)
                    nodeItem.updateTitle();
            }

            var parentNodeItem = parent ? this._treeOutline.findTreeElement(parent) : null;
            if (parentNodeItem && !parentNodeItem.alreadyUpdatedChildren) {
                parentNodeItem.updateChildren();
                parentNodeItem.alreadyUpdatedChildren = true;
                updatedParentTreeElements.push(parentNodeItem);
            }
        }

        for (var i = 0; i < updatedParentTreeElements.length; ++i)
            delete updatedParentTreeElements[i].alreadyUpdatedChildren;

        if (hidePanelWhileUpdating) {
            this._treeOutline.element.classList.remove("hidden");
            if (originalScrollTop)
                treeOutlineContainerElement.scrollTop = originalScrollTop;
            this._treeOutline.updateSelection();
        }
        this._recentlyModifiedNodes.clear();

        this._treeOutline._fireElementsTreeUpdated(nodes);
    },

    _reset: function()
    {
        this._treeOutline.rootDOMNode = null;
        this._treeOutline.selectDOMNode(null, false);
        this._domModel.hideDOMNodeHighlight();
        this._recentlyModifiedNodes.clear();
    }
}

/**
 * @constructor
 * @param {boolean} isUpdated
 * @param {!WebInspector.DOMNode=} parent
 */
WebInspector.ElementsTreeUpdater.UpdateEntry = function(isUpdated, parent)
{
    this.isUpdated = isUpdated;
    if (parent)
        this.parent = parent;
}

/**
 * @constructor
 * @implements {WebInspector.Renderer}
 */
WebInspector.ElementsTreeOutline.Renderer = function()
{
}

WebInspector.ElementsTreeOutline.Renderer.prototype = {
    /**
     * @param {!Object} object
     * @return {?Element}
     */
    render: function(object)
    {
        if (!(object instanceof WebInspector.DOMNode))
            return null;
        var node = /** @type {!WebInspector.DOMNode} */ (object);
        var treeOutline = new WebInspector.ElementsTreeOutline(node.target(), false, false);
        treeOutline.rootDOMNode = node;
        treeOutline.element.classList.add("outline-disclosure");
        if (!treeOutline.children[0].hasChildren)
            treeOutline.element.classList.add("single-node");
        treeOutline.setVisible(true);
        treeOutline.element.treeElementForTest = treeOutline.children[0];
        return treeOutline.element;
    }
}
