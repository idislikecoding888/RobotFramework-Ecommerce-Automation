import { tests, type TestStatus } from "./mockData";

type Listener = (event: {
  type: "log" | "status" | "done";
  id?: string;
  status?: TestStatus;
  message?: string;
}) => void;

export async function runMockSuite(
  ids: string[],
  listener: Listener,
  targetUrl = ""
) {
  const chosen = tests.filter((test) => ids.includes(test.id));

  listener({
    type: "log",
    message: "> run request accepted",
  });

  listener({
    type: "log",
    message: `> target: ${targetUrl || "(not configured)"}`,
  });

  listener({
    type: "log",
    message: `> executing ${chosen.length} selected test${
      chosen.length === 1 ? "" : "s"
    }`,
  });

  for (const test of chosen) {
    listener({
      type: "status",
      id: test.id,
      status: "running",
    });

    listener({
      type: "log",
      message: `> ${test.id} ${test.name} ...`,
    });

    await wait(280);

    listener({
      type: "status",
      id: test.id,
      status: test.status,
    });

    listener({
      type: "log",
      message:
        test.status === "failed"
          ? `  [FAIL] ${test.id} ${test.name}`
          : `  [PASS] ${test.id} ${test.name}`,
    });
  }

  listener({
    type: "log",
    message: "> run complete",
  });

  listener({
    type: "done",
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}