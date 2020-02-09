// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SourcesSearchScope} from './SourcesSearchScope.js';

export class SearchSourcesView extends Search.SearchView {
  constructor() {
    super('sources');
  }

  /**
   * @param {string} query
   * @param {boolean=} searchImmediately
   * @return {!Promise}
   */
  static async openSearch(query, searchImmediately) {
    const view = self.UI.viewManager.view('sources.search-sources-tab');
    // Deliberately use target location name so that it could be changed
    // based on the setting later.
    const location = await self.UI.viewManager.resolveLocation('drawer-view');
    location.appendView(view);
    await self.UI.viewManager.revealView(/** @type {!UI.View} */ (view));
    const widget = /** @type {!Search.SearchView} */ (await view.widget());
    widget.toggle(query, !!searchImmediately);
    return widget;
  }

  /**
   * @override
   * @return {!Search.SearchScope}
   */
  createScope() {
    return new SourcesSearchScope();
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
    this._showSearch();
    return true;
  }

  /**
   * @return {!Promise}
   */
  _showSearch() {
    const selection = self.UI.inspectorView.element.window().getSelection();
    let queryCandidate = '';
    if (selection.rangeCount) {
      queryCandidate = selection.toString().replace(/\r?\n.*/, '');
    }

    return SearchSourcesView.openSearch(queryCandidate);
  }
}
