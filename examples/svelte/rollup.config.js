"use strict";

module.exports = {
    input : "src/index.js",

    output : {
        file   : "dist/bundle.js",
        format : "esm",
    },

    plugins : [
        require("@rollup/plugin-replace")({
            "process.env.NODE_ENV" : JSON.stringify("debug"),
        }),
        require("rollup-plugin-node-resolve")({
            mainFields : [ "module", "browser" ],
        }),
        require("rollup-plugin-svelte")({
            extensions : [ ".svelte" ],
        }),
        require("rollup-plugin-serve")([
            "./dist",
            "./static",
        ]),
    ],
};
