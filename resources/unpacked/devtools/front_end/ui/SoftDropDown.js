// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @template T
 * @implements {UI.ListDelegate<T>}
 */
export default class SoftDropDown {
  /**
   * @param {!UI.ListModel<T>} model
   * @param {!Delegate<T>} delegate
   */
  constructor(model, delegate) {
    this._delegate = delegate;
    this._selectedItem = null;
    this._model = model;

    this._placeholderText = ls`(no item selected)`;

    this.element = createElementWithClass('button', 'soft-dropdown');
    UI.appendStyle(this.element, 'ui/softDropDownButton.css');
    this._titleElement = this.element.createChild('span', 'title');
    const dropdownArrowIcon = UI.Icon.create('smallicon-triangle-down');
    this.element.appendChild(dropdownArrowIcon);
    UI.ARIAUtils.setExpanded(this.element, false);

    this._glassPane = new UI.GlassPane();
    this._glassPane.setMarginBehavior(UI.GlassPane.MarginBehavior.NoMargin);
    this._glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferBottom);
    this._glassPane.setOutsideClickCallback(this._hide.bind(this));
    this._glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BlockedByGlassPane);
    this._list = new UI.ListControl(model, this, UI.ListMode.EqualHeightItems);
    this._list.element.classList.add('item-list');
    this._rowHeight = 36;
    this._width = 315;
    UI.createShadowRootWithCoreStyles(this._glassPane.contentElement, 'ui/softDropDown.css')
        .createChild('div', 'list-container')  // issue #972755
        .appendChild(this._list.element);
    UI.ARIAUtils.markAsMenu(this._list.element);

    this._listWasShowing200msAgo = false;
    this.element.addEventListener('mousedown', event => {
      if (this._listWasShowing200msAgo) {
        this._hide(event);
      } else if (!this.element.disabled) {
        this._show(event);
      }
    }, false);
    this.element.addEventListener('keydown', this._onKeyDownButton.bind(this), false);
    this._list.element.addEventListener('keydown', this._onKeyDownList.bind(this), false);
    this._list.element.addEventListener('focusout', this._hide.bind(this), false);
    this._list.element.addEventListener('mousedown', event => event.consume(true), false);
    this._list.element.addEventListener('mouseup', event => {
      if (event.target === this._list.element) {
        return;
      }

      if (!this._listWasShowing200msAgo) {
        return;
      }
      this._selectHighlightedItem();
      this._hide(event);
    }, false);
    model.addEventListener(UI.ListModel.Events.ItemsReplaced, this._itemsReplaced, this);
  }

  /**
   * @param {!Event} event
   */
  _show(event) {
    if (this._glassPane.isShowing()) {
      return;
    }
    this._glassPane.setContentAnchorBox(this.element.boxInWindow());
    this._glassPane.show(/** @type {!Document} **/ (this.element.ownerDocument));
    this._list.element.focus();
    UI.ARIAUtils.setExpanded(this.element, true);
    this._updateGlasspaneSize();
    if (this._selectedItem) {
      this._list.selectItem(this._selectedItem);
    }
    event.consume(true);
    setTimeout(() => this._listWasShowing200msAgo = true, 200);
  }

  _updateGlasspaneSize() {
    const maxHeight = this._rowHeight * (Math.min(this._model.length, 9));
    this._glassPane.setMaxContentSize(new UI.Size(this._width, maxHeight));
    this._list.viewportResized();
  }

  /**
   * @param {!Event} event
   */
  _hide(event) {
    setTimeout(() => this._listWasShowing200msAgo = false, 200);
    this._glassPane.hide();
    this._list.selectItem(null);
    UI.ARIAUtils.setExpanded(this.element, false);
    this.element.focus();
    event.consume(true);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDownButton(event) {
    let handled = false;
    switch (event.key) {
      case 'ArrowUp':
        this._show(event);
        this._list.selectItemNextPage();
        handled = true;
        break;
      case 'ArrowDown':
        this._show(event);
        this._list.selectItemPreviousPage();
        handled = true;
        break;
      case 'Enter':
      case ' ':
        this._show(event);
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.consume(true);
    }
  }

  /**
   * @param {!Event} event
   */
  _onKeyDownList(event) {
    let handled = false;
    switch (event.key) {
      case 'ArrowLeft':
        handled = this._list.selectPreviousItem(false, false);
        break;
      case 'ArrowRight':
        handled = this._list.selectNextItem(false, false);
        break;
      case 'Home':
        for (let i = 0; i < this._model.length; i++) {
          if (this.isItemSelectable(this._model.at(i))) {
            this._list.selectItem(this._model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'End':
        for (let i = this._model.length - 1; i >= 0; i--) {
          if (this.isItemSelectable(this._model.at(i))) {
            this._list.selectItem(this._model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'Escape':
        this._hide(event);
        handled = true;
        break;
      case 'Tab':
      case 'Enter':
      case ' ':
        this._selectHighlightedItem();
        this._hide(event);
        handled = true;
        break;
      default:
        if (event.key.length === 1) {
          const selectedIndex = this._list.selectedIndex();
          const letter = event.key.toUpperCase();
          for (let i = 0; i < this._model.length; i++) {
            const item = this._model.at((selectedIndex + i + 1) % this._model.length);
            if (this._delegate.titleFor(item).toUpperCase().startsWith(letter)) {
              this._list.selectItem(item);
              break;
            }
          }
          handled = true;
        }
        break;
    }

    if (handled) {
      event.consume(true);
    }
  }

  /**
   * @param {number} width
   */
  setWidth(width) {
    this._width = width;
    this._updateGlasspaneSize();
  }

  /**
   * @param {number} rowHeight
   */
  setRowHeight(rowHeight) {
    this._rowHeight = rowHeight;
  }

  /**
   * @param {string} text
   */
  setPlaceholderText(text) {
    this._placeholderText = text;
    if (!this._selectedItem) {
      this._titleElement.textContent = this._placeholderText;
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _itemsReplaced(event) {
    const removed = /** @type {!Array<T>} */ (event.data.removed);
    if (removed.indexOf(this._selectedItem) !== -1) {
      this._selectedItem = null;
      this._selectHighlightedItem();
    }
    this._updateGlasspaneSize();
  }

  /**
   * @param {?T} item
   */
  selectItem(item) {
    this._selectedItem = item;
    if (this._selectedItem) {
      this._titleElement.textContent = this._delegate.titleFor(this._selectedItem);
    } else {
      this._titleElement.textContent = this._placeholderText;
    }
    this._delegate.itemSelected(this._selectedItem);
  }

  /**
   * @override
   * @param {T} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = createElementWithClass('div', 'item');
    element.addEventListener('mousemove', e => {
      if ((e.movementX || e.movementY) && this._delegate.isItemSelectable(item)) {
        this._list.selectItem(item, false, /* Don't scroll */ true);
      }
    });
    element.classList.toggle('disabled', !this._delegate.isItemSelectable(item));
    element.classList.toggle('highlighted', this._list.selectedItem() === item);

    UI.ARIAUtils.markAsMenuItem(element);
    element.appendChild(this._delegate.createElementForItem(item));

    return element;
  }

  /**
   * @override
   * @param {T} item
   * @return {number}
   */
  heightForItem(item) {
    return this._rowHeight;
  }

  /**
   * @override
   * @param {T} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return this._delegate.isItemSelectable(item);
  }

  /**
   * @override
   * @param {?T} from
   * @param {?T} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }

    UI.ARIAUtils.setActiveDescendant(this._list.element, toElement);
    this._delegate.highlightedItemChanged(
        from, to, fromElement && fromElement.firstElementChild, toElement && toElement.firstElementChild);
  }

  _selectHighlightedItem() {
    this.selectItem(this._list.selectedItem());
  }

  /**
   * @param {T} item
   */
  refreshItem(item) {
    this._list.refreshItem(item);
  }
}

/**
 * @interface
 * @template T
 */
export class Delegate {
  /**
   * @param {T} item
   * @return {string}
   */
  titleFor(item) {
  }

  /**
   * @param {T} item
   * @return {!Element}
   */
  createElementForItem(item) {
  }

  /**
   * @param {T} item
   * @return {boolean}
   */
  isItemSelectable(item) {
  }

  /**
   * @param {?T} item
   */
  itemSelected(item) {
  }

  /**
   * @param {?T} from
   * @param {?T} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  highlightedItemChanged(from, to, fromElement, toElement) {
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.SoftDropDown = SoftDropDown;

/**
 * @interface
 * @template T
 */
UI.SoftDropDown.Delegate = Delegate;