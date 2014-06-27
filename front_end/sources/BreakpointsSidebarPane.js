/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 * @param {!WebInspector.BreakpointManager} breakpointManager
 * @param {function(!WebInspector.UISourceCode, number=, number=, boolean=)} showSourceLineDelegate
 */
WebInspector.JavaScriptBreakpointsSidebarPane = function(breakpointManager, showSourceLineDelegate)
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Breakpoints"));
    this.registerRequiredCSS("breakpointsList.css");

    this._breakpointManager = breakpointManager;
    this._showSourceLineDelegate = showSourceLineDelegate;

    this.listElement = document.createElement("ol");
    this.listElement.className = "breakpoint-list";

    this.emptyElement = document.createElement("div");
    this.emptyElement.className = "info";
    this.emptyElement.textContent = WebInspector.UIString("No Breakpoints");

    this.bodyElement.appendChild(this.emptyElement);

    this._items = new Map();

    var breakpointLocations = this._breakpointManager.allBreakpointLocations();
    for (var i = 0; i < breakpointLocations.length; ++i)
        this._addBreakpoint(breakpointLocations[i].breakpoint, breakpointLocations[i].uiLocation);

    this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
    this._breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

    this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);
}

WebInspector.JavaScriptBreakpointsSidebarPane.prototype = {
    _emptyElementContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        this._appendBreakpointActiveItem(contextMenu);
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendBreakpointActiveItem: function(contextMenu)
    {
        var breakpointActive = this._breakpointManager.breakpointsActive();
        var breakpointActiveTitle = breakpointActive ?
            WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Deactivate breakpoints" : "Deactivate Breakpoints") :
            WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Activate breakpoints" : "Activate Breakpoints");
        contextMenu.appendItem(breakpointActiveTitle, this._breakpointManager.setBreakpointsActive.bind(this._breakpointManager, !breakpointActive));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _breakpointAdded: function(event)
    {
        this._breakpointRemoved(event);

        var breakpoint = /** @type {!WebInspector.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
        var uiLocation = /** @type {!WebInspector.UILocation} */ (event.data.uiLocation);
        this._addBreakpoint(breakpoint, uiLocation);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {!WebInspector.UILocation} uiLocation
     */
    _addBreakpoint: function(breakpoint, uiLocation)
    {
        var element = document.createElement("li");
        element.classList.add("cursor-pointer");
        element.addEventListener("contextmenu", this._breakpointContextMenu.bind(this, breakpoint), true);
        element.addEventListener("click", this._breakpointClicked.bind(this, uiLocation), false);

        var checkbox = document.createElement("input");
        checkbox.className = "checkbox-elem";
        checkbox.type = "checkbox";
        checkbox.checked = breakpoint.enabled();
        checkbox.addEventListener("click", this._breakpointCheckboxClicked.bind(this, breakpoint), false);
        element.appendChild(checkbox);

        var labelElement = document.createTextNode(uiLocation.linkText());
        element.appendChild(labelElement);

        var snippetElement = document.createElement("div");
        snippetElement.className = "source-text monospace";
        element.appendChild(snippetElement);

        /**
         * @param {?string} content
         */
        function didRequestContent(content)
        {
            var lineNumber = uiLocation.lineNumber
            var columnNumber = uiLocation.columnNumber;
            var contentString = new String(content);
            if (lineNumber < contentString.lineCount()) {
                var lineText = contentString.lineAt(lineNumber);
                var maxSnippetLength = 200;
                snippetElement.textContent = lineText.substr(columnNumber).trimEnd(maxSnippetLength);
            }
        }

        uiLocation.uiSourceCode.requestContent(didRequestContent);

        element._data = uiLocation;
        var currentElement = this.listElement.firstChild;
        while (currentElement) {
            if (currentElement._data && this._compareBreakpoints(currentElement._data, element._data) > 0)
                break;
            currentElement = currentElement.nextSibling;
        }
        this._addListElement(element, currentElement);

        var breakpointItem = {};
        breakpointItem.element = element;
        breakpointItem.checkbox = checkbox;
        this._items.put(breakpoint, breakpointItem);

        this.expand();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _breakpointRemoved: function(event)
    {
        var breakpoint = /** @type {!WebInspector.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
        var uiLocation = /** @type {!WebInspector.UILocation} */ (event.data.uiLocation);
        var breakpointItem = this._items.get(breakpoint);
        if (!breakpointItem)
            return;
        this._items.remove(breakpoint);
        this._removeListElement(breakpointItem.element);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     */
    highlightBreakpoint: function(breakpoint)
    {
        var breakpointItem = this._items.get(breakpoint);
        if (!breakpointItem)
            return;
        breakpointItem.element.classList.add("breakpoint-hit");
        this._highlightedBreakpointItem = breakpointItem;
    },

    clearBreakpointHighlight: function()
    {
        if (this._highlightedBreakpointItem) {
            this._highlightedBreakpointItem.element.classList.remove("breakpoint-hit");
            delete this._highlightedBreakpointItem;
        }
    },

    _breakpointClicked: function(uiLocation, event)
    {
        this._showSourceLineDelegate(uiLocation.uiSourceCode, uiLocation.lineNumber);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {?Event} event
     */
    _breakpointCheckboxClicked: function(breakpoint, event)
    {
        // Breakpoint element has it's own click handler.
        event.consume();
        breakpoint.setEnabled(event.target.checked);
    },

    /**
     * @param {!WebInspector.BreakpointManager.Breakpoint} breakpoint
     * @param {?Event} event
     */
    _breakpointContextMenu: function(breakpoint, event)
    {
        var breakpoints = this._items.values();
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove breakpoint" : "Remove Breakpoint"), breakpoint.remove.bind(breakpoint));
        if (breakpoints.length > 1) {
            var removeAllTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove all breakpoints" : "Remove All Breakpoints");
            contextMenu.appendItem(removeAllTitle, this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));
        }

        contextMenu.appendSeparator();
        this._appendBreakpointActiveItem(contextMenu);

        function enabledBreakpointCount(breakpoints)
        {
            var count = 0;
            for (var i = 0; i < breakpoints.length; ++i) {
                if (breakpoints[i].checkbox.checked)
                    count++;
            }
            return count;
        }
        if (breakpoints.length > 1) {
            var enableBreakpointCount = enabledBreakpointCount(breakpoints);
            var enableTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Enable all breakpoints" : "Enable All Breakpoints");
            var disableTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Disable all breakpoints" : "Disable All Breakpoints");

            contextMenu.appendSeparator();

            contextMenu.appendItem(enableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, true), !(enableBreakpointCount != breakpoints.length));
            contextMenu.appendItem(disableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, false), !(enableBreakpointCount > 1));
        }

        contextMenu.show();
    },

    _addListElement: function(element, beforeElement)
    {
        if (beforeElement)
            this.listElement.insertBefore(element, beforeElement);
        else {
            if (!this.listElement.firstChild) {
                this.bodyElement.removeChild(this.emptyElement);
                this.bodyElement.appendChild(this.listElement);
            }
            this.listElement.appendChild(element);
        }
    },

    _removeListElement: function(element)
    {
        this.listElement.removeChild(element);
        if (!this.listElement.firstChild) {
            this.bodyElement.removeChild(this.listElement);
            this.bodyElement.appendChild(this.emptyElement);
        }
    },

    _compare: function(x, y)
    {
        if (x !== y)
            return x < y ? -1 : 1;
        return 0;
    },

    _compareBreakpoints: function(b1, b2)
    {
        return this._compare(b1.uiSourceCode.originURL(), b2.uiSourceCode.originURL()) || this._compare(b1.lineNumber, b2.lineNumber);
    },

    reset: function()
    {
        this.listElement.removeChildren();
        if (this.listElement.parentElement) {
            this.bodyElement.removeChild(this.listElement);
            this.bodyElement.appendChild(this.emptyElement);
        }
        this._items.clear();
    },

    __proto__: WebInspector.SidebarPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.NativeBreakpointsSidebarPane}
 */
WebInspector.XHRBreakpointsSidebarPane = function()
{
    WebInspector.NativeBreakpointsSidebarPane.call(this, WebInspector.UIString("XHR Breakpoints"));

    this._breakpointElements = {};

    var addButton = document.createElement("button");
    addButton.className = "pane-title-button add";
    addButton.addEventListener("click", this._addButtonClicked.bind(this), false);
    addButton.title = WebInspector.UIString("Add XHR breakpoint");
    this.titleElement.appendChild(addButton);

    this.emptyElement.addEventListener("contextmenu", this._emptyElementContextMenu.bind(this), true);

    this._restoreBreakpoints();
}

WebInspector.XHRBreakpointsSidebarPane.prototype = {
    _emptyElementContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add breakpoint" : "Add Breakpoint"), this._addButtonClicked.bind(this));
        contextMenu.show();
    },

    _addButtonClicked: function(event)
    {
        if (event)
            event.consume();

        this.expand();

        var inputElementContainer = document.createElement("p");
        inputElementContainer.className = "breakpoint-condition";
        var inputElement = document.createElement("span");
        inputElementContainer.textContent = WebInspector.UIString("Break when URL contains:");
        inputElement.className = "editing";
        inputElement.id = "breakpoint-condition-input";
        inputElementContainer.appendChild(inputElement);
        this.addListElement(inputElementContainer, /** @type {?Element} */ (this.listElement.firstChild));

        /**
         * @param {boolean} accept
         * @param {!Element} e
         * @param {string} text
         * @this {WebInspector.XHRBreakpointsSidebarPane}
         */
        function finishEditing(accept, e, text)
        {
            this.removeListElement(inputElementContainer);
            if (accept) {
                this._setBreakpoint(text, true);
                this._saveBreakpoints();
            }
        }

        var config = new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false));
        WebInspector.InplaceEditor.startEditing(inputElement, config);
    },

    _setBreakpoint: function(url, enabled)
    {
        if (url in this._breakpointElements)
            return;

        var element = document.createElement("li");
        element._url = url;
        element.addEventListener("contextmenu", this._contextMenu.bind(this, url), true);

        var checkboxElement = document.createElement("input");
        checkboxElement.className = "checkbox-elem";
        checkboxElement.type = "checkbox";
        checkboxElement.checked = enabled;
        checkboxElement.addEventListener("click", this._checkboxClicked.bind(this, url), false);
        element._checkboxElement = checkboxElement;
        element.appendChild(checkboxElement);

        var labelElement = document.createElement("span");
        if (!url)
            labelElement.textContent = WebInspector.UIString("Any XHR");
        else
            labelElement.textContent = WebInspector.UIString("URL contains \"%s\"", url);
        labelElement.classList.add("cursor-auto");
        labelElement.addEventListener("dblclick", this._labelClicked.bind(this, url), false);
        element.appendChild(labelElement);

        var currentElement = /** @type {?Element} */ (this.listElement.firstChild);
        while (currentElement) {
            if (currentElement._url && currentElement._url < element._url)
                break;
            currentElement = /** @type {?Element} */ (currentElement.nextSibling);
        }
        this.addListElement(element, currentElement);
        this._breakpointElements[url] = element;
        if (enabled)
            DOMDebuggerAgent.setXHRBreakpoint(url);
    },

    _removeBreakpoint: function(url)
    {
        var element = this._breakpointElements[url];
        if (!element)
            return;

        this.removeListElement(element);
        delete this._breakpointElements[url];
        if (element._checkboxElement.checked)
            DOMDebuggerAgent.removeXHRBreakpoint(url);
    },

    _contextMenu: function(url, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);

        /**
         * @this {WebInspector.XHRBreakpointsSidebarPane}
         */
        function removeBreakpoint()
        {
            this._removeBreakpoint(url);
            this._saveBreakpoints();
        }

        /**
         * @this {WebInspector.XHRBreakpointsSidebarPane}
         */
        function removeAllBreakpoints()
        {
            for (var url in this._breakpointElements)
                this._removeBreakpoint(url);
            this._saveBreakpoints();
        }
        var removeAllTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove all breakpoints" : "Remove All Breakpoints");

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add breakpoint" : "Add Breakpoint"), this._addButtonClicked.bind(this));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Remove breakpoint" : "Remove Breakpoint"), removeBreakpoint.bind(this));
        contextMenu.appendItem(removeAllTitle, removeAllBreakpoints.bind(this));
        contextMenu.show();
    },

    _checkboxClicked: function(url, event)
    {
        if (event.target.checked)
            DOMDebuggerAgent.setXHRBreakpoint(url);
        else
            DOMDebuggerAgent.removeXHRBreakpoint(url);
        this._saveBreakpoints();
    },

    _labelClicked: function(url)
    {
        var element = this._breakpointElements[url];
        var inputElement = document.createElement("span");
        inputElement.className = "breakpoint-condition editing";
        inputElement.textContent = url;
        this.listElement.insertBefore(inputElement, element);
        element.classList.add("hidden");

        /**
         * @param {boolean} accept
         * @param {!Element} e
         * @param {string} text
         * @this {WebInspector.XHRBreakpointsSidebarPane}
         */
        function finishEditing(accept, e, text)
        {
            this.removeListElement(inputElement);
            if (accept) {
                this._removeBreakpoint(url);
                this._setBreakpoint(text, element._checkboxElement.checked);
                this._saveBreakpoints();
            } else
                element.classList.remove("hidden");
        }

        WebInspector.InplaceEditor.startEditing(inputElement, new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false)));
    },

    highlightBreakpoint: function(url)
    {
        var element = this._breakpointElements[url];
        if (!element)
            return;
        this.expand();
        element.classList.add("breakpoint-hit");
        this._highlightedElement = element;
    },

    clearBreakpointHighlight: function()
    {
        if (this._highlightedElement) {
            this._highlightedElement.classList.remove("breakpoint-hit");
            delete this._highlightedElement;
        }
    },

    _saveBreakpoints: function()
    {
        var breakpoints = [];
        for (var url in this._breakpointElements)
            breakpoints.push({ url: url, enabled: this._breakpointElements[url]._checkboxElement.checked });
        WebInspector.settings.xhrBreakpoints.set(breakpoints);
    },

    _restoreBreakpoints: function()
    {
        var breakpoints = WebInspector.settings.xhrBreakpoints.get();
        for (var i = 0; i < breakpoints.length; ++i) {
            var breakpoint = breakpoints[i];
            if (breakpoint && typeof breakpoint.url === "string")
                this._setBreakpoint(breakpoint.url, breakpoint.enabled);
        }
    },

    __proto__: WebInspector.NativeBreakpointsSidebarPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 */
