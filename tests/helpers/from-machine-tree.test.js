import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createMachine } from "xstate";

import component from "../util/component.js";
import { deferred } from "../util/async.js";

import { fromMachine } from "../../src/from-machine.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

const containsComponent = (tree, name) =>
    tree.some((node) =>
        node.component?.name === name ||
        containsComponent(node.children || [], name),
    );

describe("from-machine component-tree integration", () => {
    afterEach(treeTeardown);

    it("adds components from a machine loaded with fromMachine()", async (context) => {
        const childMachine = createMachine({
            initial : "active",
            states : {
                active : {
                    meta : {
                        component : component("Child"),
                    },
                },
            },
        });

        const deferredChild = deferred();

        const tree = context.tree = createTree({
            id : "parent",
            initial : "loading",
            states : {
                loading : {
                    invoke : {
                        id : "async-child",
                        src : fromMachine(() => deferredChild),
                    },
                },
            },
        });

        deferredChild.resolve(childMachine);

        const { tree : result } = await tree();

        assert.equal(containsComponent(result, "Child"), true);
    });

    it("traverses nested machines loaded with fromMachine()", async (context) => {
        const grandChildMachine = createMachine({
            initial : "active",
            states : {
                active : {
                    meta : {
                        component : component("GrandChild"),
                    },
                },
            },
        });

        const deferredGrandChild = deferred();

        const childMachine = createMachine({
            initial : "active",
            states : {
                active : {
                    meta : {
                        component : component("Child"),
                    },
                    invoke : {
                        id : "nested",
                        src : fromMachine(() => deferredGrandChild),
                    },
                },
            },
        });

        const tree = context.tree = createTree({
            id : "parent",
            initial : "loading",
            states : {
                loading : {
                    invoke : {
                        id : "async-child",
                        src : fromMachine(async () => childMachine),
                    },
                },
            },
        });

        deferredGrandChild.resolve(grandChildMachine);

        const { tree : result } = await tree();

        assert.equal(containsComponent(result, "Child"), true);
        assert.equal(containsComponent(result, "GrandChild"), true);
    });

    it("updates tree after async child loads", async (context) => {
        const childMachine = createMachine({
            initial : "active",
            states : {
                active : {
                    meta : {
                        component : component("Child"),
                    },
                },
            },
        });

        const deferredChild = deferred();

        const tree = context.tree = createTree({
            id : "parent",
            initial : "loading",
            states : {
                loading : {
                    meta : {
                        component : component("Parent"),
                    },
                    invoke : {
                        id : "async-child",
                        src : fromMachine(() => deferredChild),
                    },
                },
            },
        });

        const { tree : first } = await tree();

        assert.equal(containsComponent(first, "Parent"), true);

        deferredChild.resolve(childMachine);

        const { tree : second } = await tree();

        assert.equal(containsComponent(second, "Child"), true);
    });

    it("supports hasTag() with machines loaded via fromMachine()", async (context) => {
        const Tagged = component("Tagged");

        const childMachine = createMachine({
            initial : "active",

            states : {
                active : {
                    tags : "visible",

                    meta : {
                        component : Tagged,
                    },
                },
            },
        });

        const tree = context.tree = createTree({
            id : "parent",
            initial : "loading",

            states : {
                loading : {
                    invoke : {
                        id : "async-child",
                        src : fromMachine(async () => {
                            await Promise.resolve();

                            return childMachine;
                        }),
                    },
                },
            },
        });

        const { extra } = await tree();

        assert.ok(tree.builder.hasTag("visible"));
        assert.ok(extra.hasTag("visible"));
    });
});
