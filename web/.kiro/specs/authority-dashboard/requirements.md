# Requirements Document

## Introduction

Raksha Link Command Center is a web dashboard for AUTHORITY users (Dispatchers/Coordinators) to monitor, verify, and respond to disaster distress calls in real time. The application connects to a FastAPI backend (port 8000) and a PostgreSQL database (port 5432), exposes itself on port 5175, and uses WebSocket for live data updates. It provides five core modules: Overview (live metrics and incident map), SOS Verification & Directing, Awareness & Preparedness content management, Teams Directory, and Reports & Analytics.

## Glossary

- **Authority**: A logged-in Dispatcher or Coordinator user with administrative privileges to verify SOS calls, assign teams, and publish content.
- **Dashboard**: The React + Vite + TypeScript single-page application served on port 5175.
- **Backend**: The FastAPI service served at `http://localhost:8000/api/v1`.
- **WebSocket**: The persistent connection at `ws://localhost:8000/ws` used for real-time event streaming.
- **SOS**: A distress call submitted by a citizen, containing location coordinates, description, optional photo, and severity.
- **Team**: A registered disaster management unit (e.g., NDRF, Fire Brigade) with specializations, operational status, and active assignments.
- **Alert**: A regional broadcast message published by an Authority and delivered to citizen applications via WebSocket.
- **JWT**: JSON Web Token used to authenticate Authority sessions.
- **Incident Map**: A Leaflet-based map displaying SOS pins color-coded by severity and overlaying active teams and relief shelters.
- **TanStack Query**: The data-fetching and caching library used for all REST API calls.
- **Recharts**: The charting library used for analytics visualizations.

---

## Requirements

### Requirement 1 — Authentication

**User Story:** As an Authority user, I want to log in with my credentials so that only authorized personnel can access the Command Center.

#### Acceptance Criteria

1. THE Dashboard SHALL present a login form requesting a username and password before granting access to any protected route.
2. WHEN an Authority submits valid credentials, THE Dashboard SHALL request a JWT from `POST /api/v1/auth/login`, store the token in `localStorage`, and redirect to the Overview page (`/`).
3. IF the Backend returns a non-2xx response on login, THEN THE Dashboard SHALL display an inline error message describing the failure without clearing the password field.
4. WHILE a valid JWT is present in `localStorage`, THE Dashboard SHALL attach it as a `Bearer` token in the `Authorization` header of every API request.
5. WHEN the JWT expires or the Backend returns HTTP 401, THE Dashboard SHALL clear the stored token and redirect the Authority to the login page.
6. WHEN an Authority clicks "Logout", THE Dashboard SHALL remove the JWT from `localStorage` and redirect to the login page.

---

### Requirement 2 — Layout & Navigation

**User Story:** As an Authority user, I want a consistent dark sidebar navigation so that I can move between modules without losing context.

#### Acceptance Criteria

1. THE Dashboard SHALL render a persistent dark sidebar (background `#1A2233`) containing navigation links to Overview (`/`), SOS Verification (`/sos`), Awareness & Preparedness (`/content`), Teams Directory (`/teams`), and Reports & Analytics (`/reports`).
2. THE Dashboard SHALL display the brand name "Raksha Link — Command Center" at the top of the sidebar using the Inter font from Google Fonts.
3. WHEN an Authority navigates to a route, THE Dashboard SHALL highlight the active navigation link visually to indicate the current location.
4. THE Dashboard SHALL apply the defined CSS custom properties (`--color-bg`, `--color-surface`, `--color-sidebar`, `--color-primary`, `--color-danger`, `--color-warning`, `--color-success`, `--color-border`) globally across all pages.
5. THE Dashboard SHALL use a high-density data layout with compact spacing and Tailwind CSS utility classes throughout all pages.

---

### Requirement 3 — WebSocket Connection

**User Story:** As an Authority user, I want live data pushed to my screen so that I always see the most current emergency status without manual refreshing.

#### Acceptance Criteria

