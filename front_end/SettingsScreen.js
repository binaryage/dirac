/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {!function()} onHide
 * @extends {WebInspector.HelpScreen}
 */
WebInspector.SettingsScreen = function(onHide)
{
    WebInspector.HelpScreen.call(this);
    this.element.id = "settings-screen";

    /** @type {function()} */
    this._onHide = onHide;

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.element.addStyleClass("help-window-main");
    var settingsLabelElement = document.createElement("div");
    settingsLabelElement.className = "help-window-label";
    settingsLabelElement.createTextChild(WebInspector.UIString("Settings"));
    this._tabbedPane.element.insertBefore(settingsLabelElement, this._tabbedPane.element.firstChild);
    this._tabbedPane.element.appendChild(this._createCloseButton());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.General, WebInspector.UIString("General"), new WebInspector.GenericSettingsTab());
    if (!WebInspector.experimentsSettings.showOverridesInDrawer.isEnabled())
        this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Overrides, WebInspector.UIString("Overrides"), new WebInspector.OverridesSettingsTab());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Workspace, WebInspector.UIString("Workspace"), new WebInspector.WorkspaceSettingsTab());
    if (WebInspector.experimentsSettings.tethering.isEnabled())
        this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Tethering, WebInspector.UIString("Port forwarding"), new WebInspector.TetheringSettingsTab());
    if (WebInspector.experimentsSettings.experimentsEnabled)
        this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Experiments, WebInspector.UIString("Experiments"), new WebInspector.ExperimentsSettingsTab());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Shortcuts, WebInspector.UIString("Shortcuts"), WebInspector.shortcutsScreen.createShortcutsTabView());
    this._tabbedPane.shrinkableTabs = false;
    this._tabbedPane.verticalTabLayout = true;

    this._lastSelectedTabSetting = WebInspector.settings.createSetting("lastSelectedSettingsTab", WebInspector.SettingsScreen.Tabs.General);
    this.selectTab(this._lastSelectedTabSetting.get());
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
}

WebInspector.SettingsScreen.Tabs = {
    General: "general",
    Overrides: "overrides",
    Workspace: "workspace",
    Tethering: "tethering",
    Experiments: "experiments",
    Shortcuts: "shortcuts"
}

WebInspector.SettingsScreen.prototype = {
    /**
     * @param {string} tabId
     */
    selectTab: function(tabId)
    {
        this._tabbedPane.selectTab(tabId);
    },

    /**
     * @param {WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._tabbedPane.show(this.element);
        WebInspector.HelpScreen.prototype.wasShown.call(this);
    },

    /**
     * @override
     */
    isClosingKey: function(keyCode)
    {
        return [
            WebInspector.KeyboardShortcut.Keys.Enter.code,
            WebInspector.KeyboardShortcut.Keys.Esc.code,
        ].indexOf(keyCode) >= 0;
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._onHide();
        WebInspector.HelpScreen.prototype.willHide.call(this);
    },

    __proto__: WebInspector.HelpScreen.prototype
}

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {string} name
 * @param {string=} id
 */
WebInspector.SettingsTab = function(name, id)
{
    WebInspector.View.call(this);
    this.element.className = "settings-tab-container";
    if (id)
        this.element.id = id;
    var header = this.element.createChild("header");
    header.createChild("h3").appendChild(document.createTextNode(name));
    this.containerElement = this.element.createChild("div", "help-container-wrapper").createChild("div", "settings-tab help-content help-container");
}

