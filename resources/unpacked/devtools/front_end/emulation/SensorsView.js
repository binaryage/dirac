// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class SensorsView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('emulation/sensors.css');
    this.contentElement.classList.add('sensors-view');

    this._LocationSetting = Common.Settings.Settings.instance().createSetting('emulation.locationOverride', '');
    this._Location = SDK.EmulationModel.Location.parseSetting(this._LocationSetting.get());
    this._LocationOverrideEnabled = false;
    this._createLocationSection(this._Location);

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._deviceOrientationSetting =
        Common.Settings.Settings.instance().createSetting('emulation.deviceOrientationOverride', '');
    this._deviceOrientation = SDK.EmulationModel.DeviceOrientation.parseSetting(this._deviceOrientationSetting.get());
    this._deviceOrientationOverrideEnabled = false;
    this._createDeviceOrientationSection();

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._appendTouchControl();
  }

  /**
   * @return {!SensorsView}
   */
  static instance() {
    if (!SensorsView._instanceObject) {
      SensorsView._instanceObject = new SensorsView();
    }
    return SensorsView._instanceObject;
  }

  /**
   * @param {!SDK.EmulationModel.Location} location
   */
  _createLocationSection(location) {
    const geogroup = this.contentElement.createChild('section', 'sensors-group');
    const geogroupTitle = UI.UIUtils.createLabel(ls`Location`, 'sensors-group-title');
    geogroup.appendChild(geogroupTitle);
    const fields = geogroup.createChild('div', 'geo-fields');
    let selectedIndex = 0;

    const noOverrideOption = {title: Common.UIString.UIString('No override'), location: NonPresetOptions.NoOverride};

    this._locationSelectElement = fields.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(geogroupTitle, this._locationSelectElement);

    // No override
    this._locationSelectElement.appendChild(new Option(noOverrideOption.title, noOverrideOption.location));

    // Locations
    this._customLocationsGroup = this._locationSelectElement.createChild('optgroup');
    this._customLocationsGroup.label = ls`Overrides`;
    const customLocations = Common.Settings.Settings.instance().moduleSetting('emulation.locations');
    const manageButton = UI.UIUtils.createTextButton(ls`Manage`, () => Common.Revealer.reveal(customLocations));
    UI.ARIAUtils.setAccessibleName(manageButton, ls`Manage the list of locations`);
    fields.appendChild(manageButton);
    const fillCustomSettings = () => {
      this._customLocationsGroup.removeChildren();
      for (const [i, customLocation] of customLocations.get().entries()) {
        this._customLocationsGroup.appendChild(new Option(customLocation.title, JSON.stringify(customLocation)));
        if (location.latitude === customLocation.lat && location.longitude === customLocation.long) {
          // If the location coming from settings matches the custom location, use its index to select the option
          selectedIndex = i + 1;
        }
      }
    };
    customLocations.addChangeListener(fillCustomSettings);
    fillCustomSettings();

    // Other location
    const customLocationOption = {title: Common.UIString.UIString('Other…'), location: NonPresetOptions.Custom};
    this._locationSelectElement.appendChild(new Option(customLocationOption.title, customLocationOption.location));

    // Error location.
    const group = this._locationSelectElement.createChild('optgroup');
    group.label = ls`Error`;
    group.appendChild(new Option(ls`Location unavailable`, NonPresetOptions.Unavailable));

    this._locationSelectElement.selectedIndex = selectedIndex;
    this._locationSelectElement.addEventListener('change', this._LocationSelectChanged.bind(this));

    // Validated input fieldset.
    this._fieldsetElement = fields.createChild('fieldset');
    this._fieldsetElement.disabled = !this._LocationOverrideEnabled;
    this._fieldsetElement.id = 'location-override-section';

    const latitudeGroup = this._fieldsetElement.createChild('div', 'latlong-group');
    const longitudeGroup = this._fieldsetElement.createChild('div', 'latlong-group');
    const timezoneGroup = this._fieldsetElement.createChild('div', 'latlong-group');
    const localeGroup = this._fieldsetElement.createChild('div', 'latlong-group');

    const cmdOrCtrl = Host.Platform.isMac() ? '\u2318' : 'Ctrl';
    const modifierKeyMessage = ls`Adjust with mousewheel or up/down keys. ${cmdOrCtrl}: ±10, Shift: ±1, Alt: ±0.01`;

    this._latitudeInput = UI.UIUtils.createInput('', 'number');
    latitudeGroup.appendChild(this._latitudeInput);
    this._latitudeInput.setAttribute('step', 'any');
    this._latitudeInput.value = 0;
    this._latitudeSetter = UI.UIUtils.bindInput(
        this._latitudeInput, this._applyLocationUserInput.bind(this), SDK.EmulationModel.Location.latitudeValidator,
        true, 0.1);
    this._latitudeSetter(String(location.latitude));
    this._latitudeInput.title = modifierKeyMessage;
    latitudeGroup.appendChild(UI.UIUtils.createLabel(ls`Latitude`, 'latlong-title', this._latitudeInput));

    this._longitudeInput = UI.UIUtils.createInput('', 'number');
    longitudeGroup.appendChild(this._longitudeInput);
    this._longitudeInput.setAttribute('step', 'any');
    this._longitudeInput.value = 0;
    this._longitudeSetter = UI.UIUtils.bindInput(
        this._longitudeInput, this._applyLocationUserInput.bind(this), SDK.EmulationModel.Location.longitudeValidator,
        true, 0.1);
    this._longitudeSetter(String(location.longitude));
    this._longitudeInput.title = modifierKeyMessage;
    longitudeGroup.appendChild(UI.UIUtils.createLabel(ls`Longitude`, 'latlong-title', this._longitudeInput));

    this._timezoneInput = UI.UIUtils.createInput('', 'text');
    timezoneGroup.appendChild(this._timezoneInput);
    this._timezoneInput.value = 'Europe/Berlin';
    this._timezoneSetter = UI.UIUtils.bindInput(
        this._timezoneInput, this._applyLocationUserInput.bind(this), SDK.EmulationModel.Location.timezoneIdValidator,
        false);
    this._timezoneSetter(location.timezoneId);
    timezoneGroup.appendChild(UI.UIUtils.createLabel(ls`Timezone ID`, 'timezone-title', this._timezoneInput));
    this._timezoneError = timezoneGroup.createChild('div', 'timezone-error');

    this._localeInput = UI.UIUtils.createInput('', 'text');
    localeGroup.appendChild(this._localeInput);
    this._localeInput.value = 'en-US';
    this._localeSetter = UI.UIUtils.bindInput(
        this._localeInput, this._applyLocationUserInput.bind(this), SDK.EmulationModel.Location.localeValidator, false);
    this._localeSetter(location.locale);
    localeGroup.appendChild(UI.UIUtils.createLabel(ls`Locale`, 'locale-title', this._localeInput));
    this._localeError = localeGroup.createChild('div', 'locale-error');
  }

  _LocationSelectChanged() {
    this._fieldsetElement.disabled = false;
    this._timezoneError.textContent = '';
    const value = this._locationSelectElement.options[this._locationSelectElement.selectedIndex].value;
    if (value === NonPresetOptions.NoOverride) {
      this._LocationOverrideEnabled = false;
      this._clearFieldsetElementInputs();
      this._fieldsetElement.disabled = true;
    } else if (value === NonPresetOptions.Custom) {
      this._LocationOverrideEnabled = true;
      const location = SDK.EmulationModel.Location.parseUserInput(
          this._latitudeInput.value.trim(), this._longitudeInput.value.trim(), this._timezoneInput.value.trim(),
          this._localeInput.value.trim());
      if (!location) {
        return;
      }
      this._Location = location;
    } else if (value === NonPresetOptions.Unavailable) {
      this._LocationOverrideEnabled = true;
      this._Location = new SDK.EmulationModel.Location(0, 0, '', '', true);
    } else {
      this._LocationOverrideEnabled = true;
      const coordinates = JSON.parse(value);
      this._Location = new SDK.EmulationModel.Location(
          coordinates.lat, coordinates.long, coordinates.timezoneId, coordinates.locale, false);
      this._latitudeSetter(coordinates.lat);
      this._longitudeSetter(coordinates.long);
      this._timezoneSetter(coordinates.timezoneId);
      this._localeSetter(coordinates.locale);
    }

    this._applyLocation();
    if (value === NonPresetOptions.Custom) {
      this._latitudeInput.focus();
    }
  }

  _applyLocationUserInput() {
    const location = SDK.EmulationModel.Location.parseUserInput(
        this._latitudeInput.value.trim(), this._longitudeInput.value.trim(), this._timezoneInput.value.trim(),
        this._localeInput.value.trim());
    if (!location) {
      return;
    }

    this._timezoneError.textContent = '';

    this._setSelectElementLabel(this._locationSelectElement, NonPresetOptions.Custom);
    this._Location = location;
    this._applyLocation();
  }

  _applyLocation() {
    if (this._LocationOverrideEnabled) {
      this._LocationSetting.set(this._Location.toSetting());
    } else {
      this._LocationSetting.remove();
    }
    for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      emulationModel.emulateLocation(this._LocationOverrideEnabled ? this._Location : null).catch(err => {
        switch (err.type) {
          case 'emulation-set-timezone': {
            this._timezoneError.textContent = err.message;
            break;
          }
          case 'emulation-set-locale': {
            this._localeError.textContent = err.message;
            break;
          }
        }
      });
    }
  }

  _clearFieldsetElementInputs() {
    this._latitudeSetter(0);
    this._longitudeSetter(0);
    this._timezoneSetter('');
    this._localeSetter('');
  }

  _createDeviceOrientationSection() {
    const orientationGroup = this.contentElement.createChild('section', 'sensors-group');
    const orientationTitle = UI.UIUtils.createLabel(ls`Orientation`, 'sensors-group-title');
    orientationGroup.appendChild(orientationTitle);
    const orientationContent = orientationGroup.createChild('div', 'orientation-content');
    const fields = orientationContent.createChild('div', 'orientation-fields');

    const orientationOffOption = {title: Common.UIString.UIString('Off'), orientation: NonPresetOptions.NoOverride};
    const customOrientationOption = {
      title: Common.UIString.UIString('Custom orientation'),
      orientation: NonPresetOptions.Custom,
    };
    this._orientationSelectElement = this.contentElement.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(orientationTitle, this._orientationSelectElement);
    this._orientationSelectElement.appendChild(
        new Option(orientationOffOption.title, orientationOffOption.orientation));
    this._orientationSelectElement.appendChild(
        new Option(customOrientationOption.title, customOrientationOption.orientation));

    const orientationGroups = PresetOrientations;
    for (let i = 0; i < orientationGroups.length; ++i) {
      const groupElement = this._orientationSelectElement.createChild('optgroup');
      groupElement.label = orientationGroups[i].title;
      const group = orientationGroups[i].value;
      for (let j = 0; j < group.length; ++j) {
        groupElement.appendChild(new Option(group[j].title, group[j].orientation));
      }
    }
    this._orientationSelectElement.selectedIndex = 0;
    fields.appendChild(this._orientationSelectElement);
    this._orientationSelectElement.addEventListener('change', this._orientationSelectChanged.bind(this));

    this._deviceOrientationFieldset = this._createDeviceOrientationOverrideElement(this._deviceOrientation);

    this._stageElement = orientationContent.createChild('div', 'orientation-stage');
    this._orientationLayer = this._stageElement.createChild('div', 'orientation-layer');
    this._boxElement = this._orientationLayer.createChild('section', 'orientation-box orientation-element');

    this._boxElement.createChild('section', 'orientation-front orientation-element');
    this._boxElement.createChild('section', 'orientation-top orientation-element');
    this._boxElement.createChild('section', 'orientation-back orientation-element');
    this._boxElement.createChild('section', 'orientation-left orientation-element');
    this._boxElement.createChild('section', 'orientation-right orientation-element');
    this._boxElement.createChild('section', 'orientation-bottom orientation-element');

    UI.UIUtils.installDragHandle(this._stageElement, this._onBoxDragStart.bind(this), event => {
      this._onBoxDrag(event);
    }, null, '-webkit-grabbing', '-webkit-grab');

    fields.appendChild(this._deviceOrientationFieldset);
    this._enableOrientationFields(true);
    this._setBoxOrientation(this._deviceOrientation, false);
  }

  /**
   * @param {?boolean} disable
   */
  _enableOrientationFields(disable) {
    if (disable) {
      this._deviceOrientationFieldset.disabled = true;
      this._stageElement.classList.add('disabled');
      this._stageElement.title = ls`Enable orientation to rotate`;
    } else {
      this._deviceOrientationFieldset.disabled = false;
      this._stageElement.classList.remove('disabled');
      this._stageElement.title = ls`Shift+drag horizontally to rotate around the y-axis`;
    }
  }

  _orientationSelectChanged() {
    const value = this._orientationSelectElement.options[this._orientationSelectElement.selectedIndex].value;
    this._enableOrientationFields(false);

    if (value === NonPresetOptions.NoOverride) {
      this._deviceOrientationOverrideEnabled = false;
      this._enableOrientationFields(true);
    } else if (value === NonPresetOptions.Custom) {
      this._deviceOrientationOverrideEnabled = true;
      this._alphaElement.focus();
    } else {
      const parsedValue = JSON.parse(value);
      this._deviceOrientationOverrideEnabled = true;
      this._deviceOrientation =
          new SDK.EmulationModel.DeviceOrientation(parsedValue[0], parsedValue[1], parsedValue[2]);
      this._setDeviceOrientation(this._deviceOrientation, DeviceOrientationModificationSource.SelectPreset);
    }
  }

  _applyDeviceOrientation() {
    if (this._deviceOrientationOverrideEnabled) {
      this._deviceOrientationSetting.set(this._deviceOrientation.toSetting());
    }
    for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      emulationModel.emulateDeviceOrientation(this._deviceOrientationOverrideEnabled ? this._deviceOrientation : null);
    }
  }

  /**
   * @param {!Element} selectElement
   * @param {string} labelValue
   */
  _setSelectElementLabel(selectElement, labelValue) {
    const optionValues = Array.prototype.map.call(selectElement.options, x => x.value);
    selectElement.selectedIndex = optionValues.indexOf(labelValue);
  }

  _applyDeviceOrientationUserInput() {
    this._setDeviceOrientation(
        SDK.EmulationModel.DeviceOrientation.parseUserInput(
            this._alphaElement.value.trim(), this._betaElement.value.trim(), this._gammaElement.value.trim()),
        DeviceOrientationModificationSource.UserInput);
    this._setSelectElementLabel(this._orientationSelectElement, NonPresetOptions.Custom);
  }

  _resetDeviceOrientation() {
    this._setDeviceOrientation(
        new SDK.EmulationModel.DeviceOrientation(0, 90, 0), DeviceOrientationModificationSource.ResetButton);
    this._setSelectElementLabel(this._orientationSelectElement, '[0, 90, 0]');
  }

  /**
   * @param {?SDK.EmulationModel.DeviceOrientation} deviceOrientation
   * @param {!DeviceOrientationModificationSource} modificationSource
   */
  _setDeviceOrientation(deviceOrientation, modificationSource) {
    if (!deviceOrientation) {
      return;
    }

    /**
     * @param {number} angle
     * @return {number}
     */
    function roundAngle(angle) {
      return Math.round(angle * 10000) / 10000;
    }

    if (modificationSource !== DeviceOrientationModificationSource.UserInput) {
      this._alphaSetter(roundAngle(deviceOrientation.alpha));
      this._betaSetter(roundAngle(deviceOrientation.beta));
      this._gammaSetter(roundAngle(deviceOrientation.gamma));
    }

    const animate = modificationSource !== DeviceOrientationModificationSource.UserDrag;
    this._setBoxOrientation(deviceOrientation, animate);

    this._deviceOrientation = deviceOrientation;
    this._applyDeviceOrientation();

    UI.ARIAUtils.alert(
        ls`Device orientation set to alpha: ${deviceOrientation.alpha}, beta: ${deviceOrientation.beta}, gamma: ${
            deviceOrientation.gamma}`,
        this._orientationSelectElement);
  }

  /**
   * @param {!Element} parentElement
   * @param {!Element} input
   * @param {string} label
   * @return {function(string)}
   */
  _createAxisInput(parentElement, input, label) {
    const div = parentElement.createChild('div', 'orientation-axis-input-container');
    div.appendChild(input);
    div.appendChild(UI.UIUtils.createLabel(label, /* className */ '', input));
    input.type = 'number';
    return UI.UIUtils.bindInput(
        input, this._applyDeviceOrientationUserInput.bind(this), SDK.EmulationModel.DeviceOrientation.validator, true);
  }

  /**
   * @param {!SDK.EmulationModel.DeviceOrientation} deviceOrientation
   * @return {!Element}
   */
  _createDeviceOrientationOverrideElement(deviceOrientation) {
    const fieldsetElement = createElement('fieldset');
    fieldsetElement.classList.add('device-orientation-override-section');
    const cellElement = fieldsetElement.createChild('td', 'orientation-inputs-cell');

    this._alphaElement = UI.UIUtils.createInput();
    this._alphaElement.setAttribute('step', 'any');
    this._alphaSetter =
        this._createAxisInput(cellElement, this._alphaElement, Common.UIString.UIString('\u03B1 (alpha)'));
    this._alphaSetter(String(deviceOrientation.alpha));

    this._betaElement = UI.UIUtils.createInput();
    this._betaElement.setAttribute('step', 'any');
    this._betaSetter = this._createAxisInput(cellElement, this._betaElement, Common.UIString.UIString('\u03B2 (beta)'));
    this._betaSetter(String(deviceOrientation.beta));

    this._gammaElement = UI.UIUtils.createInput();
    this._gammaElement.setAttribute('step', 'any');
    this._gammaSetter =
        this._createAxisInput(cellElement, this._gammaElement, Common.UIString.UIString('\u03B3 (gamma)'));
    this._gammaSetter(String(deviceOrientation.gamma));

    const resetButton = UI.UIUtils.createTextButton(
        Common.UIString.UIString('Reset'), this._resetDeviceOrientation.bind(this), 'orientation-reset-button');
    UI.ARIAUtils.setAccessibleName(resetButton, ls`Reset device orientation`);
    resetButton.setAttribute('type', 'reset');
    cellElement.appendChild(resetButton);
    return fieldsetElement;
  }

  /**
   * @param {!SDK.EmulationModel.DeviceOrientation} deviceOrientation
   * @param {boolean} animate
   */
  _setBoxOrientation(deviceOrientation, animate) {
    if (animate) {
      this._stageElement.classList.add('is-animating');
    } else {
      this._stageElement.classList.remove('is-animating');
    }

    // The CSS transform should not depend on matrix3d, which does not interpolate well.
    const matrix = new WebKitCSSMatrix();
    this._boxMatrix = matrix.rotate(-deviceOrientation.beta, deviceOrientation.gamma, -deviceOrientation.alpha);
    const eulerAngles =
        new UI.Geometry.EulerAngles(deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
    this._orientationLayer.style.transform = eulerAngles.toRotate3DString();
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _onBoxDrag(event) {
    const mouseMoveVector = this._calculateRadiusVector(event.x, event.y);
    if (!mouseMoveVector) {
      return true;
    }

    event.consume(true);
    let axis, angle;
    if (event.shiftKey) {
      axis = new UI.Geometry.Vector(0, 0, -1);
      angle = (this._mouseDownVector.x - mouseMoveVector.x) * ShiftDragOrientationSpeed;
    } else {
      axis = UI.Geometry.crossProduct(this._mouseDownVector, mouseMoveVector);
      angle = UI.Geometry.calculateAngle(this._mouseDownVector, mouseMoveVector);
    }

    // The mouse movement vectors occur in the screen space, which is offset by 90 degrees from
    // the actual device orientation.
    let currentMatrix = new WebKitCSSMatrix();
    currentMatrix = currentMatrix.rotate(-90, 0, 0)
                        .rotateAxisAngle(axis.x, axis.y, axis.z, angle)
                        .rotate(90, 0, 0)
                        .multiply(this._originalBoxMatrix);

    const eulerAngles = UI.Geometry.EulerAngles.fromRotationMatrix(currentMatrix);
    const newOrientation =
        new SDK.EmulationModel.DeviceOrientation(-eulerAngles.alpha, -eulerAngles.beta, eulerAngles.gamma);
    this._setDeviceOrientation(newOrientation, DeviceOrientationModificationSource.UserDrag);
    this._setSelectElementLabel(this._orientationSelectElement, NonPresetOptions.Custom);
    return false;
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _onBoxDragStart(event) {
    if (!this._deviceOrientationOverrideEnabled) {
      return false;
    }

    this._mouseDownVector = this._calculateRadiusVector(event.x, event.y);
    this._originalBoxMatrix = this._boxMatrix;

    if (!this._mouseDownVector) {
      return false;
    }

    event.consume(true);
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?UI.Geometry.Vector}
   */
  _calculateRadiusVector(x, y) {
    const rect = this._stageElement.getBoundingClientRect();
    const radius = Math.max(rect.width, rect.height) / 2;
    const sphereX = (x - rect.left - rect.width / 2) / radius;
    const sphereY = (y - rect.top - rect.height / 2) / radius;
    const sqrSum = sphereX * sphereX + sphereY * sphereY;
    if (sqrSum > 0.5) {
      return new UI.Geometry.Vector(sphereX, sphereY, 0.5 / Math.sqrt(sqrSum));
    }

    return new UI.Geometry.Vector(sphereX, sphereY, Math.sqrt(1 - sqrSum));
  }

  _appendTouchControl() {
    const groupElement = this.contentElement.createChild('div', 'sensors-group');
    const title = UI.UIUtils.createLabel(ls`Touch`, 'sensors-group-title');
    groupElement.appendChild(title);
    const fieldsElement = groupElement.createChild('div', 'sensors-group-fields');

    const select = fieldsElement.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(title, select);
    select.appendChild(new Option(Common.UIString.UIString('Device-based'), 'auto'));
    select.appendChild(new Option(Common.UIString.UIString('Force enabled'), 'enabled'));
    select.addEventListener('change', applyTouch, false);

    const reloadWarning = groupElement.createChild('div', 'reload-warning hidden');
    reloadWarning.textContent = Common.UIString.UIString('*Requires reload');
    UI.ARIAUtils.markAsAlert(reloadWarning);

    function applyTouch() {
      for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
        emulationModel.overrideEmulateTouch(select.value === 'enabled');
      }
      reloadWarning.classList.remove('hidden');
      const resourceTreeModel =
          SDK.SDKModel.TargetManager.instance().models(SDK.ResourceTreeModel.ResourceTreeModel)[0];
      if (resourceTreeModel) {
        resourceTreeModel.once(SDK.ResourceTreeModel.Events.MainFrameNavigated)
            .then(() => reloadWarning.classList.add('hidden'));
      }
    }
  }
}

/** @enum {string} */
export const DeviceOrientationModificationSource = {
  UserInput: 'userInput',
  UserDrag: 'userDrag',
  ResetButton: 'resetButton',
  SelectPreset: 'selectPreset'
};

/** {string} */
export const NonPresetOptions = {
  NoOverride: 'noOverride',
  Custom: 'custom',
  Unavailable: 'unavailable'
};

/** @type {!Array.<{title: string, value: !Array.<{title: string, orientation: string}>}>} */
export const PresetOrientations = [{
  title: ls`Presets`,
  value: [
    {title: Common.UIString.UIString('Portrait'), orientation: '[0, 90, 0]'},
    {title: Common.UIString.UIString('Portrait upside down'), orientation: '[180, -90, 0]'},
    {title: Common.UIString.UIString('Landscape left'), orientation: '[0, 90, -90]'},
    {title: Common.UIString.UIString('Landscape right'), orientation: '[0, 90, 90]'},
    {title: Common.UIString.UIString('Display up'), orientation: '[0, 0, 0]'},
    {title: Common.UIString.UIString('Display down'), orientation: '[0, 180, 0]'}
  ]
}];

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ShowActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    UI.ViewManager.ViewManager.instance().showView('sensors');
    return true;
  }
}

export const ShiftDragOrientationSpeed = 16;
