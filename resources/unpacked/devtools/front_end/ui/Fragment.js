// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

export class Fragment {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    this._element = element;

    /** @type {!Map<string, !Element>} */
    this._elementsById = new Map();
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {string} elementId
   * @return {!Element}
   */
  $(elementId) {
    return this._elementsById.get(elementId);
  }

  /**
   * @param {!Array<string>} strings
   * @param {...*} values
   * @return {!Fragment}
   */
  static build(strings, ...values) {
    return Fragment._render(Fragment._template(strings), values);
  }

  /**
   * @param {!Array<string>} strings
   * @param {...*} values
   * @return {!Fragment}
   */
  static cached(strings, ...values) {
    let template = _templateCache.get(strings);
    if (!template) {
      template = Fragment._template(strings);
      _templateCache.set(strings, template);
    }
    return Fragment._render(template, values);
  }

  /**
   * @param {!Array<string>} strings
   * @return {!_Template}
   * @suppressGlobalPropertiesCheck
   */
  static _template(strings) {
    let html = '';
    let insideText = true;
    for (let i = 0; i < strings.length - 1; i++) {
      html += strings[i];
      const close = strings[i].lastIndexOf('>');
      const open = strings[i].indexOf('<', close + 1);
      if (close !== -1 && open === -1) {
        insideText = true;
      } else if (open !== -1) {
        insideText = false;
      }
      html += insideText ? _textMarker : _attributeMarker(i);
    }
    html += strings[strings.length - 1];

    const template = window.document.createElement('template');
    template.innerHTML = html;
    const walker = template.ownerDocument.createTreeWalker(
        template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
    let valueIndex = 0;
    const emptyTextNodes = [];
    const binds = [];
    const nodesToMark = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
        if (node.hasAttribute('$')) {
          nodesToMark.push(node);
          binds.push({elementId: node.getAttribute('$')});
          node.removeAttribute('$');
        }

        const attributesToRemove = [];
        for (let i = 0; i < node.attributes.length; i++) {
          const name = node.attributes[i].name;

          if (!_attributeMarkerRegex.test(name) && !_attributeMarkerRegex.test(node.attributes[i].value)) {
            continue;
          }

          attributesToRemove.push(name);
          nodesToMark.push(node);
          const bind = {attr: {index: valueIndex}};
          bind.attr.names = name.split(_attributeMarkerRegex);
          valueIndex += bind.attr.names.length - 1;
          bind.attr.values = node.attributes[i].value.split(_attributeMarkerRegex);
          valueIndex += bind.attr.values.length - 1;
          binds.push(bind);
        }
        for (let i = 0; i < attributesToRemove.length; i++) {
          node.removeAttribute(attributesToRemove[i]);
        }
      }

      if (node.nodeType === Node.TEXT_NODE && node.data.indexOf(_textMarker) !== -1) {
        const texts = node.data.split(_textMarkerRegex);
        node.data = texts[texts.length - 1];
        for (let i = 0; i < texts.length - 1; i++) {
          if (texts[i]) {
            node.parentNode.insertBefore(createTextNode(texts[i]), node);
          }
          const nodeToReplace = createElement('span');
          nodesToMark.push(nodeToReplace);
          binds.push({replaceNodeIndex: valueIndex++});
          node.parentNode.insertBefore(nodeToReplace, node);
        }
      }

      if (node.nodeType === Node.TEXT_NODE &&
          (!node.previousSibling || node.previousSibling.nodeType === Node.ELEMENT_NODE) &&
          (!node.nextSibling || node.nextSibling.nodeType === Node.ELEMENT_NODE) && /^\s*$/.test(node.data)) {
        emptyTextNodes.push(node);
      }
    }

    for (let i = 0; i < nodesToMark.length; i++) {
      nodesToMark[i].classList.add(_class(i));
    }

    for (const emptyTextNode of emptyTextNodes) {
      emptyTextNode.remove();
    }
    return {template: template, binds: binds};
  }

  /**
   * @param {!_Template} template
   * @param {!Array<*>} values
   * @return {!Fragment}
   */
  static _render(template, values) {
    const content = template.template.ownerDocument.importNode(template.template.content, true);
    const resultElement =
        /** @type {!Element} */ (content.firstChild === content.lastChild ? content.firstChild : content);
    const result = new Fragment(resultElement);

    const boundElements = [];
    for (let i = 0; i < template.binds.length; i++) {
      const className = _class(i);
      const element = /** @type {!Element} */ (content.querySelector('.' + className));
      element.classList.remove(className);
      boundElements.push(element);
    }

    for (let bindIndex = 0; bindIndex < template.binds.length; bindIndex++) {
      const bind = template.binds[bindIndex];
      const element = boundElements[bindIndex];
      if ('elementId' in bind) {
        result._elementsById.set(/** @type {string} */ (bind.elementId), element);
      } else if ('replaceNodeIndex' in bind) {
        const value = values[/** @type {number} */ (bind.replaceNodeIndex)];
        element.parentNode.replaceChild(this._nodeForValue(value), element);
      } else if ('attr' in bind) {
        if (bind.attr.names.length === 2 && bind.attr.values.length === 1 &&
            typeof values[bind.attr.index] === 'function') {
          values[bind.attr.index].call(null, element);
        } else {
          let name = bind.attr.names[0];
          for (let i = 1; i < bind.attr.names.length; i++) {
            name += values[bind.attr.index + i - 1];
            name += bind.attr.names[i];
          }
          if (name) {
            let value = bind.attr.values[0];
            for (let i = 1; i < bind.attr.values.length; i++) {
              value += values[bind.attr.index + bind.attr.names.length - 1 + i - 1];
              value += bind.attr.values[i];
            }
            element.setAttribute(name, value);
          }
        }
      } else {
        throw new Error('Unexpected bind');
      }
    }
    return result;
  }

  /**
   * @param {*} value
   * @return {!Node}
   */
  static _nodeForValue(value) {
    if (value instanceof Node) {
      return value;
    }
    if (value instanceof Fragment) {
      return value._element;
    }
    if (Array.isArray(value)) {
      const node = createDocumentFragment();
      for (const v of value) {
        node.appendChild(this._nodeForValue(v));
      }
      return node;
    }
    return createTextNode('' + value);
  }
}

export const _textMarker = '{{template-text}}';
const _textMarkerRegex = /{{template-text}}/;
export const _attributeMarker = index => 'template-attribute' + index;
const _attributeMarkerRegex = /template-attribute\d+/;
const _class = index => 'template-class-' + index;
const _templateCache = new Map();

/**
 * @param {!Array<string>} strings
 * @param {...*} vararg
 * @return {!Element}
 */
export const html = (strings, ...vararg) => {
  return Fragment.cached(strings, ...vararg).element();
};

/**
  * @typedef {!{
  *   elementId: (string|undefined),
  *
  *   attr: (!{
  *     index: number,
  *     names: !Array<string>,
  *     values: !Array<string>
  *   }|undefined),
  *
  *   replaceNodeIndex: (number|undefined)
  * }}
  */
export let _Bind;

/**
 * @typedef {!{
  *   template: !Element,
  *   binds: !Array<!_Bind>
  * }}
  */
export let _Template;
