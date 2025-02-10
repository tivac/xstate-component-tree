import { createMachine as xstateCreate, createActor } from "xstate";

import { ComponentTree } from "../../src/component-tree.js";

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
export const trees = (service, options = {}, function_ = false) => {
    const responses = [];
    let index = 0;
    let p;
    let resolved;

    const respond = () => {
        if(resolved || index >= responses.length || !p) {
            return;
        }

        const response = responses[index++];

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

        if(function_) {
            function_(other);
        }

        respond();
    }, options);

    out.send = (...arguments_) => service.send(...arguments_);

    out.service = service;

    service.start();

    return out;
};

export const createMachine = (definitions) => (
    definitions.__xstatenode ?
        definitions :
        xstateCreate({ ...definitions })
);

export const createTree = (definition, ...rest) => {
    const machine = createMachine({ id : "test", ...definition });
    const service = createActor(machine, { id : machine.id || "test" });

    return trees(service, ...rest);
};

export const getTree = async (definition, ...rest) => {
    const generator = createTree(definition, ...rest);

    const result = await generator();

    generator.builder.teardown();

    return result;
};

export const waitForPath = async (tree, path) => {
    let found = false;
    let value;

    do {
        // eslint-disable-next-line no-await-in-loop
        value = await tree();

        const searching = [ ...value.tree ];

        while(searching.length > 0) {
            const item = searching.shift();

            if(item.path === path) {
                found = true;
                break;
            }

            searching.push(...item.children);
        }
    } while(!found);

    return value;
};
