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

        // invoked id -> path lookup
        this._invocables = new Map();

        // active children
        this._children = new Map();

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
                invoke.forEach(({ id : invokeid }) => _invocables.set(invokeid, key));
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
    async _walk({ value, context, event }) {
        const { _paths, _invocables, _children } = this;
        
        const loads = [];
        const tree = {
            __proto__ : null,
            id        : this.id,
            children  : [],
        };

        // Set up queue for a breadth-first traversal of all active states
        let queue;

        if(typeof value === "string") {
            queue = [[ tree, value, false ]];
        } else {
            queue = Object.entries(value).map(([ child, grandchildren ]) =>
                [ tree, child, grandchildren ]
            );
        }

        while(queue.length) {
            const [ parent, path, values ] = queue.shift();

            // Since it can be assigned if we add a new child
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

                if(_invocables.has(path)) {
                    const id = _invocables.get(path);
                    const { tree : invoked } = _children.get(id);

                    if(invoked) {
                        parent.children.push(invoked);
                    }
                }

                parent.children.push(item);

                pointer = item;
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

        // await all the load functions
        await Promise.all(loads);

        return tree;
    }
    
    // eslint-disable-next-line max-statements
    async _state({ changed, value, context, event, children }) {
        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return;
        }

        const { _children } = this;

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

            _children.set(id, {
                tree  : false,
                child : new ComponentTree(service, async (tree) => {
                    const entry = _children.get(id);

                    entry.tree = tree;

                    _children.set(id, entry);

                    // TODO: Need to trigger output now that this has changed
                    // Call _walk again somehow? Needs more thinking!

                    const out = await this._walk({ value, context, event });
        
                    this.callback(out);
                }),
            });
        });

        console.log(_children);

        const tree = await this._walk({ value, context, event });
        
        this.callback(tree);
    }
}

const treeBuilder = (interpreter, fn) => {
    new ComponentTree(interpreter, fn);
};

treeBuilder.ComponentTree = ComponentTree;

export default treeBuilder;
