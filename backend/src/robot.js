const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const config = require("./config");
const { parseXml, child, children, findAll, text } = require("./xml");

const runtime = new Map();
const subscribers = new Map();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 160) || "artifact";
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function validateTargetUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Target website URL is invalid.");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Target website URL must use http:// or https://.");
  }
  return url.toString().replace(/\/$/, "") || url.toString();
}

function discoverRobotTests() {
  const results = [];
  if (!fs.existsSync(config.testsDir)) return results;

  function addCurrent(current) {
    if (current) results.push(current);
  }

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".robot")) continue;

      const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
      let inTestCases = false;
      let current = null;

      for (let index = 0; index < lines.length; index += 1) {
        const raw = lines[index];
        const trimmed = raw.trim();

        if (/^\*\*\*\s+Test Cases\s+\*\*\*/i.test(trimmed)) {
          addCurrent(current);
          current = null;
          inTestCases = true;
          continue;
        }

        if (trimmed.startsWith("*** ")) {
          addCurrent(current);
          current = null;
          inTestCases = false;
          continue;
        }

        if (!inTestCases || !trimmed || trimmed.startsWith("#")) continue;

        const isIndented = /^\s/.test(raw);
        if (!isIndented && !trimmed.startsWith("[")) {
          addCurrent(current);
          const id = trimmed.match(/^(TC\d+)\s*[-–—]\s*(.+)$/i)?.[1]?.toUpperCase() || `T${results.length + 1}`;
          const name = trimmed.replace(/^(TC\d+)\s*[-–—]\s*/i, "").trim();
          current = {
            id,
            name,
            fullName: trimmed,
            suite: path.relative(config.projectRoot, full),
            sourceFile: full,
            sourceLine: index + 1,
            tags: [],
            documentation: "",
          };
          continue;
        }

        if (!current) continue;
        const tagMatch = trimmed.match(/^\[Tags\]\s+(.+)$/i);
        if (tagMatch) current.tags = tagMatch[1].split(/\s{2,}|\s*,\s*/).filter(Boolean);
        const docMatch = trimmed.match(/^\[Documentation\]\s+(.+)$/i);
        if (docMatch) current.documentation = docMatch[1];
      }
      addCurrent(current);
    }
  }

  visit(config.testsDir);
  return results;
}

function getExistingResultFile() {
  const candidate = path.join(config.rootResultsDir, "output.xml");
  return fs.existsSync(candidate) ? candidate : null;
}

function collectKeywordTrace(testNode) {
  const trace = [];
  function walk(node, depth = 0) {
    for (const kw of children(node, "kw")) {
      const statuses = findAll(kw, "status");
      const last = statuses[statuses.length - 1];
      trace.push({
        name: kw.attrs.name || "",
        owner: kw.attrs.owner || "",
        status: last?.attrs.status || "",
        elapsedMs: Math.round(Number(last?.attrs.elapsed || 0) * 1000),
        depth,
      });
      walk(kw, depth + 1);
      if (trace.length >= 120) return;
    }
  }
  walk(testNode);
  return trace.slice(0, 120);
}

function findFailure(testNode) {
  let failure = null;
  function walk(node, parentKw = null) {
    for (const item of node.children) {
      const nextKw = item.name === "kw" ? item : parentKw;
      if (item.name === "status" && item.attrs.status === "FAIL") {
        failure = {
          keyword: parentKw?.attrs.name || "",
          owner: parentKw?.attrs.owner || "",
          message: text(item),
        };
        return;
      }
      if (!failure) walk(item, nextKw);
      if (failure) return;
    }
  }
  walk(testNode);
  return failure;
}

