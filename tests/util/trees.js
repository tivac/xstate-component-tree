"use strict";

const { treeBuilder } = require("../../src/treebuilder.js");

// Watch for a specific number of trees to be built and resolve
// a promise once that is hit, while also comparing each value to
// a snapshot for good measure
const trees = (service) => {
    let post;
    let received = 0;
    let times;
    let finished;

    treeBuilder(service, (tree) => {
        expect(tree).toMatchSnapshot();

        if(post) {
            post(tree);
        }
        
        if(++received >= times) {
            finished();
        }
    });

    return ({ count = 1, after } = false) => new Promise((resolve) => {
        received = 0;
        times = count;
        post = after;
        finished = resolve;
        
        if(!service.initialized) {
            service.start();
        }
    });
};

module.exports = trees;
