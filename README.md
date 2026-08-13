# ResQNet — Disaster Management System

**ResQNet** is an end-to-end emergency response platform connecting **citizens**, official
**Disaster Management Teams**, and a central **Authority Command Center** in real time. Distress
calls flow instantly over WebSocket from citizen phones into the Command Center, where dispatchers
verify legitimacy, rank nearby responder teams and dispatch them — while preparedness campaigns and
regional alerts are broadcast back to citizen apps.

This repository is the entire platform: a monorepo of four components, a single-command Docker
deployment for the whole stack, and Android APK builds for the two mobile-facing apps.

---

## 1. What's in here

| # | Folder                    | Component                        | Audience                       | Web port |
|---|---------------------------|----------------------------------|--------------------------------|----------|
| 1 | `app1/`                   | **Citizen Emergency Portal**     | Citizens (SOS, tracker, shelters) | **5173** |
| 2 | `app2/disaster-team/`     | **Team Response Portal**         | NDRF / Fire / Medical / Cyclone units | **5174** |
| 3 | `web/disaster-authority/` | **Raksha Link — Command Center** | Authority dispatchers          | **5175** |
| 4 | `backend/`                | **disaster-backend (FastAPI + WS)** | REST API, WebSocket bus, ranking, routing | **8000** |
| — | *(Docker)* `disaster-db`  | PostgreSQL 15                    | Data store                     | **5432** |
| — | `app1/android/` · `app2/disaster-team/android/` | **Android APK builds (Capacitor)** | Installable native apps | — |

```
Citizen (5173)    Team (5174)     Authority (5175)       Android APKs
     \                |                 /               (capacitor wrap)
       REST + WS      |        REST + WS
          \           |            /
           FastAPI (8000)  /api/v1 · ws://…/ws
                       |
              PostgreSQL 15 (disaster_db)
```

Each component has its own README with deeper docs. The backend exposes interactive API docs at
`http://localhost:8000/docs`.

---

## 2. The end-to-end flow

1. **Citizen** submits an SOS from `app1` (guest or logged in, with photo + GPS). Backend stores it
   and pushes `sos.created` over WebSocket — the Authority map/table update instantly.
2. **Authority** inspects the incident (notes, photo, coordinates), marks it `VERIFIED`/`REJECTED`
   with a priority, then ranks nearby teams via `GET /teams/nearby?lat&lng&skill`
   (specialization match + Haversine distance) and dispatches one.
3. Backend pushes `assignment.offered` to the **team app**. The unit **accepts/declines**, then
   drives the state machine `ON_THE_WAY → ARRIVED → COMPLETED`.
4. Every transition syncs the SOS (`RESPONDER_ON_WAY → ASSISTANCE_PROVIDED → RESOLVED`) and
   broadcasts `sos.status_changed` to **all** apps at once (citizen tracker, team portal, authority
   queue).
5. **Authority** can publish awareness campaigns, preparedness programs and regional alerts, which
   fan out (`content.published` / `alert.broadcast`) to citizen apps, and review full analytics on
   `/reports`.
6. **Live responder tracking** — while a team is marked **On Duty**, the team app sends its GPS to
   `PATCH /team/location` immediately and then every 5 minutes. The backend stamps
   `location_updated_at` and broadcasts `team.location_updated` to the Authority dashboard, so the
   map pins, dispatch distances and team directory stay current without a page refresh.

---

## 3. Demo credentials (auto-seeded by the backend)

| Role                | Phone            | Password       |
|---------------------|------------------|----------------|
| AUTHORITY           | `+911234567890`  | `authority123` |
| DISASTER_MGMT_TEAM  | `+919123456789`  | `team123`      | NDRF Rescue Unit 04 |
| DISASTER_MGMT_TEAM  | `+919100000012`  | `team123`      | Fire & Rescue Squad 12 |
| DISASTER_MGMT_TEAM  | `+919100000013`  | `team123`      | Medical Rapid Response |
| DISASTER_MGMT_TEAM  | `+919100000014`  | `team123`      | Cyclone Shelter Evacuation |
| REQUESTER           | `+919876543210`  | `citizen123`   | Citizen (Rahul Sharma) |

