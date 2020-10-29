/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import * as UI from '../ui/ui.js';

import {ConsoleViewportElement} from './ConsoleViewport.js';  // eslint-disable-line no-unused-vars

/** @type {!WeakMap<!Element, !ConsoleViewMessage>} */
const elementToMessage = new WeakMap();

/**
 * @param {!Element} element
 */
export const getMessageForElement = element => {
  return elementToMessage.get(element);
};

// This value reflects the 18px min-height of .console-message, plus the
// 1px border of .console-message-wrapper. Keep in sync with consoleView.css.
const defaultConsoleRowHeight = 19;

/**
 * @param {?SDK.RuntimeModel.RuntimeModel} runtimeModel
 */
const parameterToRemoteObject = runtimeModel =>
    /**
     * @param {!SDK.RemoteObject.RemoteObject|!Protocol.Runtime.RemoteObject|string|undefined} parameter
     * @return {!SDK.RemoteObject.RemoteObject}
     */
    parameter => {
      if (parameter instanceof SDK.RemoteObject.RemoteObject) {
        return parameter;
      }
      if (!runtimeModel) {
        return SDK.RemoteObject.RemoteObject.fromLocalObject(parameter);
      }
      if (typeof parameter === 'object') {
        return runtimeModel.createRemoteObject(parameter);
      }
      return runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);
    };

/**
 * @implements {ConsoleViewportElement}
 */
export class ConsoleViewMessage {
  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {number} nestingLevel
   * @param {function(!Common.EventTarget.EventTargetEvent): void} onResize
   */
  constructor(consoleMessage, linkifier, nestingLevel, onResize) {
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._repeatCount = 1;
    this._closeGroupDecorationCount = 0;
    this._nestingLevel = nestingLevel;
    /** @type {!Array<{element: !HTMLElement, forceSelect: function():void}>} */
    this._selectableChildren = [];
    this._messageResized = onResize;
    /** @type {?HTMLElement} */
    this._element = null;

    this._previewFormatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    this._searchRegex = null;
    /** @type {?UI.Icon.Icon} */
    this._messageLevelIcon = null;
    this._traceExpanded = false;
    /** @type {?function(boolean):void} */
    this._expandTrace = null;
    /** @type {?HTMLElement} */
    this._anchorElement = null;
    /** @type {?HTMLElement} */
    this._contentElement = null;
    /** @type {?Array<!HTMLElement>} */
    this._nestingLevelMarkers = null;
    /** @type {!Array<!Element>} */
    this._searchHighlightNodes = [];
    /** @type {!Array<!UI.UIUtils.HighlightChange>} */
    this._searchHighlightNodeChanges = [];
    this._isVisible = false;
    this._cachedHeight = 0;
    this._messagePrefix = '';
    /** @type {?HTMLElement} */
    this._timestampElement = null;
    this._inSimilarGroup = false;
    /** @type {?HTMLElement} */
    this._similarGroupMarker = null;
    this._lastInSimilarGroup = false;
    this._groupKey = '';
    /** @type {?UI.UIUtils.DevToolsSmallBubble} */
    this._repeatCountElement = null;
  }

  /**
   * @override
   * @return {!HTMLElement}
   */
  element() {
    return this.toMessageElement();
  }

  /**
   * @override
   */
  wasShown() {
    this._isVisible = true;
  }

  onResize() {
  }

  /**
   * @override
   */
  willHide() {
    this._isVisible = false;
    this._cachedHeight = this.element().offsetHeight;
  }

  isVisible() {
    return this._isVisible;
  }

  /**
   * @return {number}
   */
  fastHeight() {
    if (this._cachedHeight) {
      return this._cachedHeight;
    }
    return this.approximateFastHeight();
  }

  approximateFastHeight() {
    return defaultConsoleRowHeight;
  }

  /**
   * @return {!SDK.ConsoleModel.ConsoleMessage}
   */
  consoleMessage() {
    return this._message;
  }

  /**
   * @return {!HTMLElement}
   */
  _buildMessage() {
    let messageElement;
    let messageText = this._message.messageText;
    if (this._message.source === SDK.ConsoleModel.MessageSource.ConsoleAPI) {
      switch (this._message.type) {
        case SDK.ConsoleModel.MessageType.Trace:
          messageElement = this._format(this._message.parameters || ['console.trace']);
          break;
        case SDK.ConsoleModel.MessageType.Clear:
          messageElement = document.createElement('span');
          messageElement.classList.add('console-info');
          if (Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').get()) {
            messageElement.textContent =
                Common.UIString.UIString('console.clear() was prevented due to \'Preserve log\'');
          } else {
            messageElement.textContent = Common.UIString.UIString('Console was cleared');
          }
          messageElement.title = ls`Clear all messages with ${
              UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('console.clear')}`;
          break;
        case SDK.ConsoleModel.MessageType.Dir: {
          const obj = this._message.parameters ? this._message.parameters[0] : undefined;
          const args = ['%O', obj];
          messageElement = this._format(args);
          break;
        }
        case SDK.ConsoleModel.MessageType.Profile:
        case SDK.ConsoleModel.MessageType.ProfileEnd:
          messageElement = this._format([messageText]);
          break;
        default: {
          if (this._message.type === SDK.ConsoleModel.MessageType.Assert) {
            this._messagePrefix = ls`Assertion failed: `;
          }
          if (this._message.parameters && this._message.parameters.length === 1) {
            const parameter = this._message.parameters[0];
            if (typeof parameter !== 'string' && parameter.type === 'string') {
              messageElement = this._tryFormatAsError(/** @type {string} */ (parameter.value));
            }
          }
          const args = this._message.parameters || [messageText];
          messageElement = messageElement || this._format(args);
        }
      }
    } else {
      if (this._message.source === SDK.ConsoleModel.MessageSource.Network) {
        messageElement = this._formatAsNetworkRequest() || this._format([messageText]);
      } else {
        const messageInParameters =
            this._message.parameters && messageText === /** @type {string} */ (this._message.parameters[0]);
        if (this._message.source === SDK.ConsoleModel.MessageSource.Violation) {
          messageText = Common.UIString.UIString('[Violation] %s', messageText);
        } else if (this._message.source === SDK.ConsoleModel.MessageSource.Intervention) {
          messageText = Common.UIString.UIString('[Intervention] %s', messageText);
        } else if (this._message.source === SDK.ConsoleModel.MessageSource.Deprecation) {
          messageText = Common.UIString.UIString('[Deprecation] %s', messageText);
        }
        const args = this._message.parameters || [messageText];
        if (messageInParameters) {
          args[0] = messageText;
        }
        messageElement = this._format(args);
      }
    }
    messageElement.classList.add('console-message-text');

    const formattedMessage = /** @type {!HTMLElement} */ (document.createElement('span'));
    formattedMessage.classList.add('source-code');
    this._anchorElement = this._buildMessageAnchor();
    if (this._anchorElement) {
      formattedMessage.appendChild(this._anchorElement);
    }
    formattedMessage.appendChild(messageElement);
    return formattedMessage;
  }

  /**
   * @return {?HTMLElement}
   */
  _formatAsNetworkRequest() {
    const request = SDK.NetworkLog.NetworkLog.requestForConsoleMessage(this._message);
    if (!request) {
      return null;
    }
    const messageElement = /** @type {!HTMLElement} */ (document.createElement('span'));
    if (this._message.level === SDK.ConsoleModel.MessageLevel.Error) {
      UI.UIUtils.createTextChild(messageElement, request.requestMethod + ' ');
      const linkElement = Components.Linkifier.Linkifier.linkifyRevealable(request, request.url(), request.url());
      // Focus is handled by the viewport.
      linkElement.tabIndex = -1;
      this._selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
      messageElement.appendChild(linkElement);
      if (request.failed) {
        UI.UIUtils.createTextChildren(messageElement, ' ', request.localizedFailDescription || '');
      }
      if (request.statusCode !== 0) {
        UI.UIUtils.createTextChildren(messageElement, ' ', String(request.statusCode));
      }
      if (request.statusText) {
        UI.UIUtils.createTextChildren(messageElement, ' (', request.statusText, ')');
      }
    } else {
      const messageText = this._message.messageText;
      const fragment = this._linkifyWithCustomLinkifier(messageText, (text, url, lineNumber, columnNumber) => {
        const linkElement = url === request.url() ?
            Components.Linkifier.Linkifier.linkifyRevealable(
                /** @type {!SDK.NetworkRequest.NetworkRequest} */ (request), url, request.url()) :
            Components.Linkifier.Linkifier.linkifyURL(
                url, /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({text, lineNumber, columnNumber}));
        linkElement.tabIndex = -1;
        this._selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
        return linkElement;
      });
      messageElement.appendChild(fragment);
    }
    return messageElement;
  }

