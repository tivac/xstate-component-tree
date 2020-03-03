"use strict";

// eslint-disable-next-line no-empty-function
const NOOP = () => {};

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");

describe("xstate-component-tree", () => {
    describe("invoked child machines", () => {
        it("should be supported", async () => {
            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        meta : {
                            component : component("child"),
                        },
                    },
                },
            });

            const testMachine = createMachine({
                initial : "one",

                states : {
                    one : {
                        invoke : {
                            id  : "child-machine",
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
            
            // Root built
            await tree();
            
            // Child built
            expect(await tree()).toMatchSnapshot();
        });

        it("should be supported in a parallel state", async () => {
            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        meta : {
                            component : component("child"),
                        },
                    },
                },
            });

            const testMachine = createMachine({
                type : "parallel",

                states : {
                    one : {
                        invoke : {
                            id  : "child-machine",
                            src : childMachine,
                        },

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
            
            // Root built
            await tree();

            // Child built
            expect(await tree()).toMatchSnapshot();
        });

        it.each([
            [ "promise", () => new Promise(NOOP) ],
            [ "callback", () => NOOP ],
        ])("should ignore non-statechart children (%s)", async (name, src) => {
            const testMachine = createMachine({
                initial : "one",

                states : {
                    one : {
                        invoke : {
                            id : "child",
                            src,
                        },

                        meta : {
                            component : component("one"),
                        },
                    },
                },
            });

            const service = interpret(testMachine);

            const tree = trees(service);
            
            // Root built
            expect(await tree()).toMatchSnapshot();
        });
        
        it("should remove data once the invoke is halted", async () => {
            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        meta : {
                            component : component("child"),
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
            
            // Root built
            await tree();
            
            // Child built
            const before = await tree();
            
            service.send("NEXT");
            
            // Root rebuilt
            const after = await tree();

            expect(before).toMatchDiffSnapshot(after);
        });

        it("should rebuild on child transitions", async () => {
            const childMachine = createMachine({
                initial : "child1",

                states : {
                    child1 : {
                        meta : {
                            component : component("child1"),
                        },

                        on : {
                            NEXT : "child2",
                        },
                    },

                    child2 : {
                        meta : {
                            component : component("child2"),
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
                            
                            autoForward : true,
                        },

                        meta : {
                            component : component("one"),
                        },
                    },
                },
            });

            const service = interpret(testMachine);

            const tree = trees(service);

            // Root built
            await tree();

            // Child built
            const before = await tree();
            
            service.send("NEXT");
            
            // Child rebuilt
            const after = await tree();

            expect(before).toMatchDiffSnapshot(after);
        });

        it("should rebuild on parent transitions", async () => {
            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        meta : {
                            component : component("child1"),
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

                        initial : "oneone",

                        states : {
                            oneone : {
                                meta : {
                                    component : component("oneone"),
                                },

                                on : {
                                    NEXT : "onetwo",
                                },
                            },

                            onetwo : {
                                meta : {
                                    component : component("onetwo"),
                                },
                            },
                        },
                    },
                },
            });

            const service = interpret(testMachine);

            const tree = trees(service);

            // Root built
            await tree();

            // Child built
            const before = await tree();

            service.send("NEXT");

            // Root rebuilt
            const after = await tree();

            expect(before).toMatchDiffSnapshot(after);
        });

        it("should support nested invoked machines", async () => {
            const grandchildMachine = createMachine({
                initial : "grandchild",

                states : {
                    grandchild : {
                        meta : {
                            component : component("grandchild"),
                        },
                    },
                },
            });

            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        invoke : {
                            id  : "grandchild-machine",
                            src : grandchildMachine,

                            autoForward : true,
                        },

                        meta : {
                            component : component("child"),
                        },
                    },
                },
            });

            const testMachine = createMachine({
                initial : "one",

                states : {
                    one : {
                        invoke : {
                            id  : "child-machine",
                            src : childMachine,
                            
                            autoForward : true,
                        },

                        meta : {
                            component : component("one"),
                        },
                    },
                },
            });

            const service = interpret(testMachine);

            const tree = trees(service);

            // Root built
            await tree();

            // Child built
            await tree();

            // Grandchild built
            expect(await tree()).toMatchSnapshot();
        });

        it("should rebuild on nested invoked machine transitions", async () => {
            const grandchildMachine = createMachine({
                initial : "grandchild1",

                states : {
                    grandchild1 : {
                        meta : {
                            component : component("grandchild1"),
                        },

                        on : {
                            NEXT : "grandchild2",
                        },
                    },

                    grandchild2 : {
                        meta : {
                            component : component("grandchild2"),
                        },
                    },
                },
            });

            const childMachine = createMachine({
                initial : "child",

                states : {
                    child : {
                        invoke : {
                            id  : "grandchild",
                            src : grandchildMachine,

                            autoForward : true,
                        },

                        meta : {
                            component : component("child"),
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
                            
                            autoForward : true,
                        },

                        meta : {
                            component : component("one"),
                        },
                    },
                },
            });

            const service = interpret(testMachine);

            const tree = trees(service);

            // Root built
            await tree();

            // Child built
            await tree();
            
            // Grandchild built
            const before = await tree();

            service.send("NEXT");
            
            // Grandchild rebuilt
            const after = await tree();

            expect(before).toMatchDiffSnapshot(after);
        });
    });

    it.todo("should not re-run load on parent transitions");
    it.todo("should not re-run load on child transitions");
});
