"use strict";

const { writeFileSync } = require("fs");
const { join } = require("path");

const { terser } = require("rollup-plugin-terser");

const pkg = require("./package.json");

const banner = `/*! ${pkg.name}@${pkg.version} !*/\n`;

// Plugin for making stub package.json files that tell the type of the modules in the folder
// Resources:
// https://www.sensedeep.com/blog/posts/2021/how-to-create-single-source-npm-module.html
// https://2ality.com/2019/10/hybrid-npm-packages.html
// https://redfin.engineering/node-modules-at-war-why-commonjs-and-es-modules-cant-get-along-9617135eeca1
//
const stubby = (type) => ({
    name : `stubby-${type}`,

    writeBundle({ dir },) {
        writeFileSync(join(dir, "package.json"), JSON.stringify({ type }, null, 4));
    },
});

// ESM & CJS builds
module.exports = {
    input : [
        "./src/component-tree.js",
        "./src/component-helper.js",
    ],

    plugins : [
        require("rollup-plugin-node-resolve")(),
        require("rollup-plugin-commonjs")(),
    ],

    output : [{
        dir       : "./dist/cjs",
        format    : "cjs",
        sourcemap : true,
        banner,
        plugins   : [
            stubby("commonjs"),
        ],
    }, {
        dir            : "./dist/cjs",
        entryFileNames : "[name]-min.js",
        format         : "cjs",
        sourcemap      : true,
        plugins        : [
            terser(),
            stubby("commonjs"),
        ],

        banner,
    }, {
        dir       : "./dist/esm",
        format    : "es",
        sourcemap : true,
        banner,
        plugins   : [
            stubby("module"),
        ],
    }, {
        dir            : "./dist/esm",
        entryFileNames : "[name]-min.js",
        format         : "es",
        sourcemap      : true,
        plugins        : [
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
            stubby("module"),
        ],
        banner,
    }],
};
