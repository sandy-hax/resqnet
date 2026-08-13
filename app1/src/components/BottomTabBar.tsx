import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, AlertCircle, Clock, HomeIcon, BookOpen, MapPin } from 'lucide-react';

export const BottomTabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'sos', label: 'SOS', icon: AlertCircle, path: '/sos/new', isSos: true },
    { id: 'requests', label: 'My SOS', icon: Clock, path: '/requests' },
    { id: 'shelters', label: 'Shelters', icon: MapPin, path: '/shelters' },
    { id: 'guides', label: 'Safety', icon: BookOpen, path: '/awareness' },
  ];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));

        if (tab.isSos) {
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.sosTabBtn}
              onPress={() => navigate(tab.path)}
              activeOpacity={0.85}
            >
              <View style={styles.sosIconCircle}>
                <AlertCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.sosLabel}>EMERGENCY</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabBtn}
            onPress={() => navigate(tab.path)}
            activeOpacity={0.7}
          >
            <Icon size={20} color={isActive ? '#0F6E5C' : '#9CA3AF'} strokeWidth={isActive ? 2.5 : 1.8} />
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E8EF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    height: 60,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#0F6E5C',
    fontWeight: '700',
  },
  sosTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E14434',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E14434',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sosLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E14434',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
