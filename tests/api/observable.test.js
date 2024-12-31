import * as assert from "uvu/assert";
import { interpret } from "xstate";

import { ComponentTree } from "../../src/component-tree.js";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";

describe("observable", (it) => {
    it.after.each(treeTeardown);

    it("should immediately call the callback", async () => {
        const xct = new ComponentTree(interpret(single));

        let calls = 0;
        let out;

        xct.subscribe((result) => {
            ++calls;

            out = result;
        });

        // Initial value is basic but functional
        assert.is(calls, 1);
        assert.type(out.state, "object");
        assert.equal(out.tree, []);
        assert.type(out.hasTag, "function");
        assert.type(out.matches, "function");
        assert.type(out.broadcast, "function");

        assert.ok(out.hasTag("one"));

        xct.teardown();
    });

    it("should call the callback whenever a run finishes", async (context) => {
        const tree = context.tree = createTree(single);

        let calls = 0;
        let out;

        tree.builder.subscribe((result) => {
            ++calls;

            out = result;
        });

        await tree();

        assert.is(calls, 2);

        assert.ok(out.tree);
        assert.ok(out.state);

        assert.type(out.matches, "function");
        assert.type(out.hasTag, "function");
        assert.type(out.broadcast, "function");

        tree.send({ type : "NEXT" });
        
        await tree();
        
        assert.is(calls, 3);
        assert.ok(out.hasTag("two"));
    });

    it("should return an unsubscriber", async (context) => {
        const tree = context.tree = createTree(single);

        let calls = 0;

        const unsub = tree.builder.subscribe(() => ++calls);

        assert.type(unsub, "function");

        await tree();

        unsub();

        tree.send({ type : "NEXT" });

        await tree();

        assert.is(calls, 2);
    });
});