function findScreenshot(testNode) {
  for (const msg of findAll(testNode, "msg")) {
    const body = msg.text || "";
    const match = body.match(/(?:href=|src=|)([^\s"'<>]*\.png)/i);
    if (match) return path.basename(match[1]);
  }
  return null;
}

function findMetadata(tree) {
  let targetUrl = "";
  let browser = "";
  for (const msg of findAll(tree, "msg")) {
    const body = text(msg);
    const targetMatch = body.match(/base url ['"](https?:\/\/[^'"]+)['"]/i) || body.match(/Opening url ['"](https?:\/\/[^'"]+)['"]/i);
    if (!targetUrl && targetMatch) targetUrl = targetMatch[1].replace(/\/$/, "");
    const browserMatch = body.match(/Opening browser ['"]([^'"]+)['"]/i);
    if (!browser && browserMatch) browser = browserMatch[1];
    if (targetUrl && browser) break;
  }
  return { targetUrl, browser };
}

function parseRobotOutput(xmlPath) {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const tree = parseXml(xml);
  const testNodes = findAll(tree, "test");
  const suiteNodes = findAll(tree, "suite");
  const metadata = findMetadata(tree);
  const robotTests = [];
  const startCandidates = [];
  const endCandidates = [];

  for (const node of testNodes) {
    const status = child(node, "status");
    const statusAttr = status?.attrs || {};
    const startMs = statusAttr.start ? Date.parse(statusAttr.start) : NaN;
    const elapsedMs = Math.max(0, Number(statusAttr.elapsed || 0) * 1000);
    const endMs = Number.isFinite(startMs) ? startMs + elapsedMs : NaN;
    if (Number.isFinite(startMs)) startCandidates.push(startMs);
    if (Number.isFinite(endMs)) endCandidates.push(endMs);

    const failure = findFailure(node);
    const fullName = node.attrs.name || "Unnamed test";
    const idMatch = fullName.match(/^(TC\d+)\s*[-–—]\s*/i);
    const id = idMatch ? idMatch[1].toUpperCase() : fullName;
    const name = fullName.replace(/^(TC\d+)\s*[-–—]\s*/i, "").trim();

    robotTests.push({
      id,
      name,
      fullName,
      line: Number(node.attrs.line || 0),
      status: String(statusAttr.status || "UNKNOWN").toUpperCase(),
      durationMs: elapsedMs,
      keywords: collectKeywordTrace(node),
      failure: failure
        ? {
            exception: failure.message.split("\n")[0].trim() || "Robot Framework failure",
            message: failure.message,
            keyword: failure.keyword,
            owner: failure.owner,
          }
        : null,
      screenshot: findScreenshot(node),
    });
  }

  const rootSuite = suiteNodes[0] || null;
  const rootStatus = rootSuite ? child(rootSuite, "status") : null;
  const finiteStarts = startCandidates.filter(Number.isFinite);
  const finiteEnds = endCandidates.filter(Number.isFinite);
  const fallbackStart = finiteStarts.length ? Math.min(...finiteStarts) : NaN;
  const fallbackEnd = finiteEnds.length ? Math.max(...finiteEnds) : NaN;
  const startMs = rootStatus?.attrs.start ? Date.parse(rootStatus.attrs.start) : fallbackStart;
  const durationMs = rootStatus?.attrs.elapsed
    ? Math.round(Number(rootStatus.attrs.elapsed) * 1000)
    : Number.isFinite(startMs) && Number.isFinite(fallbackEnd)
      ? Math.max(0, fallbackEnd - startMs)
      : robotTests.reduce((sum, test) => sum + test.durationMs, 0);

  const passed = robotTests.filter((test) => test.status === "PASS").length;
  const failed = robotTests.filter((test) => test.status === "FAIL").length;
  const skipped = robotTests.filter((test) => /SKIP|NOT RUN|NOTRUN/.test(test.status)).length;

  return {
    tests: robotTests,
    total: robotTests.length,
    passed,
    failed,
    skipped,
    passRate: robotTests.length ? Number(((passed / robotTests.length) * 100).toFixed(1)) : 0,
    durationMs,
    duration: formatDuration(durationMs),
    startedAt: Number.isFinite(startMs) ? new Date(startMs).toISOString() : null,
    finishedAt: Number.isFinite(startMs) ? new Date(startMs + durationMs).toISOString() : null,
    suiteName: rootSuite?.attrs.name || "Robot Framework Suite",
    generator: tree.attrs.generator || "Robot Framework",
    targetUrl: metadata.targetUrl,
    browser: metadata.browser,
  };
}

function statusMap(status) {
  return { PASS: "passed", FAIL: "failed", SKIP: "ready", "NOT RUN": "ready", NOTRUN: "ready" }[status] || "ready";
}

function catalogWithResults(parsed, latestRunId = null) {
  const catalog = discoverRobotTests();
  const parsedByFullName = new Map(parsed.tests.map((test) => [test.fullName, test]));
  const parsedById = new Map(parsed.tests.map((test) => [test.id, test]));

  const all = catalog.map((entry) => {
    const result = parsedByFullName.get(entry.fullName) || parsedById.get(entry.id);
    return {
      id: entry.id,
      name: entry.name,
      fullName: entry.fullName,
      suite: entry.suite,
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
      tags: entry.tags,
      documentation: entry.documentation,
      type: entry.tags[0] || "automation",
      status: result ? statusMap(result.status) : "ready",
      durationMs: result?.durationMs || 0,
      duration: formatDuration(result?.durationMs || 0),
      latestRunId,
      keywords: result?.keywords || [],
      failure: result?.failure || null,
      screenshot: result?.screenshot || null,
    };
  });

  const existingIds = new Set(all.map((item) => item.id));
  for (const result of parsed.tests) {
    if (existingIds.has(result.id)) continue;
    all.push({
      id: result.id,
      name: result.name,
      fullName: result.fullName,
      suite: "runtime-result",
      sourceFile: null,
      sourceLine: result.line,
      tags: [],
      documentation: "",
      type: "automation",
      status: statusMap(result.status),
      durationMs: result.durationMs,
      duration: formatDuration(result.durationMs),
      latestRunId,
      keywords: result.keywords || [],
      failure: result.failure || null,
      screenshot: result.screenshot || null,
    });
  }

  return all;
}

function makeSummary(runId, parsed, targetUrl, status, extra = {}) {
  const firstTestSource = discoverRobotTests()[0]?.sourceFile;
  return {
    runId,
    status,
    targetUrl,
    browser: parsed.browser || config.browser,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
    skipped: parsed.skipped,
    passRate: parsed.passRate,
    durationMs: parsed.durationMs,
    duration: parsed.duration,
    startedAt: parsed.startedAt,
    finishedAt: parsed.finishedAt,
    suiteName: parsed.suiteName,
    generator: parsed.generator,
    testFile: extra.testFile || (firstTestSource ? path.relative(config.projectRoot, firstTestSource) : ""),
    ...extra,
  };
}

function listRunIds() {
  if (!fs.existsSync(config.resultsDir)) return [];
  return fs.readdirSync(config.resultsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(config.resultsDir, id, "summary.json")))
    .sort((a, b) => b.localeCompare(a));
}

function loadStoredRun(runId) {
  const dir = path.join(config.resultsDir, runId);
  const summaryPath = path.join(dir, "summary.json");
  const outputPath = path.join(dir, "output.xml");
  if (!fs.existsSync(summaryPath)) return null;
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  let parsed = null;
  if (fs.existsSync(outputPath)) parsed = parseRobotOutput(outputPath);
  return { summary, parsed, dir };
}

function getLatestRun() {
  const stored = listRunIds().map(loadStoredRun).filter(Boolean);
  if (stored.length) return stored[0];

  const existing = getExistingResultFile();
  if (existing) {
    const parsed = parseRobotOutput(existing);
    return {
      summary: makeSummary("existing-results", parsed, parsed.targetUrl || config.defaultTargetUrl, "completed", {
        source: "existing-results",
      }),
      parsed,
      dir: path.dirname(existing),
    };
  }
  return null;
}

function getRun(runId) {
  if (runtime.has(runId)) return runtime.get(runId);
  const stored = loadStoredRun(runId);
  if (stored) return stored;
  if (runId === "existing-results") {
    const existing = getExistingResultFile();
    if (!existing) return null;
    const parsed = parseRobotOutput(existing);
    return {
      summary: makeSummary("existing-results", parsed, parsed.targetUrl || config.defaultTargetUrl, "completed", { source: "existing-results" }),
      parsed,
      dir: path.dirname(existing),
    };
  }
  return null;
}

function emit(runId, event) {
  const record = runtime.get(runId);
  if (record) record.events.push({ ...event, at: new Date().toISOString() });
  const clients = subscribers.get(runId) || new Set();
  for (const res of clients) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function subscribe(runId, res) {
  if (!subscribers.has(runId)) subscribers.set(runId, new Set());
  subscribers.get(runId).add(res);

  const record = getRun(runId);
  if (record?.events) {
    for (const event of record.events.slice(-60)) res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  if (record?.summary?.status !== "running" && record?.summary) {
    res.write(`data: ${JSON.stringify({ type: "done", summary: record.summary })}\n\n`);
    res.end();
  }
}

function unsubscribe(runId, res) {
  const set = subscribers.get(runId);
  if (!set) return;
  set.delete(res);
  if (!set.size) subscribers.delete(runId);
}

async function runRobot({ runId, ids, targetUrl }) {
  const catalog = discoverRobotTests();
  const byId = new Map(catalog.map((test) => [test.id, test]));
  const chosen = ids.length ? ids.map((id) => byId.get(id)).filter(Boolean) : catalog;
  if (!chosen.length) throw new Error("No matching Robot Framework tests were found.");

  const runDir = path.join(config.resultsDir, runId);
  ensureDir(runDir);

  const args = [
    "-m", "robot",
    "--outputdir", runDir,
    "--consolecolors", "off",
    "--loglevel", "INFO",
    "-v", `BASE_URL:${targetUrl}`,
    "-v", `BROWSER:${config.browser}`,
  ];

  if (config.validEmail && config.validPassword) {
    args.push("-v", `VALID_EMAIL:${config.validEmail}`);
    args.push("-v", `VALID_PASSWORD:${config.validPassword}`);
  }

  for (const test of chosen) args.push("-t", test.fullName);
  args.push(config.testsDir);

  const record = runtime.get(runId);
  record.summary = {
    ...record.summary,
    selectedTestIds: chosen.map((test) => test.id),
  };
  runtime.set(runId, record);

  emit(runId, { type: "log", message: `> target: ${targetUrl}` });
  emit(runId, { type: "log", message: `> executing ${chosen.length} test${chosen.length === 1 ? "" : "s"}` });
  emit(runId, { type: "log", message: `> python: ${config.pythonCommand} -m robot ...` });
  emit(runId, { type: "log", message: "> initializing Robot Framework..." });
  for (const test of chosen) emit(runId, { type: "status", testId: test.id, status: "running" });

  const childProcessResult = await new Promise((resolve, reject) => {
    const childProcess = spawn(config.pythonCommand, args, {
      cwd: config.projectRoot,
      env: { ...process.env },
      windowsHide: false,
    });
    record.process = childProcess;
    record.startedAtMs = Date.now();

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      childProcess.kill("SIGTERM");
      reject(new Error(`Robot execution exceeded ${Math.round(config.runTimeoutMs / 60000)} minutes.`));
    }, config.runTimeoutMs);

    const handle = (chunk, isError) => {
      const incoming = chunk.toString();
      const combined = (isError ? stderrBuffer : stdoutBuffer) + incoming;
      const lines = combined.split(/\r?\n/);
      if (isError) stderrBuffer = lines.pop() || "";
      else stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const clean = line.trimEnd();
        if (!clean) continue;
        emit(runId, { type: "log", message: clean });

        const match = clean.match(/^(TC\d+.*?)\s+\|\s+(PASS|FAIL|SKIP)\s+\|/i);
        if (match) {
          emit(runId, {
            type: "status",
            testId: match[1].match(/^(TC\d+)/i)?.[1]?.toUpperCase() || match[1],
            status: statusMap(match[2].toUpperCase()),
          });
        }
      }
    };

    childProcess.stdout.on("data", (chunk) => handle(chunk, false));
    childProcess.stderr.on("data", (chunk) => handle(chunk, true));
    childProcess.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    childProcess.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (stdoutBuffer) emit(runId, { type: "log", message: stdoutBuffer });
      if (stderrBuffer) emit(runId, { type: "log", message: stderrBuffer });
      resolve({ code, signal });
    });
  });

  const outputPath = path.join(runDir, "output.xml");
  if (!fs.existsSync(outputPath)) throw new Error("Robot finished without producing output.xml.");

  const parsed = parseRobotOutput(outputPath);
  const summary = makeSummary(runId, parsed, targetUrl, parsed.failed ? "failed" : "passed", {
    source: "robot",
    selectedTestIds: chosen.map((test) => test.id),
    exitCode: childProcessResult.code,
    testFile: chosen[0]?.sourceFile ? path.relative(config.projectRoot, chosen[0].sourceFile) : "",
  });

  const stored = {
    summary,
    parsed,
    dir: runDir,
    events: record.events,
  };

  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(runDir, "events.json"), JSON.stringify(record.events, null, 2));
  runtime.set(runId, stored);

  for (const result of parsed.tests) emit(runId, { type: "status", testId: result.id, status: statusMap(result.status) });
  emit(runId, { type: "done", summary });

  for (const res of subscribers.get(runId) || []) res.end();
  subscribers.delete(runId);
  return summary;
}

