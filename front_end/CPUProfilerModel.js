/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @extends {WebInspector.TargetAwareObject}
 * @param {!WebInspector.Target} target
 * @implements {ProfilerAgent.Dispatcher}
 */
WebInspector.CPUProfilerModel = function(target)
{
    WebInspector.TargetAwareObject.call(this, target);

    /** @type {?WebInspector.CPUProfilerModel.Delegate} */
    this._delegate = null;
    this._isRecording = false;
    InspectorBackend.registerProfilerDispatcher(this);
    ProfilerAgent.enable();
}

WebInspector.CPUProfilerModel.EventTypes = {
    ProfileStarted: "profile-started",
    ProfileStopped: "profile-stopped"
};

WebInspector.CPUProfilerModel.prototype = {
    /**
      * @param {!WebInspector.CPUProfilerModel.Delegate} delegate
      */
    setDelegate: function(delegate)
    {
        this._delegate = delegate;
    },

    /**
     * @param {string} id
     * @param {!DebuggerAgent.Location} scriptLocation
     * @param {!ProfilerAgent.CPUProfile} cpuProfile
     * @param {string=} title
     */
    consoleProfileFinished: function(id, scriptLocation, cpuProfile, title)
    {
        // Make sure ProfilesPanel is initialized and CPUProfileType is created.
        WebInspector.moduleManager.loadModule("profiles");
        this._delegate.consoleProfileFinished(id, WebInspector.DebuggerModel.Location.fromPayload(this.target(), scriptLocation), cpuProfile, title);
    },

    /**
     * @param {string} id
     * @param {!DebuggerAgent.Location} scriptLocation
     * @param {string=} title
     */
    consoleProfileStarted: function(id, scriptLocation, title)
    {
        // Make sure ProfilesPanel is initialized and CPUProfileType is created.
        WebInspector.moduleManager.loadModule("profiles");
        this._delegate.consoleProfileStarted(id, WebInspector.DebuggerModel.Location.fromPayload(this.target(), scriptLocation), title);
    },

    /**
      * @param {boolean} isRecording
      */
    setRecording: function(isRecording)
    {
        this._isRecording = isRecording;
        this.dispatchEventToListeners(isRecording ?
            WebInspector.CPUProfilerModel.EventTypes.ProfileStarted :
            WebInspector.CPUProfilerModel.EventTypes.ProfileStopped);
    },

    /**
      * @return {boolean}
      */
    isRecordingProfile: function()
    {
        return this._isRecording;
    },

    __proto__: WebInspector.TargetAwareObject.prototype
}

/** @interface */
WebInspector.CPUProfilerModel.Delegate = function() {};

WebInspector.CPUProfilerModel.Delegate.prototype = {
    /**
     * @param {string} protocolId
     * @param {!WebInspector.DebuggerModel.Location} scriptLocation
     * @param {string=} title
     */
    consoleProfileStarted: function(protocolId, scriptLocation, title) {},

    /**
     * @param {string} protocolId
     * @param {!WebInspector.DebuggerModel.Location} scriptLocation
     * @param {!ProfilerAgent.CPUProfile} cpuProfile
     * @param {string=} title
     */
    consoleProfileFinished: function(protocolId, scriptLocation, cpuProfile, title) {}
}

/**
 * @type {!WebInspector.CPUProfilerModel}
 */
WebInspector.cpuProfilerModel;
