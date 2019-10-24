class ComponentTree {
    constructor(interpreter, callback, options = {}) {
        if(typeof callback !== "function") {
            throw new Error("Must provide a callback function");
        }

        // Storing off args
        this.interpreter = interpreter;
        this.callback = callback;
        this.options = options;

        // identifier!
        this._id = interpreter.id;

        // path -> meta lookup
        this._paths = new Map();

        // Storage of machine value by id, for tree assembly
        this._machines = options.machines || new Map();
        this._machines.set(this._id, {
            __proto__ : null,
            children  : [],
            id        : this._id,
        });
        
        // State tracking
        this._req = 0;

        // Get goin
        this._prep();
        this._watch();
    }

    teardown() {
        this._paths.clear();

        // TODO: run teardown on all child ComponentTree instances
        this._machines.clear();
    }

    // Walk the machine and build up maps of paths to meta info as
    // well as prepping any load functions for usage later
    _prep() {
        const { _paths } = this;
        const { idMap : ids } = this.interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const { path, meta = false } = ids[id];

            const key = path.join(".");

            if(!meta) {
                continue;
            }

            _paths.set(key, {
                component : meta.component,

                load : meta.load ?
                    async (item, ...args) => {
                        item.component = await meta.load(...args);
                    } :
                    false,
            });
        }
    }

    // Watch the machine for changes
    _watch() {
        const { interpreter } = this;
    
        const { unsubscribe } = interpreter.onTransition(this._state.bind(this));

        // In case the machine is already started, run a first pass on it
        if(interpreter.initialized) {
            this._state(interpreter.state);
        }
        
        // Return a clean up function that clears out our Maps and unsubs from xstate
        return unsubscribe;
    }

    // Walk a machine via DFS, collecting meta information to build a tree
    // eslint-disable-next-line max-statements
    async _walk({ value, context, event }) {
        const { _paths } = this;
        
        const loads = [];
        const tree = this._machines.get(this._id);

        // Depth-first traversal of the currently-active states
        // Start at a special virtual root value, since
        // this isn't a strict tree.
        const queue = [[
            "root",
            tree,

            // Need the ternary since xstate will
            // return a single string value for statecharts with only one node
            typeof value === "object" ?
                value :
                {
                    __proto__ : null,
                    [value]   : false,
                },
        ]];

        let pointer;

        while(queue.length) {
            const [ path, parent, values ] = queue.shift();

            // Early out on the root node, it's just a placeholder for all the top-level children
            if(path === "root") {
                queue.push(...Object.entries(values).map(([ child, grandchildren ]) =>
                    [ child, parent, grandchildren ]
                ));

                continue;
            }

            pointer = parent;

            if(_paths.has(path)) {
                const { component, loader } = _paths.get(path);
                const item = {
                    __proto__ : null,
                    children  : [],
                    component : component || false,
                };

                // Run load function and assign the response to the component prop
                if(loader) {
                    loads.push(loader(item, context, event));
                }

                parent.children.push(item);

                pointer = item;
            }

            if(!values) {
                continue;
            }

            if(typeof values === "string") {
                queue.push([ `${path}.${values}`, pointer, false ]);

                continue;
            }

            // TODO: what is this eslint warning for?
            queue.push(...Object.entries(values).map(([ child, grandchildren ]) =>
                [ `${path}.${child}`, pointer, grandchildren ]
            ));
        }

        // await all the load functions
        await Promise.all(loads);

        return tree;
    }
    
    // eslint-disable-next-line max-statements
    async _state(state) {
        const { _machines, _id } = this;
        const { changed, value, context, event } = state;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return;
        }

        // Walk child statecharts, attach subscribers for each of them
        Object.entries(state.children).forEach(async ([ id, child ]) => {
            // Don't need to resubscribe
            if(_machines.has(id)) {
                return;
            }

            // Passing along our machine instance so everyone can share
            // it and update the one global map
            new ComponentTree(child, () => this._respond(), { machines : _machines });
        });

        // Remove any no-longer active invoked statecharts from being tracked
        // _machines.forEach((cancel, id) => {
        //     if(id in state.children) {
        //         return;
        //     }

        //     cancel();
        //     _machines.delete(id);
        // });

        // console.log(_machines);

        this._req += 1;
        const ver = this._req;

        const tree = await this._walk({ value, context, event });
        
        // statechart transitioned again before component tree was ready, so
        // throw away the old values
        if(ver !== this._req) {
            return;
        }
        
        _machines.set(_id, tree);

        this._respond();
    }

    _respond() {
        const { _machines, callback } = this;

        console.log("RESPONDING", _machines);

        return callback([ ..._machines.values() ]);
    }
}

const treeBuilder = (interpreter, fn, options = {}) => {
    const builder = new ComponentTree(interpreter, fn, options);

    return builder;
};

export {
    treeBuilder,
    ComponentTree,
};
