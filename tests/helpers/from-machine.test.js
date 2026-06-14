import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createActor,
    createMachine,
    sendParent,
    sendTo,
    waitFor,
} from "xstate";

import { fromMachine } from "../../src/from-machine.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";
import { deferred } from "../util/async.js";

describe("from-machine", () => {
    afterEach(treeTeardown);

    it("resolves to an invoked machine and supports onDone", async () => {
        const child = createMachine({
            initial : "done",
            states  : {
                done : {
                    type : "final",
                },
            },
        });

        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        src    : fromMachine(async () => child),
                        onDone : "target",
                    },
                },
                target : {},
            },
        });

        const actor = createActor(parent).start();

        await waitFor(actor, (snapshot) => snapshot.value === "target");
    });

    it("rejection hits onError", async () => {
        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        src : fromMachine(async () => {
                            throw new Error("boom");
                        }),
                        onError : "errored",
                    },
                },
                errored : {},
            },
        });

        const actor = createActor(parent).start();

        await waitFor(actor, (snapshot) => snapshot.value === "errored");
    });
    
    it("rejection in a child hits onError", async () => {
        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        src : fromMachine(async () => {
                            throw new Error("boom");
                        }),
                        onError : "errored",
                    },
                },
                errored : {},
            },
        });

        const actor = createActor(parent).start();

        await waitFor(actor, (snapshot) => snapshot.value === "errored");
    });

    it("preserves parent piping for sendParent()", async () => {
        const child = createMachine({
            initial : "start",
            states  : {
                start : {
                    entry : sendParent({ type : "CHILD_READY" }),
                },
            },
        });

        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        src : fromMachine(async () => child),
                    },
                    on : {
                        CHILD_READY : "target",
                    },
                },
                target : {},
            },
        });

        const actor = createActor(parent).start();

        await waitFor(actor, (snapshot) => snapshot.value === "target");

        assert.equal(actor.getSnapshot().value, "target");
    });

    it("sends events to the child machine", async (context) => {
        const child = createMachine({
            initial : "idle",
            states  : {
                idle : {
                    on : {
                        GO : "done",
                    },
                },
                done : {
                    type : "final",
                },
            },
        });

        const tree = context.tree = createTree({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        id     : "async-machine",
                        src    : fromMachine(() => child),
                        onDone : "done",
                    },

                    on : {
                        KICK : {
                            actions : sendTo("async-machine", { type : "GO" }),
                        },
                    },
                },

                done : {
                    type : "final",
                },
            },
        });

        await tree();

        tree.service.send({ type : "KICK" });
        
        await waitFor(tree.service, (snapshot) => snapshot.value === "done");
    });
    
    it("handles API calls before the child machine is ready", async (context) => {
        const child = createMachine({
            initial : "idle",
            states  : {
                idle : {
                    on : {
                        GO : "done",
                    },
                },
                done : {
                    type : "final",
                },
            },
        });

        const deferredMachine = deferred();

        const tree = context.tree = createTree({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        id     : "async-machine",
                        src    : fromMachine(() => deferredMachine),
                        onDone : "done",
                    },
                    on : {
                        KICK : {
                            actions : sendTo("async-machine", { type : "GO" }),
                        },
                    },
                },
                done : {
                    type : "final",
                },
            },
        });

        await tree();

        assert.equal(tree.builder.hasTag("foo"), false);

        deferredMachine.resolve(child);
    });

    it("replays events sent before load", async () => {
        const child = createMachine({
            initial : "idle",
            states  : {
                idle : {
                    on : {
                        GO : "done",
                    },
                },
                done : {
                    type : "final",
                },
            },
        });

        const deferredMachine = deferred();

        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        id     : "async-machine",
                        src    : fromMachine(() => deferredMachine),
                        onDone : "done",
                    },
                    on : {
                        KICK : {
                            actions : sendTo("async-machine", { type : "GO" }),
                        },
                    },
                },
                done : {
                    type : "final",
                },
            },
        });

        const actor = createActor(parent).start();

        actor.send({ type : "KICK" });

        deferredMachine.resolve(child);

        await waitFor(actor, (snapshot) => snapshot.value === "done");

        assert.equal(actor.getSnapshot().value, "done");
    });
});
