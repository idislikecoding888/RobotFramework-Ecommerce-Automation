# Selenator Backend

Node.js orchestration backend that gives the Selenator frontend a real Robot Framework execution API.

## What it does

- Discovers Robot Framework test cases directly from `tests/*.robot`.
- Reads existing `results/output.xml` when no Selenator run has been executed yet.
- Runs the real Robot Framework suite with `python -m robot`.
- Injects the target website dynamically with `-v BASE_URL:<targetUrl>`.
- Keeps browser and credentials server-side.
- Creates a unique result folder for every run under `results/selenator/<run-id>/`.
- Parses `output.xml` to produce real pass/fail counts, duration, timestamps, keyword traces and screenshot artifacts.
- Streams execution logs and status changes using Server-Sent Events.
- Exposes run history and downloadable JSON reports.
- Serves HTML reports, XML and screenshots from the run artifact directory.

## Endpoints

GET `/api/health`

GET `/api/summary`

GET `/api/tests`

GET `/api/tests/:id`

GET `/api/failures`

GET `/api/runs`

GET `/api/runs/latest`

POST `/api/runs`

Body:

```json
{
  "testIds": ["TC01", "TC17"],
  "targetUrl": "https://example.com"
}
```

GET `/api/runs/:runId/events` — SSE stream

GET `/api/runs/:runId`

POST `/api/runs/:runId/retry-failed`

GET `/api/artifacts/:runId/:filename`

GET `/api/runs/export/latest`

## Start

From the `backend` directory:

```powershell
copy .env.example .env
npm run dev
```

Robot Framework must already be installed in the Python environment used by `SELENATOR_PYTHON_COMMAND`.

From the project root:

```powershell
python -m pip install -r requirements.txt
```

The frontend should use:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
```

## Credentials

The backend never returns credentials to the browser. Optional `SELENATOR_VALID_EMAIL` and `SELENATOR_VALID_PASSWORD` variables can override the Robot variables for server-side runs. Keep the values in a local `.env` and never commit it.