WebInspector.SettingsTab.prototype = {
    /**
     *  @param {string=} name
     *  @return {!Element}
     */
    _appendSection: function(name)
    {
        var block = this.containerElement.createChild("div", "help-block");
        if (name)
            block.createChild("div", "help-section-title").textContent = name;
        return block;
    },

    /**
     * @param {boolean=} omitParagraphElement
     * @param {Element=} inputElement
     * @param {string=} tooltip
     */
    _createCheckboxSetting: function(name, setting, omitParagraphElement, inputElement, tooltip)
    {
        var input = inputElement || document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.checked = setting.get();

        function listener()
        {
            setting.set(input.checked);
        }
        input.addEventListener("click", listener, false);

        var label = document.createElement("label");
        label.appendChild(input);
        label.appendChild(document.createTextNode(name));
        if (tooltip)
            label.title = tooltip;

        if (omitParagraphElement)
            return label;

        var p = document.createElement("p");
        p.appendChild(label);
        return p;
    },

    _createSelectSetting: function(name, options, setting)
    {
        var fieldsetElement = document.createElement("fieldset");
        fieldsetElement.createChild("label").textContent = name;

        var select = document.createElement("select");
        var settingValue = setting.get();

        for (var i = 0; i < options.length; ++i) {
            var option = options[i];
            select.add(new Option(option[0], option[1]));
            if (settingValue === option[1])
                select.selectedIndex = i;
        }

        function changeListener(e)
        {
            setting.set(e.target.value);
        }

        select.addEventListener("change", changeListener, false);
        fieldsetElement.appendChild(select);

        var p = document.createElement("p");
        p.appendChild(fieldsetElement);
        return p;
    },

    /**
     * @param {string} label
     * @param {WebInspector.Setting} setting
     * @param {boolean} numeric
     * @param {number=} maxLength
     * @param {string=} width
     * @param {function(string):boolean=} validatorCallback
     */
    _createInputSetting: function(label, setting, numeric, maxLength, width, validatorCallback)
    {
        var fieldset = document.createElement("fieldset");
        var p = fieldset.createChild("p");
        var labelElement = p.createChild("label");
        labelElement.textContent = label + " ";
        var inputElement = labelElement.createChild("input");
        inputElement.value = setting.get();
        inputElement.type = "text";
        if (numeric)
            inputElement.className = "numeric";
        if (maxLength)
            inputElement.maxLength = maxLength;
        if (width)
            inputElement.style.width = width;

        function onBlur()
        {
            if (validatorCallback && !validatorCallback(inputElement.value)) {
                inputElement.value = setting.get();
                return;
            }
            setting.set(numeric ? Number(inputElement.value) : inputElement.value);
        }
        inputElement.addEventListener("blur", onBlur, false);
        return fieldset;
    },

    _createCustomSetting: function(name, element)
    {
        var p = document.createElement("p");
        var fieldsetElement = document.createElement("fieldset");
        fieldsetElement.createChild("label").textContent = name;
        fieldsetElement.appendChild(element);
        p.appendChild(fieldsetElement);
        return p;
    },

    __proto__: WebInspector.View.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.GenericSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("General"), "general-tab-content");

    var p = this._appendSection();
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Disable cache (while DevTools is open)"), WebInspector.settings.cacheDisabled));
    var disableJSElement = this._createCheckboxSetting(WebInspector.UIString("Disable JavaScript"), WebInspector.settings.javaScriptDisabled);
    p.appendChild(disableJSElement);
    WebInspector.settings.javaScriptDisabled.addChangeListener(this._javaScriptDisabledChanged, this);
    this._disableJSCheckbox = disableJSElement.getElementsByTagName("input")[0];
    this._updateScriptDisabledCheckbox();

    p = this._appendSection(WebInspector.UIString("Appearance"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show toolbar icons"), WebInspector.settings.showToolbarIcons));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Split panels vertically when docked to right"), WebInspector.settings.splitVerticallyWhenDockedToRight));

    p = this._appendSection(WebInspector.UIString("Elements"));
    var colorFormatElement = this._createSelectSetting(WebInspector.UIString("Color format"), [
            [ WebInspector.UIString("As authored"), WebInspector.Color.Format.Original ],
            [ "HEX: #DAC0DE", WebInspector.Color.Format.HEX ],
            [ "RGB: rgb(128, 255, 255)", WebInspector.Color.Format.RGB ],
            [ "HSL: hsl(300, 80%, 90%)", WebInspector.Color.Format.HSL ]
        ], WebInspector.settings.colorFormat);
    p.appendChild(colorFormatElement);
    colorFormatElement.firstChild.className = "toplevel";
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show user agent styles"), WebInspector.settings.showUserAgentStyles));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Word wrap"), WebInspector.settings.domWordWrap));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show Shadow DOM"), WebInspector.settings.showShadowDOM));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show rulers"), WebInspector.settings.showMetricsRulers));

    p = this._appendSection(WebInspector.UIString("Rendering"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show paint rectangles"), WebInspector.settings.showPaintRects));
    this._forceCompositingModeCheckbox = document.createElement("input");
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Force accelerated compositing"), WebInspector.settings.forceCompositingMode, false, this._forceCompositingModeCheckbox));
    WebInspector.settings.forceCompositingMode.addChangeListener(this._forceCompositingModeChanged, this);
    this._compositingModeSettings = p.createChild("fieldset");
    this._showCompositedLayersBordersCheckbox = document.createElement("input");
    this._compositingModeSettings.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show composited layer borders"), WebInspector.settings.showDebugBorders, false, this._showCompositedLayersBordersCheckbox));
    this._showFPSCheckbox = document.createElement("input");
    this._compositingModeSettings.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show FPS meter"), WebInspector.settings.showFPSCounter, false, this._showFPSCheckbox));
    this._continousPaintingCheckbox = document.createElement("input");
    this._compositingModeSettings.appendChild(this._createCheckboxSetting(WebInspector.UIString("Enable continuous page repainting"), WebInspector.settings.continuousPainting, false, this._continousPaintingCheckbox));
    this._showScrollBottleneckRectsCheckbox = document.createElement("input");
    var tooltip = WebInspector.UIString("Shows areas of the page that slow down scrolling:\nTouch and mousewheel event listeners can delay scrolling.\nSome areas need to repaint their content when scrolled.");
    this._compositingModeSettings.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show potential scroll bottlenecks"), WebInspector.settings.showScrollBottleneckRects, false, this._showScrollBottleneckRectsCheckbox, tooltip));
    this._forceCompositingModeChanged();

    p = this._appendSection(WebInspector.UIString("Sources"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Search in content scripts"), WebInspector.settings.searchInContentScripts));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Enable source maps"), WebInspector.settings.sourceMapsEnabled));
    if (WebInspector.experimentsSettings.isEnabled("sass"))
        p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Auto-reload CSS upon Sass save"), WebInspector.settings.cssReloadEnabled));
    var indentationElement = this._createSelectSetting(WebInspector.UIString("Indentation"), [
            [ WebInspector.UIString("Auto-detect"), WebInspector.TextUtils.Indent.AutoDetect ],
            [ WebInspector.UIString("2 spaces"), WebInspector.TextUtils.Indent.TwoSpaces ],
            [ WebInspector.UIString("4 spaces"), WebInspector.TextUtils.Indent.FourSpaces ],
            [ WebInspector.UIString("8 spaces"), WebInspector.TextUtils.Indent.EightSpaces ],
            [ WebInspector.UIString("Tab character"), WebInspector.TextUtils.Indent.TabCharacter ]
        ], WebInspector.settings.textEditorIndent);
    indentationElement.firstChild.className = "toplevel";
    p.appendChild(indentationElement);
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show whitespace characters"), WebInspector.settings.showWhitespacesInEditor));

    p = this._appendSection(WebInspector.UIString("Profiler"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show advanced heap snapshot properties"), WebInspector.settings.showAdvancedHeapSnapshotProperties));
    if (WebInspector.experimentsSettings.nativeMemorySnapshots.isEnabled())
        p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show uninstrumented native memory"), WebInspector.settings.showNativeSnapshotUninstrumentedSize));

    p = this._appendSection(WebInspector.UIString("Timeline"));
    var checkbox = this._createCheckboxSetting(WebInspector.UIString("Limit number of captured JS stack frames"), WebInspector.settings.timelineLimitStackFramesFlag);
    p.appendChild(checkbox);
    var fieldset = this._createInputSetting(WebInspector.UIString("Frames to capture"), WebInspector.settings.timelineStackFramesToCapture, true, 2, "2em");
    fieldset.disabled = !WebInspector.settings.timelineLimitStackFramesFlag.get();
    WebInspector.settings.timelineLimitStackFramesFlag.addChangeListener(this._timelineLimitStackFramesChanged.bind(this, fieldset));
    checkbox.appendChild(fieldset);

    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show CPU activity on the ruler"), WebInspector.settings.showCpuOnTimelineRuler));

    p = this._appendSection(WebInspector.UIString("Console"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Log XMLHttpRequests"), WebInspector.settings.monitoringXHREnabled));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Preserve log upon navigation"), WebInspector.settings.preserveConsoleLog));

    if (WebInspector.extensionServer.hasExtensions()) {
        var handlerSelector = new WebInspector.HandlerSelector(WebInspector.openAnchorLocationRegistry);
        p = this._appendSection(WebInspector.UIString("Extensions"));
        p.appendChild(this._createCustomSetting(WebInspector.UIString("Open links in"), handlerSelector.element));
    }

    p = this._appendSection();
    var panelShortcutTitle = WebInspector.UIString("Enable %s + 1-9 shortcut to switch panels", WebInspector.isMac() ? "Cmd" : "Ctrl");
    p.appendChild(this._createCheckboxSetting(panelShortcutTitle, WebInspector.settings.shortcutPanelSwitch));
}

WebInspector.GenericSettingsTab.prototype = {
    /**
     * @param {WebInspector.Event=} event
     */
    _forceCompositingModeChanged: function(event)
    {
        var compositing = event ? !!event.data : WebInspector.settings.forceCompositingMode.get();
        this._compositingModeSettings.disabled = !compositing
        if (!compositing) {
            this._showFPSCheckbox.checked = false;
            this._continousPaintingCheckbox.checked = false;
            this._showCompositedLayersBordersCheckbox.checked = false;
            this._showScrollBottleneckRectsCheckbox.checked = false;
            WebInspector.settings.showFPSCounter.set(false);
            WebInspector.settings.continuousPainting.set(false);
            WebInspector.settings.showDebugBorders.set(false);
            WebInspector.settings.showScrollBottleneckRects.set(false);
        }
        this._forceCompositingModeCheckbox.checked = compositing;
    },

    /**
     * @param {HTMLFieldSetElement} fieldset
     */
    _timelineLimitStackFramesChanged: function(fieldset)
    {
        fieldset.disabled = !WebInspector.settings.timelineLimitStackFramesFlag.get();
    },

    _updateScriptDisabledCheckbox: function()
    {
        function executionStatusCallback(error, status)
        {
            if (error || !status)
                return;

            switch (status) {
            case "forbidden":
                this._disableJSCheckbox.checked = true;
                this._disableJSCheckbox.disabled = true;
                break;
            case "disabled":
                this._disableJSCheckbox.checked = true;
                break;
            default:
                this._disableJSCheckbox.checked = false;
                break;
            }
        }

        PageAgent.getScriptExecutionStatus(executionStatusCallback.bind(this));
    },

    _javaScriptDisabledChanged: function()
    {
        // We need to manually update the checkbox state, since enabling JavaScript in the page can actually uncover the "forbidden" state.
        PageAgent.setScriptExecutionDisabled(WebInspector.settings.javaScriptDisabled.get(), this._updateScriptDisabledCheckbox.bind(this));
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.OverridesSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Overrides"), "overrides-tab-content");
    this._view = new WebInspector.OverridesView();
    this.containerElement.parentElement.appendChild(this._view.containerElement);
    this.containerElement.remove();
    this.containerElement = this._view.containerElement;
}

WebInspector.OverridesSettingsTab.prototype = {
    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.WorkspaceSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Workspace"), "workspace-tab-content");
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingAdded, this._fileMappingAdded, this);
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingRemoved, this._fileMappingRemoved, this);

    this._fileSystemsSection = this._appendSection(WebInspector.UIString("Folders"));
    this._fileSystemsListContainer = this._fileSystemsSection.createChild("p", "settings-list-container");
    this._addFileSystemRowElement = this._fileSystemsSection.createChild("div");
    var addFileSystemButton = this._addFileSystemRowElement.createChild("input", "text-button");
    addFileSystemButton.type = "button";
    addFileSystemButton.value = WebInspector.UIString("Add folder");
    addFileSystemButton.addEventListener("click", this._addFileSystemClicked.bind(this));

    this._reset();
}

