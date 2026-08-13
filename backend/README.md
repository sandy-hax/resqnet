# Disaster Management System — Backend API

Backend service powering the Disaster Management System: SOS request intake (guest & authenticated), a strict SOS ⇄ Assignment state machine, Haversine-based responder-team ranking, OSRM route proxying with a straight-line fallback, regional geofenced broadcasts, and real-time WebSocket push to citizens, teams and the authority command center.

**Stack:** Python 3.11+ · FastAPI · SQLAlchemy 2.0 (async) · asyncpg · PostgreSQL 15 · PyJWT (HS256) · Passlib (bcrypt) · WebSockets · OSRM

---

## 1. System Architecture

```
Citizen App            Team App                 Authority Dashboard
(5173)                 (5174)                   (5175)
   |   REST + WS           |  REST + WS              |  REST + WS
   +----------+------------+-------------------------+
              |
      FastAPI (port 8000)  /api/v1/*
                |
        +------+------+
        | Services    |
        |  ranking    |  Haversine distance + skill-match ranking
        |  routing    |  OSRM proxy with straight-line fallback
        |  notification| Regional geofenced WS broadcasts
        +------+------+
                |
       SQLAlchemy async ORM
                |
      PostgreSQL 15 (disaster_db)
```

### Roles & Access Control

| Role                 | Capabilities                                                            | Auth required |
|----------------------|-------------------------------------------------------------------------|---------------|
| `REQUESTER`          | Submit authenticated SOS, view own SOS history                          | Yes (or guest SOS without token) |
| `DISASTER_MGMT_TEAM` | Accept/decline offers, update availability/location, drive state machine| Yes |
| `AUTHORITY`          | Verify SOS, assign teams, publish content/alerts, dispatch routing      | Yes |

### CORS allowed origins
`http://localhost:5173` (Requester) · `http://localhost:5174` (Team) · `http://localhost:5175` (Authority)

---

## 2. Features

### 2.1 SOS ⇄ Assignment state machine (enforced in `app/routers/assignments.py`)

```
Citizen submits SOS  →  SUBMITTED
Authority verifies   →  VERIFIED (or REJECTED)
Authority assigns    →  SOS = ASSIGNED, Assignment = OFFERED
Team accepts offer   →  Assignment = ACCEPTED
Team on the way      →  Assignment = ON_THE_WAY,  SOS = RESPONDER_ON_WAY
Team arrives         →  Assignment = ARRIVED,     SOS = ASSISTANCE_PROVIDED
Team completes       →  Assignment = COMPLETED,   SOS = RESOLVED
```

Illegal transitions are rejected with `409 Conflict`. Each assignment status change broadcasts an `sos.status_changed` event over WebSockets to every connected client.

### 2.2 Ranking algorithm (`app/services/ranking.py`)
Available teams are ranked primarily by whether their `specialization` matches the emergency type (`FLOOD_RESCUE`, `SEARCH_RESCUE`, …) and secondarily by Haversine great-circle distance (`R = 6371 km`). Top 5 returned to `GET /api/v1/teams/nearby`.

### 2.3 Route proxy with fallback (`app/services/routing.py`)
`GET /api/v1/sos/{id}/route` queries the public OSRM server for turn-by-turn driving steps and a `[lat, lng]` polyline. On timeout / network failure it falls back to a straight-line path at 30 km/h (configurable `EMERGENCY_AVG_SPEED_KMPH`) and returns `"is_fallback": true`.

### 2.4 Regional geofenced notifications (`app/services/notification.py`)
`POST /api/v1/content/preparedness` and `POST /api/v1/alerts` push `content.published` / `alert.broadcast` events to all connected citizen (`REQUESTER`) sockets.

### 2.5 Real-time WebSockets
`ws://localhost:8000/ws` — connects as `REQUESTER` by default; pass `?token=<JWT>` (or send `{"type":"auth","token":...}` after connect) to assume the token's role. Connections are grouped by role so broadcasts can target citizens, teams or the command center independently.

---

## 3. Project Structure