WebInspector.EventListenerBreakpointsSidebarPane = function()
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Event Listener Breakpoints"));
    this.registerRequiredCSS("breakpointsList.css");

    this.categoriesElement = document.createElement("ol");
    this.categoriesElement.tabIndex = 0;
    this.categoriesElement.classList.add("properties-tree");
    this.categoriesElement.classList.add("event-listener-breakpoints");
    this.categoriesTreeOutline = new TreeOutline(this.categoriesElement);
    this.bodyElement.appendChild(this.categoriesElement);

    this._categoryItems = [];
    // FIXME: uncomment following once inspector stops being drop targer in major ports.
    // Otherwise, inspector page reacts on drop event and tries to load the event data.
    // this._createCategory(WebInspector.UIString("Drag"), ["drag", "drop", "dragstart", "dragend", "dragenter", "dragleave", "dragover"]);
    this._createCategory(WebInspector.UIString("Animation"), ["requestAnimationFrame", "cancelAnimationFrame", "animationFrameFired"], true);
    this._createCategory(WebInspector.UIString("Control"), ["resize", "scroll", "zoom", "focus", "blur", "select", "change", "submit", "reset"]);
    this._createCategory(WebInspector.UIString("Clipboard"), ["copy", "cut", "paste", "beforecopy", "beforecut", "beforepaste"]);
    this._createCategory(WebInspector.UIString("DOM Mutation"), ["DOMActivate", "DOMFocusIn", "DOMFocusOut", "DOMAttrModified", "DOMCharacterDataModified", "DOMNodeInserted", "DOMNodeInsertedIntoDocument", "DOMNodeRemoved", "DOMNodeRemovedFromDocument", "DOMSubtreeModified", "DOMContentLoaded"]);
    this._createCategory(WebInspector.UIString("Device"), ["deviceorientation", "devicemotion"]);
    this._createCategory(WebInspector.UIString("Drag / drop"), ["dragenter", "dragover", "dragleave", "drop"]);
    this._createCategory(WebInspector.UIString("Keyboard"), ["keydown", "keyup", "keypress", "input"]);
    this._createCategory(WebInspector.UIString("Load"), ["load", "beforeunload", "unload", "abort", "error", "hashchange", "popstate"]);
    this._createCategory(WebInspector.UIString("Mouse"), ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout", "mousewheel", "wheel"]);
    this._createCategory(WebInspector.UIString("Timer"), ["setTimer", "clearTimer", "timerFired"], true);
    this._createCategory(WebInspector.UIString("Touch"), ["touchstart", "touchmove", "touchend", "touchcancel"]);
    this._createCategory(WebInspector.UIString("XHR"), ["readystatechange", "load", "loadstart", "loadend", "abort", "error", "progress", "timeout"], false, ["XMLHttpRequest", "XMLHttpRequestUpload"]);
    this._createCategory(WebInspector.UIString("WebGL"), ["webglErrorFired", "webglWarningFired"], true);

    this._restoreBreakpoints();
}

