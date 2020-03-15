const loadComponent = async ({ item, load, context, event }) => {
    const result = await load(context, event);

    if(Array.isArray(result)) {
        const [ component, props ] = await Promise.all(result);

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
    constructor(interpreter, callback, { cache = true } = false) {
        // Storing off args + options
        this._interpreter = interpreter;
        this._callback = callback;
        this._caching = cache;

        // identifier!
        this.id = interpreter.id;

        // Count # of times tree has been walked, used by cache & for walk cancellation
        this._counter = 0;

        // Caching for results of previous walks
        this._cache = new Map();

        // path -> meta lookup
        this._paths = new Map();

        // path -> invoked id
        this._invocables = new Map();

        // invoked id -> child machine
        this._children = new Map();

        // Expose walk result as a property
        this._tree = false;

        // Last event this saw, used to re-create the tree when a child transitions
        this._data = false;

        // Get goin
        this._prep();
        this._watch();
    }

    teardown() {
        this._paths.clear();
        this._invocables.clear();
        this._children.clear();
        this._cache.clear();
        
        this._tree = null;
        this._data = null;
        this.options = null;

        this._unsubscribe();
    }

    // Walk the machine and build up maps of paths to meta info as
    // well as prepping any load functions for usage later
    _prep() {
        const { _paths, _invocables, _interpreter, _caching } = this;
        const { idMap : ids } = _interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const { path, meta = false, invoke } = ids[id];

            const key = path.join(".");

            if(meta) {
                _paths.set(key, {
                    __proto__ : null,

                    cache : _caching,

                    ...meta,
                });
            }

            // .invoke is always an array
            invoke.forEach(({ id : invokeid }) => _invocables.set(key, invokeid));
        }
    }

    // Subscribe to an interpreter
    _watch() {
        const { _interpreter } = this;
    
        // Subscribing will start a run of the machine, so no need to manually
        // kick one off
        const { unsubscribe } = _interpreter.subscribe((data) => this._state(data));

        this._unsubscribe = unsubscribe;
    }

    // Walk a machine via BFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements, complexity
    async _walk() {
        const {
           _paths,
           _invocables,
           _children,
           _cache,
           _counter,
           _data : { value, context, event },
        } = this;
        
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

        // await all the load functions
        await Promise.all(loads);

        return root.children;
    }

    // Kicks off tree walks & handles overlapping walk behaviors
    async _run() {
        const { _children, _callback } = this;

        // Cancel any previous walks, we're the captain now
        const run = ++this._counter;
        
        this._tree = this._walk();

        const [ tree ] = await Promise.all([
            this._tree,
            [ ..._children.values() ].map(({ _tree }) => _tree),
        ]);

        // New run started since this finished, abort
        if(run !== this._counter) {
            return;
        }
        
        _callback(tree, { data : this._data });
    }
    
    // Callback for statechart transitions to sync up child machine states
    _state(data) {
        const { changed, children } = data;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return false;
        }

        // Save off the event, but only the fields we need
        this._data = {
            __proto__ : null,

            value   : data.value,
            event   : data.event,
            context : data.context,
        };

        const { _children } = this;
        
        // Clear out any old children that are no longer being tracked
        _children.forEach((child, key) => {
            if(key in children) {
                return;
            }

            child.teardown();
            child = null;

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
                this._run()
            ));
        });
    
        return this._run();
    }
}

export default ComponentTree;
