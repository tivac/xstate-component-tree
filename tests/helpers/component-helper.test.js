import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

import { componentHelper } from "../../src/component-helper.js";

import component from "../util/component.js";
import { asyncValue, asyncLoad } from "../util/async.js";
import { getTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";
import { snapshot } from "../util/snapshot.js";

describe("component-helper", () => {
    afterEach(treeTeardown);

    it("should be a named export of the /helper entrypoint", () => {
        assert.equal(typeof componentHelper, "function");
    });

    const One = component("one");
    const properties = { foo : "bar" };

    for(const [ name, meta, helpered ] of [
        [
            "basic component",
            { component : One },
            One,
        ],
        [
            "basic component + basic props",
            { component : One, props : properties },
            { component : One, props : properties },
        ],
        [
            "basic component + arrow fn props",
            { load : () => [ One, properties ] },
            { component : One, props : () => properties },
        ],
        [
            "arrow function",
            { load : () => One },
            () => One,
        ],
        [
            "arrow function + basic props",
            { load : () => [ One, properties ] },
            { component : () => One, props : properties },
        ],
        [
            "arrow function + arrow fn props",
            { load : () => [ One, properties ] },
            { component : () => One, props : () => properties },
        ],
        [
            "async arrow function",
            { load : () => [ asyncValue(One) ] },
            asyncLoad(One),
        ],
        [
            "async arrow function + basic props",
            { load : () => [ asyncValue(One), properties ] },
            { component : asyncLoad(One), props : properties },
        ],
        [
            "async arrow function + arrow fn props",
            { load : () => [ asyncValue(One), properties ] },
            { component : asyncLoad(One), props : () => properties },
        ],
    ]) {
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
                    one : componentHelper(helpered),
                },
            });

            assert.deepStrictEqual(basic, sugar);
        });
    }

    it("should maintain existing .meta properties if they exist", () => {
        const node = componentHelper(component("one"), {
            meta : {
                foo : "bar",
                baz : true,
            },
        });

        snapshot(node, `{
            meta: {
                foo: "bar",
                baz: true,
                load: [Function (anonymous)]
            }
        }`);
    });
});
