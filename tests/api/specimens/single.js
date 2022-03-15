import { createMachine } from "xstate";

import component from "../../util/component.js";

const single = createMachine({
    initial : "one",
    id      : "single",

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
            meta : {
                component : component("two"),
            },

            tags : "two",
        },
    },
});

export default single;
