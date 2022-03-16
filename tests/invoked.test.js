// eslint-disable-next-line no-empty-function
const NOOP = () => {};

import { createMachine } from "xstate";

import describe from "./util/describe.js";
import { createTree, getTree } from "./util/trees.js";
import component from "./util/component.js";
import { snapshot, diff } from "./util/snapshot.js";
import { treeTeardown } from "./util/context.js";

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
                        id  : "child-machine",
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
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
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
                        id  : "child-machine",
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
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: []
                    }
                ]
            },
            [Object: null prototype] {
                path: "two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });

    [
        [ "promise", () => new Promise(NOOP) ],
        [ "callback", () => NOOP ],
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
        
        tree.service.send("NEXT");
        
        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
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
                        
                        autoForward : true,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const { tree : before } = await tree();
        
        tree.service.send("NEXT");
        
        const { tree : after } = await tree();

        diff(before, after, `[
                [Object: null prototype] {
                    path: "one",
                    component: [Function: one],
                    props: false,
                    children: [
                        [Object: null prototype] {
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

        tree.service.send("NEXT");

        const { tree : after } = await tree();

        diff(before, after, `[
                [Object: null prototype] {
                    path: "one",
                    component: [Function: one],
                    props: false,
                    children: [
                        [Object: null prototype] {
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
                        id  : "grandchild-machine",
                        src : grandchildMachine,

                        autoForward : true,
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
                        id  : "child-machine",
                        src : childMachine,
                        
                        autoForward : true,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        path: "child",
                        component: [Function: child],
                        props: false,
                        children: [
                            [Object: null prototype] {
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

                        autoForward : true,
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
                        
                        autoForward : true,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const { tree : before } = await tree();

        tree.service.send("NEXT");
        
        const { tree : after } = await tree();

        diff(before, after, `[
                [Object: null prototype] {
                    path: "one",
                    component: [Function: one],
                    props: false,
                    children: [
                        [Object: null prototype] {
                            path: "child",
                            component: [Function: child],
                            props: false,
                            children: [
                                [Object: null prototype] {
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
});
