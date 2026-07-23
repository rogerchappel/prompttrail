# prompttrail
Privacy-first JSONL receipt ledger for local agent work.
## Status

This is a v0.1.0 local-first developer tool. Treat the CLI and output formats as early-stage, pin versions in automation, and run the verification commands below before relying on it in CI.
## What it helps with

- Work with agent, audit-log, cli, jsonl, ledger workflows from a local checkout.
- Keep generated artifacts and reports inspectable on disk instead of sending project data to a service.
- Add a repeatable smoke command that maintainers can run before review or release.

## Install from a checkout

```sh
git clone https://github.com/rogerchappel/prompttrail.git
cd prompttrail
npm install
npm run build
```
## CLI quickstart

Start with the built CLI help so the examples match the checked-out version:

```sh
node dist/run.js --help
```
Run the maintained smoke fixture to exercise the main workflow end to end:

```sh
npm run smoke
```

The smoke command currently expands to:

```sh
bash scripts/smoke.sh
```
## Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- The project is intentionally local-first; it does not manage remote credentials or upload repository contents.
- Output schemas and CLI flags may change before a stable 1.0 release.
- Review generated files before committing them, especially when they summarize logs, diffs, or dependency metadata.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, include a fixture or smoke case when behavior changes, and paste verification output into the pull request.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. Do not paste secrets, private tokens, or proprietary logs into issues or examples.

## License

MIT

## Release Readiness

Use the checked-in scripts before opening or publishing a release:

```sh
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```

The package smoke runs the documented help command, creates and locally installs
the package tarball, and verifies both published CLI names without publishing.

`prompttrail` also publishes the short `pt` alias for the same CLI entry point.
