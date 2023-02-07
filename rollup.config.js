"use strict";

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

const pkg = JSON.parse(readFileSync("./package.json"));

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

const cjsStub = stubby("commonjs");
const esmStub = stubby("module");

export default [{
    input : {
        "xstate-component-tree" : "./src/index.js",
    },
    
    plugins : [
        nodeResolve(),
        commonjs(),
    ],

    output : [{
        dir       : "./dist/cjs",
        format    : "cjs",
        exports   : "named",
        sourcemap : true,
        banner,
        plugins   : [
            cjsStub,
        ],
    }, {
        dir            : "./dist/cjs",
        entryFileNames : "[name]-min.js",
        format         : "cjs",
        exports        : "named",
        sourcemap      : true,
        plugins        : [
            terser(),
            cjsStub,
        ],

        banner,
    }, {
        dir       : "./dist/esm",
        format    : "es",
        sourcemap : true,
        banner,
        plugins   : [
            esmStub,
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
            esmStub,
        ],
        banner,
    }],
}];
