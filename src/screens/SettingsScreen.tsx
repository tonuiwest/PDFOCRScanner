import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking, Share, Platform, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme, ThemeMode, ACCENTS, AccentKey } from '../context/ThemeContext';
import { Header, LoadingOverlay, useToast, rtlFlip } from '../components/ui';
import { BannerSlot } from '../components/ads';
import { Segmented, PAGE_SIZE_KEY } from './EditorScreen';
import { useAds, useAdFreeUnlock } from '../hooks/useAds';
import { useDocuments } from '../hooks/useDocumentActions';
import { adsManager, AD_FREE_ADS_REQUIRED, AD_FREE_MINUTES } from '../services/adsManager';
import { PageSize, deleteAllDocuments, formatBytes } from '../services/documents';
import { TextRecognitionScript, getOcrScript, setOcrScript } from '../services/ocrService';
import {
  t, LANGUAGES, LangCode, LangSetting, getLanguage, getLanguageSetting, setLanguageSetting, regionDefaultPageSize,
} from '../i18n';
import type { StringKey } from '../i18n/en';
import type { ScreenProps } from '../navigation';

type IconName = keyof typeof Ionicons.glyphMap;
const PACKAGE = 'com.wess.pdfocrscanpro';
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;
const TIPS: StringKey[] = ['tip1', 'tip2', 'tip3', 'tip4'];
const SCRIPTS: [TextRecognitionScript, StringKey][] = [
  [TextRecognitionScript.LATIN, 'scriptLatin'],
  [TextRecognitionScript.DEVANAGARI, 'scriptDevanagari'],
  [TextRecognitionScript.CHINESE, 'scriptChinese'],
  [TextRecognitionScript.JAPANESE, 'scriptJapanese'],
  [TextRecognitionScript.KOREAN, 'scriptKorean'],
];
// Letter-spacing and upper-casing break joined scripts (Arabic) and look odd in CJK/Indic text.
const LATIN_UI = !['ar', 'hi', 'ja', 'ko', 'zh'].includes(getLanguage());

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { theme, themeMode, setThemeMode, accent, setAccent } = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const docs = useDocuments();
  const { canShowAds, adFree, adFreeMinutes, adFreeProgress } = useAds();
  const [pageSize, setPageSize] = useState<PageSize>(regionDefaultPageSize);
  const [script, setScript] = useState(getOcrScript());
  const [picker, setPicker] = useState<'language' | 'script' | null>(null);
  const adFreeUnlock = useAdFreeUnlock();

  useEffect(() => {
    AsyncStorage.getItem(PAGE_SIZE_KEY).then((v) => { if (v === 'A4' || v === 'Letter') setPageSize(v); }).catch(() => {});
  }, []);

  const changePageSize = (v: PageSize) => { setPageSize(v); AsyncStorage.setItem(PAGE_SIZE_KEY, v).catch(() => {}); };
  const changeScript = (v: TextRecognitionScript) => { setScript(v); setOcrScript(v); };
  const totalSize = (docs ?? []).reduce((s, d) => s + (d.size || 0), 0);
  const langSetting = getLanguageSetting();
  const langLabel = langSetting === 'auto' ? `${t('languageAuto')} · ${LANGUAGES[getLanguage()].name}` : LANGUAGES[langSetting].name;
  const langOptions: [LangSetting, string][] = [
    ['auto', t('languageAuto')],
    ...(Object.keys(LANGUAGES) as LangCode[]).map((k) => [k, LANGUAGES[k].name] as [LangSetting, string]),
  ];

  const clearAll = () => Alert.alert(t('deleteAllTitle'), t('deleteAllBody'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('deleteAllConfirm'), style: 'destructive', onPress: async () => { await deleteAllDocuments(); toast(t('allDeleted'), 'trash'); } },
  ]);

  const rate = () => Linking.openURL(Platform.OS === 'android' ? `market://details?id=${PACKAGE}` : STORE_URL)
    .catch(() => Linking.openURL(STORE_URL));

  const shareApp = () => Share.share({ message: t('shareAppMessage', { url: STORE_URL }) }).catch(() => {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Header title={t('settings')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Section title={t('appearance')}>
          <Row icon="language" tint="#0EA5E9" label={t('language')} value={langLabel} onPress={() => setPicker('language')} chevron />
          <Row icon="contrast" tint="#334155" label={t('theme')}>
            <Segmented<ThemeMode> value={themeMode} options={[['light', t('light')], ['dark', t('dark')], ['system', t('auto')]]} onChange={setThemeMode} />
          </Row>
          <View style={styles.accentBlock}>
            <View style={styles.accentHead}>
              <View style={[styles.rowIcon, { backgroundColor: '#A855F7' }]}><Ionicons name="color-palette" size={17} color="#fff" /></View>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{t('accentColour')}</Text>
              <Text style={[styles.rowValue, { color: c.textMuted }]}>{t(ACCENTS[accent].label)}</Text>
            </View>
            <View style={styles.swatches}>
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
                const active = k === accent;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setAccent(k)}
                    accessibilityLabel={t(ACCENTS[k].label)}
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

        <Section title={t('scanning')}>
          <Row icon="document" tint="#3B82F6" label={t('defaultPageSize')}>
            <Segmented<PageSize> value={pageSize} options={[['A4', t('a4')], ['Letter', t('letter')]]} onChange={changePageSize} />
          </Row>
          <Row
            icon="text" tint="#8B5CF6" label={t('ocrScript')} onPress={() => setPicker('script')} chevron
            value={t(SCRIPTS.find(([s]) => s === script)?.[1] ?? 'scriptLatin')}
          />
          <Row icon="hardware-chip" tint="#10B981" label={t('textRecognition')} value={t('onDevice')} />
        </Section>

        {(canShowAds || adFree) && (
          <Section title={t('premium')}>
            {adFree
              ? <Row icon="checkmark-circle" tint="#22C55E" label={t('premiumActive')} value={t('minLeft', { n: adFreeMinutes })} />
              : <Row
                  icon="diamond" tint="#F59E0B" label={t('premiumRow', { min: AD_FREE_MINUTES })} accent onPress={adFreeUnlock.start}
                  value={adFreeProgress
                    ? t('watchedProgress', { done: adFreeProgress, total: AD_FREE_ADS_REQUIRED })
                    : t('watchNAds', { n: AD_FREE_ADS_REQUIRED })}
                />}
            {adsManager.privacyOptionsRequired && (
              <Row icon="shield-checkmark" tint="#0EA5E9" label={t('privacyChoices')} onPress={() => adsManager.showPrivacyOptions()} chevron />
            )}
          </Section>
        )}

        <Section title={t('storage')}>
          <Row icon="folder" tint="#F97316" label={t('documents')} value={`${docs?.length ?? 0} · ${formatBytes(totalSize)}`} />
          <Row icon="trash" label={t('deleteAll')} onPress={clearAll} danger disabled={!docs?.length} />
        </Section>

        <Section title={t('tipsTitle')}>
          {TIPS.map((k, i) => (
            <View key={k} style={styles.tip}>
              <Text style={[styles.tipNo, { color: c.primary, backgroundColor: c.primarySoft }]}>{i + 1}</Text>
              <Text style={[styles.tipText, { color: c.textSecondary }]}>{t(k)}</Text>
            </View>
          ))}
        </Section>

        <Section title={t('about')}>
          <Row icon="star" tint="#EAB308" label={t('rateApp')} onPress={rate} chevron />
          <Row icon="share-social" tint="#EC4899" label={t('shareApp')} onPress={shareApp} chevron />
          <Row icon="information-circle" tint="#6366F1" label={t('version')} value={Constants.expoConfig?.version ?? '—'} />
        </Section>
      </ScrollView>
      <BannerSlot />
      <LoadingOverlay visible={adFreeUnlock.busy} label={t('loadingAd')} />

      <OptionPicker<LangSetting>
        visible={picker === 'language'}
        title={t('language')}
        value={langSetting}
        options={langOptions}
        onSelect={(v) => { setPicker(null); if (v !== langSetting) setLanguageSetting(v); }}
        onClose={() => setPicker(null)}
      />
      <OptionPicker<TextRecognitionScript>
        visible={picker === 'script'}
        title={t('ocrScript')}
        value={script}
        options={SCRIPTS.map(([s, k]) => [s, t(k)] as [TextRecognitionScript, string])}
        onSelect={(v) => { setPicker(null); changeScript(v); }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function OptionPicker<T extends string>({ visible, title, value, options, onSelect, onClose }: {
  visible: boolean; title: string; value: T; options: [T, string][]; onSelect: (v: T) => void; onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.grabber, { backgroundColor: c.border }]} />
        <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>{title}</Text>
        <ScrollView>
          {options.map(([v, label]) => (
            <Pressable key={v} onPress={() => onSelect(v)} style={({ pressed }) => [styles.option, pressed && { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.optionText, { color: c.textPrimary, fontWeight: v === value ? '800' : '500' }]}>{label}</Text>
              {v === value && <Ionicons name="checkmark-circle" size={22} color={c.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{LATIN_UI ? title.toUpperCase() : title}</Text>
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
      {!!value && (
        <Text numberOfLines={1} style={[styles.rowValue, { color: accent ? c.primary : c.textMuted, fontWeight: accent ? '800' : '500' }]}>
          {value}
        </Text>
      )}
      {chevron && <Ionicons name="chevron-forward" size={18} color={c.textMuted} style={rtlFlip} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: LATIN_UI ? 0.8 : 0, marginBottom: 8, marginHorizontal: 4, textAlign: 'left' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 54 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'left' },
  rowValue: { fontSize: 14, flexShrink: 1, maxWidth: '55%' },
  accentBlock: { paddingHorizontal: 14, paddingBottom: 14 },
  accentHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  swatchRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'flex-start' },
  tipNo: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  tipText: { flex: 1, fontSize: 13.5, lineHeight: 20, textAlign: 'left' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingHorizontal: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800', paddingHorizontal: 16, paddingBottom: 8, textAlign: 'left' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52, borderRadius: 12 },
  optionText: { fontSize: 16 },
});
