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
     * @param {Interpreter} service The xstate Interpreter root instance to monitor
     * @param {Function | undefined} callback The function to call when updated component trees are generated
     * @param {Options} options Configuration
     */
    constructor(service, callback, options = false) {
        const {
            // Whether or not to cache the result of dynamic component/prop functions
            cache = true,

            // Whether or not to sort keys to ensure component output order is more stable
            stable = false,

            // How noisy should we be?
            verbose = false,
        } = options;

        // identifier!
        this.id = service.id;

        // Storing off args + options
        this._options = {
            cache,
            stable,
            verbose,
            callback,
        };

        // References to all the services being tracked
        this._services = new Map();

        // Active subscribers
        this._listeners = new Set();
        
        // Caching for results of previous walks
        this._cache = new Map();

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invokables = new Map();

        // Unsubscribe functions
        this._unsubscribes = new Set();

        // eslint-disable-next-line no-console
        this._log = verbose ? console.log : noop;

        // Save off bound versions of the APIs for mixing into results
        this._boundApis = {
            matches   : this.matches.bind(this),
            hasTag    : this.hasTag.bind(this),
            broadcast : this.broadcast.bind(this),
        };

        // Store off previous results in case new subscribers show up
        this._result = {
            __proto__ : null,

            tree  : [],
            state : service.getSnapshot(),
            
            ...this._boundApis,
        };

        // Add the main service to be tracked
        this._addService({ path : this.id, service });

        // Get goin
        this._watch(this.id);
    }

    _addService({ path, service, parent = false }) {
        this._services.set(path, {
            interpreter : service,
            parent,

            // Count # of times tree has been walked, used by cache & for walk cancellation
            run : 0,

            // Stored transition result, used to re-create the tree when a child transitions
            state : false,

            // Walk results
            tree : [],
        });
    }

    // Subscribe to an interpreter
    _watch(path) {
        const { _paths, _services, _invokables, _options, _log } = this;
        
        _log(`[${path}][_prep] prepping`);

        const { interpreter } = _services.get(path);

        // Build up maps of paths to meta info as well as noting any invokable machines for later
        const { idMap : ids } = interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const item = ids[id];

            const key = [ path, ...item.path ].join(".");

            if(item.meta) {
                _paths.set(key, Object.assign({
                    __proto__ : null,

                    cache : _options.cache,
                }, item.meta));
            }

            // .invoke is always an array
            item.invoke.forEach(({ id : invokeid }) => _invokables.set(key, `${path}.${invokeid}`));
        }

        _log(`[${path}][_prep] _paths`, [ ..._paths.keys() ]);
        _log(`[${path}][_prep] _invokables`, [ ..._invokables.entries() ]);
        
        _log(`[${path}][_watch] subscribing`);

        // Subscribing will start a run of the machine,
        // so no need to manually kick one off
        const { unsubscribe } = interpreter.subscribe((state) => {
            _log(`[${path}][_watch] update`);

            this._onState(path, state);
        });

        this._unsubscribes.add(unsubscribe);

        // Clean up once the service finishes
        interpreter.onStop(() => {
            _log(`[${path}][_onState] stopped, tearing down`);

            unsubscribe();

            this._unsubscribes.delete(unsubscribe);
            _services.delete(path);
        });
    }

    // Callback for statechart transitions to sync up child machine states
    _onState(path, state) {
        const { changed, children } = state;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return;
        }

        const { _services, _log } = this;

        // Save off the state
        this._services.get(path).state = state;

        _log(`[${path}][_onState] checking children`);

        // Add any new children to be tracked
        Object.keys(children).forEach((child) => {
            const id = [ path, child ].join(".");

            if(_services.has(id)) {
                return;
            }

            const service = children[child];

            // Not a statechart, abort!
            if(!service.initialized || !service.state) {
                return;
            }

            _log(`[${path}][_onState] Tracking child ${id}`);

            // These arg names are... confusing
            this._addService({ path : id, service, parent : path });

            // Start watching the child
            this._watch(id);
        });

        // Rebuild this particular tree in case it changed
        this._run(path);
    }

    _shouldRun(path, run) {
        const { _services } = this;

        return (
            Boolean(_services) &&
            _services.has(path) &&
            _services.get(path).run === run
        );
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run(path) {
        const { _options, _services, _log } = this;

        const root = path === this.id;
        const service = _services.get(path);

        // Cancel any previous walks, we're the captain now
        const run = ++service.run;
        
        _log(`[${path}][_run #${run}] starting`);

        service.tree = this._walk(path);

        const trees = [ service.tree ];

        // Only care about all other trees when we're the root
        if(root) {
            _services.forEach(({ tree : t }) => trees.push(t));
        }

        const [ tree ] = await Promise.all(trees);

        // New run started since this finished, abort
        if(!this._shouldRun(path, run)) {
            _log(`[${path}][_run #${run}] aborted`);

            return false;
        }

        _log(`[${path}][_run #${run}] finished`);

        const { parent } = service;

        // Trigger parent run if we got one
        if(parent) {
            return this._run(parent);
        }

        _log(`[${path}][_run #${run}] returning data`);

        this._result = {
            __proto__ : null,

            tree,
            state : service.state,
            ...this._boundApis,
        };

        if(_options.callback) {
            _options.callback(tree, this._result);
        }

        this._listeners.forEach((cb) => cb(this._result));

        return true;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk(path) {
        const {
           _paths,
           _invokables,
           _services,
           _cache,
           _options,
           _log,
        } = this;

        /* c8 ignore start */
        if(!_paths.size) {
            return [];
        }
        /* c8 ignore stop */

        const service = this._services.get(path);

        const { run, state } = service;

        _log(`[${path}][_walk #${run}] walking`);

        const { value, context, event } = state;
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

            queue = (_options.stable ? keys.sort() : keys).map((child) =>
                [ root, child, value[child] ]
            );
        }

        // service.run check is to kill looping if state transitions before the walk finishes
        while(queue.length && this._shouldRun(path, run)) {
            const [ parent, node, values ] = queue.shift();

            const id = `${path}.${node}`;

            _log(`[${path}][_walk #${run}] walking ${node}`);

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(id)) {
                const details = _paths.get(id);
                let cached = false;

                if(_cache.has(id)) {
                    cached = _cache.get(id);

                    // Only cache items from the previous run are valid
                    if(cached.counter === run - 1) {
                        cached.counter = run;
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
                        counter : run,
                        loaded  : false,
                    });
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invokables.has(id)) {
                const invokable = _invokables.get(id);

                if(_services.has(invokable)) {
                    loads.push(loadChild({
                        tree : _services.get(invokable).tree,
                        root : pointer,
                        path,
                    }));
                }
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, `${node}.${values}`, false ]);
            } else {
                const keys = Object.keys(values);
    
                queue.push(...(_options.stable ? keys.sort() : keys).map((child) =>
                    [ pointer, `${node}.${child}`, values[child] ]
                ));
            }
        }

        // await any load functions
        if(loads.length) {
            await Promise.all(loads);
        }

        _log(`[${path}][_walk #${run}] done`);

        return root.children;
    }

    /**
     * Remove all subscribers and null out all properties
     */
     teardown() {
        this._log(`[${this.id}][teardown] destroying`);

        this._unsubscribes.forEach((unsub) => unsub());
        
        this._paths.clear();
        this._invokables.clear();
        this._cache.clear();
        this._services.clear();
        this._listeners.clear();
        this._unsubscribes.clear();
        
        this._paths = null;
        this._invokables = null;
        this._cache = null;
        this._services = null;
        this._listeners = null;
        this._unsubscribes = null;
        this._options = null;
        this._log = null;
        this._boundApis = null;
    }

    /**
     * Send an event to the service and all its children
     *
     * @param {Event | string} event
     * @param {SendActionOptions} [options]
     */
    broadcast(event, options) {
        this._services.forEach(({ interpreter }) => {
            interpreter.send(event, options);
        });
    }

    /**
     * Check if the current state or any child states have a tag set
     *
     * @param {string} tag
     * @returns boolean
     */
    hasTag(tag) {
        return [ ...this._services.values() ].some(({ state }) => state.hasTag(tag));
    }

    /**
     * Check if the current state or any child states match a path
     *
     * @param {string} path
     * @returns boolean
     */
    matches(path) {
        return [ ...this._services.values() ].some(({ state }) => state.matches(path));
    }

    /**
     * Send an event to the root machine only
     *
     * @param  {...any} event Event to send
     * @returns Updated XState State object
     */
    send(...event) {
        return this._services.get(this.id).interpreter.send(...event);
    }

    /**
     * Provides an observable API, matches the svelte store contract
     * https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract
     *
     * @param {Function} callback function to be called whenever a new tree is generated
     * @returns Function unsubscribe function
     */
    subscribe(callback) {
        this._listeners.add(callback);

        callback(this._result);

        return () => this._listeners.delete(callback);
    }
}

export default ComponentTree;
