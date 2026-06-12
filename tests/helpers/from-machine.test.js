import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createActor,
    createMachine,
    sendParent,
    sendTo,
    waitFor,
} from "xstate";
import { fromMachine } from "../../src/from-machine.js";

describe("from-machine", () => {
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

        assert.equal(actor.getSnapshot().value, "target");
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

        assert.equal(actor.getSnapshot().value, "errored");
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

        let resolveMachine;
        const machinePromise = new Promise((resolve) => {
            resolveMachine = resolve;
        });

        const parent = createMachine({
            initial : "loading",
            states  : {
                loading : {
                    invoke : {
                        id     : "async-machine",
                        src    : fromMachine(() => machinePromise),
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

        resolveMachine(child);

        await waitFor(actor, (snapshot) => snapshot.value === "done");

        assert.equal(actor.getSnapshot().value, "done");
    });
});