WebInspector.EventListenerBreakpointsSidebarPane.categoryListener = "listener:";
WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation = "instrumentation:";
WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny = "*";

/**
 * @param {string} eventName
 * @param {!Object=} auxData
 * @return {string}
 */
WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI = function(eventName, auxData)
{
    if (!WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI) {
        WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI = {
            "instrumentation:setTimer": WebInspector.UIString("Set Timer"),
            "instrumentation:clearTimer": WebInspector.UIString("Clear Timer"),
            "instrumentation:timerFired": WebInspector.UIString("Timer Fired"),
            "instrumentation:requestAnimationFrame": WebInspector.UIString("Request Animation Frame"),
            "instrumentation:cancelAnimationFrame": WebInspector.UIString("Cancel Animation Frame"),
            "instrumentation:animationFrameFired": WebInspector.UIString("Animation Frame Fired"),
            "instrumentation:webglErrorFired": WebInspector.UIString("WebGL Error Fired"),
            "instrumentation:webglWarningFired": WebInspector.UIString("WebGL Warning Fired")
        };
    }
    if (auxData) {
        if (eventName === "instrumentation:webglErrorFired" && auxData["webglErrorName"]) {
            var errorName = auxData["webglErrorName"];
            // If there is a hex code of the error, display only this.
            errorName = errorName.replace(/^.*(0x[0-9a-f]+).*$/i, "$1");
            return WebInspector.UIString("WebGL Error Fired (%s)", errorName);
        }
    }
    return WebInspector.EventListenerBreakpointsSidebarPane._eventNamesForUI[eventName] || eventName.substring(eventName.indexOf(":") + 1);
}

