const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const robot = require("./robot");
const config = require("./config");

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": config.frontendOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function noContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": config.frontendOrigin,
    "Access-Control-Allow-Credentials": "true",
  });
  res.end();
}

function badRequest(res, message) {
  json(res, 400, { error: message });
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Request body must be valid JSON.")); }
    });
    req.on("error", reject);
  });
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".txt": "text/plain; charset=utf-8",
  };
  const contentType = types[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": config.frontendOrigin,
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Selenator-Backend", "1");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": config.frontendOrigin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return json(res, 200, {
        status: "ok",
        backend: "Selenator",
        runner: "Robot Framework",
        projectRoot: config.projectRoot,
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === "GET" && pathname === "/api/summary") {
      return json(res, 200, robot.getSummary());
    }

    if (req.method === "GET" && pathname === "/api/tests") {
      return json(res, 200, { tests: robot.getTests() });
    }

    if (req.method === "GET" && pathname.startsWith("/api/tests/")) {
      const id = decodeURIComponent(pathname.slice("/api/tests/".length));
      const result = robot.getTest(id);
      if (!result) return notFound(res);
      return json(res, 200, result);
    }

    if (req.method === "GET" && pathname === "/api/failures") {
      return json(res, 200, { failures: robot.getFailures() });
    }

    if (req.method === "GET" && pathname === "/api/runs") {
      return json(res, 200, { runs: robot.getRuns() });
    }

    if (req.method === "GET" && pathname === "/api/runs/latest") {
      const latest = robot.getLatestRun();
      return json(res, 200, latest || { summary: null });
    }

    if (req.method === "GET" && pathname === "/api/runs/export/latest") {
      const payload = JSON.stringify(robot.exportLatest(), null, 2);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="selenator-latest-run.json"`,
        "Access-Control-Allow-Origin": config.frontendOrigin,
      });
      return res.end(payload);
    }

    const eventMatch = pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (req.method === "GET" && eventMatch) {
      const runId = decodeURIComponent(eventMatch[1]);
      if (!robot.getRun(runId)) return notFound(res);
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": config.frontendOrigin,
      });
      res.write(`retry: 1000\n\n`);
      robot.subscribe(runId, res);
      req.on("close", () => robot.unsubscribe(runId, res));
      return;
    }

    const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (req.method === "GET" && runMatch) {
      const runId = decodeURIComponent(runMatch[1]);
      const record = robot.getRun(runId);
      if (!record) return notFound(res);
      return json(res, 200, record.summary ? { summary: record.summary, parsed: record.parsed } : record);
    }

    const artifactMatch = pathname.match(/^\/api\/artifacts\/([^/]+)\/(.+)$/);
    if (req.method === "GET" && artifactMatch) {
      const runId = decodeURIComponent(artifactMatch[1]);
      const filename = decodeURIComponent(artifactMatch[2]);
      const file = robot.resolveArtifact(runId, filename);
      if (!file) return notFound(res);
      return serveFile(res, file);
    }

    if (req.method === "POST" && pathname === "/api/runs") {
      const body = await parseBody(req);
      const ids = Array.isArray(body.testIds) ? body.testIds.map(String) : [];
      const runId = robot.startRun({
        ids,
        targetUrl: typeof body.targetUrl === "string" ? body.targetUrl : "",
      });
      return json(res, 202, { runId });
    }

    const retryMatch = pathname.match(/^\/api\/runs\/([^/]+)\/retry-failed$/);
    if (req.method === "POST" && retryMatch) {
      const current = robot.getRun(decodeURIComponent(retryMatch[1]));
      if (!current?.parsed) return badRequest(res, "Run has no parsed Robot result.");
      const ids = current.parsed.tests.filter((test) => test.status === "FAIL").map((test) => test.id);
      if (!ids.length) return badRequest(res, "Run has no failed tests to rerun.");
      const targetUrl = current.summary?.targetUrl || config.defaultTargetUrl;
      const runId = robot.startRun({ ids, targetUrl });
      return json(res, 202, { runId });
    }

    return notFound(res);
  } catch (error) {
    return json(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Selenator backend listening at http://${config.host}:${config.port}`);
  console.log(`Project root: ${config.projectRoot}`);
  console.log(`Target default: ${config.defaultTargetUrl || "(not configured)"}`);
});
