import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BannerAd, BannerAdSize, NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView,
} from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { useAds } from '../hooks/useAds';
import { getBannerId, getNativeId } from '../services/adsManager';

/** Anchored adaptive banner docked at the bottom; owns the bottom safe-area inset. */
export function BannerSlot() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { canShowAds } = useAds();
  const [failed, setFailed] = useState(false);
  const show = canShowAds && !failed;
  return (
    <View style={{
      paddingBottom: insets.bottom,
      backgroundColor: theme.colors.surface,
      borderTopWidth: show ? StyleSheet.hairlineWidth : 0,
      borderTopColor: theme.colors.border,
      alignItems: 'center',
    }}>
      {show && (
        <BannerAd
          unitId={getBannerId()}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={() => setFailed(true)}
        />
      )}
    </View>
  );
}

/** Native ad styled like a document row. Renders nothing until an ad has loaded. */
export function NativeAdCard({ style, media = false }: { style?: StyleProp<ViewStyle>; media?: boolean }) {
  const { theme } = useTheme();
  const { canShowAds } = useAds();
  const [ad, setAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    if (!canShowAds) return;
    let cancelled = false;
    let loaded: NativeAd | null = null;
    NativeAd.createForAdRequest(getNativeId())
      .then((a) => {
        if (cancelled) { a.destroy(); return; }
        loaded = a;
        setAd(a);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      loaded?.destroy();
      setAd(null);
    };
  }, [canShowAds]);

  if (!ad || !canShowAds) return null;
  const c = theme.colors;
  return (
    <NativeAdView nativeAd={ad} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {media && <NativeMediaView style={styles.media} resizeMode="cover" />}
      <View style={styles.row}>
        {ad.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <View style={[styles.badge, { backgroundColor: c.warningSoft }]}>
              <Text style={[styles.badgeText, { color: c.warning }]}>Ad</Text>
            </View>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text numberOfLines={1} style={[styles.headline, { color: c.textPrimary }]}>{ad.headline}</Text>
            </NativeAsset>
          </View>
          {!!ad.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text numberOfLines={2} style={[styles.body, { color: c.textSecondary }]}>{ad.body}</Text>
            </NativeAsset>
          )}
        </View>
        {!!ad.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text numberOfLines={1} style={[styles.cta, { backgroundColor: c.primarySoft, color: c.primary }]}>
              {ad.callToAction}
            </Text>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  media: { width: '100%', aspectRatio: 1.91, borderRadius: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  headline: { flex: 1, fontSize: 14, fontWeight: '700' },
  body: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  cta: { fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', maxWidth: 110 },
});