WebInspector.EventListenerBreakpointsSidebarPane.prototype = {
    /**
     * @param {string} name
     * @param {!Array.<string>} eventNames
     * @param {boolean=} isInstrumentationEvent
     * @param {!Array.<string>=} targetNames
     */
    _createCategory: function(name, eventNames, isInstrumentationEvent, targetNames)
    {
        var labelNode = document.createElement("label");
        labelNode.textContent = name;

        var categoryItem = {};
        categoryItem.element = new TreeElement(labelNode);
        this.categoriesTreeOutline.appendChild(categoryItem.element);
        categoryItem.element.listItemElement.classList.add("event-category");
        categoryItem.element.selectable = true;

        categoryItem.checkbox = this._createCheckbox(labelNode);
        categoryItem.checkbox.addEventListener("click", this._categoryCheckboxClicked.bind(this, categoryItem), true);

        categoryItem.targetNames = this._stringArrayToLowerCase(targetNames || [WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny]);
        categoryItem.children = {};
        var category = (isInstrumentationEvent ? WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation :  WebInspector.EventListenerBreakpointsSidebarPane.categoryListener);
        for (var i = 0; i < eventNames.length; ++i) {
            var eventName = category + eventNames[i];

            var breakpointItem = {};
            var title = WebInspector.EventListenerBreakpointsSidebarPane.eventNameForUI(eventName);

            labelNode = document.createElement("label");
            labelNode.textContent = title;

            breakpointItem.element = new TreeElement(labelNode);
            categoryItem.element.appendChild(breakpointItem.element);

            breakpointItem.element.listItemElement.createChild("div", "breakpoint-hit-marker");
            breakpointItem.element.listItemElement.classList.add("source-code");
            breakpointItem.element.selectable = false;

            breakpointItem.checkbox = this._createCheckbox(labelNode);
            breakpointItem.checkbox.addEventListener("click", this._breakpointCheckboxClicked.bind(this, eventName, categoryItem.targetNames), true);
            breakpointItem.parent = categoryItem;

            categoryItem.children[eventName] = breakpointItem;
        }
        this._categoryItems.push(categoryItem);
    },

    /**
     * @param {!Array.<string>} array
     * @return {!Array.<string>}
     */
    _stringArrayToLowerCase: function(array)
    {
        return array.map(function(value) {
            return value.toLowerCase();
        });
    },

    /**
     * @param {!Element} labelNode
     * @return {!Element}
     */
    _createCheckbox: function(labelNode)
    {
        var checkbox = document.createElement("input");
        checkbox.className = "checkbox-elem";
        checkbox.type = "checkbox";

        labelNode.insertBefore(checkbox, labelNode.firstChild);
        return checkbox;
    },

    _categoryCheckboxClicked: function(categoryItem)
    {
        var checked = categoryItem.checkbox.checked;
        for (var eventName in categoryItem.children) {
            var breakpointItem = categoryItem.children[eventName];
            if (breakpointItem.checkbox.checked === checked)
                continue;
            if (checked)
                this._setBreakpoint(eventName, categoryItem.targetNames);
            else
                this._removeBreakpoint(eventName, categoryItem.targetNames);
        }
        this._saveBreakpoints();
    },

    /**
     * @param {string} eventName
     * @param {!Array.<string>} targetNames
     * @param {?Event} event
     */
    _breakpointCheckboxClicked: function(eventName, targetNames, event)
    {
        if (event.target.checked)
            this._setBreakpoint(eventName, targetNames);
        else
            this._removeBreakpoint(eventName, targetNames);
        this._saveBreakpoints();
    },

    /**
     * @param {string} eventName
     * @param {?Array.<string>=} targetNames
     */
    _setBreakpoint: function(eventName, targetNames)
    {
        targetNames = targetNames || [WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny];
        for (var i = 0; i < targetNames.length; ++i) {
            var targetName = targetNames[i];
            var breakpointItem = this._findBreakpointItem(eventName, targetName);
            if (!breakpointItem)
                continue;
            breakpointItem.checkbox.checked = true;
            breakpointItem.parent.dirtyCheckbox = true;
            if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categoryListener))
                DOMDebuggerAgent.setEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categoryListener.length), targetName);
            else if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation))
                DOMDebuggerAgent.setInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation.length));
        }
        this._updateCategoryCheckboxes();
    },

    /**
     * @param {string} eventName
     * @param {?Array.<string>=} targetNames
     */
    _removeBreakpoint: function(eventName, targetNames)
    {
        targetNames = targetNames || [WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny];
        for (var i = 0; i < targetNames.length; ++i) {
            var targetName = targetNames[i];
            var breakpointItem = this._findBreakpointItem(eventName, targetName);
            if (!breakpointItem)
                continue;
            breakpointItem.checkbox.checked = false;
            breakpointItem.parent.dirtyCheckbox = true;
            if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categoryListener))
                DOMDebuggerAgent.removeEventListenerBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categoryListener.length), targetName);
            else if (eventName.startsWith(WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation))
                DOMDebuggerAgent.removeInstrumentationBreakpoint(eventName.substring(WebInspector.EventListenerBreakpointsSidebarPane.categoryInstrumentation.length));
        }
        this._updateCategoryCheckboxes();
    },

    _updateCategoryCheckboxes: function()
    {
        for (var i = 0; i < this._categoryItems.length; ++i) {
            var categoryItem = this._categoryItems[i];
            if (!categoryItem.dirtyCheckbox)
                continue;
            categoryItem.dirtyCheckbox = false;
            var hasEnabled = false;
            var hasDisabled = false;
            for (var eventName in categoryItem.children) {
                var breakpointItem = categoryItem.children[eventName];
                if (breakpointItem.checkbox.checked)
                    hasEnabled = true;
                else
                    hasDisabled = true;
            }
            categoryItem.checkbox.checked = hasEnabled;
            categoryItem.checkbox.indeterminate = hasEnabled && hasDisabled;
        }
    },

    /**
     * @param {string} eventName
     * @param {string=} targetName
     * @return {?Object}
     */
    _findBreakpointItem: function(eventName, targetName)
    {
        targetName = (targetName || WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny).toLowerCase();
        for (var i = 0; i < this._categoryItems.length; ++i) {
            var categoryItem = this._categoryItems[i];
            if (categoryItem.targetNames.indexOf(targetName) === -1)
                continue;
            var breakpointItem = categoryItem.children[eventName];
            if (breakpointItem)
                return breakpointItem;
        }
        return null;
    },

    /**
     * @param {string} eventName
     * @param {string=} targetName
     */
    highlightBreakpoint: function(eventName, targetName)
    {
        var breakpointItem = this._findBreakpointItem(eventName, targetName);
        if (!breakpointItem || !breakpointItem.checkbox.checked)
            breakpointItem = this._findBreakpointItem(eventName, WebInspector.EventListenerBreakpointsSidebarPane.eventTargetAny);
        if (!breakpointItem)
            return;
        this.expand();
        breakpointItem.parent.element.expand();
        breakpointItem.element.listItemElement.classList.add("breakpoint-hit");
        this._highlightedElement = breakpointItem.element.listItemElement;
    },

    clearBreakpointHighlight: function()
    {
        if (this._highlightedElement) {
            this._highlightedElement.classList.remove("breakpoint-hit");
            delete this._highlightedElement;
        }
    },

    _saveBreakpoints: function()
    {
        var breakpoints = [];
        for (var i = 0; i < this._categoryItems.length; ++i) {
            var categoryItem = this._categoryItems[i];
            for (var eventName in categoryItem.children) {
                var breakpointItem = categoryItem.children[eventName];
                if (breakpointItem.checkbox.checked)
                    breakpoints.push({ eventName: eventName, targetNames: categoryItem.targetNames });
            }
        }
        WebInspector.settings.eventListenerBreakpoints.set(breakpoints);
    },

    _restoreBreakpoints: function()
    {
        var breakpoints = WebInspector.settings.eventListenerBreakpoints.get();
        for (var i = 0; i < breakpoints.length; ++i) {
            var breakpoint = breakpoints[i];
            if (breakpoint && typeof breakpoint.eventName === "string")
                this._setBreakpoint(breakpoint.eventName, breakpoint.targetNames);
        }
    },

    __proto__: WebInspector.SidebarPane.prototype
}
