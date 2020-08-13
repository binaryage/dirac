// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;
const ls = Common.ls;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;

import {BooleanSetting, Element, EnumSetting, Setting, SettingType} from './LayoutPaneUtils.js';

export class SettingChangedEvent extends Event {
  data: {setting: string, value: string|boolean};

  constructor(setting: string, value: string|boolean) {
    super('setting-changed', {});
    this.data = {setting, value};
  }
}

export class OverlayChangedEvent extends Event {
  data: {id: number, value: boolean};

  constructor(id: number, value: boolean) {
    super('overlay-changed', {});
    this.data = {id, value};
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
  private gridElements: Readonly<Element[]> = [];

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {patchThemeSupport: true}),
      ...getStyleSheets('ui/inspectorSyntaxHighlight.css', {patchThemeSupport: true}),
    ];
  }

  set data(data: {settings: Setting[], gridElements: Element[]}) {
    this.settings = data.settings;
    this.gridElements = data.gridElements;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        * {
          box-sizing: border-box;
          font-size: 12px;
        }
        .header {
          align-items: center;
          background-color: var(--toolbar-bg-color, #f3f3f3);
          border-bottom: var(--divider-border, 1px solid #d0d0d0);
          border-top: var(--divider-border, 1px solid #d0d0d0);
          display: flex;
          line-height: 1.6;
          overflow: hidden;
          padding: 0 5px;
          white-space: nowrap;
        }
        .content-section {
          padding: 16px;
          border-bottom: var(--divider-border, 1px solid #d0d0d0);
        }
        .content-section-title {
          font-size: 12px;
          font-weight: 500;
          line-height: 1.1;
          margin: 0;
          padding: 0;
        }
        .checkbox-settings {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 5px;
        }
        .checkbox-label {
          display: flex;
          flex-direction: row;
          align-items: start;
          margin-bottom: 8px;
        }
        .checkbox-label:last-child {
          margin-bottom: 0;
        }
        .checkbox-label input {
          margin: 0 6px 0 0;
          padding: 0;
        }
        .select-settings {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fill, 150px);
          gap: 16px;
        }
        .select-label {
          display: flex;
          flex-direction: column;
        }
        .select-label span {
          margin-bottom: 4px;
        }
        .elements {
          margin-top: 12px;
          color: var(--dom-tag-name-color);
        }
      </style>
      <details open>
        <summary class="header">
          ${ls`Grid`}
        </summary>
        ${this.gridElements ?
          html`<div class="content-section">
            <h3 class="content-section-title">${ls`Grid overlays`}</h3>
            <div class="elements">
              ${this.gridElements.map(element => this.renderElement(element))}
            </div>
          </div>` : ''}
        <div class="content-section">
          <h3 class="content-section-title">${ls`Overlay display settings`}</h3>
          <div class="checkbox-settings">
            ${this.getBooleanSettings().map(setting => this.renderBooleanSetting(setting))}
          </div>
          <div class="select-settings">
            ${this.getEnumSettings().map(setting => this.renderEnumSetting(setting))}
          </div>
        </div>
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

  private onElementToggle(element: Element, event: HTMLInputElementEvent) {
    event.preventDefault();
    this.dispatchEvent(new OverlayChangedEvent(element.id, event.target.checked));
  }

  private renderElement(element: Element) {
    const name = this.buildElementName(element);
    const onElementToggle = this.onElementToggle.bind(this, element);
    return html`<label data-element="true" class="checkbox-label" title=${name}>
      <input data-input="true" type="checkbox" .checked=${element.enabled} @change=${onElementToggle} />
      <span data-label="true">${name}</span>
    </label>`;
  }

  private buildElementName(element: Element) {
    const parts = [element.name];
    if (element.domId) {
      parts.push(`#${CSS.escape(element.domId)}`);
    }
    if (element.domClasses) {
      parts.push(...element.domClasses.map(cls => `.${CSS.escape(cls)}`));
    }
    return parts.join('');
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
