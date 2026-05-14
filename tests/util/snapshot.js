import assert from "node:assert/strict";
import inspect from "object-inspect";
import { compare } from "uvu/diff";
import dedent from "dedent";
import strip from "strip-ansi";

const OPTIONS = { quoteStyle : "double", indent : 4, depth : 8 };

export const serialize = (object, options) => inspect(object, { ...OPTIONS, ...options });

export const snapshot = (object, out) => assert.strictEqual(serialize(object), dedent(out));

export const diff = (a, b, out) => {
    const comparison = compare(serialize(a), serialize(b));

    const output = strip(comparison)
    .replaceAll("·", " ")
    .replaceAll("→", "     ");

    return assert.strictEqual(dedent(output), dedent(out));
};
