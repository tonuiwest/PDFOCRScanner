import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';

const W = 92;
const H = 112;
const PAGE_W = 62;
const PAGE_H = 82;

/**
 * Illustrated scanner viewfinder: a paper page with text lines inside camera
 * corner brackets, and a glowing scan beam sweeping over it.
 */
export function ScanGraphic({ accent }: { accent: string }) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { sweep.setValue(0.5); return; }
      loop = Animated.loop(Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [sweep]);

  const translateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [4, PAGE_H - 4] });

  return (
    <View style={styles.wrap} importantForAccessibility="no-hide-descendants">
      {/* Viewfinder corners */}
      <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 }]} />
      <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 }]} />
      <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 }]} />
      <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 }]} />

      {/* Paper stack */}
      <View style={[styles.page, styles.pageBack]} />
      <View style={styles.page}>
        <View style={styles.fold} />
        <View style={[styles.line, { width: 30, height: 5, backgroundColor: accent, opacity: 0.85, marginBottom: 7 }]} />
        <View style={[styles.line, { width: 46 }]} />
        <View style={[styles.line, { width: 40 }]} />
        <View style={[styles.line, { width: 44 }]} />
        <View style={styles.blockRow}>
          <View style={[styles.block, { backgroundColor: accent, opacity: 0.18 }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.line, { width: '100%', marginBottom: 0 }]} />
            <View style={[styles.line, { width: '80%', marginBottom: 0 }]} />
            <View style={[styles.line, { width: '90%', marginBottom: 0 }]} />
          </View>
        </View>
        <View style={[styles.line, { width: 42, marginTop: 6 }]} />
        <View style={[styles.line, { width: 28 }]} />

        {/* Scan beam */}
        <Animated.View style={[styles.beamWrap, { transform: [{ translateY }] }]}>
          <View style={[styles.glow, { backgroundColor: '#7CF9FF' }]} />
          <View style={styles.beam} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#FFFFFF' },
  page: {
    width: PAGE_W, height: PAGE_H, backgroundColor: '#FFFFFF', borderRadius: 5, paddingTop: 10, paddingHorizontal: 8,
    overflow: 'hidden', transform: [{ rotate: '-4deg' }],
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  pageBack: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)', transform: [{ rotate: '6deg' }, { translateX: 6 }], elevation: 2 },
  fold: { position: 'absolute', right: 0, top: 0, width: 12, height: 12, backgroundColor: '#DDE2EC', borderBottomLeftRadius: 4 },
  line: { height: 3, borderRadius: 2, backgroundColor: '#C9D0DD', marginBottom: 4 },
  blockRow: { flexDirection: 'row', gap: 5, marginTop: 4, alignItems: 'center' },
  block: { width: 16, height: 16, borderRadius: 3 },
  beamWrap: { position: 'absolute', left: -4, right: -4, top: 0, height: 14, marginTop: -7, justifyContent: 'center' },
  glow: { position: 'absolute', left: 0, right: 0, height: 14, opacity: 0.28, borderRadius: 7 },
  beam: { height: 2, backgroundColor: '#22D3EE', shadowColor: '#22D3EE', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
});
