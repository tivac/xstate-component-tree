"use strict";

const { terser } = require("rollup-plugin-terser");

const pkg = require("./package.json");

const banner = `/*! ${pkg.name}@${pkg.version} !*/\n`;

const input = "./src/component-tree.js";

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
        exports   : "default",
        banner,
    }, {
        file      : pkg.main.replace(".js", "-min.js"),
        format    : "cjs",
        sourcemap : true,
        exports   : "default",
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
            terser({
                mangle : {
                    // Keep classnames intact for more usable stack traces
                    keep_classnames : true,

                    // Mangle properties
                    properties : {
                        // Except teardown because that's part of the public API
                        reserved : [
                            "teardown",
                        ],
                    },
                },
            }),
        ],
        banner,
    }],
};
