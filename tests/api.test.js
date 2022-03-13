import * as assert from "uvu/assert";
import { createMachine } from "xstate";
import { spyOn, restoreAll } from "nanospy";

import describe from "./util/describe.js";
import { createTree, waitForPath } from "./util/trees.js";
import component from "./util/component.js";
import { treeTeardown } from "./util/context.js";
import { diff, snapshot } from "./util/snapshot.js";

import single from "./specimens/single.js";
import parallel from "./specimens/parallel.js";
import child from "./specimens/child.js";
import grandchild from "./specimens/grandchild.js";

describe("verbose", (it) => {
    it.after.each(restoreAll);

    it("should log information", async () => {
        // eslint-disable-next-line no-empty-function
        const log = spyOn(console, "log", () => {});

        const tree = createTree(child, { verbose : true });

        await tree();

        restoreAll();

        // Only check first & last for now
        snapshot(log.calls[0], `[ "[root]", "[_prep] _paths", [ "root.one", "root.two" ] ]`);
        snapshot(log.calls[log.calls.length - 1], `[ "[root]", "[_run #2] finished" ]`);
    });
});

describe("broadcast", (it) => {
    it.after.each(treeTeardown);
    
    it("should send to the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        const before = await tree();
        
        tree.builder.broadcast("NEXT");

        const after = await waitForPath(tree, "two");

        diff(before, after, `
        [
            [Object: null prototype] {
        Actual:
        --        path: "one",
        --        component: [Function: one],
        Expected:
        ++        path: "two",
        ++        component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });

    it("should send to child trees", async (context) => {
        const tree = context.tree = createTree(grandchild);

        const before = await tree();
        
        tree.builder.broadcast("NEXT");

        const after = await waitForPath(tree, "grandchild.two");

        diff(before, after, `
        [
            [Object: null prototype] {
        Actual:
        --        path: "root.one",
        --        component: [Function: one],
        Expected:
        ++        path: "root.two",
        ++        component: [Function: two],
                props: false,
                children: []
            },
            [Object: null prototype] {
        Actual:
        --        path: "child.one",
        --        component: [Function: child-one],
        Expected:
        ++        path: "child.two",
        ++        component: [Function: child-two],
                props: false,
                children: []
            },
            [Object: null prototype] {
        Actual:
        --        path: "grandchild.one",
        --        component: [Function: grandchild-one],
        Expected:
        ++        path: "grandchild.two",
        ++        component: [Function: grandchild-two],
                props: false,
                children: []
            }
        ]`);
    });
});

describe("hasTag", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        assert.equal(tree.builder.hasTag("one"), true);
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        await tree();

        assert.equal(tree.builder.hasTag("one"), true);
        assert.equal(tree.builder.hasTag("child-one"), true);
    });
});

describe("matches", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(parallel);

        assert.equal(tree.builder.matches("one"), true);
        assert.equal(tree.builder.matches("one.one_one"), true);
        assert.equal(tree.builder.matches("one.one_one.one_one_one"), true);
        assert.equal(tree.builder.matches("one.one_one.one_one_two"), true);
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        await tree();

        assert.equal(tree.builder.matches("root.one"), true);
        assert.equal(tree.builder.matches("child.one"), true);
    });
});
