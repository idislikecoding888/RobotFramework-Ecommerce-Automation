# SELENATOR — Quality Assurance, made easy.

Minimal Robot Framework + Selenium automation console frontend.

## What is included

- Next.js App Router frontend
- Three primary screens: Overview, Tests, Failure Debugger
- Black / white / gray UI with blood-red failure atmosphere, neon-green success, and micro neon-pink accents
- Terminal-inspired execution log
- Test search and pass/fail filtering
- Test detail drawer
- Failure inspection panels
- Copy error, rerun test, rerun failed, and run-all interactions
- Mock runner so the UI is usable before the backend is connected

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/overview`.

## Build

```bash
npm run build
npm start
```

## Backend hand-off

The UI deliberately keeps runner behavior inside `lib/runner.ts` so it can be replaced with the real Robot Framework/NestJS API later without redesigning the screens.
