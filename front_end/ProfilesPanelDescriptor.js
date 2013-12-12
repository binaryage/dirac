/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.PanelDescriptor}
 */
WebInspector.ProfilesPanelDescriptor = function()
{
    WebInspector.PanelDescriptor.call(this, "profiles", WebInspector.UIString("Profiles"), "ProfilesPanel", "ProfilesPanel.js");
}

WebInspector.ProfilesPanelDescriptor.prototype = {
    registerShortcuts: function()
    {
        var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Profiles Panel"));
        section.addAlternateKeys(WebInspector.ProfilesPanelDescriptor.ShortcutKeys.StartStopRecording, WebInspector.UIString("Start/stop recording"));
    },

    __proto__: WebInspector.PanelDescriptor.prototype
}

WebInspector.ProfilesPanelDescriptor.ShortcutKeys = {
    StartStopRecording: [
        WebInspector.KeyboardShortcut.makeDescriptor("e", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)
    ]
}

WebInspector.ProfilesPanelDescriptor.ProfileURLRegExp = /webkit-profile:\/\/(.+)\/(.+)/;

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.ProfileManager = function()
{
   this._startedProfiles = {};
};

WebInspector.ProfileManager.EventTypes = {
    ProfileStarted: "profile-started",
    ProfileStopped: "profile-stopped"
};

WebInspector.ProfileManager.prototype = {
    /**
     * @param {string} profileTypeId
     * @return {boolean}
     */
    isStarted: function(profileTypeId)
    {
        return profileTypeId in this._startedProfiles;
    },

    /**
     * @param {string} profileTypeId
     */
    notifyStarted: function(profileTypeId)
    {
        this._startedProfiles[profileTypeId] = true;
        this.dispatchEventToListeners(WebInspector.ProfileManager.EventTypes.ProfileStarted, profileTypeId);
    },

    /**
     * @param {string} profileTypeId
     */
    notifyStoped: function(profileTypeId)
    {
        delete this._startedProfiles[profileTypeId];
        this.dispatchEventToListeners(WebInspector.ProfileManager.EventTypes.ProfileStopped, profileTypeId);
    },

    __proto__: WebInspector.Object.prototype
};

/**
 * @type {?WebInspector.ProfileManager}
 */
WebInspector.profileManager = null;

/**
 * @constructor
 * @implements {ProfilerAgent.Dispatcher}
 */
WebInspector.CPUProfilerModel = function()
{
    /** @type {?ProfilerAgent.Dispatcher} */
    this._delegate = null;
    InspectorBackend.registerProfilerDispatcher(this);
    ProfilerAgent.enable();
}

WebInspector.CPUProfilerModel.prototype = {
    /**
      * @param {!ProfilerAgent.Dispatcher} delegate
      */
    setDelegate: function(delegate)
    {
        this._delegate = delegate;
    },

    /**
     * @param {!ProfilerAgent.CPUProfile} cpuProfile
     * @param {!string} title
     */
    addProfileHeader: function(cpuProfile, title)
    {
        // Make sure ProfilesPanel is initialized and CPUProfileType is created.
        WebInspector.inspectorView.panel("profiles");
        this._delegate.addProfileHeader(cpuProfile, title);
    },

    /**
     * @override
     */
    resetProfiles: function()
    {
        if (this._delegate)
            this._delegate.resetProfiles();
    }
}

/**
 * @type {?WebInspector.CPUProfilerModel}
 */
WebInspector.cpuProfilerModel = null;
