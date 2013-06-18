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
     */
    _createCheckboxSetting: function(name, setting, omitParagraphElement, inputElement)
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

    _createRadioSetting: function(name, options, setting)
    {
        var pp = document.createElement("p");
        var fieldsetElement = document.createElement("fieldset");
        var legendElement = document.createElement("legend");
        legendElement.textContent = name;
        fieldsetElement.appendChild(legendElement);

        function clickListener(e)
        {
            setting.set(e.target.value);
        }

        var settingValue = setting.get();
        for (var i = 0; i < options.length; ++i) {
            var p = document.createElement("p");
            var label = document.createElement("label");
            p.appendChild(label);

            var input = document.createElement("input");
            input.type = "radio";
            input.name = setting.name;
            input.value = options[i][0];
            input.addEventListener("click", clickListener, false);
            if (settingValue == input.value)
                input.checked = true;

            label.appendChild(input);
            label.appendChild(document.createTextNode(options[i][1]));

            fieldsetElement.appendChild(p);
        }

        pp.appendChild(fieldsetElement);
        return pp;
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
    p.appendChild(this._createRadioSetting(WebInspector.UIString("Color format"), [
        [ WebInspector.Color.Format.Original, WebInspector.UIString("As authored") ],
        [ WebInspector.Color.Format.HEX, "HEX: #DAC0DE" ],
        [ WebInspector.Color.Format.RGB, "RGB: rgb(128, 255, 255)" ],
        [ WebInspector.Color.Format.HSL, "HSL: hsl(300, 80%, 90%)" ] ], WebInspector.settings.colorFormat));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show user agent styles"), WebInspector.settings.showUserAgentStyles));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Word wrap"), WebInspector.settings.domWordWrap));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show Shadow DOM"), WebInspector.settings.showShadowDOM));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show rulers"), WebInspector.settings.showMetricsRulers));

    p = this._appendSection(WebInspector.UIString("Rendering"));
    this._forceCompositingModeCheckbox = document.createElement("input");
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Force accelerated compositing"), WebInspector.settings.forceCompositingMode, false, this._forceCompositingModeCheckbox));
    WebInspector.settings.forceCompositingMode.addChangeListener(this._forceCompositingModeChanged, this);
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show paint rectangles"), WebInspector.settings.showPaintRects));
    this._showCompositedLayersBordersCheckbox = document.createElement("input");
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show composited layer borders"), WebInspector.settings.showDebugBorders, false, this._showCompositedLayersBordersCheckbox));
    this._showFPSCheckbox = document.createElement("input");
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show FPS meter"), WebInspector.settings.showFPSCounter, false, this._showFPSCheckbox));
    this._continousPaintingCheckbox = document.createElement("input");
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Enable continuous page repainting"), WebInspector.settings.continuousPainting, false, this._continousPaintingCheckbox));
    this._forceCompositingModeChanged();

    p = this._appendSection(WebInspector.UIString("Sources"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Search in content scripts"), WebInspector.settings.searchInContentScripts));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Enable source maps"), WebInspector.settings.sourceMapsEnabled));
    if (WebInspector.experimentsSettings.isEnabled("sass"))
        p.appendChild(this._createCSSAutoReloadControls());
    var indentationElement = this._createSelectSetting(WebInspector.UIString("Indentation"), [
            [ WebInspector.UIString("2 spaces"), WebInspector.TextUtils.Indent.TwoSpaces ],
            [ WebInspector.UIString("4 spaces"), WebInspector.TextUtils.Indent.FourSpaces ],
            [ WebInspector.UIString("8 spaces"), WebInspector.TextUtils.Indent.EightSpaces ],
            [ WebInspector.UIString("Tab character"), WebInspector.TextUtils.Indent.TabCharacter ]
        ], WebInspector.settings.textEditorIndent);
    indentationElement.firstChild.className = "toplevel";
    p.appendChild(indentationElement);
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show whitespace characters"), WebInspector.settings.showWhitespacesInEditor));

    p = this._appendSection(WebInspector.UIString("Profiler"));
    p.appendChild(this._createCheckboxSetting(WebInspector.UIString("Show objects' hidden properties"), WebInspector.settings.showHeapSnapshotObjectsHiddenProperties));
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
        this._showFPSCheckbox.disabled = !compositing;
        this._continousPaintingCheckbox.disabled = !compositing;
        this._showCompositedLayersBordersCheckbox.disabled = !compositing;
        if (!compositing) {
            this._showFPSCheckbox.checked = false;
            this._continousPaintingCheckbox.checked = false;
            this._showCompositedLayersBordersCheckbox.checked = false;
            WebInspector.settings.showFPSCounter.set(false);
            WebInspector.settings.continuousPainting.set(false);
            WebInspector.settings.showDebugBorders.set(false);
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

    _createCSSAutoReloadControls: function()
    {
        var fragment = document.createDocumentFragment();
        var labelElement = fragment.createChild("label");
        var checkboxElement = labelElement.createChild("input");
        checkboxElement.type = "checkbox";
        checkboxElement.checked = WebInspector.settings.cssReloadEnabled.get();
        checkboxElement.addEventListener("click", checkboxClicked, false);
        labelElement.appendChild(document.createTextNode(WebInspector.UIString("Auto-reload CSS upon Sass save")));

        var fieldsetElement = this._createInputSetting(WebInspector.UIString("Timeout (ms)"), WebInspector.settings.cssReloadTimeout, true, 8, "60px", validateReloadTimeout);
        fieldsetElement.disabled = !checkboxElement.checked;
        fragment.appendChild(fieldsetElement);
        return fragment;

        function checkboxClicked()
        {
            var reloadEnabled = checkboxElement.checked;
            WebInspector.settings.cssReloadEnabled.set(reloadEnabled);
            fieldsetElement.disabled = !reloadEnabled;
        }

        function validateReloadTimeout(value)
        {
            return isFinite(value) && value > 0;
        }
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
    this.containerElement.removeSelf();
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

        this._fileSystemsList = new WebInspector.SettingsList(this._renderFileSystem, this._removeFileSystem, this._fileSystemSelected.bind(this));
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

    /**
     * @return {Element}
     */
    _createShowTextInput: function(className, value)
    {
        var inputElement = document.createElement("input");
        inputElement.addStyleClass(className);
        inputElement.type = "text";
        inputElement.value = value;
        inputElement.title = value;
        inputElement.disabled = true;
        return inputElement;
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
        removeButton.addStyleClass("remove-button");
        removeButton.value = WebInspector.UIString("Remove");
        removeButton.addEventListener("click", handler, false);
        return removeButton;
    },

    /**
     * @param {function(Event)} handler
     * @return {Element}
     */
    _createAddButton: function(handler)
    {
        var addButton = document.createElement("button");
        addButton.addStyleClass("button");
        addButton.addStyleClass("add-button");
        addButton.value = WebInspector.UIString("Add");
        addButton.addEventListener("click", handler, false);
        return addButton;
    },

    /**
     * @param {Element} listItem
     * @param {?string} id
     */
    _renderFileSystem: function(listItem, id)
    {
        var fileSystemPath = id;
        var pathElement = listItem.createChild("div", "file-system-path");
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
        this._fileSystemsList.removeItem(fileSystem.path());
        if (!this._fileSystemsList.itemIds().length)
            this._reset();
    },

    _fileMappingAdded: function(event)
    {
        var entry = /** @type {WebInspector.FileSystemMapping.Entry} */ (event.data);
        this._addFileMapping(entry.fileSystemPath, entry.urlPrefix, entry.pathPrefix);
    },

    _fileMappingRemoved: function(event)
    {
        var entry = /** @type {WebInspector.FileSystemMapping.Entry} */ (event.data);
        this._removeFileMapping(entry.fileSystemPath, entry.urlPrefix);
    },

    _selectedFileSystemPath: function()
    {
        return this._fileSystemsList ? this._fileSystemsList.selectedId() : null;
    },

    _resetFileMappings: function()
    {
        if (this._fileMappingsSection && this._fileMappingsSection.parentElement)
            this._fileMappingsSection.parentElement.removeChild(this._fileMappingsSection);
        delete this._fileMappingsList;
        this._fileMappingRows = {};
        if (!this._selectedFileSystemPath())
            return;

        this._fileMappingsSection = this._appendSection(WebInspector.UIString("Mappings"));
        this._fileMappingsEditor = this._fileMappingsSection.createChild("div", "file-mappings-editor");
        this._fileMappingsListContainer = this._fileMappingsEditor.createChild("p", "settings-list-container");
        this._addMappingRowElement = this._fileMappingsEditor.createChild("div", "workspace-settings-row");
        this._urlInputElement = this._createEditTextInput("file-mapping-url", WebInspector.UIString("URL prefix"));
        this._addMappingRowElement.appendChild(this._urlInputElement);
        this._pathInputElement = this._createEditTextInput("file-mapping-path", WebInspector.UIString("Folder path"));
        this._addMappingRowElement.appendChild(this._pathInputElement);
        this._addMappingRowElement.appendChild(this._createAddButton(this._addFileMappingClicked.bind(this)));

        this._fileMappingRows = {};
        var entries = WebInspector.isolatedFileSystemManager.mapping().mappingEntries(this._selectedFileSystemPath());
        if (!entries.length) {
            var noFileMappingsMessageElement = this._fileMappingsListContainer.createChild("div", "no-file-mappings-message");
            noFileMappingsMessageElement.textContent = WebInspector.UIString("You have no mappings added for selected file system.");
            return;
        }

        if (this._fileMappingsList && this._fileMappingsList.parentElement)
            this._fileMappingsList.parentElement.removeChild(this._fileMappingsList);
        this._fileMappingsList = this._fileMappingsListContainer.createChild("div", "file-mappings-list");

        for (var i = 0; i < entries.length; ++i) {
            var entry = entries[i];
            this._addMappingRow(entry.fileSystemPath, entry.urlPrefix, entry.pathPrefix);
        }
        return this._fileMappingsList;
    },

    /**
     * @param {string} fileSystemPath
     * @param {string} urlPrefix
     * @param {string} pathPrefix
     */
    _addMappingRow: function(fileSystemPath, urlPrefix, pathPrefix)
    {
        if (!this._selectedFileSystemPath() || this._selectedFileSystemPath() !== fileSystemPath)
            return;
        var fileMappingRow = document.createElement("div");
        fileMappingRow.addStyleClass("workspace-settings-row");
        this._fileMappingsList.appendChild(fileMappingRow);
        fileMappingRow._fileSystemPath = fileSystemPath;
        fileMappingRow._urlPrefix = urlPrefix;
        fileMappingRow._pathPrefix = pathPrefix;

        fileMappingRow.appendChild(this._createShowTextInput("file-mapping-url", urlPrefix));
        fileMappingRow.appendChild(this._createShowTextInput("file-mapping-path", pathPrefix));
        fileMappingRow.appendChild(this._createRemoveButton(removeMappingClicked.bind(this)));
        this._fileMappingRows[urlPrefix] = fileMappingRow;

        function removeMappingClicked()
        {
            WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(fileSystemPath, urlPrefix, pathPrefix);
        }
    },

    /**
     * @param {string} fileSystemPath
     * @param {string} urlPrefix
     * @param {string} pathPrefix
     */
    _addFileMapping: function(fileSystemPath, urlPrefix, pathPrefix)
    {
        if (!Object.keys(this._fileMappingRows).length)
            this._resetFileMappings();
        else
            this._addMappingRow(fileSystemPath, urlPrefix, pathPrefix);
    },

    /**
     * @param {string} fileSystemPath
     * @param {string} urlPrefix
     */
    _removeFileMapping: function(fileSystemPath, urlPrefix)
    {
        if (!this._selectedFileSystemPath() || this._selectedFileSystemPath() !== fileSystemPath)
            return;
        var fileMappingRow = this._fileMappingRows[urlPrefix];
        fileMappingRow.parentElement.removeChild(fileMappingRow);
        delete this._fileMappingRows[urlPrefix];
        if (!Object.keys(this._fileMappingRows).length)
            this._resetFileMappings();
    },

    _addFileMappingClicked: function()
    {
        var url = this._urlInputElement.value;
        var path = this._pathInputElement.value;
        if (!url || !path)
            return;
        if (url[url.length - 1] !== "/")
            url += "/";
        if (path[path.length - 1] !== "/")
            path += "/";
        WebInspector.isolatedFileSystemManager.mapping().addFileMapping(this._selectedFileSystemPath(), url, path);
        this._urlInputElement.value = "";
        this._pathInputElement.value = "";
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
            mappingRow.removeSelf();
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
        for (var rowElement = this._paragraphElement.firstChild.nextSibling; rowElement; rowElement = rowElement.nextSibling) {
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
 * @param {function(Element, ?string)} itemRenderer
 * @param {function(?string)} itemRemover
 * @param {function(?string)} itemSelectedHandler
 */
WebInspector.SettingsList = function(itemRenderer, itemRemover, itemSelectedHandler)
{
    this.element = document.createElement("div");
    this.element.addStyleClass("settings-list");
    this.element.tabIndex = -1;
    this._itemRenderer = itemRenderer;
    this._listItems = {};
    this._ids = [];
    this._itemRemover = itemRemover;
    this._itemSelectedHandler = itemSelectedHandler;
}

WebInspector.SettingsList.prototype = {
    /**
     * @param {?string} id
     * @return {Element}
     */
    addItem: function(id)
    {
        var listItem = document.createElement("div");
        listItem._id = id;
        listItem.addStyleClass("settings-list-item");
        this.element.appendChild(listItem);

        this._itemRenderer(listItem, id);

        var removeItemButton = this._createRemoveButton(removeItemClicked.bind(this));
        listItem.addEventListener("click", this.selectItem.bind(this, id), false);
        listItem.appendChild(removeItemButton);
        this._listItems[id] = listItem;
        this._ids.push(id);

        function removeItemClicked()
        {
            removeItemButton.disabled = true;
            this._itemRemover(id);
        }

        return listItem;
    },

    /**
     * @param {?string} id
     */
    removeItem: function(id)
    {
        var listItem = this._listItems[id];
        if (listItem.parentElement)
            listItem.parentElement.removeChild(listItem);
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
     * @return {?string}
     */
    selectedId: function()
    {
        return this._selectedId;
    },

    /**
     * @param {?string} id
     */
    selectItem: function(id)
    {
        if (id === this._selectedId)
            return;
        if (this._selectedId)
            this._listItems[this._selectedId].removeStyleClass("selected");
        this._selectedId = id;
        this._listItems[this._selectedId].addStyleClass("selected");
        this._itemSelectedHandler(id);
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
