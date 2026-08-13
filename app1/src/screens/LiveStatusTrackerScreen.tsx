import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, PhoneCall, ShieldCheck, Truck, AlertCircle, RefreshCw, Radio, Play } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { apiService, SOSRequest } from '../services/api';
import { wsService } from '../services/websocket';

// Icons for map
const requesterPin = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const responderPin = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted', desc: 'Emergency signal received by ResQNet server' },
  { key: 'VERIFIED', label: 'Verified', desc: 'Validated by Command Center dispatcher' },
  { key: 'ASSIGNED', label: 'Team Assigned', desc: 'Quick Response Team deployed' },
  { key: 'RESPONDER_ON_WAY', label: 'Responder On The Way', desc: 'Rescue unit en route to your GPS pin' },
  { key: 'ASSISTANCE_PROVIDED', label: 'Assistance Provided', desc: 'Rescue personnel actively assisting on-site' },
  { key: 'RESOLVED', label: 'Resolved', desc: 'Emergency situation cleared' },
];

export const LiveStatusTrackerScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sos, setSos] = useState<SOSRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSimControls, setShowSimControls] = useState<boolean>(true);

  const fetchSOSDetails = async () => {
    if (!id) return;
    try {
      const data = await apiService.getSOSById(id);
      setSos(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOSDetails();

    // Subscribe to WebSocket status changes for real-time updates!
    const unsub = wsService.subscribe('sos.status_changed', (msg) => {
      if (msg.payload.sos_id === id) {
        setSos((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: msg.payload.status,
            assigned_team: msg.payload.assigned_team || prev.assigned_team,
          };
        });
      }
    });

    // Poll fallback so the tracker keeps updating even if the socket drops.
    const poll = setInterval(fetchSOSDetails, 10000);

    return () => {
      unsub();
      clearInterval(poll);
    };
  }, [id]);

  const getCurrentStepIndex = () => {
    if (!sos) return 0;
    const idx = STATUS_STEPS.findIndex((s) => s.key === sos.status);
    return idx !== -1 ? idx : 0;
  };

  // Handler to advance status via Mock Engine for interactive testing
  const handleSimulateNextStep = async () => {
    if (!sos) return;
    const currentIdx = getCurrentStepIndex();
    if (currentIdx < STATUS_STEPS.length - 1) {
      const nextStatus = STATUS_STEPS[currentIdx + 1].key as SOSRequest['status'];
      let teamData = sos.assigned_team;

      if (nextStatus === 'ASSIGNED' || nextStatus === 'RESPONDER_ON_WAY') {
        teamData = {
          team_name: 'NDRF Rapid Task Force 07',
          team_type: 'Flood & Medical Evacuation',
          contact_phone: '+91 94444 88990',
          eta_minutes: 6,
          responder_lat: sos.lat + 0.003,
          responder_lng: sos.lng + 0.004,
        };
      }

      const updated = await apiService.updateMockSOSStatus(sos.sos_id, nextStatus, teamData);
      setSos(updated);

      // Also trigger WS event broadcast
      wsService.triggerMockStatusChange(sos.sos_id, nextStatus, teamData);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F6E5C" />
        <Text style={styles.loadingText}>Fetching live emergency tracking data...</Text>
      </View>
    );
  }

  if (!sos) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={40} color="#E14434" />
        <Text style={styles.errorTitle}>SOS Request Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('/')}>
          <Text style={styles.backBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIdx = getCurrentStepIndex();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Request Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.sosIdText}>{sos.sos_id}</Text>
            <Text style={styles.emergencyTypeBadge}>
              {sos.emergency_type} EMERGENCY
            </Text>
          </View>
          <View style={[styles.priorityBadge, sos.priority === 'HIGH' && styles.priHighBadge]}>
            <Text style={styles.priorityText}>{sos.priority} PRIORITY</Text>
          </View>
        </View>

        <Text style={styles.sosDesc}>{sos.description}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>People Affected</Text>
            <Text style={styles.metaVal}>{sos.people_affected} Person(s)</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Requester Contact</Text>
            <Text style={styles.metaVal}>{sos.guest_name || 'Citizen'} ({sos.guest_phone || 'N/A'})</Text>
          </View>
        </View>
      </View>

      {/* Responder Team Assigned Card */}
      {sos.assigned_team && (
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <Truck size={22} color="#0F6E5C" />
            <Text style={styles.teamTitle}>Assigned Response Team</Text>
          </View>

          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>{sos.assigned_team.team_name}</Text>
            <Text style={styles.teamType}>{sos.assigned_team.team_type}</Text>

            <View style={styles.teamSubRow}>
              <View style={styles.etaBadge}>
                <Clock size={14} color="#0F6E5C" />
                <Text style={styles.etaText}>ETA: ~{sos.assigned_team.eta_minutes} mins</Text>
              </View>

              <TouchableOpacity style={styles.callTeamBtn}>
                <PhoneCall size={14} color="#FFFFFF" />
                <Text style={styles.callTeamText}>Call Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Interactive Leaflet Tracking Map */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <MapPin size={18} color="#0F6E5C" />
          <Text style={styles.mapTitle}>Live Rescue Location Tracking</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapContainer
            center={[sos.lat, sos.lng]}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Requester Pin */}
            <Marker position={[sos.lat, sos.lng]} icon={requesterPin}>
              <Popup>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  🔴 Your SOS GPS Pin<br/>
                  {sos.description}
                </div>
              </Popup>
            </Marker>

            {/* Responder Pin if assigned */}
            {sos.assigned_team?.responder_lat && sos.assigned_team?.responder_lng && (
              <Marker
                position={[sos.assigned_team.responder_lat, sos.assigned_team.responder_lng]}
                icon={responderPin}
              >
                <Popup>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    🟢 {sos.assigned_team.team_name}<br/>
                    En route to your position
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </View>
      </View>

      {/* Vertical Status Progression Timeline */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <Radio size={18} color="#0F6E5C" />
          <Text style={styles.timelineTitle}>Real-Time Rescue Timeline</Text>
        </View>

        <View style={styles.timelineList}>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <View key={step.key} style={styles.timelineStepRow}>
                {/* Left Dot and Connector Line */}
                <View style={styles.dotColumn}>
                  <View
                    style={[
                      styles.stepDot,
                      isDone && styles.dotDone,
                      isCurrent && styles.dotCurrent,
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={14} color="#FFFFFF" />
                    ) : (
                      <View style={styles.dotInnerPending} />
                    )}
                  </View>
                  {idx < STATUS_STEPS.length - 1 && (
                    <View style={[styles.connectorLine, isDone && styles.lineDone]} />
                  )}
                </View>

                {/* Step Details */}
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Interactive Simulation Controls */}
      <View style={styles.simBox}>
        <View style={styles.simHeader}>
          <Play size={16} color="#0F6E5C" />
          <Text style={styles.simTitle}>Live Simulation Controls (Demo Test)</Text>
        </View>
        <Text style={styles.simDesc}>
          Advance status real-time to test WebSocket listener updates:
        </Text>

        <View style={styles.simActions}>
          <TouchableOpacity
            style={[styles.simBtn, currentStepIdx >= STATUS_STEPS.length - 1 && styles.simDisabled]}
            onPress={handleSimulateNextStep}
            disabled={currentStepIdx >= STATUS_STEPS.length - 1}
          >
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.simBtnText}>
              {currentStepIdx >= STATUS_STEPS.length - 1
                ? 'Status Fully Resolved'
                : `Simulate Step: ${STATUS_STEPS[currentStepIdx + 1]?.label}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2233',
  },
  backBtn: {
    backgroundColor: '#0F6E5C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sosIdText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F6E5C',
  },
  emergencyTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E14434',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    backgroundColor: '#FEF8EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  priHighBadge: {
    backgroundColor: '#FDF2F0',
    borderColor: '#E14434',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E14434',
  },
  sosDesc: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2233',
  },
  teamCard: {
    backgroundColor: '#EDF9F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2E9E5B',
    gap: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F6E5C',
  },
  teamDetails: {
    gap: 4,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A2233',
  },
  teamType: {
    fontSize: 12,
    color: '#4B5563',
  },
  teamSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F6E5C',
  },
  callTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F6E5C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callTeamText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2233',
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2233',
  },
  timelineList: {
    gap: 0,
    paddingLeft: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 50,
  },
  dotColumn: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotDone: {
    backgroundColor: '#2E9E5B',
  },
  dotCurrent: {
    backgroundColor: '#0F6E5C',
    borderWidth: 2,
    borderColor: '#E6F4F1',
  },
  dotInnerPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: '#2E9E5B',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepLabelDone: {
    color: '#1A2233',
    fontWeight: '700',
  },
  stepLabelCurrent: {
    color: '#0F6E5C',
    fontWeight: '800',
  },
  stepDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  simBox: {
    backgroundColor: '#FEF8EC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5A623',
    gap: 8,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  simDesc: {
    fontSize: 11,
    color: '#92400E',
  },
  simActions: {
    marginTop: 4,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F6E5C',
    paddingVertical: 10,
    borderRadius: 10,
  },
  simDisabled: {
    backgroundColor: '#9CA3AF',
  },
  simBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
