"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");
const loadAsync = require("./util/async-loader.js");

describe("xstate-component-tree", () => {
    let tree;

    afterEach(() => {
        if(tree && tree.builder) {
            tree.builder.teardown();
        }

        tree = null;
    });
    
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

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        expect(await tree()).toMatchSnapshot();
    });
    
    it("should support async .load", async () => {
        const childMachine = createMachine({
            initial : "child",

            states : {
                child : {
                    meta : {
                        load : loadAsync(component("child")),
                    },
                },
            },
        });

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        expect(await tree()).toMatchSnapshot();
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

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        expect(await tree()).toMatchSnapshot();
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

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        expect(await tree()).toMatchSnapshot();
    });

    it("should not re-run load on parent/child machine transitions", async () => {
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

        const testMachine = createMachine({
            initial : "one",

            invoke : {
                id  : "child",
                src : childMachine,
                
                autoForward : true,
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

        const service = interpret(testMachine);

        tree = trees(service);

        await tree();

        expect(runs).toMatchSnapshot();

        runs = [];

        service.send("PARENT");
        
        await tree();

        expect(runs).toMatchSnapshot();

        runs = [];
        
        service.send("CHILD");
        
        await tree();

        expect(runs).toMatchSnapshot();
    });

    // TODO: How can this happen? It does in real apps, but haven't been able to write a test
    // for it yet 😬😬😬
    it.todo("should avoid re-running disposed children they send another update");
});
