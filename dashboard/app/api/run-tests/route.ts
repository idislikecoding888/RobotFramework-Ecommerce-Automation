import { NextRequest } from "next/server";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TestMeta = {
  name: string;
};

type RobotCommand = {
  command: string;
  shell: boolean;
  args?: string[];
};

type PythonCommand = {
  command: string;
  prefix: string[];
  version: string;
};

const TEST_META: Record<string, TestMeta> = {
  TC01: { name: "TC01 - Verify Login" },
  TC02: { name: "TC02 - Verify Product Search" },
  TC03: { name: "TC03 - Verify Product Can Be Added To Cart" },
  TC04: { name: "TC04 - Complete E-Commerce User Journey" },
  TC05: { name: "TC05 - Register New User" },
  TC06: { name: "TC06 - Data Driven Product Search" },
};

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function findTestStatus(line: string, tests: string[]) {
  const statusMatch = line.match(/\|\s*(PASS|FAIL)\s*\|/i);

  if (!statusMatch) {
    return null;
  }

  const status =
    statusMatch[1].toLowerCase() === "pass"
      ? "passed"
      : "failed";

  const testId = tests.find((id) =>
    line.includes(TEST_META[id].name)
  );

  return testId
    ? {
        testId,
        status: status as "passed" | "failed",
      }
    : null;
}