WebInspector.WorkspaceSettingsTab.prototype = {
    wasShown: function()
    {
        WebInspector.SettingsTab.prototype.wasShown.call(this);
        this._reset();
    },

    _reset: function()
    {
        this._resetFileSystems();
        this._resetFileMappings();
    },

    _resetFileSystems: function()
    {
        this._fileSystemsListContainer.removeChildren();
        var fileSystemPaths = WebInspector.isolatedFileSystemManager.mapping().fileSystemPaths();
        delete this._fileSystemsList;

        if (!fileSystemPaths.length) {
            var noFileSystemsMessageElement = this._fileSystemsListContainer.createChild("div", "no-file-systems-message");
            noFileSystemsMessageElement.textContent = WebInspector.UIString("You have no file systems added.");
            return;
        }

        this._fileSystemsList = new WebInspector.SettingsList(["path"], this._renderFileSystem.bind(this), this._removeFileSystem.bind(this), this._fileSystemSelected.bind(this));
        this._fileSystemsList.onExpandToggle = this._fileSystemExpandToggled.bind(this);
        this._fileSystemsListContainer.appendChild(this._fileSystemsList.element);
        for (var i = 0; i < fileSystemPaths.length; ++i)
            this._fileSystemsList.addItem(fileSystemPaths[i]);
    },

    /**
     * @param {?string} id
     */
    _fileSystemSelected: function(id)
    {
        this._resetFileMappings();
    },

    _fileSystemExpandToggled: function()
    {
        this._resetFileMappings();
    },

    /**
     * @return {Element}
     */
    _createEditTextInput: function(className, placeHolder)
    {
        var inputElement = document.createElement("input");
        inputElement.addStyleClass(className);
        inputElement.type = "text";
        inputElement.placeholder = placeHolder;
        return inputElement;
    },

    /**
     * @param {function(Event)} handler
     * @return {Element}
     */
    _createRemoveButton: function(handler)
    {
        var removeButton = document.createElement("button");
        removeButton.addStyleClass("button");
        removeButton.addStyleClass("remove-item-button");
        removeButton.value = WebInspector.UIString("Remove");
        if (handler)
            removeButton.addEventListener("click", handler, false);
        else
            removeButton.disabled = true;
        return removeButton;
    },

    /**
     * @param {Element} columnElement
     * @param {string} column
     * @param {?string} id
     */
    _renderFileSystem: function(columnElement, column, id)
    {
        var fileSystemPath = id;
        var textElement = columnElement.createChild("span", "list-column-text");
        var pathElement = textElement.createChild("span", "file-system-path");
        pathElement.title = fileSystemPath;

        const maxTotalPathLength = 60;
        const maxFolderNameLength = 30;
        var lastIndexOfSlash = fileSystemPath.lastIndexOf("/");
        var folderName = fileSystemPath.substr(lastIndexOfSlash + 1);
        var folderPath = fileSystemPath.substr(0, lastIndexOfSlash);
        folderPath = folderPath.trimMiddle(maxTotalPathLength - Math.min(maxFolderNameLength, folderName.length));
        folderName = folderName.trimMiddle(maxFolderNameLength);

        var nameElement = pathElement.createChild("span", "file-system-path-name");
        nameElement.textContent = folderName;

        var folderPathElement = pathElement.createChild("span");
        folderPathElement.textContent = folderPath;
    },

    /**
     * @param {?string} id
     */
    _removeFileSystem: function(id)
    {
        if (!id)
            return;
        WebInspector.isolatedFileSystemManager.removeFileSystem(id);
    },

    _addFileSystemClicked: function()
    {
        WebInspector.isolatedFileSystemManager.addFileSystem();
    },

    _fileSystemAdded: function(event)
    {
        var fileSystem = /** @type {WebInspector.IsolatedFileSystem} */ (event.data);
        if (!this._fileSystemsList)
            this._reset();
        else
            this._fileSystemsList.addItem(fileSystem.path());
    },

    _fileSystemRemoved: function(event)
    {
        var fileSystem = /** @type {WebInspector.IsolatedFileSystem} */ (event.data);
        var selectedFileSystemPath = this._selectedFileSystemPath();
        this._fileSystemsList.removeItem(fileSystem.path());
        if (!this._fileSystemsList.itemIds().length)
            this._reset();
        else if (fileSystem.path() === selectedFileSystemPath)
            this._resetFileMappings();
    },

    _fileMappingAdded: function(event)
    {
        var entry = /** @type {WebInspector.FileSystemMapping.Entry} */ (event.data);
        this._addMappingRow(entry);
    },

    _fileMappingRemoved: function(event)
    {
        var entry = /** @type {WebInspector.FileSystemMapping.Entry} */ (event.data);
        if (!this._selectedFileSystemPath() || this._selectedFileSystemPath() !== entry.fileSystemPath)
            return;
        delete this._entries[entry.urlPrefix];
        this._fileMappingsList.removeItem(entry.urlPrefix);
    },

    _selectedFileSystemPath: function()
    {
        return this._fileSystemsList ? this._fileSystemsList.selectedId() : null;
    },

    _resetFileMappings: function()
    {

        if (this._fileMappingsSection) {
            this._fileMappingsSection.remove();
            delete this._fileMappingsSection;
            delete this._fileMappingsListContainer;
            delete this._fileMappingsList;
        }

        if (!this._selectedFileSystemPath() || !this._fileSystemsList.expanded())
            return;

        var fileSystemListItem = this._fileSystemsList.selectedItem();
        this._fileMappingsSection = fileSystemListItem.createChild("div", "file-mappings-section");
        this._fileMappingsListContainer = this._fileMappingsSection.createChild("div", "file-mappings-list-container");

        var entries = WebInspector.isolatedFileSystemManager.mapping().mappingEntries(this._selectedFileSystemPath());

        if (this._fileMappingsList)
            this._fileMappingsList.element.remove();

        this._fileMappingsList = new WebInspector.EditableSettingsList(["url", "path"], this._fileMappingValuesProvider.bind(this), this._removeFileMapping.bind(this), this._fileMappingValidate.bind(this), this._fileMappingEdit.bind(this));
        this._fileMappingsList.element.addStyleClass("file-mappings-list");
        this._fileMappingsListContainer.appendChild(this._fileMappingsList.element);

        this._entries = {};
        for (var i = 0; i < entries.length; ++i)
            this._addMappingRow(entries[i]);
        return this._fileMappingsList;
    },

    _fileMappingValuesProvider: function(itemId, columnId)
    {
        if (!itemId)
            return "";
        var entry = this._entries[itemId];
        switch (columnId) {
        case "url":
            return entry.urlPrefix;
        case "path":
            return entry.pathPrefix;
        default:
            console.assert("Should not be reached.");
        }
        return "";
    },

    /**
     * @param {?string} itemId
     * @param {Object} data
     */
    _fileMappingValidate: function(itemId, data)
    {
        var oldPathPrefix = itemId ? this._entries[itemId].pathPrefix : null;
        return this._validateMapping(data["url"], itemId, data["path"], oldPathPrefix);
    },

    /**
     * @param {?string} itemId
     * @param {Object} data
     */
    _fileMappingEdit: function(itemId, data)
    {
        if (itemId) {
            var urlPrefix = itemId;
            var pathPrefix = this._entries[itemId].pathPrefix;
            var fileSystemPath = this._entries[itemId].fileSystemPath;
            WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(fileSystemPath, urlPrefix, pathPrefix);
        }
        this._addFileMapping(data["url"], data["path"]);
    },

    /**
     * @param {string} urlPrefix
     * @param {?string} allowedURLPrefix
     * @param {string} path
     * @param {?string} allowedPathPrefix
     */
    _validateMapping: function(urlPrefix, allowedURLPrefix, path, allowedPathPrefix)
    {
        var columns = [];
        if (!this._checkURLPrefix(urlPrefix, allowedURLPrefix))
            columns.push("url");
        if (!this._checkPathPrefix(path, allowedPathPrefix))
            columns.push("path");
        return columns;
    },

    _removeFileMapping: function(urlPrefix)
    {
        if (!urlPrefix)
            return;

        var entry = this._entries[urlPrefix];
        WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(entry.fileSystemPath, entry.urlPrefix, entry.pathPrefix);
    },

    /**
     * @param {string} urlPrefix
     * @param {string} pathPrefix
     * @return {boolean}
     */
    _addFileMapping: function(urlPrefix, pathPrefix)
    {
        var normalizedURLPrefix = this._normalizePrefix(urlPrefix);
        var normalizedPathPrefix = this._normalizePrefix(pathPrefix);
        WebInspector.isolatedFileSystemManager.mapping().addFileMapping(this._selectedFileSystemPath(), normalizedURLPrefix, normalizedPathPrefix);
        this._fileMappingsList.selectItem(normalizedURLPrefix);
        return true;
    },

    /**
     * @param {string} prefix
     * @return {string}
     */
    _normalizePrefix: function(prefix)
    {
        if (!prefix)
            return "";
        return prefix + (prefix[prefix.length - 1] === "/" ? "" : "/");
    },

    _addMappingRow: function(entry)
    {
        var fileSystemPath = entry.fileSystemPath;
        var urlPrefix = entry.urlPrefix;
        if (!this._selectedFileSystemPath() || this._selectedFileSystemPath() !== fileSystemPath)
            return;

        this._entries[urlPrefix] = entry;
        var fileMappingListItem = this._fileMappingsList.addItem(urlPrefix, null);
    },

    /**
     * @param {string} value
     * @param {?string} allowedPrefix
     * @return {boolean}
     */
    _checkURLPrefix: function(value, allowedPrefix)
    {
        var prefix = this._normalizePrefix(value);
        return !!prefix && (prefix === allowedPrefix || !this._entries[prefix]);
    },

    /**
     * @param {string} value
     * @param {?string} allowedPrefix
     * @return {boolean}
     */
    _checkPathPrefix: function(value, allowedPrefix)
    {
        var prefix = this._normalizePrefix(value);
        if (!prefix)
            return false;
        if (prefix === allowedPrefix)
            return true;
        for (var urlPrefix in this._entries) {
            var entry = this._entries[urlPrefix];
            if (urlPrefix && entry.pathPrefix === prefix)
                return false;
        }
        return true;
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.TetheringSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Port Forwarding"), "workspace-tab-content");
}

WebInspector.TetheringSettingsTab.prototype = {
    wasShown: function()
    {
        if (this._paragraphElement)
            return;

        WebInspector.SettingsTab.prototype.wasShown.call(this);

        var sectionElement = this._appendSection();
        var labelElement = sectionElement.createChild("div");
        labelElement.addStyleClass("tethering-help-info");
        labelElement.textContent =
            WebInspector.UIString("Creates a listen TCP port on your device that maps to a particular TCP port accessible from the host machine.");
        labelElement.createChild("br");
        labelElement.createChild("div", "tethering-help-title-left").textContent = WebInspector.UIString("Device port");
        labelElement.createChild("div", "tethering-help-title-right").textContent = WebInspector.UIString("Target");

        this._paragraphElement = sectionElement.createChild("div");
        var mappingEntries = WebInspector.settings.portForwardings.get();
        for (var i = 0; i < mappingEntries.length; ++i)
            this._addMappingRow(mappingEntries[i].port, mappingEntries[i].location, false);
        if (!mappingEntries.length)
            this._addMappingRow("", "", true);
        this._save();
    },

    /**
     * @param {string} port
     * @param {string} location
     * @param {boolean} focus
     * @return {Element}
     */
    _addMappingRow: function(port, location, focus)
    {
        var mappingRow = this._paragraphElement.createChild("div", "workspace-settings-row");
        var portElement = mappingRow.createChild("input", "tethering-port-input");
        portElement.type = "text";
        portElement.value = port || "";
        if (!port)
            portElement.placeholder = "8080";
        portElement.addEventListener("keydown", this._editTextInputKey.bind(this, true), true);
        portElement.addEventListener("blur", this._save.bind(this), true);
        portElement.addEventListener("input", this._validatePort.bind(this, portElement), true);

        var locationElement = mappingRow.createChild("input");
        locationElement.type = "text";
        locationElement.value = location || "127.0.0.1:";
        locationElement.addEventListener("keydown", this._editTextInputKey.bind(this, false), true);
        locationElement.addEventListener("blur", this._save.bind(this), true);
        locationElement.addEventListener("input", this._validateLocation.bind(this, locationElement), true);

        var removeButton = mappingRow.createChild("button", "button remove-button");
        removeButton.value = WebInspector.UIString("Remove");
        removeButton.tabIndex = -1;
        removeButton.addEventListener("click", removeMappingClicked.bind(this), false);

        function removeMappingClicked()
        {
            mappingRow.remove();
            if (!this._paragraphElement.querySelector(".workspace-settings-row"))
                this._addMappingRow();
            this._save();
        }
        if (focus)
            setTimeout(function() { portElement.focus(); }, 0); // Needed to work on wasShown
        return mappingRow;
    },

    _save: function()
    {
        var portForwardings = [];
        for (var rowElement = this._paragraphElement.firstChild; rowElement; rowElement = rowElement.nextSibling) {
            var portElement = rowElement.firstChild;
            var locationElement = portElement.nextSibling;
            var port = this._validatePort(portElement);
            var location = this._validateLocation(locationElement);
            if (!port || !location)
                continue;
            portForwardings.push({ port : parseInt(port, 10), location : location });
        }
        WebInspector.settings.portForwardings.set(portForwardings);
    },

    /**
     * @param {boolean} isPort
     * @param {Event} event
     */
    _editTextInputKey: function(isPort, event)
    {
        if (!WebInspector.KeyboardShortcut.hasNoModifiers(/** @type {KeyboardEvent}*/ (event)))
            return;

        if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Enter.code ||
            event.keyCode === WebInspector.KeyboardShortcut.Keys.Tab.code) {
            if (isPort)
                event.target.nextElementSibling.focus();
            else {
                if (event.target.parentElement.nextSibling)
                    event.target.parentElement.nextSibling.firstChild.focus();
                else
                    this._addMappingRow("", "", true);
            }
            event.consume(true);
        }
    },

    /**
     * @param {Element} element
     * @param {Event=} event
     * @return {number}
     */
    _validatePort: function(element, event)
    {
        var port = element.value;
        if (isNaN(port) || port < 5000 || port > 10000) {
            element.addStyleClass("workspace-settings-error");
            return 0;
        }
        element.removeStyleClass("workspace-settings-error");
        return parseInt(port, 10);
    },

    /**
     * @param {Element} element
     * @param {Event=} event
     * @return {string}
     */
    _validateLocation: function(element, event)
    {
        var location = element.value;
        if (!/.*:\d+/.test(location)) {
            element.addStyleClass("workspace-settings-error");
            return "";
        }
        element.removeStyleClass("workspace-settings-error");
        return location;
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.ExperimentsSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Experiments"), "experiments-tab-content");

    var experiments = WebInspector.experimentsSettings.experiments;
    if (experiments.length) {
        var experimentsSection = this._appendSection();
        experimentsSection.appendChild(this._createExperimentsWarningSubsection());
        for (var i = 0; i < experiments.length; ++i)
            experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));
    }
}

