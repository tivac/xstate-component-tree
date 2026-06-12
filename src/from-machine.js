import { createActor } from "xstate";

const LOADED = "fromMachine.loaded";
const REJECTED = "fromMachine.rejected";
const SNAPSHOT = "fromMachine.snapshot";

const STATUS_ACTIVE = "active";
const STATUS_ERROR = "error";

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
    snapshot.__fromMachine = true;

    return snapshot;
};

export const fromMachine = (loadMachine) => {
    const instances = new WeakMap();

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

        transition : (snapshot, event, scope) => {
            const instance = get(scope.self);

            if(event.type === LOADED) {
                const child = createActor(event.machine, {
                    parent : scope.self._parent,
                    input : snapshot.input,
                });

                instance.child = child;

                child.start();

                const initial = child.getSnapshot();

                scope.defer(() => {
                    const current = get(scope.self);

                    current.unsub = child.subscribe((nextSnapshot) => {
                        scope.self.send({
                            type : SNAPSHOT,
                            snapshot : nextSnapshot,
                        });
                    }).unsubscribe;

                    for(const queued of instance.queue) {
                        child.send(queued);
                    }
                });

                return live({
                    input : snapshot.input,
                    child,
                    snapshot : initial,
                });
            }

            if(event.type === REJECTED) {
                return pending({
                    input : snapshot.input,
                    error : event.error,
                });
            }

            if(event.type === SNAPSHOT) {
                return live({
                    input : snapshot.input,
                    child : instance.child,
                    snapshot : event.snapshot,
                });
            }

            if(instance.child) {
                scope.defer(() => {
                    get(scope.self).child?.send(event);
                });

                return snapshot;
            }

            if(snapshot.status === STATUS_ERROR) {
                return snapshot;
            }

            instance.queue.push(event);

            return snapshot;
        },

        start : (_, scope) => {
            Promise
            .resolve(loadMachine())
            .then((machine) => {
                scope.self.send({
                    type : LOADED,
                    machine,
                });
            })
            .catch((error) => {
                scope.self.send({
                    type : REJECTED,
                    error,
                });
            });

            return () => {
                const current = get(scope.self);

                current.unsub?.();
                current.child?.stop();

                instances.delete(scope.self);
            };
        },
    };
};
