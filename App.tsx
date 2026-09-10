import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import FileViewer from 'react-native-file-viewer';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import ScanPreview from './src/screens/ScanPreview';
import { SettingsScreen } from './src/screens/SettingsScreen';
import NativeAdCard from './src/components/NativeAdCard';
import { useTheme } from './src/context/ThemeContext';
import { adsManager, getBannerId } from './src/services/adsManager';

export type RootStackParamList = {
  Home: undefined;
  ScanPreview: { pages: string[]; runOcr?: boolean };
  History: undefined;
  Library: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

function AnimatedPress({ onPress, children, style }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[aStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.97, { damping: 12 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// A single reusable, generously-sized row used for every primary action on
// Home. Using one consistent row style (instead of mixing card shapes) is
// what keeps the page from ever looking crowded, uneven, or overlapping.
function ActionRow({ icon, title, subtitle, onPress, hero }: any) {
  const { theme } = useTheme();
  return (
    <AnimatedPress onPress={onPress}>
      <View
        style={[
          styles.row,
          { shadowColor: theme.colors.shadow },
          hero
            ? { backgroundColor: theme.colors.primary }
            : { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 },
        ]}
      >
        <View style={[styles.rowIcon, hero ? { backgroundColor: 'rgba(255,255,255,0.16)' } : { backgroundColor: theme.colors.accentSoft }]}>
          <MaterialCommunityIcons name={icon} size={26} color={hero ? '#FFFFFF' : theme.colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.rowTitle, { color: hero ? '#FFFFFF' : theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.rowSub, { color: hero ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={hero ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted} />
      </View>
    </AnimatedPress>
  );
}

// ---------------------------------------------------------------------------
// HOME - exactly four primary actions, each a full-width row of equal
// height/style for a clean, professional, non-crowded layout. The page
// container uses justifyContent:'space-evenly' so any extra vertical room
// (on taller screens) is spread evenly between sections instead of piling
// up in one spot. No ScrollView - it all fits on one screen.
// ---------------------------------------------------------------------------
function HomeScreen({ navigation }: HomeProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  useEffect(() => {
    adsManager.initialize();
  }, []);

  const handleAutoScan = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 10,
        responseType: ResponseType.ImageFilePath,
        croppedImageQuality: 100,
      });
      const valid = scannedImages?.filter((u) => u && u.trim().length > 0 && u !== 'undefined') || [];
      if (valid.length === 0) {
        Alert.alert('No pages', 'No valid pages were scanned');
        return;
      }
      const enhanced = await Promise.all(
        valid.map(async (p) => {
          try {
            const context = ImageManipulator.manipulate(p);
            const image = await context.renderAsync();
            const result = await image.saveAsync({ compress: 0.95, format: SaveFormat.JPEG });
            return result.uri;
          } catch { return p; }
        })
      );
      navigation.navigate('ScanPreview', { pages: enhanced });
      setTimeout(() => adsManager.maybeShowInterstitial(), 500);
    } catch (e: any) {
      if (!e.message?.includes('canceled')) Alert.alert('Scan Failed', e.message);
    }
  };

  const handleOcrFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      navigation.navigate('ScanPreview', { pages: [result.assets[0].uri], runOcr: true });
      setTimeout(() => adsManager.maybeShowInterstitial(), 500);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load image');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Only reserve the top safe edge here - the bottom banner reserves
          its own bottom inset below, so it's never applied twice. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.page}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.appTitle, { color: theme.colors.textPrimary }]}>PDF OCR Pro</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>DOCUMENT SUITE</Text>
              <View style={[styles.headerRule, { backgroundColor: theme.colors.accent }]} />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={[styles.iconCircle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Ionicons name="settings-outline" size={19} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowsGroup}>
            <ActionRow
              hero
              icon="camera-iris"
              title="New Document Scan"
              subtitle="Scan, crop & digitize instantly"
              onPress={handleAutoScan}
            />
            <ActionRow
              icon="image-search"
              title="OCR from Image"
              subtitle="Extract text from any photo"
              onPress={handleOcrFromLibrary}
            />
            <ActionRow
              icon="folder-multiple"
              title="Library"
              subtitle="Browse your saved PDFs"
              onPress={() => { navigation.navigate('Library'); adsManager.maybeShowInterstitial(); }}
            />
            <ActionRow
              icon="history"
              title="Scan History"
              subtitle="Review your recent scans"
              onPress={() => { navigation.navigate('History'); adsManager.maybeShowInterstitial(); }}
            />
          </View>

          {/* Native ad - renders nothing until an ad has actually loaded,
              so it never disrupts this layout. */}
          <NativeAdCard style={{ width: '100%' }} />
        </View>

        {/* Persistent banner - always docked at the bottom of the screen */}
        <View style={[styles.bannerWrapper, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 4) }]}>
          <BannerAd unitId={getBannerId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function LibraryScreen() {
  const { theme } = useTheme();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  useEffect(() => { load(); const id = setInterval(load, 1500); return () => clearInterval(id); }, []);
  const load = async () => { const s = await AsyncStorage.getItem('pdf_library'); if (s) setPdfs(JSON.parse(s)); };
  const openPdf = async (uri: string) => { try { await FileViewer.open(uri, { showOpenWithDialog: true }); } catch { Alert.alert('Error', 'Install PDF viewer'); } adsManager.maybeShowInterstitial(true); };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={[styles.pageHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>LIBRARY</Text>
        <View style={[styles.headerRule, { backgroundColor: theme.colors.accent }]} />
      </View>
      {pdfs.length === 0 ? <View style={styles.empty}><Text style={{ color: theme.colors.textSecondary }}>No PDFs yet</Text></View> :
        <FlatList data={pdfs} keyExtractor={(i, idx) => `${i.uri}-${idx}`} renderItem={({ item }) => (
          <TouchableOpacity style={[styles.listItemBig, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]} onPress={() => openPdf(item.uri)}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{new Date(item.date).toLocaleString()}</Text>
          </TouchableOpacity>
        )} contentContainerStyle={{ padding: 16, paddingBottom: 90 }} />}
      <NativeAdCard style={{ alignSelf: 'stretch', marginHorizontal: 16, marginBottom: 8 }} />
      <View style={[styles.bannerWrapper, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 4) }]}>
        <BannerAd unitId={getBannerId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>
    </SafeAreaView>
  );
}

function HistoryScreen() {
  const { theme } = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  useEffect(() => { (async () => { const s = await AsyncStorage.getItem('scan_history'); if (s) setHistory(JSON.parse(s)); })(); }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={[styles.pageHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>SCAN HISTORY</Text>
        <View style={[styles.headerRule, { backgroundColor: theme.colors.accent }]} />
      </View>
      {history.length === 0 ? <View style={styles.empty}><Text style={{ color: theme.colors.textSecondary }}>No scans yet</Text></View> :
        <FlatList data={history} keyExtractor={(_, i) => `${i}`} renderItem={({ item }) => (
          <View style={[styles.listItemBig, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{item.date} • {item.pages} pages</Text>
          </View>
        )} contentContainerStyle={{ padding: 16, paddingBottom: 90 }} />}
      <NativeAdCard style={{ alignSelf: 'stretch', marginHorizontal: 16, marginBottom: 8 }} />
      <View style={[styles.bannerWrapper, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 4) }]}>
        <BannerAd unitId={getBannerId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const { theme } = useTheme();

  const navTheme = theme.isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background, card: theme.colors.card, text: theme.colors.textPrimary, border: theme.colors.border, primary: theme.colors.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.card, text: theme.colors.textPrimary, border: theme.colors.border, primary: theme.colors.primary } };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ScanPreview" component={ScanPreview} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const serifTitle = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18, paddingTop: 10, justifyContent: 'space-evenly' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.2, fontFamily: serifTitle },
  subtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginTop: 4 },
  headerRule: { height: 2, width: 40, borderRadius: 1, marginTop: 10 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowsGroup: { gap: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 18, paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 2,
  },
  rowIcon: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', fontFamily: serifTitle },
  rowSub: { fontSize: 12.5, marginTop: 3, fontWeight: '500' },
  bannerWrapper: { borderTopWidth: 1, alignItems: 'center', minHeight: 58, justifyContent: 'center' },
  pageHeader: { padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.2, fontFamily: serifTitle },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listItemBig: {
    borderRadius: 8, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
});
