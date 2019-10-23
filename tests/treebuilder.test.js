"use strict";

const { Machine : createMachine, interpret } = require("xstate");

const treeBuilder = require("../src/treebuilder.js");

// TODO: figure out how to make this a function w/ a dynamic name
const component = (name) => name;

const asyncLoad = (name, delay = 0) =>
    () => new Promise((resolve) =>
        setTimeout(() => resolve(component(name)), delay)
    );

describe("xstate-component-tree", () => {
    it("should return a tree of components", async () => {
        const testMachine = createMachine({
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

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });

    it("should support parallel states", () => {
        const testMachine = createMachine({
            type : "parallel",

            states : {
                one : {
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

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });

    it("should support nested parallel states", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    type : "parallel",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                            },
                        },
        
                        three : {
                            meta : {
                                component : component("three"),
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });

    it("should support arbitrary ids", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    id : "foo",

                    meta : {
                        component : component("one"),
                    },
                    
                    initial : "two",
                    
                    states : {
                        two : {
                            id : "bar",

                            meta : {
                                component : component("two"),
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });

    it("should support holes", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            initial : "three",

                            states : {
                                three : {
                                    meta : {
                                        component : component("three"),
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
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });
    
    it.todo("should support invoked state machines");
    it.todo("should support deeply-nested invoked state machines");
    
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

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
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

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });

        service.start();
    });
    
    it("should support async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : asyncLoad("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const result = new Promise((resolve) =>
            treeBuilder(service, (tree) => {
                resolve(tree);
            })
        );

        service.start();

        await expect(result).resolves.toMatchSnapshot();
    });

    it("should support nested async .load methods", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : asyncLoad("one"),
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                load : asyncLoad("two", 16),
                            },
                        },
                    },
                },
            },
        });

        const service = interpret(testMachine);

        const result = new Promise((resolve) =>
            treeBuilder(service, (tree) => {
                resolve(tree);
            })
        );

        service.start();

        await expect(result).resolves.toMatchSnapshot();
    });

    it("should rebuild on machine transition", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
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

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
            
            service.send("NEXT");
        });

        service.start();
    });

    it("shouldn't rebuild on events without changes", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                    },
                },
            },
        });

        const service = interpret(testMachine);

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
            service.send("NEXT");
        });

        service.start();
    });

    it("shouldn't trigger the callback if another change occurs before the tree is built", async () => {
        const testMachine = createMachine({
            initial : "one",

            states : {
                one : {
                    meta : {
                        load : asyncLoad("one"),
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

        treeBuilder(service, (tree) => {
            expect(tree).toMatchSnapshot();
        });
        
        service.start();
        service.send("NEXT");
    });
});
