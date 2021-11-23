"use strict";

import * as assert from "uvu/assert";
import { createMachine, interpret } from "xstate";

import describe from "./util/describe.js";
import trees from "./util/trees.js";
import component from "./util/component.js";
import loadAsync from "./util/async-loader.js";
import { component as helper } from "../src/component-helper.js";

describe("xstate-component-tree component helper", (it) => {
    it.after.each(({ tree }) => {
        if(tree && tree.builder) {
            tree.builder.teardown();
        }

        tree = null;
    });

    it("should be a named export of the /helper entrypoint", () => {
        assert.is(typeof helper, "function");
    });

    [
        [ "basic component", component("one") ],
        [ "arrow function", () => component("one") ],
        [ "async arrow function", loadAsync(component("one")) ],
    ].forEach(([ name, load ]) => {
        it(`should return the same tree with or without the helper: ${name}`, async () => {
            const basic = createMachine({
                initial : "one",

                states : {
                    one : {
                        meta : {
                            component : component("one"),
                        },
                    },
                },
            });

            const sugar = createMachine({
                initial : "one",

                states : {
                    one : helper(load),
                },
            });

            const b = interpret(basic);
            const s = interpret(sugar);

            const tb = trees(b);
            const ts = trees(s);

            const [ cb, cs ] = await Promise.all([ tb(), ts() ]);

            assert.equal(cb, cs);
        });
    });
});
