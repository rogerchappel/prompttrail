#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
const tag = valueAfter("--tag") ?? process.env.GITHUB_REF_NAME;

if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error("release tag must have the form vX.Y.Z");
}
if (tag.slice(1) !== packageJson.version) {
  throw new Error(`release tag ${tag} does not match package version ${packageJson.version}`);
}

let packOutput;
const packJsonPath = valueAfter("--pack-json");
if (packJsonPath) {
  packOutput = await readFile(packJsonPath, "utf8");
} else {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "npm pack --dry-run failed");
  }
  packOutput = result.stdout;
}

const [manifest] = JSON.parse(packOutput);
const files = new Set(manifest?.files?.map(({ path }) => path));
for (const required of ["package.json", "README.md", "LICENSE", "dist/index.js", "dist/run.js"]) {
  if (!files.has(required)) {
    throw new Error(`package tarball is missing required file: ${required}`);
  }
}

console.log(`release ${tag} validated (${files.size} packaged files)`);
