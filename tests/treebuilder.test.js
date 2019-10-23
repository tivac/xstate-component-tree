"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const { treeBuilder } = require("../src/treebuilder.js");

// TODO: figure out how to make this a function w/ a dynamic name
const component = (name) => name;

const asyncLoad = (name, delay = 0) =>
    () => new Promise((resolve) =>
        setTimeout(() => resolve(component(name)), delay)
    );

const wait = (service, responses = 1, after) => new Promise((resolve) => {
    const results = [];
    
    treeBuilder(service, (tree) => {
        results.push(tree);
        
        if(after) {
            after(tree);
        }
        
        if(results.length >= responses) {
            resolve(results.length === 1 ? results.pop() : results);
        }
   });
});

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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
    });
    
    // eslint-disable-next-line
    it.skip("should support invoked state machines", async () => {
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
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });


    it.todo("should rebuild on invoked state machine transitions");
    it.todo("should support nested invoked state machines");

    // eslint-disable-next-line
    it.skip("should rebuild on nested invoked state machine transitions", async () => {
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
                },
            },
        });

        const service = interpret(testMachine);

        service.start();

        await expect(wait(service, 1, () => service.send("NEXT"))).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service)).resolves.toMatchSnapshot();
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

        service.start();

        await expect(wait(service, 2, () => service.send("NEXT"))).resolves.toMatchSnapshot();
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
        service.start();

        await expect(wait(service, 1, () => service.send("NEXT"))).resolves.toMatchSnapshot();

        // onEvent was called twice, but treeBuilder only returned on tree as expected
        expect(eventCounter.mock.calls.length).toBe(2);
    });

    it("shouldn't trigger the callback if another change occurs before the tree is built", async () => {
        let loader;

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
        service.start();

        const result = wait(service);

        service.send("NEXT");

        await loader;

        await expect(result).resolves.toMatchSnapshot();

        // onEvent was called twice, but treeBuilder only returned on tree as expected
        expect(eventCounter.mock.calls.length).toBe(2);
    });
});
