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
                        load : loadAsync("one"),
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
});
