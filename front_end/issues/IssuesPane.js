// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Components from '../components/components.js';
import * as Elements from '../elements/elements.js';
import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {AggregatedIssue, Events as IssueAggregatorEvents, IssueAggregator} from './IssueAggregator.js';  // eslint-disable-line no-unused-vars
import {createIssueDescriptionFromMarkdown} from './MarkdownIssueDescription.js';

/**
 * @param {string} path
 * @return {string}
 */
const extractShortPath = path => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

class AffectedResourcesView extends UI.TreeOutline.TreeElement {
  /**
   * @param {!IssueView} parent
   * @param {!{singular:string, plural:string}} resourceName - Singular and plural of the affected resource name.
   */
  constructor(parent, resourceName) {
    super();
    this.toggleOnClick = true;
    /** @type {!IssueView} */
    this._parent = parent;
    this._resourceName = resourceName;
    /** @type {!Element} */
    this._affectedResourcesCountElement = this.createAffectedResourcesCounter();
    /** @type {!Element} */
    this._affectedResources = this.createAffectedResources();
    this._affectedResourcesCount = 0;
    /** @type {?Common.EventTarget.EventDescriptor} */
    this._networkListener = null;
    /** @type {!Array<!Common.EventTarget.EventDescriptor>} */
    this._frameListeners = [];
    /** @type {!Set<string>} */
    this._unresolvedRequestIds = new Set();
    /** @type {!Set<string>} */
    this._unresolvedFrameIds = new Set();
  }

  /**
   * @returns {!Element}
   */
  createAffectedResourcesCounter() {
    const counterLabel = document.createElement('div');
    counterLabel.classList.add('affected-resource-label');
    this.listItemElement.appendChild(counterLabel);
    return counterLabel;
  }

  /**
   * @returns {!Element}
   */
  createAffectedResources() {
    const body = new UI.TreeOutline.TreeElement();
    const affectedResources = document.createElement('table');
    affectedResources.classList.add('affected-resource-list');
    body.listItemElement.appendChild(affectedResources);
    this.appendChild(body);

    return affectedResources;
  }

  /**
   *
   * @param {number} count
   */
  getResourceName(count) {
    if (count === 1) {
      return this._resourceName.singular;
    }
    return this._resourceName.plural;
  }

  /**
   * @param {number} count
   */
  updateAffectedResourceCount(count) {
    this._affectedResourcesCount = count;
    this._affectedResourcesCountElement.textContent = `${count} ${this.getResourceName(count)}`;
    this.hidden = this._affectedResourcesCount === 0;
    this._parent.updateAffectedResourceVisibility();
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this._affectedResourcesCount === 0;
  }

  clear() {
    this._affectedResources.textContent = '';
  }

  expandIfOneResource() {
    if (this._affectedResourcesCount === 1) {
      this.expand();
    }
  }

  /**
   * This function resolves a requestId to network requests. If the requestId does not resolve, a listener is installed
   * that takes care of updating the view if the network request is added. This is useful if the issue is added before
   * the network request gets reported.
   * @param {string} requestId
   * @return {!Array<!SDK.NetworkRequest.NetworkRequest>}
   */
  _resolveRequestId(requestId) {
    const requests = SDK.NetworkLog.NetworkLog.instance().requestsForId(requestId);
    if (!requests.length) {
      this._unresolvedRequestIds.add(requestId);
      if (!this._networkListener) {
        this._networkListener = SDK.NetworkLog.NetworkLog.instance().addEventListener(
            SDK.NetworkLog.Events.RequestAdded, this._onRequestAdded, this);
      }
    }
    return requests;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestAdded(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    const requestWasUnresolved = this._unresolvedRequestIds.delete(request.requestId());
    if (this._unresolvedRequestIds.size === 0 && this._networkListener) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.EventTarget.removeEventListeners([this._networkListener]);
      this._networkListener = null;
    }
    if (requestWasUnresolved) {
      this.update();
    }
  }

