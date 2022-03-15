import describe from "../util/describe.js";
import { createTree, waitForPath } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";
import { diff } from "../util/snapshot.js";

import single from "./specimens/single.js";
import grandchild from "./specimens/grandchild.js";

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
