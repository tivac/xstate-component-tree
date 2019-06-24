import valid from "./valid-states.js";

const buildTree = async (service) => {
    const { context, event, activities } = service.state;

    // Find all the active components for the current state
    const states = valid(service.state);

    const invoked = activities["xstate.invoke"];

    // And on any invoked machines as well
    service.children.forEach(({ state }, id) => {
        if(!state) {
            return;
        }

        let prefix;

        // TODO: not convinced this is actually a good idea
        if(invoked && invoked.activity.id === id) {
            prefix = invoked.activity.src.split(":")[0].replace(new RegExp(`${service.id}\\.`), "");
        }

        const out = valid(state, prefix);

        out.forEach((component, key) => states.set(key, component));
    });

    // Walk all current states and resolve/load all the components within 'em
    const promises = [ ...states.entries() ].map(async ([ state, meta = false ]) => {
        // Supports bare components that are new-able or arrow functions, which are assumed
        // to contain nothing but an import() statement
        let child;

        const { component, load } = meta;

        if(component) {
            child = component;
        } else {
            child = await load();
        }

        // Supports an object, which will be shallow-cloned, or a function which gets
        // passed the context value
        const props = typeof meta.props === "function" ?
            meta.props(context, event) :
            Object.assign(Object.create(null), meta.props);

        return {
            state,
            page : {
                child,
                props,
            },
        };
    });

    // Let all the await calls up above settle
    const resolved = await Promise.all(promises);

    // List of component hierarchies to draw
    const components = new Map();

    resolved.forEach(({ state, page }) => {
        // Build branches from nested components, assigning to the nearest shared ancestor
        let assigned = false;
        const parts = state.split(".");

        for(let idx = 1; idx < parts.length; idx++) {
            const key = parts.slice(0, idx).join(".");

            if(!states.has(key) || !components.has(key)) {
                continue;
            }

            components.get(key).push(page);

            assigned = true;

            break;
        }

        // No common parent for this state, so it creates a new branch of components
        if(!assigned && page.child) {
            components.set(state, [ page ]);
        }
    });

    return components;
};

export default buildTree;