  /**
   * This function resolves a frameId to a ResourceTreeFrame. If the frameId does not resolve, or hasn't navigated yet,
   * a listener is installed that takes care of updating the view if the frame is added. This is useful if the issue is
   * added before the frame gets reported.
   * @param {!Protocol.Page.FrameId} frameId
   * @return {?SDK.ResourceTreeModel.ResourceTreeFrame}
   */
  _resolveFrameId(frameId) {
    const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
    if (!frame || !frame.url) {
      this._unresolvedFrameIds.add(frameId);
      if (!this._frameListeners.length) {
        const addListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameAddedToTarget, this._onFrameChanged, this);
        const navigateListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameNavigated, this._onFrameChanged, this);
        this._frameListeners = [addListener, navigateListener];
      }
    }
    return frame;
  }

  /**
   *
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onFrameChanged(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data.frame);
    if (!frame.url) {
      return;
    }
    const frameWasUnresolved = this._unresolvedFrameIds.delete(frame.id);
    if (this._unresolvedFrameIds.size === 0 && this._frameListeners.length) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.EventTarget.removeEventListeners(this._frameListeners);
      this._frameListeners = [];
    }
    if (frameWasUnresolved) {
      this.update();
    }
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   * @returns {!HTMLElement}
   */
  _createFrameCell(frameId) {
    const frame = this._resolveFrameId(frameId);
    const url = frame && (frame.unreachableUrl() || frame.url) || ls`unknown`;

    const frameCell = /** @type {!HTMLElement} */ (document.createElement('td'));
    frameCell.classList.add('affected-resource-cell');
    if (frame) {
      const icon = UI.Icon.Icon.create('mediumicon-elements-panel', 'icon');
      icon.classList.add('link');
      icon.onclick = async () => {
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (frame) {
          const ownerNode = await frame.getOwnerDOMNodeOrDocument();
          if (ownerNode) {
            Common.Revealer.reveal(ownerNode);
          }
        }
      };
      UI.Tooltip.Tooltip.install(icon, ls`Click to reveal the frame's DOM node in the Elements panel`);
      frameCell.appendChild(icon);
    }
    frameCell.appendChild(document.createTextNode(url));
    frameCell.onmouseenter = () => {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
      if (frame) {
        frame.highlight();
      }
    };
    frameCell.onmouseleave = () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return frameCell;
  }

  /**
   * @param {!Protocol.Audits.AffectedRequest} request
   * @returns {!HTMLElement}
   */
  _createRequestCell(request) {
    let url = request.url;
    let filename = url ? extractShortPath(url) : '';
    const requestCell = /** @type {!HTMLElement} */ (document.createElement('td'));
    requestCell.classList.add('affected-resource-cell');
    const icon = UI.Icon.Icon.create('mediumicon-network-panel', 'icon');
    requestCell.appendChild(icon);

    const requests = this._resolveRequestId(request.requestId);
    if (requests.length) {
      const request = requests[0];
      requestCell.onclick = () => {
        Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers);
      };
      requestCell.classList.add('link');
      icon.classList.add('link');
      url = request.url();
      filename = extractShortPath(url);
      icon.title = ls`Click to show request in the network panel`;
    } else {
      icon.title = ls`Request unavailable in the network panel, try reloading the inspected page`;
      icon.classList.add('unavailable');
    }
    if (url) {
      requestCell.title = url;
    }
    requestCell.appendChild(document.createTextNode(filename));
    return requestCell;
  }

  /**
   * @virtual
   * @return {void}
   */
  update() {
    throw new Error('This should never be called, did you forget to override?');
  }
}

