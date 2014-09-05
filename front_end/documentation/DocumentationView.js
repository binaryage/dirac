// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.View}
 */
WebInspector.DocumentationView = function()
{
    WebInspector.View.call(this);
    this.element.classList.add("documentation-view");
    this.registerRequiredCSS("documentationView.css");
}

/**
 * @param {string} url
 * @param {string} searchItem
 */
WebInspector.DocumentationView.showDocumentationURL = function(url, searchItem)
{
    if (!WebInspector.DocumentationView._view)
        WebInspector.DocumentationView._view = new WebInspector.DocumentationView();
    var view = WebInspector.DocumentationView._view;
    WebInspector.inspectorView.showCloseableViewInDrawer("documentation", WebInspector.UIString("Documentation"), view);
    view.showDocumentation(url, searchItem);
}

WebInspector.DocumentationView.prototype = {
    /**
     * @param {string} url
     * @param {string} searchItem
     */
    showDocumentation: function(url, searchItem)
    {
        if (!url) {
            this._createEmptyPage();
            return;
        }
        loadXHR(url)
            .then(this._createArticle.bind(this, searchItem), this._createEmptyPage.bind(this))
            .catch(this._createEmptyPage.bind(this));
    },

    /**
     * @param {string} searchItem
     * @param {string} responseText
     */
    _createArticle: function(searchItem, responseText)
    {
        var json = JSON.parse(responseText);
        var pages = json["query"]["pages"];
        var wikiKeys = Object.keys(pages);
        if (wikiKeys.length === 1 && wikiKeys[0] === "-1") {
            this._createEmptyPage();
            return;
        }
        var wikiMarkupText = pages[wikiKeys[0]]["revisions"]["0"]["*"];
        var article = WebInspector.JSArticle.parse(wikiMarkupText);
        if (!article) {
            this._createEmptyPage();
            return;
        }

        var renderer = new WebInspector.DocumentationView.Renderer(article, searchItem);
        this.element.removeChildren();
        this.element.appendChild(renderer.renderJSArticle());
    },

    _createEmptyPage: function()
    {
        this.element.removeChildren();
        var pageTitle = this.element.createChild("div", "documentation-page-title");
        pageTitle.textContent = WebInspector.UIString("Documentation not available");
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @param {!WebInspector.JSArticle} article
 * @param {string} searchItem
 */
WebInspector.DocumentationView.Renderer = function(article, searchItem)
{
    this._searchItem = searchItem;
    this._element = document.createElement("div");
    this._article = article;
}

WebInspector.DocumentationView.Renderer.prototype = {
    /**
     * @return {!Element}
     */
    renderJSArticle: function()
    {
        this._createPageTitle(this._article.pageTitle, this._searchItem);
        this._createStandardizationStatus(this._article.standardizationStatus);
        this._createTextSectionWithTitle("Summary", this._article.summary);
        this._createSignatureSection(this._article.parameters, this._article.methods);
        this._createReturnValueSection(this._article.methods);
        this._createExamplesSection(this._article.examples);
        this._createTextSectionWithTitle("Remarks", this._article.remarks);

        return this._element;
    },

    /**
     * @param {string} titleText
     * @param {string} searchItem
     */
    _createPageTitle: function(titleText, searchItem)
    {
        var pageTitle = this._element.createChild("div", "documentation-page-title");
        if (titleText)
            pageTitle.textContent = titleText;
        else if (searchItem)
            pageTitle.textContent = searchItem;
    },

     /**
     * @param {string} statusText
     */
    _createStandardizationStatus: function(statusText)
    {
        if (!statusText)
            return;
        var status = this._element.createChild("div", "documentation-status");
        status.textContent = statusText;
    },

    /**
     * @param {string} titleText
     * @param {?WebInspector.WikiParser.Block} article
     */
    _createTextSectionWithTitle: function(titleText, article)
    {
        if (!article)
            return;
        var section = this._element.createChild("div", "documentation-section");
        var title = section.createChild("div", "documentation-section-title");
        title.textContent = titleText;
        var text = this._renderBlock(article);
        text.classList.add("documentation-text");
        section.appendChild(text);
    },

    /**
     * @param {!Array.<!WebInspector.JSArticle.Parameter>} parameters
     * @param {?WebInspector.JSArticle.Method} method
     */
    _createSignatureSection: function(parameters, method)
    {
        if (!parameters.length)
            return;
        var section = this._element.createChild("div", "documentation-section");
        var title = section.createChild("div", "documentation-section-title");
        title.textContent = "Parameters";
        for (var i = 0; i < parameters.length; ++i) {
            var parameter = section.createChild("div", "documentation-parameter");
            var header = parameter.createChild("div", "documentation-parameter-header");
            var name = header.createChild("span", "documentation-parameter-name");
            name.textContent = parameters[i].name;
            var dataTypeValue = header.createChild("span", "documentation-parameter-data-type-value");
            dataTypeValue.textContent = parameters[i].dataType;
            if (parameters[i].optional) {
                var optional = header.createChild("span", "documentation-parameter-optional");
                optional.textContent = WebInspector.UIString("Optional");
            }
            parameter.appendChild(this._renderBlock(parameters[i].description));
        }
    },

    /**
     * @param {?WebInspector.JSArticle.Method} method
     */
    _createReturnValueSection: function(method)
    {
        if (!method)
            return;

        var section = this._element.createChild("div", "documentation-section");
        var title = section.createChild("div", "documentation-section-title");
        title.textContent = "Return Value";
        var returnValueName = section.createChild("div", "documentation-return-value");
        returnValueName.textContent = WebInspector.UIString("Returns an object of type " + method.returnValueName + ".");
        var returnValueDescription = section.createChild("div", "documentation-return-value");
        returnValueDescription.textContent = WebInspector.UIString(method.returnValueDescription);
    },

    /**
     * @param {!Array.<!WebInspector.JSArticle.Example>} examples
     */
    _createExamplesSection: function(examples)
    {
        if (!examples.length)
            return;

        var section = this._element.createChild("div", "documentation-section");
        var title = section.createChild("div", "documentation-section-title");
        title.textContent = "Examples";

        for (var i = 0; i < examples.length; ++i) {
            var example = section.createChild("div", "documentation-example");
            var exampleDescription = example.createChild("div", "documentation-example-description-section");
            if (examples[i].liveUrl) {
                var liveUrl = exampleDescription.createChild("a", "documentation-example-link");
                liveUrl.href = examples[i].liveUrl;
                liveUrl.textContent = WebInspector.UIString("Example");
            }
            exampleDescription.appendChild(this._renderBlock(examples[i].description));
            var code = example.createChild("div", "documentation-example-code");
            code.classList.add("source-code");
            code.textContent = examples[i].code;
        }
    },

    /**
     * @param {!WebInspector.WikiParser.ArticleElement} article
     * @return {!Element}
     */
    _renderBlock: function(article)
    {
        var element;
        var elementTypes = WebInspector.WikiParser.ArticleElement.Type;

        switch (article.type()) {
        case elementTypes.Inline:
            element = document.createElement("span");
            break;
        case elementTypes.Link:
            element = document.createElementWithClass("a", "documentation-link");
            element.href = article.url();
            if (!article.children().length)
                element.textContent = article.url();
            break;
        case elementTypes.Code:
            element = document.createElementWithClass("span", "documentation-code-tag");
            break;
        case elementTypes.CodeBlock:
            element = document.createElementWithClass("pre", "documentation-code");
            element.classList.add("source-code");
            element.textContent = article.code();
            break;
        case elementTypes.PlainText:
            element = document.createElement("span");
            element.textContent = article.text();
            if (article.isHighlighted())
                element.classList.add("documentation-highlighted-text");
            break;
        default:
            console.error("Unknown ArticleElement type " + article.type());
        case elementTypes.Block:
            element = document.createElement(article.hasBullet() ? "li" : "p");
            break;
        }

        if (article instanceof WebInspector.WikiParser.Block || article instanceof WebInspector.WikiParser.Inline) {
            for (var i = 0; i < article.children().length; ++i) {
                var child = this._renderBlock(article.children()[i]);
                if (child)
                    element.appendChild(child);
            }
        }

        return element;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.DocumentationView.ContextMenuProvider = function()
{
}

WebInspector.DocumentationView.ContextMenuProvider.prototype = {
    /**
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        if (!(target instanceof WebInspector.CodeMirrorTextEditor))
            return;
        var textEditor = /** @type {!WebInspector.CodeMirrorTextEditor} */ (target);
        var descriptors = this._determineDescriptors(textEditor);
        if (!descriptors.length)
            return;
        if (descriptors.length === 1) {
            var formatString = WebInspector.useLowerCaseMenuTitles() ? "Show documentation for %s.%s" : "Show Documentation for %s.%s";
            contextMenu.appendItem(WebInspector.UIString(formatString, descriptors[0].name(), descriptors[0].searchItem()), WebInspector.DocumentationView.showDocumentationURL.bind(null, descriptors[0].url(), descriptors[0].searchItem()));
            return;
        }
        var subMenuItem = contextMenu.appendSubMenuItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Show documentation for..." : "Show Documentation for..."));
        for (var i = 0; i < descriptors.length; ++i)
            subMenuItem.appendItem(String.sprintf("%s.%s", descriptors[i].name(), descriptors[i].searchItem()), WebInspector.DocumentationView.showDocumentationURL.bind(null, descriptors[i].url(), descriptors[i].searchItem()));
    },

    /**
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     * @return {!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>}
     */
    _determineDescriptors: function(textEditor)
    {
        var urlProvider = WebInspector.DocumentationURLProvider.instance();
        var textSelection = textEditor.selection().normalize();

        if (!textSelection.isEmpty()) {
            if (textSelection.startLine !== textSelection.endLine)
                return [];
            return urlProvider.itemDescriptors(textEditor.copyRange(textSelection));
        }

        var descriptors = computeDescriptors(textSelection.startColumn);
        if (descriptors.length)
            return descriptors;

        return computeDescriptors(textSelection.startColumn - 1);

        /**
         * @param {number} column
         * @return {!Array.<!WebInspector.DocumentationURLProvider.ItemDescriptor>}
         */
        function computeDescriptors(column)
        {
            var token = textEditor.tokenAtTextPosition(textSelection.startLine, column);
            if (!token)
                return [];
            var tokenText = textEditor.line(textSelection.startLine).substring(token.startColumn, token.endColumn);
            return urlProvider.itemDescriptors(tokenText);
        }
    }
}
