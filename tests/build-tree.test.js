"use strict";

const { Machine, interpret } = require("xstate");

const buildTree = require("../src/build-tree.js");

describe("xstate-component-tree", () => {
    it("should export a function by default", () => {
        expect(typeof buildTree).toBe("function");
    });

    it("should read a value from meta.component", async () => {
        const m = Machine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : "one",
                    },
                },
            },
        });

        const i = interpret(m);

        const out = await buildTree(i);

        expect(out).toMatchSnapshot();
    });

    it("should read values from meta.component", async () => {
        const m = Machine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : "one",
                    },

                    initial : "child",

                    states : {
                        child : {
                            meta : {
                                component : "child",
                            },
                        },
                    },
                },
            },
        });

        const i = interpret(m);

        const out = await buildTree(i);

        expect(out).toMatchSnapshot();
    });

    it("should read a value from meta.load", async () => {
        const m = Machine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => "one",
                    },
                },
            },
        });

        const i = interpret(m);

        const out = await buildTree(i);

        expect(out).toMatchSnapshot();
    });

    it("should read values from meta.component", async () => {
        const m = Machine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => "one",
                    },

                    initial : "child",

                    states : {
                        child : {
                            meta : {
                                load : () => "child",
                            },
                        },
                    },
                },
            },
        });

        const i = interpret(m);

        const out = await buildTree(i);

        expect(out).toMatchSnapshot();
    });

    it("should wait for all load() functions to resolve", async () => {
        const m = Machine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : () => "one",
                    },

                    initial : "child",

                    states : {
                        child : {
                            meta : {
                                load : () => "child",
                            },
                        },
                    },
                },
            },
        });

        const i = interpret(m);

        const out = await buildTree(i);

        expect(out).toMatchSnapshot();
    });
});
