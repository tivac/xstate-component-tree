"use strict";

const { defaults } = require("jest-config");

module.exports = {
    notify : true,

    coveragePathIgnorePatterns : [
        ...defaults.coveragePathIgnorePatterns,
        "<rootDir>/tests/util/",
    ],
};
