#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const tag = valueAfter("--tag");
const notesFile = valueAfter("--notes-file") ?? "RELEASE_NOTES.md";
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));

if (!tag || tag !== `v${packageJson.version}`) {
  throw new Error(`release tag ${tag ?? "(missing)"} does not match package version ${packageJson.version}`);
}

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, { encoding: "utf8" });
}

const head = run("git", ["rev-parse", "HEAD"]);
const tagged = run("git", ["rev-list", "-n", "1", tag]);
if (head.status !== 0 || tagged.status !== 0 || head.stdout.trim() !== tagged.stdout.trim()) {
  throw new Error(`checked-out commit is not immutable tag ${tag}`);
}

const spec = `${packageJson.name}@${packageJson.version}`;
const lookup = run("npm", ["view", spec, "version", "--json"]);
if (lookup.status === 0) {
  if (JSON.parse(lookup.stdout) !== packageJson.version) throw new Error(`npm returned an unexpected version for ${spec}`);
  console.log(`${spec} already exists; skipping npm publication`);
} else if (/\bE404\b|\b404\b/.test(`${lookup.stderr}\n${lookup.stdout}`)) {
  const publish = run("npm", ["publish", "--provenance", "--access", "public"]);
  if (publish.status !== 0) throw new Error(publish.stderr.trim() || "npm publish failed");
} else {
  throw new Error(lookup.stderr.trim() || `npm lookup failed for ${spec}`);
}

const release = run("gh", ["release", "view", tag]);
if (release.status === 0) {
  console.log(`GitHub release ${tag} already exists; skipping creation`);
} else if (/release not found|HTTP 404/i.test(`${release.stderr}\n${release.stdout}`)) {
  const create = run("gh", ["release", "create", tag, "--notes-file", notesFile]);
  if (create.status !== 0) throw new Error(create.stderr.trim() || "GitHub release creation failed");
} else {
  throw new Error(release.stderr.trim() || `GitHub release lookup failed for ${tag}`);
}