  /**
   * @return {?HTMLElement}
   */
  _buildMessageAnchor() {
    /**
     * @param {!SDK.ConsoleModel.ConsoleMessage} message
     * @return {?HTMLElement}
     */
    const linkify = message => {
      if (message.scriptId) {
        return this._linkifyScriptId(message.scriptId, message.url || '', message.line, message.column);
      }
      if (message.stackTrace && message.stackTrace.callFrames.length) {
        return this._linkifyStackTraceTopFrame(message.stackTrace);
      }
      if (message.url && message.url !== 'undefined') {
        return this._linkifyLocation(message.url, message.line, message.column);
      }
      return null;
    };
    const anchorElement = linkify(this._message);
    // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
    if (anchorElement) {
      anchorElement.tabIndex = -1;
      this._selectableChildren.push({
        element: anchorElement,
        forceSelect: () => anchorElement.focus(),
      });
      const anchorWrapperElement = /** @type {!HTMLElement} */ (document.createElement('span'));
      anchorWrapperElement.classList.add('console-message-anchor');
      anchorWrapperElement.appendChild(anchorElement);
      UI.UIUtils.createTextChild(anchorWrapperElement, ' ');
      return anchorWrapperElement;
    }
    return null;
  }

  /**
   * @param {!SDK.RuntimeModel.RuntimeModel} runtimeModel
   * @return {!HTMLElement}
   */
  _buildMessageWithStackTrace(runtimeModel) {
    const toggleElement = /** @type {!HTMLElement} */ (document.createElement('div'));
    toggleElement.classList.add('console-message-stack-trace-toggle');
    const contentElement = toggleElement.createChild('div', 'console-message-stack-trace-wrapper');

    const messageElement = this._buildMessage();
    const icon = UI.Icon.Icon.create('smallicon-triangle-right', 'console-message-expand-icon');
    const clickableElement = contentElement.createChild('div');
    clickableElement.appendChild(icon);
    // Intercept focus to avoid highlight on click.
    clickableElement.tabIndex = -1;
    clickableElement.appendChild(messageElement);
    const stackTraceElement = contentElement.createChild('div');
    const stackTracePreview = Components.JSPresentationUtils.buildStackTracePreviewContents(
        runtimeModel.target(), this._linkifier,
        {stackTrace: this._message.stackTrace, contentUpdated: undefined, tabStops: undefined});
    stackTraceElement.appendChild(stackTracePreview.element);
    for (const linkElement of stackTracePreview.links) {
      this._selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
    }
    stackTraceElement.classList.add('hidden');
    UI.ARIAUtils.markAsTreeitem(this.element());
    UI.ARIAUtils.setExpanded(this.element(), false);
    this._expandTrace = expand => {
      icon.setIconType(expand ? 'smallicon-triangle-down' : 'smallicon-triangle-right');
      stackTraceElement.classList.toggle('hidden', !expand);
      UI.ARIAUtils.setExpanded(this.element(), expand);
      this._traceExpanded = expand;
    };

    /**
     * @this {!ConsoleViewMessage}
     * @param {!Event} event
     */
    const toggleStackTrace = event => {
      if (UI.UIUtils.isEditing() || contentElement.hasSelection()) {
        return;
      }
      this._expandTrace && this._expandTrace(stackTraceElement.classList.contains('hidden'));
      event.consume();
    };

    clickableElement.addEventListener('click', toggleStackTrace, false);
    if (this._message.type === SDK.ConsoleModel.MessageType.Trace) {
      this._expandTrace(true);
    }

    // @ts-ignore
    toggleElement._expandStackTraceForTest = this._expandTrace.bind(this, true);
    return toggleElement;
  }

