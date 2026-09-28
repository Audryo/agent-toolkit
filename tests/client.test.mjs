import assert from "node:assert/strict";
import test from "node:test";
import { AudryoApiError, createClient } from "../src/client.js";
import { startMockApi } from "./helpers.mjs";

test("sends Bearer auth and project-scoped ingest paths", async () => {
  const mock = await startMockApi((request) => {
    if (request.path === "/v1/projects/proj_1/event_ingestion") {
      return { status: 202, body: { accepted: 1, duplicates: 0, events: 1 } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });

  try {
    const client = createClient({ apiBase: mock.apiBase, apiKey: "sf_live_test" });
    const result = await client.ingestEvents("proj_1", [
      { name: "signup_completed", contactExternalId: "usr_1", externalId: "evt_1" },
    ]);

    assert.equal(result.accepted, 1);
    assert.equal(mock.requests[0].headers.authorization, "Bearer sf_live_test");
    assert.deepEqual(mock.requests[0].body, {
      events: [{ name: "signup_completed", contactExternalId: "usr_1", externalId: "evt_1" }],
    });
  } finally {
    await mock.close();
  }
});

test("attaches Idempotency-Key on transactional send", async () => {
  const mock = await startMockApi(() => ({
    status: 202,
    body: { deliveryId: "del_1", status: "queued" },
  }));

  try {
    const client = createClient({ apiBase: mock.apiBase, apiKey: "sf_live_test" });
    await client.sendTransactional(
      "proj_1",
      "msg_1",
      { email: "amelia@example.com" },
      "receipt-ord_1842",
    );

    assert.equal(mock.requests[0].path, "/v1/projects/proj_1/message_documents/msg_1/transactional_send");
    assert.equal(mock.requests[0].headers["idempotency-key"], "receipt-ord_1842");
  } finally {
    await mock.close();
  }
});

test("surfaces API error codes", async () => {
  const mock = await startMockApi(() => ({
    status: 403,
    body: {
      error: {
        code: "insufficient_token_scope",
        message: "This action requires the deliver API-token scope.",
        requestId: "req_scope",
      },
    },
  }));

  try {
    const client = createClient({ apiBase: mock.apiBase, apiKey: "sf_live_test" });
    await assert.rejects(
      () => client.updateWorkflowRuntime("proj_1", "wf_1", "active"),
      (error) => {
        assert.ok(error instanceof AudryoApiError);
        assert.equal(error.code, "insufficient_token_scope");
        assert.equal(error.status, 403);
        return true;
      },
    );
  } finally {
    await mock.close();
  }
});