async function locateProjectRoot(start: string) {
  let current = path.resolve(start);

  while (true) {
    const testFile = path.join(current, "tests", "ecommerce_tests.robot");
    const resourcesDir = path.join(current, "resources");

    if (fs.existsSync(testFile) && fs.existsSync(resourcesDir)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

async function getPythonVersion(command: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, ["--version"], { timeout: 5000 });
    return String(stdout).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

async function findPython(projectRoot: string): Promise<PythonCommand> {
  const envPython = process.env.PYTHON_BIN?.trim();
  if (envPython) {
    return {
      command: envPython,
      prefix: ["-m", "robot"],
      version: await getPythonVersion(envPython),
    };
  }

  const venvCandidates = [
    process.env.VIRTUAL_ENV
      ? path.join(process.env.VIRTUAL_ENV, process.platform === "win32" ? "Scripts/python.exe" : "bin/python")
      : null,
    path.join(projectRoot, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
    path.join(projectRoot, "venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return {
        command: candidate,
        prefix: ["-m", "robot"],
        version: await getPythonVersion(candidate),
      };
    }
  }

  const pythonCommands = process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python"];

  for (const candidate of pythonCommands) {
    try {
      const pythonPath = process.platform === "win32" ? await execFileAsync("where.exe", [candidate], { timeout: 5000 }).then(() => candidate) : await execFileAsync("which", [candidate], { timeout: 5000 }).then(() => candidate);
      return {
        command: pythonPath,
        prefix: ["-m", "robot"],
        version: await getPythonVersion(pythonPath),
      };
    } catch {
      // Try next command.
    }
  }

  throw new Error("Python executable was not found. Install Python or set PYTHON_BIN.");
}

async function findRobotExecutable(projectRoot: string): Promise<RobotCommand> {
  if (process.env.ROBOT_BIN?.trim()) {
    return {
      command: process.env.ROBOT_BIN.trim(),
      shell: process.env.ROBOT_BIN.toLowerCase().endsWith(".cmd"),
    };
  }

  if (process.platform === "win32") {
    const candidates = ["robot.exe", "robot.cmd", "robot"];

    for (const candidate of candidates) {
      try {
        await execFileAsync("where.exe", [candidate], { timeout: 5000 });
        return {
          command: candidate,
          shell: candidate.endsWith(".cmd"),
        };
      } catch {
        // Try next candidate.
      }
    }
  } else {
    const candidates = ["robot", "robotframework"];

    for (const candidate of candidates) {
      try {
        await execFileAsync("which", [candidate], { timeout: 5000 });
        return {
          command: candidate,
          shell: false,
        };
      } catch {
        // Try next candidate.
      }
    }
  }

  const python = await findPython(projectRoot);

  return {
    command: python.command,
    shell: false,
    args: [...python.prefix],
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetUrl =
    typeof body?.targetUrl === "string" ? body.targetUrl.trim() : "https://automationexercise.com";
  const requestedTests: string[] = Array.isArray(body?.tests)
    ? body.tests.filter(
        (id: unknown): id is string => typeof id === "string" && id in TEST_META
      )
    : [];
  const tests: string[] = [...new Set(requestedTests)];

  if (!isValidHttpUrl(targetUrl)) {
    return Response.json(
      { error: "Website URL must be a valid http/https URL." },
      { status: 400 }
    );
  }

  if (tests.length === 0) {
    return Response.json(
      { error: "Select at least one test case." },
      { status: 400 }
    );
  }

  const projectRoot = await locateProjectRoot(process.cwd());

  if (!projectRoot) {
    return Response.json(
      {
        error:
          "Could not locate the Robot Framework project. Place dashboard inside the project containing tests/ecommerce_tests.robot.",
      },
      { status: 500 }
    );
  }

  const testsPath = path.join(projectRoot, "tests");
  const resultsPath = path.join(projectRoot, "results");
  fs.mkdirSync(resultsPath, { recursive: true });

  const encoder = new TextEncoder();
  let activeProcess: ReturnType<typeof spawn> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const log = (message: string) => {
        for (const line of String(message).split(/\r?\n/)) {
          if (line.trim()) send({ type: "log", message: line });
        }
      };

      send({ type: "run-start", ids: tests });
      log("\x1b[1;36mRFA // LIVE ROBOT RUNNER\x1b[0m");
      log(`\x1b[90mtarget  = ${targetUrl}\x1b[0m`);
      log(`\x1b[90mproject = ${projectRoot}\x1b[0m`);
      log(`\x1b[90mtests   = ${tests.join(", ")}\x1b[0m`);

      tests.forEach((id) => send({ type: "status", id, status: "running" }));

      let robotCommand: RobotCommand;

      try {
        robotCommand = await findRobotExecutable(projectRoot);
        log(`\x1b[1;32m✓ Robot Framework executable found: ${robotCommand.command}\x1b[0m`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`\x1b[1;31m✕ ${message}\x1b[0m`);

        tests.forEach((id) => {
          send({ type: "status", id, status: "failed" });
        });

        send({ type: "done", exitCode: -1 });

        if (!closed) {
          controller.close();
        }

        return;
      }

      const args = [
        "--outputdir",
        resultsPath,
        "--console",
        "verbose",
        "--consolewidth",
        "120",
        "--loglevel",
        "INFO",
        "-v",
        `BASE_URL:${targetUrl}`,
      ];

      for (const id of tests) {
        args.push("--test", TEST_META[id].name);
      }

      args.push(testsPath);

      const commandDisplay = [
        robotCommand.command,
        ...(robotCommand.args ?? []),
        ...args,
      ].join(" ");

      log(`\x1b[1;33m$ ${commandDisplay}\x1b[0m`);

      await new Promise<void>((resolve) => {
        const completed = new Set<string>();
        const childArgs = [...(robotCommand.args ?? []), ...args];

        activeProcess = spawn(robotCommand.command, childArgs, {
          shell: robotCommand.shell,
          cwd: projectRoot,
          env: process.env,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });

        const handleOutput = (chunk: Buffer) => {
          const text = chunk.toString("utf8");
          log(text);

          for (const line of text.split(/\r?\n/)) {
            const result = findTestStatus(line, tests);
            if (result && !completed.has(result.testId)) {
              completed.add(result.testId);
              send({ type: "status", id: result.testId, status: result.status });
            }
          }
        };

        activeProcess.stdout?.on("data", handleOutput);
        activeProcess.stderr?.on("data", handleOutput);

        activeProcess.on("error", (error) => {
          log(`\x1b[1;31m✕ Failed to launch Robot Framework: ${error.message}\x1b[0m`);
          tests.forEach((id) => {
            if (!completed.has(id)) send({ type: "status", id, status: "failed" });
          });
          send({ type: "done", exitCode: -1 });
          resolve();
        });

        activeProcess.on("close", (code) => {
          const passed = code === 0;
          tests.forEach((id) => {
            if (!completed.has(id)) {
              send({ type: "status", id, status: passed ? "passed" : "failed" });
            }
          });

          log(
            passed
              ? "\x1b[1;32m✓ ROBOT RUN COMPLETE — selected tests passed\x1b[0m"
              : `\x1b[1;31m✕ ROBOT RUN COMPLETE — process exited with code ${code ?? "unknown"}\x1b[0m`
          );

          log(
            `\x1b[90mreports: ${resultsPath}\\report.html | ${resultsPath}\\log.html | ${resultsPath}\\output.xml\x1b[0m`
          );

          send({ type: "done", exitCode: code ?? -1 });
          resolve();
        });
      });

      activeProcess = null;
      if (!closed) controller.close();
    },

    cancel() {
      closed = true;
      if (activeProcess && !activeProcess.killed) {
        activeProcess.kill();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

