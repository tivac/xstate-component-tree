import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";
import child from "./specimens/child.js";

describe("hasTag", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        assert.equal(tree.builder.hasTag("one"), true);
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        await tree();

        assert.equal(tree.builder.hasTag("one"), true);
        assert.equal(tree.builder.hasTag("child-one"), true);
    });
});
