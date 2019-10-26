"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");
const loadAsync = require("./util/async-loader.js");

describe("xstate-component-tree", () => {
    describe("invoked machines using .load", () => {
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

            const tree = trees(service);
            
            await tree();
            
            expect(await tree()).toMatchSnapshot();
        });
        
        it("should support async .load", async () => {
            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        meta : {
                            load : loadAsync("child"),
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

            const tree = trees(service);
            
            await tree();
            
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

            const tree = trees(service);
            
            await tree();
            
            expect(await tree()).toMatchSnapshot();
        });
    });
});
