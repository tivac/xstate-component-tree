"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");
const loadAsync = require("./util/async-loader.js");

describe("xstate-component-tree", () => {
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

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
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

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
    });

    it("should support returning a component and props", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => [ component("one"), { props : true }],
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
    });
    
    it("should support async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : loadAsync(component("one")),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
    });

    it.each([
        [ "sync component & sync props", loadAsync([ component("one"), { props : true }]) ],
        [ "async component & sync props", loadAsync([ loadAsync(component("one"))(), { props : true }]) ],
        [ "sync component & async props", loadAsync([ component("one"), loadAsync({ props : true })() ]) ],
    ])("should support async .load methods that return: %s", async (name, load) => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load,
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const tree = trees(service);

        expect(await tree()).toMatchSnapshot();
    });

    it("should support nested async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : loadAsync(component("one")),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                load : loadAsync(component("two"), 16),
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

    it("should ignore stale trees if component loads hadn't completed", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const tree = trees(service);

        // Purposefully not awaiting this, it'll never resolve!
        tree();

        expect(await tree()).toMatchSnapshot();
    });

    it("should only call load when a state is entered", async () => {
        let runs = 0;
        
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        const tree = trees(service);

        await tree();

        expect(runs).toEqual(1);
        
        service.send("NEXT");
        
        await tree();

        expect(runs).toEqual(1);
    });
    
    // Skipped because, well, it doesn't support this ATM
    it.skip("should re-run load when a state is entered from an external self-transition", async () => {
        let runs = 0;
        
        const testMachine = createMachine({
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
                                NEXT : {
                                    target   : "child1",
                                    internal : false,
                                },
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const tree = trees(service);

        await tree();

        expect(runs).toEqual(1);
        
        service.send("NEXT");
        
        await tree();

        expect(runs).toEqual(2);
    });
});
