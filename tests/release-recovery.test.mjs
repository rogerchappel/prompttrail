import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const fakeCommand = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const command = process.argv[1].split("/").pop();
const args = process.argv.slice(2);
appendFileSync(process.env.CALL_LOG, JSON.stringify([command, ...args]) + "\\n");
if (command === "git") {
  if (process.env.MOVED_CHECKOUT === "1" && args[1] === "HEAD") console.log("head-sha");
  else console.log("tag-sha");
} else if (command === "npm" && args[0] === "view") {
  if (process.env.NPM_STATE === "exists") console.log(JSON.stringify("0.1.0"));
  else if (process.env.NPM_STATE === "missing") { console.error("npm error code E404"); process.exit(1); }
  else { console.error("registry unavailable"); process.exit(1); }
} else if (command === "gh" && args[1] === "view") {
  if (process.env.GH_STATE === "missing") { console.error("release not found"); process.exit(1); }
  if (process.env.GH_STATE === "error") { console.error("authentication failed"); process.exit(1); }
}
`;

async function recover({ tag = "v0.1.0", npmState = "exists", ghState = "exists", moved = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "prompttrail-recovery-test-"));
  const log = join(directory, "calls.jsonl");
  await writeFile(log, "");
  for (const command of ["git", "npm", "gh"]) {
    const path = join(directory, command);
    await writeFile(path, fakeCommand);
    await chmod(path, 0o755);
  }
  const result = spawnSync(process.execPath, ["scripts/recover-release.mjs", "--tag", tag, "--notes-file", "notes.md"], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${directory}${delimiter}${process.env.PATH}`, CALL_LOG: log, NPM_STATE: npmState, GH_STATE: ghState, MOVED_CHECKOUT: moved ? "1" : "0" },
  });
  const calls = (await readFile(log, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
  return { result, calls };
}

test("rejects a tag that does not match package.json", async () => {
  const { result, calls } = await recover({ tag: "v9.9.9" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match package version/);
  assert.deepEqual(calls, []);
});

test("rejects a checkout moved away from the immutable tag", async () => {
  const { result, calls } = await recover({ moved: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not immutable tag/);
  assert.equal(calls.some(([command]) => command === "npm"), false);
});

test("skips npm publication when the exact version exists", async () => {
  const { result, calls } = await recover();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls.some(([command, action]) => command === "npm" && action === "publish"), false);
});

test("publishes with provenance only after an npm 404", async () => {
  const { result, calls } = await recover({ npmState: "missing" });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["npm", "publish", "--provenance", "--access", "public"])));
});

test("fails closed on non-404 npm lookup errors", async () => {
  const { result, calls } = await recover({ npmState: "error" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registry unavailable/);
  assert.equal(calls.some(([command]) => command === "gh"), false);
});

test("creates only a missing GitHub release", async () => {
  const missing = await recover({ ghState: "missing" });
  assert.equal(missing.result.status, 0, missing.result.stderr);
  assert.ok(missing.calls.some((call) => JSON.stringify(call) === JSON.stringify(["gh", "release", "create", "v0.1.0", "--notes-file", "notes.md"])));

  const existing = await recover({ ghState: "exists" });
  assert.equal(existing.result.status, 0, existing.result.stderr);
  assert.equal(existing.calls.some(([command, scope, action]) => command === "gh" && scope === "release" && action === "create"), false);
  assert.equal(existing.calls.filter(([command, action]) => command === "gh" && action === "release").length, 1);
});

test("fails closed on GitHub lookup errors", async () => {
  const { result, calls } = await recover({ ghState: "error" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authentication failed/);
  assert.equal(calls.some(([, , action]) => action === "create"), false);
});
