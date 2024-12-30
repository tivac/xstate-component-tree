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

        const { tree : one } = await tree();
        
        // API on instance
        tree.builder.broadcast({ type : "NEXT" });

        const { tree : two, extra } = await waitForPath(tree, "two");

        // API from extra
        extra.broadcast({ type : "NEXT" });

        const { tree : three } = await waitForPath(tree, "three");

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

        diff(two, three, `
        [
            [Object: null prototype] {
                machine: "single",
        Actual:
        --        path: "two",
        --        component: [Function: two],
        Expected:
        ++        path: "three",
        ++        component: [Function: three],
                props: false,
                children: []
            }
        ]`);
    });

    it.skip("should send to child trees", async (context) => {
        const tree = context.tree = createTree(grandchild);

        const { tree : one } = await tree();

        tree.builder.broadcast({ type : "NEXT" });

        const { tree : two, extra } = await waitForPath(tree, "grandchild.two");

        extra.broadcast({ type : "NEXT" });

        const { tree : three } = await waitForPath(tree, "grandchild.three");

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
                machine: "root.child.grandchild",
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

        diff(two, three, `
        [
            [Object: null prototype] {
                machine: "root",
        Actual:
        --        path: "root.two",
        --        component: [Function: two],
        Expected:
        ++        path: "root.three",
        ++        component: [Function: three],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "root.child",
        Actual:
        --        path: "child.two",
        --        component: [Function: child-two],
        Expected:
        ++        path: "child.three",
        ++        component: [Function: child-three],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "root.child.grandchild",
        Actual:
        --        path: "grandchild.two",
        --        component: [Function: grandchild-two],
        Expected:
        ++        path: "grandchild.three",
        ++        component: [Function: grandchild-three],
                props: false,
                children: []
            }
        ]`);
    });
});