WebInspector.ExperimentsSettingsTab.prototype = {
    /**
     * @return {Element} element
     */
    _createExperimentsWarningSubsection: function()
    {
        var subsection = document.createElement("div");
        var warning = subsection.createChild("span", "settings-experiments-warning-subsection-warning");
        warning.textContent = WebInspector.UIString("WARNING:");
        subsection.appendChild(document.createTextNode(" "));
        var message = subsection.createChild("span", "settings-experiments-warning-subsection-message");
        message.textContent = WebInspector.UIString("These experiments could be dangerous and may require restart.");
        return subsection;
    },

    _createExperimentCheckbox: function(experiment)
    {
        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = experiment.name;
        input.checked = experiment.isEnabled();
        function listener()
        {
            experiment.setEnabled(input.checked);
        }
        input.addEventListener("click", listener, false);

        var p = document.createElement("p");
        var label = document.createElement("label");
        label.appendChild(input);
        label.appendChild(document.createTextNode(WebInspector.UIString(experiment.title)));
        p.appendChild(label);
        return p;
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 */
WebInspector.SettingsController = function()
{
    this._statusBarButton = new WebInspector.StatusBarButton(WebInspector.UIString("Settings"), "settings-status-bar-item");
    if (WebInspector.experimentsSettings.showOverridesInDrawer.isEnabled())
        this._statusBarButton.element.addEventListener("mousedown", this._mouseDown.bind(this), false);
    else
        this._statusBarButton.element.addEventListener("mouseup", this._mouseUp.bind(this), false);

    /** @type {?WebInspector.SettingsScreen} */
    this._settingsScreen;
}

WebInspector.SettingsController.prototype =
{
    get statusBarItem()
    {
        return this._statusBarButton.element;
    },

    /**
     * @param {Event} event
     */
    _mouseDown: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("Overrides"), showOverrides.bind(this));
        contextMenu.appendItem(WebInspector.UIString("Settings"), showSettings.bind(this));

        function showOverrides()
        {
            if (this._settingsScreenVisible)
                this._hideSettingsScreen();
            WebInspector.OverridesView.showInDrawer();
        }

        function showSettings()
        {
            if (!this._settingsScreenVisible)
                this.showSettingsScreen();
        }

        contextMenu.showSoftMenu();
    },

    /**
     * @param {Event} event
     */
    _mouseUp: function(event)
    {
        this.showSettingsScreen();
    },

    _onHideSettingsScreen: function()
    {
        delete this._settingsScreenVisible;
    },

    /**
     * @param {string=} tabId
     */
    showSettingsScreen: function(tabId)
    {
        if (!this._settingsScreen)
            this._settingsScreen = new WebInspector.SettingsScreen(this._onHideSettingsScreen.bind(this));

        if (tabId)
            this._settingsScreen.selectTab(tabId);

        this._settingsScreen.showModal();
        this._settingsScreenVisible = true;
    },

    _hideSettingsScreen: function()
    {
        if (this._settingsScreen)
            this._settingsScreen.hide();
    },

    resize: function()
    {
        if (this._settingsScreen && this._settingsScreen.isShowing())
            this._settingsScreen.doResize();
    }
}

