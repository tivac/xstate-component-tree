import * as assert from "uvu/assert";

import describe from "./util/describe.js";
import component from "./util/component.js";
import { asyncLoad } from "./util/async.js";
import { getTree, createTree } from "./util/trees.js";
import { snapshot } from "./util/snapshot.js";
import { treeTeardown } from "./util/context.js";

describe(".load support", (it) => {
    it.after.each(treeTeardown);

    it("should support sync .load methods", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : () => component("one"),
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
    
    it("should pass context and event params to .load methods", async () => {
        const tree = await getTree({
            initial : "one",
            context : "context",
            states  : {
                one : {
                    meta : {
                        load : (ctx, event) => ({ ctx, event }),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: {
                    ctx: "context",
                    event: {
                        type: "xstate.init"
                    }
                },
                props: false,
                children: []
            }
        ]`);
    });

    it("should support returning a component and props", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : () => [ component("one"), { props : true }],
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: {
                    props: true
                },
                children: []
            }
        ]`);
    });
    
    it("should support async .load methods", async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : asyncLoad(component("one")),
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

    it("should supprt async.load returning: sync component & sync props", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : asyncLoad([ component("one"), { props : true }]),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: {
                    props: true
                },
                children: []
            }
        ]`);
    });
    
    it("should supprt async.load returning: async component & sync props", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : asyncLoad([ asyncLoad(component("one"))(), { props : true }]),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: {
                    props: true
                },
                children: []
            }
        ]`);
    });
    
    it("should supprt async.load returning: sync component & async props", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : asyncLoad([ component("one"), asyncLoad({ props : true })() ]),
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: {
                    props: true
                },
                children: []
            }
        ]`);
    });

    it("should support nested async .load methods", async () => {
        const tree = await getTree({
            initial : "one",
            states  : {
                one : {
                    meta : {
                        load : asyncLoad(component("one")),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                load : asyncLoad(component("two"), 16),
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

    it("should ignore stale trees if component loads hadn't completed", async (context) => {
        context.tree = createTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        // whoops never resolves!
                        // eslint-disable-next-line no-empty-function
                        load : () => new Promise(() => {}),
                    },

                    after : {
                        100 : "two",
                    },
                },

                two : {
                    meta : {
                        component : component("two"),
                    },
                },
            },
        });

        // Purposefully not awaiting this, it'll never resolve!
        context.tree();

        snapshot(await context.tree(), `[
            [Object: null prototype] {
                path: "two",
                component: [Function: two],
                props: false,
                children: []
            }
        ]`);
    });

    it("should only call load when a state is entered", async (context) => {
        let runs = 0;
        
        context.tree = createTree({
            initial : "one",
            context : "context",

            states : {
                one : {
                    initial : "child1",

                    meta : {
                        load : () => {
                            ++runs;

                            return component("one");
                        },
                    },

                    states : {
                        child1 : {
                            on : {
                                NEXT : "child2",
                            },
                        },

                        child2 : {},
                    },
                },
            },
        });

        await context.tree();

        assert.equal(runs, 1);
        
        context.tree.send("NEXT");
        
        await context.tree();

        assert.equal(runs, 1);
    });

    it("should re-run load functions when transitioning back to a state", async (context) => {
        let runs = [];
        
        context.tree = createTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => {
                            runs.push("one");

                            return component("one");
                        },
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        load : () => {
                            runs.push("two");

                            return component("two");
                        },
                    },

                    on : {
                        NEXT : "one",
                    },
                },
            },
        });

        await context.tree();

        assert.equal(runs, [
            "one",
        ]);

        runs = [];

        context.tree.send("NEXT");
        
        await context.tree();

        assert.equal(runs, [
            "two",
        ]);

        runs = [];
        
        context.tree.send("NEXT");
        
        await context.tree();

        assert.equal(runs, [
            "one",
        ]);
    });

    it("should allow the caching to be disabled globally", async (context) => {
        let runs = [];
        
        const tree = createTree({
            initial : "one",

            states : {
                one : {
                    initial : "oneone",

                    meta : {
                        load : () => {
                            runs.push("one");

                            return component("one");
                        },
                    },

                    states : {
                        oneone : {
                            on : {
                                NEXT : "onetwo",
                            },

                            meta : {
                                load : () => {
                                    runs.push("oneone");
        
                                    return component("oneone");
                                },
                            },
                        },

                        onetwo : {},
                    },
                },
            },
        }, false, { cache : false });

        context.tree = tree;

        await tree();

        assert.equal(runs, [
            "one",
            "oneone",
        ]);

        runs = [];

        tree.send("NEXT");
        
        await tree();

        assert.equal(runs, [
            "one",
        ]);
    });
    
    it("should allow the caching to be disabled locally", async (context) => {
        let runs = [];
        
        const tree = createTree({
            initial : "one",

            states : {
                one : {
                    initial : "oneone",

                    meta : {
                        cache : false,
                        load  : () => {
                            runs.push("one");

                            return component("one");
                        },
                    },

                    states : {
                        oneone : {
                            on : {
                                NEXT : "onetwo",
                            },

                            meta : {
                                load : () => {
                                    runs.push("oneone");
        
                                    return component("oneone");
                                },
                            },
                        },

                        onetwo : {},
                    },
                },
            },
        });

        context.tree = tree;

        await tree();

        assert.equal(runs, [
            "one",
            "oneone",
        ]);

        runs = [];

        tree.send("NEXT");
        
        await tree();

        assert.equal(runs, [
            "one",
        ]);
    });
});
