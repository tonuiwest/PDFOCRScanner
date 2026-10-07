import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList, Alert, Switch, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../context/ThemeContext';
import { Button, Header, IconButton, LoadingOverlay, PromptModal, useToast, rtlFlip } from '../components/ui';
import { useAds } from '../hooks/useAds';
import { adsManager } from '../services/adsManager';
import { pickImages, scanPages } from '../services/capture';
import { extractTextFromPages } from '../services/ocrService';
import { ExportQuality, PageSize, defaultDocName, saveDocument } from '../services/documents';
import type { ScreenProps } from '../navigation';
import { t, regionDefaultPageSize } from '../i18n';

export const PAGE_SIZE_KEY = 'pref_page_size';
const MAX_PAGES = 30;

interface Page { key: string; uri: string }
let seq = 0;
const toPage = (uri: string): Page => ({ key: `p${++seq}`, uri: uri.startsWith('/') ? `file://${uri}` : uri });

export default function EditorScreen({ route, navigation }: ScreenProps<'Editor'>) {
  const { theme } = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { canShowAds } = useAds();

  const [pages, setPages] = useState<Page[]>(() => route.params.pages.slice(0, MAX_PAGES).map(toPage));
  const [name, setName] = useState(defaultDocName);
  const [renaming, setRenaming] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(regionDefaultPageSize);
  const [quality, setQuality] = useState<ExportQuality>('standard');
  const [withText, setWithText] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(PAGE_SIZE_KEY).then((v) => { if (v === 'A4' || v === 'Letter') setPageSize(v); }).catch(() => {});
  }, []);

  // Confirm before discarding an unsaved scan.
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (saved.current || pages.length === 0) return;
    e.preventDefault();
    Alert.alert(t('discardTitle'), t('discardBody'), [
      { text: t('keepEditing'), style: 'cancel' },
      { text: t('discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
    ]);
  }), [navigation, pages.length]);

  const addPages = async (source: 'scan' | 'photos') => {
    const room = MAX_PAGES - pages.length;
    if (room <= 0) { Alert.alert(t('pageLimitTitle'), t('pageLimitBody', { n: MAX_PAGES })); return; }
    const uris = source === 'scan' ? await scanPages(room) : await pickImages(true);
    if (uris.length) setPages((p) => [...p, ...uris.slice(0, room).map(toPage)]);
  };

  const rotate = async (key: string) => {
    const page = pages.find((p) => p.key === key);
    if (!page) return;
    try {
      const img = await ImageManipulator.manipulate(page.uri).rotate(90).renderAsync();
      const out = await img.saveAsync({ compress: 0.95, format: SaveFormat.JPEG });
      setPages((ps) => ps.map((p) => (p.key === key ? { ...p, uri: out.uri } : p)));
    } catch (e: any) {
      Alert.alert(t('rotateFailed'), e?.message);
    }
  };

  const move = (key: string, dir: -1 | 1) => setPages((ps) => {
    const i = ps.findIndex((p) => p.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ps.length) return ps;
    const next = [...ps];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const remove = (key: string) => {
    if (pages.length === 1) {
      Alert.alert(t('deleteLastTitle'), t('deleteLastBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('discard'), style: 'destructive', onPress: () => { saved.current = true; navigation.goBack(); } },
      ]);
      return;
    }
    setPages((ps) => ps.filter((p) => p.key !== key));
  };

  const chooseQuality = (q: ExportQuality) => {
    if (q === 'standard' || !canShowAds) { setQuality(q); return; }
    Alert.alert(t('hdTitle'), t('hdBody'), [
      { text: t('skip'), style: 'cancel' },
      {
        text: t('watchAd'), onPress: async () => {
          setBusy(t('loadingAd'));
          const earned = await adsManager.watchForHdExport();
          setBusy(null);
          if (earned) { setQuality('hd'); toast(t('hdUnlocked'), 'sparkles'); }
          else if (earned === null) Alert.alert(t('noAdTitle'), t('noAdBody'));
        },
      },
    ]);
  };

  const extractText = async () => {
    setBusy(t('readingText'));
    try {
      const text = await extractTextFromPages(pages.map((p) => p.uri), (d, n) => n > 1 && setBusy(t('readingTextProgress', { done: d, total: n })));
      setBusy(null);
      if (!text) { Alert.alert(t('noTextTitle'), t('noTextPages')); return; }
      navigation.navigate('Text', { text, title: name });
    } catch (e: any) {
      setBusy(null);
      Alert.alert(t('readTextFailed'), e?.message);
    }
  };

  const save = async () => {
    const uris = pages.map((p) => p.uri);
    try {
      let ocrText: string | undefined;
      if (withText) {
        setBusy(t('readingText'));
        ocrText = await extractTextFromPages(uris, (d, n) => n > 1 && setBusy(t('readingTextProgress', { done: d, total: n }))).catch(() => undefined);
      }
      setBusy(t('creatingPdf'));
      await saveDocument({ name, pages: uris, pageSize, quality, ocrText });
      saved.current = true;
      setBusy(null);
      toast(t('pdfSaved'));
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Documents' }] });
      setTimeout(() => adsManager.maybeShowInterstitial(), 700);
    } catch (e: any) {
      setBusy(null);
      Alert.alert(t('pdfFailed'), e?.message ?? t('unknownError'));
    }
  };

  const tileW = (width - 16 * 2 - 12) / 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Header
        title={name}
        subtitle={pages.length === 1 ? t('page1') : t('pagesN', { n: pages.length })}
        onBack={() => navigation.goBack()}
        right={<IconButton icon="create-outline" onPress={() => setRenaming(true)} accessibilityLabel={t('rename')} />}
      />

      <FlatList
        data={pages}
        keyExtractor={(p) => p.key}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
        renderItem={({ item, index }) => (
          <View style={[styles.tile, { width: tileW, backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.imageWrap, { backgroundColor: c.surfaceAlt }]}>
              <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
              <View style={[styles.pageNo, { backgroundColor: c.overlay }]}><Text style={styles.pageNoText}>{index + 1}</Text></View>
            </View>
            <View style={styles.tools}>
              <Tool icon="chevron-back" label={t('moveEarlier')} disabled={index === 0} onPress={() => move(item.key, -1)} />
              <Tool icon="refresh" label={t('rotate')} onPress={() => rotate(item.key)} />
              <Tool icon="trash-outline" label={t('deletePage')} danger onPress={() => remove(item.key)} />
              <Tool icon="chevron-forward" label={t('moveLater')} disabled={index === pages.length - 1} onPress={() => move(item.key, 1)} />
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={t('scanMore')} icon="scan-outline" variant="secondary" onPress={() => addPages('scan')} style={{ flex: 1 }} />
              <Button title={t('addPhotos')} icon="images-outline" variant="secondary" onPress={() => addPages('photos')} style={{ flex: 1 }} />
            </View>

            <View style={[styles.options, { backgroundColor: c.surface, borderColor: c.border }]}>
              <OptionRow label={t('pageSize')}>
                <Segmented value={pageSize} options={[['A4', t('a4')], ['Letter', t('letter')]]} onChange={setPageSize} />
              </OptionRow>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <OptionRow label={t('quality')}>
                <Segmented
                  value={quality}
                  options={[['standard', t('standard')], ['hd', canShowAds && quality !== 'hd' ? `${t('hd')} ▶` : t('hd')]]}
                  onChange={chooseQuality}
                />
              </OptionRow>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <OptionRow label={t('saveText')} hint={t('saveTextHint')}>
                <Switch value={withText} onValueChange={setWithText} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />
              </OptionRow>
            </View>
          </View>
        }
      />

      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
        <Button title={t('extractText')} icon="text-outline" variant="secondary" onPress={extractText} style={{ flex: 1 }} />
        <Button title={t('savePdf')} icon="checkmark" onPress={save} style={{ flex: 1.4 }} />
      </View>

      <PromptModal visible={renaming} title={t('documentName')} initialValue={name} onSubmit={setName} onClose={() => setRenaming(false)} />
      <LoadingOverlay visible={!!busy} label={busy ?? undefined} />
    </SafeAreaView>
  );
}

function Tool({ icon, label, onPress, disabled, danger }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; danger?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4} accessibilityLabel={label} style={({ pressed }) => [styles.tool, { opacity: disabled ? 0.25 : pressed ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={18} color={danger ? theme.colors.danger : theme.colors.textSecondary} style={icon.startsWith('chevron') ? rtlFlip : undefined} />
    </Pressable>
  );
}

function OptionRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.optionRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        {!!hint && <Text style={[styles.optionHint, { color: theme.colors.textMuted }]}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.seg, { backgroundColor: c.surfaceAlt }]}>
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} style={[styles.segItem, active && [styles.segActive, { backgroundColor: c.surface, shadowColor: c.shadow }]]}>
            <Text style={[styles.segText, { color: active ? c.textPrimary : c.textMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  imageWrap: { aspectRatio: 0.72, margin: 8, marginBottom: 0, borderRadius: 10, overflow: 'hidden' },
  pageNo: { position: 'absolute', left: 6, top: 6, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pageNoText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  tool: { padding: 6 },
  options: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 56 },
  optionLabel: { fontSize: 15, fontWeight: '600' },
  optionHint: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  seg: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  segActive: { shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 13, fontWeight: '700' },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
