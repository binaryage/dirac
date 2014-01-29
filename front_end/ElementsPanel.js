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

importScript("CSSNamedFlowCollectionsView.js");
importScript("CSSNamedFlowView.js");
importScript("DOMSyntaxHighlighter.js");
importScript("ElementsTreeOutline.js");
importScript("EventListenersSidebarPane.js");
importScript("MetricsSidebarPane.js");
importScript("OverridesView.js");
importScript("PlatformFontsSidebarPane.js");
importScript("PropertiesSidebarPane.js");
importScript("RenderingOptionsView.js");
importScript("StylesSidebarPane.js");

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @extends {WebInspector.Panel}
 */
WebInspector.ElementsPanel = function()
{
    WebInspector.Panel.call(this, "elements");
    this.registerRequiredCSS("breadcrumbList.css");
    this.registerRequiredCSS("elementsPanel.css");
    this.registerRequiredCSS("textPrompt.css");
    this.setHideOnDetach();

    const initialSidebarWidth = 325;
    const minimumContentWidthPercent = 0.34;
    const initialSidebarHeight = 325;
    const minimumContentHeightPercent = 0.34;
    this.createSidebarView(this.element, WebInspector.SidebarView.SidebarPosition.End, initialSidebarWidth, initialSidebarHeight);
    this.splitView.setSidebarElementConstraints(Preferences.minElementsSidebarWidth, Preferences.minElementsSidebarHeight);
    this.splitView.setMainElementConstraints(minimumContentWidthPercent, minimumContentHeightPercent);
    this.splitView.addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._updateTreeOutlineVisibleWidth.bind(this));

    this._searchableView = new WebInspector.SearchableView(this);
    this.splitView.setMainView(this._searchableView);
    var stackElement = this._searchableView.element;

    this.contentElement = stackElement.createChild("div");
    this.contentElement.id = "elements-content";
    this.contentElement.classList.add("outline-disclosure");
    this.contentElement.classList.add("source-code");
    if (!WebInspector.settings.domWordWrap.get())
        this.contentElement.classList.add("nowrap");
    WebInspector.settings.domWordWrap.addChangeListener(this._domWordWrapSettingChanged.bind(this));

    this.contentElement.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
    this.splitView.sidebarElement().addEventListener("contextmenu", this._sidebarContextMenuEventFired.bind(this), false);

    this.treeOutline = new WebInspector.ElementsTreeOutline(true, true, this._populateContextMenu.bind(this), this._setPseudoClassForNodeId.bind(this));
    this.treeOutline.wireToDomAgent();

    this.treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
    this.treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);

    var crumbsContainer = stackElement.createChild("div");
    crumbsContainer.id = "elements-crumbs";
    this.crumbsElement = crumbsContainer.createChild("div", "crumbs");
    this.crumbsElement.addEventListener("mousemove", this._mouseMovedInCrumbs.bind(this), false);
    this.crumbsElement.addEventListener("mouseout", this._mouseMovedOutOfCrumbs.bind(this), false);

    this.sidebarPanes = {};
    this.sidebarPanes.platformFonts = new WebInspector.PlatformFontsSidebarPane();
    this.sidebarPanes.computedStyle = new WebInspector.ComputedStyleSidebarPane();
    this.sidebarPanes.styles = new WebInspector.StylesSidebarPane(this.sidebarPanes.computedStyle, this._setPseudoClassForNodeId.bind(this));
    this.sidebarPanes.metrics = new WebInspector.MetricsSidebarPane();
    this.sidebarPanes.properties = new WebInspector.PropertiesSidebarPane();
    this.sidebarPanes.domBreakpoints = WebInspector.domBreakpointsSidebarPane.createProxy(this);
    this.sidebarPanes.eventListeners = new WebInspector.EventListenersSidebarPane();

    this.sidebarPanes.styles.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateStyles.bind(this, false));
    this.sidebarPanes.metrics.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateMetrics.bind(this));
    this.sidebarPanes.platformFonts.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updatePlatformFonts.bind(this));
    this.sidebarPanes.properties.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateProperties.bind(this));
    this.sidebarPanes.eventListeners.addEventListener(WebInspector.SidebarPane.EventTypes.wasShown, this.updateEventListeners.bind(this));

    this.sidebarPanes.styles.addEventListener("style edited", this._stylesPaneEdited, this);
    this.sidebarPanes.styles.addEventListener("style property toggled", this._stylesPaneEdited, this);
    this.sidebarPanes.metrics.addEventListener("metrics edited", this._metricsPaneEdited, this);
    this._extensionSidebarPanes = [];

    WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._dockSideChanged.bind(this));
    WebInspector.settings.splitVerticallyWhenDockedToRight.addChangeListener(this._dockSideChanged.bind(this));
    this._dockSideChanged();

    this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(0);

    WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    WebInspector.settings.showShadowDOM.addChangeListener(this._showShadowDOMChanged.bind(this));

    if (WebInspector.domAgent.existingDocument())
        this._documentUpdated(WebInspector.domAgent.existingDocument());

    WebInspector.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.ModelWasEnabled, this._updateSidebars, this);
}

