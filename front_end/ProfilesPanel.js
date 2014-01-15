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
    this._id = id;
    this._name = name;
    /** @type {!Array.<!WebInspector.ProfileHeader>} */
    this._profiles = [];
    /** @type {?WebInspector.SidebarSectionTreeElement} */
    this.treeElement = null;
    /** @type {?WebInspector.ProfileHeader} */
    this._profileBeingRecorded = null;

    window.addEventListener("unload", this._clearTempStorage.bind(this), false);
}

WebInspector.ProfileType.Events = {
    AddProfileHeader: "add-profile-header",
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
        this._profileBeingRecorded = profile;
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
        if (this._profileBeingRecorded === profile)
            this._profileBeingRecorded = null;
        for (var i = 0; i < this._profiles.length; ++i) {
            if (this._profiles[i].uid === profile.uid) {
                this._profiles.splice(i, 1);
                break;
            }
        }
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

    _reset: function()
    {
        var profiles = this._profiles.slice(0);
        for (var i = 0; i < profiles.length; ++i) {
            var profile = profiles[i];
            var view = profile.existingView();
            if (view) {
                view.detach();
                if ("dispose" in view)
                    view.dispose();
            }
            this.dispatchEventToListeners(WebInspector.ProfileType.Events.RemoveProfileHeader, profile);
        }
        this.treeElement.removeChildren();
        this._profiles = [];
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ProfileType} profileType
 * @param {string} title
 * @param {number=} uid
 */
WebInspector.ProfileHeader = function(profileType, title, uid)
{
    this._profileType = profileType;
    this.title = title;
    this.uid = (uid === undefined) ? -1 : uid;
    this._fromFile = false;
}

WebInspector.ProfileHeader._nextProfileFromFileUid = 1;

WebInspector.ProfileHeader.prototype = {
    /**
     * @return {!WebInspector.ProfileType}
     */
    profileType: function()
    {
        return this._profileType;
    },

    /**
     * Must be implemented by subclasses.
     * @return {!WebInspector.ProfileSidebarTreeElement}
     */
    createSidebarTreeElement: function()
    {
        throw new Error("Needs implemented.");
    },

    /**
     * @return {?WebInspector.View}
     */
    existingView: function()
    {
        return this._view;
    },

    /**
     * @param {!WebInspector.ProfilesPanel} panel
     * @return {!WebInspector.View}
     */
    view: function(panel)
    {
        if (!this._view)
            this._view = this.createView(panel);
        return this._view;
    },

    /**
     * @param {!WebInspector.ProfilesPanel} panel
     * @return {!WebInspector.View}
     */
    createView: function(panel)
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
        this.uid = "From file #" + WebInspector.ProfileHeader._nextProfileFromFileUid++;
    }
}

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.ContextMenu.Provider}
 * @extends {WebInspector.Panel}
 * @param {string=} name
 * @param {!WebInspector.ProfileType=} type
 */
