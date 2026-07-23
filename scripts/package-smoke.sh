#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

tmp_parent="${TMPDIR:-/tmp}"
mkdir -p "$tmp_parent"
tmp_dir="$(mktemp -d "$tmp_parent/prompttrail-package-smoke.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

documented_help_command="$(
  awk '
    /^## CLI quickstart$/ { in_quickstart = 1; next }
    in_quickstart && /^## / { exit }
    in_quickstart && /^node dist\/[^ ]+ --help$/ { print; exit }
  ' README.md
)"

if [ -z "$documented_help_command" ]; then
  echo "README CLI quickstart must contain a node dist/... --help command" >&2
  exit 1
fi

documented_help_output="$(sh -c "$documented_help_command")"
if [[ "$documented_help_output" != *"Usage: prompttrail"* ]]; then
  echo "README CLI quickstart did not print prompttrail help" >&2
  exit 1
fi

package_name="$(npm pack --pack-destination "$tmp_dir" --silent)"
package_path="$tmp_dir/$package_name"
npm install --prefix "$tmp_dir/install" --ignore-scripts --silent "$package_path"

for bin_name in prompttrail pt; do
  help_output="$("$tmp_dir/install/node_modules/.bin/$bin_name" --help)"
  if [[ "$help_output" != *"Usage: prompttrail"* ]]; then
    echo "Installed $bin_name binary did not print prompttrail help" >&2
    exit 1
  fi
done
