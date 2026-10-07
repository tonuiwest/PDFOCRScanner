import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { IconButton, LoadingOverlay } from '../components/ui';
import { BannerSlot, NativeAdCard } from '../components/ads';
import { DocumentRow } from '../components/DocumentRow';
import { ScanGraphic } from '../components/ScanGraphic';
import { useDocumentActions, useDocuments, openDocument } from '../hooks/useDocumentActions';
import { useAds, useAdFreeUnlock } from '../hooks/useAds';
import { AD_FREE_ADS_REQUIRED, AD_FREE_MINUTES } from '../services/adsManager';
import { pickImages, scanPages } from '../services/capture';
import { extractTextFromPages } from '../services/ocrService';
import type { ScreenProps } from '../navigation';
import { t } from '../i18n';

type IconName = keyof typeof Ionicons.glyphMap;

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { theme } = useTheme();
  const c = theme.colors;
  const docs = useDocuments();
  const { canShowAds, adFree, adFreeMinutes, adFreeProgress } = useAds();
  const adFreeUnlock = useAdFreeUnlock();
  const { showOptions, element } = useDocumentActions();
  const [busy, setBusy] = useState<string | null>(null);

  const scan = async () => {
    const pages = await scanPages();
    if (pages.length) navigation.navigate('Editor', { pages });
  };

  const importPhotos = async () => {
    const pages = await pickImages(true);
    if (pages.length) navigation.navigate('Editor', { pages });
  };

  const extractText = async () => {
    const pages = await pickImages(true);
    if (!pages.length) return;
    setBusy(t('readingText'));
    try {
      const text = await extractTextFromPages(pages, (d, n) => n > 1 && setBusy(t('readingTextProgress', { done: d, total: n })));
      setBusy(null);
      if (!text) { Alert.alert(t('noTextTitle'), t('noTextPhoto')); return; }
      navigation.navigate('Text', { text, title: t('extractedText') });
    } catch (e: any) {
      setBusy(null);
      Alert.alert(t('readTextFailed'), e?.message);
    }
  };


  const recent = (docs ?? []).slice(0, 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{greeting}</Text>
            <Text style={[styles.brand, { color: c.textPrimary }]}>{t('appName')}</Text>
          </View>
          <IconButton icon="settings-outline" filled onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('settings')} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={scan}
            accessibilityRole="button"
            accessibilityLabel={t('scanADocument')}
            style={({ pressed }) => [styles.hero, { backgroundColor: c.primary, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          >
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.heroBadge}>
                  <Ionicons name="camera" size={12} color="#fff" />
                  <Text style={styles.heroBadgeText}>{t('autoEdge')}</Text>
                </View>
                <Text style={styles.heroTitle}>{t('scanDocument')}</Text>
                <Text style={styles.heroSub}>{t('heroSub')}</Text>
                <View style={styles.heroCta}>
                  <Ionicons name="camera" size={16} color={c.primary} />
                  <Text style={[styles.heroCtaText, { color: c.primary }]}>{t('startScanning')}</Text>
                </View>
              </View>
              <ScanGraphic accent={c.primary} />
            </View>
          </Pressable>

          <View style={styles.grid}>
            <QuickAction icon="images" tint="#EC4899" label={t('photosToPdf')} onPress={importPhotos} />
            <QuickAction icon="document-text" tint="#10B981" label={t('extractText')} onPress={extractText} />
            <QuickAction icon="folder-open" tint="#F59E0B" label={t('documents')} onPress={() => navigation.navigate('Documents')} />
          </View>

          {canShowAds && (
            <Pressable onPress={adFreeUnlock.start} style={({ pressed }) => [styles.offer, { backgroundColor: c.warningSoft, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="diamond" size={18} color={c.warning} />
              <Text style={[styles.offerText, { color: c.textPrimary }]}>{t('premiumBanner', { n: AD_FREE_MINUTES })}</Text>
              <Text style={[styles.offerCta, { color: c.warning }]}>{adFreeProgress ? t('continueProgress', { done: adFreeProgress, total: AD_FREE_ADS_REQUIRED }) : t('watchNAds', { n: AD_FREE_ADS_REQUIRED })}</Text>
            </Pressable>
          )}
          {adFree && (
            <View style={[styles.offer, { backgroundColor: c.successSoft }]}>
              <Ionicons name="checkmark-circle" size={18} color={c.success} />
              <Text style={[styles.offerText, { color: c.textPrimary }]}>{t('premiumActiveLeft', { n: adFreeMinutes })}</Text>
            </View>
          )}

          <View style={styles.sectionHead}>
            <Text style={[styles.section, { color: c.textPrimary }]}>{t('recent')}</Text>
            {(docs?.length ?? 0) > 0 && (
              <Pressable onPress={() => navigation.navigate('Documents')} hitSlop={8}>
                <Text style={[styles.seeAll, { color: c.primary }]}>{t('seeAll', { n: docs!.length })}</Text>
              </Pressable>
            )}
          </View>

          {docs && recent.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: c.border }]}>
              <Ionicons name="document-text-outline" size={26} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>{t('noDocsTitle')}</Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>{t('noDocsHome')}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recent.map((d) => <DocumentRow key={d.id} doc={d} onPress={() => openDocument(d)} onMore={() => showOptions(d)} />)}
            </View>
          )}

          <NativeAdCard style={{ marginTop: 16 }} />
        </ScrollView>
        <BannerSlot />
      </SafeAreaView>
      {element}
      <LoadingOverlay visible={!!busy || adFreeUnlock.busy} label={busy ?? t('loadingAd')} />
    </View>
  );
}

function QuickAction({ icon, tint, label, onPress }: { icon: IconName; tint: string; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quick, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: tint, shadowColor: tint }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text numberOfLines={1} style={[styles.quickLabel, { color: c.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  greeting: { fontSize: 13, fontWeight: '600' },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  hero: { borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroDecor1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -60, top: -80, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroDecor2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, right: 30, bottom: -90, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12, letterSpacing: -0.3 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 4 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 18 },
  heroCtaText: { fontSize: 14, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center' },
  quickIcon: { width: 48, height: 48, borderRadius: 16, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickLabel: { fontSize: 12.5, fontWeight: '700' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  offerText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  offerCta: { fontSize: 13, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  seeAll: { fontSize: 14, fontWeight: '700' },
  emptyCard: { borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 22, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
});
