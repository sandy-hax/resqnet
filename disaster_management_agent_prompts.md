# Disaster Management System — Prototype Build Prompts (5 Agents)

This document gives you **five self-contained prompts** — one per coding agent (Antigravity, Kiro, Claude Code, Cursor, whatever). Each prompt repeats the **same frozen contract** (API shapes, ports, colors, roles) on purpose, so agents that never talk to each other still build compatible pieces. Do not let any agent "improve" or rename anything in the contract sections — if something needs to change, change it here first, then re-paste into every prompt.

**Agents:**
1. 🗄️ Database Agent — PostgreSQL schema + seed data
2. ⚙️ Backend Agent — Python FastAPI (replaces Spring Boot for this prototype)
3. 🙋 Requester App Agent — citizen-facing web app ("Swiggy customer app" vibe)
4. 🏍️ Responder App Agent — volunteer-facing web app ("Rapido captain app" vibe)
5. 🗺️ Authority Dashboard Agent — command-center web dashboard

**Admin app: intentionally skipped.** For a prototype, admin duties (approving volunteers, publishing awareness/preparedness content) are folded into the Authority Dashboard as two extra tabs instead of a 6th app. This halves the surface area for bugs without losing anything you'd actually demo. Recommend building this after the core loop is proven.

Build order matters: **Database → Backend → the 3 frontends in parallel.** Frontends can technically start against a mocked API, but for a bug-free demo, get the backend running first and point all three frontends at the real thing.

---

## 0. FROZEN CONTRACT — read this before writing any prompt into an agent

Copy this entire section into **every** agent's first message, before the agent-specific instructions. It is intentionally repeated verbatim in each prompt below so you can just copy-paste one block at a time.

### 0.1 Roles
```
REQUESTER   - citizen asking for help. Login OPTIONAL (guest SOS allowed).
VOLUNTEER   - responder. Login MANDATORY. Must enroll + get approved before receiving assignments.
AUTHORITY   - dispatcher/coordinator. Login MANDATORY. Also handles the admin duties for this prototype
              (approve volunteers, publish awareness/preparedness content).
```

### 0.2 Ports & repos
```
disaster-db/          -> Postgres via Docker, port 5432, db name "disaster_db"
disaster-backend/     -> FastAPI, port 8000, base URL http://localhost:8000/api/v1
disaster-requester/   -> React + Vite, port 5173
disaster-responder/   -> React + Vite, port 5174
disaster-authority/   -> React + Vite, port 5175
```
All frontends call the backend at `http://localhost:8000/api/v1` and open a WebSocket at `ws://localhost:8000/ws`. Put this base URL in a `.env` (`VITE_API_URL`, `VITE_WS_URL`) — never hardcode.

### 0.3 Shared visual identity (all 3 frontend apps must use this — same theme, different accent)
```
Brand name:      "Raksha Link"  (placeholder — feel free to swap, but keep it consistent across all 3 apps)
Font:            Inter (Google Fonts) for UI, larger rounded weight for headings
Base colors:
  --color-bg:          #F7F9FC   (soft off-white, not stark white)
  --color-surface:     #FFFFFF
  --color-text:        #1A2233
  --color-muted:       #6B7280
  --color-primary:     #0F6E5C   (calm teal-green — trust, safety, "everything is handled")
  --color-primary-dark:#0B4F42
  --color-danger:      #E14434   (SOS red-orange, urgent but not alarmist)
  --color-warning:     #F5A623   (medium priority / alerts)
  --color-success:     #2E9E5B   (resolved / approved)
  --color-border:      #E4E8EF
Radius: 14px on cards/buttons, generous padding (16–24px), soft shadows (0 4px 16px rgba(0,0,0,0.06)).
Tone: calm, competent, reassuring — think a well-funded NGO's app, not a government form.
  - Requester app: warm and simple, big single SOS action, never makes the user feel like they're filling a form.
  - Responder app: energetic and mission-driven (Rapido/Swiggy-partner energy), uses --color-primary heavily,
    online/offline toggle always visible, assignment cards feel like "job offers."
  - Authority dashboard: dense, data-forward, dark sidebar + light content area, feels like a live ops center.
All 3 must share the same logo mark, font, and color tokens so screenshots side-by-side look like ONE product family.
```

### 0.4 Auth contract
```
POST /api/v1/auth/register
  body: { name, phone, email?, password, role: "REQUESTER" | "VOLUNTEER" }
  -> 201 { user_id, role }

POST /api/v1/auth/login
  body: { phone, password }
  -> 200 { access_token, token_type: "bearer", role, user_id }

GET /api/v1/auth/me   (Authorization: Bearer <token>)
  -> 200 { user_id, name, phone, role, volunteer_status? }

Guest SOS (requester only, no login required):
POST /api/v1/sos  can be called WITHOUT a token if body includes { guest_name, guest_phone }.
If called WITH a token (role REQUESTER), user_id is taken from the token instead.

JWT payload: { sub: user_id, role, exp }. AUTHORITY-only routes require role=="AUTHORITY".
VOLUNTEER-only routes require role=="VOLUNTEER" AND volunteer_status=="APPROVED" (except enrollment/training routes).
```

