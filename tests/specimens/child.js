import { createMachine } from "xstate";

import component from "../util/component.js";

const child = createMachine({
    id      : "child",
    initial : "child",
    
    states : {
        child : {
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("child-one"),
                    },

                    tags : "child-one",

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    tags : "child-two",

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

                    tags : "one",

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    tags : "two",

                    meta : {
                        component : component("two"),
                    },
                },
            },
        },
    },
});

export default root;
