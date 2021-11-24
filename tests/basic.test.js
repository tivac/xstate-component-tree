import * as assert from "uvu/assert";
import { spy } from "nanospy";
import { createMachine, interpret } from "xstate";

import describe from "./util/describe.js";
import { getTree, createTree, trees } from "./util/trees.js";
import component from "./util/component.js";
import { treeTeardown } from "./util/context.js";
import { diff, snapshot } from "./util/snapshot.js";

describe("basic functionality", (it) => {
    it.after.each(treeTeardown);
    
    it("should return a tree of components", async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                            },
                        },
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
                        path: "one.two",
                        component: [Function: two],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support parallel states", async () => {
        const tree = await getTree({
            type : "parallel",

            states : {
                one : {
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
                children: []
            },
            [Object: null prototype] {
                path: "two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });

    it(`should support nested parallel states (stable: true)`, async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    type : "parallel",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                            },
                        },
        
                        three : {
                            meta : {
                                component : component("three"),
                            },
                        },
                    },
                },
            },
        }, false, { stable : true });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one.three",
                component: [Function: three],
                props: false,
                children: []
            },
            [Object: null prototype] {
                path: "one.two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });
    
    it(`should support nested parallel states (stable: false)`, async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    type : "parallel",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                            },
                        },
        
                        three : {
                            meta : {
                                component : component("three"),
                            },
                        },
                    },
                },
            },
        }, false, { stable : false });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one.two",
                component: [Function: two],
                props: false,
                children: []
            },
            [Object: null prototype] {
                path: "one.three",
                component: [Function: three],
                props: false,
                children: []
            }
        ]`);
    });
    
    it("should support arbitrary ids", async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    id : "foo",

                    meta : {
                        component : component("one"),
                    },
                    
                    initial : "two",
                    
                    states : {
                        two : {
                            id : "bar",

                            meta : {
                                component : component("two"),
                            },
                        },
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
                        path: "one.two",
                        component: [Function: two],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support holes", async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            initial : "three",

                            states : {
                                three : {
                                    meta : {
                                        component : component("three"),
                                    },
                                },
                            },
                        },
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
                        path: "one.two.three",
                        component: [Function: three],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });
    
    it("should rebuild on machine transition", async (context) => {
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
        
        tree.send("NEXT");

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

    it("shouldn't rebuild on events without changes", async (context) => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);
        const eventCounter = spy();

        service.onEvent(eventCounter);

        const tree = trees(service);

        context.tree = tree;

        await tree();

        tree.send("NEXT");

        // onEvent was called twice, but treeBuilder returned one tree as expected
        assert.equal(eventCounter.callCount, 2);
    });

    it("should rebuild in a stable order (change before)", async (context) => {
        const tree = createTree({
            type : "parallel",

            states : {
                b : {
                    initial : "one",

                    on : {
                        NEXT : ".two",
                    },

                    states : {
                        one : {},

                        two : {
                            meta : {
                                component : component("b.two"),
                            },
                        },
                    },
                },

                one : {
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        context.tree = tree;

        const before = await tree();
        
        tree.send("NEXT");

        const after = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: false,
                children: []
        Expected:
        ++    },
        ++    [Object: null prototype] {
        ++        path: "b.two",
        ++        component: [Function: b.two],
        ++        props: false,
        ++        children: []
            }
        ]`);
    });

    it("should rebuild in a stable order (change after)", async (context) => {
        const tree = createTree({
            type : "parallel",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },
                },

                b : {
                    initial : "one",

                    on : {
                        NEXT : ".two",
                    },

                    states : {
                        one : {},

                        two : {
                            meta : {
                                component : component("b.two"),
                            },
                        },
                    },
                },
            },
        });

        context.tree = tree;

        const before = await tree();
        
        tree.send("NEXT");

        const after = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: false,
                children: []
        Expected:
        ++    },
        ++    [Object: null prototype] {
        ++        path: "b.two",
        ++        component: [Function: b.two],
        ++        props: false,
        ++        children: []
            }
        ]`);
    });

    it("should clean up after itself", async () => {
        const callback = spy();

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
        }, callback);

        await tree();
        
        tree.builder.teardown();

        tree.send("NEXT");

        assert.equal(callback.callCount, 1);
    });
});
