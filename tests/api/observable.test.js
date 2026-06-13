import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { interpret } from "xstate";

import { ComponentTree } from "../../src/component-tree.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";

describe("observable", () => {
    afterEach(treeTeardown);

    it("should immediately call the callback", async () => {
        const xct = new ComponentTree(interpret(single));
        let calls = 0;
        let out;

        xct.subscribe((result) => {
            ++calls;
            out = result;
        });

        // Initial value is basic but functional
        assert.equal(calls, 1);
        assert.equal(typeof out.state, "object");
        assert.deepEqual(out.tree, []);
        assert.equal(typeof out.hasTag, "function");
        assert.equal(typeof out.matches, "function");
        assert.equal(typeof out.broadcast, "function");
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

        assert.equal(calls, 2);
        assert.ok(out.tree);
        assert.ok(out.state);
        assert.equal(typeof out.matches, "function");
        assert.equal(typeof out.hasTag, "function");
        assert.equal(typeof out.broadcast, "function");

        tree.service.send({ type : "NEXT" });
        await tree();

        assert.equal(calls, 3);
        assert.ok(out.hasTag("two"));
    });

    it("should return an unsubscriber", async (context) => {
        const tree = context.tree = createTree(single);
        let calls = 0;

        const unsub = tree.builder.subscribe(() => ++calls);

        assert.equal(typeof unsub, "function");

        await tree();
        unsub();

        tree.service.send({ type : "NEXT" });
        await tree();

        assert.equal(calls, 2);
    });
    
    it("should return noop after teardown", async () => {
        const tree = createTree(single);
        let calls = 0;

        await tree();

        tree.builder.teardown();

        const unsub = tree.builder.subscribe(() => ++calls);

        assert.equal(typeof unsub, "function");
        assert.equal(calls, 0);
    });
});
