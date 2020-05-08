// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Color from '../../../../front_end/common/Color.js';

describe('Color', () => {
  it('can be instantiated without issues', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    assert.deepEqual(color.rgba(), [0.5, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), 'testFormat', 'format was not set correctly');
  });

  it('defaults RGBA value to 0 if the RGBA initializing value given was negative', () => {
    const color = new Color.Color([-0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    assert.deepEqual(color.rgba(), [0, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), 'testFormat', 'format was not set correctly');
  });

  it('defaults RGBA value to 1 if the RGBA initializing value given was above one', () => {
    const color = new Color.Color([1.1, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    assert.deepEqual(color.rgba(), [1, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), 'testFormat', 'format was not set correctly');
  });

  it('is able to create a color class from an HSVA value', () => {
    const color = Color.Color.fromHSVA([0.5, 0.5, 0.5, 100]);
    assert.deepEqual(color.rgba(), [0.25, 0.49999999999999994, 0.5, 1], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'hsl(180deg 33% 38%)', 'original text was not set correctly');
    assert.strictEqual(color.format(), 'hsla', 'format was not set correctly');
  });

  it('is able to return the HSVA value of a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const hsva = color.hsva();
    assert.deepEqual(hsva, [0, 0, 0.5, 0.5], 'HSVA was not calculated correctly');
  });

  it('is able to return the luminance of an RGBA value with the RGB values more than 0.03928', () => {
    const lum = Color.Color.luminance([0.5, 0.5, 0.5, 0.5]);
    assert.strictEqual(lum, 0.21404114048223255, 'luminance was not calculated correctly');
  });

  it('is able to return the luminance of an RGBA value with the RGB values less than 0.03928', () => {
    const lum = Color.Color.luminance([0.03927, 0.03927, 0.03927, 0.5]);
    assert.strictEqual(lum, 0.003039473684210526, 'luminance was not calculated correctly');
  });

  it('is able to return a lighter luminance according to a given contrast value', () => {
    const result = Color.Color.desiredLuminance(0.2, 2, true);
    assert.strictEqual(result, 0.45, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance according to a given contrast value', () => {
    const result = Color.Color.desiredLuminance(0.2, 2, false);
    assert.strictEqual(result, 0.075, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance if the lighter one falls out of the inclusive range [0, 1]', () => {
    const result = Color.Color.desiredLuminance(0.2, 5, true);
    assert.strictEqual(result, 0, 'luminance was not calculated correctly');
  });

  it('is able to return canonical HSLA for a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const result = color.canonicalHSLA();
    assert.deepEqual(result, [0, 0, 50, 0.5], 'canonical HSLA was not calculated correctly');
  });

  it('is able to calculate the contrast ratio between two colors', () => {
    const firstColor = [1, 0, 0, 1];
    const secondColor = [0, 0, 1, 1];
    const contrastRatio = Color.Color.calculateContrastRatio(firstColor, secondColor);
    assert.strictEqual(contrastRatio, 2.148936170212766, 'contrast ratio was not calculated correctly');
  });

  it('is able to blend two colors according to alpha blending', () => {
    const firstColor = [1, 0, 0, 1];
    const secondColor = [0, 0, 1, 1];
    const result: number[] = [];
    Color.Color.blendColors(firstColor, secondColor, result);
    assert.deepEqual(result, [1, 0, 0, 1], 'colors were not blended successfully');
  });

  it('parses hex values', () => {
    assert.deepEqual(Color.Color.parse('#FF00FF')!.rgba(), [1, 0, 1, 1]);
    assert.deepEqual(Color.Color.parse('#F0F')!.rgba(), [1, 0, 1, 1]);
    assert.deepEqual(Color.Color.parse('#F0F0')!.rgba(), [1, 0, 1, 0]);
    assert.deepEqual(Color.Color.parse('#FF00FF00')!.rgba(), [1, 0, 1, 0]);
  });

  it('parses nickname values', () => {
    assert.deepEqual(Color.Color.parse('red')!.rgba(), [1, 0, 0, 1]);
  });

  it('parses rgb(a) values', () => {
    const colorOne = Color.Color.parse('rgb(255, 255, 0)')!;
    assert.deepEqual(colorOne.rgba(), [1, 1, 0, 1]);

    const colorTwo = Color.Color.parse('rgba(0, 255, 255, 0.5)')!;
    assert.deepEqual(colorTwo.rgba(), [0, 1, 1, 0.5]);

    const colorThree = Color.Color.parse('rgb(255 255 255)')!;
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 1]);

    const colorFour = Color.Color.parse('rgb(10% 10% 10%)')!;
    assert.deepEqual(colorFour.rgba(), [0.1, 0.1, 0.1, 1]);

    const colorFive = Color.Color.parse('rgb(10% 10% 10% / 0.4)')!;
    assert.deepEqual(colorFive.rgba(), [0.1, 0.1, 0.1, 0.4]);

    const colorSix = Color.Color.parse('rgb(10% 10% 10% / 40%)')!;
    assert.deepEqual(colorSix.rgba(), [0.1, 0.1, 0.1, 0.4]);
  });

  it('parses hsl(a) values', () => {
    const colorOne = Color.Color.parse('hsl(0, 100%, 50%)')!;
    assert.deepEqual(colorOne.rgba(), [1, 0, 0, 1]);

    const colorTwo = Color.Color.parse('hsla(0, 100%, 50%, 0.5)')!;
    assert.deepEqual(colorTwo.rgba(), [1, 0, 0, 0.5]);

    const colorThree = Color.Color.parse('hsla(50deg 100% 100% / 50%)')!;
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 0.5]);

    const colorFour = Color.Color.parse('hsl(0 100% 50% / 0.5)')!;
    assert.deepEqual(colorFour.rgba(), [1, 0, 0, 0.5]);

    const colorFive = Color.Color.parse('hsl(0 100% 50% / 50%)')!;
    assert.deepEqual(colorFive.rgba(), [1, 0, 0, 0.5]);

    const colorSix = Color.Color.parse('hsl(0deg 100% 50% / 50%)')!;
    assert.deepEqual(colorSix.rgba(), [1, 0, 0, 0.5]);
  });

  it('handles invalid values', () => {
    assert.isNull(Color.Color.parse('#FAFAFA       Trailing'));
    assert.isNull(Color.Color.parse('#FAFAFG'));
    assert.isNull(Color.Color.parse('gooseberry'));
    assert.isNull(Color.Color.parse('rgb(10% 10% 10% /)'));
    assert.isNull(Color.Color.parse('rgb(10% 10% 10% 0.4 40)'));
    assert.isNull(Color.Color.parse('hsl(0, carrot, 30%)'));
    assert.isNull(Color.Color.parse('hsl(0)'));
    assert.isNull(Color.Color.parse('rgb(255)'));
    assert.isNull(Color.Color.parse('rgba(1 golf 30)'));
  });

  it('is able to return whether or not the color has an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    assert.isTrue(color.hasAlpha(), 'the color should be considered to have an alpha value');
  });

  it('is able to detect the HEX format of a color with an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hexa', 'format was not detected correctly');
  });

  it('is able to detect the HEX format of a color without an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 1], 'testFormat', 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hex', 'format was not detected correctly');
  });

  it('is able to return the canonical RGBA of a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const result = color.canonicalRGBA();
    assert.deepEqual(result, [128, 128, 128, 0.5], 'canonical RGBA was not returned correctly');
  });

  it('is able to return the nickname of a color', () => {
    const color = new Color.Color([1, 0, 0, 1], 'testFormat', 'testColor');
    const result = color.nickname();
    assert.strictEqual(result, 'red', 'nickname was not returned correctly');
  });

  it('returns null as a nickname if the color was not recognized', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const result = color.nickname();
    assert.isNull(result, 'nickname should be returned as Null');
  });

  it('is able to convert the color to a protocol RGBA', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], 'testFormat', 'testColor');
    const result = color.toProtocolRGBA();
    assert.deepEqual(result, {r: 128, g: 128, b: 128, a: 0.5}, 'conversion to protocol RGBA was not correct');
  });

  it('is able to invert a color', () => {
    const color = new Color.Color([1, 0, 0, 1], 'testFormat', 'testColor');
    const result = color.invert().rgba();
    assert.deepEqual(result, [0, 1, 1, 1], 'inversion was not successful');
  });

  it('is able to set the alpha value of a color', () => {
    const color = new Color.Color([1, 0, 0, 1], 'testFormat', 'testColor');
    const result = color.setAlpha(0.5).rgba();
    assert.deepEqual(result, [1, 0, 0, 0.5], 'alpha value was not set correctly');
  });

  it('can blend with another color', () => {
    const color = new Color.Color([1, 0, 0, 0.5], 'testFormat', 'testColor');
    const otherColor = new Color.Color([0, 0, 1, 0.5], 'testFormat', 'testColor');
    const result = color.blendWith(otherColor).rgba();
    assert.deepEqual(result, [0.5, 0, 0.5, 0.75], 'color was not blended correctly');
  });

  it('returns the original text when turned into a string if its format was "original"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'original', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'testColor', 'color was not converted to a string correctly');
  });

  it('returns the nickname when turned into a string if its format was "nickname"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'nickname', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('returns the HEX value when turned into a string if its format was "hex"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'hex', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#ff0000', 'color was not converted to a string correctly');
  });

  it('returns the short HEX value when turned into a string if its format was "shorthex"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'shorthex', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#f00', 'color was not converted to a string correctly');
  });

  it('returns the HEXA value when turned into a string if its format was "hexa"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'hexa', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#ff0000ff', 'color was not converted to a string correctly');
  });

  it('returns the short HEXA value when turned into a string if its format was "shorthexa"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'shorthexa', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#f00f', 'color was not converted to a string correctly');
  });

  it('returns the RGB value when turned into a string if its format was "rgb"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'rgb', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the RGBA value when turned into a string if its format was "rgba"', () => {
    const color = new Color.Color([1, 0, 0, 0.42], 'rgba', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0 / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "rgba"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'rgba', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the HSL value when turned into a string if its format was "hsl"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'hsl', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('returns the HSLA value when turned into a string if its format was "hsla"', () => {
    const color = new Color.Color([1, 0, 0, 0.42], 'hsla', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50% / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "hsla"', () => {
    const color = new Color.Color([1, 0, 0, 1], 'hsla', 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('is able to return a color in a different format than the one the color was originally set with', () => {
    const color = new Color.Color([1, 0, 0, 1], 'rgb', 'testColor');
    const result = color.asString('nickname');
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('is able to change color format', () => {
    const color = new Color.Color([1, 0, 0, 1], 'rgb');
    color.setFormat('hsl');
    assert.strictEqual(color.asString(), 'hsl(0deg 100% 50%)', 'format was not set correctly');
  });
});

describe('Generator', () => {
  it('able to return the color for an ID if the ID was already set', () => {
    const generator = new Color.Generator();
    generator.setColorForID('r', 'Red');
    assert.strictEqual(generator.colorForID('r'), 'Red', 'color was not retrieved correctly');
  });

  it('able to return the color for an ID that was not set', () => {
    const generator = new Color.Generator();
    assert.strictEqual(generator.colorForID('r'), 'hsl(133deg 67% 80%)', 'color was not generated correctly');
  });
});
