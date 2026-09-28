# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets).

1. Pull requests add changesets (`npx changeset`).
2. On every push to `main`, the **Release** workflow opens or updates a
   **Version Packages** pull request. It bumps the version in
   `package.json`, `.claude-plugin/plugin.json` and `server.json`, and
   writes `CHANGELOG.md`.
3. Merging that pull request runs the workflow again, which:
   - publishes to npm through Trusted Publishing, with provenance
   - tags `v<version>` and creates the GitHub release
   - updates the entry in the MCP Registry

Check the result:

```bash
npm view audryo version
```

Skills and the Claude Code plugin install straight from GitHub, so skill
changes reach users as soon as they are on `main`. The npm package only
changes with a release.

## One-time setup

| Where | Setting |
| --- | --- |
| npm → `audryo` → Settings → Trusted Publisher | GitHub Actions, organization `Audryo`, repository `agent-toolkit`, workflow `release.yml` |
| npm account | Two-factor authentication |
| GitHub → Settings → Actions → General | "Allow GitHub Actions to create and approve pull requests" |
| GitHub Apps | [changeset-bot](https://github.com/apps/changeset-bot) on this repository |
| GitHub → Settings → Branches | Protect `main`: require pull requests and the CI checks |

## When something fails

| Symptom | Fix |
| --- | --- |
| npm returns 403 or 404 | The Trusted Publisher does not match the repository or `release.yml`. |
| npm says the version exists | That version is already published. Add a changeset and release again. |
| MCP Registry rejects the name | The namespace comes from the GitHub org. Align `name` in `server.json` with `mcpName` in `package.json`, for example `io.github.Audryo/audryo`. |
| No Version Packages pull request appears | Actions may not create pull requests; see the setting above. |
