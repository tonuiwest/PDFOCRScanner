import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DocumentScanner, { ResponseType, ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import { adsManager } from './adsManager';

const MAX_PAGES = 30;

const valid = (uris?: (string | null | undefined)[]) =>
  (uris ?? []).filter((u): u is string => !!u && u.trim().length > 0 && u !== 'undefined');

/** Opens the system document scanner (edge detection + crop). Returns [] when cancelled. */
export async function scanPages(max = MAX_PAGES): Promise<string[]> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  adsManager.suppressAppOpen();
  try {
    const res = await DocumentScanner.scanDocument({
      maxNumDocuments: Math.max(1, Math.min(max, 24)),
      responseType: ResponseType.ImageFilePath,
      croppedImageQuality: 95,
    });
    if (res.status === ScanDocumentResponseStatus.Cancel) return [];
    return valid(res.scannedImages);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (!/cancel/i.test(msg)) Alert.alert('Scanner unavailable', msg || 'Could not start the document scanner.');
    return [];
  } finally {
    adsManager.releaseAppOpen();
  }
}

/** Picks one or more photos from the library (no storage permission needed on Android 13+ photo picker). */
export async function pickImages(multiple = true): Promise<string[]> {
  adsManager.suppressAppOpen();
  try {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multiple,
      selectionLimit: multiple ? MAX_PAGES : 1,
      orderedSelection: true,
      quality: 1,
    });
    if (res.canceled) return [];
    return valid(res.assets?.map((a) => a.uri));
  } catch (e: any) {
    Alert.alert('Could not open photos', e?.message ?? 'Unknown error');
    return [];
  } finally {
    adsManager.releaseAppOpen();
  }
}

/** Wraps a call that leaves the app (share sheet, external viewer) so returning doesn't trigger an app-open ad. */
export async function leavingApp<T>(fn: () => Promise<T>): Promise<T> {
  adsManager.suppressAppOpen();
  try { return await fn(); } finally { adsManager.releaseAppOpen(); }
}
