/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* the long term goal here is to remove all functions in this file and
 * replace them with ES Module functions rather than prototype
 * extensions but in the mean time if an old func in here depends on one
 * that has been migrated it will need to be imported
 */
import * as StringUtilities from './string-utilities.js';

/**
 * @param {number} m
 * @param {number} n
 * @return {number}
 */
self.mod = function(m, n) {
  return ((m % n) + n) % n;
};

/**
 * @param {string} string
 * @return {!Array.<number>}
 */
String.prototype.findAll = function(string) {
  const matches = [];
  let i = this.indexOf(string);
  while (i !== -1) {
    matches.push(i);
    i = this.indexOf(string, i + string.length);
  }
  return matches;
};

/**
 * @return {string}
 */
String.prototype.reverse = function() {
  return this.split('').reverse().join('');
};

/**
 * @return {string}
 */
String.prototype.replaceControlCharacters = function() {
  // Replace C0 and C1 control character sets with printable character.
  // Do not replace '\t', \n' and '\r'.
  return this.replace(/[\0-\x08\x0B\f\x0E-\x1F\x80-\x9F]/g, '\uFFFD');
};

/**
 * @return {boolean}
 */
String.prototype.isWhitespace = function() {
  return /^\s*$/.test(this);
};

/**
 * @return {!Array.<number>}
 */
String.prototype.computeLineEndings = function() {
  const endings = this.findAll('\n');
  endings.push(this.length);
  return endings;
};

/**
 * @param {string} chars
 * @return {string}
 */
/**
 * @return {string}
 */
String.regexSpecialCharacters = function() {
  return '^[]{}()\\.^$*+?|-,';
};

/**
 * @this {string}
 * @return {string}
 */
String.prototype.escapeForRegExp = function() {
  return StringUtilities.escapeCharacters(this, String.regexSpecialCharacters());
};

/**
 * @param {string} query
 * @return {!RegExp}
 */
String.filterRegex = function(query) {
  const toEscape = String.regexSpecialCharacters();
  let regexString = '';
  for (let i = 0; i < query.length; ++i) {
    let c = query.charAt(i);
    if (toEscape.indexOf(c) !== -1) {
      c = '\\' + c;
    }
    if (i) {
      regexString += '[^\\0' + c + ']*';
    }
    regexString += c;
  }
  return new RegExp(regexString, 'i');
};

/**
 * @return {string}
 */
String.prototype.collapseWhitespace = function() {
  return this.replace(/[\s\xA0]+/g, ' ');
};

/**
 * @param {number} maxLength
 * @return {string}
 */
String.prototype.trimMiddle = function(maxLength) {
  if (this.length <= maxLength) {
    return String(this);
  }
  let leftHalf = maxLength >> 1;
  let rightHalf = maxLength - leftHalf - 1;
  if (this.codePointAt(this.length - rightHalf - 1) >= 0x10000) {
    --rightHalf;
    ++leftHalf;
  }
  if (leftHalf > 0 && this.codePointAt(leftHalf - 1) >= 0x10000) {
    --leftHalf;
  }
  return this.substr(0, leftHalf) + '\u2026' + this.substr(this.length - rightHalf, rightHalf);
};

/**
 * @param {number} maxLength
 * @return {string}
 */
String.prototype.trimEndWithMaxLength = function(maxLength) {
  if (this.length <= maxLength) {
    return String(this);
  }
  return this.substr(0, maxLength - 1) + '\u2026';
};

/**
 * @param {?string=} baseURLDomain
 * @return {string}
 */
