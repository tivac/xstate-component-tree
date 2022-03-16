import * as assert from "uvu/assert";

import helper from "../src/component-helper.js";

import describe from "./util/describe.js";
import component from "./util/component.js";
import { asyncValue, asyncLoad } from "./util/async.js";
import { getTree } from "./util/trees.js";
import { treeTeardown } from "./util/context.js";

describe("xstate-component-tree/helper", (it) => {
    it.after.each(treeTeardown);

    it("should be a named export of the /helper entrypoint", () => {
        assert.is(typeof helper, "function");
    });

    const One = component("one");
    const props = { foo : "bar" };

    [
        [
            "basic component",
            { component : One },
            One,
        ],
        [
            "basic component + basic props",
            { component : One, props },
            { component : One, props },
        ],
        [
            "basic component + arrow fn props",
            { load : () => [ One, props ] },
            { component : One, props : () => props },
        ],
        [
            "arrow function",
            { load : () => One },
            () => One,
        ],
        [
            "arrow function + basic props",
            { load : () => [ One, props ] },
            { component : () => One, props },
        ],
        [
            "arrow function + arrow fn props",
            { load : () => [ One, props ] },
            { component : () => One, props : () => props },
        ],
        [
            "async arrow function",
            { load : () => [ asyncValue(One) ] },
            asyncLoad(One),
        ],
        [
            "async arrow function + basic props",
            { load : () => [ asyncValue(One), props ] },
            { component : asyncLoad(One), props },
        ],
        [
            "async arrow function + arrow fn props",
            { load : () => [ asyncValue(One), props ] },
            { component : asyncLoad(One), props : () => props },
        ],
    ].forEach(([ name, meta, helpered ]) => {
        it(`should be the same: ${name}`, async () => {
            const { tree : basic } = await getTree({
                initial : "one",
    
                states : {
                    one : {
                        meta,
                    },
                },
            });
    
            const { tree : sugar } = await getTree({
                initial : "one",
    
                states : {
                    one : helper(helpered),
                },
            });

            assert.equal(basic, sugar);
        });
    });
});
