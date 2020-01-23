// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{playerTitle: string, playerID: string, exists: boolean, playing: boolean, titleEdited: boolean}}
 */
Media.PlayerStatus;

/**
 * @typedef {{playerStatus: !Media.PlayerStatus, playerTitleElement: ?HTMLElement}}
 */
Media.PlayerStatusMapElement;


Media.PlayerEntryTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Media.PlayerStatus} playerStatus
   * @param {!Media.MainView} displayContainer
   */
  constructor(playerStatus, displayContainer) {
    super(playerStatus.playerTitle, false);
    this.titleFromUrl = true;
    this._playerStatus = playerStatus;
    this._displayContainer = displayContainer;
    this.setLeadingIcons([UI.Icon.create('smallicon-videoplayer-playing', 'media-player')]);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    this._displayContainer.renderMainPanel(this._playerStatus.playerID);
    return true;
  }
};


Media.PlayerListView = class extends UI.VBox {
  /**
   * @param {!Media.MainView} mainContainer
   */
  constructor(mainContainer) {
    super(true);

    this._playerStatuses = new Map();

    // Container where new panels can be added based on clicks.
    this._mainContainer = mainContainer;

    // The parent tree for storing sections
    this._sidebarTree = new UI.TreeOutlineInShadow();
    this.contentElement.appendChild(this._sidebarTree.element);
    this._sidebarTree.registerRequiredCSS('media/playerListView.css');

    // Audio capture / output devices.
    this._audioDevices = this._addListSection(Common.UIString('Audio I/O'));

    // Video capture devices.
    this._videoDevices = this._addListSection(Common.UIString('Video Capture Devices'));

    // Players active in this tab.
    this._playerList = this._addListSection(Common.UIString('Players'));
  }

  /**
   * @param {string} title
   * @return {!UI.TreeElement}
   */
  _addListSection(title) {
    const treeElement = new UI.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    return treeElement;
  }

  /**
   * @param {string} playerID
   */
  addMediaElementItem(playerID) {
    const playerStatus = {playerTitle: playerID, playerID: playerID, exists: true, playing: false, titleEdited: false};
    const playerElement = new Media.PlayerEntryTreeElement(playerStatus, this._mainContainer);
    this._playerStatuses.set(playerID, playerElement);
    this._playerList.appendChild(playerElement);
  }

  /**
   * @param {string} playerID
   * @param {string} newTitle
   * @param {boolean} isTitleExtractedFromUrl
   */
  setMediaElementPlayerTitle(playerID, newTitle, isTitleExtractedFromUrl) {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      if (!isTitleExtractedFromUrl || sidebarEntry.titleFromUrl) {
        sidebarEntry.title = newTitle;
        sidebarEntry.titleFromUrl = isTitleExtractedFromUrl;
      }
    }
  }

  /**
   * @param {string} playerID
   * @param {string} iconName
   */
  setMediaElementPlayerIcon(playerID, iconName) {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      sidebarEntry.setLeadingIcons([UI.Icon.create('smallicon-videoplayer-' + iconName, 'media-player')]);
    }
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {string} changeType
   */
  renderChanges(playerID, changes, changeType) {
    // We only want to try setting the title from the 'frame_title' and 'frame_url' properties.
    if (changeType === Media.MediaModel.MediaChangeTypeKeys.Property) {
      for (const change of changes) {
        // Sometimes frame_title can be an empty string.
        if (change.name === 'frame_title' && change.value) {
          this.setMediaElementPlayerTitle(playerID, /** @type {string} */ (change.value), false);
        }

        if (change.name === 'frame_url') {
          const url_path_component = change.value.substring(change.value.lastIndexOf('/') + 1);
          this.setMediaElementPlayerTitle(playerID, url_path_component, true);
        }
      }
    }

    if (changeType === Media.MediaModel.MediaChangeTypeKeys.Event) {
      let change_to = null;
      for (const change of changes) {
        if (change.name === 'Event') {
          if (change.value === 'PLAY') {
            change_to = 'playing';
          } else if (change.value === 'PAUSE') {
            change_to = 'paused';
          } else if (change.value === 'WEBMEDIAPLAYER_DESTROYED') {
            change_to = 'destroyed';
          }
        }
      }
      if (change_to) {
        this.setMediaElementPlayerIcon(playerID, change_to);
      }
    }
  }
};
