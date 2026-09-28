import { createClient } from "./client.js";
import { ConfigError } from "./config.js";
import { findTool, mcpToolDescriptors } from "./tools.js";
import { AudryoApiError } from "./client.js";
import { createRequire } from "node:module";

const { version: PACKAGE_VERSION } = createRequire(import.meta.url)("../package.json");

const PROTOCOL_VERSION = "2024-11-05";

export const handleMcpRequest = async (message, { client, config }) => {
  if (message.method === "initialize") {
    return {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "audryo", version: PACKAGE_VERSION },
    };
  }

  if (message.method === "ping") {
    return {};
  }

  if (message.method === "tools/list") {
    return { tools: mcpToolDescriptors() };
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    const tool = findTool(name);
    if (!tool) {
      return errorResult(`Unknown tool: ${name}`);
    }
    try {
      const result = await tool.run(client, args, config);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return errorResult(formatToolError(error), true);
    }
  }

  throw new McpError(-32601, `Method not found: ${message.method}`);
};

export const startMcpServer = async ({ stdin, stdout, config }) => {
  const client = createClient(config);
  const context = { client, config };

  stdin.on("data", createFramedReader(async (message) => {
    if (message.method && message.id === undefined) {
      return;
    }

    try {
      const result = await handleMcpRequest(message, context);
      writeMessage(stdout, { jsonrpc: "2.0", id: message.id, result });
    } catch (error) {
      const code = error instanceof McpError ? error.code : -32603;
      writeMessage(stdout, {
        jsonrpc: "2.0",
        id: message.id ?? null,
        error: { code, message: error.message },
      });
    }
  }));

  await new Promise((resolve, reject) => {
    stdin.on("end", resolve);
    stdin.on("close", resolve);
    stdin.on("error", reject);
  });
};

export const writeMessage = (stdout, message) => {
  const json = JSON.stringify(message);
  const payload = Buffer.from(json, "utf8");
  stdout.write(`Content-Length: ${payload.length}\r\n\r\n`);
  stdout.write(payload);
};

export const createFramedReader = (onMessage) => {
  let buffer = Buffer.alloc(0);

  return (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

    while (buffer.length > 0) {
      const headerEnd = indexOfHeaderEnd(buffer);
      if (headerEnd === -1) {
        const ndjson = tryReadNdjson(buffer);
        if (!ndjson) return;
        buffer = ndjson.rest;
        Promise.resolve(onMessage(ndjson.message)).catch(() => {});
        continue;
      }

      const header = buffer.subarray(0, headerEnd).toString("utf8");
      const lengthMatch = header.match(/content-length:\s*(\d+)/i);
      if (!lengthMatch) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }

      const length = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;

      const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
      buffer = buffer.subarray(bodyStart + length);
      Promise.resolve(onMessage(JSON.parse(body))).catch(() => {});
    }
  };
};

class McpError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const errorResult = (text, isError = true) => ({
  isError,
  content: [{ type: "text", text }],
});

const formatToolError = (error) => {
  if (error instanceof AudryoApiError) {
    return JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
        requestId: error.requestId,
      },
    });
  }
  if (error instanceof ConfigError) {
    return JSON.stringify({ error: { code: error.code, message: error.message } });
  }
  return JSON.stringify({ error: { code: "tool_error", message: error.message } });
};

const indexOfHeaderEnd = (buffer) => {
  const text = buffer.toString("utf8");
  const index = text.indexOf("\r\n\r\n");
  return index === -1 ? -1 : Buffer.byteLength(text.slice(0, index), "utf8");
};

const tryReadNdjson = (buffer) => {
  const text = buffer.toString("utf8");
  if (text.startsWith("Content-Length:") || text.startsWith("content-length:")) return null;
  const newline = text.indexOf("\n");
  if (newline === -1) return null;
  const line = text.slice(0, newline).trim();
  if (!line.startsWith("{")) return null;
  return {
    message: JSON.parse(line),
    rest: buffer.subarray(Buffer.byteLength(text.slice(0, newline + 1), "utf8")),
  };
};
