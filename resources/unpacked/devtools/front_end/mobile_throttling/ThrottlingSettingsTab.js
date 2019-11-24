// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
export class ThrottlingSettingsTab extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css');

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = ls`Network Throttling Profiles`;
    UI.ARIAUtils.markAsHeading(header, 1);

    const addButton = UI.createTextButton(
        Common.UIString('Add custom profile...'), this._addButtonClicked.bind(this), 'add-conditions-button');
    this.contentElement.appendChild(addButton);

    this._list = new UI.ListWidget(this);
    this._list.element.classList.add('conditions-list');
    this._list.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css');
    this._list.show(this.contentElement);

    this._customSetting = Common.moduleSetting('customNetworkConditions');
    this._customSetting.addChangeListener(this._conditionsUpdated, this);

    this.setDefaultFocusedElement(addButton);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._conditionsUpdated();
  }

  _conditionsUpdated() {
    this._list.clear();

    const conditions = this._customSetting.get();
    for (let i = 0; i < conditions.length; ++i) {
      this._list.appendItem(conditions[i], true);
    }

    this._list.appendSeparator();
  }

  _addButtonClicked() {
    this._list.addNewItem(this._customSetting.get().length, {title: '', download: -1, upload: -1, latency: 0});
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    const conditions = /** @type {!SDK.NetworkManager.Conditions} */ (item);
    const element = createElementWithClass('div', 'conditions-list-item');
    const title = element.createChild('div', 'conditions-list-text conditions-list-title');
    const titleText = title.createChild('div', 'conditions-list-title-text');
    titleText.textContent = conditions.title;
    titleText.title = conditions.title;
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.download);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.upload);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = Common.UIString('%dms', conditions.latency);
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    const list = this._customSetting.get();
    list.splice(index, 1);
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    const conditions = /** @type {?SDK.NetworkManager.Conditions} */ (item);
    conditions.title = editor.control('title').value.trim();
    const download = editor.control('download').value.trim();
    conditions.download = download ? parseInt(download, 10) * (1024 / 8) : -1;
    const upload = editor.control('upload').value.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1024 / 8) : -1;
    const latency = editor.control('latency').value.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;

    const list = this._customSetting.get();
    if (isNew) {
      list.push(conditions);
    }
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    const conditions = /** @type {?SDK.NetworkManager.Conditions} */ (item);
    const editor = this._createEditor();
    editor.control('title').value = conditions.title;
    editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1024 / 8));
    editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1024 / 8));
    editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'conditions-edit-row');
    const nameLabel = titles.createChild('div', 'conditions-list-text conditions-list-title');
    const nameStr = ls`Profile Name`;
    nameLabel.textContent = nameStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const downloadLabel = titles.createChild('div', 'conditions-list-text');
    const downloadStr = ls`Download`;
    downloadLabel.textContent = downloadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const uploadLabel = titles.createChild('div', 'conditions-list-text');
    const uploadStr = ls`Upload`;
    uploadLabel.textContent = uploadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const latencyLabel = titles.createChild('div', 'conditions-list-text');
    const latencyStr = ls`Latency`;
    latencyLabel.textContent = latencyStr;

    const fields = content.createChild('div', 'conditions-edit-row');
    const nameInput = editor.createInput('title', 'text', '', titleValidator);
    UI.ARIAUtils.setAccessibleName(nameInput, nameStr);
    fields.createChild('div', 'conditions-list-text conditions-list-title').appendChild(nameInput);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    let cell = fields.createChild('div', 'conditions-list-text');
    const downloadInput = editor.createInput('download', 'text', ls`kb/s`, throughputValidator);
    cell.appendChild(downloadInput);
    UI.ARIAUtils.setAccessibleName(downloadInput, downloadStr);
    const downloadOptional = cell.createChild('div', 'conditions-edit-optional');
    const optionalStr = ls`optional`;
    downloadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(downloadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const uploadInput = editor.createInput('upload', 'text', ls`kb/s`, throughputValidator);
    UI.ARIAUtils.setAccessibleName(uploadInput, uploadStr);
    cell.appendChild(uploadInput);
    const uploadOptional = cell.createChild('div', 'conditions-edit-optional');
    uploadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(uploadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const latencyInput = editor.createInput('latency', 'text', ls`ms`, latencyValidator);
    UI.ARIAUtils.setAccessibleName(latencyInput, latencyStr);
    cell.appendChild(latencyInput);
    const latencyOptional = cell.createChild('div', 'conditions-edit-optional');
    latencyOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(latencyInput, optionalStr);

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function titleValidator(item, index, input) {
      const value = input.value.trim();
      const valid = value.length > 0 && value.length < 50;
      return {valid};
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function throughputValidator(item, index, input) {
      const value = input.value.trim();
      const valid = !value || (/^[\d]+(\.\d+)?|\.\d+$/.test(value) && value >= 0 && value <= 10000000);
      return {valid};
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function latencyValidator(item, index, input) {
      const value = input.value.trim();
      const valid = !value || (/^[\d]+$/.test(value) && value >= 0 && value <= 1000000);
      return {valid};
    }
  }
}

/**
 * @param {number} throughput
 * @param {boolean=} plainText
 * @return {string}
 */
export function throughputText(throughput, plainText) {
  if (throughput < 0) {
    return '';
  }
  const throughputInKbps = throughput / (1024 / 8);
  const delimiter = plainText ? '' : ' ';
  if (throughputInKbps < 1024) {
    return Common.UIString('%d%skb/s', throughputInKbps, delimiter);
  }
  if (throughputInKbps < 1024 * 10) {
    return Common.UIString('%.1f%sMb/s', throughputInKbps / 1024, delimiter);
  }
  return Common.UIString('%d%sMb/s', (throughputInKbps / 1024) | 0, delimiter);
}

/* Legacy exported object */
self.MobileThrottling = self.MobileThrottling || {};

/* Legacy exported object */
MobileThrottling = MobileThrottling || {};

/** @constructor */
MobileThrottling.ThrottlingSettingsTab = ThrottlingSettingsTab;

MobileThrottling.throughputText = throughputText;
