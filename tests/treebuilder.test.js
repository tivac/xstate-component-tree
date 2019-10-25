"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const { treeBuilder } = require("../src/treebuilder.js");

// TODO: figure out how to make this a function w/ a dynamic name
const component = (name) => name;

const asyncLoad = (name, delay = 0) =>
    () => new Promise((resolve) =>
        setTimeout(() => resolve(component(name)), delay)
    );

// Watch for a specific number of trees to be built and resolve
// a promise once that is hit, while also comparing each value to
// a snapshot for good measure
const trees = (service) => {
    let post;
    let received = 0;
    let times;
    let finished;

    treeBuilder(service, (tree) => {
        expect(tree).toMatchSnapshot();

        if(post) {
            post(tree);
        }
        
        if(++received >= times) {
            finished();
        }
    });

    return ({ count = 1, after } = false) => new Promise((resolve) => {
        received = 0;
        times = count;
        post = after;
        finished = resolve;
        
        if(!service.initialized) {
            service.start();
        }
    });
};

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

    it.todo("should rebuild on invoked state machine transitions");
    it.todo("should support nested invoked state machines");
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
                        load : asyncLoad("one"),
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
                        load : asyncLoad("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                load : asyncLoad("two", 16),
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