WebInspector.ProfilesPanel = function(name, type)
{
    // If the name is not specified the ProfilesPanel works in multi-profile mode.
    var singleProfileMode = typeof name !== "undefined";
    name = name || "profiles";
    WebInspector.Panel.call(this, name);
    this.registerRequiredCSS("panelEnablerView.css");
    this.registerRequiredCSS("heapProfiler.css");
    this.registerRequiredCSS("profilesPanel.css");

    this.createSidebarViewWithTree();

    this.splitView.mainElement().classList.add("vbox");
    this.splitView.sidebarElement().classList.add("vbox");

    this._searchableView = new WebInspector.SearchableView(this);
    this.splitView.setMainView(this._searchableView);

    this.profilesItemTreeElement = new WebInspector.ProfilesSidebarTreeElement(this);
    this.sidebarTree.appendChild(this.profilesItemTreeElement);

    this._singleProfileMode = singleProfileMode;
    this._profileTypesByIdMap = {};

    this.profileViews = document.createElement("div");
    this.profileViews.id = "profile-views";
    this.profileViews.classList.add("vbox");
    this._searchableView.element.appendChild(this.profileViews);

    var statusBarContainer = this.splitView.mainElement().createChild("div", "profiles-status-bar");
    this._statusBarElement = statusBarContainer.createChild("div", "status-bar");

    var sidebarTreeBox = this.splitView.sidebarElement().createChild("div", "profiles-sidebar-tree-box");
    sidebarTreeBox.appendChild(this.sidebarTreeElement);
    var statusBarContainerLeft = this.splitView.sidebarElement().createChild("div", "profiles-status-bar");
    this._statusBarButtons = statusBarContainerLeft.createChild("div", "status-bar");

    this.recordButton = new WebInspector.StatusBarButton("", "record-profile-status-bar-item");
    this.recordButton.addEventListener("click", this.toggleRecordButton, this);
    this._statusBarButtons.appendChild(this.recordButton.element);

    this.clearResultsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear all profiles."), "clear-status-bar-item");
    this.clearResultsButton.addEventListener("click", this._clearProfiles, this);
    this._statusBarButtons.appendChild(this.clearResultsButton.element);

    this._profileTypeStatusBarItemsContainer = this._statusBarElement.createChild("div");
    this._profileViewStatusBarItemsContainer = this._statusBarElement.createChild("div");

    if (singleProfileMode) {
        this._launcherView = this._createLauncherView();
        this._registerProfileType(/** @type {!WebInspector.ProfileType} */ (type));
        this._selectedProfileType = type;
        this._updateProfileTypeSpecificUI();
    } else {
        this._launcherView = new WebInspector.MultiProfileLauncherView(this);
        this._launcherView.addEventListener(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, this._onProfileTypeSelected, this);

        this._registerProfileType(new WebInspector.CPUProfileType());
        this._registerProfileType(new WebInspector.HeapSnapshotProfileType());
        this._registerProfileType(new WebInspector.TrackingHeapSnapshotProfileType(this));
        if (!WebInspector.WorkerManager.isWorkerFrontend() && WebInspector.experimentsSettings.canvasInspection.isEnabled())
            this._registerProfileType(new WebInspector.CanvasProfileType());
        this._launcherView.restoreSelectedProfileType();
    }

    this._reset();

    this._createFileSelectorElement();
    this.element.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);
    this._registerShortcuts();

    WebInspector.ContextMenu.registerProvider(this);

    this._configureCpuProfilerSamplingInterval();
    WebInspector.settings.highResolutionCpuProfiling.addChangeListener(this._configureCpuProfilerSamplingInterval, this);
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

    /**
     * @return {!WebInspector.ProfileLauncherView}
     */
    _createLauncherView: function()
    {
        return new WebInspector.ProfileLauncherView(this);
    },

    _findProfileTypeByExtension: function(fileName)
    {
        for (var id in this._profileTypesByIdMap) {
            var type = this._profileTypesByIdMap[id];
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
        this.registerShortcuts(WebInspector.ProfilesPanelDescriptor.ShortcutKeys.StartStopRecording, this.toggleRecordButton.bind(this));
    },

    _configureCpuProfilerSamplingInterval: function()
    {
        var intervalUs = WebInspector.settings.highResolutionCpuProfiling.get() ? 100 : 1000;
        ProfilerAgent.setSamplingInterval(intervalUs, didChangeInterval.bind(this));
        function didChangeInterval(error)
        {
            if (error)
                WebInspector.showErrorMessage(error)
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
            for (var id in this._profileTypesByIdMap) {
                var extension = this._profileTypesByIdMap[id].fileExtension();
                if (!extension)
                    continue;
                extensions.push(extension);
            }
            WebInspector.log(WebInspector.UIString("Can't load file. Only files with extensions '%s' can be loaded.", extensions.join("', '")));
            return;
        }

        if (!!profileType.profileBeingRecorded()) {
            WebInspector.log(WebInspector.UIString("Can't load profile when other profile is recording."));
            return;
        }

        profileType.loadFromFile(file);
    },

    /**
     * @return {boolean}
     */
    toggleRecordButton: function()
    {
        var type = this._selectedProfileType;
        var isProfiling = type.buttonClicked();
        this.recordButton.toggled = isProfiling;
        this.recordButton.title = type.buttonTooltip;
        if (isProfiling) {
            this._launcherView.profileStarted();
            if (type.hasTemporaryView())
                this._showProfile(type.profileBeingRecorded());
        } else {
            this._launcherView.profileFinished();
        }
        return true;
    },

    _profileBeingRecordedRemoved: function()
    {
        this.recordButton.toggled = false;
        this.recordButton.title = this._selectedProfileType.buttonTooltip;
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
        this.recordButton.title = this._selectedProfileType.buttonTooltip;
        this._launcherView.updateProfileType(this._selectedProfileType);
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

        for (var typeId in this._profileTypesByIdMap)
            this._profileTypesByIdMap[typeId]._reset();

        delete this.visibleView;
        delete this.currentQuery;
        this.searchCanceled();

        this._profileGroups = {};
        this.recordButton.toggled = false;
        if (this._selectedProfileType)
            this.recordButton.title = this._selectedProfileType.buttonTooltip;
        this._launcherView.profileFinished();

        this.sidebarTreeElement.classList.remove("some-expandable");

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

    _clearProfiles: function()
    {
        HeapProfilerAgent.clearProfiles();
        this._reset();
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
        this._profileTypesByIdMap[profileType.id] = profileType;
        this._launcherView.addProfileType(profileType);
        profileType.treeElement = new WebInspector.SidebarSectionTreeElement(profileType.treeItemTitle, null, true);
        profileType.treeElement.hidden = !this._singleProfileMode;
        this.sidebarTree.appendChild(profileType.treeElement);
        profileType.treeElement.childrenListElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), true);

        /**
         * @this {WebInspector.ProfilesPanel}
         */
        function onAddProfileHeader(event)
        {
            this._addProfileHeader(event.data);
        }

        /**
         * @this {WebInspector.ProfilesPanel}
         */
        function onRemoveProfileHeader(event)
        {
            this._removeProfileHeader(event.data);
        }

        profileType.addEventListener(WebInspector.ProfileType.Events.ViewUpdated, this._updateProfileTypeSpecificUI, this);
        profileType.addEventListener(WebInspector.ProfileType.Events.AddProfileHeader, onAddProfileHeader, this);
        profileType.addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, onRemoveProfileHeader, this);
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
        if (element !== this.element || event.srcElement === this.splitView.sidebarElement()) {
            contextMenu.appendItem(WebInspector.UIString("Load\u2026"), this._fileSelectorElement.click.bind(this._fileSelectorElement));
        }
        contextMenu.show();
    },

    /**
     * @nosideeffects
     * @param {string} text
     * @param {string} profileTypeId
     * @return {string}
     */
    _makeTitleKey: function(text, profileTypeId)
    {
        return escape(text) + '/' + escape(profileTypeId);
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    _addProfileHeader: function(profile)
    {
        var profileType = profile.profileType();
        var typeId = profileType.id;
        var sidebarParent = profileType.treeElement;
        sidebarParent.hidden = false;
        var small = false;
        var alternateTitle;

        if (!profile.fromFile() && profile.profileType().profileBeingRecorded() !== profile) {
            var profileTitleKey = this._makeTitleKey(profile.title, typeId);
            if (!(profileTitleKey in this._profileGroups))
                this._profileGroups[profileTitleKey] = [];

            var group = this._profileGroups[profileTitleKey];
            group.push(profile);
            if (group.length === 2) {
                // Make a group TreeElement now that there are 2 profiles.
                group._profilesTreeElement = new WebInspector.ProfileGroupSidebarTreeElement(this, profile.title);

                // Insert at the same index for the first profile of the group.
                var index = sidebarParent.children.indexOf(group[0]._profilesTreeElement);
                sidebarParent.insertChild(group._profilesTreeElement, index);

                // Move the first profile to the group.
                var selected = group[0]._profilesTreeElement.selected;
                sidebarParent.removeChild(group[0]._profilesTreeElement);
                group._profilesTreeElement.appendChild(group[0]._profilesTreeElement);
                if (selected)
                    group[0]._profilesTreeElement.revealAndSelect();

                group[0]._profilesTreeElement.small = true;
                group[0]._profilesTreeElement.mainTitle = WebInspector.UIString("Run %d", 1);

                this.sidebarTreeElement.classList.add("some-expandable");
            }

            if (group.length >= 2) {
                sidebarParent = group._profilesTreeElement;
                alternateTitle = WebInspector.UIString("Run %d", group.length);
                small = true;
            }
        }

        var profileTreeElement = profile.createSidebarTreeElement();
        profile.sidebarElement = profileTreeElement;
        profileTreeElement.small = small;
        if (alternateTitle)
            profileTreeElement.mainTitle = alternateTitle;
        profile._profilesTreeElement = profileTreeElement;

        sidebarParent.appendChild(profileTreeElement);
        if (!this.visibleView || this.visibleView === this._launcherView)
            this._showProfile(profile);
    },

    /**
     * @param {!WebInspector.ProfileHeader} profile
     */
    _removeProfileHeader: function(profile)
    {
        if (profile.profileType()._profileBeingRecorded === profile)
            this._profileBeingRecordedRemoved();
        profile.dispose();
        profile.profileType().removeProfile(profile);

        var sidebarParent = profile.profileType().treeElement;
        var profileTitleKey = this._makeTitleKey(profile.title, profile.profileType().id);
        var group = this._profileGroups[profileTitleKey];
        if (group) {
            group.splice(group.indexOf(profile), 1);
            if (group.length === 1) {
                // Move the last profile out of its group and remove the group.
                var index = sidebarParent.children.indexOf(group._profilesTreeElement);
                sidebarParent.insertChild(group[0]._profilesTreeElement, index);
                group[0]._profilesTreeElement.small = false;
                group[0]._profilesTreeElement.mainTitle = group[0].title;
                sidebarParent.removeChild(group._profilesTreeElement);
            }
            if (group.length !== 0)
                sidebarParent = group._profilesTreeElement;
            else
                delete this._profileGroups[profileTitleKey];
        }
        sidebarParent.removeChild(profile._profilesTreeElement);

        // No other item will be selected if there aren't any other profiles, so
        // make sure that view gets cleared when the last profile is removed.
        if (!sidebarParent.children.length) {
            this.profilesItemTreeElement.select();
            this._showLauncherView();
            sidebarParent.hidden = !this._singleProfileMode;
        }
    },

    /**
     * @param {?WebInspector.ProfileHeader} profile
     * @return {?WebInspector.View}
     */
    _showProfile: function(profile)
    {
        if (!profile || (profile.profileType().profileBeingRecorded() === profile) && !profile.profileType().hasTemporaryView())
            return null;

        var view = profile.view(this);
        if (view === this.visibleView)
            return view;

        this.closeVisibleView();

        view.show(this.profileViews);

        profile._profilesTreeElement._suppressOnSelect = true;
        profile._profilesTreeElement.revealAndSelect();
        delete profile._profilesTreeElement._suppressOnSelect;

        this.visibleView = view;

        this._profileViewStatusBarItemsContainer.removeChildren();

        var statusBarItems = view.statusBarItems;
        if (statusBarItems)
            for (var i = 0; i < statusBarItems.length; ++i)
                this._profileViewStatusBarItemsContainer.appendChild(statusBarItems[i]);

        return view;
    },

    /**
     * @param {!HeapProfilerAgent.HeapSnapshotObjectId} snapshotObjectId
     * @param {string} viewName
     */
    showObject: function(snapshotObjectId, viewName)
    {
        var heapProfiles = this.getProfileType(WebInspector.HeapSnapshotProfileType.TypeId).getProfiles();
        for (var i = 0; i < heapProfiles.length; i++) {
            var profile = heapProfiles[i];
            // FIXME: allow to choose snapshot if there are several options.
            if (profile.maxJSObjectId >= snapshotObjectId) {
                this._showProfile(profile);
                var view = profile.view(this);
                view.changeView(viewName, function() {
                    function didHighlightObject(found) {
                        if (!found)
                            WebInspector.log("Cannot find corresponding heap snapshot node", WebInspector.ConsoleMessage.MessageLevel.Error, true);
                    }
                    view.dataGrid.highlightObjectByHeapSnapshotId(snapshotObjectId, didHighlightObject.bind(this));
                });
                break;
            }
        }
    },

    /**
     * @param {string} typeId
     * @param {number} uid
     * @return {?WebInspector.ProfileHeader}
     */
    getProfile: function(typeId, uid)
    {
        return this.getProfileType(typeId).getProfile(uid);
    },

    /**
     * @param {!WebInspector.View} view
     */
    showView: function(view)
    {
        this._showProfile(view.profile);
    },

    /**
     * @param {string} typeId
     * @return {!WebInspector.ProfileType}
     */
    getProfileType: function(typeId)
    {
        return this._profileTypesByIdMap[typeId];
    },

    /**
     * @param {string} typeId
     * @param {string} uid
     * @return {?WebInspector.View}
     */
    showProfile: function(typeId, uid)
    {
        return this._showProfile(this.getProfile(typeId, Number(uid)));
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
     */
    performSearch: function(query, shouldJump)
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

    /**
     * @return {!Array.<!WebInspector.ProfileHeader>}
     */
    _getAllProfiles: function()
    {
        var profiles = [];
        for (var typeId in this._profileTypesByIdMap)
            profiles = profiles.concat(this._profileTypesByIdMap[typeId].getProfiles());
        return profiles;
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
     * @param {!WebInspector.ProfileHeader} profile
     * @param {number} done
     * @param {number} total
     */
    _reportProfileProgress: function(profile, done, total)
    {
        profile.sidebarElement.subtitle = WebInspector.UIString("%.0f%", (done / total) * 100);
        profile.sidebarElement.wait = true;
    },

    /** 
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        if (WebInspector.inspectorView.currentPanel() !== this)
            return;

        var object = /** @type {!WebInspector.RemoteObject} */ (target);
        var objectId = object.objectId;
        if (!objectId)
            return;

        var heapProfiles = this.getProfileType(WebInspector.HeapSnapshotProfileType.TypeId).getProfiles();
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

        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Dominators view" : "Reveal in Dominators View"), revealInView.bind(this, "Dominators"));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Summary view" : "Reveal in Summary View"), revealInView.bind(this, "Summary"));
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.ProfileHeader} profile
 * @param {string} className
 */
