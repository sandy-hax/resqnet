import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Radio, Shield, MapPin, BookOpen, Clock, PhoneCall, ChevronRight, Info, HeartPulse } from 'lucide-react';
import { wsService } from '../services/websocket';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [broadcastAlert, setBroadcastAlert] = useState<{ title: string; message: string; severity: string } | null>({
    title: 'SEVERE FLOOD ALERT — SECTOR 4 & LOW LYING BASINS',
    message: 'Water levels surging rapidly. Residents in low-lying sectors must move to higher ground immediately or signal ResQNet SOS.',
    severity: 'HIGH',
  });

  useEffect(() => {
    const unsub = wsService.subscribe('alert.broadcast', (msg) => {
      setBroadcastAlert(msg.payload);
    });
    return unsub;
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* High Urgency Broadcast Banner */}
      {broadcastAlert && (
        <View style={styles.alertBanner}>
          <View style={styles.alertHeader}>
            <View style={styles.alertBadge}>
              <Radio size={14} color="#FFFFFF" />
              <Text style={styles.alertBadgeText}>LIVE BROADCAST</Text>
            </View>
            <Text style={styles.alertTime}>Just Now</Text>
          </View>
          <Text style={styles.alertTitle}>{broadcastAlert.title}</Text>
          <Text style={styles.alertMessage}>{broadcastAlert.message}</Text>
        </View>
      )}

      {/* Main SOS Callout Box */}
      <View style={styles.sosCard}>
        <Text style={styles.sosHeadline}>In Immediate Danger?</Text>
        <Text style={styles.sosSubline}>Press below to automatically capture GPS coordinates and dispatch emergency rescue teams.</Text>

        {/* Pulsing Giant SOS Button */}
        <View style={styles.sosBtnWrapper}>
          <TouchableOpacity
            style={styles.sosMainButton}
            onPress={() => navigate('/sos/new')}
            activeOpacity={0.85}
          >
            <AlertTriangle size={42} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.sosMainText}>TRIGGER SOS</Text>
            <Text style={styles.sosSubText}>TAP FOR IMMEDIATE HELP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guestNoteBox}>
          <Shield size={14} color="#0F6E5C" />
          <Text style={styles.guestNoteText}>Guest SOS Enabled — No Login Required for Emergency Action</Text>
        </View>
      </View>

      {/* Quick Navigation Action Grid */}
      <View style={styles.gridSection}>
        <Text style={styles.sectionTitle}>Emergency Services Grid</Text>

        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => navigate('/sos/new')}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FDF2F0' }]}>
              <AlertTriangle size={24} color="#E14434" />
            </View>
            <Text style={styles.cardTitle}>Instant SOS</Text>
            <Text style={styles.cardDesc}>Report emergency danger with GPS location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigate('/requests')}>
            <View style={[styles.cardIconBox, { backgroundColor: '#E6F4F1' }]}>
              <Clock size={24} color="#0F6E5C" />
            </View>
            <Text style={styles.cardTitle}>Live Tracker</Text>
            <Text style={styles.cardDesc}>Track rescue team status in real-time</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => navigate('/shelters')}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FEF8EC' }]}>
              <MapPin size={24} color="#F5A623" />
            </View>
            <Text style={styles.cardTitle}>Relief Shelters</Text>
            <Text style={styles.cardDesc}>Locate open shelter hubs & capacities</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigate('/awareness')}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EDF9F2' }]}>
              <BookOpen size={24} color="#2E9E5B" />
            </View>
            <Text style={styles.cardTitle}>Safety Guides</Text>
            <Text style={styles.cardDesc}>Official survival steps & preparedness</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency First Aid & Hotlines Section */}
      <View style={styles.hotlineSection}>
        <View style={styles.hotlineHeader}>
          <HeartPulse size={20} color="#E14434" />
          <Text style={styles.hotlineSectionTitle}>Emergency Direct Contacts</Text>
        </View>

        <View style={styles.hotlineItem}>
          <View style={styles.hotlineLeft}>
            <PhoneCall size={18} color="#0F6E5C" />
            <Text style={styles.hotlineLabel}>National Emergency Dispatch</Text>
          </View>
          <Text style={styles.hotlineVal}>112</Text>
        </View>

        <View style={styles.hotlineItem}>
          <View style={styles.hotlineLeft}>
            <PhoneCall size={18} color="#0F6E5C" />
            <Text style={styles.hotlineLabel}>Disaster Control Room</Text>
          </View>
          <Text style={styles.hotlineVal}>1078</Text>
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
    paddingBottom: 32,
  },
  alertBanner: {
    backgroundColor: '#991B1B',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#F87171',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertTime: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '500',
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertMessage: {
    color: '#FEE2E2',
    fontSize: 12,
    lineHeight: 16,
  },
  sosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sosHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A2233',
    marginBottom: 6,
    textAlign: 'center',
  },
  sosSubline: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  sosBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  sosMainButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#E14434',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E14434',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    gap: 4,
  },
  sosMainText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guestNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  guestNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F6E5C',
  },
  gridSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2233',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 6,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2233',
  },
  cardDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  hotlineSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 12,
  },
  hotlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotlineSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2233',
  },
  hotlineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotlineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  hotlineVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F6E5C',
  },
});
