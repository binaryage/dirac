/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {!Element=} parentElement
 */
WebInspector.Toolbar = function(parentElement)
{
    /** @type {!Array.<!WebInspector.ToolbarItem>} */
    this._items = [];
    this.element = parentElement ? parentElement.createChild("div", "toolbar") : createElementWithClass("div", "toolbar");

    this._shadowRoot = this.element.createShadowRoot();
    this._shadowRoot.appendChild(WebInspector.View.createStyleElement("ui/toolbar.css"));
    this._contentElement = this._shadowRoot.createChild("div", "toolbar-shadow");
    this._contentElement.createChild("content");
    WebInspector.installComponentRootStyles(this._contentElement);
}

WebInspector.Toolbar.prototype = {
    makeNarrow: function()
    {
        this._contentElement.classList.add("narrow");
    },

    makeVertical: function()
    {
        this._contentElement.classList.add("vertical");
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        for (var item of this._items)
            item.setEnabled(enabled);
    },

    /**
     * @param {!WebInspector.ToolbarItem} item
     */
    appendToolbarItem: function(item)
    {
        this._items.push(item);
        this._contentElement.insertBefore(item.element, this._contentElement.lastChild);
    },

    removeToolbarItems: function()
    {
        this._items = [];
        this._contentElement.removeChildren();
        this._contentElement.createChild("content");
    },

    /**
     * @param {string} color
     */
    setColor: function(color)
    {
        var style = createElement("style");
        style.textContent = "button.toolbar-item .glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    },

    /**
     * @param {string} color
     */
    setToggledColor: function(color)
    {
        var style = createElement("style");
        style.textContent = "button.toolbar-item.toggled-on .glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!Element} element
 */
WebInspector.ToolbarItem = function(element)
{
    this.element = element;
    this.element.classList.add("toolbar-item");
    this._enabled = true;
    this._visible = true;
}

WebInspector.ToolbarItem.prototype = {
    /**
     * @param {boolean} value
     */
    setEnabled: function(value)
    {
        if (this._enabled === value)
            return;
        this._enabled = value;
        this._applyEnabledState();
    },

    _applyEnabledState: function()
    {
        this.element.disabled = !this._enabled;
    },

    /**
     * @return {boolean} x
     */
    visible: function()
    {
        return this._visible;
    },

    /**
     * @param {boolean} x
     */
    setVisible: function(x)
    {
        if (this._visible === x)
            return;
        this.element.classList.toggle("hidden", !x);
        this._visible = x;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {!Array.<string>} counters
 */
WebInspector.ToolbarCounter = function(counters)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("div", "toolbar-counter hidden"));
    this.element.addEventListener("click", this._clicked.bind(this), false);
    /** @type {!Array.<!{element: !Element, counter: string, value: number, title: string}>} */
    this._counters = [];
    for (var i = 0; i < counters.length; ++i) {
        var element = this.element.createChild("span", "toolbar-counter-item");
        var icon = element.createChild("label", "", "dt-icon-label");
        icon.type = counters[i];
        var span = icon.createChild("span");
        this._counters.push({counter: counters[i], element: element, value: 0, title: "", span: span});
    }
    this._update();
}

WebInspector.ToolbarCounter.prototype = {
    /**
     * @param {string} counter
     * @param {number} value
     * @param {string} title
     */
    setCounter: function(counter, value, title)
    {
        for (var i = 0; i < this._counters.length; ++i) {
            if (this._counters[i].counter === counter) {
                this._counters[i].value = value;
                this._counters[i].title = title;
                this._update();
                return;
            }
        }
    },

    _update: function()
    {
        var total = 0;
        var title = "";
        for (var i = 0; i < this._counters.length; ++i) {
            var counter = this._counters[i];
            var value = counter.value;
            if (!counter.value) {
                counter.element.classList.add("hidden");
                continue;
            }
            counter.element.classList.remove("hidden");
            counter.element.classList.toggle("toolbar-counter-item-first", !total);
            counter.span.textContent = value;
            total += value;
            if (counter.title) {
                if (title)
                    title += ", ";
                title += counter.title;
            }
        }
        this.element.classList.toggle("hidden", !total);
        this.element.title = title;
    },

    /**
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        this.dispatchEventToListeners("click");
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string} text
 * @param {string=} className
 */
WebInspector.ToolbarText = function(text, className)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("span", "toolbar-text"));
    if (className)
        this.element.classList.add(className);
    this.element.textContent = text;
}

WebInspector.ToolbarText.prototype = {
    /**
     * @param {string} text
     */
    setText: function(text)
    {
        this.element.textContent = text;
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string=} placeholder
 * @param {number=} growFactor
 */
WebInspector.ToolbarInput = function(placeholder, growFactor)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("input", "toolbar-item"));
    this.element.addEventListener("input", this._onChangeCallback.bind(this), false);
    if (growFactor)
        this.element.style.flexGrow = growFactor;
    if (placeholder)
        this.element.setAttribute("placeholder", placeholder);
    this._value = "";
}

WebInspector.ToolbarInput.Event = {
    TextChanged: "TextChanged"
};

WebInspector.ToolbarInput.prototype = {
    /**
     * @param {string} value
     */
    setValue: function(value)
    {
        this._value = value;
        this.element.value = value;
    },

    /**
     * @return {string}
     */
    value: function()
    {
        return this.element.value;
    },

    _onChangeCallback: function()
    {
        this.dispatchEventToListeners(WebInspector.ToolbarInput.Event.TextChanged, this.element.value);
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string} title
 * @param {string} className
 * @param {number=} states
 */
WebInspector.ToolbarButtonBase = function(title, className, states)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("button", className + " toolbar-item"));
    this.element.addEventListener("click", this._clicked.bind(this), false);
    this._longClickController = new WebInspector.LongClickController(this.element);
    this._longClickController.addEventListener(WebInspector.LongClickController.Events.LongClick, this._onLongClick.bind(this));
    this._longClickController.addEventListener(WebInspector.LongClickController.Events.LongPress, this._onLongPress.bind(this));

    this._states = states;
    if (!states)
        this._states = 2;

    if (states == 2)
        this._state = "off";
    else
        this._state = "0";

    this.setTitle(title);
    this.className = className;
}