class AffectedElementsView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`element`, plural: ls`elements`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!SDK.Issue.AffectedElement>} affectedElements
   */
  async _appendAffectedElements(affectedElements) {
    let count = 0;
    for (const element of affectedElements) {
      await this._appendAffectedElement(element);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!SDK.Issue.AffectedElement} element
   */
  async _appendAffectedElement({backendNodeId, nodeName}) {
    const mainTarget = /** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget());
    const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(mainTarget, backendNodeId);
    const anchorElement = await Common.Linkifier.Linkifier.linkify(deferredDOMNode);
    anchorElement.textContent = nodeName;
    const cellElement = document.createElement('td');
    cellElement.classList.add('affected-resource-element', 'devtools-link');
    cellElement.appendChild(anchorElement);
    const rowElement = document.createElement('tr');
    rowElement.appendChild(cellElement);
    this._affectedResources.appendChild(rowElement);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedElements(this._issue.elements());
  }
}

class AffectedDirectivesView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!AggregatedIssue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`directive`, plural: ls`directives`});
    /** @type {!AggregatedIssue} */
    this._issue = issue;
  }

  /**
   * @param {!Element} header
   */
  _appendDirectiveColumnTitle(header) {
    const name = document.createElement('td');
    name.classList.add('affected-resource-header');
    name.textContent = ls`Directive`;
    header.appendChild(name);
  }

  /**
   * @param {!Element} header
   */
  _appendURLColumnTitle(header) {
    const info = document.createElement('td');
    info.classList.add('affected-resource-header');
    info.classList.add('affected-resource-directive-info-header');
    info.textContent = ls`Resource`;
    header.appendChild(info);
  }

  /**
   * @param {!Element} header
   */
  _appendElementColumnTitle(header) {
    const affectedNode = document.createElement('td');
    affectedNode.classList.add('affected-resource-header');
    affectedNode.textContent = ls`Element`;
    header.appendChild(affectedNode);
  }

  /**
   * @param {!Element} header
   */
  _appendSourceCodeColumnTitle(header) {
    const sourceCodeLink = document.createElement('td');
    sourceCodeLink.classList.add('affected-resource-header');
    sourceCodeLink.textContent = ls`Source code`;
    header.appendChild(sourceCodeLink);
  }

  /**
   * @param {!Element} header
   */
  _appendStatusColumnTitle(header) {
    const status = document.createElement('td');
    status.classList.add('affected-resource-header');
    status.textContent = ls`Status`;
    header.appendChild(status);
  }

  /**
   * @param {!Element} element
   */
  _appendBlockedStatus(element) {
    const status = document.createElement('td');
    status.classList.add('affected-resource-blocked-status');
    status.textContent = ls`blocked`;
    element.appendChild(status);
  }

  /**
   * @param {!Element} element
   * @param {string} directive
   */
  _appendViolatedDirective(element, directive) {
    const violatedDirective = document.createElement('td');
    violatedDirective.textContent = directive;
    element.appendChild(violatedDirective);
  }

  /**
   * @param {!Element} element
   * @param {string} url
   */
  _appendBlockedURL(element, url) {
    const info = document.createElement('td');
    info.classList.add('affected-resource-directive-info');
    info.textContent = url;
    element.appendChild(info);
  }

  /**
   * @param {!Element} element
   * @param {number | undefined} nodeId
   */
  _appendBlockedElement(element, nodeId) {
    const violatingNode = document.createElement('td');
    violatingNode.classList.add('affected-resource-csp-info-node');

    if (nodeId) {
      const violatingNodeId = nodeId;
      const icon = UI.Icon.Icon.create('largeicon-node-search', 'icon');

      const target = /** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget());
      icon.onclick = () => {
        const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, violatingNodeId);
        Common.Revealer.reveal(deferredDOMNode);
      };

      UI.Tooltip.Tooltip.install(icon, ls`Click to reveal the violating DOM node in the Elements panel`);
      violatingNode.appendChild(icon);

      violatingNode.onmouseenter = () => {
        const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, violatingNodeId);
        if (deferredDOMNode) {
          deferredDOMNode.highlight();
        }
      };
      violatingNode.onmouseleave = () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    element.appendChild(violatingNode);
  }

  /**
   * @param {!Element} element
   * @param {?Protocol.Audits.SourceCodeLocation | undefined} sourceLocation
   */
  _appendSourceLocation(element, sourceLocation) {
    const sourceCodeLocation = document.createElement('td');
    if (sourceLocation) {
      const maxLengthForDisplayedURLs = 40;  // Same as console messages.
      const linkifier = new Components.Linkifier.Linkifier(maxLengthForDisplayedURLs);
      const sourceAnchor = linkifier.linkifyScriptLocation(
          /* target */ null,
          /* scriptId */ null, sourceLocation.url, sourceLocation.lineNumber);
      sourceCodeLocation.appendChild(sourceAnchor);
    }
    element.appendChild(sourceCodeLocation);
  }

  /**
   * @param {!Set<!Protocol.Audits.ContentSecurityPolicyIssueDetails>} cspViolations
   */
  _appendAffectedContentSecurityPolicyDetails(cspViolations) {
    const header = document.createElement('tr');
    if (this._issue.code() === SDK.ContentSecurityPolicyIssue.inlineViolationCode) {
      this._appendDirectiveColumnTitle(header);
      this._appendElementColumnTitle(header);
      this._appendSourceCodeColumnTitle(header);
      this._appendStatusColumnTitle(header);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.urlViolationCode) {
      this._appendURLColumnTitle(header);
      this._appendStatusColumnTitle(header);
      this._appendDirectiveColumnTitle(header);
      this._appendSourceCodeColumnTitle(header);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.evalViolationCode) {
      this._appendSourceCodeColumnTitle(header);
      this._appendDirectiveColumnTitle(header);
      this._appendStatusColumnTitle(header);
    } else {
      this.updateAffectedResourceCount(0);
      return;
    }
    this._affectedResources.appendChild(header);
    let count = 0;
    for (const cspViolation of cspViolations) {
      count++;
      this._appendAffectedContentSecurityPolicyDetail(cspViolation);
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!Protocol.Audits.ContentSecurityPolicyIssueDetails} cspViolation
   */
  _appendAffectedContentSecurityPolicyDetail(cspViolation) {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    if (this._issue.code() === SDK.ContentSecurityPolicyIssue.inlineViolationCode) {
      this._appendViolatedDirective(element, cspViolation.violatedDirective);
      this._appendBlockedElement(element, cspViolation.violatingNodeId);
      this._appendSourceLocation(element, cspViolation.sourceCodeLocation);
      this._appendBlockedStatus(element);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.urlViolationCode) {
      const url = cspViolation.blockedURL ? cspViolation.blockedURL : '';
      this._appendBlockedURL(element, url);
      this._appendBlockedStatus(element);
      this._appendViolatedDirective(element, cspViolation.violatedDirective);
      this._appendSourceLocation(element, cspViolation.sourceCodeLocation);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.evalViolationCode) {
      this._appendSourceLocation(element, cspViolation.sourceCodeLocation);
      this._appendViolatedDirective(element, cspViolation.violatedDirective);
      this._appendBlockedStatus(element);
    } else {
      return;
    }

    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedContentSecurityPolicyDetails(this._issue.cspViolations());
  }
}

class AffectedCookiesView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!AggregatedIssue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`cookie`, plural: ls`cookies`});
    /** @type {!AggregatedIssue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!{cookie: !Protocol.Audits.AffectedCookie, hasRequest: boolean}>} cookies
   */
  _appendAffectedCookies(cookies) {
    const header = document.createElement('tr');

    const name = document.createElement('td');
    name.classList.add('affected-resource-header');
    name.textContent = 'Name';
    header.appendChild(name);

    const info = document.createElement('td');
    info.classList.add('affected-resource-header');
    info.classList.add('affected-resource-cookie-info-header');
    info.textContent = ls`Domain` +
        ' & ' + ls`Path`;
    header.appendChild(info);

    this._affectedResources.appendChild(header);

    let count = 0;
    for (const cookie of cookies) {
      count++;
      this.appendAffectedCookie(cookie.cookie, cookie.hasRequest);
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!Protocol.Audits.AffectedCookie} cookie
   * @param {boolean} hasAssociatedRequest
   */
  appendAffectedCookie(cookie, hasAssociatedRequest) {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-cookie');
    const name = document.createElement('td');
    if (hasAssociatedRequest) {
      name.appendChild(UI.UIUtils.createTextButton(cookie.name, () => {
        Network.NetworkPanel.NetworkPanel.revealAndFilter([
          {
            filterType: 'cookie-domain',
            filterValue: cookie.domain,
          },
          {
            filterType: 'cookie-name',
            filterValue: cookie.name,
          },
          {
            filterType: 'cookie-path',
            filterValue: cookie.path,
          }
        ]);
      }, 'link-style devtools-link'));
    } else {
      name.textContent = cookie.name;
    }
    const info = document.createElement('td');
    info.classList.add('affected-resource-cookie-info');
    info.textContent = `${cookie.domain}${cookie.path}`;

    element.appendChild(name);
    element.appendChild(info);
    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedCookies(this._issue.cookiesWithRequestIndicator());
  }
}

class AffectedRequestsView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`request`, plural: ls`requests`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!Protocol.Audits.AffectedRequest>} affectedRequests
   */
  _appendAffectedRequests(affectedRequests) {
    let count = 0;
    for (const affectedRequest of affectedRequests) {
      for (const request of this._resolveRequestId(affectedRequest.requestId)) {
        count++;
        this._appendNetworkRequest(request);
      }
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   *
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  _appendNetworkRequest(request) {
    const nameText = request.name().trimMiddle(100);
    const nameElement = document.createElement('td');
    const tab = issueTypeToNetworkHeaderMap.get(this._issue.getCategory()) || Network.NetworkItemView.Tabs.Headers;
    nameElement.appendChild(UI.UIUtils.createTextButton(nameText, () => {
      Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, tab);
    }, 'link-style devtools-link'));
    const element = document.createElement('tr');
    element.classList.add('affected-resource-request');
    element.appendChild(nameElement);
    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedRequests(this._issue.requests());
  }
}