  /**
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?HTMLElement}
   */
  _linkifyLocation(url, lineNumber, columnNumber) {
    const runtimeModel = this._message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }
    return this._linkifier.linkifyScriptLocation(
        runtimeModel.target(), /* scriptId */ null, url, lineNumber,
        {columnNumber, className: undefined, tabStop: undefined});
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {?HTMLElement}
   */
  _linkifyStackTraceTopFrame(stackTrace) {
    const runtimeModel = this._message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }
    return this._linkifier.linkifyStackTraceTopFrame(runtimeModel.target(), stackTrace);
  }

  /**
   * @param {string} scriptId
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?HTMLElement}
   */
  _linkifyScriptId(scriptId, url, lineNumber, columnNumber) {
    const runtimeModel = this._message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }
    return this._linkifier.linkifyScriptLocation(
        runtimeModel.target(), scriptId, url, lineNumber, {columnNumber, className: undefined, tabStop: undefined});
  }

  /**
   * @param {!Array.<!Protocol.Runtime.RemoteObject | !SDK.RemoteObject.RemoteObject | string | undefined>} rawParameters
   * @return {!HTMLElement}
   */
  _format(rawParameters) {
    // This node is used like a Builder. Values are continually appended onto it.
    const formattedResult = /** @type {!HTMLElement} */ (document.createElement('span'));
    if (this._messagePrefix) {
      formattedResult.createChild('span').textContent = this._messagePrefix;
    }
    if (!rawParameters.length) {
      return formattedResult;
    }

    // Formatting code below assumes that parameters are all wrappers whereas frontend console
    // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
    // FIXME: Only pass runtime wrappers here.
    let parameters = rawParameters.map(parameterToRemoteObject(this._message.runtimeModel()));

    // There can be string log and string eval result. We distinguish between them based on message type.
    const shouldFormatMessage =
        SDK.RemoteObject.RemoteObject.type(
            (/** @type {!Array.<!SDK.RemoteObject.RemoteObject>} **/ (parameters))[0]) === 'string' &&
        (this._message.type !== SDK.ConsoleModel.MessageType.Result ||
         this._message.level === SDK.ConsoleModel.MessageLevel.Error);

    // Multiple parameters with the first being a format string. Save unused substitutions.
    if (shouldFormatMessage) {
      const result = this._formatWithSubstitutionString(
          /** @type {string} **/ (parameters[0].description), parameters.slice(1), formattedResult);
      parameters = Array.from(result.unusedSubstitutions || []);
      if (parameters.length) {
        UI.UIUtils.createTextChild(formattedResult, ' ');
      }
    }

    // Single parameter, or unused substitutions from above.
    for (let i = 0; i < parameters.length; ++i) {
      // Inline strings when formatting.
      if (shouldFormatMessage && parameters[i].type === 'string') {
        formattedResult.appendChild(this._linkifyStringAsFragment(parameters[i].description || ''));
      } else {
        formattedResult.appendChild(this._formatParameter(parameters[i], false, true));
      }
      if (i < parameters.length - 1) {
        UI.UIUtils.createTextChild(formattedResult, ' ');
      }
    }
    return formattedResult;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} output
   * @param {boolean=} forceObjectFormat
   * @param {boolean=} includePreview
   * @return {!HTMLElement}
   */
  _formatParameter(output, forceObjectFormat, includePreview) {
    if (output.customPreview()) {
      return /** @type {!HTMLElement} */ ((new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(output)).element);
    }

    const type = forceObjectFormat ? 'object' : (output.subtype || output.type);
    let element;
    switch (type) {
      case 'error':
        element = this._formatParameterAsError(output);
        break;
      case 'function':
        element = this._formatParameterAsFunction(output, includePreview);
        break;
      case 'array':
      case 'arraybuffer':
      case 'blob':
      case 'dataview':
      case 'generator':
      case 'iterator':
      case 'map':
      case 'object':
      case 'promise':
      case 'proxy':
      case 'set':
      case 'typedarray':
      case 'weakmap':
      case 'weakset':
        element = this._formatParameterAsObject(output, includePreview);
        break;
      case 'node':
        element = output.isNode() ? this._formatParameterAsNode(output) : this._formatParameterAsObject(output, false);
        break;
      case 'string':
        element = this._formatParameterAsString(output);
        break;
      case 'boolean':
      case 'date':
      case 'null':
      case 'number':
      case 'regexp':
      case 'symbol':
      case 'undefined':
      case 'bigint':
        element = this._formatParameterAsValue(output);
        break;
      default:
        element = this._formatParameterAsValue(output);
        console.error('Tried to format remote object of unknown type.');
    }
    element.classList.add('object-value-' + type);
    element.classList.add('source-code');
    return element;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} obj
   * @return {!HTMLElement}
   * @suppress {accessControls}
   */
  _formatParameterAsValue(obj) {
    const result = /** @type {!HTMLElement} */ (document.createElement('span'));
    const description = obj.description || '';
    if (description.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue(
          document.createElement('span'), description, getLongStringVisibleLength());
      result.appendChild(propertyValue.element);
    } else {
      UI.UIUtils.createTextChild(result, description);
    }
    if (obj.objectId) {
      result.addEventListener('contextmenu', this._contextMenuEventFired.bind(this, obj), false);
    }
    return result;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} obj
   * @param {boolean=} includePreview
   * @return {!HTMLElement}
   */
  _formatParameterAsObject(obj, includePreview) {
    const titleElement = /** @type {!HTMLElement} */ (document.createElement('span'));
    titleElement.classList.add('console-object');
    if (includePreview && obj.preview) {
      titleElement.classList.add('console-object-preview');
      this._previewFormatter.appendObjectPreview(titleElement, obj.preview, false /* isEntry */);
    } else if (obj.type === 'function') {
      const functionElement = titleElement.createChild('span');
      ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.formatObjectAsFunction(obj, functionElement, false);
      titleElement.classList.add('object-value-function');
    } else {
      UI.UIUtils.createTextChild(titleElement, obj.description || '');
    }

    if (!obj.hasChildren || obj.customPreview()) {
      return titleElement;
    }

    const note = titleElement.createChild('span', 'object-state-note info-note');
    if (this._message.type === SDK.ConsoleModel.MessageType.QueryObjectResult) {
      note.title = ls`This value will not be collected until console is cleared.`;
    } else {
      note.title = ls`Value below was evaluated just now.`;
    }

    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(obj, titleElement, this._linkifier);
    section.element.classList.add('console-view-object-properties-section');
    section.enableContextMenu();
    section.setShowSelectionOnKeyboardFocus(true, true);
    this._selectableChildren.push(section);
    section.addEventListener(UI.TreeOutline.Events.ElementAttached, this._messageResized);
    section.addEventListener(UI.TreeOutline.Events.ElementExpanded, this._messageResized);
    section.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this._messageResized);
    return section.element;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} func
   * @param {boolean=} includePreview
   * @return {!HTMLElement}
   */
  _formatParameterAsFunction(func, includePreview) {
    const result = /** @type {!HTMLElement} */ (document.createElement('span'));
    SDK.RemoteObject.RemoteFunction.objectAsFunction(func).targetFunction().then(formatTargetFunction.bind(this));
    return result;

    /**
     * @param {!SDK.RemoteObject.RemoteObject} targetFunction
     * @this {ConsoleViewMessage}
     */
    function formatTargetFunction(targetFunction) {
      const functionElement = document.createElement('span');
      const promise = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.formatObjectAsFunction(
          targetFunction, functionElement, true, includePreview);
      result.appendChild(functionElement);
      if (targetFunction !== func) {
        const note = result.createChild('span', 'object-info-state-note');
        note.title = Common.UIString.UIString('Function was resolved from bound function.');
      }
      result.addEventListener('contextmenu', this._contextMenuEventFired.bind(this, targetFunction), false);
      promise.then(() => this._formattedParameterAsFunctionForTest());
    }
  }

  _formattedParameterAsFunctionForTest() {
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} obj
   * @param {!Event} event
   */
  _contextMenuEventFired(obj, event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(obj);
    contextMenu.show();
  }

  /**
   * @param {?SDK.RemoteObject.RemoteObject} object
   * @param {!Protocol.Runtime.PropertyPreview|!{name:(string|symbol), type: !Protocol.Runtime.PropertyPreviewType, value: (string|undefined)}} property
   * @param {!Array.<!{name:(string|symbol)}>} propertyPath
   * @return {!HTMLElement}
   */
  _renderPropertyPreviewOrAccessor(object, property, propertyPath) {
    if (property.type === 'accessor') {
      return this._formatAsAccessorProperty(object, propertyPath.map(property => property.name.toString()), false);
    }
    return this._previewFormatter.renderPropertyPreview(
        property.type, 'subtype' in property ? property.subtype : undefined, property.value);
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} remoteObject
   * @return {!HTMLElement}
   */
  _formatParameterAsNode(remoteObject) {
    const result = /** @type {!HTMLElement} */ (document.createElement('span'));

    const domModel = remoteObject.runtimeModel().target().model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return result;
    }
    domModel.pushObjectAsNodeToFrontend(remoteObject).then(async node => {
      if (!node) {
        result.appendChild(this._formatParameterAsObject(remoteObject, false));
        return;
      }
      const renderResult = await UI.UIUtils.Renderer.render(/** @type {!Object} */ (node));
      if (renderResult) {
        if (renderResult.tree) {
          this._selectableChildren.push(renderResult.tree);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementAttached, this._messageResized);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementExpanded, this._messageResized);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this._messageResized);
        }
        result.appendChild(renderResult.node);
      } else {
        result.appendChild(this._formatParameterAsObject(remoteObject, false));
      }
      this._formattedParameterAsNodeForTest();
    });

    return result;
  }

  _formattedParameterAsNodeForTest() {
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} output
   * @return {!HTMLElement}
   */
  _formatParameterAsString(output) {
    const span = /** @type {!HTMLElement} */ (document.createElement('span'));
    span.appendChild(this._linkifyStringAsFragment(output.description || ''));

    const result = /** @type {!HTMLElement} */ (document.createElement('span'));
    result.createChild('span', 'object-value-string-quote').textContent = '"';
    result.appendChild(span);
    result.createChild('span', 'object-value-string-quote').textContent = '"';
    return result;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} output
   * @return {!HTMLElement}
   */
  _formatParameterAsError(output) {
    const result = /** @type {!HTMLElement} */ (document.createElement('span'));
    const errorSpan = this._tryFormatAsError(output.description || '');
    result.appendChild(errorSpan ? errorSpan : this._linkifyStringAsFragment(output.description || ''));
    return result;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} output
   * @return {!HTMLElement}
   */
  _formatAsArrayEntry(output) {
    return this._previewFormatter.renderPropertyPreview(output.type, output.subtype, output.description);
  }

  /**
   * @param {?SDK.RemoteObject.RemoteObject} object
   * @param {!Array.<string>} propertyPath
   * @param {boolean} isArrayEntry
   * @return {!HTMLElement}
   */
  _formatAsAccessorProperty(object, propertyPath, isArrayEntry) {
    const rootElement =
        ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(
            object, propertyPath, onInvokeGetterClick.bind(this));

    /**
     * @param {!SDK.RemoteObject.CallFunctionResult} result
     * @this {ConsoleViewMessage}
     */
    function onInvokeGetterClick(result) {
      const wasThrown = result.wasThrown;
      const object = result.object;
      if (!object) {
        return;
      }
      rootElement.removeChildren();
      if (wasThrown) {
        const element = rootElement.createChild('span');
        element.textContent = Common.UIString.UIString('<exception>');
        element.title = /** @type {string} */ (object.description);
      } else if (isArrayEntry) {
        rootElement.appendChild(this._formatAsArrayEntry(object));
      } else {
        // Make a PropertyPreview from the RemoteObject similar to the backend logic.
        const maxLength = 100;
        const type = object.type;
        const subtype = object.subtype;
        let description = '';
        if (type !== 'function' && object.description) {
          if (type === 'string' || subtype === 'regexp') {
            description = object.description.trimMiddle(maxLength);
          } else {
            description = object.description.trimEndWithMaxLength(maxLength);
          }
        }
        rootElement.appendChild(this._previewFormatter.renderPropertyPreview(type, subtype, description));
      }
    }

    return rootElement;
  }

  /**
   * @param {string} format
   * @param {!Array.<!SDK.RemoteObject.RemoteObject>} parameters
   * @param {!HTMLElement} formattedResult
   * @return {!{formattedResult:!Element, unusedSubstitutions: ?ArrayLike<!SDK.RemoteObject.RemoteObject>}}
   */
  _formatWithSubstitutionString(format, parameters, formattedResult) {
    /**
     * @param {boolean} force
     * @param {boolean} includePreview
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     * @return {!HTMLElement|string|undefined}
     * @this {ConsoleViewMessage}
     */
    function parameterFormatter(force, includePreview, obj) {
      if (obj instanceof SDK.RemoteObject.RemoteObject) {
        return this._formatParameter(obj, force, includePreview);
      }
      return stringFormatter(obj);
    }

    /**
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     */
    function stringFormatter(obj) {
      if (obj === undefined) {
        return undefined;
      }
      if (typeof obj === 'string') {
        return obj;
      }
      return obj.description;
    }

    /**
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     */
    function floatFormatter(obj) {
      if (obj instanceof SDK.RemoteObject.RemoteObject) {
        if (typeof obj.value !== 'number') {
          return 'NaN';
        }
        return obj.value;
      }
      return undefined;
    }

    /**
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     */
    function integerFormatter(obj) {
      if (obj instanceof SDK.RemoteObject.RemoteObject) {
        if (obj.type === 'bigint') {
          return obj.description;
        }
        if (typeof obj.value !== 'number') {
          return 'NaN';
        }
        return Math.floor(obj.value);
      }
      return undefined;
    }

    /**
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     */
    function bypassFormatter(obj) {
      return (obj instanceof Node) ? obj : '';
    }

    /** @type {?Map<string, !{value:string, priority:string}>} */
    let currentStyle = null;
    /**
     * @param {!SDK.RemoteObject.RemoteObject|string|{description:string}|undefined} obj
     */
    function styleFormatter(obj) {
      currentStyle = new Map();
      const buffer = document.createElement('span');
      if (obj === undefined) {
        return;
      }
      if (typeof obj === 'string' || !obj.description) {
        return;
      }
      buffer.setAttribute('style', obj.description);
      for (const property of buffer.style) {
        if (isAllowedProperty(property)) {
          const info = {
            value: buffer.style.getPropertyValue(property),
            priority: buffer.style.getPropertyPriority(property)
          };
          currentStyle.set(property, info);
        }
      }
    }

    function rawFormatter(obj) {
      const rawElement = createElement('div');
      rawElement.setAttribute('class', 'raw-console-output');
      rawElement.innerHTML = obj.description || '';
      return rawElement;
    }

    /**
     * @param {string} property
     */
    function isAllowedProperty(property) {
      // Make sure that allowed properties do not interfere with link visibility.
      const prefixes = [
        'background', 'border', 'color', 'font', 'line', 'margin', 'padding', 'text', '-webkit-background',
        '-webkit-border', '-webkit-font', '-webkit-margin', '-webkit-padding', '-webkit-text'
      ];
      for (const prefix of prefixes) {
        if (property.startsWith(prefix)) {
          return true;
        }
      }
      return false;
    }

    /** @type {!Object.<string, function((string|!{description: string}|undefined|!SDK.RemoteObject.RemoteObject), !Platform.StringUtilities.FORMATTER_TOKEN):*>} */
    const formatters = {};
    // Firebug uses %o for formatting objects.
    formatters.o = parameterFormatter.bind(this, false /* force */, true /* includePreview */);
    formatters.s = stringFormatter;
    formatters.f = floatFormatter;
    // Firebug allows both %i and %d for formatting integers.
    formatters.i = integerFormatter;
    formatters.d = integerFormatter;

    // Firebug uses %c for styling the message.
    formatters.c = styleFormatter;

    // Support %O to force object formatting, instead of the type-based %o formatting.
    formatters.O = parameterFormatter.bind(this, true /* force */, false /* includePreview */);

    formatters._ = bypassFormatter;

    formatters.r = rawFormatter;

    /**
     * @param {!HTMLElement} a
     * @param {*} b
     * @this {!ConsoleViewMessage}
     * @return {!HTMLElement}
     */
    function append(a, b) {
      if (b instanceof Node) {
        a.appendChild(b);
        return a;
      }
      if (typeof b === 'undefined') {
        return a;
      }
      if (!currentStyle) {
        a.appendChild(this._linkifyStringAsFragment(String(b)));
        return a;
      }
      const lines = String(b).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineFragment = this._linkifyStringAsFragment(line);
        const wrapper = /** @type {!HTMLElement} */ (document.createElement('span'));
        wrapper.style.setProperty('contain', 'paint');
        wrapper.style.setProperty('display', 'inline-block');
        wrapper.style.setProperty('max-width', '100%');
        wrapper.appendChild(lineFragment);
        applyCurrentStyle(wrapper);
        for (const child of wrapper.children) {
          if (child.classList.contains('devtools-link') && child instanceof HTMLElement) {
            this._applyForcedVisibleStyle(child);
          }
        }
        a.appendChild(wrapper);
        if (i < lines.length - 1) {
          a.appendChild(document.createElement('br'));
        }
      }
      return a;
    }

    /**
     * @param {!HTMLElement} element
     */
    function applyCurrentStyle(element) {
      if (!currentStyle) {
        return;
      }
      for (const [property, {value, priority}] of currentStyle.entries()) {
        element.style.setProperty(/** @type {string} */ (property), value, priority);
      }
    }

    // Platform.StringUtilities.format does treat formattedResult like a Builder, result is an object.
    return Platform.StringUtilities.format(format, parameters, formatters, formattedResult, append.bind(this));
  }

  /**
   * @param {!HTMLElement} element
   */
  _applyForcedVisibleStyle(element) {
    element.style.setProperty('-webkit-text-stroke', '0', 'important');
    element.style.setProperty('text-decoration', 'underline', 'important');

    const themedColor = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgb(33%, 33%, 33%)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
    element.style.setProperty('color', themedColor, 'important');

    let backgroundColor = 'hsl(0, 0%, 100%)';
    if (this._message.level === SDK.ConsoleModel.MessageLevel.Error) {
      backgroundColor = 'hsl(0, 100%, 97%)';
    } else if (this._message.level === SDK.ConsoleModel.MessageLevel.Warning || this._shouldRenderAsWarning()) {
      backgroundColor = 'hsl(50, 100%, 95%)';
    }
    const themedBackgroundColor = ThemeSupport.ThemeSupport.instance().patchColorText(
        backgroundColor, ThemeSupport.ThemeSupport.ColorUsage.Background);
    element.style.setProperty('background-color', themedBackgroundColor, 'important');
  }

  /**
   * @param {!RegExp} regexObject
   * @return {boolean}
   */
  matchesFilterRegex(regexObject) {
    regexObject.lastIndex = 0;
    const contentElement = this.contentElement();
    const anchorText = this._anchorElement ? this._anchorElement.deepTextContent() : '';
    return (!!anchorText && regexObject.test(anchorText.trim())) ||
        regexObject.test(contentElement.deepTextContent().slice(anchorText.length));
  }

  /**
   * @param {string} filter
   * @return {boolean}
   */
  matchesFilterText(filter) {
    const text = this.contentElement().deepTextContent();
    return text.toLowerCase().includes(filter.toLowerCase());
  }

  updateTimestamp() {
    if (!this._contentElement) {
      return;
    }

    if (Common.Settings.Settings.instance().moduleSetting('consoleTimestampsEnabled').get()) {
      if (!this._timestampElement) {
        this._timestampElement = /** @type {!HTMLElement} */ (document.createElement('span'));
        this._timestampElement.classList.add('console-timestamp');
      }
      this._timestampElement.textContent = UI.UIUtils.formatTimestamp(this._message.timestamp, false) + ' ';
      this._timestampElement.title = UI.UIUtils.formatTimestamp(this._message.timestamp, true);
      this._contentElement.insertBefore(this._timestampElement, this._contentElement.firstChild);
    } else if (this._timestampElement) {
      this._timestampElement.remove();
      this._timestampElement = null;
    }
  }

  /**
   * @return {number}
   */
  nestingLevel() {
    return this._nestingLevel;
  }

  /**
   * @param {boolean} inSimilarGroup
   * @param {boolean=} isLast
   */
  setInSimilarGroup(inSimilarGroup, isLast) {
    this._inSimilarGroup = inSimilarGroup;
    this._lastInSimilarGroup = inSimilarGroup && !!isLast;
    if (this._similarGroupMarker && !inSimilarGroup) {
      this._similarGroupMarker.remove();
      this._similarGroupMarker = null;
    } else if (this._element && !this._similarGroupMarker && inSimilarGroup) {
      this._similarGroupMarker = /** @type {!HTMLElement} */ (document.createElement('div'));
      this._similarGroupMarker.classList.add('nesting-level-marker');
      this._element.insertBefore(this._similarGroupMarker, this._element.firstChild);
      this._similarGroupMarker.classList.toggle('group-closed', this._lastInSimilarGroup);
    }
  }

  /**
   * @return {boolean}
   */
  isLastInSimilarGroup() {
    return !!this._inSimilarGroup && !!this._lastInSimilarGroup;
  }

  resetCloseGroupDecorationCount() {
    if (!this._closeGroupDecorationCount) {
      return;
    }
    this._closeGroupDecorationCount = 0;
    this._updateCloseGroupDecorations();
  }

  incrementCloseGroupDecorationCount() {
    ++this._closeGroupDecorationCount;
    this._updateCloseGroupDecorations();
  }

  _updateCloseGroupDecorations() {
    if (!this._nestingLevelMarkers) {
      return;
    }
    for (let i = 0, n = this._nestingLevelMarkers.length; i < n; ++i) {
      const marker = this._nestingLevelMarkers[i];
      marker.classList.toggle('group-closed', n - i <= this._closeGroupDecorationCount);
    }
  }

  /**
   * @return {number}
   */
  _focusedChildIndex() {
    if (!this._selectableChildren.length) {
      return -1;
    }
    return this._selectableChildren.findIndex(child => child.element.hasFocus());
  }

  /**
   * @param {!KeyboardEvent} event
   */
  _onKeyDown(event) {
    if (UI.UIUtils.isEditing() || !this._element || !this._element.hasFocus() || this._element.hasSelection()) {
      return;
    }
    if (this.maybeHandleOnKeyDown(event)) {
      event.consume(true);
    }
  }

  /**
   * @protected
   * @param {!KeyboardEvent} event
   */
  maybeHandleOnKeyDown(event) {
    // Handle trace expansion.
    const focusedChildIndex = this._focusedChildIndex();
    const isWrapperFocused = focusedChildIndex === -1;
    if (this._expandTrace && isWrapperFocused) {
      if ((event.key === 'ArrowLeft' && this._traceExpanded) || (event.key === 'ArrowRight' && !this._traceExpanded)) {
        this._expandTrace(!this._traceExpanded);
        return true;
      }
    }
    if (!this._selectableChildren.length) {
      return false;
    }

    if (event.key === 'ArrowLeft') {
      this._element && this._element.focus();
      return true;
    }
    if (event.key === 'ArrowRight') {
      if (isWrapperFocused && this._selectNearestVisibleChild(0)) {
        return true;
      }
    }
    if (event.key === 'ArrowUp') {
      const firstVisibleChild = this._nearestVisibleChild(0);
      if (this._selectableChildren[focusedChildIndex] === firstVisibleChild && firstVisibleChild) {
        this._element && this._element.focus();
        return true;
      }
      if (this._selectNearestVisibleChild(focusedChildIndex - 1, true /* backwards */)) {
        return true;
      }
    }
    if (event.key === 'ArrowDown') {
      if (isWrapperFocused && this._selectNearestVisibleChild(0)) {
        return true;
      }
      if (!isWrapperFocused && this._selectNearestVisibleChild(focusedChildIndex + 1)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {number} fromIndex
   * @param {boolean=} backwards
   * @return {boolean}
   */
  _selectNearestVisibleChild(fromIndex, backwards) {
    const nearestChild = this._nearestVisibleChild(fromIndex, backwards);
    if (nearestChild) {
      nearestChild.forceSelect();
      return true;
    }
    return false;
  }

  /**
   * @param {number} fromIndex
   * @param {boolean=} backwards
   * @return {?{element: !Element, forceSelect: function()}}
   */
  _nearestVisibleChild(fromIndex, backwards) {
    const childCount = this._selectableChildren.length;
    if (fromIndex < 0 || fromIndex >= childCount) {
      return null;
    }
    const direction = backwards ? -1 : 1;
    let index = fromIndex;

    while (!this._selectableChildren[index].element.offsetParent) {
      index += direction;
      if (index < 0 || index >= childCount) {
        return null;
      }
    }
    return this._selectableChildren[index];
  }

  /**
   * @override
   */
  focusLastChildOrSelf() {
    if (this._element && !this._selectNearestVisibleChild(this._selectableChildren.length - 1, true /* backwards */)) {
      this._element.focus();
    }
  }

  /**
   * @protected
   * @param {!HTMLElement} element
   */
  setContentElement(element) {
    console.assert(!this._contentElement, 'Cannot set content element twice');
    this._contentElement = element;
  }

  /**
   * @protected
   * @return {?HTMLElement}
   */
  getContentElement() {
    return this._contentElement;
  }

  /**
   * @return {!HTMLElement}
   */
  contentElement() {
    if (this._contentElement) {
      return this._contentElement;
    }

    const contentElement = /** @type {!HTMLElement} */ (document.createElement('div'));
    contentElement.classList.add('console-message');
    if (this._messageLevelIcon) {
      contentElement.appendChild(this._messageLevelIcon);
    }
    this._contentElement = contentElement;

    const runtimeModel = this._message.runtimeModel();
    let formattedMessage;
    const shouldIncludeTrace = !!this._message.stackTrace &&
        (this._message.source === SDK.ConsoleModel.MessageSource.Network ||
         this._message.source === SDK.ConsoleModel.MessageSource.Violation ||
         this._message.level === SDK.ConsoleModel.MessageLevel.Error ||
         this._message.level === SDK.ConsoleModel.MessageLevel.Warning ||
         this._message.type === SDK.ConsoleModel.MessageType.Trace);
    if (runtimeModel && shouldIncludeTrace) {
      formattedMessage = this._buildMessageWithStackTrace(runtimeModel);
    } else {
      formattedMessage = this._buildMessage();
    }
    contentElement.appendChild(formattedMessage);

    this.updateTimestamp();
    return this._contentElement;
  }

  /**
   * @return {!HTMLElement}
   */
  toMessageElement() {
    if (this._element) {
      return this._element;
    }

    this._element = /** @type {!HTMLElement} */ (document.createElement('div'));
    this._element.tabIndex = -1;
    this._element.addEventListener('keydown', /** @type {!EventListener} */ (this._onKeyDown.bind(this)));
    this.updateMessageElement();
    return this._element;
  }

  updateMessageElement() {
    if (!this._element) {
      return;
    }

    this._element.className = 'console-message-wrapper';
    this._element.removeChildren();
    if (this._message.isGroupStartMessage()) {
      this._element.classList.add('console-group-title');
    }
    if (this._message.source === SDK.ConsoleModel.MessageSource.ConsoleAPI) {
      this._element.classList.add('console-from-api');
    }
    if (this._inSimilarGroup) {
      this._similarGroupMarker = /** @type {!HTMLElement} */ (this._element.createChild('div', 'nesting-level-marker'));
      this._similarGroupMarker.classList.toggle('group-closed', this._lastInSimilarGroup);
    }

    this._nestingLevelMarkers = [];
    for (let i = 0; i < this._nestingLevel; ++i) {
      this._nestingLevelMarkers.push(this._element.createChild('div', 'nesting-level-marker'));
    }
    this._updateCloseGroupDecorations();
    elementToMessage.set(this._element, this);

    switch (this._message.level) {
      case SDK.ConsoleModel.MessageLevel.Verbose:
        this._element.classList.add('console-verbose-level');
        break;
      case SDK.ConsoleModel.MessageLevel.Info:
        this._element.classList.add('console-info-level');
        if (this._message.type === SDK.ConsoleModel.MessageType.System) {
          this._element.classList.add('console-system-type');
        }
        break;
      case SDK.ConsoleModel.MessageLevel.Warning:
        this._element.classList.add('console-warning-level');
        break;
      case SDK.ConsoleModel.MessageLevel.Error:
        this._element.classList.add('console-error-level');
        break;
    }
    this._updateMessageLevelIcon();
    if (this._shouldRenderAsWarning()) {
      this._element.classList.add('console-warning-level');
    }

    this._element.appendChild(this.contentElement());
    if (this._repeatCount > 1) {
      this._showRepeatCountElement();
    }
  }

  /**
   * @return {boolean}
   */
  _shouldRenderAsWarning() {
    return (this._message.level === SDK.ConsoleModel.MessageLevel.Verbose ||
            this._message.level === SDK.ConsoleModel.MessageLevel.Info) &&
        (this._message.source === SDK.ConsoleModel.MessageSource.Violation ||
         this._message.source === SDK.ConsoleModel.MessageSource.Deprecation ||
         this._message.source === SDK.ConsoleModel.MessageSource.Intervention ||
         this._message.source === SDK.ConsoleModel.MessageSource.Recommendation);
  }

  _updateMessageLevelIcon() {
    let iconType = '';
    let accessibleName = '';
    if (this._message.level === SDK.ConsoleModel.MessageLevel.Warning) {
      iconType = 'smallicon-warning';
      accessibleName = ls`Warning`;
    } else if (this._message.level === SDK.ConsoleModel.MessageLevel.Error) {
      iconType = 'smallicon-error';
      accessibleName = ls`Error`;
    }
    if (!this._messageLevelIcon) {
      if (!iconType) {
        return;
      }
      this._messageLevelIcon = UI.Icon.Icon.create('', 'message-level-icon');
      if (this._contentElement) {
        this._contentElement.insertBefore(this._messageLevelIcon, this._contentElement.firstChild);
      }
    }
    this._messageLevelIcon.setIconType(iconType);
    UI.ARIAUtils.setAccessibleName(this._messageLevelIcon, accessibleName);
  }

  /**
   * @return {number}
   */
  repeatCount() {
    return this._repeatCount || 1;
  }

  resetIncrementRepeatCount() {
    this._repeatCount = 1;
    if (!this._repeatCountElement) {
      return;
    }

    this._repeatCountElement.remove();
    if (this._contentElement) {
      this._contentElement.classList.remove('repeated-message');
    }
    this._repeatCountElement = null;
  }

  incrementRepeatCount() {
    this._repeatCount++;
    this._showRepeatCountElement();
  }

  /**
   * @param {number} repeatCount
   */
  setRepeatCount(repeatCount) {
    this._repeatCount = repeatCount;
    this._showRepeatCountElement();
  }

  /**
   * @suppress {checkTypes}
   */
  _showRepeatCountElement() {
    if (!this._element) {
      return;
    }

    if (!this._repeatCountElement) {
      this._repeatCountElement =
          /** @type {!UI.UIUtils.DevToolsSmallBubble} */ (document.createElement('span', {is: 'dt-small-bubble'}));
      this._repeatCountElement.classList.add('console-message-repeat-count');
      switch (this._message.level) {
        case SDK.ConsoleModel.MessageLevel.Warning:
          this._repeatCountElement.type = 'warning';
          break;
        case SDK.ConsoleModel.MessageLevel.Error:
          this._repeatCountElement.type = 'error';
          break;
        case SDK.ConsoleModel.MessageLevel.Verbose:
          this._repeatCountElement.type = 'verbose';
          break;
        default:
          this._repeatCountElement.type = 'info';
      }
      if (this._shouldRenderAsWarning()) {
        this._repeatCountElement.type = 'warning';
      }

      this._element.insertBefore(this._repeatCountElement, this._contentElement);
      this.contentElement().classList.add('repeated-message');
    }
    this._repeatCountElement.textContent = `${this._repeatCount}`;
    let accessibleName = ls`Repeat ${this._repeatCount}`;
    if (this._message.level === SDK.ConsoleModel.MessageLevel.Warning) {
      accessibleName = ls`Warning ${accessibleName}`;
    } else if (this._message.level === SDK.ConsoleModel.MessageLevel.Error) {
      accessibleName = ls`Error ${accessibleName}`;
    }
    UI.ARIAUtils.setAccessibleName(this._repeatCountElement, accessibleName);
  }

  get text() {
    return this._message.messageText;
  }

  /**
   * @return {string}
   */
  toExportString() {
    const lines = [];
    const nodes = this.contentElement().childTextNodes();
    const messageContent = nodes.map(Components.Linkifier.Linkifier.untruncatedNodeText).join('');
    for (let i = 0; i < this.repeatCount(); ++i) {
      lines.push(messageContent);
    }
    return lines.join('\n');
  }

  /**
   * @param {?RegExp} regex
   */
  setSearchRegex(regex) {
    if (this._searchHighlightNodeChanges && this._searchHighlightNodeChanges.length) {
      UI.UIUtils.revertDomChanges(this._searchHighlightNodeChanges);
    }
    this._searchRegex = regex;
    this._searchHighlightNodes = [];
    this._searchHighlightNodeChanges = [];
    if (!this._searchRegex) {
      return;
    }

    const text = this.contentElement().deepTextContent();
    let match;
    this._searchRegex.lastIndex = 0;
    const sourceRanges = [];
    while ((match = this._searchRegex.exec(text)) && match[0]) {
      sourceRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
    }

    if (sourceRanges.length) {
      this._searchHighlightNodes =
          UI.UIUtils.highlightSearchResults(this.contentElement(), sourceRanges, this._searchHighlightNodeChanges);
    }
  }

  /**
   * @return {?RegExp}
   */
  searchRegex() {
    return this._searchRegex;
  }

  /**
   * @return {number}
   */
  searchCount() {
    return this._searchHighlightNodes.length;
  }

  /**
   * @param {number} index
   * @return {!Element}
   */
  searchHighlightNode(index) {
    return this._searchHighlightNodes[index];
  }

  /**
   * @param {string} string
   * @return {?HTMLElement}
   */
  _tryFormatAsError(string) {
    /**
     * @param {string} prefix
     */
    function startsWith(prefix) {
      return string.startsWith(prefix);
    }

    const runtimeModel = this._message.runtimeModel();
    const errorPrefixes =
        ['EvalError', 'ReferenceError', 'SyntaxError', 'TypeError', 'RangeError', 'Error', 'URIError'];
    if (!runtimeModel || !errorPrefixes.some(startsWith)) {
      return null;
    }
    const debuggerModel = runtimeModel.debuggerModel();
    const baseURL = runtimeModel.target().inspectedURL();

    const lines = string.split('\n');
    const links = [];
    let position = 0;
    for (let i = 0; i < lines.length; ++i) {
      position += i > 0 ? lines[i - 1].length + 1 : 0;
      const isCallFrameLine = /^\s*at\s/.test(lines[i]);
      if (!isCallFrameLine && links.length) {
        return null;
      }

      if (!isCallFrameLine) {
        continue;
      }

      let openBracketIndex = -1;
      let closeBracketIndex = -1;
      const inBracketsWithLineAndColumn = /\([^\)\(]+:\d+:\d+\)/g;
      const inBrackets = /\([^\)\(]+\)/g;
      let lastMatch = null;
      let currentMatch;
      while ((currentMatch = inBracketsWithLineAndColumn.exec(lines[i]))) {
        lastMatch = currentMatch;
      }
      if (!lastMatch) {
        while ((currentMatch = inBrackets.exec(lines[i]))) {
          lastMatch = currentMatch;
        }
      }
      if (lastMatch) {
        openBracketIndex = lastMatch.index;
        closeBracketIndex = lastMatch.index + lastMatch[0].length - 1;
      }
      const hasOpenBracket = openBracketIndex !== -1;
      const left = hasOpenBracket ? openBracketIndex + 1 : lines[i].indexOf('at') + 3;
      const right = hasOpenBracket ? closeBracketIndex : lines[i].length;
      const linkCandidate = lines[i].substring(left, right);
      const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(linkCandidate);
      if (!splitResult) {
        return null;
      }

      if (splitResult.url === '<anonymous>') {
        continue;
      }
      let url = parseOrScriptMatch(splitResult.url);
      if (!url && Common.ParsedURL.ParsedURL.isRelativeURL(splitResult.url)) {
        url = parseOrScriptMatch(Common.ParsedURL.ParsedURL.completeURL(baseURL, splitResult.url));
      }
      if (!url) {
        return null;
      }

      links.push({
        url: url,
        positionLeft: position + left,
        positionRight: position + right,
        lineNumber: splitResult.lineNumber,
        columnNumber: splitResult.columnNumber
      });
    }

    if (!links.length) {
      return null;
    }

    const formattedResult = /** @type {!HTMLElement} */ (document.createElement('span'));
    let start = 0;
    for (let i = 0; i < links.length; ++i) {
      formattedResult.appendChild(this._linkifyStringAsFragment(string.substring(start, links[i].positionLeft)));
      const scriptLocationLink = this._linkifier.linkifyScriptLocation(
          debuggerModel.target(), null, links[i].url, links[i].lineNumber,
          {columnNumber: links[i].columnNumber, className: undefined, tabStop: undefined});
      scriptLocationLink.tabIndex = -1;
      this._selectableChildren.push({element: scriptLocationLink, forceSelect: () => scriptLocationLink.focus()});
      formattedResult.appendChild(scriptLocationLink);
      start = links[i].positionRight;
    }

    if (start !== string.length) {
      formattedResult.appendChild(this._linkifyStringAsFragment(string.substring(start)));
    }

    return formattedResult;

    /**
     * @param {?string} url
     * @return {?string}
     */
    function parseOrScriptMatch(url) {
      if (!url) {
        return null;
      }
      const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
      if (parsedURL) {
        return parsedURL.url;
      }
      if (debuggerModel.scriptsForSourceURL(url).length) {
        return url;
      }
      return null;
    }
  }

  /**
   * @param {string} string
   * @param {function(string,string,number=,number=):!Node} linkifier
   * @return {!DocumentFragment}
   * @suppress {accessControls}
   */
  _linkifyWithCustomLinkifier(string, linkifier) {
    if (string.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue(
          document.createElement('span'), string, getLongStringVisibleLength());
      const fragment = document.createDocumentFragment();
      fragment.appendChild(propertyValue.element);
      return fragment;
    }
    const container = document.createDocumentFragment();
    const tokens = ConsoleViewMessage._tokenizeMessageText(string);
    for (const token of tokens) {
      if (!token.text) {
        continue;
      }
      switch (token.type) {
        case 'url': {
          const realURL = (token.text.startsWith('www.') ? 'http://' + token.text : token.text);
          const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(realURL);
          const sourceURL = Common.ParsedURL.ParsedURL.removeWasmFunctionInfoFromURL(splitResult.url);
          let linkNode;
          if (splitResult) {
            linkNode = linkifier(token.text, sourceURL, splitResult.lineNumber, splitResult.columnNumber);
          } else {
            linkNode = linkifier(token.text, '');
          }
          container.appendChild(linkNode);
          break;
        }
        default:
          container.appendChild(document.createTextNode(token.text));
          break;
      }
    }
    return container;
  }

  /**
   * @param {string} string
   * @return {!DocumentFragment}
   */
  _linkifyStringAsFragment(string) {
    return this._linkifyWithCustomLinkifier(string, (text, url, lineNumber, columnNumber) => {
      const options = {text, lineNumber, columnNumber};
      const linkElement = Components.Linkifier.Linkifier.linkifyURL(
          url, /** @type {!Components.Linkifier.LinkifyURLOptions} */ (options));
      linkElement.tabIndex = -1;
      this._selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
      return linkElement;
    });
  }

  /**
   * @param {string} string
   * @return {!Array<{type: (string|undefined), text: string}>}
   * @suppress {accessControls}
   */
  static _tokenizeMessageText(string) {
    const {tokenizerRegexes, tokenizerTypes} = getOrCreateTokenizers();
    if (string.length > getMaxTokenizableStringLength()) {
      return [{text: string, type: undefined}];
    }
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(string, tokenizerRegexes);
    return results.map(result => ({text: result.value, type: tokenizerTypes[result.regexIndex]}));
  }

  /**
   * @return {string}
   */
  groupKey() {
    if (!this._groupKey) {
      this._groupKey = this._message.groupCategoryKey() + ':' + this.groupTitle();
    }
    return this._groupKey;
  }

  /**
   * @return {string}
   */
  groupTitle() {
    const tokens = ConsoleViewMessage._tokenizeMessageText(this._message.messageText);
    const result = tokens.reduce((acc, token) => {
      let text = token.text;
      if (token.type === 'url') {
        text = Common.UIString.UIString('<URL>');
      } else if (token.type === 'time') {
        text = Common.UIString.UIString('took <N>ms');
      } else if (token.type === 'event') {
        text = Common.UIString.UIString('<some> event');
      } else if (token.type === 'milestone') {
        text = Common.UIString.UIString(' M<XX>');
      } else if (token.type === 'autofill') {
        text = Common.UIString.UIString('<attribute>');
      }
      return acc + text;
    }, '');
    return result.replace(/[%]o/g, '');
  }
}

/** @type {?Array<!RegExp>} */
let tokenizerRegexes = null;
/** @type {?Array<string>} */
let tokenizerTypes = null;

/**
 * @return {!{tokenizerRegexes:!Array<!RegExp>, tokenizerTypes:Array<string>}}
 */
function getOrCreateTokenizers() {
  if (!tokenizerRegexes || !tokenizerTypes) {
    const controlCodes = '\\u0000-\\u0020\\u007f-\\u009f';
    const linkStringRegex = new RegExp(
        '(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' + controlCodes + '"]{2,}[^\\s' + controlCodes +
            '"\')}\\],:;.!?]',
        'u');
    const pathLineRegex = /(?:\/[\w\.-]*)+\:[\d]+/;
    const timeRegex = /took [\d]+ms/;
    const eventRegex = /'\w+' event/;
    const milestoneRegex = /\sM[6-7]\d/;
    const autofillRegex = /\(suggested: \"[\w-]+\"\)/;
    /** @type {!Map<!RegExp, string>} */
    const handlers = new Map();
    handlers.set(linkStringRegex, 'url');
    handlers.set(pathLineRegex, 'url');
    handlers.set(timeRegex, 'time');
    handlers.set(eventRegex, 'event');
    handlers.set(milestoneRegex, 'milestone');
    handlers.set(autofillRegex, 'autofill');
    tokenizerRegexes = Array.from(handlers.keys());
    tokenizerTypes = Array.from(handlers.values());
    return {tokenizerRegexes, tokenizerTypes};
  }
  return {tokenizerRegexes, tokenizerTypes};
}

export class ConsoleGroupViewMessage extends ConsoleViewMessage {
  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {number} nestingLevel
   * @param {function(): void} onToggle
   * @param {function(!Common.EventTarget.EventTargetEvent): void} onResize
   */
  constructor(consoleMessage, linkifier, nestingLevel, onToggle, onResize) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, nestingLevel, onResize);
    this._collapsed = consoleMessage.type === SDK.ConsoleModel.MessageType.StartGroupCollapsed;
    /** @type {?UI.Icon.Icon} */
    this._expandGroupIcon = null;
    this._onToggle = onToggle;
  }

  /**
   * @param {boolean} collapsed
   */
  _setCollapsed(collapsed) {
    this._collapsed = collapsed;
    if (this._expandGroupIcon) {
      this._expandGroupIcon.setIconType(this._collapsed ? 'smallicon-triangle-right' : 'smallicon-triangle-down');
    }
    this._onToggle.call(null);
  }

  /**
   * @return {boolean}
   */
  collapsed() {
    return this._collapsed;
  }

  /**
   * @override
   * @param {!KeyboardEvent} event
   */
  maybeHandleOnKeyDown(event) {
    const focusedChildIndex = this._focusedChildIndex();
    if (focusedChildIndex === -1) {
      if ((event.key === 'ArrowLeft' && !this._collapsed) || (event.key === 'ArrowRight' && this._collapsed)) {
        this._setCollapsed(!this._collapsed);
        return true;
      }
    }
    return super.maybeHandleOnKeyDown(event);
  }

  /**
   * @override
   * @return {!HTMLElement}
   */
  toMessageElement() {
    /** @type {?HTMLElement} */
    let element = this._element || null;
    if (!element) {
      element = super.toMessageElement();
      const iconType = this._collapsed ? 'smallicon-triangle-right' : 'smallicon-triangle-down';
      this._expandGroupIcon = UI.Icon.Icon.create(iconType, 'expand-group-icon');
      // Intercept focus to avoid highlight on click.
      this.contentElement().tabIndex = -1;
      if (this._repeatCountElement) {
        this._repeatCountElement.insertBefore(this._expandGroupIcon, this._repeatCountElement.firstChild);
      } else {
        element.insertBefore(this._expandGroupIcon, this._contentElement);
      }
      element.addEventListener('click', () => this._setCollapsed(!this._collapsed));
    }
    return element;
  }

  /**
   * @override
   */
  _showRepeatCountElement() {
    super._showRepeatCountElement();
    if (this._repeatCountElement && this._expandGroupIcon) {
      this._repeatCountElement.insertBefore(this._expandGroupIcon, this._repeatCountElement.firstChild);
    }
  }
}

export class ConsoleCommand extends ConsoleViewMessage {
  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {number} nestingLevel
   * @param {function(!Common.EventTarget.EventTargetEvent):void} onResize
   */
  constructor(consoleMessage, linkifier, nestingLevel, onResize) {
    super(consoleMessage, linkifier, nestingLevel, onResize);
    /** @type {?HTMLElement} */
    this._formattedCommand = null;
  }

  /**
   * @override
   * @return {!HTMLElement}
   */
  contentElement() {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }
    const newContentElement = /** @type {!HTMLElement} */ (document.createElement('div'));
    this.setContentElement(newContentElement);
    newContentElement.classList.add('console-user-command');
    const icon = UI.Icon.Icon.create('smallicon-user-command', 'command-result-icon');
    newContentElement.appendChild(icon);

    elementToMessage.set(newContentElement, this);

    this._formattedCommand = /** @type {!HTMLElement} */ (document.createElement('span'));
    this._formattedCommand.classList.add('source-code');
    this._formattedCommand.textContent = Platform.StringUtilities.replaceControlCharacters(this.text);
    newContentElement.appendChild(this._formattedCommand);

    if (this._formattedCommand.textContent.length < MaxLengthToIgnoreHighlighter) {
      const javascriptSyntaxHighlighter = new UI.SyntaxHighlighter.SyntaxHighlighter('text/javascript', true);
      javascriptSyntaxHighlighter.syntaxHighlightNode(this._formattedCommand).then(this._updateSearch.bind(this));
    } else {
      this._updateSearch();
    }

    this.updateTimestamp();
    return newContentElement;
  }

  _updateSearch() {
    this.setSearchRegex(this.searchRegex());
  }
}