WebInspector.ToolbarButtonBase.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onLongClick: function(event)
    {
        this.dispatchEventToListeners("longClickDown");
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLongPress: function(event)
    {
        this.dispatchEventToListeners("longPressDown");
    },

    _clicked: function()
    {
        this.dispatchEventToListeners("click");
        this._longClickController.reset();
    },

    /**
     * @override
     */
    _applyEnabledState: function()
    {
        this.element.disabled = !this._enabled;
        this._longClickController.reset();
    },

    /**
     * @return {boolean}
     */
    enabled: function()
    {
        return this._enabled;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @param {string} x
     */
    setTitle: function(x)
    {
        if (this._title === x)
            return;
        this._title = x;
        this.element.title = x;
    },

    /**
     * @return {string}
     */
    state: function()
    {
        return this._state;
    },

    /**
     * @param {string} x
     */
    setState: function(x)
    {
        if (this._state === x)
            return;

        this.element.classList.remove("toggled-" + this._state);
        this.element.classList.add("toggled-" + x);
        this._state = x;
    },

    /**
     * @return {boolean}
     */
    toggled: function()
    {
        if (this._states !== 2)
            throw("Only used toggled when there are 2 states, otherwise, use state");
        return this.state() === "on";
    },

    /**
     * @param {boolean} x
     */
    setToggled: function(x)
    {
        if (this._states !== 2)
            throw("Only used toggled when there are 2 states, otherwise, use state");
        this.setState(x ? "on" : "off");
    },

    makeLongClickEnabled: function()
    {
        this._longClickController.enable();
    },

    unmakeLongClickEnabled: function()
    {
        this._longClickController.disable();
    },

    /**
     * @param {?function():!Array.<!WebInspector.ToolbarButton>} buttonsProvider
     */
    setLongClickOptionsEnabled: function(buttonsProvider)
    {
        if (buttonsProvider) {
            if (!this._longClickOptionsData) {
                this.makeLongClickEnabled();

                this.longClickGlyph = this.element.createChild("div", "fill long-click-glyph toolbar-button-theme");

                var longClickDownListener = this._showOptions.bind(this);
                this.addEventListener("longClickDown", longClickDownListener, this);

                this._longClickOptionsData = {
                    glyphElement: this.longClickGlyph,
                    longClickDownListener: longClickDownListener
                };
            }
            this._longClickOptionsData.buttonsProvider = buttonsProvider;
        } else {
            if (!this._longClickOptionsData)
                return;
            this.element.removeChild(this._longClickOptionsData.glyphElement);

            this.removeEventListener("longClickDown", this._longClickOptionsData.longClickDownListener, this);
            delete this._longClickOptionsData;

            this.unmakeLongClickEnabled();
        }
    },

    _showOptions: function()
    {
        var buttons = this._longClickOptionsData.buttonsProvider();
        var mainButtonClone = new WebInspector.ToolbarButton(this.title(), this.className, this._states);
        mainButtonClone.addEventListener("click", this._clicked, this);
        mainButtonClone.setState(this.state());
        buttons.push(mainButtonClone);

        var document = this.element.ownerDocument;
        document.documentElement.addEventListener("mouseup", mouseUp, false);

        var optionsGlassPane = new WebInspector.GlassPane(document);
        var optionsBar = new WebInspector.Toolbar(optionsGlassPane.element);

        optionsBar.element.classList.add("fill");
        optionsBar._contentElement.classList.add("floating");
        const buttonHeight = 23;

        var hostButtonPosition = this.element.totalOffset();

        var topNotBottom = hostButtonPosition.top + buttonHeight * buttons.length < document.documentElement.offsetHeight;

        if (topNotBottom)
            buttons = buttons.reverse();

        optionsBar.element.style.height = (buttonHeight * buttons.length) + "px";
        if (topNotBottom)
            optionsBar.element.style.top = (hostButtonPosition.top + 1) + "px";
        else
            optionsBar.element.style.top = (hostButtonPosition.top - (buttonHeight * (buttons.length - 1))) + "px";
        optionsBar.element.style.left = (hostButtonPosition.left + 1) + "px";

        for (var i = 0; i < buttons.length; ++i) {
            buttons[i].element.addEventListener("mousemove", mouseOver, false);
            buttons[i].element.addEventListener("mouseout", mouseOut, false);
            optionsBar.appendToolbarItem(buttons[i]);
        }
        var hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
        buttons[hostButtonIndex].element.classList.add("emulate-active");

        function mouseOver(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.add("emulate-active");
        }

        function mouseOut(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.remove("emulate-active");
        }

        function mouseUp(e)
        {
            if (e.which !== 1)
                return;
            optionsGlassPane.dispose();
            document.documentElement.removeEventListener("mouseup", mouseUp, false);

            for (var i = 0; i < buttons.length; ++i) {
                if (buttons[i].element.classList.contains("emulate-active")) {
                    buttons[i].element.classList.remove("emulate-active");
                    buttons[i]._clicked();
                    break;
                }
            }
        }
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarButtonBase}
 * @param {string} title
 * @param {string} className
 * @param {number=} states
 */
WebInspector.ToolbarButton = function(title, className, states)
{
    WebInspector.ToolbarButtonBase.call(this, title, className, states);

    this._glyphElement = this.element.createChild("div", "glyph toolbar-button-theme");
}

WebInspector.ToolbarButton.prototype = {
    /**
     * @param {string} iconURL
     */
    setBackgroundImage: function(iconURL)
    {
        this.element.style.backgroundImage = "url(" + iconURL + ")";
        this._glyphElement.classList.add("hidden");
    },

    __proto__: WebInspector.ToolbarButtonBase.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 */
WebInspector.ToolbarSeparator = function()
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("div", "toolbar-divider"));
}

WebInspector.ToolbarSeparator.prototype = {
    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarButtonBase}
 * @param {string} title
 * @param {string} className
 * @param {string} text
 * @param {number=} states
 */
WebInspector.ToolbarTextButton = function(title, className, text, states)
{
    WebInspector.ToolbarButtonBase.call(this, title, className, states);

    this._textElement = this.element.createChild("div", "toolbar-button-text");
    this._textElement.textContent = text;
}

WebInspector.ToolbarTextButton.prototype = {
    __proto__: WebInspector.ToolbarButtonBase.prototype
}

/**
 * @interface
 */
WebInspector.ToolbarItem.Provider = function()
{
}

WebInspector.ToolbarItem.Provider.prototype = {
    /**
     * @return {?WebInspector.ToolbarItem}
     */
    item: function() {}
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {?function(!Event)} changeHandler
 * @param {string=} className
 */
WebInspector.ToolbarComboBox = function(changeHandler, className)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("span", "toolbar-select-container"));

    this._selectElement = this.element.createChild("select", "toolbar-item");
    this.element.createChild("div", "toolbar-select-arrow");
    if (changeHandler)
        this._selectElement.addEventListener("change", changeHandler, false);
    if (className)
        this._selectElement.classList.add(className);
}

