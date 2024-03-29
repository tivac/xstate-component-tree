import { createMachine } from "../../util/trees.js";

const single = createMachine({
    initial : "one",
    id      : "single",

    states : {
        one : {
            tags : "one",

            on : {
                NEXT : "two",
            },
        },

        two : {
            tags : "two",

            on : {
                NEXT : "three",
            },
        },

        three : {
            tags : "three",
        },
    },
});

export default single;
