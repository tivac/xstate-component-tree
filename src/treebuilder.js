import Cancelable from "p-cancelable";

const loader = async ({ item, key, fn, context, event }) => {
    item[key] = await fn(context, event);
};

class ComponentTree {
    constructor(interpreter, callback, options = {}) {
        // Storing off args
        this.interpreter = interpreter;
        this.callback = callback;
        this.options = options;

        // identifier!
        this.id = interpreter.id;

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invocables = new Map();

        // invoked id -> child machine
        this._children = new Map();

        // Cancelable version of the walker
        this._walking = false;
        this._walk = Cancelable.fn(this._walkRaw.bind(this));

        // Get goin
        this._prep();
        this._watch();
    }

    teardown() {
        this._paths.clear();
        this._invocables.clear();
        this._children.clear();

        this._unsubscribe();
    }

    // Walk the machine and build up maps of paths to meta info as
    // well as prepping any load functions for usage later
    _prep() {
        const { _paths, _invocables } = this;
        const { idMap : ids } = this.interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const { path, meta = false, invoke = false } = ids[id];

            const key = path.join(".");

            if(meta) {
                const { component, props, load } = meta;

                _paths.set(key, {
                    __proto__ : null,

                    component,
                    props,
                    load,
                });
            }

            if(invoke) {
                invoke.forEach(({ id : invokeid }) => _invocables.set(key, invokeid));
            }
        }
    }

    // Watch the machine for changes
    _watch() {
        const { interpreter } = this;
    
        const { unsubscribe } = interpreter.subscribe(this._state.bind(this));

        this._unsubscribe = unsubscribe;

        // In case the machine is already started, run a first pass on it
        if(interpreter.initialized) {
            this._state(interpreter.state);
        }
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements
    async _walkRaw({ value, context, event }, onCancel) {
        const { _paths, _invocables, _children } = this;

        const loads = [];
        const root = {
            __proto__ : null,
            id        : this.id,
            children  : [],
        };

        // Set up queue for a breadth-first traversal of all active states
        let queue;
        let cancelled;

        // Blank out the queue immediately to force iteration to stop ASAP
        onCancel(() => {
            queue = [];
            cancelled = true;
        });

        if(typeof value === "string") {
            queue = [[ root, value, false ]];
        } else {
            queue = Object.entries(value).map(([ child, grandchildren ]) =>
                [ root, child, grandchildren ]
            );
        }

        // eslint-disable-next-line no-unmodified-loop-condition
        while(queue.length && !cancelled) {
            const [ parent, path, values ] = queue.shift();

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(path)) {
                const details = _paths.get(path);
                const { component, props, load } = details;

                const item = {
                    __proto__ : null,
                    component : component || false,
                    props     : props || false,
                    children  : [],
                };

                details.item = item;

                _paths.set(path, details);

                // Run load function and assign the response to the component prop
                if(load) {
                    loads.push(loader({
                        item,
                        key : "component",
                        fn  : load,
                        context,
                        event,
                    }));
                }

                // Props as a function means they're dynamic, so run it to get the value
                if(typeof props === "function") {
                    loads.push(loader({
                        item,
                        key : "props",
                        fn  : props,
                        context,
                        event,
                    }));
                }

                parent.children.push(item);

                pointer = item;
            }

            if(_invocables.has(path)) {
                const id = _invocables.get(path);

                if(_children.has(id)) {
                    const { tree : child } = _children.get(id);
    
                    if(child) {
                        // Will attach to the state itself if it has a component,
                        // otherwise will attach to the parent
                        pointer.children.push(...child);
                    }
                }
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, `${path}.${values}`, false ]);

                continue;
            }

            queue.push(...Object.entries(values).map(([ child, grandchildren ]) =>
                [ pointer, `${path}.${child}`, grandchildren ]
            ));
        }

        if(cancelled) {
            return false;
        }

        // await all the load functions
        await Promise.all(loads);
        
        return root.children;
    }
    
    // React to statechart transitions, sync up the state of child actors,
    // and kick off the _walk
    _state({ changed, value, context, event, children }) {
        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return false;
        }

        const { _children } = this;

        const run = async () => {
            // Cancel any previous walks, we're the captain now
            if(this._walking && !this._walking.isCanceled) {
                this._walking.cancel();
            }

            this._walking = this._walk({ value, context, event });

            try {
                const tree = await this._walking;
                
                this.callback(tree);
            } catch(e) {
                // Swallow errors from cancelling promises, those are ignored because
                // a newer walk was requested
                if(e instanceof Cancelable.CancelError) {
                    return;
                }

                // Anything else gets re-thrown
                throw e;
            }
        };
        
        // Clear out any old children that are no longer being tracked
        _children.forEach(({ child }, key) => {
            if(key in children) {
                return;
            }

            child.teardown();
            _children.delete(key);
        });

        // Add any new children to be tracked
        Object.entries(children).forEach(([ id, service ]) => {
            // Already tracked
            if(_children.has(id)) {
                return;
            }

            // Not a statechart, abort!
            if(!service.initialized || !service.state) {
                return;
            }

            const child = new ComponentTree(service, (tree) => {
                const me = _children.get(id);

                me.tree = tree;

                return run();
            });

            // Setup child service for tracking
            _children.set(id, {
                child,
                tree : false,
            });
        });
    
        return run();
    }
}

export default ComponentTree;
