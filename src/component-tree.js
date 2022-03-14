/**
 * @typedef {import("xstate").AnyInterpreter} Interpreter
 * @typedef {import("xstate").AnyEventObject} Event
 * @typedef {import("xstate").SendActionOptions} SendActionOptions
 * @typedef {{ cache?: boolean; stable?: boolean; verbose?: boolean}} Options
 */

// eslint-disable-next-line no-empty-function
const noop = () => {};

const loadComponent = async ({ item, load, context, event }) => {
    const result = await load(context, event);

    let component;
    let props;

    if(Array.isArray(result)) {
        [ component, props ] = await Promise.all(result);
    } else {
        component = result;
    }

    item.component = component || false;
    item.props = props || false;
};

const loadChild = async ({ tree, root }) => {
    const children = await tree;

    // Will attach to the state itself if it has a component,
    // otherwise will attach to the parent
    root.children.push(...children);
};

class ComponentTree {
    /**
     * @constructor
     * @param {Interpreter} interpreter
     * @param {Function} callback
     * @param {Options} options
     */
    constructor(interpreter, callback, options = false) {
        const {
            cache = true,
            stable = false,
            verbose = false,
        } = options;

        // identifier!
        this.id = interpreter.id;

        // Storing off args + options
        this._options = options;
        this._interpreters = new Map([[ this.id, interpreter ]]);
        this._callback = callback;

        // Whether or not to cache the result of dynamic component/prop functions
        this._caching = cache;

        // Whether or not to sort keys to ensure component output order is more stable
        this._stable = stable;


        // Count # of times tree has been walked, used by cache & for walk cancellation
        this._counters = new Map();

        // Caching for results of previous walks
        this._cache = new Map();

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invokables = new Map();

        // Expose walk result as a property
        this._trees = new Map();

        // Unsubscribe functions
        this._unsubscribes = new Set();

        // Stored events, used to re-create the tree when a child transitions
        this._states = new Map();

        // eslint-disable-next-line no-console
        this._log = verbose ? console.log : noop;

        // Get goin
        this._watch(this.id);
    }

    /**
     * Remove all subscribers and null out all properties
     */
    teardown() {
        this._log(`[teardown] destroying`);
        
        this._paths.clear();
        this._invokables.clear();
        this._cache.clear();
        this._states.clear();

        // Ensure no more runs can ever happen, we're *done*
        this._counter = Infinity;

        this._unsubscribes.forEach((unsub) => unsub());
        
        this._tree = null;
        this._options = null;
        this._paths = null;
        this._log = null;
        this._cache = null;
        this._interpreter = null;
        this._callback = null;
    }

    /**
     * Send an event to the service and all its children
     *
     * @param {Event | string} event
     * @param {SendActionOptions} [options]
     */
    broadcast(event, options) {
        this._interpreters.forEach((service) => {
            service.send(event, options);
        });
    }

    /**
     * Check if the current state or any child states have a tag set
     *
     * @param {string} tag
     * @returns boolean
     */
    hasTag(tag) {
        return [ ...this._states.values() ].some((state) => state.hasTag(tag));
    }

    /**
     * Check if the current state or any child states match a path
     *
     * @param {string} path
     * @returns boolean
     */
    matches(path) {
        return [ ...this._states.values() ].some((state) => state.matches(path));
    }

    // Subscribe to an interpreter
    _watch(path) {
        const { _paths, _interpreters, _invokables, _caching, _log } = this;
        
        _log(`[${path}][_prep] prepping`);

        // Build up maps of paths to meta info as well as noting any invokable machines for later
        const { idMap : ids } = _interpreters.get(path).machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const item = ids[id];

            const key = [ path, ...item.path ].join(".");

            if(item.meta) {
                _paths.set(key, Object.assign({
                    __proto__ : null,

                    cache : _caching,
                }, item.meta));
            }

            // .invoke is always an array
            item.invoke.forEach(({ id : invokeid }) => _invokables.set(key, `${path}.${invokeid}`));
        }

        _log(`[${path}][_prep] _paths`, [ ..._paths.keys() ]);
        _log(`[${path}][_prep] _invokables`, [ ..._invokables.entries() ]);
        
        _log(`[${path}][_watch] subscribing`);

        const service = _interpreters.get(path);

        // Subscribing will start a run of the machine,
        // so no need to manually kick one off
        const { unsubscribe } = service.subscribe((state) => {
            _log(`[${path}][_watch] update`);

            this._onState(path, state);
        });

        this._unsubscribes.add(unsubscribe);

