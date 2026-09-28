import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "../src/client.js";
import { handleMcpRequest } from "../src/mcp.js";
import { findToolByCli, mcpToolDescriptors } from "../src/tools.js";
import { startMockApi } from "./helpers.mjs";

test("CLI prefers the longest matching command prefix", () => {
  assert.equal(findToolByCli(["brief"]).name, "get_brief");
  assert.equal(findToolByCli(["brief", "propose"]).name, "propose_from_finding");
  assert.equal(findToolByCli(["observation"]).name, "get_observation");
  assert.equal(findToolByCli(["observation", "run"]).name, "run_observation");
  assert.equal(findToolByCli(["journeys", "propose"]).name, "create_journey_proposal");
  assert.equal(findToolByCli(["journeys", "revise"]).name, "revise_journey");
});

test("lists journey, campaign, and delivery tools for Claude and Cursor", () => {
  const names = mcpToolDescriptors().map((tool) => tool.name);
  assert.ok(names.includes("list_journeys"));
  assert.ok(names.includes("draft_campaign"));
  assert.ok(names.includes("get_delivery_health"));
  assert.ok(names.includes("ingest_events"));
  assert.ok(names.includes("activate_journey"));
  assert.ok(names.includes("send_transactional"));
  assert.ok(names.includes("get_brief"));
  assert.ok(names.includes("propose_from_finding"));
  assert.ok(names.includes("get_plan_usage"));
  assert.ok(names.includes("run_dry_run"));
  assert.ok(names.includes("create_journey_proposal"));
  assert.ok(names.includes("create_journey_email"));
  assert.ok(names.includes("revise_journey"));
});

test("initialize and tools/list speak MCP without a live API", async () => {
  const init = await handleMcpRequest({ method: "initialize", id: 1 }, { client: {}, config: {} });
  assert.equal(init.serverInfo.name, "audryo");
  assert.ok(init.capabilities.tools);

  const listed = await handleMcpRequest({ method: "tools/list", id: 2 }, { client: {}, config: {} });
  assert.equal(listed.tools.length, mcpToolDescriptors().length);
});

test("MCP can list journeys, draft a campaign, and inspect delivery health", async () => {
  const mock = await startMockApi((request) => {
    if (request.path.endsWith("/workflow_context")) {
      return { status: 200, body: { workflows: [{ id: "wf_1", name: "Onboarding" }] } };
    }
    if (request.method === "POST" && request.path.endsWith("/campaigns")) {
      return { status: 201, body: { id: "cmp_1", status: "draft", name: request.body.campaign.name } };
    }
    if (request.method === "POST" && request.path.endsWith("/workflow_proposals")) {
      return { status: 201, body: { id: "wf_spec", name: request.body.name, status: "review" } };
    }
    if (request.method === "PATCH" && request.path.includes("/workflows/")) {
      return { status: 200, body: { id: "wf_rev", name: request.body.workflow.name, status: "review" } };
    }
    if (request.path.endsWith("/delivery_context")) {
      return { status: 200, body: { provider: { configured: true }, delivery: { delivered: 4 } } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });

  const config = { apiBase: mock.apiBase, apiKey: "sf_live_test", projectId: "proj_1" };
  const client = createClient(config);

  try {
    const journeys = await handleMcpRequest(
      { method: "tools/call", params: { name: "list_journeys", arguments: {} } },
      { client, config },
    );
    assert.match(journeys.content[0].text, /Onboarding/);

    const campaign = await handleMcpRequest(
      {
        method: "tools/call",
        params: {
          name: "draft_campaign",
          arguments: { name: "July update", audienceId: "aud_1", subject: "What's new" },
        },
      },
      { client, config },
    );
    assert.match(campaign.content[0].text, /cmp_1/);
    assert.equal(mock.requests[1].body.campaign.status, "draft");

    const proposal = await handleMcpRequest(
      {
        method: "tools/call",
        params: {
          name: "create_journey_proposal",
          arguments: {
            audienceId: "aud_1",
            specification: { name: "Agent authored", nodes: [] },
            name: "Agent authored",
          },
        },
      },
      { client, config },
    );
    assert.match(proposal.content[0].text, /wf_spec/);
    assert.equal(mock.requests.at(-1).body.specification.name, "Agent authored");

    const revised = await handleMcpRequest(
      {
        method: "tools/call",
        params: {
          name: "revise_journey",
          arguments: {
            workflowId: "wf_spec",
            name: "Agent authored v2",
            audienceId: "aud_1",
            specification: { name: "Agent authored v2", holdoutPercentage: 20 },
          },
        },
      },
      { client, config },
    );
    assert.match(revised.content[0].text, /wf_rev/);
    assert.equal(mock.requests.at(-1).body.workflow.name, "Agent authored v2");

    const health = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_delivery_health", arguments: {} } },
      { client, config },
    );
    assert.match(health.content[0].text, /delivered/);
  } finally {
    await mock.close();
  }
});
