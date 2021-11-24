"use strict";

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const changelog = resolve(dirname(fileURLToPath(import.meta.url)), "../CHANGELOG.md");

const txt = readFileSync(changelog, "utf8");

const parts = txt.trim().split(/^(#+ \[\d+\.\d+\.\d\])/m);

const desc = parts.slice(1, 3).join("");

process.stdout.write(desc.trim());
