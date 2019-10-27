"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");
const asyncLoad = require("./util/async-loader.js");

describe("xstate-component-tree", () => {
    describe("props", () => {
        it("should support static props", async () => {
            const testMachine = createMachine({
                initial : "one",
    
                states : {
                    one : {
                        meta : {
                            component : component("one"),
                            props     : {
                                fooga : 1,
                                booga : 2,
                            },
                        },
    
                        initial : "two",
    
                        states : {
                            two : {
                                meta : {
                                    component : component("two"),
                                    props     : {
                                        wooga : 1,
                                        tooga : 2,
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
        
        it("should support sync dynamic props", async () => {
            const testMachine = createMachine({
                initial : "one",
    
                states : {
                    one : {
                        meta : {
                            component : component("one"),
                            props     : () => ({
                                fooga : 1,
                                booga : 2,
                            }),
                        },
                    },
                },
            });
    
            const service = interpret(testMachine);
    
            const tree = trees(service);
    
            expect(await tree()).toMatchSnapshot();
        });

        it("should support async dynamic props", async () => {
            const testMachine = createMachine({
                initial : "one",
    
                states : {
                    one : {
                        meta : {
                            component : component("one"),
                            props     : asyncLoad({
                                fooga : 1,
                                booga : 2,
                            }),
                        },
                    },
                },
            });
    
            const service = interpret(testMachine);
    
            const tree = trees(service);
    
            expect(await tree()).toMatchSnapshot();
        });
        
        it("should pass context & event to dynamic props functions", async () => {
            const testMachine = createMachine({
                initial : "one",
                context : "context",
    
                states : {
                    one : {
                        meta : {
                            component : component("one"),
                            props     : (...args) => args,
                        },
                    },
                },
            });
    
            const service = interpret(testMachine);
    
            const tree = trees(service);
    
            expect(await tree()).toMatchSnapshot();
        });
    });
});
