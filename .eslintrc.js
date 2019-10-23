module.exports = {
    extends : [
        "@tivac",
        "plugin:jest/recommended",
    ],

    parser: "babel-eslint",

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
    },

    // Weird that setting "jest" up above in the env settings doesn't handle this
    globals : {
        "document" : true,
    },
};