function startRun({ ids, targetUrl }) {
  if ([...runtime.values()].some((record) => record.summary?.status === "running")) {
    throw new Error("Another Selenator run is already in progress.");
  }

  const runId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) + "-" + crypto.randomBytes(3).toString("hex");
  const normalizedTarget = validateTargetUrl(targetUrl || config.defaultTargetUrl);
  if (!normalizedTarget) throw new Error("A target website URL is required.");

  const record = {
    summary: {
      runId,
      status: "running",
      targetUrl: normalizedTarget,
      browser: config.browser,
      startedAt: new Date().toISOString(),
    },
    events: [],
    stdoutBuffer: "",
    stderrBuffer: "",
  };

  runtime.set(runId, record);

  runRobot({ runId, ids, targetUrl: normalizedTarget }).catch((error) => {
    const failureSummary = {
      ...record.summary,
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: error.message,
    };
    const runDir = path.join(config.resultsDir, runId);
    ensureDir(runDir);
    fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(failureSummary, null, 2));
    fs.writeFileSync(path.join(runDir, "events.json"), JSON.stringify(record.events, null, 2));
    runtime.set(runId, { ...record, summary: failureSummary, dir: runDir });
    emit(runId, { type: "log", message: `> RUNNER ERROR: ${error.message}` });
    emit(runId, { type: "done", summary: failureSummary });
    for (const res of subscribers.get(runId) || []) res.end();
    subscribers.delete(runId);
  });

  return runId;
}

