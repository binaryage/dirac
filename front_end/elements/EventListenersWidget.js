/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as EventListeners from '../event_listeners/event_listeners.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.Toolbar.ItemsProvider}
 * @unrestricted
 */
export class EventListenersWidget extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super();
    this._toolbarItems = [];

    this._showForAncestorsSetting = Common.Settings.Settings.instance().moduleSetting('showEventListenersForAncestors');
    this._showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this._dispatchFilterBySetting =
        Common.Settings.Settings.instance().createSetting('eventListenerDispatchFilterType', DispatchFilterBy.All);
    this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this._showFrameworkListenersSetting =
        Common.Settings.Settings.instance().createSetting('showFrameowkrListeners', true);
    this._showFrameworkListenersSetting.setTitle(Common.UIString.UIString('Framework listeners'));
    this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));
    this._eventListenersView = new EventListeners.EventListenersView.EventListenersView(this.update.bind(this));
    this._eventListenersView.show(this.element);

    const refreshButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Refresh'), 'largeicon-refresh');
    refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.update.bind(this));
    this._toolbarItems.push(refreshButton);
    this._toolbarItems.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showForAncestorsSetting, Common.UIString.UIString('Show listeners on the ancestors'),
        Common.UIString.UIString('Ancestors')));
    const dispatchFilter =
        new UI.Toolbar.ToolbarComboBox(this._onDispatchFilterTypeChanged.bind(this), ls`Event listeners category`);

    /**
     * @param {string} name
     * @param {string} value
     * @this {EventListenersWidget}
     */
    function addDispatchFilterOption(name, value) {
      const option = dispatchFilter.createOption(name, value);
      if (value === this._dispatchFilterBySetting.get()) {
        dispatchFilter.select(option);
      }
    }
    addDispatchFilterOption.call(this, Common.UIString.UIString('All'), DispatchFilterBy.All);
    addDispatchFilterOption.call(this, Common.UIString.UIString('Passive'), DispatchFilterBy.Passive);
    addDispatchFilterOption.call(this, Common.UIString.UIString('Blocking'), DispatchFilterBy.Blocking);
    dispatchFilter.setMaxWidth(200);
    this._toolbarItems.push(dispatchFilter);
    this._toolbarItems.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showFrameworkListenersSetting, Common.UIString.UIString('Resolve event listeners bound with framework')));

    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    if (this._lastRequestedNode) {
      this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(_objectGroupName);
      delete this._lastRequestedNode;
    }
    const node = self.UI.context.flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return Promise.resolve();
    }
    this._lastRequestedNode = node;
    const selectedNodeOnly = !this._showForAncestorsSetting.get();
    const promises = [];
    promises.push(node.resolveToObject(_objectGroupName));
    if (!selectedNodeOnly) {
      let currentNode = node.parentNode;
      while (currentNode) {
        promises.push(currentNode.resolveToObject(_objectGroupName));
        currentNode = currentNode.parentNode;
      }
      promises.push(this._windowObjectInNodeContext(node));
    }
    return Promise.all(promises)
        .then(this._eventListenersView.addObjects.bind(this._eventListenersView))
        .then(this._showFrameworkListenersChanged.bind(this));
  }

  /**
   * @override
   * @return {!Array<!UI.Toolbar.ToolbarItem>}
   */
  toolbarItems() {
    return this._toolbarItems;
  }

  /**
   * @param {!Event} event
   */
  _onDispatchFilterTypeChanged(event) {
    this._dispatchFilterBySetting.set(event.target.value);
  }

  _showFrameworkListenersChanged() {
    const dispatchFilter = this._dispatchFilterBySetting.get();
    const showPassive = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Passive;
    const showBlocking = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Blocking;
    this._eventListenersView.showFrameworkListeners(
        this._showFrameworkListenersSetting.get(), showPassive, showBlocking);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  _windowObjectInNodeContext(node) {
    const executionContexts = node.domModel().runtimeModel().executionContexts();
    let context = null;
    if (node.frameId()) {
      for (let i = 0; i < executionContexts.length; ++i) {
        const executionContext = executionContexts[i];
        if (executionContext.frameId === node.frameId() && executionContext.isDefault) {
          context = executionContext;
        }
      }
    } else {
      context = executionContexts[0];
    }
    return context
        .evaluate(
            {
              expression: 'self',
              objectGroup: _objectGroupName,
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: false,
              generatePreview: false
            },
            /* userGesture */ false,
            /* awaitPromise */ false)
        .then(result => result.object || null);
  }

  _eventListenersArrivedForTest() {
  }
}

export const DispatchFilterBy = {
  All: 'All',
  Blocking: 'Blocking',
  Passive: 'Passive'
};

export const _objectGroupName = 'event-listeners-panel';
