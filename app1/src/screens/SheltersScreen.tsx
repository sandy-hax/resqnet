import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { MapPin, PhoneCall, Users, Shield, Compass, CheckCircle2, Box } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { apiService, ReliefShelter } from '../services/api';

const shelterIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const SheltersScreen: React.FC = () => {
  const [shelters, setShelters] = useState<ReliefShelter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedShelter, setSelectedShelter] = useState<ReliefShelter | null>(null);

  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    try {
      const data = await apiService.getShelters();
      setShelters(data);
      if (data.length > 0) {
        setSelectedShelter(data[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <View style={styles.headerBadge}>
          <MapPin size={14} color="#0F6E5C" />
          <Text style={styles.headerBadgeText}>OFFICIAL RELIEF HUBS</Text>
        </View>
        <Text style={styles.title}>Nearby Relief Shelters</Text>
        <Text style={styles.subtitle}>Interactive map of emergency centers, live capacities, and supply inventory.</Text>
      </View>

      {/* Interactive Leaflet Map */}
      <View style={styles.mapCard}>
        <View style={styles.mapContainer}>
          <MapContainer
            center={[11.3410, 77.7172]}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {shelters.map((sh) => (
              <Marker
                key={sh.shelter_id}
                position={[sh.lat, sh.lng]}
                icon={shelterIcon}
                eventHandlers={{
                  click: () => setSelectedShelter(sh),
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <strong>{sh.name}</strong><br/>
                    Status: {sh.status}<br/>
                    Capacity: {sh.occupied} / {sh.capacity}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </View>
      </View>

      {/* Shelter Cards List */}
      <View style={styles.shelterList}>
        <Text style={styles.sectionTitle}>Available Evacuation Hubs ({shelters.length})</Text>

        {loading ? (
          <ActivityIndicator size="medium" color="#0F6E5C" />
        ) : (
          shelters.map((sh) => {
            const isSelected = selectedShelter?.shelter_id === sh.shelter_id;
            const occupancyPct = Math.round((sh.occupied / sh.capacity) * 100);

            return (
              <TouchableOpacity
                key={sh.shelter_id}
                style={[styles.shelterCard, isSelected && styles.selectedShelterCard]}
                onPress={() => setSelectedShelter(sh)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.shelterName}>{sh.name}</Text>
                    <Text style={styles.shelterAddr}>📍 {sh.address} ({sh.distance_km || 1.2} km away)</Text>
                  </View>
                  <View style={[styles.statusTag, sh.status === 'FULL' ? styles.statusFull : styles.statusOpen]}>
                    <Text style={[styles.statusTagText, sh.status === 'FULL' ? styles.statusFullText : styles.statusOpenText]}>
                      {sh.status}
                    </Text>
                  </View>
                </View>

                {/* Capacity Progress Bar */}
                <View style={styles.capacitySection}>
                  <View style={styles.capacityHeader}>
                    <View style={styles.capLabelRow}>
                      <Users size={14} color="#0F6E5C" />
                      <Text style={styles.capLabel}>Occupancy Capacity</Text>
                    </View>
                    <Text style={styles.capVal}>{sh.occupied} / {sh.capacity} ({occupancyPct}%)</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, occupancyPct)}%` },
                        occupancyPct > 90 ? { backgroundColor: '#E14434' } : { backgroundColor: '#0F6E5C' }
                      ]}
                    />
                  </View>
                </View>

                {/* Available Supplies Pills */}
                <View style={styles.suppliesGroup}>
                  <Text style={styles.suppliesLabel}>Available Supplies:</Text>
                  <View style={styles.suppliesPills}>
                    {sh.supplies.map((item, idx) => (
                      <View key={idx} style={styles.supplyPill}>
                        <CheckCircle2 size={10} color="#2E9E5B" />
                        <Text style={styles.supplyPillText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtnCall}>
                    <PhoneCall size={14} color="#0F6E5C" />
                    <Text style={styles.actionBtnCallText}>{sh.contact_phone}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtnNav}>
                    <Compass size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnNavText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  headerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F6E5C',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A2233',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shelterList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2233',
  },
  shelterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 12,
  },
  selectedShelterCard: {
    borderColor: '#0F6E5C',
    borderWidth: 2,
    backgroundColor: '#FAFCFB',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleGroup: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  shelterName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2233',
  },
  shelterAddr: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: '#EDF9F2',
  },
  statusFull: {
    backgroundColor: '#FDF2F0',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusOpenText: {
    color: '#2E9E5B',
  },
  statusFullText: {
    color: '#E14434',
  },
  capacitySection: {
    gap: 6,
    backgroundColor: '#F7F9FC',
    padding: 10,
    borderRadius: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  capVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F6E5C',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E4E8EF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  suppliesGroup: {
    gap: 6,
  },
  suppliesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  suppliesPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  supplyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  supplyPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E6F4F1',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0F6E5C',
  },
  actionBtnCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F6E5C',
  },
  actionBtnNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F6E5C',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