WebInspector.ToolbarComboBox.prototype = {
    /**
     * @return {!Element}
     */
    selectElement: function()
    {
        return this._selectElement;
    },

    /**
     * @return {number}
     */
    size: function()
    {
        return this._selectElement.childElementCount;
    },

    /**
     * @param {!Element} option
     */
    addOption: function(option)
    {
        this._selectElement.appendChild(option);
    },

    /**
     * @param {string} label
     * @param {string=} title
     * @param {string=} value
     * @return {!Element}
     */
    createOption: function(label, title, value)
    {
        var option = this._selectElement.createChild("option");
        option.text = label;
        if (title)
            option.title = title;
        if (typeof value !== "undefined")
            option.value = value;
        return option;
    },

    /**
     * @override
     */
    _applyEnabledState: function()
    {
        this._selectElement.disabled = !this._enabled;
    },

    /**
     * @param {!Element} option
     */
    removeOption: function(option)
    {
        this._selectElement.removeChild(option);
    },

    removeOptions: function()
    {
        this._selectElement.removeChildren();
    },

    /**
     * @return {?Element}
     */
    selectedOption: function()
    {
        if (this._selectElement.selectedIndex >= 0)
            return this._selectElement[this._selectElement.selectedIndex];
        return null;
    },

    /**
     * @param {!Element} option
     */
    select: function(option)
    {
        this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
    },

    /**
     * @param {number} index
     */
    setSelectedIndex: function(index)
    {
        this._selectElement.selectedIndex = index;
    },

    /**
     * @return {number}
     */
    selectedIndex: function()
    {
        return this._selectElement.selectedIndex;
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string} text
 * @param {string=} title
 * @param {!WebInspector.Setting=} setting
 */
WebInspector.ToolbarCheckbox = function(text, title, setting)
{
    WebInspector.ToolbarItem.call(this, createCheckboxLabel(text));
    this.element.classList.add("checkbox");
    this.inputElement = this.element.checkboxElement;
    if (title)
        this.element.title = title;
    if (setting)
        WebInspector.SettingsUI.bindCheckbox(this.inputElement, setting);
}

WebInspector.ToolbarCheckbox.prototype = {
    /**
     * @return {boolean}
     */
    checked: function()
    {
        return this.inputElement.checked;
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarButton}
 * @param {string} className
 * @param {!Array.<string>} states
 * @param {!Array.<string>} titles
 * @param {string} initialState
 * @param {!WebInspector.Setting} currentStateSetting
 * @param {!WebInspector.Setting} lastStateSetting
 * @param {?function(string)} stateChangedCallback
 */
WebInspector.ToolbarStatesSettingButton = function(className, states, titles, initialState, currentStateSetting, lastStateSetting, stateChangedCallback)
{
    WebInspector.ToolbarButton.call(this, "", className, states.length);

    var onClickBound = this._onClick.bind(this);
    this.addEventListener("click", onClickBound, this);

    this._states = states;
    /** @type {!Array.<!WebInspector.ToolbarButton>} */
    this._buttons = [];
    for (var index = 0; index < states.length; index++) {
        var button = new WebInspector.ToolbarButton(titles[index], className, states.length);
        button.setState(this._states[index]);
        button.addEventListener("click", onClickBound, this);
        this._buttons.push(button);
    }

    this._currentStateSetting = currentStateSetting;
    this._lastStateSetting = lastStateSetting;
    this._stateChangedCallback = stateChangedCallback;
    this.setLongClickOptionsEnabled(this._createOptions.bind(this));

    this._currentState = null;
    this._toggleState(initialState);
}

WebInspector.ToolbarStatesSettingButton.prototype = {
    /**
     * @param {!WebInspector.Event} e
     */
    _onClick: function(e)
    {
        this._toggleState(e.target.state());
    },

    /**
     * @param {string} state
     */
    _toggleState: function(state)
    {
        if (this._currentState === state)
            return;

        if (this._currentState)
            this._lastStateSetting.set(this._currentState);
        this._currentState = state;
        this._currentStateSetting.set(this._currentState);

        if (this._stateChangedCallback)
            this._stateChangedCallback(state);

        var defaultState = this._defaultState();
        this.setState(defaultState);
        this.setTitle(this._buttons[this._states.indexOf(defaultState)].title());
    },

    /**
     * Toggle state similarly to user click.
     */
    toggle: function()
    {
        this._toggleState(this.state());
    },

    /**
     * @return {string}
     */
    _defaultState: function()
    {
        var lastState = this._lastStateSetting.get();
        if (lastState && this._states.indexOf(lastState) >= 0 && lastState != this._currentState)
            return lastState;
        if (this._states.length > 1 && this._currentState === this._states[0])
            return this._states[1];
        return this._states[0];
    },

    /**
     * @return {!Array.<!WebInspector.ToolbarButton>}
     */
    _createOptions: function()
    {
        var options = [];
        for (var index = 0; index < this._states.length; index++) {
            if (this._states[index] !== this.state() && this._states[index] !== this._currentState)
                options.push(this._buttons[index]);
        }
        return options;
    },

    __proto__: WebInspector.ToolbarButton.prototype
}