### 0.5 Core data shapes (all agents must match these field names exactly)

```jsonc
// User
{ "user_id": "uuid", "name": "string", "phone": "string", "role": "REQUESTER|VOLUNTEER|AUTHORITY" }

// Volunteer profile (1:1 with a User of role VOLUNTEER)
{
  "volunteer_id": "uuid",
  "user_id": "uuid",
  "skills": ["MEDICAL","FIRST_AID","SEARCH_RESCUE","TRANSPORTATION","FOOD_DISTRIBUTION","SHELTER_SUPPORT","COMMUNICATION"],
  "status": "UNVERIFIED|TRAINING_IN_PROGRESS|PENDING_APPROVAL|APPROVED|REJECTED",
  "is_online": false,
  "current_lat": null, "current_lng": null,
  "id_photo_url": "string|null",
  "training_completed_pct": 0,
  "approved_at": "iso8601|null",
  "volunteer_code": "RL-VOL-000123"   // shown on the digital ID card
}

// Training module
{ "module_id": "uuid", "title": "string", "summary": "string", "content": "string", "order": 1 }
// Volunteer completion
{ "module_id": "uuid", "completed_at": "iso8601" }

// SOS Request
{
  "sos_id": "SOS-000124",
  "requester_user_id": "uuid|null",
  "guest_name": "string|null", "guest_phone": "string|null",
  "emergency_type": "FLOOD|CYCLONE|EARTHQUAKE|FIRE|LANDSLIDE|TSUNAMI|MEDICAL|OTHER",
  "description": "string",
  "people_affected": 1,
  "lat": 11.3410, "lng": 77.7172,
  "priority": "LOW|MEDIUM|HIGH",
  "status": "SUBMITTED|RECEIVED|VERIFIED|ASSIGNED|RESPONDER_ON_WAY|ASSISTANCE_PROVIDED|RESOLVED|REJECTED",
  "image_url": "string|null",
  "created_at": "iso8601"
}

// Assignment (links a volunteer to an sos_request)
{
  "assignment_id": "uuid",
  "sos_id": "SOS-000124",
  "volunteer_id": "uuid",
  "status": "OFFERED|ACCEPTED|DECLINED|ON_THE_WAY|ARRIVED|COMPLETED",
  "distance_km": 2.4,
  "assigned_at": "iso8601"
}

// Alert (authority-broadcast)
{ "alert_id": "uuid", "title": "string", "message": "string", "severity": "LOW|MEDIUM|HIGH", "area": "string", "created_at": "iso8601" }
```

### 0.6 Full REST endpoint list (versioned, prefix `/api/v1`)

```
AUTH
  POST   /auth/register
  POST   /auth/login
  GET    /auth/me

AWARENESS & PREPAREDNESS (public, read-only for requester; authority can write)
  GET    /disasters
  GET    /awareness
  GET    /awareness/{id}
  GET    /preparedness
  GET    /preparedness/{disasterId}
  POST   /awareness            (AUTHORITY)
  POST   /preparedness          (AUTHORITY)

SOS
  POST   /sos                          (guest OR requester)
  GET    /sos/my                       (requester, own history)
  GET    /sos/{id}                     (any authenticated role involved, or authority)
  GET    /sos                          (AUTHORITY — full queue, filter by status/priority)
  PATCH  /sos/{id}/status               (AUTHORITY, VOLUNTEER for their own assignment's sos)
  POST   /sos/{id}/assign               (AUTHORITY) body: { volunteer_id }
  GET    /sos/{id}/route?from_lat=&from_lng=   -> { distance_km, duration_min, polyline: [[lat,lng],...], steps: ["Turn left onto...", ...] }

VOLUNTEERS
  POST   /volunteers/enroll             (VOLUNTEER) body: { skills:[], id_photo_url }
  GET    /volunteers/training-modules
  POST   /volunteers/training-modules/{id}/complete   (VOLUNTEER)
  GET    /volunteers/me                 (VOLUNTEER) -> volunteer profile incl. status + training %
  GET    /volunteers/me/id-card         (VOLUNTEER, only if status==APPROVED)
  PATCH  /volunteers/me/availability    (VOLUNTEER) body: { is_online, current_lat, current_lng }
  GET    /volunteers                    (AUTHORITY — list all, filter by status/skill)
  PATCH  /volunteers/{id}/approve       (AUTHORITY) body: { approve: true|false }
  GET    /volunteers/nearby?lat=&lng=&skill=&limit=5   (AUTHORITY — ranked candidate list for assignment)

ASSIGNMENTS
  GET    /assignments/me                (VOLUNTEER — current + past)
  PATCH  /assignments/{id}/respond      (VOLUNTEER) body: { accept: true|false }
  PATCH  /assignments/{id}/status       (VOLUNTEER) body: { status: "ON_THE_WAY"|"ARRIVED"|"COMPLETED" }

ALERTS
  GET    /alerts
  POST   /alerts                        (AUTHORITY)

SHELTERS
  GET    /shelters
  POST   /shelters                      (AUTHORITY)
```

