import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export interface SOSRequest {
  sos_id: string;
  requester_user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  emergency_type: 'FLOOD' | 'CYCLONE' | 'EARTHQUAKE' | 'FIRE' | 'LANDSLIDE' | 'TSUNAMI' | 'MEDICAL' | 'OTHER';
  description: string;
  people_affected: number;
  lat: number;
  lng: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'SUBMITTED' | 'VERIFIED' | 'ASSIGNED' | 'RESPONDER_ON_WAY' | 'ASSISTANCE_PROVIDED' | 'RESOLVED' | 'REJECTED';
  image_url?: string | null;
  created_at: string;
  assigned_team?: {
    team_name: string;
    team_type: string;
    contact_phone: string;
    eta_minutes: number;
    responder_lat?: number;
    responder_lng?: number;
  } | null;
}

export interface ContentModule {
  content_id: string;
  disaster_type: 'FLOOD' | 'CYCLONE' | 'EARTHQUAKE' | 'FIRE' | 'LANDSLIDE' | 'TSUNAMI' | 'OTHER';
  title: string;
  body: string;
  media_url?: string | null;
  target_area?: string | null;
  is_program: boolean;
  created_at?: string;
  checklist?: string[];
}

export interface ReliefShelter {
  shelter_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  contact_phone: string;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  supplies: string[];
  distance_km?: number;
}

// Initial Mock Data
const INITIAL_MOCK_SOS_LIST: SOSRequest[] = [
  {
    sos_id: 'SOS-000124',
    requester_user_id: null,
    guest_name: 'Rahul Sharma',
    guest_phone: '+91 98765 43210',
    emergency_type: 'FLOOD',
    description: 'Water level rising rapidly up to 1st floor. 3 people stuck on roof including elderly person.',
    people_affected: 3,
    lat: 11.3410,
    lng: 77.7172,
    priority: 'HIGH',
    status: 'RESPONDER_ON_WAY',
    image_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    assigned_team: {
      team_name: 'NDRF Rescue Unit 04',
      team_type: 'Quick Response Boat Team',
      contact_phone: '+91 91234 56789',
      eta_minutes: 8,
      responder_lat: 11.3445,
      responder_lng: 77.7210,
    }
  },
  {
    sos_id: 'SOS-000125',
    requester_user_id: null,
    guest_name: 'Priya Patel',
    guest_phone: '+91 98123 45678',
    emergency_type: 'MEDICAL',
    description: 'Asthma emergency during power blackout. Need oxygen cylinder assistance.',
    people_affected: 1,
    lat: 11.3490,
    lng: 77.7250,
    priority: 'MEDIUM',
    status: 'VERIFIED',
    image_url: null,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    assigned_team: null
  }
];

const INITIAL_MOCK_CONTENT: ContentModule[] = [
  {
    content_id: 'cnt-01',
    disaster_type: 'FLOOD',
    title: 'Urgent Flood Survival Protocol & High Ground Evacuation',
    body: 'If floodwaters rise inside your home: turn off electricity & main gas valves. Do not walk through moving water. Move immediately to high ground or rooftop. Signal rescue teams with bright clothes or torch light.',
    media_url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
    target_area: 'Low Lying Coastal & River Basin Zones',
    is_program: false,
    checklist: [
      'Turn off main circuit breaker and gas line',
      'Pack essential medicines, IDs, and waterproof flashlight',
      'Move to higher floor or sturdy roof structure',
      'Do not touch submerged electrical cords or wires'
    ]
  },
  {
    content_id: 'cnt-02',
    disaster_type: 'FLOOD',
    title: 'Community Flood Preparedness Initiative 2026',
    body: 'Official government program for distribution of emergency life jackets, water purification tablets, and solar lanterns in vulnerable sectors.',
    media_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    target_area: 'District Flood Sector 4',
    is_program: true,
    checklist: [
      'Register household with local ward coordinator',
      'Collect emergency radio & water purification kit',
      'Verify designated shelter evacuation route'
    ]
  },
  {
    content_id: 'cnt-03',
    disaster_type: 'CYCLONE',
    title: 'Severe Cyclone Windstorm Emergency Guide',
    body: 'Secure loose outdoor items. Stay indoors away from windows and glass doors. Keep emergency power banks charged. Prepare food supplies for at least 72 hours.',
    media_url: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=600&q=80',
    target_area: 'Coastal Belt (Within 25km of Coast)',
    is_program: false,
    checklist: [
      'Board up window glass panels or tape heavy X across panes',
      'Store 10+ liters of potable drinking water per person',
      'Charge all emergency power banks and radios'
    ]
  },
  {
    content_id: 'cnt-04',
    disaster_type: 'EARTHQUAKE',
    title: 'Drop, Cover, and Hold On Protocol',
    body: 'During intense shaking: DROP onto hands & knees. COVER head and neck under sturdy table. HOLD ON until shaking completely stops. Do NOT use elevators.',
    media_url: null,
    target_area: 'Seismic Zone IV & V',
    is_program: false,
    checklist: [
      'Identify heavy tables or interior wall corners',
      'Keep heavy objects off high shelves',
      'Prepare emergency go-bag near main doorway'
    ]
  },
  {
    content_id: 'cnt-05',
    disaster_type: 'FIRE',
    title: 'Building Fire Safety & Smoke Inhalation Survival',
    body: 'Stay low under smoke layer. Check doors for heat before opening. Use stairwells instead of elevators. If clothes catch fire: Stop, Drop, and Roll.',
    media_url: null,
    target_area: 'Urban High-Rise Buildings',
    is_program: false,
    checklist: [
      'Know at least two exit paths from your location',
      'Cover nose and mouth with wet cloth',
      'Never go back inside a burning building'
    ]
  }
];

