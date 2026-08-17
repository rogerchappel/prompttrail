#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const workflowPath = process.argv[2] ?? new URL("../.github/workflows/release-dry-run.yml", import.meta.url);
const workflow = await readFile(workflowPath, "utf8");

const required = [
  ["read-only repository permission", /^\s{2}contents: read$/m],
  ["OIDC permission for provenance", /^\s{2}id-token: write$/m],
  ["npm registry configuration", /^\s{10}registry-url: https:\/\/registry\.npmjs\.org$/m],
  ["release checks", /^\s{8}run: npm run release:check$/m],
  ["package validation", /^\s{8}run: npm run release:validate -- --tag /m],
  ["npm publication dry run", /^\s{8}run: npm publish --dry-run --provenance --access public$/m],
  ["release notes preview", /^\s{8}run: \|\n\s{10}node \/tmp\/releasebox\/bin\/releasebox\.js notes /m],
];

const positions = new Map();
for (const [label, pattern] of required) {
  const match = pattern.exec(workflow);
  if (!match) throw new Error(`release dry-run workflow is missing ${label}`);
  positions.set(label, match.index);
}

for (const [before, after] of [
  ["npm registry configuration", "release checks"],
  ["release checks", "package validation"],
  ["package validation", "npm publication dry run"],
  ["npm publication dry run", "release notes preview"],
]) {
  if (positions.get(before) >= positions.get(after)) {
    throw new Error(`${before} must run before ${after}`);
  }
}

console.log("release dry-run workflow validated");