        // Clean up once the service finishes
        service.onStop(() => {
            _log(`[${path}][_onState] stopped, tearing down`);

            unsubscribe();

            this._unsubscribes.delete(unsubscribe);
            _interpreters.delete(path);
        });
    }

    // Callback for statechart transitions to sync up child machine states
    // TODO: deep child machines are running *too soon* somehow?
    _onStat(path, state) {
        const { changed, children } = state;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return;
        }

        // Save off the state
        this._states.set(path, state);

        const { _interpreters, _log } = this;

        _log(`[${path}][_onState] checking children`);

        // Add any new children to be tracked
        Object.keys(children).forEach((child) => {
            const id = [ path, child ].join(".");

            if(_interpreters.has(id)) {
                return;
            }

            const service = children[child];

            // Not a statechart, abort!
            if(!service.initialized || !service.state) {
                return;
            }

            _log(`[${path}][_onState] Tracking child ${id}`);

            _interpreters.set(id, service);

            // Start watching the child
            this._watch(id, service);
        });

        this._run(path);

        // TODO: is this necessary?
        this._run(this.id);
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run(path) {
        const { _callback, _log } = this;

        // Cancel any previous walks, we're the captain now
        if(!this._counters.has(path)) {
            this._counters.set(path, 0);
        }

        const run = this._counters.get(path) + 1;

        this._counters.set(path, run);

        _log(`[${path}][_run #${run}] starting`);

        this._trees.set(path, this._walk(path));

        _log(`[${path}][_run #${run}] awaiting walks`);

        const [ tree ] = await Promise.all([
            this._trees.get(path),
            ...this._trees.values(),
        ]);

        // New run started since this finished, abort
        if(run !== this._counters.get(path)) {
            _log(`[${path}][_run #${run}] aborted`);

            return;
        }

        _log(`[${path}][_run #${run}] finished`);

        if(path !== this.id) {
            return;
        }

        _log(`[${path}][_run #${run}] returning data`);

        _callback(tree, { data : this._state });
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk(path) {
        const {
           _paths,
           _invokables,
           _interpreters,
           _cache,
           _stable,
           _counters,
           _states,
           _log,
        } = this;

        // Don't do any work here if it's impossible for a component
        // to be needed
        if(!_paths.size) {
            return [];
        }

        const counter = _counters.get(path);

        _log(`[${path}][_walk #${counter}] walking`);

        const { value, context, event } = _states.get(path);
        const loads = [];
        const root = {
            __proto__ : null,

            id       : this.id,
            children : [],
        };

        // Set up queue for a breadth-first traversal of all active states
        let queue;

        if(typeof value === "string") {
            queue = [[ root, value, false ]];
        } else {
            const keys = Object.keys(value);

            queue = (_stable ? keys.sort() : keys).map((child) =>
                [ root, child, value[child] ]
            );
        }

        // _counter check is to kill looping if state transitions before the walk finishes
        while(queue.length && counter === this._counters.get(path)) {
            const [ parent, node, values ] = queue.shift();

            const id = `${path}.${node}`;

            _log(`[${path}][_walk #${counter}] walking ${node}`);

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(id)) {
                const details = _paths.get(id);
                let cached = false;

                if(_cache.has(id)) {
                    cached = _cache.get(id);

                    // Only cache items from the previous run are valid
                    if(cached.counter === counter - 1) {
                        cached.counter = counter;
                    } else {
                        cached = false;

                        _cache.delete(id);
                    }
                }

                const { component = false, props = false, load } = details;

                const item = {
                    __proto__ : null,

                    // Purposefully *not* prefixing w/ path here, end-users don't care about it
                    path : node,

                    component : cached ? cached.item.component : component,
                    props     : cached ? cached.item.props : props,
                    children  : [],
                };

                // Run load function and assign the response to the component prop
                if(load && !cached.loaded) {
                    const loading = loadComponent({
                        item,
                        load,
                        context,
                        event,
                    });

                    // Mark this state loaded in the cache once its actually done
                    loading.then(() => {
                        const saved = _cache.get(id);

                        if(saved) {
                            saved.loaded = true;
                        }
                    });

                    loads.push(loading);
                }

                // Check if this node is allowed to be cached && not already cached,
                // then save the result
                if(details.cache && !cached) {
                    _cache.set(id, {
                        __proto__ : null,

                        item,
                        counter,
                        loaded  : false,
                    });
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invokables.has(id)) {
                const invokable = _invokables.get(id);

                if(_interpreters.has(invokable)) {
                    loads.push(loadChild({
                        tree : this._trees.get(invokable),
                        root : pointer,
                    }));
                }
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, `${node}.${values}`, false ]);

                continue;
            }

            const keys = Object.keys(values);

            queue.push(...(_stable ? keys.sort() : keys).map((child) =>
                [ pointer, `${node}.${child}`, values[child] ]
            ));
        }

        // await any load functions
        if(loads.length) {
            _log(`[${path}][_walk #${counter}] waiting for ${loads.length} loaders`);

            await Promise.all(loads);

            _log(`[${path}][_walk #${counter}] loaders complete`);
        }

        _log(`[${path}][_walk #${counter}] done`);

        return root.children;
    }
}

export default ComponentTree;
