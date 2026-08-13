# ResQNet — Citizen Emergency Portal (`disaster-requester`)

**ResQNet** is a citizen-facing emergency response mobile web application built with **React Native for Web**, React 18, Vite, TypeScript, Tailwind CSS, Leaflet Maps, and WebSocket real-time updates.

Designed for low cognitive load and rapid operation during high-panic emergency scenarios, ResQNet enables citizens to trigger instant emergency SOS dispatches with geolocation tracking, monitor live rescue unit progress, access authority-verified safety & preparedness guides, and locate nearby relief shelters.

---

## 🌟 Key Features

1. **Instant Guest & Authenticated SOS Flow (`/sos/new`)**
   - **Automatic Geolocation Capture**: HTML5 Geolocation API auto-detects latitude/longitude with an interactive Leaflet map marker pin for manual drag/click fine-tuning.
   - **Hazard Categorization**: Instant selection of emergency types (`FLOOD`, `CYCLONE`, `EARTHQUAKE`, `FIRE`, `LANDSLIDE`, `TSUNAMI`, `MEDICAL`, `OTHER`).
   - **Photo Proof Attachment**: Upload hazard photos or capture device camera images.
   - **Guest Mode Support**: No login required. Unauthenticated citizens can submit an emergency request by providing their Name and Phone.

2. **Live Status & Rescue Tracker (`/sos/:id`)**
   - **Vertical Real-Time Timeline**:
     1. `SUBMITTED`
     2. `VERIFIED`
     3. `ASSIGNED`
     4. `RESPONDER_ON_WAY`
     5. `ASSISTANCE_PROVIDED`
     6. `RESOLVED`
   - **Native WebSocket Integration**: Listens to `ws://localhost:8000/ws` for `sos.status_changed` events, updating status live without manual page refreshes.
   - **Assigned Team Details**: Displays rescue unit name, contact phone, estimated arrival time (ETA), and live map location.
   - **Demo Simulator Box**: Integrated real-time simulator button to advance status through stages for testing offline.

3. **Authority Awareness & Preparedness (`/awareness`, `/preparedness`)**
   - Official safety protocols, disaster checklists, and government preparedness initiatives.
   - Real-time updates via WebSocket `content.published` & `alert.broadcast` events.

4. **Nearby Relief Shelters (`/shelters`)**
   - Interactive Leaflet map displaying active evacuation hubs, current occupancy vs capacity progress bars, available resources (Food, Water, Medical, Sleeping), and direct contacts.

5. **React Native Mobile Interface (`React Native for Web`)**
   - Built using React Native components (`View`, `Text`, `TouchableOpacity`, `ScrollView`, `FlatList`, `Modal`) for authentic touch feedback.
   - Bottom tab bar navigation and toggleable desktop framing mode.

6. **Offline Mock Fallback Engine**
   - If the FastAPI backend (`http://localhost:8000/api/v1`) or WebSocket server is disconnected, ResQNet automatically engages its internal mock engine and localStorage persistence.

---

## 🛠️ Architecture & Port Mapping

| Component | Technology | Port / Endpoint |
| :--- | :--- | :--- |
| **disaster-requester** | React Native for Web + Vite + TS | **`http://localhost:5173`** |
| **disaster-backend** | FastAPI + WebSockets | `http://localhost:8000/api/v1` |
| **WebSocket Stream** | Native WebSocket Client | `ws://localhost:8000/ws` |
| **disaster-db** | PostgreSQL Docker Container | `localhost:5432` (`disaster_db`) |

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on **`http://localhost:5173`**.

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Preview Production Build**:
   ```bash
   npm run preview
   ```

---

## 📁 Project Directory Structure

