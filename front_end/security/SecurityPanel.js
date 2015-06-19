// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.SecurityPanel = function() {
    WebInspector.Panel.call(this, "security");
    this.registerRequiredCSS("security/securityPanel.css");

    // Create security state section.
    var securityStateSection = this.element.createChild("div");
    this._lockIcon = securityStateSection.createChild("div", "lock-icon");
    this._securityStateText = securityStateSection.createChild("div", "security-state");
    securityStateSection.createChild("hr");
    this._securityExplanations = securityStateSection.createChild("div", "security-explanations");

    WebInspector.targetManager.observeTargets(this);
}

WebInspector.SecurityPanel.prototype = {
    /**
     * @param {!SecurityAgent.SecurityStateExplanation} explanation
     */
    _addExplanation: function(explanation) {
        var explanationDiv = this._securityExplanations.createChild("div", "security-explanation");

        var explanationLockIcon = explanationDiv.createChild("div", "lock-icon");
        explanationLockIcon.classList.add("lock-icon-" + explanation.securityState);
        explanationDiv.createChild("div", "explanation-title").textContent = explanation.summary;
        explanationDiv.createChild("div", "explanation-text").textContent = explanation.description;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     * @param {!Array<!SecurityAgent.SecurityStateExplanation>} explanations
     */
    _updateSecurityState: function(newSecurityState, explanations)
    {
        // Remove old state.
        // It's safe to call this even when this._securityState is undefined.
        this._lockIcon.classList.remove("lock-icon-" + this._securityState);

        // Add new state.
        this._securityState = newSecurityState;
        this._lockIcon.classList.add("lock-icon-" + this._securityState);
        this._securityStateText.textContent = WebInspector.UIString("Page security state: %s", this._securityState);

        this._securityExplanations.removeChildren();
        for (var explanation of explanations)
            this._addExplanation(explanation);
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

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (!this._target) {
            this._target = target;
            this._securityModel = WebInspector.SecurityModel.fromTarget(target);
            this._securityModel.addEventListener(WebInspector.SecurityModel.EventTypes.SecurityStateChanged, this._onSecurityStateChanged, this);
            this._updateSecurityState(this._securityModel.securityState(), []);
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (target === this._target) {
            this._securityModel.removeEventListener(WebInspector.SecurityModel.EventTypes.SecurityStateChanged, this._onSecurityStateChanged, this);
            delete this._securityModel;
            delete this._target;
            this._updateSecurityState(SecurityAgent.SecurityState.Unknown, []);
        }
    },

    __proto__: WebInspector.Panel.prototype
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