```
backend/
├── app/
│   ├── main.py                # FastAPI app, CORS, lifespan, table creation + seeding
│   ├── config.py              # Environment settings (DB, JWT, OSRM, CORS)
│   ├── database.py            # Async SQLAlchemy engine & session factory
│   ├── seed.py                # Idempotent demo data seeding
│   ├── models/                # ORM models (user, team, sos, assignment, content, alert, shelter)
│   ├── schemas/               # Pydantic v2 validation schemas
│   ├── auth/                  # JWT helpers + FastAPI security dependencies
│   ├── routers/               # REST controllers
│   ├── services/              # ranking, routing, notification business logic
│   └── websocket/             # ConnectionManager + /ws endpoint
├── scripts/
│   └── smoke_test.py          # End-to-end sanity test
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 4. Prerequisites

- **Python 3.11+** (3.12/3.13/3.14 also fine)
- **PostgreSQL 15** — or **Docker** (recommended, used in the quick start below)
- Network access to `https://router.project-osrm.org` for live routing (optional; the fallback keeps routing functional offline)

---

## 5. Quick Start (Docker Compose — recommended)

```bash
cd backend
cp .env.example .env          # edit secrets as needed
docker compose up --build -d
```

The API is then available at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

On first boot the container **creates all tables and seeds demo data** automatically.

### Verify it works

```bash
curl http://localhost:8000/health
# {"status":"ok","app":"Disaster Management System API"}
```

---

## 6. Local Development Setup

### 6.1 Create a virtual environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> **Note for bcrypt/passlib:** keep `bcrypt==4.0.1` pinned. Newer `bcrypt>=4.1` drops the `__about__` attribute that `passlib 1.7.4` needs.

### 6.2 Start PostgreSQL 15 (Docker)

```bash
docker run -d --name dms-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=disaster_db \
  -p 5432:5432 \
  -v dms_pgdata:/var/lib/postgresql/data \
  postgres:15
```

### 6.3 Configure environment

Copy `.env.example` to `.env` (values are auto-loaded by `app/config.py`; if you prefer no `.env` file, the defaults already match the Docker command above).

### 6.4 Run the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Tables are created and demo data seeded automatically on startup.

### 6.5 Run the end-to-end smoke test

```bash
python scripts/smoke_test.py
# == RESULT: 37 passed, 0 failed ==
```

The smoke test drives the full SOS lifecycle (submit → verify → assign → accept → on-the-way → arrived → completed), verifies SOS status synchronization, routing, ranking, access control, and a live WebSocket broadcast.

---

## 7. Environment Variables (`.env`)

| Variable                   | Default                                           | Description                                  |
|----------------------------|---------------------------------------------------|----------------------------------------------|
| `DB_HOST`                  | `localhost`                                       | PostgreSQL host                              |
| `DB_PORT`                  | `5432`                                            | PostgreSQL port                              |
| `DB_NAME`                  | `disaster_db`                                     | Database name                                |
| `DB_USER`                  | `postgres`                                        | Database user                                |
| `DB_PASSWORD`              | `postgres`                                        | Database password                            |
| `JWT_SECRET`               | `CHANGE_ME_...`                                   | HS256 signing secret — **change in production** |
| `JWT_EXPIRY_MINUTES`       | `1440`                                            | Access token lifetime                        |
| `OSRM_URL`                 | `https://router.project-osrm.org/route/v1/driving`| OSRM routing endpoint                        |
| `ROUTE_TIMEOUT_SECONDS`    | `3`                                               | OSRM request timeout before fallback         |
| `EMERGENCY_AVG_SPEED_KMPH` | `30`                                              | Assumed emergency speed for fallback ETA     |
| `CORS_ORIGINS`             | `http://localhost:5173,...`                       | Comma-separated allowed origins              |
| `HOST` / `PORT`            | `0.0.0.0` / `8000`                                | Bind address / port                          |

---

## 8. Demo Accounts (auto-seeded)

| Role                 | Phone          | Password        | Notes                                  |
|----------------------|----------------|-----------------|----------------------------------------|
| AUTHORITY            | `+911234567890`| `authority123`  | District Command Center                |
| DISASTER_MGMT_TEAM   | `+919123456789`| `team123`       | NDRF Rescue Unit 04 (SEARCH_RESCUE, FLOOD_RESCUE) |
| DISASTER_MGMT_TEAM   | `+919100000012`| `team123`       | Fire & Rescue Squad 12                 |
| DISASTER_MGMT_TEAM   | `+919100000013`| `team123`       | Medical Rapid Response Team            |
| DISASTER_MGMT_TEAM   | `+919100000014`| `team123`       | Cyclone Shelter Evacuation Unit        |
| REQUESTER            | `+919876543210`| `citizen123`    | Rahul Sharma                           |

The seed also inserts 5 awareness/preparedness articles and 3 relief shelters. Seeding runs only once (skipped if the `users` table already has rows).

