"use strict";

const { treeBuilder } = require("../../src/treebuilder.js");

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
const trees = (service) => {
    const responses = [];
    let idx = 0;
    let p;

    const respond = () => {
        if(!p || idx === responses.length) {
            return;
        }

        p.resolve(responses[idx++]);

        p = false;
    };

    treeBuilder(service, (tree) => {
        responses.push(tree);

        respond();
    });

    return () => {
        if(!service.initialized) {
            service.start();
        }

        p = deferred();

        // Scheduled so promise can be returned before this has a chance
        // to run and potentially remove the promise reference
        setImmediate(respond);

        return p;
    };
};

module.exports = trees;