const INITIAL_MOCK_SHELTERS: ReliefShelter[] = [
  {
    shelter_id: 'sh-101',
    name: 'Government Model Higher Secondary Relief Center',
    address: 'Near Gandhi Circle, Main Road',
    lat: 11.3435,
    lng: 77.7190,
    capacity: 500,
    occupied: 280,
    contact_phone: '+91 94444 11223',
    status: 'OPEN',
    supplies: ['Food Packets', 'Clean Water', 'Medical First Aid', 'Sleeping Mats', 'Generator Power'],
    distance_km: 0.8
  },
  {
    shelter_id: 'sh-102',
    name: 'St. Joseph Community Disaster Shelter',
    address: 'Church Road, Suburb North',
    lat: 11.3520,
    lng: 77.7280,
    capacity: 350,
    occupied: 120,
    contact_phone: '+91 94444 33445',
    status: 'OPEN',
    supplies: ['Hot Meals', 'Potable Water', 'Doctor on Duty', 'Blankets', 'Infant Care Supplies'],
    distance_km: 1.6
  },
  {
    shelter_id: 'sh-103',
    name: 'City Indoor Stadium Evacuation Hub',
    address: 'Sports Complex Road, West End',
    lat: 11.3350,
    lng: 77.7050,
    capacity: 1000,
    occupied: 980,
    contact_phone: '+91 94444 55667',
    status: 'FULL',
    supplies: ['Emergency Rations', 'Water Tanker', 'Paramedic Unit', 'Camp Beds'],
    distance_km: 2.4
  }
];

