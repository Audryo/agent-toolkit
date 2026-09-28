import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const json = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

// The publish workflow refuses a tag that disagrees with any of these, so a
// forgotten bump fails here first instead of in the release job.
test("every release manifest carries the package version", async () => {
  const { version, mcpName } = await json("package.json");
  const plugin = await json(".claude-plugin/plugin.json");
  const server = await json("server.json");

  assert.equal(plugin.version, version);
  assert.equal(server.version, version);
  assert.equal(server.packages[0].version, version);
  assert.equal(server.name, mcpName, "the MCP Registry matches server.json to package.json by mcpName");
});

test("the plugin starts the published MCP server", async () => {
  const { mcpServers } = await json(".mcp.json");
  assert.deepEqual(mcpServers.audryo.args, ["-y", "audryo@latest", "mcp"]);
});
