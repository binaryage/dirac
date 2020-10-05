// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Search from '../search/search.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {SourcesSearchScope} from './SourcesSearchScope.js';

export class SearchSourcesView extends Search.SearchView.SearchView {
  constructor() {
    super('sources');
  }

  /**
   * @param {string} query
   * @param {boolean=} searchImmediately
   * @return {!Promise<!UI.Widget.Widget>}
   */
  static async openSearch(query, searchImmediately) {
    const view =
        /** @type {!UI.View.View} */ (UI.ViewManager.ViewManager.instance().view('sources.search-sources-tab'));
    // Deliberately use target location name so that it could be changed
    // based on the setting later.
    const location = /** @type {!UI.View.ViewLocation} */ (
        /** @type {*} */ (await UI.ViewManager.ViewManager.instance().resolveLocation('drawer-view')));
    location.appendView(view);
    await UI.ViewManager.ViewManager.instance().revealView(/** @type {!UI.View.View} */ (view));
    const widget = /** @type {!Search.SearchView.SearchView} */ (await view.widget());
    widget.toggle(query, !!searchImmediately);
    return widget;
  }

  /**
   * @override
   * @return {!Search.SearchConfig.SearchScope}
   */
  createScope() {
    return new SourcesSearchScope();
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    this._showSearch();
    return true;
  }

  /**
   * @return {!Promise<!UI.Widget.Widget>}
   */
  _showSearch() {
    const selection = UI.InspectorView.InspectorView.instance().element.window().getSelection();
    let queryCandidate = '';
    if (selection && selection.rangeCount) {
      queryCandidate = selection.toString().replace(/\r?\n.*/, '');
    }

    return SearchSourcesView.openSearch(queryCandidate);
  }
}
