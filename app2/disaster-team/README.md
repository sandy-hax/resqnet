# ResQNet — Team Response Portal (disaster-team)

Responder portal for official **Disaster Management Teams** (NDRF units, Fire & Rescue, Medical
Rapid Response, Cyclone Evacuation Units). Part of the **ResQNet** Disaster Management System —
it pairs with the Citizen portal (5173), the Authority Command Center (5175) and the FastAPI
backend (8000).

Vite + React + TypeScript + Tailwind + Leaflet + TanStack Query + native WebSocket.

## Features

- **Phone + password sign-in** (`POST /api/v1/auth/login`), AUTHORITY-disallowed, `DISASTER_MGMT_TEAM` only.
- **Dashboard** — live list of dispatches from `GET /api/v1/assignments/mine`, auto-refreshing on
  `assignment.offered` / `sos.status_changed` WebSocket events.
- **Assignment detail** — SOS description, requester, live status timeline, navigation map with
  OSRM route (straight-line fallback), and the full state machine:
  `OFFERED → ACCEPT/DECLINE → ON_THE_WAY → ARRIVED → COMPLETED`
  (`PATCH /assignments/{id}/respond` and `PATCH /assignments/{id}/status`).
- **Availability toggle** — `PATCH /team/availability` + geolocation `PATCH /team/location`, so
  the Command Center's ranking always sees your live position/status.
- **Official badge** — team credentials from `GET /team/me`.

## Quick start (local dev, backend at localhost:8000)

```bash
cd disaster-team
npm install
npm run dev        # http://localhost:5174
```

Demo team account: `+919123456789` / `team123` (NDRF Rescue Unit 04) — all four seeded teams share
the password `team123`.

## Configuration

| Env var               | Default                       | Purpose                          |
| --------------------- | ----------------------------- | -------------------------------- |
| `VITE_API_BASE_URL`   | `http://localhost:8000/api/v1`| Axios base URL                   |
| `VITE_WS_URL`         | `ws://localhost:8000/ws`      | WebSocket endpoint               |

Override via `.env.local` or (for Docker) `ARG VITE_*` build args.

## Deployment

Prefer the **root `docker-compose.yml`** (one command for the whole ResQNet stack):

```bash
cd ../..                      # dms/
docker compose up --build -d
```

Or build this app standalone:

```bash
docker build -t resqnet-team .
docker run -d --name resqnet-team --network resqnet-net -p 5174:80 resqnet-team
```

The bundled Nginx serves the SPA and proxies `/api/` and `/ws` to the backend container (`api:8000`),
so no CORS configuration is needed. For a manual deployment, run `npm run build` and host `dist/`
behind any static server with SPA fallback.

## Android APK build (Capacitor)

The same web bundle is wrapped into a native Android app with Capacitor, so one codebase produces
both the web app (5174) and an installable APK.

```bash
# 1. (Optional) point the APK at your backend. In .env.local:
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
npm run build

# 2. Sync the web build into the Android project
npx cap sync android

# 3. Build the APK  (requires JDK 17+ and Android SDK / Android Studio)
npm run apk
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

Notes:
- The `android/` folder and Capacitor deps are excluded from the Docker web image build (see
  `.dockerignore`), so container/web deployment is unaffected.
- The Android manifest enables **cleartext HTTP** and **fine/coarse location** for LAN testing —
  for a public release use HTTPS (`wss://`/`https://`) and remove `usesCleartextTraffic`.
- APK debug builds are unsigned; produce a release with `./gradlew bundleRelease` (AAB) plus a
  signing config, or use Android Studio to generate a signed APK.
