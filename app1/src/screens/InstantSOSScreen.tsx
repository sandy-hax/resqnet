import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, Users, Navigation, Check, ShieldAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { apiService, SOSRequest } from '../services/api';

// Custom Leaflet Pin Icon
const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const LocationPickerMarker: React.FC<LocationPickerProps> = ({ lat, lng, onLocationChange }) => {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={[lat, lng]}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        },
      }}
    />
  );
};

export const InstantSOSScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, guestName, guestPhone, setGuestDetails } = useAuth();

  const [lat, setLat] = useState<number>(11.3410);
  const [lng, setLng] = useState<number>(77.7172);
  const [locating, setLocating] = useState<boolean>(false);
  const [emergencyType, setEmergencyType] = useState<SOSRequest['emergency_type']>('FLOOD');
  const [description, setDescription] = useState<string>('');
  const [peopleAffected, setPeopleAffected] = useState<number>(1);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Guest fields
  const [formGuestName, setFormGuestName] = useState<string>(user?.name || guestName || '');
  const [formGuestPhone, setFormGuestPhone] = useState<string>(user?.phone || guestPhone || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Request browser geolocation on load
  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocating(false);
        },
        (err) => {
          console.warn('Geolocation error fallback to default pin:', err);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitSOS = async () => {
    if (!description.trim()) {
      alert('Please describe your emergency situation.');
      return;
    }
    if (!isAuthenticated && (!formGuestName.trim() || !formGuestPhone.trim())) {
      alert('Please provide your Name and Contact Phone for rescue teams.');
      return;
    }

    setSubmitting(true);
    if (!isAuthenticated) {
      setGuestDetails(formGuestName, formGuestPhone);
    }

    try {
      const sosData: Partial<SOSRequest> = {
        requester_user_id: user?.user_id || null,
        guest_name: isAuthenticated ? user?.name : formGuestName,
        guest_phone: isAuthenticated ? user?.phone : formGuestPhone,
        emergency_type: emergencyType,
        description: description.trim(),
        people_affected: peopleAffected,
        lat: lat,
        lng: lng,
        priority: priority,
        image_url: imageUrl,
      };

      const result = await apiService.createSOS(sosData);
      setSubmitting(false);
      navigate(`/sos/${result.sos_id}`);
    } catch (err) {
      setSubmitting(false);
      alert('Error submitting SOS. Please try again.');
    }
  };

  const emergencyCategories: Array<{ type: SOSRequest['emergency_type']; label: string; icon: string }> = [
    { type: 'FLOOD', label: 'Flood', icon: '🌊' },
    { type: 'FIRE', label: 'Fire', icon: '🔥' },
    { type: 'CYCLONE', label: 'Cyclone', icon: '🌀' },
    { type: 'EARTHQUAKE', label: 'Earthquake', icon: '🏚️' },
    { type: 'LANDSLIDE', label: 'Landslide', icon: '⛰️' },
    { type: 'TSUNAMI', label: 'Tsunami', icon: '🌊' },
    { type: 'MEDICAL', label: 'Medical', icon: '🚑' },
    { type: 'OTHER', label: 'Other', icon: '🚨' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header Title Banner */}
      <View style={styles.headerBox}>
        <View style={styles.headerBadge}>
          <ShieldAlert size={16} color="#E14434" />
          <Text style={styles.headerBadgeText}>HIGH URGENCY SOS DISPATCH</Text>
        </View>
        <Text style={styles.pageTitle}>Instant Emergency Report</Text>
        <Text style={styles.pageSubtitle}>Confirm your exact GPS pin location and hazard details for rescue teams.</Text>
      </View>

      {/* Geolocation Capture Map Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MapPin size={18} color="#0F6E5C" />
            <Text style={styles.sectionTitle}>1. Confirm Emergency Location</Text>
          </View>

          <TouchableOpacity style={styles.reDetectBtn} onPress={handleDetectLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color="#0F6E5C" />
            ) : (
              <>
                <Navigation size={12} color="#0F6E5C" />
                <Text style={styles.reDetectText}>Auto GPS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.mapInstruction}>Tap map or drag marker pin to fine-tune your exact coordinates.</Text>

        {/* Map Container */}
        <View style={styles.mapFrame}>
          <MapContainer
            center={[lat, lng]}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPickerMarker lat={lat} lng={lng} onLocationChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          </MapContainer>
        </View>

        <View style={styles.coordBar}>
          <Text style={styles.coordText}>GPS Pin: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        </View>
      </View>

      {/* Emergency Category Selector */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Select Hazard Category</Text>

        <View style={styles.categoryGrid}>
          {emergencyCategories.map((cat) => {
            const isSelected = emergencyType === cat.type;
            return (
              <TouchableOpacity
                key={cat.type}
                style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
                onPress={() => setEmergencyType(cat.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, isSelected && styles.selectedCatLabel]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Emergency Description & People Affected */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>3. Emergency Situation & People Affected</Text>

        <View style={styles.inputFieldGroup}>
          <Text style={styles.label}>Describe your situation & immediate danger *</Text>
          <textarea
            className="w-full p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E14434] bg-gray-50"
            rows={3}
            placeholder="e.g. Roof flooded, 3 people trapped including elderly person. Need boat evacuation urgently."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </View>

        {/* Counter for People Affected */}
        <View style={styles.counterRow}>
          <View style={styles.counterLeft}>
            <Users size={18} color="#0F6E5C" />
            <Text style={styles.counterLabel}>People Trapped / Affected</Text>
          </View>
          <View style={styles.counterControls}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPeopleAffected(Math.max(1, peopleAffected - 1))}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterVal}>{peopleAffected}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPeopleAffected(peopleAffected + 1)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Priority Selector */}
        <View style={styles.priorityBox}>
          <Text style={styles.label}>Estimated Severity Level</Text>
          <View style={styles.priorityGroup}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityBtn,
                  priority === p && (p === 'HIGH' ? styles.priHigh : p === 'MEDIUM' ? styles.priMed : styles.priLow)
                ]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityText, priority === p && styles.priTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Photo Attachment & Guest Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>4. Photo Proof & Contact Info</Text>

        <View style={styles.photoUploadBox}>
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0F6E5C] transition-colors bg-gray-50">
            <Camera size={24} color="#0F6E5C" />
            <span className="mt-2 text-xs font-semibold text-gray-600">
              {imageUrl ? 'Photo Attached (Tap to change)' : 'Attach Hazard Photo (Optional)'}
            </span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
          </label>
          {imageUrl && (
            <View style={styles.imagePreviewWrapper}>
              <img src={imageUrl} alt="Hazard Preview" className="w-full h-32 object-cover rounded-xl mt-2" />
            </View>
          )}
        </View>

        {!isAuthenticated && (
          <View style={styles.guestFieldsBox}>
            <Text style={styles.guestHeading}>Guest Contact (No Account Needed)</Text>

            <View style={styles.inputFieldGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <input
                type="text"
                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]"
                placeholder="e.g. Sunita Devi"
                value={formGuestName}
                onChange={(e) => setFormGuestName(e.target.value)}
              />
            </View>

            <View style={styles.inputFieldGroup}>
              <Text style={styles.label}>Phone Number for Rescuers *</Text>
              <input
                type="tel"
                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]"
                placeholder="+91 98765 43210"
                value={formGuestPhone}
                onChange={(e) => setFormGuestPhone(e.target.value)}
              />
            </View>
          </View>
        )}
      </View>

      {/* Submit Action Button */}
      <TouchableOpacity
        style={[styles.submitSosBtn, submitting && styles.submitDisabled]}
        onPress={handleSubmitSOS}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <AlertTriangle size={22} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.submitSosText}>DISPATCH EMERGENCY SOS</Text>
          </>
        )}
      </TouchableOpacity>
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
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E14434',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A2233',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2233',
  },
  reDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reDetectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F6E5C',
  },
  mapInstruction: {
    fontSize: 11,
    color: '#6B7280',
  },
  mapFrame: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  coordBar: {
    backgroundColor: '#F7F9FC',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  coordText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F6E5C',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '23%',
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 4,
  },
  selectedCategoryCard: {
    backgroundColor: '#FDF2F0',
    borderColor: '#E14434',
    borderWidth: 2,
  },
  catIcon: {
    fontSize: 20,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  selectedCatLabel: {
    color: '#E14434',
    fontWeight: '800',
  },
  inputFieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 10,
    borderRadius: 10,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2233',
  },
  counterVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F6E5C',
    minWidth: 16,
    textAlign: 'center',
  },
  priorityBox: {
    gap: 6,
  },
  priorityGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  priLow: {
    backgroundColor: '#EDF9F2',
    borderWidth: 1,
    borderColor: '#2E9E5B',
  },
  priMed: {
    backgroundColor: '#FEF8EC',
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  priHigh: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#E14434',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  priTextActive: {
    color: '#1A2233',
    fontWeight: '800',
  },
  photoUploadBox: {
    gap: 8,
  },
  imagePreviewWrapper: {
    marginTop: 4,
  },
  guestFieldsBox: {
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  guestHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F6E5C',
  },
  submitSosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E14434',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#E14434',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitSosText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
