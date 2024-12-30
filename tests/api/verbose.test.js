import { spyOn, restoreAll } from "nanospy";

import describe from "../util/describe.js";
import { createTree } from "../util/trees.js";
import { snapshot } from "../util/snapshot.js";

import child from "./specimens/child.js";

describe("verbose", (it) => {
    it.after.each(restoreAll);

    it("should log information", async () => {
        // eslint-disable-next-line no-empty-function
        const log = spyOn(console, "log", () => {});

        const tree = createTree(child, { verbose : true });

        await tree();

        restoreAll();

        // Only check first & last for now
        snapshot(log.calls[0], `[ "[root][_prep] prepping" ]`);
        snapshot(log.calls[log.calls.length - 1], `[ "[root][_run #1] returning data" ]`);
    });
});
