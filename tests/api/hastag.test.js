import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";
import child from "./specimens/child.js";
import noComponents from "./specimens/no-components.js";

describe("hasTag", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        let { extra } = await tree();

        assert.ok(tree.builder.hasTag("one"));
        assert.not(tree.builder.hasTag("two"));
        assert.ok(extra.hasTag("one"));
        assert.not(extra.hasTag("two"));

        tree.send({ type : "NEXT" });

        ({ extra } = await tree());

        assert.ok(tree.builder.hasTag("two"));
        assert.ok(extra.hasTag("two"));
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        const { extra } = await tree();

        assert.ok(tree.builder.hasTag("one"));
        assert.ok(tree.builder.hasTag("child-one"));
        assert.ok(extra.hasTag("one"));
        assert.ok(extra.hasTag("child-one"));
    });

    it("should work without components", async (context) => {
        const tree = context.tree = createTree(noComponents);

        let { extra } = await tree();

        assert.ok(tree.builder.hasTag("one"));
        assert.ok(extra.hasTag("one"));

        tree.send({ type : "NEXT" });

        ({ extra } = await tree());

        assert.ok(tree.builder.hasTag("two"));
        assert.ok(extra.hasTag("two"));
    });
});
