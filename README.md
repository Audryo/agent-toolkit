# Audryo agent toolkit

[![npm](https://img.shields.io/npm/v/audryo)](https://www.npmjs.com/package/audryo)
[![CI](https://github.com/Audryo/agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Audryo/agent-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Let your AI agent run your lifecycle email: audiences, journeys, campaigns,
emails and transactional sends in [Audryo](https://audryo.com), through the
same API the app uses. Your agent does the setup work; nothing reaches a
customer until a person approves it.

This repo ships the `audryo` CLI, an MCP server and agent skills for
Claude Code, Codex, Cursor and any other MCP client.

```text
You:   Set up an onboarding journey for signups who haven't created a
       project after 3 days.

Agent: Reads your data schema, builds the audience, drafts a three-email
       journey, dry-runs it and fast-forwards it in the sandbox. Then it
       hands back what to review. Nothing has been sent.
```

## Safety model

- **Drafts by default.** Journeys, emails and campaigns an agent creates are
  review-only proposals.
- **Sending needs `deliver`.** Without that scope a key cannot activate a
  journey or send anything, even by mistake. With it, Audryo still requires
  a passing dry run and confirmed emails.
- **Sandbox first.** New projects capture every email in a sandbox inbox, so
  agents can test real journeys end to end. Going live is a human decision
  in the app.
- **Retry-safe.** Sends and proposals take an `Idempotency-Key`, so a retried
  call never sends twice.
- **No inferred consent.** Ingesting contacts never grants marketing consent.

## Quick start

1. [Sign up](https://app.audryo.com) (free during the public beta) and create
   a project. It starts in the sandbox.
2. Create an API key under **Settings → Developer** with the smallest scope
   that works (see [Configuration](#configuration)).
3. Connect your agent:

### Claude Code (plugin: MCP server + skills)

```bash
export AUDRYO_API_KEY="sf_live_..."
claude plugin marketplace add Audryo/agent-toolkit
claude plugin install audryo@audryo
```

### Any agent: skills only

```bash
npx skills add Audryo/agent-toolkit
```

### Any MCP client

```json
{
  "mcpServers": {
    "audryo": {
      "command": "npx",
      "args": ["-y", "audryo", "mcp"],
      "env": {
        "AUDRYO_API_KEY": "sf_live_...",
        "AUDRYO_PROJECT_ID": "<project-uuid>"
      }
    }
  }
}
```

Codex: `codex mcp add audryo --env AUDRYO_API_KEY=sf_live_... -- npx -y audryo mcp`

## Configuration

| Variable | Required | Default |
| --- | --- | --- |
| `AUDRYO_API_KEY` | yes | — |
| `AUDRYO_PROJECT_ID` | for project tools | list with `npx audryo bootstrap` |
| `AUDRYO_API_BASE` | no | `https://api.audryo.com/v1` |

Give agents the smallest key that works:

| Task | Scopes |
| --- | --- |
| Inspect | `read` |
| Sync data, draft journeys, emails and campaigns | `read`, `write` |
| Activate journeys, send campaigns and transactional email | `read`, `write`, `deliver` |

## MCP tools

| Area | Tools | Scope |
| --- | --- | --- |
| Orient | `get_manifest`, `get_bootstrap`, `get_setup_context`, `get_brief`, `get_plan_usage` | read |
| Product and data | `get_product_context`, `get_data_context`, `list_contacts`, `ingest_contacts`, `ingest_events` | read / write |
| Journeys | `list_journeys`, `inspect_journey`, `create_journey_proposal`, `revise_journey`, `propose_from_finding`, `run_dry_run` | read / write |
| Emails | `create_email`, `create_journey_email` | write |
| Campaigns | `list_campaigns`, `draft_campaign` | read / write |
| Sandbox | `get_delivery_mode`, `list_sandbox_messages`, `get_sandbox_message`, `fast_forward_journey` | read / write |
| Insights | `get_delivery_health`, `get_performance`, `get_observation`, `run_observation`, `get_copilot_plan` | read |
| Go live | `activate_journey`, `pause_journey`, `send_campaign`, `send_transactional` | deliver |

Every tool is also a CLI command.

## CLI

```bash
npx audryo bootstrap
npx audryo contacts ingest contacts.json
npx audryo events ingest events.json
npx audryo journeys list
npx audryo journeys inspect <workflowId>
npx audryo campaigns draft --name "July update" --audience-id <id> --subject "What's new"
npx audryo delivery health
```

## Skills

| Skill | Teaches the agent to |
| --- | --- |
| `audryo-api` | Connect, pick scopes, use MCP or CLI instead of curl, stop at review |
| `audryo-email` | Build valid email documents, handle locales, save drafts for review |
| `audryo-sending` | Choose communication classes, respect consent, protect deliverability |

Full guide: <https://app.audryo.com/docs/agents/quickstart>

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md)
and the [changelog](./CHANGELOG.md). Report security issues privately:
[SECURITY.md](./SECURITY.md).

License: MIT
