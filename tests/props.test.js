"use strict";

const { Machine : createMachine, interpret } = require("xstate");
const trees = require("./util/trees.js");
const component = require("./util/component.js");

describe("xstate-component-tree", () => {
    describe("props", () => {
        it.todo("should support static props");
        it.todo("should support sync dynamic props");
        it.todo("should support async dynamic props");
        it.todo("should pass context & event to dynamic props functions");
    });
});
