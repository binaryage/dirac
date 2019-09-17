module.exports = {
    "root": true,

    "env": {
        "browser": true,
        "es6": true
    },

    "parserOptions": {
        "ecmaVersion": 9
    },

    /**
     * ESLint rules
     *
     * All available rules: http://eslint.org/docs/rules/
     *
     * Rules take the following form:
     *   "rule-name", [severity, { opts }]
     * Severity: 2 == error, 1 == warning, 0 == off.
     */
    "rules": {
        /**
         * Enforced rules
         */


        // syntax preferences
        "quotes": [2, "single", {
            "avoidEscape": true,
            "allowTemplateLiterals": true
        }],
        "semi": 2,
        "no-extra-semi": 2,
        "comma-style": [2, "last"],
        "wrap-iife": [2, "inside"],
        "spaced-comment": [2, "always", {
            "markers": ["*"]
        }],
        "eqeqeq": [2],
        "accessor-pairs": [2, {
            "getWithoutSet": false,
            "setWithoutGet": false
        }],
        "curly": [2, "multi-or-nest", "consistent"],
        "new-parens": 2,
        "func-call-spacing": 2,
        "arrow-parens": [2, "as-needed"],

        // anti-patterns
        "no-with": 2,
        "no-multi-str": 2,
        "no-caller": 2,
        "no-implied-eval": 2,
        "no-labels": 2,
        "no-new-object": 2,
        "no-octal-escape": 2,
        "no-self-compare": 2,
        "no-shadow-restricted-names": 2,
        "no-cond-assign": 2,
        "no-debugger": 2,
        "no-console": [2, { "allow": ["assert", "context", "error", "timeStamp", "time", "timeEnd", "warn"] }],
        "no-dupe-keys": 2,
        "no-duplicate-case": 2,
        "no-empty-character-class": 2,
        "no-unreachable": 2,
        "no-unsafe-negation": 2,
        "radix": 2,
        "valid-typeof": 2,
        "no-var": 2,
        "prefer-const": 2,
        "no-unused-vars": [2, { "args": "none", "vars": "local" }],

        // es2015 features
        "require-yield": 2,
        "template-curly-spacing": [2, "never"],

        // spacing details
        "space-infix-ops": 2,
        "space-in-parens": [2, "never"],
        "space-before-function-paren": [2, {
            "anonymous": "never",
            "named": "never",
            "asyncArrow": "always"
        }],
        "no-whitespace-before-property": 2,
        "keyword-spacing": [2, {
            "overrides": {
                "if": {"after": true},
                "else": {"after": true},
                "for": {"after": true},
                "while": {"after": true},
                "do": {"after": true},
                "switch": {"after": true},
                "return": {"after": true}
            }
        }],
        "arrow-spacing": [2, {
            "after": true,
            "before": true
        }],

        // file whitespace
        "no-multiple-empty-lines": [2, {"max": 2}],
        "no-mixed-spaces-and-tabs": 2,
        "no-trailing-spaces": 2,
        "linebreak-style": [ 2, "unix" ],

        /**
         * Disabled, aspirational rules
         */

        "indent": [0, 2, { "SwitchCase": 1, "CallExpression": {"arguments": 2}, "MemberExpression": 2 }],

        // brace-style is disabled, as eslint cannot enforce 1tbs as default, but allman for functions
        "brace-style": [0, "allman", { "allowSingleLine": true }],

        // key-spacing is disabled, as some objects use value-aligned spacing, some not.
        "key-spacing": [0, {
            "beforeColon": false,
            "afterColon": true,
            "align": "value"
        }],
        // quote-props is diabled, as property quoting styles are too varied to enforce.
        "quote-props": [0, "as-needed"],

        // no-implicit-globals will prevent accidental globals
        "no-implicit-globals": [0]
    }
};