---

## 4. Deploy everything (Docker Compose — one command)

The root `docker-compose.yml` builds and runs **all four components + PostgreSQL together**. Each
web app is served by its own Nginx that **proxies `/api/` and `/ws` to the backend container**, so
the web apps use same-origin URLs and **no CORS configuration is required**.

```bash
cd dms/
docker compose up --build -d
```

| Service   | URL                        | Notes                              |
|-----------|----------------------------|------------------------------------|
| Citizen   | http://localhost:5173      | nginx SPA + `/api` & `/ws` proxy   |
| Team      | http://localhost:5174      | nginx SPA + `/api` & `/ws` proxy   |
| Authority | http://localhost:5175      | nginx SPA + `/api` & `/ws` proxy   |
| Backend   | http://localhost:8000/docs | FastAPI + WebSocket                 |
| Database  | localhost:5432 (`disaster_db`) | PostgreSQL 15 (volume `pgdata`) |

Useful commands:

```bash
docker compose ps
docker compose logs -f api
docker compose down        # stop (keeps DB data)
docker compose down -v     # stop + wipe DB data
```

> **Note:** the FastAPI WebSocket bus is in-memory, so the API container runs with a single worker
> (as configured). Healthcheck waits for Postgres before starting the API, and tables + demo data
> are seeded automatically on first boot.

---

## 5. Deploy without Docker Compose (manual / local dev)

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Postgres (if not already running): docker run -d --name dms-postgres \
#   -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=disaster_db \
#   -p 5432:5432 -v dms_pgdata:/var/lib/postgresql/data postgres:15

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Web apps (three terminals)

```bash
cd app1                && npm install && npm run dev   # http://localhost:5173
cd app2/disaster-team  && npm install && npm run dev   # http://localhost:5174
cd web/disaster-authority && npm install && npm run dev  # http://localhost:5175
```

API URL / WebSocket URL are read from build-time env vars:

| Env var             | Default                       | Purpose                  |
|---------------------|-------------------------------|--------------------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | REST base URL           |
| `VITE_WS_URL`       | `ws://localhost:8000/ws`       | WebSocket endpoint      |

---

## 6. Build Android APKs (Capacitor)

Both mobile apps are Capacitor-wrapped web apps, so **one codebase produces both the web app and an
installable APK**. (Verified: both `app-debug.apk`s compile on this machine.)

### Citizen → `app1`

```bash
cd app1
echo "VITE_API_BASE_URL=http://<backend-host>:8000/api/v1"  >> .env.local
echo "VITE_WS_URL=ws://<backend-host>:8000/ws"              >> .env.local
npm run cap:sync     # build web + copy into android/
npm run apk          # ./gradlew assembleDebug
# -> app1/android/app/build/outputs/apk/debug/app-debug.apk  (appId com.resqnet.citizen)
```

### Team → `app2/disaster-team`

```bash
cd app2/disaster-team
echo "VITE_API_BASE_URL=http://<backend-host>:8000/api/v1"  >> .env.local
echo "VITE_WS_URL=ws://<backend-host>:8000/ws"              >> .env.local
npm run cap:sync
npm run apk
# -> app2/disaster-team/android/app/build/outputs/apk/debug/app-debug.apk  (appId com.resqnet.team)
```

Requirements: **JDK 17+** and the **Android SDK / Android Studio**. The manifest already enables
**fine/coarse location** (for SOS GPS) and **cleartext HTTP** so a phone can reach your dev backend
on the LAN. For install on a phone, `<backend-host>` is your PC's LAN IP (emulator: `10.0.2.2`).

> The `android/` folders, `node_modules/` and `dist/` are excluded from the Docker image build
> contexts (`.dockerignore`), so the web/container deployment is unaffected by APK work.

---

## 7. Deploy to the cloud (Vercel + Railway + Supabase)

Recommended production split for this app:

| Piece            | Host      | Why                                                                 |
| ---------------- | --------- | ------------------------------------------------------------------- |
| Citizen / Team / Authority web apps | **Vercel** | Static Vite builds, free, fast CDN, SPA rewrites handled by `vercel.json`. |
| Backend (REST **and** WebSockets)    | **Railway** | Persistent single process — required because REST handlers broadcast to sockets through an **in-memory** `ws_manager`. If you split "sockets on Railway / REST on Vercel" they become two processes and live updates break. |
| Database          | **Supabase** | Managed Postgres 15, free tier, TLS, dashboard + SQL editor.        |

> **Why not Vercel for the backend?** Vercel's Python functions are serverless: short-lived, no
> in-memory state across instances, 10s (free) execution limit. Your FastAPI app needs a long-lived
> WebSocket server + in-process broadcast manager, so it belongs on a persistent host. Keep Vercel
> for the three frontends only.

### Step 1 — Supabase database

1. Create a project at https://supabase.com → New project (region nearest you).
2. **Schema** (optional — the backend auto-creates tables on first boot anyway):
   Dashboard → **SQL Editor** → New query → paste `backend/supabase_schema.sql` → **Run**. Or skip
   and let the backend's `Base.metadata.create_all()` create it automatically.
3. Copy your connection string: **Project Settings → Database → Connection string → URI**. It looks
   like:
   ```
   postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   Use the **pooler** (port 6543) for Railway.

### Step 2 — Backend on Railway

1. Push the repo (or just `dms/backend`) to GitHub.
2. https://railway.app → **New Project → Deploy from GitHub repo** → pick the repo (set **Root
   Directory** to `backend`). Railway builds the included `Dockerfile`.
3. Add the environment variables (**Variables** tab):
   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Your Supabase string with `postgresql+asyncpg://` + `&ssl=require`, e.g. `postgresql+asyncpg://postgres.YOURREF:YOURPASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&ssl=require` |
   | `JWT_SECRET` | `openssl rand -hex 32` output |
   | `CORS_ORIGINS` | The three Vercel URLs you'll create in Step 3, comma-separated, e.g. `https://resqnet-citizen.vercel.app,https://resqnet-team.vercel.app,https://resqnet-authority.vercel.app` |
   | `DB_SSL` | `true` |
4. Railway assigns a public domain like `backend-production-xxxx.up.railway.app`. Note it down:
   - REST base URL: `https://<railway-host>/api/v1`
   - WebSocket URL: `wss://<railway-host>/ws`
   > The Dockerfile serves on `$PORT` (Railway sets it) — no port config needed.
5. First boot seeds the demo accounts (authority / teams / citizen). Verify:
   `curl https://<railway-host>/health` → `{"status":"ok",...}`.

### Step 3 — Frontends on Vercel

Each of the three apps is an independent Vercel project (separate root dirs). For each:

1. **Vercel Dashboard → Add New → Project** → import the same GitHub repo.
2. In **Root Directory**, point to the app's folder:
   - Citizen app → `app1`
   - Team app → `app2/disaster-team`
   - Authority dashboard → `web/disaster-authority`
3. Set **Environment Variables** (both "Production" and "Preview"): these are baked in at build time.
   | Variable | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://<railway-host>/api/v1` |
   | `VITE_WS_URL` | `wss://<railway-host>/ws` |
4. Framework preset is auto-detected (Vite). Build command/output already correct (`dist`). The
   `vercel.json` in each app folder adds the SPA rewrite so deep routes (e.g. `/sos`) work on refresh.
5. Deploy. You now have three public URLs (e.g. `https://resqnet-citizen.vercel.app`, etc.).

### Step 4 — How the apps connect to the database

The **browser apps never talk to Postgres directly.** They only ever talk to the backend over
`https` (REST) and `wss` (WebSocket). The **backend** owns the database connection:

```
Vercel apps ──https /api/v1──▶ Railway (FastAPI) ──DATABASE_URL──▶ Supabase Postgres
               └──wss /ws──────┘
```

- The only thing each Vercel app needs to reach the DB is the backend URL, supplied by
  `VITE_API_BASE_URL` / `VITE_WS_URL` (set in Step 3).
