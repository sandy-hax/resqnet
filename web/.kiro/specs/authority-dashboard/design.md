# Design Document — Raksha Link Command Center (Authority Dashboard)

## Overview

The Authority Dashboard is a React 18 + Vite + TypeScript single-page application served on port 5175. It provides five core modules for Authority users (Dispatchers/Coordinators): a real-time Overview with incident map and emergency table, an SOS Verification & Directing panel, an Awareness & Preparedness content management interface, a Teams Directory, and a Reports & Analytics page. Data is fetched from a FastAPI backend at `http://localhost:8000/api/v1` via Axios + TanStack Query and streamed in real time via a native WebSocket at `ws://localhost:8000/ws`.

---

## Project Folder Structure

```
web/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── src/
    ├── main.tsx                   # Entry: ReactDOM.createRoot, providers
    ├── App.tsx                    # Router, route tree, ErrorBoundary
    ├── index.css                  # CSS custom properties, Tailwind base
    │
    ├── api/
    │   └── axiosInstance.ts       # Axios instance, auth + 401 interceptors
    │
    ├── contexts/
    │   ├── AuthContext.tsx        # JWT state, login/logout, token helpers
    │   └── WebSocketContext.tsx   # WS connection, event emitter, backoff
    │
    ├── hooks/
    │   ├── useAuth.ts             # Consumes AuthContext
    │   ├── useWebSocket.ts        # Consumes WebSocketContext
    │   ├── useSOS.ts              # TanStack Query hooks for SOS endpoints
    │   ├── useTeams.ts            # TanStack Query hooks for teams endpoints
    │   ├── useContent.ts          # TanStack Query hooks for content endpoints
    │   ├── useReports.ts          # TanStack Query hooks for analytics endpoints
    │   └── useOverview.ts         # TanStack Query hooks for overview metrics
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx       # Sidebar + main area wrapper
    │   │   ├── Sidebar.tsx        # Nav links, brand, WS status indicator
    │   │   └── NavLink.tsx        # Active-state aware nav item
    │   ├── common/
    │   │   ├── ProtectedRoute.tsx # JWT guard, redirect to /login
    │   │   ├── ErrorBoundary.tsx  # React class error boundary
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── SkeletonLoader.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorState.tsx     # Error message + Retry button
    │   │   └── ErrorBanner.tsx    # Non-blocking top banner
    │   ├── map/
    │   │   ├── IncidentMap.tsx    # react-leaflet Map, SOS/team/shelter layers
    │   │   ├── SOSPin.tsx         # Color-coded CircleMarker + Popup
    │   │   ├── TeamMarker.tsx     # Distinct icon marker for teams
    │   │   └── ShelterMarker.tsx  # Distinct icon marker for shelters
    │   └── charts/
    │       ├── FrequencyChart.tsx       # Recharts BarChart — disaster type
    │       ├── DispatchTimeChart.tsx    # Recharts BarChart — time-to-dispatch
    │       ├── ResolutionTimeChart.tsx  # Recharts LineChart — resolution times
    │       └── UtilizationChart.tsx     # Recharts BarChart — team utilization
    │
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── OverviewPage.tsx
    │   ├── SOSPage.tsx
    │   ├── ContentPage.tsx
    │   ├── TeamsPage.tsx
    │   └── ReportsPage.tsx
    │
    ├── types/
    │   ├── auth.ts
    │   ├── sos.ts
    │   ├── teams.ts
    │   ├── content.ts
    │   └── reports.ts
    │
    └── utils/
        ├── severityColor.ts       # SOS severity → hex color mapping
        ├── statusColor.ts         # Team status → Tailwind class mapping
        └── formatters.ts          # Date/time, distance, percentage formatters
```

---

## Architecture

### Component Hierarchy

