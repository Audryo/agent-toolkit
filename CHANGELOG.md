# audryo

## 0.2.1

### Patch Changes

- [`5f95a57`](https://github.com/Audryo/agent-toolkit/commit/5f95a57c9d35e092de18e56d88ed5cab59906a57) Thanks [@zer0flag](https://github.com/zer0flag)! - Show the API's per-field validation details in MCP tool errors and CLI error output.

## 0.2.0

### Minor Changes

- Manage audiences from MCP and the CLI: `list_audiences`, `get_audience` (with consent-aware reach), `preview_audience`, `create_audience`, `update_audience`, `delete_audience` and `suggest_audiences`.

## 0.1.1

### Patch Changes

- Point the API key hint at **Settings → Developer**.
- Default the API base to `https://api.audryo.com/v1`.
- Rename the skills to `audryo-api`, `audryo-email` and `audryo-sending` so `npx skills add` installs them.
- Add the Claude Code plugin and the MCP Registry entry.

## 0.1.0

### Minor Changes

- First public release: CLI, MCP server and skills for the Audryo `/v1` agent API.