### 0.7 WebSocket contract
```
Connect: ws://localhost:8000/ws?token=<jwt or empty for guest>
Server -> client events (JSON: { "event": "...", "data": {...} }):
  "sos.created"          -> new SOS, sent to AUTHORITY clients
  "sos.status_changed"   -> sent to AUTHORITY + the relevant REQUESTER + the assigned VOLUNTEER
  "assignment.offered"   -> sent to the target VOLUNTEER ("new job offer" push)
  "assignment.updated"   -> sent to AUTHORITY + REQUESTER when volunteer accepts/declines/updates status
  "alert.broadcast"      -> sent to all connected REQUESTER clients
```

### 0.8 Demo seed accounts (Database agent must create these; all agents assume they exist)
```
Requester : phone 9000000001 / password demo1234  (also test guest-SOS flow with no login)
Volunteer : phone 9000000002 / password demo1234  (pre-seeded as status=APPROVED, volunteer_code RL-VOL-000001,
            skills=[MEDICAL, FIRST_AID], so the demo doesn't need to walk through enrollment live)
Volunteer2: phone 9000000003 / password demo1234  (status=PENDING_APPROVAL — to demo the approval flow live)
Authority : phone 9000000009 / password demo1234
```

---

## 1. 🗄️ DATABASE AGENT PROMPT

```
You are setting up the PostgreSQL database for "Raksha Link," a disaster-management prototype.
Deliverable: a `disaster-db/` folder with Docker Compose, SQL migrations, and a seed script. No ORM code —
that lives in the backend. You are producing raw SQL + a docker-compose.yml.

TECH: PostgreSQL 15, Docker Compose, plain .sql migration files (numbered 001_, 002_, ...), a seed.sql.

--- PASTE SECTION 0 (FROZEN CONTRACT) FROM ABOVE HERE BEFORE CONTINUING ---

YOUR TASKS:

1. docker-compose.yml that spins up Postgres on port 5432, db name "disaster_db", user/password
   "disaster_user"/"disaster_pass" (local dev only), with a named volume for persistence.

2. Write migrations creating these tables (use UUID primary keys via `gen_random_uuid()` / pgcrypto
   extension, add created_at/updated_at timestamptz defaulting to now() on every table):

   users (user_id PK, name, phone UNIQUE NOT NULL, email, password_hash, role CHECK IN
     ('REQUESTER','VOLUNTEER','AUTHORITY'))

   volunteers (volunteer_id PK, user_id FK -> users UNIQUE, skills TEXT[], status CHECK IN
     ('UNVERIFIED','TRAINING_IN_PROGRESS','PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'UNVERIFIED',
     is_online BOOLEAN DEFAULT false, current_lat DOUBLE PRECISION, current_lng DOUBLE PRECISION,
     id_photo_url TEXT, approved_at TIMESTAMPTZ, volunteer_code TEXT UNIQUE)

   training_modules (module_id PK, title, summary, content TEXT, sort_order INT)

   volunteer_training_progress (volunteer_id FK, module_id FK, completed_at TIMESTAMPTZ,
     PRIMARY KEY (volunteer_id, module_id))

   disasters (disaster_id PK, name, category) — seed with Flood, Cyclone, Earthquake, Fire, Landslide, Tsunami

   awareness_content (content_id PK, disaster_id FK, title, body TEXT, media_url, type CHECK IN
     ('ARTICLE','VIDEO','CAMPAIGN'))

   preparedness_guides (guide_id PK, disaster_id FK, phase CHECK IN ('BEFORE','DURING','AFTER'), title, body TEXT)

   sos_requests (sos_id TEXT PK — human readable like 'SOS-000124' generated via sequence,
     requester_user_id FK NULLABLE, guest_name, guest_phone, emergency_type, description TEXT,
     people_affected INT DEFAULT 1, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
     priority CHECK IN ('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
     status CHECK IN ('SUBMITTED','RECEIVED','VERIFIED','ASSIGNED','RESPONDER_ON_WAY',
       'ASSISTANCE_PROVIDED','RESOLVED','REJECTED') DEFAULT 'SUBMITTED', image_url)

   assignments (assignment_id PK, sos_id FK, volunteer_id FK, status CHECK IN
     ('OFFERED','ACCEPTED','DECLINED','ON_THE_WAY','ARRIVED','COMPLETED') DEFAULT 'OFFERED',
     distance_km DOUBLE PRECISION, assigned_at TIMESTAMPTZ DEFAULT now())

   alerts (alert_id PK, title, message TEXT, severity CHECK IN ('LOW','MEDIUM','HIGH'), area TEXT)

   shelters (shelter_id PK, name, lat DOUBLE PRECISION, lng DOUBLE PRECISION, capacity INT, contact_phone)

   Add indexes on: sos_requests(status), sos_requests(priority), volunteers(status), assignments(sos_id),
   assignments(volunteer_id).

3. Write seed.sql that inserts:
   - The 4 demo accounts from section 0.8 (hash "demo1234" with bcrypt — write a tiny helper script in
     Python, `hash_seed_passwords.py`, that prints the bcrypt hash so you can paste it into seed.sql;
     document this step in the README since SQL can't bcrypt on its own).
   - The two seeded volunteers with correct status per 0.8.
   - 6 disasters (Flood, Cyclone, Earthquake, Fire, Landslide, Tsunami).
   - At least 2 awareness_content rows and 2 preparedness_guides rows PER disaster (short, real, useful
     content — not lorem ipsum — pull from general public-safety knowledge, e.g. flood: "store water,"
     "move to higher ground," etc.)
   - 5 training_modules with real short disaster-response training content (e.g. "Basic First Aid,"
     "How to Safely Approach a Flood Victim," "Search & Rescue Fundamentals," "Communication During
     Crisis," "Personal Safety Protocols") — 150-300 words of real content each, not placeholders.
   - 3 shelters with plausible lat/lng near Erode, Tamil Nadu, India (11.34, 77.72) since that's roughly
     the demo location — spread them a few km apart.
   - 2-3 sample resolved SOS requests (for historical/analytics demo) plus leave room for live ones
     created during the demo.

4. README.md in disaster-db/ with: `docker compose up -d`, how to run migrations (a simple
   `psql -f migrations/001_*.sql` loop is fine, or a tiny bash script `migrate.sh`), how to run seed.sql,
   and how to connect (`psql postgresql://disaster_user:disaster_pass@localhost:5432/disaster_db`).

