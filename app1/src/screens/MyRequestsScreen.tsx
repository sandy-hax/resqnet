import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiService, SOSRequest } from '../services/api';

export const MyRequestsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const list = await apiService.getMySOSRequests();
      setRequests(list);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getStatusColor = (status: SOSRequest['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return { bg: '#FEF8EC', text: '#D97706', border: '#F5A623' };
      case 'VERIFIED':
        return { bg: '#E6F4F1', text: '#0F6E5C', border: '#0F6E5C' };
      case 'ASSIGNED':
      case 'RESPONDER_ON_WAY':
        return { bg: '#EDF9F2', text: '#2E9E5B', border: '#2E9E5B' };
      case 'RESOLVED':
        return { bg: '#F3F4F6', text: '#4B5563', border: '#9CA3AF' };
      default:
        return { bg: '#FDF2F0', text: '#E14434', border: '#E14434' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>My Emergency SOS Requests</Text>
        <Text style={styles.subtitle}>Active and past emergency dispatches associated with your device/account.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="medium" color="#0F6E5C" />
          <Text style={styles.loadingText}>Loading request history...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <ShieldAlert size={36} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Emergency Requests Found</Text>
          <Text style={styles.emptyDesc}>You haven't submitted any SOS requests yet.</Text>
          <TouchableOpacity style={styles.createSosBtn} onPress={() => navigate('/sos/new')}>
            <Text style={styles.createSosText}>Trigger SOS Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listGroup}>
          {requests.map((req) => {
            const st = getStatusColor(req.status);
            return (
              <TouchableOpacity
                key={req.sos_id}
                style={styles.requestCard}
                onPress={() => navigate(`/sos/${req.sos_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.sosId}>{req.sos_id}</Text>
                    <Text style={styles.typeText}>{req.emergency_type} EMERGENCY</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.statusBadgeText, { color: st.text }]}>{req.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                <Text style={styles.descText} numberOfLines={2}>
                  {req.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={styles.timeText}>
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={styles.trackAction}>
                    <Text style={styles.trackText}>Track Live Status</Text>
                    <ChevronRight size={14} color="#0F6E5C" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A2233',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingBox: {
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2233',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  createSosBtn: {
    backgroundColor: '#E14434',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  createSosText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  listGroup: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    gap: 2,
  },
  sosId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F6E5C',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E14434',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  descText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  trackAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F6E5C',
  },
});
