import * as assert from "uvu/assert";

import describe from "./util/describe.js";
import { getTree, createTree, createMachine } from "./util/trees.js";
import component from "./util/component.js";
import { asyncLoad } from "./util/async.js";
import { treeTeardown } from "./util/context.js";
import { snapshot } from "./util/snapshot.js";

describe(".load in invoked machines", (it) => {
    it.after.each(treeTeardown);
    
    it("should support sync .load", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        load : () => component("child"),
                    },
                },
            },
        });

        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test.#child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });
    
    it("should support async .load", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        load : asyncLoad(component("child")),
                    },
                },
            },
        });

        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test.#child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support returning a component and props", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        load : () => [ component("child"), { props : true }],
                    },
                },
            },
        });

        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test.#child",
                        path: "child",
                        component: [Function: child],
                        props: {
                            props: true
                        },
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should pass child machine context & events to load fns", async () => {
        const childMachine = createMachine({
            initial : "child",

            context : "child context",

            states : {
                child : {
                    meta : {
                        load : (ctx, event) => ({ ctx, event }),
                    },
                },
            },
        });

        const { tree } = await getTree({
            initial : "one",

            context : "parent context",

            states : {
                one : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test.#child",
                        path: "child",
                        component: {
                            ctx: "child context",
                            event: undefined
                        },
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should not re-run load on parent/child machine transitions", async (context) => {
        let runs = [];
        
        const childMachine = createMachine({
            initial : "child1",

            states : {
                child1 : {
                    meta : {
                        load : () => {
                            runs.push("child1");

                            return component("child1");
                        },
                    },

                    on : {
                        CHILD : "child2",
                    },
                },
                
                child2 : {
                    meta : {
                        load : () => {
                            runs.push("child2");

                            return component("child2");
                        },
                    },
                },
            },
        });

        const tree = createTree({
            initial : "one",

            invoke : {
                id  : "child",
                src : childMachine,
            },

            states : {
                one : {
                    meta : {
                        load : () => {
                            runs.push("one");

                            return component("one");
                        },
                    },

                    on : {
                        PARENT : "two",
                    },
                },

                two : {
                    meta : {
                        load : () => {
                            runs.push("two");

                            return component("two");
                        },
                    },
                },
            },
        });

        context.tree = tree;

        await tree();

        assert.equal(runs, [
            "child1",
            "one",
        ]);

        runs = [];

        tree.builder.broadcast({ type : "PARENT" });
        
        await tree();

        assert.equal(runs, [
            "two",
        ]);

        runs = [];
        
        tree.builder.broadcast({ type : "CHILD" });
        
        await tree();

        assert.equal(runs, [
            "child2",
        ]);
    });

    // TODO: How can this happen? It does in real apps, but haven't been able to write a test
    // for it yet 😬😬😬
    // it.todo("should avoid re-running disposed children they send another update");
});