function getSummary() {
  const latest = getLatestRun();
  const catalog = discoverRobotTests();
  const active = [...runtime.values()].find((record) => record.summary?.status === "running");
  const current = latest?.summary?.total != null
    ? latest.summary
    : {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0,
        durationMs: 0,
        duration: "0s",
      };

  return {
    app: "Selenator",
    tagline: "Quality Assurance, made easy.",
    targetUrl: active?.summary?.targetUrl || latest?.summary?.targetUrl || config.defaultTargetUrl,
    browser: latest?.summary?.browser || config.browser,
    runner: "Robot Framework",
    library: "SeleniumLibrary",
    testFile: catalog[0]?.sourceFile ? path.relative(config.projectRoot, catalog[0].sourceFile) : "",
    totalTests: catalog.length,
    latestRun: latest?.summary || null,
    activeRun: active?.summary || null,
    current,
  };
}

function getLatestResultSource() {
  const latest = getLatestRun();
  if (latest?.parsed) return latest;

  const existing = getExistingResultFile();
  if (!existing) return null;
  const parsed = parseRobotOutput(existing);
  return {
    summary: makeSummary("existing-results", parsed, parsed.targetUrl || config.defaultTargetUrl, "completed", { source: "existing-results" }),
    parsed,
    dir: path.dirname(existing),
  };
}

