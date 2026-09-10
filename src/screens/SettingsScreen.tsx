import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { getBannerId } from '../services/adsManager';
import NativeAdCard from '../components/NativeAdCard';

const TIPS = [
  { title: 'Good Lighting', text: 'Ensure even lighting and avoid shadows on the document.' },
  { title: 'Flat Surface', text: 'Place the document on a flat, contrasting background.' },
  { title: 'Steady Hands', text: 'Hold the phone parallel to the document for the best crop.' },
  { title: 'OCR Tips', text: 'Use high-resolution images - clean fonts work best for OCR.' },
  { title: 'Batch Scan', text: 'You can scan up to 10 pages at once, then save as one PDF.' },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  // themeMode/setThemeMode is the single source of truth for appearance - this
  // screen no longer keeps its own duplicate copy, which is what previously
  // let "System" silently fail to apply.
  const { theme: appTheme, themeMode, setThemeMode } = useTheme();
  const [storage, setStorage] = useState({ count: 0, size: '0 MB' });
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    calcStorage();
  }, []);

  const calcStorage = async () => {
    const lib = await AsyncStorage.getItem('pdf_library');
    const pdfs = lib ? JSON.parse(lib) : [];
    setStorage({ count: pdfs.length, size: `${(pdfs.length * 0.8).toFixed(1)} MB` });
  };

  const cardStyle = [styles.card, { backgroundColor: appTheme.colors.card, borderColor: appTheme.colors.border, shadowColor: appTheme.colors.shadow }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: appTheme.colors.card, borderBottomColor: appTheme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: appTheme.colors.textPrimary }]}>SETTINGS</Text>
        <Text style={[styles.headerSub, { color: appTheme.colors.textSecondary }]}>Customize your scanning experience</Text>
        <View style={[styles.headerRule, { backgroundColor: appTheme.colors.accent }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={cardStyle}>
          <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>App Version</Text>
          <Text style={[styles.cardValue, { color: appTheme.colors.textPrimary }]}>{Constants.expoConfig?.version || '1.0.0'}</Text>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Appearance</Text>
          <View style={styles.segmentRow}>
            {(['light', 'dark', 'system'] as const).map((option) => {
              const active = themeMode === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setThemeMode(option)}
                  style={[
                    styles.segment,
                    { borderColor: active ? appTheme.colors.primary : appTheme.colors.border },
                    active ? { backgroundColor: appTheme.colors.accentSoft } : {},
                  ]}
                >
                  <Text style={[styles.segmentText, { color: active ? appTheme.colors.primary : appTheme.colors.textPrimary }]}>
                    {option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.smallNote, { color: appTheme.colors.textSecondary }]}>
            "System" automatically follows your device's appearance setting.
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Storage Used</Text>
          <Text style={[styles.cardValue, { color: appTheme.colors.textPrimary }]}>{storage.count} PDFs • {storage.size}</Text>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>OCR Engine</Text>
          <Text style={[styles.cardValue, { color: appTheme.colors.textPrimary }]}>On-device Text Recognition</Text>
        </View>

        {/* Pro Tips - moved here from the home page to keep Home focused on actions */}
        <TouchableOpacity style={cardStyle} onPress={() => setTipsOpen((v) => !v)} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Pro Tips</Text>
            <MaterialCommunityIcons name={tipsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={appTheme.colors.textSecondary} />
          </View>
          <Text style={[styles.cardValue, { color: appTheme.colors.textPrimary }]}>Get better scans</Text>
        </TouchableOpacity>

        {tipsOpen && TIPS.map((t, i) => (
          <View key={i} style={[styles.tipCard, { backgroundColor: appTheme.colors.backgroundAlt, borderColor: appTheme.colors.border }]}>
            <Text style={[styles.tipTitle, { color: appTheme.colors.textPrimary }]}>{t.title}</Text>
            <Text style={[styles.tipText, { color: appTheme.colors.textSecondary }]}>{t.text}</Text>
          </View>
        ))}
        <NativeAdCard style={{ width: '100%', marginTop: 4 }} />
      </ScrollView>

      {/* Persistent banner - always docked at the bottom, on every screen */}
      <View style={[styles.bannerWrapper, { backgroundColor: appTheme.colors.card, borderTopColor: appTheme.colors.border, paddingBottom: Math.max(insets.bottom, 4) }]}>
        <BannerAd unitId={getBannerId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>
    </SafeAreaView>
  );
}

const serifTitle = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.2, fontFamily: serifTitle },
  headerSub: { fontSize: 13, marginTop: 6 },
  headerRule: { height: 2, width: 36, borderRadius: 1, marginTop: 12 },
  card: {
    borderRadius: 8, borderWidth: 1, padding: 14, marginBottom: 12,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  cardLabel: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.2 },
  cardValue: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  segmentRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  segmentText: { fontWeight: '700' },
  smallNote: { fontSize: 12, marginTop: 10 },
  tipCard: { borderRadius: 8, borderWidth: 1, padding: 12, marginTop: -4, marginBottom: 10 },
  tipTitle: { fontWeight: '700', fontSize: 13 },
  tipText: { marginTop: 4, fontSize: 12.5, lineHeight: 18 },
  bannerWrapper: { borderTopWidth: 1, alignItems: 'center', minHeight: 58, justifyContent: 'center' },
});
