import { Machine as createMachine } from "xstate";

import Home from "./Home.svelte";
import One from "./One.svelte";

const statechart = createMachine({
    initial : "home",

    states : {
        home : {
            meta : {
                component : Home,
            },

            initial : "one",

            states : {
                one : {
                    meta : {
                        component : One,
                    },
                },
            },
        },
    },
});

export default statechart;
