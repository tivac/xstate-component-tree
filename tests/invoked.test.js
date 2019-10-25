"use strict";

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

            const states = trees(service);
            
            await states(2);
        });

        it("should rebuild on transitions", async () => {
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

            const states = trees(service);

            await states(2);

            service.send("NEXT");

            await states();
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

            const states = trees(service);

            await states(3);
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

            const states = trees(service);

            await states(3);

            service.send("NEXT");

            await states();
        });
    });
});
