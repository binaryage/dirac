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
 */
WebInspector.CallStackSidebarPane = function()
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Call Stack"));
    this.bodyElement.addEventListener("keydown", this._keyDown.bind(this), true);
    this.bodyElement.tabIndex = 0;
}

WebInspector.CallStackSidebarPane.Events = {
    CallFrameRestarted: "CallFrameRestarted",
    CallFrameSelected: "CallFrameSelected"
}

WebInspector.CallStackSidebarPane.prototype = {
    /**
     * @param {?Array.<!WebInspector.DebuggerModel.CallFrame>} callFrames
     * @param {?WebInspector.DebuggerModel.StackTrace} asyncStackTrace
     */
    update: function(callFrames, asyncStackTrace)
    {
        this.bodyElement.removeChildren();
        delete this._statusMessageElement;
        /** @type {!Array.<!WebInspector.CallStackSidebarPane.Placard>} */
        this.placards = [];

        if (!callFrames) {
            var infoElement = this.bodyElement.createChild("div", "info");
            infoElement.textContent = WebInspector.UIString("Not Paused");
            return;
        }

        this._appendSidebarPlacards(callFrames, this.bodyElement);

        while (asyncStackTrace) {
            var asyncPlacards = this._appendSidebarPlacards(asyncStackTrace.callFrames);
            var group = new WebInspector.PlacardGroup(WebInspector.UIString("[Async Call]"), asyncPlacards);
            group.element.addEventListener("contextmenu", this._placardContextMenu.bind(this, asyncPlacards[0]), true);
            this.bodyElement.appendChild(group.element);
            asyncStackTrace = asyncStackTrace.asyncStackTrace;
        }
    },

    /**
     * @param {!Array.<!WebInspector.DebuggerModel.CallFrame>} callFrames
     * @param {!Element=} parentElement
     * @return {!Array.<!WebInspector.CallStackSidebarPane.Placard>}
     */
    _appendSidebarPlacards: function(callFrames, parentElement)
    {
        var result = [];
        for (var i = 0, n = callFrames.length; i < n; ++i) {
            var placard = new WebInspector.CallStackSidebarPane.Placard(callFrames[i]);
            placard.element.addEventListener("click", this._placardSelected.bind(this, placard), false);
            placard.element.addEventListener("contextmenu", this._placardContextMenu.bind(this, placard), true);
            result.push(placard);
            this.placards.push(placard);
            if (parentElement)
                parentElement.appendChild(placard.element);
        }
        return result;
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.Placard} placard
     */
    _placardContextMenu: function(placard, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);

        if (!placard._callFrame.isAsync() && WebInspector.debuggerModel.canSetScriptSource())
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Restart frame" : "Restart Frame"), this._restartFrame.bind(this, placard));

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy stack trace" : "Copy Stack Trace"), this._copyStackTrace.bind(this));
        contextMenu.appendSeparator();

        var asyncStacksEnabled = WebInspector.settings.enableAsyncStackTraces.get();
        if (asyncStacksEnabled)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Disable async stack traces" : "Disable Async Stack Traces"), this._enableAsyncStacks.bind(this, false));
        else
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Enable async stack traces" : "Enable Async Stack Traces"), this._enableAsyncStacks.bind(this, true));

        contextMenu.show();
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.Placard} placard
     */
    _restartFrame: function(placard)
    {
        placard._callFrame.restart();
        this.dispatchEventToListeners(WebInspector.CallStackSidebarPane.Events.CallFrameRestarted, placard._callFrame);
    },

    /**
     * @param {boolean} enable
     */
    _enableAsyncStacks: function(enable)
    {
        WebInspector.settings.enableAsyncStackTraces.set(enable);
    },

    /**
     * @param {!WebInspector.DebuggerModel.CallFrame} x
     */
    setSelectedCallFrame: function(x)
    {
        for (var i = 0; i < this.placards.length; ++i) {
            var placard = this.placards[i];
            placard.selected = (placard._callFrame === x);
        }
    },

    /**
     * @return {boolean}
     */
    _selectNextCallFrameOnStack: function()
    {
        var index = this._selectedCallFrameIndex();
        if (index === -1)
            return true;
        this._selectPlacardByIndex(index + 1);
        return true;
    },

    /**
     * @return {boolean}
     */
    _selectPreviousCallFrameOnStack: function()
    {
        var index = this._selectedCallFrameIndex();
        if (index === -1)
            return true;
        this._selectPlacardByIndex(index - 1);
        return true;
    },

    /**
     * @param {number} index
     */
    _selectPlacardByIndex: function(index)
    {
        if (index < 0 || index >= this.placards.length)
            return;
        this._placardSelected(this.placards[index])
    },

    /**
     * @return {number}
     */
    _selectedCallFrameIndex: function()
    {
        var selectedCallFrame = WebInspector.debuggerModel.selectedCallFrame();
        if (!selectedCallFrame)
            return -1;
        for (var i = 0; i < this.placards.length; ++i) {
            var placard = this.placards[i];
            if (placard._callFrame === selectedCallFrame)
                return i;
        }
        return -1;
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.Placard} placard
     */
    _placardSelected: function(placard)
    {
        this.dispatchEventToListeners(WebInspector.CallStackSidebarPane.Events.CallFrameSelected, placard._callFrame);
    },

    _copyStackTrace: function()
    {
        var text = "";
        for (var i = 0; i < this.placards.length; ++i) {
            if (i && this.placards[i].group() !== this.placards[i - 1].group())
                text += this.placards[i].group().title() + "\n";
            text += this.placards[i].title + " (" + this.placards[i].subtitle + ")\n";
        }
        InspectorFrontendHost.copyText(text);
    },

    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(?Event=):boolean)} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        registerShortcutDelegate(WebInspector.SourcesPanelDescriptor.ShortcutKeys.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
        registerShortcutDelegate(WebInspector.SourcesPanelDescriptor.ShortcutKeys.PrevCallFrame, this._selectPreviousCallFrameOnStack.bind(this));
    },

    /**
     * @param {!Element|string} status
     */
    setStatus: function(status)
    {
        if (!this._statusMessageElement)
            this._statusMessageElement = this.bodyElement.createChild("div", "info");
        if (typeof status === "string") {
            this._statusMessageElement.textContent = status;
        } else {
            this._statusMessageElement.removeChildren();
            this._statusMessageElement.appendChild(status);
        }
    },

    _keyDown: function(event)
    {
        if (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey)
            return;

        if (event.keyIdentifier === "Up") {
            this._selectPreviousCallFrameOnStack();
            event.consume();
        } else if (event.keyIdentifier === "Down") {
            this._selectNextCallFrameOnStack();
            event.consume();
        }
    },

    __proto__: WebInspector.SidebarPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Placard}
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 */
WebInspector.CallStackSidebarPane.Placard = function(callFrame)
{
    WebInspector.Placard.call(this, callFrame.functionName || WebInspector.UIString("(anonymous function)"), "");
    callFrame.createLiveLocation(this._update.bind(this));
    this._callFrame = callFrame;
}

WebInspector.CallStackSidebarPane.Placard.prototype = {
    /**
     * @param {!WebInspector.UILocation} uiLocation
     */
    _update: function(uiLocation)
    {
        this.subtitle = uiLocation.linkText().trimMiddle(100);
    },

    __proto__: WebInspector.Placard.prototype
}