/**
 * @constructor
 * @param {function(Element, string, ?string)} itemRenderer
 * @param {function(?string)} itemRemover
 * @param {function(?string)} itemSelectedHandler
 */
WebInspector.SettingsList = function(columns, itemRenderer, itemRemover, itemSelectedHandler)
{
    this.element = document.createElement("div");
    this.element.addStyleClass("settings-list");
    this.element.tabIndex = -1;
    this._itemRenderer = itemRenderer;
    this._listItems = {};
    this._ids = [];
    this._itemRemover = itemRemover;
    this._itemSelectedHandler = itemSelectedHandler;
    this._columns = columns;
}

WebInspector.SettingsList.prototype = {
    /**
     * @param {?string} itemId
     * @param {string=} beforeId
     * @return {Element}
     */
    addItem: function(itemId, beforeId)
    {
        var listItem = document.createElement("div");
        listItem._id = itemId;
        listItem.addStyleClass("settings-list-item");
        if (typeof beforeId !== undefined)
            this.element.insertBefore(listItem, this._listItems[beforeId]);
        else
            this.element.appendChild(listItem);

        var listItemContents = listItem.createChild("div", "settings-list-item-contents");
        var listItemColumnsElement = listItemContents.createChild("div", "settings-list-item-columns");

        listItem.columnElements = {};
        for (var i = 0; i < this._columns.length; ++i) {
            var columnElement = listItemColumnsElement.createChild("div", "list-column");
            var columnId = this._columns[i];
            listItem.columnElements[columnId] = columnElement;
            this._itemRenderer(columnElement, columnId, itemId);
        }
        var removeItemButton = this._createRemoveButton(removeItemClicked.bind(this));
        listItemContents.addEventListener("click", this.selectItem.bind(this, itemId), false);
        listItemContents.appendChild(removeItemButton);

        this._listItems[itemId] = listItem;
        if (typeof beforeId !== undefined)
            this._ids.splice(this._ids.indexOf(beforeId), 0, itemId);
        else
            this._ids.push(itemId);

        function removeItemClicked(event)
        {
            removeItemButton.disabled = true;
            this._itemRemover(itemId);
            event.consume();
        }

        return listItem;
    },

    /**
     * @param {?string} id
     */
    removeItem: function(id)
    {
        this._listItems[id].remove();
        delete this._listItems[id];
        this._ids.remove(id);
        if (id === this._selectedId) {
            delete this._selectedId;
            if (this._ids.length)
                this.selectItem(this._ids[0]);
        }
    },

    /**
     * @return {Array.<?string>}
     */
    itemIds: function()
    {
        return this._ids.slice();
    },

    /**
     * @return {Array.<string>}
     */
    columns: function()
    {
        return this._columns.slice();
    },

    /**
     * @return {?string}
     */
    selectedId: function()
    {
        return this._selectedId;
    },

    /**
     * @return {Element}
     */
    selectedItem: function()
    {
        return this._selectedId ? this._listItems[this._selectedId] : null;
    },

    /**
     * @param {string} itemId
     * @return {Element}
     */
    itemForId: function(itemId)
    {
        return this._listItems[itemId];
    },

    /**
     * @return {boolean}
     */
    expanded: function()
    {
        return this._expanded;
    },

    toggleExpanded: function()
    {
        if (this._expanded)
            delete this._expanded;
        else
            this._expanded = true;
        if (this.onExpandToggle)
            this.onExpandToggle();
    },

    /**
     * @param {?string} id
     * @param {Event=} event
     */
    selectItem: function(id, event)
    {
        if (id === this._selectedId) {
            this.toggleExpanded();
            return;
        }

        if (typeof this._selectedId !== "undefined") {
            delete this._expanded;
            this._listItems[this._selectedId].removeStyleClass("selected");
        }

        this._selectedId = id;
        if (typeof this._selectedId !== "undefined") {
            this._listItems[this._selectedId].addStyleClass("selected");
            this.toggleExpanded();
        }
        this._itemSelectedHandler(id);
        if (event)
            event.consume();
    },

    /**
     * @param {function(Event)} handler
     * @return {Element}
     */
    _createRemoveButton: function(handler)
    {
        var removeButton = document.createElement("button");
        removeButton.addStyleClass("remove-item-button");
        removeButton.value = WebInspector.UIString("Remove");
        removeButton.addEventListener("click", handler, false);
        return removeButton;
    }
}

