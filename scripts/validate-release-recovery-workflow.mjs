#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const workflowPath = process.argv[2] ?? new URL("../.github/workflows/release.yml", import.meta.url);
const workflow = await readFile(workflowPath, "utf8");
const required = [
  ["manual tag input", /^\s{2}workflow_dispatch:\n\s{4}inputs:\n\s{6}tag:/m],
  ["trusted publishing permission", /^\s{2}id-token: write$/m],
  ["existing-tag checkout", /^\s{10}ref: \$\{\{ env\.RELEASE_TAG \}\}$/m],
  ["release checks", /^\s{8}run: npm run release:check$/m],
  ["tag validation", /^\s{8}run: npm run release:validate -- --tag "\$RELEASE_TAG"$/m],
  ["idempotent recovery", /^\s{8}run: node scripts\/recover-release\.mjs --tag "\$RELEASE_TAG" --notes-file RELEASE_NOTES\.md$/m],
];

const positions = new Map();
for (const [label, pattern] of required) {
  const match = pattern.exec(workflow);
  if (!match) throw new Error(`release workflow is missing ${label}`);
  positions.set(label, match.index);
}
for (const [before, after] of [["existing-tag checkout", "release checks"], ["release checks", "tag validation"], ["tag validation", "idempotent recovery"]]) {
  if (positions.get(before) >= positions.get(after)) throw new Error(`${before} must run before ${after}`);
}

console.log("release recovery workflow validated");