String.prototype.trimURL = function(baseURLDomain) {
  let result = this.replace(/^(https|http|file):\/\//i, '');
  if (baseURLDomain) {
    if (result.toLowerCase().startsWith(baseURLDomain.toLowerCase())) {
      result = result.substr(baseURLDomain.length);
    }
  }
  return result;
};

/**
 * @return {string}
 */
String.prototype.toTitleCase = function() {
  return this.substring(0, 1).toUpperCase() + this.substring(1);
};

/**
 * @param {string} other
 * @return {number}
 */
String.prototype.compareTo = function(other) {
  if (this > other) {
    return 1;
  }
  if (this < other) {
    return -1;
  }
  return 0;
};

/**
 * @return {string}
 */
String.prototype.removeURLFragment = function() {
  let fragmentIndex = this.indexOf('#');
  if (fragmentIndex === -1) {
    fragmentIndex = this.length;
  }
  return this.substring(0, fragmentIndex);
};

/**
 * @param {string|undefined} string
 * @return {number}
 */
String.hashCode = function(string) {
  if (!string) {
    return 0;
  }
  // Hash algorithm for substrings is described in "Über die Komplexität der Multiplikation in
  // eingeschränkten Branchingprogrammmodellen" by Woelfe.
  // http://opendatastructures.org/versions/edition-0.1d/ods-java/node33.html#SECTION00832000000000000000
  const p = ((1 << 30) * 4 - 5);  // prime: 2^32 - 5
  const z = 0x5033d967;           // 32 bits from random.org
  const z2 = 0x59d2f15d;          // random odd 32 bit number
  let s = 0;
  let zi = 1;
  for (let i = 0; i < string.length; i++) {
    const xi = string.charCodeAt(i) * z2;
    s = (s + zi * xi) % p;
    zi = (zi * z) % p;
  }
  s = (s + zi * (p - 1)) % p;
  return Math.abs(s | 0);
};

/**
 * @param {string} string
 * @param {number} index
 * @return {boolean}
 */
String.isDigitAt = function(string, index) {
  const c = string.charCodeAt(index);
  return (48 <= c && c <= 57);
};

/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
String.naturalOrderComparator = function(a, b) {
  const chunk = /^\d+|^\D+/;
  let chunka, chunkb, anum, bnum;
  while (1) {
    if (a) {
      if (!b) {
        return 1;
      }
    } else {
      if (b) {
        return -1;
      } else {
        return 0;
      }
    }
    chunka = a.match(chunk)[0];
    chunkb = b.match(chunk)[0];
    anum = !isNaN(chunka);
    bnum = !isNaN(chunkb);
    if (anum && !bnum) {
      return -1;
    }
    if (bnum && !anum) {
      return 1;
    }
    if (anum && bnum) {
      const diff = chunka - chunkb;
      if (diff) {
        return diff;
      }
      if (chunka.length !== chunkb.length) {
        if (!+chunka && !+chunkb)  // chunks are strings of all 0s (special case)
        {
          return chunka.length - chunkb.length;
        } else {
          return chunkb.length - chunka.length;
        }
      }
    } else if (chunka !== chunkb) {
      return (chunka < chunkb) ? -1 : 1;
    }
    a = a.substring(chunka.length);
    b = b.substring(chunkb.length);
  }
};

/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
String.caseInsensetiveComparator = function(a, b) {
  a = a.toUpperCase();
  b = b.toUpperCase();
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
};

/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
Number.constrain = function(num, min, max) {
  if (num < min) {
    num = min;
  } else if (num > max) {
    num = max;
  }
  return num;
};

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
Number.gcd = function(a, b) {
  if (b === 0) {
    return a;
  } else {
    return Number.gcd(b, a % b);
  }
};

/**
 * @param {string} value
 * @return {string}
 */
Number.toFixedIfFloating = function(value) {
  if (!value || isNaN(value)) {
    return value;
  }
  const number = Number(value);
  return number % 1 ? number.toFixed(3) : String(number);
};

/**
 * @return {boolean}
 */
Date.prototype.isValid = function() {
  return !isNaN(this.getTime());
};

/**
 * @return {string}
 */
Date.prototype.toISO8601Compact = function() {
  /**
   * @param {number} x
   * @return {string}
   */
  function leadZero(x) {
    return (x > 9 ? '' : '0') + x;
  }
  return this.getFullYear() + leadZero(this.getMonth() + 1) + leadZero(this.getDate()) + 'T' +
      leadZero(this.getHours()) + leadZero(this.getMinutes()) + leadZero(this.getSeconds());
};

Object.defineProperty(Array.prototype, 'remove', {
  /**
   * @param {!T} value
   * @param {boolean=} firstOnly
   * @return {boolean}
   * @this {Array.<!T>}
   * @template T
   */
  value: function(value, firstOnly) {
    let index = this.indexOf(value);
    if (index === -1) {
      return false;
    }
    if (firstOnly) {
      this.splice(index, 1);
      return true;
    }
    for (let i = index + 1, n = this.length; i < n; ++i) {
      if (this[i] !== value) {
        this[index++] = this[i];
      }
    }
    this.length = index;
    return true;
  },
  configurable: true
});

(function() {
const partition = {
  /**
     * @this {Array.<number>}
     * @param {function(number, number): number} comparator
     * @param {number} left
     * @param {number} right
     * @param {number} pivotIndex
     */
  value: function(comparator, left, right, pivotIndex) {
    function swap(array, i1, i2) {
      const temp = array[i1];
      array[i1] = array[i2];
      array[i2] = temp;
    }

    const pivotValue = this[pivotIndex];
    swap(this, right, pivotIndex);
    let storeIndex = left;
    for (let i = left; i < right; ++i) {
      if (comparator(this[i], pivotValue) < 0) {
        swap(this, storeIndex, i);
        ++storeIndex;
      }
    }
    swap(this, right, storeIndex);
    return storeIndex;
  },
  configurable: true
};
Object.defineProperty(Array.prototype, 'partition', partition);
Object.defineProperty(Uint32Array.prototype, 'partition', partition);

const sortRange = {
  /**
     * @param {function(number, number): number} comparator
     * @param {number} leftBound
     * @param {number} rightBound
     * @param {number} sortWindowLeft
     * @param {number} sortWindowRight
     * @return {!Array.<number>}
     * @this {Array.<number>}
     */
  value: function(comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight) {
    function quickSortRange(array, comparator, left, right, sortWindowLeft, sortWindowRight) {
      if (right <= left) {
        return;
      }
      const pivotIndex = Math.floor(Math.random() * (right - left)) + left;
      const pivotNewIndex = array.partition(comparator, left, right, pivotIndex);
      if (sortWindowLeft < pivotNewIndex) {
        quickSortRange(array, comparator, left, pivotNewIndex - 1, sortWindowLeft, sortWindowRight);
      }
      if (pivotNewIndex < sortWindowRight) {
        quickSortRange(array, comparator, pivotNewIndex + 1, right, sortWindowLeft, sortWindowRight);
      }
    }
    if (leftBound === 0 && rightBound === (this.length - 1) && sortWindowLeft === 0 && sortWindowRight >= rightBound) {
      this.sort(comparator);
    } else {
      quickSortRange(this, comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight);
    }
    return this;
  },
  configurable: true
};
Object.defineProperty(Array.prototype, 'sortRange', sortRange);
Object.defineProperty(Uint32Array.prototype, 'sortRange', sortRange);
})();

Object.defineProperty(Array.prototype, 'lowerBound', {
  /**
   * Return index of the leftmost element that is equal or greater
   * than the specimen object. If there's no such element (i.e. all
   * elements are smaller than the specimen) returns right bound.
   * The function works for sorted array.
   * When specified, |left| (inclusive) and |right| (exclusive) indices
   * define the search window.
   *
   * @param {!T} object
   * @param {function(!T,!S):number=} comparator
   * @param {number=} left
   * @param {number=} right
   * @return {number}
   * @this {Array.<!S>}
   * @template T,S
   */
  value: function(object, comparator, left, right) {
    function defaultComparator(a, b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    }
    comparator = comparator || defaultComparator;
    let l = left || 0;
    let r = right !== undefined ? right : this.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (comparator(object, this[m]) > 0) {
        l = m + 1;
      } else {
        r = m;
      }
    }
    return r;
  },
  configurable: true
});