1. THE Dashboard SHALL establish a native WebSocket connection to `ws://localhost:8000/ws` immediately after a successful login.
2. WHILE the WebSocket connection is open, THE Dashboard SHALL listen for `sos.created` events and add the new SOS record to the Emergency Table on the Overview page without a full page reload.
3. WHILE the WebSocket connection is open, THE Dashboard SHALL listen for `alert.broadcast` events and reflect the published alert status in the UI.
4. IF the WebSocket connection is lost, THEN THE Dashboard SHALL attempt reconnection with exponential backoff (initial delay 1 second, maximum delay 30 seconds, maximum 10 attempts).
5. THE Dashboard SHALL display a live telemetry status indicator in the sidebar showing "Connected" (green) or "Disconnected" (red) based on the current WebSocket state.

---

### Requirement 4 — Overview Command Operations

**User Story:** As an Authority user, I want a real-time overview of all active emergencies, team statuses, and regional alerts so that I can assess the situation at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display four metric cards on the Overview page: Active SOS count, High Priority SOS count, Active Teams On Duty count, and Published Regional Alerts count, each fetched from the Backend on page load.
2. WHEN a `sos.created` WebSocket event is received, THE Dashboard SHALL increment the Active SOS metric card count without requiring a page reload.
3. THE Dashboard SHALL render an Incident Map using `react-leaflet` centered on the geographic region covered by current SOS records.
4. THE Dashboard SHALL render SOS pins on the Incident Map color-coded as red for High severity, orange for Medium severity, and gray for Low severity.
5. THE Dashboard SHALL render active team markers and relief shelter markers as distinct icon types on the Incident Map.
6. WHEN an Authority clicks an SOS pin on the Incident Map, THE Dashboard SHALL display a popup with the SOS identifier, severity, description, and a link to the SOS Verification page for that record.
7. THE Dashboard SHALL render a Dynamic Emergency Table below the metric cards listing all active SOS records with columns: ID, Type, Severity, Location, Status, Reported At.
8. WHEN a `sos.created` WebSocket event is received, THE Dashboard SHALL prepend the new SOS row to the top of the Emergency Table without a full page reload.
9. IF the Backend is unreachable on page load, THEN THE Dashboard SHALL display a non-blocking error banner and render previously cached data where available.

---

### Requirement 5 — SOS Verification & Directing

**User Story:** As an Authority user, I want to inspect each SOS call, verify its legitimacy, and assign the nearest qualified team so that resources are dispatched accurately.

#### Acceptance Criteria

1. THE Dashboard SHALL fetch and display all SOS records via `GET /api/v1/sos` on the SOS Verification page, with columns: ID, Type, Severity, Location, Status, Reported At, and a Detail action.
2. WHEN an Authority selects an SOS record, THE Dashboard SHALL display a Legitimacy Inspection panel showing: submitter notes, full description, attached photo (if present), and a map pin for the reported location.
3. THE Dashboard SHALL provide a "VERIFIED" button that sends `PATCH /api/v1/sos/{id}` with status `verified` and updates the record's displayed status immediately upon a 2xx response.
4. THE Dashboard SHALL provide a "REJECTED" button that sends `PATCH /api/v1/sos/{id}` with status `rejected` and updates the record's displayed status immediately upon a 2xx response.
5. WHEN an Authority chooses to assign a team, THE Dashboard SHALL call `GET /api/v1/volunteers/nearby?lat={lat}&lng={lng}&skill={skill}` using the SOS coordinates and display a list of nearby teams sorted by proximity.
6. WHEN an Authority selects a team from the nearby list, THE Dashboard SHALL send `POST /api/v1/sos/{id}/assign` with the selected team identifier and display a success confirmation on a 2xx response.
7. IF the assign request returns a non-2xx response, THEN THE Dashboard SHALL display an inline error message within the Legitimacy Inspection panel without closing the panel.
8. WHILE a verification or assignment request is in-flight, THE Dashboard SHALL disable the relevant action buttons and show a loading indicator.

---

### Requirement 6 — Awareness & Preparedness Content Management

