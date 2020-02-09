// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ConsoleFilter, FilterType} from './ConsoleFilter.js';
import {ConsoleViewMessage} from './ConsoleViewMessage.js';  // eslint-disable-line no-unused-vars

export class ConsoleSidebar extends UI.VBox {
  constructor() {
    super(true);
    this.setMinimumSize(125, 0);

    this._tree = new UI.TreeOutlineInShadow();
    this._tree.registerRequiredCSS('console/consoleSidebar.css');
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));
    this.contentElement.appendChild(this._tree.element);
    /** @type {?UI.TreeElement} */
    this._selectedTreeElement = null;
    /** @type {!Array<!FilterTreeElement>} */
    this._treeElements = [];
    const selectedFilterSetting = self.Common.settings.createSetting('console.sidebarSelectedFilter', null);

    const Levels = SDK.ConsoleMessage.MessageLevel;
    const consoleAPIParsedFilters =
        [{key: FilterType.Source, text: SDK.ConsoleMessage.MessageSource.ConsoleAPI, negative: false}];
    this._appendGroup(
        _groupName.All, [], ConsoleFilter.allLevelsFilterValue(), UI.Icon.create('mediumicon-list'),
        selectedFilterSetting);
    this._appendGroup(
        _groupName.ConsoleAPI, consoleAPIParsedFilters, ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.create('mediumicon-account-circle'), selectedFilterSetting);
    this._appendGroup(
        _groupName.Error, [], ConsoleFilter.singleLevelMask(Levels.Error), UI.Icon.create('mediumicon-error-circle'),
        selectedFilterSetting);
    this._appendGroup(
        _groupName.Warning, [], ConsoleFilter.singleLevelMask(Levels.Warning),
        UI.Icon.create('mediumicon-warning-triangle'), selectedFilterSetting);
    this._appendGroup(
        _groupName.Info, [], ConsoleFilter.singleLevelMask(Levels.Info), UI.Icon.create('mediumicon-info-circle'),
        selectedFilterSetting);
    this._appendGroup(
        _groupName.Verbose, [], ConsoleFilter.singleLevelMask(Levels.Verbose), UI.Icon.create('mediumicon-bug'),
        selectedFilterSetting);
    const selectedTreeElementName = selectedFilterSetting.get();
    const defaultTreeElement =
        this._treeElements.find(x => x.name() === selectedTreeElementName) || this._treeElements[0];
    defaultTreeElement.select();
  }

  /**
   * @param {string} name
   * @param {!Array<!TextUtils.FilterParser.ParsedFilter>} parsedFilters
   * @param {!Object<string, boolean>} levelsMask
   * @param {!Element} icon
   * @param {!Common.Setting} selectedFilterSetting
   */
  _appendGroup(name, parsedFilters, levelsMask, icon, selectedFilterSetting) {
    const filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
    const treeElement = new FilterTreeElement(filter, icon, selectedFilterSetting);
    this._tree.appendChild(treeElement);
    this._treeElements.push(treeElement);
  }

  clear() {
    for (const treeElement of this._treeElements) {
      treeElement.clear();
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    for (const treeElement of this._treeElements) {
      treeElement.onMessageAdded(viewMessage);
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    if (!this._selectedTreeElement) {
      return true;
    }
    return this._selectedTreeElement._filter.shouldBeVisible(viewMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _selectionChanged(event) {
    this._selectedTreeElement = /** @type {!UI.TreeElement} */ (event.data);
    this.dispatchEventToListeners(Events.FilterSelected);
  }
}

/** @enum {symbol} */
export const Events = {
  FilterSelected: Symbol('FilterSelected')
};

export class URLGroupTreeElement extends UI.TreeElement {
  /**
   * @param {!ConsoleFilter} filter
   */
  constructor(filter) {
    super(filter.name);
    this._filter = filter;
    this._countElement = this.listItemElement.createChild('span', 'count');
    const leadingIcons = [UI.Icon.create('largeicon-navigator-file')];
    this.setLeadingIcons(leadingIcons);
    this._messageCount = 0;
  }

  incrementAndUpdateCounter() {
    this._messageCount++;
    this._countElement.textContent = this._messageCount;
  }
}

export class FilterTreeElement extends UI.TreeElement {
  /**
   * @param {!ConsoleFilter} filter
   * @param {!Element} icon
   * @param {!Common.Setting} selectedFilterSetting
   */
  constructor(filter, icon, selectedFilterSetting) {
    super(filter.name);
    this._filter = filter;
    this._selectedFilterSetting = selectedFilterSetting;
    /** @type {!Map<?string, !URLGroupTreeElement>} */
    this._urlTreeElements = new Map();
    this.setLeadingIcons([icon]);
    this._messageCount = 0;
    this._updateCounter();
  }

  clear() {
    this._urlTreeElements.clear();
    this.removeChildren();
    this._messageCount = 0;
    this._updateCounter();
  }

  /**
   * @return {string}
   */
  name() {
    return this._filter.name;
  }

  /**
   * @param {boolean=} selectedByUser
   * @return {boolean}
   * @override
   */
  onselect(selectedByUser) {
    this._selectedFilterSetting.set(this._filter.name);
    return super.onselect(selectedByUser);
  }

  _updateCounter() {
    if (!this._messageCount) {
      this.title = _groupNoMessageTitleMap.get(this._filter.name);
    } else if (this._messageCount === 1) {
      this.title = _groupSingularTitleMap.get(this._filter.name);
    } else {
      this.title = String.sprintf(_groupPluralTitleMap.get(this._filter.name), this._messageCount);
    }

    this.setExpandable(!!this.childCount());
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK.ConsoleMessage.MessageType.Command &&
        message.type !== SDK.ConsoleMessage.MessageType.Result && !message.isGroupMessage();
    if (!this._filter.shouldBeVisible(viewMessage) || !shouldIncrementCounter) {
      return;
    }
    const child = this._childElement(message.url);
    child.incrementAndUpdateCounter();
    this._messageCount++;
    this._updateCounter();
  }

  /**
   * @param {string=} url
   * @return {!URLGroupTreeElement}
   */
  _childElement(url) {
    const urlValue = url || null;
    let child = this._urlTreeElements.get(urlValue);
    if (child) {
      return child;
    }

    const filter = this._filter.clone();
    const parsedURL = urlValue ? Common.ParsedURL.fromString(urlValue) : null;
    if (urlValue) {
      filter.name = parsedURL ? parsedURL.displayName : urlValue;
    } else {
      filter.name = Common.UIString('<other>');
    }
    filter.parsedFilters.push({key: FilterType.Url, text: urlValue, negative: false});
    child = new URLGroupTreeElement(filter);
    if (urlValue) {
      child.tooltip = urlValue;
    }
    this._urlTreeElements.set(urlValue, child);
    this.appendChild(child);
    return child;
  }
}

/** @enum {string} */
const _groupName = {
  ConsoleAPI: 'user message',
  All: 'message',
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
  Verbose: 'verbose'
};

/** @const {!Map<string, string>} */
const _groupSingularTitleMap = new Map([
  [_groupName.ConsoleAPI, ls`1 user message`], [_groupName.All, ls`1 message`], [_groupName.Error, ls`1 error`],
  [_groupName.Warning, ls`1 warning`], [_groupName.Info, ls`1 info`], [_groupName.Verbose, ls`1 verbose`]
]);

/** @const {!Map<string, string>} */
const _groupPluralTitleMap = new Map([
  [_groupName.ConsoleAPI, ls`%d user messages`], [_groupName.All, ls`%d messages`], [_groupName.Error, ls`%d errors`],
  [_groupName.Warning, ls`%d warnings`], [_groupName.Info, ls`%d info`], [_groupName.Verbose, ls`%d verbose`]
]);

/** @const {!Map<string, string>} */
const _groupNoMessageTitleMap = new Map([
  [_groupName.ConsoleAPI, ls`No user messages`], [_groupName.All, ls`No messages`], [_groupName.Error, ls`No errors`],
  [_groupName.Warning, ls`No warnings`], [_groupName.Info, ls`No info`], [_groupName.Verbose, ls`No verbose`]
]);
