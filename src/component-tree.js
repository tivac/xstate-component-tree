/**
 * @import { AnyMachineSnapshot, AnyActor, EventObject, SendActionOptions } from "xstate"
 */

/**
 * @typedef {( path: string ) => boolean} Matches
 * @typedef {( event : EventObject) => boolean} Can
 * @typedef {( tag : string ) => boolean} HasTag
 * @typedef {() => Result} Subscriber
 * @typedef {() => void } Unsubscriber
 */

/**
 * @typedef {{ tree : any[], state : AnyMachineSnapshot, matches : Matches, can : Can, hasTag : HasTag }} Result
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

const childPath = (...args) => args
    .filter(Boolean)
    .join(".");

class ComponentTree {
    /**
     * @class
     * @param {AnyActor} actor The xstate Actor instance to monitor
     * @param {Subscriber} [callback] The function to call when updated component trees are generated
     * @param {object} [options] Configuration
     * @param {boolean} [options.cache] If true, will cache the result of dynamic component & prop functions
     * @param {boolean} [options.stable] When true statechart keys will be sorted to ensure stable component output order
     * @param {boolean} [options.verbose] When true runtime debugging output will be logged
     */
    constructor(actor, callback, options = false) {
        const {
            // Whether or not to cache the result of dynamic component/prop functions
            cache = true,

            // Whether or not to sort keys to ensure component output order is more stable
            stable = false,

            // How noisy should we be?
            verbose = false,
        } = options;

        // identifier!
        this.id = actor.id;

        // Storing off args + options
        this._options = {
            cache,
            stable,
            verbose,
            callback,
        };

        // References to all the actors being tracked
        this._actors = new Map();

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
            can       : this.can.bind(this),
            broadcast : this.broadcast.bind(this),
        };

        // Store off previous results in case new subscribers show up
        this._result = {
            __proto__ : null,

            tree  : [],
            state : actor.getSnapshot(),
            
            ...this._boundApis,
        };

        // Add the main actor to be tracked
        this._addActor({ path : this.id, actor });

        // Get goin
        this._watch(this.id);
    }

    _addActor({ path, actor, parent = false }) {
        this._actors.set(path, {
            actor,
            parent,

            // Count # of times tree has been walked, used by cache & for walk cancellation
            run : 0,

            // Stored transition result, used to re-create the tree when a child transitions
            state : actor.getSnapshot(),

            // Walk results
            tree : [],
        });
    }

    // Subscribe to an interpreter
    _watch(path) {
        const { _paths, _actors, _invokables, _options, _log } = this;
        
        _log(`[${path}][_prep] prepping`);

        const { actor } = _actors.get(path);

        // Build up maps of paths to meta info as well as noting any invokable machines for later
        const { idMap : ids, root } = actor.logic;

        // Support metadata at the root of the machine
        if(root.meta) {
            _paths.set(path, Object.assign({
                __proto__ : null,

                cache : _options.cache,
            }, root.meta));
        }

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const item of ids.values()) {
            const key = [ path, ...item.path ].join(".");

            if(item.meta) {
                _paths.set(key, Object.assign({
                    __proto__ : null,

                    cache : _options.cache,
                }, item.meta));
            }

            // .invoke is always an array
            _invokables.set(key, item.invoke.map(({ id : invoked }) => childPath(path, invoked)));
        }

        _log(`[${path}][_prep] _paths`, [ ..._paths.keys() ]);
        _log(`[${path}][_prep] _invokables`, [ ..._invokables.entries() ]);
        
        _log(`[${path}][_watch] subscribing`);

        const { unsubscribe } = actor.subscribe({
            // Actor has transitioned states
            next : (state) => {
                _log(`[${path}][subscribe.next] update`);

                this._onState(path, state);
            },

            // Actor has completed
            complete : () => {
                _log(`[${path}][subscribe.complete] stopped, tearing down`);

                unsubscribe();

                this._unsubscribes.delete(unsubscribe);
                _actors.delete(path);
            },
        });

        this._unsubscribes.add(unsubscribe);

        // Run against current state of the machine
        this._onState(path, actor.getSnapshot());
    }

    // Callback for statechart transitions to sync up child machine states
    _onState(path, state) {
        const { _actors, _log } = this;
        
        const current = _actors.get(path);

        if(state === current.state && current.run > 0) {
            return;
        }
        
        // Save off the state
        current.state = state;

        const { children } = state;
        
        _log(`[${path}][_onState] checking children`);

        // Add any new children to be tracked
        Object.keys(children).forEach((child) => {
            const id = [ path, child ].join(".");

            if(_actors.has(id)) {
                return;
            }

            const actor = children[child];

            // Not a statechart, abort!
            if(!actor?.logic?.__xstatenode) {
                return;
            }

            _log(`[${path}][_onState] Tracking child ${id}`);

            // These arg names are... confusing
            this._addActor({ path : id, actor, parent : path });

            // Start watching the child
            this._watch(id);
        });

        // Rebuild this particular tree in case it changed
        this._run(path);
    }

    _shouldRun(path, run) {
        const { _actors } = this;

        return (
            Boolean(_actors) &&
            _actors.has(path) &&
            _actors.get(path).run === run
        );
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run(path) {
        const { _options, _actors, _log } = this;

        const root = path === this.id;
        const actor = _actors.get(path);

        _log(`[${path}][_run()] starting`);

        // Cancel any previous walks, we're the captain now
        const run = ++actor.run;
        
        _log(`[${path}][_run #${run}] started`);

        actor.tree = this._walk(path);

        const trees = [ actor.tree ];

        // Only care about all other trees when we're the root
        if(root) {
            _actors.forEach(({ tree : t }, p) => {
                if(p !== path) {
                    trees.push(t);
                }
            });
        }

        const [ tree ] = await Promise.all(trees);

        // New run started since this finished, abort
        if(!this._shouldRun(path, run)) {
            _log(`[${path}][_run #${run}] aborted`);

            return false;
        }

        _log(`[${path}][_run #${run}] finished`);

        const { parent } = actor;

        // Trigger parent run if we got one
        if(parent) {
            return this._run(parent);
        }

        _log(`[${path}][_run #${run}] returning data`);

        this._result = {
            __proto__ : null,

            tree,
            state : actor.state,
            ...this._boundApis,
        };

        if(_options.callback) {
            _options.callback(tree, this._result);
        }

        for(const listener of this._listeners) {
            listener(this._result);
        }

        return true;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk(path) {
        const {
           _paths,
           _invokables,
           _actors,
           _cache,
           _options,
           _log,
        } = this;

        const { run, state } = _actors.get(path);

        /* c8 ignore start */
        if(!_paths.size) {
            return [];
        }
        /* c8 ignore stop */

        _log(`[${path}][_walk #${run}] walking`);

        const { value, context, event } = state;
        const loads = [];
        const root = {
            __proto__ : null,

            children : [],
        };

        // Set up queue for a breadth-first traversal, starting at the root
        // and visiting all currently-active states
        const queue = [
            [ root, false, value ],
        ];

        while(queue.length && this._shouldRun(path, run)) {
            const [ parent, node, values ] = queue.shift();

            const id = childPath(path, node);

            _log(`[${path}][_walk #${run}][${id}] walking`);

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(id)) {
                const details = _paths.get(id);
                let cached = false;

                if(_cache.has(id)) {
                    cached = _cache.get(id);

                    // Only cache items from the previous run are valid
                    if(cached.run === run - 1) {
                        cached.run = run;
                    } else {
                        cached = false;

                        _cache.delete(id);
                    }
                }

                _log(`[${path}][_walk #${run}][${id}] cached?`, Boolean(cached));

                const { component = false, props = false, load } = details;

                const item = {
                    __proto__ : null,

                    machine : path,

                    // Purposefully *not* prefixing w/ path here, end-users don't care about it
                    path : node,

                    component : cached ? cached.item.component : component,
                    props     : cached ? cached.item.props : props,
                    children  : [],
                };

                // Run load function and assign the response to the component prop
                if(load && !cached.loaded) {
                    _log(`[${path}][_walk #${run}][${id}] loading component`);

                    const loading = loadComponent({
                        item,
                        load,
                        context,
                        event,
                    });

                    // Mark this state loaded in the cache once its actually done
                    loading.then(() => {
                        const saved = _cache.get(id);

                        if(saved && saved.run === run) {
                            _log(`[${path}][_walk #${run}][${id}] component loaded`);

                            saved.loaded = true;
                        } else {
                            _log(`[${path}][_walk #${run}][${id}] component load discarded`);
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
                        run,
                        loaded : false,
                    });
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invokables.has(id)) {
                _invokables.get(id).forEach((invokable) => {
                    if(_actors.has(invokable)) {
                        loads.push(loadChild({
                            tree : _actors.get(invokable).tree,
                            root : pointer,
                        }));
                    }
                });
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, childPath(node, values), false ]);
            } else {
                const keys = Object.keys(values);
    
                (_options.stable ? keys.sort() : keys).forEach((child) =>
                    queue.push([ pointer, childPath(node, child), values[child] ])
                );
            }
        }

        // await any load functions
        if(loads.length) {
            _log(`[${path}][_walk #${run}] awaiting async loadings`);

            await Promise.all(loads);

            _log(`[${path}][_walk #${run}] async loadings finished`);
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
        this._actors.clear();
        this._listeners.clear();
        this._unsubscribes.clear();
        
        this._paths = null;
        this._invokables = null;
        this._cache = null;
        this._actors = null;
        this._listeners = null;
        this._unsubscribes = null;
        this._options = null;
        this._log = null;
        this._boundApis = null;
    }

    /**
     * Send an event to the actor and all its children
     *
     * @param {EventObject} event XState event to send
     * @param {SendActionOptions} [options] XState options to send
     */
    broadcast(event, options) {
        // Cache off the current keys so we don't iterate newly-created machines
        const ids = [ ...this._actors.keys() ];

        for(const id of ids) {
            const info = this._actors.get(id);

            /* c8 ignore start */
            if(!info) {
                continue;
            }
            /* c8 ignore stop */

            info.actor.send(event, options);
        }
    }

    /**
     * Check if the current state or any child states have a tag set
     *
     * @type {HasTag}
     */
    hasTag(tag) {
        for(const [ , { state }] of this._actors) {
            if(state.hasTag(tag)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the current state or any child states can make a transition
     *
     * @type {Can}
     */
     can(event) {
        for(const [ , { state }] of this._actors) {
            if(state.can(event)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the current state or any child states match a path
     *
     * @type {Matches}
     */
    matches(path) {
        for(const [ , { state }] of this._actors) {
            if(state.matches(path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Send an event to the root machine only
     *
     * @param {EventObject[]} event Event to send
     * @returns {AnyMachineSnapshot} Resulting state
     */
    send(...event) {
        return this._actors.get(this.id)?.actor?.send(...event);
    }

    /**
     * Provides an observable API, matches the svelte store contract
     * https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract
     *
     * @param {Subscriber} callback function to be called whenever a new tree is generated
     * @returns {Unsubscriber} Unsubscribe function
     */
    subscribe(callback) {
        this._listeners.add(callback);

        callback(this._result);

        return () => this._listeners.delete(callback);
    }
}

export {
    ComponentTree,
};