Object.defineProperty(Array.prototype, 'upperBound', {
  /**
   * Return index of the leftmost element that is greater
   * than the specimen object. If there's no such element (i.e. all
   * elements are smaller or equal to the specimen) returns right bound.
   * The function works for sorted array.
   * When specified, |left| (inclusive) and |right| (exclusive) indices
   * define the search window.
   *
   * @param {!T} object
   * @param {function(!T,!S):number=} comparator
   * @param {number=} left
   * @param {number=} right
   * @return {number}
   * @this {Array.<!S>}
   * @template T,S
   */
  value: function(object, comparator, left, right) {
    function defaultComparator(a, b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    }
    comparator = comparator || defaultComparator;
    let l = left || 0;
    let r = right !== undefined ? right : this.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (comparator(object, this[m]) >= 0) {
        l = m + 1;
      } else {
        r = m;
      }
    }
    return r;
  },
  configurable: true
});

Object.defineProperty(Uint32Array.prototype, 'lowerBound', {value: Array.prototype.lowerBound, configurable: true});

Object.defineProperty(Uint32Array.prototype, 'upperBound', {value: Array.prototype.upperBound, configurable: true});

Object.defineProperty(Int32Array.prototype, 'lowerBound', {value: Array.prototype.lowerBound, configurable: true});

