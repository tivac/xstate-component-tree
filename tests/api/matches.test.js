import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import parallel from "./specimens/parallel.js";
import child from "./specimens/child.js";
import noComponents from "./specimens/no-components.js";

describe("matches", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(parallel);

        const { extra } = await tree();

        assert.ok(tree.builder.matches("one"));
        assert.ok(tree.builder.matches("one.one_one"));
        assert.ok(tree.builder.matches("one.one_one.one_one_one"));
        assert.ok(tree.builder.matches("one.one_one.one_one_two"));
        assert.ok(extra.matches("one"));
        assert.ok(extra.matches("one.one_one"));
        assert.ok(extra.matches("one.one_one.one_one_one"));
        assert.ok(extra.matches("one.one_one.one_one_two"));
    });

    it("should check trees without components", async (context) => {
        const tree = context.tree = createTree(noComponents);

        let { extra } = await tree();

        assert.ok(tree.builder.matches("one"));
        assert.ok(extra.matches("one"));

        tree.service.send("NEXT");

        ({ extra } = await tree());

        assert.ok(tree.builder.matches("two"));
        assert.ok(extra.matches("two"));
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        const { extra } = await tree();

        assert.ok(tree.builder.matches("root.one"));
        assert.ok(tree.builder.matches("child.one"));
        assert.ok(extra.matches("root.one"));
        assert.ok(extra.matches("child.one"));
    });
});
