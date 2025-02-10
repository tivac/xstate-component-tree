import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
    stylistic.configs["all-flat"],
    jsdoc.configs["flat/recommended"],
    unicorn.configs["flat/recommended"],

    {
        name : "Base Config",

        plugins : {
            jsdoc,
        },

        linterOptions : {
            reportUnusedDisableDirectives : true,
        },

        languageOptions : {
            globals : {
                ...globals.browser,
            },
        },

        rules : {
            ...js.configs.recommended.rules,

            // #region ESLint Core Rules
            "accessor-pairs" : "off",
            "array-callback-return" : "warn",
            "arrow-body-style" : [ "warn", "as-needed" ],
            "block-scoped-var" : "warn",
            "camelcase" : [
                "warn",
                {
                    properties : "never",
                    // whitelist names that match our custom colors, EX white1_80
                    allow : [ String.raw`\w+_\d+` ],
                },
            ],
            "complexity" : [ "warn", 15 ],
            "consistent-return" : "off",
            "consistent-this" : [ "warn", "self" ],
            "constructor-super" : "error",
            "curly" : "error",
            "default-case" : "warn",
            "dot-notation" : "warn",
            "eqeqeq" : "warn",
            "for-direction" : "warn",
            "func-names" : "off",
            "func-style" : "off",
            "getter-return" : "error",
            "guard-for-in" : "off",
            "id-length" : "off",
            "id-match" : "off",
            "init-declarations" : "off",
            "max-nested-callbacks" : "off",
            "max-params" : [ "warn", 4 ],
            "new-cap" : [ "error", {
                // Note: We support "?.", ".", "[" for characters that come AFTER the method name.
                capIsNewExceptionPattern : String.raw`^(?:hud|engine|game\w+)(\.|\?\.|\[).`,
            }],
            "max-statements" : [ "warn", 25, { ignoreTopLevelFunctions : true }],
            "no-alert" : "warn",
            "no-array-constructor" : "error",
            "no-await-in-loop" : "warn",
            "no-bitwise" : "error",
            "no-caller" : "error",
            "no-case-declarations" : "error",
            "no-class-assign" : "error",
            "no-compare-neg-zero" : "error",
            "no-cond-assign" : "error",
            "no-console" : "warn",
            "no-const-assign" : "error",
            "no-constant-condition" : "error",
            "no-continue" : "off",
            "no-control-regex" : "off",
            "no-debugger" : "warn",
            "no-delete-var" : "error",
            "no-div-regex" : "warn",
            "no-dupe-args" : "error",
            "no-dupe-class-members" : "error",
            "no-dupe-keys" : "error",
            "no-duplicate-case" : "error",
            "no-else-return" : "error",
            "no-empty-character-class" : "warn",
            "no-empty-function" : "warn",
            "no-empty-pattern" : "warn",
            "no-empty" : "warn",
            "no-eq-null" : "off",
            "no-eval" : "error",
            "no-ex-assign" : "error",
            "no-extend-native" : "error",
            "no-extra-bind" : "warn",
            "no-extra-boolean-cast" : "warn",
            "no-extra-label" : "error",
            "no-fallthrough" : "warn",
            "no-func-assign" : "warn",
            "no-implicit-coercion" : "warn",
            "no-implicit-globals" : "error",
            "no-implied-eval" : "error",
            "no-inline-comments" : "off",
            "no-inner-declarations" : "off",
            "no-invalid-regexp" : "error",
            "no-invalid-this" : "off",
            "no-irregular-whitespace" : "warn",
            "no-iterator" : "error",
            "no-label-var" : "error",
            "no-labels" : "error",
            "no-lone-blocks" : "warn",
            "no-lonely-if" : "error",
            "no-loop-func" : "warn",
            "no-magic-numbers" : "off",
            "no-multi-str" : "error",
            "no-negated-condition" : "off",
            "no-nested-ternary" : "error",
            "no-new-func" : "off",
            "no-new-wrappers" : "error",
            "no-new" : "off",
            "no-obj-calls" : "off",
            "no-object-constructor" : "error",
            "no-octal-escape" : "error",
            "no-octal" : "error",
            "no-param-reassign" : "off",
            "no-plusplus" : "off",
            "no-proto" : "error",
            "no-redeclare" : "warn",
            "no-regex-spaces" : "warn",
            "no-restricted-syntax" : [
                "error",
                {
                    // with
                    selector : "WithStatement",
                    message : "with breaks everything, don't use it",
                },
            ],
            "no-return-assign" : "warn",
            "no-script-url" : "error",
            "no-self-compare" : "warn",
            "no-sequences" : "error",
            "no-shadow-restricted-names" : "error",
            "no-shadow" : "warn",
            "no-sparse-arrays" : "warn",
            "no-ternary" : "off",
            "no-this-before-super" : "error",
            "no-throw-literal" : "warn",
            "no-undef-init" : "error",
            "no-undef" : "error",
            "no-undefined" : "off",
            "no-underscore-dangle" : "off",
            "no-unexpected-multiline" : "error",
            "no-unmodified-loop-condition" : "error",
            "no-unneeded-ternary" : "warn",
            "no-unreachable" : "error",
            "no-unused-expressions" : "warn",
            "no-unused-vars" : [ "warn", {
                args : "after-used",
                ignoreRestSiblings : true,
                caughtErrors : "none",
                varsIgnorePattern : "^_",
                argsIgnorePattern : "^_",
            }],
            "no-use-before-define" : "warn",
            "no-useless-call" : "warn",
            "no-useless-concat" : "warn",
            "no-useless-constructor" : "error",
            "no-var" : "off",
            "no-void" : "error",
            "no-warning-comments" : "off",
            "no-with" : "error",
            "object-shorthand" : "warn",
            "one-var" : [
                "error",
                {
                    var : "always",
                    let : "never",
                    const : "never",
                },
            ],
            "operator-assignment" : "off",
            "prefer-arrow-callback" : "error",
            "prefer-const" : "warn",
            "prefer-destructuring" : [ "warn", {
                VariableDeclarator : {
                    array : true,
                    object : true,
                },

                // Destructuring in assignments looks wonky, don't warn about it
                AssignmentExpression : {
                    array : false,
                    object : false,
                },
            }],
            "prefer-rest-params" : "warn",
            "prefer-spread" : "warn",
            "prefer-template" : "warn",
            "radix" : "warn",
            "require-jsdoc" : "off",
            "require-yield" : "error",
            "sort-vars" : "off",
            "strict" : "off",
            "use-isnan" : "error",
            "valid-jsdoc" : "off",
            "valid-typeof" : "error",
            "vars-on-top" : "warn",
            "yoda" : "warn",

            // #region Stylistic Rules

            "@stylistic/array-bracket-spacing" : [
                "warn",
                "always",
                {
                    arraysInArrays : false,
                    singleValue : true,
                    objectsInArrays : false,
                },
            ],

            "@stylistic/array-bracket-newline" : [ "warn", "consistent" ],
            "@stylistic/array-element-newline" : [ "warn", "consistent" ],
            "@stylistic/arrow-parens" : [ "error", "always" ],
            "@stylistic/arrow-spacing" : "error",
            "@stylistic/block-spacing" : [ "warn", "always" ],
            "@stylistic/brace-style" : "error",

            "@stylistic/comma-dangle" : [
                "warn",
                {
                    arrays : "always-multiline",
                    exports : "always-multiline",
                    functions : "ignore",
                    imports : "always-multiline",
                    objects : "always-multiline",
                },
            ],

            "@stylistic/comma-spacing" : "warn",
            "@stylistic/comma-style" : [ "warn", "last" ],
            "@stylistic/computed-property-spacing" : [ "warn", "never" ],

            "@stylistic/curly-newline" : [ "warn", {
                multiline : true,
                minElements : 1,

                FunctionExpression : {
                    minElements : 1,
                },
            }],

            "@stylistic/dot-location" : [ "error", "property" ],
            "@stylistic/eol-last" : "warn",
            "@stylistic/func-call-spacing" : [ "warn", "never" ],
            "@stylistic/function-call-argument-newline" : [ "warn", "consistent" ],
            "@stylistic/function-call-spacing" : "warn",
            "@stylistic/function-paren-newline" : "off",
            "@stylistic/generator-star-spacing" : "error",
            "@stylistic/implicit-arrow-linebreak" : "off",
            "@stylistic/indent" : [ "error", 4, {
                MemberExpression : 0,
            }],
            "@stylistic/indent-binary-ops" : [ "error", 4 ],
            "@stylistic/jsx-quotes" : "off",
            "@stylistic/key-spacing" : [
                "warn",
                {
                    mode : "minimum",
                    beforeColon : true,
                    afterColon : true,
                },
            ],

            "@stylistic/keyword-spacing" : [
                "warn",
                {
                    before : true,
                    after : false,
                    overrides : {
                        case : { after : true },
                        const : { after : true },
                        default : { after : true },
                        do : { after : true },
                        else : { after : true },
                        export : { after : true },
                        from : { after : true },
                        import : { after : true },
                        let : { after : true },
                        return : { after : true },
                        try : { after : true },
                        var : { after : true },
                        of : { after : true },
                        in : { after : true },
                    },
                },
            ],

            "@stylistic/line-comment-position" : [ "warn", { position : "above" }],
            "@stylistic/linebreak-style" : "off",
            "@stylistic/lines-around-comment" : [
                "off",
                {
                    beforeBlockComment : true,
                    beforeLineComment : true,
                    allowBlockStart : true,
                    allowObjectStart : true,
                    allowArrayStart : true,
                },
            ],

            "@stylistic/lines-between-class-members" : "warn",

            "@stylistic/max-len" : [ "warn", {
                code : 130,
                // Ignoring common SVG & HTML patterns
                ignorePattern : String.raw`M\d|<!--`,
                ignoreComments : true,
                ignoreUrls : true,
                ignoreStrings : true,
                ignoreTemplateLiterals : true,
                ignoreRegExpLiterals : true,
            }],

            "@stylistic/max-statements-per-line" : "warn",
            "@stylistic/member-delimiter-style" : "off",
            "@stylistic/multiline-comment-style" : "off",
            "@stylistic/multiline-ternary" : "off",
            "@stylistic/new-parens" : "error",
            "@stylistic/newline-per-chained-call" : "warn",
            "@stylistic/no-confusing-arrow" : [ "error", { allowParens : true }],

            "@stylistic/no-extra-parens" : [ "warn", "all", {
                nestedBinaryExpressions : false,
                enforceForArrowConditionals : false,
                returnAssign : false,
            }],

            "@stylistic/no-extra-semi" : "warn",
            "@stylistic/no-floating-decimal" : "error",
            "@stylistic/no-mixed-operators" : "error",
            "@stylistic/no-mixed-spaces-and-tabs" : "error",
            "@stylistic/no-multi-spaces" : "warn",

            "@stylistic/no-multiple-empty-lines" : [ "warn", {
                max : 1,
                maxEOF : 1,
                maxBOF : 0,
            }],

            "@stylistic/no-tabs" : "off",
            "@stylistic/no-trailing-spaces" : [ "warn", { skipBlankLines : true }],
            "@stylistic/no-whitespace-before-property" : "error",
            "@stylistic/nonblock-statement-body-position" : [ "warn", "below" ],

            "@stylistic/object-curly-newline" : [ "warn", {
                // Object literals w/ 4+ properties need to use newlines
                ObjectExpression : {
                    consistent    : true,
                    minProperties : 4,
                },

                // Destructuring w/ 6+ properties needs to use newlines
                ObjectPattern : {
                    consistent    : true,
                    minProperties : 6,
                },

                // Imports w/ 4+ properties need to use newlines
                ImportDeclaration : {
                    consistent    : true,
                    minProperties : 4,
                },

                // Named exports should always use newlines
                ExportDeclaration : "always",
            }],

            "@stylistic/object-curly-spacing" : [
                "warn",
                "always",
                {
                    objectsInObjects : true,
                    arraysInObjects : true,
                },
            ],

            "@stylistic/object-property-newline" : "off",
            "@stylistic/one-var-declaration-per-line" : [ "warn", "initializations" ],
            "@stylistic/operator-linebreak" : [ "warn", "after" ],
            "@stylistic/padded-blocks" : [ "warn", "never" ],

            "@stylistic/padding-line-between-statements" : [ "warn",
                // Always require a newline before returns
                {
                    blankLine : "always",
                    prev      : "*",
                    next      : "return",
                },

                // Always require a newline after directives
                {
                    blankLine : "always",
                    prev      : "directive",
                    next      : "*",
                },

                // Always require a newline after imports
                {
                    blankLine : "always",
                    prev      : "import",
                    next      : "*",
                },

                // Don't require a blank line between import statements
                {
                    blankLine : "any",
                    prev      : "import",
                    next      : "import",
                },

                // Newline after var blocks
                {
                    blankLine : "always",
                    prev      : [ "const", "let", "var" ],
                    next      : "*",
                },
                {
                    blankLine : "any",
                    prev      : [ "const", "let", "var" ],
                    next      : [ "const", "let", "var" ],
                },

                // Newline before conditionals/loops
                {
                    blankLine : "always",
                    prev      : "*",
                    next      : [ "if", "do", "while", "for" ],
                },

                // Newline after blocks
                {
                    blankLine : "always",
                    prev      : "block-like",
                    next      : "*",
                }],

            "@stylistic/quote-props" : [ "warn", "consistent-as-needed" ],

            "@stylistic/quotes" : [ "error", "double", {
                avoidEscape : true,
                allowTemplateLiterals : true,
            }],

            "@stylistic/rest-spread-spacing" : [ "warn", "never" ],
            "@stylistic/semi" : "error",

            "@stylistic/semi-spacing" : [
                "warn",
                {
                    before : false,
                    after : true,
                },
            ],

            "@stylistic/semi-style" : "warn",
            "@stylistic/space-before-blocks" : [ "warn", "always" ],

            "@stylistic/space-before-function-paren" : [ "warn", {
                anonymous : "never",
                named : "never",
                asyncArrow : "always",
            }],

            "@stylistic/space-in-parens" : [ "warn", "never" ],
            "@stylistic/space-infix-ops" : "error",

            "@stylistic/space-unary-ops" : [ "warn", {
                words : true,
                nonwords : false,
            }],

            "@stylistic/spaced-comment" : "warn",

            "@stylistic/switch-colon-spacing" : [ "warn", {
                before : true,
                after : true,
            }],

            "@stylistic/template-curly-spacing" : "error",
            "@stylistic/template-tag-spacing" : [ "error", "never" ],
            "@stylistic/wrap-iife" : "warn",
            "@stylistic/wrap-regex" : "warn",
            "@stylistic/yield-star-spacing" : "error",

            // #region Unicorn Rules
            "unicorn/prevent-abbreviations" : [ "warn", {
                replacements : {
                    mod : false,
                    jit : false,
                    ref : false,
                    src : false,
                },
            }],

            "unicorn/prefer-top-level-await" : "off",
            "unicorn/prefer-switch" : "off",

            // The ternaries this creates are often much harder to read than the if/else
            "unicorn/prefer-ternary" : "off",

            "unicorn/prefer-global-this" : "warn",

            // eslint-plugin-jsdoc customizations
            "jsdoc/tag-lines" : [ "warn", "any", { startLines : 1 }],
            "jsdoc/require-returns-description" : "off",
            "jsdoc/require-param-description" : "off",
            "jsdoc/require-property-description" : "off",
            "jsdoc/check-indentation" : "warn",
            "jsdoc/informative-docs" : "warn",
            "jsdoc/no-bad-blocks" : "warn",
            "jsdoc/require-jsdoc" : "off",
        },
    },
    {
        name : "Ignored",

        ignores : [
            "dist/",
            "coverage/",
            "examples/",
        ],
    },
];

export default eslintConfig;
