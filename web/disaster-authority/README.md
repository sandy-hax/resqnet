# Raksha Link — Authority Command Center Dashboard

**Brand:** Raksha Link — Command Center · **Role:** `AUTHORITY` (Dispatcher / Coordinator)

A high-density, real-time command & control web application for the central disaster operations
center. It receives live distress (`SOS`) calls from citizen apps over WebSocket, lets an authority
inspector verify legitimacy, rank and dispatch pre-assigned Disaster Management Teams (NDRF units,
Fire & Rescue, Medical Rapid Response, Cyclone Evacuation Units), publish regional awareness /
preparedness campaigns, broadcast alerts to citizen apps, and review operational analytics — all
from a single dark-ops console.

This is the **Authority Dashboard** frontend of the Disaster Management System. It talks to the
`disaster-backend` FastAPI service and `disaster-db` PostgreSQL database described in the frozen
contract.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [System Architecture & Port Mapping](#system-architecture--port-mapping)
3. [Features & Modules](#features--modules)
4. [Project Structure](#project-structure)
5. [Quick Start (Run Locally)](#quick-start-run-locally)
6. [Demo Credentials](#demo-credentials)
7. [How Each Module Works](#how-each-module-works)
8. [Backend API Contract Used](#backend-api-contract-used)
9. [WebSocket Events Consumed](#websocket-events-consumed)
10. [Environment Variables](#environment-variables)
11. [Deployment](#deployment)
    - [Option A — Static build + Nginx (recommended for VPS)](#option-a--static-build--nginx-recommended-for-vps)
    - [Option B — Docker](#option-b--docker)
    - [Option C — Firebase / Vercel / Netlify](#option-c--firebase--vercel--netlify)
    - [Production hardening](#production-hardening)
12. [Troubleshooting](#troubleshooting)

---

## 1. Tech Stack

| Concern            | Technology                                                    |
| ------------------ | ------------------------------------------------------------- |
| Framework          | React 18 + Vite 5 + TypeScript                                |
| Styling            | Tailwind CSS 3 (Inter font, custom command-center palette)    |
| Routing            | React Router v6                                               |
| Data fetching      | Axios + TanStack Query v5                                     |
| Charts & Analytics | Recharts                                                      |
| Maps               | Leaflet (`react-leaflet`) with custom divIcon markers         |
| Real-time          | Native WebSocket client (singleton connection)                |
| Icons              | lucide-react                                                  |
| Dev server port    | **5175**                                                      |

---

## 2. System Architecture & Port Mapping

```
Citizen App            Team App                 Authority Dashboard  (this repo)
(5173)                 (5174)                   (5175)
   |   REST + WS           |  REST + WS              |  REST + WS (AUTHORITY role)
   +----------+------------+-------------------------+
              |
      FastAPI (port 8000)  /api/v1/*
                |
        PostgreSQL 15 (disaster_db, port 5432)
```

| Component             | Technology            | Port / Endpoint                         |
| --------------------- | --------------------- | --------------------------------------- |
| **disaster-authority**| React + Vite + TS     | `http://localhost:5175`                 |
| **disaster-backend**  | FastAPI + WebSockets  | `http://localhost:8000/api/v1`          |
| **WebSocket stream**  | Native WebSocket      | `ws://localhost:8000/ws`                |
| **disaster-db**       | PostgreSQL 15 (Docker)| `localhost:5432` (`disaster_db`)        |

CORS: the backend allows `http://localhost:5175` (plus 5173/5174) out of the box.

---

## 3. Features & Modules

### `/` — Command Overview
- **Live metric cards:** Active SOS Count, High Priority Emergencies, Disaster Management Teams
  On Duty, Published Regional Alerts.
- **Live Incident Map:** color-coded SOS pins (red = HIGH, orange = MEDIUM, gray = LOW), green
  team pins (available) / gray (busy), and teal relief-shelter pins. Click any pin for details.
- **Dynamic Emergency Table:** the full SOS queue that auto-updates on every `sos.created`,
  `sos.status_changed` and `assignment.responded` event.

### `/sos` — SOS Verification & Dispatching Response Teams
- **Legitimacy Inspection:** click any row to open the inspection panel — requester notes, hazard
  description, attached proof photo, precise coordinates and a location mini-map.
- **Status Verification:** mark an emergency `VERIFIED` (choose priority LOW/MEDIUM/HIGH) or
  `REJECTED` as a false alarm.
- **Team Assignment & Dispatch:**
  - Calls `GET /api/v1/teams/nearby?lat=&lng=&skill=` to fetch **top-5 ranked teams** by
    specialization match (skill) + Haversine distance.
  - Authority dispatches the selected team via `POST /api/v1/sos/{id}/assign`, which pushes an
    `assignment.offered` notification straight to the team's app.
- Rich filters: status, priority, emergency type; plus a live "awaiting verification" counter.

### `/content` — Awareness & Preparedness Campaign Management
- **Creation suite** for:
  - *Awareness Campaigns* (`POST /content/awareness`),
  - *Preparedness Programs* with Before / During / After guidelines (`POST /content/preparedness`),
  - *Regional Alert Broadcasts* (`POST /alerts`) with severity and target region.
- Publishing a preparedness program or alert automatically fires a WebSocket push
  (`content.published` / `alert.broadcast`) to citizen apps in the selected neighboring regions,
  inviting them to preparedness programs.
- Tabbed history of everything published (awareness / programs / broadcasts).

### `/teams` — Disaster Management Teams Directory
- All registered units with specialization tags, experience level, operational status
  (available / on assignment), live location, and contact.
- **Active dispatch counts** per team, derived from the live SOS feed.
- Deployment map with team + shelter positions.

### `/reports` — System Reports & Analytics
Recharts-based operational intelligence computed from the live feed:
- Emergency frequency by disaster type (bar),
- SOS volume over the last 14 days (area),
- Average time-to-dispatch by type (horizontal bar),
- Average resolution time by type (horizontal bar),
- Incident status distribution (donut),
- Team resource utilization (donut),
- KPI row: total incidents, avg time-to-dispatch, avg resolution time, team utilization %.

> Analytics are approximated client-side from `created_at` / `updated_at` timestamps of each SOS.

### Mandatory Authentication
A dark, branded login gate (`/login`) that verifies `AUTHORITY` role against
`POST /auth/login`. Sessions persist in `localStorage`; expired/invalid tokens (HTTP 401) bounce
the user back to login automatically.

---

## 4. Project Structure

```
disaster-authority/
├── index.html                     # HTML entry (Inter font, Leaflet CSS)
├── package.json                   # Dependencies & scripts (port 5175)
├── vite.config.ts                 # Vite + React + @ alias
├── tailwind.config.js             # Command-center color tokens
├── tsconfig.json / tsconfig.node.json
└── src/
    ├── main.tsx                   # Entry: QueryClient + Toast + Router
    ├── App.tsx                    # Route table (all pages guarded by RequireAuth)
    ├── index.css                  # Tailwind + marker pulse + scrollbars + animations
    ├── types.ts                   # Shared TypeScript domain types
    ├── lib/
    │   ├── api.ts                 # Axios client + typed endpoint functions
    │   └── format.ts              # Formatters, priority/status style maps, constants
    ├── context/
    │   └── AuthContext.tsx        # AUTHORITY session store + 401 auto-logout
    ├── hooks/
    │   ├── useWebSocket.ts        # Singleton native WS client (auto-reconnect)
    │   └── useLiveSos.ts          # Live SOS feed (WS invalidate + 30s poll)
    ├── components/
    │   ├── Layout.tsx             # Sidebar + Topbar + routed content
    │   ├── Sidebar.tsx            # Dark ops nav (live SOS badge, WS status)
    │   ├── Topbar.tsx             # Page title, Live/Offline pill, user, sign-out
    │   ├── StatCard.tsx           # Metric card (accent colors, delta, LIVE pill)
    │   ├── Badges.tsx             # Priority / status / emergency-type badges
    │   ├── IncidentMap.tsx        # Leaflet live map (SOS + teams + shelters)
    │   ├── LiveSosTable.tsx       # Real-time SOS queue table
    │   ├── SosInspectionModal.tsx # Inspect → verify → rank → dispatch
    │   ├── Modal.tsx / Toast.tsx  # Overlay + toast system
    │   └── Feedback.tsx           # Spinner / loading / error / empty states
    └── pages/
        ├── Login.tsx
        ├── Overview.tsx           # "/"
        ├── SosVerification.tsx    # "/sos"
        ├── ContentManagement.tsx  # "/content"
        ├── TeamsDirectory.tsx     # "/teams"
        └── Reports.tsx            # "/reports"
```

---

## 5. Quick Start (Run Locally)

### Prerequisites
- Node.js **18+** and npm **9+**
- The **backend running** — see
  [`backend/README.md`](../backend/README.md). Quick path:

  ```bash
  cd ../backend
  cp .env.example .env
  docker run -d --name dms-postgres \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=disaster_db \
    -p 5432:5432 -v dms_pgdata:/var/lib/postgresql/data postgres:15
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

### Install & run the dashboard
```bash
cd disaster-authority
npm install
npm run dev
```

Open **http://localhost:5175** and sign in with the authority demo account (below).

### Production build
```bash
npm run build     # type-checks (tsc --noEmit) then bundles into dist/
npm run preview   # serves the production build on :5175
```

---

## 6. Demo Credentials

| Role      | Phone           | Password       |
| --------- | --------------- | -------------- |
| AUTHORITY | `+911234567890` | `authority123` |

These are auto-seeded by the backend on first boot. Only `AUTHORITY` accounts can sign in here.

---

## 7. How Each Module Works

- **Live SOS queue** (`useLiveSos`) — initial load via `GET /api/v1/sos`, then background polling
  every 30s. WebSocket messages (`sos.created`, `sos.status_changed`, `assignment.responded`)
  invalidate the TanStack Query cache instantly, so the table, metrics and map stay in near
  real-time sync without manual refresh.
- **Single WebSocket connection** (`useWebSocket`) — the hook is backed by a module-level
  singleton, so the Sidebar, Layout and every page share one socket to
  `ws://localhost:8000/ws?token=<JWT>` registered under the AUTHORITY role. It auto-reconnects
  every 3s on drops and reconnects when the token changes (login/logout).
- **Verification → Dispatch flow**:
  `SUBMITTED` → **Verify** (sets priority + status `VERIFIED`) or **Reject** (`REJECTED`) →
  **Rank nearby teams** (`/teams/nearby` with the SOS `lat/lng` and `skill=emergency_type`) →
  **Dispatch** (`/sos/{id}/assign`) → status becomes `ASSIGNED` and the team receives
  `assignment.offered`. After that the team drives the state machine (accept → on-the-way →
  arrived → completed) and each transition is streamed back here.
- **Regional broadcasts** — publishing a preparedness program or alert hits the backend, which
  fans out `content.published` / `alert.broadcast` to all connected citizen (`REQUESTER`) apps.

---

## 8. Backend API Contract Used

Base URL: `http://localhost:8000/api/v1` (overridable via `VITE_API_BASE_URL`)

| Method | Endpoint                 | Auth      | Purpose                                |
| ------ | ------------------------ | --------- | -------------------------------------- |
| POST   | `/auth/login`            | –         | AUTHORITY sign-in                      |
| GET    | `/sos`                   | Bearer    | Authority SOS queue (status/priority filters) |
| GET    | `/sos/{id}`              | –         | Single SOS + assigned team summary     |
| PATCH  | `/sos/{id}/verify`       | Bearer    | Verify (`VERIFIED`) / reject (`REJECTED`) + priority |
| POST   | `/sos/{id}/assign`       | Bearer    | Dispatch team → `OFFERED` assignment   |
| GET    | `/teams`                 | Bearer    | All disaster management teams          |
| GET    | `/teams/nearby`          | Bearer    | Top-5 ranked teams by skill + distance |
| GET    | `/content`               | –         | List awareness / program content       |
| POST   | `/content/awareness`     | Bearer    | Publish awareness campaign             |
| POST   | `/content/preparedness`  | Bearer    | Publish program + broadcast to citizens|
| GET    | `/alerts`                | –         | List alerts                            |
| POST   | `/alerts`                | Bearer    | Publish regional alert + broadcast     |
| GET    | `/shelters`              | –         | Relief shelters (for map layers)       |

---

## 9. WebSocket Events Consumed

Endpoint: `ws://localhost:8000/ws?token=<JWT>` — frames are `{"event": "...", "data": {...}}`.

| Event                  | Why the command center cares                            |
| ---------------------- | ------------------------------------------------------- |
| `connection.status`    | Role/connectivity confirmation                          |
| `sos.created`          | New distress call arrives from a citizen app → live queue + map pin |
| `sos.status_changed`   | Verify / assign / team progress transitions             |
| `assignment.responded` | Team accepts/declines an offer                          |

---

## 10. Environment Variables

| Variable             | Default                        | Description                              |
| -------------------- | ------------------------------ | ---------------------------------------- |
| `VITE_API_BASE_URL`  | `http://localhost:8000/api/v1` | Axios base URL for the FastAPI backend   |
| `VITE_WS_URL`        | `ws://localhost:8000/ws`       | WebSocket endpoint                       |

Create a `.env.local` file to override, e.g.:

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
```

---

## 11. Deployment

The app builds to a **static SPA** (`dist/`), so it can be hosted almost anywhere. Because it
communicates with the backend via CORS-enabled REST + WebSocket, the API must be reachable from
the browser and its origin added to the backend's `CORS_ORIGINS`.

### Option A — Static build + Nginx (recommended for VPS)

```bash
# 1. Build locally (or on the server after npm ci)
cd disaster-authority
npm ci
npm run build        # outputs dist/

# 2. Ship dist/ to the server, e.g.
scp -r dist user@server:/var/www/raksha-authority
```

Nginx site config — `/etc/nginx/sites-available/raksha-authority`:

```nginx
server {
    listen 80;
    server_name authority.example.com;

    root /var/www/raksha-authority;
    index index.html;

    # SPA history-mode fallback (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-term asset caching
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/raksha-authority /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Then point the dashboard at the public API (see
[backend/README.md](../backend/README.md) Option C for the WebSocket-aware Nginx proxy on :8000):

```bash
# disaster-authority/.env.local
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
npm run build   # rebuild with production endpoints
```

### Option B — Docker (recommended: whole stack in one command)

The repository ships a root `docker-compose.yml` that builds **all four ResQNet components plus
PostgreSQL** and runs them with a single command:

```bash
cd ../..                          # dms/
docker compose up --build -d      # authority -> http://localhost:5175
```

Each frontend container bundles an `nginx.conf` that serves the built SPA **and proxies `/api/`
and `/ws` to the backend container** (service `api:8000`), so the dashboard uses same-origin URLs
and **no CORS configuration is needed**. See the [root README](../README.md) for the full flow.

To build this app standalone instead:

```bash
# disaster-authority/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_URL=/ws
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_WS_URL=$VITE_WS_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

with a `nginx.conf` that includes the SPA fallback block **and** the `/api/` + `/ws` proxy blocks.
Build & run:

```bash
docker build -t resqnet-authority .
docker run -d --name resqnet-authority --network resqnet-net -p 5175:80 resqnet-authority
# -> http://localhost:5175  (backend container must be reachable as "api" on the network)
```

### Option C — Firebase / Vercel / Netlify

1. `npm run build`
2. Deploy the `dist/` folder:
   - **Vercel:** `vercel deploy dist`
   - **Netlify:** `netlify deploy --dir dist` (publish dir: `dist`)
   - **Firebase:** `firebase deploy --only hosting` (set `public: dist`)
3. Add a SPA redirect rule (`/* → /index.html`) where supported.
4. Ensure the backend's `CORS_ORIGINS` includes your deployed origin.

### Production hardening

- **Set the API URL at build time** via `VITE_API_BASE_URL` / `VITE_WS_URL`; never commit
  `.env.local`.
- **TLS end-to-end:** front the backend with Nginx/Caddy (`wss://` and `https://`) as shown in
  the backend README, and always serve the dashboard over HTTPS.
- **Restrict origins:** keep the backend `CORS_ORIGINS` list to your real domains.
- **Split the bundle:** the current single chunk is fine for a console; if you care about first
  paint, enable code-splitting with `React.lazy` + `route`-level dynamic `import()` (Vite supports
  it out of the box).

---

## 12. Troubleshooting

| Symptom                                        | Likely fix                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Login fails with "Unable to reach the command backend" | Start the FastAPI backend on :8000 (and Postgres). Check `VITE_API_BASE_URL`. |
| 401 right after sign-in                        | Backend JWT secret changed / token expired → sign in again.             |
| Table/map never update live                    | Confirm the WebSocket connects (`Live` pill in the top bar). In the Docker deployment the WS is same-origin via the Nginx proxy, so no CORS issue; in local dev (`npm run dev`) make sure the backend allows `ws://localhost:5175` and the token carries the AUTHORITY role. |
| Blank map tiles                                | The dashboard needs internet access to OpenStreetMap tiles.             |
| No teams on the map                            | Teams only show pins once they have a `current_lat/lng` (set when a team app goes available). |
| "Insufficient permissions" on APIs             | You are signed in with a non-AUTHORITY account — only AUTHORITY is allowed. |
| CORS error in the browser console              | Add the exact dashboard origin to the backend `CORS_ORIGINS` and restart it. |

---

© 2026 Raksha Link — Command Center. Part of the Disaster Management System
(`disaster-db` · `disaster-backend` · `disaster-authority`). All rights reserved.
