import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";

describe("observable", (it) => {
    it.after.each(treeTeardown);

    it("should immediately call the callback", async (context) => {
        const tree = context.tree = createTree(single);

        let calls = 0;
        let out;

        tree.builder.subscribe((result) => {
            ++calls;

            out = result;
        });

        // Should be false at first, before tree has run
        assert.is(calls, 1);
        assert.is(out, false);
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

        tree.send("NEXT");

        await tree();

        assert.is(calls, 3);
    });

    it("should return an unsubscriber", async (context) => {
        const tree = context.tree = createTree(single);

        let calls = 0;

        const unsub = tree.builder.subscribe(() => ++calls);

        assert.type(unsub, "function");

        await tree();

        unsub();

        tree.send("NEXT");

        await tree();

        assert.is(calls, 2);
    });
});
