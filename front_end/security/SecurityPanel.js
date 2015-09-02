// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.PanelWithSidebar}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.SecurityPanel = function()
{
    WebInspector.PanelWithSidebar.call(this, "security");
    this.registerRequiredCSS("security/mainView.css");
    this.registerRequiredCSS("security/lockIcon.css");

    var sidebarTree = new TreeOutlineInShadow();
    sidebarTree.element.classList.add("sidebar-tree");
    this.panelSidebarElement().appendChild(sidebarTree.element);
    sidebarTree.registerRequiredCSS("security/sidebar.css");
    sidebarTree.registerRequiredCSS("security/lockIcon.css");
    this.setDefaultFocusedElement(sidebarTree.element);

    this._sidebarMainViewElement = new WebInspector.SecurityMainViewSidebarTreeElement(this);
    sidebarTree.appendChild(this._sidebarMainViewElement);

    // TODO(lgarron): Add a section for the main origin. (https://crbug.com/523586)
    this._sidebarOriginSection = new WebInspector.SidebarSectionTreeElement(WebInspector.UIString("Origins"));
    this._sidebarOriginSection.listItemElement.classList.add("security-sidebar-origins");
    sidebarTree.appendChild(this._sidebarOriginSection);

    this._mainView = new WebInspector.SecurityMainView();

    /** @type {!Map<!WebInspector.SecurityPanel.Origin, !WebInspector.SecurityPanel.OriginState>} */
    this._origins = new Map();
    // TODO(lgarron): add event listeners to call _clear() once we figure out how to clear the panel properly (https://crbug.com/522762).

    WebInspector.targetManager.addModelListener(WebInspector.NetworkManager, WebInspector.NetworkManager.EventTypes.ResponseReceivedSecurityDetails, this._onResponseReceivedSecurityDetails, this);
    WebInspector.targetManager.addModelListener(WebInspector.SecurityModel, WebInspector.SecurityModel.EventTypes.SecurityStateChanged, this._onSecurityStateChanged, this);

    WebInspector.targetManager.observeTargets(this);
}

/** @typedef {string} */
WebInspector.SecurityPanel.Origin;

/**
 * @typedef {Object}
 * @property {!SecurityAgent.SecurityState} securityState - Current security state of the origin.
 * @property {?NetworkAgent.SecurityDetails} securityDetails - Security details of the origin, if available.
 * @property {?NetworkAgent.CertificateDetails} securityDetails.certificateDetails - Certificate details of the origin (attached to security details), if available.
 * @property {?WebInspector.SecurityOriginView} originView - Current SecurityOriginView corresponding to origin.
 */
WebInspector.SecurityPanel.OriginState;

