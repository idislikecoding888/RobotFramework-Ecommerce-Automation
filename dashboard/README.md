# RFA // Automation Control Center v0.3

Live dashboard for the Robot Framework Ecommerce Automation capstone.

## v0.3 fixes
- Real Robot Framework execution through Python.
- Automatically searches upward for `tests/ecommerce_tests.robot`, so the dashboard does not depend on one fragile working directory.
- Windows Python detection tries `py -3`, then `python`, then `python3`.
- Logs the exact interpreter, Robot version, project root, command, and report location.
- Uses Robot's verbose console output for readable live terminal output.
- Terminal stays mounted while dashboard state changes, so running a test does not wipe/recreate the xterm panel.

## Folder layout
```text
RobotFramework-Ecommerce-Automation/
├── dashboard/
├── tests/
├── resources/
├── results/
├── screenshots/
├── requirements.txt
└── Jenkinsfile
```

## Run
```powershell
cd dashboard
npm install
npm run dev
```
Open `http://localhost:3000`.

Select TC01 first and click `RUN SELECTED`.

The server must be able to import Robot Framework from Python. From the parent project, this should work:
```powershell
python -m robot --version
```
If your working Python is only available through the launcher:
```powershell
py -3 -m robot --version
```

## Troubleshooting
The dashboard terminal now prints one of the following before execution:
- detected Python command + Robot version
- exact project root it found
- exact Robot command being launched
- report paths

If it says it cannot locate the project, make sure `dashboard` is inside the folder containing `tests/ecommerce_tests.robot`.
