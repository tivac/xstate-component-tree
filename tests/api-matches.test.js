import * as assert from "uvu/assert";

import describe from "./util/describe.js";
import { createTree } from "./util/trees.js";
import { treeTeardown } from "./util/context.js";

import parallel from "./specimens/parallel.js";
import child from "./specimens/child.js";

describe("matches", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(parallel);

        assert.equal(tree.builder.matches("one"), true);
        assert.equal(tree.builder.matches("one.one_one"), true);
        assert.equal(tree.builder.matches("one.one_one.one_one_one"), true);
        assert.equal(tree.builder.matches("one.one_one.one_one_two"), true);
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        await tree();

        assert.equal(tree.builder.matches("root.one"), true);
        assert.equal(tree.builder.matches("child.one"), true);
    });
});
