"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const trees = require("./util/trees.js");
const component = require("./util/component.js");

describe("xstate-component-tree", () => {
    let tree;

    afterEach(() => {
        if(tree && tree.builder) {
            tree.builder.teardown();
        }

        tree = null;
    });
    
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

        tree = trees(service);

        expect(await tree()).toMatchSnapshot();
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

        tree = trees(service);

        expect(await tree()).toMatchSnapshot();
    });

    it.each([
        true,
        false,
    ])("should support nested parallel states (stable: %s)", async (stable) => {
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

        tree = trees(service, false, { stable });

        expect(await tree()).toMatchSnapshot();
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

        tree = trees(service);

        expect(await tree()).toMatchSnapshot();
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

        tree = trees(service);

        expect(await tree()).toMatchSnapshot();
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

        tree = trees(service);
        
        const before = await tree();
        
        service.send("NEXT");

        const after = await tree();

        expect(before).toMatchDiffSnapshot(after);
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

        tree = trees(service);
        
        await tree();

        service.send("NEXT");

        // onEvent was called twice, but treeBuilder returned on tree as expected
        expect(eventCounter.mock.calls.length).toBe(2);
    });

    it("should rebuild in a stable order (change before)", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        const before = await tree();
        
        service.send("NEXT");

        const after = await tree();

        expect(before).toMatchDiffSnapshot(after);
    });

    it("should rebuild in a stable order (change after)", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        tree = trees(service);
        
        const before = await tree();
        
        service.send("NEXT");

        const after = await tree();

        expect(before).toMatchDiffSnapshot(after);
    });

    it("should clean up after itself", async () => {
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

        const callback = jest.fn();
        
        tree = trees(service, callback);
        
        await tree();
        
        tree.builder.teardown();

        service.send("NEXT");

        expect(callback.mock.calls.length).toBe(1);
    });
});
