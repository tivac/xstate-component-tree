import * as assert from "uvu/assert";
import { spy } from "nanospy";
import { createMachine, interpret } from "xstate";

import describe from "./util/describe.js";
import { getTree, createTree, trees } from "./util/trees.js";
import component from "./util/component.js";
import { treeTeardown } from "./util/context.js";
import { diff, snapshot } from "./util/snapshot.js";

describe("broadcast", (it) => {
    it.after.each(treeTeardown);
    
    it("should send to the root tree", async (context) => {
        const tree = createTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        component : component("two"),
                    },
                },
            },
        });

        context.tree = tree;

        const before = await tree();
        
        tree.builder.broadcast("NEXT");

        const after = await tree();

        diff(before, after, `[
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

    it.skip("should send to child trees", async (context) => {
        const grandchildOneMachine = createMachine({
            initial : "grandchild",

            states : {
                grandchild : {
                    meta : {
                        component : component("grandchild"),
                    },

                    on : {
                        NEXT : "next",
                    },
                },

                next : {
                    meta : {
                        component : component("grandchild-next"),
                    },
                },
            },
        });

        const childOneMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    invoke : {
                        id  : "grandchild-machine",
                        src : grandchildOneMachine,
                    },

                    meta : {
                        component : component("child"),
                    },

                    on : {
                        NEXT : "next",
                    },
                },

                next : {
                    meta : {
                        component : component("child-next"),
                    },
                },
            },
        });
        
        const tree = createTree({
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id  : "child-one-machine",
                        src : childOneMachine,
                    },

                    meta : {
                        component : component("one"),
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        component : component("two"),
                    },
                },
            },
        });

        context.tree = tree;

        const before = await tree();

        console.log(before);
        
        tree.builder.broadcast("NEXT");

        const after = await tree();

        diff(before, after, `[
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
});


describe("hasTag", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = createTree({
            initial : "one",

            states : {
                one : {
                    tags : "tag",
                    
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        context.tree = tree;

        assert.equal(tree.builder.hasTag("tag"), true);
    });

    it.skip("should check to child trees", async (context) => {});
});
