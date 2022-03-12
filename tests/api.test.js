import * as assert from "uvu/assert";
import { createMachine } from "xstate";

import describe from "./util/describe.js";
import { createTree, waitForPath } from "./util/trees.js";
import component from "./util/component.js";
import { treeTeardown } from "./util/context.js";
import { diff } from "./util/snapshot.js";

describe("broadcast", (it) => {
    it.after.each(treeTeardown);
    
    it("should send to the root tree", async (context) => {
        const tree = context.tree = createTree({
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

        const before = await tree();
        
        tree.builder.broadcast("NEXT");

        const after = await waitForPath(tree, "two");

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

    it("should send to child trees", async (context) => {
        const childMachine = createMachine({
            initial : "child",
            
            states : {
                child : {
                    initial : "one",

                    states : {
                        one : {
                            meta : {
                                component : component("child-one"),
                            },
        
                            on : {
                                NEXT : "two",
                            },
                        },
        
                        two : {
                            meta : {
                                component : component("child-two"),
                            },
                        },
                    },
                },
            },
        });
        
        const tree = context.tree = createTree({
            id      : "root",
            initial : "root",

            states : {
                root : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

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
                },
            },
        });

        const before = await tree();
        
        tree.builder.broadcast("NEXT");

        const after = await waitForPath(tree, "child.two");

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
            }
        ]`);
    });
});

describe("hasTag", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree({
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

        assert.equal(tree.builder.hasTag("tag"), true);
    });

    it("should check child trees", async (context) => {
        const childMachine = createMachine({
            initial : "child",
            
            states : {
                child : {
                    tags : "child",
                },
            },
        });
        
        const tree = context.tree = createTree({
            id      : "root",
            initial : "root",

            states : {
                root : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    tags : "root",
                },
            },
        });

        await tree();

        assert.equal(tree.builder.hasTag("root"), true);
        assert.equal(tree.builder.hasTag("child"), true);
    });
});

describe("matches", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree({
            initial : "one",

            states : {
                one : {
                    initial : "two",

                    states : {
                        two : {
                            type : "parallel",
                            
                            states : {
                                three : {},
                                four  : {},
                            },
                        },
                    },
                },
            },
        });

        assert.equal(tree.builder.matches("one"), true);
        assert.equal(tree.builder.matches("one.two"), true);
        assert.equal(tree.builder.matches("one.two.three"), true);
        assert.equal(tree.builder.matches("one.two.four"), true);
    });

    it("should check child trees", async (context) => {
        const childMachine = createMachine({
            initial : "child",
            
            states : {
                child : {
                    tags : "child",
                },
            },
        });
        
        const tree = context.tree = createTree({
            id      : "root",
            initial : "root",

            states : {
                root : {
                    invoke : {
                        id  : "child",
                        src : childMachine,
                    },

                    tags : "root",
                },
            },
        });

        await tree();

        assert.equal(tree.builder.matches("root"), true);
        assert.equal(tree.builder.matches("child"), true);
    });
});
