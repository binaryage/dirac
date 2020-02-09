/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

import {NavigatorUISourceCodeTreeNode, NavigatorView} from './NavigatorView.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class NetworkNavigatorView extends NavigatorView {
  constructor() {
    super();
    self.SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);

    // Record the sources tool load time after the file navigator has loaded.
    Host.userMetrics.panelLoaded('sources', 'DevTools.Launch.Sources');
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.Network;
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectedURLChanged(event) {
    const mainTarget = self.SDK.targetManager.mainTarget();
    if (event.data !== mainTarget) {
      return;
    }
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    for (const uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL) {
        this.revealUISourceCode(uiSourceCode, true);
      }
    }
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  uiSourceCodeAdded(uiSourceCode) {
    const mainTarget = self.SDK.targetManager.mainTarget();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    if (uiSourceCode.url() === inspectedURL) {
      this.revealUISourceCode(uiSourceCode, true);
    }
  }
}

/**
 * @unrestricted
 */
export class FilesNavigatorView extends NavigatorView {
  constructor() {
    super();
    const placeholder = new UI.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Sync changes in DevTools with the local filesystem`}</div><br />
      ${UI.XLink.create('https://developers.google.com/web/tools/chrome-devtools/workspaces/', ls`Learn more`)}
    `);

    const toolbar = new UI.Toolbar('navigator-toolbar');
    toolbar.appendItemsAtLocation('files-navigator-toolbar').then(() => {
      if (!toolbar.empty()) {
        this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
      }
    });
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides' &&
        !Snippets.isSnippetsProject(project);
  }

  /**
   * @override
   * @param {!Event} event
   */
  handleContextMenu(event) {
    const contextMenu = new UI.ContextMenu(event);
    contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace', undefined, true);
    contextMenu.show();
  }
}

export class OverridesNavigatorView extends NavigatorView {
  constructor() {
    super();
    const placeholder = new UI.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Override page assets with files from a local folder`}</div><br />
      ${UI.XLink.create('https://developers.google.com/web/updates/2018/01/devtools#overrides', ls`Learn more`)}
    `);

    this._toolbar = new UI.Toolbar('navigator-toolbar');

    this.contentElement.insertBefore(this._toolbar.element, this.contentElement.firstChild);

    self.Persistence.networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.ProjectChanged, this._updateProjectAndUI, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded, this._onProjectAddOrRemoved, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._onProjectAddOrRemoved, this);
    this._updateProjectAndUI();
  }

  /**
   * @param {!Common.Event} event
   */
  _onProjectAddOrRemoved(event) {
    const project = /** @type {!Workspace.Project} */ (event.data);
    if (project && project.type() === Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
      return;
    }
    this._updateUI();
  }

  _updateProjectAndUI() {
    this.reset();
    const project = self.Persistence.networkPersistenceManager.project();
    if (project) {
      this.tryAddProject(project);
    }
    this._updateUI();
  }

  _updateUI() {
    this._toolbar.removeToolbarItems();
    const project = self.Persistence.networkPersistenceManager.project();
    if (project) {
      const enableCheckbox =
          new UI.ToolbarSettingCheckbox(self.Common.settings.moduleSetting('persistenceNetworkOverridesEnabled'));
      this._toolbar.appendToolbarItem(enableCheckbox);

      this._toolbar.appendToolbarItem(new UI.ToolbarSeparator(true));
      const clearButton = new UI.ToolbarButton(Common.UIString('Clear configuration'), 'largeicon-clear');
      clearButton.addEventListener(UI.ToolbarButton.Events.Click, () => {
        project.remove();
      });
      this._toolbar.appendToolbarItem(clearButton);
      return;
    }
    const title = Common.UIString('Select folder for overrides');
    const setupButton = new UI.ToolbarButton(title, 'largeicon-add', title);
    setupButton.addEventListener(UI.ToolbarButton.Events.Click, this._setupNewWorkspace, this);
    this._toolbar.appendToolbarItem(setupButton);
  }

  async _setupNewWorkspace() {
    const fileSystem = await self.Persistence.isolatedFileSystemManager.addFileSystem('overrides');
    if (!fileSystem) {
      return;
    }
    self.Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').set(true);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project === self.Persistence.networkPersistenceManager.project();
  }
}

/**
 * @unrestricted
 */
export class ContentScriptsNavigatorView extends NavigatorView {
  constructor() {
    super();
    const placeholder = new UI.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Content scripts served by extensions appear here`}</div><br />
      ${UI.XLink.create('https://developer.chrome.com/extensions/content_scripts', ls`Learn more`)}
    `);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.ContentScripts;
  }
}

/**
 * @unrestricted
 */
export class SnippetsNavigatorView extends NavigatorView {
  constructor() {
    super();
    const placeholder = new UI.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Create and save code snippets for later reuse`}</div><br />
      ${UI.XLink.create('https://developers.google.com/web/tools/chrome-devtools/javascript/snippets', ls`Learn more`)}
    `);

    const toolbar = new UI.Toolbar('navigator-toolbar');
    const newButton = new UI.ToolbarButton('', 'largeicon-add', Common.UIString('New snippet'));
    newButton.addEventListener(UI.ToolbarButton.Events.Click, () => this.create(Snippets.project, ''));
    toolbar.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return Snippets.isSnippetsProject(project);
  }

  /**
   * @override
   * @param {!Event} event
   */
  handleContextMenu(event) {
    const contextMenu = new UI.ContextMenu(event);
    contextMenu.headerSection().appendItem(ls`Create new snippet`, () => this.create(Snippets.project, ''));
    contextMenu.show();
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!NavigatorUISourceCodeTreeNode} node
   */
  handleFileContextMenu(event, node) {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI.ContextMenu(event);
    contextMenu.headerSection().appendItem(Common.UIString('Run'), () => Snippets.evaluateScriptSnippet(uiSourceCode));
    contextMenu.editSection().appendItem(Common.UIString('Rename\u2026'), () => this.rename(node, false));
    contextMenu.editSection().appendItem(
        Common.UIString('Remove'), () => uiSourceCode.project().deleteFile(uiSourceCode));
    contextMenu.saveSection().appendItem(Common.UIString('Save as...'), this._handleSaveAs.bind(this, uiSourceCode));
    contextMenu.show();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  async _handleSaveAs(uiSourceCode) {
    uiSourceCode.commitWorkingCopy();
    const {content} = await uiSourceCode.requestContent();
    self.Workspace.fileManager.save(uiSourceCode.url(), content || '', true);
    self.Workspace.fileManager.close(uiSourceCode.url());
  }
}

/**
 * @implements {UI.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'sources.create-snippet':
        Snippets.project.createFile('', null, '').then(uiSourceCode => Common.Revealer.reveal(uiSourceCode));
        return true;
      case 'sources.add-folder-to-workspace':
        self.Persistence.isolatedFileSystemManager.addFileSystem();
        return true;
    }
    return false;
  }
}