5. Do NOT invent extra tables or rename any column from the frozen contract — the backend agent is
   coding against these exact names in parallel and cannot see your work until it's done.

Acceptance test before you finish: run `docker compose up -d`, apply migrations, apply seed, then run
`SELECT sos_id, status FROM sos_requests;` and `SELECT phone, role FROM users;` and confirm the demo
accounts and sample data are all present with no errors.
```

---

## 2. ⚙️ BACKEND AGENT PROMPT

```
You are building the backend for "Raksha Link," a disaster-management prototype, in Python.
IMPORTANT: the original spec called for Spring Boot/Java — for this prototype we are using
Python + FastAPI instead. Keep the same REST contract, just implement it in FastAPI.

TECH: Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), asyncpg driver, Pydantic v2 for schemas,
python-jose for JWT, passlib[bcrypt] for password hashing, uvicorn to run, websockets (FastAPI's
built-in WebSocket support) for real-time. Connects to the Postgres instance the Database agent
set up (disaster_user/disaster_pass@localhost:5432/disaster_db).

--- PASTE SECTION 0 (FROZEN CONTRACT) FROM ABOVE HERE BEFORE CONTINUING ---

YOUR TASKS:

1. Project structure (mirror this, keep it modular):
   disaster-backend/
     app/
       main.py                (FastAPI app, CORS for localhost:5173/5174/5175, mounts routers + ws)
       config.py               (env vars: DATABASE_URL, JWT_SECRET, JWT_EXPIRE_MIN)
       database.py              (async engine/session)
       models/                  (SQLAlchemy models matching the DB schema exactly — do not create
                                  new tables, do not rename columns)
       schemas/                 (Pydantic request/response models matching section 0.5 exactly)
       auth/                    (jwt utils, password hashing, get_current_user dependency,
                                  require_role() dependency factory)
       routers/
         auth.py
         awareness.py
         preparedness.py
         sos.py
         volunteers.py
         assignments.py
         alerts.py
         shelters.py
       websocket/
         manager.py             (ConnectionManager: tracks sockets per role/user, broadcast() and
                                  send_to_user() methods)
         routes.py               (the /ws endpoint)
       services/
         routing.py               (see task 5 below — the /sos/{id}/route endpoint)
     requirements.txt
     .env.example
     README.md

2. Implement every endpoint in section 0.6 exactly as specified (same paths, same request/response
   shapes from section 0.5). Use the DB tables the database agent created — do not run your own
   migrations, just connect and reflect/declare matching SQLAlchemy models.

3. Auth: bcrypt-hash passwords on register, JWT on login (HS256, 24h expiry), `get_current_user`
   dependency reads Bearer token. Guest SOS submission (no token) must still work per section 0.4.

4. Role-based state machine enforcement (do not let the frontend cheat this):
   - Only AUTHORITY can call /sos/{id}/assign, /volunteers/{id}/approve, POST /alerts,
     POST /awareness, POST /preparedness, PATCH /sos/{id}/status when moving to VERIFIED/ASSIGNED/
     REJECTED.
   - Only VOLUNTEER can call /assignments/{id}/respond and /assignments/{id}/status, and only if
     assignment.volunteer_id matches the caller.
   - A VOLUNTEER whose status != APPROVED gets a 403 on anything except /volunteers/enroll,
     /volunteers/training-modules*, /volunteers/me.
   - When an assignment status moves to ON_THE_WAY / ARRIVED / COMPLETED, also update the parent
     sos_requests.status accordingly (RESPONDER_ON_WAY / ASSISTANCE_PROVIDED / RESOLVED) in the same
     transaction, and broadcast "sos.status_changed" over the websocket.