---

## 9. API Reference

Base URL: `http://localhost:8000/api/v1`

### Auth

| Method | Endpoint        | Auth    | Body / Query                                        | Description                     |
|--------|-----------------|---------|-----------------------------------------------------|---------------------------------|
| POST   | `/auth/register`| –       | `{name, phone, email?, password, role, team_name?, specialization?, experience_level?, badge_number?}` | Create user (team fields required for `DISASTER_MGMT_TEAM`) |
| POST   | `/auth/login`   | –       | `{phone, password}`                                 | Returns `access_token`, `role`, `user` |
| GET    | `/auth/me`      | Bearer  | –                                                   | Current user + linked team profile |

### SOS

| Method | Endpoint             | Auth                | Body / Query                                  | Description |
|--------|----------------------|---------------------|-----------------------------------------------|-------------|
| POST   | `/sos`               | optional (Bearer)   | `{emergency_type, description, people_affected, lat, lng, image_url?, guest_name?, guest_phone?}` | Guest or authenticated SOS submission → `SUBMITTED`; emits `sos.created` to AUTHORITY |
| GET    | `/sos/my`            | Bearer (REQUESTER)  | –                                             | Citizen's own SOS history |
| GET    | `/sos`               | Bearer (AUTHORITY)  | `status?`, `priority?` filters                | Authority queue |
| GET    | `/sos/{id}`          | –                   | –                                             | Single SOS + assigned team summary |
| PATCH  | `/sos/{id}/verify`   | Bearer (AUTHORITY)  | `{verified, priority}`                        | `VERIFIED` or `REJECTED` |
| POST   | `/sos/{id}/assign`   | Bearer (AUTHORITY)  | `{team_id}`                                   | Creates `OFFERED` assignment; emits `assignment.offered` to team |
| GET    | `/sos/{id}/route`    | –                   | `from_lat`, `from_lng`                        | OSRM route / straight-line fallback |

### Disaster Management Teams

| Method | Endpoint              | Auth               | Body / Query                        | Description |
|--------|-----------------------|--------------------|-------------------------------------|-------------|
| GET    | `/team/me`            | Bearer (TEAM)      | –                                   | Team profile |
| PATCH  | `/team/availability`  | Bearer (TEAM)      | `{is_available, current_lat?, current_lng?}` | Toggle availability + location |
| PATCH  | `/team/location`      | Bearer (TEAM)      | `{lat, lng}`                        | Live location update |
| GET    | `/teams`              | Bearer (AUTHORITY) | –                                   | All teams |
| GET    | `/teams/nearby`       | Bearer (AUTHORITY) | `lat`, `lng`, `skill?`              | Top-5 ranked available teams |

### Assignments

| Method | Endpoint                    | Auth          | Body                           | Description |
|--------|-----------------------------|---------------|--------------------------------|-------------|
| GET    | `/assignments/mine`         | Bearer (TEAM) | –                              | Team's assignments |
| GET    | `/assignments/{id}`         | Bearer (TEAM) | –                              | Assignment detail + linked SOS |
| PATCH  | `/assignments/{id}/respond` | Bearer (TEAM) | `{status: ACCEPTED|DECLINED}` | Respond to an offer |
| PATCH  | `/assignments/{id}/status`  | Bearer (TEAM) | `{status: ON_THE_WAY|ARRIVED|COMPLETED}` | Advance state machine; syncs parent SOS + broadcasts |

### Content, Alerts & Shelters

| Method | Endpoint                | Auth                | Description |
|--------|-------------------------|---------------------|-------------|
| GET    | `/content`              | –                   | List awareness & preparedness content (`is_program` filter) |
| POST   | `/content/awareness`    | Bearer (AUTHORITY)  | Publish an awareness article |
| POST   | `/content/preparedness` | Bearer (AUTHORITY)  | Publish a program; broadcasts `content.published` to citizens |
| GET    | `/alerts`               | –                   | List alerts |
| POST   | `/alerts`               | Bearer (AUTHORITY)  | Publish alert; broadcasts `alert.broadcast` to citizens |
| GET    | `/shelters`             | –                   | List shelters; pass `lat`/`lng` for sorted distance |

---

## 10. WebSocket Events

Endpoint: `ws://localhost:8000/ws` (optionally `?token=<JWT>`)

All frames are JSON: `{"event": "<name>", "data": {...}}`

