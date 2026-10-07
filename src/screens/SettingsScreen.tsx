import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme, ThemeMode, ACCENTS, AccentKey } from '../context/ThemeContext';
import { Header, LoadingOverlay, useToast } from '../components/ui';
import { BannerSlot } from '../components/ads';
import { Segmented, PAGE_SIZE_KEY } from './EditorScreen';
import { useAds, useAdFreeUnlock } from '../hooks/useAds';
import { useDocuments } from '../hooks/useDocumentActions';
import { adsManager, AD_FREE_ADS_REQUIRED, AD_FREE_MINUTES } from '../services/adsManager';
import { PageSize, deleteAllDocuments, formatBytes } from '../services/documents';
import type { ScreenProps } from '../navigation';

type IconName = keyof typeof Ionicons.glyphMap;
const PACKAGE = 'com.wess.pdfocrscanpro';
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

const TIPS = [
  'Use even lighting and avoid shadows across the page.',
  'Place the page on a dark, contrasting surface for the best edge detection.',
  'Hold the phone parallel to the page to keep text straight.',
  'Clean, printed fonts give the most accurate text recognition.',
];

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { theme, themeMode, setThemeMode, accent, setAccent } = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const docs = useDocuments();
  const { canShowAds, adFree, adFreeMinutes, adFreeProgress } = useAds();
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const adFreeUnlock = useAdFreeUnlock();

  useEffect(() => {
    AsyncStorage.getItem(PAGE_SIZE_KEY).then((v) => { if (v === 'A4' || v === 'Letter') setPageSize(v); }).catch(() => {});
  }, []);

  const changePageSize = (v: PageSize) => { setPageSize(v); AsyncStorage.setItem(PAGE_SIZE_KEY, v).catch(() => {}); };
  const totalSize = (docs ?? []).reduce((s, d) => s + (d.size || 0), 0);


  const clearAll = () => Alert.alert('Delete all documents?', 'Every saved PDF will be permanently removed from this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete all', style: 'destructive', onPress: async () => { await deleteAllDocuments(); toast('All documents deleted', 'trash'); } },
  ]);

  const rate = () => Linking.openURL(Platform.OS === 'android' ? `market://details?id=${PACKAGE}` : STORE_URL)
    .catch(() => Linking.openURL(STORE_URL));

  const shareApp = () => Share.share({ message: `I scan documents to PDF and copy text with PDF OCR Scanner: ${STORE_URL}` }).catch(() => {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Section title="Appearance">
          <Row icon="contrast" tint="#334155" label="Theme">
            <Segmented<ThemeMode> value={themeMode} options={[['light', 'Light'], ['dark', 'Dark'], ['system', 'Auto']]} onChange={setThemeMode} />
          </Row>
          <View style={styles.accentBlock}>
            <View style={styles.accentHead}>
              <View style={[styles.rowIcon, { backgroundColor: '#A855F7' }]}><Ionicons name="color-palette" size={17} color="#fff" /></View>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>Accent colour</Text>
              <Text style={[styles.rowValue, { color: c.textMuted }]}>{ACCENTS[accent].label}</Text>
            </View>
            <View style={styles.swatches}>
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
                const active = k === accent;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setAccent(k)}
                    accessibilityLabel={`${ACCENTS[k].label} accent`}
                    accessibilityState={{ selected: active }}
                    style={[styles.swatchRing, { borderColor: active ? ACCENTS[k].swatch : 'transparent' }]}
                  >
                    <View style={[styles.swatch, { backgroundColor: ACCENTS[k].swatch }]}>
                      {active && <Ionicons name="checkmark" size={18} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title="Scanning">
          <Row icon="document" tint="#3B82F6" label="Default page size">
            <Segmented<PageSize> value={pageSize} options={[['A4', 'A4'], ['Letter', 'Letter']]} onChange={changePageSize} />
          </Row>
          <Row icon="hardware-chip" tint="#10B981" label="Text recognition" value="On-device · private" />
        </Section>

        {(canShowAds || adFree) && (
          <Section title="Premium">
            {adFree
              ? <Row icon="checkmark-circle" tint="#22C55E" label="Premium active" value={`${adFreeMinutes} min left`} />
              : <Row icon="diamond" tint="#F59E0B" label={`${AD_FREE_MINUTES}-minute Premium`} value={adFreeProgress ? `${adFreeProgress}/${AD_FREE_ADS_REQUIRED} watched` : `Watch ${AD_FREE_ADS_REQUIRED} ads`} onPress={adFreeUnlock.start} accent />}
            {adsManager.privacyOptionsRequired && (
              <Row icon="shield-checkmark" tint="#0EA5E9" label="Privacy & ad choices" onPress={() => adsManager.showPrivacyOptions()} chevron />
            )}
          </Section>
        )}

        <Section title="Storage">
          <Row icon="folder" tint="#F97316" label="Documents" value={`${docs?.length ?? 0} · ${formatBytes(totalSize)}`} />
          <Row icon="trash" label="Delete all documents" onPress={clearAll} danger disabled={!docs?.length} />
        </Section>

        <Section title="Tips for better scans">
          {TIPS.map((t, i) => (
            <View key={i} style={styles.tip}>
              <Text style={[styles.tipNo, { color: c.primary, backgroundColor: c.primarySoft }]}>{i + 1}</Text>
              <Text style={[styles.tipText, { color: c.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </Section>

        <Section title="About">
          <Row icon="star" tint="#EAB308" label="Rate the app" onPress={rate} chevron />
          <Row icon="share-social" tint="#EC4899" label="Share with friends" onPress={shareApp} chevron />
          <Row icon="information-circle" tint="#6366F1" label="Version" value={Constants.expoConfig?.version ?? '—'} />
        </Section>
      </ScrollView>
      <BannerSlot />
      <LoadingOverlay visible={adFreeUnlock.busy} label="Loading ad…" />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{children}</View>
    </View>
  );
}

function Row({ icon, tint = '#64748B', label, value, onPress, children, chevron, danger, accent, disabled }: {
  tint?: string;
  icon: IconName; label: string; value?: string; onPress?: () => void; children?: React.ReactNode;
  chevron?: boolean; danger?: boolean; accent?: boolean; disabled?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const labelColor = danger ? c.danger : c.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.4 : 1 }, pressed && { backgroundColor: c.surfaceAlt }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? c.danger : tint }]}><Ionicons name={icon} size={17} color="#fff" /></View>
      <Text style={[styles.rowLabel, { color: labelColor }]} numberOfLines={1}>{label}</Text>
      {children}
      {!!value && <Text style={[styles.rowValue, { color: accent ? c.primary : c.textMuted, fontWeight: accent ? '800' : '500' }]}>{value}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={18} color={c.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 54 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowValue: { fontSize: 14 },
  accentBlock: { paddingHorizontal: 14, paddingBottom: 14 },
  accentHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  swatchRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'flex-start' },
  tipNo: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  tipText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
});
