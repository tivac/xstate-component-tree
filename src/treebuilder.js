import { toStatePath } from "xstate/lib/utils.js";

// const traverse = ({ root, value, meta }) => {
//     // short-circuit in the "single-top level state" case
//     if(typeof value === "string") {
//         return [ value ];
//     }

//     const queue = [ Object.keys(value)[0] ];

//     while(queue.length) {
//         const current = queue.shift();

//         // TODO: check meta object for this value
//     }
// };

const treeBuilder = (interpreter, fn) => {
    const root = interpreter.machine.key;
    
    // eslint-disable-next-line max-statements
    interpreter.onTransition((state) => {
        const { changed, value, meta } = state;
        
        console.log(state.configuration);
        
        if(changed === false) {
            return;
        }

        if(typeof value === "string") {
            const { meta } = state.configuration.find(({ key }) => key === value);

            return fn(meta);
        }

        console.log({
            value,
            meta,
        });
        // console.log(state.toStrings());

        // Depth-first traversal of the currently-active states
        // TODO: how best to identify meta value from this?
        // Maybe store full paths to nodes somehow?

        // Start at a special virtual root value, since
        // this isn't a strict tree
        const queue = [[ "root", value ]];

        while(queue.length) {
            const [ current, children ] = queue.shift();

            console.log(current);

            if(current === "root") {
                queue.push(...Object.entries(children).map(([ path, grandchildren ]) => {
                    path = [ path ];

                    return [ path, grandchildren ];
                }));

                continue;
            }

            // TODO: Find key using path somehow
            const statenode = state.configuration.find(({ key }) => key === current);

            // console.log({ current, state });

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
    });
};

export default treeBuilder;
