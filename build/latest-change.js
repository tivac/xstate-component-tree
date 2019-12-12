"use strict";

const fs = require("fs");

const txt = fs.readFileSync(require.resolve("../CHANGELOG.md"), "utf8");

const parts = txt.trim().split(/^(#+ \[\d+\.\d+\.\d\])/m);

const desc = parts.slice(1, 3).join("");

process.stdout.write(desc.trim());