class AffectedSourcesView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`source`, plural: ls`sources`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!SDK.Issue.AffectedSource>} affectedSources
   */
  _appendAffectedSources(affectedSources) {
    let count = 0;
    for (const source of affectedSources) {
      this._appendAffectedSource(source);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!SDK.Issue.AffectedSource} source
   */
  _appendAffectedSource({url, lineNumber, columnNumber}) {
    const cellElement = document.createElement('td');
    // TODO(chromium:1072331): Check feasibility of plumping through scriptId for `linkifyScriptLocation`
    //                         to support source maps and formatted scripts.
    const linkifierURLOptions =
        /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({columnNumber, lineNumber, tabStop: true});
    const anchorElement = Components.Linkifier.Linkifier.linkifyURL(url, linkifierURLOptions);
    cellElement.appendChild(anchorElement);
    const rowElement = document.createElement('tr');
    rowElement.classList.add('affected-resource-source');
    rowElement.appendChild(cellElement);
    this._affectedResources.appendChild(rowElement);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedSources(this._issue.sources());
  }
}

/** @type {!Map<!SDK.Issue.IssueCategory, !Network.NetworkItemView.Tabs>} */
const issueTypeToNetworkHeaderMap = new Map([
  [SDK.Issue.IssueCategory.SameSiteCookie, Network.NetworkItemView.Tabs.Cookies],
  [SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy, Network.NetworkItemView.Tabs.Headers],
  [SDK.Issue.IssueCategory.MixedContent, Network.NetworkItemView.Tabs.Headers]
]);

