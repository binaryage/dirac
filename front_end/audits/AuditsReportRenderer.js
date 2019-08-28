// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @override
 */
Audits.ReportRenderer = class extends ReportRenderer {
  /**
   * @param {!Element} el Parent element to render the report into.
   * @param {!ReportRenderer.RunnerResultArtifacts=} artifacts
   */
  static addViewTraceButton(el, artifacts) {
    if (!artifacts || !artifacts.traces || !artifacts.traces.defaultPass)
      return;

    const container = el.querySelector('.lh-audit-group');
    const columnsEl = container.querySelector('.lh-columns');
    // There will be no columns if just the PWA category.
    if (!columnsEl)
      return;

    const defaultPassTrace = artifacts.traces.defaultPass;
    const timelineButton = UI.createTextButton(Common.UIString('View Trace'), onViewTraceClick, 'view-trace');
    container.insertBefore(timelineButton, columnsEl.nextSibling);

    async function onViewTraceClick() {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AuditsViewTrace);
      await UI.inspectorView.showPanel('timeline');
      Timeline.TimelinePanel.instance().loadFromEvents(defaultPassTrace.traceEvents);
    }
  }

  /**
   * @param {!Element} el
   */
  static async linkifyNodeDetails(el) {
    const mainTarget = SDK.targetManager.mainTarget();
    const domModel = mainTarget.model(SDK.DOMModel);

    for (const origElement of el.getElementsByClassName('lh-node')) {
      /** @type {!DetailsRenderer.NodeDetailsJSON} */
      const detailsItem = origElement.dataset;
      if (!detailsItem.path)
        continue;

      const nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);

      if (!nodeId)
        continue;
      const node = domModel.nodeForId(nodeId);
      if (!node)
        continue;

      const element = await Common.Linkifier.linkify(node, {tooltip: detailsItem.snippet});
      origElement.title = '';
      origElement.textContent = '';
      origElement.appendChild(element);
    }
  }

  /**
   * @param {!Element} el
   */
  static handleDarkMode(el) {
    if (UI.themeSupport.themeName() === 'dark')
      el.classList.add('dark');
  }
};

/**
 * @override
 */
Audits.ReportUIFeatures = class extends ReportUIFeatures {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
    this._beforePrint = null;
    this._afterPrint = null;
  }

  /**
   * @param {?function()} beforePrint
   */
  setBeforePrint(beforePrint) {
    this._beforePrint = beforePrint;
  }

  /**
   * @param {?function()} afterPrint
   */
  setAfterPrint(afterPrint) {
    this._afterPrint = afterPrint;
  }

  /**
   * Returns the html that recreates this report.
   * @return {string}
   * @protected
   */
  getReportHtml() {
    this.resetUIState();
    return Lighthouse.ReportGenerator.generateReportHtml(this.json);
  }

  /**
   * Downloads a file (blob) using the system dialog prompt.
   * @param {!Blob|!File} blob The file to save.
   */
  async _saveFile(blob) {
    const domain = new Common.ParsedURL(this.json.finalUrl).domain();
    const sanitizedDomain = domain.replace(/[^a-z0-9.-]+/gi, '_');
    const timestamp = new Date(this.json.fetchTime).toISO8601Compact();
    const ext = blob.type.match('json') ? '.json' : '.html';
    const basename = `${sanitizedDomain}-${timestamp}${ext}`;
    const text = await blob.text();
    Workspace.fileManager.save(basename, text, true /* forceSaveAs */);
  }

  async _print() {
    const document = this.getDocument();
    const clonedReport = document.querySelector('.lh-root').cloneNode(true /* deep */);
    const printWindow = window.open('', '_blank', 'channelmode=1,status=1,resizable=1');
    const style = printWindow.document.createElement('style');
    style.textContent = Runtime.cachedResources['audits/lighthouse/report.css'];
    printWindow.document.head.appendChild(style);
    printWindow.document.body.replaceWith(clonedReport);
    // Linkified nodes are shadow elements, which aren't exposed via `cloneNode`.
    await Audits.ReportRenderer.linkifyNodeDetails(clonedReport);

    if (this._beforePrint)
      this._beforePrint();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    if (this._afterPrint)
      this._afterPrint();
  }

  /**
   * @suppress {visibility}
   * @return {!Document}
   */
  getDocument() {
    return this._document;
  }

  /**
   * @suppress {visibility}
   */
  resetUIState() {
    this._resetUIState();
  }
};