export class ConsoleCommandResult extends ConsoleViewMessage {
  /**
   * @override
   * @return {!HTMLElement}
   */
  contentElement() {
    const element = super.contentElement();
    if (!element.classList.contains('console-user-command-result')) {
      element.classList.add('console-user-command-result');
      if (this.consoleMessage().level === SDK.ConsoleModel.MessageLevel.Info) {
        const icon = UI.Icon.Icon.create('smallicon-command-result', 'command-result-icon');
        element.insertBefore(icon, element.firstChild);
      }
    }
    return element;
  }
}

export class ConsoleTableMessageView extends ConsoleViewMessage {
  /**
   * @param {!SDK.ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {number} nestingLevel
   * @param {function(!Common.EventTarget.EventTargetEvent): void} onResize
   */
  constructor(consoleMessage, linkifier, nestingLevel, onResize) {
    super(consoleMessage, linkifier, nestingLevel, onResize);
    console.assert(consoleMessage.type === SDK.ConsoleModel.MessageType.Table);
    /** @type {?DataGrid.SortableDataGrid.SortableDataGrid<?>} */
    this._dataGrid = null;
  }

  /**
   * @override
   */
  wasShown() {
    if (this._dataGrid) {
      this._dataGrid.updateWidths();
    }
    super.wasShown();
  }

