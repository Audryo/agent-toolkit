// `changeset version` only bumps package.json. The Claude Code plugin and the
// MCP Registry entry carry their own version, so copy it there too.
import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

const { version } = read("package.json");

const plugin = read(".claude-plugin/plugin.json");
plugin.version = version;
write(".claude-plugin/plugin.json", plugin);

const server = read("server.json");
server.version = version;
for (const entry of server.packages) entry.version = version;
write("server.json", server);