```
app1/
├── index.html               # Main HTML entry with Inter font & Leaflet CSS
├── package.json             # App dependencies & scripts
├── vite.config.ts           # Vite config with react-native-web aliases (Port 5173)
├── tailwind.config.js       # ResQNet HSL color palette tokens & animations
├── tsconfig.json            # TypeScript configuration
├── src/
│   ├── main.tsx             # Entry point
│   ├── App.tsx              # React Router v6 & TanStack Query setup
│   ├── index.css            # Custom CSS, scrollbar styles, and glassmorphism
│   ├── components/
│   │   ├── AppLayout.tsx    # Mobile phone frame shell & desktop toggle
│   │   ├── HeaderBar.tsx    # ResQNet header bar & national hotline modal
│   │   └── BottomTabBar.tsx # Native mobile bottom tab navigation
│   ├── context/
│   │   └── AuthContext.tsx  # Guest & user authentication state manager
│   ├── services/
│   │   ├── api.ts           # Axios REST API client + Mock API engine
│   │   └── websocket.ts     # Native WebSocket listener + Mock event dispatching
│   ├── styles/
│   │   └── theme.ts         # Design tokens & color system
│   └── screens/
│       ├── HomeScreen.tsx           # Dashboard with pulsing SOS button
│       ├── InstantSOSScreen.tsx     # GPS location map picker & hazard form
│       ├── LiveStatusTrackerScreen.tsx # Real-time rescue progress timeline
│       ├── MyRequestsScreen.tsx     # History of submitted emergency requests
│       ├── AwarenessScreen.tsx      # Safety guides & preparedness checklists
│       └── SheltersScreen.tsx       # Leaflet relief shelter map & capacities
```

---

## 🌐 API Contract Specifications

### 1. SOS Request Payload (`POST /api/v1/sos`)
```json
{
  "sos_id": "SOS-000124",
  "requester_user_id": null,
  "guest_name": "Sunita Devi",
  "guest_phone": "+91 98765 43210",
  "emergency_type": "FLOOD",
  "description": "Roof flooded, 3 people trapped including elderly person.",
  "people_affected": 3,
  "lat": 11.3410,
  "lng": 77.7172,
  "priority": "HIGH",
  "status": "SUBMITTED",
  "image_url": "data:image/jpeg;base64,...",
  "created_at": "2026-08-13T14:00:00Z"
}
```

### 2. WebSocket Events (`ws://localhost:8000/ws`)
- `sos.status_changed`: Fired when a dispatcher or team updates the SOS status.
- `alert.broadcast`: Fired when an authority issues a high-priority regional warning.
- `content.published`: Fired when a new safety guide or preparedness initiative is published.

---

## 🎨 Color Palette & Visual Identity

- **Brand Primary**: `#0F6E5C` (Calm Teal Green — Trust & Safety)
- **High-Urgency SOS**: `#E14434` (Pulsing SOS Red-Orange)
- **Background**: `#F7F9FC` (Soft off-white)
- **Success / Active**: `#2E9E5B`
- **Warning / Medium**: `#F5A623`

---

## 🚀 Deployment Instructions

### Docker (recommended: whole stack in one command)
The repository ships a root `docker-compose.yml` that builds **all four ResQNet components plus
PostgreSQL** and runs them with a single command:

```bash
cd ../..                          # dms/
docker compose up --build -d      # citizen app -> http://localhost:5173
```

The bundled Nginx serves the SPA and proxies `/api/` and `/ws` to the backend container
(`api:8000`), so the app uses same-origin URLs and **no CORS configuration is needed**. The API
URL is read from `VITE_API_BASE_URL` (set to `/api/v1` in the compose build args). See the
[root README](../README.md) for the full flow and demo credentials.

To build this app standalone:

```bash
docker build -t resqnet-citizen .
docker run -d --name resqnet-citizen --network resqnet-net -p 5173:80 resqnet-citizen
# -> http://localhost:5173  (backend container must be reachable as "api" on the network)
```

### Standard Static Hosting (Firebase / Vercel / Netlify / Nginx)
Because ResQNet builds into a lightweight static SPA:
1. Run `npm run build` to generate the output in `dist/`.
2. Deploy the `dist/` directory to any static web host or Nginx web server.

For static hosting outside Docker, set `VITE_API_BASE_URL` / `VITE_WS_URL` at build time to the
public backend URLs (see [Configuration](#-api-contract-specifications) / backend README).

## 📱 Android APK build (Capacitor)

The same web bundle is wrapped into a native Android app with Capacitor, so one codebase produces
both the web app (5173) and an installable APK.

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

---

© 2026 ResQNet Emergency Response System. All rights reserved.
