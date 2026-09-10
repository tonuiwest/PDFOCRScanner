import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { getNativeId } from '../services/adsManager';

/**
 * Native ad unit, wired to AD_IDS.native.
 * - Renders nothing while loading or if the ad fails, so it never disrupts layout.
 * - Meant to sit inside a flexible (flexGrow) container that only has spare space
 *   to give it on taller screens - see HomeScreen.
 */
export default function NativeAdCard({ style }: { style?: any }) {
  const { theme } = useTheme();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);
  const adRef = useRef<NativeAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    NativeAd.createForAdRequest(getNativeId(), {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy?.();
          return;
        }
        adRef.current = ad;
        setNativeAd(ad);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      adRef.current?.destroy?.();
    };
  }, []);

  if (!nativeAd || failed) return null;

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.container,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: theme.colors.shadow },
        style,
      ]}
    >
      <View style={styles.row}>
        {!!nativeAd.icon?.url && (
          <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
        )}
        <View style={{ flex: 1, marginLeft: nativeAd.icon?.url ? 10 : 0 }}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={1} style={[styles.headline, { color: theme.colors.textPrimary }]}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {!!nativeAd.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text numberOfLines={1} style={[styles.body, { color: theme.colors.textSecondary }]}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          )}
        </View>
        {!!nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.ctaText} numberOfLines={1}>{nativeAd.callToAction}</Text>
            </View>
          </NativeAsset>
        )}
      </View>
      <Text style={[styles.adLabel, { color: theme.colors.textMuted, borderColor: theme.colors.border }]}>Ad</Text>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 8, borderWidth: 1, padding: 10, justifyContent: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 32, height: 32, borderRadius: 8 },
  headline: { fontSize: 12.5, fontWeight: '700' },
  body: { fontSize: 10.5, marginTop: 1 },
  cta: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginLeft: 8 },
  ctaText: { color: 'white', fontSize: 10.5, fontWeight: '700' },
  adLabel: { position: 'absolute', top: 4, right: 6, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
});