```
main.tsx
└── QueryClientProvider (TanStack Query)
    └── AuthProvider (AuthContext)
        └── WebSocketProvider (WebSocketContext)
            └── BrowserRouter
                └── App.tsx
                    ├── Route /login → LoginPage
                    └── ProtectedRoute
                        └── AppShell (Sidebar + Outlet)
                            ├── Route / → OverviewPage
                            ├── Route /sos → SOSPage
                            ├── Route /content → ContentPage
                            ├── Route /teams → TeamsPage
                            └── Route /reports → ReportsPage
```

Every page-level component is wrapped in `React.Suspense` and a per-page `ErrorBoundary` to prevent blank screens (Requirement 9.4).

---

## Core Modules

### 1. Auth Context & Hook

**File:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

**Behavior:**
- On mount, reads `token` from `localStorage` and decodes the JWT payload to populate `user`.
- `login()` calls `POST /api/v1/auth/login`, stores the returned JWT in `localStorage`, sets `token` in state, and triggers navigation to `/`.
- `logout()` removes the token from `localStorage`, clears state, and redirects to `/login`.
- Exposes `isAuthenticated` (boolean) derived from a non-null, non-expired token.

**File:** `src/hooks/useAuth.ts`

```typescript
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Types** (`src/types/auth.ts`):

```typescript
export interface AuthUser {
  id: string;
  username: string;
  role: 'dispatcher' | 'coordinator';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}
```

---

### 2. Axios Instance with Auth Interceptors

**File:** `src/api/axiosInstance.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
```

All TanStack Query hooks import this `api` instance. The base URL is configurable via `VITE_API_BASE_URL` for different deployment environments.

---

### 3. WebSocket Context Provider

**File:** `src/contexts/WebSocketContext.tsx`

```typescript
interface WebSocketContextValue {
  connected: boolean;
  on: (event: string, handler: (payload: unknown) => void) => () => void;
  off: (event: string, handler: (payload: unknown) => void) => void;
}
```

**Connection lifecycle:**
- Connects to `ws://localhost:8000/ws` (configurable via `VITE_WS_URL`) only when `isAuthenticated` is `true`.
- Closes and nullifies the socket on logout or when `isAuthenticated` becomes `false`.
- Sets `connected: true` on `onopen`, `connected: false` on `onclose`/`onerror`.

**Reconnection with exponential backoff:**

```typescript
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS  = 30_000;
const MAX_ATTEMPTS  = 10;

function getBackoffDelay(attempt: number): number {
  // attempt is 1-indexed
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
}
```

On disconnect (non-clean close), schedules the next attempt using `setTimeout(connect, getBackoffDelay(attempt))`. Resets attempt counter on a clean open. Stops retrying after `MAX_ATTEMPTS`.

**Event routing:**
- Incoming messages are parsed as `{ event: string; data: unknown }`.
- A `Map<string, Set<Handler>>` stores listeners. `on(event, handler)` registers and returns an unsubscribe function.
- Consumers (pages, hooks) call `on('sos.created', ...)` and clean up in `useEffect` return.

**File:** `src/hooks/useWebSocket.ts`

```typescript
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
}
```

---

### 4. Protected Route Component

**File:** `src/components/common/ProtectedRoute.tsx`

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
```

Placed as the parent route for all authenticated routes in `App.tsx`. Any navigation to `/`, `/sos`, `/content`, `/teams`, or `/reports` without a valid JWT redirects to `/login`.

---

## Data Models

### 5. Data Models

**`src/types/sos.ts`**

```typescript
export type SOSSeverity = 'high' | 'medium' | 'low';
export type SOSStatus   = 'pending' | 'verified' | 'rejected' | 'resolved';

export interface SOSRecord {
  id: string;
  type: string;
  severity: SOSSeverity;
  location: { lat: number; lng: number; address: string };
  status: SOSStatus;
  reported_at: string;          // ISO 8601
  description: string;
  submitter_notes?: string;
  photo_url?: string;
}

export interface NearbyTeam {
  id: string;
  name: string;
  type: string;
  distance_km: number;
  specializations: string[];
}
```

**`src/types/teams.ts`**

```typescript
export type TeamStatus = 'available' | 'standby' | 'deployed';

