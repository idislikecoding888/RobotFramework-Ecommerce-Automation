import { startRun, streamRun } from "./api";
import type { TestStatus } from "./mockData";

export type RunnerEvent = {
  type: "log" | "status" | "done";
  testId?: string;
  status?: TestStatus;
  message?: string;
  summary?: Record<string, unknown>;
};

export async function runSuite(
  ids: string[],
  targetUrl: string,
  listener: (event: RunnerEvent) => void,
) {
  const { runId } = await startRun(ids, targetUrl);

  return new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const source = streamRun(runId, (event) => {
      const normalized: RunnerEvent = {
        type: event.type as RunnerEvent["type"],
        testId: typeof event.testId === "string" ? event.testId : undefined,
        status: typeof event.status === "string" ? event.status as TestStatus : undefined,
        message: typeof event.message === "string" ? event.message : undefined,
        summary: typeof event.summary === "object" && event.summary ? event.summary as Record<string, unknown> : undefined,
      };

      listener(normalized);

      if (normalized.type === "done") {
        source.close();
        resolve(normalized.summary || null);
      }
    });

    source.onerror = () => {
      source.close();
      reject(new Error("Lost connection to the Selenator execution stream."));
    };
  });
}
