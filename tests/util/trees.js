import { createMachine, interpret } from "xstate";

import ComponentTree from "../../src/component-tree.js";

import deferred from "./deferred.js";

// Watch for trees to be built, and provide an easy way
// to await each value
export const trees = (service, fn = false, options) => {
    const responses = [];
    let idx = 0;
    let p;
    let resolved;

    const respond = () => {
        if(resolved || idx >= responses.length) {
            return;
        }

        p.resolve(responses[idx++]);
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
    out.builder = new ComponentTree(service, (tree) => {
        responses.push(tree);

        if(fn) {
            fn(tree);
        }

        respond();
    }, options);

    out.send = (...args) => service.send(...args);

    out.service = service;

    service.start();

    return out;
};

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
