"use strict";

const component = require("./component.js");

const load = (name, delay = 0) =>
    () => new Promise((resolve) =>
        setTimeout(() => resolve(component(name)), delay)
    );

module.exports = load;