WebInspector.SecurityPanel.prototype = {

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     * @param {!Array<!SecurityAgent.SecurityStateExplanation>} explanations
     */
    _updateSecurityState: function(newSecurityState, explanations)
    {
        this._sidebarMainViewElement.setSecurityState(newSecurityState);
        this._mainView.updateSecurityState(newSecurityState, explanations);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSecurityStateChanged: function(event)
    {
        var securityState = /** @type {!SecurityAgent.SecurityState} */ (event.data.securityState);
        var explanations = /** @type {!Array<!SecurityAgent.SecurityStateExplanation>} */ (event.data.explanations);
        this._updateSecurityState(securityState, explanations);
    },

    showMainView: function()
    {
        this._setVisibleView(this._mainView);
    },

    /**
     * @param {!WebInspector.SecurityPanel.Origin} origin
     */
    showOrigin: function(origin)
    {
        var originState = this._origins.get(origin);
        if (!originState.originView)
            originState.originView = new WebInspector.SecurityOriginView(this, origin, originState.securityState, originState.securityDetails);

        this._setVisibleView(originState.originView);
    },

    wasShown: function()
    {
        WebInspector.Panel.prototype.wasShown.call(this);
        if (!this._visibleView)
            this._sidebarMainViewElement.select();
    },

    /**
     * @param {!WebInspector.VBox} view
     */
    _setVisibleView: function(view)
    {
        if (this._visibleView === view)
            return;

        if (this._visibleView)
            this._visibleView.detach();

        this._visibleView = view;

        if (view)
            this.splitWidget().setMainWidget(view);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResponseReceivedSecurityDetails: function(event)
    {
        var data = event.data;
        var origin = /** @type {string} */ (data.origin);
        var securityState = /** @type {!SecurityAgent.SecurityState} */ (data.securityState);

        if (this._origins.has(origin)) {
            var originState = this._origins.get(origin);
            var oldSecurityState = originState.securityState;
            originState.securityState = this._securityStateMin(oldSecurityState, securityState);
            if (oldSecurityState != originState.securityState) {
                originState.sidebarElement.setSecurityState(securityState);
                if (originState.originView)
                    originState.originView.setSecurityState(securityState);
            }
        } else {
            // TODO(lgarron): Store a (deduplicated) list of different security details we have seen. https://crbug.com/503170
            var originState = {};
            originState.securityState = securityState;
            if (data.securityDetails)
                originState.securityDetails = data.securityDetails;

            this._origins.set(origin, originState);

            originState.sidebarElement = new WebInspector.SecurityOriginViewSidebarTreeElement(this, origin);
            this._sidebarOriginSection.appendChild(originState.sidebarElement);
            originState.sidebarElement.setSecurityState(securityState);

            // Don't construct the origin view yet (let it happen lazily).
        }
    },

    /**
     * @param {!SecurityAgent.SecurityState} stateA
     * @param {!SecurityAgent.SecurityState} stateB
     * @return {!SecurityAgent.SecurityState}
     */
    _securityStateMin: function(stateA, stateB)
    {
        var ordering = ["unknown", "insecure", "neutral", "warning", "secure"];
        return (ordering.indexOf(stateA) < ordering.indexOf(stateB)) ? stateA : stateB;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        WebInspector.SecurityModel.fromTarget(target);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    _clear: function()
    {
        this._updateSecurityState(SecurityAgent.SecurityState.Unknown, []);
        this._sidebarMainViewElement.select();
        this._sidebarOriginSection.removeChildren();
        this._origins.clear();
    },

    __proto__: WebInspector.PanelWithSidebar.prototype
}

/**
 * @return {!WebInspector.SecurityPanel}
 */
WebInspector.SecurityPanel._instance = function()
{
    if (!WebInspector.SecurityPanel._instanceObject)
        WebInspector.SecurityPanel._instanceObject = new WebInspector.SecurityPanel();
    return WebInspector.SecurityPanel._instanceObject;
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.SecurityPanel} panel
 */
WebInspector.SecurityMainViewSidebarTreeElement = function(panel)
{
    this._panel = panel;
    WebInspector.SidebarTreeElement.call(this, "security-main-view-sidebar-tree-item", WebInspector.UIString("Overview"));
    this.iconElement.classList.add("lock-icon");
}

WebInspector.SecurityMainViewSidebarTreeElement.prototype = {
    onattach: function()
    {
        WebInspector.SidebarTreeElement.prototype.onattach.call(this);
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     */
    setSecurityState: function(newSecurityState)
    {
        for (var className of Array.prototype.slice.call(this.iconElement.classList)) {
            if (className.startsWith("lock-icon-"))
                this.iconElement.classList.remove(className);
        }

        this.iconElement.classList.add("lock-icon-" + newSecurityState);
    },

    /**
     * @override
     * @return {boolean}
     */
    onselect: function()
    {
        this._panel.showMainView();
        return true;
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.SecurityPanel} panel
 * @param {!WebInspector.SecurityPanel.Origin} origin
 */
WebInspector.SecurityOriginViewSidebarTreeElement = function(panel, origin)
{
    this._panel = panel;
    this._origin = origin;
    this.small = true;
    WebInspector.SidebarTreeElement.call(this, "security-sidebar-tree-item", origin);
    this.iconElement.classList.add("security-property");
}

WebInspector.SecurityOriginViewSidebarTreeElement.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    onselect: function()
    {
        this._panel.showOrigin(this._origin);
        return true;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     */
    setSecurityState: function(newSecurityState)
    {
        for (var className of Array.prototype.slice.call(this.iconElement.classList)) {
            if (className.startsWith("security-property-"))
                this.iconElement.classList.remove(className);
        }

        this.iconElement.classList.add("security-property-" + newSecurityState);
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @constructor
 * @implements {WebInspector.PanelFactory}
 */
WebInspector.SecurityPanelFactory = function()
{
}

WebInspector.SecurityPanelFactory.prototype = {
    /**
     * @override
     * @return {!WebInspector.Panel}
     */
    createPanel: function()
    {
        return WebInspector.SecurityPanel._instance();
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SecurityMainView = function()
{
    WebInspector.VBox.call(this);
    this.setMinimumSize(100, 100);

    this.element.classList.add("security-main-view");

    // Create security state section.
    var summarySection = this.element.createChild("div", "security-section");
    summarySection.classList.add("security-summary");

    this._summarylockIcon = summarySection.createChild("div", "lock-icon");

    var text = summarySection.createChild("div", "security-section-text");
    text.createChild("div", "security-summary-section-title").textContent = WebInspector.UIString("Security Overview");
    this._summaryExplanation = text.createChild("div", "security-explanation");

    this._securityExplanations = this.element.createChild("div", "security-explanation-list");

}

WebInspector.SecurityMainView.prototype = {
    /**
     * @param {!SecurityAgent.SecurityStateExplanation} explanation
     */
    _addExplanation: function(explanation)
    {
        var explanationSection = this._securityExplanations.createChild("div", "security-section");
        explanationSection.classList.add("security-explanation");

        explanationSection.createChild("div", "lock-icon").classList.add("lock-icon-" + explanation.securityState);
        var text = explanationSection.createChild("div", "security-section-text");
        text.createChild("div", "security-section-title").textContent = explanation.summary;
        text.createChild("div", "security-explanation").textContent = explanation.description;
        if ("certificateId" in explanation) {
            var certificateAnchor = text.createChild("div", "security-certificate-id link");
            certificateAnchor.textContent = WebInspector.UIString("View certificate");
            certificateAnchor.href = "";
            certificateAnchor.addEventListener("click", showCertificateViewer, false);
        }
        /**
         * @param {!Event} e
         */
        function showCertificateViewer(e)
        {
            e.consume();
            WebInspector.targetManager.mainTarget().networkManager.showCertificateViewer(/** @type {number} */ (explanation.certificateId));
        }
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     * @param {!Array<!SecurityAgent.SecurityStateExplanation>} explanations
     */
    updateSecurityState: function(newSecurityState, explanations)
    {
        // Remove old state.
        // It's safe to call this even when this._securityState is undefined.
        this._summarylockIcon.classList.remove("lock-icon-" + this._securityState);
        this._summaryExplanation.classList.remove("security-state-" + this._securityState);

        // Add new state.
        this._securityState = newSecurityState;
        this._summarylockIcon.classList.add("lock-icon-" + this._securityState);
        this._summaryExplanation.classList.add("security-state-" + this._securityState);
        var summaryExplanationStrings = {
            "unknown":  WebInspector.UIString("This security of this page is unknown."),
            "insecure": WebInspector.UIString("This page is insecure (broken HTTPS)."),
            "neutral":  WebInspector.UIString("This page is not secure."),
            "secure":   WebInspector.UIString("This page is secure (valid HTTPS).")
        }
        this._summaryExplanation.textContent = summaryExplanationStrings[this._securityState];

        this._securityExplanations.removeChildren();
        for (var explanation of explanations)
            this._addExplanation(explanation);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.SecurityPanel} panel
 * @param {!WebInspector.SecurityPanel.Origin} origin
 * @param {!SecurityAgent.SecurityState} securityState
 * @param {?NetworkAgent.SecurityDetails} securityDetails
 */
WebInspector.SecurityOriginView = function(panel, origin, securityState, securityDetails)
{
    this._panel = panel;
    WebInspector.VBox.call(this);
    this.setMinimumSize(200, 100);

    this.element.classList.add("security-origin-view");
    this.registerRequiredCSS("security/originView.css");
    this.registerRequiredCSS("security/lockIcon.css");

    var titleSection = this.element.createChild("div", "origin-view-section title-section");
    titleSection.createChild("div", "origin-view-title").textContent = WebInspector.UIString("Origin");
    var originDisplay = titleSection.createChild("div", "origin-display");
    this._originLockIcon = originDisplay.createChild("span", "security-property");
    this._originLockIcon.classList.add("security-property-" + securityState);
    // TODO(lgarron): Highlight the origin scheme. https://crbug.com/523589
    originDisplay.createChild("span", "origin").textContent = origin;

    if (securityDetails && securityDetails.certificateDetails) {
        var connectionSection = this.element.createChild("div", "origin-view-section");
        connectionSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Connection");

        var table = new WebInspector.SecurityDetailsTable();
        connectionSection.appendChild(table.element());
        table.addRow("Protocol", securityDetails.protocol);
        table.addRow("Key Exchange", securityDetails.keyExchange);
        table.addRow("Cipher Suite", securityDetails.cipher + (securityDetails.mac ? " with " + securityDetails.mac : ""));
    }

    if (securityDetails) {
        var certificateSection = this.element.createChild("div", "origin-view-section");
        certificateSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Certificate");

        var sanDiv = this._createSanDiv(securityDetails);
        var validFromString = new Date(1000 * securityDetails.certificateDetails.validFrom).toUTCString();
        var validUntilString = new Date(1000 * securityDetails.certificateDetails.validTo).toUTCString();

        var table = new WebInspector.SecurityDetailsTable();
        certificateSection.appendChild(table.element());
        table.addRow("Subject", securityDetails.certificateDetails.subject.name);
        table.addRow("SAN", sanDiv);
        table.addRow("Valid From", validFromString);
        table.addRow("Valid Until", validUntilString);
        table.addRow("Issuer", securityDetails.certificateDetails.issuer);
        // TODO(lgarron): Make SCT status available in certificate details and show it here.

        // TODO(lgarron): Implement a link to get certificateDetails. https://crbug.com/506468

        var noteSection = this.element.createChild("div", "origin-view-section");
        noteSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Development Note");
        // TODO(lgarron): Fix the issue and then remove this section. See comment in _onResponseReceivedSecurityDetails
        noteSection.createChild("div").textContent = WebInspector.UIString("At the moment, this view only shows security details from the first connection made to %s", origin);
    }

    if (!securityDetails) {
        var notSecureSection = this.element.createChild("div", "origin-view-section");
        notSecureSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Not Secure");
        notSecureSection.createChild("div").textContent = WebInspector.UIString("Your connection to this origin is not secure.");
    }
}

WebInspector.SecurityOriginView.prototype = {

    /**
     * @param {!NetworkAgent.SecurityDetails} securityDetails
     * *return {!Element}
     */
    _createSanDiv: function(securityDetails)
    {
        // TODO(lgarron): Truncate the display of SAN entries and add a button to toggle the full list. https://crbug.com/523591
        var sanDiv = createElement("div");
        var sanList = securityDetails.certificateDetails.subject.sanDnsNames.concat(securityDetails.certificateDetails.subject.sanIpAddresses);
        if (sanList.length === 0) {
            sanDiv.textContent = WebInspector.UIString("(N/A)");
        } else {
            for (var sanEntry of sanList) {
                var span = sanDiv.createChild("span", "san-entry");
                span.textContent = WebInspector.UIString(sanEntry);
            }
        }
        return sanDiv;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     */
    setSecurityState: function(newSecurityState)
    {
        for (var className of Array.prototype.slice.call(this._originLockIcon.classList)) {
            if (className.startsWith("security-property-"))
                this._originLockIcon.classList.remove(className);
        }

        this._originLockIcon.classList.add("security-property-" + newSecurityState);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 */
WebInspector.SecurityDetailsTable = function()
{
    this._element = createElement("table");
    this._element.classList.add("details-table");
}

WebInspector.SecurityDetailsTable.prototype = {

    /**
     * @return: {!Element}
     */
    element: function()
    {
        return this._element;
    },

    /**
     * @param {string} key
     * @param {string|!HTMLDivElement} value
     */
    addRow: function(key, value)
    {
        var row = this._element.createChild("div", "details-table-row");
        row.createChild("div").textContent = WebInspector.UIString(key);

        var valueDiv = row.createChild("div");
        if (value instanceof HTMLDivElement) {
            valueDiv.appendChild(value);
        } else {
            valueDiv.textContent = value;
        }
    }
}

