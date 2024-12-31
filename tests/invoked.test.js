import { fromCallback, fromPromise } from "xstate";
import describe from "./util/describe.js";
import { createTree, getTree, createMachine } from "./util/trees.js";
import component from "./util/component.js";
import { snapshot, diff } from "./util/snapshot.js";
import { treeTeardown } from "./util/context.js";

// eslint-disable-next-line no-empty-function
const NOOP = () => {};

describe("invoked machines", (it) => {
    it.after.each(treeTeardown);

    it("should support invoked child machines", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child"),
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
                        machine: "test.child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support invoked child machines with other invoked elements", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child"),
                    },
                },
            },
        });

        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    invoke : [
                        {
                            id  : "child",
                            src : childMachine,
                        },
                        {
                            id  : "fake",
                            src : fromCallback(NOOP),
                        },
                    ],
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test.child",
                path: "child",
                component: [Function: child],
                props: false,
                children: []
            }
        ]`);
    });


    it("should support root components in invoked child machines", async () => {
        const childMachine = createMachine({
            initial : "child",

            meta : {
                component : component("root"),
            },

            states : {
                child : {
                    meta : {
                        component : component("child"),
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
                        machine: "test.child",
                        path: false,
                        component: [Function: root],
                        props: false,
                        children: [
                            [Object: null prototype] {
                                machine: "test.child",
                                path: "child",
                                component: [Function: child],
                                props: false,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]`);
    });

    it("should support invoked child machines in a parallel state", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child"),
                    },
                },
            },
        });

        const { tree } = await getTree({
            type : "parallel",

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

                two : {
                    meta : {
                        component : component("two"),
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
                        machine: "test.child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
                    }
                ]
            },
            [Object: null prototype] {
                machine: "test",
                path: "two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });
    
    it("should support invoked child machines in a parallel state with root components", async () => {
        const childMachine = createMachine({
            initial : "child",
            
            meta : {
                component : component("child"),
            },

            states : {
                child : {},
            },
        });

        const { tree } = await getTree({
            type : "parallel",

            states : {
                one : {
                    invoke : {
                        id  : "child-one",
                        src : childMachine,
                    },
                },

                two : {
                    invoke : {
                        id  : "child-two",
                        src : childMachine,
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test.child-one",
                path: false,
                component: [Function: child],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "test.child-two",
                path: false,
                component: [Function: child],
                props: false,
                children: []
            }
        ]`);
    });

    [
        [ "promise", fromPromise(() => new Promise(NOOP)) ],
        [ "callback", fromCallback(NOOP) ],
    ].forEach(([ name, src ]) => {
        it(`should ignore non-statechart children (${name})`, async () => {
            const { tree } = await getTree({
                initial : "one",

                states : {
                    one : {
                        invoke : {
                            id : "child",
                            src,
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
                    children: []
                }
            ]`);
        });
    });
    
    it("should remove data once the invoked child machine is halted", async (context) => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child"),
                    },
                },
            },
        });

        const tree = context.tree = createTree({
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

        const { tree : before } = await tree();
        
        tree.send({ type : "NEXT" });
        
        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                machine: "test",
        Actual:
        --        path: "one",
        --        component: [Function: one],
        Expected:
        ++        path: "two",
        ++        component: [Function: two],
                props: false,
        Actual:
        --        children: [
        --            [Object: null prototype] {
        --                machine: "test.child",
        --                path: "child",
        --                component: [Function: child],
        --                props: false,
        --                children: []
        --            }
        --        ]
        Expected:
        ++        children: []
            }
        ]`);
    });

    it("should remove data once the invoked child machine is halted via onDone", async (context) => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child"),
                    },

                    on : {
                        NEXT : "done",
                    },
                },

                done : {
                    type : "final",
                },
            },
        });

        const tree = context.tree = createTree({
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id     : "child",
                        src    : childMachine,
                        onDone : "two",
                    },

                    meta : {
                        component : component("one"),
                    },
                },

                two : {
                    meta : {
                        component : component("two"),
                    },
                },
            },
        });

        const { tree : before } = await tree();
        
        tree.builder.broadcast({ type : "NEXT" });
        
        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                machine: "test",
        Actual:
        --        path: "one",
        --        component: [Function: one],
        Expected:
        ++        path: "two",
        ++        component: [Function: two],
                props: false,
        Actual:
        --        children: [
        --            [Object: null prototype] {
        --                machine: "test.child",
        --                path: "child",
        --                component: [Function: child],
        --                props: false,
        --                children: []
        --            }
        --        ]
        Expected:
        ++        children: []
            }
        ]`);
    });

    it("should rebuild on child machine transitions", async (context) => {
        const childMachine = createMachine({
            initial : "child1",

            states : {
                child1 : {
                    meta : {
                        component : component("child1"),
                    },

                    on : {
                        NEXT : "child2",
                    },
                },

                child2 : {
                    meta : {
                        component : component("child2"),
                    },
                },
            },
        });

        const tree = context.tree = createTree({
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

        const { tree : before } = await tree();
        
        tree.builder.broadcast({ type : "NEXT" });
        
        const { tree : after } = await tree();

        diff(before, after, `[
                [Object: null prototype] {
                    machine: "test",
                    path: "one",
                    component: [Function: one],
                    props: false,
                    children: [
                        [Object: null prototype] {
                            machine: "test.child",
            Actual:
            --                path: "child1",
            --                component: [Function: child1],
            Expected:
            ++                path: "child2",
            ++                component: [Function: child2],
                            props: false,
                            children: []
                        }
                    ]
                }
            ]`);
    });

    it("should rebuild on parent transitions", async (context) => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        component : component("child1"),
                    },
                },
            },
        });

        const tree = context.tree = createTree({
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

                    initial : "oneone",

                    states : {
                        oneone : {
                            meta : {
                                component : component("oneone"),
                            },

                            on : {
                                NEXT : "onetwo",
                            },
                        },

                        onetwo : {
                            meta : {
                                component : component("onetwo"),
                            },
                        },
                    },
                },
            },
        });

        const { tree : before } = await tree();

        tree.send({ type : "NEXT" });

        const { tree : after } = await tree();

        diff(before, after, `[
                [Object: null prototype] {
                    machine: "test",
                    path: "one",
                    component: [Function: one],
                    props: false,
                    children: [
                        [Object: null prototype] {
                            machine: "test",
            Actual:
            --                path: "one.oneone",
            --                component: [Function: oneone],
            Expected:
            ++                path: "one.onetwo",
            ++                component: [Function: onetwo],
                            props: false,
                            children: []
                        },
                        [Object: null prototype] {
                            machine: "test.child",
                            path: "child",
                            component: [Function: child1],
                            props: false,
                            children: []
                        }
                    ]
                }
            ]`);
    });

    it("should support nested invoked machines", async () => {
        const grandchildMachine = createMachine({
            initial : "grandchild",

            states : {
                grandchild : {
                    meta : {
                        component : component("grandchild"),
                    },
                },
            },
        });

        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    invoke : {
                        id  : "grandchild",
                        src : grandchildMachine,
                    },

                    meta : {
                        component : component("child"),
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
                        machine: "test.child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: [
                            [Object: null prototype] {
                                machine: "test.child.grandchild",
                                path: "grandchild",
                                component: [Function: grandchild],
                                props: false,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]`);
    });

    // TODO: requests one too many tree instances, never resolves, and crashes tests
    it("should rebuild on nested invoked machine transitions", async (context) => {
        const grandchildMachine = createMachine({
            initial : "grandchild1",

            states : {
                grandchild1 : {
                    meta : {
                        component : component("grandchild1"),
                    },

                    on : {
                        NEXT : "grandchild2",
                    },
                },

                grandchild2 : {
                    meta : {
                        component : component("grandchild2"),
                    },
                },
            },
        });

        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    invoke : {
                        id  : "grandchild",
                        src : grandchildMachine,
                    },

                    meta : {
                        component : component("child"),
                    },
                },
            },
        });

        const tree = context.tree = createTree({
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

        const { tree : before } = await tree();

        tree.builder.broadcast({ type : "NEXT" });
        
        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test.child",
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: [
                            [Object: null prototype] {
                                machine: "test.child.grandchild",
        Actual:
        --                        path: "grandchild1",
        --                        component: [Function: grandchild1],
        Expected:
        ++                        path: "grandchild2",
        ++                        component: [Function: grandchild2],
                                props: false,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]`);
    });

    it("should build a tree even when the child machine immediately fires a noop event", async () => {
        const childMachine = createMachine({
            initial : "one",

            // This invoke always fires an event immediately, but it doesn't cause a transition
            // so when _onState in the component tree instance is triggered changed is set to false,
            // even though the tree for that service has never been built. Added a check to ignore
            // changed and build anyways if it's the first time the service has been seen.
            invoke : [{
                id  : "invoke",
                src : fromCallback(({ sendBack }) => sendBack({ type : "ONE" })),
            }],

            states : {
                one : {
                    meta : {
                        component : component("child-one"),
                    },
                },
            },
        });

        const { tree } = await getTree({
            id      : "parent",
            initial : "one",

            states : {
                one : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "parent.child",
                path: "one",
                component: [Function: child-one],
                props: false,
                children: []
            }
        ]`);
    });
});
