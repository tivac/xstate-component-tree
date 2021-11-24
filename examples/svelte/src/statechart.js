import { createMachine, interpret } from "xstate";

import Home from "./Home.svelte";
import One from "./One.svelte";

const statechart = createMachine({
    initial : "home",

    states : {
        home : {
            meta : {
                component : Home,
            },

            on : {
                NAV : "other",
            },

            initial : "one",

            states : {
                one : {
                    meta : {
                        component : One,
                    },

                    on : {
                        NEXT : "two",
                    },
                },

                two : {
                    meta : {
                        load : () => [ import("./two.svelte") ],
                    },

                    on : {
                        NEXT : "one",
                    },
                },
            },
        },

        other : {
            meta : {
                load : () => [ import("./other.svelte") ],
            },

            on : {
                NAV : "home",
            },
        },
    },
});

const service = interpret(statechart);

export default service;
