import { createMachine } from "xstate";

import component from "../util/component.js";

const grandchild = createMachine({
    id      : "grandchild",
    initial : "grandchild",
    
    states : {
        grandchild : {
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("grandchild-one"),
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        component : component("grandchild-two"),
                    },
                },
            },
        },
    },
});


const child = createMachine({
    id      : "child",
    initial : "child",
    
    states : {
        child : {
            invoke : {
                id  : "grandchild",
                src : grandchild,
            },

            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("child-one"),
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        component : component("child-two"),
                    },
                },
            },
        },
    },
});

const root = createMachine({
    id      : "root",
    initial : "root",

    states : {
        root : {
            invoke : {
                id  : "child",
                src : child,
            },

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
        },
    },
});

export default root;