  /**
   * @override
   */
  onResize() {
    if (!this.isVisible()) {
      return;
    }
    if (this._dataGrid) {
      this._dataGrid.onResize();
    }
  }

  /**
   * @override
   * @return {!HTMLElement}
   */
  contentElement() {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }

    const newContentElement = /** @type {!HTMLElement} */ (document.createElement('div'));
    newContentElement.classList.add('console-message');
    if (this._messageLevelIcon) {
      newContentElement.appendChild(this._messageLevelIcon);
    }
    this.setContentElement(newContentElement);

    newContentElement.appendChild(this._buildTableMessage());
    this.updateTimestamp();
    return newContentElement;
  }

  /**
   * @return {!HTMLElement}
   */
  _buildTableMessage() {
    const formattedMessage = /** @type {!HTMLElement} */ (document.createElement('span'));
    formattedMessage.classList.add('source-code');
    this._anchorElement = this._buildMessageAnchor();
    if (this._anchorElement) {
      formattedMessage.appendChild(this._anchorElement);
    }

    const table = this._message.parameters && this._message.parameters.length ? this._message.parameters[0] : null;
    if (!table) {
      return this._buildMessage();
    }
    const actualTable = parameterToRemoteObject(this._message.runtimeModel())(table);
    if (!actualTable || !actualTable.preview) {
      return this._buildMessage();
    }

    const rawValueColumnSymbol = Symbol('rawValueColumn');
    /** @type {!Array<string|symbol>} */
    const columnNames = [];
    const preview = actualTable.preview;
    const rows = [];
    for (let i = 0; i < preview.properties.length; ++i) {
      const rowProperty = preview.properties[i];
      /** @type {!Array<!Protocol.Runtime.PropertyPreview|!{name:(string|symbol), type: !Protocol.Runtime.PropertyPreviewType, value: (string|undefined)}>} */
      let rowSubProperties;
      if (rowProperty.valuePreview) {
        rowSubProperties = rowProperty.valuePreview.properties;
      } else if (rowProperty.value) {
        rowSubProperties = [{name: rawValueColumnSymbol, type: rowProperty.type, value: rowProperty.value}];
      } else {
        continue;
      }

      /** @type {!Map<string|symbol, !HTMLElement>} */
      const rowValue = new Map();
      const maxColumnsToRender = 20;
      for (let j = 0; j < rowSubProperties.length; ++j) {
        const cellProperty = rowSubProperties[j];
        let columnRendered = columnNames.indexOf(cellProperty.name) !== -1;
        if (!columnRendered) {
          if (columnNames.length === maxColumnsToRender) {
            continue;
          }
          columnRendered = true;
          columnNames.push(cellProperty.name);
        }

        if (columnRendered) {
          const cellElement =
              this._renderPropertyPreviewOrAccessor(actualTable, cellProperty, [rowProperty, cellProperty]);
          cellElement.classList.add('console-message-nowrap-below');
          rowValue.set(cellProperty.name, cellElement);
        }
      }
      rows.push({rowName: rowProperty.name, rowValue});
    }

    const flatValues = [];
    for (const {rowName, rowValue} of rows) {
      flatValues.push(rowName);
      for (let j = 0; j < columnNames.length; ++j) {
        flatValues.push(rowValue.get(columnNames[j]));
      }
    }
    columnNames.unshift(Common.UIString.UIString('(index)'));
    const columnDisplayNames =
        columnNames.map(name => name === rawValueColumnSymbol ? Common.UIString.UIString('Value') : name.toString());

    if (flatValues.length) {
      this._dataGrid = DataGrid.SortableDataGrid.SortableDataGrid.create(columnDisplayNames, flatValues, ls`Console`);
      if (this._dataGrid) {
        this._dataGrid.setStriped(true);
        this._dataGrid.setFocusable(false);

        const formattedResult = document.createElement('span');
        formattedResult.classList.add('console-message-text');
        const tableElement = formattedResult.createChild('div', 'console-message-formatted-table');
        const dataGridContainer = tableElement.createChild('span');
        tableElement.appendChild(this._formatParameter(actualTable, true, false));
        dataGridContainer.appendChild(this._dataGrid.element);
        formattedMessage.appendChild(formattedResult);
        this._dataGrid.renderInline();
      }
    }
    return formattedMessage;
  }

  /**
   * @override
   * @return {number}
   */
  approximateFastHeight() {
    const table = this._message.parameters && this._message.parameters[0];
    if (table && typeof table !== 'string' && table.preview) {
      return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }
}

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @const
 * @type {number}
 */
const MaxLengthToIgnoreHighlighter = 10000;

/**
 * @const
 * @type {number}
 */
export const MaxLengthForLinks = 40;

let _MaxTokenizableStringLength = 10000;
let _LongStringVisibleLength = 5000;

export const getMaxTokenizableStringLength = () => {
  return _MaxTokenizableStringLength;
};

/**
 * @param {number} length
 */
export const setMaxTokenizableStringLength = length => {
  _MaxTokenizableStringLength = length;
};

export const getLongStringVisibleLength = () => {
  return _LongStringVisibleLength;
};

/**
 * @param {number} length
 */
export const setLongStringVisibleLength = length => {
  _LongStringVisibleLength = length;
};
