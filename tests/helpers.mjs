import http from "node:http";

export const startMockApi = async (handler) => {
  const requests = [];

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url, "http://127.0.0.1");
      const request = {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: req.headers,
        body: raw ? JSON.parse(raw) : null,
      };
      requests.push(request);

      let result;
      try {
        result = handler(request) ?? { status: 200, body: {} };
      } catch (error) {
        result = { status: 500, body: { error: { code: "mock_error", message: error.message } } };
      }

      res.writeHead(result.status ?? 200, {
        "content-type": "application/json",
        "x-request-id": "req_test",
        ...(result.headers ?? {}),
      });
      res.end(JSON.stringify(result.body ?? {}));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  return {
    apiBase: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

export const collectOutput = () => {
  let text = "";
  return {
    write(chunk) {
      text += String(chunk);
    },
    toString() {
      return text;
    },
  };
};
