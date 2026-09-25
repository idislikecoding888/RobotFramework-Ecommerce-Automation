import type { TestStatus } from "@/lib/mockData";

export function StatusMark({ status }: { status: TestStatus }) {
  const label = status === "passed" ? "PASS" : status === "failed" ? "FAIL" : status === "running" ? "RUN" : "READY";
  return <span className={`status-mark status-${status}`}>[ {label} ]</span>;
}
