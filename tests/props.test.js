"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const trees = require("./util/trees.js");
const component = require("./util/component.js");

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
    });
});
