// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.WorkspaceMappingTip = class {
  /**
   * @param {!WebInspector.SourcesPanel} sourcesPanel
   * @param {!WebInspector.Workspace} workspace
   */
  constructor(sourcesPanel, workspace) {
    this._sourcesPanel = sourcesPanel;
    this._workspace = workspace;

    this._sourcesView = this._sourcesPanel.sourcesView();
    this._workspaceInfobarDisabledSetting = WebInspector.settings.createSetting('workspaceInfobarDisabled', false);
    this._workspaceMappingInfobarDisabledSetting =
        WebInspector.settings.createSetting('workspaceMappingInfobarDisabled', false);

    if (this._workspaceInfobarDisabledSetting.get() && this._workspaceMappingInfobarDisabledSetting.get())
      return;
    this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
    WebInspector.persistence.addEventListener(
        WebInspector.Persistence.Events.BindingCreated, this._bindingCreated, this);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _bindingCreated(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);
    if (binding.network[WebInspector.WorkspaceMappingTip._infobarSymbol])
      binding.network[WebInspector.WorkspaceMappingTip._infobarSymbol].dispose();
    if (binding.fileSystem[WebInspector.WorkspaceMappingTip._infobarSymbol])
      binding.fileSystem[WebInspector.WorkspaceMappingTip._infobarSymbol].dispose();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _editorSelected(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    if (this._editorSelectedTimer)
      clearTimeout(this._editorSelectedTimer);
    this._editorSelectedTimer = setTimeout(this._updateSuggestedMappingInfobar.bind(this, uiSourceCode), 3000);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _updateSuggestedMappingInfobar(uiSourceCode) {
    var uiSourceCodeFrame = this._sourcesView.viewForFile(uiSourceCode);

    if (!uiSourceCodeFrame.isShowing())
      return;
    if (uiSourceCode[WebInspector.WorkspaceMappingTip._infobarSymbol])
      return;

    // First try mapping filesystem -> network.
    if (!this._workspaceMappingInfobarDisabledSetting.get() &&
        uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
      if (WebInspector.persistence.binding(uiSourceCode))
        return;

      var networkProjects = this._workspace.projectsForType(WebInspector.projectTypes.Network);
      networkProjects =
          networkProjects.concat(this._workspace.projectsForType(WebInspector.projectTypes.ContentScripts));
      for (var i = 0; i < networkProjects.length; ++i) {
        var name = uiSourceCode.name();
        var networkUiSourceCodes = networkProjects[i].uiSourceCodes();
        for (var j = 0; j < networkUiSourceCodes.length; ++j) {
          if (networkUiSourceCodes[j].name() === name && this._isLocalHost(networkUiSourceCodes[j].url())) {
            this._showMappingInfobar(uiSourceCode, false);
            return;
          }
        }
      }
    }

    // Then map network -> filesystem.
    if (uiSourceCode.project().type() === WebInspector.projectTypes.Network ||
        uiSourceCode.project().type() === WebInspector.projectTypes.ContentScripts) {
      // Suggest for localhost only.
      if (!this._isLocalHost(uiSourceCode.url()) || WebInspector.persistence.binding(uiSourceCode))
        return;

      var filesystemProjects = this._workspace.projectsForType(WebInspector.projectTypes.FileSystem);
      for (var i = 0; i < filesystemProjects.length; ++i) {
        var name = uiSourceCode.name();
        var fsUiSourceCodes = filesystemProjects[i].uiSourceCodes();
        for (var j = 0; j < fsUiSourceCodes.length; ++j) {
          if (fsUiSourceCodes[j].name() === name) {
            this._showMappingInfobar(uiSourceCode, true);
            return;
          }
        }
      }

      this._showWorkspaceInfobar(uiSourceCode);
    }
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  _isLocalHost(url) {
    var parsedURL = url.asParsedURL();
    return !!parsedURL && parsedURL.host === 'localhost';
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _showWorkspaceInfobar(uiSourceCode) {
    var infobar = WebInspector.Infobar.create(
        WebInspector.Infobar.Type.Info,
        WebInspector.UIString('Serving from the file system? Add your files into the workspace.'),
        this._workspaceInfobarDisabledSetting);
    if (!infobar)
      return;
    infobar.createDetailsRowMessage(WebInspector.UIString(
        'If you add files into your DevTools workspace, your changes will be persisted to disk.'));
    infobar.createDetailsRowMessage(
        WebInspector.UIString('To add a folder into the workspace, drag and drop it into the Sources panel.'));
    this._appendInfobar(uiSourceCode, infobar);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean} isNetwork
   */
  _showMappingInfobar(uiSourceCode, isNetwork) {
    var title;
    if (isNetwork)
      title = WebInspector.UIString('Map network resource \'%s\' to workspace?', uiSourceCode.url());
    else
      title = WebInspector.UIString('Map workspace resource \'%s\' to network?', uiSourceCode.url());

    var infobar = WebInspector.Infobar.create(
        WebInspector.Infobar.Type.Info, title, this._workspaceMappingInfobarDisabledSetting);
    if (!infobar)
      return;
    infobar.createDetailsRowMessage(WebInspector.UIString(
        'You can map files in your workspace to the ones loaded over the network. As a result, changes made in DevTools will be persisted to disk.'));
    infobar.createDetailsRowMessage(WebInspector.UIString('Use context menu to establish the mapping at any time.'));
    var anchor = createElementWithClass('a', 'link');
    anchor.textContent = WebInspector.UIString('Establish the mapping now...');
    anchor.addEventListener('click', this._establishTheMapping.bind(this, uiSourceCode), false);
    infobar.createDetailsRowMessage('').appendChild(anchor);
    this._appendInfobar(uiSourceCode, infobar);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {?Event} event
   */
  _establishTheMapping(uiSourceCode, event) {
    event.consume(true);
    if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem)
      this._sourcesPanel.mapFileSystemToNetwork(uiSourceCode);
    else
      this._sourcesPanel.mapNetworkToFileSystem(uiSourceCode);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!WebInspector.Infobar} infobar
   */
  _appendInfobar(uiSourceCode, infobar) {
    var uiSourceCodeFrame = this._sourcesView.viewForFile(uiSourceCode);

    var rowElement =
        infobar.createDetailsRowMessage(WebInspector.UIString('For more information on workspaces, refer to the '));
    rowElement.appendChild(WebInspector.linkifyDocumentationURLAsNode(
        '../setup/setup-workflow', WebInspector.UIString('workspaces documentation')));
    rowElement.createTextChild('.');
    uiSourceCode[WebInspector.WorkspaceMappingTip._infobarSymbol] = infobar;
    uiSourceCodeFrame.attachInfobars([infobar]);
    WebInspector.runCSSAnimationOnce(infobar.element, 'source-frame-infobar-animation');
  }
};

WebInspector.WorkspaceMappingTip._infobarSymbol = Symbol('infobar');
