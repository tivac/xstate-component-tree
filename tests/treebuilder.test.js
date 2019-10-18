"use strict";

const { Machine, interpret } = require("xstate");

const treeBuilder = require("../src/index.js");

const Component = function() { };

describe("xstate-component-tree", () => {
    it("should return a tree of components", async () => {
        const testMachine = Machine({
            id : "test",

            initial : "one",

            states : {
                one : {
                    meta : {
                        component : Component,
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                component : Component,
                            },
            
                            initial : "one",
        
                            states : {
                                one : {
                                    meta : {
                                        component : Component,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            console.log(tree);
        });

        service.start();
        // service.send("NEXT");
    });

    it.skip("should support parallel states", () => {
        const testMachine = Machine({
            id : "test",

            type : "parallel",

            states : {
                one : {
                    id : "foo",
                    
                    meta : {
                        component : Component,
                    },
                },

                two : {
                    meta : {
                        component : Component,
                    },
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            console.log(tree);
        });

        service.start();
        // service.send("NEXT");
    });
    it.todo("should support holes");
    it.todo("should support invoked state machines");
    it.todo("should support deeply-nested invoked state machines");
});