Object.defineProperty(Int32Array.prototype, 'upperBound', {value: Array.prototype.upperBound, configurable: true});

Object.defineProperty(Float64Array.prototype, 'lowerBound', {value: Array.prototype.lowerBound, configurable: true});

Object.defineProperty(Array.prototype, 'binaryIndexOf', {
  /**
   * @param {!T} value
   * @param {function(!T,!S):number} comparator
   * @return {number}
   * @this {Array.<!S>}
   * @template T,S
   */
  value: function(value, comparator) {
    const index = this.lowerBound(value, comparator);
    return index < this.length && comparator(value, this[index]) === 0 ? index : -1;
  },
  configurable: true
});

Object.defineProperty(Array.prototype, 'select', {
  /**
   * @param {string} field
   * @return {!Array.<!T>}
   * @this {Array.<!Object.<string,!T>>}
   * @template T
   */
  value: function(field) {
    const result = new Array(this.length);
    for (let i = 0; i < this.length; ++i) {
      result[i] = this[i][field];
    }
    return result;
  },
  configurable: true
});

Object.defineProperty(Array.prototype, 'peekLast', {
  /**
   * @return {!T|undefined}
   * @this {Array.<!T>}
   * @template T
   */
  value: function() {
    return this[this.length - 1];
  },
  configurable: true
});

(function() {
  /**
   * @param {!Array.<T>} array1
   * @param {!Array.<T>} array2
   * @param {function(T,T):number} comparator
   * @param {boolean} mergeNotIntersect
   * @return {!Array.<T>}
   * @template T
   */
  function mergeOrIntersect(array1, array2, comparator, mergeNotIntersect) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < array1.length && j < array2.length) {
      const compareValue = comparator(array1[i], array2[j]);
      if (mergeNotIntersect || !compareValue) {
        result.push(compareValue <= 0 ? array1[i] : array2[j]);
      }
      if (compareValue <= 0) {
        i++;
      }
      if (compareValue >= 0) {
        j++;
      }
    }
    if (mergeNotIntersect) {
      while (i < array1.length) {
        result.push(array1[i++]);
      }
      while (j < array2.length) {
        result.push(array2[j++]);
      }
    }
    return result;
  }

  Object.defineProperty(Array.prototype, 'intersectOrdered', {
    /**
     * @param {!Array.<T>} array
     * @param {function(T,T):number} comparator
     * @return {!Array.<T>}
     * @this {!Array.<T>}
     * @template T
     */
    value: function(array, comparator) {
      return mergeOrIntersect(this, array, comparator, false);
    },
    configurable: true
  });

  Object.defineProperty(Array.prototype, 'mergeOrdered', {
    /**
     * @param {!Array.<T>} array
     * @param {function(T,T):number} comparator
     * @return {!Array.<T>}
     * @this {!Array.<T>}
     * @template T
     */
    value: function(array, comparator) {
      return mergeOrIntersect(this, array, comparator, true);
    },
    configurable: true
  });
})();

/**
 * @param {string} format
 * @param {...*} var_arg
 * @return {string}
 */
String.sprintf = function(format, var_arg) {
  return String.vsprintf(format, Array.prototype.slice.call(arguments, 1));
};

/**
 * @param {string} format
 * @param {!Object.<string, function(string, ...):*>} formatters
 * @return {!Array.<!Object>}
 */
