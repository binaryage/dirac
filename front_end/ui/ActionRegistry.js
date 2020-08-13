// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';  // eslint-disable-line no-unused-vars

import {Action} from './Action.js';
import {Context} from './Context.js';  // eslint-disable-line no-unused-vars

export class ActionRegistry {
  constructor() {
    /** @type {!Map.<string, !Action>} */
    this._actionsById = new Map();
    this._registerActions();
  }

  _registerActions() {
    // @ts-ignore
    // TODO(crbug.com/1058320): Use Runtime.instance() once it no longer crashes at this point.
    self.runtime.extensions('action').forEach(registerExtension, this);

    /**
     * @param {!Root.Runtime.Extension} extension
     * @this {ActionRegistry}
     */
    function registerExtension(extension) {
      const actionId = extension.descriptor().actionId;
      if (!actionId) {
        console.error(`No actionId provided for extension ${extension.descriptor().name}`);
        return;
      }
      console.assert(!this._actionsById.get(actionId));

      const action = new Action(extension);
      if (!action.category() || action.title()) {
        this._actionsById.set(actionId, action);
      } else {
        console.error(`Category actions require a title for command menu: ${actionId}`);
      }
      if (!extension.canInstantiate()) {
        action.setEnabled(false);
      }
    }
  }

  /**
   * @return {!Array.<!Action>}
   */
  availableActions() {
    // @ts-ignore
    // TODO(crbug.com/1058320): Replace self.UI.context global.
    return this.applicableActions([...this._actionsById.keys()], self.UI.context);
  }

  /**
   * @return {!Array.<!Action>}
   */
  actions() {
    return [...this._actionsById.values()];
  }

  /**
   * @param {!Array.<string>} actionIds
   * @param {!Context} context
   * @return {!Array.<!Action>}
   */
  applicableActions(actionIds, context) {
    const extensions = [];
    for (const actionId of actionIds) {
      const action = this._actionsById.get(actionId);
      if (action && action.enabled()) {
        extensions.push(action.extension());
      }
    }
    return [...context.applicableExtensions(extensions)].map(extensionToAction.bind(this));

    /**
     * @param {!Root.Runtime.Extension} extension
     * @return {!Action}
     * @this {ActionRegistry}
     */
    function extensionToAction(extension) {
      const actionId = /** @type {string} */ (extension.descriptor().actionId);
      return /** @type {!Action} */ (this.action(actionId));
    }
  }

  /**
   * @param {string} actionId
   * @return {?Action}
   */
  action(actionId) {
    return this._actionsById.get(actionId) || null;
  }
}
