import * as assert from "uvu/assert";
import { spy } from "nanospy";
import { createActor } from "xstate";

import describe from "./util/describe.js";
import {
    getTree,
    createTree,
    trees,
    createMachine,
} from "./util/trees.js";
import component from "./util/component.js";
import { treeTeardown } from "./util/context.js";
import { diff, snapshot } from "./util/snapshot.js";
import child from "./api/specimens/child.js";

describe("basic functionality", (it) => {
    it.after.each(treeTeardown);
    
    it("should return a tree of components", async () => {
        const { tree } = await getTree({
            initial  : "one",

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
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
                        path: "one.two",
                        component: [Function: two],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });
    
    it("should return a tree of components including child machines", async () => {
        const { tree } = await getTree(child);

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "root",
                path: "root.one",
                component: [Function: one],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "root.#child",
                path: "child.one",
                component: [Function: child-one],
                props: false,
                children: []
            }
        ]`);
    });

    it("should support arrays of components", async () => {
        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : [
                            component("one"),
                            component("two"),
                        ],
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                component : [
                                    component("three"),
                                    component("four"),
                                ],
                            },
                        },
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [ [Function: one], [Function: two] ],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
                        path: "one.two",
                        component: [ [Function: three], [Function: four] ],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support components at the machine root", async () => {
        const { tree } = await getTree({
            initial : "one",

            meta : {
                component : component("root"),
            },

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: false,
                component: [Function: root],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
                        path: "one",
                        component: [Function: one],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should return state info and APIs", async () => {
        const { extra } = await getTree({
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

        assert.type(extra.state, "object");
        assert.type(extra.matches, "function");
        assert.type(extra.hasTag, "function");
        assert.type(extra.broadcast, "function");
    });

    it("should return a tree of components", async () => {
        const { tree } = await getTree({
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
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
                        path: "one.two",
                        component: [Function: two],
                        props: false,
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support props", async () => {
        const { tree } = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                        props     : {
                            fooga : 1,
                            booga : 2,
                        },
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                                props     : {
                                    wooga : 1,
                                    tooga : 2,
                                },
                            },
                        },
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: {
                    fooga: 1,
                    booga: 2
                },
                children: [
                    [Object: null prototype] {
                        machine: "test",
                        path: "one.two",
                        component: [Function: two],
                        props: {
                            wooga: 1,
                            tooga: 2
                        },
                        children: []
                    }
                ]
            }
        ]`);
    });

    it("should support parallel states", async () => {
        const { tree } = await getTree({
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
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: []
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

    it(`should support nested parallel states (stable: true)`, async () => {
        const { tree } = await getTree({
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
        }, { stable : true });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one.three",
                component: [Function: three],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "test",
                path: "one.two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });
    
    it(`should support nested parallel states (stable: false)`, async () => {
        const { tree } = await getTree({
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
        }, { stable : false });

        snapshot(tree, `[
            [Object: null prototype] {
                machine: "test",
                path: "one.two",
                component: [Function: two],
                props: false,
                children: []
            },
            [Object: null prototype] {
                machine: "test",
                path: "one.three",
                component: [Function: three],
                props: false,
                children: []
            }
        ]`);
    });
    
    it("should support arbitrary ids", async () => {
        const { tree } = await getTree({
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
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
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
        const { tree } = await getTree({
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
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: [
                    [Object: null prototype] {
                        machine: "test",
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

        const service = createActor(testMachine);
        const eventCounter = spy();

        service.subscribe(eventCounter);

        const tree = trees(service);

        context.tree = tree;

        await tree();

        tree.send({ type : "NEXT" });

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

        const { tree : before } = await tree();
        
        tree.send({ type : "NEXT" });

        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: []
        Expected:
        ++    },
        ++    [Object: null prototype] {
        ++        machine: "test",
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

        const { tree : before } = await tree();
        
        tree.send({ type : "NEXT" });

        const { tree : after } = await tree();

        diff(before, after, `[
            [Object: null prototype] {
                machine: "test",
                path: "one",
                component: [Function: one],
                props: false,
                children: []
        Expected:
        ++    },
        ++    [Object: null prototype] {
        ++        machine: "test",
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
        }, {}, callback);

        await tree();
        
        tree.builder.teardown();

        tree.send({ type : "NEXT" });

        assert.equal(callback.callCount, 1);
    });
});
