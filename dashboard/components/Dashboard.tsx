"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import TerminalPanel from "./TerminalPanel";

type Status = "idle" | "running" | "passed" | "failed";

type Test = {
  id: string;
  name: string;
  short: string;
  detail: string;
  type: string;
};

const TESTS: Test[] = [
  { id: "TC01", name: "Verify Login", short: "LOGIN", detail: "Valid credentials + session validation", type: "Functional" },
  { id: "TC02", name: "Verify Product Search", short: "SEARCH", detail: "Search box + results verification", type: "Functional" },
  { id: "TC03", name: "Add Product To Cart", short: "CART", detail: "Product selection + cart confirmation", type: "Functional" },
  { id: "TC04", name: "Complete User Journey", short: "JOURNEY", detail: "Login → search → cart → checkout flow", type: "E2E" },
  { id: "TC05", name: "Register New User", short: "REGISTER", detail: "Dynamic data + account lifecycle", type: "Functional" },
  { id: "TC06", name: "Data Driven Product Search", short: "DATA", detail: "Men Tshirt / Blue Top / Sleeveless Dress", type: "Data-Driven" },
];

const INITIAL_STATUS: Record<string, Status> = Object.fromEntries(TESTS.map((test) => [test.id, "idle"]));

export default function Dashboard() {
  const terminalRef = useRef<Terminal | null>(null);
  const [targetUrl, setTargetUrl] = useState("https://automationexercise.com");
  const [selected, setSelected] = useState<string[]>(TESTS.map((test) => test.id));
  const [statuses, setStatuses] = useState<Record<string, Status>>(INITIAL_STATUS);
  const [isRunning, setIsRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);

  const selectedTests = useMemo(() => TESTS.filter((test) => selected.includes(test.id)), [selected]);
  const passed = Object.values(statuses).filter((value) => value === "passed").length;
  const failed = Object.values(statuses).filter((value) => value === "failed").length;
  const running = Object.values(statuses).filter((value) => value === "running").length;

  const write = useCallback((line: string) => {
    terminalRef.current?.writeln(line);
  }, []);

  const runTests = useCallback(async (ids: string[] = selected) => {
    if (isRunning || ids.length === 0) return;

    setStatuses((current) => {
      const next = { ...current };
      ids.forEach((id) => (next[id] = "idle"));
      return next;
    });
    setIsRunning(true);
    setRunStartedAt(new Date().toLocaleTimeString());

    write("\x1b[1;33m› run request accepted\x1b[0m");
    write(`\x1b[90mtarget: ${targetUrl}\x1b[0m`);
    write(`\x1b[90mselected: ${ids.join(", ")}\x1b[0m`);

    try {
      const response = await fetch("/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl, tests: ids }),
      });

      if (!response.ok || !response.body) throw new Error("Runner endpoint unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const chunks = carry.split("\n\n");
        carry = chunks.pop() || "";

        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const event = JSON.parse(dataLine.slice(5).trim()) as { type: string; id?: string; status?: Status; message?: string };

          if (event.type === "log" && event.message) write(event.message);
          if (event.type === "status" && event.id && event.status) {
            setStatuses((current) => ({ ...current, [event.id!]: event.status! }));
          }
          if (event.type === "done") {
            setIsRunning(false);
            write("\x1b[1;32m✓ test run complete\x1b[0m");
          }
        }
      }
    } catch (error) {
      setIsRunning(false);
      write(`\x1b[1;31m✕ runner error: ${error instanceof Error ? error.message : "unknown error"}\x1b[0m`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selected, targetUrl, write]);

  const handleCommand = useCallback((command: string) => {
    const normalized = command.toLowerCase();
    if (normalized === "help") {
      write("\x1b[36mcommands:\x1b[0m run | run all | status | clear | help");
      return;
    }
    if (normalized === "clear") {
      terminalRef.current?.clear();
      return;
    }
    if (normalized === "status") {
      write(`target=${targetUrl} | selected=${selected.length} | passed=${passed} | failed=${failed}`);
      return;
    }
    if (normalized === "run" || normalized === "run selected") {
      void runTests(selected);
      return;
    }
    if (normalized === "run all") {
      void runTests(TESTS.map((test) => test.id));
      return;
    }
    write(`\x1b[31munknown command:\x1b[0m ${command}`);
    write("Type \x1b[36mhelp\x1b[0m for available commands.");
  }, [failed, passed, runTests, selected, targetUrl, write]);

  const toggleTest = (id: string) => {
    if (isRunning) return;
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const selectAll = () => setSelected(TESTS.map((test) => test.id));
  const clearAll = () => setSelected([]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">RFA</div>
          <div>
            <div className="brand-title">AUTOMATION</div>
            <div className="brand-subtitle">CONTROL CENTER</div>
          </div>
        </div>

        <div className="side-label">RUN CONFIG</div>
        <label className="field-label" htmlFor="target">WEBSITE TO TEST</label>
        <input id="target" className="text-input" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} disabled={isRunning} />
        <div className="stack-row">
          <span>ENGINE</span><b>Robot Framework</b>
        </div>
        <div className="stack-row">
          <span>BROWSER</span><b>Chrome</b>
        </div>
        <div className="stack-row">
          <span>LIBRARY</span><b>SeleniumLibrary</b>
        </div>
        <div className="stack-row">
          <span>MODE</span><b>Keyword-driven</b>
        </div>

        <div className="side-spacer" />
        <div className="connection-card">
          <span className="status-dot" />
          <div><strong>BACKEND</strong><span>LOCAL ROBOT RUNNER</span></div>
        </div>
        <div className="side-foot">LOCAL DEMO BUILD · v0.2</div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">PYTHON AUTOMATION CAPSTONE</div>
            <h1>Test Command Center</h1>
          </div>
          <button className="primary-button" disabled={isRunning || selected.length === 0} onClick={() => void runTests()}>
            {isRunning ? <><span className="spinner" /> RUNNING...</> : <>▶ RUN SELECTED</>}
          </button>
        </header>

        <section className="stats-grid">
          <div className="stat-card"><span>TOTAL TESTS</span><strong>{TESTS.length}</strong><small>configured</small></div>
          <div className="stat-card accent"><span>SELECTED</span><strong>{selected.length}</strong><small>in current run</small></div>
          <div className="stat-card"><span>PASS</span><strong>{passed.toString().padStart(2, "0")}</strong><small>completed</small></div>
          <div className="stat-card danger"><span>FAIL</span><strong>{failed.toString().padStart(2, "0")}</strong><small>attention</small></div>
        </section>

        <section className="section-head">
          <div><div className="eyebrow">SUITE SELECTION</div><h2>What do you want to test?</h2></div>
          <div className="selection-actions"><button onClick={selectAll} disabled={isRunning}>SELECT ALL</button><button onClick={clearAll} disabled={isRunning}>CLEAR</button></div>
        </section>

        <section className="test-grid">
          {TESTS.map((test, index) => {
            const active = selected.includes(test.id);
            const status = statuses[test.id];
            return (
              <button key={test.id} className={`test-card ${active ? "selected" : ""}`} onClick={() => toggleTest(test.id)}>
                <div className="test-card-top">
                  <label className={`checkbox ${active ? "checked" : ""}`}>
                    <input type="checkbox" checked={active} onChange={() => toggleTest(test.id)} onClick={(e) => e.stopPropagation()} />
                    <span>{active ? "✓" : ""}</span>
                  </label>
                  <span className="test-number">0{index + 1}</span>
                  <span className={`status-pill ${status}`}>{status === "idle" ? "READY" : status.toUpperCase()}</span>
                </div>
                <div className="test-code">{test.short}</div>
                <h3>{test.name}</h3>
                <p>{test.detail}</p>
                <div className="test-type">{test.type}</div>
              </button>
            );
          })}
        </section>

        <section className="terminal-header">
          <div><div className="eyebrow">LIVE EXECUTION</div><h2>Automation Terminal</h2></div>
          <div className="terminal-meta"><span>{runStartedAt ? `last run ${runStartedAt}` : "no run yet"}</span>{running > 0 && <span className="pulse">● {running} ACTIVE</span>}</div>
        </section>
        <TerminalPanel terminalRef={terminalRef} onCommand={handleCommand} />
        <div className="demo-hint"><strong>Live runner:</strong> RUN SELECTED starts your local Robot Framework process, passes the website URL through <code>BASE_URL</code>, and streams the real console output into this terminal.</div>
      </section>
    </main>
  );
}
