// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.InspectorDispatcher}
 */
export default class TargetDetachedDialog extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    if (target.parentTarget()) {
      return;
    }
    target.registerInspectorDispatcher(this);
    target.inspectorAgent().enable();
    this._hideCrashedDialog = null;
    TargetDetachedDialog._disconnectedScreenWithReasonWasShown = false;
  }

  /**
   * @override
   * @param {string} reason
   */
  detached(reason) {
    TargetDetachedDialog._disconnectedScreenWithReasonWasShown = true;
    UI.RemoteDebuggingTerminatedScreen.show(reason);
  }

  static webSocketConnectionLost() {
    UI.RemoteDebuggingTerminatedScreen.show(ls`WebSocket disconnected`);
  }

  /**
   * @override
   */
  targetCrashed() {
    const dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    this._hideCrashedDialog = dialog.hide.bind(dialog);
    new UI.TargetCrashedScreen(() => this._hideCrashedDialog = null).show(dialog.contentElement);
    dialog.show();
  }

  /**
   * @override;
   */
  targetReloadedAfterCrash() {
    this.target().runtimeAgent().runIfWaitingForDebugger();
    if (this._hideCrashedDialog) {
      this._hideCrashedDialog.call(null);
      this._hideCrashedDialog = null;
    }
  }
}

/* Legacy exported object */
self.Components = self.Components || {};

/* Legacy exported object */
Components = Components || {};

/** @constructor */
Components.TargetDetachedDialog = TargetDetachedDialog;

SDK.SDKModel.register(TargetDetachedDialog, SDK.Target.Capability.Inspector, true);