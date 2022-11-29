import { createMachine as xstateCreate, interpret } from "xstate";

import ComponentTree from "../../src/component-tree.js";

const deferred = () => {
    let resolve;
    let reject;
    
    const p = new Promise((ok, no) => {
        resolve = ok;
        reject = no;
    });

    p.resolve = resolve;
    p.reject = reject;

    return p;
};

// Watch for trees to be built, and provide an easy way
// to await each value
export const trees = (service, options = {}, fn = false) => {
    const responses = [];
    let idx = 0;
    let p;
    let resolved;

    const respond = () => {
        if(resolved || idx >= responses.length || !p) {
            return;
        }

        const response = responses[idx++];

        p.resolve({ tree : response[0], extra : response[1] });
    };

    const out = () => {
        p = deferred();
        resolved = false;

        respond();

        return p.then((data) => {
            resolved = true;

            return data;
        });
    };

    out.responses = responses;
    
    // Push new tree states onto array and respond if a request is waiting
    out.builder = new ComponentTree(service, (...other) => {
        responses.push(other);

        if(fn) {
            fn(other);
        }

        respond();
    }, options);

    out.send = (...args) => service.send(...args);

    out.service = service;

    service.start();

    return out;
};

export const createMachine = (def) => (
    def.__xstatenode ?
        def :
        xstateCreate({ ...def, predictableActionArguments : true })
);

export const createTree = (def, ...rest) => {
    const machine = createMachine(def);
    const service = interpret(machine);

    return trees(service, ...rest);
};

export const getTree = async (def, ...rest) => {
    const generator = createTree(def, ...rest);

    const result = await generator();

    generator.builder.teardown();

    return result;
};

export const waitForPath = async (tree, path) => {
    let found = false;
    let val;

    do {
        // eslint-disable-next-line no-await-in-loop
        val = await tree();

        const searching = [ ...val.tree ];

        while(searching.length) {
            const item = searching.shift();

            if(item.path === path) {
                found = true;
                break;
            }

            searching.push(...item.children);
        }
    } while(!found);

    return val;
};
