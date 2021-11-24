"use strict";

import describe from "./util/describe.js";
import { getTree } from "./util/trees.js";
import component from "./util/component.js";
import { snapshot } from "./util/snapshot.js";

describe("props", (it) => {
    it("should support static props", async () => {
        const tree = await getTree({
            initial : "one",

            states : {
                one : {
                    meta : {
                        component : component("one"),
                        props     : {
                            fooga : 1,
                            booga : 2,
                        },
                    },

                    initial : "two",

                    states : {
                        two : {
                            meta : {
                                component : component("two"),
                                props     : {
                                    wooga : 1,
                                    tooga : 2,
                                },
                            },
                        },
                    },
                },
            },
        });

        snapshot(tree, `[
            [Object: null prototype] {
                path: "one",
                component: [Function: one],
                props: {
                    fooga: 1,
                    booga: 2
                },
                children: [
                    [Object: null prototype] {
                        path: "one.two",
                        component: [Function: two],
                        props: {
                            wooga: 1,
                            tooga: 2
                        },
                        children: []
                    }
                ]
            }
        ]`);
    });
});