function getTests() {
  const latest = getLatestResultSource();
  const parsed = latest?.parsed || { tests: [] };
  const base = catalogWithResults(parsed, latest?.summary?.runId || null);
  const active = [...runtime.values()].find((record) => record.summary?.status === "running");
  if (!active) return base;
  const runningIds = active.summary.selectedTestIds || [];
  return base.map((test) => runningIds.includes(test.id) ? { ...test, status: "running" } : test);
}

function getTest(id) {
  const latest = getLatestResultSource();
  const catalogEntry = discoverRobotTests().find((test) => test.id === id);
  if (!catalogEntry) return null;
  const result = latest?.parsed?.tests.find((test) => test.id === id || test.fullName === catalogEntry.fullName) || null;
  return {
    ...catalogEntry,
    type: catalogEntry.tags[0] || "automation",
    status: statusMap(result?.status),
    durationMs: result?.durationMs || 0,
    duration: formatDuration(result?.durationMs || 0),
    latestRunId: latest?.summary?.runId || null,
    keywords: result?.keywords || [],
    failure: result?.failure || null,
    screenshot: result?.screenshot || null,
  };
}

function getFailures() {
  const latest = getLatestResultSource();
  if (!latest?.parsed) return [];
  return latest.parsed.tests
    .filter((test) => test.status === "FAIL")
    .map((test) => ({
      id: test.id,
      name: test.name,
      fullName: test.fullName,
      status: "failed",
      runId: latest.summary.runId,
      durationMs: test.durationMs,
      duration: formatDuration(test.durationMs),
      exception: test.failure?.exception || "Robot Framework failure",
      message: test.failure?.message || "",
      keyword: test.failure?.keyword || "",
      owner: test.failure?.owner || "",
      screenshot: test.screenshot,
      keywords: test.keywords,
      target: latest.summary.targetUrl,
    }));
}

function getRuns() {
  const runs = listRunIds().map((id) => loadStoredRun(id)?.summary).filter(Boolean);
  const existing = getExistingResultFile();
  if (existing && !runs.some((run) => run.runId === "existing-results")) {
    const latest = getLatestRun();
    if (latest?.summary) runs.push(latest.summary);
  }
  return runs.slice(0, 20);
}

function resolveArtifact(runId, filename) {
  const record = getRun(runId);
  if (!record?.dir) return null;
  const requested = safeName(filename);
  const root = path.resolve(record.dir);
  const fullPath = path.resolve(record.dir, requested);
  if (!fullPath.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  return fullPath;
}

function exportLatest() {
  const latestRun = getLatestRun();
  const latestResult = getLatestResultSource();
  const summary = latestRun?.summary || latestResult?.summary || getSummary();
  const tests = latestResult?.parsed?.tests || [];
  return { summary, tests };
}

module.exports = {
  discoverRobotTests,
  getLatestRun,
  getRun,
  getSummary,
  getTests,
  getTest,
  getFailures,
  getRuns,
  startRun,
  subscribe,
  unsubscribe,
  resolveArtifact,
  exportLatest,
};
