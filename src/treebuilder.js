// eslint-disable-next-line no-empty-function
const noop = () => {};

const treeBuilder = (interpreter, fn) => {
    const { idMap : ids } = interpreter.machine;
    const paths = new Map();
    const loaders = new Map();

    let req = 0;

    // xstate maps ids to state nodes, but the value object only
    // has paths, so need to create our own path-only map here
    for(const id in ids) {
        const { path, meta } = ids[id];

        if(!meta) {
            continue;
        }

        const key = path.join(".");

        if(meta.load) {
            loaders.set(key, async (item, ...args) => {
                item.component = await meta.load(...args);
            });
        }

        paths.set(key, meta);
    }

    console.log({ paths, loaders });

    // eslint-disable-next-line max-statements
    interpreter.onTransition(async (state) => {
        const { changed, value, context, event } = state;
        
        if(changed === false) {
            return;
        }
        
        const ver = ++req;
        const loads = [];
        const tree = { __proto__ : null };
        
        let tier = [];
        let prev = -1;
        let pointer = tree;
        
        // Depth-first traversal of the currently-active states
        // Start at a special virtual root value, since
        // this isn't a strict tree. Also need the ternary since xstate will
        // return a single string value for statecharts with only one node
        const queue = [[
            "root",
            typeof value === "object" ?
                value :
                {
                    __proto__ : null,
                    [value]   : false,
                },
        ]];

        while(queue.length) {
            const [ current, children ] = queue.shift();

            if(current === "root") {
                queue.push(...Object.entries(children).map(([ path, grandchildren ]) => {
                    path = [ path ];

                    return [ path, grandchildren ];
                }));

                continue;
            }

            if(current.length > prev) {
                prev = current.length;

                if(tier.length) {
                    pointer.components = tier;
                    pointer.children = { __proto__ : null };

                    pointer = pointer.children;

                    tier = [];
                }
            }

            const path = current.join(".");
            
            if(paths.has(path)) {
                const { component = noop } = paths.get(path);
                const item = {
                    __proto__ : null,
                    component,
                };

                // Run load function and assign the response to the component prop
                if(loaders.has(path)) {
                    loads.push(loaders.get(path)(item, context, event));
                }

                tier.push(item);
            }

            if(!children) {
                continue;
            }

            if(typeof children === "string") {
                queue.push([[ ...current, children ], false ]);

                continue;
            }

            queue.push(...Object.entries(children).map(([ path, grandchildren ]) => {
                path = [ ...current, path ];

                return [ path, grandchildren ];
            }));
        }

        if(tier.length) {
            pointer.components = tier;
            pointer.children = null;
        }

        // await all the load functions
        await Promise.all(loads);

        // sttechart transitioned again before component tree was ready, so
        // throw away the old values
        if(ver !== req) {
            return;
        }

        fn(tree);
    });
};

export default treeBuilder;
