import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const requiredFiles = ["package.json", "README.md", "LICENSE", "dist/index.js", "dist/run.js"];

async function run(tag, files = requiredFiles) {
  const directory = await mkdtemp(join(tmpdir(), "prompttrail-release-test-"));
  const packJson = join(directory, "pack.json");
  await writeFile(packJson, JSON.stringify([{ files: files.map((path) => ({ path })) }]));
  return spawnSync(process.execPath, ["scripts/validate-release.mjs", "--tag", tag, "--pack-json", packJson], {
    encoding: "utf8",
  });
}

test("accepts a matching release tag and complete package", async () => {
  const result = await run("v0.1.0");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /release v0\.1\.0 validated/);
});

test("rejects a tag that does not match the package version", async () => {
  const result = await run("v0.2.0");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match package version 0\.1\.0/);
});

test("rejects incomplete package contents", async () => {
  const result = await run("v0.1.0", requiredFiles.filter((path) => path !== "dist/run.js"));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing required file: dist\/run\.js/);
});
