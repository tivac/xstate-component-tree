"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");

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

        const tree = trees(service);

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

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
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

        const tree = trees(service);

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

        const tree = trees(service);

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

        const tree = trees(service);

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

        const tree = trees(service);
        
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

        const tree = trees(service);
        
        await tree();

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
