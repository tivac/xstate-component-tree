import * as assert from "uvu/assert";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { treeTeardown } from "../util/context.js";

import single from "./specimens/single.js";
import child from "./specimens/child.js";
import noComponents from "./specimens/no-components.js";

describe("can", (it) => {
    it.after.each(treeTeardown);
    
    it("should check the root tree", async (context) => {
        const tree = context.tree = createTree(single);

        let { extra } = await tree();

        assert.ok(tree.builder.can({ type : "NEXT" }));
        assert.ok(extra.can({ type : "NEXT" }));

        assert.not.ok(tree.builder.can({ type : "NOPE" }));
        assert.not.ok(extra.can({ type : "NOPE" }));

        tree.send({ type : "NEXT" });

        ({ extra } = await tree());

        assert.ok(tree.builder.can({ type : "NEXT" }));
        assert.ok(extra.can({ type : "NEXT" }));

        assert.not.ok(tree.builder.can({ type : "NOPE" }));
        assert.not.ok(extra.can({ type : "NOPE" }));
    });

    it("should check child trees", async (context) => {
        const tree = context.tree = createTree(child);

        const { extra } = await tree();

        assert.ok(tree.builder.can({ type : "NEXT" }));
        assert.ok(tree.builder.can({ type : "CHILD_NEXT" }));
        assert.ok(extra.can({ type : "NEXT" }));
        assert.ok(extra.can({ type : "CHILD_NEXT" }));
    });

    it("should work without components", async (context) => {
        const tree = context.tree = createTree(noComponents);

        let { extra } = await tree();

        assert.ok(tree.builder.can({ type : "NEXT" }));
        assert.ok(extra.can({ type : "NEXT" }));

        tree.send({ type : "NEXT" });

        ({ extra } = await tree());

        assert.ok(tree.builder.can({ type : "NEXT" }));
        assert.ok(extra.can({ type : "NEXT" }));
    });
});
