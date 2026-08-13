import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Shield, PhoneCall, Radio, User, LogOut, CheckCircle2, AlertTriangle, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderBarProps {
  viewMode: 'mobile' | 'desktop';
  toggleViewMode: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ viewMode, toggleViewMode }) => {
  const { user, isAuthenticated, isWsConnected, logout, login, register } = useAuth();
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAuthSubmit = async () => {
    if (authMode === 'login') {
      await login(phone || '+91 98765 43210');
    } else {
      await register({ name: name || 'Citizen User', phone: phone || '+91 98765 43210' });
    }
    setShowAuthModal(false);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Top Brand Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoBadge}>
            <Shield size={20} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.brandTitle}>ResQNet</Text>
            <Text style={styles.brandSubtitle}>Emergency Response System</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          {/* Emergency Hotline Button */}
          <TouchableOpacity
            style={styles.hotlineButton}
            onPress={() => setShowHotlineModal(true)}
            activeOpacity={0.8}
          >
            <PhoneCall size={16} color="#E14434" />
            <Text style={styles.hotlineText}>112 / SOS</Text>
          </TouchableOpacity>

          {/* User Profile / Login */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowAuthModal(true)}
            activeOpacity={0.8}
          >
            <User size={18} color="#0F6E5C" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live System Status Sub-header */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isWsConnected ? styles.dotGreen : styles.dotOrange]} />
          <Text style={styles.statusText}>
            {isWsConnected ? 'Live Network Connected' : 'ResQNet Offline Engine Active'}
          </Text>
        </View>

        <TouchableOpacity onPress={toggleViewMode} style={styles.viewToggleBtn}>
          <Text style={styles.viewToggleText}>
            {viewMode === 'mobile' ? '💻 Framing Mode' : '📱 Full Mobile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hotline Modal */}
      <Modal visible={showHotlineModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>National Emergency Numbers</Text>
              <TouchableOpacity onPress={() => setShowHotlineModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.hotlineList}>
              <View style={styles.hotlineCard}>
                <Text style={styles.hotlineName}>National Emergency Helpline</Text>
                <Text style={styles.hotlineNum}>112</Text>
              </View>
              <View style={styles.hotlineCard}>
                <Text style={styles.hotlineName}>NDRF Disaster Response</Text>
                <Text style={styles.hotlineNum}>1078 / 011-24363260</Text>
              </View>
              <View style={styles.hotlineCard}>
                <Text style={styles.hotlineName}>Fire & Rescue Control</Text>
                <Text style={styles.hotlineNum}>101</Text>
              </View>
              <View style={styles.hotlineCard}>
                <Text style={styles.hotlineName}>Ambulance & Medical</Text>
                <Text style={styles.hotlineNum}>108</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowHotlineModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Auth Modal */}
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isAuthenticated ? 'Citizen Account Profile' : authMode === 'login' ? 'Citizen Sign In' : 'Register Account'}
              </Text>
              <TouchableOpacity onPress={() => setShowAuthModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isAuthenticated ? (
              <View style={styles.profileBox}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{user?.name?.charAt(0) || 'U'}</Text>
                </View>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profilePhone}>{user?.phone}</Text>
                <Text style={styles.profileRole}>Role: REQUESTER (Citizen)</Text>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); setShowAuthModal(false); }}>
                  <LogOut size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formBox}>
                <Text style={styles.guestNote}>
                  * Note: ResQNet allows SOS submissions without mandatory login.
                </Text>

                {authMode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <input
                      type="text"
                      className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]"
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <input
                    type="tel"
                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </View>

                <TouchableOpacity style={styles.submitAuthBtn} onPress={handleAuthSubmit}>
                  <Text style={styles.submitAuthText}>
                    {authMode === 'login' ? 'Sign In / Instant Continue' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  style={styles.switchAuthBtn}
                >
                  <Text style={styles.switchAuthText}>
                    {authMode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E8EF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F6E5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F6E5C',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  hotlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E14434',
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#2E9E5B',
  },
  dotOrange: {
    backgroundColor: '#F5A623',
  },
  statusText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  viewToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2233',
  },
  hotlineList: {
    gap: 10,
    marginBottom: 16,
  },
  hotlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  hotlineName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  hotlineNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E14434',
  },
  closeBtn: {
    backgroundColor: '#0F6E5C',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  profileBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F6E5C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2233',
  },
  profilePhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F6E5C',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E14434',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  formBox: {
    gap: 12,
  },
  guestNote: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    fontStyle: 'italic',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  submitAuthBtn: {
    backgroundColor: '#0F6E5C',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitAuthText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  switchAuthBtn: {
    alignItems: 'center',
    marginTop: 6,
  },
  switchAuthText: {
    fontSize: 12,
    color: '#0F6E5C',
    fontWeight: '600',
  },
});
