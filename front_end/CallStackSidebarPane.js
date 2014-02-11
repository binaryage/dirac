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

    var asyncCheckbox = this.titleElement.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Async"), WebInspector.settings.enableAsyncStackTraces, true, undefined, WebInspector.UIString("Capture async stack traces")));
    asyncCheckbox.classList.add("scripts-callstack-async");
    asyncCheckbox.addEventListener("click", consumeEvent, false);

    WebInspector.settings.enableAsyncStackTraces.addChangeListener(this._asyncStackTracesStateChanged, this);
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

        this._appendSidebarPlacards(callFrames);

        while (asyncStackTrace) {
            var title = asyncStackTrace.description;
            if (title)
                title += " " + WebInspector.UIString("(async)");
            else
                title = WebInspector.UIString("Async Call");
            var asyncPlacard = new WebInspector.Placard(title, "");
            asyncPlacard.element.classList.add("placard-label");
            this.bodyElement.appendChild(asyncPlacard.element);
            this._appendSidebarPlacards(asyncStackTrace.callFrames, asyncPlacard);
            asyncStackTrace = asyncStackTrace.asyncStackTrace;
        }
    },

    /**
     * @param {!Array.<!WebInspector.DebuggerModel.CallFrame>} callFrames
     * @param {!WebInspector.Placard=} asyncPlacard
     */
    _appendSidebarPlacards: function(callFrames, asyncPlacard)
    {
        for (var i = 0, n = callFrames.length; i < n; ++i) {
            var placard = new WebInspector.CallStackSidebarPane.Placard(callFrames[i], asyncPlacard);
            placard.element.addEventListener("click", this._placardSelected.bind(this, placard), false);
            placard.element.addEventListener("contextmenu", this._placardContextMenu.bind(this, placard), true);
            if (!i && asyncPlacard) {
                asyncPlacard.element.addEventListener("click", this._placardSelected.bind(this, placard), false);
                asyncPlacard.element.addEventListener("contextmenu", this._placardContextMenu.bind(this, placard), true);
            }
            this.placards.push(placard);
            this.bodyElement.appendChild(placard.element);
        }
    },

    /**
     * @param {!WebInspector.CallStackSidebarPane.Placard} placard
     */
    _placardContextMenu: function(placard, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);

        if (!placard._callFrame.isAsync())
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Restart frame" : "Restart Frame"), this._restartFrame.bind(this, placard));

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy stack trace" : "Copy Stack Trace"), this._copyStackTrace.bind(this));
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

    _asyncStackTracesStateChanged: function()
    {
        var enabled = WebInspector.settings.enableAsyncStackTraces.get();
        if (!enabled && this.placards)
            this._removeAsyncPlacards();
    },

    _removeAsyncPlacards: function()
    {
        var shouldSelectTopFrame = false;
        var lastSyncPlacardIndex = -1;
        for (var i = 0; i < this.placards.length; ++i) {
            var placard = this.placards[i];
            if (placard._asyncPlacard) {
                if (placard.selected)
                    shouldSelectTopFrame = true;
                placard._asyncPlacard.element.remove();
                placard.element.remove();
            } else {
                lastSyncPlacardIndex = i;
            }
        }
        this.placards.length = lastSyncPlacardIndex + 1;
        if (shouldSelectTopFrame)
            this._selectPlacardByIndex(0);
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
            return false;
        return this._selectPlacardByIndex(index + 1);
    },

    /**
     * @return {boolean}
     */
    _selectPreviousCallFrameOnStack: function()
    {
        var index = this._selectedCallFrameIndex();
        if (index === -1)
            return false;
        return this._selectPlacardByIndex(index - 1);
    },

    /**
     * @param {number} index
     * @return {boolean}
     */
    _selectPlacardByIndex: function(index)
    {
        if (index < 0 || index >= this.placards.length)
            return false;
        this._placardSelected(this.placards[index]);
        return true;
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
        placard.element.scrollIntoViewIfNeeded();
        this.dispatchEventToListeners(WebInspector.CallStackSidebarPane.Events.CallFrameSelected, placard._callFrame);
    },

    _copyStackTrace: function()
    {
        var text = "";
        for (var i = 0; i < this.placards.length; ++i) {
            if (i && this.placards[i]._asyncPlacard !== this.placards[i - 1]._asyncPlacard)
                text += this.placards[i]._asyncPlacard.title + "\n";
            text += this.placards[i].title + " (" + this.placards[i].subtitle + ")\n";
        }
        InspectorFrontendHost.copyText(text);
    },

    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(?Event=):boolean)} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame, this._selectNextCallFrameOnStack.bind(this));
        registerShortcutDelegate(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame, this._selectPreviousCallFrameOnStack.bind(this));
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
        if (event.keyIdentifier === "Up" && this._selectPreviousCallFrameOnStack() || event.keyIdentifier === "Down" && this._selectNextCallFrameOnStack())
            event.consume(true);
    },

    __proto__: WebInspector.SidebarPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Placard}
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 * @param {!WebInspector.Placard=} asyncPlacard
 */
WebInspector.CallStackSidebarPane.Placard = function(callFrame, asyncPlacard)
{
    WebInspector.Placard.call(this, callFrame.functionName || WebInspector.UIString("(anonymous function)"), "");
    callFrame.createLiveLocation(this._update.bind(this));
    this._callFrame = callFrame;
    this._asyncPlacard = asyncPlacard;
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
