module.exports = {
    extends : [
        "@tivac",
        "plugin:jest/recommended",
    ],

    parser : "babel-eslint",

    env : {
        node : true,
        jest : true,
        es6  : true,
    },

    plugins : [
        "jest",
    ],

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

    // Weird that setting "jest" up above in the env settings doesn't handle this
    globals : {
        document : true,
    },
};
