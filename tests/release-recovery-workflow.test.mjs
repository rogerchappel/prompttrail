import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const workflow = await readFile(".github/workflows/release.yml", "utf8");
async function validate(contents) {
  const directory = await mkdtemp(join(tmpdir(), "prompttrail-recovery-workflow-"));
  const path = join(directory, "release.yml");
  await writeFile(path, contents);
  return spawnSync(process.execPath, ["scripts/validate-release-recovery-workflow.mjs", path], { encoding: "utf8" });
}

test("accepts the checked-in release recovery workflow", async () => {
  const result = await validate(workflow);
  assert.equal(result.status, 0, result.stderr);
});

test("requires the existing tag as the checkout ref", async () => {
  const result = await validate(workflow.replace(/^\s+ref:.*\n/m, ""));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing existing-tag checkout/);
});

test("requires checks and tag validation before recovery", async () => {
  const recovery = '      - name: Create GitHub release\n        env:\n          GH_TOKEN: ${{ github.token }}\n        run: node scripts/recover-release.mjs --tag "$RELEASE_TAG" --notes-file RELEASE_NOTES.md\n';
  const reordered = workflow.replace(recovery, "").replace("      - name: Run release checks\n", `${recovery}      - name: Run release checks\n`);
  const result = await validate(reordered);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tag validation must run before idempotent recovery/);
});

test("requires OIDC permission for trusted publishing", async () => {
  const result = await validate(workflow.replace("  id-token: write\n", ""));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing trusted publishing permission/);
});