export interface Team {
  id: string;
  name: string;
  type: string;
  specializations: string[];
  past_experience: string;
  operational_status: TeamStatus;
  active_assignments: number;
  contact: string;
}
```

**`src/types/content.ts`**

```typescript
export interface Campaign {
  id: string;
  title: string;
  body: string;
  target_region: string;
  image_url?: string;
  published_at: string;
}

export interface Guide {
  id: string;
  title: string;
  disaster_type: string;
  before: string;
  during: string;
  after: string;
  published_at: string;
}

export interface Broadcast {
  id: string;
  message: string;
  regions: string[];
  published_at: string;
}
```

**`src/types/reports.ts`**

```typescript
export type TimeRange = '7d' | '30d' | '90d';

export interface FrequencyDataPoint {
  disaster_type: string;
  count: number;
}

export interface DispatchTimeDataPoint {
  disaster_type: string;
  avg_minutes: number;
}

export interface ResolutionTimeDataPoint {
  disaster_type: string;
  avg_hours: number;
}

export interface UtilizationDataPoint {
  team_name: string;
  utilization_pct: number;
}
```

---

## Components and Interfaces

### 6. Page & Component Architecture

#### 6.1 — `LoginPage`

- Controlled form: `username`, `password` fields.
- Submit calls `useAuth().login()`. Shows inline error on failure (password field preserved).
- On success, `login()` internally calls `navigate('/')`.

#### 6.2 — `AppShell` + `Sidebar`

`AppShell` renders the persistent 2-column layout: `Sidebar` (fixed width, `bg-[#1A2233]`) + `<main>` with `<Outlet />`.

`Sidebar` renders:
- Brand heading: "Raksha Link — Command Center" (Inter font).
- `NavLink` for each of the 5 routes; uses `useMatch` / `NavLink` from React Router for active detection.
- WS status indicator at the bottom: `useWebSocket().connected` drives the green/red dot and "Connected"/"Disconnected" label.

`NavLink` wraps React Router's `<NavLink>` with active class injection for visual highlight.

#### 6.3 — `OverviewPage`

```
OverviewPage
├── MetricCardsRow
│   ├── MetricCard (Active SOS)
│   ├── MetricCard (High Priority SOS)
│   ├── MetricCard (Active Teams On Duty)
│   └── MetricCard (Published Regional Alerts)
├── IncidentMap
│   ├── SOSPin × N
│   ├── TeamMarker × M
│   └── ShelterMarker × K
└── EmergencyTable
```

**Data flow:**
- `useOverview` hook: `useQuery(['overview-metrics'], () => api.get('/overview'))`. Returns counts for the four metric cards.
- `useWebSocket().on('sos.created', ...)` in `OverviewPage` updates a local `useState` list of SOS records, prepending the new record and incrementing the Active SOS count locally.
- `IncidentMap` receives the SOS list; `SOSPin` derives color from `severityColor(sos.severity)`.
- `EmergencyTable` renders columns: ID, Type, Severity, Location, Status, Reported At.

**Error/loading:** `useQuery` loading → `<SkeletonLoader />`. Network failure on load → `<ErrorBanner />` with previously cached data via TanStack Query `staleTime`.

#### 6.4 — `SOSPage` (SOS Verification & Directing)

```
SOSPage
├── SOSTable (left panel)
│   └── SOSRow × N (selectable)
└── InspectionPanel (right panel, shown when row selected)
    ├── SOSDetail (notes, description, photo, mini-map)
    ├── ActionButtons (VERIFIED / REJECTED, disabled during mutation)
    └── TeamAssignSection
        ├── NearbyTeamList
        └── AssignButton (disabled during mutation)
```

**Data flow:**
- `useSOS` hook: `useQuery(['sos-list'], () => api.get('/sos'))`.
- `useVerifySOS` / `useRejectSOS`: `useMutation` calling `PATCH /sos/{id}`. On success, invalidates `['sos-list']` and updates optimistic local state.
- Team assignment: `useNearbyTeams(lat, lng, skill)` — `useQuery` enabled only when `assignMode` is active.
- `useAssignTeam`: `useMutation` calling `POST /sos/{id}/assign`.
- Button `disabled` tied to `mutation.isPending`.

#### 6.5 — `ContentPage` (Awareness & Preparedness)

```
ContentPage
├── CampaignSection
│   ├── CampaignForm (title, body, region, image upload)
│   └── CampaignList
├── GuideSection
│   ├── GuideForm (title, disaster_type, before, during, after)
│   └── GuideList
└── BroadcastPanel
    ├── BroadcastForm (message, region multi-select)
    └── BroadcastButton
```

- All three forms use a shared `useFormValidation` pattern — empty required fields surface field-level errors, block submission.
- `useContent` hook: separate `useMutation` calls for campaign, guide, and broadcast endpoints. On 2xx, appends to the respective list. On error, preserves form state and shows inline error.
- `VITE_REGIONS` env var provides the predefined regions list; falls back to a static array.

#### 6.6 — `TeamsPage` (Teams Directory)

```
TeamsPage
├── FilterBar (Type dropdown, Status dropdown)
├── TeamsTable
│   └── TeamRow × N (expandable)
└── TeamDetailDrawer (shown when row selected)
    ├── TeamInfo (full details, assignments, contact)
    └── CloseButton
```

**Data flow:**
- `useTeams` hook: `useQuery(['teams'], () => api.get('/teams'))`.
- Filter state (`selectedType`, `selectedStatus`) drives client-side filtering of the full team list — no extra API calls for filtering.
- `statusColor(team.operational_status)` returns the Tailwind class for the status indicator dot.
- On network failure: `<ErrorState message="..." onRetry={() => refetch()} />`.

#### 6.7 — `ReportsPage` (Reports & Analytics)

```
ReportsPage
├── TimeRangeSelector (7d / 30d / 90d)
├── FrequencyChart
├── DispatchTimeChart
├── ResolutionTimeChart
└── UtilizationChart
```

**Data flow:**
- `useReports(timeRange)` hook wraps four `useQuery` calls: `frequency`, `dispatch_time`, `resolution_time`, `utilization` — all keyed on `timeRange`.
- Selecting a new range invalidates and re-fetches all four queries.
- Empty arrays → `<EmptyState message="No data available" />` rendered inside each chart wrapper.
- Loading → `<SkeletonLoader height="250px" />` in each chart area.

---

### 7. Utility Functions

**`src/utils/severityColor.ts`**

```typescript
export function severityColor(severity: SOSSeverity): string {
  return { high: '#EF4444', medium: '#F97316', low: '#9CA3AF' }[severity];
}
```

**`src/utils/statusColor.ts`**

```typescript
export function statusColorClass(status: TeamStatus): string {
  return {
    available: 'text-green-400',
    standby:   'text-yellow-400',
    deployed:  'text-red-400',
  }[status];
}
```

**`src/utils/formatters.ts`**

```typescript
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export const formatDistance = (km: number): string => `${km.toFixed(1)} km`;
```

---

### 8. CSS Custom Properties

Defined globally in `src/index.css`:

```css
:root {
  --color-bg:      #0F1623;
  --color-surface: #1E2D3D;
  --color-sidebar: #1A2233;
  --color-primary: #3B82F6;
  --color-danger:  #EF4444;
  --color-warning: #F97316;
  --color-success: #22C55E;
  --color-border:  #2E3D4F;
}
```

Tailwind config extends these as CSS variables so they can be used as `bg-[var(--color-bg)]` or through extended theme tokens.

---

### 9. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend REST base |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | WebSocket endpoint |
| `VITE_PORT` | `5175` | Vite dev server port |

Configured in `.env.local` for development; documented in `README.md` for production deployment.

---

## Error Handling

### 10. Error Handling Strategy

| Scenario | Handling |
|---|---|
| Login failure (non-2xx) | Inline error below form; password not cleared |
| API 401 (token expired) | Axios interceptor clears token, redirects to `/login` |
| Logout | `logout()` clears token, redirects to `/login` |
| TanStack Query fetch failure | `<ErrorState>` with Retry triggers `refetch()` |
| Page load network failure | `<ErrorBanner>` non-blocking + stale cache rendered |
| WebSocket disconnect | Exponential backoff reconnect; sidebar shows Disconnected |
| Content form validation failure | Field-level errors; form data preserved |
| Mutation non-2xx response | Inline error in panel/form; panel stays open |
| Unhandled runtime error | `ErrorBoundary` catches render errors; shows fallback UI |

---

## Testing Strategy

The dashboard uses a dual-layer testing approach:

**Unit / Example-based tests** cover:
- `LoginPage` form interactions (success, failure, password preservation)
- `AppShell` sidebar rendering (brand text, all 5 nav links present)
- `IncidentMap` rendering with mock SOS/team/shelter data
- `InspectionPanel` display on row selection
- `TeamDetailDrawer` expand behavior
- WebSocket `connected` / `disconnected` status indicator
- Recharts chart components with mock analytics data
- Empty state and error state component rendering

**Property-based tests** (minimum 100 iterations each via fast-check) cover:
- Protected route redirect for any unauthenticated route path
- Authorization header presence on any outgoing request
- Active nav link invariant across all routes
- `sos.created` event prepending to Emergency Table for any payload shape
- Exponential backoff delay for reconnect attempts 1–10
- SOS pin color mapping for any severity value
- Emergency Table column completeness for any SOS record list
- Status update PATCH payload correctness for any record id and target status
- Nearby team query parameter correctness for any SOS coordinates
- Action button disabled state during any pending mutation
- Content form validation for any combination of empty required fields
- Teams Table column completeness for any team list
- Team status indicator color mapping for any operational_status value
- Team filter correctness for any Type × Status filter combination
- Time range filter triggering re-fetch for all four chart queries
- Loading state indicator for any loading query
- Error state with Retry for any failed query
- Empty state rendering for any empty list response

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Protected Routes Require Authentication

*For any* route path in the set `["/", "/sos", "/content", "/teams", "/reports"]`, attempting to render that route without a valid JWT in `localStorage` shall result in a redirect to `/login`, and the route's page content shall not be rendered.

**Validates: Requirements 1.1**

---

### Property 2: Authorization Header Invariant

*For any* outgoing HTTP request made by the Axios instance while a JWT is stored in `localStorage`, the `Authorization` header of that request shall equal `"Bearer <token>"` where `<token>` is the exact string stored in `localStorage` under key `auth_token`.

**Validates: Requirements 1.4**

---

### Property 3: Active Navigation Link Invariant

*For any* route in the navigation set `["/", "/sos", "/content", "/teams", "/reports"]`, after navigating to that route, exactly one navigation link — the one corresponding to that route — shall have the active visual style applied, and all other navigation links shall not have the active style.

**Validates: Requirements 2.3**

---

### Property 4: WebSocket SOS Event Updates Table

*For any* valid `sos.created` WebSocket message payload conforming to the `SOSRecord` type, after the message is received while on the Overview page, the Emergency Table shall contain a new first row whose ID, Type, Severity, Location, Status, and Reported At values match those in the received payload.

**Validates: Requirements 3.2, 4.8**

---

### Property 5: Exponential Backoff Schedule

*For any* WebSocket reconnection attempt number `n` in the range `[1, 10]`, the delay before that attempt shall equal `min(1000 * 2^(n-1), 30000)` milliseconds, and no further reconnection shall be attempted after attempt 10.

**Validates: Requirements 3.4**

---

### Property 6: SOS Pin Color Corresponds to Severity

*For any* `SOSRecord` rendered as a pin on the Incident Map, the pin's fill color shall equal `#EF4444` when `severity` is `"high"`, `#F97316` when `severity` is `"medium"`, and `#9CA3AF` when `severity` is `"low"`.

**Validates: Requirements 4.4**

---

### Property 7: Emergency Table Displays All Required Columns

*For any* non-empty list of `SOSRecord` objects returned by the API, the Emergency Table shall render a row for each record containing all six required columns: ID, Type, Severity, Location, Status, and Reported At — with values matching the corresponding fields of the record.

**Validates: Requirements 4.7, 5.1**

---

### Property 8: SOS Status Update Sends Correct Payload

*For any* `SOSRecord` and any target status `s` in `{"verified", "rejected"}`, clicking the button corresponding to `s` in the Inspection Panel shall dispatch exactly one `PATCH /api/v1/sos/{id}` request with body `{ "status": s }`, and upon a 2xx response the record's displayed status shall update to `s`.

**Validates: Requirements 5.3, 5.4**

---

### Property 9: Nearby Team Query Uses SOS Coordinates

*For any* `SOSRecord` with coordinates `(lat, lng)` and type `skill`, activating the team assignment flow for that record shall issue a `GET /api/v1/volunteers/nearby` request with query parameters `lat={lat}`, `lng={lng}`, and `skill={skill}` matching the record's values exactly.

**Validates: Requirements 5.5**

---

### Property 10: Action Buttons Disabled During Pending Mutation

*For any* in-flight mutation (verify, reject, or assign) on an SOS record, all action buttons within the Inspection Panel for that record shall have the `disabled` attribute and a loading indicator shall be visible until the mutation settles (resolves or rejects).

**Validates: Requirements 5.8**

---

### Property 11: Content Form Validation Blocks Submission on Empty Required Fields

*For any* content form (Campaign, Guide, or Broadcast) and any non-empty subset of its required fields left blank, attempting to submit the form shall not dispatch an API request, and each empty required field shall display a field-level validation error message.

**Validates: Requirements 6.7**

---

### Property 12: Teams Table Displays All Required Columns

*For any* non-empty list of `Team` objects returned by the API, the Teams Table shall render a row for each team containing all six required columns: Team Name, Type, Specializations, Past Experience, Operational Status, and Active Assignments — with values matching the corresponding fields of the team.

**Validates: Requirements 7.1**

---

### Property 13: Team Status Indicator Color Invariant

*For any* `Team` record rendered in the Teams Table, its operational status indicator color class shall equal `text-green-400` when `operational_status` is `"available"`, `text-yellow-400` when `"standby"`, and `text-red-400` when `"deployed"`.

**Validates: Requirements 7.2**

---

### Property 14: Team Filter Correctness

*For any* combination of active Type filter `t` and Status filter `s` applied to the Teams Table, every row visible in the table shall satisfy: `team.type === t` (when `t` is not "All") AND `team.operational_status === s` (when `s` is not "All"). No team that fails either active filter criterion shall appear in the table.

**Validates: Requirements 7.3**

---

### Property 15: Time Range Filter Re-fetches All Charts

*For any* selectable time range value `r` in `["7d", "30d", "90d"]`, selecting `r` in the Reports page time range control shall trigger API requests for all four analytics endpoints (`frequency`, `dispatch_time`, `resolution_time`, `utilization`) each including `r` as a query parameter, and all four charts shall re-render with the returned data.

**Validates: Requirements 8.5**

---

### Property 16: Loading State Shows Indicator

*For any* TanStack Query that is in a `loading` or `fetching` state, the content area that depends on that query shall render either a skeleton loader or a spinner and shall not render the data content until the query resolves successfully.

**Validates: Requirements 9.1**

---

### Property 17: Failed Query Shows Error State with Retry

*For any* TanStack Query that transitions to an `error` state, the corresponding content area shall render an error state component containing a descriptive error message and a "Retry" button; clicking the Retry button shall call `refetch()` on that query.

**Validates: Requirements 9.2**

---

### Property 18: Empty API Response Shows Context-Appropriate Empty State

*For any* data list query that returns an empty array `[]`, the component rendering that list shall display an empty state message or illustration specific to that page's context (e.g., "No active SOS calls" on the Overview page, "No teams found" on the Teams page) and shall not render a blank content area.

**Validates: Requirements 9.3**
