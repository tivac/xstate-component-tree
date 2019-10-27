"use strict";

const pkg = require("./package.json");

const banner = `/*! ${pkg.name}@${pkg.version} !*/`;

const input = "./src/treebuilder.js";

// ESM & CJS builds
module.exports = {
    input,

    output : [{
        file      : pkg.main,
        format    : "cjs",
        sourcemap : true,
        banner,
    }, {
        file      : pkg.module,
        format    : "es",
        sourcemap : true,
        banner,
    }],
};