String.tokenizeFormatString = function(format, formatters) {
  const tokens = [];

  function addStringToken(str) {
    if (!str) {
      return;
    }
    if (tokens.length && tokens[tokens.length - 1].type === 'string') {
      tokens[tokens.length - 1].value += str;
    } else {
      tokens.push({type: 'string', value: str});
    }
  }

  function addSpecifierToken(specifier, precision, substitutionIndex) {
    tokens.push({type: 'specifier', specifier: specifier, precision: precision, substitutionIndex: substitutionIndex});
  }

  function addAnsiColor(code) {
    const types = {3: 'color', 9: 'colorLight', 4: 'bgColor', 10: 'bgColorLight'};
    const colorCodes = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'lightGray', '', 'default'];
    const colorCodesLight =
        ['darkGray', 'lightRed', 'lightGreen', 'lightYellow', 'lightBlue', 'lightMagenta', 'lightCyan', 'white', ''];
    const colors = {color: colorCodes, colorLight: colorCodesLight, bgColor: colorCodes, bgColorLight: colorCodesLight};
    const type = types[Math.floor(code / 10)];
    if (!type) {
      return;
    }
    const color = colors[type][code % 10];
    if (!color) {
      return;
    }
    tokens.push({
      type: 'specifier',
      specifier: 'c',
      value: {description: (type.startsWith('bg') ? 'background : ' : 'color: ') + color}
    });
  }

  let textStart = 0;
  let substitutionIndex = 0;
  const re =
      new RegExp(`%%|%(?:(\\d+)\\$)?(?:\\.(\\d*))?([${Object.keys(formatters).join('')}])|\\u001b\\[(\\d+)m`, 'g');
  for (let match = re.exec(format); !!match; match = re.exec(format)) {
    const matchStart = match.index;
    if (matchStart > textStart) {
      addStringToken(format.substring(textStart, matchStart));
    }

    if (match[0] === '%%') {
      addStringToken('%');
    } else if (match[0].startsWith('%')) {
      // eslint-disable-next-line no-unused-vars
      const [_, substitionString, precisionString, specifierString] = match;
      if (substitionString && Number(substitionString) > 0) {
        substitutionIndex = Number(substitionString) - 1;
      }
      const precision = precisionString ? Number(precisionString) : -1;
      addSpecifierToken(specifierString, precision, substitutionIndex);
      ++substitutionIndex;
    } else {
      const code = Number(match[4]);
      addAnsiColor(code);
    }
    textStart = matchStart + match[0].length;
  }
  addStringToken(format.substring(textStart));
  return tokens;
};

String.standardFormatters = {
  /**
   * @return {number}
   */
  d: function(substitution) {
    return !isNaN(substitution) ? substitution : 0;
  },

  /**
   * @return {number}
   */
  f: function(substitution, token) {
    if (substitution && token.precision > -1) {
      substitution = substitution.toFixed(token.precision);
    }
    return !isNaN(substitution) ? substitution : (token.precision > -1 ? Number(0).toFixed(token.precision) : 0);
  },

  /**
   * @return {string}
   */
  s: function(substitution) {
    return substitution;
  }
};

/**
 * @param {string} format
 * @param {!Array.<*>} substitutions
 * @return {string}
 */
String.vsprintf = function(format, substitutions) {
  return String
      .format(
          format, substitutions, String.standardFormatters, '',
          function(a, b) {
            return a + b;
          })
      .formattedResult;
};

/**
 * @param {string} format
 * @param {?ArrayLike} substitutions
 * @param {!Object.<string, function(string, ...):Q>} formatters
 * @param {!T} initialValue
 * @param {function(T, Q): T|undefined} append
 * @param {!Array.<!Object>=} tokenizedFormat
 * @return {!{formattedResult: T, unusedSubstitutions: ?ArrayLike}};
 * @template T, Q
 */
