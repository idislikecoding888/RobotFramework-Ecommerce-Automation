"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function SelenatorShell({
  children,
  targetUrl,
  onTargetUrlChange,
  backendOnline,
  onRunAll,
  running,
}: {
  children: ReactNode;
  targetUrl: string;
  onTargetUrlChange: (value: string) => void;
  backendOnline: boolean;
  onRunAll: () => void;
  running: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <Link href="/overview" className="brand" aria-label="Selenator overview">
            <span className="brand-name">SELENATOR</span>
            <span className="brand-tagline">Quality Assurance, made easy.</span>
          </Link>

          <div className="side-label">NAVIGATION</div>

          <nav className="nav-list">
            <NavItem href="/overview" index="01" label="Overview" active={pathname.startsWith("/overview")} />
            <NavItem href="/tests" index="02" label="Tests" active={pathname.startsWith("/tests")} />
            <NavItem href="/failures" index="03" label="Failures" active={pathname.startsWith("/failures")} />
          </nav>
        </div>

        <div className="side-bottom">
          <div className="env-dot">
            <span className={backendOnline ? "" : "offline"} /> {backendOnline ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
          </div>
          <div className="side-stack">Robot Framework · SeleniumLibrary</div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-brand">
            <span className="topbar-brand-name">SELENATOR</span>
            <span className="topbar-divider">/</span>
            <span className="topbar-section">AUTOMATION</span>
          </div>

          <div className="topbar-center">
            <label className="target-site">
              <span className="target-site-label">
                <span className="target-icon">◉</span>
                TARGET WEBSITE
              </span>

              <input
                value={targetUrl}
                onChange={(event) => onTargetUrlChange(event.target.value)}
                aria-label="Target website URL"
                placeholder="Enter website URL..."
                spellCheck={false}
              />

              <span className="target-hint">URL</span>
              <span className="target-help" title="Enter the website URL that Selenator should test.">?</span>
            </label>
          </div>

          <div className="topbar-actions">
            <button type="button" className="run-all" onClick={onRunAll} disabled={running}>
              [ {running ? "RUNNING..." : "RUN ALL"} ]
            </button>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, index, label, active }: { href: string; index: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
      <span><b>[{index}]</b> {label}</span>
    </Link>
  );
}
