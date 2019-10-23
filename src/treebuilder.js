// eslint-disable-next-line no-empty-function
const noop = () => {};

class ComponentTree {
    constructor(interpreter, callback, options = {}) {
        if(typeof callback !== "function") {
            throw new Error("Must provide a callback function");
        }

        this.interpreter = interpreter;
        this.callback = callback;
        this.options = options;

        this._paths = new Map();
        this._loaders = new Map();
        this._invoked = new Map();
        this._req = 0;
        this._last = false;

        this._prep();
        this._watch();
    }

    teardown() {
        this._paths.clear();
        this._loaders.clear();

        // TODO: run teardown on all child ComponentTree instances
        this._invoked.clear();
    }

    // Walk the machine and build up maps of paths to meta info as
    // well as prepping any load functions for usage later
    _prep() {
        const { _paths, _loaders } = this;
        const { idMap : ids } = this.interpreter.machine;

        // xstate maps ids to state nodes, but the value object only
        // has paths, so need to create our own path-only map here
        for(const id in ids) {
            const { path, meta } = ids[id];

            if(!meta) {
                continue;
            }

            const key = path.join(".");

            if(meta.load) {
                _loaders.set(key, async (item, ...args) => {
                    item.component = await meta.load(...args);
                });
            }

            _paths.set(key, meta);
        }
    }

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
        const { _paths, _loaders } = this;
        
        const loads = [];
        const tree = {
            __proto__ : null,
            children  : [],
        };

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
                const { component = noop } = _paths.get(path);
                const item = {
                    __proto__ : null,
                    children  : [],
                    component,
                };

                // Run load function and assign the response to the component prop
                if(_loaders.has(path)) {
                    loads.push(_loaders.get(path)(item, context, event));
                }

                (parent.children || parent).push(item);

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
        const { _invoked } = this;
        const { changed, value, context, event } = state;

        // Need to specifically check for false because this value is undefined
        // when a machine first boots up
        if(changed === false) {
            return;
        }

        // Walk child statecharts, attach subscribers for each of them
        // Object.entries(state.children).forEach(async ([ id, child ]) => {
        //     if(_invoked.has(id)) {
        //         return;
        //     }

        //     // TODO: how do these get set into the tree and trigger responses?
        //     _invoked.set(id, new ComponentTree(child, console.log.bind(console, id)));
        // });

        // Remove any no-longer active invoked statecharts from being tracked
        // _invoked.forEach((cancel, id) => {
        //     if(id in state.children) {
        //         return;
        //     }

        //     cancel();
        //     _invoked.delete(id);
        // });

        // console.log(_invoked);

        this._req += 1;
        const ver = this._req;

        const tree = await this._walk({ value, context, event });
        
        // statechart transitioned again before component tree was ready, so
        // throw away the old values
        if(ver !== this._req) {
            return;
        }
        
        // Keep the last-replied w/ tree available
        this._last = tree;

        this.callback(tree);
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
