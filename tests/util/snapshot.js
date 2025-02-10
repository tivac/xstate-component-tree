import inspect from "object-inspect";
import * as assert from "uvu/assert";
import { compare } from "uvu/diff";
import dedent from "dedent";
import strip from "strip-ansi";

const OPTIONS = { quoteStyle : "double", indent : 4, depth : 8 };

export const serialize = (object, options) => inspect(object, { ...OPTIONS, ...options });

export const snapshot = (object, out) => assert.fixture(serialize(object), dedent(out));

export const diff = (a, b, out) => {
    const comparison = compare(serialize(a), serialize(b));

    const output = strip(comparison)
    .replaceAll("·", " ")
    .replaceAll("→", "     ");

    return assert.fixture(dedent(output), dedent(out));
};
