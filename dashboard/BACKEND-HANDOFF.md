# Selenator backend hand-off

The current frontend is mock-driven. Replace `lib/runner.ts` with API calls when the backend is ready.

Suggested contracts:

POST /api/runs
body: { testIds: string[], targetUrl: string }
returns: { runId: string }

GET /api/runs/:runId/events
Server-sent events or WebSocket stream containing:
{ type: "log", message: string }
{ type: "status", testId: string, status: "running" | "passed" | "failed" }
{ type: "done", passed: number, failed: number, durationMs: number }

GET /api/tests
returns the 18 test cases and latest execution state.

GET /api/tests/:testId
returns test metadata, latest result, Robot keyword trace, and artifacts.

GET /api/failures
returns current failed test diagnostics, stack/error information, and screenshot artifact references.

The frontend should never receive or expose account passwords. Environment secrets belong on the server.
