import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { BookOpen, CheckCircle, Radio, Shield, Download, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { apiService, ContentModule } from '../services/api';
import { wsService } from '../services/websocket';

export const AwarenessScreen: React.FC = () => {
  const [contentList, setContentList] = useState<ContentModule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();

    // Listen to real-time WebSocket content published events
    const unsub = wsService.subscribe('content.published', (msg) => {
      setContentList((prev) => [msg.payload, ...prev]);
    });
    return unsub;
  }, []);

  const fetchContent = async () => {
    try {
      const data = await apiService.getContent();
      setContentList(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const categories = ['ALL', 'FLOOD', 'CYCLONE', 'EARTHQUAKE', 'FIRE', 'PROGRAMS'];

  const filteredList = contentList.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'PROGRAMS') return item.is_program;
    return item.disaster_type === selectedCategory;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <View style={styles.headerBadge}>
          <Shield size={14} color="#0F6E5C" />
          <Text style={styles.headerBadgeText}>AUTHORITY VERIFIED GUIDES</Text>
        </View>
        <Text style={styles.title}>Awareness & Preparedness</Text>
        <Text style={styles.subtitle}>Official safety protocols, survival steps, and community preparedness initiatives.</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catTab, selectedCategory === cat && styles.activeCatTab]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catTabText, selectedCategory === cat && styles.activeCatTabText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="medium" color="#0F6E5C" />
          <Text style={styles.loadingText}>Loading safety guides...</Text>
        </View>
      ) : (
        <View style={styles.contentList}>
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.content_id;
            return (
              <View key={item.content_id} style={styles.contentCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.typeBadge, item.is_program && styles.programBadge]}>
                    <Text style={[styles.typeBadgeText, item.is_program && styles.programBadgeText]}>
                      {item.is_program ? 'GOVT PROGRAM' : item.disaster_type}
                    </Text>
                  </View>
                  {item.target_area && (
                    <Text style={styles.targetAreaText}>📍 {item.target_area}</Text>
                  )}
                </View>

                <Text style={styles.contentTitle}>{item.title}</Text>
                <Text style={styles.contentBody}>{item.body}</Text>

                {item.media_url && (
                  <View style={styles.mediaFrame}>
                    <img src={item.media_url} alt={item.title} className="w-full h-40 object-cover rounded-xl mt-2" />
                  </View>
                )}

                {/* Checklist Dropdown */}
                {item.checklist && item.checklist.length > 0 && (
                  <View style={styles.checklistSection}>
                    <TouchableOpacity
                      style={styles.checklistHeader}
                      onPress={() => setExpandedId(isExpanded ? null : item.content_id)}
                    >
                      <View style={styles.checklistTitleRow}>
                        <CheckCircle size={16} color="#0F6E5C" />
                        <Text style={styles.checklistTitle}>Actionable Survival Checklist ({item.checklist.length})</Text>
                      </View>
                      {isExpanded ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.checklistBody}>
                        {item.checklist.map((chk, idx) => (
                          <View key={idx} style={styles.checkItem}>
                            <View style={styles.checkSquare}>
                              <CheckCircle size={12} color="#0F6E5C" />
                            </View>
                            <Text style={styles.checkText}>{chk}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
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
  tabScroll: {
    marginHorizontal: -16,
  },
  tabContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8EF',
  },
  activeCatTab: {
    backgroundColor: '#0F6E5C',
    borderColor: '#0F6E5C',
  },
  catTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  activeCatTabText: {
    color: '#FFFFFF',
  },
  loadingBox: {
    alignItems: 'center',
    padding: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  contentList: {
    gap: 14,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E8EF',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  programBadge: {
    backgroundColor: '#FEF8EC',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F6E5C',
  },
  programBadgeText: {
    color: '#F5A623',
  },
  targetAreaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2233',
  },
  contentBody: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  mediaFrame: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checklistSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F6E5C',
  },
  checklistBody: {
    marginTop: 8,
    gap: 6,
    backgroundColor: '#F7F9FC',
    padding: 10,
    borderRadius: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkSquare: {
    marginTop: 2,
  },
  checkText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
});