class AffectedMixedContentView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`resource`, plural: ls`resources`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!Protocol.Audits.MixedContentIssueDetails>} mixedContents
   */
  _appendAffectedMixedContents(mixedContents) {
    const header = document.createElement('tr');

    const name = document.createElement('td');
    name.classList.add('affected-resource-header');
    name.textContent = ls`Name`;
    header.appendChild(name);

    const info = document.createElement('td');
    info.classList.add('affected-resource-header');
    info.textContent = ls`Restriction Status`;
    header.appendChild(info);

    this._affectedResources.appendChild(header);

    let count = 0;
    for (const mixedContent of mixedContents) {
      if (mixedContent.request) {
        this._resolveRequestId(mixedContent.request.requestId).forEach(networkRequest => {
          this.appendAffectedMixedContent(mixedContent, networkRequest);
          count++;
        });
      } else {
        this.appendAffectedMixedContent(mixedContent);
        count++;
      }
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!Protocol.Audits.MixedContentIssueDetails} mixedContent
   * @param {?SDK.NetworkRequest.NetworkRequest} maybeRequest
   */
  appendAffectedMixedContent(mixedContent, maybeRequest = null) {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-mixed-content');
    const filename = extractShortPath(mixedContent.insecureURL);

    const name = document.createElement('td');
    if (maybeRequest) {
      const request = maybeRequest;  // re-assignment to make type checker happy
      const tab = issueTypeToNetworkHeaderMap.get(this._issue.getCategory()) || Network.NetworkItemView.Tabs.Headers;
      name.appendChild(UI.UIUtils.createTextButton(filename, () => {
        Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, tab);
      }, 'link-style devtools-link'));
    } else {
      name.classList.add('affected-resource-mixed-content-info');
      name.textContent = filename;
    }
    UI.Tooltip.Tooltip.install(name, mixedContent.insecureURL);
    element.appendChild(name);

    const status = document.createElement('td');
    status.classList.add('affected-resource-mixed-content-info');
    status.textContent = SDK.MixedContentIssue.MixedContentIssue.translateStatus(mixedContent.resolutionStatus);
    element.appendChild(status);

    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedMixedContents(this._issue.mixedContents());
  }
}

class AffectedHeavyAdView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`resource`, plural: ls`resources`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!Protocol.Audits.HeavyAdIssueDetails>} heavyAds
   */
  _appendAffectedHeavyAds(heavyAds) {
    const header = document.createElement('tr');

    const reason = document.createElement('td');
    reason.classList.add('affected-resource-header');
    reason.textContent = ls`Limit exceeded`;
    header.appendChild(reason);

    const resolution = document.createElement('td');
    resolution.classList.add('affected-resource-header');
    resolution.textContent = ls`Resolution Status`;
    header.appendChild(resolution);

    const frame = document.createElement('td');
    frame.classList.add('affected-resource-header');
    frame.textContent = ls`Frame URL`;
    header.appendChild(frame);

    this._affectedResources.appendChild(header);

    let count = 0;
    for (const heavyAd of heavyAds) {
      this._appendAffectedHeavyAd(heavyAd);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!Protocol.Audits.HeavyAdResolutionStatus} status
   * @return {string}
   */
  _statusToString(status) {
    switch (status) {
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked:
        return ls`Removed`;
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning:
        return ls`Warned`;
    }
    return '';
  }

  /**
   * @param {!Protocol.Audits.HeavyAdReason} status
   * @return {string}
   */
  _limitToString(status) {
    switch (status) {
      case Protocol.Audits.HeavyAdReason.CpuPeakLimit:
        return ls`CPU peak limit`;
      case Protocol.Audits.HeavyAdReason.CpuTotalLimit:
        return ls`CPU total limit`;
      case Protocol.Audits.HeavyAdReason.NetworkTotalLimit:
        return ls`Network limit`;
    }
    return '';
  }

  /**
   * @param {!Protocol.Audits.HeavyAdIssueDetails} heavyAd
   */
  _appendAffectedHeavyAd(heavyAd) {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-heavy-ad');

    const reason = document.createElement('td');
    reason.classList.add('affected-resource-heavy-ad-info');
    reason.textContent = this._limitToString(heavyAd.reason);
    element.appendChild(reason);

    const status = document.createElement('td');
    status.classList.add('affected-resource-heavy-ad-info');
    status.textContent = this._statusToString(heavyAd.resolution);
    element.appendChild(status);

    const frameId = heavyAd.frame.frameId;
    const frameUrl = this._createFrameCell(frameId);
    element.appendChild(frameUrl);

    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendAffectedHeavyAds(this._issue.heavyAds());
  }
}