/**
 * @constructor
 * @extends {WebInspector.SettingsList}
 * @param {function(?string)} itemRemover
 * @param {function(?string, Object)} validateHandler
 * @param {function(?string, Object)} editHandler
 */
WebInspector.EditableSettingsList = function(columns, valuesProvider, itemRemover, validateHandler, editHandler)
{
    WebInspector.SettingsList.call(this, columns, this._renderColumn.bind(this), itemRemover, function() { });
    this._validateHandler = validateHandler;
    this._editHandler = editHandler;
    this._valuesProvider = valuesProvider;
    /** @type {!Object.<string, HTMLInputElement>} */
    this._addInputElements = {};
    /** @type {!Object.<string, !Object.<string, HTMLInputElement>>} */
    this._editInputElements = {};
    /** @type {Object.<string, Object.<string, HTMLSpanElement>>} */
    this._textElements = {};

    this._addMappingItem = this.addItem(null);
    this._addMappingItem.addStyleClass("item-editing");
    this._addMappingItem.addStyleClass("add-list-item");
}

WebInspector.EditableSettingsList.prototype = {
    /**
     * @param {?string} itemId
     * @param {string=} beforeId
     * @return {Element}
     */
    addItem: function(itemId, beforeId)
    {
        var listItem = WebInspector.SettingsList.prototype.addItem.call(this, itemId, beforeId);
        listItem.addStyleClass("editable");
        return listItem;
    },

    /**
     * @param {Element} columnElement
     * @param {string} columnId
     * @param {?string} itemId
     */
    _renderColumn: function(columnElement, columnId, itemId)
    {
        columnElement.addStyleClass("file-mapping-" + columnId);
        var placeholder = (columnId === "url") ? WebInspector.UIString("URL prefix") : WebInspector.UIString("Folder path");
        if (itemId === null) {
            var inputElement = columnElement.createChild("input", "list-column-editor");
            inputElement.placeholder = placeholder;
            inputElement.addEventListener("blur", this._onAddMappingInputBlur.bind(this));
            inputElement.addEventListener("input", this._validateEdit.bind(this, itemId));
            this._addInputElements[columnId] = inputElement;
            return;
        }

        if (!this._editInputElements[itemId])
            this._editInputElements[itemId] = {};
        if (!this._textElements[itemId])
            this._textElements[itemId] = {};

        var value = this._valuesProvider(itemId, columnId);

        var textElement = columnElement.createChild("span", "list-column-text");
        textElement.textContent = value;
        textElement.title = value;
        columnElement.addEventListener("click", rowClicked.bind(this), false);
        this._textElements[itemId][columnId] = textElement;

        var inputElement = columnElement.createChild("input", "list-column-editor");
        inputElement.value = value;
        inputElement.addEventListener("blur", this._editMappingBlur.bind(this, itemId));
        inputElement.addEventListener("input", this._validateEdit.bind(this, itemId));
        columnElement.inputElement = inputElement;
        this._editInputElements[itemId][columnId] = inputElement;

        function rowClicked(event)
        {
            if (itemId === this._editingId)
                return;
            event.consume();
            console.assert(!this._editingId);
            this._editingId = itemId;
            var listItem = this.itemForId(itemId);
            listItem.addStyleClass("item-editing");
            var inputElement = event.target.inputElement || this._editInputElements[itemId][this.columns()[0]];
            inputElement.focus();
            inputElement.select();
        }
    },

    /**
     * @param {?string} itemId
     * @return {Object}
     */
    _data: function(itemId)
    {
        var inputElements = this._inputElements(itemId);
        var data = {};
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i)
            data[columns[i]] = inputElements[columns[i]].value;
        return data;
    },

    /**
     * @param {?string} itemId
     * @return {Object.<string, HTMLInputElement>}
     */
    _inputElements: function(itemId)
    {
        if (!itemId)
            return this._addInputElements;
        return this._editInputElements[itemId];
    },

    /**
     * @param {?string} itemId
     * @return {boolean}
     */
    _validateEdit: function(itemId)
    {
        var errorColumns = this._validateHandler(itemId, this._data(itemId));
        var hasChanges = this._hasChanges(itemId);
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var inputElement = this._inputElements(itemId)[columnId];
            if (hasChanges && errorColumns.indexOf(columnId) !== -1)
                inputElement.addStyleClass("editable-item-error");
            else
                inputElement.removeStyleClass("editable-item-error");
        }
        return !errorColumns.length;
    },

    /**
     * @param {?string} itemId
     * @return {boolean}
     */
    _hasChanges: function(itemId)
    {
        var hasChanges = false;
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var oldValue = itemId ? this._textElements[itemId][columnId].textContent : "";
            var newValue = this._inputElements(itemId)[columnId].value;
            if (oldValue !== newValue) {
                hasChanges = true;
                break;
            }
        }
        return hasChanges;
    },

    /**
     * @param {string} itemId
     */
    _editMappingBlur: function(itemId, event)
    {
        var inputElements = Object.values(this._editInputElements[itemId]);
        if (inputElements.indexOf(event.relatedTarget) !== -1)
            return;

        var listItem = this.itemForId(itemId);
        listItem.removeStyleClass("item-editing");
        delete this._editingId;

        if (!this._hasChanges(itemId))
            return;

        if (!this._validateEdit(itemId)) {
            var columns = this.columns();
            for (var i = 0; i < columns.length; ++i) {
                var columnId = columns[i];
                var inputElement = this._editInputElements[itemId][columnId];
                inputElement.value = this._textElements[itemId][columnId].textContent;
                inputElement.removeStyleClass("editable-item-error");
            }
            return;
        }
        this._editHandler(itemId, this._data(itemId));
    },

    _onAddMappingInputBlur: function(event)
    {
        var inputElements = Object.values(this._addInputElements);
        if (inputElements.indexOf(event.relatedTarget) !== -1)
            return;

        if (!this._hasChanges(null))
            return;

        if (!this._validateEdit(null))
            return;

        this._editHandler(null, this._data(null));
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var inputElement = this._addInputElements[columnId];
            inputElement.value = "";
        }
    },

    __proto__: WebInspector.SettingsList.prototype
}
