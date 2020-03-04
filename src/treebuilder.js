const loadComponent = async ({ item, load, context, event }) => {
    const result = await load(context, event);

    if(Array.isArray(result)) {
        const [ component, props ] = result;

        item.component = component;
        item.props = props;
    } else {
        item.component = result;
    }
};

const loadChild = async ({ child, root }) => {
    const { _tree } = child;
    
    const children = await _tree;

    // Will attach to the state itself if it has a component,
    // otherwise will attach to the parent
    root.children.push(...children);
};

class ComponentTree {
    constructor(interpreter, callback) {
        // Storing off args
        this.interpreter = interpreter;
        this.callback = callback;

        // identifier!
        this.id = interpreter.id;

        // Count # of times tree has been walked for cache viability
        this._counter = 0;

        // Caching for results of previous walks
        this._cache = new Map();

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invocables = new Map();

        // invoked id -> child machine
        this._children = new Map();

        // Result of the walk is also available albeit quietly
        this._tree = false;

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
        const { _paths, _invocables, interpreter } = this;
        const { idMap : ids } = interpreter.machine;

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

    // Subscribe to an interpreter
    _watch() {
        const { interpreter } = this;
    
        // Subscribing will start a run of the machine
        const { unsubscribe } = interpreter.subscribe(this._state.bind(this));

        this._unsubscribe = unsubscribe;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk({ value, context, event }) {
        const { _paths, _invocables, _children, _cache, _counter } = this;

        const loads = [];
        const root = {
            __proto__ : null,
            id        : this.id,
            children  : [],
        };

        // Set up queue for a breadth-first traversal of all active states
        let queue;

        if(typeof value === "string") {
            queue = [[ root, value, false ]];
        } else {
            queue = Object.keys(value).map((child) =>
                [ root, child, value[child] ]
            );
        }

        // eslint-disable-next-line no-unmodified-loop-condition
        while(queue.length && _counter === this._counter) {
            const [ parent, path, values ] = queue.shift();

            // Using let since it can be reassigned if we add a new child
            let pointer = parent;

            if(_paths.has(path)) {
                const details = _paths.get(path);
                let cached = false;

                // Only cache items from the previous run are valid
                if(_cache.has(path) && _cache.get(path).counter === this._counter - 1) {
                    cached = _cache.get(path);

                    // Update counter since it's still valid
                    cached.counter = this._counter;
                } else {
                    _cache.delete(path);
                }

                const { component = false, props = false, load } = details;

                const item = {
                    __proto__ : null,
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

                    // Mark this state loaded in the cache once its acutally done
                    loading.then(() => {
                        const saved = _cache.get(path);

                        saved.loaded = true;
                    });

                    loads.push(loading);
                }

                if(!cached) {
                    _cache.set(path, {
                        __proto__ : null,
                        item,
                        counter   : this._counter,
                        loaded    : false,
                    });
                }

                parent.children.push(item);
                pointer = item;
            }

            if(_invocables.has(path)) {
                const id = _invocables.get(path);

                if(_children.has(id)) {
                    loads.push(loadChild({
                        child : _children.get(id),
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

            queue.push(...Object.keys(values).map((child) =>
                [ pointer, `${path}.${child}`, values[child] ]
            ));
        }

        if(_counter !== this._counter) {
            return false;
        }

        // await all the load functions
        await Promise.all(loads);

        return root.children;
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run(data) {
        // Cancel any previous walks, we're the captain now
        const run = ++this._counter;
        
        this._tree = this._walk(data);

        const [ tree ] = await Promise.all([
            this._tree,
            [ ...this._children.values() ].map(({ _tree }) => _tree),
        ]);

        // New run started since this finished, abort
        if(run !== this._counter) {
            return;
        }
        
        this.callback(tree, { data });
    }
    
    // Callback for statechart transitions to sync up child machine states
    _state(data) {
        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(data.changed === false) {
            return false;
        }

        const { children } = data;
        const { _children } = this;
        
        // Clear out any old children that are no longer being tracked
        _children.forEach((child, key) => {
            if(key in children) {
                return;
            }

            child.teardown();
            _children.delete(key);
        });

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

            // Create the child ComponentTree instance, trigger re-walks of the parent after it chnages
            _children.set(id, new ComponentTree(service, () =>
                this._run(data)
            ));
        });
    
        return this._run(data);
    }
}

export default ComponentTree;
