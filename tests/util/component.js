"use strict";

// TODO: figure out how to make this a function w/ a dynamic name
// eslint-disable-next-line prefer-arrow-callback
const component = (name) => Object.defineProperty(function() {
    return name;
}, "name", { value : name });

export default component;