5. `/sos/{id}/route?from_lat=&from_lng=` — this powers the responder app's Rapido-style navigation.
   For the prototype, DO NOT stand up your own routing engine. Call the free public OSRM demo API:
   `https://router.project-osrm.org/route/v1/driving/{from_lng},{from_lat};{to_lng},{to_lat}?overview=full&geometries=geojson&steps=true`
   Parse the response into { distance_km, duration_min, polyline: [[lat,lng],...], steps: [...] }
   (convert GeoJSON [lng,lat] pairs to [lat,lng] for the frontend, since Leaflet expects lat,lng).
   Cache nothing fancy — just proxy + reshape. If the OSRM call fails (offline/rate-limited), fall
   back to returning a straight-line polyline between the two points plus haversine distance, and
   duration estimated at 30 km/h average, so the demo never breaks even without internet.

6. `/volunteers/nearby` ranking: filter volunteers where status=APPROVED, is_online=true, skill is in
   their skills array (if skill param given), compute haversine distance from the sos lat/lng to each
   volunteer's current_lat/lng, sort ascending, return top N (default 5) with distance_km included.
   This is what powers the "assign volunteer" picker in the authority dashboard (matches doc section 14
   — simple rule-based ranking, no ML).

7. WebSocket: on connect, decode the token (or treat as anonymous requester-guest), register the
   socket under the user's role (and user_id if authenticated) in ConnectionManager. Broadcast events
   exactly per section 0.7. Test this by hand: create an SOS as requester, confirm an authority-connected
   socket receives "sos.created" within ~1s.

8. Seed-independent sanity: write a short `scripts/smoke_test.py` that hits the health check, registers
   a throwaway user, logs in, and creates a guest SOS, printing PASS/FAIL for each step — this is how
   you verify against the database agent's actual seeded schema instead of assuming it worked.

9. CORS: allow http://localhost:5173, http://localhost:5174, http://localhost:5175 explicitly.

10. README.md: how to `pip install -r requirements.txt`, set `.env` from `.env.example`, run
    `uvicorn app.main:app --reload --port 8000`, and where to see interactive docs (`/docs`, FastAPI's
    built-in Swagger — use this to sanity-check every endpoint yourself before declaring done).

Acceptance test before you finish: full loop via curl or /docs — register a requester, submit a guest
SOS, login as the pre-seeded APPROVED volunteer, GET /volunteers/nearby returns it, login as authority,
assign it, volunteer GETs /assignments/me and sees the offer, accepts it, updates status to ON_THE_WAY,
confirm sos_requests.status flips to RESPONDER_ON_WAY, and confirm /sos/{id}/route returns a real route.
```

---

## 3. 🙋 REQUESTER APP AGENT PROMPT

```
You are building the citizen-facing "Raksha Link" web app — think Swiggy's customer app, but for
requesting disaster help instead of food. This is one of three separate frontend apps; you own ONLY
the requester experience. A different team is building the responder app and the authority dashboard
against the same backend — do not invent your own API shapes.

TECH: React 18 + Vite + TypeScript, Tailwind CSS, React Router, Axios, TanStack Query, Leaflet
(react-leaflet) for the shelter/map views, a WebSocket client (native `WebSocket` is fine, or
`socket.io` is NOT used — this backend is a plain FastAPI WebSocket, not socket.io).
Runs on port 5173, calls the backend at http://localhost:8000/api/v1 and ws://localhost:8000/ws.

--- PASTE SECTION 0 (FROZEN CONTRACT) FROM ABOVE HERE BEFORE CONTINUING ---

DESIGN BRIEF FOR THIS APP SPECIFICALLY:
Warm, reassuring, dead simple. A scared or stressed user should never have to think. Big single SOS
button always reachable. Never force login — login is a nice-to-have for tracking history, not a gate.
Use --color-primary for calm/informational surfaces, --color-danger ONLY for the SOS button and active
emergency status, so it stands out. Rounded cards, generous whitespace, large tap targets (this is a
"open in a panic" app). Add a subtle pulsing animation on the SOS button (CSS, not JS-heavy) to signal
"this works, tap it."

YOUR TASKS:

1. Screens/routes:
   - `/` Home — greeting (or "Welcome" if guest), "Active Alerts" banner if any GET /alerts are HIGH
     severity, the big SOS button, and a grid of: Awareness, Preparedness, Nearby Shelters, My Requests
     (My Requests only shown/usable if logged in).
   - `/login` and `/register` — simple, and clearly labeled "optional — you can also just tap SOS below
     without an account" with a link back to home. Register role is hardcoded to REQUESTER (no role
     picker on this app).
   - `/sos/new` — the core flow. Steps: (1) auto-request browser geolocation immediately on mount,
     show a small map pin confirming the captured location with a "location captured" checkmark,
     allow manual drag-to-adjust on the map if geolocation is off; (2) emergency type as icon buttons
     (Flood/Cyclone/Earthquake/Fire/Landslide/Tsunami/Medical/Other); (3) short description textarea +
     "people affected" stepper; (4) optional photo upload (just accept a file input, no need to actually
     store it anywhere real for the prototype — can stub image_url); (5) one big "Confirm & Send SOS"
     button. If not logged in, ask only for name + phone inline on this same screen (no separate signup).
     Keep this whole flow to ONE scrollable screen or a lightweight 2-step wizard — not a long form hunt.
   - `/sos/:id` — live status tracker. Show a vertical checklist matching the state machine:
     Request Received -> Verified -> Responder Assigned -> Responder On the Way -> Assistance Provided
     -> Resolved, with the current step highlighted, and a mini map showing the SOS location plus (once
     assigned) show "help is X km away" if you can derive it from the assignment. Subscribe to the
     websocket "sos.status_changed" event for this sos_id and update live without polling/refresh.
   - `/requests` ("My Requests") — list of past + active SOS via GET /sos/my, tap through to `/sos/:id`.
   - `/awareness` and `/awareness/:id` — content browser using GET /awareness, grouped by disaster type
     with icons; article/video cards.
   - `/preparedness` and `/preparedness/:disasterId` — Before/During/After tabs per disaster using
     GET /preparedness/{disasterId}.
   - `/shelters` — Leaflet map of GET /shelters with markers, tap a marker for name/capacity/contact.

2. Auth: store JWT in memory + localStorage is fine for this prototype (note: this is a prototype
   exception — normally avoid localStorage for tokens, but it's acceptable here since there's no
   sensitive data at stake). Axios interceptor attaches `Authorization: Bearer <token>` when present.
   Every screen must work in guest mode except `/requests`.

