import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../src/cli.js";
import { createClient } from "../src/client.js";
import { handleMcpRequest } from "../src/mcp.js";
import { findToolByCli, mcpToolDescriptors } from "../src/tools.js";
import { collectOutput, startMockApi } from "./helpers.mjs";

const everyone = { operator: "and", conditions: [] };

const audienceApi = () =>
  startMockApi((request) => {
    const base = "/v1/projects/proj_1/audiences";
    if (request.method === "GET" && request.path === base) {
      return { status: 200, body: [{ id: "aud_1", name: "All contacts", estimatedSize: 3 }] };
    }
    if (request.method === "POST" && request.path === `${base}/preview`) {
      return { status: 200, body: { estimatedSize: 3, sample: [] } };
    }
    if (request.method === "POST" && request.path === base) {
      return { status: 201, body: { id: "aud_new", ...request.body.audience, estimatedSize: 3 } };
    }
    if (request.method === "GET" && request.path === `${base}/aud_1`) {
      return { status: 200, body: { id: "aud_1", name: "All contacts" } };
    }
    if (request.method === "GET" && request.path === `${base}/aud_1/reach`) {
      return { status: 200, body: { total: 3, marketable: 1 } };
    }
    if (request.method === "PATCH" && request.path === `${base}/aud_1`) {
      return { status: 200, body: { id: "aud_1", ...request.body.audience } };
    }
    if (request.method === "DELETE" && request.path === `${base}/aud_in_use`) {
      return {
        status: 409,
        body: { error: { code: "record_not_destroyed", message: "Cannot delete record because dependent workflows exist" } },
      };
    }
    if (request.method === "DELETE" && request.path === `${base}/aud_1`) {
      return { status: 204 };
    }
    if (request.method === "POST" && request.path === "/v1/projects/proj_1/audience_suggestions") {
      return { status: 201, body: { suggestions: [{ name: "Premium families" }] } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });

const callTool = (name, args, context) =>
  handleMcpRequest({ method: "tools/call", params: { name, arguments: args } }, context);

test("exposes audience management as MCP tools and CLI commands", () => {
  const names = mcpToolDescriptors().map((tool) => tool.name);
  for (const name of [
    "list_audiences", "get_audience", "preview_audience", "create_audience",
    "update_audience", "delete_audience", "suggest_audiences",
  ]) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(findToolByCli(["audiences", "create"]).name, "create_audience");
  assert.equal(findToolByCli(["audiences", "show"]).name, "get_audience");
});

test("MCP previews, creates, reads with reach, updates and deletes an audience", async () => {
  const mock = await audienceApi();
  const config = { apiBase: mock.apiBase, apiKey: "sf_live_test", projectId: "proj_1" };
  const context = { client: createClient(config), config };

  try {
    const preview = await callTool("preview_audience", { definition: everyone }, context);
    assert.match(preview.content[0].text, /estimatedSize/);
    assert.deepEqual(mock.requests.at(-1).body.audience.definition, everyone);

    const created = await callTool("create_audience", { name: "All contacts", definition: everyone }, context);
    assert.match(created.content[0].text, /aud_new/);
    assert.equal(mock.requests.at(-1).body.audience.name, "All contacts");

    const shown = await callTool("get_audience", { audienceId: "aud_1", communicationClass: "marketing" }, context);
    assert.match(shown.content[0].text, /marketable/);
    assert.equal(mock.requests.at(-1).query.communicationClass, "marketing");

    const renamed = await callTool("update_audience", { audienceId: "aud_1", name: "Everyone" }, context);
    assert.match(renamed.content[0].text, /Everyone/);
    assert.deepEqual(mock.requests.at(-1).body, { audience: { name: "Everyone" } });

    const deleted = await callTool("delete_audience", { audienceId: "aud_1" }, context);
    assert.match(deleted.content[0].text, /"deleted": true/);

    const refused = await callTool("delete_audience", { audienceId: "aud_in_use" }, context);
    assert.equal(refused.isError, true);
    assert.match(refused.content[0].text, /dependent workflows exist/);
  } finally {
    await mock.close();
  }
});

test("CLI creates an audience from a definition file and lists audiences", async () => {
  const mock = await audienceApi();
  const file = join(await mkdtemp(join(tmpdir(), "audryo-aud-")), "definition.json");
  await writeFile(file, JSON.stringify(everyone));
  const global = ["--api-base", mock.apiBase, "--api-key", "sf_live_test", "--project-id", "proj_1"];

  try {
    let stdout = collectOutput();
    let stderr = collectOutput();
    let code = await runCli(["audiences", "create", "--name", "All contacts", "--definition", file, ...global],
      { stdout, stderr, env: {} });
    assert.equal(code, 0, stderr.toString());
    assert.equal(JSON.parse(stdout.toString()).id, "aud_new");
    assert.deepEqual(mock.requests.at(-1).body.audience, { name: "All contacts", definition: everyone });

    stdout = collectOutput();
    stderr = collectOutput();
    code = await runCli(["audiences", "show", "aud_1", "--include-reach", ...global], { stdout, stderr, env: {} });
    assert.equal(code, 0, stderr.toString());
    assert.equal(JSON.parse(stdout.toString()).reach.total, 3);

    stdout = collectOutput();
    stderr = collectOutput();
    code = await runCli(["audiences", "create", "--name", "Missing definition", ...global], { stdout, stderr, env: {} });
    assert.equal(code, 1);
    assert.match(stderr.toString(), /requires --definition/);

    stdout = collectOutput();
    stderr = collectOutput();
    code = await runCli(["audiences", "suggest", "--exclude-names", "A, B", ...global], { stdout, stderr, env: {} });
    assert.equal(code, 0, stderr.toString());
    assert.deepEqual(mock.requests.at(-1).body, { excludeNames: ["A", "B"] });
  } finally {
    await mock.close();
  }
});
