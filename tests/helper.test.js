"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const trees = require("./util/trees.js");
const component = require("./util/component.js");
const loadAsync = require("./util/async-loader.js");
const { component: helper } = require("../src/component-helper.js");

describe("xstate-component-tree component helper", () => {
    let tree;

    afterEach(() => {
        if(tree && tree.builder) {
            tree.builder.teardown();
        }

        tree = null;
    });

    it("should be a named export of the /helper entrypoint", () => {
        expect(typeof helper).toBe("function");
    });
    
    it.each([
        [ "basic component", component("one") ],
        [ "arrow function", () => component("one") ],
        [ "async arrow function", loadAsync(component("one")) ],
    ])("should return the same tree with or without the helper: %s", async (name, load) => {
        const basic = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const sugar = createMachine({
            initial : "one",

            states : {
                one : helper(load),
            },
        });

        const b = interpret(basic);
        const s = interpret(sugar);

        const tb = trees(b);
        const ts = trees(s);

        expect(await tb()).toStrictEqual(await ts());
    });
});
