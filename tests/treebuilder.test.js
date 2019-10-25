"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");
const loadAsync = require("./util/async-loader.js");

describe("xstate-component-tree", () => {
    it("should return a tree of components", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should support parallel states", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should support nested parallel states", async () => {
        const testMachine = createMachine({
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
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should support arbitrary ids", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should support holes", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });
    
    it("should support invoked state machines", async () => {
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

        const states = trees(service);
        
        await states(2);
    });

    it("should rebuild on invoked state machine transitions", async () => {
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

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states(2);

        service.send("NEXT");

        await states();
    });

    it("should support nested invoked state machines", async () => {
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

                        autoForward : true,
                    },

                    meta : {
                        component : component("child"),
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
                        
                        autoForward : true,
                    },

                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states(3);
    });

    it.todo("should pass child machine context & events to load fns");

    it("should rebuild on nested invoked state machine transitions", async () => {
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

        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);

        await states(3);

        service.send("NEXT");

        await states();
    });
    
    it("should support sync .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => component("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });
    
    it("should pass context and event params to .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",
            context : "context",

            states : {
                one : {
                    meta : {
                        load : (ctx, event) => ({ ctx, event }),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });
    
    it("should support async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : loadAsync("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should support nested async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : loadAsync("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                load : loadAsync("two", 16),
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const states = trees(service);

        await states();
    });

    it("should rebuild on machine transition", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const states = trees(service);
        
        await states();
        
        service.send("NEXT");

        await states();
    });

    it("shouldn't rebuild on events without changes", async () => {
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
        const eventCounter = jest.fn();

        service.onEvent(eventCounter);

        const states = trees(service);
        
        await states();

        service.send("NEXT");

        // onEvent was called twice, but treeBuilder returned on tree as expected
        expect(eventCounter.mock.calls.length).toBe(2);
    });

    // o god broked
    it.skip("shouldn't trigger the callback if another change occurs before the tree is built", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => {
                            loader = new Promise((resolve) =>
                                setTimeout(() => resolve(component("one")), 0)
                            );

                            return loader;
                        },
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

        const service = interpret(testMachine);
        const eventCounter = jest.fn();

        service.onEvent(eventCounter);

        const states = trees(service);

        const loader = states();

        service.send("NEXT");

        await loader;

        // onEvent was called twice, but treeBuilder returned on tree as expected
        expect(eventCounter.mock.calls.length).toBe(2);
    });

    it.todo("should support top-level machine ids in the built tree");
});