| Event                   | Target     | Payload highlights                                          |
|-------------------------|------------|-------------------------------------------------------------|
| `connection.status`     | self       | `{connected, role}`                                         |
| `sos.created`           | AUTHORITY  | `{sos_id, emergency_type, lat, lng, status}`                |
| `sos.status_changed`    | all        | `{sos_id, status, assignment_id?, assignment_status?}`      |
| `assignment.offered`    | TEAM       | `{assignment_id, sos_id, emergency_type, lat, lng, distance_km}` |
| `assignment.responded`  | AUTHORITY  | `{assignment_id, sos_id, assignment_status}`                |
| `content.published`     | REQUESTER  | `{content_id, title, body, target_area, is_program, message}` |
| `alert.broadcast`       | REQUESTER  | `{id, title, message, severity, target_area}`               |

---

## 11. Deployment

### Option A — Docker Compose (single-node, recommended for VPS)

```bash
git clone <repo> && cd backend
cp .env.example .env
# 1. set a strong JWT_SECRET, e.g.:  openssl rand -hex 32
# 2. update DB_PASSWORD if you changed the compose default
docker compose up --build -d
docker compose ps                 # both `db` and `api` should be healthy
```

- API: `http://<server-ip>:8000`
- Docs: `http://<server-ip>:8000/docs`
- To stop: `docker compose down` · To wipe data: `docker compose down -v`

### Option B — Manual (systemd + PostgreSQL)

1. Install PostgreSQL 15 and create the database:

   ```bash
   sudo -u postgres psql -c "CREATE USER dms_user WITH PASSWORD 'change_me';"
   sudo -u postgres psql -c "CREATE DATABASE disaster_db OWNER dms_user;"
   ```

2. Deploy code and install dependencies:

   ```bash
   cd /opt/dms-backend
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env   # set DB_USER=postgres, DB_PASSWORD, JWT_SECRET
   ```

3. Run under systemd — `/etc/systemd/system/dms-api.service`:

   ```ini
   [Unit]
   Description=Disaster Management API
   After=network.target postgresql.service

   [Service]
   WorkingDirectory=/opt/dms-backend
   EnvironmentFile=/opt/dms-backend/.env
   ExecStart=/opt/dms-backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
   Restart=always
   User=dms

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now dms-api
   sudo systemctl status dms-api
   ```

### Option C — Production hardening checklist

- **Secrets:** always set `JWT_SECRET` to a long random value (`openssl rand -hex 32`); never commit `.env`.
- **Database credentials:** use a dedicated PostgreSQL user with least privilege; never the default `postgres/postgres`.
- **Reverse proxy (TLS):** front the API with Nginx/Caddy and terminate HTTPS, proxying both HTTP and WebSocket upgrade:

  ```nginx
  server {
      listen 443 ssl;
      server_name api.example.com;
      ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

      location / {
          proxy_pass http://127.0.0.1:8000;
          proxy_set_header Host $host;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          # WebSocket support
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_read_timeout 3600s;
      }
  }
  ```

- **Multiple workers / scaling:** this build keeps the WebSocket `ConnectionManager` in-memory, so broadcast scope is per-process. For multi-worker deployments, pin `--workers 1` and scale horizontally with a shared pub/sub (e.g. Redis) — or keep a single process, which is fine for pilot-scale traffic.
- **DB migrations:** schema is created via `Base.metadata.create_all` at startup for simplicity. For production, adopt Alembic and run `alembic upgrade head` instead.
- **Auth in production:** store `JWT_SECRET` in a secret manager; consider shortening `JWT_EXPIRY_MINUTES` and adding refresh tokens.

---

## 12. Troubleshooting

| Symptom                              | Likely fix |
|--------------------------------------|------------|
| `Connection refused` on port 5432    | Start PostgreSQL / Docker container; confirm `DB_HOST`/`DB_PORT`. |
| `Application startup failed` / `NoForeignKeysError` | Recreate the schema: the mapper now links `disaster_mgmt_teams.user_id` to `users.user_id`; `docker compose down -v && docker compose up -d`. |
| OSRM returns fallback route           | Expected when the public OSRM server is slow/unreachable; the API still returns a usable straight-line route with `is_fallback: true`. |
| Smoke test fails on WebSocket step   | Ensure the server binds `0.0.0.0` and no firewall blocks localhost WS; run `python scripts/smoke_test.py --base-url http://localhost:8000`. |
| CORS error in a browser frontend     | Add the exact origin (with port) to `CORS_ORIGINS`. |

---

## 13. Interactive Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`