3. Offline resilience touch (matches the original doc's "poor network" concern, keep it lightweight):
   cache the last-fetched preparedness/awareness content in localStorage so those two screens still
   render something if the network call fails; show a small "showing saved content — you're offline"
   note in that case. Don't build a full offline queue for SOS in this prototype — just show a clear
   "couldn't send — check connection, tap to retry" state if POST /sos fails, matching section 0's honesty
   principle (don't silently pretend an offline SOS reached anyone).

4. Polish that matters for a pitch demo: loading skeletons (not blank white flashes), empty states with
   a friendly icon + one line of text (never a raw "[]"), toast confirmations, smooth route transitions.
   Add 3-4 small "trust" touches on the home screen (e.g., a small "24/7 monitored" badge, volunteer
   count if you can derive one from an endpoint, or just tasteful static copy) — this is what makes a
   prototype look production-minded to non-technical judges.

Acceptance test before you finish: as a guest with no login, complete a full SOS from home screen to
seeing the live status tracker update in real time when you (manually, via /docs or the authority app)
change its status on the backend. Zero console errors, zero broken images, works at both desktop and
narrow mobile-width viewport (this app must look like a phone app even running in a browser).
```

---

## 4. 🏍️ RESPONDER APP AGENT PROMPT

```
You are building the volunteer/responder-facing "Raksha Link" web app — think Rapido's or Swiggy's
Partner app, but for disaster response instead of rides/deliveries. This is one of three separate
frontend apps; you own ONLY the responder experience. Login is MANDATORY here (unlike the requester
app). Do not invent your own API shapes — everything below is fixed by the backend team.

TECH: React 18 + Vite + TypeScript, Tailwind CSS, React Router, Axios, TanStack Query, Leaflet +
react-leaflet-routing-machine (or plain react-leaflet with a manually drawn polyline from the
/sos/{id}/route response — routing machine is a nice-to-have, a drawn polyline is the requirement),
native WebSocket client. Runs on port 5174, backend at http://localhost:8000/api/v1 and
ws://localhost:8000/ws.

--- PASTE SECTION 0 (FROZEN CONTRACT) FROM ABOVE HERE BEFORE CONTINUING ---

DESIGN BRIEF FOR THIS APP SPECIFICALLY:
Energetic, mission-driven, "you're on shift" energy — like a delivery partner app, not a form-filling
government portal. Prominent Online/Offline toggle in the header at all times (green dot = online).
Assignment offers should feel like Rapido ride requests: a card that appears with a short countdown-style
urgency (no need for a literal countdown timer for the prototype, but visually treat it like a live
"new job" notification, not a passive list item). Use --color-primary heavily as the "on duty" color.

YOUR TASKS:

1. Screens/routes:
   - `/login` and `/register` — role hardcoded to VOLUNTEER. After first register, route straight into
     the enrollment flow below (a brand-new volunteer cannot skip this).
   - `/enroll` — the "become a responder" flow, required before anything else is usable:
       Step 1: Skills picker (multi-select chips: Medical, First Aid, Search & Rescue, Transportation,
               Food Distribution, Shelter Support, Communication).
       Step 2: ID verification — an upload field for a photo of a government ID (for the prototype,
               accept any image, no real OCR/verification — just store a stub URL and show a
               "submitted for review" state).
       Step 3: Training modules — list from GET /volunteers/training-modules, each opens a short
               reading screen with the module content, a "Mark as Complete" button calling
               POST /volunteers/training-modules/{id}/complete. Show a progress bar (training_completed_pct).
               Require ALL modules complete before allowing submission.
       Step 4: "Submit for Approval" — calls POST /volunteers/enroll with the collected skills +
               id_photo_url. Show a clear "Pending Authority Approval" waiting screen after this,
               with a short reassuring message ("An authority will review your application shortly").
     If the logged-in volunteer's status is already APPROVED (per the pre-seeded demo account), skip
     straight past this whole flow into the dashboard below.
   - `/` (Dashboard, once APPROVED) — Online/Offline toggle (calls PATCH /volunteers/me/availability,
     also pushes current geolocation on toggle-on and periodically while online), tabs for
     Available / Assigned / Active / Completed pulled from GET /assignments/me split by status, and an
     Alerts feed.
   - Incoming assignment: when a WebSocket "assignment.offered" event arrives for this volunteer, show
     a prominent modal/card — Type, Priority, Distance, People affected, [VIEW MAP] [ACCEPT] [DECLINE]
     — matching the doc's mockup exactly. Accept/decline calls PATCH /assignments/{id}/respond.
   - `/assignment/:id` — once accepted, this is the "Rapido navigation" screen: full-screen Leaflet map,
     current location marker (blue) and incident marker (the SOS's red pin), call
     GET /sos/{id}/route?from_lat=&from_lng= and draw the returned polyline, show distance_km/duration_min
     prominently at the top like a nav app, and list the turn-by-turn `steps` below or in a collapsible
     drawer. Big status-progress buttons at the bottom: "Mark On the Way" -> "Mark Arrived" ->
     "Mark Assistance Provided/Complete", each calling PATCH /assignments/{id}/status. Re-fetch/redraw
     the route if the volunteer's location changes meaningfully.
   - `/id-card` — the digital volunteer ID card, GET /volunteers/me/id-card (only reachable if
     APPROVED). Design this like a real ID badge: photo placeholder, name, volunteer_code (e.g.
     RL-VOL-000001), skill badges as small pills, "Verified Responder" seal/checkmark icon, issue date.
     This should look genuinely presentable — it's a strong pitch-deck screenshot ("we even give
     volunteers a verified badge") so put real design effort here: card-style with a subtle gradient
     using --color-primary, rounded corners, maybe a QR-code-shaped placeholder graphic (doesn't need
     to be scannable) to sell the "verified" feeling.
   - `/profile` — basic info, skills, a training-modules-completed summary, logout.

2. Geolocation: request permission on first toggle to "Online," and refresh current_lat/current_lng via
   PATCH /volunteers/me/availability every ~20-30s while online (a simple `setInterval`), stop when
   offline. Handle permission-denied gracefully with an inline message, don't crash the app.

3. WebSocket: subscribe on login, listen for "assignment.offered" (show the offer card/modal) and
   "assignment.updated"/"sos.status_changed" (keep the Assigned/Active tabs live without manual refresh).

4. Enforce the gating in the UI, not just trust the backend: if volunteer_status isn't APPROVED, the
   only reachable screens are `/enroll` (or its relevant step) and `/profile` — no dashboard, no
   assignments, matching the backend's own 403s so the UI never shows a broken/error state for this.

Acceptance test before you finish: log in as the pre-seeded APPROVED demo volunteer (skips enrollment),
go online, and — using the authority app or /docs to trigger an assignment — see the offer modal appear
live via websocket, accept it, see a real drawn route with distance/duration on the map, walk the status
through On the Way -> Arrived -> Complete, and confirm each step reflects instantly in the requester
app's tracker (cross-check with the requester agent's output once both exist). Also verify the
`/enroll` flow and `/id-card` screens look genuinely polished — these are the two screens most likely
to get a close look during a pitch.
```

---

## 5. 🗺️ AUTHORITY DASHBOARD AGENT PROMPT

```
You are building the authority/command-center web dashboard for "Raksha Link." This is the third of
three frontend apps. For this prototype, admin duties (approving volunteers, publishing content) are
folded into this same app as extra tabs — there is no separate admin app. Do not invent your own API
shapes — everything below is fixed by the backend team.

TECH: React 18 + Vite + TypeScript, Tailwind CSS, React Router, Axios, TanStack Query, Leaflet
(react-leaflet) for the live incident map, native WebSocket client. Runs on port 5175, backend at
http://localhost:8000/api/v1 and ws://localhost:8000/ws.

--- PASTE SECTION 0 (FROZEN CONTRACT) FROM ABOVE HERE BEFORE CONTINUING ---

DESIGN BRIEF FOR THIS APP SPECIFICALLY:
Dense, data-forward, "live ops center" feel — this is the screen that sells the whole system in a pitch,
since it's the one showing the most information at once. Dark sidebar navigation (use --color-text as
the sidebar background, white/light text) + light main content area using --color-bg. Use --color-danger
sparingly but decisively for HIGH priority rows/badges so they pop against the otherwise calm palette.
Real-time is the whole point of this screen — every list here should visibly update via websocket
without a manual refresh, and that "it just updates live" moment is what will impress people watching
a demo.

YOUR TASKS:

1. Login — role hardcoded to AUTHORITY, no self-registration link (authorities are pre-seeded/invited;
   just build the login form pointed at POST /auth/login).

2. Layout: persistent left sidebar with sections — Dashboard, SOS Queue, Live Map, Volunteers,
   Alerts, Shelters, Awareness & Preparedness (content management), Reports/Analytics. Top bar shows a
   live connection indicator (green dot "Live" once the websocket is connected) and the authority's name.

3. `/` Dashboard (overview) — four stat cards exactly like the doc's mockup: Active SOS count, High
   Priority count, Online Volunteers count, Active Alerts count (derive from GET /sos, GET /volunteers,
   GET /alerts), then the Live Incident Map (see below) embedded, then a compact "Active Emergency
   Requests" table below it (sos_id | type | priority badge | status badge), clicking a row opens the
   incident detail panel.

4. `/map` (and also embedded on Dashboard) — Leaflet map centered on the demo area (~11.34, 77.72),
   marker per active SOS (color-coded by priority: red=HIGH, orange=MEDIUM, gray=LOW), marker per
   online volunteer (small person icon, distinguish visually from SOS markers), marker per shelter.
   Clicking an SOS marker opens the same incident detail panel as the table row.

5. Incident detail panel/drawer (from Dashboard table or map): full SOS info (type, description, people
   affected, reporter name/phone or "Guest", photo if present, timestamp), a "Verify" action (PATCH
   status -> VERIFIED), a priority selector (PATCH status body can include priority per your backend's
   actual schema — coordinate priority setting through whichever field the backend exposes), and an
   "Assign Volunteer" section: call GET /volunteers/nearby?lat=&lng=&skill= to show a ranked top-5
   candidate list (name, distance_km, skills, online dot), pick one, POST /sos/{id}/assign. After
   assignment, show live status as the volunteer progresses (On the Way / Arrived / Provided / Resolved)
   via the same websocket events used elsewhere.

6. `/sos` (full queue) — sortable/filterable table (by status, priority, type), same detail panel on
   row click. New SOS should visibly slide/flash in when a "sos.created" websocket event arrives —
   this live-arrival moment is a key demo beat, make it noticeable but not obnoxious.

7. `/volunteers` — table of all volunteers (GET /volunteers), filter by status. A "Pending Approval"
   tab is the important one: show applicant name, skills, training_completed_pct, submitted ID photo
   thumbnail, with big Approve/Reject buttons calling PATCH /volunteers/{id}/approve. This is effectively
   your "admin" screen for volunteer vetting — treat it as a first-class feature, not an afterthought,
   since "authorities vet every responder" is a key trust point when pitching this.

8. `/alerts` — list of GET /alerts plus a "Broadcast New Alert" form (title, message, severity, area) ->
   POST /alerts, which should also visibly hit the requester app's alert banner live via websocket if
   you're demoing both together.

9. `/shelters` — simple list/table + add-new form (GET/POST /shelters), shown also as markers on the map.

10. `/content` (Awareness & Preparedness management — the folded-in "admin" tab) — two simple sub-tabs:
    a list + create-form for awareness content (POST /awareness) and for preparedness guides
    (POST /preparedness), each scoped to a disaster type dropdown (GET /disasters). Keep this simple —
    a table plus a modal form is enough, this is the lowest-priority screen for the demo, don't
    over-invest here.

11. `/reports` — a lightweight analytics view: total SOS by status (simple bar chart, any small charting
    lib like `recharts` is fine), average time-to-resolve if you can compute it from timestamps, count
    of volunteers by status. This exists to make the pitch feel like a real product with visibility, not
    just an operational tool — a few clean charts go a long way here, don't over-build it.

Acceptance test before you finish: log in as the seeded authority, watch a guest-submitted SOS from the
requester app arrive live on both the queue and the map, open it, verify it, assign it to the nearest
approved+online volunteer via /volunteers/nearby, watch the responder app (once built) accept it and
progress through statuses live on this dashboard, and separately confirm you can approve the
PENDING_APPROVAL demo volunteer from the Volunteers tab. Zero console errors, every list updates live
without a manual page refresh.
```

---

## 6. Suggested build & demo order

```
1. Database agent finishes and is verified with the acceptance test.
2. Backend agent finishes against the real DB, verified with the acceptance test (use /docs heavily).
3. Run all three frontend agents in parallel — they only need the backend running, not each other.
4. Integration pass (you, not an agent): open all three apps side by side and walk the exact demo
   script from section 31 of the original doc:
     Phone/tab 1 (Requester) -> submits SOS -> Tab 2 (Authority) sees it live, verifies, assigns ->
     Tab 3 (Responder) gets the offer, accepts, navigates, updates status -> Tab 2 updates live ->
     Tab 1's tracker updates live to "Resolved."
   If every hop in that chain updates without a manual refresh, the prototype is demo-ready.
```
