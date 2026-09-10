import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import FileViewer from 'react-native-file-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { extractTextFromImage } from '../services/ocrService';
import { adjustImageForA4 } from '../utils/helpers';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerId, adsManager } from '../services/adsManager';
import NativeAdCard from '../components/NativeAdCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanPreview'>;

export default function ScanPreview({ route, navigation }: Props) {
  const { pages: rawPages } = route.params;
  const runOcrOnOpen = (route.params as any)?.runOcr;
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const pages = rawPages.filter((uri, idx) => uri && uri.trim().length > 0 && uri !== 'undefined' && rawPages.indexOf(uri) === idx);

  useEffect(() => {
    if (runOcrOnOpen && pages[0]) handleOcr(pages[0]);
  }, []);

  const getBase64Images = async (uris: string[]) => {
    const ps = uris.map(async (uri) => {
      try {
        const adjusted = await adjustImageForA4(uri);
        const b64 = await FileSystem.readAsStringAsync(adjusted, { encoding: FileSystem.EncodingType.Base64 });
        return `data:image/jpeg;base64,${b64}`;
      } catch {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        return `data:image/jpeg;base64,${b64}`;
      }
    });
    return Promise.all(ps);
  };

  const saveToStorage = async (pdfUri: string) => {
    try {
      const now = new Date();
      const fileName = `Scan_${now.toISOString().split('T')[0]}_${now.toTimeString().split(' ')[0].slice(0,5).replace(/:/g,'-')}.pdf`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: pdfUri, to: newPath });
      const lib = await AsyncStorage.getItem('pdf_library');
      const pdfList = lib ? JSON.parse(lib) : [];
      const info = await FileSystem.getInfoAsync(newPath);
      pdfList.unshift({ uri: newPath, name: fileName, date: new Date().toISOString(), size: info.exists ? (info as any).size : 0 });
      await AsyncStorage.setItem('pdf_library', JSON.stringify(pdfList));
      const hist = await AsyncStorage.getItem('scan_history');
      const hList = hist ? JSON.parse(hist) : [];
      hList.unshift({ name: fileName, date: new Date().toLocaleString(), pages: pages.length, uri: newPath });
      await AsyncStorage.setItem('scan_history', JSON.stringify(hList));
      setSavedPdfUri(newPath);
      return newPath;
    } catch (e:any) {
      Alert.alert('Error', `Could not save PDF: ${e.message}`);
      return pdfUri;
    }
  };

  const createPdf = async (options: { saveLibrary?: boolean } = {}) => {
    setLoading(true);
    try {
      const base64Images = await getBase64Images(pages);
      const validImages = base64Images.filter(img => img && img.length > 100);
      if (validImages.length === 0) { Alert.alert('Error','No valid images'); return null; }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0;padding:0}.page{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;page-break-after:always;overflow:hidden}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body>${validImages.map(src=>`<div class="page"><img src="${src}"/></div>`).join('')}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (options.saveLibrary) return await saveToStorage(uri);
      return uri;
    } catch (e:any) { Alert.alert('PDF Error', e.message); throw e; } finally { setLoading(false); }
  };

  const ensureSavedPdf = async () => {
    if (savedPdfUri) return savedPdfUri;
    return await createPdf({ saveLibrary: true });
  };

  // REWARDED on major triggers: Save, Share, Open
  const handleSave = async () => {
    if (savedPdfUri) { Alert.alert('Saved','Already saved'); return; }
    await adsManager.showRewarded(async () => {
      const uri = await createPdf({ saveLibrary: true });
      if (uri) Alert.alert('Saved ✓','PDF saved to Library & History — bonus: high-quality export unlocked!');
    }, async () => {
      if (!savedPdfUri) await createPdf({ saveLibrary: true });
    });
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      await adsManager.showRewarded(
        async () => {
          const uri = await ensureSavedPdf();
          if (!uri) return;
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF', UTI: 'com.adobe.pdf' });
        },
        async () => {
          const uri = await ensureSavedPdf();
          if (!uri) return;
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF', UTI: 'com.adobe.pdf' });
        }
      );
    } catch (e:any) { Alert.alert('Share Error', e?.message); } finally { setLoading(false); }
  };

  const handleOpen = async () => {
    setLoading(true);
    try {
      await adsManager.showRewarded(
        async () => {
          const uri = await ensureSavedPdf();
          if (!uri) return;
          await FileViewer.open(uri, { showOpenWithDialog: true, displayName: `Scan_${Date.now()}.pdf` });
        },
        async () => {
          const uri = await ensureSavedPdf();
          if (!uri) return;
          await FileViewer.open(uri, { showOpenWithDialog: true, displayName: `Scan_${Date.now()}.pdf` });
        }
      );
    } catch (e:any) { Alert.alert('Open Error', e?.message); } finally { setLoading(false); }
  };

  const handleCopyOcr = async () => {
    await Clipboard.setStringAsync(ocrText);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  const handleShareOcr = async () => {
    await adsManager.showRewarded(
      async () => {
        try { await Share.share({ message: ocrText }); } catch (e: any) { Alert.alert('Share Error', e?.message); }
      },
      async () => {
        try { await Share.share({ message: ocrText }); } catch (e: any) { Alert.alert('Share Error', e?.message); }
      }
    );
  };

  const handleOcr = async (uri: string) => {
    setLoading(true);
    try {
      const text = await extractTextFromImage(uri);
      setOcrText(text || 'No text found');
      setShowOcrModal(true);
    } catch (e:any) { Alert.alert('OCR failed', e.message); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{pages.length} page(s) preview</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        {pages.map((uri, i) => (
          <View key={i} style={[styles.pageCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <Image source={{ uri }} style={styles.pageImage} resizeMode="contain" />
            <View style={styles.pageActions}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.colors.backgroundAlt }]} onPress={() => handleOcr(uri)}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' }}>OCR</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Page {i+1}</Text>
            </View>
          </View>
        ))}
        <NativeAdCard style={{ width: '100%', marginTop: 4 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 8 }]}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.backgroundAlt, flex: 1 }]} onPress={handleSave} disabled={loading}>
            <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>{loading ? '...' : '💾 Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={handleShare} disabled={loading}>
            <Text style={[styles.actionText, { color: 'white' }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.accent, flex: 1 }]} onPress={handleOpen} disabled={loading}>
            <Text style={[styles.actionText, { color: 'white' }]}>Open</Text>
          </TouchableOpacity>
        </View>
        <BannerAd unitId={getBannerId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>

      <Modal visible={showOcrModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>OCR Result</Text>
            <ScrollView style={{ maxHeight: 300, marginTop: 12 }}><Text style={{ color: theme.colors.textPrimary, lineHeight: 20 }}>{ocrText}</Text></ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]} onPress={handleCopyOcr}>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]} onPress={handleShareOcr}>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>Share</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowOcrModal(false)}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const serifTitle = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700', fontFamily: serifTitle },
  pageCard: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  pageImage: { width: '100%', height: 420, backgroundColor: '#0001' },
  pageActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 12, alignItems: 'center' },
  actionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  actionText: { fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 14, padding: 20, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: serifTitle },
  closeBtn: { marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalActionBtn: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
});
