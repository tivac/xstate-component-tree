"use strict";

const { default: ComponentTree } = require("../../src/component-tree.js");
const deferred = require("./deferred.js");

// Watch for trees to be built, and provide an easy way
// to await each value
const trees = (service, fn = false, options) => {
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

    service.start();

    return out;
};

module.exports = trees;
