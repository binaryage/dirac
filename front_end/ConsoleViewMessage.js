/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
 *
 * @param {!WebInspector.ConsoleMessage} consoleMessage
 * @param {?WebInspector.Linkifier} linkifier
 */
WebInspector.ConsoleViewMessage = function(target, consoleMessage, linkifier)
{
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._target = target;
    this._repeatCount = 1;

    /** @type {!Array.<!WebInspector.DataGrid>} */
    this._dataGrids = [];
    /** @type {!Map.<!WebInspector.DataGrid, ?Element>} */
    this._dataGridParents = new Map();

    this._customFormatters = {
        "object": this._formatParameterAsObject,
        "array":  this._formatParameterAsArray,
        "node":   this._formatParameterAsNode,
        "string": this._formatParameterAsString
    };

    WebInspector.settings.consoleTimestampsEnabled.addChangeListener(this._consoleTimestampsSettingChanged, this);
}

WebInspector.ConsoleViewMessage.prototype = {
    wasShown: function()
    {
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i) {
            var dataGrid = this._dataGrids[i];
            var parentElement = this._dataGridParents.get(dataGrid) || null;
            dataGrid.show(parentElement);
            dataGrid.updateWidths();
        }
    },

    willHide: function()
    {
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i) {
            var dataGrid = this._dataGrids[i];
            this._dataGridParents.put(dataGrid, dataGrid.element.parentElement);
            dataGrid.detach();
        }
    },

    /**
     * @return {!WebInspector.ConsoleMessage}
     */
    consoleMessage: function()
    {
        return this._message;
    },

    _formatMessage: function()
    {
        this._formattedMessage = document.createElement("span");
        this._formattedMessage.className = "console-message-text source-code";

        /**
         * @param {string} title
         * @return {!Element}
         * @this {WebInspector.ConsoleMessage}
         */
        function linkifyRequest(title)
        {
            return WebInspector.Linkifier.linkifyUsingRevealer(/** @type {!WebInspector.NetworkRequest} */ (this.request), title, this.url);
        }

        var consoleMessage = this._message;
        if (!this._messageElement) {
            if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.ConsoleAPI) {
                switch (consoleMessage.type) {
                    case WebInspector.ConsoleMessage.MessageType.Trace:
                        this._messageElement = this._format(consoleMessage.parameters || ["console.trace()"]);
                        break;
                    case WebInspector.ConsoleMessage.MessageType.Clear:
                        this._messageElement = document.createTextNode(WebInspector.UIString("Console was cleared"));
                        this._formattedMessage.classList.add("console-info");
                        break;
                    case WebInspector.ConsoleMessage.MessageType.Assert:
                        var args = [WebInspector.UIString("Assertion failed:")];
                        if (consoleMessage.parameters)
                            args = args.concat(consoleMessage.parameters);
                        this._messageElement = this._format(args);
                        break;
                    case WebInspector.ConsoleMessage.MessageType.Dir:
                        var obj = consoleMessage.parameters ? consoleMessage.parameters[0] : undefined;
                        var args = ["%O", obj];
                        this._messageElement = this._format(args);
                        break;
                    case WebInspector.ConsoleMessage.MessageType.Profile:
                    case WebInspector.ConsoleMessage.MessageType.ProfileEnd:
                        this._messageElement = this._format([consoleMessage.messageText]);
                        break;
                    default:
                        var args = consoleMessage.parameters || [consoleMessage.messageText];
                        this._messageElement = this._format(args);
                }
            } else if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network) {
                if (consoleMessage.request) {
                    consoleMessage.stackTrace = consoleMessage.request.initiator.stackTrace;
                    if (consoleMessage.request.initiator && consoleMessage.request.initiator.url) {
                        consoleMessage.url = consoleMessage.request.initiator.url;
                        consoleMessage.line = consoleMessage.request.initiator.lineNumber;
                    }
                    this._messageElement = document.createElement("span");
                    if (consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error) {
                        this._messageElement.appendChild(document.createTextNode(consoleMessage.request.requestMethod + " "));
                        this._messageElement.appendChild(WebInspector.Linkifier.linkifyUsingRevealer(consoleMessage.request, consoleMessage.request.url, consoleMessage.request.url));
                        if (consoleMessage.request.failed)
                            this._messageElement.appendChild(document.createTextNode(" " + consoleMessage.request.localizedFailDescription));
                        else
                            this._messageElement.appendChild(document.createTextNode(" " + consoleMessage.request.statusCode + " (" + consoleMessage.request.statusText + ")"));
                    } else {
                        var fragment = WebInspector.linkifyStringAsFragmentWithCustomLinkifier(consoleMessage.messageText, linkifyRequest.bind(consoleMessage));
                        this._messageElement.appendChild(fragment);
                    }
                } else {
                    var url = consoleMessage.url;
                    if (url) {
                        var isExternal = !WebInspector.resourceForURL(url) && !WebInspector.workspace.uiSourceCodeForURL(url);
                        this._anchorElement = WebInspector.linkifyURLAsNode(url, url, "console-message-url", isExternal);
                    }
                    this._messageElement = this._format([consoleMessage.messageText]);
                }
            } else {
                var args = consoleMessage.parameters || [consoleMessage.messageText];
                this._messageElement = this._format(args);
            }
        }

        if (consoleMessage.source !== WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.request) {
            if (consoleMessage.stackTrace && consoleMessage.stackTrace.length && consoleMessage.stackTrace[0].scriptId) {
                this._anchorElement = this._linkifyCallFrame(consoleMessage.stackTrace[0]);
            } else if (consoleMessage.url && consoleMessage.url !== "undefined") {
                this._anchorElement = this._linkifyLocation(consoleMessage.url, consoleMessage.line, consoleMessage.column);
            }
        }

        this._formattedMessage.appendChild(this._messageElement);
        if (this._anchorElement) {
            this._formattedMessage.appendChild(document.createTextNode(" "));
            this._formattedMessage.appendChild(this._anchorElement);
        }

        var dumpStackTrace = !!consoleMessage.stackTrace && consoleMessage.stackTrace.length && (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error || consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace);
        if (dumpStackTrace) {
            var ol = document.createElement("ol");
            ol.className = "outline-disclosure";
            var treeOutline = new TreeOutline(ol);

            var content = this._formattedMessage;
            var root = new TreeElement(content, null, true);
            content.treeElementForTest = root;
            treeOutline.appendChild(root);
            if (consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace)
                root.expand();

            this._populateStackTraceTreeElement(root);
            this._formattedMessage = ol;
        }
    },

    _formattedMessageText: function()
    {
        this.formattedMessage();
        return this._messageElement.textContent;
    },

    /**
     * @return {!Element}
     */
    formattedMessage: function()
    {
        if (!this._formattedMessage)
            this._formatMessage();
        return this._formattedMessage;
    },

    /**
     * @param {string} url
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?Element}
     */
    _linkifyLocation: function(url, lineNumber, columnNumber)
    {
        console.assert(this._linkifier);
        if (!this._linkifier)
            return null;
        // FIXME(62725): stack trace line/column numbers are one-based.
        lineNumber = lineNumber ? lineNumber - 1 : 0;
        columnNumber = columnNumber ? columnNumber - 1 : 0;
        if (this._message.source === WebInspector.ConsoleMessage.MessageSource.CSS) {
            var headerIds = WebInspector.cssModel.styleSheetIdsForURL(url);
            var cssLocation = new WebInspector.CSSLocation(url, lineNumber, columnNumber);
            return this._linkifier.linkifyCSSLocation(headerIds[0] || null, cssLocation, "console-message-url");
        }

        return this._linkifier.linkifyLocation(url, lineNumber, columnNumber, "console-message-url");
    },

    /**
     * @param {!ConsoleAgent.CallFrame} callFrame
     * @return {?Element}
     */
    _linkifyCallFrame: function(callFrame)
    {
        console.assert(this._linkifier);
        if (!this._linkifier)
            return null;
        // FIXME(62725): stack trace line/column numbers are one-based.
        var lineNumber = callFrame.lineNumber ? callFrame.lineNumber - 1 : 0;
        var columnNumber = callFrame.columnNumber ? callFrame.columnNumber - 1 : 0;
        var rawLocation = new WebInspector.DebuggerModel.Location(callFrame.scriptId, lineNumber, columnNumber);
        return this._linkifier.linkifyRawLocation(rawLocation, "console-message-url");
    },

    /**
     * @return {boolean}
     */
    isErrorOrWarning: function()
    {
        return (this._message.level === WebInspector.ConsoleMessage.MessageLevel.Warning || this._message.level === WebInspector.ConsoleMessage.MessageLevel.Error);
    },

    _format: function(parameters)
    {
        // This node is used like a Builder. Values are continually appended onto it.
        var formattedResult = document.createElement("span");
        if (!parameters.length)
            return formattedResult;

        // Formatting code below assumes that parameters are all wrappers whereas frontend console
        // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
        for (var i = 0; i < parameters.length; ++i) {
            // FIXME: Only pass runtime wrappers here.
            if (parameters[i] instanceof WebInspector.RemoteObject)
                continue;

            if (typeof parameters[i] === "object")
                parameters[i] = WebInspector.RemoteObject.fromPayload(parameters[i], this._target);
            else
                parameters[i] = WebInspector.RemoteObject.fromPrimitiveValue(parameters[i], this._target);
        }

        // There can be string log and string eval result. We distinguish between them based on message type.
        var shouldFormatMessage = WebInspector.RemoteObject.type(parameters[0]) === "string" && this._message.type !== WebInspector.ConsoleMessage.MessageType.Result;

        // Multiple parameters with the first being a format string. Save unused substitutions.
        if (shouldFormatMessage) {
            // Multiple parameters with the first being a format string. Save unused substitutions.
            var result = this._formatWithSubstitutionString(parameters[0].description, parameters.slice(1), formattedResult);
            parameters = result.unusedSubstitutions;
            if (parameters.length)
                formattedResult.appendChild(document.createTextNode(" "));
        }

        if (this._message.type === WebInspector.ConsoleMessage.MessageType.Table) {
            formattedResult.appendChild(this._formatParameterAsTable(parameters));
            return formattedResult;
        }

        // Single parameter, or unused substitutions from above.
        for (var i = 0; i < parameters.length; ++i) {
            // Inline strings when formatting.
            if (shouldFormatMessage && parameters[i].type === "string")
                formattedResult.appendChild(WebInspector.linkifyStringAsFragment(parameters[i].description));
            else
                formattedResult.appendChild(this._formatParameter(parameters[i], false, true));
            if (i < parameters.length - 1)
                formattedResult.appendChild(document.createTextNode(" "));
        }
        return formattedResult;
    },

    /**
     * @param {?Object} output
     * @param {boolean=} forceObjectFormat
     * @param {boolean=} includePreview
     * @return {!Element}
     */
    _formatParameter: function(output, forceObjectFormat, includePreview)
    {
        var type;
        if (forceObjectFormat)
            type = "object";
        else if (output instanceof WebInspector.RemoteObject)
            type = output.subtype || output.type;
        else
            type = typeof output;

        var formatter = this._customFormatters[type];
        if (!formatter) {
            formatter = this._formatParameterAsValue;
            output = output.description;
        }

        var span = document.createElement("span");
        span.className = "console-formatted-" + type + " source-code";
        formatter.call(this, output, span, includePreview);
        return span;
    },

    _formatParameterAsValue: function(val, elem)
    {
        elem.appendChild(document.createTextNode(val));
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {!Element} elem
     * @param {boolean} includePreview
     */
    _formatParameterAsObject: function(obj, elem, includePreview)
    {
        this._formatParameterAsArrayOrObject(obj, obj.description || "", elem, includePreview);
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {string} description
     * @param {!Element} elem
     * @param {boolean} includePreview
     */
    _formatParameterAsArrayOrObject: function(obj, description, elem, includePreview)
    {
        var titleElement = document.createElement("span");
        if (description)
            titleElement.createTextChild(description);
        if (includePreview && obj.preview) {
            titleElement.classList.add("console-object-preview");
            var lossless = this._appendObjectPreview(obj, description, titleElement);
            if (lossless) {
                elem.appendChild(titleElement);
                return;
            }
        }
        var section = new WebInspector.ObjectPropertiesSection(obj, titleElement);
        section.enableContextMenu();
        elem.appendChild(section.element);

        var note = section.titleElement.createChild("span", "object-info-state-note");
        note.title = WebInspector.UIString("Object state below is captured upon first expansion");
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {string} description
     * @param {!Element} titleElement
     * @return {boolean} true iff preview captured all information.
     */
    _appendObjectPreview: function(obj, description, titleElement)
    {
        var preview = obj.preview;
        var isArray = obj.subtype === "array";

        if (description)
            titleElement.createTextChild(" ");
        titleElement.createTextChild(isArray ? "[" : "{");
        for (var i = 0; i < preview.properties.length; ++i) {
            if (i > 0)
                titleElement.createTextChild(", ");

            var property = preview.properties[i];
            var name = property.name;
            if (!isArray || name != i) {
                if (/^\s|\s$|^$|\n/.test(name))
                    name = "\"" + name.replace(/\n/g, "\u21B5") + "\"";
                titleElement.createChild("span", "name").textContent = name;
                titleElement.createTextChild(": ");
            }

            titleElement.appendChild(this._renderPropertyPreviewOrAccessor(obj, [property]));
        }
        if (preview.overflow)
            titleElement.createChild("span").textContent = "\u2026";
        titleElement.createTextChild(isArray ? "]" : "}");
        return preview.lossless;
    },

    /**
     * @param {!WebInspector.RemoteObject} object
     * @param {!Array.<!RuntimeAgent.PropertyPreview>} propertyPath
     * @return {!Element}
     */
    _renderPropertyPreviewOrAccessor: function(object, propertyPath)
    {
        var property = propertyPath.peekLast();
        if (property.type === "accessor")
            return this._formatAsAccessorProperty(object, propertyPath.select("name"), false);
        return this._renderPropertyPreview(property.type, /** @type {string} */ (property.subtype), property.value);
    },

    /**
     * @param {string} type
     * @param {string=} subtype
     * @param {string=} description
     * @return {!Element}
     */
    _renderPropertyPreview: function(type, subtype, description)
    {
        var span = document.createElement("span");
        span.className = "console-formatted-" + type;

        if (type === "function") {
            span.textContent = "function";
            return span;
        }

        if (type === "object" && subtype === "regexp") {
            span.classList.add("console-formatted-string");
            span.textContent = description;
            return span;
        }

        if (type === "object" && subtype === "node" && description) {
            span.classList.add("console-formatted-preview-node");
            WebInspector.DOMPresentationUtils.createSpansForNodeTitle(span, description);
            return span;
        }

        if (type === "string") {
            span.textContent = "\"" + description.replace(/\n/g, "\u21B5") + "\"";
            return span;
        }

        span.textContent = description;
        return span;
    },

    _formatParameterAsNode: function(object, elem)
    {
        /**
         * @param {!DOMAgent.NodeId} nodeId
         * @this {WebInspector.ConsoleViewMessage}
         */
        function printNode(nodeId)
        {
            if (!nodeId) {
                // Sometimes DOM is loaded after the sync message is being formatted, so we get no
                // nodeId here. So we fall back to object formatting here.
                this._formatParameterAsObject(object, elem, false);
                return;
            }
            var node = WebInspector.domModel.nodeForId(nodeId);
            var renderer = WebInspector.moduleManager.instance(WebInspector.Renderer, node);
            if (renderer)
                elem.appendChild(renderer.render(node));
            else
                console.error("No renderer for node found");
        }
        object.pushNodeToFrontend(printNode.bind(this));
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @return {boolean}
     */
    useArrayPreviewInFormatter: function(array)
    {
        return this._message.type !== WebInspector.ConsoleMessage.MessageType.DirXML && !!array.preview;
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @param {!Element} elem
     */
    _formatParameterAsArray: function(array, elem)
    {
        if (this.useArrayPreviewInFormatter(array)) {
            this._formatParameterAsArrayOrObject(array, "", elem, true);
            return;
        }

        const maxFlatArrayLength = 100;
        if (this._message.isOutdated || array.arrayLength() > maxFlatArrayLength)
            this._formatParameterAsObject(array, elem, false);
        else
            array.getOwnProperties(this._printArray.bind(this, array, elem));
    },

    /**
     * @param {!Array.<!WebInspector.RemoteObject>} parameters
     * @return {!Element}
     */
    _formatParameterAsTable: function(parameters)
    {
        var element = document.createElement("span");
        var table = parameters[0];
        if (!table || !table.preview)
            return element;

        var columnNames = [];
        var preview = table.preview;
        var rows = [];
        for (var i = 0; i < preview.properties.length; ++i) {
            var rowProperty = preview.properties[i];
            var rowPreview = rowProperty.valuePreview;
            if (!rowPreview)
                continue;

            var rowValue = {};
            const maxColumnsToRender = 20;
            for (var j = 0; j < rowPreview.properties.length; ++j) {
                var cellProperty = rowPreview.properties[j];
                var columnRendered = columnNames.indexOf(cellProperty.name) != -1;
                if (!columnRendered) {
                    if (columnNames.length === maxColumnsToRender)
                        continue;
                    columnRendered = true;
                    columnNames.push(cellProperty.name);
                }

                if (columnRendered) {
                    var cellElement = this._renderPropertyPreviewOrAccessor(table, [rowProperty, cellProperty]);
                    cellElement.classList.add("nowrap-below");
                    rowValue[cellProperty.name] = cellElement;
                }
            }
            rows.push([rowProperty.name, rowValue]);
        }

        var flatValues = [];
        for (var i = 0; i < rows.length; ++i) {
            var rowName = rows[i][0];
            var rowValue = rows[i][1];
            flatValues.push(rowName);
            for (var j = 0; j < columnNames.length; ++j)
                flatValues.push(rowValue[columnNames[j]]);
        }

        if (!flatValues.length)
            return element;
        columnNames.unshift(WebInspector.UIString("(index)"));
        var dataGrid = WebInspector.DataGrid.createSortableDataGrid(columnNames, flatValues);
        dataGrid.renderInline();
        this._dataGrids.push(dataGrid);
        this._dataGridParents.put(dataGrid, element);
        return element;
    },

    _formatParameterAsString: function(output, elem)
    {
        var span = document.createElement("span");
        span.className = "console-formatted-string source-code";
        span.appendChild(WebInspector.linkifyStringAsFragment(output.description));

        // Make black quotes.
        elem.classList.remove("console-formatted-string");
        elem.appendChild(document.createTextNode("\""));
        elem.appendChild(span);
        elem.appendChild(document.createTextNode("\""));
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @param {!Element} elem
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     */
    _printArray: function(array, elem, properties)
    {
        if (!properties)
            return;

        var elements = [];
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            var name = property.name;
            if (isNaN(name))
                continue;
            if (property.getter)
                elements[name] = this._formatAsAccessorProperty(array, [name], true);
            else if (property.value)
                elements[name] = this._formatAsArrayEntry(property.value);
        }

        elem.appendChild(document.createTextNode("["));
        var lastNonEmptyIndex = -1;

        function appendUndefined(elem, index)
        {
            if (index - lastNonEmptyIndex <= 1)
                return;
            var span = elem.createChild("span", "console-formatted-undefined");
            span.textContent = WebInspector.UIString("undefined × %d", index - lastNonEmptyIndex - 1);
        }

        var length = array.arrayLength();
        for (var i = 0; i < length; ++i) {
            var element = elements[i];
            if (!element)
                continue;

            if (i - lastNonEmptyIndex > 1) {
                appendUndefined(elem, i);
                elem.appendChild(document.createTextNode(", "));
            }

            elem.appendChild(element);
            lastNonEmptyIndex = i;
            if (i < length - 1)
                elem.appendChild(document.createTextNode(", "));
        }
        appendUndefined(elem, length);

        elem.appendChild(document.createTextNode("]"));
    },

    /**
     * @param {!WebInspector.RemoteObject} output
     * @return {!Element}
     */
    _formatAsArrayEntry: function(output)
    {
        // Prevent infinite expansion of cross-referencing arrays.
        return this._formatParameter(output, output.subtype === "array", false);
    },

    /**
     * @param {!WebInspector.RemoteObject} object
     * @param {!Array.<string>} propertyPath
     * @param {boolean} isArrayEntry
     * @return {!Element}
     */
    _formatAsAccessorProperty: function(object, propertyPath, isArrayEntry)
    {
        var rootElement = WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object, propertyPath, onInvokeGetterClick.bind(this));

        /**
         * @param {?WebInspector.RemoteObject} result
         * @param {boolean=} wasThrown
         * @this {WebInspector.ConsoleViewMessage}
         */
        function onInvokeGetterClick(result, wasThrown)
        {
            if (!result)
                return;
            rootElement.removeChildren();
            if (wasThrown) {
                var element = rootElement.createChild("span", "error-message");
                element.textContent = WebInspector.UIString("<exception>");
                element.title = result.description;
            } else if (isArrayEntry) {
                rootElement.appendChild(this._formatAsArrayEntry(result));
            } else {
                // Make a PropertyPreview from the RemoteObject similar to the backend logic.
                const maxLength = 100;
                var type = result.type;
                var subtype = result.subtype;
                var description = "";
                if (type !== "function" && result.description) {
                    if (type === "string" || subtype === "regexp")
                        description = result.description.trimMiddle(maxLength);
                    else
                        description = result.description.trimEnd(maxLength);
                }
                rootElement.appendChild(this._renderPropertyPreview(type, subtype, description));
            }
        }

        return rootElement;
    },

    /**
     * @param {string} format
     * @param {!Array.<string>} parameters
     * @param {!Element} formattedResult
     */
    _formatWithSubstitutionString: function(format, parameters, formattedResult)
    {
        var formatters = {};

        /**
         * @param {boolean} force
         * @param {!Object} obj
         * @return {!Element}
         * @this {WebInspector.ConsoleViewMessage}
         */
        function parameterFormatter(force, obj)
        {
            return this._formatParameter(obj, force, false);
        }

        function stringFormatter(obj)
        {
            return obj.description;
        }

        function floatFormatter(obj)
        {
            if (typeof obj.value !== "number")
                return "NaN";
            return obj.value;
        }

        function integerFormatter(obj)
        {
            if (typeof obj.value !== "number")
                return "NaN";
            return Math.floor(obj.value);
        }

        function bypassFormatter(obj)
        {
            return (obj instanceof Node) ? obj : "";
        }

        var currentStyle = null;
        function styleFormatter(obj)
        {
            currentStyle = {};
            var buffer = document.createElement("span");
            buffer.setAttribute("style", obj.description);
            for (var i = 0; i < buffer.style.length; i++) {
                var property = buffer.style[i];
                if (isWhitelistedProperty(property))
                    currentStyle[property] = buffer.style[property];
            }
        }

        function isWhitelistedProperty(property)
        {
            var prefixes = ["background", "border", "color", "font", "line", "margin", "padding", "text", "-webkit-background", "-webkit-border", "-webkit-font", "-webkit-margin", "-webkit-padding", "-webkit-text"];
            for (var i = 0; i < prefixes.length; i++) {
                if (property.startsWith(prefixes[i]))
                    return true;
            }
            return false;
        }

        // Firebug uses %o for formatting objects.
        formatters.o = parameterFormatter.bind(this, false);
        formatters.s = stringFormatter;
        formatters.f = floatFormatter;
        // Firebug allows both %i and %d for formatting integers.
        formatters.i = integerFormatter;
        formatters.d = integerFormatter;

        // Firebug uses %c for styling the message.
        formatters.c = styleFormatter;

        // Support %O to force object formatting, instead of the type-based %o formatting.
        formatters.O = parameterFormatter.bind(this, true);

        formatters._ = bypassFormatter;

        function append(a, b)
        {
            if (b instanceof Node)
                a.appendChild(b);
            else if (typeof b !== "undefined") {
                var toAppend = WebInspector.linkifyStringAsFragment(String(b));
                if (currentStyle) {
                    var wrapper = document.createElement('span');
                    for (var key in currentStyle)
                        wrapper.style[key] = currentStyle[key];
                    wrapper.appendChild(toAppend);
                    toAppend = wrapper;
                }
                a.appendChild(toAppend);
            }
            return a;
        }

        // String.format does treat formattedResult like a Builder, result is an object.
        return String.format(format, parameters, formatters, formattedResult, append);
    },

    clearHighlight: function()
    {
        if (!this._formattedMessage)
            return;

        var highlightedMessage = this._formattedMessage;
        delete this._formattedMessage;
        delete this._anchorElement;
        delete this._messageElement;
        this._formatMessage();
        this._element.replaceChild(this._formattedMessage, highlightedMessage);
    },

    highlightSearchResults: function(regexObject)
    {
        if (!this._formattedMessage)
            return;

        this._highlightSearchResultsInElement(regexObject, this._messageElement);
        if (this._anchorElement)
            this._highlightSearchResultsInElement(regexObject, this._anchorElement);

        this._element.scrollIntoViewIfNeeded();
    },

    _highlightSearchResultsInElement: function(regexObject, element)
    {
        regexObject.lastIndex = 0;
        var text = element.textContent;
        var match = regexObject.exec(text);
        var matchRanges = [];
        while (match) {
            matchRanges.push(new WebInspector.SourceRange(match.index, match[0].length));
            match = regexObject.exec(text);
        }
        WebInspector.highlightSearchResults(element, matchRanges);
    },

    /**
     * @return {boolean}
     */
    matchesRegex: function(regexObject)
    {
        regexObject.lastIndex = 0;
        return regexObject.test(this._formattedMessageText()) || (!!this._anchorElement && regexObject.test(this._anchorElement.textContent));
    },

    _updateTimestamp: function(show)
    {
        if (!this._element)
            return;

        if (show && !this.timestampElement) {
            this.timestampElement = this._element.createChild("span", "console-timestamp");
            this.timestampElement.textContent = (new Date(this._message.timestamp)).toConsoleTime();
            var afterRepeatCountChild = this.repeatCountElement && this.repeatCountElement.nextSibling;
            this._element.insertBefore(this.timestampElement, afterRepeatCountChild || this._element.firstChild);
            return;
        }

        if (!show && this.timestampElement)
            this.timestampElement.remove();
    },

    _consoleTimestampsSettingChanged: function(event)
    {
        var enabled = /** @type {boolean} */ (event.data);
        this._updateTimestamp(enabled);
    },

    /**
     * @return {!Element}
     */
    toMessageElement: function()
    {
        if (this._element)
            return this._element;

        var element = document.createElement("div");
        element.message = this;
        element.className = "console-message";

        this._element = element;

        switch (this._message.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Log:
            element.classList.add("console-log-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Debug:
            element.classList.add("console-debug-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            element.classList.add("console-warning-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            element.classList.add("console-error-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Info:
            element.classList.add("console-info-level");
            break;
        }

        if (this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
            element.classList.add("console-group-title");

        element.appendChild(this.formattedMessage());

        if (this._repeatCount > 1)
            this._showRepeatCountElement();

        this._updateTimestamp(WebInspector.settings.consoleTimestampsEnabled.get());

        return element;
    },

    _populateStackTraceTreeElement: function(parentTreeElement)
    {
        for (var i = 0; i < this._message.stackTrace.length; i++) {
            var frame = this._message.stackTrace[i];

            var content = document.createElementWithClass("div", "stacktrace-entry");
            var messageTextElement = document.createElement("span");
            messageTextElement.className = "console-message-text source-code";
            var functionName = frame.functionName || WebInspector.UIString("(anonymous function)");
            messageTextElement.appendChild(document.createTextNode(functionName));
            content.appendChild(messageTextElement);

            if (frame.scriptId) {
                content.appendChild(document.createTextNode(" "));
                var urlElement = this._linkifyCallFrame(frame);
                if (!urlElement)
                    continue;
                content.appendChild(urlElement);
            }

            var treeElement = new TreeElement(content);
            parentTreeElement.appendChild(treeElement);
        }
    },

    incrementRepeatCount: function()
    {
        this._repeatCount++;
        this._showRepeatCountElement();
    },

    _showRepeatCountElement: function()
    {
        if (!this._element)
            return;

        if (!this.repeatCountElement) {
            this.repeatCountElement = document.createElement("span");
            this.repeatCountElement.className = "bubble";

            this._element.insertBefore(this.repeatCountElement, this._element.firstChild);
            this._element.classList.add("repeated-message");
        }
        this.repeatCountElement.textContent = this._repeatCount;
    },

    /**
     * @return {string}
     */
    toString: function()
    {
        var sourceString;
        switch (this._message.source) {
            case WebInspector.ConsoleMessage.MessageSource.XML:
                sourceString = "XML";
                break;
            case WebInspector.ConsoleMessage.MessageSource.JS:
                sourceString = "JavaScript";
                break;
            case WebInspector.ConsoleMessage.MessageSource.Network:
                sourceString = "Network";
                break;
            case WebInspector.ConsoleMessage.MessageSource.ConsoleAPI:
                sourceString = "ConsoleAPI";
                break;
            case WebInspector.ConsoleMessage.MessageSource.Storage:
                sourceString = "Storage";
                break;
            case WebInspector.ConsoleMessage.MessageSource.AppCache:
                sourceString = "AppCache";
                break;
            case WebInspector.ConsoleMessage.MessageSource.Rendering:
                sourceString = "Rendering";
                break;
            case WebInspector.ConsoleMessage.MessageSource.CSS:
                sourceString = "CSS";
                break;
            case WebInspector.ConsoleMessage.MessageSource.Security:
                sourceString = "Security";
                break;
            case WebInspector.ConsoleMessage.MessageSource.Other:
                sourceString = "Other";
                break;
        }

        var typeString;
        switch (this._message.type) {
            case WebInspector.ConsoleMessage.MessageType.Log:
                typeString = "Log";
                break;
            case WebInspector.ConsoleMessage.MessageType.Dir:
                typeString = "Dir";
                break;
            case WebInspector.ConsoleMessage.MessageType.DirXML:
                typeString = "Dir XML";
                break;
            case WebInspector.ConsoleMessage.MessageType.Trace:
                typeString = "Trace";
                break;
            case WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed:
            case WebInspector.ConsoleMessage.MessageType.StartGroup:
                typeString = "Start Group";
                break;
            case WebInspector.ConsoleMessage.MessageType.EndGroup:
                typeString = "End Group";
                break;
            case WebInspector.ConsoleMessage.MessageType.Assert:
                typeString = "Assert";
                break;
            case WebInspector.ConsoleMessage.MessageType.Result:
                typeString = "Result";
                break;
            case WebInspector.ConsoleMessage.MessageType.Profile:
            case WebInspector.ConsoleMessage.MessageType.ProfileEnd:
                typeString = "Profiling";
                break;
        }

        var levelString;
        switch (this._message.level) {
            case WebInspector.ConsoleMessage.MessageLevel.Log:
                levelString = "Log";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Warning:
                levelString = "Warning";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Debug:
                levelString = "Debug";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Error:
                levelString = "Error";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Info:
                levelString = "Info";
                break;
        }

        return sourceString + " " + typeString + " " + levelString + ": " + this.formattedMessage().textContent + "\n" + this._message.url + " line " + this._message.line;
    },

    get text()
    {
        return this._message.messageText;
    }
}
