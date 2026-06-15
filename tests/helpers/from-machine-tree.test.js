import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createMachine } from "xstate";

import component from "../util/component.js";
import { deferred } from "../util/async.js";

import { fromMachine } from "../../src/from-machine.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";
import { snapshot } from "../util/snapshot.js";

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
            initial : "initial",
            states : {
                initial : {
                    invoke : {
                        id : "async-child",
                        src : fromMachine(() => deferredChild),
                    },

                    on : {
                        NEXT : "next",
                    },
                },
                next : {},
            },
        });

        deferredChild.resolve(childMachine);

        const { tree : result1 } = await tree();

        snapshot(result1, `[
            [Object: null prototype] {
                machine: "parent.#async-child",
                path: "active",
                component: [Function: Child],
                props: false,
                children: []
            }
        ]`);

        tree.service.send({ type : "NEXT" });

        const { tree : result2 } = await tree();

        snapshot(result2, `[]`);
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
                    meta : {
                        component : component("Parent"),
                    },

                    invoke : {
                        id : "async-child",
                        src : fromMachine(async () => childMachine),
                    },
                },
            },
        });

        deferredGrandChild.resolve(grandChildMachine);

        const { tree : result } = await tree();

        snapshot(result, `[
            [Object: null prototype] {
                machine: "parent",
                path: "loading",
                component: [Function: Parent],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "parent.#async-child",
                        path: "active",
                        component: [Function: Child],
                        props: false,
                        children: [
                            [Object: null prototype] {
                                machine: "parent.#async-child.#nested",
                                path: "active",
                                component: [Function: GrandChild],
                                props: false,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]`);
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

        snapshot(first, `[
            [Object: null prototype] {
                machine: "parent",
                path: "loading",
                component: [Function: Parent],
                props: false,
                children: []
            }
        ]`);

        deferredChild.resolve(childMachine);

        const { tree : second } = await tree();

        snapshot(second, `[
            [Object: null prototype] {
                machine: "parent",
                path: "loading",
                component: [Function: Parent],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "parent.#async-child",
                        path: "active",
                        component: [Function: Child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("updates tree after re-entering state", async (context) => {
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
            initial : "component",
            states : {
                component : {
                    meta : {
                        component : component("Parent"),
                    },

                    invoke : {
                        id : "async-child",
                        src : fromMachine(() => deferredChild),
                    },

                    on : {
                        NEXT : "other",
                    },
                },

                other : {
                    on : {
                        NEXT : "component",
                    },
                },
            },
        });

        await tree();
        
        deferredChild.resolve(childMachine);

        const { tree : first } = await tree();

        snapshot(first, `[
            [Object: null prototype] {
                machine: "parent",
                path: "component",
                component: [Function: Parent],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "parent.#async-child",
                        path: "active",
                        component: [Function: Child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);

        tree.builder.send({ type : "NEXT" });

        await tree();

        tree.builder.send({ type : "NEXT" });

        const { tree : second } = await tree();

        snapshot(second, `[
            [Object: null prototype] {
                machine: "parent",
                path: "component",
                component: [Function: Parent],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "parent.#async-child",
                        path: "active",
                        component: [Function: Child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
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
