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
 * @typedef {{ tree : any[], state : AnyMachineSnapshot, matches : Matches, can : Can, hasTag : HasTag }} Result
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
    // References to all the actors being tracked
    #actors = new Map();

    // Active subscribers
    #listeners = new Set();

    // Caching for results of previous walks
    #cache = new Map();

    // path -> meta lookup
    #paths = new Map();

    // path -> invoked id
    #invokables = new Map();

    // Unsubscribe functions
    #unsubscribes = new Set();

    #log = noop;

    #result = Object.create(null);

    #options = Object.assign(Object.create(null), {
        // Whether or not to cache the result of dynamic component/prop functions
        cache : true,
        // Whether or not to sort keys to ensure component output order is more stable
        stable : false,
        // How noisy should we be?
        verbose : false,
        callback : noop,
    });

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
        // identifier!
        this.id = actor.id;

        // Storing off args + options
        this.#options = Object.assign(this.#options, options, {
            callback,
        });

        if(this.#options.verbose) {
            // eslint-disable-next-line no-console
            this.#log = console.log;
        }

        // Save off bound versions of the APIs for mixing into results
        this._boundApis = {
            matches : this.matches.bind(this),
            hasTag : this.hasTag.bind(this),
            can : this.can.bind(this),
            broadcast : this.broadcast.bind(this),
        };

        // Store off previous results in case new subscribers show up
        this.#result = Object.assign(this.#result, {
            tree : [],
            state : actor.getSnapshot(),

            ...this._boundApis,
        });

        // Add the main actor to be tracked
        this.#addActor({ path : this.id, actor });

        // Get goin
        this.#watch(this.id);
    }

    #addActor({ path, actor, parent = false }) {
        const actorInfo = {
            actor,
            parent,

            // Count # of times tree has been walked, used by cache & for walk cancellation
            run : 0,

            // Stored transition result, used to re-create the tree when a child transitions
            state : actor.getSnapshot(),

            // Last transition-causing event
            event : false,

            // Walk results
            tree : [],
        };

        this.#actors.set(path, actorInfo);

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

    // Subscribe to an interpreter
    #watch(path) {
        this.#log(`[${path}][#watch] prepping`);

        const { actor } = this.#actors.get(path);

        // Build up maps of paths to meta info as well as noting any invokable machines for later
        const { idMap : ids, root } = actor.logic;

        // Support metadata at the root of the machine
        if(root.meta) {
            this.#paths.set(path, Object.assign(Object.create(null), {
                cache : this.#options.cache,
            }, root.meta));
        }

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const item of ids.values()) {
            const key = childPath(path, ...item.path);

            if(item.meta) {
                this.#paths.set(key, Object.assign(Object.create(null), {
                    cache : this.#options.cache,
                }, item.meta));
            }

            // .invoke is always an array
            this.#invokables.set(key, item.invoke.map(({ id : invoked }) => childPath(path, `#${invoked}`)));
        }

        this.#log(`[${path}][#watch] #paths`, [ ...this.#paths.keys() ]);
        this.#log(`[${path}][#watch] #invokables`, [ ...this.#invokables.entries() ]);

        this.#log(`[${path}][#watch] subscribing`);

        const { unsubscribe } = actor.subscribe({
            // Actor has transitioned states
            next : (state) => {
                this.#log(`[${path}][subscribe.next] update`);

                this.#onState(path, state);
            },

            // Actor has completed
            complete : () => {
                this.#log(`[${path}][subscribe.complete] stopped, tearing down`);

                unsubscribe();

                this.#unsubscribes.delete(unsubscribe);
                this.#actors.delete(path);

                // Clean up #paths and #invokables of any entries from this machine
                const prefix = `${path}.`;

                for(const key of this.#paths.keys()) {
                    if(key === path || key.startsWith(prefix)) {
                        this.#paths.delete(key);
                    }
                }

                for(const key of this.#invokables.keys()) {
                    if(key === path || key.startsWith(prefix)) {
                        this.#invokables.delete(key);
                    }
                }
            },
        });

        this.#unsubscribes.add(unsubscribe);

        // Run against current state of the machine
        this.#onState(path, actor.getSnapshot());
    }

    // Callback for statechart transitions to sync up child machine states
    #onState(path, state) {
        const current = this.#actors.get(path);

        if(state === current.state && current.run > 0) {
            this.#log(`[${path}][#onState] State hasn't changed`);

            return;
        }

        // Save off the state
        current.state = state;

        const { children } = state;

        this.#log(`[${path}][#onState] checking children`);

        // Add any new children to be tracked
        for(const child of Object.keys(children)) {
            const id = childPath(path, `#${child}`);

            if(this.#actors.has(id)) {
                this.#log(`[${path}][#onState] Already seen child ${id}`);

                continue;
            }

            const actor = children[child];

            // Not a statechart, abort!
            if(!actor?.logic?.__xstatenode) {
                continue;
            }

            this.#log(`[${path}][#onState] Tracking child ${id}`);

            // These arg names are... confusing
            this.#addActor({ path : id, actor, parent : path });

            // Start watching the child
            this.#watch(id);
        }

        // Rebuild this particular tree in case it changed
        this.#run(path);
    }

    #shouldRun(path, run) {
        return (
            Boolean(this.#actors) &&
            this.#actors.has(path) &&
            this.#actors.get(path).run === run
        );
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    // eslint-disable-next-line max-statements, @stylistic/keyword-spacing -- it's just complicated
    async #run(path) {
        const root = path === this.id;
        const actor = this.#actors.get(path);

        /* c8 ignore start */
        if(!actor) {
            this.#log(`[${path}][#run()] aborted, unknown actor`);

            return false;
        }
        /* c8 ignore stop */

        this.#log(`[${path}][#run()] starting`);

        // Cancel any previous walks, we're the captain now
        const run = ++actor.run;

        this.#log(`[${path}][#run #${run}] started`);

        actor.tree = this.#walk(path);

        const trees = [ actor.tree ];

        // Only care about all other trees when we're the root
        if(root) {
            for(const [ p, { tree : t }] of this.#actors.entries()) {
                if(p !== path) {
                    trees.push(t);
                }
            }
        }

        const [ tree ] = await Promise.all(trees);

        // New run started since this finished, abort
        if(!this.#shouldRun(path, run)) {
            this.#log(`[${path}][#run #${run}] aborted`);

            return false;
        }

        this.#log(`[${path}][#run #${run}] finished`);

        const { parent } = actor;

        // Trigger parent run if we got one
        if(parent) {
            return this.#run(parent);
        }

        this.#log(`[${path}][#run #${run}] returning data`);

        this.#result = Object.assign(this.#result, {
            tree,
            state : actor.state,
            ...this._boundApis,
        });

        if(this.#options.callback) {
            this.#options.callback(tree, this.#result);
        }

        for(const listener of this.#listeners) {
            listener(this.#result);
        }

        return true;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity, @stylistic/keyword-spacing
    async #walk(path) {
        const { run, state, event } = this.#actors.get(path);

        /* c8 ignore start */
        if(this.#paths.size === 0) {
            return [];
        }
        /* c8 ignore stop */

        this.#log(`[${path}][#walk #${run}] walking`);

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

        while(queue.length > 0 && this.#shouldRun(path, run)) {
            const [ parent, node, values ] = queue.shift();

            const id = childPath(path, node);

            this.#log(`[${path}][#walk #${run}][${id}] walking`);

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(this.#paths.has(id)) {
                const details = this.#paths.get(id);
                let cached = false;

                if(this.#cache.has(id)) {
                    cached = this.#cache.get(id);

                    // Only cache items from the previous run are valid
                    if(cached.run === run - 1) {
                        cached.run = run;
                    } else {
                        cached = false;

                        this.#cache.delete(id);
                    }
                }

                this.#log(`[${path}][#walk #${run}][${id}] cached?`, Boolean(cached));

                const { component = false, props : properties = false, load } = details;
                const item = Object.assign(Object.create(null), {
                    machine : path,

                    // Purposefully *not* prefixing w/ path here, end-users don't care about it
                    path : node,

                    component : cached ? cached.item.component : component,
                    props : cached ? cached.item.props : properties,
                    children : [],
                });

                // Run load function and assign the response to the component prop
                if(load && !cached.loaded) {
                    this.#log(`[${path}][#walk #${run}][${id}] loading component`);

                    const loading = loadComponent({
                        item,
                        load,
                        context,
                        event,
                    });

                    // Mark this state loaded in the cache once its actually done
                    loading.then(() => {
                        const saved = this.#cache.get(id);

                        if(saved && saved.run === run) {
                            this.#log(`[${path}][#walk #${run}][${id}] component loaded`);

                            saved.loaded = true;
                        } else {
                            this.#log(`[${path}][#walk #${run}][${id}] component load discarded`);
                        }
                    });

                    loads.push(loading);
                }

                // Check if this node is allowed to be cached && not already cached,
                // then save the result
                if(details.cache && !cached) {
                    this.#cache.set(id, Object.assign(Object.create(null), {
                        item,
                        run,
                        loaded : false,
                    }));
                }

                parent.children.push(item);
                pointer = item;
            }

            if(this.#invokables.has(id)) {
                for(const invokable of this.#invokables.get(id)) {
                    if(this.#actors.has(invokable)) {
                        loads.push(loadChild({
                            tree : this.#actors.get(invokable).tree,
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

                for(const child of this.#options.stable ? keys.toSorted() : keys) {
                    queue.push([ pointer, childPath(node, child), values[child] ]);
                }
            }
        }

        // await any load functions
        if(loads.length > 0) {
            this.#log(`[${path}][#walk #${run}] awaiting async loadings`);

            await Promise.all(loads);

            this.#log(`[${path}][#walk #${run}] async loadings finished`);
        }

        this.#log(`[${path}][#walk #${run}] done`);

        return root.children;
    }

    /**
     * Remove all subscribers and null out all properties
     */
    teardown() {
        this.#log(`[${this.id}][teardown] destroying`);

        for(const unsub of this.#unsubscribes) {
            unsub();
        }

        this.#paths.clear();
        this.#invokables.clear();
        this.#cache.clear();
        this.#actors.clear();
        this.#listeners.clear();
        this.#unsubscribes.clear();

        this.#paths = undefined;
        this.#invokables = undefined;
        this.#cache = undefined;
        this.#actors = undefined;
        this.#listeners = undefined;
        this.#unsubscribes = undefined;
        this.#options = undefined;
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
        const ids = [ ...this.#actors.keys() ];

        for(const id of ids) {
            const info = this.#actors.get(id);

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
        for(const [ , { state }] of this.#actors) {
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
        for(const [ , { state }] of this.#actors) {
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
        for(const [ , { state }] of this.#actors) {
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
        return this.#actors.get(this.id)?.actor?.send(...event);
    }

    /**
     * Provides an observable API, matches the svelte store contract
     * https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract
     *
     * @param {Subscriber} callback function to be called whenever a new tree is generated
     * @returns {Unsubscriber} Unsubscribe function
     */
    subscribe(callback) {
        this.#listeners.add(callback);

        callback(this.#result);

        return () => this.#listeners.delete(callback);
    }
}

export {
    ComponentTree,
};
