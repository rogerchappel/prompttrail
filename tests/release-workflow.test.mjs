import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const workflow = await readFile(".github/workflows/release-dry-run.yml", "utf8");

async function validate(contents) {
  const directory = await mkdtemp(join(tmpdir(), "prompttrail-workflow-test-"));
  const path = join(directory, "release-dry-run.yml");
  await writeFile(path, contents);
  return spawnSync(process.execPath, ["scripts/validate-release-workflow.mjs", path], { encoding: "utf8" });
}

test("accepts the checked-in release dry-run workflow", async () => {
  const result = await validate(workflow);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects removal of the npm publication dry run", async () => {
  const result = await validate(workflow.replace(/^\s+- name: Dry-run npm publication\n\s+run: npm publish.*\n/m, ""));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing npm publication dry run/);
});

test("rejects publication before package validation", async () => {
  const publish = "      - name: Dry-run npm publication\n        run: npm publish --dry-run --provenance --access public\n";
  const reordered = workflow.replace(publish, "").replace("      - name: Validate package contents\n", `${publish}      - name: Validate package contents\n`);
  const result = await validate(reordered);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /package validation must run before npm publication dry run/);
});

test("rejects missing npm registry and provenance permissions", async () => {
  for (const [line, message] of [
    ["  id-token: write\n", /missing OIDC permission/],
    ["          registry-url: https://registry.npmjs.org\n", /missing npm registry configuration/],
  ]) {
    const result = await validate(workflow.replace(line, ""));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  }
});
