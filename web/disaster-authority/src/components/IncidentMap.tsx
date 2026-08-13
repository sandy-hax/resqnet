import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ReliefShelter, SOSDetail, TeamOut } from '@/types';
import { EmergencyTypeTag, PriorityBadge } from '@/components/Badges';
import { timeAgo } from '@/lib/format';

const MAP_CENTER: [number, number] = [11.34, 77.72];
const DEFAULT_ZOOM = 13;

function makeIcon(color: string, pulse = false) {
  return L.divIcon({
    className: 'dms-marker',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        ${pulse ? '<div style="position:absolute;inset:0;border-radius:9999px;background:' + color + ';opacity:.35;animation:pulse 2s infinite;"></div>' : ''}
        <div style="position:absolute;inset:4px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FlyToCenter() {
  const map = useMap();
  useEffect(() => {
    map.setView(MAP_CENTER, DEFAULT_ZOOM);
  }, [map]);
  return null;
}

const priorityColorMap: Record<string, string> = {
  HIGH: '#E14434',
  MEDIUM: '#F5A623',
  LOW: '#9CA3AF',
};

interface IncidentMapProps {
  sosList: SOSDetail[];
  teams: TeamOut[];
  shelters: ReliefShelter[];
  height?: number;
  selectedSosId?: string | null;
  onSelectSos?: (sos: SOSDetail) => void;
}

export default function IncidentMap({
  sosList,
  teams,
  shelters,
  height = 480,
  selectedSosId,
  onSelectSos,
}: IncidentMapProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border" style={{ height }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToCenter />

        {sosList.map((sos) => (
          <Marker
            key={`sos-${sos.sos_id}`}
            position={[sos.lat, sos.lng]}
            icon={makeIcon(priorityColorMap[sos.priority] ?? '#9CA3AF', sos.priority === 'HIGH')}
            eventHandlers={{
              click: () => onSelectSos?.(sos),
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{sos.sos_id}</span>
                  <EmergencyTypeTag type={sos.emergency_type} />
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={sos.priority} />
                </div>
                <div className="text-xs text-muted">{sos.guest_name ?? 'Anonymous'} · {timeAgo(sos.created_at)}</div>
                <div className="text-xs text-muted">{sos.description?.slice(0, 90)}</div>
                {selectedSosId === sos.sos_id && onSelectSos && (
                  <button className="text-xs font-semibold text-primary" onClick={() => onSelectSos(sos)}>
                    Inspect →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {teams.map(
          (team) =>
            team.current_lat != null &&
            team.current_lng != null && (
              <Marker
                key={`team-${team.team_id}`}
                position={[team.current_lat, team.current_lng]}
                icon={makeIcon(team.is_available ? '#2E9E5B' : '#6B7280')}
              >
                <Popup>
                  <div className="space-y-0.5 text-sm">
                    <div className="font-bold">{team.team_name}</div>
                    <div className="text-xs text-muted">{team.badge_number}</div>
                    <div className="text-xs">
                      <span className={team.is_available ? 'text-success font-semibold' : 'text-slate-500'}>
                        {team.is_available ? '● Available' : '○ Busy'}
                      </span>
                    </div>
                    {team.location_updated_at && (
                      <div className="text-[11px] text-muted">
                        Position synced {timeAgo(team.location_updated_at)}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ),
        )}

        {shelters.map((shelter) => (
          <Marker
            key={`shelter-${shelter.shelter_id}`}
            position={[shelter.lat, shelter.lng]}
            icon={makeIcon('#0F6E5C')}
          >
            <Popup>
              <div className="space-y-0.5 text-sm">
                <div className="font-bold">{shelter.name}</div>
                <div className="text-xs text-muted">{shelter.address}</div>
                <div className="text-xs">
                  {shelter.occupied}/{shelter.capacity} occupied ·{' '}
                  <span className="font-semibold text-primary">{shelter.status}</span>
                </div>
                <div className="text-xs text-muted">{shelter.contact_phone}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-card">
        <div className="flex flex-col gap-1 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> High Priority SOS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> Medium / Low SOS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> Available Team
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Relief Shelter
          </span>
        </div>
      </div>
    </div>
  );
}
