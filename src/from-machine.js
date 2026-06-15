import { createActor } from "xstate";

const EVENT_LOADED = "fromMachine.loaded";
const EVENT_REJECTED = "fromMachine.rejected";
const EVENT_SNAPSHOT = "fromMachine.snapshot";

const STATUS_ACTIVE = "active";
const STATUS_ERROR = "error";
const STATUS_STOPPED = "stopped";

const noopFalse = () => false;

const PENDING_BASE = {
    children : Object.freeze(Object.create(null)),
    hasTag   : noopFalse,
    matches  : noopFalse,
    can      : noopFalse,
};

const pending = ({ input, error } = {}) => Object.assign(
    Object.create(PENDING_BASE),
    {
        status : error ? STATUS_ERROR : STATUS_ACTIVE,
        input,
        error,
        output : undefined,
        child : false,
        childSnapshot : false,
        machine : false,
    },
);

const live = ({ input, child, snapshot } = {}) => {
    snapshot.input = input;
    snapshot.machine = child.logic;

    return snapshot;
};

export const fromMachine = (loadMachine) => {
    const instances = new WeakMap();
    let stopped = false;

    const get = (self) => {
        let instance = instances.get(self);

        if(!instance) {
            instance = {
                child : false,
                unsub : false,
                queue : [],
            };

            instances.set(self, instance);
        }

        return instance;
    };

    return {
        __fromMachine : true,

        config : loadMachine,

        getInitialSnapshot : (_, input) => pending({ input }),
         
        // eslint-disable-next-line max-statements
        transition : (snapshot, event, scope) => {
            const instance = get(scope.self);

            if(event.type === EVENT_LOADED) {
                const child = createActor(event.machine, {
                    parent : scope.self._parent,
                    input : snapshot.input,
                });

                instance.child = child;

                child.start();

                const initial = child.getSnapshot();

                // Subscribe to the child in a defer to avoid a loop
                scope.defer(() => {
                    const current = get(scope.self);

                    const { unsubscribe } = child.subscribe((nextSnapshot) => {
                        scope.self.send({
                            type : EVENT_SNAPSHOT,
                            snapshot : nextSnapshot,
                        });
                    });

                    current.unsub = unsubscribe;

                    // Flush queued events
                    for(const queued of instance.queue) {
                        child.send(queued);
                    }

                    instance.queue.length = 0;
                });

                return live({
                    input : snapshot.input,
                    child,
                    snapshot : initial,
                });
            }

            if(event.type === EVENT_REJECTED) {
                return pending({
                    input : snapshot.input,
                    // child : instance.child,
                    error : event.error,
                });
            }

            if(event.type === EVENT_SNAPSHOT) {
                return live({
                    input : snapshot.input,
                    child : instance.child,
                    snapshot : event.snapshot,
                });
            }

            if(event.type === "xstate.stop") {
                stopped = true;

                const current = get(scope.self);

                if(current.unsub) {
                    current.unsub();
                }

                if(current.child) {
                    // TODO: Remove usage of internal API, but HOW?!? Children with a parent
                    // are not able to be stopped directly via .stop() API
                    current.child?._stop();
                }

                instances.delete(scope.self);

                snapshot.status = STATUS_STOPPED;
                
                return snapshot;
            }

            if(instance.child) {
                scope.defer(() => {
                    instance.child?.send(event);
                });

                return snapshot;
            }

            /* c8 ignore start */
            if(snapshot.status === STATUS_ERROR) {
                return snapshot;
            }
            /* c8 ignore end */

            instance.queue.push(event);

            return snapshot;
        },

        start : (_, scope) => {
            stopped = false;

            Promise
            .resolve(loadMachine())
            .then((machine) => {
                if(!stopped) {
                    scope.self.send({
                        type : EVENT_LOADED,
                        machine,
                    });
                }
            })
            .catch((error) => {
                if(!stopped) {
                    scope.self.send({
                        type : EVENT_REJECTED,
                        error,
                    });
                }
            });
        },
    };
};