// Helper to manage persistent mock store in localStorage
const getStoredMockSOS = (): SOSRequest[] => {
  try {
    const raw = localStorage.getItem('resqnet_mock_sos');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_MOCK_SOS_LIST;
};

const saveStoredMockSOS = (list: SOSRequest[]) => {
  try {
    localStorage.setItem('resqnet_mock_sos', JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
};

// History of SOS requests submitted from this device/browser (works for guests too).
const getStoredMySOS = (): SOSRequest[] => {
  try {
    const raw = localStorage.getItem('resqnet_my_sos');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
};

const saveStoredMySOS = (list: SOSRequest[]) => {
  try {
    localStorage.setItem('resqnet_my_sos', JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
};

const rememberMySOS = (sos: SOSRequest) => {
  const list = getStoredMySOS();
  if (!list.some((s) => s.sos_id === sos.sos_id)) {
    list.unshift(sos);
    saveStoredMySOS(list);
  }
};

// Create Axios Instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000,
});

// Interceptor to attach Authorization header if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('resqnet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Helper Functions with Seamless Backend / Mock Fallback
export const apiService = {
  // SOS API
  async createSOS(data: Partial<SOSRequest>): Promise<SOSRequest> {
    try {
      const response = await apiClient.post('/sos', data);
      rememberMySOS(response.data);
      return response.data;
    } catch (err) {
      console.warn('Backend unavailable, using ResQNet Mock Engine for SOS submission');
      const list = getStoredMockSOS();
      const newSOS: SOSRequest = {
        sos_id: `SOS-${Math.floor(100000 + Math.random() * 900000)}`,
        requester_user_id: data.requester_user_id || null,
        guest_name: data.guest_name || 'Anonymous Citizen',
        guest_phone: data.guest_phone || '+91 99999 00000',
        emergency_type: data.emergency_type || 'OTHER',
        description: data.description || 'Emergency assistance requested.',
        people_affected: data.people_affected || 1,
        lat: data.lat || 11.3410,
        lng: data.lng || 77.7172,
        priority: data.priority || 'HIGH',
        status: 'SUBMITTED',
        image_url: data.image_url || null,
        created_at: new Date().toISOString(),
        assigned_team: null,
      };
      list.unshift(newSOS);
      saveStoredMockSOS(list);
      rememberMySOS(newSOS);
      return newSOS;
    }
  },

  async getSOSById(id: string): Promise<SOSRequest> {
    try {
      const response = await apiClient.get(`/sos/${id}`);
      return response.data;
    } catch (err) {
      const list = getStoredMockSOS();
      const found = list.find((item) => item.sos_id === id);
      if (found) return found;
      // Default fallback
      return {
        sos_id: id,
        guest_name: 'Citizen',
        guest_phone: '+91 98765 43210',
        emergency_type: 'FLOOD',
        description: 'Emergency assistance request.',
        people_affected: 2,
        lat: 11.3410,
        lng: 77.7172,
        priority: 'HIGH',
        status: 'SUBMITTED',
        created_at: new Date().toISOString(),
      };
    }
  },

  async getMySOSRequests(): Promise<SOSRequest[]> {
    let backend: SOSRequest[] = [];
    try {
      const response = await apiClient.get('/sos/my');
      backend = response.data;
    } catch (err) {
      backend = [];
    }
    const local = getStoredMySOS();
    const merged = [...backend];
    for (const s of local) {
      if (!merged.some((m) => m.sos_id === s.sos_id)) merged.push(s);
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  },

  async updateMockSOSStatus(id: string, newStatus: SOSRequest['status'], teamDetails?: any): Promise<SOSRequest> {
    const list = getStoredMockSOS();
    const index = list.findIndex((s) => s.sos_id === id);
    if (index !== -1) {
      list[index].status = newStatus;
      if (teamDetails) {
        list[index].assigned_team = teamDetails;
      }
      saveStoredMockSOS(list);
      return list[index];
    }
    throw new Error('SOS not found');
  },

  // Content API (Awareness & Preparedness)
  async getContent(): Promise<ContentModule[]> {
    try {
      const response = await apiClient.get('/content');
      return response.data;
    } catch (err) {
      return INITIAL_MOCK_CONTENT;
    }
  },

  // Relief Shelters API
  async getShelters(): Promise<ReliefShelter[]> {
    try {
      const response = await apiClient.get('/shelters');
      return response.data;
    } catch (err) {
      return INITIAL_MOCK_SHELTERS;
    }
  },

  // Auth APIs
  async login(credentials: { phone: string; password?: string }) {
    try {
      const res = await apiClient.post('/auth/login', credentials);
      return res.data;
    } catch (err) {
      // Mock Login response
      const token = `mock-token-${Date.now()}`;
      const user = {
        user_id: 'usr-guest-101',
        name: credentials.phone || 'Citizen User',
        phone: credentials.phone || '+91 98765 43210',
        role: 'REQUESTER',
      };
      localStorage.setItem('resqnet_token', token);
      localStorage.setItem('resqnet_user', JSON.stringify(user));
      return { access_token: token, user };
    }
  },

  async register(data: { name: string; phone: string; email?: string; password?: string }) {
    try {
      const res = await apiClient.post('/auth/register', data);
      return res.data;
    } catch (err) {
      const user = {
        user_id: `usr-${Math.floor(1000 + Math.random() * 9000)}`,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        role: 'REQUESTER',
      };
      const token = `mock-token-${Date.now()}`;
      localStorage.setItem('resqnet_token', token);
      localStorage.setItem('resqnet_user', JSON.stringify(user));
      return { access_token: token, user };
    }
  }
};
