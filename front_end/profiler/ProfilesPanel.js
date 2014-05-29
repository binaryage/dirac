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
 * @extends {WebInspector.Object}
 * @param {string} id
 * @param {string} name
 */
WebInspector.ProfileType = function(id, name)
{
    WebInspector.Object.call(this);
    this._id = id;
    this._name = name;
    /** @type {!Array.<!WebInspector.ProfileHeader>} */
    this._profiles = [];
    /** @type {?WebInspector.ProfileHeader} */
    this._profileBeingRecorded = null;
    this._nextProfileUid = 1;

    window.addEventListener("unload", this._clearTempStorage.bind(this), false);
}

/**
 * @enum {string}
 */
WebInspector.ProfileType.Events = {
    AddProfileHeader: "add-profile-header",
    ProfileComplete: "profile-complete",
    RemoveProfileHeader: "remove-profile-header",
    ViewUpdated: "view-updated"
}

WebInspector.ProfileType.prototype = {
    /**
     * @return {boolean}
     */
    hasTemporaryView: function()
    {
        return false;
    },

    /**
     * @return {?string}
     */
    fileExtension: function()
    {
        return null;
    },

    get statusBarItems()
    {
        return [];
    },

    get buttonTooltip()
    {
        return "";
    },

    get id()
    {
        return this._id;
    },

    get treeItemTitle()
    {
        return this._name;
    },

    get name()
    {
        return this._name;
    },

    /**
     * @return {boolean}
     */
    buttonClicked: function()
    {
        return false;
    },

    get description()
    {
        return "";
    },

    /**
     * @return {boolean}
     */
    isInstantProfile: function()
    {
        return false;
    },

    /**
     * @return {boolean}
     */
    isEnabled: function()
    {
        return true;
    },

    /**
     * @return {!Array.<!WebInspector.ProfileHeader>}
     */
    getProfiles: function()
    {
        /**
         * @param {!WebInspector.ProfileHeader} profile
         * @return {boolean}
         * @this {WebInspector.ProfileType}
         */
        function isFinished(profile)
        {
            return this._profileBeingRecorded !== profile;
        }
        return this._profiles.filter(isFinished.bind(this));
    },

    /**
     * @return {?Element}
     */
    decorationElement: function()
    {
        return null;
    },

    /**
     * @nosideeffects
     * @param {number} uid
     * @return {?WebInspector.ProfileHeader}
     */
    getProfile: function(uid)
    {

        for (var i = 0; i < this._profiles.length; ++i) {
            if (this._profiles[i].uid === uid)
                return this._profiles[i];
        }
        return null;
    },

    /**
     * @param {!File} file
     */
    loadFromFile: function(file)
    {
        var name = file.name;
        if (name.endsWith(this.fileExtension()))
            name = name.substr(0, name.length - this.fileExtension().length);
        var profile = this.createProfileLoadedFromFile(name);
        profile.setFromFile();
        this.setProfileBeingRecorded(profile);
        this.addProfile(profile);
        profile.loadFromFile(file);
    },

    /**
     * @param {!string} title
     * @return {!WebInspector.ProfileHeader}
     */
    createProfileLoadedFromFile: function(title)
    {
        throw new Error("Needs implemented.");
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    addProfile: function(profile)
    {
        this._profiles.push(profile);
        this.dispatchEventToListeners(WebInspector.ProfileType.Events.AddProfileHeader, profile);
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    removeProfile: function(profile)
    {
        var index = this._profiles.indexOf(profile);
        if (index === -1)
            return;
        this._profiles.splice(index, 1);
        this._disposeProfile(profile);
    },

    _clearTempStorage: function()
    {
        for (var i = 0; i < this._profiles.length; ++i)
            this._profiles[i].removeTempFile();
    },

    /**
     * @nosideeffects
     * @return {?WebInspector.ProfileHeader}
     */
    profileBeingRecorded: function()
    {
        return this._profileBeingRecorded;
    },

    /**
     * @param {?WebInspector.ProfileHeader} profile
     */
    setProfileBeingRecorded: function(profile)
    {
        if (this._profileBeingRecorded)
            this._profileBeingRecorded.target().profilingLock.release();
        if (profile)
            profile.target().profilingLock.acquire();
        this._profileBeingRecorded = profile;
    },

    profileBeingRecordedRemoved: function()
    {
    },

    _reset: function()
    {
        var profiles = this._profiles.slice(0);
        for (var i = 0; i < profiles.length; ++i)
            this._disposeProfile(profiles[i]);
        this._profiles = [];

        this._nextProfileUid = 1;
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    _disposeProfile: function(profile)
    {
        this.dispatchEventToListeners(WebInspector.ProfileType.Events.RemoveProfileHeader, profile);
        profile.dispose();
        if (this._profileBeingRecorded === profile) {
            this.profileBeingRecordedRemoved();
            this.setProfileBeingRecorded(null);
        }
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @interface
 */
WebInspector.ProfileType.DataDisplayDelegate = function()
{
}

WebInspector.ProfileType.DataDisplayDelegate.prototype = {
    /**
     * @param {?WebInspector.ProfileHeader} profile
     * @return {?WebInspector.View}
     */
    showProfile: function(profile) { },

    /**
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} snapshotObjectId
     * @param {string} perspectiveName
     */
    showObject: function(snapshotObjectId, perspectiveName) { }
}

/**
 * @constructor
 * @extends {WebInspector.TargetAwareObject}
 * @param {!WebInspector.ProfileType} profileType
 * @param {string} title
 */
WebInspector.ProfileHeader = function(target, profileType, title)
{
    WebInspector.TargetAwareObject.call(this, target);
    this._profileType = profileType;
    this.title = title;
    this.uid = profileType._nextProfileUid++;
    this._fromFile = false;
}

/**
 * @constructor
 * @param {?string} subtitle
 * @param {boolean|undefined} wait
 */
WebInspector.ProfileHeader.StatusUpdate = function(subtitle, wait)
{
    /** @type {?string} */
    this.subtitle = subtitle;
    /** @type {boolean|undefined} */
    this.wait = wait;
}

WebInspector.ProfileHeader.Events = {
    UpdateStatus: "UpdateStatus",
    ProfileReceived: "ProfileReceived"
}

WebInspector.ProfileHeader.prototype = {
    /**
     * @return {!WebInspector.ProfileType}
     */
    profileType: function()
    {
        return this._profileType;
    },

    /**
     * @param {?string} subtitle
     * @param {boolean=} wait
     */
    updateStatus: function(subtitle, wait)
    {
        this.dispatchEventToListeners(WebInspector.ProfileHeader.Events.UpdateStatus, new WebInspector.ProfileHeader.StatusUpdate(subtitle, wait));
    },

    /**
     * Must be implemented by subclasses.
     * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
     * @return {!WebInspector.ProfileSidebarTreeElement}
     */
    createSidebarTreeElement: function(dataDisplayDelegate)
    {
        throw new Error("Needs implemented.");
    },

    /**
     * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
     * @return {!WebInspector.View}
     */
    createView: function(dataDisplayDelegate)
    {
        throw new Error("Not implemented.");
    },

    removeTempFile: function()
    {
        if (this._tempFile)
            this._tempFile.remove();
    },

    dispose: function()
    {
    },

    /**
     * @param {!Function} callback
     */
    load: function(callback)
    {
    },

    /**
     * @return {boolean}
     */
    canSaveToFile: function()
    {
        return false;
    },

    saveToFile: function()
    {
        throw new Error("Needs implemented");
    },

    /**
     * @param {!File} file
     */
    loadFromFile: function(file)
    {
        throw new Error("Needs implemented");
    },

    /**
     * @return {boolean}
     */
    fromFile: function()
    {
        return this._fromFile;
    },

    setFromFile: function()
    {
        this._fromFile = true;
    },

    __proto__: WebInspector.TargetAwareObject.prototype
}

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.ProfileType.DataDisplayDelegate}
 * @extends {WebInspector.PanelWithSidebarTree}
 */
WebInspector.ProfilesPanel = function()
{
    WebInspector.PanelWithSidebarTree.call(this, "profiles");
    this.registerRequiredCSS("panelEnablerView.css");
    this.registerRequiredCSS("heapProfiler.css");
    this.registerRequiredCSS("profilesPanel.css");

    this._target = /** @type {!WebInspector.Target} */ (WebInspector.targetManager.activeTarget());
    this._target.profilingLock.addEventListener(WebInspector.Lock.Events.StateChanged, this._onProfilingStateChanged, this);

    this._searchableView = new WebInspector.SearchableView(this);

    var mainView = new WebInspector.VBox();
    this._searchableView.show(mainView.element);
    mainView.show(this.mainElement());

    this.profilesItemTreeElement = new WebInspector.ProfilesSidebarTreeElement(this);
    this.sidebarTree.appendChild(this.profilesItemTreeElement);

    this.profileViews = document.createElement("div");
    this.profileViews.id = "profile-views";
    this.profileViews.classList.add("vbox");
    this._searchableView.element.appendChild(this.profileViews);

    var statusBarContainer = document.createElementWithClass("div", "profiles-status-bar");
    mainView.element.insertBefore(statusBarContainer, mainView.element.firstChild);
    this._statusBarElement = statusBarContainer.createChild("div", "status-bar");

    this.sidebarElement().classList.add("profiles-sidebar-tree-box");
    var statusBarContainerLeft = document.createElementWithClass("div", "profiles-status-bar");
    this.sidebarElement().insertBefore(statusBarContainerLeft, this.sidebarElement().firstChild);
    this._statusBarButtons = statusBarContainerLeft.createChild("div", "status-bar");

    this.recordButton = new WebInspector.StatusBarButton("", "record-profile-status-bar-item");
    this.recordButton.addEventListener("click", this.toggleRecordButton, this);
    this._statusBarButtons.appendChild(this.recordButton.element);

    this.clearResultsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear all profiles."), "clear-status-bar-item");
    this.clearResultsButton.addEventListener("click", this._reset, this);
    this._statusBarButtons.appendChild(this.clearResultsButton.element);

    this._profileTypeStatusBarItemsContainer = this._statusBarElement.createChild("div");
    this._profileViewStatusBarItemsContainer = this._statusBarElement.createChild("div");

    this._profileGroups = {};
    this._launcherView = new WebInspector.MultiProfileLauncherView(this);
    this._launcherView.addEventListener(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, this._onProfileTypeSelected, this);

    this._profileToView = [];
    this._typeIdToSidebarSection = {};
    var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
    for (var i = 0; i < types.length; i++)
        this._registerProfileType(types[i]);
    this._launcherView.restoreSelectedProfileType();
    this.profilesItemTreeElement.select();
    this._showLauncherView();

    this._createFileSelectorElement();
    this.element.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);
    this._registerShortcuts();

    this._configureCpuProfilerSamplingInterval();
    WebInspector.settings.highResolutionCpuProfiling.addChangeListener(this._configureCpuProfilerSamplingInterval, this);
}


/**
 * @constructor
 */
WebInspector.ProfileTypeRegistry = function() {
    this._profileTypes = [];

    this.cpuProfileType = new WebInspector.CPUProfileType();
    this._addProfileType(this.cpuProfileType);
    this.heapSnapshotProfileType = new WebInspector.HeapSnapshotProfileType();
    this._addProfileType(this.heapSnapshotProfileType);
    this.trackingHeapSnapshotProfileType = new WebInspector.TrackingHeapSnapshotProfileType();
    this._addProfileType(this.trackingHeapSnapshotProfileType);
    HeapProfilerAgent.enable();

    if (Capabilities.isMainFrontend && WebInspector.experimentsSettings.canvasInspection.isEnabled()) {
        this.canvasProfileType = new WebInspector.CanvasProfileType();
        this._addProfileType(this.canvasProfileType);
    }
}

WebInspector.ProfileTypeRegistry.prototype = {
    /**
     * @param {!WebInspector.ProfileType} profileType
     */
    _addProfileType: function(profileType)
    {
        this._profileTypes.push(profileType);
    },

    /**
     * @return {!Array.<!WebInspector.ProfileType>}
     */
    profileTypes: function()
    {
        return this._profileTypes;
    }
}



WebInspector.ProfilesPanel.prototype = {
    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    _createFileSelectorElement: function()
    {
        if (this._fileSelectorElement)
            this.element.removeChild(this._fileSelectorElement);
        this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
        this.element.appendChild(this._fileSelectorElement);
    },

    _findProfileTypeByExtension: function(fileName)
    {
        var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
        for (var i = 0; i < types.length; i++) {
            var type = types[i];
            var extension = type.fileExtension();
            if (!extension)
                continue;
            if (fileName.endsWith(type.fileExtension()))
                return type;
        }
        return null;
    },

    _registerShortcuts: function()
    {
        this.registerShortcuts(WebInspector.ShortcutsScreen.ProfilesPanelShortcuts.StartStopRecording, this.toggleRecordButton.bind(this));
    },

    _configureCpuProfilerSamplingInterval: function()
    {
        var intervalUs = WebInspector.settings.highResolutionCpuProfiling.get() ? 100 : 1000;
        ProfilerAgent.setSamplingInterval(intervalUs, didChangeInterval);
        function didChangeInterval(error)
        {
            if (error)
                WebInspector.messageSink.addErrorMessage(error, true);
        }
    },

    /**
     * @param {!File} file
     */
    _loadFromFile: function(file)
    {
        this._createFileSelectorElement();

        var profileType = this._findProfileTypeByExtension(file.name);
        if (!profileType) {
            var extensions = [];
            var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
            for (var i = 0; i < types.length; i++) {
                var extension = types[i].fileExtension();
                if (!extension || extensions.indexOf(extension) !== -1)
                    continue;
                extensions.push(extension);
            }
            WebInspector.messageSink.addMessage(WebInspector.UIString("Can't load file. Only files with extensions '%s' can be loaded.", extensions.join("', '")));
            return;
        }

        if (!!profileType.profileBeingRecorded()) {
            WebInspector.messageSink.addMessage(WebInspector.UIString("Can't load profile while another profile is recording."));
            return;
        }

        profileType.loadFromFile(file);
    },

    /**
     * @return {boolean}
     */
    toggleRecordButton: function()
    {
        if (!this.recordButton.enabled())
            return true;
        var type = this._selectedProfileType;
        var isProfiling = type.buttonClicked();
        this._updateRecordButton(isProfiling);
        if (isProfiling) {
            this._launcherView.profileStarted();
            if (type.hasTemporaryView())
                this.showProfile(type.profileBeingRecorded());
        } else {
            this._launcherView.profileFinished();
        }
        return true;
    },

    _onProfilingStateChanged: function()
    {
        this._updateRecordButton(this.recordButton.toggled);
    },

    /**
     * @param {boolean} toggled
     */
    _updateRecordButton: function(toggled)
    {
        var enable = toggled || !this._target.profilingLock.isAcquired();
        this.recordButton.setEnabled(enable);
        this.recordButton.toggled = toggled;
        if (enable)
            this.recordButton.title = this._selectedProfileType ? this._selectedProfileType.buttonTooltip : "";
        else
            this.recordButton.title = WebInspector.UIString("Another profiler is already active");
        if (this._selectedProfileType)
            this._launcherView.updateProfileType(this._selectedProfileType, enable);
    },

    _profileBeingRecordedRemoved: function()
    {
        this._updateRecordButton(false);
        this._launcherView.profileFinished();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onProfileTypeSelected: function(event)
    {
        this._selectedProfileType = /** @type {!WebInspector.ProfileType} */ (event.data);
        this._updateProfileTypeSpecificUI();
    },

    _updateProfileTypeSpecificUI: function()
    {
        this._updateRecordButton(this.recordButton.toggled);
        this._profileTypeStatusBarItemsContainer.removeChildren();
        var statusBarItems = this._selectedProfileType.statusBarItems;
        if (statusBarItems) {
            for (var i = 0; i < statusBarItems.length; ++i)
                this._profileTypeStatusBarItemsContainer.appendChild(statusBarItems[i]);
        }
    },

    _reset: function()
    {
        WebInspector.Panel.prototype.reset.call(this);

        var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
        for (var i = 0; i < types.length; i++)
            types[i]._reset();

        delete this.visibleView;
        delete this.currentQuery;
        this.searchCanceled();

        this._profileGroups = {};
        this._updateRecordButton(false);
        this._launcherView.profileFinished();

        this.sidebarTree.element.classList.remove("some-expandable");

        this._launcherView.detach();
        this.profileViews.removeChildren();
        this._profileViewStatusBarItemsContainer.removeChildren();

        this.removeAllListeners();

        this.recordButton.visible = true;
        this._profileViewStatusBarItemsContainer.classList.remove("hidden");
        this.clearResultsButton.element.classList.remove("hidden");
        this.profilesItemTreeElement.select();
        this._showLauncherView();
    },

    _showLauncherView: function()
    {
        this.closeVisibleView();
        this._profileViewStatusBarItemsContainer.removeChildren();
        this._launcherView.show(this.profileViews);
        this.visibleView = this._launcherView;
    },

    _garbageCollectButtonClicked: function()
    {
        HeapProfilerAgent.collectGarbage();
    },

    /**
     * @param {!WebInspector.ProfileType} profileType
     */
    _registerProfileType: function(profileType)
    {
        this._launcherView.addProfileType(profileType);
        var profileTypeSection = new WebInspector.ProfileTypeSidebarSection(this, profileType);
        this._typeIdToSidebarSection[profileType.id] = profileTypeSection
        this.sidebarTree.appendChild(profileTypeSection);
        profileTypeSection.childrenListElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.ProfilesPanel}
         */
        function onAddProfileHeader(event)
        {
            this._addProfileHeader(/** @type {!WebInspector.ProfileHeader} */ (event.data));
        }

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.ProfilesPanel}
         */
        function onRemoveProfileHeader(event)
        {
            this._removeProfileHeader(/** @type {!WebInspector.ProfileHeader} */ (event.data));
        }

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.ProfilesPanel}
         */
        function profileComplete(event)
        {
            this.showProfile(/** @type {!WebInspector.ProfileHeader} */ (event.data));
        }

        profileType.addEventListener(WebInspector.ProfileType.Events.ViewUpdated, this._updateProfileTypeSpecificUI, this);
        profileType.addEventListener(WebInspector.ProfileType.Events.AddProfileHeader, onAddProfileHeader, this);
        profileType.addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, onRemoveProfileHeader, this);
        profileType.addEventListener(WebInspector.ProfileType.Events.ProfileComplete, profileComplete, this);

        var profiles = profileType.getProfiles();
        for (var i = 0; i < profiles.length; i++)
            this._addProfileHeader(profiles[i]);
    },

    /**
     * @param {?Event} event
     */
    _handleContextMenuEvent: function(event)
    {
        var element = event.srcElement;
        while (element && !element.treeElement && element !== this.element)
            element = element.parentElement;
        if (!element)
            return;
        if (element.treeElement && element.treeElement.handleContextMenuEvent) {
            element.treeElement.handleContextMenuEvent(event, this);
            return;
        }

        var contextMenu = new WebInspector.ContextMenu(event);
        if (this.visibleView instanceof WebInspector.HeapSnapshotView) {
            this.visibleView.populateContextMenu(contextMenu, event);
        }
        if (element !== this.element || event.srcElement === this.sidebarElement()) {
            contextMenu.appendItem(WebInspector.UIString("Load\u2026"), this._fileSelectorElement.click.bind(this._fileSelectorElement));
        }
        contextMenu.show();
    },

    showLoadFromFileDialog: function()
    {
        this._fileSelectorElement.click();
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    _addProfileHeader: function(profile)
    {
        var profileType = profile.profileType();
        var typeId = profileType.id;
        this._typeIdToSidebarSection[typeId].addProfileHeader(profile);
        if (!this.visibleView || this.visibleView === this._launcherView)
            this.showProfile(profile);
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    _removeProfileHeader: function(profile)
    {
        if (profile.profileType()._profileBeingRecorded === profile)
            this._profileBeingRecordedRemoved();

        var i = this._indexOfViewForProfile(profile);
        if (i !== -1)
            this._profileToView.splice(i, 1);

        var profileType = profile.profileType();
        var typeId = profileType.id;
        var sectionIsEmpty = this._typeIdToSidebarSection[typeId].removeProfileHeader(profile);

        // No other item will be selected if there aren't any other profiles, so
        // make sure that view gets cleared when the last profile is removed.
        if (sectionIsEmpty) {
            this.profilesItemTreeElement.select();
            this._showLauncherView();
        }
    },

    /**
     * @param {?WebInspector.ProfileHeader} profile
     * @return {?WebInspector.View}
     */
    showProfile: function(profile)
    {
        if (!profile || (profile.profileType().profileBeingRecorded() === profile) && !profile.profileType().hasTemporaryView())
            return null;

        var view = this._viewForProfile(profile);
        if (view === this.visibleView)
            return view;

        this.closeVisibleView();

        view.show(this.profileViews);

        this.visibleView = view;

        var profileTypeSection = this._typeIdToSidebarSection[profile.profileType().id];
        var sidebarElement = profileTypeSection.sidebarElementForProfile(profile);
        sidebarElement.revealAndSelect();

        this._profileViewStatusBarItemsContainer.removeChildren();

        var statusBarItems = view.statusBarItems;
        if (statusBarItems)
            for (var i = 0; i < statusBarItems.length; ++i)
                this._profileViewStatusBarItemsContainer.appendChild(statusBarItems[i]);

        return view;
    },

    /**
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} snapshotObjectId
     * @param {string} perspectiveName
     */
    showObject: function(snapshotObjectId, perspectiveName)
    {
        var heapProfiles = WebInspector.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();
        for (var i = 0; i < heapProfiles.length; i++) {
            var profile = heapProfiles[i];
            // FIXME: allow to choose snapshot if there are several options.
            if (profile.maxJSObjectId >= snapshotObjectId) {
                this.showProfile(profile);
                var view = this._viewForProfile(profile);
                view.highlightLiveObject(perspectiveName, snapshotObjectId);
                break;
            }
        }
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {!WebInspector.View}
     */
    _viewForProfile: function(profile)
    {
        var index = this._indexOfViewForProfile(profile);
        if (index !== -1)
            return this._profileToView[index].view;
        var view = profile.createView(this);
        view.element.classList.add("profile-view");
        this._profileToView.push({ profile: profile, view: view});
        return view;
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {number}
     */
    _indexOfViewForProfile: function(profile)
    {
        for (var i = 0; i < this._profileToView.length; i++) {
            if (this._profileToView[i].profile === profile)
                return i;
        }
        return -1;
    },

    closeVisibleView: function()
    {
        if (this.visibleView)
            this.visibleView.detach();
        delete this.visibleView;
    },

    /**
     * @param {string} query
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(query, shouldJump, jumpBackwards)
    {
        this.searchCanceled();

        var visibleView = this.visibleView;
        if (!visibleView)
            return;

        /**
         * @this {WebInspector.ProfilesPanel}
         */
        function finishedCallback(view, searchMatches)
        {
            if (!searchMatches)
                return;
            this._searchableView.updateSearchMatchesCount(searchMatches);
            this._searchResultsView = view;
            if (shouldJump) {
                if (jumpBackwards)
                    view.jumpToLastSearchResult();
                else
                    view.jumpToFirstSearchResult();
                this._searchableView.updateCurrentMatchIndex(view.currentSearchResultIndex());
            }
        }

        visibleView.currentQuery = query;
        visibleView.performSearch(query, finishedCallback.bind(this));
    },

    jumpToNextSearchResult: function()
    {
        if (!this._searchResultsView)
            return;
        if (this._searchResultsView !== this.visibleView)
            return;
        this._searchResultsView.jumpToNextSearchResult();
        this._searchableView.updateCurrentMatchIndex(this._searchResultsView.currentSearchResultIndex());
    },

    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResultsView)
            return;
        if (this._searchResultsView !== this.visibleView)
            return;
        this._searchResultsView.jumpToPreviousSearchResult();
        this._searchableView.updateCurrentMatchIndex(this._searchResultsView.currentSearchResultIndex());
    },

    searchCanceled: function()
    {
        if (this._searchResultsView) {
            if (this._searchResultsView.searchCanceled)
                this._searchResultsView.searchCanceled();
            this._searchResultsView.currentQuery = null;
            this._searchResultsView = null;
        }
        this._searchableView.updateSearchMatchesCount(0);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        if (!(target instanceof WebInspector.RemoteObject))
            return;

        if (WebInspector.inspectorView.currentPanel() !== this)
            return;

        var object = /** @type {!WebInspector.RemoteObject} */ (target);
        var objectId = object.objectId;
        if (!objectId)
            return;

        var heapProfiles = WebInspector.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();
        if (!heapProfiles.length)
            return;

        /**
         * @this {WebInspector.ProfilesPanel}
         */
        function revealInView(viewName)
        {
            HeapProfilerAgent.getHeapObjectId(objectId, didReceiveHeapObjectId.bind(this, viewName));
        }

        /**
         * @this {WebInspector.ProfilesPanel}
         */
        function didReceiveHeapObjectId(viewName, error, result)
        {
            if (WebInspector.inspectorView.currentPanel() !== this)
                return;
            if (!error)
                this.showObject(result, viewName);
        }

        if (WebInspector.settings.showAdvancedHeapSnapshotProperties.get())
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInView.bind(this, "Dominators"));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInView.bind(this, "Summary"));
    },

    __proto__: WebInspector.PanelWithSidebarTree.prototype
}