- The only thing the backend needs is `DATABASE_URL` (set in Step 2).
- To inspect the data: Supabase Dashboard → **Table Editor** (users, sos_requests, assignments, …),
  or **SQL Editor** (`select * from sos_requests order by created_at desc;`).

### Step 5 — Create teams on the web (exact steps)

Teams are created from the **Authority dashboard** (not the team app). While signed in as the
authority account:

1. Open the authority app (e.g. `https://resqnet-authority.vercel.app`).
2. Log in with the authority demo account: `+911234567890` / `authority123`.
3. In the left sidebar click **Teams** (the team directory page).
4. Click the **+ Add team** button (top of the page).
5. Fill the form:
   - **Team name** — e.g. `Urban Flood Rescue Unit 09`.
   - **Login phone** — a unique phone number that the team will use to sign in, e.g. `+919111111119`.
   - **Login password** — pick one and share it with the unit (shown once in the success toast).
   - **Contact phone** — optional alternate number.
   - **Experience level** — `ADVANCED` / `INTERMEDIATE` / `BASIC`.
   - **Specializations** — tap the chips that apply (used to rank the team for dispatch, e.g.
     `SEARCH_RESCUE`, `FIRE`, `FLOOD`).
   - **Initial lat / lng** — optional base coordinates for ranking distance.
6. Click **Register team**. A toast confirms success and shows the badge (auto-generated, e.g.
   `NDRF-0005`) plus the login phone + password. The new row appears in the directory immediately.
7. The new team signs in on the team app with that phone + password.

> The badge is auto-numbered from the team count (`NDRF-<count+1:04d>`). Duplicate login phones are
> rejected with a 409. Only the authority role can register teams.

### Step 6 — Android APKs against the cloud

For the Capacitor apps to hit the cloud backend, set the env vars before `npm run apk`:

```bash
cd app1 && VITE_API_BASE_URL=https://<railway-host>/api/v1 VITE_WS_URL=wss://<railway-host>/ws npm run apk
cd app2/disaster-team && VITE_API_BASE_URL=https://<railway-host>/api/v1 VITE_WS_URL=wss://<railway-host>/ws npm run apk
```

(HTTPS is used, so the debug `usesCleartextTraffic` flag is harmless — remove it for release.)

---

## 8. What to do next

1. **Run the whole stack** — `docker compose up --build -d` on a machine with the Docker Compose
   plugin (see note below) and click through the loop:
   Citizen 5173 → submit SOS → Authority 5175 → verify + assign → Team 5174 → accept →
   on-the-way → arrived → completed → check the live status everywhere.
2. **Install the APKs** — plug a phone (or start the Android emulator), `npm run cap:sync && npm
   run apk` with your LAN backend URL, then throw the `app-debug.apk` onto the device. Watch the
   same citizen → authority → team loop on the phones.
3. **Point the APK at production-grade endpoints** — replace the `http://`/`ws://` dev URLs with
   `https://`/`wss://` for real use.
4. **Harden for production** before sharing beyond a demo:
   - Set a strong `JWT_SECRET` (`openssl rand -hex 32`).
   - Terminate TLS in front of the API (Nginx/Caddy) so both REST (`https`) and WebSocket (`wss`)
     are encrypted; remove `usesCleartextTraffic` from the manifests.
   - Sign APKs: `./gradlew bundleRelease` (AAB) with a signing config, or export a signed APK from
     Android Studio.
   - Finish the UI/UX polish the apps note as in-progress (e.g. the citizen app's client-side
     "demo simulator", ETA displays), then do a full regression pass of the E2E flow.

## 9. Where data lives & how to access it

### Backend — PostgreSQL 15 (Docker container `db`)

Everything the backend stores is in a Postgres database:

| | |
| --- | --- |
| Container | `db` |
| Database | `disaster_db` |
| User / password | `postgres` / `postgres` (dev only — change in prod) |
| Data volume | `resqnet-pgdata` (mounted at `/var/lib/postgresql/data` — survives container rebuilds) |
| Port | `5432` |

**Tables** (all in schema `public`): `users`, `disaster_mgmt_teams`, `relief_shelters`,
`sos_requests`, `awareness_content`, `alerts`, `assignments`.

