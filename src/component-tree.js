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

const loadChild = async ({ child, root }) => {
    const { _tree } = child;

    const children = await _tree;

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

        // Storing off args + options
        this._options = options;
        this._interpreter = interpreter;
        this._callback = callback;

        // Whether or not to cache the result of dynamic component/prop functions
        this._caching = cache;

        // Whether or not to sort keys to ensure component output order is more stable
        this._stable = stable;

        // identifier!
        this.id = interpreter.id;

        // Count # of times tree has been walked, used by cache & for walk cancellation
        this._counter = 0;

        // Caching for results of previous walks
        this._cache = new Map();

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invokables = new Map();

        // invoked id -> child machine
        this._children = new Map();

        // Expose walk result as a property
        this._tree = [];

        // Last event this saw, used to re-create the tree when a child transitions
        this._state = false;

        // eslint-disable-next-line no-console
        this._log = verbose ? console.log.bind(console, `[${this.id}]`) : noop;

        // Get goin
        this._prep();
        this._watch();
    }

    /**
     * Remove all subscribers and null out all properties
     */
    teardown() {
        this._log(`[teardown] destroying`);
        
        this._paths.clear();
        this._invokables.clear();
        this._children.clear();
        this._cache.clear();

        // Ensure no more runs can ever happen, we're *done*
        this._counter = Infinity;

        this._unsubscribe();
        
        this._tree = null;
        this._state = null;
        this._options = null;
        this._children = null;
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
        const { _children } = this;

        this._interpreter.send(event, options);

        _children.forEach((child) => {
            child.broadcast(event, options);
        });
    }

    /**
     * Check if the current state or any child states have a tag set
     *
     * @param {string} tag
     * @returns boolean
     */
    hasTag(tag) {
        return [ this._state, ...this._children.values() ].some((state) => state.hasTag(tag));
    }

    /**
     * Check if the current state or any child states match a path
     *
     * @param {string} path
     * @returns boolean
     */
    matches(path) {
        return [ this._state, ...this._children.values() ].some((state) => state.matches(path));
    }

    // Walk the machine and build up maps of paths to meta info as
    // well as prepping any load functions for usage later
    _prep() {
        const { _paths, _invokables, _interpreter, _caching, _log } = this;
        const { idMap : ids } = _interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const { path, meta = false, invoke } = ids[id];

            const key = path.join(".");

            if(meta) {
                _paths.set(key, Object.assign({
                    __proto__ : null,

                    cache : _caching,
                }, meta));
            }

            // .invoke is always an array
            invoke.forEach(({ id : invokeid }) => _invokables.set(key, invokeid));
        }

        _log(`[_prep] _paths`, Array.from(_paths.keys()));
        _log(`[_prep] _invokables`, Array.from(_invokables.entries()));
    }

    // Subscribe to an interpreter
    _watch() {
        const { _interpreter, _log } = this;

        _log(`[_watch] subscribing`);

        // Subscribing will start a run of the machine, so no need to manually
        // kick one off
        const { unsubscribe } = _interpreter.subscribe((state) => {
            _log(`[_watch] updated `);

            this._onState(state);
        });

        this._unsubscribe = unsubscribe;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk() {
        const {
            id,
           _paths,
           _invokables,
           _children,
           _cache,
           _stable,
           _counter,
           _state,
           _log,
        } = this;

        // Don't do any work here if it's impossible for a component
        // to be needed
        if(!_paths.size) {
            return [];
        }

        _log(`[_walk #${_counter}] walking`);

        const { value, context, event } = _state;
        const loads = [];
        const root = {
            __proto__ : null,

            id,
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

        // _counter === this._counter is to kill looping if state
        // transitions before it finishes
        // eslint-disable-next-line no-unmodified-loop-condition
        while(queue.length && _counter === this._counter) {
            const [ parent, path, values ] = queue.shift();

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(path)) {
                const details = _paths.get(path);
                let cached = false;

                if(_cache.has(path)) {
                    cached = _cache.get(path);

                    // Only cache items from the previous run are valid
                    if(cached.counter === this._counter - 1) {
                        cached.counter = this._counter;
                    } else {
                        cached = false;

                        _cache.delete(path);
                    }
                }

                const { component = false, props = false, load } = details;

                const item = {
                    __proto__ : null,

                    path,

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
                        const saved = _cache.get(path);

                        if(saved) {
                            saved.loaded = true;
                        }
                    });

                    loads.push(loading);
                }

                // Check if this node is
                // 1) allowed to be cached
                // 2) not already cached
                // and then save the result
                if(details.cache && !cached) {
                    _cache.set(path, {
                        __proto__ : null,

                        item,
                        counter : this._counter,
                        loaded  : false,
                    });
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invokables.has(path)) {
                const invokable = _invokables.get(path);

                if(_children.has(invokable)) {
                    loads.push(loadChild({
                        child : _children.get(invokable),
                        root  : pointer,
                    }));
                }
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, `${path}.${values}`, false ]);

                continue;
            }

            const keys = Object.keys(values);

            queue.push(...(_stable ? keys.sort() : keys).map((child) =>
                [ pointer, `${path}.${child}`, values[child] ]
            ));
        }

        // await any load functions
        if(loads.length) {
            _log(`[_walk #${_counter}] waiting for loaders`);

            await Promise.all(loads);

            _log(`[_walk #${_counter}] loaders complete`);
        }

        _log(`[_walk #${_counter}] done`);

        return root.children;
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run() {
        const { _children, _callback, _log } = this;

        // Cancel any previous walks, we're the captain now
        const run = ++this._counter;

        _log(`[_run #${run}] starting`);

        this._tree = this._walk();

        _log(`[_run #${run}] awaiting children`);

        const [ tree ] = await Promise.all([
            this._tree,
            [ ..._children.values() ].map(({ _tree }) => _tree),
        ]);

        // New run started since this finished, abort
        if(run !== this._counter) {
            _log(`[_run #${run}] aborted`);

            return;
        }

        _log(`[_run #${run}] finished`);

        _callback(tree, { data : this._state });
    }

    // Callback for statechart transitions to sync up child machine states
    _onState(state) {
        const { changed, children } = state;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return false;
        }

        // Save off the state
        this._state = state;

        const { _children, _log, _options } = this;

        _log(`[_onState] checking children`);

        // Add any new children to be tracked
        Object.keys(children).forEach((id) => {
            if(_children.has(id)) {
                return;
            }

            const service = children[id];

            // Not a statechart, abort!
            if(!service.initialized || !service.state) {
                return;
            }

            // Create the child ComponentTree instance
            let child = new ComponentTree(service, () => {
                _log(`[_onState] ${id} updated`);

                // trigger re-walk of the parent after any children change
                this._run();
            }, _options);

            _children.set(id, child);

            // Clean up child once it finishes
            service.onStop(() => {
                _log(`[_onState] ${id} stopped, tearing down`);

                child.teardown();
                child = null;

                _children.delete(id);
            });
        });

        return this._run();
    }
}

export default ComponentTree;