/**
 * @constructor
 * @extends {WebInspector.SidebarSectionTreeElement}
 * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
 * @param {!WebInspector.ProfileType} profileType
 */
WebInspector.ProfileTypeSidebarSection = function(dataDisplayDelegate, profileType)
{
    WebInspector.SidebarSectionTreeElement.call(this, profileType.treeItemTitle, null, true);
    this._dataDisplayDelegate = dataDisplayDelegate;
    this._profileTreeElements = [];
    this._profileGroups = {};
    this.hidden = true;
}

/**
 * @constructor
 */
WebInspector.ProfileTypeSidebarSection.ProfileGroup = function()
{
    this.profileSidebarTreeElements = [];
    this.sidebarTreeElement = null;
}

WebInspector.ProfileTypeSidebarSection.prototype = {
    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    addProfileHeader: function(profile)
    {
        this.hidden = false;
        var profileType = profile.profileType();
        var sidebarParent = this;
        var profileTreeElement = profile.createSidebarTreeElement(this._dataDisplayDelegate);
        this._profileTreeElements.push(profileTreeElement);

        if (!profile.fromFile() && profileType.profileBeingRecorded() !== profile) {
            var profileTitle = profile.title;
            var group = this._profileGroups[profileTitle];
            if (!group) {
                group = new WebInspector.ProfileTypeSidebarSection.ProfileGroup();
                this._profileGroups[profileTitle] = group;
            }
            group.profileSidebarTreeElements.push(profileTreeElement);

            var groupSize = group.profileSidebarTreeElements.length;
            if (groupSize === 2) {
                // Make a group TreeElement now that there are 2 profiles.
                group.sidebarTreeElement = new WebInspector.ProfileGroupSidebarTreeElement(this._dataDisplayDelegate, profile.title);

                var firstProfileTreeElement = group.profileSidebarTreeElements[0];
                // Insert at the same index for the first profile of the group.
                var index = this.children.indexOf(firstProfileTreeElement);
                this.insertChild(group.sidebarTreeElement, index);

                // Move the first profile to the group.
                var selected = firstProfileTreeElement.selected;
                this.removeChild(firstProfileTreeElement);
                group.sidebarTreeElement.appendChild(firstProfileTreeElement);
                if (selected)
                    firstProfileTreeElement.revealAndSelect();

                firstProfileTreeElement.small = true;
                firstProfileTreeElement.mainTitle = WebInspector.UIString("Run %d", 1);

                this.treeOutline.element.classList.add("some-expandable");
            }

            if (groupSize >= 2) {
                sidebarParent = group.sidebarTreeElement;
                profileTreeElement.small = true;
                profileTreeElement.mainTitle = WebInspector.UIString("Run %d", groupSize);
            }
        }

        sidebarParent.appendChild(profileTreeElement);
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {boolean}
     */
    removeProfileHeader: function(profile)
    {
        var index = this._sidebarElementIndex(profile);
        if (index === -1)
            return false;
        var profileTreeElement = this._profileTreeElements[index];
        this._profileTreeElements.splice(index, 1);

        var sidebarParent = this;
        var group = this._profileGroups[profile.title];
        if (group) {
            var groupElements = group.profileSidebarTreeElements;
            groupElements.splice(groupElements.indexOf(profileTreeElement), 1);
            if (groupElements.length === 1) {
                // Move the last profile out of its group and remove the group.
                var pos = sidebarParent.children.indexOf(group.sidebarTreeElement);
                this.insertChild(groupElements[0], pos);
                groupElements[0].small = false;
                groupElements[0].mainTitle = group.sidebarTreeElement.title;
                this.removeChild(group.sidebarTreeElement);
            }
            if (groupElements.length !== 0)
                sidebarParent = group.sidebarTreeElement;
        }
        sidebarParent.removeChild(profileTreeElement);
        profileTreeElement.dispose();

        if (this.children.length)
            return false;
        this.hidden = true;
        return true;
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {?WebInspector.ProfileSidebarTreeElement}
     */
    sidebarElementForProfile: function(profile)
    {
        var index = this._sidebarElementIndex(profile);
        return index === -1 ? null : this._profileTreeElements[index];
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {number}
     */
    _sidebarElementIndex: function(profile)
    {
        var elements = this._profileTreeElements;
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].profile === profile)
                return i;
        }
        return -1;
    },

    __proto__: WebInspector.SidebarSectionTreeElement.prototype
}