WebInspector.ProfileSidebarTreeElement = function(profile, className)
{
    this.profile = profile;
    WebInspector.SidebarTreeElement.call(this, className, "", "", profile, false);
    this.refreshTitles();
}

WebInspector.ProfileSidebarTreeElement.prototype = {
    onselect: function()
    {
        if (!this._suppressOnSelect)
            this.treeOutline.panel._showProfile(this.profile);
    },

    /**
     * @return {boolean}
     */
    ondelete: function()
    {
        this.treeOutline.panel._removeProfileHeader(this.profile);
        return true;
    },

    get mainTitle()
    {
        if (this._mainTitle)
            return this._mainTitle;
        return this.profile.title;
    },

    set mainTitle(x)
    {
        this._mainTitle = x;
        this.refreshTitles();
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

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {!WebInspector.ProfilesPanel} panel
 * @param {string} title
 * @param {string=} subtitle
 */
WebInspector.ProfileGroupSidebarTreeElement = function(panel, title, subtitle)
{
    WebInspector.SidebarTreeElement.call(this, "profile-group-sidebar-tree-item", title, subtitle, null, true);
    this._panel = panel;
}

WebInspector.ProfileGroupSidebarTreeElement.prototype = {
    onselect: function()
    {
        if (this.children.length > 0)
            this._panel._showProfile(this.children[this.children.length - 1].profile);
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


/**
 * @constructor
 * @extends {WebInspector.ProfilesPanel}
 */
WebInspector.CPUProfilerPanel = function()
{
    WebInspector.ProfilesPanel.call(this, "cpu-profiler", new WebInspector.CPUProfileType());
}

WebInspector.CPUProfilerPanel.prototype = {
    __proto__: WebInspector.ProfilesPanel.prototype
}


/**
 * @constructor
 * @extends {WebInspector.ProfilesPanel}
 */
WebInspector.HeapProfilerPanel = function()
{
    var heapSnapshotProfileType = new WebInspector.HeapSnapshotProfileType();
    WebInspector.ProfilesPanel.call(this, "heap-profiler", heapSnapshotProfileType);
    this._singleProfileMode = false;
    this._registerProfileType(new WebInspector.TrackingHeapSnapshotProfileType(this));
    this._launcherView.addEventListener(WebInspector.MultiProfileLauncherView.EventTypes.ProfileTypeSelected, this._onProfileTypeSelected, this);
    this._launcherView._profileTypeChanged(heapSnapshotProfileType);
}

WebInspector.HeapProfilerPanel.prototype = {
    _createLauncherView: function()
    {
        return new WebInspector.MultiProfileLauncherView(this);
    },

    __proto__: WebInspector.ProfilesPanel.prototype
}


/**
 * @constructor
 * @extends {WebInspector.ProfilesPanel}
 */
WebInspector.CanvasProfilerPanel = function()
{
    WebInspector.ProfilesPanel.call(this, "canvas-profiler", new WebInspector.CanvasProfileType());
}

WebInspector.CanvasProfilerPanel.prototype = {
    __proto__: WebInspector.ProfilesPanel.prototype
}


importScript("ProfileDataGridTree.js");
importScript("AllocationProfile.js");
importScript("BottomUpProfileDataGridTree.js");
importScript("CPUProfileView.js");
importScript("HeapSnapshot.js");
importScript("HeapSnapshotProxy.js");
importScript("HeapSnapshotDataGrids.js");
importScript("HeapSnapshotGridNodes.js");
importScript("HeapSnapshotLoader.js");
importScript("HeapSnapshotView.js");
importScript("HeapSnapshotWorkerDispatcher.js");
importScript("JSHeapSnapshot.js");
importScript("ProfileLauncherView.js");
importScript("TopDownProfileDataGridTree.js");
importScript("CanvasProfileView.js");
importScript("CanvasReplayStateView.js");
