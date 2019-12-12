"use strict";

const { terser } = require("rollup-plugin-terser");

const pkg = require("./package.json");

const banner = `/*! ${pkg.name}@${pkg.version} !*/`;

const input = "./src/treebuilder.js";

// ESM & CJS builds
module.exports = {
    input,

    plugins : [
        require("rollup-plugin-node-resolve")(),
        require("rollup-plugin-commonjs")(),
    ],

    output : [{
        file      : pkg.main,
        format    : "cjs",
        sourcemap : true,
        banner,
    }, {
        file      : pkg.main.replace(".js", "-min.js"),
        format    : "cjs",
        sourcemap : true,
        plugins   : [
            terser(),
        ],

        banner,
    }, {
        file      : pkg.module,
        format    : "es",
        sourcemap : true,
        banner,
    }, {
        file      : pkg.module.replace(".mjs", "-min.mjs"),
        format    : "es",
        sourcemap : true,
        plugins   : [
            terser(),
        ],
        banner,
    }],
};