class AffectedBlockedByResponseView extends AffectedResourcesView {
  /**
   * @param {!IssueView} parent
   * @param {!SDK.Issue.Issue} issue
   */
  constructor(parent, issue) {
    super(parent, {singular: ls`request`, plural: ls`requests`});
    /** @type {!SDK.Issue.Issue} */
    this._issue = issue;
  }

  /**
   * @param {!Iterable<!Protocol.Audits.BlockedByResponseIssueDetails>} details
   */
  _appendDetails(details) {
    const header = document.createElement('tr');

    const request = document.createElement('td');
    request.classList.add('affected-resource-header');
    request.textContent = ls`Request`;
    header.appendChild(request);

    const name = document.createElement('td');
    name.classList.add('affected-resource-header');
    name.textContent = ls`Parent Frame`;
    header.appendChild(name);

    const frame = document.createElement('td');
    frame.classList.add('affected-resource-header');
    frame.textContent = ls`Blocked Resource`;
    header.appendChild(frame);

    this._affectedResources.appendChild(header);

    let count = 0;
    for (const detail of details) {
      this._appendDetail(detail);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  /**
   * @param {!Protocol.Audits.BlockedByResponseIssueDetails} details
   */
  _appendDetail(details) {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-row');

    const requestCell = this._createRequestCell(details.request);
    element.appendChild(requestCell);

    if (details.parentFrame) {
      const frameUrl = this._createFrameCell(details.parentFrame.frameId);
      element.appendChild(frameUrl);
    } else {
      element.appendChild(document.createElement('td'));
    }

    if (details.blockedFrame) {
      const frameUrl = this._createFrameCell(details.blockedFrame.frameId);
      element.appendChild(frameUrl);
    } else {
      element.appendChild(document.createElement('td'));
    }

    this._affectedResources.appendChild(element);
  }

  /**
   * @override
   */
  update() {
    this.clear();
    this._appendDetails(this._issue.blockedByResponseDetails());
  }
}


class IssueView extends UI.TreeOutline.TreeElement {
  /**
   *
   * @param {!IssuesPaneImpl} parent
   * @param {!AggregatedIssue} issue
   * @param {!SDK.Issue.IssueDescription} description
   */
  constructor(parent, issue, description) {
    super();
    this._parent = parent;
    this._issue = issue;
    /** @type {!SDK.Issue.IssueDescription} */
    this._description = description;

    this.toggleOnClick = true;
    this.listItemElement.classList.add('issue');
    this.childrenListElement.classList.add('body');

    this._affectedResources = this._createAffectedResources();
    /** @type {!Array<!AffectedResourcesView>} */
    this._affectedResourceViews = [
      new AffectedCookiesView(this, this._issue), new AffectedElementsView(this, this._issue),
      new AffectedRequestsView(this, this._issue), new AffectedMixedContentView(this, this._issue),
      new AffectedSourcesView(this, this._issue), new AffectedHeavyAdView(this, this._issue),
      new AffectedDirectivesView(this, this._issue), new AffectedBlockedByResponseView(this, this._issue)
    ];

    this._aggregatedIssuesCount = null;
    this._hasBeenExpandedBefore = false;
  }

  /**
   * @returns {string}
   */
  getIssueTitle() {
    return this._description.title;
  }

  /**
   * @override
   */
  onattach() {
    this._appendHeader();
    this._createBody();
    this.appendChild(this._affectedResources);
    for (const view of this._affectedResourceViews) {
      this.appendAffectedResource(view);
      view.update();
    }

    this._createReadMoreLinks();
    this.updateAffectedResourceVisibility();
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} resource
   */
  appendAffectedResource(resource) {
    this._affectedResources.appendChild(resource);
  }

  _appendHeader() {
    const header = document.createElement('div');
    header.classList.add('header');
    const icon = UI.Icon.Icon.create('largeicon-breaking-change', 'icon');
    this._aggregatedIssuesCount = /** @type {!HTMLElement} */ (document.createElement('span'));
    const countAdorner = Elements.Adorner.Adorner.create(this._aggregatedIssuesCount, 'countWrapper');
    countAdorner.classList.add('aggregated-issues-count');
    this._aggregatedIssuesCount.textContent = `${this._issue.getAggregatedIssuesCount()}`;
    header.appendChild(icon);
    header.appendChild(countAdorner);

    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = this._description.title;
    header.appendChild(title);

    this.listItemElement.appendChild(header);
  }

  /**
   * @override
   */
  onexpand() {
    if (!this._hasBeenExpandedBefore) {
      this._hasBeenExpandedBefore = true;
      for (const view of this._affectedResourceViews) {
        view.expandIfOneResource();
      }
    }
  }

  _updateAggregatedIssuesCount() {
    if (this._aggregatedIssuesCount) {
      this._aggregatedIssuesCount.textContent = `${this._issue.getAggregatedIssuesCount()}`;
    }
  }

  updateAffectedResourceVisibility() {
    const noResources = this._affectedResourceViews.every(view => view.isEmpty());
    this._affectedResources.hidden = noResources;
  }

  /**
   *
   * @returns {!UI.TreeOutline.TreeElement}
   */
  _createAffectedResources() {
    const wrapper = new UI.TreeOutline.TreeElement();
    wrapper.setCollapsible(false);
    wrapper.setExpandable(true);
    wrapper.expand();
    wrapper.selectable = false;
    wrapper.listItemElement.classList.add('affected-resources-label');
    wrapper.listItemElement.textContent = ls`Affected Resources`;
    wrapper.childrenListElement.classList.add('affected-resources');
    return wrapper;
  }

  _createBody() {
    const messageElement = new UI.TreeOutline.TreeElement();
    messageElement.setCollapsible(false);
    messageElement.selectable = false;
    const message = this._description.message();
    messageElement.listItemElement.appendChild(message);
    this.appendChild(messageElement);
  }

  _createReadMoreLinks() {
    if (this._description.links.length === 0) {
      return;
    }
    const linkWrapper = new UI.TreeOutline.TreeElement();
    linkWrapper.setCollapsible(false);
    linkWrapper.listItemElement.classList.add('link-wrapper');

    const linkList = linkWrapper.listItemElement.createChild('ul', 'link-list');
    for (const description of this._description.links) {
      const link = UI.XLink.XLink.create(description.link, ls`Learn more: ${description.linkTitle}`, 'link');
      const linkIcon = UI.Icon.Icon.create('largeicon-link', 'link-icon');
      link.prepend(linkIcon);

      const linkListItem = linkList.createChild('li');
      linkListItem.appendChild(link);
    }
    this.appendChild(linkWrapper);
  }

  update() {
    this._affectedResourceViews.forEach(view => view.update());
    this.updateAffectedResourceVisibility();
    this._updateAggregatedIssuesCount();
  }

  /**
   * @param {(boolean|undefined)=} expand - Expands the issue if `true`, collapses if `false`, toggles collapse if undefined
   */
  toggle(expand) {
    if (expand || (expand === undefined && !this.expanded)) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}

export class IssuesPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('issues/issuesPane.css');
    this.contentElement.classList.add('issues-pane');

    this._issueViews = new Map();

    const {toolbarContainer, updateToolbarIssuesCount} = this._createToolbars();
    this._issuesToolbarContainer = toolbarContainer;
    this._updateToolbarIssuesCount = updateToolbarIssuesCount;

    this._issuesTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._issuesTree.registerRequiredCSS('issues/issuesTree.css');
    this._issuesTree.setShowSelectionOnKeyboardFocus(true);
    this._issuesTree.contentElement.classList.add('issues');
    this.contentElement.appendChild(this._issuesTree.element);

    this._noIssuesMessageDiv = document.createElement('div');
    this._noIssuesMessageDiv.classList.add('issues-pane-no-issues');
    this.contentElement.appendChild(this._noIssuesMessageDiv);

    /** @type {!BrowserSDK.IssuesManager.IssuesManager} */
    this._issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    /** @type {!IssueAggregator} */
    this._aggregator = new IssueAggregator(this._issuesManager);
    this._aggregator.addEventListener(IssueAggregatorEvents.AggregatedIssueUpdated, this._issueUpdated, this);
    this._aggregator.addEventListener(IssueAggregatorEvents.FullUpdateRequired, this._fullUpdate, this);
    for (const issue of this._aggregator.aggregatedIssues()) {
      this._updateIssueView(issue);
    }
    this._issuesManager.addEventListener(BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this._updateCounts, this);
    this._updateCounts();
  }

  /**
   * @override
   * @return {!Array<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this._issuesTree.element];
  }

  /**
   * @returns {!{toolbarContainer: !Element, updateToolbarIssuesCount: function(number):void}}
   */
  _createToolbars() {
    const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', toolbarContainer);

    // TODO(crbug.com/1011811): Remove cast once closure is gone. Closure requires an upcast to 'any' from 'boolean'.
    const thirdPartySetting = /** @type {!Common.Settings.Setting<*>} */ (SDK.Issue.getShowThirdPartyIssuesSetting());
    const showThirdPartyCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        thirdPartySetting, ls`Include Issues caused by third-party sites`, ls`Include third-party issues`);
    rightToolbar.appendToolbarItem(showThirdPartyCheckbox);

    rightToolbar.appendSeparator();
    const toolbarWarnings = document.createElement('div');
    toolbarWarnings.classList.add('toolbar-warnings');
    const breakingChangeIcon = UI.Icon.Icon.create('largeicon-breaking-change');
    toolbarWarnings.appendChild(breakingChangeIcon);
    const toolbarIssuesCount = toolbarWarnings.createChild('span', 'warnings-count-label');
    const toolbarIssuesItem = new UI.Toolbar.ToolbarItem(toolbarWarnings);
    rightToolbar.appendToolbarItem(toolbarIssuesItem);
    /** @param {number} count */
    const updateToolbarIssuesCount = count => {
      toolbarIssuesCount.textContent = `${count}`;
      if (count === 1) {
        toolbarIssuesItem.setTitle(ls`Issues pertaining to ${count} operation detected.`);
      } else {
        toolbarIssuesItem.setTitle(ls`Issues pertaining to ${count} operations detected.`);
      }
    };
    return {toolbarContainer, updateToolbarIssuesCount};
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _issueUpdated(event) {
    const issue = /** @type {!AggregatedIssue} */ (event.data);
    this._updateIssueView(issue);
  }

  /**
   * @param {!AggregatedIssue} issue
   */
  _updateIssueView(issue) {
    if (!this._issueViews.has(issue.code())) {
      let description = issue.getDescription();
      if (!description) {
        console.warn('Could not find description for issue code:', issue.code());
        return;
      }
      if ('file' in description) {
        // TODO(crbug.com/1011811): Remove casts once closure is gone. TypeScript can infer the type variant.
        description =
            createIssueDescriptionFromMarkdown(/** @type {!SDK.Issue.MarkdownIssueDescription} */ (description));
      }
      const view = new IssueView(this, issue, /** @type {!SDK.Issue.IssueDescription} */ (description));
      this._issueViews.set(issue.code(), view);
      this._issuesTree.appendChild(view, (a, b) => {
        if (a instanceof IssueView && b instanceof IssueView) {
          return a.getIssueTitle().localeCompare(b.getIssueTitle());
        }
        console.error('The issues tree should only contain IssueView objects as direct children');
        return 0;
      });
    }
    this._issueViews.get(issue.code()).update();
    this._updateCounts();
  }

  _fullUpdate() {
    for (const view of this._issueViews.values()) {
      this._issuesTree.removeChild(view);
    }
    this._issueViews.clear();
    if (this._aggregator) {
      for (const issue of this._aggregator.aggregatedIssues()) {
        this._updateIssueView(issue);
      }
    }
    this._updateCounts();
  }

  _updateCounts() {
    const count = this._issuesManager.numberOfIssues();
    this._updateToolbarIssuesCount(count);
    this._showIssuesTreeOrNoIssuesDetectedMessage(count);
  }

  /**
   * @param {number} issuesCount
   */
  _showIssuesTreeOrNoIssuesDetectedMessage(issuesCount) {
    if (issuesCount > 0) {
      this._issuesTree.element.hidden = false;
      this._noIssuesMessageDiv.style.display = 'none';
    } else {
      this._issuesTree.element.hidden = true;
      // We alreay know that issesCount is zero here.
      const hasOnlyThirdPartyIssues = this._issuesManager.numberOfAllStoredIssues() > 0;
      this._noIssuesMessageDiv.textContent =
          hasOnlyThirdPartyIssues ? ls`Only third-party issues detected so far` : ls`No issues detected so far`;
      this._noIssuesMessageDiv.style.display = 'flex';
    }
  }

  /**
   * @param {string} code
   */
  revealByCode(code) {
    const issueView = this._issueViews.get(code);
    if (issueView) {
      issueView.expand();
      issueView.reveal();
    }
  }
}