String.format = function(format, substitutions, formatters, initialValue, append, tokenizedFormat) {
  if (!format || ((!substitutions || !substitutions.length) && format.search(/\u001b\[(\d+)m/) === -1)) {
    return {formattedResult: append(initialValue, format), unusedSubstitutions: substitutions};
  }

  function prettyFunctionName() {
    return 'String.format("' + format + '", "' + Array.prototype.join.call(substitutions, '", "') + '")';
  }

  function warn(msg) {
    console.warn(prettyFunctionName() + ': ' + msg);
  }

  function error(msg) {
    console.error(prettyFunctionName() + ': ' + msg);
  }

  let result = initialValue;
  const tokens = tokenizedFormat || String.tokenizeFormatString(format, formatters);
  const usedSubstitutionIndexes = {};

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];

    if (token.type === 'string') {
      result = append(result, token.value);
      continue;
    }

    if (token.type !== 'specifier') {
      error('Unknown token type "' + token.type + '" found.');
      continue;
    }

    if (!token.value && token.substitutionIndex >= substitutions.length) {
      // If there are not enough substitutions for the current substitutionIndex
      // just output the format specifier literally and move on.
      error(
          'not enough substitution arguments. Had ' + substitutions.length + ' but needed ' +
          (token.substitutionIndex + 1) + ', so substitution was skipped.');
      result = append(result, '%' + (token.precision > -1 ? token.precision : '') + token.specifier);
      continue;
    }

    if (!token.value) {
      usedSubstitutionIndexes[token.substitutionIndex] = true;
    }

    if (!(token.specifier in formatters)) {
      // Encountered an unsupported format character, treat as a string.
      warn('unsupported format character \u201C' + token.specifier + '\u201D. Treating as a string.');
      result = append(result, token.value ? '' : substitutions[token.substitutionIndex]);
      continue;
    }

    result = append(result, formatters[token.specifier](token.value || substitutions[token.substitutionIndex], token));
  }

  const unusedSubstitutions = [];
  for (let i = 0; i < substitutions.length; ++i) {
    if (i in usedSubstitutionIndexes) {
      continue;
    }
    unusedSubstitutions.push(substitutions[i]);
  }

  return {formattedResult: result, unusedSubstitutions: unusedSubstitutions};
};

/**
 * @param {string} query
 * @param {boolean} caseSensitive
 * @param {boolean} isRegex
 * @return {!RegExp}
 */
self.createSearchRegex = function(query, caseSensitive, isRegex) {
  const regexFlags = caseSensitive ? 'g' : 'gi';
  let regexObject;

  if (isRegex) {
    try {
      regexObject = new RegExp(query, regexFlags);
    } catch (e) {
      // Silent catch.
    }
  }

  if (!regexObject) {
    regexObject = self.createPlainTextSearchRegex(query, regexFlags);
  }

  return regexObject;
};

/**
 * @param {string} query
 * @param {string=} flags
 * @return {!RegExp}
 */
self.createPlainTextSearchRegex = function(query, flags) {
  // This should be kept the same as the one in StringUtil.cpp.
  const regexSpecialCharacters = String.regexSpecialCharacters();
  let regex = '';
  for (let i = 0; i < query.length; ++i) {
    const c = query.charAt(i);
    if (regexSpecialCharacters.indexOf(c) !== -1) {
      regex += '\\';
    }
    regex += c;
  }
  return new RegExp(regex, flags || '');
};

/**
 * @param {number} spacesCount
 * @return {string}
 */
self.spacesPadding = function(spacesCount) {
  return '\xA0'.repeat(spacesCount);
};

/**
 * @param {number} value
 * @param {number} symbolsCount
 * @return {string}
 */
self.numberToStringWithSpacesPadding = function(value, symbolsCount) {
  const numberString = value.toString();
  const paddingLength = Math.max(0, symbolsCount - numberString.length);
  return self.spacesPadding(paddingLength) + numberString;
};

/**
 * @return {?T}
 * @template T
 */
Set.prototype.firstValue = function() {
  if (!this.size) {
    return null;
  }
  return this.values().next().value;
};

/**
 * @param {!Iterable<T>|!Array<!T>} iterable
 * @template T
 */
Set.prototype.addAll = function(iterable) {
  for (const e of iterable) {
    this.add(e);
  }
};

/**
 * @return {T}
 * @template T
 */
Map.prototype.remove = function(key) {
  const value = this.get(key);
  this.delete(key);
  return value;
};

/**
 * @return {!Platform.Multimap<!KEY, !VALUE>}
 */
Map.prototype.inverse = function() {
  const result = new Platform.Multimap();
  for (const key of this.keys()) {
    const value = this.get(key);
    result.set(value, key);
  }
  return result;
};

/**
 * @template K, V
 */
