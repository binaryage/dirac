/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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

WebInspector.SettingsUI = {}

/**
 * @param {string} name
 * @param {function(): *} getter
 * @param {function(*)} setter
 * @param {boolean=} omitParagraphElement
 * @param {!Element=} inputElement
 * @param {string=} tooltip
 * @return {!Element}
 */
WebInspector.SettingsUI.createCheckbox = function(name, getter, setter, omitParagraphElement, inputElement, tooltip)
{
    var input = inputElement || document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = getter();

    function listener()
    {
        setter(input.checked);
    }
    input.addEventListener("change", listener, false);

    var label = document.createElement("label");
    label.appendChild(input);
    label.createTextChild(name);
    if (tooltip)
        label.title = tooltip;

    if (omitParagraphElement)
        return label;

    var p = document.createElement("p");
    p.appendChild(label);
    return p;
}

/**
 * @param {string} name
 * @param {!WebInspector.Setting} setting
 * @param {boolean=} omitParagraphElement
 * @param {!Element=} inputElement
 * @param {string=} tooltip
 * @return {!Element}
 */
WebInspector.SettingsUI.createSettingCheckbox = function(name, setting, omitParagraphElement, inputElement, tooltip)
{
    return WebInspector.SettingsUI.createCheckbox(name, setting.get.bind(setting), setting.set.bind(setting), omitParagraphElement, inputElement, tooltip);
}

/**
 * @param {!WebInspector.Setting} setting
 * @return {!Element}
 */
WebInspector.SettingsUI.createSettingFieldset = function(setting)
{
    var fieldset = document.createElement("fieldset");
    fieldset.disabled = !setting.get();
    setting.addChangeListener(settingChanged);
    return fieldset;

    function settingChanged()
    {
        fieldset.disabled = !setting.get();
    }
}
