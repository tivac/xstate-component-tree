/**
 * @import { AnyMachineSnapshot, AnyActor, EventObject, ParameterizedObject } from "xstate"
 */

/**
 * @typedef {( path: string ) => boolean} Matches
 * @typedef {( event : EventObject) => boolean} Can
 * @typedef {( tag : string ) => boolean} HasTag
 * @typedef {() => Result} Subscriber
 * @typedef {() => void } Unsubscriber
 */

/**
 * @typedef {{ tree : object[], state : AnyMachineSnapshot, matches : Matches, can : Can, hasTag : HasTag }} Result
 */

// eslint-disable-next-line no-empty-function
const noop = () => {};

const loadComponent = async ({ item, load, context, event }) => {
    const result = await load({ context, event });

    let component;
    let properties;

    if(Array.isArray(result)) {
        [ component, properties ] = await Promise.all(result);
    } else {
        component = result;
    }

    item.component = component || false;
    item.props = properties || false;
};

const loadChild = async ({ tree, root }) => {
    const children = await tree;

    // Will attach to the state itself if it has a component,
    // otherwise will attach to the parent
    root.children.push(...children);
};

const childPath = (...arguments_) => arguments_
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

        this._destroyed = false;

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
        this._result = Object.assign(Object.create(null), {
            tree  : [],
            state : actor.getSnapshot(),
            ...this._boundApis,
        });

        // Add the main actor to be tracked
        this._addActor({ path : this.id, actor });

        // Get goin
        this._watch(this.id);
    }

    _addActor({ path, actor, parent = false }) {
        const actorInfo = {
            actor,
            parent,

            // Count # of times tree has been walked, used by cache & for walk cancellation
            run : 0,

            // Stored transition result, used to re-create the tree when a child transitions
            state : actor.getSnapshot(),

            // Last transition-causing event
            event : false,

            // Machine definition currently backing this actor
            machine : false,

            // Walk results
            tree : [],
        };

        this._actors.set(path, actorInfo);

        // I HATE THIS
        // Monkey-patching actor.send to store the event that was passed-in, because
        // xstate@5 doesn't provide that any more from actor.getSnapshot() or the snapshot
        // passed to actor.subscribe(). I could rework this entirely to use the `inspect` API
        // but that isn't something I'm particularly excited about atm.
        //
        // https://github.com/statelyai/xstate/issues/4074
        // https://github.com/statelyai/xstate/discussions/4649
        const originalSend = actor.send;

        actor.send = (event) => {
            actorInfo.event = event;

            originalSend.call(actor, event);
        };
    }

    _syncMachine(path, state) {
        const { _paths, _actors, _invokables, _options, _log } = this;

        const current = _actors.get(path);

        const { machine } = state;

        if(!machine) {
            return false;
        }

        const changed = current.machine !== machine;

        if(!changed) {
            return false;
        }

        current.machine = machine;

        _log(`[${path}][_syncMachine] rebuilding metadata`);

        const { idMap : ids, root } = machine;

        if(root.meta) {
            _paths.set(path, Object.assign(Object.create(null), {
                cache : _options.cache,
            }, root.meta));
        }

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const item of ids.values()) {
            const key = childPath(path, ...item.path);

            if(item.meta) {
                _paths.set(key, Object.assign(Object.create(null), {
                    cache : _options.cache,
                }, item.meta));
            }

            _invokables.set(
                key,
                item.invoke.map(({ id : invoked }) => childPath(path, `#${invoked}`)),
            );
        }

        _log(`[${path}][_syncMachine] _paths`, [ ..._paths.keys() ]);
        _log(`[${path}][_syncMachine] _invokables`, [ ..._invokables.entries() ]);

        return true;
    }

    // Subscribe to an interpreter
    _watch(path) {
        const { _actors, _log } = this;
        
        _log(`[${path}][_watch] prepping`);

        const { actor } = _actors.get(path);

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
            _log(`[${path}][_onState] State hasn't changed`);

            return;
        }
        
        // Save off the state
        current.state = state;

        const machineChanged = this._syncMachine(path, state);

        const { children } = state;
        
        _log(`[${path}][_onState] checking children`);

        // Add any new children to be tracked
        for(const child of Object.keys(children)) {
            const id = childPath(path, `#${child}`);

            if(_actors.has(id)) {
                _log(`[${path}][_onState] Already seen child ${id}`);

                continue;
            }

            const actor = children[child];

            // Not a statechart or fromMachine actor, abort!
            if(!actor?.logic?.__xstatenode && !actor?.logic?.__fromMachine) {
                continue;
            }

            _log(`[${path}][_onState] Tracking child ${id}`);

            // These arg names are... confusing
            this._addActor({ path : id, actor, parent : path });

            // Start watching the child
            this._watch(id);
        }

        // Force root rebuild when async machine appears
        if(machineChanged && path !== this.id) {
            this._run(this.id);
        }

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
    // eslint-disable-next-line max-statements -- it's just complicated
    async _run(path) {
        const { _options, _actors, _log } = this;

        const root = path === this.id;
        const actor = _actors.get(path);

        /* c8 ignore start */
        if(!actor) {
            _log(`[${path}][_run()] aborted, unknown actor`);

            return false;
        }
        /* c8 ignore stop */

        _log(`[${path}][_run()] starting`);

        // Cancel any previous walks, we're the captain now
        const run = ++actor.run;
        
        _log(`[${path}][_run #${run}] started`);

        actor.tree = this._walk(path);

        const trees = [ actor.tree ];

        // Only care about all other trees when we're the root
        if(root) {
            for(const [ p, { tree : t }] of _actors.entries()) {
                if(p !== path) {
                    trees.push(t);
                }
            }
        }

        const [ tree ] = await Promise.all(trees);

        // New run started since this finished, abort
        if(!this._shouldRun(path, run)) {
            _log(`[${path}][_run #${run}] aborted`);

            return false;
        }

        _log(`[${path}][_run #${run}] finished`);

        // Trigger parent run if we got one
        if(actor.parent) {
            return this._run(actor.parent);
        }

        _log(`[${path}][_run #${run}] returning data`);

        // bail if torn down during async work
        /* c8 ignore start */
        if(this._destroyed) {
            return false;
        }
        /* c8 ignore end */

        this._result = Object.assign(Object.create(null), {
            tree,
            state : actor.state,
            ...this._boundApis,
        });

        if(_options.callback && this._listeners) {
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

        const { run, state, event } = _actors.get(path);

        this._syncMachine(path, state);

        /* c8 ignore start */
        if(_paths.size === 0) {
            return [];
        }
        /* c8 ignore stop */

        _log(`[${path}][_walk #${run}] walking`);

        const { value, context } = state;

        const loads = [];
        const root = Object.assign(Object.create(null), {
            children : [],
        });

        // Set up queue for a breadth-first traversal, starting at the root
        // and visiting all currently-active states
        const queue = [
            [ root, false, value ],
        ];

        while(queue.length > 0 && this._shouldRun(path, run)) {
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

                const { component = false, props : properties = false, load } = details;

                const item = Object.assign(Object.create(null), {
                    machine : path,
                    
                    // Purposefully *not* prefixing w/ path here, end-users don't care about it
                    path : node,
                    
                    component : cached ? cached.item.component : component,
                    props     : cached ? cached.item.props : properties,
                    children  : [],
                });

                // Run load function and assign the response to the component prop
                if(load && !cached?.loaded) {
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

                // Check if this node is allowed to be cached & not already cached,
                // then save the result
                if(details.cache && !cached) {
                    _cache.set(id, Object.assign(Object.create(null), {
                        item,
                        run,
                        loaded : false,
                    }));
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invokables.has(id)) {
                for(const invokable of _invokables.get(id)) {
                    if(_actors.has(invokable)) {
                        loads.push(loadChild({
                            tree : _actors.get(invokable).tree,
                            root : pointer,
                        }));
                    }
                }
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ pointer, childPath(node, values), false ]);
            } else {
                const keys = Object.keys(values);
    
                for(const child of _options.stable ? keys.toSorted() : keys) {
                    queue.push([ pointer, childPath(node, child), values[child] ]);
                }
            }
        }

        // await any load functions
        if(loads.length > 0) {
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

        this._destroyed = true;

        for(const unsub of this._unsubscribes) {
            unsub();
        }
        
        this._paths.clear();
        this._invokables.clear();
        this._cache.clear();
        this._actors.clear();
        this._listeners.clear();
        this._unsubscribes.clear();
        
        this._paths = undefined;
        this._invokables = undefined;
        this._cache = undefined;
        this._actors = undefined;
        this._listeners = undefined;
        this._unsubscribes = undefined;
        this._options = undefined;
        this._log = undefined;
        this._boundApis = undefined;
    }

    /**
     * Send an event to the actor and all its children
     *
     * @param {EventObject} event XState event to send
     * @param {ParameterizedObject['params']?} [options] XState options to send
     */
    broadcast(event, options) {
        // Cache off the current keys so we don't iterate newly-created machines
        const ids = [ ...this._actors.keys() ];

        for(const id of ids) {
            const { actor } = this._actors.get(id) ?? false;

            /* c8 ignore start */
            if(!actor) {
                continue;
            }
            /* c8 ignore stop */

            actor.send(event, options);
        }
    }

    /**
     * Check if the current state or any child states have a tag set
     *
     * @type {HasTag}
     */
    hasTag(tag) {
        if(this._destroyed) {
            return false;
        }

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
        if(this._destroyed) {
            return false;
        }

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
        if(this._destroyed) {
            return false;
        }

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
        if(this._destroyed) {
            return false;
        }
        
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
        if(this._destroyed) {
            return noop;
        }

        this._listeners.add(callback);

        callback(this._result);

        return () => this._listeners.delete(callback);
    }
}

export {
    ComponentTree,
};
