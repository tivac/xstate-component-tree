import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree, waitForPath } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";
import { diff } from "../util/snapshot.js";

import single from "./specimens/single.js";
import child from "./specimens/child.js";

describe("send", (it) => {
    it.after.each(treeTeardown);

    it("should be a callable method", async (context) => {
        const tree = context.tree = createTree(single);

        assert.type(tree.builder.send, "function");
    });

    it("should send to the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        const { tree : one } = await tree();
        
        tree.builder.send("NEXT");

        const { tree : two } = await waitForPath(tree, "two");

        diff(one, two, `
        [
            [Object: null prototype] {
                machine: "single",
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

    it("should *not* send to child trees", async (context) => {
        const tree = context.tree = createTree(child);

        const { tree : one } = await tree();

        tree.builder.send("NEXT");

        const { tree : two } = await waitForPath(tree, "root.two");

        diff(one, two, `
        [
            [Object: null prototype] {
                machine: "root",
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
                machine: "root.child",
                path: "child.one",
                component: [Function: child-one],
                props: false,
                children: []
            }
        ]`);
    });
});
