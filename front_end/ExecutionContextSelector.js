// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.ExecutionContextSelector = function() {
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.ExecutionContextSelector.prototype = {

    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        //FIXME: once we will have plain list here, we will get rid of this check.
        if (target.isWorkerTarget() && !WebInspector.context.flavor(WebInspector.ExecutionContext)) {
            WebInspector.context.setFlavor(WebInspector.ExecutionContext, new WebInspector.ExecutionContext(target, undefined, "", true))
            return;
        }

        target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
        target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameDetached, this._frameGone, this);
        target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameNavigated, this._frameGone, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        target.runtimeModel.removeEventListener(WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
        target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameDetached, this._frameGone, this);
        target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameNavigated, this._frameGone, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _frameGone: function(event)
    {
        var frame = /** @type {!WebInspector.ResourceTreeFrame} */ (event.data);

        var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!currentExecutionContext || currentExecutionContext.target() !== frame.target() || currentExecutionContext.frameId !== frame.id)
            return;

        var targets = WebInspector.targetManager.targets();
        var otherContext = null;
        for (var i = 0; i < targets.length; ++i) {
            var mainFrame = targets[i].resourceTreeModel.mainFrame;
            var mainExecutionContextList = targets[i].runtimeModel.contextListByFrame(mainFrame);

            if (!mainExecutionContextList || !mainExecutionContextList.mainWorldContext())
                continue;

            var mainExecutionContext = mainExecutionContextList.mainWorldContext();

            if (mainExecutionContext.target() !== currentExecutionContext.target() || mainExecutionContext.frameId !== frame.id) {
                otherContext = mainExecutionContext;
                break;
            }
        }
        WebInspector.context.setFlavor(WebInspector.ExecutionContext, otherContext);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onExecutionContextCreated: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext}*/ (event.data);
        if (!WebInspector.context.flavor(WebInspector.ExecutionContext))
            WebInspector.context.setFlavor(WebInspector.ExecutionContext, executionContext);
    }

}

/**
 * @param {!Element} proxyElement
 * @param {!Range} wordRange
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
WebInspector.ExecutionContextSelector.completionsForTextPromptInCurrentContext = function(proxyElement, wordRange, force, completionsReadyCallback)
{
    var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
    if (!executionContext) {
        completionsReadyCallback([]);
        return;
    }
    executionContext.completionsForTextPrompt(proxyElement, wordRange, force, completionsReadyCallback);
}