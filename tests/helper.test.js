"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const trees = require("./util/trees.js");
const component = require("./util/component.js");
const helper = require("../src/component-helper.js");

describe("xstate-component-tree component helper", () => {
    let tree;

    afterEach(() => {
        if(tree && tree.builder) {
            tree.builder.teardown();
        }

        tree = null;
    });
    
    it("should return the same tree with or without the helper", async () => {
        const basic = createMachine({
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

        const sugar = createMachine({
            initial : "one",

            states : {
                one : helper(component("one"), {
                    initial : "two",

                    states : {
                        two : helper(component("two")),
                    },
                }),
            },
        });

        const b = interpret(basic);
        const s = interpret(sugar);

        const tb = trees(b);
        const ts = trees(s);

        expect(await tb()).toStrictEqual(await ts());
    });
});
