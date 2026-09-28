import type { TestStatus } from "./mockData";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

export function apiUrl(pathname: string) {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export type KeywordTrace = {
  name: string;
  owner: string;
  status: string;
  elapsedMs: number;
  depth: number;
};

export type ApiTest = {
  id: string;
  name: string;
  fullName: string;
  suite: string;
  sourceFile: string | null;
  sourceLine: number;
  tags: string[];
  documentation: string;
  type: string;
  status: TestStatus;
  durationMs: number;
  duration: string;
  latestRunId: string | null;
  keywords?: KeywordTrace[];
  failure?: {
    exception: string;
    message: string;
    keyword: string;
    owner: string;
  } | null;
  screenshot?: string | null;
};

export type ApiFailure = {
  id: string;
  name: string;
  fullName: string;
  status: "failed";
  runId: string;
  durationMs: number;
  duration: string;
  exception: string;
  message: string;
  keyword: string;
  owner: string;
  screenshot: string | null;
  keywords: KeywordTrace[];
  target: string;
};

export type RunSummary = {
  runId: string;
  status: string;
  targetUrl: string;
  browser: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  durationMs: number;
  duration: string;
  startedAt: string | null;
  finishedAt: string | null;
  suiteName: string;
  generator: string;
  testFile: string;
  source?: string;
  error?: string;
};

export type SummaryResponse = {
  app: string;
  tagline: string;
  targetUrl: string;
  browser: string;
  runner: string;
  library: string;
  testFile: string;
  totalTests: number;
  latestRun: RunSummary | null;
  activeRun: RunSummary | null;
  current: RunSummary | {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    durationMs: number;
    duration: string;
  };
};

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(pathname), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export const getHealth = () => request<{ status: string }>("/api/health");
export const getSummary = () => request<SummaryResponse>("/api/summary");
export const getTests = async () => (await request<{ tests: ApiTest[] }>("/api/tests")).tests;
export const getFailures = async () => (await request<{ failures: ApiFailure[] }>("/api/failures")).failures;
export const getTest = (id: string) => request<ApiTest>(`/api/tests/${encodeURIComponent(id)}`);

export async function startRun(testIds: string[], targetUrl: string) {
  return request<{ runId: string }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({ testIds, targetUrl }),
  });
}

export function streamRun(runId: string, listener: (event: Record<string, unknown>) => void) {
  const source = new EventSource(apiUrl(`/api/runs/${encodeURIComponent(runId)}/events`));
  source.onmessage = (message) => {
    try {
      listener(JSON.parse(message.data) as Record<string, unknown>);
    } catch {
      // Ignore malformed SSE payloads.
    }
  };
  return source;
}

export function artifactUrl(runId: string, filename: string) {
  return apiUrl(`/api/artifacts/${encodeURIComponent(runId)}/${encodeURIComponent(filename)}`);
}

export async function exportLatestRun() {
  const response = await fetch(apiUrl("/api/runs/export/latest"), { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to export latest run (${response.status}).`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "selenator-latest-run.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