**User Story:** As an Authority user, I want to create and publish awareness campaigns, preparedness guides, and regional broadcasts so that citizens receive timely safety information.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a form on the Awareness & Preparedness page to create an Awareness Campaign with fields: title, body content, target region, and an optional image upload.
2. THE Dashboard SHALL provide a form to create a Preparedness Guide with fields: title, disaster type, and three structured sections: Before, During, and After.
3. WHEN an Authority submits a valid Awareness Campaign form, THE Dashboard SHALL send the campaign data to the Backend and display the newly published campaign in a list below the form upon a 2xx response.
4. WHEN an Authority submits a valid Preparedness Guide form, THE Dashboard SHALL send the guide data to the Backend and display the newly published guide in a list below the form upon a 2xx response.
5. THE Dashboard SHALL provide a Regional Broadcast panel allowing an Authority to compose a broadcast message and select one or more target regions from a predefined list.
6. WHEN an Authority publishes a Regional Broadcast, THE Dashboard SHALL send the broadcast data to the Backend, which triggers an `alert.broadcast` WebSocket event to connected citizen applications.
7. IF a content submission form contains empty required fields, THEN THE Dashboard SHALL display field-level validation errors and prevent form submission.
8. IF the Backend returns a non-2xx response on content submission, THEN THE Dashboard SHALL display an error message without clearing the form data.

---

### Requirement 7 — Teams Directory

**User Story:** As an Authority user, I want to view all registered disaster management teams with their capabilities and current status so that I can make informed dispatch decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL fetch and display all registered teams via the Backend on the Teams Directory page with columns: Team Name, Type (e.g., NDRF, Fire), Specializations, Past Experience, Operational Status, and Active Assignments.
2. THE Dashboard SHALL visually distinguish team operational statuses using color indicators: green for Available, yellow for Standby, and red for Deployed.
3. THE Dashboard SHALL support filtering the teams list by Type and by Operational Status using dropdown controls.
4. WHEN an Authority clicks a team row, THE Dashboard SHALL expand or navigate to a detail view showing full team information including all active assignments and contact details.
5. IF the Backend is unreachable when loading the Teams Directory, THEN THE Dashboard SHALL display an error message and a retry button.

---

### Requirement 8 — Reports & Analytics

**User Story:** As an Authority user, I want visualized analytics on emergency frequency, dispatch times, and team utilization so that I can identify patterns and improve response strategies.

#### Acceptance Criteria

1. THE Dashboard SHALL render a bar chart using Recharts on the Reports page showing emergency frequency grouped by disaster type over a selectable time range.
2. THE Dashboard SHALL render a line or bar chart showing average time-to-dispatch (time from SOS creation to team assignment) for each disaster type.
3. THE Dashboard SHALL render a chart showing average resolution times (time from SOS creation to resolution) per disaster type.
4. THE Dashboard SHALL render a chart showing team resource utilization (percentage of time teams are in Deployed status) per team.
5. THE Dashboard SHALL provide time range filter controls (e.g., Last 7 days, Last 30 days, Last 90 days) that re-fetch analytics data from the Backend and re-render all charts.
6. IF the Backend returns no data for a selected time range, THEN THE Dashboard SHALL display a "No data available" message inside each chart area.

---

### Requirement 9 — Loading, Error, and Empty States

**User Story:** As an Authority user, I want clear visual feedback during data loading and error conditions so that I am never left uncertain about the application's state.

#### Acceptance Criteria

1. WHILE any TanStack Query fetch is in a loading state, THE Dashboard SHALL display a skeleton loader or spinner in the corresponding content area.
2. IF a TanStack Query fetch fails, THEN THE Dashboard SHALL display an error state component with a descriptive message and a "Retry" button that re-triggers the query.
3. WHEN a page loads with zero records returned by the Backend, THE Dashboard SHALL display an empty state illustration or message specific to that page's context.
4. THE Dashboard SHALL never display a blank white screen as a result of an unhandled runtime error; all async operations SHALL be wrapped in error boundaries.

---

### Requirement 10 — README & Deployment Documentation

**User Story:** As a developer or operator, I want a comprehensive README so that the project can be set up and deployed without external guidance.

#### Acceptance Criteria

1. THE Dashboard repository SHALL include a `README.md` at the project root containing: project overview, tech stack listing, prerequisites, environment variable definitions, local development setup steps, and production build instructions.
2. THE `README.md` SHALL document the Backend API base URL and WebSocket URL configuration, including how to change them for different deployment environments.
3. THE `README.md` SHALL include Docker Compose usage instructions covering the PostgreSQL database (port 5432) service setup.
