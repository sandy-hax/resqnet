import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const { width } = useWindowDimensions();

  const isWide = width > 768;

  return (
    <View style={styles.outerWrapper}>
      {/* Container - Framed or Full View */}
      <View
        style={[
          styles.appContainer,
          isWide && viewMode === 'desktop' ? styles.desktopFrame : styles.fullScreen,
        ]}
      >
        {/* Mobile Header Bar */}
        <HeaderBar
          viewMode={viewMode}
          toggleViewMode={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
        />

        {/* Main Screen Content View */}
        <View style={styles.contentView}>{children}</View>

        {/* Mobile Bottom Navigation Tab Bar */}
        <BottomTabBar />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as any,
  },
  appContainer: {
    backgroundColor: '#F7F9FC',
    width: '100%',
    height: '100vh' as any,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  fullScreen: {
    maxWidth: '100%',
    borderRadius: 0,
  },
  desktopFrame: {
    maxWidth: 480,
    maxHeight: 900,
    borderRadius: 24,
    borderWidth: 10,
    borderColor: '#1E293B',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  },
  contentView: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    overflow: 'hidden',
  },
});
