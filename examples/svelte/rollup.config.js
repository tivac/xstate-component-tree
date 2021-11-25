"use strict";

module.exports = {
    input : "src/index.js",

    preserveEntrySignatures : false,

    output : {
        dir            : "dist",
        format         : "esm",
        chunkFileNames : "[name].js",
    },

    plugins : [
        require("@rollup/plugin-replace")({
            "process.env.NODE_ENV" : JSON.stringify("debug"),

            preventAssignment : true,
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
