"use strict";

module.exports = {
    extends : [
        "@tivac",
    ],

    parserOptions : {
        sourceType : "module",
    },

    env : {
        node    : true,
        browser : true,
        es2020  : true,
    },

    rules : {
        "max-statements" : [ "warn", 25 ],
        
        "newline-after-var" : "off",

        // Block some features
        "no-restricted-syntax" : [
            "error",

            // with() is so dangerous
            "WithStatement",

            // Object spread
            {
                selector : "ExperimentalSpreadProperty",
                message  : "Object spread doesn't work in all environments",
            },
        ],
    },
};
