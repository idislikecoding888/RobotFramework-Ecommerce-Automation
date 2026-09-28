"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SelenatorShell from "./SelenatorShell";
import { StatusMark } from "./StatusMark";
import {
  apiUrl,
  artifactUrl,
  exportLatestRun,
  getFailures,
  getHealth,
  getSummary,
  getTests,
  type ApiFailure,
  type ApiTest,
  type KeywordTrace,
  type SummaryResponse,
} from "@/lib/api";
import { runSuite } from "@/lib/runner";
import type { TestStatus } from "@/lib/mockData";

type Page = "overview" | "tests" | "failures";
type Filter = "all" | "passed" | "failed";

type Props = {
  initialPage: Page;
};

const EMPTY_SUMMARY: SummaryResponse = {
  app: "Selenator",
  tagline: "Quality Assurance, made easy.",
  targetUrl: "",
  browser: "",
  runner: "Robot Framework",
  library: "SeleniumLibrary",
  testFile: "",
  totalTests: 0,
  latestRun: null,
  activeRun: null,
  current: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: 0,
    durationMs: 0,
    duration: "0s",
  },
};

export default function DashboardApp({ initialPage }: Props) {
  const [page, setPage] = useState<Page>(initialPage);
  const [testData, setTestData] = useState<ApiTest[]>([]);
  const [failureData, setFailureData] = useState<ApiFailure[]>([]);
  const [summary, setSummary] = useState<SummaryResponse>(EMPTY_SUMMARY);
  const [running, setRunning] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("selenator.targetUrl");
    if (saved) setTargetUrl(saved);
    void refreshData(saved || "");
  }, []);

  useEffect(() => {
    if (targetUrl) window.localStorage.setItem("selenator.targetUrl", targetUrl);
  }, [targetUrl]);


  async function refreshData(preferredTarget?: string) {
    try {
      const [health, summaryResponse, testsResponse, failuresResponse] = await Promise.all([
        getHealth(),
        getSummary(),
        getTests(),
        getFailures(),
      ]);

      setBackendOnline(health.status === "ok");
      setSummary(summaryResponse);
      setTestData(testsResponse);
      setFailureData(failuresResponse);

      const resolvedTarget = preferredTarget || summaryResponse.targetUrl || "";
      if (!targetUrl && resolvedTarget) setTargetUrl(resolvedTarget);

      setLog(buildInitialLog(summaryResponse, testsResponse));
    } catch (error) {
      setBackendOnline(false);
      setToast(error instanceof Error ? error.message : "Backend connection failed.");
      window.setTimeout(() => setToast(null), 2500);
    }
  }

  const latestRun = summary.latestRun && typeof summary.latestRun.total === "number" ? summary.latestRun : null;
  const passed = latestRun ? latestRun.passed : testData.filter((test) => test.status === "passed").length;
  const failed = latestRun ? latestRun.failed : testData.filter((test) => test.status === "failed").length;
  const total = latestRun ? latestRun.total : testData.length;
  const passRate = latestRun ? latestRun.passRate : (total ? Number(((passed / total) * 100).toFixed(1)) : 0);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return testData.filter((test) => {
      const matchesQuery = !q || `${test.id} ${test.name} ${test.suite}`.toLowerCase().includes(q);
      const matchesFilter = filter === "all" || test.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, testData]);

  async function run(ids = testData.map((test) => test.id)) {
    const normalizedTarget = targetUrl.trim();
    if (!normalizedTarget) {
      setToast("Enter the target website URL first.");
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    if (running || !ids.length) return;

    setRunning(true);
    setLog([
      `> target: ${normalizedTarget}`,
      `> dispatching ${ids.length} Robot Framework test${ids.length === 1 ? "" : "s"}...`,
      "> opening execution stream...",
    ]);

    try {
      await runSuite(ids, normalizedTarget, (event) => {
        if (event.type === "log" && event.message) {
          setLog((current) => [...current.slice(-40), event.message as string]);
        }
        if (event.type === "status" && event.testId && event.status) {
          const id = event.testId;
          setTestData((current) => current.map((test) => test.id === id ? { ...test, status: event.status as TestStatus } : test));
        }
        if (event.type === "done") {
          setToast("Run finished. Results updated.");
        }
      });

      await refreshData(normalizedTarget);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Execution failed.");
      window.setTimeout(() => setToast(null), 3000);
      await refreshData(normalizedTarget);
    } finally {
      setRunning(false);
    }
  }

  function copyError(failure: ApiFailure) {
    const payload = `${failure.exception}: ${failure.message}\nTarget: ${failure.target}\nKeyword: ${failure.keyword}`;
    void navigator.clipboard?.writeText(payload);
    setToast(`${failure.id} error copied`);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function exportReport() {
    try {
      await exportLatestRun();
      setToast("Latest run exported.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Export failed.");
    }
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <SelenatorShell
      targetUrl={targetUrl}
      onTargetUrlChange={setTargetUrl}
      backendOnline={backendOnline}
      onRunAll={() => void run()}
      running={running}
    >
      {page === "overview" && (
        <OverviewPage
          summary={summary}
          tests={testData}
          failures={failureData}
          passed={passed}
          failed={failed}
          total={total}
          passRate={passRate}
          running={running}
          log={log}
          onRun={() => void run()}
          onRunFailed={() => void run(failureData.map((item) => item.id))}
          onInspect={(id) => {
            setSelectedTest(id);
            setPage("failures");
          }}
          onExport={() => void exportReport()}
        />
      )}

      {page === "tests" && (
        <TestsPage
          tests={testData}
          filteredTests={filteredTests}
          running={running}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          selectedTest={selectedTest}
          setSelectedTest={setSelectedTest}
          onRun={(id) => void run([id])}
          onCopy={copyError}
          failures={failureData}
        />
      )}

      {page === "failures" && (
        <FailuresPage
          summary={summary}
          failures={failureData}
          running={running}
          onRunFailed={() => void run(failureData.map((item) => item.id))}
          onRun={(id) => void run([id])}
          onCopy={copyError}
          selectedTest={selectedTest}
          setSelectedTest={setSelectedTest}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <div className="mobile-jump">
        <Link href="/overview" onClick={() => setPage("overview")}>01</Link>
        <Link href="/tests" onClick={() => setPage("tests")}>02</Link>
        <Link href="/failures" onClick={() => setPage("failures")}>03</Link>
      </div>
    </SelenatorShell>
  );
}

function buildInitialLog(current: SummaryResponse, tests: ApiTest[]) {
  const run = current.latestRun;
  if (!run) {
    return [
      "> Selenator backend connected",
      `> discovered ${tests.length} Robot Framework test${tests.length === 1 ? "" : "s"}`,
      "> ready to execute",
    ];
  }

  const lines = [
    `> target: ${run.targetUrl || current.targetUrl || "(not configured)"}`,
    `> ${run.generator || current.runner} · ${run.browser || "browser from configuration"}`,
    `> loaded run ${run.runId}`,
    `> ${run.total} test${run.total === 1 ? "" : "s"} · ${run.passed} passed · ${run.failed} failed`,
    `> result: ${run.passRate}% · ${run.duration}`,
  ];

  return lines;
}

function OverviewPage({
  summary,
  tests,
  failures,
  passed,
  failed,
  total,
  passRate,
  running,
  log,
  onRun,
  onRunFailed,
  onInspect,
  onExport,
}: {
  summary: SummaryResponse;
  tests: ApiTest[];
  failures: ApiFailure[];
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  running: boolean;
  log: string[];
  onRun: () => void;
  onRunFailed: () => void;
  onInspect: (id: string) => void;
  onExport: () => void;
}) {
  const latest = summary.latestRun;

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <div className="eyebrow">SELENATOR <span>/</span> AUTOMATION</div>
          <h1>Execution Overview</h1>
          <p>{summary.runner} · {summary.library} · {summary.testFile || "No Robot suite discovered"}</p>
        </div>

        <div className="heading-actions">
          <button className="button ghost" onClick={onExport}>[ EXPORT ]</button>
          <button className="button ghost" onClick={onRunFailed} disabled={running || failed === 0}>[ RE-RUN FAILED ]</button>
          <button className="button neon" onClick={onRun} disabled={running || tests.length === 0}>[ {running ? "RUNNING..." : "RUN ALL TESTS"} ]</button>
        </div>
      </section>

      <section className="summary-band">
        <div className="summary-item">
          <span className="signal green" />
          <small>PASSED</small>
          <strong>{String(passed).padStart(2, "0")}</strong>
          <b>/ {total} TESTS</b>
        </div>
        <div className="summary-item failure">
          <span className="signal red" />
          <small>FAILED</small>
          <strong>{String(failed).padStart(2, "0")}</strong>
          <b>REQUIRES TRIAGE</b>
        </div>
        <div className="summary-item">
          <span className="signal gray" />
          <small>TOTAL EXECUTION</small>
          <strong>{passRate}%</strong>
          <b>{latest?.duration ? `RUN TIME · ${latest.duration}` : "NO RUN YET"}</b>
        </div>
      </section>

      <div className="pass-bar" aria-label={`${passRate}% pass rate`}>
        <span style={{ width: `${passRate}%` }} />
      </div>
      <div className="bar-caption">
        <span>{passRate}% PASS</span>
        <span>{Math.max(0, 100 - passRate).toFixed(1)}% NOT PASSING</span>
      </div>

      <section className="section-block">
        <div className="section-title">
          <h2>Failures</h2>
          <span className="red-label">{failed} {failed === 1 ? "FAILURE" : "FAILURES"}</span>
          <span className="section-note">{failed ? "REQUIRES TRIAGE" : "ALL CLEAR"}</span>
        </div>

        <div className="failure-list">
          {failures.length === 0 ? (
            <div className="empty-block">No failed tests in the latest execution.</div>
          ) : failures.map((failure) => (
            <article key={failure.id} className="failure-row">
              <div className="failure-copy">
                <div className="failure-row-title">
                  <span className="failure-id">{failure.id}</span>
                  <h3>{failure.name}</h3>
                  <span className="mono-soft">{failure.keyword || "Robot Framework"}</span>
                </div>
                <p>{failure.exception}</p>
                <code>{failure.message || failure.exception}</code>
              </div>
              <button className="inspect-button" onClick={() => onInspect(failure.id)}>[ INSPECT → ]</button>
            </article>
          ))}
        </div>
      </section>

      <section className="terminal-panel">
        <div className="terminal-head">
          <span><i className="terminal-led" /> CONSOLE LOG <b>· ROBOT FRAMEWORK</b></span>
          <span>{latest?.runId ? `RUN: ${latest.runId}` : "READY"}</span>
        </div>
        <div className="terminal-body">
          {log.map((line, index) => (
            <div key={`${line}-${index}`} className={line.includes("FAIL") || line.includes("failed") ? "term-line fail" : line.includes("PASS") || line.includes("passed") || line.includes("connected") ? "term-line pass" : "term-line"}>
              <span className="line-no">{String(index + 1).padStart(2, "0")}</span>
              <span>{line}</span>
            </div>
          ))}
          <span className="caret">▋</span>
        </div>
      </section>

      <section className="run-footer">
        <div><span className="green-text">●</span> {summary.runner} · {summary.library}</div>
        <div>{latest ? `${latest.passed} PASSED · ${latest.failed} FAILED · ${latest.duration}` : "NO EXECUTION RECORDED"}</div>
      </section>
    </div>
  );
}

function TestsPage({
  tests,
  filteredTests,
  running,
  query,
  setQuery,
  filter,
  setFilter,
  selectedTest,
  setSelectedTest,
  onRun,
  onCopy,
  failures,
}: {
  tests: ApiTest[];
  filteredTests: ApiTest[];
  running: boolean;
  query: string;
  setQuery: (value: string) => void;
  filter: Filter;
  setFilter: (value: Filter) => void;
  selectedTest: string | null;
  setSelectedTest: (value: string | null) => void;
  onRun: (id: string) => void;
  onCopy: (failure: ApiFailure) => void;
  failures: ApiFailure[];
}) {
  const passed = tests.filter((test) => test.status === "passed").length;
  const failed = tests.filter((test) => test.status === "failed").length;
  const rate = tests.length ? ((passed / tests.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="page-shell tests-page">
      <section className="page-heading compact-heading">
        <div>
          <div className="eyebrow">{tests.length} AUTOMATED TESTS</div>
          <h1>Tests</h1>
          <p><span className="green-text">{passed}</span> / {tests.length} Passing · {rate}% Rate</p>
        </div>
        <div className="tests-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="/ Filter tests..." aria-label="Filter tests" />
        </div>
      </section>

      <div className="filter-row">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>ALL {tests.length}</FilterButton>
        <FilterButton active={filter === "passed"} onClick={() => setFilter("passed")}>{passed} PASS</FilterButton>
        <FilterButton active={filter === "failed"} onClick={() => setFilter("failed")}>{failed} FAIL</FilterButton>
      </div>

      <div className="tests-layout">
        <section className="test-table">
          <div className="table-head"><span>ID</span><span>TEST CASE // SOURCE</span><span>DURATION</span><span>STATUS</span></div>
          {filteredTests.map((test) => (
            <button
              key={test.id}
              className={`test-row ${test.status === "failed" ? "failed" : ""} ${selectedTest === test.id ? "selected" : ""}`}
              onClick={() => setSelectedTest(test.id)}
            >
              <span className="mono-id">{test.id}</span>
              <span className="test-name"><strong>{test.name}</strong><em>{test.suite}</em></span>
              <span className="duration">{test.duration}</span>
              <StatusMark status={test.status} />
            </button>
          ))}
        </section>

        {selectedTest && (
          <TestDrawer
            id={selectedTest}
            tests={tests}
            failures={failures}
            onClose={() => setSelectedTest(null)}
            onRun={onRun}
            onCopy={onCopy}
            running={running}
          />
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`filter-button ${active ? "active" : ""}`} onClick={onClick}>{children}</button>;
}

function TestDrawer({
  id,
  tests,
  failures,
  onClose,
  onRun,
  onCopy,
  running,
}: {
  id: string;
  tests: ApiTest[];
  failures: ApiFailure[];
  onClose: () => void;
  onRun: (id: string) => void;
  onCopy: (failure: ApiFailure) => void;
  running: boolean;
}) {
  const test = tests.find((item) => item.id === id);
  const failure = failures.find((item) => item.id === id);
  if (!test) return null;

  const keywords = failure?.keywords || test.keywords || [];

  return (
    <aside className={`test-drawer ${test.status === "failed" ? "drawer-fail" : ""}`}>
      <div className="drawer-top">
        <span className="drawer-id">{id}</span>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>
      <h2>{test.name}</h2>
      <p>{test.documentation || `Robot Framework test from ${test.suite}.`}</p>

      <div className="drawer-status"><StatusMark status={test.status} /><span>{test.duration}</span></div>

      <div className="detail-label">SOURCE</div>
      <code>{test.sourceFile || test.suite}{test.sourceLine ? `:${test.sourceLine}` : ""}</code>

      {failure ? (
        <>
          <div className="detail-label">EXCEPTION</div>
          <pre>{failure.exception}{"\n"}{failure.message}</pre>
          <div className="detail-label">FAILED KEYWORD</div>
          <code>{failure.keyword || "Not reported"}</code>
          <div className="drawer-actions">
            <button className="button neon" disabled={running} onClick={() => onRun(id)}>▶ RERUN</button>
            <button className="button ghost" onClick={() => onCopy(failure)}>COPY ERROR</button>
          </div>

          {failure.screenshot && (
            <div className="trace screenshot-placeholder">
              <div className="trace-head">FAILURE SCREENSHOT</div>
              <a href={artifactUrl(failure.runId, failure.screenshot)} target="_blank" rel="noreferrer">
                <img src={artifactUrl(failure.runId, failure.screenshot)} alt={`${id} failure screenshot`} style={{ width: "100%", display: "block" }} />
              </a>
            </div>
          )}

          {keywords.length > 0 && <KeywordTrace keywords={keywords} />}
        </>
      ) : (
        <>
          <div className="detail-label">KEYWORDS</div>
          {test.latestRunId ? (
            <KeywordTrace keywords={keywords.length ? keywords : []} fallback={test.name} />
          ) : (
            <pre>{`Open Application\n${test.name}\nVerify expected state`}</pre>
          )}
          <button className="button neon full" disabled={running} onClick={() => onRun(id)}>▶ RERUN TEST</button>
        </>
      )}
    </aside>
  );
}

function KeywordTrace({ keywords, fallback }: { keywords: KeywordTrace[]; fallback?: string }) {
  if (!keywords.length) return <pre>{fallback || "No keyword trace is available yet."}</pre>;

  return (
    <div className="trace">
      <div className="trace-head">ROBOT KEYWORD TRACE <span>LIVE RESULT</span></div>
      <pre>
        {keywords.slice(0, 28).map((keyword, index) => `${"  ".repeat(Math.min(keyword.depth, 4))}${keyword.status === "FAIL" ? "[FAIL] " : "[OK] "}${keyword.name}${keyword.elapsedMs ? `  ${formatMs(keyword.elapsedMs)}` : ""}${index === Math.min(keywords.length, 28) - 1 ? "" : "\n"}`).join("")}
      </pre>
    </div>
  );
}

function FailuresPage({
  summary,
  failures,
  running,
  onRunFailed,
  onRun,
  onCopy,
  selectedTest,
  setSelectedTest,
}: {
  summary: SummaryResponse;
  failures: ApiFailure[];
  running: boolean;
  onRunFailed: () => void;
  onRun: (id: string) => void;
  onCopy: (failure: ApiFailure) => void;
  selectedTest: string | null;
  setSelectedTest: (id: string | null) => void;
}) {
  return (
    <div className="page-shell failures-page">
      <section className="failure-hero">
        <div>
          <div className="eyebrow red-eyebrow">{failures.length ? "TRIAGE REQUIRED" : "NO FAILURES"}</div>
          <h1>Failure Debugger</h1>
          <p>{failures.length ? `${failures.length} failure${failures.length === 1 ? "" : "s"} reported by the latest Robot Framework run.` : "The latest Robot Framework run contains no failed tests."}</p>
        </div>
        <button className="button neon" disabled={running || failures.length === 0} onClick={onRunFailed}>▶ [ RERUN FAILED ({failures.length}) ]</button>
      </section>

      <div className="failure-cards">
        {failures.length === 0 ? (
          <div className="empty-block">Nothing needs triage right now.</div>
        ) : failures.map((failure, index) => (
          <FailureCard
            key={failure.id}
            failure={failure}
            order={index + 1}
            total={failures.length}
            running={running}
            onRun={onRun}
            onCopy={onCopy}
            expanded={selectedTest === failure.id}
            onToggle={() => setSelectedTest(selectedTest === failure.id ? null : failure.id)}
          />
        ))}
      </div>

      <footer className="failure-footer">
        <span><b>SELENATOR</b> · {summary.runner} · {summary.library}</span>
        <span>{summary.latestRun ? `RUN ${summary.latestRun.runId}` : "NO RUN RECORDED"}</span>
      </footer>
    </div>
  );
}

function FailureCard({
  failure,
  order,
  total,
  running,
  onRun,
  onCopy,
  expanded,
  onToggle,
}: {
  failure: ApiFailure;
  order: number;
  total: number;
  running: boolean;
  onRun: (id: string) => void;
  onCopy: (failure: ApiFailure) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`big-failure ${expanded ? "expanded" : ""}`}>
      <div className="failure-card-accent" />
      <div className="big-failure-head">
        <div className="big-failure-title">
          <span className="fail-chip">FAIL [{order}/{total}]</span>
          <h2>{failure.id} — {failure.name}</h2>
        </div>
        <div className="failure-actions">
          <button className="button neon" disabled={running} onClick={() => onRun(failure.id)}>▶ [ RERUN ]</button>
          <button className="button ghost" onClick={() => onCopy(failure)}>[ COPY ERROR ]</button>
          <button className="button ghost" onClick={onToggle}>{expanded ? "[ CLOSE ]" : "[ DETAILS ]"}</button>
        </div>
      </div>

      <div className="failure-exception"><strong>{failure.exception}</strong><span>{failure.keyword || "Robot Framework"}</span></div>
      <p className="failure-summary">{failure.message || failure.exception}</p>

      {expanded && (
        <div className="failure-detail-grid">
          <div className="detail-box"><span>RUN</span><code>{failure.runId}</code></div>
          <div className="detail-box"><span>DURATION</span><code>{failure.duration}</code></div>
          <div className="detail-box"><span>TARGET</span><code>{failure.target || "Not recorded"}</code></div>
          <div className="detail-box danger-box"><span>FAILED KEYWORD</span><code>{failure.keyword || "Not reported"}</code></div>
          <div className="detail-box wide"><span>ERROR</span><pre>{failure.message || failure.exception}</pre></div>
          {failure.screenshot && (
            <div className="detail-box wide screenshot-placeholder">
              <span>FAILURE SCREENSHOT</span>
              <a href={artifactUrl(failure.runId, failure.screenshot)} target="_blank" rel="noreferrer">
                <img src={artifactUrl(failure.runId, failure.screenshot)} alt={`${failure.id} screenshot`} style={{ width: "100%", display: "block" }} />
              </a>
            </div>
          )}
          <div className="detail-box wide">
            <span>ROBOT KEYWORD TRACE</span>
            <KeywordTrace keywords={failure.keywords} />
          </div>
          <div className="detail-box wide">
            <span>REPORT ARTIFACTS</span>
            <div className="artifact-links">
              <a href={apiUrl(`/api/artifacts/${encodeURIComponent(failure.runId)}/log.html`)} target="_blank" rel="noreferrer">OPEN LOG</a>
              <a href={apiUrl(`/api/artifacts/${encodeURIComponent(failure.runId)}/report.html`)} target="_blank" rel="noreferrer">OPEN REPORT</a>
              <a href={apiUrl(`/api/artifacts/${encodeURIComponent(failure.runId)}/output.xml`)} target="_blank" rel="noreferrer">OPEN XML</a>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
