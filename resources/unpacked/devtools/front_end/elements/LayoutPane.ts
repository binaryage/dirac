// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {BooleanSetting, EnumSetting, LayoutElement, Setting, SettingType} from './LayoutPaneUtils.js';
import {NodeText} from './NodeText.js';

const {render, html} = LitHtml;
const ls = Common.ls;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;
const showElementButtonTitle = ls`Show element in the Elements panel`;

export class SettingChangedEvent extends Event {
  data: {setting: string, value: string|boolean};

  constructor(setting: string, value: string|boolean) {
    super('setting-changed', {});
    this.data = {setting, value};
  }
}

interface HTMLInputElementEvent extends Event {
  target: HTMLInputElement;
}

function isEnumSetting(setting: Setting): setting is EnumSetting {
  return setting.type === SettingType.ENUM;
}

function isBooleanSetting(setting: Setting): setting is BooleanSetting {
  return setting.type === SettingType.BOOLEAN;
}

export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: Readonly<Setting[]> = [];
  private gridElements: Readonly<LayoutElement[]> = [];

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {patchThemeSupport: true}),
      ...getStyleSheets('ui/inspectorSyntaxHighlight.css', {patchThemeSupport: true}),
      ...getStyleSheets('elements/layoutPane.css'),
    ];
  }

  set data(data: {settings: Setting[], gridElements: LayoutElement[]}) {
    this.settings = data.settings;
    this.gridElements = data.gridElements;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details open>
        <summary class="header">
          ${ls`Grid`}
        </summary>
        <div class="content-section">
          <h3 class="content-section-title">${ls`Overlay display settings`}</h3>
          <div class="checkbox-settings">
            ${this.getBooleanSettings().map(setting => this.renderBooleanSetting(setting))}
          </div>
          <div class="select-settings">
            ${this.getEnumSettings().map(setting => this.renderEnumSetting(setting))}
          </div>
        </div>
        ${this.gridElements ?
          html`<div class="content-section">
            <h3 class="content-section-title">${ls`Grid overlays`}</h3>
            <div class="elements">
              ${this.gridElements.map(element => this.renderElement(element))}
            </div>
          </div>` : ''}
      </details>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private getEnumSettings(): EnumSetting[] {
    return this.settings.filter(isEnumSetting);
  }

  private getBooleanSettings(): BooleanSetting[] {
    return this.settings.filter(isBooleanSetting);
  }

  private onBooleanSettingChange(setting: BooleanSetting, event: HTMLInputElementEvent) {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.checked));
  }

  private onEnumSettingChange(setting: EnumSetting, event: HTMLInputElementEvent) {
    event.preventDefault();
    this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.value));
  }

  private onElementToggle(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.toggle(event.target.checked);
  }

  private onElementClick(element: LayoutElement, event: HTMLInputElementEvent) {
    event.preventDefault();
    element.reveal();
  }

  private renderElement(element: LayoutElement) {
    const nodeText = new NodeText();
    nodeText.data = {
      nodeId: element.domId,
      nodeTitle: element.name,
      nodeClasses: element.domClasses,
    };
    const onElementToggle = this.onElementToggle.bind(this, element);
    const onElementClick = this.onElementClick.bind(this, element);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`<div class="element">
      <label data-element="true" class="checkbox-label" title=${element.name}>
        <input data-input="true" type="checkbox" .checked=${element.enabled} @change=${onElementToggle} />
        <span data-label="true">${nodeText}</span>
        </label>
        <button @click=${onElementClick} title=${showElementButtonTitle} class="show-element">
        </button>
    </div>`;
    // clang-format on
  }

  private renderBooleanSetting(setting: BooleanSetting) {
    const onBooleanSettingChange = this.onBooleanSettingChange.bind(this, setting);
    return html`<label data-boolean-setting="true" class="checkbox-label" title=${setting.title}>
      <input data-input="true" type="checkbox" .checked=${setting.value} @change=${onBooleanSettingChange} />
      <span data-label="true">${setting.title}</span>
    </label>`;
  }

  private renderEnumSetting(setting: EnumSetting) {
    const onEnumSettingChange = this.onEnumSettingChange.bind(this, setting);
    return html`<label data-enum-setting="true" class="select-label" title=${setting.title}>
      <span data-label="true">${setting.title}</span>
      <select class="chrome-select" data-input="true" @change=${onEnumSettingChange}>
        ${
        setting.options.map(
            opt => html`<option value=${opt.value} .selected=${setting.value === opt.value}>${opt.title}</option>`)}
      </select>
    </label>`;
  }
}

customElements.define('devtools-layout-pane', LayoutPane);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-layout-pane': LayoutPane;
  }
}