/**
 * @constructor
 * @implements {WebInspector.ContextMenu.Provider}
 */
WebInspector.ProfilesPanel.ContextMenuProvider = function()
{
}

WebInspector.ProfilesPanel.ContextMenuProvider.prototype = {
    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        WebInspector.inspectorView.panel("profiles").appendApplicableItems(event, contextMenu, target);
    }
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
 * @param {!WebInspector.ProfileHeader} profile
 * @param {string} className
 */
WebInspector.ProfileSidebarTreeElement = function(dataDisplayDelegate, profile, className)
{
    this._dataDisplayDelegate = dataDisplayDelegate;
    this.profile = profile;
    WebInspector.SidebarTreeElement.call(this, className, profile.title, "", profile, false);
    this.refreshTitles();
    profile.addEventListener(WebInspector.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
    if (profile.canSaveToFile())
        this._createSaveLink();
    else
        profile.addEventListener(WebInspector.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
}

WebInspector.ProfileSidebarTreeElement.prototype = {
    _createSaveLink: function()
    {
        this._saveLinkElement = this.titleContainer.createChild("span", "save-link");
        this._saveLinkElement.textContent = WebInspector.UIString("Save");
        this._saveLinkElement.addEventListener("click", this._saveProfile.bind(this), false);
    },

    _onProfileReceived: function(event)
    {
        this._createSaveLink();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateStatus: function(event)
    {
        var statusUpdate = event.data;
        if (statusUpdate.subtitle !== null)
            this.subtitle = statusUpdate.subtitle;
        if (typeof statusUpdate.wait === "boolean")
            this.wait = statusUpdate.wait;
        this.refreshTitles();
    },

    dispose: function()
    {
        this.profile.removeEventListener(WebInspector.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
        this.profile.removeEventListener(WebInspector.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
    },

    onselect: function()
    {
        this._dataDisplayDelegate.showProfile(this.profile);
    },

    /**
     * @return {boolean}
     */
    ondelete: function()
    {
        this.profile.profileType().removeProfile(this.profile);
        return true;
    },

    /**
     * @param {!Event} event
     * @param {!WebInspector.ProfilesPanel} panel
     */
    handleContextMenuEvent: function(event, panel)
    {
        var profile = this.profile;
        var contextMenu = new WebInspector.ContextMenu(event);
        // FIXME: use context menu provider
        contextMenu.appendItem(WebInspector.UIString("Load\u2026"), panel._fileSelectorElement.click.bind(panel._fileSelectorElement));
        if (profile.canSaveToFile())
            contextMenu.appendItem(WebInspector.UIString("Save\u2026"), profile.saveToFile.bind(profile));
        contextMenu.appendItem(WebInspector.UIString("Delete"), this.ondelete.bind(this));
        contextMenu.show();
    },

    _saveProfile: function(event)
    {
        this.profile.saveToFile();
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
 * @param {string} title
 * @param {string=} subtitle
 */
WebInspector.ProfileGroupSidebarTreeElement = function(dataDisplayDelegate, title, subtitle)
{
    WebInspector.SidebarTreeElement.call(this, "profile-group-sidebar-tree-item", title, subtitle, null, true);
    this._dataDisplayDelegate = dataDisplayDelegate;
}

WebInspector.ProfileGroupSidebarTreeElement.prototype = {
    onselect: function()
    {
        if (this.children.length > 0)
            this._dataDisplayDelegate.showProfile(this.children[this.children.length - 1].profile);
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.ProfilesPanel} panel
 */
WebInspector.ProfilesSidebarTreeElement = function(panel)
{
    this._panel = panel;
    this.small = false;

    WebInspector.SidebarTreeElement.call(this, "profile-launcher-view-tree-item", WebInspector.UIString("Profiles"), "", null, false);
}

WebInspector.ProfilesSidebarTreeElement.prototype = {
    onselect: function()
    {
        this._panel._showLauncherView();
    },

    get selectable()
    {
        return true;
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}


importScript("../sdk/CPUProfileModel.js");
importScript("CPUProfileDataGrid.js");
importScript("CPUProfileBottomUpDataGrid.js");
importScript("CPUProfileTopDownDataGrid.js");
importScript("CPUProfileFlameChart.js");
importScript("CPUProfileView.js");
importScript("HeapSnapshotCommon.js");
importScript("HeapSnapshotProxy.js");
importScript("HeapSnapshotDataGrids.js");
importScript("HeapSnapshotGridNodes.js");
importScript("HeapSnapshotView.js");
importScript("ProfileLauncherView.js");
importScript("CanvasProfileView.js");
importScript("CanvasReplayStateView.js");

WebInspector.ProfileTypeRegistry.instance = new WebInspector.ProfileTypeRegistry();
