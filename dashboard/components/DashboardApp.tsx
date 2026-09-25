"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SelenatorShell from "./SelenatorShell";
import { StatusMark } from "./StatusMark";
import {
  DEFAULT_TARGET_URL,
  failureDetails,
  recentRuns,
  terminalLines,
  tests,
  type TestStatus,
} from "@/lib/mockData";
import { runMockSuite } from "@/lib/runner";

type Page = "overview" | "tests" | "failures";

type Props = { initialPage: Page };

export default function DashboardApp({ initialPage }: Props) {
  const [page, setPage] = useState<Page>(initialPage);
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>(() => Object.fromEntries(tests.map((test) => [test.id, test.status])));
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>(terminalLines);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState(DEFAULT_TARGET_URL);
  useEffect(() => {
  const savedTarget = window.localStorage.getItem("selenator.targetUrl");

  if (savedTarget) {
    setTargetUrl(savedTarget);
  }
}, []);

useEffect(() => {
  window.localStorage.setItem("selenator.targetUrl", targetUrl);
}, [targetUrl]);

  const passed = Object.values(statuses).filter((s) => s === "passed").length;
  const failed = Object.values(statuses).filter((s) => s === "failed").length;
  const passRate = Math.round((passed / tests.length) * 1000) / 10;

  const filteredTests = useMemo(() => tests.filter((test) => {
    const q = query.trim().toLowerCase();
    const matchesQ = !q || `${test.id} ${test.name} ${test.suite}`.toLowerCase().includes(q);
    const current = statuses[test.id] ?? test.status;
    const matchesF = filter === "all" || current === filter;
    return matchesQ && matchesF;
  }), [query, filter, statuses]);

  async function run(ids = tests.map((t) => t.id)) {
  if (running || ids.length === 0) return;

  setRunning(true);

  setLog([
    "> dispatching Robot Framework runner...",
    `> target · ${targetUrl || "(not configured)"}`,
    "> staging · Chrome 124",
    "> initializing...",
  ]);

  await runMockSuite(
    ids,
    (event) => {
      if (event.type === "log" && event.message) setLog((current) => [...current.slice(-30), event.message!]);
      if (event.type === "status" && event.id && event.status) setStatuses((current) => ({ ...current, [event.id!]: event.status! }));
            if (event.type === "done") {
        setToast("Run finished. Results updated.");
      }
    },
    targetUrl
  );

  setRunning(false);
}

  function copyError(id: "TC05" | "TC17") {
    const detail = failureDetails[id];
    void navigator.clipboard?.writeText(`${detail.exception}: ${detail.short}\nTarget: ${detail.target}\nExpected: ${detail.expected}\nActual: ${detail.actual}`);
    setToast(`${id} error copied`);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
  <SelenatorShell
    targetUrl={targetUrl}
    onTargetUrlChange={setTargetUrl}
  >
      {page === "overview" && (
        <OverviewPage passed={passed} failed={failed} passRate={passRate} running={running} log={log} onRun={() => void run()} onRunFailed={() => void run(tests.filter((t) => statuses[t.id] === "failed").map((t) => t.id))} onInspect={(id) => { setSelectedTest(id); setPage("failures"); }} />
      )}
      {page === "tests" && (
        <TestsPage
          statuses={statuses}
          running={running}
          filteredTests={filteredTests}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          onRun={(id) => void run([id])}
          onInspect={(id) => setSelectedTest(id)}
          selectedTest={selectedTest}
          setSelectedTest={setSelectedTest}
          onCopy={copyError}
        />
      )}
      {page === "failures" && (
        <FailuresPage running={running} onRunFailed={() => void run(tests.filter((t) => statuses[t.id] === "failed").map((t) => t.id))} onRun={(id) => void run([id])} onCopy={copyError} selectedTest={selectedTest} setSelectedTest={setSelectedTest} />
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

function OverviewPage({ passed, failed, passRate, running, log, onRun, onRunFailed, onInspect }: { passed: number; failed: number; passRate: number; running: boolean; log: string[]; onRun: () => void; onRunFailed: () => void; onInspect: (id: "TC05" | "TC17") => void }) {
  const failing = tests.filter((test) => test.status === "failed") as Array<typeof tests[number] & { id: "TC05" | "TC17" }>;
  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <div className="eyebrow">SUITE: CHECKOUT_V2 <span>/</span> <em>#184519</em></div>
          <h1>Execution Overview</h1>
          <p>Robot Framework · e-commerce regression suite · Chrome 124 · SeleniumLibrary</p>
        </div>
        <div className="heading-actions">
          <button className="button ghost" onClick={onRunFailed} disabled={running || failed === 0}>[ RE-RUN FAILED ]</button>
          <button className="button neon" onClick={onRun} disabled={running}>[ {running ? "RUNNING..." : "RUN ALL TESTS"} ]</button>
        </div>
      </section>

      <section className="summary-band">
        <div className="summary-item"><span className="signal green" /> <small>PASSED</small><strong>{String(passed).padStart(2, "0")}</strong><b>/ 18 TESTS</b></div>
        <div className="summary-item failure"><span className="signal red" /> <small>FAILED</small><strong>{String(failed).padStart(2, "0")}</strong><b>CRITICAL FAILURES</b></div>
        <div className="summary-item"><span className="signal gray" /> <small>TOTAL EXECUTION</small><strong>{passRate}%</strong><b>PASS RATE · 42.8s</b></div>
      </section>

      <div className="pass-bar" aria-label={`${passRate}% pass rate`}><span style={{ width: `${passRate}%` }} /></div>
      <div className="bar-caption"><span>{passRate}% NOMINAL</span><span>{(100 - passRate).toFixed(1)}% DRIFT</span></div>

      <section className="section-block">
        <div className="section-title"><h2>Failures</h2><span className="red-label">2 CRITICAL</span><span className="section-note">REQUIRES TRIAGE</span></div>
        <div className="failure-list">
          {failing.map((test) => {
            const d = failureDetails[test.id];
            return (
              <article key={test.id} className="failure-row">
                <div className="failure-copy"><div className="failure-row-title"><span className="failure-id">{test.id}</span><h3>{test.name}</h3><span className="mono-soft">{test.type}</span></div><p>{d.short}</p><code>{d.exception}: {d.short}</code></div>
                <button className="inspect-button" onClick={() => onInspect(test.id as "TC05" | "TC17")}>[ INSPECT → ]</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="terminal-panel">
        <div className="terminal-head"><span><i className="terminal-led" /> CONSOLE LOG <b>· STDOUT</b></span><span>LOG: ./results/log.html</span></div>
        <div className="terminal-body">
          {log.map((line, index) => <div key={`${line}-${index}`} className={line.includes("FAIL") ? "term-line fail" : line.includes("PASS") || line.includes("OK") ? "term-line pass" : "term-line"}><span className="line-no">{String(index + 1).padStart(2, "0")}</span><span>{line}</span></div>)}
          <span className="caret">▋</span>
        </div>
      </section>

      <section className="run-footer"><div><span className="green-text">●</span> STAGING · Robot Framework · SeleniumLibrary</div><div>RUN #184519 · 16 PASSED · 2 FAILED</div></section>
    </div>
  );
}

function TestsPage({ statuses, running, filteredTests, query, setQuery, filter, setFilter, onRun, onInspect, selectedTest, setSelectedTest, onCopy }: {
  statuses: Record<string, TestStatus>; running: boolean; filteredTests: typeof tests; query: string; setQuery: (v: string) => void; filter: "all" | "passed" | "failed"; setFilter: (v: "all" | "passed" | "failed") => void; onRun: (id: string) => void; onInspect: (id: string) => void; selectedTest: string | null; setSelectedTest: (id: string | null) => void; onCopy: (id: "TC05" | "TC17") => void;
}) {
  return (
    <div className="page-shell tests-page">
      <section className="page-heading compact-heading">
        <div><div className="eyebrow">18 AUTOMATED TESTS</div><h1>Tests</h1><p><span className="green-text">{Object.values(statuses).filter((s) => s === "passed").length}</span> / 18 Passing · {Math.round((Object.values(statuses).filter((s) => s === "passed").length / 18) * 1000) / 10}% Rate</p></div>
        <div className="tests-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="/ Filter tests..." aria-label="Filter tests" /><button className="button ghost">EXPORT</button></div>
      </section>
      <div className="filter-row"><FilterButton active={filter === "all"} onClick={() => setFilter("all")}>ALL 18</FilterButton><FilterButton active={filter === "passed"} onClick={() => setFilter("passed")}>16 PASS</FilterButton><FilterButton active={filter === "failed"} onClick={() => setFilter("failed")}>2 FAIL</FilterButton></div>

      <div className="tests-layout">
        <section className="test-table">
          <div className="table-head"><span>ID</span><span>TEST CASE // SUITE</span><span>DURATION</span><span>STATUS</span></div>
          {filteredTests.map((test) => <button key={test.id} className={`test-row ${statuses[test.id] === "failed" ? "failed" : ""} ${selectedTest === test.id ? "selected" : ""}`} onClick={() => setSelectedTest(test.id)}>
            <span className="mono-id">{test.id}</span><span className="test-name"><strong>{test.name}</strong><em>{test.suite}</em></span><span className="duration">{test.duration}</span><StatusMark status={statuses[test.id]} />
          </button>)}
        </section>

        {selectedTest && <TestDrawer id={selectedTest} status={statuses[selectedTest]} onClose={() => setSelectedTest(null)} onRun={onRun} onCopy={onCopy} running={running} />}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={`filter-button ${active ? "active" : ""}`} onClick={onClick}>{children}</button>; }

function TestDrawer({ id, status, onClose, onRun, onCopy, running }: { id: string; status: TestStatus; onClose: () => void; onRun: (id: string) => void; onCopy: (id: "TC05" | "TC17") => void; running: boolean }) {
  const test = tests.find((t) => t.id === id)!;
  const isFailure = id === "TC05" || id === "TC17";
  const d = isFailure ? failureDetails[id as "TC05" | "TC17"] : null;
  return <aside className={`test-drawer ${status === "failed" ? "drawer-fail" : ""}`}>
    <div className="drawer-top"><span className="drawer-id">{id}</span><button onClick={onClose} aria-label="Close">×</button></div>
    <h2>{test.name}</h2><p>{test.description}</p>
    <div className="drawer-status"><StatusMark status={status} /><span>{test.duration}</span></div>
    {d ? <><div className="detail-label">EXCEPTION</div><pre>{d.exception}{"\n"}{d.short}</pre><div className="detail-label">TARGET</div><code>{d.target}</code><div className="drawer-actions"><button className="button neon" disabled={running} onClick={() => onRun(id)}>▶ RERUN</button><button className="button ghost" onClick={() => onCopy(id as "TC05" | "TC17")}>COPY ERROR</button></div><div className="trace"><div className="trace-head">TRACE LOG <span>ROBOT V7</span></div><pre>{d.code}</pre></div></> : <><div className="detail-label">KEYWORDS</div><pre>{`Open Application\n${test.name}\nVerify expected state`}</pre><button className="button neon full" disabled={running} onClick={() => onRun(id)}>▶ RERUN TEST</button></>}
  </aside>;
}

function FailuresPage({ running, onRunFailed, onRun, onCopy, selectedTest, setSelectedTest }: { running: boolean; onRunFailed: () => void; onRun: (id: string) => void; onCopy: (id: "TC05" | "TC17") => void; selectedTest: string | null; setSelectedTest: (id: string | null) => void }) {
  const ids: Array<"TC17" | "TC05"> = ["TC17", "TC05"];
  return <div className="page-shell failures-page">
    <section className="failure-hero"><div><div className="eyebrow red-eyebrow">TRIAGE REQUIRED ·· RUN #184519</div><h1>Failure Debugger</h1><p>2 unresolved failures requiring engineering attention.</p></div><button className="button neon" disabled={running} onClick={onRunFailed}>▶ [ RERUN ALL FAILED (2) ]</button></section>
    <div className="failure-cards">
      {ids.map((id, index) => <FailureCard key={id} id={id} order={index + 1} running={running} onRun={onRun} onCopy={onCopy} expanded={selectedTest === id} onToggle={() => setSelectedTest(selectedTest === id ? null : id)} />)}
    </div>
    <footer className="failure-footer"><span><b>SELENATOR</b> · STAGING · 2 FAILURES PENDING RESOLUTION</span><span>EXECUTION ID: run-184519 · <strong>LOGS SYNCED</strong></span></footer>
  </div>;
}

function FailureCard({ id, order, running, onRun, onCopy, expanded, onToggle }: { id: "TC17" | "TC05"; order: number; running: boolean; onRun: (id: string) => void; onCopy: (id: "TC05" | "TC17") => void; expanded: boolean; onToggle: () => void }) {
  const d = failureDetails[id];
  return <article className={`big-failure ${expanded ? "expanded" : ""}`}>
    <div className="failure-card-accent" />
    <div className="big-failure-head"><div className="big-failure-title"><span className="fail-chip">FAIL [{order}/2]</span><h2>{id} — {d.title}</h2></div><div className="failure-actions"><button className="button neon" disabled={running} onClick={() => onRun(id)}>▶ [ RERUN ]</button><button className="button ghost" onClick={() => onCopy(id)}>[ COPY ERROR ]</button><button className="button ghost" onClick={onToggle}>{expanded ? "[ CLOSE ]" : "[ DETAILS ]"}</button></div></div>
    <div className="failure-exception"><strong>{d.exception}</strong><span>at SeleniumLibrary.{d.keyword}</span></div>
    <p className="failure-summary">{d.short}</p>
    {expanded && <div className="failure-detail-grid">
      <div className="detail-box"><span>EXPECTED</span><code>{d.expected}</code></div>
      <div className="detail-box danger-box"><span>ACTUAL</span><code>{d.actual}</code></div>
      <div className="detail-box wide"><span>TARGET</span><code>{d.target}</code></div>
      <div className="detail-box wide"><span>SUGGESTED FIX</span><code>{d.fix}</code></div>
      <div className="detail-box wide"><span>ROBOT KEYWORD</span><pre>{d.code}</pre></div>
      <div className="detail-box wide screenshot-placeholder"><span>SCREENSHOT</span><div className="fake-shot"><div className="shot-bar">SELENATOR / FAILURE CAPTURE</div><div className="shot-body"><b>{id}</b><strong>{d.exception}</strong><span>{d.screenshot}</span></div></div></div>
    </div>}
  </article>;
}
