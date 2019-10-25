"use strict";

const { defaults } = require("jest-config");

module.exports = {
    notify : true,

    coveragePathIgnorePatterns : [
        ...defaults.coveragePathIgnorePatterns,
        "<rootDir>/tests/util/",
    ],

    setupFilesAfterEnv : [
        "<rootDir>/tests/util/setup-diff.js",
    ],

    snapshotSerializers : [
        require.resolve("snapshot-diff/serializer.js"),
    ],
};
