#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

tmp_parent="${TMPDIR:-/tmp}"
mkdir -p "$tmp_parent"
tmp_dir="$(mktemp -d "$tmp_parent/prompttrail-smoke.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

node dist/run.js help >/dev/null
node dist/run.js init --dir "$tmp_dir" >/dev/null
node dist/run.js append --dir "$tmp_dir" --type prompt --summary "Smoke prompt receipt" --tag smoke >/dev/null
node dist/run.js append --dir "$tmp_dir" --type verification --summary "Smoke verification receipt" --tool node --status ok >/dev/null
node dist/run.js list --dir "$tmp_dir" | grep "Smoke prompt receipt" >/dev/null
node dist/run.js summary --format json --dir "$tmp_dir" | node -e "let input=''; process.stdin.on('data', c => input += c); process.stdin.on('end', () => { const data = JSON.parse(input); if (data.total !== 2) process.exit(1); });"
node dist/run.js doctor --dir "$tmp_dir" >/dev/null
node dist/run.js list --dir tests/fixtures/sample-ledger | grep "Keep V1 local-only" >/dev/null
