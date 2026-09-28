---
name: audryo-api
description: Use the Audryo HTTP API, CLI, or MCP server to operate a lifecycle email workspace. Use when listing journeys, syncing contacts or events, drafting campaigns, or inspecting delivery health.
---

# Audryo API

Audryo is a review-before-send lifecycle email API. The Rails `/v1` contract is the source of truth. Prefer the packaged MCP server or `audryo` CLI over handwritten curl.

## Connect

```bash
export AUDRYO_API_BASE="http://localhost:3100/v1"
export AUDRYO_API_KEY="sf_live_..."          # Settings → Developer
export AUDRYO_PROJECT_ID="<project-uuid>"    # from GET /bootstrap
```

Create the smallest useful token:

| Task | Scopes |
| --- | --- |
| Inspect | `read` |
| Sync data, draft journeys/emails/campaigns | `read`, `write` |
| Consent, activate, campaign send, transactional send | `read`, `write`, `deliver` |

## MCP (Claude / Cursor)

```json
{
  "mcpServers": {
    "audryo": {
      "command": "node",
      "args": ["packages/audryo/bin/audryo.js", "mcp"],
      "env": {
        "AUDRYO_API_BASE": "http://localhost:3100/v1",
        "AUDRYO_API_KEY": "sf_live_...",
        "AUDRYO_PROJECT_ID": "<project-uuid>"
      }
    }
  }
}
```

Use these tools instead of curl:

- `get_brief` — start here. Findings include a typed `propose` action and live plan usage
- `propose_from_finding` — turn a findingKey into a review-only journey draft, or `leave_it` for a live journey that should not change. Never sends. Underperforming journeys become a measured graph revision, not an email rewrite
- `get_plan_usage` — contact cap and monthly AI allowance before ingest or drafts
- `create_journey_proposal` — review-only journey from a specification, template, or opportunity. Prefer a structured specification; that path does not call an LLM
- `create_journey_email` — attach a Journey email you authored (subject + TipTap). Does not call Audryo AI
- `revise_journey` — PATCH an existing journey graph you authored. Does not call an LLM and does not activate
- `get_observation` / `run_observation` — review-only lifecycle check
- `get_copilot_plan` — evidence-first plan for one opportunity
- `run_dry_run` — validate a journey without activating
- `list_journeys` — journeys, audiences, opportunities
- `draft_campaign` — reviewable campaign, does not send
- `get_delivery_health` — provider, identity, governance, recent counts
- `ingest_events` / `ingest_contacts` — same side effects as the HTTP ingest endpoints
- `inspect_journey` / `activate_journey` — runtime inspect and deliver-scoped activation

## CLI

```bash
node packages/audryo/bin/audryo.js bootstrap
node packages/audryo/bin/audryo.js brief
node packages/audryo/bin/audryo.js brief propose --finding-key coverage:<audienceId>
node packages/audryo/bin/audryo.js plan
node packages/audryo/bin/audryo.js journeys list
node packages/audryo/bin/audryo.js journeys dry-run <workflowId>
node packages/audryo/bin/audryo.js events ingest events.json
node packages/audryo/bin/audryo.js contacts ingest contacts.json
node packages/audryo/bin/audryo.js campaigns draft --name "July update" --audience-id <id> --subject "What's new"
node packages/audryo/bin/audryo.js delivery health
```

`audryo events ingest` POSTs `/projects/{projectId}/event_ingestion` with the file payload. Enrollment side effects match a direct HTTP call.

## Operating rules

1. Read `get_manifest` (or `GET /agent_manifest`) before inventing endpoints.
2. Work in one project. Do not guess IDs across workspaces.
3. Use `Idempotency-Key` on sends, enrollments, and expensive proposals. Derive it from a business id.
4. Proposals stay reviewable. Never infer approval, activation, or send.
5. Do not infer marketing consent from contacts or events. Use the consent ledger.
6. Handle errors by `error.code`, and include `requestId` when reporting a failure.
7. Contact batches max 5,000; event batches max 500.

## First safe task

1. `get_bootstrap` → pick the project.
2. `get_brief` → read `primary.propose` and `usage`.
3. If the action is `prepare_journey`, `review_journey`, or `leave_it`, call `propose_from_finding`.
4. Hand back IDs for human review. Stop before `activate_journey` or `send_campaign`.