**Ways to read it:**

1. **Interactive API docs (no SQL needed)** — open http://localhost:8000/docs (Swagger UI) or
   http://localhost:8000/redoc. Log in with a demo account to call any endpoint from the browser.
2. **`psql` from inside the container:**
   ```bash
   docker exec -it db psql -U postgres -d disaster_db
   ```
   Then e.g. `\dt` (list tables), `SELECT * FROM sos_requests ORDER BY created_at DESC LIMIT 10;`
   (latest SOSs), `SELECT * FROM assignments;` (dispatch history).
3. **A GUI client from your host** (DBeaver, pgAdmin, TablePlus, `psql`): connect to
   `localhost:5432`, database `disaster_db`, user `postgres`, password `postgres`.
4. **Backup / restore**:
   ```bash
   docker exec db pg_dump -U postgres -d disaster_db > backup.sql
   cat backup.sql | docker exec -i db psql -U postgres -d disaster_db
   ```

A quick SQL tour:

```sql
-- Everyone's login accounts (hashed passwords, roles REQUESTER / AUTHORITY / DISASTER_MGMT_TEAM)
SELECT user_id, name, phone, role FROM users;

-- All responder teams and their badges
SELECT team_name, badge_number, specialization, is_available FROM disaster_mgmt_teams;

-- SOS requests and which team finally handled them
SELECT s.sos_id, s.status, a.team_id, a.status AS assignment_status
FROM sos_requests s LEFT JOIN assignments a ON a.sos_id = s.sos_id;

-- Awareness posts and emergency alerts
SELECT * FROM awareness_content;
SELECT * FROM alerts;
```

### Web / mobile apps — browser storage

The citizen (5173) and team (5174) apps keep **no server-side state** for the guest/demo
experience. Everything else is network data (REST + WebSocket from the backend) plus these
`localStorage` keys on the device/browser:

| Key | App | Contents |
| --- | --- | --- |
| `resqnet_token` / auth token | citizen & team | JWT after sign-in |
| `resqnet_mock_sos` | citizen | SOSs created by the offline "demo simulator" |
| `resqnet_my_sos` | citizen | SOSs this phone posted (merged with `/sos/my`) |

Open DevTools → Application → Local Storage to inspect them. Clear them to reset the app.

---

## 10. Troubleshooting

| Symptom                                        | Likely fix                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `docker compose` not found                     | Install the Docker Compose plugin (this machine lacks it; the stack was validated with the equivalent manual `docker run` config, which the compose file mirrors 1:1). |
| Web apps work, live updates don't              | Check the WS connects (top-bar Live pill). It's same-origin via Nginx in Docker; in local dev ensure CORS allows `ws://localhost:517x`. |
| APK can't reach the backend                     | Rebuild with the right `VITE_API_BASE_URL` / `VITE_WS_URL` — a phone can't reach `localhost`. |
| 401 right after sign-in                        | JWT secret changed / token expired → sign in again.                |
| Blank map tiles                                 | The apps need internet access to OpenStreetMap tiles.              |
| "Insufficient permissions"                      | You're signed in with a role that endpoint doesn't allow (e.g., team login on the citizen app). |

---

## 11. Repository layout

```
dms/
├── docker-compose.yml            # One-command deployment of the whole platform
├── README.md                     # This file
├── app1/
│   ├── src/                      # Citizen web app (Vite + React + react-native-web)
│   ├── android/                  # Capacitor Android project (APK)
│   ├── Dockerfile · nginx.conf · capacitor.config.ts
├── app2/disaster-team/
│   ├── src/                      # Team web app (Vite + React + Leaflet)
│   ├── android/                  # Capacitor Android project (APK)
│   ├── Dockerfile · nginx.conf · capacitor.config.ts
├── web/disaster-authority/
│   ├── src/                      # Authority command center (Vite + React + Recharts)
│   ├── Dockerfile · nginx.conf
└── backend/                      # FastAPI + WebSocket + PostgreSQL
```

---

© 2026 ResQNet — Disaster Management System. All rights reserved.