WebInspector.ElementsPanel.prototype = {
    _updateTreeOutlineVisibleWidth: function()
    {
        if (!this.treeOutline)
            return;

        var width = this.splitView.element.offsetWidth;
        if (this.splitView.isVertical())
            width -= this.splitView.sidebarWidth();
        this.treeOutline.setVisibleWidth(width);
        this.updateBreadcrumbSizes();
        this.treeOutline.updateSelection();
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this.treeOutline.element;
    },

    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    statusBarResized: function()
    {
        this.updateBreadcrumbSizes();
    },

    wasShown: function()
    {
        // Attach heavy component lazily
        if (this.treeOutline.element.parentElement !== this.contentElement)
            this.contentElement.appendChild(this.treeOutline.element);

        WebInspector.Panel.prototype.wasShown.call(this);

        this.updateBreadcrumb();
        this.treeOutline.updateSelection();
        this.treeOutline.setVisible(true);

        if (!this.treeOutline.rootDOMNode)
            WebInspector.domAgent.requestDocument();
    },

    willHide: function()
    {
        WebInspector.domAgent.hideDOMNodeHighlight();
        this.treeOutline.setVisible(false);
        this._popoverHelper.hidePopover();

        // Detach heavy component on hide
        this.contentElement.removeChild(this.treeOutline.element);

        WebInspector.Panel.prototype.willHide.call(this);
    },

    onResize: function()
    {
        this._updateTreeOutlineVisibleWidth();
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @param {string} pseudoClass
     * @param {boolean} enable
     */
    _setPseudoClassForNodeId: function(nodeId, pseudoClass, enable)
    {
        var node = WebInspector.domAgent.nodeForId(nodeId);
        if (!node)
            return;

        var pseudoClasses = node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
        if (enable) {
            pseudoClasses = pseudoClasses || [];
            if (pseudoClasses.indexOf(pseudoClass) >= 0)
                return;
            pseudoClasses.push(pseudoClass);
            node.setUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName, pseudoClasses);
        } else {
            if (!pseudoClasses || pseudoClasses.indexOf(pseudoClass) < 0)
                return;
            pseudoClasses.remove(pseudoClass);
            if (!pseudoClasses.length)
                node.removeUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
        }

        this.treeOutline.updateOpenCloseTags(node);
        WebInspector.cssModel.forcePseudoState(node.id, node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName));
        this._metricsPaneEdited();
        this._stylesPaneEdited();

        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.ForcedElementState,
            selector: WebInspector.DOMPresentationUtils.appropriateSelectorFor(node, false),
            enabled: enable,
            state: pseudoClass
        });
    },

    _selectedNodeChanged: function()
    {
        var selectedNode = this.selectedDOMNode();
        if (!selectedNode && this._lastValidSelectedNode)
            this._selectedPathOnReset = this._lastValidSelectedNode.path();

        this.updateBreadcrumb(false);

        this._updateSidebars();

        if (selectedNode) {
            ConsoleAgent.addInspectedNode(selectedNode.id);
            this._lastValidSelectedNode = selectedNode;
        }
        WebInspector.notifications.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged);
    },

    _updateSidebars: function()
    {
        for (var pane in this.sidebarPanes)
           this.sidebarPanes[pane].needsUpdate = true;

        this.updateStyles(true);
        this.updateMetrics();
        this.updatePlatformFonts();
        this.updateProperties();
        this.updateEventListeners();
    },

    _reset: function()
    {
        delete this.currentQuery;
    },

    _documentUpdatedEvent: function(event)
    {
        this._documentUpdated(event.data);
    },

    _documentUpdated: function(inspectedRootDocument)
    {
        this._reset();
        this.searchCanceled();

        this.treeOutline.rootDOMNode = inspectedRootDocument;

        if (!inspectedRootDocument) {
            if (this.isShowing())
                WebInspector.domAgent.requestDocument();
            return;
        }

        WebInspector.domBreakpointsSidebarPane.restoreBreakpoints();

        /**
         * @this {WebInspector.ElementsPanel}
         * @param {?WebInspector.DOMNode} candidateFocusNode
         */
        function selectNode(candidateFocusNode)
        {
            if (!candidateFocusNode)
                candidateFocusNode = inspectedRootDocument.body || inspectedRootDocument.documentElement;

            if (!candidateFocusNode)
                return;

            this.selectDOMNode(candidateFocusNode);
            if (this.treeOutline.selectedTreeElement)
                this.treeOutline.selectedTreeElement.expand();
        }

        /**
         * @param {?DOMAgent.NodeId} nodeId
         * @this {WebInspector.ElementsPanel}
         */
        function selectLastSelectedNode(nodeId)
        {
            if (this.selectedDOMNode()) {
                // Focused node has been explicitly set while reaching out for the last selected node.
                return;
            }
            var node = nodeId ? WebInspector.domAgent.nodeForId(nodeId) : null;
            selectNode.call(this, node);
        }

        if (this._selectedPathOnReset)
            WebInspector.domAgent.pushNodeByPathToFrontend(this._selectedPathOnReset, selectLastSelectedNode.bind(this));
        else
            selectNode.call(this, null);
        delete this._selectedPathOnReset;
    },

    searchCanceled: function()
    {
        delete this._searchQuery;
        this._hideSearchHighlights();

        this._searchableView.updateSearchMatchesCount(0);

        delete this._currentSearchResultIndex;
        delete this._searchResults;
        WebInspector.domAgent.cancelSearch();
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     */
    performSearch: function(query, shouldJump)
    {
        // Call searchCanceled since it will reset everything we need before doing a new search.
        this.searchCanceled();

        const whitespaceTrimmedQuery = query.trim();
        if (!whitespaceTrimmedQuery.length)
            return;

        this._searchQuery = query;

        /**
         * @param {number} resultCount
         * @this {WebInspector.ElementsPanel}
         */
        function resultCountCallback(resultCount)
        {
            this._searchableView.updateSearchMatchesCount(resultCount);
            if (!resultCount)
                return;

            this._searchResults = new Array(resultCount);
            this._currentSearchResultIndex = -1;
            if (shouldJump)
                this.jumpToNextSearchResult();
        }
        WebInspector.domAgent.performSearch(whitespaceTrimmedQuery, resultCountCallback.bind(this));
    },

    _contextMenuEventFired: function(event)
    {
        function toggleWordWrap()
        {
            WebInspector.settings.domWordWrap.set(!WebInspector.settings.domWordWrap.get());
        }

        var contextMenu = new WebInspector.ContextMenu(event);
        this.treeOutline.populateContextMenu(contextMenu, event);

        if (WebInspector.experimentsSettings.cssRegions.isEnabled()) {
            contextMenu.appendSeparator();
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "CSS named flows\u2026" : "CSS Named Flows\u2026"), this._showNamedFlowCollections.bind(this));
        }

        contextMenu.appendSeparator();
        contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Word wrap" : "Word Wrap"), toggleWordWrap.bind(this), WebInspector.settings.domWordWrap.get());

        contextMenu.show();
    },

    _showNamedFlowCollections: function()
    {
        if (!WebInspector.cssNamedFlowCollectionsView)
            WebInspector.cssNamedFlowCollectionsView = new WebInspector.CSSNamedFlowCollectionsView();
        WebInspector.cssNamedFlowCollectionsView.showInDrawer();
    },

    _domWordWrapSettingChanged: function(event)
    {
        if (event.data)
            this.contentElement.classList.remove("nowrap");
        else
            this.contentElement.classList.add("nowrap");

        var selectedNode = this.selectedDOMNode();
        if (!selectedNode)
            return;

        var treeElement = this.treeOutline.findTreeElement(selectedNode);
        if (treeElement)
            treeElement.updateSelection(); // Recalculate selection highlight dimensions.
    },

    switchToAndFocus: function(node)
    {
        // Reset search restore.
        this._searchableView.cancelSearch();
        WebInspector.inspectorView.setCurrentPanel(this);
        this.selectDOMNode(node, true);
    },

    _populateContextMenu: function(contextMenu, node)
    {
        // Add debbuging-related actions
        contextMenu.appendSeparator();
        var pane = WebInspector.domBreakpointsSidebarPane;
        pane.populateNodeContextMenu(node, contextMenu);
    },

    _getPopoverAnchor: function(element)
    {
        var anchor = element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");
        if (anchor) {
            if (!anchor.href)
                return null;

            var resource = WebInspector.resourceTreeModel.resourceForURL(anchor.href);
            if (!resource || resource.type !== WebInspector.resourceTypes.Image)
                return null;

            anchor.removeAttribute("title");
        }
        return anchor;
    },
    
    _loadDimensionsForNode: function(treeElement, callback)
    {
        // We get here for CSS properties, too, so bail out early for non-DOM treeElements.
        if (treeElement.treeOutline !== this.treeOutline) {
            callback();
            return;
        }
        
        var node = /** @type {!WebInspector.DOMNode} */ (treeElement.representedObject);

        if (!node.nodeName() || node.nodeName().toLowerCase() !== "img") {
            callback();
            return;
        }

        WebInspector.RemoteObject.resolveNode(node, "", resolvedNode);

        function resolvedNode(object)
        {
            if (!object) {
                callback();
                return;
            }

            object.callFunctionJSON(dimensions, undefined, callback);
            object.release();

            /**
             * @return {!{offsetWidth: number, offsetHeight: number, naturalWidth: number, naturalHeight: number}}
             * @this {!Element}
             */
            function dimensions()
            {
                return { offsetWidth: this.offsetWidth, offsetHeight: this.offsetHeight, naturalWidth: this.naturalWidth, naturalHeight: this.naturalHeight };
            }
        }
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        var listItem = anchor.enclosingNodeOrSelfWithNodeName("li");
        if (listItem && listItem.treeElement)
            this._loadDimensionsForNode(listItem.treeElement, WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils, anchor.href, true, showPopover));
        else
            WebInspector.DOMPresentationUtils.buildImagePreviewContents(anchor.href, true, showPopover);

        /**
         * @param {!Element=} contents
         */
        function showPopover(contents)
        {
            if (!contents)
                return;
            popover.setCanShrink(false);
            popover.show(contents, anchor);
        }
    },

    jumpToNextSearchResult: function()
    {
        if (!this._searchResults)
            return;

        this._hideSearchHighlights();
        if (++this._currentSearchResultIndex >= this._searchResults.length)
            this._currentSearchResultIndex = 0;

        this._highlightCurrentSearchResult();
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults)
            return;

        this._hideSearchHighlights();
        if (--this._currentSearchResultIndex < 0)
            this._currentSearchResultIndex = (this._searchResults.length - 1);

        this._highlightCurrentSearchResult();
    },

    _highlightCurrentSearchResult: function()
    {
        var index = this._currentSearchResultIndex;
        var searchResults = this._searchResults;
        var searchResult = searchResults[index];

        if (searchResult === null) {
            this._searchableView.updateCurrentMatchIndex(index);
            return;
        }

        /**
         * @param {?WebInspector.DOMNode} node
         * @this {WebInspector.ElementsPanel}
         */
        function searchCallback(node)
        {
            searchResults[index] = node;
            this._highlightCurrentSearchResult();
        }

        if (typeof searchResult === "undefined") {
            // No data for slot, request it.
            WebInspector.domAgent.searchResult(index, searchCallback.bind(this));
            return;
        }

        this._searchableView.updateCurrentMatchIndex(index);

        var treeElement = this.treeOutline.findTreeElement(searchResult);
        if (treeElement) {
            treeElement.highlightSearchResults(this._searchQuery);
            treeElement.reveal();
            var matches = treeElement.listItemElement.getElementsByClassName("highlighted-search-result");
            if (matches.length)
                matches[0].scrollIntoViewIfNeeded();
        }
    },

    _hideSearchHighlights: function()
    {
        if (!this._searchResults)
            return;
        var searchResult = this._searchResults[this._currentSearchResultIndex];
        if (!searchResult)
            return;
        var treeElement = this.treeOutline.findTreeElement(searchResult);
        if (treeElement)
            treeElement.hideSearchHighlights();
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    selectedDOMNode: function()
    {
        return this.treeOutline.selectedDOMNode();
    },

    /**
     * @param {boolean=} focus
     */
    selectDOMNode: function(node, focus)
    {
        this.treeOutline.selectDOMNode(node, focus);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateBreadcrumbIfNeeded: function(event)
    {
        var nodes = /** @type {!Array.<!WebInspector.DOMNode>} */ (event.data || []);
        if (!nodes.length)
            return;

        var crumbs = this.crumbsElement;
        for (var crumb = crumbs.firstChild; crumb; crumb = crumb.nextSibling) {
            if (nodes.indexOf(crumb.representedObject) !== -1) {
                this.updateBreadcrumb(true);
                return;
            }
        }
    },

    _stylesPaneEdited: function()
    {
        // Once styles are edited, the Metrics pane should be updated.
        this.sidebarPanes.metrics.needsUpdate = true;
        this.updateMetrics();
        this.sidebarPanes.platformFonts.needsUpdate = true;
        this.updatePlatformFonts();
    },

    _metricsPaneEdited: function()
    {
        // Once metrics are edited, the Styles pane should be updated.
        this.sidebarPanes.styles.needsUpdate = true;
        this.updateStyles(true);
    },

    _mouseMovedInCrumbs: function(event)
    {
        var nodeUnderMouse = document.elementFromPoint(event.pageX, event.pageY);
        var crumbElement = nodeUnderMouse.enclosingNodeOrSelfWithClass("crumb");

        WebInspector.domAgent.highlightDOMNode(crumbElement ? crumbElement.representedObject.id : 0);

        if ("_mouseOutOfCrumbsTimeout" in this) {
            clearTimeout(this._mouseOutOfCrumbsTimeout);
            delete this._mouseOutOfCrumbsTimeout;
        }
    },

    _mouseMovedOutOfCrumbs: function(event)
    {
        var nodeUnderMouse = document.elementFromPoint(event.pageX, event.pageY);
        if (nodeUnderMouse && nodeUnderMouse.isDescendant(this.crumbsElement))
            return;

        WebInspector.domAgent.hideDOMNodeHighlight();

        this._mouseOutOfCrumbsTimeout = setTimeout(this.updateBreadcrumbSizes.bind(this), 1000);
    },

    /**
     * @param {boolean=} forceUpdate
     */
    updateBreadcrumb: function(forceUpdate)
    {
        if (!this.isShowing())
            return;

        var crumbs = this.crumbsElement;

        var handled = false;
        var crumb = crumbs.firstChild;
        while (crumb) {
            if (crumb.representedObject === this.selectedDOMNode()) {
                crumb.classList.add("selected");
                handled = true;
            } else {
                crumb.classList.remove("selected");
            }

            crumb = crumb.nextSibling;
        }

        if (handled && !forceUpdate) {
            // We don't need to rebuild the crumbs, but we need to adjust sizes
            // to reflect the new focused or root node.
            this.updateBreadcrumbSizes();
            return;
        }

        crumbs.removeChildren();

        var panel = this;

        function selectCrumbFunction(event)
        {
            var crumb = event.currentTarget;
            if (crumb.classList.contains("collapsed")) {
                // Clicking a collapsed crumb will expose the hidden crumbs.
                if (crumb === panel.crumbsElement.firstChild) {
                    // If the focused crumb is the first child, pick the farthest crumb
                    // that is still hidden. This allows the user to expose every crumb.
                    var currentCrumb = crumb;
                    while (currentCrumb) {
                        var hidden = currentCrumb.classList.contains("hidden");
                        var collapsed = currentCrumb.classList.contains("collapsed");
                        if (!hidden && !collapsed)
                            break;
                        crumb = currentCrumb;
                        currentCrumb = currentCrumb.nextSibling;
                    }
                }

                panel.updateBreadcrumbSizes(crumb);
            } else
                panel.selectDOMNode(crumb.representedObject, true);

            event.preventDefault();
        }

        for (var current = this.selectedDOMNode(); current; current = current.parentNode) {
            if (current.nodeType() === Node.DOCUMENT_NODE)
                continue;

            crumb = document.createElement("span");
            crumb.className = "crumb";
            crumb.representedObject = current;
            crumb.addEventListener("mousedown", selectCrumbFunction, false);

            var crumbTitle = "";
            switch (current.nodeType()) {
                case Node.ELEMENT_NODE:
                    if (current.pseudoType())
                        crumbTitle = "::" + current.pseudoType();
                    else
                        WebInspector.DOMPresentationUtils.decorateNodeLabel(current, crumb);
                    break;

                case Node.TEXT_NODE:
                    crumbTitle = WebInspector.UIString("(text)");
                    break;

                case Node.COMMENT_NODE:
                    crumbTitle = "<!-->";
                    break;

                case Node.DOCUMENT_TYPE_NODE:
                    crumbTitle = "<!DOCTYPE>";
                    break;

                case Node.DOCUMENT_FRAGMENT_NODE:
                  crumbTitle = current.shadowRootType() ? "#shadow-root" : current.nodeNameInCorrectCase();
                  break;

                default:
                    crumbTitle = current.nodeNameInCorrectCase();
            }

            if (!crumb.childNodes.length) {
                var nameElement = document.createElement("span");
                nameElement.textContent = crumbTitle;
                crumb.appendChild(nameElement);
                crumb.title = crumbTitle;
            }

            if (current === this.selectedDOMNode())
                crumb.classList.add("selected");
            if (!crumbs.childNodes.length)
                crumb.classList.add("end");

            crumbs.insertBefore(crumb, crumbs.firstChild);
        }

        if (crumbs.hasChildNodes())
            crumbs.lastChild.classList.add("start");

        this.updateBreadcrumbSizes();
    },

    /**
     * @param {!Element=} focusedCrumb
     */
    updateBreadcrumbSizes: function(focusedCrumb)
    {
        if (!this.isShowing())
            return;

        if (document.body.offsetWidth <= 0) {
            // The stylesheet hasn't loaded yet or the window is closed,
            // so we can't calculate what is need. Return early.
            return;
        }

        var crumbs = this.crumbsElement;
        if (!crumbs.childNodes.length || crumbs.offsetWidth <= 0)
            return; // No crumbs, do nothing.

        // A Zero index is the right most child crumb in the breadcrumb.
        var selectedIndex = 0;
        var focusedIndex = 0;
        var selectedCrumb;

        var i = 0;
        var crumb = crumbs.firstChild;
        while (crumb) {
            // Find the selected crumb and index.
            if (!selectedCrumb && crumb.classList.contains("selected")) {
                selectedCrumb = crumb;
                selectedIndex = i;
            }

            // Find the focused crumb index.
            if (crumb === focusedCrumb)
                focusedIndex = i;

            // Remove any styles that affect size before
            // deciding to shorten any crumbs.
            if (crumb !== crumbs.lastChild)
                crumb.classList.remove("start");
            if (crumb !== crumbs.firstChild)
                crumb.classList.remove("end");

            crumb.classList.remove("compact");
            crumb.classList.remove("collapsed");
            crumb.classList.remove("hidden");

            crumb = crumb.nextSibling;
            ++i;
        }

        // Restore the start and end crumb classes in case they got removed in coalesceCollapsedCrumbs().
        // The order of the crumbs in the document is opposite of the visual order.
        crumbs.firstChild.classList.add("end");
        crumbs.lastChild.classList.add("start");

        var contentElement = this.contentElement;
        function crumbsAreSmallerThanContainer()
        {
            const rightPadding = 10;
            return crumbs.offsetWidth + rightPadding < contentElement.offsetWidth;
        }

        if (crumbsAreSmallerThanContainer())
            return; // No need to compact the crumbs, they all fit at full size.

        var BothSides = 0;
        var AncestorSide = -1;
        var ChildSide = 1;

        /**
         * @param {boolean=} significantCrumb
         */
        function makeCrumbsSmaller(shrinkingFunction, direction, significantCrumb)
        {
            if (!significantCrumb)
                significantCrumb = (focusedCrumb || selectedCrumb);

            if (significantCrumb === selectedCrumb)
                var significantIndex = selectedIndex;
            else if (significantCrumb === focusedCrumb)
                var significantIndex = focusedIndex;
            else {
                var significantIndex = 0;
                for (var i = 0; i < crumbs.childNodes.length; ++i) {
                    if (crumbs.childNodes[i] === significantCrumb) {
                        significantIndex = i;
                        break;
                    }
                }
            }

            function shrinkCrumbAtIndex(index)
            {
                var shrinkCrumb = crumbs.childNodes[index];
                if (shrinkCrumb && shrinkCrumb !== significantCrumb)
                    shrinkingFunction(shrinkCrumb);
                if (crumbsAreSmallerThanContainer())
                    return true; // No need to compact the crumbs more.
                return false;
            }

            // Shrink crumbs one at a time by applying the shrinkingFunction until the crumbs
            // fit in the container or we run out of crumbs to shrink.
            if (direction) {
                // Crumbs are shrunk on only one side (based on direction) of the signifcant crumb.
                var index = (direction > 0 ? 0 : crumbs.childNodes.length - 1);
                while (index !== significantIndex) {
                    if (shrinkCrumbAtIndex(index))
                        return true;
                    index += (direction > 0 ? 1 : -1);
                }
            } else {
                // Crumbs are shrunk in order of descending distance from the signifcant crumb,
                // with a tie going to child crumbs.
                var startIndex = 0;
                var endIndex = crumbs.childNodes.length - 1;
                while (startIndex != significantIndex || endIndex != significantIndex) {
                    var startDistance = significantIndex - startIndex;
                    var endDistance = endIndex - significantIndex;
                    if (startDistance >= endDistance)
                        var index = startIndex++;
                    else
                        var index = endIndex--;
                    if (shrinkCrumbAtIndex(index))
                        return true;
                }
            }

            // We are not small enough yet, return false so the caller knows.
            return false;
        }

        function coalesceCollapsedCrumbs()
        {
            var crumb = crumbs.firstChild;
            var collapsedRun = false;
            var newStartNeeded = false;
            var newEndNeeded = false;
            while (crumb) {
                var hidden = crumb.classList.contains("hidden");
                if (!hidden) {
                    var collapsed = crumb.classList.contains("collapsed");
                    if (collapsedRun && collapsed) {
                        crumb.classList.add("hidden");
                        crumb.classList.remove("compact");
                        crumb.classList.remove("collapsed");

                        if (crumb.classList.contains("start")) {
                            crumb.classList.remove("start");
                            newStartNeeded = true;
                        }

                        if (crumb.classList.contains("end")) {
                            crumb.classList.remove("end");
                            newEndNeeded = true;
                        }

                        continue;
                    }

                    collapsedRun = collapsed;

                    if (newEndNeeded) {
                        newEndNeeded = false;
                        crumb.classList.add("end");
                    }
                } else
                    collapsedRun = true;
                crumb = crumb.nextSibling;
            }

            if (newStartNeeded) {
                crumb = crumbs.lastChild;
                while (crumb) {
                    if (!crumb.classList.contains("hidden")) {
                        crumb.classList.add("start");
                        break;
                    }
                    crumb = crumb.previousSibling;
                }
            }
        }

        function compact(crumb)
        {
            if (crumb.classList.contains("hidden"))
                return;
            crumb.classList.add("compact");
        }

        function collapse(crumb, dontCoalesce)
        {
            if (crumb.classList.contains("hidden"))
                return;
            crumb.classList.add("collapsed");
            crumb.classList.remove("compact");
            if (!dontCoalesce)
                coalesceCollapsedCrumbs();
        }

        if (!focusedCrumb) {
            // When not focused on a crumb we can be biased and collapse less important
            // crumbs that the user might not care much about.

            // Compact child crumbs.
            if (makeCrumbsSmaller(compact, ChildSide))
                return;

            // Collapse child crumbs.
            if (makeCrumbsSmaller(collapse, ChildSide))
                return;
        }

        // Compact ancestor crumbs, or from both sides if focused.
        if (makeCrumbsSmaller(compact, (focusedCrumb ? BothSides : AncestorSide)))
            return;

        // Collapse ancestor crumbs, or from both sides if focused.
        if (makeCrumbsSmaller(collapse, (focusedCrumb ? BothSides : AncestorSide)))
            return;

        if (!selectedCrumb)
            return;

        // Compact the selected crumb.
        compact(selectedCrumb);
        if (crumbsAreSmallerThanContainer())
            return;

        // Collapse the selected crumb as a last resort. Pass true to prevent coalescing.
        collapse(selectedCrumb, true);
    },

    /**
     * @param {boolean=} forceUpdate
     */
    updateStyles: function(forceUpdate)
    {
        if (!WebInspector.cssModel.isEnabled())
            return;
        var stylesSidebarPane = this.sidebarPanes.styles;
        var computedStylePane = this.sidebarPanes.computedStyle;
        if ((!stylesSidebarPane.isShowing() && !computedStylePane.isShowing()) || !stylesSidebarPane.needsUpdate)
            return;

        stylesSidebarPane.update(this.selectedDOMNode(), forceUpdate);
        stylesSidebarPane.needsUpdate = false;
    },

    updateMetrics: function()
    {
        if (!WebInspector.cssModel.isEnabled())
            return;
        var metricsSidebarPane = this.sidebarPanes.metrics;
        if (!metricsSidebarPane.isShowing() || !metricsSidebarPane.needsUpdate)
            return;

        metricsSidebarPane.update(this.selectedDOMNode());
        metricsSidebarPane.needsUpdate = false;
    },

    updatePlatformFonts: function()
    {
        if (!WebInspector.cssModel.isEnabled())
            return;
        var platformFontsSidebar = this.sidebarPanes.platformFonts;
        if (!platformFontsSidebar.isShowing() || !platformFontsSidebar.needsUpdate)
            return;

        platformFontsSidebar.update(this.selectedDOMNode());
        platformFontsSidebar.needsUpdate = false;
    },

    updateProperties: function()
    {
        var propertiesSidebarPane = this.sidebarPanes.properties;
        if (!propertiesSidebarPane.isShowing() || !propertiesSidebarPane.needsUpdate)
            return;

        propertiesSidebarPane.update(this.selectedDOMNode());
        propertiesSidebarPane.needsUpdate = false;
    },

    updateEventListeners: function()
    {
        var eventListenersSidebarPane = this.sidebarPanes.eventListeners;
        if (!eventListenersSidebarPane.isShowing() || !eventListenersSidebarPane.needsUpdate)
            return;

        eventListenersSidebarPane.update(this.selectedDOMNode());
        eventListenersSidebarPane.needsUpdate = false;
    },

    /**
     * @param {!KeyboardEvent} event
     */
    handleShortcut: function(event)
    {
        /**
         * @this {WebInspector.ElementsPanel}
         */
        function handleUndoRedo()
        {
            if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.shiftKey && event.keyIdentifier === "U+005A") { // Z key
                WebInspector.domAgent.undo(this._updateSidebars.bind(this));
                event.handled = true;
                return;
            }

            var isRedoKey = WebInspector.isMac() ? event.metaKey && event.shiftKey && event.keyIdentifier === "U+005A" : // Z key
                                                   event.ctrlKey && event.keyIdentifier === "U+0059"; // Y key
            if (isRedoKey) {
                DOMAgent.redo(this._updateSidebars.bind(this));
                event.handled = true;
            }
        }

        if (!this.treeOutline.editing()) {
            handleUndoRedo.call(this);
            if (event.handled)
                return;
        }

        this.treeOutline.handleShortcut(event);
    },

    handleCopyEvent: function(event)
    {
        var currentFocusElement = WebInspector.currentFocusElement();
        if (currentFocusElement && WebInspector.isBeingEdited(currentFocusElement))
            return;

        // Don't prevent the normal copy if the user has a selection.
        if (!window.getSelection().isCollapsed)
            return;
        event.clipboardData.clearData();
        event.preventDefault();
        this.selectedDOMNode().copyNode();
    },

    revealAndSelectNode: function(nodeId)
    {
        WebInspector.inspectorView.setCurrentPanel(this);

        var node = WebInspector.domAgent.nodeForId(nodeId);
        if (!node)
            return;

        while (!WebInspector.ElementsTreeOutline.showShadowDOM() && node && node.isInShadowTree())
            node = node.parentNode;

        WebInspector.domAgent.highlightDOMNodeForTwoSeconds(nodeId);
        this.selectDOMNode(node, true);
    },

    /** 
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        /**
         * @param {?DOMAgent.NodeId} nodeId
         */
        function selectNode(nodeId)
        {
            if (nodeId)
                WebInspector.domAgent.inspectElement(nodeId);
        }

        /**
         * @param {!WebInspector.RemoteObject} remoteObject
         */
        function revealElement(remoteObject)
        {
            remoteObject.pushNodeToFrontend(selectNode);
        }

        var commandCallback;
        if (target instanceof WebInspector.RemoteObject) {
            var remoteObject = /** @type {!WebInspector.RemoteObject} */ (target);
            if (remoteObject.subtype === "node")
                commandCallback = revealElement.bind(this, remoteObject);
        } else if (target instanceof WebInspector.DOMNode) {
            var domNode = /** @type {!WebInspector.DOMNode} */ (target);
            if (domNode.id)
                commandCallback = WebInspector.domAgent.inspectElement.bind(WebInspector.domAgent, domNode.id);
        }
        if (!commandCallback)
            return;
        // Skip adding "Reveal..." menu item for our own tree outline.
        if (this.treeOutline.element.isAncestor(event.target))
            return;
        contextMenu.appendItem(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Elements panel" : "Reveal in Elements Panel", commandCallback);
    },

    _sidebarContextMenuEventFired: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.show();
    },

    _dockSideChanged: function()
    {
        var vertically = WebInspector.dockController.isVertical() && WebInspector.settings.splitVerticallyWhenDockedToRight.get();
        this._splitVertically(vertically);
    },

    _showShadowDOMChanged: function()
    {
        this.treeOutline.update();
    },

    /**
     * @param {boolean} vertically
     */
    _splitVertically: function(vertically)
    {
        if (this.sidebarPaneView && vertically === !this.splitView.isVertical())
            return;

        if (this.sidebarPaneView) {
            this.sidebarPaneView.detach();
            this.splitView.uninstallResizer(this.sidebarPaneView.headerElement());
        }

        this.splitView.setVertical(!vertically);

        var computedPane = new WebInspector.SidebarPane(WebInspector.UIString("Computed"));
        computedPane.element.classList.add("composite");
        computedPane.element.classList.add("fill");
        var expandComputed = computedPane.expand.bind(computedPane);

        computedPane.bodyElement.appendChild(this.sidebarPanes.computedStyle.titleElement);
        computedPane.bodyElement.classList.add("metrics-and-computed");
        this.sidebarPanes.computedStyle.show(computedPane.bodyElement);
        this.sidebarPanes.computedStyle.setExpandCallback(expandComputed);

        this.sidebarPanes.platformFonts.show(computedPane.bodyElement);

        /**
         * @param {!WebInspector.SidebarPane} pane
         * @param {!Element=} beforeElement
         * @this {WebInspector.ElementsPanel}
         */
        function showMetrics(pane, beforeElement)
        {
            this.sidebarPanes.metrics.show(pane.bodyElement, beforeElement);
        }

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.ElementsPanel}
         */
        function tabSelected(event)
        {
            var tabId = /** @type {string} */ (event.data.tabId);
            if (tabId === computedPane.title())
                showMetrics.call(this, computedPane, this.sidebarPanes.computedStyle.element);
            if (tabId === stylesPane.title())
                showMetrics.call(this, stylesPane);
        }

        this.sidebarPaneView = new WebInspector.SidebarTabbedPane();

        if (vertically) {
            this.splitView.installResizer(this.sidebarPaneView.headerElement());
            this.sidebarPanes.metrics.show(computedPane.bodyElement, this.sidebarPanes.computedStyle.element);
            this.sidebarPanes.metrics.setExpandCallback(expandComputed);

            var compositePane = new WebInspector.SidebarPane(this.sidebarPanes.styles.title());
            compositePane.element.classList.add("composite");
            compositePane.element.classList.add("fill");
            var expandComposite = compositePane.expand.bind(compositePane);

            var splitView = new WebInspector.SplitView(true, "StylesPaneSplitRatio", 0.5);
            splitView.show(compositePane.bodyElement);

            splitView.setFirstView(this.sidebarPanes.styles);
            splitView.firstElement().appendChild(this.sidebarPanes.styles.titleElement);
            this.sidebarPanes.styles.setExpandCallback(expandComposite);

            splitView.setSecondView(computedPane);
            computedPane.setExpandCallback(expandComposite);

            this.sidebarPaneView.addPane(compositePane);
        } else {
            var stylesPane = new WebInspector.SidebarPane(this.sidebarPanes.styles.title());
            stylesPane.element.classList.add("composite");
            stylesPane.element.classList.add("fill");
            var expandStyles = stylesPane.expand.bind(stylesPane);
            stylesPane.bodyElement.classList.add("metrics-and-styles");
            this.sidebarPanes.styles.show(stylesPane.bodyElement);
            this.sidebarPanes.styles.setExpandCallback(expandStyles);
            this.sidebarPanes.metrics.setExpandCallback(expandStyles);
            stylesPane.bodyElement.appendChild(this.sidebarPanes.styles.titleElement);

            this.sidebarPaneView.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, tabSelected, this);

            showMetrics.call(this, stylesPane);
            this.sidebarPaneView.addPane(stylesPane);
            this.sidebarPaneView.addPane(computedPane);
        }

        this.sidebarPaneView.addPane(this.sidebarPanes.eventListeners);
        this.sidebarPaneView.addPane(this.sidebarPanes.domBreakpoints);
        this.sidebarPaneView.addPane(this.sidebarPanes.properties);
        this._extensionSidebarPanesContainer = this.sidebarPaneView;

        for (var i = 0; i < this._extensionSidebarPanes.length; ++i)
            this._extensionSidebarPanesContainer.addPane(this._extensionSidebarPanes[i]);

        this.splitView.setSidebarView(this.sidebarPaneView);
        this.sidebarPanes.styles.expand();
    },

    /**
     * @param {string} id
     * @param {!WebInspector.SidebarPane} pane
     */
    addExtensionSidebarPane: function(id, pane)
    {
        this._extensionSidebarPanes.push(pane);
        this._extensionSidebarPanesContainer.addPane(pane);
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.ElementsPanel.ContextMenuProvider = function()
{
}

WebInspector.ElementsPanel.ContextMenuProvider.prototype = {
    /**
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        WebInspector.panel("elements").appendApplicableItems(event, contextMenu, target);
    }
}


/**
 * @constructor
 * @extends {WebInspector.Drawer.SingletonViewFactory}
 */
WebInspector.ElementsPanel.OverridesViewFactory = function()
{
    WebInspector.Drawer.SingletonViewFactory.call(this, WebInspector.OverridesView);
}

WebInspector.ElementsPanel.OverridesViewFactory.prototype = {
    __proto__: WebInspector.Drawer.SingletonViewFactory.prototype
}


/**
 * @constructor
 * @extends {WebInspector.Drawer.SingletonViewFactory}
 */
WebInspector.ElementsPanel.RenderingViewFactory = function()
{
    WebInspector.Drawer.SingletonViewFactory.call(this, WebInspector.RenderingOptionsView);
}

WebInspector.ElementsPanel.RenderingViewFactory.prototype = {
    __proto__: WebInspector.Drawer.SingletonViewFactory.prototype
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.ElementsPanel.DOMNodeRevealer = function()
{
}

WebInspector.ElementsPanel.DOMNodeRevealer.prototype = {
    /**
     * @param {!Object} node
     */
    reveal: function(node)
    {
        if (node instanceof WebInspector.DOMNode)
            /** @type {!WebInspector.ElementsPanel} */ (WebInspector.showPanel("elements")).revealAndSelectNode(node.id);
    }
}
