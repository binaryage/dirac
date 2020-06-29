"use strict";
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Compiler = /** @class */ (function () {
    function Compiler(locales, formats, formatters) {
        this.locales = [];
        this.formats = {
            number: {},
            date: {},
            time: {}
        };
        this.pluralNumberFormat = null;
        this.currentPlural = null;
        this.pluralStack = [];
        this.locales = locales;
        this.formats = formats;
        this.formatters = formatters;
    }
    Compiler.prototype.compile = function (ast) {
        this.pluralStack = [];
        this.currentPlural = null;
        this.pluralNumberFormat = null;
        return this.compileMessage(ast);
    };
    Compiler.prototype.compileMessage = function (ast) {
        var _this = this;
        if (!(ast && ast.type === 'messageFormatPattern')) {
            throw new Error('Message AST is not of type: "messageFormatPattern"');
        }
        var elements = ast.elements;
        var pattern = elements
            .filter(function (el) {
            return el.type === 'messageTextElement' || el.type === 'argumentElement';
        })
            .map(function (el) {
            return el.type === 'messageTextElement'
                ? _this.compileMessageText(el)
                : _this.compileArgument(el);
        });
        if (pattern.length !== elements.length) {
            throw new Error('Message element does not have a valid type');
        }
        return pattern;
    };
    Compiler.prototype.compileMessageText = function (element) {
        // When this `element` is part of plural sub-pattern and its value contains
        // an unescaped '#', use a `PluralOffsetString` helper to properly output
        // the number with the correct offset in the string.
        if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
            // Create a cache a NumberFormat instance that can be reused for any
            // PluralOffsetString instance in this message.
            if (!this.pluralNumberFormat) {
                this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
            }
            return new PluralOffsetString(this.currentPlural.id, this.currentPlural.format.offset, this.pluralNumberFormat, element.value);
        }
        // Unescape the escaped '#'s in the message text.
        return element.value.replace(/\\#/g, '#');
    };
    Compiler.prototype.compileArgument = function (element) {
        var format = element.format, id = element.id;
        var formatters = this.formatters;
        if (!format) {
            return new StringFormat(id);
        }
        var _a = this, formats = _a.formats, locales = _a.locales;
        switch (format.type) {
            case 'numberFormat':
                return {
                    id: id,
                    format: formatters.getNumberFormat(locales, formats.number[format.style]).format
                };
            case 'dateFormat':
                return {
                    id: id,
                    format: formatters.getDateTimeFormat(locales, formats.date[format.style]).format
                };
            case 'timeFormat':
                return {
                    id: id,
                    format: formatters.getDateTimeFormat(locales, formats.time[format.style]).format
                };
            case 'pluralFormat':
                return new PluralFormat(id, format.offset, this.compileOptions(element), formatters.getPluralRules(locales, {
                    type: format.ordinal ? 'ordinal' : 'cardinal'
                }));
            case 'selectFormat':
                return new SelectFormat(id, this.compileOptions(element));
            default:
                throw new Error('Message element does not have a valid format type');
        }
    };
    Compiler.prototype.compileOptions = function (element) {
        var _this = this;
        var format = element.format;
        var options = format.options;
        // Save the current plural element, if any, then set it to a new value when
        // compiling the options sub-patterns. This conforms the spec's algorithm
        // for handling `"#"` syntax in message text.
        this.pluralStack.push(this.currentPlural);
        this.currentPlural = format.type === 'pluralFormat' ? element : null;
        var optionsHash = options.reduce(function (all, option) {
            // Compile the sub-pattern and save it under the options's selector.
            all[option.selector] = _this.compileMessage(option.value);
            return all;
        }, {});
        // Pop the plural stack to put back the original current plural value.
        this.currentPlural = this.pluralStack.pop();
        return optionsHash;
    };
    return Compiler;
}());
exports.default = Compiler;
// -- Compiler Helper Classes --------------------------------------------------
var Formatter = /** @class */ (function () {
    function Formatter(id) {
        this.id = id;
    }
    return Formatter;
}());
var StringFormat = /** @class */ (function (_super) {
    __extends(StringFormat, _super);
    function StringFormat() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StringFormat.prototype.format = function (value) {
        if (!value && typeof value !== 'number') {
            return '';
        }
        return typeof value === 'string' ? value : String(value);
    };
    return StringFormat;
}(Formatter));
var PluralFormat = /** @class */ (function () {
    function PluralFormat(id, offset, options, pluralRules) {
        this.id = id;
        this.offset = offset;
        this.options = options;
        this.pluralRules = pluralRules;
    }
    PluralFormat.prototype.getOption = function (value) {
        var options = this.options;
        var option = options['=' + value] ||
            options[this.pluralRules.select(value - this.offset)];
        return option || options.other;
    };
    return PluralFormat;
}());
var PluralOffsetString = /** @class */ (function (_super) {
    __extends(PluralOffsetString, _super);
    function PluralOffsetString(id, offset, numberFormat, string) {
        var _this = _super.call(this, id) || this;
        _this.offset = offset;
        _this.numberFormat = numberFormat;
        _this.string = string;
        return _this;
    }
    PluralOffsetString.prototype.format = function (value) {
        var number = this.numberFormat.format(value - this.offset);
        return this.string
            .replace(/(^|[^\\])#/g, '$1' + number)
            .replace(/\\#/g, '#');
    };
    return PluralOffsetString;
}(Formatter));
exports.PluralOffsetString = PluralOffsetString;
var SelectFormat = /** @class */ (function () {
    function SelectFormat(id, options) {
        this.id = id;
        this.options = options;
    }
    SelectFormat.prototype.getOption = function (value) {
        var options = this.options;
        return options[value] || options.other;
    };
    return SelectFormat;
}());
exports.SelectFormat = SelectFormat;
function isSelectOrPluralFormat(f) {
    return !!f.options;
}
exports.isSelectOrPluralFormat = isSelectOrPluralFormat;
//# sourceMappingURL=compiler.js.map