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

            initial : "one_one",

            states : {
                one_one : {
                    type : "parallel",

                    states : {
                        one_one_one : {},
                        one_one_two : {},
                    },
                },
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
