const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const backendRoot = path.resolve(__dirname, "..");
const env = {
  ...loadDotEnv(path.join(backendRoot, ".env")),
  ...process.env,
};

const projectRoot = path.resolve(backendRoot, env.SELENATOR_PROJECT_ROOT || "..");
const resultsDir = path.resolve(projectRoot, env.SELENATOR_RESULTS_DIR || "results/selenator");

module.exports = {
  backendRoot,
  projectRoot,
  testsDir: path.join(projectRoot, "tests"),
  rootResultsDir: path.join(projectRoot, "results"),
  resultsDir,
  host: env.SELENATOR_HOST || "127.0.0.1",
  port: Number(env.SELENATOR_PORT || 8787),
  defaultTargetUrl: env.SELENATOR_DEFAULT_TARGET_URL || "",
  browser: env.SELENATOR_BROWSER || "chrome",
  pythonCommand: env.SELENATOR_PYTHON_COMMAND || "python",
  frontendOrigin: env.SELENATOR_FRONTEND_ORIGIN || "http://localhost:3000",
  runTimeoutMs: Number(env.SELENATOR_RUN_TIMEOUT_MS || 1800000),
  validEmail: env.SELENATOR_VALID_EMAIL || "",
  validPassword: env.SELENATOR_VALID_PASSWORD || "",
};