const Multimap = class {
  constructor() {
    /** @type {!Map.<K, !Set.<!V>>} */
    this._map = new Map();
  }

  /**
   * @param {K} key
   * @param {V} value
   */
  set(key, value) {
    let set = this._map.get(key);
    if (!set) {
      set = new Set();
      this._map.set(key, set);
    }
    set.add(value);
  }

  /**
   * @param {K} key
   * @return {!Set<!V>}
   */
  get(key) {
    return this._map.get(key) || new Set();
  }

  /**
   * @param {K} key
   * @return {boolean}
   */
  has(key) {
    return this._map.has(key);
  }

  /**
   * @param {K} key
   * @param {V} value
   * @return {boolean}
   */
  hasValue(key, value) {
    const set = this._map.get(key);
    if (!set) {
      return false;
    }
    return set.has(value);
  }

  /**
   * @return {number}
   */
  get size() {
    return this._map.size;
  }

  /**
   * @param {K} key
   * @param {V} value
   * @return {boolean}
   */
  delete(key, value) {
    const values = this.get(key);
    if (!values) {
      return false;
    }
    const result = values.delete(value);
    if (!values.size) {
      this._map.delete(key);
    }
    return result;
  }

  /**
   * @param {K} key
   */
  deleteAll(key) {
    this._map.delete(key);
  }

  /**
   * @return {!Array.<K>}
   */
  keysArray() {
    return [...this._map.keys()];
  }

  /**
   * @return {!Array.<!V>}
   */
  valuesArray() {
    const result = [];
    for (const set of this._map.values()) {
      result.push(...set.values());
    }
    return result;
  }

  clear() {
    this._map.clear();
  }
};

/**
 * @param {string} url
 * @return {!Promise.<string>}
 */
self.loadXHR = function(url) {
  return new Promise(load);

  function load(successCallback, failureCallback) {
    function onReadyStateChanged() {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }
      if (xhr.status !== 200) {
        xhr.onreadystatechange = null;
        failureCallback(new Error(xhr.status));
        return;
      }
      xhr.onreadystatechange = null;
      successCallback(xhr.responseText);
    }

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = false;
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onReadyStateChanged;
    xhr.send(null);
  }
};

/**
 * @param {*} value
 */
self.suppressUnused = function(value) {};

/**
 * @param {function()} callback
 * @return {number}
 */
self.setImmediate = function(callback) {
  const args = [...arguments].slice(1);
  Promise.resolve().then(() => callback(...args));
  return 0;
};

/**
 * @param {T} defaultValue
 * @return {!Promise.<T>}
 * @template T
 */
Promise.prototype.catchException = function(defaultValue) {
  return this.catch(function(error) {
    console.error(error);
    return defaultValue;
  });
};

/**
 * TODO: move into its own module
 * @param {function()} callback
 */
self.runOnWindowLoad = function(callback) {
  /**
   * @suppressGlobalPropertiesCheck
   */
  function windowLoaded() {
    self.removeEventListener('DOMContentLoaded', windowLoaded, false);
    callback();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    callback();
  } else {
    self.addEventListener('DOMContentLoaded', windowLoaded, false);
  }
};

const _singletonSymbol = Symbol('singleton');

/**
 * @template T
 * @param {function(new:T, ...)} constructorFunction
 * @return {!T}
 */
self.singleton = function(constructorFunction) {
  if (_singletonSymbol in constructorFunction) {
    return constructorFunction[_singletonSymbol];
  }
  const instance = new constructorFunction();
  constructorFunction[_singletonSymbol] = instance;
  return instance;
};

/**
 * @param {?string} content
 * @return {number}
 */
self.base64ToSize = function(content) {
  if (!content) {
    return 0;
  }
  let size = content.length * 3 / 4;
  if (content[content.length - 1] === '=') {
    size--;
  }
  if (content.length > 1 && content[content.length - 2] === '=') {
    size--;
  }
  return size;
};

/**
 * @param {?string} input
 * @return {string}
 */
self.unescapeCssString = function(input) {
  // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
  const reCssEscapeSequence = /(?<!\\)\\(?:([a-fA-F0-9]{1,6})|(.))[\n\t\x20]?/gs;
  return input.replace(reCssEscapeSequence, (_, $1, $2) => {
    if ($2) {  // Handle the single-character escape sequence.
      return $2;
    }
    // Otherwise, handle the code point escape sequence.
    const codePoint = parseInt($1, 16);
    const isSurrogate = 0xD800 <= codePoint && codePoint <= 0xDFFF;
    if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
      return '\uFFFD';
    }
    return String.fromCodePoint(codePoint);
  });
};

self.Platform = self.Platform || {};
Platform = Platform || {};

/** @constructor */
Platform.Multimap = Multimap;
