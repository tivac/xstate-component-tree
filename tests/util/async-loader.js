"use strict";

const load = (result, delay = 0) =>
    () => new Promise((resolve) =>
        setTimeout(() => resolve(result), delay)
    );

module.exports = load;
