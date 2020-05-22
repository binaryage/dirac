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
    this._listener = null;
    /** @type {!Set<string>} */
    this._unresolvedRequestIds = new Set();
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


  /**
   * This function resolves a requestId to network requests. If the requestId does not resolve, a listener is installed
   * that takes care of updating the view if the network request is added. This is useful if the issue is added before
   * the network request gets reported.
   * @param {string} requestId
   * @return {!Array<!SDK.NetworkRequest.NetworkRequest>}
   */
  _resolveRequestId(requestId) {
    const requests = self.SDK.networkLog.requestsForId(requestId);
    if (!requests.length) {
      this._unresolvedRequestIds.add(requestId);
      if (!this._listener) {
        this._listener =
            self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.RequestAdded, this._onRequestAdded, this);
      }
    }
    return requests;
  }

  /**
   *
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestAdded(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    const requestWasUnresolved = this._unresolvedRequestIds.delete(request.requestId());
    if (this._unresolvedRequestIds.size === 0 && this._listener) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.EventTarget.removeEventListeners([this._listener]);
      this._listener = null;
    }
    if (requestWasUnresolved) {
      this.update();
    }
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
    this._affectedCookiesView = new AffectedCookiesView(this, this._issue);
    this._affectedElementsView = new AffectedElementsView(this, this._issue);
    this._affectedRequestsView = new AffectedRequestsView(this, this._issue);
    this._affectedMixedContentView = new AffectedMixedContentView(this, this._issue);
    this._affectedSourcesView = new AffectedSourcesView(this, this._issue);

    this._aggregatedIssuesCount = null;
  }

  /**
   * @override
   */
  onattach() {
    this._appendHeader();
    this._createBody();
    this.appendChild(this._affectedResources);
    this.appendAffectedResource(this._affectedCookiesView);
    this._affectedCookiesView.update();
    this.appendAffectedResource(this._affectedElementsView);
    this._affectedElementsView.update();
    this.appendAffectedResource(this._affectedRequestsView);
    this._affectedRequestsView.update();
    this.appendAffectedResource(this._affectedMixedContentView);
    this._affectedMixedContentView.update();
    this.appendAffectedResource(this._affectedSourcesView);
    this._affectedSourcesView.update();
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

  _updateAggregatedIssuesCount() {
    if (this._aggregatedIssuesCount) {
      this._aggregatedIssuesCount.textContent = `${this._issue.getAggregatedIssuesCount()}`;
    }
  }

  updateAffectedResourceVisibility() {
    const noCookies = !this._affectedCookiesView || this._affectedCookiesView.isEmpty();
    const noElements = !this._affectedElementsView || this._affectedElementsView.isEmpty();
    const noRequests = !this._affectedRequestsView || this._affectedRequestsView.isEmpty();
    const noMixedContent = !this._affectedMixedContentView || this._affectedMixedContentView.isEmpty();
    const noSources = !this._affectedSourcesView || this._affectedSourcesView.isEmpty();
    const noResources = noCookies && noElements && noRequests && noMixedContent && noSources;
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
    this._affectedCookiesView.update();
    this._affectedRequestsView.update();
    this._affectedMixedContentView.update();
    this._affectedSourcesView.update();
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
    this._noIssuesMessageDiv.textContent = ls`No issues detected so far`;
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
    this._updateCounts();

    /** @type {?UI.Infobar.Infobar} */
    this._reloadInfobar = null;
    /** @type {?Element} */
    this._infoBarDiv = null;
    this._showReloadInfobarIfNeeded();
  }

  /**
   * @returns {!{toolbarContainer: !Element, updateToolbarIssuesCount: function(number):void}}
   */
  _createToolbars() {
    const toolbarContainer = this.contentElement.createChild('div', 'issues-toolbar-container');
    new UI.Toolbar.Toolbar('issues-toolbar-left', toolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('issues-toolbar-right', toolbarContainer);
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
    const description = issue.getDescription();
    if (!description) {
      console.warn('Could not find description for issue code:', issue.code());
      return;
    }
    if (!this._issueViews.has(issue.code())) {
      const view = new IssueView(this, issue, description);
      this._issueViews.set(issue.code(), view);
      this._issuesTree.appendChild(view);
    }
    this._issueViews.get(issue.code()).update();
    this._updateCounts();
  }

  _fullUpdate() {
    this._hideReloadInfoBar();
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
    if (issuesCount > 0 || this._issuesManager.reloadForAccurateInformationRequired()) {
      this._issuesTree.element.hidden = false;
      this._noIssuesMessageDiv.style.display = 'none';
    } else {
      this._issuesTree.element.hidden = true;
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

  _showReloadInfobarIfNeeded() {
    if (!this._issuesManager.reloadForAccurateInformationRequired()) {
      return;
    }

    function reload() {
      const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
      if (mainTarget) {
        const resourceModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
        if (resourceModel) {
          resourceModel.reloadPage();
        }
      }
    }

    const infobar = new UI.Infobar.Infobar(
        UI.Infobar.Type.Warning,
        ls`Some issues might be missing or incomplete, reload the inspected page to get the full information.`,
        [{text: ls`Reload page`, highlight: false, delegate: reload, dismiss: true}]);

    this._reloadInfobar = infobar;
    this._attachReloadInfoBar(infobar);
  }

  /** @param {!UI.Infobar.Infobar} infobar */
  _attachReloadInfoBar(infobar) {
    if (!this._infoBarDiv) {
      this._infoBarDiv = document.createElement('div');
      this._infoBarDiv.classList.add('flex-none');
      this.contentElement.insertBefore(this._infoBarDiv, this._issuesToolbarContainer.nextSibling);
    }
    this._infoBarDiv.appendChild(infobar.element);
    infobar.setParentView(this);
    this.doResize();
  }

  _hideReloadInfoBar() {
    if (this._reloadInfobar) {
      this._reloadInfobar.dispose();
      this._reloadInfobar = null;
    }
  }
}
