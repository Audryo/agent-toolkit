import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../src/cli.js";
import { createClient } from "../src/client.js";
import { handleMcpRequest } from "../src/mcp.js";
import { collectOutput, startMockApi } from "./helpers.mjs";

const details = { specification: ["/guards/0 is missing windowDays"] };

const invalidApi = () =>
  startMockApi(() => ({
    status: 422,
    body: { error: { code: "validation_failed", message: "The request could not be validated.", details } },
  }));

test("MCP passes per-field validation details through to the agent", async () => {
  const mock = await invalidApi();
  const config = { apiBase: mock.apiBase, apiKey: "sf_live_test", projectId: "proj_1" };

  try {
    const result = await handleMcpRequest(
      {
        method: "tools/call",
        params: {
          name: "revise_journey",
          arguments: { workflowId: "wf_1", name: "Journey", audienceId: "aud_1", specification: { nodes: [] } },
        },
      },
      { client: createClient(config), config },
    );
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse(result.content[0].text).error.details, details);
  } finally {
    await mock.close();
  }
});

test("CLI prints validation details with the error", async () => {
  const mock = await invalidApi();
  const stdout = collectOutput();
  const stderr = collectOutput();

  try {
    const code = await runCli(
      ["audiences", "create", "--name", "Broken", "--definition", "{\"operator\":\"xor\"}",
        "--api-base", mock.apiBase, "--api-key", "sf_live_test", "--project-id", "proj_1"],
      { stdout, stderr, env: {} },
    );
    assert.equal(code, 1);
    assert.deepEqual(JSON.parse(stderr.toString()).error.details, details);
  } finally {
    await mock.close();
  }
});
